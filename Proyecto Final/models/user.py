from dataclasses import dataclass


@dataclass(slots=True)
class User:
    id: str
    correo: str
    nombre: str = ""
    rol: str = "Miembro"
    activo: bool = True
