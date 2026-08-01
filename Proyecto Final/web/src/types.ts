export type RoleName = 'Administrador' | 'Coordinador' | 'Miembro' | 'Invitado'

export interface UserProfile {
  id: string
  idUsuario: number
  nombre: string
  correo: string
  telefono: string | null
  rol: RoleName
  activo: boolean
}

export interface Estado {
  id_estado: number
  nombre: string
}

export interface Comision {
  id_comision: number
  titulo: string
  descripcion: string | null
  fecha_inicio: string
  fecha_fin: string | null
  id_estado: number
  creado_por: number | null
  fecha_creacion: string
  estado_nombre?: string
}

export interface Presupuesto {
  id_presupuesto: number
  id_comision: number
  monto_estimado: number
  monto_aprobado: number | null
  fecha_aprobacion: string | null
  observaciones: string | null
}

export interface MovimientoFinanciero {
  id_movimiento: number
  id_comision: number
  tipo: 'ingreso' | 'gasto'
  monto: number
  descripcion: string
  fecha: string
}

export interface Usuario {
  id_usuario: number
  auth_user_id: string | null
  nombre: string
  correo: string
  telefono: string | null
  activo: boolean
  id_rol: number
  rol_nombre?: RoleName
}

export interface ComisionMiembro {
  id_comision: number
  id_usuario: number
  puede_votar: boolean
  es_responsable: boolean
  activo: boolean
  usuario?: Usuario
}

export interface SolicitudComision {
  id_solicitud: number
  id_comision: number
  id_usuario: number
  mensaje: string | null
  estado: 'pendiente' | 'aprobada' | 'rechazada'
  fecha_solicitud: string
  fecha_revision: string | null
  revisado_por: number | null
  comision?: Comision
  usuario?: Usuario
}

export interface SolicitudPresupuesto {
  id_solicitud_presupuesto: number
  id_comision: number
  id_usuario: number
  monto_solicitado: number
  justificacion: string
  estado: 'pendiente' | 'aprobada' | 'rechazada'
  fecha_solicitud: string
  fecha_revision: string | null
  revisado_por: number | null
}
