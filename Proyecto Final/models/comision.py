from dataclasses import dataclass


@dataclass(slots=True)
class Comision:
    id_comision: int
    titulo: str
    descripcion: str
    estado: str
