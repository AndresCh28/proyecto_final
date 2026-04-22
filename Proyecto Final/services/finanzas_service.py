class FinanzasService:
    def __init__(self, client_manager):
        self.client_manager = client_manager

    def list_by_comision(self, id_comision: int) -> list[dict]:
        client = self.client_manager.get_client()
        response = (
            client.table("movimientos_financieros")
            .select("id_movimiento, tipo, monto, descripcion, fecha")
            .eq("id_comision", id_comision)
            .order("fecha", desc=True)
            .execute()
        )
        return getattr(response, "data", None) or []

    def create_movimiento(self, payload: dict) -> dict:
        client = self.client_manager.get_client()
        response = client.table("movimientos_financieros").insert(payload).execute()
        data = getattr(response, "data", None) or []
        return data[0] if data else {}

    def get_balance(self, id_comision: int) -> dict:
        movimientos = self.list_by_comision(id_comision)
        ingresos = sum(float(item.get("monto", 0) or 0) for item in movimientos if item.get("tipo") == "ingreso")
        gastos = sum(float(item.get("monto", 0) or 0) for item in movimientos if item.get("tipo") == "gasto")
        return {
            "ingresos": ingresos,
            "gastos": gastos,
            "balance": ingresos - gastos,
        }
