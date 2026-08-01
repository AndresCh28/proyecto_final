import { useEffect } from 'react'

import { useLanguage } from './LanguageContext'

const phrases: Array<[string, string]> = [
  ['Debes ser miembro activo de esta comisión para crear propuestas.', 'You must be an active member of this committee to create proposals.'],
  ['Debes completar el título y la descripción.', 'You must complete the title and description.'],
  ['Permiso de votación actualizado.', 'Voting permission updated.'],
  ['Selecciona una comisión para ver sus propuestas.', 'Select a committee to view its proposals.'],
  ['Estás registrado como miembro votante de esta comisión.', 'You are registered as a voting member of this committee.'],
  ['Para votar, un coordinador debe agregarte como miembro votante de esta comisión.', 'To vote, a coordinator must add you as a voting member of this committee.'],
  ['Para crear propuestas, primero debes pertenecer a la comisión seleccionada.', 'To create proposals, you must first belong to the selected committee.'],
  ['Personas habilitadas para votar', 'People authorized to vote'],
  ['Todavía no hay miembros asociados a esta comisión.', 'There are no members associated with this committee yet.'],
  ['Propuestas de la comisión', 'Committee proposals'],
  ['Todavía no hay propuestas para esta comisión.', 'There are no proposals for this committee yet.'],
  ['Ver votación', 'View vote'],
  ['Sin cierre', 'No end date'],
  ['Solicitudes pendientes', 'Pending requests'],
  ['Comisión activa', 'Active committee'],
  ['Sin selección', 'No selection'],
  ['Selecciona una comisión para cargar su bloque financiero.', 'Select a committee to load its financial information.'],
  ['Estimación y aprobación', 'Estimate and approval'],
  ['Monto aprobado', 'Approved amount'],
  ['Pendiente de aprobación por votación', 'Pending approval by vote'],
  ['Notas, acuerdos o contexto de aprobación.', 'Notes, agreements or approval context.'],
  ['Explica para qué se necesita este presupuesto.', 'Explain what this budget is needed for.'],
  ['Debes ser miembro activo de esta comisión para pedir presupuesto.', 'You must be an active member of this committee to request a budget.'],
  ['Votación pendiente', 'Pending vote'],
  ['Enviar a votación', 'Submit for voting'],
  ['Ver aprobación', 'View approval'],
  ['No hay solicitudes de presupuesto pendientes.', 'There are no pending budget requests.'],
  ['Registrar ingreso o gasto', 'Record income or expense'],
  ['Actividad financiera', 'Financial activity'],
  ['Todavía no hay movimientos financieros para esta comisión.', 'There are no financial transactions for this committee yet.'],
  ['Tu rol actual solo puede consultar este módulo.', 'Your current role can only view this module.'],
  ['Observaciones', 'Notes'], ['Justificación', 'Justification'], ['Presupuesto', 'Budget'],
  ['Revisión', 'Review'], ['Movimientos', 'Transactions'], ['Tipo', 'Type'],
  ['Ingreso', 'Income'], ['Gasto', 'Expense'], ['Monto', 'Amount'], ['Contexto', 'Context'],
  ['Nueva propuesta', 'New proposal'], ['Cargando...', 'Loading...'], ['Creando...', 'Creating...'],
  ['Todavía no hay votaciones disponibles para esta comisión.', 'There are no votes available for this committee yet.'],
  ['Tu usuario debe estar agregado como miembro votante de esta comisión para votar.', 'Your user must be added as a voting member of this committee to vote.'],
  ['Cuando la solicitud sea aprobada, quedarás como miembro votante de esa comisión.', 'Once the request is approved, you will become a voting member of that committee.'],
  ['Puedes consultar usuarios, pero solo Administrador puede cambiar roles o estado.', 'You can view users, but only an Administrator can change roles or status.'],
  ['Puedes consultar comisiones y solicitar unirte para participar.', 'You can view committees and request to join them.'],
  ['No tienes notificaciones registradas por ahora.', 'You do not have any notifications yet.'],
  ['Selecciona una propuesta desde el módulo correspondiente.', 'Select a proposal from the corresponding module.'],
  ['No hay votaciones pendientes por ahora.', 'There are no pending votes at this time.'],
  ['Todavía no hay votos registrados para esta propuesta.', 'No votes have been recorded for this proposal yet.'],
  ['Todavía no hay comisiones registradas.', 'No committees have been registered yet.'],
  ['No hay comisiones activas registradas.', 'There are no active committees registered.'],
  ['No hay solicitudes pendientes.', 'There are no pending requests.'],
  ['No hay usuarios registrados.', 'There are no registered users.'],
  ['No hay resultados disponibles aun.', 'There are no results available yet.'],
  ['No hay datos financieros aun.', 'There is no financial data yet.'],
  ['Aún no hay actividad resumida.', 'There is no summarized activity yet.'],
  ['Esta propuesta no está pendiente.', 'This proposal is not pending.'],
  ['Sin descripción registrada.', 'No description provided.'],
  ['Solicitar unirse a una comisión', 'Request to join a committee'],
  ['Solicitudes pendientes para unirse', 'Pending join requests'],
  ['Comisiones registradas', 'Registered committees'],
  ['Votaciones de la comisión', 'Committee votes'],
  ['Selecciona la comisión', 'Select the committee'],
  ['Balance por comisión', 'Balance by committee'],
  ['Resultados y mayoria', 'Results and majority'],
  ['Operación de comisiones', 'Committee operations'],
  ['Votaciones abiertas', 'Open votes'],
  ['Acciones rápidas', 'Quick actions'],
  ['Trabajo frecuente', 'Frequent tasks'],
  ['Comisiones activas', 'Active committees'],
  ['Centro de mensajes', 'Message center'],
  ['Actividad reciente', 'Recent activity'],
  ['Control de acceso', 'Access control'],
  ['Cuentas registradas', 'Registered accounts'],
  ['Propuesta activa', 'Active proposal'],
  ['Votos registrados', 'Recorded votes'],
  ['Editar comisión', 'Edit committee'],
  ['Nueva comisión', 'New committee'],
  ['Cancelar edición', 'Cancel editing'],
  ['Guardar cambios', 'Save changes'],
  ['Crear comisión', 'Create committee'],
  ['Abrir votación', 'Open vote'],
  ['Marcar como leída', 'Mark as read'],
  ['Cargando tu sesión...', 'Loading your session...'],
  ['Cargando comisiones...', 'Loading committees...'],
  ['Cargando notificaciones...', 'Loading notifications...'],
  ['Cargando usuarios...', 'Loading users...'],
  ['Cargando resumen financiero...', 'Loading financial summary...'],
  ['Cargando propuestas...', 'Loading proposals...'],
  ['Cargando actividad...', 'Loading activity...'],
  ['Votaciones pendientes', 'Pending votes'],
  ['Propuestas aprobadas', 'Approved proposals'],
  ['Archivos asociados', 'Associated files'],
  ['Balance global', 'Overall balance'],
  ['Administradores', 'Administrators'], ['Administrador', 'Administrator'],
  ['Coordinador', 'Coordinator'], ['Miembro', 'Member'], ['Invitado', 'Guest'],
  ['Nombre completo', 'Full name'],
  ['Rol solicitado', 'Requested role'],
  ['Fecha inicio', 'Start date'],
  ['Fecha fin', 'End date'],
  ['En proceso', 'In progress'],
  ['A favor', 'In favor'],
  ['En contra', 'Against'],
  ['Foto de perfil', 'Profile photo'],
  ['Subir foto', 'Upload photo'],
  ['Guardar perfil', 'Save profile'],
  ['Perfil del usuario', 'User profile'],
  ['Información de SIGECOM', 'SIGECOM information'],
  ['Sistema Integral de Gestión de Comisión', 'Integrated Committee Management System'],
  ['Aplicación web administrativa conectada a Supabase.', 'Administrative web application connected to Supabase.'],
  ['Preferencias guardadas en este navegador.', 'Preferences saved in this browser.'],
  ['Participación', 'Participation'], ['Pendientes', 'Pending'], ['Finalizadas', 'Completed'],
  ['Solicitudes', 'Requests'], ['Comisión', 'Committee'], ['Comisiones', 'Committees'],
  ['Propuestas', 'Proposals'], ['Votaciones', 'Votes'], ['Notificaciones', 'Notifications'],
  ['Usuarios', 'Users'], ['Activos', 'Active'], ['Estado', 'Status'], ['Resultado', 'Result'],
  ['Resultados', 'Results'], ['Actividad', 'Activity'], ['Financiero', 'Financial'],
  ['Listado', 'List'], ['Formulario', 'Form'], ['Título', 'Title'], ['Descripción', 'Description'],
  ['Creada', 'Created'], ['Inicio', 'Start'], ['Cierre', 'End'], ['Solicitud', 'Request'],
  ['Aprobado', 'Approved'], ['Estimado', 'Estimated'], ['Balance actual', 'Current balance'],
  ['Archivos', 'Files'], ['Movimientos', 'Transactions'], ['Miembros', 'Members'],
  ['Abstenciones', 'Abstentions'], ['Historial', 'History'], ['Leída', 'Read'],
  ['Pendiente', 'Pending'], ['Activo', 'Active'], ['Inactivo', 'Inactive'],
  ['Nombre', 'Name'], ['Correo', 'Email'], ['Teléfono', 'Phone'], ['Rol', 'Role'],
  ['Cuenta', 'Account'], ['Preferencias', 'Preferences'], ['Apariencia', 'Appearance'],
  ['Tema', 'Theme'], ['Idioma', 'Language'], ['Claro', 'Light'], ['Oscuro', 'Dark'],
  ['Sistema', 'System'], ['Sesión actual', 'Current session'], ['Usuario', 'User'],
  ['Quitar', 'Remove'], ['Guardando...', 'Saving...'], ['Sin comisiones', 'No committees'],
  ['Seguridad', 'Security'], ['Verificación en dos pasos', 'Two-step verification'],
  ['Protección activa', 'Protection active'], ['Verificación pendiente', 'Verification pending'],
  ['Aplicación autenticadora', 'Authenticator app'], ['Cambiar autenticador', 'Change authenticator'],
  ['Cerrar otras sesiones', 'Close other sessions'], ['Dispositivos recientes', 'Recent devices'],
  ['Actividad de seguridad', 'Security activity'], ['Sin sesiones registradas.', 'No recorded sessions.'],
  ['Sin eventos registrados.', 'No recorded events.'], ['Restablecer OTP', 'Reset OTP'],
  ['Restableciendo...', 'Resetting...'], ['Cuentas registradas', 'Registered accounts'],
  ['Espacio de trabajo', 'Workspace'], ['Ir al selector de espacios', 'Go to workspace selector'],
  ['Solicitudes de acceso', 'Access requests'], ['Solicitudes pendientes', 'Pending requests'],
  ['Aprobar', 'Approve'], ['Rechazar', 'Reject'], ['Actualizar', 'Refresh'], ['Limpiar', 'Clear'],
  ['Buscar', 'Search'], ['Todos los roles', 'All roles'], ['Todos', 'All'],
  ['Reuniones', 'Meetings'], ['Documentos', 'Documents'], ['Bitácora', 'Audit log'],
  ['Configuración', 'Settings'], ['Reportes', 'Reports'], ['Dashboard', 'Dashboard'],
  ['Cerrar sesión', 'Sign out'], ['Descargar', 'Download'], ['Eliminar', 'Delete'],
  ['Vista previa', 'Preview'], ['Abrir', 'Open'], ['Abriendo...', 'Opening...'],
  ['Cargando módulo...', 'Loading module...'], ['No fue posible cargar', 'Unable to load'],
  ['No fue posible guardar', 'Unable to save'], ['No fue posible actualizar', 'Unable to update'],
]

const originals = new WeakMap<Node, string>()
const originalAttributes = new WeakMap<Element, Map<string, string>>()

function translate(value: string) {
  let result = value
  for (const [spanish, english] of phrases) {
    result = result.replaceAll(spanish, english)
  }
  return result
}

function update(root: ParentNode, english: boolean) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let node = walker.nextNode()
  while (node) {
    const parent = node.parentElement
    if (parent && !['SCRIPT', 'STYLE'].includes(parent.tagName)) {
      if (!originals.has(node)) originals.set(node, node.textContent ?? '')
      const original = originals.get(node) ?? ''
      node.textContent = english ? translate(original) : original
    }
    node = walker.nextNode()
  }

  const elements = root instanceof Element ? [root, ...root.querySelectorAll('*')] : [...root.querySelectorAll('*')]
  for (const element of elements) {
    for (const attribute of ['placeholder', 'title', 'aria-label']) {
      const value = element.getAttribute(attribute)
      if (value === null) continue
      let saved = originalAttributes.get(element)
      if (!saved) {
        saved = new Map()
        originalAttributes.set(element, saved)
      }
      if (!saved.has(attribute)) saved.set(attribute, value)
      const original = saved.get(attribute) ?? value
      element.setAttribute(attribute, english ? translate(original) : original)
    }
  }
}

export function UiTranslator() {
  const { language } = useLanguage()

  useEffect(() => {
    const english = language === 'en'
    update(document.body, english)
    const observer = new MutationObserver((mutations) => {
      observer.disconnect()
      for (const mutation of mutations) {
        if (mutation.type === 'characterData' && mutation.target.parentNode) {
          originals.set(mutation.target, mutation.target.textContent ?? '')
          update(mutation.target.parentNode, english)
        }
        for (const node of mutation.addedNodes) {
          if (node instanceof Element) update(node, english)
          else if (node.parentNode) update(node.parentNode, english)
        }
      }
      observer.observe(document.body, { childList: true, subtree: true, characterData: true })
    })
    observer.observe(document.body, { childList: true, subtree: true, characterData: true })
    return () => observer.disconnect()
  }, [language])

  return null
}
