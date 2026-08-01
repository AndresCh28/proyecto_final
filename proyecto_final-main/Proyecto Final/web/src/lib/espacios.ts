import { supabase } from './supabase'
export function getActiveWorkspaceId(){return Number(sessionStorage.getItem('sigecom-workspace')??0)}
export interface EspacioTrabajo { id_espacio:number; nombre:string; descripcion:string|null; activo:boolean }
export interface SolicitudEspacio { id_solicitud:number; id_espacio:number; id_usuario:number; estado:string }
export async function fetchEspacios(){const {data,error}=await supabase.from('espacios_trabajo').select('id_espacio,nombre,descripcion,activo').eq('activo',true).order('nombre');if(error)throw error;return(data??[])as EspacioTrabajo[]}
export async function fetchMisEspacios(idUsuario:number){const {data,error}=await supabase.from('espacio_miembros').select('id_espacio,espacio:espacios_trabajo(id_espacio,nombre,descripcion,activo)').eq('id_usuario',idUsuario).eq('activo',true);if(error)throw error;return(data??[]).map((x)=>Array.isArray(x.espacio)?x.espacio[0]:x.espacio).filter(Boolean)as EspacioTrabajo[]}
export async function fetchMisSolicitudesEspacio(idUsuario:number){const {data,error}=await supabase.from('solicitudes_espacio').select('id_solicitud,id_espacio,id_usuario,estado').eq('id_usuario',idUsuario);if(error)throw error;return(data??[])as SolicitudEspacio[]}
export async function solicitarEspacio(idEspacio:number,idUsuario:number){const {error}=await supabase.from('solicitudes_espacio').insert({id_espacio:idEspacio,id_usuario:idUsuario,estado:'pendiente'});if(error)throw error}
export async function createEspacio(nombre:string,descripcion:string,idUsuario:number,rol:'Administrador'|'Coordinador'){
 const {data,error}=await supabase.from('espacios_trabajo').insert({nombre:nombre.trim().toUpperCase(),descripcion:descripcion.trim()||null,creado_por:idUsuario}).select('id_espacio,nombre,descripcion,activo').single();if(error)throw error
 const {error:memberError}=await supabase.from('espacio_miembros').insert({id_espacio:data.id_espacio,id_usuario:idUsuario,rol_espacio:rol,activo:true});if(memberError)throw memberError
 const {data:room,error:roomError}=await supabase.from('comisiones').insert({titulo:`${data.nombre} General`,descripcion:'Área general del espacio de trabajo',fecha_inicio:new Date().toISOString().slice(0,10),id_estado:1,creado_por:idUsuario,id_espacio:data.id_espacio,es_general:true}).select('id_comision').single();if(roomError)throw roomError
 const {error:roomMemberError}=await supabase.from('comision_miembros').insert({id_comision:room.id_comision,id_usuario:idUsuario,puede_votar:true,es_responsable:true,activo:true});if(roomMemberError)throw roomMemberError
 return data as EspacioTrabajo
}
