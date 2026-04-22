import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useOrderDetail } from '../hooks/useOrders'
import { StatusBadge } from '../components/StatusBadge'
import { MapView } from '../components/MapView'
import { Timer } from '../components/Timer'
import type { Repartidor } from '../types'
import { ACCION_LABEL, ESTADO_SIGUIENTE } from '../types'
import { supabase } from '../lib/supabase'

export function OrderDetail() {
  const { id } = useParams<{ id: string }>()
  const { pedido, loading } = useOrderDetail(id ?? '')
  const [repartidores, setRepartidores] = useState<Repartidor[]>([])
  const [selectedRepartidor, setSelectedRepartidor] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    supabase.from('repartidores').select('*').eq('activo', true).then(({ data }) => {
      setRepartidores((data ?? []) as Repartidor[])
    })
  }, [])

  if (loading) return <div className="p-8 text-center text-gray-400">Cargando…</div>
  if (!pedido) return <div className="p-8 text-center text-gray-400">Pedido no encontrado.</div>

  const siguienteEstado = ESTADO_SIGUIENTE[pedido.estado]
  const accionLabel = ACCION_LABEL[pedido.estado]

  async function handleAction() {
    if (!siguienteEstado || !pedido) return
    setSaving(true)
    setMsg('')
    const update: Record<string, string> = { estado: siguienteEstado }
    if (pedido.estado === 'listo' && selectedRepartidor) {
      update.repartidor_id = selectedRepartidor
    }
    const { error } = await supabase.from('pedidos').update(update).eq('id', pedido.id)
    setSaving(false)
    setMsg(error ? `Error: ${error.message}` : 'Actualizado ✓')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <Link to="/pedidos" className="text-brand-600 font-medium text-sm">← Volver</Link>
        <h1 className="text-lg font-bold text-gray-800">Pedido #{pedido.numero_pedido}</h1>
      </header>

      <main className="px-4 py-6 max-w-lg mx-auto flex flex-col gap-5">
        {/* Estado y tiempo */}
        <div className="bg-white rounded-xl p-4 flex items-center justify-between shadow-sm border border-gray-100">
          <StatusBadge estado={pedido.estado} />
          <Timer createdAt={pedido.created_at} />
        </div>

        {/* Items */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-700 mb-3">Items</h2>
          <ul className="space-y-1.5">
            {pedido.items.map((item, i) => (
              <li key={i} className="flex justify-between text-sm">
                <span className="text-gray-700">{item.cantidad}x {item.nombre}</span>
                <span className="text-gray-500">${item.subtotal.toFixed(2)}</span>
              </li>
            ))}
          </ul>
          <div className="border-t mt-3 pt-3 flex justify-between font-semibold">
            <span>Total</span>
            <span>${pedido.total.toFixed(2)}</span>
          </div>
        </div>

        {/* Entrega */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-2">
          <h2 className="font-semibold text-gray-700">Entrega</h2>
          <p className="text-sm text-gray-600">
            <span className="font-medium">Pago:</span>{' '}
            {pedido.metodo_pago === 'efectivo' ? '💵 Efectivo' : '📲 Transferencia'}
          </p>
          {pedido.direccion_texto && (
            <p className="text-sm text-gray-600">
              <span className="font-medium">Dirección:</span> {pedido.direccion_texto}
            </p>
          )}
          {pedido.notas && (
            <p className="text-sm text-gray-600">
              <span className="font-medium">Notas:</span> {pedido.notas}
            </p>
          )}
        </div>

        {/* Mapa */}
        {pedido.ubicacion_lat && pedido.ubicacion_lng && (
          <div className="rounded-xl overflow-hidden shadow-sm border border-gray-100">
            <MapView
              lat={pedido.ubicacion_lat}
              lng={pedido.ubicacion_lng}
              label={pedido.direccion_texto ?? undefined}
              height="260px"
            />
          </div>
        )}

        {/* Acción */}
        {accionLabel && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col gap-3">
            {pedido.estado === 'listo' && (
              <select
                value={selectedRepartidor}
                onChange={(e) => setSelectedRepartidor(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">— Seleccionar repartidor —</option>
                {repartidores.map((r) => (
                  <option key={r.id} value={r.id}>{r.nombre}</option>
                ))}
              </select>
            )}
            <button
              onClick={handleAction}
              disabled={saving || (pedido.estado === 'listo' && !selectedRepartidor)}
              className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              {saving ? 'Guardando…' : accionLabel}
            </button>
            {msg && <p className="text-center text-sm text-green-600">{msg}</p>}
          </div>
        )}
      </main>
    </div>
  )
}
