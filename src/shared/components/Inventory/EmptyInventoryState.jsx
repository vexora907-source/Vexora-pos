import { useState } from 'react'
import { PackagePlus } from 'lucide-react'

export function EmptyInventoryState({ onLoadSamples, loading = false, title = 'Aún no hay productos para vender' }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function loadSamples() {
    setBusy(true)
    setError('')
    try {
      await onLoadSamples()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los productos de prueba.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return null
  return (
    <section className="col-span-full rounded-2xl border border-dashed border-zinc-300 bg-white p-6 text-center">
      <PackagePlus className="mx-auto h-8 w-8 text-vexora-600" />
      <h2 className="mt-3 font-black text-zinc-900">{title}</h2>
      <p className="mx-auto mt-1 max-w-lg text-sm text-zinc-500">Carga productos de prueba para comenzar a vender o abre Inventario para agregar el catálogo real de tu negocio. Los productos de prueba no se cargan automáticamente.</p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {onLoadSamples && <button type="button" disabled={busy} onClick={() => void loadSamples()} className="inline-flex items-center gap-2 rounded-xl bg-vexora-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-vexora-700 disabled:opacity-50">{busy ? 'Cargando…' : 'Cargar productos de prueba'}</button>}
      </div>
      {error && <p role="alert" className="mt-3 text-sm font-semibold text-rose-700">{error}</p>}
    </section>
  )
}
