import { useEffect, useState } from 'react'

export function useKitchenTimer(startedAt) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [])
  if (!startedAt) return 0
  return Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000))
}

export function formatElapsed(seconds) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}
