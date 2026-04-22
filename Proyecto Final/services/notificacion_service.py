class NotificacionService:
    def __init__(self, client_manager):
        self.client_manager = client_manager

    def list_by_user(self, id_usuario: int) -> list[dict]:
        client = self.client_manager.get_client()
        response = (
            client.table("notificaciones")
            .select("id_notificacion, mensaje, leida, tipo, fecha_envio")
            .eq("id_usuario", id_usuario)
            .order("fecha_envio", desc=True)
            .execute()
        )
        return getattr(response, "data", None) or []

    def mark_as_read(self, id_notificacion: int) -> dict:
        client = self.client_manager.get_client()
        response = (
            client.table("notificaciones")
            .update({"leida": True})
            .eq("id_notificacion", id_notificacion)
            .execute()
        )
        data = getattr(response, "data", None) or []
        return data[0] if data else {}

    def create_notification(self, payload: dict) -> dict:
        client = self.client_manager.get_client()
        response = client.table("notificaciones").insert(payload).execute()
        data = getattr(response, "data", None) or []
        return data[0] if data else {}

    def create_notifications_for_users(self, user_ids: list[int], mensaje: str, tipo: str = "informativa"):
        cleaned = sorted(set(user_id for user_id in user_ids if user_id))
        if not cleaned:
            return []

        client = self.client_manager.get_client()
        payload = [{"id_usuario": user_id, "mensaje": mensaje, "tipo": tipo} for user_id in cleaned]
        response = client.table("notificaciones").insert(payload).execute()
        return getattr(response, "data", None) or []
