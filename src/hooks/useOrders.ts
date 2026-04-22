import { useEffect, useState } from 'react'
import type { EstadoPedido, Pedido } from '../types'
import { supabase } from '../lib/supabase'

const ESTADOS_ACTIVOS: EstadoPedido[] = ['recibido', 'en_preparacion', 'listo', 'en_camino']

export function useOrders() {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPedidos()

    const channel = supabase
      .channel('pedidos-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => {
        fetchPedidos()
      })
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [])

  async function fetchPedidos() {
    const { data, error: err } = await supabase
      .from('pedidos')
      .select('*')
      .in('estado', ESTADOS_ACTIVOS)
      .order('created_at', { ascending: true })

    if (err) {
      setError(err.message)
    } else {
      setPedidos((data ?? []) as Pedido[])
    }
    setLoading(false)
  }

  async function updateEstado(pedidoId: string, estado: EstadoPedido, repartidorId?: string) {
    const update: Record<string, string> = { estado }
    if (repartidorId) update.repartidor_id = repartidorId

    const { error: err } = await supabase
      .from('pedidos')
      .update(update)
      .eq('id', pedidoId)

    if (err) throw new Error(err.message)
  }

  return { pedidos, loading, error, updateEstado, refetch: fetchPedidos }
}

export function useOrderDetail(id: string) {
  const [pedido, setPedido] = useState<Pedido | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('pedidos')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        setPedido(data as Pedido | null)
        setLoading(false)
      })

    const channel = supabase
      .channel(`pedido-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pedidos', filter: `id=eq.${id}` },
        (payload) => setPedido(payload.new as Pedido))
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [id])

  return { pedido, loading }
}
