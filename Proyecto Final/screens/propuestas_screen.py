from kivy.factory import Factory
from kivy.uix.label import Label

from screens.base_screen import BaseScreen


class PropuestasScreen(BaseScreen):
    def on_pre_enter(self, *args):
        self.load_propuestas()
        return super().on_pre_enter(*args)

    def create_propuesta(self):
        selected = self.app.selected_comision or {}
        if not selected:
            self.set_status("Primero debes seleccionar una comision.")
            return

        titulo = self.ids.propuesta_titulo_input.text.strip()
        descripcion = self.ids.propuesta_descripcion_input.text.strip()
        if not titulo or not descripcion:
            self.set_status("Debes completar titulo y descripcion de la propuesta.")
            return

        payload = {
            "id_comision": selected["id_comision"],
            "titulo": titulo,
            "descripcion": descripcion,
            "creada_por": self.app.current_user.get("id_usuario"),
        }

        try:
            propuesta = self.app.propuesta_service.create_propuesta(payload)
        except Exception as exc:
            self.set_status(f"No fue posible guardar la propuesta: {exc}")
            return

        self.ids.propuesta_titulo_input.text = ""
        self.ids.propuesta_descripcion_input.text = ""
        self.set_status("Propuesta creada correctamente.")
        self.app.notify_action(
            f"Se creo la propuesta '{propuesta.get('titulo', titulo)}' para la comision '{selected.get('titulo', 'sin nombre')}'.",
            "propuesta",
        )
        self.load_propuestas()

    def load_propuestas(self):
        container = self.ids.propuestas_container
        container.clear_widgets()
        selected = self.app.selected_comision or {}

        if not selected:
            container.add_widget(self._empty_label("Selecciona una comision para ver propuestas."))
            return

        try:
            propuestas = self.app.propuesta_service.list_by_comision(selected["id_comision"])
        except Exception as exc:
            self.set_status(f"No fue posible cargar propuestas: {exc}")
            return

        if not propuestas:
            container.add_widget(self._empty_label("No hay propuestas registradas para esta comision."))
            return

        for propuesta in propuestas:
            card = Factory.SectionCard()
            card.add_widget(self._info_label(f"[b]{propuesta.get('titulo', 'Sin titulo')}[/b]", True))
            card.add_widget(self._info_label(propuesta.get("descripcion") or "Sin descripcion."))
            card.add_widget(
                self._info_label(
                    f"Estado: {propuesta.get('estado', 'pendiente')} | "
                    f"Resultado: {propuesta.get('resultado_final', 'pendiente')}"
                )
            )
            button = Factory.SecondaryButton(text="Seleccionar para votar")
            button.bind(on_release=lambda _, item=propuesta: self.open_votacion(item))
            card.add_widget(button)
            container.add_widget(card)

    def open_votacion(self, propuesta: dict):
        self.app.set_selected_propuesta(propuesta)
        self.navigate("votacion")

    def _empty_label(self, text: str):
        return Label(
            text=text,
            color=(0.47, 0.57, 0.72, 1),
            size_hint_y=None,
            height=36,
        )

    def _info_label(self, text: str, markup: bool = False):
        label = Label(
            text=text,
            markup=markup,
            color=(0.17, 0.24, 0.39, 1),
            text_size=(0, None),
            halign="left",
            valign="middle",
            size_hint_y=None,
        )
        label.bind(texture_size=lambda inst, value: setattr(inst, "height", value[1] + 8))
        return label
