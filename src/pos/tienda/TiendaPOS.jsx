import { useEffect, useMemo, useState } from 'react'
import { Barcode, Banknote, PackagePlus, Search, ShoppingBasket, Store, Truck, UserRoundPlus, UsersRound, X } from 'lucide-react'
import { formatCOP } from '../../shared/services/ticket.js'
import { AdCarousel } from '../../shared/components/Publicity/AdCarousel.jsx'
import { Payment } from '../../shared/components/Payment/Payment.jsx'
import { SaleReceipt } from '../../shared/components/Payment/SaleReceipt.jsx'
import { InventoryManager } from '../../shared/components/Inventory/InventoryManager.jsx'
import { EmptyInventoryState } from '../../shared/components/Inventory/EmptyInventoryState.jsx'
import { CashRegister } from '../../shared/components/CashRegister/CashRegister.jsx'
import { useTenantGremio } from '../../shared/hooks/useTenantGremio.js'
import { useInventory } from '../../shared/hooks/useInventory.js'
import { assertCashRegisterOpen, recordCashSale } from '../../shared/services/cashRegister.js'
import { appStorage, isDemoMode } from '../../shared/services/tenantStorage.js'

const initialProducts = [
  { id: 'arroz', barcode: '7701000000103', name: 'Arroz por libra', category: 'Granos', price: 2400, quantity: 38, icon: '🍚', unit: 'lb' },
  { id: 'lenteja', barcode: '7701000000110', name: 'Lenteja a granel', category: 'Granos', price: 5200, quantity: 18, icon: '🫘', unit: 'kg' },
  { id: 'frijol', barcode: '7701000000127', name: 'Fríjol cargamanto', category: 'Granos', price: 7800, quantity: 15, icon: '🫘', unit: 'kg' },
  { id: 'aceite', barcode: '7701000000134', name: 'Aceite vegetal 900 ml', category: 'Despensa', price: 8900, quantity: 12, icon: '🫒' },
  { id: 'leche', barcode: '7701000000141', name: 'Leche entera 1 L', category: 'Lácteos', price: 4200, quantity: 20, icon: '🥛' },
  { id: 'huevos', barcode: '7701000000158', name: 'Huevos AA x12', category: 'Frescos', price: 9800, quantity: 10, icon: '🥚' },
  { id: 'panela', barcode: '7701000000165', name: 'Panela 500 g', category: 'Despensa', price: 3200, quantity: 16, icon: '🍯' },
  { id: 'jabón', barcode: '7701000000172', name: 'Jabón de lavar', category: 'Aseo', price: 2500, quantity: 3, icon: '🧼' },
]

const suppliers = [
  { name: 'Distribuciones La 14', category: 'Abarrotes y granos', phone: '+573001234567', contact: 'Pedidos de lunes a sábado' },
  { name: 'Lácteos del Barrio', category: 'Lácteos y refrigerados', phone: '+573102345678', contact: 'Entrega diaria · antes de las 9 a. m.' },
  { name: 'Aseo y Hogar Central', category: 'Aseo y cuidado personal', phone: '+573203456789', contact: 'Pedido mínimo: $150.000' },
]

const API_URL = import.meta.env.VITE_API_URL
const TOKEN_KEY = 'vexora.accessToken'

function readCredits(key) {
  try {
    const saved = appStorage().getItem(key)
    const parsed = saved ? JSON.parse(saved) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function readSuppliers(key) {
  try {
    const saved = appStorage().getItem(key)
    const parsed = saved ? JSON.parse(saved) : null
    return Array.isArray(parsed) ? parsed : suppliers
  } catch {
    return suppliers
  }
}

function normalizeCredits(result) {
  result = result?.data ?? result
  const rows = Array.isArray(result) ? result : result?.credits ?? result?.items ?? []
  if (!Array.isArray(rows)) throw new Error('La respuesta de fiados no tiene el formato esperado.')
  return rows.map((credit) => {
    const transactions = Array.isArray(credit.transactions) ? credit.transactions : []
    const payments = Array.isArray(credit.payments) ? credit.payments : transactions.filter((item) => item.type === 'ABONO')
    const outstanding = Number(credit.debt ?? credit.balance ?? credit.outstanding ?? 0)
    const paidAmount = Number(credit.paidAmount ?? payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0))
    const amount = Number(credit.amount ?? credit.totalAmount ?? outstanding + paidAmount)
    return {
      ...credit,
      id: String(credit.id ?? credit._id),
      customer: credit.name ?? credit.customer ?? 'Cliente',
      phone: credit.phone ?? '',
      amount,
      paidAmount,
      outstanding,
      note: credit.note ?? transactions.find((item) => item.type === 'FIADO')?.note ?? '',
      createdAt: credit.createdAt ?? credit.created_at ?? new Date().toISOString(),
      settled: Boolean(credit.settled ?? (credit.status === 'paid' || outstanding <= 0)),
    }
  })
}

function normalizeSuppliers(result) {
  result = result?.data ?? result
  const rows = Array.isArray(result) ? result : result?.suppliers ?? result?.items ?? []
  if (!Array.isArray(rows)) throw new Error('La respuesta de proveedores no tiene el formato esperado.')
  return rows.map((supplier) => ({
    ...supplier,
    id: String(supplier.id ?? supplier._id ?? supplier.name),
    contact: supplier.contact ?? supplier.notes ?? supplier.note ?? '',
  }))
}

async function tiendaRequest(path, token, options = {}) {
  if (isDemoMode()) throw new Error('La cuenta demo no se conecta al backend.')
  const response = await fetch(new URL(path, API_URL), {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.message ?? result.error ?? `La solicitud falló (${response.status}).`)
  return result
}

function productUnit(product) {
  return product.unit || (/granel|a granel|por libra/i.test(`${product.name || ''} ${product.category || ''}`) ? 'lb' : 'und.')
}

export default function TiendaPOS() {
  const { dian, business } = useTenantGremio()
  const { products, allProducts, addProduct, importProducts, adjustStock, updateProduct, deleteProduct, loadSampleInventory, validateSale, recordSale, refreshInventory, loading, error, remote } = useInventory('tienda', initialProducts)
  const creditKey = `vexora.tienda.credit:${(business?.email || dian?.nit || business?.name || 'demo').toLowerCase()}`
  const supplierKey = `${creditKey}:suppliers`
  const [token] = useState(() => window.localStorage.getItem(TOKEN_KEY) || '')
  const authenticatedApi = Boolean(API_URL && token && !isDemoMode())
  const [credits, setCredits] = useState(() => authenticatedApi ? [] : normalizeCredits(readCredits(creditKey)))
  const [supplierRows, setSupplierRows] = useState(() => authenticatedApi ? [] : readSuppliers(supplierKey))
  const [apiLoading, setApiLoading] = useState(authenticatedApi)
  const [apiError, setApiError] = useState('')
  const [creditPayments, setCreditPayments] = useState({})
  const [supplierMessage, setSupplierMessage] = useState('')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('Todos')
  const [cart, setCart] = useState([])
  const [tab, setTab] = useState('venta')
  const [notice, setNotice] = useState('')
  const [inventoryOpen, setInventoryOpen] = useState(false)
  const [cashOpen, setCashOpen] = useState(false)
  const [receipt, setReceipt] = useState(null)
  const [creditName, setCreditName] = useState('')
  const [creditPhone, setCreditPhone] = useState('')

  useEffect(() => {
    if (!authenticatedApi) return undefined
    let active = true
    setApiLoading(true)
    Promise.all([
      tiendaRequest('/api/tienda/credits', token).then((result) => {
        if (active) setCredits(normalizeCredits(result))
      }),
      tiendaRequest('/api/tienda/suppliers', token).then((result) => {
        if (active) setSupplierRows(normalizeSuppliers(result))
      }),
    ]).catch((cause) => {
      if (active) setApiError(cause instanceof Error ? cause.message : 'No se pudieron cargar fiados y proveedores.')
    }).finally(() => {
      if (active) setApiLoading(false)
    })
    return () => { active = false }
  }, [authenticatedApi, token])

  const categories = useMemo(() => ['Todos', ...new Set(products.map((item) => item.category || 'General'))], [products])
  const filtered = useMemo(() => products.filter((product) => {
    const matchesQuery = `${product.name} ${product.category} ${product.barcode} ${product.id}`.toLowerCase().includes(query.trim().toLowerCase())
    return matchesQuery && (category === 'Todos' || (product.category || 'General') === category)
  }), [products, query, category])
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)

  function add(product) {
    setCart((current) => {
      const item = current.find((entry) => entry.id === product.id)
      const nextQuantity = (item?.quantity || 0) + (productUnit(product) === 'kg' ? 0.1 : productUnit(product) === 'lb' ? 0.25 : 1)
      if (nextQuantity > Number(product.quantity ?? product.stock ?? 0)) {
        setNotice(`Existencia disponible de ${product.name}: ${product.quantity ?? product.stock} ${productUnit(product)}.`)
        return current
      }
      setNotice('')
      return item
        ? current.map((entry) => entry.id === product.id ? { ...entry, quantity: Number(nextQuantity.toFixed(3)) } : entry)
        : [...current, { ...product, quantity: productUnit(product) === 'kg' ? 0.1 : productUnit(product) === 'lb' ? 0.25 : 1 }]
    })
  }

  function setQuantity(id, value) {
    const quantity = Number(value)
    const product = products.find((entry) => entry.id === id)
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setCart((current) => current.filter((item) => item.id !== id))
      return
    }
    if (quantity > Number(product?.quantity ?? product?.stock ?? 0)) {
      setNotice(`Existencia disponible de ${product?.name}: ${product?.quantity ?? product?.stock} ${productUnit(product || {})}.`)
      return
    }
    setNotice('')
    setCart((current) => current.map((item) => item.id === id ? { ...item, quantity } : item))
  }

  function scanBarcode(event) {
    if (event.key !== 'Enter') return
    const barcode = query.trim()
    if (!barcode) return
    const match = products.find((product) => String(product.barcode || '') === barcode)
    if (!match) {
      setNotice(`No encontramos el código ${barcode}.`)
      return
    }
    add(match)
    setQuery('')
    setNotice(`${match.name} agregado.`)
  }

  async function checkout(method, onCredit = false, cashDetails = {}) {
    let sale
    try {
      if (!cart.length) throw new Error('Agrega productos al carrito.')
      if (onCredit && !creditName.trim()) throw new Error('Escribe el nombre del cliente para dejar el fiado.')
      if (onCredit && authenticatedApi && !creditPhone.trim()) throw new Error('Escribe el teléfono del cliente para identificar el fiado.')
      validateSale(cart)
      assertCashRegisterOpen('tienda', total)
      if (onCredit) {
        if (authenticatedApi) {
          const result = await tiendaRequest('/api/tienda/credits', token, {
            method: 'POST',
            body: JSON.stringify({
              name: creditName.trim(),
              phone: creditPhone.trim(),
              amount: total,
              note: cart.map((item) => `${item.quantity} ${productUnit(item)} ${item.name}`).join(', '),
              items: cart.map((item) => ({ id: item.id, quantity: item.quantity })),
            }),
          })
          sale = result.sale
          const savedCredit = normalizeCredits([result.credit])[0]
          setCredits((current) => [savedCredit, ...current.filter((item) => item.id !== savedCredit.id)])
          try {
            await refreshInventory()
          } catch (cause) {
            setApiError(cause instanceof Error ? cause.message : 'El fiado se guardó, pero no se pudo actualizar el inventario en pantalla.')
          }
        } else {
        const entry = {
          id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`,
          customer: creditName.trim(),
          phone: creditPhone.trim(),
          amount: total,
          createdAt: new Date().toISOString(),
          settled: false,
        }
        const next = [entry, ...credits]
        appStorage().setItem(creditKey, JSON.stringify(next))
        setCredits(next)
        }
      } else {
        sale = await recordSale(cart, method)
      }
      if (onCredit && !authenticatedApi) sale = await recordSale(cart)
      recordCashSale('tienda', total, onCredit ? 'fiado' : method)
      setReceipt({ items: cart, paymentMethod: onCredit ? 'Fiado' : method, sale, cashReceived: onCredit ? undefined : cashDetails.cashReceived, changeDue: onCredit ? undefined : cashDetails.changeDue })
      setNotice(onCredit ? `Fiado registrado a nombre de ${creditName.trim()}.` : '')
    } catch (cause) {
      if (authenticatedApi) setApiError(cause instanceof Error ? cause.message : 'No se pudo registrar la venta.')
      setNotice(cause instanceof Error ? cause.message : 'No se pudo registrar la venta.')
    }
  }

  async function settleCredit(credit) {
    const payment = creditPayments[credit.id] || {}
    const amount = Number(payment.amount || credit.outstanding)
    if (!Number.isFinite(amount) || amount <= 0 || amount > credit.outstanding) {
      setApiError(`Ingresa un abono entre $1 y ${formatCOP(credit.outstanding)}.`)
      return
    }
    try {
      if (authenticatedApi) {
        const result = await tiendaRequest(`/api/tienda/credits/${encodeURIComponent(credit.id)}/payments`, token, {
          method: 'POST',
          body: JSON.stringify({ amount, note: payment.note || '' }),
        })
        const updated = normalizeCredits([result.credit])[0]
        setCredits((current) => current.map((item) => item.id === updated.id ? updated : item))
      } else {
        const next = credits.map((item) => {
          if (item.id !== credit.id) return item
          const outstanding = Math.max(0, item.outstanding - amount)
          return { ...item, paidAmount: item.paidAmount + amount, outstanding, settled: outstanding === 0, settledAt: outstanding === 0 ? new Date().toISOString() : undefined }
        })
        appStorage().setItem(creditKey, JSON.stringify(next))
        setCredits(normalizeCredits(next))
      }
      setCreditPayments((current) => ({ ...current, [credit.id]: { amount: '', note: '' } }))
      setApiError('')
    } catch (cause) {
      setApiError(cause instanceof Error ? cause.message : 'No se pudo registrar el abono.')
    }
  }

  async function createSupplier(event) {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(event.currentTarget)
    const supplier = {
      name: String(form.get('name') || '').trim(),
      phone: String(form.get('phone') || '').trim(),
      category: String(form.get('category') || '').trim(),
      note: String(form.get('contact') || '').trim(),
    }
    if (!supplier.name) return
    try {
      if (authenticatedApi) {
        const result = await tiendaRequest('/api/tienda/suppliers', token, {
          method: 'POST',
          body: JSON.stringify({ name: supplier.name, phone: supplier.phone, category: supplier.category, notes: supplier.note }),
        })
        const created = normalizeSuppliers([result.supplier])[0]
        setSupplierRows((current) => [created, ...current.filter((item) => item.id !== created.id)])
      } else {
        const created = { ...supplier, id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}` }
        const next = [created, ...supplierRows]
        appStorage().setItem(supplierKey, JSON.stringify(next))
        setSupplierRows(next)
      }
      setSupplierMessage('Proveedor guardado.')
      setApiError('')
      formElement.reset()
    } catch (cause) {
      setApiError(cause instanceof Error ? cause.message : 'No se pudo guardar el proveedor.')
      setSupplierMessage('')
    }
  }

  const balance = credits.filter((credit) => !credit.settled).reduce((sum, credit) => sum + Number(credit.outstanding), 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expirationLimit = today.getTime() + 4 * 24 * 60 * 60 * 1000
  const expiringProducts = products
    .filter((product) => {
      const expiry = product.expiryDate ? new Date(product.expiryDate).getTime() : NaN
      return Number.isFinite(expiry) && expiry < expirationLimit
    })
    .sort((first, second) => new Date(first.expiryDate).getTime() - new Date(second.expiryDate).getTime())

  return (
    <>
      <main className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-700"><Store className="h-4 w-4" />Tienda de barrio</p><h1 className="mt-1 text-3xl font-black">Mi minimercado</h1><p className="mt-1 text-sm text-zinc-500">Ventas rápidas, productos a granel y cuentas claras.</p></div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setCashOpen((open) => !open)} className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-bold"><Banknote className="h-4 w-4 text-emerald-700" />{cashOpen ? 'Ocultar caja' : 'Caja'}</button>
            <button type="button" onClick={() => setInventoryOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm font-bold text-emerald-800"><PackagePlus className="h-4 w-4" />Inventario</button>
          </div>
        </header>
        {expiringProducts.length > 0 && <section role="alert" className="mb-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950"><p className="font-black">Productos por vencer o vencidos</p><ul className="mt-2 flex flex-wrap gap-2">{expiringProducts.map((product) => {
          const expiry = new Date(product.expiryDate)
          const expired = expiry.getTime() < today.getTime()
          return <li key={product.id} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${expired ? 'bg-rose-100 text-rose-900' : 'bg-white text-amber-950'}`}>{product.name} · {expired ? 'Vencido' : `vence ${expiry.toLocaleDateString('es-CO')}`}</li>
        })}</ul></section>}
        <nav className="mb-5 flex gap-2 overflow-x-auto" aria-label="Secciones de tienda">
          {[['venta', 'Venta'], ['fiados', 'Fiados'], ['proveedores', 'Proveedores']].map(([id, label]) => <button key={id} type="button" onClick={() => setTab(id)} className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-bold ${tab === id ? 'bg-emerald-700 text-white' : 'border border-zinc-200 bg-white text-zinc-600 hover:border-emerald-300'}`}>{label}</button>)}
        </nav>
        {cashOpen && <div className="mb-5"><CashRegister gremio="tienda" /></div>}
        {loading && <p role="status" className="mb-4 rounded-xl bg-blue-50 p-3 text-sm text-blue-800">Cargando inventario del negocio…</p>}
        {error && <p role="alert" className="mb-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
        {apiLoading && <p role="status" className="mb-4 rounded-xl bg-blue-50 p-3 text-sm text-blue-800">Cargando fiados y proveedores…</p>}
        {apiError && <p role="alert" className="mb-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{apiError}</p>}

        {tab === 'venta' && <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_370px]">
          <section>
            <label className="mb-4 flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 focus-within:border-emerald-500"><Search className="h-5 w-5 text-zinc-400" /><input autoFocus value={query} onChange={(event) => { setQuery(event.target.value); setNotice('') }} onKeyDown={scanBarcode} placeholder="Busca por nombre o escanea el código de barras…" className="min-w-0 flex-1 outline-none" /><Barcode className="h-5 w-5 text-emerald-600" /></label>
            <div className="mb-4 flex gap-2 overflow-x-auto pb-1">{categories.map((item) => <button key={item} type="button" onClick={() => setCategory(item)} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold ${item === category ? 'bg-emerald-100 text-emerald-900' : 'bg-white text-zinc-500 ring-1 ring-zinc-200'}`}>{item}</button>)}</div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {filtered.map((product) => <button key={product.id} type="button" onClick={() => add(product)} className="rounded-2xl border border-zinc-200 bg-white p-4 text-left transition hover:border-emerald-400 hover:shadow-md">
                <div className="flex items-start justify-between"><span className="text-3xl">{product.icon || '🛒'}</span>{Number(product.quantity ?? product.stock) <= 5 && <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-800">Pocas existencias</span>}</div>
                <p className="mt-3 font-bold">{product.name}</p><p className="mt-1 text-xs text-zinc-500">{product.category || 'General'} · {product.quantity ?? product.stock} {productUnit(product)}</p>
                <p className="mt-2 font-black text-emerald-800">{formatCOP(product.price)}<span className="text-xs font-medium text-zinc-500"> / {productUnit(product)}</span></p>
              </button>)}
              {products.length > 0 && !filtered.length && <p className="col-span-full rounded-xl bg-white p-8 text-center text-sm text-zinc-500">No hay productos que coincidan con la búsqueda.</p>}
              {!products.length && !loading && !error && <EmptyInventoryState onLoadSamples={loadSampleInventory} />}
            </div>
          </section>
          <aside className="space-y-4">
            <section className="rounded-2xl border border-zinc-200 bg-white p-5">
              <h2 className="flex items-center gap-2 font-black"><ShoppingBasket className="h-5 w-5 text-emerald-700" />Carrito <span className="ml-auto rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-800">{cart.length}</span></h2>
              <div className="mt-3 divide-y divide-zinc-100">{cart.length ? cart.map((item) => <div key={item.id} className="flex items-center gap-2 py-3">
                <span className="text-2xl">{item.icon || '🛒'}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{item.name}</p><p className="text-xs text-zinc-500">{formatCOP(item.price)} / {productUnit(item)}</p></div>
                <label className="flex items-center gap-1"><input aria-label={`Cantidad de ${item.name}`} type="number" min="0.01" step={productUnit(item) === 'und.' ? '1' : '0.01'} value={item.quantity} onChange={(event) => setQuantity(item.id, event.target.value)} className="w-20 rounded-lg border border-zinc-200 px-2 py-1.5 text-right text-sm font-bold" /><span className="text-xs text-zinc-500">{productUnit(item)}</span></label>
                <button type="button" onClick={() => setCart((current) => current.filter((entry) => entry.id !== item.id))} aria-label={`Quitar ${item.name}`} className="rounded-lg p-1 text-zinc-400 hover:text-rose-600"><X className="h-4 w-4" /></button>
              </div>) : <p className="py-8 text-center text-sm text-zinc-400">Toca un producto para agregarlo.</p>}</div>
              <p className="mt-3 flex justify-between border-t pt-4 font-black"><span>Total</span><span>{formatCOP(total)}</span></p>
              {notice && <p role="status" className="mt-3 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-900">{notice}</p>}
            </section>
            <Payment total={total} onPay={(method, cashDetails) => void checkout(method, false, cashDetails)} />
            {cart.length > 0 && <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <h3 className="font-black text-amber-950">¿Lo apunta a la cuenta?</h3><p className="mt-1 text-xs text-amber-900">Registra la venta como saldo pendiente, sin afectar la caja.</p>
              <div className="mt-3 grid gap-2"><input value={creditName} onChange={(event) => setCreditName(event.target.value)} placeholder="Nombre del cliente" className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm" /><input value={creditPhone} onChange={(event) => setCreditPhone(event.target.value)} placeholder={authenticatedApi ? 'Teléfono del cliente (requerido)' : 'Teléfono (opcional)'} className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm" /><button type="button" onClick={() => void checkout('Fiado', true)} className="rounded-xl bg-amber-800 px-3 py-2.5 text-sm font-bold text-white hover:bg-amber-900">Registrar fiado · {formatCOP(total)}</button></div>
            </section>}
            <AdCarousel gremio="tienda" />
          </aside>
        </div>}

        {tab === 'fiados' && <section className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-amber-800"><UsersRound className="h-4 w-4" />Cuentas de clientes</p><h2 className="mt-1 text-2xl font-black">Fiados por cobrar</h2><p className="mt-1 text-sm text-zinc-500">{authenticatedApi ? 'Cuentas sincronizadas con tu negocio.' : 'Este registro queda guardado en este navegador.'}</p></div><div className="rounded-xl bg-amber-50 px-4 py-3"><p className="text-xs font-bold text-amber-800">SALDO PENDIENTE</p><p className="text-xl font-black text-amber-950">{formatCOP(balance)}</p></div></div>
          <div className="mt-5 divide-y divide-zinc-100">{credits.length ? credits.map((credit) => <article key={credit.id} className="flex flex-wrap items-center gap-3 py-4"><div className="grid h-10 w-10 place-items-center rounded-full bg-amber-50 text-amber-800"><UserRoundPlus className="h-5 w-5" /></div><div className="min-w-0 flex-1"><p className="font-bold">{credit.customer}</p><p className="text-xs text-zinc-500">{credit.phone || 'Sin teléfono'} · {new Date(credit.createdAt).toLocaleDateString('es-CO')}{credit.note ? ` · ${credit.note}` : ''}</p></div><div className="text-right"><p className="font-black">{formatCOP(credit.outstanding)}</p>{credit.paidAmount > 0 && <p className="text-xs text-zinc-500">Abonado de {formatCOP(credit.amount)}</p>}</div>{credit.settled ? <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">Pagado</span> : <div className="flex flex-wrap items-center gap-2"><input aria-label={`Abono de ${credit.customer}`} type="number" min="1" max={credit.outstanding} step="1" value={creditPayments[credit.id]?.amount ?? credit.outstanding} onChange={(event) => setCreditPayments((current) => ({ ...current, [credit.id]: { ...current[credit.id], amount: event.target.value } }))} className="w-28 rounded-lg border border-zinc-200 px-2 py-2 text-sm" /><input aria-label={`Nota del abono de ${credit.customer}`} value={creditPayments[credit.id]?.note || ''} onChange={(event) => setCreditPayments((current) => ({ ...current, [credit.id]: { ...current[credit.id], note: event.target.value } }))} placeholder="Nota opcional" className="w-32 rounded-lg border border-zinc-200 px-2 py-2 text-sm" /><button type="button" onClick={() => void settleCredit(credit)} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white">Registrar abono</button></div>}</article>) : <p className="py-10 text-center text-sm text-zinc-500">Todavía no hay cuentas pendientes. Desde Venta puedes registrar una compra fiada.</p>}</div>
        </section>}

        {tab === 'proveedores' && <section>
          <div className="mb-4"><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-sky-800"><Truck className="h-4 w-4" />Abastecimiento</p><h2 className="mt-1 text-2xl font-black">Proveedores frecuentes</h2><p className="mt-1 text-sm text-zinc-500">{authenticatedApi ? 'Proveedores sincronizados con tu negocio.' : 'Contactos de ejemplo guardados localmente en este navegador.'}</p></div>
          <form onSubmit={createSupplier} className="mb-5 grid gap-3 rounded-2xl border border-zinc-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5"><label className="text-xs font-bold text-zinc-600">Nombre<input name="name" required maxLength="100" placeholder="Nombre del proveedor" className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm font-normal" /></label><label className="text-xs font-bold text-zinc-600">Teléfono<input name="phone" type="tel" placeholder="Teléfono" className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm font-normal" /></label><label className="text-xs font-bold text-zinc-600">Categoría<input name="category" placeholder="Abarrotes, lácteos…" className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm font-normal" /></label><label className="text-xs font-bold text-zinc-600">Nota / horario<input name="contact" placeholder="Información útil" className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm font-normal" /></label><button type="submit" className="self-end rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-sky-800">Guardar proveedor</button>{supplierMessage && <p role="status" className="text-xs font-semibold text-emerald-700 sm:col-span-2 lg:col-span-5">{supplierMessage}</p>}</form>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{supplierRows.map((supplier) => <article key={supplier.id} className="rounded-2xl border border-zinc-200 bg-white p-5"><div className="flex items-start justify-between"><div className="grid h-11 w-11 place-items-center rounded-xl bg-sky-50 text-sky-800"><Truck className="h-5 w-5" /></div><span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-bold text-zinc-600">Proveedor</span></div><h3 className="mt-4 font-black">{supplier.name}</h3><p className="mt-1 text-sm text-zinc-600">{supplier.category || supplier.type || 'Proveedor'}</p><p className="mt-3 text-xs text-zinc-500">{supplier.contact || supplier.note || ''}</p>{supplier.phone && <a href={`tel:${supplier.phone}`} className="mt-4 inline-flex rounded-xl bg-sky-700 px-3 py-2 text-sm font-bold text-white hover:bg-sky-800">Llamar para pedir</a>}</article>)}</div>
        </section>}
      </main>
      {receipt && <SaleReceipt items={receipt.items} sale={receipt.sale} cashReceived={receipt.cashReceived} changeDue={receipt.changeDue} paymentMethod={receipt.paymentMethod} dian={dian} gremio="tienda" businessName={business?.name ?? 'Tienda de barrio'} paperWidth={58} onIssued={() => { setCart([]); setNotice('Factura enviada a la DIAN.') }} onClose={() => { if (!dian?.enabled) setCart([]); setReceipt(null) }} />}
      {inventoryOpen && <InventoryManager title="Inventario de la tienda" gremio="tienda" products={allProducts} onAddProduct={addProduct} onImportProducts={importProducts} onAdjustStock={adjustStock} onUpdateProduct={updateProduct} onDeleteProduct={deleteProduct} onLoadSamples={loadSampleInventory} onClose={() => setInventoryOpen(false)} remote={remote} loadError={error} />}
    </>
  )
}
