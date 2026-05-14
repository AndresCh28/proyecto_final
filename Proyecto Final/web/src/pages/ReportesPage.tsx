import { useEffect, useMemo, useState } from 'react'

import { AppShell } from '../components/AppShell'
import { money } from '../lib/format'
import {
  fetchActividadComisiones,
  fetchBalanceComisiones,
  fetchResultadosPropuestas,
  type ActividadComisionRow,
  type BalanceComisionRow,
  type ResultadoPropuestaRow,
} from '../lib/reportes'

export function ReportesPage() {
  const [balances, setBalances] = useState<BalanceComisionRow[]>([])
  const [resultados, setResultados] = useState<ResultadoPropuestaRow[]>([])
  const [actividad, setActividad] = useState<ActividadComisionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')

  const resumen = useMemo(() => {
    const totalBalance = balances.reduce((acc, item) => acc + Number(item.balance_actual ?? 0), 0)
    const propuestasAprobadas = resultados.filter((item) => item.resultado_final === 'aprobada').length
    const archivosTotales = actividad.reduce((acc, item) => acc + Number(item.cantidad_archivos ?? 0), 0)

    return {
      totalBalance,
      propuestasAprobadas,
      archivosTotales,
    }
  }, [actividad, balances, resultados])

  useEffect(() => {
    void loadReportes()
  }, [])

  async function loadReportes() {
    setLoading(true)
    try {
      const [nextBalances, nextResultados, nextActividad] = await Promise.all([
        fetchBalanceComisiones(),
        fetchResultadosPropuestas(),
        fetchActividadComisiones(),
      ])
      setBalances(nextBalances)
      setResultados(nextResultados)
      setActividad(nextActividad)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No fue posible cargar los reportes.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppShell
      title="Reportes"
      subtitle="Consulta indicadores financieros, resultados de propuestas y actividad consolidada desde Supabase."
    >
      <div className="stats-grid">
        <article className="stat-card accent-blue">
          <span>Balance global</span>
          <strong>{loading ? '...' : money(resumen.totalBalance)}</strong>
        </article>
        <article className="stat-card accent-gold">
          <span>Propuestas aprobadas</span>
          <strong>{loading ? '...' : resumen.propuestasAprobadas}</strong>
        </article>
        <article className="stat-card accent-violet">
          <span>Archivos asociados</span>
          <strong>{loading ? '...' : resumen.archivosTotales}</strong>
        </article>
      </div>

      {status ? <div className="form-status">{status}</div> : null}

      <div className="panel-grid reports-layout">
        <section className="glass-card">
          <div className="section-head">
            <div>
              <span className="eyebrow">Financiero</span>
              <h3>Balance por comisión</h3>
            </div>
          </div>
          <div className="report-list">
            {loading ? <div className="empty-state">Cargando resumen financiero...</div> : null}
            {!loading && balances.length === 0 ? <div className="empty-state">No hay datos financieros aun.</div> : null}
            {balances.map((item) => (
              <article className="report-card" key={item.id_comision}>
                <strong>{item.titulo}</strong>
                <span>Estado: {item.estado}</span>
                <span>Estimado: {money(Number(item.monto_estimado ?? 0))}</span>
                <span>Aprobado: {money(Number(item.monto_aprobado ?? 0))}</span>
                <span>Balance actual: {money(Number(item.balance_actual ?? 0))}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="glass-card">
          <div className="section-head">
            <div>
              <span className="eyebrow">Propuestas</span>
              <h3>Resultados y mayoria</h3>
            </div>
          </div>
          <div className="report-list">
            {loading ? <div className="empty-state">Cargando propuestas...</div> : null}
            {!loading && resultados.length === 0 ? <div className="empty-state">No hay resultados disponibles aun.</div> : null}
            {resultados.map((item) => (
              <article className="report-card" key={item.id_propuesta}>
                <strong>{item.titulo}</strong>
                <span>Estado: {item.estado}</span>
                <span>Resultado: {item.resultado_final}</span>
                <span>
                  Votos: {item.votos_a_favor} a favor, {item.votos_en_contra} en contra, {item.abstenciones}{' '}
                  abstenciones
                </span>
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="glass-card">
        <div className="section-head">
          <div>
            <span className="eyebrow">Actividad</span>
            <h3>Operación de comisiones</h3>
          </div>
        </div>
        <div className="report-list">
          {loading ? <div className="empty-state">Cargando actividad...</div> : null}
          {!loading && actividad.length === 0 ? <div className="empty-state">Aún no hay actividad resumida.</div> : null}
          {actividad.map((item) => (
            <article className="report-card" key={item.id_comision}>
              <strong>{item.titulo}</strong>
              <span>Propuestas: {item.cantidad_propuestas}</span>
              <span>Archivos: {item.cantidad_archivos}</span>
              <span>Movimientos: {item.cantidad_movimientos}</span>
              <span>Miembros: {item.cantidad_miembros}</span>
            </article>
          ))}
        </div>
      </section>
    </AppShell>
  )
}
