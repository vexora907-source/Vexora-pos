import { useMemo, useState } from 'react'
import { PackagePlus, Search, ScanBarcode, Store } from 'lucide-react'
import { ProductGridPapeleria } from './components/ProductGridPapeleria.jsx'
import { CartPapeleria } from './components/CartPapeleria.jsx'
import { TicketPapeleria } from './components/TicketPapeleria.jsx'
import { AdCarousel } from '../../shared/components/Publicity/AdCarousel.jsx'
import { Payment } from '../../shared/components/Payment/Payment.jsx'
import { useTenantGremio } from '../../shared/hooks/useTenantGremio.js'
import { useInventory } from '../../shared/hooks/useInventory.js'
import { InventoryManager } from '../../shared/components/Inventory/InventoryManager.jsx'
import { EmptyInventoryState } from '../../shared/components/Inventory/EmptyInventoryState.jsx'
import { assertCashRegisterOpen, recordCashSale } from '../../shared/services/cashRegister.js'

const initialProducts = [
  { id: 'cuaderno', barcode: '7701000000028', name: 'Cuaderno cosido', category: 'Escolar', price: 4500, stock: 18, icon: '📒', tone: 'bg-amber-100' },
  { id: 'foto', barcode: '7701000000011', name: 'Papel fotográfico A4', category: 'Impresión', price: 500, stock: 24, icon: '🖼️', tone: 'bg-sky-100' },
  { id: 'marcadores', barcode: '7701000000035', name: 'Marcadores x12', category: 'Arte', price: 8900, stock: 9, icon: '🖍️', tone: 'bg-blue-100' },
  { id: 'cartulina', barcode: '7701000000042', name: 'Cartulina de colores', category: 'Papelería', price: 1200, stock: 32, icon: '🎨', tone: 'bg-violet-100' },
  { id: 'pegante', barcode: '7701000000059', name: 'Pegante en barra', category: 'Escolar', price: 2800, stock: 4, icon: '🧴', tone: 'bg-emerald-100' },
  { id: 'lapiz', barcode: '7701000000066', name: 'Lápiz HB', category: 'Escritura', price: 800, stock: 50, icon: '✏️', tone: 'bg-orange-100' },
]

export default function PapeleriaPOS() {
  const { dian, business } = useTenantGremio()
  const { products, allProducts, addProduct, importProducts, adjustStock, updateProduct, deleteProduct, loadSampleInventory, validateSale, recordSale, loading: inventoryLoading, error: inventoryError, remote: inventoryRemote } = useInventory('papeleria', initialProducts)
  const [query, setQuery] = useState('')
  const [cart, setCart] = useState([])
  const [paymentMethod, setPaymentMethod] = useState('')
  const [ticket, setTicket] = useState(null)
  const [scanMessage, setScanMessage] = useState('')
  const [inventoryOpen, setInventoryOpen] = useState(false)
  const filtered = useMemo(() => products.filter((product) => `${product.name} ${product.category} ${product.id}`.toLowerCase().includes(query.toLowerCase())), [products, query])

  function add(product) {
    setCart((current) => {
      const found = current.find((item) => item.id === product.id)
      if (found?.quantity >= Number(product.stock ?? product.quantity)) {
        setScanMessage(`Stock disponible: ${product.stock ?? product.quantity} unidades.`)
        return current
      }
      return found ? current.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item) : [...current, { ...product, quantity: 1 }]
    })
  }
  function quantity(id, amount) {
    const product = products.find((item) => item.id === id)
    setCart((current) => amount < 1 ? current.filter((item) => item.id !== id) : current.map((item) => item.id === id ? { ...item, quantity: Math.min(amount, Number(product?.quantity ?? product?.stock ?? amount)) } : item))
  }
  async function pay(method, cashDetails) {
    let sale
    try {
      validateSale(cart)
      const saleTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
      assertCashRegisterOpen('papeleria', saleTotal)
      sale = await recordSale(cart, method)
      recordCashSale('papeleria', saleTotal, method)
    } catch (error) {
      setScanMessage(error instanceof Error ? error.message : 'No se pudo registrar la venta.')
      return
    }
    setPaymentMethod(method)
    setTicket({ items: cart, sale, cashReceived: cashDetails?.cashReceived, changeDue: cashDetails?.changeDue })
  }
  function scanBarcode(event) {
    if (event.key !== 'Enter') return
    const barcode = query.trim()
    const product = products.find((item) => item.barcode === barcode)
    if (!product) {
      setScanMessage(`No hay un producto con el código ${barcode}.`)
      return
    }
    add(product)
    setQuery('')
    setScanMessage(`${product.name} agregado al carrito.`)
  }

  return (
    <main className="mx-auto grid max-w-[1500px] gap-5 px-4 py-5 lg:grid-cols-[minmax(0,1fr)_350px] sm:px-6">
      <section><header className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-vexora-600"><Store className="h-4 w-4" />Papelería</p><h1 className="mt-1 text-3xl font-black">Punto de venta</h1></div><div className="flex gap-2"><button type="button" onClick={() => setInventoryOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-vexora-200 bg-white px-3 py-2 text-sm font-bold text-vexora-700"><PackagePlus className="h-4 w-4" />Inventario</button><a href="/onboarding" className="rounded-xl px-3 py-2 text-sm font-semibold text-zinc-500 hover:text-vexora-700">Cambiar gremios</a></div></header>
        {(inventoryLoading || inventoryError) && <p role={inventoryError ? 'alert' : 'status'} className={`mb-3 rounded-xl px-4 py-3 text-sm ${inventoryError ? 'bg-rose-50 text-rose-800' : 'bg-blue-50 text-blue-800'}`}>{inventoryError || 'Cargando inventario del negocio…'}</p>}
        <label className="mb-1 flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 focus-within:border-vexora-500"><Search className="h-5 w-5 text-zinc-400" /><input autoFocus value={query} onChange={(event) => { setQuery(event.target.value); setScanMessage('') }} onKeyDown={scanBarcode} placeholder="Busca producto o escanea código de barras…" className="min-w-0 flex-1 outline-none" /><ScanBarcode className="h-5 w-5 text-vexora-500" /></label>
        {scanMessage && <p role="status" className="mb-3 text-xs font-medium text-zinc-500">{scanMessage}</p>}
        <ProductGridPapeleria products={filtered} onAdd={add} />
        {!products.length && !inventoryLoading && !inventoryError && <EmptyInventoryState onLoadSamples={loadSampleInventory} />}
        {products.length > 0 && !filtered.length && <p className="rounded-2xl bg-white p-6 text-center text-sm text-zinc-500">No hay productos que coincidan con la búsqueda.</p>}
      </section>
      <aside className="space-y-4"><CartPapeleria items={cart} onChange={quantity} onPay={() => setPaymentMethod('select')} />{paymentMethod === 'select' && <Payment total={cart.reduce((sum, item) => sum + item.price * item.quantity, 0)} onPay={pay} />}<AdCarousel gremio="papeleria" /></aside>
      {ticket && <TicketPapeleria items={ticket.items} sale={ticket.sale} cashReceived={ticket.cashReceived} changeDue={ticket.changeDue} paymentMethod={paymentMethod} dian={dian} businessName={business?.name ?? 'Papel Color'} onIssued={() => setCart([])} onClose={() => { if (!dian?.enabled) setCart([]); setTicket(null); setPaymentMethod('') }} />}
      {inventoryOpen && <InventoryManager title="Inventario de papelería" gremio="papeleria" products={allProducts} onAddProduct={addProduct} onImportProducts={importProducts} onAdjustStock={adjustStock} onUpdateProduct={updateProduct} onDeleteProduct={deleteProduct} onLoadSamples={loadSampleInventory} onClose={() => setInventoryOpen(false)} remote={inventoryRemote} loadError={inventoryError} />}
    </main>
  )
}
