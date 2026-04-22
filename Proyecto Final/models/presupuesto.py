from dataclasses import dataclass


@dataclass(slots=True)
class Presupuesto:
    id_presupuesto: int
    id_comision: int
    monto_estimado: float
    monto_aprobado: float
