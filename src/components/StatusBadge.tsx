import type { EstadoPedido } from '../types'
import { ESTADO_LABELS } from '../types'

const COLORS: Record<EstadoPedido, string> = {
  recibido:       'bg-blue-100 text-blue-800',
  en_preparacion: 'bg-yellow-100 text-yellow-800',
  listo:          'bg-green-100 text-green-800',
  en_camino:      'bg-purple-100 text-purple-800',
  entregado:      'bg-gray-100 text-gray-600',
  cancelado:      'bg-red-100 text-red-700',
}

export function StatusBadge({ estado }: { estado: EstadoPedido }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${COLORS[estado]}`}>
      {ESTADO_LABELS[estado]}
    </span>
  )
}
