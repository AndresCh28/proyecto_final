import { supabase } from './supabase'
import { getActiveWorkspaceId } from './espacios'
export interface ChatAttachment { archivo_ruta:string;archivo_nombre:string;archivo_tipo:string }
export interface MensajeComision { id_mensaje:number; id_comision:number; id_usuario:number; contenido:string; fecha_envio:string; archivo_ruta:string|null;archivo_nombre:string|null;archivo_tipo:string|null;usuario:{nombre:string;avatar_url:string|null}|null }
export interface ChatComision { id_comision:number; titulo:string }
export interface ChatMember { id_usuario:number; nombre:string; avatar_url:string|null; es_responsable:boolean }
export interface ChatContact { id_usuario:number; nombre:string; avatar_url:string|null; unread_count:number }
export interface MensajePrivado { id_mensaje:number; id_espacio:number; id_remitente:number; id_destinatario:number; contenido:string; fecha_envio:string; leido:boolean;archivo_ruta:string|null;archivo_nombre:string|null;archivo_tipo:string|null }
export async function fetchUnreadPrivateCount(idUsuario:number,idEspacio:number):Promise<number>{
 const{count,error}=await supabase.from('mensajes_privados').select('id_mensaje',{count:'exact',head:true}).eq('id_espacio',idEspacio).eq('id_destinatario',idUsuario).eq('leido',false)
 if(error)throw error
 return count??0
}
export async function fetchChatComisiones():Promise<ChatComision[]> {
 const idEspacio=getActiveWorkspaceId();if(!idEspacio)return[]
 const {data,error}=await supabase.from('comisiones').select('id_comision,titulo').eq('id_espacio',idEspacio).eq('es_general',true).order('titulo',{ascending:true})
 if(error) throw error
 return (data??[]).map((item)=>({id_comision:Number(item.id_comision),titulo:item.titulo}))
}
export async function fetchMensajesComision(idComision:number):Promise<MensajeComision[]> {
 const {data,error}=await supabase.from('mensajes_comision').select('id_mensaje,id_comision,id_usuario,contenido,fecha_envio,archivo_ruta,archivo_nombre,archivo_tipo,usuario:usuarios!mensajes_comision_id_usuario_fkey(nombre,avatar_url)').eq('id_comision',idComision).order('fecha_envio',{ascending:true}).limit(200)
 if(error) throw error
 return (data??[]).map((item)=>({...item,usuario:Array.isArray(item.usuario)?item.usuario[0]??null:item.usuario})) as MensajeComision[]
}
export async function fetchChatMembers(idComision:number):Promise<ChatMember[]> {
 const {data,error}=await supabase.from('comision_miembros').select('id_usuario,es_responsable,usuario:usuarios!comision_miembros_id_usuario_fkey(nombre,avatar_url)').eq('id_comision',idComision).eq('activo',true)
 if(error) throw error
 return (data??[]).map((item)=>{const user=Array.isArray(item.usuario)?item.usuario[0]:item.usuario;return {id_usuario:item.id_usuario,nombre:user?.nombre??'Usuario',avatar_url:user?.avatar_url??null,es_responsable:Boolean(item.es_responsable)}})
}
export async function enviarMensajeComision(idComision:number,idUsuario:number,contenido:string,attachment?:ChatAttachment){
 const {error}=await supabase.from('mensajes_comision').insert({id_comision:idComision,id_usuario:idUsuario,contenido:contenido.trim(),...attachment})
 if(error) throw error
}
export async function fetchChatContacts(idUsuario:number):Promise<ChatContact[]> {
 const idEspacio=getActiveWorkspaceId();if(!idEspacio)return[]
 const {data:memberships,error:membershipError}=await supabase.from('espacio_miembros').select('id_usuario').eq('id_espacio',idEspacio).eq('activo',true).neq('id_usuario',idUsuario)
 if(membershipError)throw membershipError
 const memberIds=(memberships??[]).map((item)=>item.id_usuario);if(!memberIds.length)return[]
 const [{data,error},{data:unread,error:unreadError}]=await Promise.all([
  supabase.from('usuarios').select('id_usuario,nombre,avatar_url').eq('activo',true).in('id_usuario',memberIds).order('nombre'),
  supabase.from('mensajes_privados').select('id_remitente').eq('id_espacio',idEspacio).eq('id_destinatario',idUsuario).eq('leido',false),
 ])
 if(error) throw error
 if(unreadError) throw unreadError
 const counts=new Map<number,number>();(unread??[]).forEach((item)=>counts.set(item.id_remitente,(counts.get(item.id_remitente)??0)+1))
 return (data??[]).map((item)=>({...item,unread_count:counts.get(item.id_usuario)??0})) as ChatContact[]
}
export async function fetchMensajesPrivados(idUsuario:number,idContacto:number):Promise<MensajePrivado[]> {
 const idEspacio=getActiveWorkspaceId();if(!idEspacio)return[]
 const {data,error}=await supabase.from('mensajes_privados').select('id_mensaje,id_espacio,id_remitente,id_destinatario,contenido,fecha_envio,leido,archivo_ruta,archivo_nombre,archivo_tipo').eq('id_espacio',idEspacio).or(`and(id_remitente.eq.${idUsuario},id_destinatario.eq.${idContacto}),and(id_remitente.eq.${idContacto},id_destinatario.eq.${idUsuario})`).order('fecha_envio',{ascending:true}).limit(200)
 if(error) throw error
 return (data??[]) as MensajePrivado[]
}
export async function markPrivateMessagesRead(idUsuario:number,idContacto:number){
 const idEspacio=getActiveWorkspaceId();if(!idEspacio)return
 const {error}=await supabase.from('mensajes_privados').update({leido:true}).eq('id_espacio',idEspacio).eq('id_destinatario',idUsuario).eq('id_remitente',idContacto).eq('leido',false)
 if(error) throw error
 window.dispatchEvent(new CustomEvent('sigecom-chat-read'))
}
export async function enviarMensajePrivado(idRemitente:number,idDestinatario:number,contenido:string,attachment?:ChatAttachment){
 const idEspacio=getActiveWorkspaceId();if(!idEspacio)throw new Error('Selecciona un espacio de trabajo.')
 const {error}=await supabase.from('mensajes_privados').insert({id_espacio:idEspacio,id_remitente:idRemitente,id_destinatario:idDestinatario,contenido:contenido.trim(),...attachment})
 if(error) throw error
}
export async function uploadChatFile(file:File,idUsuario:number):Promise<ChatAttachment>{
 if(file.size>10*1024*1024)throw new Error('El archivo debe pesar menos de 10 MB.')
 const idEspacio=getActiveWorkspaceId();const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'_');const path=`${idEspacio}/${idUsuario}/${crypto.randomUUID()}-${safe}`
 const{error}=await supabase.storage.from('chat-archivos').upload(path,file,{contentType:file.type,upsert:false});if(error)throw error
 return{archivo_ruta:path,archivo_nombre:file.name,archivo_tipo:file.type}
}
export async function openChatFile(path:string){const{data,error}=await supabase.storage.from('chat-archivos').createSignedUrl(path,300);if(error)throw error;window.open(data.signedUrl,'_blank','noopener,noreferrer')}
