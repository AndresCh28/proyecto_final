class PresupuestoService:
    def __init__(self, client_manager):
        self.client_manager = client_manager

    def get_by_comision(self, id_comision: int) -> dict:
        client = self.client_manager.get_client()
        response = (
            client.table("presupuestos")
            .select(
                "id_presupuesto, id_comision, monto_estimado, monto_aprobado, fecha_aprobacion, observaciones"
            )
            .eq("id_comision", id_comision)
            .limit(1)
            .execute()
        )
        data = getattr(response, "data", None) or []
        return data[0] if data else {}

    def save_presupuesto(self, payload: dict) -> dict:
        client = self.client_manager.get_client()
        existing = self.get_by_comision(payload["id_comision"])
        if existing:
            response = (
                client.table("presupuestos")
                .update(payload)
                .eq("id_presupuesto", existing["id_presupuesto"])
                .execute()
            )
        else:
            response = client.table("presupuestos").insert(payload).execute()
        data = getattr(response, "data", None) or []
        return data[0] if data else {}
