// Coordenadas fijas de la taquería
export const TAQUERIA_LAT = 20.904626
export const TAQUERIA_LNG = -101.475962

/**
 * Distancia en km entre dos puntos usando fórmula de Haversine
 */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Puntuación de asignación (menor = mejor candidato)
 * 60% distancia + 40% carga de trabajo
 */
export function calcularPuntuacion(distanciaKm: number, entregasActivas: number): number {
  return distanciaKm * 0.6 + entregasActivas * 0.4
}
