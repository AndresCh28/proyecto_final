from screens.base_screen import BaseScreen


class PerfilScreen(BaseScreen):
    def on_pre_enter(self, *args):
        current_user = self.app.current_user or {}
        self.ids.profile_email.text = current_user.get("correo", "Sin sesion")
        self.ids.profile_id.text = current_user.get("id", "-")
        self.ids.profile_name.text = current_user.get("nombre", "Sin nombre")
        self.ids.profile_role.text = current_user.get("rol", "Sin rol")
        self.ids.profile_status.text = "Activo" if current_user.get("activo", False) else "Inactivo"
        return super().on_pre_enter(*args)

    def logout(self):
        self.app.logout()
