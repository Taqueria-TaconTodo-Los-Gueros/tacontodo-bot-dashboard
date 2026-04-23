import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useOrders } from '../hooks/useOrders'
import { OrderCard } from '../components/OrderCard'
import type { EstadoPedido, Repartidor } from '../types'
import { ESTADO_LABELS } from '../types'
import { supabase } from '../lib/supabase'

const FILTROS: Array<EstadoPedido | 'todos'> = ['todos', 'recibido', 'en_preparacion', 'listo', 'en_camino']

export function OrdersBoard() {
  const { signOut, user } = useAuth()
  const { pedidos, loading, error, updateEstado } = useOrders()
  const [filtro, setFiltro] = useState<EstadoPedido | 'todos'>('todos')
  const [repartidores, setRepartidores] = useState<Repartidor[]>([])

  useEffect(() => {
    supabase.from('repartidores').select('*').eq('activo', true).then(({ data }) => {
      setRepartidores((data ?? []) as Repartidor[])
    })
  }, [])

  const pedidosFiltrados = filtro === 'todos'
    ? pedidos
    : pedidos.filter((p) => p.estado === filtro)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <h1 className="text-lg font-bold text-gray-800">🌮 Pedidos</h1>
        <div className="flex items-center gap-3">
          <Link to="/comanda" className="text-sm font-semibold text-brand-600 hover:text-brand-700 transition-colors">🧾 Comanda</Link>
          <Link to="/menu" className="text-sm text-gray-500 hover:text-brand-600 transition-colors">Menú</Link>
          <Link to="/repartidores" className="text-sm text-gray-500 hover:text-brand-600 transition-colors">Repartidores</Link>
          <Link to="/historial" className="text-sm text-gray-500 hover:text-brand-600 transition-colors hidden sm:block">Historial</Link>
          <span className="text-xs text-gray-400 hidden sm:block">{user?.email}</span>
          <button onClick={() => signOut()} className="text-sm text-gray-500 hover:text-red-600 transition-colors">
            Salir
          </button>
        </div>
      </header>

      {/* Filtros */}
      <div className="px-4 py-3 flex gap-2 overflow-x-auto">
        {FILTROS.map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filtro === f
                ? 'bg-brand-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {f === 'todos' ? 'Todos' : ESTADO_LABELS[f]}
            {f !== 'todos' && (
              <span className="ml-1 text-xs">
                ({pedidos.filter((p) => p.estado === f).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Contenido */}
      <main className="px-4 pb-8">
        {loading && (
          <p className="text-center text-gray-400 mt-12">Cargando pedidos…</p>
        )}
        {error && (
          <p className="text-center text-red-500 mt-12">Error: {error}</p>
        )}
        {!loading && !error && pedidosFiltrados.length === 0 && (
          <div className="text-center mt-16">
            <p className="text-4xl mb-3">🌮</p>
            <p className="text-gray-400">No hay pedidos {filtro !== 'todos' ? `con estado "${ESTADO_LABELS[filtro as EstadoPedido]}"` : 'activos'}</p>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-2">
          {pedidosFiltrados.map((pedido) => (
            <OrderCard
              key={pedido.id}
              pedido={pedido}
              repartidores={repartidores}
              onUpdateEstado={updateEstado}
            />
          ))}
        </div>
      </main>
    </div>
  )
}
