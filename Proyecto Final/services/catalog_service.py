class CatalogService:
    def __init__(self, client_manager):
        self.client_manager = client_manager
        self._estado_map = None

    def get_estado_map(self) -> dict[int, str]:
        if self._estado_map is not None:
            return self._estado_map

        client = self.client_manager.get_client()
        response = client.table("estados").select("id_estado, nombre").execute()
        data = getattr(response, "data", None) or []
        self._estado_map = {row["id_estado"]: row["nombre"] for row in data}
        return self._estado_map
