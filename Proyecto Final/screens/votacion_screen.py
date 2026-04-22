from screens.base_screen import BaseScreen


class VotacionScreen(BaseScreen):
    def on_pre_enter(self, *args):
        self.load_votacion()
        return super().on_pre_enter(*args)

    def load_votacion(self):
        propuesta = self.app.selected_propuesta or {}
        if not propuesta:
            self.ids.vote_title.text = "Selecciona una propuesta desde el modulo de propuestas."
            self.ids.votos_favor_label.text = "0"
            self.ids.votos_contra_label.text = "0"
            self.ids.votos_abstencion_label.text = "0"
            self.ids.vote_result_label.text = "Pendiente"
            return

        try:
            propuesta_actual = self.app.propuesta_service.get_by_id(propuesta["id_propuesta"])
            resumen = self.app.votacion_service.get_resumen_votacion(propuesta["id_propuesta"])
        except Exception as exc:
            self.set_status(f"No fue posible cargar la votacion: {exc}")
            return

        self.app.set_selected_propuesta(propuesta_actual or propuesta)
        self.ids.vote_title.text = (
            f"Propuesta seleccionada: {self.app.selected_propuesta.get('titulo', 'Sin titulo')}"
        )
        self.ids.votos_favor_label.text = str(resumen["a_favor"])
        self.ids.votos_contra_label.text = str(resumen["en_contra"])
        self.ids.votos_abstencion_label.text = str(resumen["abstenciones"])
        self.ids.vote_result_label.text = resumen["resultado"].capitalize()

    def emitir_voto(self, voto: str):
        propuesta = self.app.selected_propuesta or {}
        if not propuesta:
            self.set_status("Primero debes seleccionar una propuesta.")
            return

        payload = {
            "id_propuesta": propuesta["id_propuesta"],
            "id_usuario": self.app.current_user.get("id_usuario"),
            "voto": voto,
        }

        try:
            self.app.votacion_service.emitir_voto(payload)
            self.app.votacion_service.actualizar_resultado(propuesta["id_propuesta"])
        except Exception as exc:
            self.set_status(f"No fue posible registrar el voto: {exc}")
            return

        self.set_status("Voto registrado correctamente.")
        self.app.notify_action(
            f"Se registro un voto '{voto}' en la propuesta '{propuesta.get('titulo', 'sin titulo')}'.",
            "votacion",
            include_staff=True,
        )
        self.load_votacion()
