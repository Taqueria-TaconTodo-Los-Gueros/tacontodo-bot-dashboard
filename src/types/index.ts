export type EstadoPedido =
  | 'recibido'
  | 'en_preparacion'
  | 'listo'
  | 'en_camino'
  | 'entregado'
  | 'cancelado'

export type MetodoPago = 'efectivo' | 'transferencia'

export type CategoriaMenu = 'taco' | 'bebida' | 'extra' | 'combo'

export interface ItemPedido {
  menu_item_id: string
  nombre: string
  cantidad: number
  precio_unitario: number
  subtotal: number
}

export interface Pedido {
  id: string
  numero_pedido: number
  cliente_id: string
  estado: EstadoPedido
  items: ItemPedido[]
  total: number
  ubicacion_lat: number | null
  ubicacion_lng: number | null
  direccion_texto: string | null
  metodo_pago: MetodoPago
  notas: string | null
  repartidor_id: string | null
  created_at: string
  updated_at: string
}

export interface Cliente {
  id: string
  whatsapp_phone: string
  nombre: string | null
  created_at: string
}

export interface MenuItem {
  id: string
  nombre: string
  descripcion: string | null
  precio: number
  categoria: CategoriaMenu
  disponible: boolean
}

export interface Repartidor {
  id: string
  nombre: string
  whatsapp_phone: string
  activo: boolean
  token_acceso: string
}

export const ESTADO_LABELS: Record<EstadoPedido, string> = {
  recibido: 'Recibido',
  en_preparacion: 'En preparación',
  listo: 'Listo',
  en_camino: 'En camino',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
}

export const ESTADO_SIGUIENTE: Partial<Record<EstadoPedido, EstadoPedido>> = {
  recibido: 'en_preparacion',
  en_preparacion: 'listo',
  listo: 'en_camino',
  en_camino: 'entregado',
}

export const ACCION_LABEL: Partial<Record<EstadoPedido, string>> = {
  recibido: 'Aceptar pedido',
  en_preparacion: 'Marcar listo',
  listo: 'Asignar y enviar',
  en_camino: 'Marcar entregado',
}
