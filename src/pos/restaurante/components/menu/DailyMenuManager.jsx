import { useState } from 'react'
import { ArrowLeft, Check, ChefHat, Plus, Utensils, X } from 'lucide-react'
import { formatCOP } from '../../../../shared/services/ticket.js'

export function DailyMenuManager({ dishes, onAdd, onUpdate, onBack, loading = false, error = '' }) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [price, setPrice] = useState('')
  const [quantity, setQuantity] = useState('')
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)
  const dailyDishes = dishes.filter((dish) => dish.isDailyMenu)
  const otherDishes = dishes.filter((dish) => !dish.isDailyMenu)

  async function addDailyDish(event) {
    event.preventDefault()
    const trimmedName = name.trim()
    const numericPrice = Number(price)
    const numericQuantity = Number(quantity)
    if (!trimmedName || !Number.isFinite(numericPrice) || numericPrice < 0 || !Number.isInteger(numericQuantity) || numericQuantity < 0) {
      setSaveError('Revisa el nombre, el precio y la cantidad disponible.')
      return
    }

    setSaving(true)
    setSaveError('')
    try {
      await onAdd({
        name: trimmedName,
        category: category.trim() || 'Menú del día',
        barcode: '',
        price: numericPrice,
        quantity: numericQuantity,
        icon: '🍽️',
        tone: 'bg-amber-50',
        isDailyMenu: true,
      })
      setName('')
      setCategory('')
      setPrice('')
      setQuantity('')
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : 'No se pudo guardar el plato del día.')
    } finally {
      setSaving(false)
    }
  }

  async function toggleDailyMenu(dish, isDailyMenu) {
    setSaveError('')
    try {
      await onUpdate(dish.id, { isDailyMenu })
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : 'No se pudo actualizar el menú del día.')
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-500 hover:text-zinc-900"><ArrowLeft className="h-4 w-4" />Volver al restaurante</button>
      <header className="mt-5 flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-white p-5 sm:p-7">
        <div>
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-amber-800"><ChefHat className="h-4 w-4" />Administración del restaurante</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-950">Menú del día</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-600">Publica los platos especiales de hoy. Los platos disponibles aparecerán en la comanda para que el equipo pueda agregarlos a una mesa.</p>
        </div>
        <span className="rounded-full bg-white px-4 py-2 text-sm font-bold text-amber-900 shadow-sm">{dailyDishes.length} {dailyDishes.length === 1 ? 'plato activo' : 'platos activos'}</span>
      </header>

      {(loading || error || saveError) && <p role={error || saveError ? 'alert' : 'status'} className={`mt-4 rounded-xl px-4 py-3 text-sm ${error || saveError ? 'bg-rose-50 text-rose-800' : 'bg-blue-50 text-blue-800'}`}>{error || saveError || 'Cargando inventario…'}</p>}

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,.8fr)]">
        <section className="rounded-2xl border border-zinc-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3 border-b border-zinc-100 pb-3">
            <div><h2 className="font-black">Platos para hoy</h2><p className="mt-1 text-xs text-zinc-500">Se muestran primero al armar una comanda.</p></div>
            <Utensils className="h-5 w-5 text-amber-600" />
          </div>
          <div className="mt-3 space-y-2">
            {dailyDishes.length ? dailyDishes.map((dish) => (
              <article key={dish.id} className="flex items-center gap-3 rounded-xl border border-amber-100 bg-amber-50/60 p-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-2xl">{dish.icon || '🍽️'}</span>
                <div className="min-w-0 flex-1"><h3 className="truncate text-sm font-bold text-zinc-900">{dish.name}</h3><p className="mt-1 text-xs text-zinc-500">{dish.category || 'Menú del día'} · {dish.quantity ?? dish.stock ?? 0} disponibles</p></div>
                <div className="text-right"><p className="text-sm font-black text-amber-900">{formatCOP(dish.price)}</p><button type="button" onClick={() => void toggleDailyMenu(dish, false)} className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-zinc-500 hover:text-rose-700"><X className="h-3 w-3" />Quitar</button></div>
              </article>
            )) : <p className="rounded-xl bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500">Todavía no hay platos publicados para hoy.</p>}
          </div>

          <div className="mt-6 border-t border-zinc-100 pt-4">
            <h3 className="text-sm font-black">Agregar desde tu inventario</h3>
            <div className="mt-3 space-y-2">
              {otherDishes.length ? otherDishes.map((dish) => (
                <div key={dish.id} className="flex items-center gap-3 rounded-xl border border-zinc-200 p-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-zinc-100 text-xl">{dish.icon || '🍽️'}</span>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{dish.name}</p><p className="text-xs text-zinc-500">{formatCOP(dish.price)} · {dish.quantity ?? dish.stock ?? 0} disponibles</p></div>
                  <button type="button" onClick={() => void toggleDailyMenu(dish, true)} className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-amber-100 px-3 py-2 text-xs font-bold text-amber-900 hover:bg-amber-200"><Plus className="h-3.5 w-3.5" />Incluir</button>
                </div>
              )) : <p className="rounded-xl bg-zinc-50 px-4 py-5 text-center text-xs text-zinc-500">Todos los platos del inventario ya están en el menú de hoy.</p>}
            </div>
          </div>
        </section>

        <form onSubmit={addDailyDish} className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5">
          <div><p className="text-xs font-bold uppercase tracking-widest text-amber-700">Nuevo plato</p><h2 className="mt-1 text-lg font-black">Crear plato del día</h2><p className="mt-1 text-xs leading-5 text-zinc-500">También quedará guardado en el inventario del restaurante.</p></div>
          <label className="block text-sm font-semibold text-zinc-700">Nombre del plato<input required maxLength="100" value={name} onChange={(event) => setName(event.target.value)} placeholder="Ej. Almuerzo ejecutivo" className="mt-1.5 w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-amber-400" /></label>
          <label className="block text-sm font-semibold text-zinc-700">Categoría <span className="font-normal text-zinc-400">(opcional)</span><input maxLength="60" value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Ej. Almuerzos" className="mt-1.5 w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-amber-400" /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-semibold text-zinc-700">Precio COP<input required type="number" min="0" step="1" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="25000" className="mt-1.5 w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-amber-400" /></label>
            <label className="block text-sm font-semibold text-zinc-700">Porciones<input required type="number" min="0" step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder="20" className="mt-1.5 w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-amber-400" /></label>
          </div>
          <button type="submit" disabled={saving || loading || Boolean(error)} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-3 font-bold text-white hover:bg-amber-700 disabled:cursor-wait disabled:opacity-50"><Check className="h-4 w-4" />{saving ? 'Guardando…' : 'Guardar en menú del día'}</button>
        </form>
      </div>
    </main>
  )
}
