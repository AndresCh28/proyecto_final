import { supabase } from './supabase'

export interface WorkspaceDocument {
  id: string
  recordId?: number
  name: string
  mimeType: string
  path: string
  bucket: 'chat-archivos' | 'sigecom-archivos'
  source: 'Repositorio' | 'Chat general' | 'Chat privado'
  context: string
  author: string
  uploaderId?: number
  size?: number
  category?: string
  createdAt: string
}

export async function fetchWorkspaceDocuments(idEspacio: number, idUsuario: number): Promise<WorkspaceDocument[]> {
  const { data: commissions, error: commissionError } = await supabase
    .from('comisiones').select('id_comision,titulo').eq('id_espacio', idEspacio)
  if (commissionError) throw commissionError

  const commissionIds = (commissions ?? []).map((item) => item.id_comision)
  const commissionNames = new Map((commissions ?? []).map((item) => [item.id_comision, item.titulo]))
  const groupQuery = commissionIds.length
    ? supabase.from('mensajes_comision').select('id_mensaje,id_comision,fecha_envio,archivo_ruta,archivo_nombre,archivo_tipo,usuario:usuarios!mensajes_comision_id_usuario_fkey(nombre)').in('id_comision', commissionIds).not('archivo_ruta', 'is', null)
    : Promise.resolve({ data: [], error: null })
  const privateQuery = supabase.from('mensajes_privados').select('id_mensaje,id_remitente,id_destinatario,fecha_envio,archivo_ruta,archivo_nombre,archivo_tipo,remitente:usuarios!mensajes_privados_id_remitente_fkey(nombre),destinatario:usuarios!mensajes_privados_id_destinatario_fkey(nombre)').eq('id_espacio', idEspacio).or(`id_remitente.eq.${idUsuario},id_destinatario.eq.${idUsuario}`).not('archivo_ruta', 'is', null)
  const repositoryQuery = supabase.from('archivos').select('id_archivo,nombre,bucket,ruta_storage,mime_type,tamano_bytes,fecha_subida,subido_por,categoria,usuario:usuarios!archivos_subido_por_fkey(nombre)').eq('id_espacio', idEspacio)
  const [groupResult, privateResult, repositoryResult] = await Promise.all([groupQuery, privateQuery, repositoryQuery])
  if (groupResult.error) throw groupResult.error
  if (privateResult.error) throw privateResult.error
  if (repositoryResult.error) throw repositoryResult.error

  const one = (value: unknown): { nombre?: string } | null => Array.isArray(value) ? (value[0] ?? null) : value as { nombre?: string } | null
  const group = (groupResult.data ?? []).map((item: any): WorkspaceDocument => ({
    id: `g-${item.id_mensaje}`, name: item.archivo_nombre ?? 'Archivo', mimeType: item.archivo_tipo ?? '', path: item.archivo_ruta, bucket: 'chat-archivos',
    source: 'Chat general', context: commissionNames.get(item.id_comision) ?? 'Conversación general', author: one(item.usuario)?.nombre ?? 'Usuario', createdAt: item.fecha_envio,
  }))
  const privateDocs = (privateResult.data ?? []).map((item: any): WorkspaceDocument => {
    const other = item.id_remitente === idUsuario ? one(item.destinatario)?.nombre : one(item.remitente)?.nombre
    return { id: `p-${item.id_mensaje}`, name: item.archivo_nombre ?? 'Archivo', mimeType: item.archivo_tipo ?? '', path: item.archivo_ruta, bucket: 'chat-archivos',
      source: 'Chat privado', context: `Conversación con ${other ?? 'miembro'}`, author: one(item.remitente)?.nombre ?? 'Usuario', createdAt: item.fecha_envio }
  })
  const repository = (repositoryResult.data ?? []).map((item: any): WorkspaceDocument => ({
    id: `r-${item.id_archivo}`, recordId: Number(item.id_archivo), name: item.nombre, mimeType: item.mime_type ?? '', path: item.ruta_storage,
    bucket: 'sigecom-archivos', source: 'Repositorio', context: item.categoria ?? 'General', category: item.categoria ?? 'General',
    author: one(item.usuario)?.nombre ?? 'Usuario', uploaderId: item.subido_por, size: item.tamano_bytes == null ? undefined : Number(item.tamano_bytes), createdAt: item.fecha_subida,
  }))
  return [...repository, ...group, ...privateDocs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export async function openWorkspaceDocument(path: string, bucket: WorkspaceDocument['bucket'] = 'chat-archivos') {
  const url = await getWorkspaceDocumentUrl(path, bucket)
  window.open(url, '_blank', 'noopener,noreferrer')
}

export async function getWorkspaceDocumentUrl(path: string, bucket: WorkspaceDocument['bucket'] = 'chat-archivos') {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 300)
  if (error) throw error
  return data.signedUrl
}

export async function downloadWorkspaceDocument(path: string, name: string, bucket: WorkspaceDocument['bucket'] = 'chat-archivos') {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 90, { download: name })
  if (error) throw error
  const link = document.createElement('a')
  link.href = data.signedUrl
  link.download = name
  document.body.appendChild(link)
  link.click()
  link.remove()
}

export async function uploadWorkspaceDocument(file: File, idEspacio: number, idUsuario: number, category: string) {
  if (file.size > 20 * 1024 * 1024) throw new Error('El archivo debe pesar menos de 20 MB.')
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${idEspacio}/${idUsuario}/${crypto.randomUUID()}-${safe}`
  const { error: uploadError } = await supabase.storage.from('sigecom-archivos').upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: false })
  if (uploadError) throw uploadError
  const { error: recordError } = await supabase.from('archivos').insert({ id_espacio: idEspacio, nombre: file.name, bucket: 'sigecom-archivos', ruta_storage: path, mime_type: file.type || null, tamano_bytes: file.size, subido_por: idUsuario, categoria: category })
  if (recordError) { await supabase.storage.from('sigecom-archivos').remove([path]); throw recordError }
}

export async function deleteWorkspaceDocument(document: WorkspaceDocument) {
  if (document.bucket !== 'sigecom-archivos' || !document.recordId) throw new Error('Los archivos de chat se eliminan desde su conversación.')
  const { error: storageError } = await supabase.storage.from(document.bucket).remove([document.path])
  if (storageError) throw storageError
  const { error: recordError } = await supabase.from('archivos').delete().eq('id_archivo', document.recordId)
  if (recordError) throw recordError
}
