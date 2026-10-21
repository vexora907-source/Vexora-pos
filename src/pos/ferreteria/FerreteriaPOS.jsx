import { useMemo, useRef, useState } from 'react'
import { Hammer, Minus, PackagePlus, Plus, Search, ShoppingCart, Trash2 } from 'lucide-react'
import { formatCOP } from '../../shared/services/ticket.js'
import { AdCarousel } from '../../shared/components/Publicity/AdCarousel.jsx'
import { Payment } from '../../shared/components/Payment/Payment.jsx'
import { SaleReceipt } from '../../shared/components/Payment/SaleReceipt.jsx'
import { useTenantGremio } from '../../shared/hooks/useTenantGremio.js'
import { useInventory } from '../../shared/hooks/useInventory.js'
import { InventoryManager } from '../../shared/components/Inventory/InventoryManager.jsx'
import { EmptyInventoryState } from '../../shared/components/Inventory/EmptyInventoryState.jsx'
import { assertCashRegisterOpen, recordCashSale } from '../../shared/services/cashRegister.js'

const initialStock = [
  { id: 'drill', name: 'Taladro percutor', category: 'Herramientas', price: 189000, quantity: 8, icon: '🛠️' },
  { id: 'screws', name: 'Tornillos x50', category: 'Fijaciones', price: 8500, quantity: 36, icon: '🔩' },
  { id: 'paint', name: 'Pintura blanca 1 galón', category: 'Pinturas', price: 64500, quantity: 11, icon: '🪣' },
  { id: 'tape', name: 'Cinta aislante', category: 'Electricidad', price: 4200, quantity: 3, icon: '🧰' },
  { id: 'hammer', name: 'Martillo de uña', category: 'Herramientas', price: 28500, quantity: 14, icon: '🔨' },
  { id: 'gloves', name: 'Guantes de trabajo', category: 'Seguridad', price: 12000, quantity: 21, icon: '🧤' },
]

export default function FerreteriaPOS() {
  const { dian, business } = useTenantGremio()
  const { products: stock, allProducts, addProduct, importProducts, adjustStock, updateProduct, deleteProduct, loadSampleInventory, validateSale, recordSale, loading: inventoryLoading, error: inventoryError, remote: inventoryRemote } = useInventory('ferreteria', initialStock)
  const [query, setQuery] = useState('')
  const [cart, setCart] = useState([])
  const [notice, setNotice] = useState('')
  const [receipt, setReceipt] = useState(null)
  const [inventoryOpen, setInventoryOpen] = useState(false)
  const cartRef = useRef(null)
  const filtered = useMemo(() => stock.filter((product) => `${product.name} ${product.category}`.toLowerCase().includes(query.toLowerCase())), [stock, query])
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  function add(product) {
    const available = Number(product.quantity ?? product.stock ?? 0)
    if (available < 1) {
      setNotice(`No hay existencias disponibles de ${product.name}.`)
      return
    }
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id)
      if ((existing?.quantity ?? 0) >= available) {
        setNotice(`Stock disponible de ${product.name}: ${available} unidades.`)
        return current
      }
      setNotice(`${product.name} agregado al carrito.`)
      return existing ? current.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item) : [...current, { ...product, quantity: 1 }]
    })
  }
  function changeQuantity(id, amount) {
    const product = stock.find((item) => item.id === id)
    if (!product) return
    setCart((current) => current.flatMap((item) => {
      if (item.id !== id) return [item]
      const nextQuantity = item.quantity + amount
      if (nextQuantity < 1) return []
      const available = Number(product.quantity ?? product.stock ?? 0)
      if (nextQuantity > available) {
        setNotice(`Stock disponible de ${product.name}: ${available} unidades.`)
        return [item]
      }
      return [{ ...item, quantity: nextQuantity }]
    }))
  }
  async function pay(paymentMethod, cashDetails) {
    try {
      validateSale(cart)
      assertCashRegisterOpen('ferreteria', total)
      const sale = await recordSale(cart, paymentMethod)
      recordCashSale('ferreteria', total, paymentMethod)
      setReceipt({ items: cart, paymentMethod, sale, cashReceived: cashDetails?.cashReceived, changeDue: cashDetails?.changeDue })
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'No se pudo registrar la venta.')
    }
  }
  return (
    <>
      <main className="mx-auto grid max-w-[1500px] gap-5 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_340px] sm:px-6">
        <section className="min-w-0"><header className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-700"><Hammer className="h-4 w-4" />Ferretería</p><h1 className="mt-1 text-3xl font-black">Mostrador</h1></div><div className="flex gap-2"><button type="button" onClick={() => setInventoryOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm font-bold text-blue-800"><PackagePlus className="h-4 w-4" />Inventario</button><a href="/onboarding" className="rounded-xl px-3 py-2 text-sm font-semibold text-zinc-500">Cambiar gremios</a></div></header>
          {(inventoryLoading || inventoryError) && <p role={inventoryError ? 'alert' : 'status'} className={`mb-3 rounded-xl px-4 py-3 text-sm ${inventoryError ? 'bg-rose-50 text-rose-800' : 'bg-blue-50 text-blue-800'}`}>{inventoryError || 'Cargando inventario del negocio…'}</p>}
          <label className="mb-4 flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3"><Search className="h-5 w-5 text-zinc-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar herramienta o material…" className="w-full outline-none" /></label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{filtered.map((product) => <button key={product.id} type="button" onClick={() => add(product)} disabled={Number(product.quantity ?? product.stock ?? 0) < 1} className="rounded-2xl border border-zinc-200 bg-white p-4 text-left hover:border-blue-400 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"><span className="text-3xl">{product.icon}</span><p className="mt-3 font-bold">{product.name}</p><p className="mt-1 text-xs text-zinc-500">{product.category} · Stock {product.quantity ?? product.stock ?? 0}</p><p className="mt-2 font-black text-blue-800">{formatCOP(product.price)}</p><span className="mt-2 block text-xs font-bold text-blue-700">{Number(product.quantity ?? product.stock ?? 0) > 0 ? 'Agregar al carrito' : 'Agotado'}</span></button>)}
            {!stock.length && !inventoryLoading && !inventoryError && <EmptyInventoryState onLoadSamples={loadSampleInventory} />}
            {stock.length > 0 && !filtered.length && <p className="col-span-full rounded-xl bg-white p-6 text-center text-sm text-zinc-500">No hay productos que coincidan con la búsqueda.</p>}
          </div>
        </section>
        <aside ref={cartRef} className="scroll-mt-4 self-start space-y-4 lg:sticky lg:top-4"><section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"><h2 className="flex items-center gap-2 font-black"><ShoppingCart className="h-5 w-5 text-blue-700" />Carrito de venta <span className="ml-auto rounded-full bg-blue-50 px-2.5 py-1 text-xs text-blue-800">{cart.reduce((sum, item) => sum + item.quantity, 0)}</span></h2><div className="mt-3 divide-y divide-zinc-100">{cart.length ? cart.map((item) => <div key={item.id} className="flex items-center gap-2 py-3"><span className="grid h-10 w-10 place-items-center rounded-lg bg-zinc-50 text-xl">{item.icon}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{item.name}</p><p className="text-xs text-zinc-500">{formatCOP(item.price)} c/u</p></div><button type="button" aria-label={`Restar ${item.name}`} onClick={() => changeQuantity(item.id, -1)} className="rounded-lg border p-1.5"><Minus className="h-3 w-3" /></button><span className="w-5 text-center text-sm font-bold">{item.quantity}</span><button type="button" aria-label={`Sumar ${item.name}`} onClick={() => changeQuantity(item.id, 1)} className="rounded-lg border p-1.5"><Plus className="h-3 w-3" /></button><button type="button" aria-label={`Eliminar ${item.name}`} onClick={() => changeQuantity(item.id, -item.quantity)} className="rounded-lg p-1.5 text-rose-600"><Trash2 className="h-4 w-4" /></button></div>) : <p className="py-8 text-center text-sm text-zinc-400">Agrega productos para comenzar.</p>}</div><p className="mt-3 flex justify-between border-t pt-4 font-black"><span>Total</span><span>{formatCOP(total)}</span></p></section>{cart.length > 0 && <Payment total={total} onPay={pay} />}{notice && <p role="status" className="text-sm text-zinc-600">{notice}</p>}<AdCarousel gremio="ferreteria" /></aside>
      </main>
      {cart.length > 0 && <button type="button" onClick={() => cartRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="fixed inset-x-4 bottom-4 z-40 flex items-center justify-between rounded-2xl bg-blue-700 px-4 py-3 font-black text-white shadow-xl lg:hidden"><span><ShoppingCart className="mr-2 inline h-4 w-4" />Ver carrito · {cart.reduce((sum, item) => sum + item.quantity, 0)} producto(s)</span><span>{formatCOP(total)}</span></button>}
      {receipt && <SaleReceipt items={receipt.items} sale={receipt.sale} cashReceived={receipt.cashReceived} changeDue={receipt.changeDue} paymentMethod={receipt.paymentMethod} dian={dian} gremio="ferreteria" businessName={business?.name} onIssued={() => { setCart([]); setNotice('Factura enviada a la DIAN.') }} onClose={() => { if (!dian?.enabled) { setCart([]); setNotice('Venta registrada en esta demostración.') } setReceipt(null) }} />}
      {inventoryOpen && <InventoryManager title="Inventario de ferretería" gremio="ferreteria" products={allProducts} onAddProduct={addProduct} onImportProducts={importProducts} onAdjustStock={adjustStock} onUpdateProduct={updateProduct} onDeleteProduct={deleteProduct} onLoadSamples={loadSampleInventory} onClose={() => setInventoryOpen(false)} remote={inventoryRemote} loadError={inventoryError} />}
    </>
  )
}
