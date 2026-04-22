from screens.base_screen import BaseScreen


class DetalleComisionScreen(BaseScreen):
    def on_pre_enter(self, *args):
        selected = self.app.selected_comision or {}
        if selected:
            self.ids.detail_title.text = selected.get("titulo", "Detalle de comision")
            self.ids.detail_description.text = selected.get("descripcion") or "Sin descripcion registrada."
            self.ids.detail_period.text = (
                f"{selected.get('fecha_inicio', '-')}  ->  {selected.get('fecha_fin') or 'Sin cierre'}"
            )
        else:
            self.ids.detail_title.text = "Detalle de comision"
            self.ids.detail_description.text = "Selecciona una comision para ver su informacion."
            self.ids.detail_period.text = "-"
        return super().on_pre_enter(*args)
