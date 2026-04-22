from kivy.factory import Factory
from kivy.uix.label import Label

from screens.base_screen import BaseScreen


class PresupuestosScreen(BaseScreen):
    def on_pre_enter(self, *args):
        self.load_presupuesto()
        self.load_movimientos()
        return super().on_pre_enter(*args)

    def save_presupuesto(self):
        selected = self.app.selected_comision or {}
        if not selected:
            self.set_status("Primero debes seleccionar una comision.")
            return

        try:
            monto_estimado = float(self.ids.monto_estimado_input.text.strip() or 0)
            monto_aprobado = float(self.ids.monto_aprobado_input.text.strip() or 0)
        except ValueError:
            self.set_status("Los montos deben ser numericos.")
            return

        payload = {
            "id_comision": selected["id_comision"],
            "monto_estimado": monto_estimado,
            "monto_aprobado": monto_aprobado,
            "observaciones": self.ids.observaciones_input.text.strip() or None,
            "creado_por": self.app.current_user.get("id_usuario"),
        }

        try:
            self.app.presupuesto_service.save_presupuesto(payload)
        except Exception as exc:
            self.set_status(f"No fue posible guardar el presupuesto: {exc}")
            return

        self.set_status("Presupuesto guardado correctamente.")
        self.app.notify_action(
            f"Se actualizo el presupuesto de la comision '{selected.get('titulo', 'sin nombre')}'.",
            "presupuesto",
        )
        self.load_presupuesto()

    def load_presupuesto(self):
        selected = self.app.selected_comision or {}
        if not selected:
            self.ids.monto_estimado_input.text = ""
            self.ids.monto_aprobado_input.text = ""
            self.ids.observaciones_input.text = ""
            self.ids.summary_comision.text = "Sin comision seleccionada"
            return

        self.ids.summary_comision.text = selected.get("titulo", "Comision seleccionada")

        try:
            presupuesto = self.app.presupuesto_service.get_by_comision(selected["id_comision"])
        except Exception as exc:
            self.set_status(f"No fue posible cargar el presupuesto: {exc}")
            return

        self.ids.monto_estimado_input.text = str(presupuesto.get("monto_estimado", "") or "")
        self.ids.monto_aprobado_input.text = str(presupuesto.get("monto_aprobado", "") or "")
        self.ids.observaciones_input.text = presupuesto.get("observaciones") or ""
        self.load_movimientos()

    def clear_form(self):
        self.ids.monto_estimado_input.text = ""
        self.ids.monto_aprobado_input.text = ""
        self.ids.observaciones_input.text = ""

    def save_movimiento(self):
        selected = self.app.selected_comision or {}
        if not selected:
            self.set_status("Primero debes seleccionar una comision.")
            return

        tipo = self.ids.movimiento_tipo_input.text.strip().lower()
        descripcion = self.ids.movimiento_descripcion_input.text.strip()
        try:
            monto = float(self.ids.movimiento_monto_input.text.strip() or 0)
        except ValueError:
            self.set_status("El monto del movimiento debe ser numerico.")
            return

        if tipo not in {"ingreso", "gasto"}:
            self.set_status("El tipo de movimiento debe ser 'ingreso' o 'gasto'.")
            return
        if not descripcion or monto <= 0:
            self.set_status("Debes indicar descripcion y un monto mayor a cero.")
            return

        payload = {
            "id_comision": selected["id_comision"],
            "tipo": tipo,
            "monto": monto,
            "descripcion": descripcion,
            "creado_por": self.app.current_user.get("id_usuario"),
        }

        try:
            self.app.finanzas_service.create_movimiento(payload)
        except Exception as exc:
            self.set_status(f"No fue posible guardar el movimiento: {exc}")
            return

        self.ids.movimiento_tipo_input.text = ""
        self.ids.movimiento_monto_input.text = ""
        self.ids.movimiento_descripcion_input.text = ""
        self.set_status("Movimiento financiero guardado correctamente.")
        self.app.notify_action(
            f"Se registro un {tipo} en la comision '{selected.get('titulo', 'sin nombre')}'.",
            "finanzas",
        )
        self.load_movimientos()

    def load_movimientos(self):
        selected = self.app.selected_comision or {}
        container = self.ids.movimientos_container
        container.clear_widgets()

        if not selected:
            self.ids.balance_ingresos.text = "$0.00"
            self.ids.balance_gastos.text = "$0.00"
            self.ids.balance_total.text = "$0.00"
            return

        try:
            movimientos = self.app.finanzas_service.list_by_comision(selected["id_comision"])
            balance = self.app.finanzas_service.get_balance(selected["id_comision"])
        except Exception as exc:
            self.set_status(f"No fue posible cargar movimientos: {exc}")
            return

        self.ids.balance_ingresos.text = f"${balance['ingresos']:.2f}"
        self.ids.balance_gastos.text = f"${balance['gastos']:.2f}"
        self.ids.balance_total.text = f"${balance['balance']:.2f}"

        if not movimientos:
            container.add_widget(self._empty_label("No hay movimientos financieros registrados."))
            return

        for item in movimientos:
            card = Factory.SectionCard()
            card.add_widget(self._info_label(f"{item.get('tipo', '').title()} - ${float(item.get('monto', 0) or 0):.2f}"))
            card.add_widget(self._info_label(item.get("descripcion") or "Sin descripcion"))
            card.add_widget(self._info_label(f"Fecha: {item.get('fecha', '-')}"))
            container.add_widget(card)

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
