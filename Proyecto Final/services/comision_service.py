class ComisionService:
    def __init__(self, client_manager):
        self.client_manager = client_manager

    def list_comisiones(self) -> list[dict]:
        client = self.client_manager.get_client()
        response = (
            client.table("comisiones")
            .select(
                "id_comision, titulo, descripcion, fecha_inicio, fecha_fin, id_estado, creado_por, fecha_creacion"
            )
            .order("id_comision", desc=False)
            .execute()
        )
        return getattr(response, "data", None) or []

    def create_comision(self, payload: dict) -> dict:
        client = self.client_manager.get_client()
        response = client.table("comisiones").insert(payload).execute()
        data = getattr(response, "data", None) or []
        return data[0] if data else {}

    def get_by_id(self, id_comision: int) -> dict:
        client = self.client_manager.get_client()
        response = (
            client.table("comisiones")
            .select(
                "id_comision, titulo, descripcion, fecha_inicio, fecha_fin, id_estado, creado_por, fecha_creacion"
            )
            .eq("id_comision", id_comision)
            .limit(1)
            .execute()
        )
        data = getattr(response, "data", None) or []
        return data[0] if data else {}

    def update_comision(self, id_comision: int, payload: dict) -> dict:
        client = self.client_manager.get_client()
        response = (
            client.table("comisiones")
            .update(payload)
            .eq("id_comision", id_comision)
            .execute()
        )
        data = getattr(response, "data", None) or []
        return data[0] if data else {}

    def update_estado(self, id_comision: int, id_estado: int) -> dict:
        return self.update_comision(id_comision, {"id_estado": id_estado})

    def ensure_member(self, id_comision: int, id_usuario: int, puede_votar: bool = True, es_responsable: bool = True):
        if not id_comision or not id_usuario:
            return {}

        client = self.client_manager.get_client()
        existing = (
            client.table("comision_miembros")
            .select("id_comision, id_usuario")
            .eq("id_comision", id_comision)
            .eq("id_usuario", id_usuario)
            .limit(1)
            .execute()
        )
        data = getattr(existing, "data", None) or []
        if data:
            return data[0]

        response = (
            client.table("comision_miembros")
            .insert(
                {
                    "id_comision": id_comision,
                    "id_usuario": id_usuario,
                    "puede_votar": puede_votar,
                    "es_responsable": es_responsable,
                    "activo": True,
                }
            )
            .execute()
        )
        created = getattr(response, "data", None) or []
        return created[0] if created else {}
