from kivy.app import App
from kivy.uix.screenmanager import Screen


class BaseScreen(Screen):
    @property
    def app(self):
        return App.get_running_app()

    def navigate(self, screen_name: str):
        if self.manager:
            self.manager.current = screen_name

    def set_status(self, message: str):
        if self.app:
            self.app.status_message = message
