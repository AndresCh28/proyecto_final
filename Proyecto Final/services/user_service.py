class UserService:
    def __init__(self, client_manager):
        self.client_manager = client_manager

    def get_profile_by_auth_user_id(self, auth_user_id: str) -> dict:
        client = self.client_manager.get_client()
        response = (
            client.table("usuarios")
            .select("id_usuario, nombre, correo, telefono, activo, id_rol")
            .eq("auth_user_id", auth_user_id)
            .limit(1)
            .execute()
        )
        data = getattr(response, "data", None) or []
        if not data:
            return {}

        profile = data[0]
        role_name = self._get_role_name(profile.get("id_rol"))

        return {
            "id_usuario": profile.get("id_usuario"),
            "nombre": profile.get("nombre", ""),
            "correo": profile.get("correo", ""),
            "telefono": profile.get("telefono", ""),
            "activo": profile.get("activo", False),
            "rol": role_name,
        }

    def _get_role_name(self, id_rol):
        if not id_rol:
            return "Miembro"

        client = self.client_manager.get_client()
        response = (
            client.table("roles")
            .select("nombre")
            .eq("id_rol", id_rol)
            .limit(1)
            .execute()
        )
        data = getattr(response, "data", None) or []
        if not data:
            return "Miembro"
        return data[0].get("nombre", "Miembro")

    def list_active_emails_by_roles(self, roles: list[str]) -> list[str]:
        if not roles:
            return []

        client = self.client_manager.get_client()
        response = (
            client.table("usuarios")
            .select("correo, activo, id_rol")
            .eq("activo", True)
            .execute()
        )
        users = getattr(response, "data", None) or []
        allowed = []
        for user in users:
            role_name = self._get_role_name(user.get("id_rol"))
            if role_name in roles and user.get("correo"):
                allowed.append(user["correo"])
        return sorted(set(allowed))

    def list_active_user_ids_by_roles(self, roles: list[str]) -> list[int]:
        if not roles:
            return []

        client = self.client_manager.get_client()
        response = (
            client.table("usuarios")
            .select("id_usuario, activo, id_rol")
            .eq("activo", True)
            .execute()
        )
        users = getattr(response, "data", None) or []
        allowed = []
        for user in users:
            role_name = self._get_role_name(user.get("id_rol"))
            if role_name in roles and user.get("id_usuario"):
                allowed.append(user["id_usuario"])
        return sorted(set(allowed))
