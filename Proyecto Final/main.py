from pathlib import Path

from kivy.app import App
from kivy.lang import Builder
from kivy.properties import DictProperty, ObjectProperty, StringProperty
from kivy.uix.screenmanager import FadeTransition, ScreenManager

from config import AppConfig
from screens.comisiones_screen import ComisionesScreen
from screens.dashboard_screen import DashboardScreen
from screens.detalle_comision_screen import DetalleComisionScreen
from screens.login_screen import LoginScreen
from screens.notificaciones_screen import NotificacionesScreen
from screens.perfil_screen import PerfilScreen
from screens.presupuestos_screen import PresupuestosScreen
from screens.propuestas_screen import PropuestasScreen
from screens.reportes_screen import ReportesScreen
from screens.votacion_screen import VotacionScreen
from services.auth_service import AuthService
from services.catalog_service import CatalogService
from services.comision_service import ComisionService
from services.email_service import EmailService
from services.finanzas_service import FinanzasService
from services.notificacion_service import NotificacionService
from services.presupuesto_service import PresupuestoService
from services.propuesta_service import PropuestaService
from services.votacion_service import VotacionService


KV_FILES = [
    "kv/common.kv",
    "kv/login.kv",
    "kv/dashboard.kv",
    "kv/comisiones.kv",
    "kv/detalle_comision.kv",
    "kv/presupuestos.kv",
    "kv/propuestas.kv",
    "kv/votacion.kv",
    "kv/reportes.kv",
    "kv/notificaciones.kv",
    "kv/perfil.kv",
]


class RootManager(ScreenManager):
    pass


class SigecomApp(App):
    title = "SIGECOM"
    auth_service = ObjectProperty(allownone=True)
    current_user = DictProperty({})
    selected_comision = DictProperty({})
    selected_propuesta = DictProperty({})
    status_message = StringProperty("")

    def build(self):
        self.configuracion = AppConfig()
        self.auth_service = AuthService(self.configuracion)
        self.catalog_service = CatalogService(self.auth_service.client_manager)
        self.comision_service = ComisionService(self.auth_service.client_manager)
        self.presupuesto_service = PresupuestoService(self.auth_service.client_manager)
        self.finanzas_service = FinanzasService(self.auth_service.client_manager)
        self.propuesta_service = PropuestaService(self.auth_service.client_manager)
        self.votacion_service = VotacionService(self.auth_service.client_manager)
        self.notificacion_service = NotificacionService(self.auth_service.client_manager)
        self.email_service = EmailService(self.configuracion)
        self._load_kv_files()

        root = RootManager(transition=FadeTransition())
        root.add_widget(LoginScreen(name="login"))
        root.add_widget(DashboardScreen(name="dashboard"))
        root.add_widget(ComisionesScreen(name="comisiones"))
        root.add_widget(DetalleComisionScreen(name="detalle_comision"))
        root.add_widget(PresupuestosScreen(name="presupuestos"))
        root.add_widget(PropuestasScreen(name="propuestas"))
        root.add_widget(VotacionScreen(name="votacion"))
        root.add_widget(ReportesScreen(name="reportes"))
        root.add_widget(NotificacionesScreen(name="notificaciones"))
        root.add_widget(PerfilScreen(name="perfil"))

        self._restore_session(root)
        return root

    def _load_kv_files(self):
        base_path = Path(__file__).resolve().parent
        for kv_file in KV_FILES:
            Builder.load_file(str(base_path / kv_file))

    def _restore_session(self, root_manager):
        success, message, session = self.auth_service.restore_session()
        if success and session:
            self.current_user = session
            root_manager.current = "dashboard"
            self.status_message = message
        else:
            root_manager.current = "login"
            self.status_message = message or "Bienvenido a SIGECOM."

    def on_login_success(self, user_data):
        self.current_user = user_data
        self.status_message = f"Sesion iniciada como {user_data.get('correo', 'usuario')}."
        if self.root:
            self.root.current = "dashboard"

    def logout(self):
        self.auth_service.logout()
        self.current_user = {}
        self.selected_comision = {}
        self.selected_propuesta = {}
        self.status_message = "Sesion cerrada."
        if self.root:
            self.root.current = "login"

    def set_selected_comision(self, comision: dict):
        self.selected_comision = comision or {}
        self.selected_propuesta = {}

    def set_selected_propuesta(self, propuesta: dict):
        self.selected_propuesta = propuesta or {}

    def notify_action(self, message: str, tipo: str = "informativa", include_staff: bool = True):
        user_ids = []
        current_user_id = self.current_user.get("id_usuario")
        if current_user_id:
            user_ids.append(current_user_id)

        if include_staff:
            try:
                staff_ids = self.auth_service.user_service.list_active_user_ids_by_roles(
                    ["Administrador", "Coordinador"]
                )
                user_ids.extend(staff_ids)
            except Exception:
                pass

        try:
            self.notificacion_service.create_notifications_for_users(user_ids, message, tipo)
        except Exception:
            pass


if __name__ == "__main__":
    SigecomApp().run()
