from dataclasses import dataclass


@dataclass(slots=True)
class Propuesta:
    id_propuesta: int
    id_comision: int
    titulo: str
    estado: str
