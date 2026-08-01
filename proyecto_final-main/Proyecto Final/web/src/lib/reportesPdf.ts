import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'
import type { AuditEntry } from './bitacora'
import type { Propuesta } from './propuestas'
import type { MovimientoFinanciero } from '../types'

interface ReportContext { workspace: string; members: string[]; generatedBy: string }
const blue: [number, number, number] = [9, 84, 180]
const navy: [number, number, number] = [7, 31, 61]
const pale: [number, number, number] = [235, 244, 255]
function safeFileName(value: string) { return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') }
function dateTime(value: string) { return new Intl.DateTimeFormat('es-CR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) }
function currency(value: number) { return `CRC ${new Intl.NumberFormat('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}` }

function header(doc: jsPDF, title: string, subtitle: string, context: ReportContext) {
  const width = doc.internal.pageSize.getWidth()
  doc.setFillColor(...navy); doc.rect(0, 0, width, 38, 'F')
  doc.setFillColor(...blue); doc.roundedRect(14, 10, 30, 18, 4, 4, 'F')
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.text('SIGECOM', 17, 21.5)
  doc.setFontSize(18); doc.text(title, 51, 17)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(194, 217, 244); doc.text(subtitle, 51, 24)
  doc.setTextColor(...navy); doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.text('ESPACIO DE TRABAJO', 14, 49)
  doc.setFontSize(15); doc.text(context.workspace, 14, 57)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(82, 99, 121); doc.text(`Generado por ${context.generatedBy} - ${dateTime(new Date().toISOString())}`, 14, 63)
  doc.setFillColor(...pale); doc.roundedRect(14, 68, width - 28, 20, 3, 3, 'F')
  doc.setFont('helvetica', 'bold'); doc.setTextColor(...blue); doc.text(`MIEMBROS (${context.members.length})`, 18, 75)
  doc.setFont('helvetica', 'normal'); doc.setTextColor(...navy)
  doc.text(doc.splitTextToSize(context.members.length ? context.members.join('  |  ') : 'Sin miembros registrados', width - 36).slice(0, 2), 18, 81)
  return 95
}
function decoratePages(doc: jsPDF) {
  const count = doc.getNumberOfPages()
  for (let page = 1; page <= count; page += 1) { doc.setPage(page); const width = doc.internal.pageSize.getWidth(); const height = doc.internal.pageSize.getHeight(); doc.setDrawColor(210, 222, 238); doc.line(14, height - 13, width - 14, height - 13); doc.setFontSize(8); doc.setTextColor(105, 121, 143); doc.text('Sistema Integral de Gestión de Comisión', 14, height - 8); doc.text(`Página ${page} de ${count}`, width - 14, height - 8, { align: 'right' }) }
}
export function downloadPropuestasPdf(items: Propuesta[], context: ReportContext) {
  const doc = new jsPDF({ format: 'a4', unit: 'mm' }); const startY = header(doc, 'Reporte de propuestas', `${items.length} propuestas incluidas`, context)
  autoTable(doc, { startY, margin: { left: 14, right: 14, bottom: 19 }, head: [['Fecha', 'Propuesta', 'Estado', 'Resultado', 'Descripción']], body: items.map((item) => [dateTime(item.fecha_creacion), item.titulo, item.estado, item.resultado_final, item.descripcion]), theme: 'grid', headStyles: { fillColor: blue, textColor: 255, fontStyle: 'bold' }, alternateRowStyles: { fillColor: pale }, styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak' }, columnStyles: { 0: { cellWidth: 24 }, 1: { cellWidth: 38 }, 2: { cellWidth: 20 }, 3: { cellWidth: 23 } } })
  decoratePages(doc); doc.save(`propuestas-${safeFileName(context.workspace)}.pdf`)
}
export function downloadFinanzasPdf(items: MovimientoFinanciero[], context: ReportContext) {
  const doc = new jsPDF({ format: 'a4', unit: 'mm' }); let startY = header(doc, 'Actividad financiera', `${items.length} movimientos incluidos`, context)
  const income = items.filter((x) => x.tipo === 'ingreso').reduce((sum, x) => sum + Number(x.monto), 0); const expenses = items.filter((x) => x.tipo === 'gasto').reduce((sum, x) => sum + Number(x.monto), 0)
  ;[['Ingresos', currency(income)], ['Gastos', currency(expenses)], ['Balance', currency(income - expenses)]].forEach(([label, value], index) => { const x = 14 + index * 61; doc.setFillColor(...(index === 1 ? [255, 240, 240] as [number, number, number] : pale)); doc.roundedRect(x, startY, 56, 19, 3, 3, 'F'); doc.setFontSize(8); doc.setTextColor(82, 99, 121); doc.text(label, x + 4, startY + 7); doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...navy); doc.text(value, x + 4, startY + 14); doc.setFont('helvetica', 'normal') })
  startY += 26
  autoTable(doc, { startY, margin: { left: 14, right: 14, bottom: 19 }, head: [['Fecha', 'Tipo', 'Descripción', 'Monto']], body: items.map((item) => [dateTime(item.fecha), item.tipo.toUpperCase(), item.descripcion, currency(Number(item.monto))]), theme: 'grid', headStyles: { fillColor: blue, textColor: 255 }, alternateRowStyles: { fillColor: pale }, styles: { fontSize: 8.5, cellPadding: 3 }, columnStyles: { 0: { cellWidth: 30 }, 1: { cellWidth: 24 }, 3: { cellWidth: 35, halign: 'right' } } })
  decoratePages(doc); doc.save(`finanzas-${safeFileName(context.workspace)}.pdf`)
}
export function downloadBitacoraPdf(items: AuditEntry[], context: ReportContext) {
  const doc = new jsPDF({ orientation: 'landscape', format: 'a4', unit: 'mm' }); const startY = header(doc, 'Bitácora administrativa', `${items.length} eventos de auditoría incluidos`, context)
  autoTable(doc, { startY, margin: { left: 14, right: 14, bottom: 19 }, head: [['Fecha', 'Módulo', 'Acción', 'Registro', 'Responsable', 'Detalle']], body: items.map((item) => [dateTime(item.fecha), item.tabla_afectada, item.accion, `#${item.id_registro}`, item.responsable?.[0]?.nombre ?? (item.realizado_por ? `Usuario #${item.realizado_por}` : 'Sistema'), item.descripcion ?? 'Sin detalle']), theme: 'grid', headStyles: { fillColor: blue, textColor: 255 }, alternateRowStyles: { fillColor: pale }, styles: { fontSize: 7.8, cellPadding: 2.7, overflow: 'linebreak' }, columnStyles: { 0: { cellWidth: 30 }, 1: { cellWidth: 32 }, 2: { cellWidth: 25 }, 3: { cellWidth: 18 }, 4: { cellWidth: 36 } } })
  decoratePages(doc); doc.save(`bitacora-${safeFileName(context.workspace)}.pdf`)
}
