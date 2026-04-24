from datetime import datetime
from pathlib import Path
import mimetypes
import webbrowser


class ArchivoService:
    def __init__(self, client_manager, bucket_name: str = "sigecom-archivos"):
        self.client_manager = client_manager
        self.bucket_name = bucket_name

    def list_by_comision(self, id_comision: int) -> list[dict]:
        client = self.client_manager.get_client()
        response = (
            client.table("archivos")
            .select(
                "id_archivo, id_comision, nombre, ruta_storage, url, mime_type, tamano_bytes, fecha_subida"
            )
            .eq("id_comision", id_comision)
            .order("fecha_subida", desc=True)
            .execute()
        )
        return getattr(response, "data", None) or []

    def upload_for_comision(
        self,
        file_path: str,
        id_comision: int,
        subido_por: int,
        nombre: str | None = None,
    ) -> dict:
        source = Path(file_path).expanduser()
        if not source.exists() or not source.is_file():
            raise ValueError("La ruta del archivo no existe o no es un archivo valido.")

        safe_name = source.name.replace(" ", "_")
        storage_path = f"comisiones/{id_comision}/{datetime.now().strftime('%Y%m%d%H%M%S')}_{safe_name}"
        mime_type = mimetypes.guess_type(str(source))[0] or "application/octet-stream"
        bucket = self.client_manager.get_client().storage.from_(self.bucket_name)

        with source.open("rb") as binary_file:
            bucket.upload(storage_path, binary_file, {"content-type": mime_type})

        signed = bucket.create_signed_url(storage_path, 3600)
        payload = {
            "id_comision": id_comision,
            "nombre": (nombre or source.stem).strip() or source.name,
            "bucket": self.bucket_name,
            "ruta_storage": storage_path,
            "url": signed.get("signedURL") or signed.get("signedUrl"),
            "mime_type": mime_type,
            "tamano_bytes": source.stat().st_size,
            "subido_por": subido_por,
        }

        response = self.client_manager.get_client().table("archivos").insert(payload).execute()
        data = getattr(response, "data", None) or []
        return data[0] if data else {}

    def create_signed_url(self, ruta_storage: str, expires_in: int = 3600) -> str:
        bucket = self.client_manager.get_client().storage.from_(self.bucket_name)
        signed = bucket.create_signed_url(ruta_storage, expires_in)
        return signed.get("signedURL") or signed.get("signedUrl") or ""

    def open_archivo(self, ruta_storage: str) -> bool:
        url = self.create_signed_url(ruta_storage)
        if not url:
            return False
        webbrowser.open(url)
        return True
