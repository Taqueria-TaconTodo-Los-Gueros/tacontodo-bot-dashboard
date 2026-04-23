import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { CategoriaMenu, MenuItem } from '../types'

const CATEGORIAS: CategoriaMenu[] = ['taco', 'bebida', 'extra', 'combo']
const CAT_LABELS: Record<CategoriaMenu, string> = {
  taco: '🌮 Tacos', bebida: '🥤 Bebidas', extra: '➕ Extras', combo: '🎁 Promociones',
}

interface CartItem {
  id: string
  nombre: string
  precio: number
  cantidad: number
}

export function Comanda() {
  const [menu, setMenu] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [cart, setCart] = useState<CartItem[]>([])
  const [categoriaActiva, setCategoriaActiva] = useState<CategoriaMenu>('taco')
  const [clienteNombre, setClienteNombre] = useState('')
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'transferencia'>('efectivo')
  const [tipoEntrega, setTipoEntrega] = useState<'domicilio' | 'local'>('local')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ texto: string; tipo: 'ok' | 'error' } | null>(null)

  useEffect(() => {
    supabase
      .from('menu_items')
      .select('*')
      .eq('disponible', true)
      .order('categoria')
      .order('nombre')
      .then(({ data }) => {
        setMenu((data ?? []) as MenuItem[])
        setLoading(false)
      })
  }, [])

  function addToCart(item: MenuItem) {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id)
      if (existing) {
        return prev.map((c) => c.id === item.id ? { ...c, cantidad: c.cantidad + 1 } : c)
      }
      return [...prev, { id: item.id, nombre: item.nombre, precio: item.precio, cantidad: 1 }]
    })
  }

  function updateCantidad(id: string, delta: number) {
    setCart((prev) =>
      prev
        .map((c) => c.id === id ? { ...c, cantidad: c.cantidad + delta } : c)
        .filter((c) => c.cantidad > 0)
    )
  }

  function getCartCantidad(id: string) {
    return cart.find((c) => c.id === id)?.cantidad ?? 0
  }

  const total = cart.reduce((sum, c) => sum + c.precio * c.cantidad, 0)

  const porCategoria = CATEGORIAS.reduce<Record<CategoriaMenu, MenuItem[]>>((acc, cat) => {
    acc[cat] = menu.filter((i) => i.categoria === cat)
    return acc
  }, { taco: [], bebida: [], extra: [], combo: [] })

  async function handleSubmit() {
    if (cart.length === 0) return
    setSaving(true)
    setMsg(null)

    const items = cart.map((c) => ({
      menu_item_id: c.id,
      nombre: c.nombre,
      cantidad: c.cantidad,
      precio_unitario: c.precio,
      subtotal: parseFloat((c.precio * c.cantidad).toFixed(2)),
    }))

    // Cliente placeholder para comandas locales
    const phoneLocal = `local_${Date.now()}`
    const nombreCliente = clienteNombre.trim() || 'Cliente local'

    // Crear o reutilizar cliente "local"
    const { data: clienteData } = await supabase
      .from('clientes')
      .upsert({ whatsapp_phone: phoneLocal, nombre: nombreCliente }, { onConflict: 'whatsapp_phone' })
      .select('id')
      .single()

    if (!clienteData) {
      setMsg({ texto: 'Error al crear cliente', tipo: 'error' })
      setSaving(false)
      return
    }

    const { error } = await supabase.from('pedidos').insert({
      cliente_id: clienteData.id,
      estado: 'recibido',
      items,
      total: parseFloat(total.toFixed(2)),
      metodo_pago: metodoPago,
      direccion_texto: tipoEntrega === 'local' ? 'Recoger en local' : null,
      notas: `Comanda: ${nombreCliente}`,
    })

    if (error) {
      setMsg({ texto: `Error: ${error.message}`, tipo: 'error' })
    } else {
      setCart([])
      setClienteNombre('')
      setMsg({ texto: '✅ Pedido creado en el tablero', tipo: 'ok' })
      setTimeout(() => setMsg(null), 3000)
    }
    setSaving(false)
  }

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-400">Cargando menú…</p></div>

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <Link to="/pedidos" className="text-brand-600 font-medium text-sm">← Volver</Link>
        <h1 className="text-lg font-bold text-gray-800">🧾 Comanda</h1>
      </header>

      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        {/* Panel izquierdo: Menú */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs de categoría */}
          <div className="flex gap-2 px-4 py-3 overflow-x-auto bg-white border-b">
            {CATEGORIAS.filter((c) => porCategoria[c].length > 0).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoriaActiva(cat)}
                className={`whitespace-nowrap px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  categoriaActiva === cat
                    ? 'bg-brand-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {CAT_LABELS[cat]}
              </button>
            ))}
          </div>

          {/* Items del menú */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-2xl">
              {porCategoria[categoriaActiva].map((item) => {
                const qty = getCartCantidad(item.id)
                return (
                  <div
                    key={item.id}
                    className={`bg-white rounded-xl p-3 shadow-sm border transition-all ${
                      qty > 0 ? 'border-brand-400 ring-1 ring-brand-200' : 'border-gray-100'
                    }`}
                  >
                    <p className="text-sm font-semibold text-gray-800 leading-tight mb-1">{item.nombre}</p>
                    <p className="text-xs text-gray-400 mb-3">${item.precio.toFixed(2)}</p>

                    {qty === 0 ? (
                      <button
                        onClick={() => addToCart(item)}
                        className="w-full bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold py-1.5 rounded-lg transition-colors"
                      >
                        + Agregar
                      </button>
                    ) : (
                      <div className="flex items-center justify-between bg-brand-50 rounded-lg px-2 py-1">
                        <button
                          onClick={() => updateCantidad(item.id, -1)}
                          className="w-7 h-7 bg-white rounded-full shadow text-brand-700 font-bold text-lg flex items-center justify-center hover:bg-brand-100 transition-colors"
                        >
                          −
                        </button>
                        <span className="text-sm font-bold text-brand-700">{qty}</span>
                        <button
                          onClick={() => updateCantidad(item.id, 1)}
                          className="w-7 h-7 bg-brand-600 rounded-full text-white font-bold text-lg flex items-center justify-center hover:bg-brand-700 transition-colors"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Panel derecho: Carrito */}
        <div className="lg:w-80 bg-white border-t lg:border-t-0 lg:border-l flex flex-col">
          <div className="px-4 py-3 border-b">
            <h2 className="font-bold text-gray-800">Carrito</h2>
          </div>

          {/* Items del carrito */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {cart.length === 0 ? (
              <p className="text-sm text-gray-400 text-center mt-8">Agrega items del menú</p>
            ) : (
              <div className="flex flex-col gap-2">
                {cart.map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{c.nombre}</p>
                      <p className="text-xs text-gray-400">${(c.precio * c.cantidad).toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateCantidad(c.id, -1)}
                        className="w-6 h-6 rounded-full bg-gray-100 hover:bg-red-100 text-gray-600 flex items-center justify-center text-sm font-bold"
                      >
                        −
                      </button>
                      <span className="text-sm font-bold w-5 text-center">{c.cantidad}</span>
                      <button
                        onClick={() => updateCantidad(c.id, 1)}
                        className="w-6 h-6 rounded-full bg-brand-100 hover:bg-brand-200 text-brand-700 flex items-center justify-center text-sm font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Formulario y total */}
          <div className="px-4 py-4 border-t flex flex-col gap-3">
            <input
              placeholder="Nombre del cliente (opcional)"
              value={clienteNombre}
              onChange={(e) => setClienteNombre(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />

            <div className="flex gap-2">
              <button
                onClick={() => setTipoEntrega('local')}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  tipoEntrega === 'local'
                    ? 'bg-brand-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                🏪 Local
              </button>
              <button
                onClick={() => setTipoEntrega('domicilio')}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  tipoEntrega === 'domicilio'
                    ? 'bg-brand-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                🛵 Domicilio
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setMetodoPago('efectivo')}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  metodoPago === 'efectivo'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                💵 Efectivo
              </button>
              <button
                onClick={() => setMetodoPago('transferencia')}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  metodoPago === 'transferencia'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                📲 Transferencia
              </button>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-600">Total:</span>
              <span className="text-xl font-bold text-gray-900">${total.toFixed(2)}</span>
            </div>

            {msg && (
              <p className={`text-sm text-center font-medium ${msg.tipo === 'ok' ? 'text-green-600' : 'text-red-600'}`}>
                {msg.texto}
              </p>
            )}

            <button
              onClick={handleSubmit}
              disabled={cart.length === 0 || saving}
              className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-3 rounded-xl text-sm transition-colors"
            >
              {saving ? 'Enviando…' : '✅ Crear pedido'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
