from kivy.app import App


def set_app_status(message: str):
    app = App.get_running_app()
    if app:
        app.status_message = message
