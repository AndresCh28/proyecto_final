from kivy.app import App
from kivy.lang import Builder
from kivy.uix.screenmanager import ScreenManager, Screen

# ==========================
# PANTALLAS
# ==========================

class LoginScreen(Screen):
    pass

class DashboardScreen(Screen):
    pass

class ComisionesScreen(Screen):
    pass

class PresupuestosScreen(Screen):
    pass

class ReportesScreen(Screen):
    pass

class NotificacionesScreen(Screen):
    pass

# ==========================
# ADMINISTRADOR DE PANTALLAS
# ==========================

class WindowManager(ScreenManager):
    pass

# ==========================
# APP PRINCIPAL
# ==========================

class SigecomApp(App):
    def build(self):
        return Builder.load_file("sigecom.kv")

if __name__ == "__main__":
    SigecomApp().run()