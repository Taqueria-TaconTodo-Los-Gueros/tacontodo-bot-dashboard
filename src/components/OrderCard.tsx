import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { EstadoPedido, Pedido, Repartidor } from '../types'
import { ACCION_LABEL, ESTADO_SIGUIENTE } from '../types'
import { StatusBadge } from './StatusBadge'
import { Timer } from './Timer'
import { supabase } from '../lib/supabase'

interface RepartidorConCarga extends Repartidor {
  entregas_activas: number
}

interface OrderCardProps {
  pedido: Pedido
  repartidores: Repartidor[]
  onUpdateEstado: (id: string, estado: EstadoPedido, repartidorId?: string) => Promise<void>
}

const esRecoger = (p: Pedido) => p.direccion_texto === 'Recoger en local'

export function OrderCard({ pedido, repartidores, onUpdateEstado }: OrderCardProps) {
  const [loading, setLoading] = useState(false)
  const [selectedRepartidor, setSelectedRepartidor] = useState('')
  const [cargas, setCargas] = useState<Record<string, number>>({})

  const esPedidoRecoger = esRecoger(pedido)
  const siguienteEstado = esPedidoRecoger && pedido.estado === 'listo'
    ? 'entregado' as EstadoPedido
    : ESTADO_SIGUIENTE[pedido.estado]
  const accionLabel = esPedidoRecoger && pedido.estado === 'listo'
    ? 'Marcar entregado 🏪'
    : ACCION_LABEL[pedido.estado]

  // Cargar cargas de trabajo cuando el pedido está listo y es domicilio
  useEffect(() => {
    if (pedido.estado === 'listo' && !esPedidoRecoger) {
      fetchCargas()
    }
  }, [pedido.estado])

  async function fetchCargas() {
    const { data } = await supabase
      .from('pedidos')
      .select('repartidor_id')
      .eq('estado', 'en_camino')
    const mapa: Record<string, number> = {}
    data?.forEach((p) => {
      if (p.repartidor_id) mapa[p.repartidor_id] = (mapa[p.repartidor_id] || 0) + 1
    })
    setCargas(mapa)

    // Auto-asignar al repartidor con menor carga
    const conCarga: RepartidorConCarga[] = repartidores.map((r) => ({
      ...r,
      entregas_activas: mapa[r.id] || 0,
    }))
    const mejor = conCarga.sort((a, b) => a.entregas_activas - b.entregas_activas)[0]
    if (mejor) setSelectedRepartidor(mejor.id)
  }

  async function handleAction() {
    if (!siguienteEstado) return
    if (pedido.estado === 'listo' && !esPedidoRecoger && !selectedRepartidor) return

    setLoading(true)
    try {
      await onUpdateEstado(
        pedido.id,
        siguienteEstado,
        !esPedidoRecoger ? selectedRepartidor || undefined : undefined,
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-gray-800">#{pedido.numero_pedido}</span>
          <StatusBadge estado={pedido.estado} />
          {esPedidoRecoger && (
            <span className="text-xs bg-purple-100 text-purple-700 font-semibold px-2 py-0.5 rounded-full">🏪 Local</span>
          )}
        </div>
        <Timer createdAt={pedido.created_at} />
      </div>

      {/* Items */}
      <ul className="text-sm text-gray-700 space-y-0.5">
        {pedido.items.map((item, i) => (
          <li key={i} className="flex justify-between">
            <span>{item.cantidad}x {item.nombre}</span>
            <span className="text-gray-500">${item.subtotal.toFixed(2)}</span>
          </li>
        ))}
      </ul>

      {/* Footer info */}
      <div className="flex items-center justify-between text-sm border-t pt-2">
        <span className="font-semibold text-gray-800">${pedido.total.toFixed(2)}</span>
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
          pedido.metodo_pago === 'efectivo'
            ? 'bg-green-50 text-green-700'
            : 'bg-blue-50 text-blue-700'
        }`}>
          {pedido.metodo_pago === 'efectivo' ? '💵 Efectivo' : '📲 Transferencia'}
        </span>
      </div>

      {pedido.direccion_texto && !esPedidoRecoger && (
        <p className="text-xs text-gray-500 truncate">📍 {pedido.direccion_texto}</p>
      )}

      {/* Selector de repartidor (solo domicilio) */}
      {pedido.estado === 'listo' && !esPedidoRecoger && repartidores.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500 font-medium">Repartidor asignado</p>
            <span className="text-xs text-brand-600">Auto-balanceado</span>
          </div>
          <select
            value={selectedRepartidor}
            onChange={(e) => setSelectedRepartidor(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">— Seleccionar repartidor —</option>
            {repartidores
              .map((r) => ({ ...r, entregas_activas: cargas[r.id] || 0 }))
              .sort((a, b) => a.entregas_activas - b.entregas_activas)
              .map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nombre} — {r.entregas_activas === 0 ? 'Libre ✅' : `${r.entregas_activas} entrega${r.entregas_activas > 1 ? 's' : ''} activa${r.entregas_activas > 1 ? 's' : ''}`}
                </option>
              ))}
          </select>
        </div>
      )}

      {/* Acción principal */}
      <div className="flex gap-2">
        {accionLabel && (
          <button
            onClick={handleAction}
            disabled={loading || (pedido.estado === 'listo' && !esPedidoRecoger && !selectedRepartidor)}
            className="flex-1 bg-brand-600 hover:bg-brand-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
          >
            {loading ? 'Guardando…' : accionLabel}
          </button>
        )}
        <Link
          to={`/pedidos/${pedido.id}`}
          className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Ver
        </Link>
      </div>
    </div>
  )
}
