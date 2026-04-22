import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Repartidor } from '../types'

const EMPTY_FORM = { nombre: '', whatsapp_phone: '' }
const BASE_URL = window.location.origin

export function AdminRepartidores() {
  const [repartidores, setRepartidores] = useState<Repartidor[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => { fetchRepartidores() }, [])

  async function fetchRepartidores() {
    const { data } = await supabase.from('repartidores').select('*').order('nombre')
    setRepartidores((data ?? []) as Repartidor[])
    setLoading(false)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMsg('')
    const phone = form.whatsapp_phone.replace(/\D/g, '')
    const { error } = await supabase.from('repartidores').insert({
      nombre: form.nombre,
      whatsapp_phone: phone,
    })
    if (error) {
      setMsg(`Error: ${error.message}`)
    } else {
      setForm(EMPTY_FORM)
      setMsg('Repartidor agregado ✓')
      await fetchRepartidores()
    }
    setSaving(false)
  }

  async function toggleActivo(r: Repartidor) {
    await supabase.from('repartidores').update({ activo: !r.activo }).eq('id', r.id)
    setRepartidores((prev) => prev.map((x) => x.id === r.id ? { ...x, activo: !x.activo } : x))
  }

  async function handleDelete(id: string) {
    await supabase.from('repartidores').delete().eq('id', id)
    setRepartidores((prev) => prev.filter((r) => r.id !== id))
    setDeletingId(null)
  }

  function copyLink(token: string) {
    const link = `${BASE_URL}/repartidor/${token}`
    navigator.clipboard.writeText(link)
    setCopied(token)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <Link to="/pedidos" className="text-brand-600 font-medium text-sm">← Volver</Link>
        <h1 className="text-lg font-bold text-gray-800">Repartidores</h1>
        <Link to="/menu" className="ml-auto text-sm text-brand-600 font-medium">Menú →</Link>
      </header>

      <main className="px-4 py-5 max-w-lg mx-auto flex flex-col gap-6">
        {/* Formulario agregar */}
        <form onSubmit={handleAdd} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col gap-3">
          <h2 className="font-semibold text-gray-700">Agregar repartidor</h2>
          <input
            required
            placeholder="Nombre completo"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <input
            required
            placeholder="WhatsApp (ej: 5215512345678)"
            value={form.whatsapp_phone}
            onChange={(e) => setForm({ ...form, whatsapp_phone: e.target.value })}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button
            type="submit"
            disabled={saving}
            className="bg-brand-600 hover:bg-brand-700 disabled:bg-gray-200 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
          >
            {saving ? 'Guardando…' : 'Agregar'}
          </button>
          {msg && <p className="text-sm text-center text-green-600">{msg}</p>}
        </form>

        {/* Tabla de repartidores */}
        {loading ? (
          <p className="text-center text-gray-400">Cargando…</p>
        ) : repartidores.length === 0 ? (
          <p className="text-center text-gray-400">No hay repartidores registrados.</p>
        ) : (
          <div className="flex flex-col gap-3">
            <h2 className="font-semibold text-gray-600">Registrados ({repartidores.length})</h2>
            {repartidores.map((r) => (
              <div
                key={r.id}
                className={`bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100 flex flex-col gap-2 transition-opacity ${
                  r.activo ? '' : 'opacity-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{r.nombre}</p>
                    <p className="text-xs text-gray-400">{r.whatsapp_phone}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleActivo(r)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
                        r.activo
                          ? 'bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700'
                          : 'bg-gray-100 text-gray-500 hover:bg-green-100 hover:text-green-700'
                      }`}
                    >
                      {r.activo ? 'Activo' : 'Inactivo'}
                    </button>

                    {deletingId === r.id ? (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleDelete(r.id)}
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
                        onClick={() => setDeletingId(r.id)}
                        className="text-xs text-gray-300 hover:text-red-500 transition-colors px-1"
                        title="Eliminar"
                      >
                        🗑
                      </button>
                    )}
                  </div>
                </div>

                {/* Link del repartidor */}
                <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                  <p className="text-xs text-gray-500 truncate flex-1 font-mono">
                    {BASE_URL}/repartidor/{r.token_acceso}
                  </p>
                  <button
                    onClick={() => copyLink(r.token_acceso)}
                    className={`text-xs font-semibold px-3 py-1 rounded-full flex-shrink-0 transition-colors ${
                      copied === r.token_acceso
                        ? 'bg-green-100 text-green-700'
                        : 'bg-brand-100 text-brand-700 hover:bg-brand-200'
                    }`}
                  >
                    {copied === r.token_acceso ? '¡Copiado!' : 'Copiar link'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
