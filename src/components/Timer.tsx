import { useEffect, useState } from 'react'

function minutesSince(isoDate: string): number {
  return Math.floor((Date.now() - new Date(isoDate).getTime()) / 60_000)
}

export function Timer({ createdAt }: { createdAt: string }) {
  const [mins, setMins] = useState(minutesSince(createdAt))

  useEffect(() => {
    const id = setInterval(() => setMins(minutesSince(createdAt)), 30_000)
    return () => clearInterval(id)
  }, [createdAt])

  const color = mins < 15 ? 'text-green-600' : mins < 30 ? 'text-yellow-600' : 'text-red-600'

  return (
    <span className={`text-sm font-medium ${color}`}>
      {mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}h ${mins % 60}m`}
    </span>
  )
}
