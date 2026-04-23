import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { CategoriaMenu, MenuItem } from '../types'

const CATEGORIAS: CategoriaMenu[] = ['taco', 'bebida', 'extra', 'combo']
const CAT_LABELS: Record<CategoriaMenu, string> = {
  taco: '🌮 Tacos', bebida: '🥤 Bebidas', extra: '➕ Extras', combo: '🎁 Promociones',
}

const EMPTY_FORM = { nombre: '', descripcion: '', precio: '', categoria: 'taco' as CategoriaMenu }

export function MenuAdmin() {
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [editingPrecio, setEditingPrecio] = useState<string | null>(null)
  const [editPrecioVal, setEditPrecioVal] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => { fetchMenu() }, [])

  async function fetchMenu() {
    const { data } = await supabase.from('menu_items').select('*').order('categoria').order('nombre')
    setItems((data ?? []) as MenuItem[])
    setLoading(false)
  }

  async function toggleDisponible(item: MenuItem) {
    await supabase.from('menu_items').update({ disponible: !item.disponible }).eq('id', item.id)
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, disponible: !i.disponible } : i))
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMsg('')
    const { error } = await supabase.from('menu_items').insert({
      nombre: form.nombre,
      descripcion: form.descripcion || null,
      precio: parseFloat(form.precio),
      categoria: form.categoria,
    })
    if (error) {
      setMsg(`Error: ${error.message}`)
    } else {
      setForm(EMPTY_FORM)
      setMsg('Item agregado ✓')
      await fetchMenu()
    }
    setSaving(false)
  }

  async function handleEditPrecio(item: MenuItem) {
    const nuevo = parseFloat(editPrecioVal)
    if (isNaN(nuevo) || nuevo < 0) return
    await supabase.from('menu_items').update({ precio: nuevo }).eq('id', item.id)
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, precio: nuevo } : i))
    setEditingPrecio(null)
  }

  async function handleDelete(id: string) {
    await supabase.from('menu_items').delete().eq('id', id)
    setItems((prev) => prev.filter((i) => i.id !== id))
    setDeletingId(null)
  }

  const porCategoria = CATEGORIAS.reduce<Record<CategoriaMenu, MenuItem[]>>((acc, cat) => {
    acc[cat] = items.filter((i) => i.categoria === cat)
    return acc
  }, { taco: [], bebida: [], extra: [], combo: [] })

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <Link to="/pedidos" className="text-brand-600 font-medium text-sm">← Volver</Link>
        <h1 className="text-lg font-bold text-gray-800">Menú</h1>
        <Link to="/repartidores" className="ml-auto text-sm text-brand-600 font-medium">Repartidores →</Link>
      </header>

      <main className="px-4 py-5 max-w-lg mx-auto flex flex-col gap-6">
        {/* Agregar item */}
        <form onSubmit={handleAdd} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col gap-3">
          <h2 className="font-semibold text-gray-700">Agregar item</h2>
          <input
            required
            placeholder="Nombre"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <input
            placeholder="Descripción (opcional)"
            value={form.descripcion}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <div className="flex gap-2">
            <input
              required
              type="number"
              min="0"
              step="0.5"
              placeholder="Precio $"
              value={form.precio}
              onChange={(e) => setForm({ ...form, precio: e.target.value })}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <select
              value={form.categoria}
              onChange={(e) => setForm({ ...form, categoria: e.target.value as CategoriaMenu })}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {CATEGORIAS.map((c) => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
            </select>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="bg-brand-600 hover:bg-brand-700 disabled:bg-gray-200 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
          >
            {saving ? 'Guardando…' : 'Agregar'}
          </button>
          {msg && <p className="text-sm text-center text-green-600">{msg}</p>}
        </form>

        {/* Lista por categoría */}
        {loading ? (
          <p className="text-center text-gray-400">Cargando menú…</p>
        ) : (
          CATEGORIAS.map((cat) => (
            porCategoria[cat].length > 0 && (
              <div key={cat}>
                <h2 className="font-semibold text-gray-600 mb-2">{CAT_LABELS[cat]}</h2>
                <div className="flex flex-col gap-2">
                  {porCategoria[cat].map((item) => (
                    <div
                      key={item.id}
                      className={`bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100 transition-opacity ${
                        item.disponible ? '' : 'opacity-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{item.nombre}</p>

                          {/* Precio editable */}
                          {editingPrecio === item.id ? (
                            <div className="flex items-center gap-1 mt-1">
                              <span className="text-xs text-gray-400">$</span>
                              <input
                                autoFocus
                                type="number"
                                min="0"
                                step="0.5"
                                value={editPrecioVal}
                                onChange={(e) => setEditPrecioVal(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleEditPrecio(item)
                                  if (e.key === 'Escape') setEditingPrecio(null)
                                }}
                                className="w-20 border border-brand-300 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
                              />
                              <button onClick={() => handleEditPrecio(item)} className="text-xs text-green-600 font-semibold">✓</button>
                              <button onClick={() => setEditingPrecio(null)} className="text-xs text-gray-400">✕</button>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setEditingPrecio(item.id); setEditPrecioVal(String(item.precio)) }}
                              className="text-xs text-gray-400 hover:text-brand-600 transition-colors mt-0.5"
                              title="Clic para editar precio"
                            >
                              ${item.precio.toFixed(2)} ✏️
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => toggleDisponible(item)}
                            className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
                              item.disponible
                                ? 'bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700'
                                : 'bg-gray-100 text-gray-500 hover:bg-green-100 hover:text-green-700'
                            }`}
                          >
                            {item.disponible ? 'Activo' : 'Inactivo'}
                          </button>

                          {deletingId === item.id ? (
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleDelete(item.id)}
                                className="text-xs bg-red-600 text-white px-2 py-1.5 rounded-full font-semibold"
                              >
                                Eliminar
                              </button>
                              <button
                                onClick={() => setDeletingId(null)}
                                className="text-xs bg-gray-100 text-gray-600 px-2 py-1.5 rounded-full"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeletingId(item.id)}
                              className="text-xs text-gray-300 hover:text-red-500 transition-colors px-1"
                              title="Eliminar"
                            >
                              🗑
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          ))
        )}
      </main>
    </div>
  )
}
