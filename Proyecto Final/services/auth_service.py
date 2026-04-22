from __future__ import annotations

from typing import Any

from services.supabase_client import SupabaseClientManager
from services.user_service import UserService
from utils.session import SessionStore
from utils.validators import validate_login_fields


class AuthService:
    def __init__(self, config):
        self.config = config
        self.client_manager = SupabaseClientManager(config)
        self.session_store = SessionStore(config.session_store_path)
        self.user_service = UserService(self.client_manager)

    def login(self, correo: str, password: str) -> tuple[bool, str, dict[str, Any] | None]:
        is_valid, validation_message = validate_login_fields(correo, password)
        if not is_valid:
            return False, validation_message, None

        try:
            client = self.client_manager.get_client()
            response = client.auth.sign_in_with_password(
                {"email": correo.strip(), "password": password}
            )
        except Exception as exc:
            return False, self._map_auth_error(exc), None

        user = getattr(response, "user", None)
        session = getattr(response, "session", None)
        if user is None or session is None:
            return False, "No se recibio una sesion valida desde Supabase.", None

        try:
            user_data = self._build_user_payload(user, session)
        except Exception as exc:
            return False, f"No fue posible cargar el perfil del usuario: {exc}", None
        if not user_data.get("id_usuario"):
            self.logout()
            return False, "El usuario autenticado no tiene perfil interno en SIGECOM.", None
        if not user_data.get("activo", False):
            self.logout()
            return False, "Tu cuenta se encuentra inactiva. Contacta al administrador.", None
        self.session_store.save(user_data)
        return True, "Sesion iniciada correctamente.", user_data

    def restore_session(self) -> tuple[bool, str, dict[str, Any] | None]:
        stored_session = self.session_store.load()
        if not stored_session:
            return False, "Bienvenido a SIGECOM.", None

        access_token = stored_session.get("access_token", "")
        refresh_token = stored_session.get("refresh_token", "")
        if not access_token or not refresh_token:
            self.session_store.clear()
            return False, "No se encontro una sesion valida guardada.", None

        try:
            client = self.client_manager.get_client()
            session_response = client.auth.set_session(access_token, refresh_token)
            user = getattr(session_response, "user", None)
            session = getattr(session_response, "session", None)
            if user is None or session is None:
                raise ValueError("La sesion guardada ya no es valida.")
        except Exception:
            self.session_store.clear()
            return False, "La sesion guardada expiro. Inicia sesion nuevamente.", None

        try:
            user_data = self._build_user_payload(user, session)
        except Exception:
            self.session_store.clear()
            return False, "La sesion existe, pero no fue posible cargar el perfil interno.", None
        if not user_data.get("id_usuario") or not user_data.get("activo", False):
            self.session_store.clear()
            return False, "La sesion guardada no corresponde a un usuario activo.", None
        self.session_store.save(user_data)
        return True, f"Sesion restaurada para {user_data.get('correo', 'usuario')}.", user_data

    def logout(self):
        try:
            client = self.client_manager.get_client()
            client.auth.sign_out()
        except Exception:
            pass
        self.session_store.clear()

    def _build_user_payload(self, user, session) -> dict[str, Any]:
        auth_user_id = str(user.id)
        profile = self.user_service.get_profile_by_auth_user_id(auth_user_id)

        return {
            "id": auth_user_id,
            "id_usuario": profile.get("id_usuario"),
            "nombre": profile.get("nombre") or getattr(user, "email", "").split("@")[0],
            "correo": profile.get("correo") or getattr(user, "email", ""),
            "telefono": profile.get("telefono", ""),
            "rol": profile.get("rol", "Miembro"),
            "activo": profile.get("activo", True),
            "access_token": getattr(session, "access_token", ""),
            "refresh_token": getattr(session, "refresh_token", ""),
        }

    def _map_auth_error(self, error: Exception) -> str:
        message = str(error).lower()
        if "invalid login credentials" in message:
            return "Correo o contrasena incorrectos."
        if "email not confirmed" in message:
            return "Debes confirmar tu correo antes de iniciar sesion."
        if "network" in message or "connection" in message:
            return "No fue posible conectarse a Supabase. Verifica internet o configuracion."
        return f"No fue posible iniciar sesion: {error}"
