import { useEffect, useMemo, useState } from 'react'
import { Banknote, Check, PackagePlus, Search, ShoppingBag, Store, X } from 'lucide-react'
import { AdCarousel } from '../../shared/components/Publicity/AdCarousel.jsx'
import { CashRegister } from '../../shared/components/CashRegister/CashRegister.jsx'
import { InventoryManager } from '../../shared/components/Inventory/InventoryManager.jsx'
import { EmptyInventoryState } from '../../shared/components/Inventory/EmptyInventoryState.jsx'
import { Payment } from '../../shared/components/Payment/Payment.jsx'
import { SaleReceipt } from '../../shared/components/Payment/SaleReceipt.jsx'
import { useInventory } from '../../shared/hooks/useInventory.js'
import { useTenantGremio } from '../../shared/hooks/useTenantGremio.js'
import { assertCashRegisterOpen, recordCashSale } from '../../shared/services/cashRegister.js'
import { getAuthToken } from '../../shared/services/auth.js'
import { appStorage, isDemoMode } from '../../shared/services/tenantStorage.js'
import { formatCOP } from '../../shared/services/ticket.js'

const API_URL = import.meta.env.VITE_API_URL
const initialProducts = [
  {
    id: 'ropa-camiseta-basica', name: 'Camiseta esencial', category: 'Camisetas', price: 39000, quantity: 12, stock: 12, icon: '👕', tone: 'bg-rose-50',
    variants: [
      { size: 'S', color: 'Marfil', sku: 'CAM-ES-S-MAR', stock: 2 },
      { size: 'M', color: 'Marfil', sku: 'CAM-ES-M-MAR', stock: 3 },
      { size: 'L', color: 'Negro', sku: 'CAM-ES-L-NEG', stock: 4 },
      { size: 'XL', color: 'Azul', sku: 'CAM-ES-XL-AZU', stock: 3 },
    ],
  },
  {
    id: 'ropa-jean-recto', name: 'Jean recto', category: 'Pantalones', price: 119000, quantity: 10, stock: 10, icon: '👖', tone: 'bg-sky-50',
    variants: [
      { size: '28', color: 'Azul claro', sku: 'JEA-REC-28-ACL', stock: 2 },
      { size: '30', color: 'Azul claro', sku: 'JEA-REC-30-ACL', stock: 3 },
      { size: '32', color: 'Azul oscuro', sku: 'JEA-REC-32-AOS', stock: 3 },
      { size: '34', color: 'Azul oscuro', sku: 'JEA-REC-34-AOS', stock: 2 },
    ],
  },
  {
    id: 'ropa-vestido-midi', name: 'Vestido midi floral', category: 'Vestidos', price: 145000, quantity: 8, stock: 8, icon: '👗', tone: 'bg-violet-50',
    variants: [
      { size: 'S', color: 'Floral', sku: 'VES-MID-S-FLO', stock: 2 },
      { size: 'M', color: 'Floral', sku: 'VES-MID-M-FLO', stock: 3 },
      { size: 'L', color: 'Floral', sku: 'VES-MID-L-FLO', stock: 3 },
    ],
  },
  {
    id: 'ropa-chaqueta-denim', name: 'Chaqueta denim', category: 'Chaquetas', price: 189000, quantity: 6, stock: 6, icon: '🧥', tone: 'bg-amber-50',
    variants: [
      { size: 'S', color: 'Índigo', sku: 'CHA-DEN-S-IND', stock: 1 },
      { size: 'M', color: 'Índigo', sku: 'CHA-DEN-M-IND', stock: 2 },
      { size: 'L', color: 'Índigo', sku: 'CHA-DEN-L-IND', stock: 2 },
      { size: 'XL', color: 'Índigo', sku: 'CHA-DEN-XL-IND', stock: 1 },
    ],
  },
  {
    id: 'ropa-buzo-tejido', name: 'Buzo tejido', category: 'Buzos', price: 99000, quantity: 9, stock: 9, icon: '🧶', tone: 'bg-emerald-50',
    variants: [
      { size: 'S', color: 'Verde salvia', sku: 'BUZ-TEJ-S-VSA', stock: 2 },
      { size: 'M', color: 'Verde salvia', sku: 'BUZ-TEJ-M-VSA', stock: 3 },
      { size: 'L', color: 'Arena', sku: 'BUZ-TEJ-L-ARE', stock: 2 },
      { size: 'XL', color: 'Arena', sku: 'BUZ-TEJ-XL-ARE', stock: 2 },
    ],
  },
  {
    id: 'ropa-blusa-lino', name: 'Blusa de lino', category: 'Blusas', price: 79000, quantity: 11, stock: 11, icon: '👚', tone: 'bg-orange-50',
    variants: [
      { size: 'XS', color: 'Blanco', sku: 'BLU-LIN-XS-BLA', stock: 2 },
      { size: 'S', color: 'Blanco', sku: 'BLU-LIN-S-BLA', stock: 3 },
      { size: 'M', color: 'Terracota', sku: 'BLU-LIN-M-TER', stock: 3 },
      { size: 'L', color: 'Terracota', sku: 'BLU-LIN-L-TER', stock: 3 },
    ],
  },
]

const money = (value) => formatCOP(Number(value) || 0)

function receiptStorageKey(tenant) {
  const businessKey = tenant.isDemo ? 'demo-vexora-pos' : tenant.business?.email || tenant.dian?.nit || tenant.business?.name || 'demo'
  return `vexora.ropa.receipts:${businessKey.toLowerCase()}`
}

function readReceipts(key) {
  try {
    const data = JSON.parse(appStorage().getItem(key) || '[]')
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

function saveReceipts(key, receipts) {
  appStorage().setItem(key, JSON.stringify(receipts))
}

function newReceiptNumber() {
  return `ROP-${Date.now().toString(36).toUpperCase()}`
}

function totalOf(items) {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0)
}

function normalizeLayaway(layaway) {
  return {
    ...layaway,
    id: String(layaway.id ?? layaway._id),
    total: Number(layaway.total),
    paid: Number(layaway.paid),
    dueDate: layaway.dueDate,
  }
}

async function clothingRequest(path, options = {}) {
  const token = getAuthToken()
  if (isDemoMode()) throw new Error('La cuenta demo no se conecta al backend.')
  if (!API_URL || !token) throw new Error('Inicia sesión para guardar apartados y cambios en la cuenta.')
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

export default function RopaPOS() {
  const { dian, business, isDemo } = useTenantGremio()
  const {
    products, allProducts, addProduct, importProducts, adjustStock, updateProduct, deleteProduct, loadSampleInventory, validateSale, recordSale,
    refreshInventory, loading: inventoryLoading, error: inventoryError, remote: inventoryRemote,
  } = useInventory('ropa', initialProducts)
  const receiptKey = useMemo(() => receiptStorageKey({ business, dian, isDemo }), [business, dian, isDemo])
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('Todo')
  const [selectedVariants, setSelectedVariants] = useState({})
  const [variantRestock, setVariantRestock] = useState({})
  const [cart, setCart] = useState([])
  const [paymentMethod, setPaymentMethod] = useState('')
  const [ticket, setTicket] = useState(null)
  const [ticketSale, setTicketSale] = useState(null)
  const [message, setMessage] = useState('')
  const [inventoryOpen, setInventoryOpen] = useState(false)
  const [cashOpen, setCashOpen] = useState(false)
  const [layawayOpen, setLayawayOpen] = useState(false)
  const [layaways, setLayaways] = useState(() => inventoryRemote ? [] : readReceipts(`${receiptKey}:layaways`))
  const [layawayId, setLayawayId] = useState('')
  const [layawayAmount, setLayawayAmount] = useState('')
  const [layawayCustomer, setLayawayCustomer] = useState('')
  const [layawayPhone, setLayawayPhone] = useState('')
  const [receiptLookup, setReceiptLookup] = useState('')
  const [foundReceipt, setFoundReceipt] = useState(null)
  const [receiptLineKey, setReceiptLineKey] = useState('')
  const [returnAction, setReturnAction] = useState('cambio')
  const [exchangeProductId, setExchangeProductId] = useState('')
  const [exchangeSku, setExchangeSku] = useState('')
  const [exchangeDone, setExchangeDone] = useState(false)
  const [layawaysLoading, setLayawaysLoading] = useState(inventoryRemote)

  useEffect(() => {
    if (!inventoryRemote) return undefined
    let active = true
    clothingRequest('/api/ropa/layaways')
      .then((result) => {
        if (active) setLayaways((result.layaways ?? []).map(normalizeLayaway))
      })
      .catch((error) => {
        if (active) setMessage(error instanceof Error ? error.message : 'No se pudieron cargar los apartados.')
      })
      .finally(() => {
        if (active) setLayawaysLoading(false)
      })
    return () => { active = false }
  }, [inventoryRemote])

  const categories = useMemo(() => ['Todo', ...new Set(products.map((product) => product.category || 'General'))], [products])
  const filtered = useMemo(() => products.filter((product) => {
    const matchesCategory = category === 'Todo' || product.category === category
    const content = `${product.name} ${product.category} ${product.id}`.toLowerCase()
    return matchesCategory && content.includes(query.toLowerCase())
  }), [products, category, query])
  const cartTotal = totalOf(cart)
  const activeLayaway = layaways.find((item) => item.id === layawayId)
  const remainingLayaway = activeLayaway ? activeLayaway.total - activeLayaway.paid : 0
  const exchangeProduct = products.find((product) => product.id === exchangeProductId)
  const exchangeVariant = exchangeProduct?.variants?.find((variant) => variant.sku === exchangeSku)

  function variantFor(product) {
    const variants = Array.isArray(product.variants) ? product.variants : []
    return variants.find((variant) => variant.sku === selectedVariants[product.id]) ?? variants[0]
  }

  function addToCart(product) {
    const variant = variantFor(product)
    if (!variant) {
      setMessage('Este producto no tiene variantes disponibles.')
      return
    }
    const stock = Number(variant.stock) || 0
    if (stock < 1) {
      setMessage(`Sin existencias para ${variant.size} · ${variant.color}.`)
      return
    }
    const key = `${product.id}:${variant.sku}`
    setCart((current) => {
      const existing = current.find((item) => item.key === key)
      if (existing?.quantity >= stock) {
        setMessage(`Stock disponible de ${variant.sku}: ${stock} unidades.`)
        return current
      }
      return existing
        ? current.map((item) => item.key === key ? { ...item, quantity: item.quantity + 1 } : item)
        : [...current, {
          key, id: product.id, name: product.name, price: product.price, quantity: 1,
          variant: { ...variant }, sku: variant.sku,
        }]
    })
    setMessage('')
  }

  function changeQuantity(key, amount) {
    const item = cart.find((line) => line.key === key)
    const variant = products.find((product) => product.id === item?.id)?.variants?.find((entry) => entry.sku === item?.sku)
    const next = Math.min(amount, Number(variant?.stock) || 0)
    setCart((current) => next < 1
      ? current.filter((line) => line.key !== key)
      : current.map((line) => line.key === key ? { ...line, quantity: next } : line))
  }

  function inventoryLines(items) {
    const totals = new Map()
    for (const item of items) totals.set(item.id, (totals.get(item.id) || 0) + item.quantity)
    return [...totals].map(([id, quantity]) => ({ id, quantity }))
  }

  async function applyInventoryChanges(items, direction = -1) {
    const grouped = new Map()
    for (const item of items) {
      const current = grouped.get(item.id) || { quantity: 0, variants: new Map() }
      current.quantity += item.quantity
      current.variants.set(item.sku, (current.variants.get(item.sku) || 0) + item.quantity)
      grouped.set(item.id, current)
    }
    for (const [id, changes] of grouped) {
      const product = products.find((entry) => entry.id === id)
      if (!product) throw new Error('No se encontró un producto del inventario.')
      const variants = (product.variants || []).map((variant) => {
        const stock = Number(variant.stock) || 0
        const quantity = changes.variants.get(variant.sku) || 0
        if (direction < 0 && stock < quantity) throw new Error(`Stock insuficiente para ${variant.sku}.`)
        return { ...variant, stock: Math.max(0, stock + direction * quantity) }
      })
      await updateProduct(id, { variants, quantity: Math.max(0, Number(product.quantity ?? product.stock) + direction * changes.quantity), stock: Math.max(0, Number(product.quantity ?? product.stock) + direction * changes.quantity) })
    }
  }

  function issueSaleReceipt(items, method, kind = 'sale') {
    const receipt = {
      id: newReceiptNumber(), type: kind, createdAt: new Date().toISOString(),
      items: items.map((item) => ({ ...item, name: `${item.name} · ${item.variant.size} · ${item.variant.color}` })),
      total: totalOf(items), paymentMethod: method, exchangedItems: [],
    }
    const receipts = readReceipts(receiptKey)
    saveReceipts(receiptKey, [receipt, ...receipts])
    return receipt
  }

  async function pay(method, cashDetails) {
    try {
      if (!cart.length) return
      validateSale(inventoryLines(cart))
      for (const item of cart) {
        const variant = products.find((product) => product.id === item.id)?.variants?.find((entry) => entry.sku === item.sku)
        if (!variant || Number(variant.stock) < item.quantity) throw new Error(`Stock insuficiente para ${item.sku}.`)
      }
      assertCashRegisterOpen('ropa', cartTotal)
      let sale
      if (inventoryRemote) {
        sale = await recordSale(cart.map((item) => ({
          id: item.id,
          variantSku: item.sku,
          quantity: item.quantity,
          price: item.price,
        })), method)
      } else {
        await applyInventoryChanges(cart)
      }
      recordCashSale('ropa', cartTotal, method)
      issueSaleReceipt(cart, method)
      setPaymentMethod(method)
      setTicket(cart.map((item) => ({ ...item, name: `${item.name} · ${item.variant.size} · ${item.variant.color}` })))
      setTicketSale({ ...sale, cashReceived: cashDetails?.cashReceived, changeDue: cashDetails?.changeDue })
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo registrar la venta.')
    }
  }

  function onAddProduct(input) {
    const quantity = Number(input.quantity) || 0
    return addProduct({
      ...input,
      variants: [{ size: 'Única', color: 'Único', sku: input.barcode || `ROP-${Date.now().toString(36).toUpperCase()}`, stock: quantity }],
    })
  }

  async function onAdjustStock(id, amount) {
    const product = products.find((entry) => entry.id === id)
    if (!product) return adjustStock(id, amount)
    const variants = product.variants?.length
      ? product.variants.map((variant, index) => index === 0 ? { ...variant, stock: (Number(variant.stock) || 0) + amount } : variant)
      : [{ size: 'Única', color: 'Único', sku: product.barcode || `ROP-${Date.now().toString(36).toUpperCase()}`, stock: amount }]
    return updateProduct(id, { variants, quantity: (Number(product.quantity ?? product.stock) || 0) + amount, stock: (Number(product.quantity ?? product.stock) || 0) + amount })
  }

  async function onUpdateProduct(id, updates) {
    const product = products.find((entry) => entry.id === id)
    if (!product?.variants?.length) return updateProduct(id, updates)
    const otherVariantStock = product.variants.slice(1).reduce((sum, variant) => sum + (Number(variant.stock) || 0), 0)
    if (updates.quantity < otherVariantStock) {
      throw new Error('La cantidad total no puede ser menor que las unidades de las otras tallas y colores.')
    }
    const variants = product.variants.map((variant, index) => (
      index === 0 ? { ...variant, stock: updates.quantity - otherVariantStock } : variant
    ))
    return updateProduct(id, { ...updates, variants })
  }

  async function restockVariant(product, variant) {
    const key = `${product.id}:${variant.sku}`
    const amount = Number(variantRestock[key])
    if (!Number.isInteger(amount) || amount < 1) {
      setMessage('La cantidad a cargar debe ser un entero mayor que cero.')
      return
    }
    try {
      const variants = product.variants.map((entry) => entry.sku === variant.sku ? { ...entry, stock: (Number(entry.stock) || 0) + amount } : entry)
      const quantity = (Number(product.quantity ?? product.stock) || 0) + amount
      await updateProduct(product.id, { variants, quantity, stock: quantity })
      setVariantRestock((current) => ({ ...current, [key]: '' }))
      setMessage(`${amount} unidades cargadas a ${variant.sku}.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo actualizar el inventario.')
    }
  }

  async function createLayaway(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const amount = Number(form.get('initial-payment'))
    const customer = String(form.get('customer')).trim() || 'Cliente'
    const phone = String(form.get('phone')).trim()
    const minimum = Math.ceil(cartTotal * 0.3)
    if (!cart.length || !Number.isFinite(amount) || amount < minimum || amount >= cartTotal) {
      setMessage(`El abono inicial debe ser mínimo ${money(minimum)} y no puede superar el total.`)
      return
    }
    if (inventoryRemote && cart.length !== 1) {
      setMessage('Para reservar en la cuenta, crea un apartado por prenda y variante.')
      return
    }
    try {
      validateSale(inventoryLines(cart))
      for (const item of cart) {
        const variant = products.find((product) => product.id === item.id)?.variants?.find((entry) => entry.sku === item.sku)
        if (!variant || Number(variant.stock) < item.quantity) throw new Error(`Stock insuficiente para ${item.sku}.`)
      }
      assertCashRegisterOpen('ropa', amount)
      if (inventoryRemote) {
        const item = cart[0]
        const result = await clothingRequest('/api/ropa/layaways', {
          method: 'POST',
          body: JSON.stringify({
            customer,
            phone,
            productId: item.id,
            productName: item.name,
            variant: item.sku,
            quantity: item.quantity,
            total: cartTotal,
            paid: amount,
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          }),
        })
        let refreshWarning = ''
        try {
          await refreshInventory()
        } catch (cause) {
          refreshWarning = cause instanceof Error ? ` ${cause.message}` : ' No se pudo refrescar el inventario en pantalla.'
        }
        const saved = normalizeLayaway(result.layaway)
        setLayaways((current) => [saved, ...current])
        setLayawayId(saved.id)
        setCart([])
        setLayawayOpen(false)
        recordCashSale('ropa', amount, 'efectivo')
        setMessage(`Apartado ${saved.id}. Abono inicial registrado: ${money(amount)}.${refreshWarning}`)
        return
      }
      await applyInventoryChanges(cart)
      recordCashSale('ropa', amount, 'efectivo')
      const saved = {
        id: newReceiptNumber(), type: 'layaway', createdAt: new Date().toISOString(),
        items: cart.map((item) => ({ ...item, name: `${item.name} · ${item.variant.size} · ${item.variant.color}` })),
        total: cartTotal, paid: amount, payments: [{ amount, method: 'efectivo', createdAt: new Date().toISOString() }],
      }
      const next = [saved, ...readReceipts(`${receiptKey}:layaways`)]
      saveReceipts(`${receiptKey}:layaways`, next)
      setLayaways(next)
      setCart([])
      setLayawayOpen(false)
      setMessage(`Separado ${saved.id}. Abono inicial registrado: ${money(amount)}.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo crear el apartado.')
    }
  }

  async function addLayawayPayment(event) {
    event.preventDefault()
    const amount = Number(layawayAmount)
    if (!activeLayaway || !Number.isFinite(amount) || amount <= 0 || amount > remainingLayaway) {
      setMessage(`Ingresa un abono válido de hasta ${money(remainingLayaway)}.`)
      return
    }
    try {
      assertCashRegisterOpen('ropa', amount)
      let next
      if (inventoryRemote) {
        const result = await clothingRequest(`/api/ropa/layaways/${encodeURIComponent(activeLayaway.id)}/payments`, {
          method: 'POST',
          body: JSON.stringify({ amount }),
        })
        const updated = normalizeLayaway(result.layaway)
        next = layaways.map((item) => item.id === activeLayaway.id ? updated : item)
      } else {
        next = layaways.map((item) => item.id !== activeLayaway.id ? item : {
          ...item, paid: item.paid + amount,
          payments: [...item.payments, { amount, method: 'efectivo', createdAt: new Date().toISOString() }],
        })
        saveReceipts(`${receiptKey}:layaways`, next)
      }
      recordCashSale('ropa', amount, 'efectivo')
      setLayaways(next)
      setLayawayAmount('')
      setMessage(`Abono guardado. Saldo pendiente: ${money(remainingLayaway - amount)}.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo registrar el abono.')
    }
  }

  function findReceipt(event) {
    event.preventDefault()
    const found = readReceipts(receiptKey).find((receipt) => receipt.id.toLowerCase() === receiptLookup.trim().toLowerCase())
    setFoundReceipt(found ?? null)
    setExchangeDone(false)
    setReceiptLineKey(found?.items?.[0]?.key || '')
    setExchangeProductId('')
    setExchangeSku('')
    setMessage(found ? '' : 'No encontramos ese comprobante de venta.')
  }

  async function processExchange(event) {
    event.preventDefault()
    if (!foundReceipt) return
    const line = foundReceipt.items.find((item) => item.key === receiptLineKey)
    if (!line) return
    const usedQuantity = foundReceipt.exchangedItems?.filter((entry) => entry.key === line.key).reduce((sum, entry) => sum + entry.quantity, 0) || 0
    if (line.quantity - usedQuantity < 1) {
      setMessage('Esta línea del comprobante ya fue devuelta o cambiada.')
      return
    }
    try {
      const previousProduct = products.find((product) => product.id === line.id)
      const oldVariant = previousProduct?.variants?.find((variant) => variant.sku === line.sku)
      if (!oldVariant) throw new Error('La variante original ya no existe en el inventario.')
      if (returnAction === 'cambio' && (!exchangeProduct || !exchangeVariant || Number(exchangeVariant.stock) < 1)) {
        throw new Error('Selecciona una variante de reemplazo con existencias.')
      }
      const deltas = new Map([[line.id, new Map([[line.sku, 1]])]])
      if (returnAction === 'cambio') {
        const replacements = deltas.get(exchangeProduct.id) || new Map()
        replacements.set(exchangeVariant.sku, (replacements.get(exchangeVariant.sku) || 0) - 1)
        deltas.set(exchangeProduct.id, replacements)
      }
      if (inventoryRemote) {
        await clothingRequest('/api/ropa/returns', {
          method: 'POST',
          body: JSON.stringify({
            saleReference: foundReceipt.id,
            action: returnAction === 'cambio' ? 'exchange' : 'return',
            customer: foundReceipt.customer ?? '',
            productId: line.id,
            productName: line.name,
            originalVariant: line.sku,
            replacementProductId: returnAction === 'cambio' ? exchangeProduct.id : '',
            replacementProductName: returnAction === 'cambio' ? exchangeProduct.name : '',
            replacementVariant: returnAction === 'cambio' ? exchangeVariant.sku : '',
            reason: returnAction === 'cambio' ? 'Cambio de talla o prenda' : 'Devolución',
          }),
        })
        try {
          await refreshInventory()
        } catch (cause) {
          setMessage(cause instanceof Error ? `Cambio guardado. ${cause.message}` : 'Cambio guardado, pero no se pudo refrescar el inventario en pantalla.')
        }
      } else {
        for (const [id, skuDeltas] of deltas) {
          const product = products.find((entry) => entry.id === id)
          if (!product) throw new Error('No se encontró una prenda del inventario.')
          const variants = (product.variants || []).map((variant) => {
            const stock = Number(variant.stock) || 0
            const nextStock = stock + (skuDeltas.get(variant.sku) || 0)
            if (nextStock < 0) throw new Error(`Stock insuficiente para ${variant.sku}.`)
            return { ...variant, stock: nextStock }
          })
          const quantityDelta = [...skuDeltas.values()].reduce((sum, delta) => sum + delta, 0)
          const quantity = Math.max(0, Number(product.quantity ?? product.stock) + quantityDelta)
          await updateProduct(id, { variants, quantity, stock: quantity })
        }
      }
      const records = readReceipts(receiptKey)
      const updated = {
        ...foundReceipt,
        exchangedItems: [...(foundReceipt.exchangedItems || []), {
          action: returnAction, key: line.key, quantity: 1,
          replacementSku: returnAction === 'cambio' ? exchangeVariant.sku : '',
          replacementProduct: returnAction === 'cambio' ? exchangeProduct.name : '',
          at: new Date().toISOString(),
        }],
      }
      saveReceipts(receiptKey, records.map((receipt) => receipt.id === updated.id ? updated : receipt))
      setFoundReceipt(updated)
      setExchangeDone(true)
      setMessage(returnAction === 'cambio'
        ? `Cambio registrado. Diferencia de precio: ${money(exchangeProduct.price - line.price)}. No se registró una venta en caja.`
        : 'Devolución registrada y prenda devuelta al inventario. El reembolso debe gestionarse por separado; no se registró una venta en caja.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo registrar el cambio.')
    }
  }

  return (
    <main className="mx-auto grid max-w-[1500px] gap-5 px-4 py-5 lg:grid-cols-[minmax(0,1fr)_370px] sm:px-6">
      <section className="min-w-0">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-vexora-600"><Store className="h-4 w-4" />Moda y prendas</p><h1 className="mt-1 text-3xl font-black">Punto de venta</h1><p className="mt-1 text-sm text-zinc-500">Catálogo por talla, color y SKU · inventario por variante</p></div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setCashOpen((open) => !open)} className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-bold"><Banknote className="h-4 w-4" />{cashOpen ? 'Ocultar caja' : 'Caja'}</button>
            <button type="button" onClick={() => setInventoryOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-vexora-200 bg-white px-3 py-2 text-sm font-bold text-vexora-700"><PackagePlus className="h-4 w-4" />Inventario</button>
          </div>
        </header>
        {cashOpen && <div className="mb-5"><CashRegister gremio="ropa" /></div>}
        {(inventoryLoading || inventoryError) && <p role={inventoryError ? 'alert' : 'status'} className={`mb-3 rounded-xl px-4 py-3 text-sm ${inventoryError ? 'bg-rose-50 text-rose-800' : 'bg-blue-50 text-blue-800'}`}>{inventoryError || 'Cargando inventario del negocio…'}</p>}
        <label className="mb-4 flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 focus-within:border-vexora-500"><Search className="h-5 w-5 text-zinc-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar prenda, categoría o SKU…" className="min-w-0 flex-1 outline-none" /></label>
        <nav aria-label="Filtrar por categoría" className="mb-4 flex flex-wrap gap-2">{categories.map((item) => <button type="button" key={item} onClick={() => setCategory(item)} aria-pressed={category === item} className={`rounded-full px-3 py-1.5 text-xs font-bold ${category === item ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-600 ring-1 ring-zinc-200'}`}>{item}</button>)}</nav>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((product) => {
            const variants = product.variants || []
            const selected = variantFor(product)
            return <article key={product.id} className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
              <div className={`flex h-36 items-center justify-center ${product.tone || 'bg-rose-50'}`}><span aria-hidden="true" className="text-7xl">{product.icon || '👚'}</span><span className="ml-auto self-start rounded-full bg-white/80 px-3 py-1 text-[11px] font-bold text-zinc-600">{product.category}</span></div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2"><div><h2 className="font-black">{product.name}</h2><p className="mt-1 text-lg font-black text-vexora-700">{money(product.price)}</p></div><span className="rounded-lg bg-zinc-100 px-2 py-1 text-xs font-bold">{variants.reduce((sum, variant) => sum + (Number(variant.stock) || 0), 0)} und.</span></div>
                {variants.length ? <div className="mt-3 space-y-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wide text-zinc-500">Talla · color<select aria-label={`Talla y color de ${product.name}`} value={selected?.sku || ''} onChange={(event) => setSelectedVariants((current) => ({ ...current, [product.id]: event.target.value }))} className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold">{variants.map((variant) => <option key={variant.sku} value={variant.sku}>{variant.size} · {variant.color} · {variant.stock} disp.</option>)}</select></label>
                  {selected && <p className="text-xs text-zinc-500">SKU <span className="font-mono font-bold text-zinc-700">{selected.sku}</span> · {selected.stock} disponibles</p>}
                  {selected && <div className="flex items-center gap-2"><input aria-label={`Unidades para ${selected.sku}`} type="number" min="1" step="1" value={variantRestock[`${product.id}:${selected.sku}`] || ''} onChange={(event) => setVariantRestock((current) => ({ ...current, [`${product.id}:${selected.sku}`]: event.target.value }))} placeholder="Cargar unidades" className="min-w-0 flex-1 rounded-lg border border-zinc-200 px-2 py-1.5 text-xs" /><button type="button" onClick={() => void restockVariant(product, selected)} className="rounded-lg bg-zinc-100 px-2 py-1.5 text-xs font-bold hover:bg-vexora-50">Cargar</button></div>}
                </div> : <p className="mt-3 text-xs text-amber-700">Agrega variantes desde inventario para vender.</p>}
                <button type="button" disabled={!selected || Number(selected.stock) < 1} onClick={() => addToCart(product)} className="mt-3 w-full rounded-xl bg-zinc-900 px-3 py-2.5 text-sm font-bold text-white hover:bg-vexora-700 disabled:cursor-not-allowed disabled:opacity-40"><ShoppingBag className="mr-2 inline h-4 w-4" />Agregar prenda</button>
              </div>
            </article>
          })}
          {!products.length && !inventoryLoading && !inventoryError && <EmptyInventoryState onLoadSamples={loadSampleInventory} />}
          {products.length > 0 && !filtered.length && <p className="rounded-2xl bg-white p-8 text-center text-sm text-zinc-500 sm:col-span-2 xl:col-span-3">No hay prendas que coincidan con la búsqueda.</p>}
        </div>
      </section>

      <aside className="space-y-4">
        <section className="rounded-2xl border border-zinc-200 bg-white p-5">
          <header className="flex items-center justify-between"><h2 className="text-lg font-black">Carrito</h2><span className="rounded-full bg-vexora-50 px-2.5 py-1 text-xs font-bold text-vexora-800">{cart.reduce((sum, item) => sum + item.quantity, 0)} prendas</span></header>
          <div className="mt-4 divide-y divide-zinc-100">{cart.length ? cart.map((item) => <div key={item.key} className="py-3">
            <div className="flex items-start justify-between gap-2"><div><p className="text-sm font-bold">{item.name}</p><p className="text-xs text-zinc-500">{item.variant.size} · {item.variant.color} · SKU {item.sku}</p></div><button type="button" aria-label={`Quitar ${item.name}`} onClick={() => changeQuantity(item.key, 0)} className="rounded-lg p-1 text-zinc-400 hover:bg-rose-50 hover:text-rose-700"><X className="h-4 w-4" /></button></div>
            <div className="mt-2 flex items-center justify-between"><div className="flex items-center gap-2"><button type="button" aria-label="Disminuir cantidad" onClick={() => changeQuantity(item.key, item.quantity - 1)} className="grid h-7 w-7 place-items-center rounded-md border">−</button><span className="min-w-5 text-center text-sm font-bold">{item.quantity}</span><button type="button" aria-label="Aumentar cantidad" onClick={() => changeQuantity(item.key, item.quantity + 1)} className="grid h-7 w-7 place-items-center rounded-md border">+</button></div><span className="text-sm font-black">{money(item.price * item.quantity)}</span></div>
          </div>) : <p className="py-8 text-center text-sm text-zinc-500">Selecciona una talla y color del catálogo.</p>}</div>
          <div className="mt-3 flex justify-between border-t border-zinc-200 pt-4 text-lg font-black"><span>Total</span><span>{money(cartTotal)}</span></div>
        </section>
        <Payment total={cartTotal} onPay={pay} />
        <button type="button" disabled={!cart.length} onClick={() => { setMessage(''); setLayawayOpen(true) }} className="w-full rounded-xl border border-vexora-200 bg-vexora-50 px-4 py-3 text-sm font-bold text-vexora-800 disabled:opacity-40">Separar con abono inicial (mínimo 30%)</button>
        <AdCarousel gremio="ropa" />

        <section className="rounded-2xl border border-zinc-200 bg-white p-5">
          <h2 className="text-lg font-black">Abonos y apartados</h2>
          {layawaysLoading && <p role="status" className="mt-2 text-xs text-zinc-500">Cargando apartados de la cuenta…</p>}
          <label className="mt-3 block text-xs font-bold text-zinc-600">Consultar apartado<select value={layawayId} onChange={(event) => { setLayawayId(event.target.value); setMessage('') }} className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm"><option value="">Selecciona un apartado</option>{layaways.map((item) => <option key={item.id} value={item.id}>{item.id} · saldo {money(item.total - item.paid)}</option>)}</select></label>
          {activeLayaway && <form onSubmit={addLayawayPayment} className="mt-3 space-y-2 rounded-xl bg-zinc-50 p-3">
            <p className="text-xs text-zinc-600">Total {money(activeLayaway.total)} · abonado {money(activeLayaway.paid)} · saldo <b>{money(remainingLayaway)}</b></p>
            {remainingLayaway > 0 ? <><label className="block text-xs font-bold">Nuevo abono<input type="number" min="1" max={remainingLayaway} step="1" value={layawayAmount} onChange={(event) => setLayawayAmount(event.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" /></label><button className="w-full rounded-lg bg-vexora-600 px-3 py-2 text-sm font-bold text-white">Registrar abono en caja</button></> : <p className="text-sm font-bold text-emerald-700">Apartado pagado por completo.</p>}
          </form>}
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5">
          <h2 className="text-lg font-black">Devolución o cambio</h2>
          <p className="mt-1 text-xs text-zinc-500">Busca el recibo para validar la compra y registrar la prenda recibida. El cambio no genera una venta de caja.</p>
          <form onSubmit={findReceipt} className="mt-3 flex gap-2"><input value={receiptLookup} onChange={(event) => setReceiptLookup(event.target.value)} placeholder="N.º de recibo (ROP-…)" className="min-w-0 flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm" /><button className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-bold text-white">Buscar</button></form>
          {foundReceipt && <div className="mt-3 rounded-xl bg-zinc-50 p-3">
            <p className="text-sm font-bold">{foundReceipt.id} · {new Date(foundReceipt.createdAt).toLocaleDateString('es-CO')}</p><p className="text-xs text-zinc-500">Total original {money(foundReceipt.total)} · {foundReceipt.paymentMethod}</p>
            {exchangeDone ? <p role="status" className="mt-3 flex items-center gap-2 text-sm font-bold text-emerald-700"><Check className="h-4 w-4" />{returnAction === 'cambio' ? 'Cambio registrado sin crear venta de caja.' : 'Devolución registrada sin crear venta de caja.'}</p> : <form onSubmit={processExchange} className="mt-3 space-y-2">
              <label className="block text-xs font-bold">Prenda comprada<select required value={receiptLineKey} onChange={(event) => setReceiptLineKey(event.target.value)} className="mt-1 w-full rounded-lg border bg-white px-2 py-2 text-sm">{foundReceipt.items.map((item) => <option key={item.key} value={item.key}>{item.name} · talla {item.variant.size} · {item.quantity} compradas</option>)}</select></label>
              <label className="block text-xs font-bold">Operación<select value={returnAction} onChange={(event) => setReturnAction(event.target.value)} className="mt-1 w-full rounded-lg border bg-white px-2 py-2 text-sm"><option value="cambio">Cambio de talla o prenda</option><option value="devolucion">Devolución</option></select></label>
              {returnAction === 'cambio' && <>
                <label className="block text-xs font-bold">Prenda de reemplazo<select required value={exchangeProductId} onChange={(event) => { setExchangeProductId(event.target.value); setExchangeSku('') }} className="mt-1 w-full rounded-lg border bg-white px-2 py-2 text-sm"><option value="">Seleccionar prenda</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name} · {money(product.price)}</option>)}</select></label>
                {exchangeProduct && <label className="block text-xs font-bold">Talla y color de reemplazo<select required value={exchangeSku} onChange={(event) => setExchangeSku(event.target.value)} className="mt-1 w-full rounded-lg border bg-white px-2 py-2 text-sm"><option value="">Seleccionar variante</option>{(exchangeProduct.variants || []).map((variant) => <option key={variant.sku} value={variant.sku} disabled={Number(variant.stock) < 1}>{variant.size} · {variant.color} · {variant.stock} disp.</option>)}</select></label>}
                {exchangeVariant && <p className="text-xs text-zinc-600">Diferencia de precio {money(exchangeProduct.price - (foundReceipt.items.find((item) => item.key === receiptLineKey)?.price || 0))}. La liquidación de diferencias se realiza fuera de este registro de caja.</p>}
              </>}
              <button disabled={returnAction === 'cambio' && !exchangeVariant} className="w-full rounded-lg bg-zinc-900 px-3 py-2.5 text-sm font-bold text-white disabled:opacity-40">{returnAction === 'cambio' ? 'Registrar cambio' : 'Registrar devolución'}</button>
            </form>}
          </div>}
        </section>
        {message && <p role="status" className="rounded-xl bg-blue-50 px-4 py-3 text-sm font-medium text-blue-900">{message}</p>}
      </aside>

      {ticket && <SaleReceipt items={ticket} sale={ticketSale} cashReceived={ticketSale?.cashReceived} changeDue={ticketSale?.changeDue} paymentMethod={paymentMethod} dian={dian} gremio="ropa" businessName={business?.name || 'Vexora Moda'} onIssued={() => setCart([])} onClose={() => { if (!dian?.enabled) setCart([]); setTicket(null); setTicketSale(null); setPaymentMethod('') }} />}
      {inventoryOpen && <InventoryManager title="Inventario de ropa" gremio="ropa" products={allProducts} onAddProduct={onAddProduct} onImportProducts={importProducts} onAdjustStock={onAdjustStock} onUpdateProduct={onUpdateProduct} onDeleteProduct={deleteProduct} onLoadSamples={loadSampleInventory} onClose={() => setInventoryOpen(false)} remote={inventoryRemote} loadError={inventoryError} />}
      {layawayOpen && <div role="dialog" aria-modal="true" aria-labelledby="layaway-title" className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-zinc-950/60 p-4"><section className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
        <header className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-vexora-700">Separación de prendas</p><h2 id="layaway-title" className="mt-1 text-xl font-black">Crear apartado</h2></div><button type="button" aria-label="Cerrar" onClick={() => setLayawayOpen(false)}><X className="h-5 w-5" /></button></header>
        <p className="mt-4 flex justify-between text-sm"><span>Total</span><b>{money(cartTotal)}</b></p><p className="mt-1 flex justify-between text-sm"><span>Abono mínimo (30%)</span><b>{money(Math.ceil(cartTotal * 0.3))}</b></p>
        <form onSubmit={createLayaway} className="mt-4 space-y-3"><label className="block text-xs font-bold">Cliente<input name="customer" value={layawayCustomer} onChange={(event) => setLayawayCustomer(event.target.value)} maxLength="120" placeholder="Nombre del cliente" className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm" /></label><label className="block text-xs font-bold">Teléfono<input name="phone" value={layawayPhone} onChange={(event) => setLayawayPhone(event.target.value)} maxLength="40" placeholder="Celular (opcional)" className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm" /></label><label className="block text-xs font-bold">Abono inicial<input name="initial-payment" type="number" min={Math.ceil(cartTotal * 0.3)} max={cartTotal - 1} step="1" required className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm" /></label><p className="text-xs text-zinc-500">El inventario se reserva al crear el apartado. En la cuenta el plazo es de 30 días y el primer abono se registra en caja.</p><button className="w-full rounded-xl bg-vexora-600 px-4 py-3 text-sm font-bold text-white">Confirmar apartado</button></form>
      </section></div>}
    </main>
  )
}
