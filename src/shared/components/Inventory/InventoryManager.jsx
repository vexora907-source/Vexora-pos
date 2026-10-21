import { useState } from 'react'
import { PackagePlus, Pencil, Plus, Save, Trash2, X } from 'lucide-react'
import { formatCOP } from '../../services/ticket.js'
import { getBusinessProductIcons, getProductIcon } from '../../utils/productIcons.js'
import { ExcelInventoryActions } from './ExcelInventoryActions.jsx'

export function InventoryManager({ title = 'Inventario', gremio, products, onAddProduct, onImportProducts, onAdjustStock, onUpdateProduct, onDeleteProduct, onLoadSamples, onClose, remote = false, loadError = '' }) {
  const [error, setError] = useState('')
  const [restock, setRestock] = useState({})
  const [productName, setProductName] = useState('')
  const [category, setCategory] = useState('')
  const [selectedIcon, setSelectedIcon] = useState('auto')
  const [isGranel, setIsGranel] = useState(false)
  const [isMenuItem, setIsMenuItem] = useState(false)
  const [selectedRecipeIds, setSelectedRecipeIds] = useState([])
  const [selectedModifierIds, setSelectedModifierIds] = useState([])
  const [editingId, setEditingId] = useState('')
  const [draft, setDraft] = useState({ name: '', category: '', barcode: '', price: '', quantity: '' })
  const supportsGranel = gremio === 'tienda'
  const supportsUnits = supportsGranel || gremio === 'comidas_rapidas'
  const supportsRecipes = gremio === 'comidas_rapidas'
  const iconOptions = getBusinessProductIcons(gremio)
  const suggestedIcon = getProductIcon(gremio, productName, category)

  async function submit(event) {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const name = String(form.get('name')).trim()
    const price = Number(form.get('price'))
    const quantity = isMenuItem ? 0 : Number(form.get('quantity'))
    const recipeIngredients = products
      .filter((product) => selectedRecipeIds.includes(product.id))
      .map((product) => ({
        productId: product.id,
        quantity: Number(form.get(`recipe-${product.id}`)),
        unit: product.unit || 'unidad',
      }))
    const modifiers = products
      .filter((product) => selectedModifierIds.includes(product.id))
      .map((product) => ({
        id: `extra-${product.id}`,
        label: String(form.get(`modifier-name-${product.id}`) || '').trim() || product.name,
        price: Number(form.get(`modifier-price-${product.id}`)),
        ingredients: [{
          productId: product.id,
          quantity: Number(form.get(`modifier-quantity-${product.id}`)),
          unit: product.unit || 'unidad',
        }],
      }))
    if (!name || !Number.isFinite(price) || price < 0 || !Number.isFinite(quantity) || quantity < 0 || (!isGranel && !isMenuItem && !Number.isInteger(quantity))) {
      setError('Revisa el nombre, precio y cantidad del producto.')
      return
    }
    if (isMenuItem && (!recipeIngredients.length || recipeIngredients.some((ingredient) => !Number.isFinite(ingredient.quantity) || ingredient.quantity <= 0))) {
      setError('Selecciona ingredientes y define una cantidad mayor que cero para cada uno.')
      return
    }
    if (modifiers.some((modifier) => !Number.isFinite(modifier.price) || modifier.price < 0 || !Number.isFinite(modifier.ingredients[0].quantity) || modifier.ingredients[0].quantity <= 0)) {
      setError('Revisa el precio y la cantidad de cada ingrediente adicional.')
      return
    }
    try {
      await onAddProduct({
        name,
        category: String(form.get('category')).trim() || 'General',
        barcode: String(form.get('barcode')).trim(),
        price,
        quantity,
        icon: selectedIcon === 'auto' ? getProductIcon(gremio, name, String(form.get('category'))) : selectedIcon,
        tone: 'bg-vexora-50',
        ...(supportsUnits ? {
          ...(supportsGranel ? { isGranel } : {}),
          unit: String(form.get('unit') || 'unidad'),
        } : {}),
        ...(supportsGranel ? {
          expiryDate: String(form.get('expiryDate') || '') ? new Date(`${form.get('expiryDate')}T12:00:00`).toISOString() : null,
        } : {}),
        ...(isMenuItem ? {
          ingredients: recipeIngredients,
          modifiers,
          prepTime: Number(form.get('prepTime')) || 0,
        } : {}),
      })
      formElement.reset()
      setProductName('')
      setCategory('')
      setSelectedIcon('auto')
      setIsGranel(false)
      setIsMenuItem(false)
      setSelectedRecipeIds([])
      setSelectedModifierIds([])
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar el producto.')
    }
  }

  async function restockProduct(id, amount) {
    try {
      await onAdjustStock?.(id, amount)
      setRestock((current) => ({ ...current, [id]: '' }))
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar el nuevo stock.')
    }
  }

  function startEditing(product) {
    setEditingId(product.id)
    setDraft({
      name: product.name,
      category: product.category ?? '',
      barcode: product.barcode ?? '',
      price: String(product.price),
      quantity: String(product.quantity ?? product.stock ?? 0),
    })
    setError('')
  }

  async function saveProduct(event) {
    event.preventDefault()
    const current = products.find((product) => product.id === editingId)
    if (!current) return
    const price = Number(draft.price)
    const quantity = Number(draft.quantity)
    if (!draft.name.trim() || !Number.isFinite(price) || price < 0 || !Number.isFinite(quantity) || quantity < 0) {
      setError('Revisa el nombre, precio y cantidad del producto.')
      return
    }
    if (!fractionalFor(current) && !Number.isInteger(quantity)) {
      setError('La cantidad debe ser un número entero para este producto.')
      return
    }
    try {
      await onUpdateProduct?.(editingId, {
        name: draft.name.trim(),
        category: draft.category.trim() || 'General',
        barcode: draft.barcode.trim(),
        price,
        quantity,
        stock: quantity,
      })
      setEditingId('')
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo actualizar el producto.')
    }
  }

  function fractionalFor(product) {
    return supportsGranel && (product.isGranel || (product.unit && !['unidad', 'und.'].includes(product.unit)))
  }

  async function removeProduct(product) {
    if (!window.confirm(`¿Eliminar "${product.name}" del inventario?`)) return
    try {
      await onDeleteProduct?.(product.id)
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo eliminar el producto.')
    }
  }

  async function loadSamples() {
    if (!window.confirm('Se agregarán productos de prueba al inventario vacío. Revisa sus precios y existencias antes de vender. ¿Continuar?')) return
    try {
      await onLoadSamples?.()
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los productos de prueba.')
    }
  }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="inventory-title" className="fixed inset-0 z-50 overflow-y-auto bg-zinc-950/60 p-4">
      <section className="mx-auto my-6 max-w-4xl rounded-3xl bg-zinc-50 p-5 shadow-2xl sm:p-7">
        <header className="flex items-start justify-between gap-4">
          <div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-vexora-700"><PackagePlus className="h-4 w-4" />Control de existencias</p><h2 id="inventory-title" className="mt-1 text-2xl font-black">{title}</h2><p className="mt-1 text-sm text-zinc-500">{remote ? 'El inventario se comparte entre los usuarios de este negocio.' : 'Los cambios se guardan para este negocio en este navegador.'}</p></div>
          <button type="button" onClick={onClose} aria-label="Cerrar inventario" className="rounded-xl p-2 text-zinc-500 hover:bg-white"><X className="h-5 w-5" /></button>
        </header>
        {loadError && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-800">{loadError}</p>}
        {onImportProducts && <ExcelInventoryActions gremio={gremio} products={products} onImportProducts={onImportProducts} />}
        {products.length === 0 && onLoadSamples && <section className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-950">Este inventario está vacío. Puedes cargar productos de prueba para explorar el POS; confirma precios y cantidades antes de vender.</p>
          <button type="button" onClick={() => void loadSamples()} className="shrink-0 rounded-xl bg-amber-800 px-4 py-2.5 text-sm font-bold text-white hover:bg-amber-900">Cargar productos de prueba</button>
        </section>}
        <form onSubmit={submit} className="mt-5 grid gap-3 rounded-2xl border border-zinc-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-6">
          <label className="text-xs font-bold text-zinc-600 lg:col-span-2">Nombre<input name="name" required maxLength="100" value={productName} onChange={(event) => setProductName(event.target.value)} placeholder="Nombre del producto" className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm font-normal" /></label>
          <label className="text-xs font-bold text-zinc-600">Categoría<input name="category" maxLength="60" value={category} onChange={(event) => setCategory(event.target.value)} placeholder="General" className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm font-normal" /></label>
          <label className="text-xs font-bold text-zinc-600">Código<input name="barcode" maxLength="60" placeholder="Opcional" className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm font-normal" /></label>
          <label className="text-xs font-bold text-zinc-600">Precio<input name="price" required type="number" min="0" step="1" className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm font-normal" /></label>
          {!isMenuItem && <label className="text-xs font-bold text-zinc-600">Cantidad inicial<input name="quantity" required type="number" min="0" step={isGranel ? '0.01' : '1'} className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm font-normal" /></label>}
          <label className="text-xs font-bold text-zinc-600">Ícono<select value={selectedIcon} onChange={(event) => setSelectedIcon(event.target.value)} className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm font-normal"><option value="auto">{suggestedIcon} Sugerido</option>{iconOptions.map((icon) => <option key={icon} value={icon}>{icon}</option>)}</select></label>
          {supportsRecipes && <label className="flex items-center gap-2 rounded-xl bg-orange-50 p-3 text-xs font-bold text-orange-950 sm:col-span-2 lg:col-span-4"><input type="checkbox" checked={isMenuItem} onChange={(event) => { setIsMenuItem(event.target.checked); setSelectedRecipeIds([]); setSelectedModifierIds([]) }} />Es un plato vendible del menú con receta</label>}
          {supportsUnits && <div className="grid gap-2 rounded-xl bg-zinc-50 p-3 sm:col-span-2 lg:col-span-4 sm:grid-cols-3">{supportsGranel && <label className="flex items-center gap-2 self-center text-xs font-bold text-zinc-700"><input type="checkbox" checked={isGranel} onChange={(event) => setIsGranel(event.target.checked)} />Producto a granel</label>}<label className="text-xs font-bold text-zinc-600">Unidad<select name="unit" defaultValue={supportsGranel ? 'kg' : 'unidad'} className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-normal">{supportsGranel && <><option value="kg">Kilogramos</option><option value="g">Gramos</option><option value="lb">Libras</option><option value="L">Litros</option><option value="ml">Mililitros</option></>}<option value="unidad">Unidades</option></select></label></div>}
          {supportsRecipes && isMenuItem && <section className="rounded-xl border border-orange-200 bg-white p-3 sm:col-span-2 lg:col-span-6"><label className="mb-2 block text-xs font-black text-zinc-700">Receta por plato · selecciona ingredientes y cantidades</label><div className="grid gap-2 sm:grid-cols-2">{products.filter((product) => !product.ingredients?.length).map((product) => {
            const selected = selectedRecipeIds.includes(product.id)
            return <div key={product.id} className="flex items-center gap-2 rounded-lg bg-zinc-50 px-3 py-2"><input type="checkbox" checked={selected} onChange={(event) => setSelectedRecipeIds((current) => event.target.checked ? [...current, product.id] : current.filter((id) => id !== product.id))} /><span className="min-w-0 flex-1 truncate text-xs font-semibold">{product.name} ({product.unit || 'unidad'})</span><input name={`recipe-${product.id}`} aria-label={`Cantidad de ${product.name} por plato`} type="number" min="0.01" step="any" disabled={!selected} className="w-24 rounded-lg border border-zinc-200 px-2 py-1.5 text-xs disabled:bg-zinc-100" /></div>
          })}</div>
            <div className="mt-4 border-t border-zinc-100 pt-3">
              <p className="mb-2 text-xs font-black text-zinc-700">Ingredientes opcionales · se pueden elegir al vender</p>
              <p className="mb-2 text-xs text-zinc-500">Define la cantidad que agrega cada opción y su precio adicional. Por ejemplo, usa esta sección para los toppings de una pizza personalizada.</p>
              <div className="grid gap-2 sm:grid-cols-2">{products.filter((product) => !product.ingredients?.length).map((product) => {
                const selected = selectedModifierIds.includes(product.id)
                return <div key={`modifier-${product.id}`} className="rounded-lg bg-zinc-50 p-2">
                  <label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={selected} onChange={(event) => setSelectedModifierIds((current) => event.target.checked ? [...current, product.id] : current.filter((id) => id !== product.id))} />Agregar {product.name} como opción</label>
                  {selected && <div className="mt-2 grid grid-cols-2 gap-2">
                    <label className="text-[11px] font-semibold text-zinc-500">Nombre<input name={`modifier-name-${product.id}`} defaultValue={product.name} maxLength="80" className="mt-1 w-full rounded border border-zinc-200 px-2 py-1.5 text-xs" /></label>
                    <label className="text-[11px] font-semibold text-zinc-500">Precio adicional<input name={`modifier-price-${product.id}`} type="number" min="0" step="1" defaultValue="0" className="mt-1 w-full rounded border border-zinc-200 px-2 py-1.5 text-xs" /></label>
                    <label className="text-[11px] font-semibold text-zinc-500">Cantidad por plato ({product.unit || 'unidad'})<input name={`modifier-quantity-${product.id}`} type="number" min="0.01" step="any" className="mt-1 w-full rounded border border-zinc-200 px-2 py-1.5 text-xs" /></label>
                  </div>}
                </div>
              })}</div>
            </div>
            <label className="mt-3 block max-w-48 text-xs font-bold text-zinc-600">Preparación (minutos)<input name="prepTime" type="number" min="0" step="1" defaultValue="10" className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm font-normal" /></label></section>}
          {supportsGranel && <div className="sm:col-span-2 lg:col-span-4"><label className="text-xs font-bold text-zinc-600">Fecha de vencimiento<input name="expiryDate" type="date" className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-normal" /></label></div>}
          <button type="submit" className="inline-flex items-center justify-center gap-2 self-end rounded-xl bg-vexora-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-vexora-700 sm:col-span-2 lg:col-span-2"><Plus className="h-4 w-4" />Cargar al inventario</button>
          {error && <p role="alert" className="text-sm text-rose-700 sm:col-span-2 lg:col-span-6">{error}</p>}
        </form>
        <div className="mt-5 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
          <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3"><h3 className="font-black">Productos cargados</h3><span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-bold">{products.length}</span></div>
          <div className="max-h-[45vh] divide-y divide-zinc-100 overflow-y-auto">
            {products.length ? products.map((product) => {
              const fractional = supportsGranel && (product.isGranel || (product.unit && !['unidad', 'und.'].includes(product.unit)))
              const restockAmount = Number(restock[product.id])
              const isRecipe = Array.isArray(product.ingredients) && product.ingredients.length > 0
              return <div key={product.id} className="px-4 py-3">
                <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-zinc-100 text-2xl">{product.icon || getProductIcon(gremio, product.name, product.category)}</span><div className="min-w-0"><p className="truncate text-sm font-bold">{product.name}{(product.active === false || product.activo === 'NO') && <span className="ml-2 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">Inactivo</span>}{product.isDailyMenu && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">Menú del día</span>}{isRecipe && <span className="ml-2 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-900">Plato de menú</span>}</p><p className="text-xs text-zinc-500">{product.category || 'General'}{product.barcode ? ` · ${product.barcode}` : ''} · {formatCOP(product.price)}{product.expiryDate ? ` · vence ${new Date(product.expiryDate).toLocaleDateString('es-CO')}` : ''}</p>{!isRecipe && <div className="mt-2 flex items-center gap-2"><input aria-label={`Cantidad a cargar para ${product.name}`} type="number" min={fractional ? '0.01' : '1'} step={fractional ? '0.01' : '1'} value={restock[product.id] ?? ''} onChange={(event) => setRestock((current) => ({ ...current, [product.id]: event.target.value }))} placeholder={fractional ? 'Cantidad' : 'Unidades'} className="w-24 rounded-md border border-zinc-200 px-2 py-1 text-xs" /><button type="button" disabled={!Number.isFinite(restockAmount) || restockAmount < (fractional ? 0.01 : 1) || (!fractional && !Number.isInteger(restockAmount))} onClick={() => void restockProduct(product.id, restockAmount)} className="rounded-md bg-vexora-50 px-2 py-1 text-xs font-bold text-vexora-700 disabled:opacity-40">Cargar stock</button></div>}</div><span className={`rounded-lg px-2.5 py-1.5 text-xs font-black ${Number(product.quantity ?? product.stock) <= 5 ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'}`}>{isRecipe ? 'Receta' : `${product.quantity ?? product.stock} ${product.unit || 'und.'}`}</span></div>
                <div className="mt-2 flex gap-2"><button type="button" onClick={() => startEditing(product)} className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold"><Pencil className="h-3 w-3" />Editar</button><button type="button" onClick={() => void removeProduct(product)} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-bold text-rose-700"><Trash2 className="h-3 w-3" />Eliminar</button></div>
                {editingId === product.id && <form onSubmit={saveProduct} className="mt-3 grid gap-2 rounded-xl bg-zinc-50 p-3 sm:grid-cols-2"><label className="text-xs font-semibold">Nombre<input required maxLength="100" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} className="mt-1 w-full rounded-lg border bg-white p-2" /></label><label className="text-xs font-semibold">Categoría<input maxLength="60" value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))} className="mt-1 w-full rounded-lg border bg-white p-2" /></label><label className="text-xs font-semibold">Código<input maxLength="60" value={draft.barcode} onChange={(event) => setDraft((current) => ({ ...current, barcode: event.target.value }))} className="mt-1 w-full rounded-lg border bg-white p-2" /></label><label className="text-xs font-semibold">Precio<input required type="number" min="0" step="1" value={draft.price} onChange={(event) => setDraft((current) => ({ ...current, price: event.target.value }))} className="mt-1 w-full rounded-lg border bg-white p-2" /></label><label className="text-xs font-semibold">Cantidad<input required type="number" min="0" step={fractionalFor(product) ? '0.01' : '1'} value={draft.quantity} onChange={(event) => setDraft((current) => ({ ...current, quantity: event.target.value }))} className="mt-1 w-full rounded-lg border bg-white p-2" /></label><div className="flex items-end gap-2"><button className="inline-flex items-center gap-1 rounded-lg bg-vexora-600 px-3 py-2 text-xs font-bold text-white"><Save className="h-3.5 w-3.5" />Guardar</button><button type="button" onClick={() => setEditingId('')} className="rounded-lg border bg-white px-3 py-2 text-xs font-bold">Cancelar</button></div></form>}
              </div>
            }) : <p className="p-8 text-center text-sm text-zinc-500">Todavía no hay productos. Usa el formulario para cargar inventario.</p>}
          </div>
        </div>
      </section>
    </div>
  )
}
