import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { StatusBadge } from '../components/StatusBadge'
import { supabase } from '../lib/supabase'
import type { Pedido } from '../types'

type Rango = 'hoy' | 'ayer' | 'semana' | 'mes' | 'custom'

function startOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

function toInputDate(date: Date) {
  return date.toISOString().split('T')[0]
}

function getRango(rango: Rango, customDesde: string, customHasta: string): { desde: Date; hasta: Date } {
  const hoy = new Date()
  switch (rango) {
    case 'hoy':
      return { desde: startOfDay(hoy), hasta: endOfDay(hoy) }
    case 'ayer': {
      const ayer = new Date(hoy)
      ayer.setDate(ayer.getDate() - 1)
      return { desde: startOfDay(ayer), hasta: endOfDay(ayer) }
    }
    case 'semana': {
      const lunes = new Date(hoy)
      lunes.setDate(hoy.getDate() - hoy.getDay() + 1)
      return { desde: startOfDay(lunes), hasta: endOfDay(hoy) }
    }
    case 'mes': {
      const primeroDeMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
      return { desde: startOfDay(primeroDeMes), hasta: endOfDay(hoy) }
    }
    case 'custom':
      return {
        desde: startOfDay(new Date(customDesde + 'T00:00:00')),
        hasta: endOfDay(new Date(customHasta + 'T00:00:00')),
      }
  }
}

const RANGOS: { key: Rango; label: string }[] = [
  { key: 'hoy', label: 'Hoy' },
  { key: 'ayer', label: 'Ayer' },
  { key: 'semana', label: 'Esta semana' },
  { key: 'mes', label: 'Este mes' },
  { key: 'custom', label: '📅 Fechas' },
]

export function History() {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [loading, setLoading] = useState(true)
  const [rango, setRango] = useState<Rango>('hoy')
  const [customDesde, setCustomDesde] = useState(toInputDate(new Date()))
  const [customHasta, setCustomHasta] = useState(toInputDate(new Date()))

  useEffect(() => {
    fetchPedidos()
  }, [rango, customDesde, customHasta])

  async function fetchPedidos() {
    setLoading(true)
    const { desde, hasta } = getRango(rango, customDesde, customHasta)
    const { data } = await supabase
      .from('pedidos')
      .select('*')
      .gte('created_at', desde.toISOString())
      .lte('created_at', hasta.toISOString())
      .order('created_at', { ascending: false })
    setPedidos((data ?? []) as Pedido[])
    setLoading(false)
  }

  const total = pedidos.reduce((sum, p) => sum + (p.estado !== 'cancelado' ? p.total : 0), 0)
  const entregados = pedidos.filter((p) => p.estado === 'entregado').length
  const cancelados = pedidos.filter((p) => p.estado === 'cancelado').length

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <Link to="/pedidos" className="text-brand-600 font-medium text-sm">← Volver</Link>
        <h1 className="text-lg font-bold text-gray-800">Historial</h1>
      </header>

      <main className="px-4 py-5 max-w-lg mx-auto flex flex-col gap-4">

        {/* Selector de rango */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 flex flex-col gap-3">
          <div className="flex gap-2 flex-wrap">
            {RANGOS.map((r) => (
              <button
                key={r.key}
                onClick={() => setRango(r.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  rango === r.key
                    ? 'bg-brand-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Picker de fechas personalizadas */}
          {rango === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customDesde}
                max={customHasta}
                onChange={(e) => setCustomDesde(e.target.value)}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <span className="text-gray-400 text-sm">–</span>
              <input
                type="date"
                value={customHasta}
                min={customDesde}
                max={toInputDate(new Date())}
                onChange={(e) => setCustomHasta(e.target.value)}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          )}
        </div>

        {/* Resumen */}
        <div className="grid grid-cols-4 gap-2">
          <Stat label="Pedidos" value={pedidos.length} />
          <Stat label="Entregados" value={entregados} color="text-green-600" />
          <Stat label="Cancelados" value={cancelados} color="text-red-500" />
          <Stat label="Total" value={`$${total.toFixed(0)}`} color="text-brand-600" />
        </div>

        {/* Lista */}
        {loading ? (
          <p className="text-center text-gray-400 mt-4">Cargando…</p>
        ) : pedidos.length === 0 ? (
          <div className="text-center mt-10">
            <p className="text-3xl mb-2">📋</p>
            <p className="text-gray-400 text-sm">No hay pedidos en este período</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {pedidos.map((pedido) => (
              <Link
                key={pedido.id}
                to={`/pedidos/${pedido.id}`}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-800">#{pedido.numero_pedido}</span>
                    <StatusBadge estado={pedido.estado} />
                  </div>
                  <p className="text-xs text-gray-400">
                    {new Date(pedido.created_at).toLocaleDateString('es-MX', {
                      day: '2-digit', month: 'short', year: rango !== 'hoy' && rango !== 'ayer' ? 'numeric' : undefined,
                    })}
                    {' '}
                    {new Date(pedido.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <span className="font-bold text-gray-700">${pedido.total.toFixed(2)}</span>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function Stat({ label, value, color = 'text-gray-800' }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="bg-white rounded-xl p-3 text-center shadow-sm border border-gray-100">
      <p className={`text-lg font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  )
}
