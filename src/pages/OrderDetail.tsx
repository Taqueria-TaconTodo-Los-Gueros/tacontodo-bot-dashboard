import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useOrderDetail } from '../hooks/useOrders'
import { StatusBadge } from '../components/StatusBadge'
import { MapView } from '../components/MapView'
import { Timer } from '../components/Timer'
import type { Repartidor } from '../types'
import { ACCION_LABEL, ESTADO_SIGUIENTE } from '../types'
import { supabase } from '../lib/supabase'

interface RepartidorConCarga extends Repartidor {
  entregas_activas: number
}

const esRecoger = (direccion: string | null) => direccion === 'Recoger en local'

export function OrderDetail() {
  const { id } = useParams<{ id: string }>()
  const { pedido, loading } = useOrderDetail(id ?? '')
  const [repartidores, setRepartidores] = useState<RepartidorConCarga[]>([])
  const [selectedRepartidor, setSelectedRepartidor] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (pedido?.estado === 'listo' && !esRecoger(pedido.direccion_texto)) {
      fetchRepartidoresConCarga()
    }
  }, [pedido?.estado])

  async function fetchRepartidoresConCarga() {
    const [{ data: reps }, { data: activos }] = await Promise.all([
      supabase.from('repartidores').select('*').eq('activo', true),
      supabase.from('pedidos').select('repartidor_id').eq('estado', 'en_camino'),
    ])

    const cargas: Record<string, number> = {}
    activos?.forEach((p) => {
      if (p.repartidor_id) cargas[p.repartidor_id] = (cargas[p.repartidor_id] || 0) + 1
    })

    const conCarga: RepartidorConCarga[] = (reps ?? []).map((r) => ({
      ...(r as Repartidor),
      entregas_activas: cargas[r.id] || 0,
    })).sort((a, b) => a.entregas_activas - b.entregas_activas)

    setRepartidores(conCarga)

    // Auto-asignar al más libre
    if (conCarga.length > 0) setSelectedRepartidor(conCarga[0].id)
  }

  if (loading) return <div className="p-8 text-center text-gray-400">Cargando…</div>
  if (!pedido) return <div className="p-8 text-center text-gray-400">Pedido no encontrado.</div>

  const esPedidoRecoger = esRecoger(pedido.direccion_texto)
  const siguienteEstado = esPedidoRecoger && pedido.estado === 'listo'
    ? 'entregado' as const
    : ESTADO_SIGUIENTE[pedido.estado]
  const accionLabel = esPedidoRecoger && pedido.estado === 'listo'
    ? 'Marcar entregado 🏪'
    : ACCION_LABEL[pedido.estado]

  async function handleAction() {
    if (!siguienteEstado || !pedido) return
    setSaving(true)
    setMsg('')
    const update: Record<string, string> = { estado: siguienteEstado }
    if (pedido.estado === 'listo' && !esPedidoRecoger && selectedRepartidor) {
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
        {esPedidoRecoger && (
          <span className="text-xs bg-purple-100 text-purple-700 font-semibold px-2 py-0.5 rounded-full">🏪 Recoger en local</span>
        )}
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
            <span className="font-medium">Tipo:</span>{' '}
            {esPedidoRecoger ? '🏪 Recoger en local' : '🛵 Domicilio'}
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-medium">Pago:</span>{' '}
            {pedido.metodo_pago === 'efectivo' ? '💵 Efectivo' : '📲 Transferencia'}
          </p>
          {pedido.direccion_texto && !esPedidoRecoger && (
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

            {/* Selector de repartidor (solo domicilio en estado listo) */}
            {pedido.estado === 'listo' && !esPedidoRecoger && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-700">Asignar repartidor</p>
                  <span className="text-xs text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">⚖️ Auto-balanceado</span>
                </div>

                {/* Tarjetas de carga */}
                <div className="flex flex-col gap-2">
                  {repartidores.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setSelectedRepartidor(r.id)}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-lg border transition-all text-left ${
                        selectedRepartidor === r.id
                          ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-300'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${r.entregas_activas === 0 ? 'bg-green-500' : r.entregas_activas === 1 ? 'bg-yellow-400' : 'bg-red-400'}`} />
                        <span className="text-sm font-medium text-gray-800">{r.nombre}</span>
                        {selectedRepartidor === r.id && (
                          <span className="text-xs text-brand-600 font-semibold">✓ Seleccionado</span>
                        )}
                      </div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        r.entregas_activas === 0
                          ? 'bg-green-100 text-green-700'
                          : r.entregas_activas === 1
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {r.entregas_activas === 0 ? 'Libre' : `${r.entregas_activas} activa${r.entregas_activas > 1 ? 's' : ''}`}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleAction}
              disabled={saving || (pedido.estado === 'listo' && !esPedidoRecoger && !selectedRepartidor)}
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
