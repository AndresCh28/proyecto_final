from screens.base_screen import BaseScreen


class LoginScreen(BaseScreen):
    def login(self):
        correo = self.ids.correo_input.text
        password = self.ids.password_input.text
        success, message, user_data = self.app.auth_service.login(correo, password)
        self.ids.message_label.text = message
        if success and user_data:
            self.ids.password_input.text = ""
            self.app.on_login_success(user_data)
            self.app.notify_action("Se ha iniciado sesion en SIGECOM.", "seguridad", include_staff=False)
