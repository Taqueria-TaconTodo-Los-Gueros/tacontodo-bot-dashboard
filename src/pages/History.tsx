import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { StatusBadge } from '../components/StatusBadge'
import { supabase } from '../lib/supabase'
import type { Pedido } from '../types'

export function History() {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    supabase
      .from('pedidos')
      .select('*')
      .gte('created_at', today.toISOString())
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setPedidos((data ?? []) as Pedido[])
        setLoading(false)
      })
  }, [])

  const total = pedidos.reduce((sum, p) => sum + (p.estado !== 'cancelado' ? p.total : 0), 0)
  const entregados = pedidos.filter((p) => p.estado === 'entregado').length

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <Link to="/pedidos" className="text-brand-600 font-medium text-sm">← Volver</Link>
        <h1 className="text-lg font-bold text-gray-800">Historial del día</h1>
      </header>

      <main className="px-4 py-5 max-w-lg mx-auto">
        {/* Resumen del día */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <Stat label="Pedidos" value={pedidos.length} />
          <Stat label="Entregados" value={entregados} />
          <Stat label="Total" value={`$${total.toFixed(0)}`} />
        </div>

        {loading && <p className="text-center text-gray-400">Cargando…</p>}

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
                  {new Date(pedido.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <span className="font-bold text-gray-700">${pedido.total.toFixed(2)}</span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-xl p-3 text-center shadow-sm border border-gray-100">
      <p className="text-xl font-bold text-gray-800">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  )
}
