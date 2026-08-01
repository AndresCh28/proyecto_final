import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useAuth } from '../auth/AuthContext'
import { AppShell } from '../components/AppShell'
import { LoadingState } from '../components/LoadingState'
import { enviarMensajeComision, enviarMensajePrivado, fetchChatComisiones, fetchChatContacts, fetchChatMembers, fetchMensajesComision, fetchMensajesPrivados, markPrivateMessagesRead, openChatFile, uploadChatFile, type ChatComision, type ChatContact, type ChatMember, type MensajeComision, type MensajePrivado } from '../lib/mensajes'
import { supabase } from '../lib/supabase'
import { useWorkspace } from '../workspace/WorkspaceContext'

type ChatMode = 'comisiones' | 'privados'
const messageTime = (value: string) => new Intl.DateTimeFormat('es-CR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value))
const initial = (name: string) => name.trim().charAt(0).toUpperCase() || 'U'

export function ChatComisionesPage() {
  const { profile } = useAuth()
  const { workspace } = useWorkspace()
  const [mode, setMode] = useState<ChatMode>('comisiones')
  const [comisiones, setComisiones] = useState<ChatComision[]>([])
  const [contacts, setContacts] = useState<ChatContact[]>([])
  const [selectedId, setSelectedId] = useState(0)
  const [selectedContactId, setSelectedContactId] = useState(0)
  const [mensajes, setMensajes] = useState<MensajeComision[]>([])
  const [privateMessages, setPrivateMessages] = useState<MensajePrivado[]>([])
  const [members, setMembers] = useState<ChatMember[]>([])
  const [contenido, setContenido] = useState('')
  const [file, setFile] = useState<File|null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState('')
  const [onlineIds, setOnlineIds] = useState<Set<number>>(new Set())
  const [contactTyping, setContactTyping] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const typingStopRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const remoteTypingStopRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!profile) return
    void Promise.all([fetchChatComisiones(), fetchChatContacts(profile.idUsuario)]).then(([rooms, people]) => {
      setComisiones(rooms); setContacts(people); setSelectedId(rooms[0]?.id_comision ?? 0); setSelectedContactId(people[0]?.id_usuario ?? 0)
    }).catch((error) => setStatus(error instanceof Error ? error.message : 'No fue posible cargar los chats.'))
  }, [profile, workspace?.id_espacio])

  useEffect(() => {
    if (!profile || !workspace) { setOnlineIds(new Set()); return }
    const channel = supabase.channel(`presence-workspace-${workspace.id_espacio}`, { config: { presence: { key: String(profile.idUsuario) }, broadcast: { self: false } } })
    realtimeChannelRef.current = channel
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState() as Record<string, Array<{ id_usuario?: number }>>
      const ids = Object.values(state).flat().map((item) => Number(item.id_usuario)).filter(Number.isFinite)
      setOnlineIds(new Set(ids))
    }).on('broadcast', { event: 'typing' }, ({ payload }) => {
      const event = payload as { id_espacio?: number; from?: number; to?: number; typing?: boolean }
      if (event.id_espacio !== workspace.id_espacio || event.to !== profile.idUsuario) return
      if (event.from !== selectedContactId) return
      setContactTyping(Boolean(event.typing))
      if (remoteTypingStopRef.current) clearTimeout(remoteTypingStopRef.current)
      if (event.typing) remoteTypingStopRef.current = setTimeout(() => setContactTyping(false), 2600)
    }).subscribe(async (subscriptionStatus) => {
      if (subscriptionStatus === 'SUBSCRIBED') await channel.track({ id_usuario: profile.idUsuario, nombre: profile.nombre, online_at: new Date().toISOString() })
    })
    return () => { realtimeChannelRef.current = null; if (remoteTypingStopRef.current) clearTimeout(remoteTypingStopRef.current); void channel.untrack(); void supabase.removeChannel(channel) }
  }, [profile?.idUsuario, workspace?.id_espacio, selectedContactId])

  useEffect(() => {
    if (mode !== 'comisiones' || !selectedId) return
    let mounted = true
    const load = async () => { try { const [rows, people] = await Promise.all([fetchMensajesComision(selectedId), fetchChatMembers(selectedId)]); if (mounted) { setMensajes(rows); setMembers(people) } } catch (error) { if (mounted) setStatus(error instanceof Error ? error.message : 'No fue posible cargar el chat.') } finally { if (mounted) setLoading(false) } }
    setLoading(true); void load()
    const channel = supabase.channel(`chat-comision-${selectedId}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensajes_comision', filter: `id_comision=eq.${selectedId}` }, () => void load()).subscribe()
    return () => { mounted = false; void supabase.removeChannel(channel) }
  }, [mode, selectedId])

  useEffect(() => {
    if (mode !== 'privados' || !profile || !selectedContactId) return
    let mounted = true
    const load = async () => { try { const rows = await fetchMensajesPrivados(profile.idUsuario, selectedContactId); await markPrivateMessagesRead(profile.idUsuario, selectedContactId); if (mounted) { setPrivateMessages(rows.map((item) => item.id_destinatario === profile.idUsuario ? { ...item, leido: true } : item)); setContacts((items) => items.map((item) => item.id_usuario === selectedContactId ? { ...item, unread_count: 0 } : item)) } } catch (error) { if (mounted) setStatus(error instanceof Error ? error.message : 'No fue posible cargar la conversación privada.') } finally { if (mounted) setLoading(false) } }
    setLoading(true); void load()
    const refresh = () => { void load(); void fetchChatContacts(profile.idUsuario).then(setContacts) }
    const channel = supabase.channel(`privado-${profile.idUsuario}-${selectedContactId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mensajes_privados', filter: `id_remitente=eq.${profile.idUsuario}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mensajes_privados', filter: `id_destinatario=eq.${profile.idUsuario}` }, refresh).subscribe()
    return () => { mounted = false; void supabase.removeChannel(channel) }
  }, [mode, profile, selectedContactId])

  useEffect(() => { const container = endRef.current?.parentElement; if (container) container.scrollTop = container.scrollHeight }, [mensajes, privateMessages])

  function broadcastTyping(typing: boolean) {
    if (mode !== 'privados' || !profile || !workspace || !selectedContactId) return
    void realtimeChannelRef.current?.send({ type: 'broadcast', event: 'typing', payload: { id_espacio: workspace.id_espacio, from: profile.idUsuario, to: selectedContactId, typing } })
  }

  function changeContent(value: string) {
    setContenido(value)
    if (mode !== 'privados') return
    broadcastTyping(Boolean(value.trim()))
    if (typingStopRef.current) clearTimeout(typingStopRef.current)
    typingStopRef.current = setTimeout(() => broadcastTyping(false), 1800)
  }

  async function submit(event: FormEvent) {
    event.preventDefault(); if (!profile || (!contenido.trim()&&!file) || sending) return
    setSending(true); setStatus('')
    try {
      const attachment=file?await uploadChatFile(file,profile.idUsuario):undefined
      if (mode === 'comisiones') { await enviarMensajeComision(selectedId, profile.idUsuario, contenido,attachment); setMensajes(await fetchMensajesComision(selectedId)) }
      else { await enviarMensajePrivado(profile.idUsuario, selectedContactId, contenido,attachment); setPrivateMessages(await fetchMensajesPrivados(profile.idUsuario, selectedContactId)) }
      broadcastTyping(false)
      setContenido('');setFile(null)
    } catch (error) { setStatus(error instanceof Error ? error.message : 'No fue posible enviar el mensaje.') } finally { setSending(false) }
  }

  const selectedRoom = comisiones.find((item) => item.id_comision === selectedId)
  const selectedContact = contacts.find((item) => item.id_usuario === selectedContactId)
  const canSend = mode === 'comisiones' ? Boolean(selectedId) : Boolean(selectedContactId)

  return <AppShell title="Chat" subtitle="Conversa en grupos de comisión o de forma privada con otros miembros.">
    <section className="chat-room glass-card">
      <aside className="chat-room-menu">
        <div className="chat-mode-tabs"><button className={mode === 'comisiones' ? 'active' : ''} onClick={() => setMode('comisiones')}>General</button><button className={mode === 'privados' ? 'active' : ''} onClick={() => setMode('privados')}>Privados</button></div>
        <div className="chat-room-list">{mode === 'comisiones' ? comisiones.map((item) => <button type="button" key={item.id_comision} className={`chat-room-option${selectedId === item.id_comision ? ' active' : ''}`} onClick={() => setSelectedId(item.id_comision)}><span className="chat-room-avatar">{initial(item.titulo)}</span><span><strong>Chat general</strong><small>{item.titulo}</small></span></button>) : contacts.map((contact) => <button type="button" key={contact.id_usuario} className={`chat-room-option${selectedContactId === contact.id_usuario ? ' active' : ''}`} onClick={() => setSelectedContactId(contact.id_usuario)}><span className={`chat-room-avatar presence-avatar${onlineIds.has(contact.id_usuario) ? ' online' : ''}`}>{contact.avatar_url ? <img src={contact.avatar_url} alt="" /> : initial(contact.nombre)}<i /></span><span><strong>{contact.nombre}</strong><small className={onlineIds.has(contact.id_usuario) ? 'presence-online-text' : ''}>{onlineIds.has(contact.id_usuario) ? 'En línea' : 'Desconectado'}</small></span>{contact.unread_count > 0 ? <b className="chat-unread-count">{contact.unread_count > 99 ? '99+' : contact.unread_count}</b> : null}</button>)}</div>
      </aside>
      <div className="chat-room-conversation">
        <div className="chat-room-head"><span className={`chat-room-avatar${mode === 'privados' ? ' presence-avatar' : ''}${mode === 'privados' && onlineIds.has(selectedContactId) ? ' online' : ''}`}>{mode === 'privados' && selectedContact?.avatar_url ? <img src={selectedContact.avatar_url} alt="" /> : initial(mode === 'comisiones' ? selectedRoom?.titulo ?? 'C' : selectedContact?.nombre ?? 'U')}{mode === 'privados' ? <i /> : null}</span><div><span className={`eyebrow${contactTyping && mode === 'privados' ? ' typing-active' : ''}`}>{mode === 'comisiones' ? 'Sala privada de comisión' : contactTyping ? 'Escribiendo…' : onlineIds.has(selectedContactId) ? 'En línea' : 'Conversación privada'}</span><h3>{mode === 'comisiones' ? selectedRoom?.titulo ?? 'Chat' : selectedContact?.nombre ?? 'Selecciona un miembro'}</h3></div></div>
        {mode === 'comisiones' ? <div className="chat-members"><strong>{members.length} miembros · {members.filter((member) => onlineIds.has(member.id_usuario)).length} en línea</strong><div>{members.map((member) => <span className={`chat-member presence-avatar${onlineIds.has(member.id_usuario) ? ' online' : ''}`} key={member.id_usuario} title={`${member.nombre} · ${onlineIds.has(member.id_usuario) ? 'En línea' : 'Desconectado'}`}>{member.avatar_url ? <img src={member.avatar_url} alt="" /> : initial(member.nombre)}<i /></span>)}</div></div> : null}
        {status ? <div className="form-status">{status}</div> : null}
        <div className="chat-room-messages" aria-live="polite">
          {loading ? <LoadingState rows={3} label="Cargando conversación…" /> : null}
          {!loading && mode === 'privados' && !selectedContactId ? <div className="empty-state">No hay otros miembros disponibles para conversar.</div> : null}
          {mode === 'comisiones' ? mensajes.map((message) => { const own = message.id_usuario === profile?.idUsuario; const name = own ? profile?.nombre ?? 'Tú' : message.usuario?.nombre ?? 'Usuario'; return <MessageBubble key={`g-${message.id_mensaje}`} own={own} name={name} avatar={message.usuario?.avatar_url} time={message.fecha_envio} content={message.contenido} filePath={message.archivo_ruta} fileName={message.archivo_nombre} /> }) : privateMessages.map((message) => { const own = message.id_remitente === profile?.idUsuario; const name = own ? profile?.nombre ?? 'Tú' : selectedContact?.nombre ?? 'Usuario'; return <MessageBubble key={`p-${message.id_mensaje}`} own={own} name={name} avatar={own ? null : selectedContact?.avatar_url} time={message.fecha_envio} content={message.contenido} read={own ? message.leido : undefined} filePath={message.archivo_ruta} fileName={message.archivo_nombre} /> })}
          <div ref={endRef} />
        </div>
        {mode === 'privados' && contactTyping ? <div className="chat-typing-indicator"><span /><span /><span /> {selectedContact?.nombre ?? 'El miembro'} está escribiendo</div> : null}
        <form className="chat-room-compose" onSubmit={submit}><label className="chat-file-button" title="Adjuntar archivo">📎<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf,text/plain,.docx,.xlsx" onChange={(event)=>setFile(event.target.files?.[0]??null)}/></label><div className="chat-compose-input">{file?<small>📄 {file.name}<button type="button" onClick={()=>setFile(null)}>×</button></small>:null}<input value={contenido} maxLength={1000} disabled={!canSend || sending} placeholder="Escribe un mensaje…" onChange={(event) => changeContent(event.target.value)} /></div><button type="submit" className="primary-button" disabled={!canSend || (!contenido.trim()&&!file) || sending}>{sending ? 'Enviando…' : 'Enviar'}</button></form>
      </div>
    </section>
  </AppShell>
}

function MessageBubble({ own, name, avatar, time, content, read,filePath,fileName }: { own:boolean; name:string; avatar:string|null|undefined; time:string; content:string; read?:boolean;filePath?:string|null;fileName?:string|null }) {
  return <div className={`chat-message-row${own ? ' own' : ''}`}><span className="message-avatar">{avatar ? <img src={avatar} alt="" /> : initial(name)}</span><article className={`chat-message${own ? ' own' : ''}`}><div><strong>{own ? 'Tú' : name}</strong><span>{messageTime(time)}{read === undefined ? '' : read ? ' · ✓✓' : ' · ✓'}</span></div>{content?<p>{content}</p>:null}{filePath?<button type="button" className="chat-attachment" onClick={()=>void openChatFile(filePath)}>📎 {fileName??'Abrir archivo'}</button>:null}</article></div>
}
