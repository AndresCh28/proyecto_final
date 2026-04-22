from kivy.factory import Factory
from kivy.uix.label import Label

from screens.base_screen import BaseScreen


class ComisionesScreen(BaseScreen):
    def on_pre_enter(self, *args):
        self.load_comisiones()
        return super().on_pre_enter(*args)

    def create_comision(self):
        titulo = self.ids.titulo_input.text.strip()
        descripcion = self.ids.descripcion_input.text.strip()
        fecha_inicio = self.ids.fecha_inicio_input.text.strip()
        fecha_fin = self.ids.fecha_fin_input.text.strip()
        correo_destino = self.ids.correo_destino_input.text.strip()

        if not titulo or not fecha_inicio:
            self.set_status("Debes completar titulo y fecha de inicio.")
            return

        payload = {
            "titulo": titulo,
            "descripcion": descripcion or None,
            "fecha_inicio": fecha_inicio,
            "fecha_fin": fecha_fin or None,
            "id_estado": 1,
            "creado_por": self.app.current_user.get("id_usuario"),
        }

        try:
            created = self.app.comision_service.create_comision(payload)
        except Exception as exc:
            self.set_status(f"No fue posible guardar la comision: {exc}")
            return

        self.set_status(f"Comision '{created.get('titulo', titulo)}' guardada correctamente.")
        self.ids.titulo_input.text = ""
        self.ids.descripcion_input.text = ""
        self.ids.fecha_inicio_input.text = ""
        self.ids.fecha_fin_input.text = ""
        self.ids.correo_destino_input.text = ""

        self.app.notify_action(
            f"Se creo la comision '{created.get('titulo', titulo)}'.",
            "comision",
        )
        self._send_creation_email(created, correo_destino)
        self.load_comisiones()

    def _send_creation_email(self, created: dict, correo_destino: str):
        recipients = []
        if correo_destino:
            recipients.append(correo_destino)
        else:
            try:
                recipients = self.app.auth_service.user_service.list_active_emails_by_roles(
                    ["Administrador", "Coordinador"]
                )
            except Exception:
                recipients = []

        if not recipients:
            self.set_status("Comision creada. No se enviaron correos porque no hay destinatarios definidos.")
            return

        subject = f"SIGECOM: nueva comision creada - {created.get('titulo', 'Sin titulo')}"
        body = (
            "Se ha registrado una nueva comision en SIGECOM.\n\n"
            f"Titulo: {created.get('titulo', '-')}\n"
            f"Descripcion: {created.get('descripcion') or 'Sin descripcion'}\n"
            f"Fecha inicio: {created.get('fecha_inicio', '-')}\n"
            f"Fecha fin: {created.get('fecha_fin') or 'Sin fecha fin'}\n"
        )
        success, message = self.app.email_service.send_email(recipients, subject, body)
        if success:
            self.set_status("Comision creada y correo enviado.")
        else:
            self.set_status(f"Comision creada. {message}")

    def load_comisiones(self):
        container = self.ids.comisiones_container
        container.clear_widgets()

        try:
            comisiones = self.app.comision_service.list_comisiones()
            estado_map = self.app.catalog_service.get_estado_map()
        except Exception as exc:
            self.set_status(f"No fue posible cargar comisiones: {exc}")
            return

        if not comisiones:
            container.add_widget(self._empty_label("No hay comisiones registradas todavia."))
            return

        for comision in comisiones:
            estado = estado_map.get(comision.get("id_estado"), "Sin estado")
            card = Factory.SectionCard()
            card.add_widget(
                self._info_label(f"[b]{comision.get('titulo', 'Sin titulo')}[/b]", markup=True)
            )
            card.add_widget(self._info_label(f"Estado: {estado}"))
            card.add_widget(
                self._info_label(
                    f"Periodo: {comision.get('fecha_inicio', '-')}"
                    f" a {comision.get('fecha_fin') or 'Sin cierre'}"
                )
            )

            detail_button = Factory.SecondaryButton(text="Abrir detalle")
            detail_button.bind(on_release=lambda _, item=comision: self.open_detail(item))
            card.add_widget(detail_button)
            container.add_widget(card)

    def open_detail(self, comision: dict):
        self.app.set_selected_comision(comision)
        self.navigate("detalle_comision")

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
