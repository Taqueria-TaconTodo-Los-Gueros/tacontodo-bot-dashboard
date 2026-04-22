import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { MapView } from '../components/MapView'
import { supabase } from '../lib/supabase'
import type { Pedido, Repartidor } from '../types'

export function DeliveryView() {
  const { token } = useParams<{ token: string }>()
  const [repartidor, setRepartidor] = useState<Repartidor | null>(null)
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return
    loadData(token)
  }, [token])

  async function loadData(tok: string) {
    const { data: rep } = await supabase
      .from('repartidores')
      .select('*')
      .eq('token_acceso', tok)
      .eq('activo', true)
      .single()

    if (!rep) {
      setError('Link inválido o repartidor inactivo.')
      setLoading(false)
      return
    }
    setRepartidor(rep as Repartidor)

    const { data: peds } = await supabase
      .from('pedidos')
      .select('*')
      .eq('repartidor_id', rep.id)
      .eq('estado', 'en_camino')
      .order('created_at', { ascending: true })

    setPedidos((peds ?? []) as Pedido[])
    setLoading(false)
  }

  async function marcarEntregado(pedidoId: string) {
    await supabase.from('pedidos').update({ estado: 'entregado' }).eq('id', pedidoId)
    setPedidos((prev) => prev.filter((p) => p.id !== pedidoId))
  }

  if (loading) return <div className="p-8 text-center text-gray-400">Cargando…</div>
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-brand-600 text-white px-4 py-4">
        <h1 className="text-lg font-bold">🛵 Entregas — {repartidor?.nombre}</h1>
        <p className="text-sm text-orange-100">{pedidos.length} pendiente{pedidos.length !== 1 ? 's' : ''}</p>
      </header>

      <main className="px-4 py-5 flex flex-col gap-5 max-w-lg mx-auto">
        {pedidos.length === 0 && (
          <div className="text-center mt-16">
            <p className="text-4xl mb-3">✅</p>
            <p className="text-gray-400">No tienes entregas pendientes</p>
          </div>
        )}

        {pedidos.map((pedido) => (
          <div key={pedido.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-gray-800">Pedido #{pedido.numero_pedido}</span>
              {pedido.metodo_pago === 'efectivo' && (
                <span className="text-green-700 font-semibold">💵 Cobrar ${pedido.total.toFixed(2)}</span>
              )}
            </div>

            <div className="text-sm text-gray-600 space-y-1">
              {pedido.direccion_texto && (
                <p>📍 {pedido.direccion_texto}</p>
              )}
            </div>

            {pedido.ubicacion_lat && pedido.ubicacion_lng && (
              <MapView
                lat={pedido.ubicacion_lat}
                lng={pedido.ubicacion_lng}
                label={pedido.direccion_texto ?? undefined}
                height="200px"
              />
            )}

            <button
              onClick={() => marcarEntregado(pedido.id)}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              ✅ Marcar entregado
            </button>
          </div>
        ))}
      </main>
    </div>
  )
}
