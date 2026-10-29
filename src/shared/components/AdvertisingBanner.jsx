import { useEffect, useState } from 'react'
import { apiRequest } from '../services/api.js'

const IDLE_AFTER_MS = 30_000
const REFRESH_MS = 5 * 60_000
const ROTATE_MS = 12_000

export function AdvertisingBanner({ enabled }) {
  const [ads, setAds] = useState([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [idle, setIdle] = useState(false)

  useEffect(() => {
    if (!enabled) {
      setAds([])
      return
    }
    let active = true
    const load = async () => {
      try {
        const result = await apiRequest('/publicidad/feed')
        if (active) setAds(result.anuncios ?? [])
      } catch (error) {
        console.error('No se pudieron cargar los anuncios aprobados para este POS.', error)
      }
    }
    void load()
    const refreshId = window.setInterval(() => void load(), REFRESH_MS)
    return () => {
      active = false
      window.clearInterval(refreshId)
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled) {
      setIdle(false)
      return
    }
    let idleId
    const resetIdleTimer = () => {
      setIdle(false)
      window.clearTimeout(idleId)
      idleId = window.setTimeout(() => setIdle(true), IDLE_AFTER_MS)
    }
    const events = ['pointerdown', 'keydown', 'touchstart']
    events.forEach((event) => window.addEventListener(event, resetIdleTimer, { passive: true }))
    resetIdleTimer()
    return () => {
      window.clearTimeout(idleId)
      events.forEach((event) => window.removeEventListener(event, resetIdleTimer))
    }
  }, [enabled])

  useEffect(() => {
    if (ads.length < 2) return
    const rotateId = window.setInterval(() => setActiveIndex((index) => (index + 1) % ads.length), ROTATE_MS)
    return () => window.clearInterval(rotateId)
  }, [ads.length])

  useEffect(() => {
    if (activeIndex >= ads.length) setActiveIndex(0)
  }, [activeIndex, ads.length])

  if (!enabled || ads.length === 0) return null
  const ad = ads[activeIndex % ads.length]
  const content = (
    <>
      {ad.imagenUrl && <img src={ad.imagenUrl} alt="" className={`h-16 w-16 shrink-0 rounded-lg object-cover ${idle ? 'sm:h-24 sm:w-24' : ''}`} />}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wide text-violet-700">Publicidad · {ad.cliente}</p>
        <p className="truncate text-sm font-black text-zinc-900">{ad.titulo}</p>
        {idle && <p className="mt-1 text-xs text-zinc-600">{ad.descripcion}</p>}
      </div>
      {ad.enlaceUrl && <span className="shrink-0 rounded-lg bg-violet-700 px-3 py-2 text-xs font-bold text-white">Ver oferta</span>}
    </>
  )

  return (
    <aside aria-label="Anuncio aprobado" className={`fixed bottom-3 z-50 mx-auto rounded-2xl border border-violet-200 bg-white/95 p-3 shadow-lg backdrop-blur ${idle ? 'inset-x-3 sm:inset-x-auto sm:w-[min(90%,700px)]' : 'left-1/2 w-[min(94%,600px)] -translate-x-1/2'}`}>
      {ad.enlaceUrl
        ? <a href={ad.enlaceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3">{content}</a>
        : <div className="flex items-center gap-3">{content}</div>}
    </aside>
  )
}
