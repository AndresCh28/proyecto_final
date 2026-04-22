class VotacionService:
    def __init__(self, client_manager):
        self.client_manager = client_manager

    def list_votos_by_propuesta(self, id_propuesta: int) -> list[dict]:
        client = self.client_manager.get_client()
        response = (
            client.table("votos")
            .select("id_voto, id_usuario, voto, fecha")
            .eq("id_propuesta", id_propuesta)
            .order("fecha", desc=True)
            .execute()
        )
        return getattr(response, "data", None) or []

    def emitir_voto(self, payload: dict) -> dict:
        client = self.client_manager.get_client()
        response = client.table("votos").insert(payload).execute()
        data = getattr(response, "data", None) or []
        return data[0] if data else {}

    def actualizar_resultado(self, id_propuesta: int) -> dict:
        client = self.client_manager.get_client()
        response = client.rpc("actualizar_resultado_propuesta", {"p_id_propuesta": id_propuesta}).execute()
        data = getattr(response, "data", None) or []
        return data[0] if data else {}

    def get_resumen_votacion(self, id_propuesta: int) -> dict:
        votos = self.list_votos_by_propuesta(id_propuesta)
        a_favor = sum(1 for item in votos if item.get("voto") == "a_favor")
        en_contra = sum(1 for item in votos if item.get("voto") == "en_contra")
        abstenciones = sum(1 for item in votos if item.get("voto") == "abstencion")
        if a_favor > en_contra:
            resultado = "aprobada"
        elif en_contra > a_favor:
            resultado = "rechazada"
        else:
            resultado = "empate"
        return {
            "a_favor": a_favor,
            "en_contra": en_contra,
            "abstenciones": abstenciones,
            "resultado": resultado,
        }
