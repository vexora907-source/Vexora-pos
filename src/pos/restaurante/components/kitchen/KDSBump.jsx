import { useState } from 'react'
import { Check } from 'lucide-react'

function playBell() {
  if (!('AudioContext' in window)) {
    console.warn('AudioContext no está disponible; no se pudo reproducir la campana de cocina.')
    return
  }
  try {
    const context = new AudioContext()
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(880, context.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(1320, context.currentTime + 0.12)
    gain.gain.setValueAtTime(0.0001, context.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.2, context.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.6)
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start()
    oscillator.stop(context.currentTime + 0.6)
    oscillator.onended = () => void context.close()
  } catch (error) {
    console.error('No se pudo reproducir la campana de cocina.', error)
  }
}

export function KDSBump({ tableId, lineIds, onBump }) {
  const [busy, setBusy] = useState(false)
  async function markReady() {
    setBusy(true)
    try {
      if (await onBump(tableId, lineIds)) playBell()
    } finally {
      setBusy(false)
    }
  }
  return <button type="button" disabled={busy} onClick={() => void markReady()} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-black text-white hover:bg-emerald-700 disabled:opacity-60"><Check className="h-5 w-5" />{busy ? 'Actualizando…' : 'Marcar listo'}</button>
}
