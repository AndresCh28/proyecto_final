class PropuestaService:
    def __init__(self, client_manager):
        self.client_manager = client_manager

    def list_by_comision(self, id_comision: int) -> list[dict]:
        client = self.client_manager.get_client()
        response = (
            client.table("propuestas")
            .select("id_propuesta, titulo, descripcion, estado, resultado_final, fecha_creacion")
            .eq("id_comision", id_comision)
            .order("id_propuesta", desc=True)
            .execute()
        )
        return getattr(response, "data", None) or []

    def create_propuesta(self, payload: dict) -> dict:
        client = self.client_manager.get_client()
        response = client.table("propuestas").insert(payload).execute()
        data = getattr(response, "data", None) or []
        return data[0] if data else {}

    def get_by_id(self, id_propuesta: int) -> dict:
        client = self.client_manager.get_client()
        response = (
            client.table("propuestas")
            .select("id_propuesta, id_comision, titulo, descripcion, estado, resultado_final, fecha_creacion")
            .eq("id_propuesta", id_propuesta)
            .limit(1)
            .execute()
        )
        data = getattr(response, "data", None) or []
        return data[0] if data else {}
