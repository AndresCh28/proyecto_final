from kivy.factory import Factory
from kivy.uix.label import Label

from screens.base_screen import BaseScreen


class DetalleComisionScreen(BaseScreen):
    def on_pre_enter(self, *args):
        self.load_detalle()
        return super().on_pre_enter(*args)

    def load_detalle(self):
        selected = self.app.selected_comision or {}
        archivos_container = self.ids.archivos_container
        archivos_container.clear_widgets()

        if not selected:
            self.ids.detail_title.text = "Detalle de comision"
            self.ids.detail_description.text = "Selecciona una comision para ver su informacion."
            self.ids.detail_period.text = "-"
            self.ids.detail_estado.text = "Sin estado"
            self.ids.metric_presupuesto.text = "$0.00"
            self.ids.metric_balance.text = "$0.00"
            self.ids.metric_propuestas.text = "0"
            self.ids.metric_archivos.text = "0"
            archivos_container.add_widget(self._empty_label("No hay comision seleccionada."))
            return

        try:
            comision = self.app.comision_service.get_by_id(selected["id_comision"]) or selected
            presupuesto = self.app.presupuesto_service.get_by_comision(selected["id_comision"])
            balance = self.app.finanzas_service.get_balance(selected["id_comision"])
            propuestas = self.app.propuesta_service.list_by_comision(selected["id_comision"])
            archivos = self.app.archivo_service.list_by_comision(selected["id_comision"])
            estado_map = self.app.catalog_service.get_estado_map()
        except Exception as exc:
            self.set_status(f"No fue posible cargar el detalle de la comision: {exc}")
            return

        self.app.set_selected_comision(comision)
        self.ids.detail_title.text = comision.get("titulo", "Detalle de comision")
        self.ids.detail_description.text = comision.get("descripcion") or "Sin descripcion registrada."
        self.ids.detail_period.text = (
            f"{comision.get('fecha_inicio', '-')}  ->  {comision.get('fecha_fin') or 'Sin cierre'}"
        )
        self.ids.detail_estado.text = estado_map.get(comision.get("id_estado"), "Sin estado")
        self.ids.metric_presupuesto.text = f"${float(presupuesto.get('monto_aprobado', 0) or 0):.2f}"
        self.ids.metric_balance.text = f"${balance['balance']:.2f}"
        self.ids.metric_propuestas.text = str(len(propuestas))
        self.ids.metric_archivos.text = str(len(archivos))

        if not archivos:
            archivos_container.add_widget(self._empty_label("Aun no hay archivos asociados a esta comision."))
            return

        for archivo in archivos:
            card = Factory.SectionCard()
            card.add_widget(self._info_label(f"[b]{archivo.get('nombre', 'Archivo sin nombre')}[/b]", True))
            card.add_widget(self._info_label(f"Tipo: {archivo.get('mime_type') or 'No definido'}"))
            card.add_widget(self._info_label(f"Subido: {archivo.get('fecha_subida', '-') }"))
            open_button = Factory.SecondaryButton(text="Abrir archivo")
            open_button.bind(
                on_release=lambda _, ruta=archivo.get("ruta_storage"): self.open_archivo(ruta)
            )
            card.add_widget(open_button)
            archivos_container.add_widget(card)

    def change_estado(self, id_estado: int):
        selected = self.app.selected_comision or {}
        if not selected:
            self.set_status("Primero debes seleccionar una comision.")
            return

        try:
            updated = self.app.comision_service.update_estado(selected["id_comision"], id_estado)
        except Exception as exc:
            self.set_status(f"No fue posible cambiar el estado: {exc}")
            return

        self.app.set_selected_comision(updated or selected)
        self.app.notify_action(
            f"Se actualizo el estado de la comision '{selected.get('titulo', 'sin nombre')}'.",
            "comision",
        )
        self.set_status("Estado actualizado correctamente.")
        self.load_detalle()

    def upload_archivo(self):
        selected = self.app.selected_comision or {}
        if not selected:
            self.set_status("Primero debes seleccionar una comision.")
            return

        file_path = self.ids.archivo_path_input.text.strip()
        nombre = self.ids.archivo_nombre_input.text.strip()
        if not file_path:
            self.set_status("Debes indicar la ruta local del archivo a subir.")
            return

        try:
            archivo = self.app.archivo_service.upload_for_comision(
                file_path,
                selected["id_comision"],
                self.app.current_user.get("id_usuario"),
                nombre=nombre or None,
            )
        except Exception as exc:
            self.set_status(f"No fue posible subir el archivo: {exc}")
            return

        self.ids.archivo_path_input.text = ""
        self.ids.archivo_nombre_input.text = ""
        self.app.notify_action(
            f"Se subio el archivo '{archivo.get('nombre', 'sin nombre')}' a la comision '{selected.get('titulo', 'sin nombre')}'.",
            "archivo",
        )
        self.set_status("Archivo subido correctamente.")
        self.load_detalle()

    def open_archivo(self, ruta_storage: str):
        try:
            opened = self.app.archivo_service.open_archivo(ruta_storage)
        except Exception as exc:
            self.set_status(f"No fue posible abrir el archivo: {exc}")
            return

        self.set_status("Se abrio el archivo en el navegador." if opened else "No fue posible generar el enlace del archivo.")

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
