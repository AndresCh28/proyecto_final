from dataclasses import dataclass


@dataclass(slots=True)
class Notificacion:
    id_notificacion: int
    mensaje: str
    leida: bool = False
