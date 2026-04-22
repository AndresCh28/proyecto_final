from screens.base_screen import BaseScreen


class DashboardScreen(BaseScreen):
    def on_pre_enter(self, *args):
        if self.app and self.app.current_user:
            nombre = (
                self.app.current_user.get("nombre")
                or self.app.current_user.get("correo")
                or "usuario"
            )
            self.ids.dashboard_welcome.text = f"Bienvenido, {nombre}"
        return super().on_pre_enter(*args)
