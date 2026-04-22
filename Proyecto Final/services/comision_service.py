class ComisionService:
    def __init__(self, client_manager):
        self.client_manager = client_manager

    def list_comisiones(self) -> list[dict]:
        client = self.client_manager.get_client()
        response = (
            client.table("comisiones")
            .select("id_comision, titulo, descripcion, fecha_inicio, fecha_fin, id_estado")
            .order("id_comision", desc=False)
            .execute()
        )
        return getattr(response, "data", None) or []

    def create_comision(self, payload: dict) -> dict:
        client = self.client_manager.get_client()
        response = client.table("comisiones").insert(payload).execute()
        data = getattr(response, "data", None) or []
        return data[0] if data else {}
