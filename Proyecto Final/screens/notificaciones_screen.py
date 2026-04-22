from kivy.factory import Factory
from kivy.uix.label import Label

from screens.base_screen import BaseScreen


class NotificacionesScreen(BaseScreen):
    def on_pre_enter(self, *args):
        self.load_notificaciones()
        return super().on_pre_enter(*args)

    def load_notificaciones(self):
        container = self.ids.notifications_container
        container.clear_widgets()
        id_usuario = self.app.current_user.get("id_usuario")

        if not id_usuario:
            container.add_widget(self._empty_label("No hay usuario cargado en sesion."))
            return

        try:
            notificaciones = self.app.notificacion_service.list_by_user(id_usuario)
        except Exception as exc:
            self.set_status(f"No fue posible cargar notificaciones: {exc}")
            return

        if not notificaciones:
            container.add_widget(self._empty_label("No tienes notificaciones registradas."))
            return

        for item in notificaciones:
            card = Factory.SectionCard()
            card.add_widget(self._info_label(f"Tipo: {item.get('tipo', 'informativa')}"))
            card.add_widget(self._info_label(item.get("mensaje", "")))
            card.add_widget(
                self._info_label(
                    f"Estado: {'Leida' if item.get('leida') else 'Pendiente'} | "
                    f"Fecha: {item.get('fecha_envio', '-')}"
                )
            )
            if not item.get("leida"):
                button = Factory.SecondaryButton(text="Marcar como leida")
                button.bind(
                    on_release=lambda _, notification_id=item["id_notificacion"]: self.mark_as_read(notification_id)
                )
                card.add_widget(button)
            container.add_widget(card)

    def mark_as_read(self, notification_id: int):
        try:
            self.app.notificacion_service.mark_as_read(notification_id)
        except Exception as exc:
            self.set_status(f"No fue posible actualizar la notificacion: {exc}")
            return
        self.set_status("Notificacion actualizada.")
        self.load_notificaciones()

    def _empty_label(self, text: str):
        return Label(
            text=text,
            color=(0.47, 0.57, 0.72, 1),
            size_hint_y=None,
            height=36,
        )

    def _info_label(self, text: str):
        label = Label(
            text=text,
            color=(0.17, 0.24, 0.39, 1),
            text_size=(0, None),
            halign="left",
            valign="middle",
            size_hint_y=None,
        )
        label.bind(texture_size=lambda inst, value: setattr(inst, "height", value[1] + 8))
        return label
