import { useState } from 'react'
import { ClipboardList, KeyRound, Minus, PackagePlus, Plus, ShoppingCart } from 'lucide-react'
import { ServiceBoard, services } from './components/ServiceBoard.jsx'
import { JobOrder } from './components/JobOrder.jsx'
import { AdCarousel } from '../../shared/components/Publicity/AdCarousel.jsx'
import { Payment } from '../../shared/components/Payment/Payment.jsx'
import { SaleReceipt } from '../../shared/components/Payment/SaleReceipt.jsx'
import { useTenantGremio } from '../../shared/hooks/useTenantGremio.js'
import { useInventory } from '../../shared/hooks/useInventory.js'
import { InventoryManager } from '../../shared/components/Inventory/InventoryManager.jsx'
import { recordCashSale } from '../../shared/services/cashRegister.js'
import { registerSale } from '../../shared/services/sales.js'
import { isDemoMode } from '../../shared/services/tenantStorage.js'
import { EmptyInventoryState } from '../../shared/components/Inventory/EmptyInventoryState.jsx'
import { formatCOP } from '../../shared/services/ticket.js'

const initialInventory = [
  { id: 'key-blank', name: 'Llaves en bruto', category: 'Insumos', price: 0, quantity: 40, icon: '🗝️' },
  { id: 'cylinder', name: 'Cilindros de repuesto', category: 'Repuestos', price: 0, quantity: 8, icon: '🔐' },
  { id: 'lock', name: 'Cerraduras', category: 'Repuestos', price: 0, quantity: 6, icon: '🔒' },
]

export default function CerrajeriaPOS() {
  const { dian, business } = useTenantGremio()
  const { products, allProducts, addProduct, importProducts, adjustStock, updateProduct, deleteProduct, loadSampleInventory, validateSale, recordSale, loading: inventoryLoading, error: inventoryError, remote: inventoryRemote } = useInventory('cerrajeria', initialInventory)
  const [service, setService] = useState(services[0])
  const [orders, setOrders] = useState([])
  const [pendingOrder, setPendingOrder] = useState(null)
  const [receipt, setReceipt] = useState(null)
  const [message, setMessage] = useState('')
  const [inventoryOpen, setInventoryOpen] = useState(false)
  const [cart, setCart] = useState([])
  function addToCart(product) {
    if (Number(product.quantity ?? product.stock) < 1) {
      setMessage(`No hay existencias de ${product.name}.`)
      return
    }
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id)
      if (existing?.quantity >= Number(product.quantity ?? product.stock)) {
        setMessage(`Stock disponible de ${product.name}: ${product.quantity ?? product.stock}.`)
        return current
      }
      return existing
        ? current.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
        : [...current, { ...product, quantity: 1 }]
    })
    setMessage('')
  }

  async function payProducts(paymentMethod, cashDetails) {
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
    try {
      validateSale(cart)
      const sale = await recordSale(cart, paymentMethod)
      recordCashSale('cerrajeria', total, paymentMethod)
      setReceipt({ items: cart, paymentMethod, sale, cashReceived: cashDetails?.cashReceived, changeDue: cashDetails?.changeDue })
      setCart([])
      setMessage('Venta de productos registrada.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo registrar la venta de productos.')
    }
  }

  async function payOrder(paymentMethod, cashDetails) {
    let sale
    try {
      if (!isDemoMode()) {
        sale = await registerSale('cerrajeria', [{
          name: pendingOrder.service,
          price: pendingOrder.price,
          quantity: 1,
        }], paymentMethod)
      }
      recordCashSale('cerrajeria', pendingOrder.price, paymentMethod)
      setReceipt({ items: [{ id: pendingOrder.serviceId, name: pendingOrder.service, price: pendingOrder.price, quantity: 1 }], paymentMethod, sale, cashReceived: cashDetails?.cashReceived, changeDue: cashDetails?.changeDue })
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo registrar el pago.')
    }
  }
  return (
    <main className="mx-auto max-w-[1500px] px-4 py-6 text-zinc-100 sm:px-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-amber-300"><KeyRound className="h-4 w-4" />Cerrajería</p><h1 className="mt-1 text-3xl font-black">Servicios y órdenes</h1></div><div className="flex gap-2"><button type="button" onClick={() => setInventoryOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm font-bold text-white"><PackagePlus className="h-4 w-4" />Inventario</button><a href="/onboarding" className="rounded-xl px-3 py-2 text-sm font-semibold text-zinc-400 hover:text-white">Cambiar gremios</a></div></header>
      {(inventoryLoading || inventoryError) && <p role={inventoryError ? 'alert' : 'status'} className={`mb-4 rounded-xl px-4 py-3 text-sm ${inventoryError ? 'bg-rose-900 text-rose-100' : 'bg-zinc-800 text-zinc-200'}`}>{inventoryError || 'Cargando inventario del negocio…'}</p>}
      <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]"><section className="space-y-5"><div><h2 className="mb-3 font-black">Servicios frecuentes</h2><ServiceBoard onAdd={(item) => { setService(item); setMessage(`${item.name} seleccionada para nueva orden.`) }} />{message && <p role="status" className="mt-3 text-sm text-amber-300">{message}</p>}</div>
          <section className="rounded-2xl border border-zinc-700 bg-zinc-800 p-5"><h2 className="mb-3 font-black">Productos y repuestos</h2>{!products.length && !inventoryLoading && !inventoryError
            ? <EmptyInventoryState onLoadSamples={loadSampleInventory} title="Aún no hay productos para vender" />
            : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{products.map((product) => <button key={product.id} type="button" onClick={() => addToCart(product)} disabled={Number(product.quantity ?? product.stock) < 1} className="rounded-xl border border-zinc-600 bg-zinc-900 p-3 text-left disabled:opacity-50"><span className="text-2xl">{product.icon}</span><p className="mt-2 text-sm font-bold">{product.name}</p><p className="text-xs text-zinc-400">Stock {product.quantity ?? product.stock}</p><p className="mt-1 font-black text-amber-300">{formatCOP(product.price)}</p><span className="mt-2 block text-xs font-bold text-amber-200">Agregar</span></button>)}</div>}
          </section>
          <div className="rounded-2xl border border-zinc-700 bg-zinc-800 p-5"><h2 className="mb-3 flex items-center gap-2 font-black"><ClipboardList className="h-5 w-5 text-amber-300" />Órdenes recientes <span className="ml-auto rounded-full bg-zinc-700 px-2 py-1 text-xs">{orders.length}</span></h2>{orders.length ? <div className="space-y-3">{orders.map((order, index) => <div key={`${order.customer}-${index}`} className="rounded-xl bg-zinc-900 p-4"><div className="flex justify-between gap-2"><p className="font-bold">{order.service}</p><span className="text-xs font-bold text-amber-300">#{String(index + 1).padStart(3, '0')}</span></div><p className="mt-1 text-sm text-zinc-400">{order.customer} · {order.address}</p><p className="mt-1 text-xs text-zinc-500">{order.keyType} · {order.technician}</p></div>)}</div> : <p className="text-sm text-zinc-400">Selecciona un servicio y registra los datos del trabajo.</p>}</div></section>
        <aside className="space-y-4"><JobOrder service={service.name} serviceId={service.id} servicePrice={service.price} onSubmit={(order) => { setOrders((current) => [order, ...current]); setPendingOrder(order); setMessage('Orden creada. Registra el pago cuando corresponda.') }} />{pendingOrder && <Payment total={pendingOrder.price} onPay={payOrder} />}
          {cart.length > 0 && <section className="space-y-3 rounded-2xl border border-zinc-700 bg-zinc-800 p-4"><h2 className="flex items-center gap-2 font-black"><ShoppingCart className="h-4 w-4" />Carrito de productos</h2>{cart.map((item) => <div key={item.id} className="flex items-center gap-2 text-sm"><span className="min-w-0 flex-1 truncate">{item.name} · {formatCOP(item.price)}</span><button type="button" aria-label={`Quitar una unidad de ${item.name}`} onClick={() => setCart((current) => current.flatMap((line) => line.id !== item.id ? [line] : line.quantity > 1 ? [{ ...line, quantity: line.quantity - 1 }] : []))} className="rounded-lg border border-zinc-600 p-1"><Minus className="h-3 w-3" /></button><span>{item.quantity}</span><button type="button" aria-label={`Agregar una unidad de ${item.name}`} onClick={() => addToCart(item)} className="rounded-lg border border-zinc-600 p-1"><Plus className="h-3 w-3" /></button></div>)}<Payment total={cart.reduce((sum, item) => sum + item.price * item.quantity, 0)} onPay={payProducts} /></section>}
          <AdCarousel gremio="cerrajeria" /></aside>
      </div>
      {receipt && <SaleReceipt items={receipt.items} sale={receipt.sale} cashReceived={receipt.cashReceived} changeDue={receipt.changeDue} paymentMethod={receipt.paymentMethod} dian={dian} gremio="cerrajeria" businessName={business?.name} onIssued={() => setPendingOrder(null)} onClose={() => { setReceipt(null); if (!dian?.enabled) setPendingOrder(null) }} />}
      {inventoryOpen && <InventoryManager title="Inventario de cerrajería" gremio="cerrajeria" products={allProducts} onAddProduct={addProduct} onImportProducts={importProducts} onAdjustStock={adjustStock} onUpdateProduct={updateProduct} onDeleteProduct={deleteProduct} onLoadSamples={loadSampleInventory} onClose={() => setInventoryOpen(false)} remote={inventoryRemote} loadError={inventoryError} />}
    </main>
  )
}
