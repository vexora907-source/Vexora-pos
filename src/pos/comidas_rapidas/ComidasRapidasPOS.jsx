import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Bike, ChefHat, Clock3, LayoutGrid, MapPin, Minus, PackagePlus, PencilRuler, Plus, Printer, Store, Table2,
  Trash2, Utensils, Wallet, X,
} from 'lucide-react'
import { FloorPlan } from '../restaurante/components/floor/FloorPlan.jsx'
import { FloorSelector } from '../restaurante/components/floor/FloorSelector.jsx'
import { TableDesigner } from '../restaurante/components/floor/TableDesigner.jsx'
import { useTableSocket } from '../restaurante/hooks/useTableSocket.js'
import { AdCarousel } from '../../shared/components/Publicity/AdCarousel.jsx'
import { useInventory } from '../../shared/hooks/useInventory.js'
import { InventoryManager } from '../../shared/components/Inventory/InventoryManager.jsx'
import { EmptyInventoryState } from '../../shared/components/Inventory/EmptyInventoryState.jsx'
import { Payment } from '../../shared/components/Payment/Payment.jsx'
import { CashRegister } from '../../shared/components/CashRegister/CashRegister.jsx'
import { getAuthToken } from '../../shared/services/auth.js'
import { assertCashRegisterOpen, recordCashSale } from '../../shared/services/cashRegister.js'
import { connectRealtimeSocket } from '../../shared/services/realtime.js'
import { printConfiguredUsbTicket, printReceipt } from '../../shared/services/printers.js'
import { appStorage, isDemoMode } from '../../shared/services/tenantStorage.js'
import { formatCOP } from '../../shared/services/ticket.js'
import { API_URL } from '../../shared/services/api.js'

const ingredients = [
  { id: 'bun', name: 'Pan de hamburguesa', category: 'Panadería', quantity: 60, price: 0, icon: '🍞', unit: 'unidad' },
  { id: 'beef', name: 'Carne de res (g)', category: 'Proteínas', quantity: 6000, price: 0, icon: '🥩', unit: 'g' },
  { id: 'cheese', name: 'Queso (tajadas)', category: 'Lácteos', quantity: 80, price: 0, icon: '🧀', unit: 'unidad' },
  { id: 'lettuce', name: 'Lechuga (g)', category: 'Verduras', quantity: 2500, price: 0, icon: '🥬', unit: 'g' },
  { id: 'tomato', name: 'Tomate (g)', category: 'Verduras', quantity: 2500, price: 0, icon: '🍅', unit: 'g' },
  { id: 'onion', name: 'Cebolla (g)', category: 'Verduras', quantity: 1800, price: 0, icon: '🧅', unit: 'g' },
  { id: 'pickle', name: 'Pepinillos (unid.)', category: 'Verduras', quantity: 100, price: 0, icon: '🥒', unit: 'unidad' },
  { id: 'fries', name: 'Papa prefrita (g)', category: 'Congelados', quantity: 8000, price: 0, icon: '🍟', unit: 'g' },
  { id: 'oil', name: 'Aceite (ml)', category: 'Despensa', quantity: 5000, price: 0, icon: '🫗', unit: 'ml' },
  { id: 'sausage', name: 'Salchicha', category: 'Proteínas', quantity: 70, price: 0, icon: '🌭', unit: 'unidad' },
  { id: 'hotdog_bun', name: 'Pan perro caliente', category: 'Panadería', quantity: 60, price: 0, icon: '🥖', unit: 'unidad' },
  { id: 'soda', name: 'Gaseosa (latas)', category: 'Bebidas', quantity: 90, price: 0, icon: '🥤', unit: 'unidad' },
  { id: 'nuggets', name: 'Nuggets (unid.)', category: 'Congelados', quantity: 240, price: 0, icon: '🍗', unit: 'unidad' },
  { id: 'pizza-dough', name: 'Masa para pizza', category: 'Pizzería', quantity: 60, price: 0, icon: '🫓', unit: 'unidad' },
  { id: 'pizza-sauce', name: 'Salsa de tomate para pizza', category: 'Pizzería', quantity: 5000, price: 0, icon: '🍅', unit: 'g' },
  { id: 'pizza-mozzarella', name: 'Queso mozzarella', category: 'Pizzería', quantity: 5000, price: 0, icon: '🧀', unit: 'g' },
  { id: 'pizza-ham', name: 'Jamón', category: 'Pizzería', quantity: 2500, price: 0, icon: '🥓', unit: 'g' },
  { id: 'pizza-pepperoni', name: 'Pepperoni', category: 'Pizzería', quantity: 2500, price: 0, icon: '🍕', unit: 'g' },
  { id: 'pizza-pineapple', name: 'Piña', category: 'Pizzería', quantity: 2500, price: 0, icon: '🍍', unit: 'g' },
  { id: 'pizza-bacon', name: 'Tocineta', category: 'Pizzería', quantity: 2000, price: 0, icon: '🥓', unit: 'g' },
  { id: 'pizza-sausage', name: 'Salchicha', category: 'Pizzería', quantity: 2000, price: 0, icon: '🌭', unit: 'g' },
  { id: 'pizza-mushrooms', name: 'Champiñones', category: 'Pizzería', quantity: 2000, price: 0, icon: '🍄', unit: 'g' },
  { id: 'pizza-olives', name: 'Aceitunas', category: 'Pizzería', quantity: 1000, price: 0, icon: '🫒', unit: 'g' },
  { id: 'pizza-onion', name: 'Cebolla', category: 'Pizzería', quantity: 1500, price: 0, icon: '🧅', unit: 'g' },
]

const menu = [
  {
    id: 'classic-burger', name: 'Hamburguesa clásica', category: 'Hamburguesas', price: 18000, icon: '🍔',
    description: 'Res, queso, lechuga, tomate y pepinillos',
    recipe: { bun: 1, beef: 150, cheese: 1, lettuce: 20, tomato: 25, pickle: 2 },
    modifiers: [
      { id: 'extra-cheese', label: 'Queso extra', price: 2500, add: { cheese: 1 } },
      { id: 'no-tomato', label: 'Sin tomate', remove: { tomato: 25 } },
      { id: 'no-pickle', label: 'Sin pepinillos', remove: { pickle: 2 } },
    ],
  },
  {
    id: 'double-burger', name: 'Doble Vexora', category: 'Hamburguesas', price: 26000, icon: '🍔',
    description: 'Doble carne, doble queso y vegetales',
    recipe: { bun: 1, beef: 300, cheese: 2, lettuce: 20, tomato: 25, pickle: 2, onion: 15 },
    modifiers: [{ id: 'no-onion', label: 'Sin cebolla', remove: { onion: 15 } }],
  },
  {
    id: 'hot-dog', name: 'Perro caliente', category: 'Favoritos', price: 14000, icon: '🌭',
    description: 'Salchicha, queso y cebolla',
    recipe: { hotdog_bun: 1, sausage: 1, cheese: 1, onion: 15 },
    modifiers: [{ id: 'extra-sausage', label: 'Salchicha extra', price: 3000, add: { sausage: 1 } }],
  },
  {
    id: 'menu-fries', name: 'Papas a la francesa', category: 'Acompañamientos', price: 8000, icon: '🍟',
    description: 'Porción mediana',
    recipe: { fries: 180, oil: 20 },
    modifiers: [{ id: 'large-fries', label: 'Porción grande', price: 4000, add: { fries: 120, oil: 10 } }],
  },
  {
    id: 'menu-nuggets', name: 'Nuggets x6', category: 'Acompañamientos', price: 11000, icon: '🍗',
    description: 'Seis unidades',
    recipe: { nuggets: 6, oil: 15 },
    modifiers: [{ id: 'nuggets-12', label: 'Porción x12', price: 8000, add: { nuggets: 6, oil: 10 } }],
  },
  {
    id: 'menu-soda', name: 'Gaseosa', category: 'Bebidas', price: 5000, icon: '🥤',
    description: 'Lata personal',
    recipe: { soda: 1 },
    modifiers: [],
  },
  {
    id: 'custom-pizza', name: 'Pizza personalizada', category: 'Pizza personalizada', price: 24000, icon: '🍕',
    description: 'Masa, salsa y mozzarella. Elige tus ingredientes adicionales.',
    recipe: { 'pizza-dough': 1, 'pizza-sauce': 80, 'pizza-mozzarella': 150 },
    modifiers: [
      { id: 'pizza-extra-ham', label: 'Jamón', price: 3000, add: { 'pizza-ham': 50 } },
      { id: 'pizza-extra-pepperoni', label: 'Pepperoni', price: 3500, add: { 'pizza-pepperoni': 50 } },
      { id: 'pizza-extra-pineapple', label: 'Piña', price: 2000, add: { 'pizza-pineapple': 50 } },
      { id: 'pizza-extra-bacon', label: 'Tocineta', price: 3500, add: { 'pizza-bacon': 40 } },
      { id: 'pizza-extra-sausage', label: 'Salchicha', price: 3000, add: { 'pizza-sausage': 50 } },
      { id: 'pizza-extra-mushrooms', label: 'Champiñones', price: 2000, add: { 'pizza-mushrooms': 40 } },
      { id: 'pizza-extra-olives', label: 'Aceitunas', price: 1500, add: { 'pizza-olives': 20 } },
      { id: 'pizza-extra-onion', label: 'Cebolla', price: 1000, add: { 'pizza-onion': 20 } },
    ],
  },
  {
    id: 'pizza-hawaiian', name: 'Hawaiana', category: 'Pizza de la casa', price: 29000, icon: '🍕',
    description: 'Jamón, piña y mozzarella.',
    recipe: { 'pizza-dough': 1, 'pizza-sauce': 80, 'pizza-mozzarella': 150, 'pizza-ham': 50, 'pizza-pineapple': 50 },
    modifiers: [],
  },
  {
    id: 'pizza-meat-lovers', name: 'Carnes', category: 'Pizza de la casa', price: 34000, icon: '🍕',
    description: 'Jamón, pepperoni, tocineta y salchicha.',
    recipe: { 'pizza-dough': 1, 'pizza-sauce': 80, 'pizza-mozzarella': 160, 'pizza-ham': 40, 'pizza-pepperoni': 40, 'pizza-bacon': 40, 'pizza-sausage': 40 },
    modifiers: [],
  },
  {
    id: 'pizza-vexora-special', name: 'Vexora Especial', category: 'Pizza de la casa', price: 38000, icon: '🍕',
    description: 'Jamón, pepperoni, champiñones, aceitunas y cebolla.',
    recipe: { 'pizza-dough': 1, 'pizza-sauce': 80, 'pizza-mozzarella': 170, 'pizza-ham': 30, 'pizza-pepperoni': 30, 'pizza-mushrooms': 35, 'pizza-olives': 15, 'pizza-onion': 20 },
    modifiers: [],
  },
]

const ingredientById = Object.fromEntries(ingredients.map((item) => [item.id, item]))
const menuProducts = menu.map(({ recipe, ...item }) => ({
  ...item,
  quantity: 0,
  stock: 0,
  ingredients: Object.entries(recipe).map(([productId, quantity]) => ({
    productId,
    quantity,
    unit: ingredientById[productId]?.unit ?? 'unidad',
  })),
  modifiers: item.modifiers.map((modifier) => ({
    id: modifier.id,
    label: modifier.label,
    price: modifier.price,
    ingredients: [
      ...Object.entries(modifier.add ?? {}).map(([productId, quantity]) => ({
        productId, quantity, unit: ingredientById[productId].unit,
      })),
      ...Object.entries(modifier.remove ?? {}).map(([productId, quantity]) => ({
        productId, quantity: -quantity, unit: ingredientById[productId]?.unit ?? 'unidad',
      })),
    ],
  })),
}))
const initialProducts = [...ingredients, ...menuProducts]

const ORDER_TYPES = [
  { id: 'table', label: 'Mesa', icon: Table2 },
  { id: 'takeaway', label: 'Para llevar', icon: Store },
  { id: 'delivery', label: 'Domicilio', icon: Bike },
]
const KITCHEN_STATES = ['received', 'in-kitchen', 'ready', 'delivered']
const KITCHEN_LABELS = { received: 'Recibido', 'in-kitchen': 'En cocina', ready: 'Listo', delivered: 'Entregado' }
const DELIVERY_LABELS = { pending: 'Por asignar', assigned: 'Domiciliario asignado', 'on-route': 'En camino', delivered: 'Entregado' }
const ORDER_STORAGE_KEY = 'vexora.quick-meals.orders.v1'

function makeId() {
  return globalThis.crypto?.randomUUID?.() ?? `order-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function quantitiesFor(lines, dishes = menu) {
  const totals = {}
  lines.forEach((line) => {
    const dish = dishes.find((item) => item.id === line.menuId)
    if (!dish) return
    const recipe = { ...dish.recipe }
    dish.modifiers.filter((modifier) => line.modifiers.includes(modifier.id)).forEach((modifier) => {
      Object.entries(modifier.add ?? {}).forEach(([id, amount]) => { recipe[id] = (recipe[id] ?? 0) + amount })
      Object.entries(modifier.remove ?? {}).forEach(([id, amount]) => { recipe[id] = Math.max(0, (recipe[id] ?? 0) - amount) })
    })
    Object.entries(recipe).forEach(([id, amount]) => { totals[id] = (totals[id] ?? 0) + amount * line.quantity })
  })
  return totals
}

function elapsedLabel(startedAt, now) {
  const seconds = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

function normalizeOrder(order, index) {
  const statusMap = { RECEIVED: 'received', IN_KITCHEN: 'in-kitchen', READY: 'ready', DELIVERED: 'delivered' }
  const deliveryMap = { PENDING: 'pending', ASSIGNED: 'assigned', ON_ROUTE: 'on-route', DELIVERED: 'delivered' }
  const id = String(order._id ?? order.id)
  const status = statusMap[order.status] ?? 'received'
  return {
    id,
    number: String(index + 1).padStart(3, '0'),
    type: order.type,
    tableNumber: order.table ?? '',
    customer: order.customer ?? '',
    address: order.address ?? '',
    phone: order.customerPhone ?? '',
    lines: (order.items ?? []).map((line, lineIndex) => ({
      lineId: `${id}-${lineIndex}`,
      menuId: line.productId,
      name: line.name,
      icon: menu.find((item) => item.id === line.productId)?.icon ?? '🍽️',
      price: line.price,
      quantity: line.quantity,
      modifiers: line.modifiers ?? [],
      modifierLabels: (line.modifiers ?? []).map((modifierId) => (
        menu.find((item) => item.id === line.productId)?.modifiers.find((modifier) => modifier.id === modifierId)?.label ?? modifierId
      )),
      note: line.note ?? '',
    })),
    total: order.total,
    saleKey: order.saleKey ?? order._id ?? id,
    barcode12: order.barcode12 ?? order.facturaCodigo12 ?? order.ticketCode12 ?? '',
    verificationUrl: order.verificationUrl ?? order.qrUrl ?? '',
    paymentMethod: order.paymentMethod ?? '',
    createdAt: order.createdAt ?? order.receivedAt,
    kitchenState: status,
    deliveryState: deliveryMap[order.deliveryStatus] ?? (status === 'delivered' ? 'delivered' : 'pending'),
  }
}

function makePrinterTicket(order, copy = false) {
  return {
    numero: order.barcode12 || order.number || order.id,
    saleKey: order.saleKey ?? order.id,
    barcode12: order.barcode12 ?? '',
    verificationUrl: order.verificationUrl ?? '',
    paymentMethod: order.paymentMethod ?? '',
    cashReceived: order.cashReceived,
    changeDue: order.changeDue,
    mesa: order.tableNumber || order.type,
    cliente: { nombre: order.customer || 'Cliente Final' },
    productos: order.lines.map((line) => ({
      nombre: line.name,
      cantidad: line.quantity,
      total: line.price * line.quantity,
      nota: line.note,
    })),
    total: order.total,
    copy,
  }
}

function playOrderAlert() {
  try {
    const context = new window.AudioContext()
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.frequency.value = 880
    gain.gain.setValueAtTime(0.15, context.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.45)
    oscillator.start()
    oscillator.stop(context.currentTime + 0.45)
    oscillator.onended = () => { void context.close() }
  } catch (cause) {
    console.error('No se pudo reproducir la alerta de pedido listo.', cause)
  }
}

async function quickMealsRequest(path, token, options = {}) {
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

export default function ComidasRapidasPOS({ kitchenOnly = false }) {
  const { floors, tables, designed, updateData } = useTableSocket('comidas_rapidas')
  const {
    products: stock, allProducts, addProduct, importProducts, adjustStock, updateProduct, deleteProduct, loadSampleInventory, validateSale, recordSale, refreshInventory,
    loading: inventoryLoading, error: inventoryError, remote: inventoryRemote,
  } = useInventory('comidas_rapidas', initialProducts)
  const [orderType, setOrderType] = useState('table')
  const [floorId, setFloorId] = useState('interior')
  const [tableId, setTableId] = useState(1)
  const [tableNumber, setTableNumber] = useState('1')
  const [customer, setCustomer] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [cart, setCart] = useState([])
  const [menuMode, setMenuMode] = useState('all')
  const [selectedMenuItem, setSelectedMenuItem] = useState(null)
  const [selectedModifiers, setSelectedModifiers] = useState([])
  const [note, setNote] = useState('')
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [inventoryOpen, setInventoryOpen] = useState(false)
  const [designOpen, setDesignOpen] = useState(!designed)
  const [cashOpen, setCashOpen] = useState(false)
  const [kitchenOpen, setKitchenOpen] = useState(kitchenOnly)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [now, setNow] = useState(Date.now())
  const [orderError, setOrderError] = useState('')
  const [orders, setOrders] = useState(() => {
    if (inventoryRemote) return []
    try {
      const saved = JSON.parse(appStorage().getItem(ORDER_STORAGE_KEY) ?? '[]')
      return Array.isArray(saved) ? saved : []
    } catch {
      return []
    }
  })
  const cartRef = useRef(null)

  async function printOrderCopy(order) {
    setOrderError('')
    try {
      await printReceipt('comidas_rapidas', { ...makePrinterTicket(order, true), createdAt: order.createdAt })
      setNotice(`Copia de la orden #${order.number} enviada a la impresora.`)
    } catch (cause) {
      setOrderError(cause instanceof Error ? cause.message : 'No se pudo imprimir la copia del ticket.')
    }
  }

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])
  useEffect(() => {
    if (inventoryRemote) return undefined
    try {
      appStorage().setItem(ORDER_STORAGE_KEY, JSON.stringify(orders))
    } catch (cause) {
      console.error('No se pudieron guardar las comandas de comidas rápidas.', cause)
    }
    return undefined
  }, [orders, inventoryRemote])

  useEffect(() => {
    if (!inventoryRemote) return undefined
    const token = getAuthToken()
    let active = true
    const loadOrders = () => quickMealsRequest('/api/comidas-rapidas/orders', token)
      .then((result) => {
        if (active) {
          setOrders((result.orders ?? []).map(normalizeOrder))
          setOrderError('')
        }
      })
      .catch((cause) => {
        if (active) setOrderError(cause instanceof Error ? cause.message : 'No se pudieron cargar las comandas.')
      })
    void loadOrders()
    const timer = window.setInterval(() => { void loadOrders() }, 5000)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [inventoryRemote])

  useEffect(() => {
    if (!inventoryRemote) return undefined
    const socket = connectRealtimeSocket()
    if (!socket) return undefined

    function upsertOrder(rawOrder, notify = false) {
      const normalized = normalizeOrder(rawOrder, 0)
      setOrders((current) => {
        const exists = current.some((order) => order.id === normalized.id)
        return exists
          ? current.map((order) => order.id === normalized.id ? { ...order, ...normalized } : order)
          : [normalized, ...current]
      })
      if (notify) {
        setNotice(`Nueva comanda recibida · ${normalized.type === 'table' ? `Mesa ${normalized.tableNumber}` : normalized.type}.`)
        void printConfiguredUsbTicket('comidas_rapidas', 'cocina', makePrinterTicket(normalized))
          .catch((cause) => setOrderError(cause instanceof Error ? cause.message : 'No se pudo imprimir en la impresora USB de cocina.'))
      }
    }

    socket.on('quick-meal-order-created', (order) => upsertOrder(order, true))
    socket.on('quick-meal-order-ready', (order) => {
      upsertOrder(order)
      setNotice(`🔥 Pedido #${String(order._id ?? order.id).slice(-6)} está listo para entregar.`)
      playOrderAlert()
      if (!kitchenOnly) {
        const normalized = normalizeOrder(order, 0)
        void printConfiguredUsbTicket('comidas_rapidas', 'caja', makePrinterTicket(normalized))
          .catch((cause) => setOrderError(cause instanceof Error ? cause.message : 'No se pudo imprimir el aviso en la impresora USB de caja.'))
      }
    })
    socket.on('printer-error', ({ target, message }) => {
      setOrderError(`Error de impresión ${target === 'cocina' ? 'en cocina' : 'en caja'}: ${message}`)
    })
    socket.on('connect_error', (cause) => {
      setOrderError(`No se pudo conectar con las actualizaciones en tiempo real: ${cause.message}`)
    })

    return () => socket.disconnect()
  }, [inventoryRemote, kitchenOnly])

  const filteredMenu = useMemo(() => stock
    .filter((product) => Array.isArray(product.ingredients) && product.ingredients.length > 0)
    .map((product) => ({
      ...product,
      recipe: Object.fromEntries(product.ingredients.map((ingredient) => [ingredient.productId, ingredient.quantity])),
      modifiers: (product.modifiers ?? []).map((modifier) => {
        const add = {}
        const remove = {}
        for (const ingredient of modifier.ingredients ?? []) {
          if (ingredient.quantity > 0) add[ingredient.productId] = ingredient.quantity
          if (ingredient.quantity < 0) remove[ingredient.productId] = Math.abs(ingredient.quantity)
        }
        return { ...modifier, add, remove }
      }),
    })), [stock])
  const visibleMenu = useMemo(() => filteredMenu.filter((item) => {
    if (menuMode === 'custom') return item.category === 'Pizza personalizada'
    if (menuMode === 'house') return item.category === 'Pizza de la casa'
    return true
  }), [filteredMenu, menuMode])
  const total = cart.reduce((sum, line) => sum + line.price * line.quantity, 0)
  const activeOrders = orders.filter((order) => order.kitchenState !== 'delivered' || (order.type === 'delivery' && order.deliveryState !== 'delivered'))
  const currentFloor = floors.find((floor) => floor.id === floorId) ?? floors[0]
  const floorTables = tables
    .filter((table) => table.floorId === currentFloor?.id)
    .map((table) => {
      const tableOrders = activeOrders.filter((order) => order.type === 'table' && (
        order.tableNumber === table.name || order.tableNumber === String(table.id)
      ))
      const items = tableOrders.flatMap((order) => order.lines.map((line) => ({
        id: line.menuId,
        lineId: line.lineId,
        name: line.name,
        price: line.price,
        quantity: line.quantity,
        sentAt: order.createdAt,
        readyAt: order.kitchenState === 'ready' ? order.createdAt : null,
      })))
      return {
        ...table,
        items,
        startedAt: tableOrders.length ? tableOrders.reduce((earliest, order) => (
          new Date(order.createdAt) < new Date(earliest) ? order.createdAt : earliest
        ), tableOrders[0].createdAt) : null,
      }
    })
  const selectedTable = tables.find((table) => table.id === tableId && table.floorId === currentFloor?.id) ?? floorTables[0]
  const requiredStock = useMemo(() => quantitiesFor(cart, filteredMenu), [cart, filteredMenu])

  useEffect(() => {
    const selected = tables.find((table) => table.id === tableId && table.floorId === currentFloor?.id)
    const first = selected ?? tables.find((table) => table.floorId === currentFloor?.id)
    if (first && first.id !== tableId) setTableId(first.id)
    if (first && first.name !== tableNumber) setTableNumber(first.name)
  }, [currentFloor?.id, tableId, tableNumber, tables])

  function chooseFloor(id) {
    setFloorId(id)
    const firstTable = tables.find((table) => table.floorId === id)
    if (firstTable) {
      setTableId(firstTable.id)
      setTableNumber(firstTable.name)
    }
  }

  function saveTableDesign(next, close = false) {
    updateData(next)
    if (close) setDesignOpen(false)
  }

  function validateRecipe(lines) {
    if (inventoryLoading) throw new Error('Espera a que termine de cargar el inventario.')
    if (inventoryError) throw new Error(inventoryError)
    const shortage = Object.entries(quantitiesFor(lines, filteredMenu)).find(([id, amount]) => {
      const ingredient = stock.find((item) => item.id === id)
      return !ingredient || Number(ingredient.quantity ?? ingredient.stock) < amount
    })
    if (shortage) {
      const ingredient = stock.find((item) => item.id === shortage[0])
      throw new Error(`Stock insuficiente de ${ingredient?.name ?? shortage[0]}: se necesitan ${shortage[1]} y hay ${ingredient?.quantity ?? ingredient?.stock ?? 0}.`)
    }
  }

  function addConfiguredItem() {
    if (!selectedMenuItem) return
    const modifiers = selectedMenuItem.modifiers.filter((modifier) => selectedModifiers.includes(modifier.id))
    const line = {
      lineId: makeId(),
      menuId: selectedMenuItem.id,
      name: selectedMenuItem.name,
      icon: selectedMenuItem.icon,
      price: selectedMenuItem.price + modifiers.reduce((sum, modifier) => sum + (Number(modifier.price) || 0), 0),
      quantity: 1,
      modifiers: modifiers.map((modifier) => modifier.id),
      modifierLabels: modifiers.map((modifier) => modifier.label),
      note: note.trim(),
    }
    const next = [...cart, line]
    try {
      validateRecipe(next)
      setCart(next)
      setError('')
      setNotice(`${line.name} agregado a la orden.`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Stock insuficiente para esta receta.')
    }
    setSelectedMenuItem(null)
    setSelectedModifiers([])
    setNote('')
  }

  function changeQuantity(lineId, delta) {
    const next = cart.map((line) => line.lineId === lineId
      ? { ...line, quantity: Math.max(0, line.quantity + delta) }
      : line).filter((line) => line.quantity > 0)
    try {
      validateRecipe(next)
      setCart(next)
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Stock insuficiente.')
    }
  }

  function editLine(lineId, updates) {
    setCart((current) => current.map((line) => line.lineId === lineId ? { ...line, ...updates } : line))
  }

  async function pay(method, cashDetails) {
      let orderNumber = String(orders.length + 1).padStart(3, '0')
      let paidOrder
      try {
      validateRecipe(cart)
      const saleItems = Object.entries(quantitiesFor(cart, filteredMenu)).map(([id, quantity]) => ({ id, quantity }))
      validateSale(saleItems)
      assertCashRegisterOpen('comidas_rapidas', total)
      if (inventoryRemote) {
        const result = await quickMealsRequest('/api/comidas-rapidas/orders', getAuthToken(), {
          method: 'POST',
          body: JSON.stringify({
            type: orderType,
            table: orderType === 'table' ? tableNumber : '',
            customer: orderType === 'delivery' ? customer.trim() : '',
            customerPhone: orderType === 'delivery' ? phone.trim() : '',
            address: orderType === 'delivery' ? address.trim() : '',
            notes: cart.map((line) => line.note).filter(Boolean).join(' · ').slice(0, 500),
            paymentMethod: method,
            items: cart.map((line) => ({
              productId: line.menuId,
              quantity: line.quantity,
              modifiers: line.modifiers,
              note: line.note,
            })),
          }),
        })
        const order = normalizeOrder(result.order, 0)
        order.number = orderNumber
        order.paymentMethod = method
        order.cashReceived = cashDetails?.cashReceived
        order.changeDue = cashDetails?.changeDue
        paidOrder = order
        setOrders((current) => current.some((item) => item.id === order.id)
          ? current.map((item) => item.id === order.id ? { ...item, ...order } : item)
          : [order, ...current])
        if (result.printerWarning) setOrderError(`La orden quedó guardada, pero falló la impresión de cocina: ${result.printerWarning}`)
        try {
          await refreshInventory()
        } catch (cause) {
          setOrderError(cause instanceof Error ? cause.message : 'El pedido quedó guardado, pero no se pudo actualizar el inventario en pantalla.')
        }
      } else {
        await recordSale(saleItems)
      }
      recordCashSale('comidas_rapidas', total, method)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo registrar el pago.')
      return
    }
    if (!inventoryRemote) {
      const order = {
        id: makeId(),
        number: String(orders.length + 1).padStart(3, '0'),
        type: orderType,
        tableNumber: orderType === 'table' ? tableNumber : '',
        customer: customer.trim(),
        address: orderType === 'delivery' ? address.trim() : '',
        phone: orderType === 'delivery' ? phone.trim() : '',
        lines: cart,
        total,
        paymentMethod: method,
        cashReceived: cashDetails?.cashReceived,
        changeDue: cashDetails?.changeDue,
        createdAt: new Date().toISOString(),
        kitchenState: 'received',
        deliveryState: 'pending',
      }
      orderNumber = order.number
      paidOrder = order
      setOrders((current) => [order, ...current])
    }
    if (paidOrder) {
      void printReceipt('comidas_rapidas', makePrinterTicket(paidOrder), { requestDevice: false })
        .catch((cause) => setOrderError(cause instanceof Error ? cause.message : 'La venta quedó guardada, pero no se pudo imprimir el ticket.'))
    }
    setCart([])
    setCustomer('')
    setAddress('')
    setPhone('')
    setPaymentOpen(false)
    setError('')
    setOrderError('')
    setNotice(`Orden #${orderNumber} pagada y enviada a cocina.`)
  }

  async function transitionKitchen(orderId) {
    const order = orders.find((item) => item.id === orderId)
    if (!order) return
    const nextIndex = Math.min(KITCHEN_STATES.length - 1, KITCHEN_STATES.indexOf(order.kitchenState) + 1)
    const kitchenState = KITCHEN_STATES[nextIndex]
    try {
      if (inventoryRemote) {
        const status = { 'in-kitchen': 'IN_KITCHEN', ready: 'READY', delivered: 'DELIVERED' }[kitchenState]
        const result = await quickMealsRequest(`/api/comidas-rapidas/orders/${encodeURIComponent(orderId)}/status`, getAuthToken(), {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        })
        const updatedOrder = normalizeOrder(result.order, orders.indexOf(order))
        setOrders((current) => current.map((item) => item.id === orderId ? updatedOrder : item))
        if (result.printerWarning) setOrderError(`El pedido quedó listo, pero falló la impresión de caja: ${result.printerWarning}`)
      } else {
        setOrders((current) => current.map((item) => item.id === orderId ? {
          ...item,
          kitchenState,
          deliveryState: item.type === 'delivery' && kitchenState === 'ready' ? 'assigned' : item.deliveryState,
        } : item))
      }
      setOrderError('')
    } catch (cause) {
      setOrderError(cause instanceof Error ? cause.message : 'No se pudo actualizar el estado de cocina.')
    }
  }

  async function setDeliveryState(orderId, deliveryState) {
    const order = orders.find((item) => item.id === orderId)
    if (!order) return
    try {
      if (deliveryState === 'delivered' && inventoryRemote) {
        const result = await quickMealsRequest(`/api/comidas-rapidas/orders/${encodeURIComponent(orderId)}/status`, getAuthToken(), {
          method: 'PATCH',
          body: JSON.stringify({ deliveryStatus: 'DELIVERED' }),
        })
        const updatedOrder = normalizeOrder(result.order, orders.indexOf(order))
        setOrders((current) => current.map((item) => item.id === orderId ? updatedOrder : item))
      } else if (inventoryRemote) {
        const deliveryStatus = { assigned: 'ASSIGNED', 'on-route': 'ON_ROUTE' }[deliveryState]
        const result = await quickMealsRequest(`/api/comidas-rapidas/orders/${encodeURIComponent(orderId)}/status`, getAuthToken(), {
          method: 'PATCH',
          body: JSON.stringify({ deliveryStatus }),
        })
        const updatedOrder = normalizeOrder(result.order, orders.indexOf(order))
        setOrders((current) => current.map((item) => item.id === orderId ? updatedOrder : item))
      } else {
        setOrders((current) => current.map((item) => item.id === orderId
          ? { ...item, deliveryState, kitchenState: deliveryState === 'delivered' ? 'delivered' : item.kitchenState }
          : item))
      }
      setOrderError('')
    } catch (cause) {
      setOrderError(cause instanceof Error ? cause.message : 'No se pudo actualizar el domicilio.')
    }
  }

  function openModifierDialog(item) {
    setSelectedMenuItem(item)
    setSelectedModifiers([])
    setNote('')
    setError('')
  }

  function orderTypeLabel(type) {
    return ORDER_TYPES.find((option) => option.id === type)?.label ?? type
  }

  return (
    <main className="mx-auto max-w-[1550px] px-4 py-6 sm:px-6">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-orange-700"><Utensils className="h-4 w-4" />Comidas rápidas</p>
          <h1 className="mt-1 text-3xl font-black">{kitchenOnly ? 'Pantalla de cocina' : 'Punto de venta'}</h1>
          <p className="mt-1 text-sm text-zinc-500">{kitchenOnly ? 'Consulta las comandas activas y actualiza su preparación.' : 'Órdenes ágiles, recetas e inventario conectados.'}</p>
        </div>
        {!kitchenOnly && <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setKitchenOpen((current) => !current)} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold ${kitchenOpen ? 'bg-orange-600 text-white' : 'bg-zinc-900 text-white hover:bg-zinc-800'}`}><ChefHat className="h-4 w-4" />{kitchenOpen ? 'Ver venta' : `Cocina · ${activeOrders.length}`}</button>
          <button type="button" onClick={() => setInventoryOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-orange-200 bg-white px-3 py-2.5 text-sm font-bold text-orange-900"><PackagePlus className="h-4 w-4" />Ingredientes</button>
          <button type="button" onClick={() => setCashOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm font-bold"><Wallet className="h-4 w-4" />Caja</button>
        </div>}
      </header>
      {!kitchenOnly && (inventoryLoading || inventoryError) && <p role={inventoryError ? 'alert' : 'status'} className={`mb-4 rounded-xl px-4 py-3 text-sm ${inventoryError ? 'bg-rose-50 text-rose-800' : 'bg-blue-50 text-blue-800'}`}>{inventoryError || 'Cargando inventario de ingredientes…'}</p>}
      {orderError && <p role="alert" className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">{orderError}</p>}
      {notice && <p role="status" className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{notice}</p>}
      {kitchenOpen ? (
        <section className="rounded-3xl bg-zinc-950 p-4 text-white sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div><p className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-orange-400"><ChefHat className="h-4 w-4" />Pantalla de cocina</p><h2 className="mt-1 text-2xl font-black">Comandas activas</h2></div>
            <span className="rounded-xl bg-white/10 px-4 py-3 text-sm font-bold">{activeOrders.length} orden(es)</span>
          </div>
          {activeOrders.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{activeOrders.map((order) => {
            const nextState = KITCHEN_STATES[Math.min(KITCHEN_STATES.length - 1, KITCHEN_STATES.indexOf(order.kitchenState) + 1)]
            return (
              <article key={order.id} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div><p className="text-xs font-bold uppercase tracking-widest text-orange-300">Orden #{order.number}</p><h3 className="mt-1 text-xl font-black">{order.type === 'table' ? (order.tableNumber.startsWith('Mesa ') ? order.tableNumber : `Mesa ${order.tableNumber}`) : orderTypeLabel(order.type)}</h3></div>
                  <span className="inline-flex items-center gap-1 rounded-lg bg-amber-400/15 px-2.5 py-1.5 text-xs font-black text-amber-300"><Clock3 className="h-3.5 w-3.5" />{elapsedLabel(order.createdAt, now)}</span>
                </div>
                <p className="mt-2 inline-flex rounded-full bg-white/10 px-2.5 py-1 text-xs font-bold">{KITCHEN_LABELS[order.kitchenState]}</p>
                <ul className="my-4 space-y-2 border-y border-white/10 py-3 text-sm">
                  {order.lines.map((line) => <li key={line.lineId}><div className="flex gap-2"><b className="text-orange-300">{line.quantity}×</b><span className="font-bold">{line.name}</span></div>{(line.modifierLabels.length > 0 || line.note) && <p className="ml-7 mt-0.5 text-xs text-zinc-300">{[...line.modifierLabels, line.note].filter(Boolean).join(' · ')}</p>}</li>)}
                </ul>
                {order.type === 'delivery' && <div className="mb-3 rounded-xl bg-white/5 p-3 text-xs"><p className="font-bold">{order.customer || 'Cliente de domicilio'} · {order.phone || 'Sin teléfono'}</p><p className="mt-1 flex gap-1 text-zinc-300"><MapPin className="h-3.5 w-3.5 shrink-0" />{order.address}</p><p className="mt-2 font-bold text-sky-300">Seguimiento: {DELIVERY_LABELS[order.deliveryState]}</p></div>}
                {order.kitchenState !== 'delivered' && !(order.type === 'delivery' && order.kitchenState === 'ready') && <button type="button" onClick={() => void transitionKitchen(order.id)} className="w-full rounded-xl bg-orange-500 px-3 py-3 text-sm font-black text-zinc-950 hover:bg-orange-400">{order.kitchenState === 'ready' ? 'Marcar entregado' : `Avanzar · ${KITCHEN_LABELS[nextState]}`}</button>}
                {order.type === 'delivery' && <div className="mt-2 flex gap-2">
                  {order.deliveryState === 'assigned' && <button type="button" onClick={() => setDeliveryState(order.id, 'on-route')} className="flex-1 rounded-xl border border-sky-400/30 bg-sky-400/10 px-3 py-2 text-xs font-bold text-sky-200">Sale a domicilio</button>}
                  {order.deliveryState === 'on-route' && <button type="button" onClick={() => setDeliveryState(order.id, 'delivered')} className="flex-1 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-xs font-bold text-emerald-200">Confirmar entrega</button>}
                  {order.deliveryState === 'pending' && order.kitchenState === 'ready' && <button type="button" onClick={() => void setDeliveryState(order.id, 'assigned')} className="flex-1 rounded-xl border border-sky-400/30 bg-sky-400/10 px-3 py-2 text-xs font-bold text-sky-200">Asignar domiciliario</button>}
                </div>}
              </article>
            )
          })}</div> : <p className="rounded-2xl border border-white/10 p-10 text-center text-zinc-300">No hay órdenes pendientes en cocina.</p>}
        </section>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_370px]">
          <section>
            {!kitchenOnly && orderType === 'table' && <section className="mb-5 space-y-4">
              <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-orange-100 bg-white p-4">
                <FloorSelector floors={floors} selected={currentFloor?.id} onSelect={chooseFloor} />
                <p className="text-right text-sm text-zinc-500">{floorTables.length} mesas · <span className="font-bold text-emerald-700">{floorTables.filter((table) => table.items.length === 0).length} libres</span> · <span className="font-bold text-orange-700">{floorTables.filter((table) => table.items.length > 0).length} ocupadas</span></p>
                <button type="button" onClick={() => setDesignOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm font-bold text-orange-900 hover:bg-orange-100"><PencilRuler className="h-4 w-4" />Personalizar plano</button>
              </header>
              {floorTables.length
                ? <FloorPlan tables={floorTables} selected={selectedTable?.id} onSelect={(id) => {
                  const selected = tables.find((table) => table.id === id)
                  if (selected) {
                    setTableId(selected.id)
                    setTableNumber(selected.name)
                  }
                }} onMove={(id, position) => updateData((current) => ({
                  ...current,
                  tables: current.tables.map((table) => table.id === id ? { ...table, ...position } : table),
                }))} />
                : <div className="rounded-2xl border border-dashed border-orange-300 bg-white p-8 text-center"><LayoutGrid className="mx-auto h-8 w-8 text-orange-600" /><p className="mt-3 font-bold">Esta zona todavía no tiene mesas.</p><button type="button" onClick={() => setDesignOpen(true)} className="mt-3 font-bold text-orange-700">Configurar plano</button></div>}
              <p className="rounded-xl bg-orange-50 px-4 py-3 text-sm text-orange-950">Selecciona una mesa del plano para asociar la orden y consultar su ocupación mientras cocina la prepara.</p>
            </section>}
            <div className="mb-4 grid grid-cols-3 gap-2">
              {ORDER_TYPES.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => { setOrderType(id); setError('') }} className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-bold ${orderType === id ? 'border-orange-500 bg-orange-50 text-orange-900' : 'border-zinc-200 bg-white text-zinc-600'}`}><Icon className="h-4 w-4" />{label}</button>)}
            </div>
            {orderType === 'table' && <p className="mb-4 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-bold text-orange-950">Mesa seleccionada: {selectedTable?.name ?? tableNumber} · {selectedTable?.capacity ?? 0} puestos</p>}
            {orderType === 'delivery' && <div className="mb-4 grid gap-2 rounded-2xl border border-zinc-200 bg-white p-3 sm:grid-cols-2">
              <label className="text-xs font-bold text-zinc-600">Cliente<input value={customer} onChange={(event) => setCustomer(event.target.value)} placeholder="Nombre del cliente" className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm font-normal" /></label>
              <label className="text-xs font-bold text-zinc-600">Teléfono<input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Celular" className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm font-normal" /></label>
              <label className="text-xs font-bold text-zinc-600 sm:col-span-2">Dirección<input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Dirección de entrega" className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm font-normal" /></label>
            </div>}
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-black">Menú</h2>
              <span className="text-xs font-semibold text-zinc-500">{visibleMenu.length} productos</span>
            </div>
            <div className="mb-4 flex flex-wrap gap-2" aria-label="Modos de venta">
              {[
                { id: 'all', label: 'Todo el menú' },
                { id: 'custom', label: 'Pizza personalizada' },
                { id: 'house', label: 'Pizza de la casa' },
              ].map((mode) => <button key={mode.id} type="button" aria-pressed={menuMode === mode.id} onClick={() => setMenuMode(mode.id)} className={`rounded-full border px-4 py-2 text-sm font-bold ${menuMode === mode.id ? 'border-orange-600 bg-orange-600 text-white' : 'border-zinc-200 bg-white text-zinc-600 hover:border-orange-300'}`}>{mode.label}</button>)}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {visibleMenu.map((item) => <button key={item.id} type="button" onClick={() => openModifierDialog(item)} className="rounded-2xl border border-zinc-200 bg-white p-4 text-left transition hover:border-orange-300 hover:shadow-sm">
                <div className="flex items-start justify-between"><span className="grid h-12 w-12 place-items-center rounded-xl bg-orange-50 text-3xl">{item.icon}</span><span className="text-sm font-black text-orange-800">{formatCOP(item.price)}</span></div>
                <h3 className="mt-3 font-black">{item.name}</h3><p className="mt-1 text-xs leading-relaxed text-zinc-500">{item.description || item.category || 'Plato preparado en cocina'}</p>
                <p className="mt-3 flex items-center gap-1 text-xs font-bold text-orange-700"><Plus className="h-3.5 w-3.5" />{item.id === 'custom-pizza' ? 'Elegir ingredientes' : 'Agregar'}</p>
              </button>)}
              {!stock.length && !inventoryLoading && !inventoryError && <EmptyInventoryState onLoadSamples={loadSampleInventory} title="Aún no hay menú ni ingredientes" />}
              {stock.length > 0 && !filteredMenu.length && <div className="col-span-full rounded-2xl border border-dashed border-orange-300 bg-white p-6 text-center"><p className="font-bold">No hay platos con recetas disponibles para vender.</p><p className="mt-1 text-sm text-zinc-500">Abre Ingredientes para crear platos y asociar sus ingredientes.</p><button type="button" onClick={() => setInventoryOpen(true)} className="mt-3 rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white">Configurar menú</button></div>}
              {filteredMenu.length > 0 && !visibleMenu.length && <div className="col-span-full rounded-2xl border border-dashed border-orange-300 bg-white p-6 text-center"><p className="font-bold">{menuMode === 'custom' ? 'No tienes una pizza personalizada configurada.' : 'No tienes pizzas de la casa configuradas.'}</p><p className="mt-1 text-sm text-zinc-500">En Ingredientes crea un plato con receta y usa la categoría “{menuMode === 'custom' ? 'Pizza personalizada' : 'Pizza de la casa'}”. Para toppings, agrégalos como ingredientes opcionales.</p><button type="button" onClick={() => setInventoryOpen(true)} className="mt-3 rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white">Configurar pizzas</button></div>}
            </div>
            {stock.length > 0 && <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4"><h3 className="text-sm font-black">Disponibilidad según la receta</h3><div className="mt-2 flex flex-wrap gap-2">{Object.entries(requiredStock).map(([id, needed]) => {
              const item = stock.find((ingredient) => ingredient.id === id)
              const available = Number(item?.quantity ?? item?.stock ?? 0)
              return <span key={id} className={`rounded-lg px-2.5 py-1 text-xs font-bold ${available < needed ? 'bg-rose-50 text-rose-800' : 'bg-zinc-100 text-zinc-700'}`}>{item?.name ?? id}: {needed} / {available}</span>
            })}{!Object.keys(requiredStock).length && <span className="text-xs text-zinc-500">Los ingredientes requeridos aparecerán al agregar productos.</span>}</div></div>}
          </section>

          <aside ref={cartRef} className="scroll-mt-4 self-start space-y-4 lg:sticky lg:top-4">
            <section className="rounded-2xl border border-zinc-200 bg-white p-4">
              <h2 className="flex items-center gap-2 font-black"><Utensils className="h-5 w-5 text-orange-700" />Orden actual <span className="ml-auto rounded-full bg-orange-50 px-2.5 py-1 text-xs text-orange-800">{cart.reduce((sum, line) => sum + line.quantity, 0)}</span></h2>
              <div className="mt-3 divide-y divide-zinc-100">
                {cart.length ? cart.map((line) => <div key={line.lineId} className="py-3">
                  <div className="flex items-center gap-2"><span className="text-xl">{line.icon}</span><div className="min-w-0 flex-1"><p className="break-words text-sm font-bold">{line.name}</p><p className="text-xs text-zinc-500">{formatCOP(line.price)} c/u{line.modifierLabels.length ? ` · ${line.modifierLabels.join(', ')}` : ''}</p><p className="mt-1 text-xs font-bold text-zinc-700">Subtotal: {formatCOP(line.price * line.quantity)}</p></div>
                    <button type="button" aria-label={`Restar ${line.name}`} onClick={() => changeQuantity(line.lineId, -1)} className="rounded-lg border p-1.5"><Minus className="h-3 w-3" /></button><span className="w-5 text-center text-sm font-bold">{line.quantity}</span><button type="button" aria-label={`Sumar ${line.name}`} onClick={() => changeQuantity(line.lineId, 1)} className="rounded-lg border p-1.5"><Plus className="h-3 w-3" /></button><button type="button" aria-label={`Eliminar ${line.name}`} onClick={() => changeQuantity(line.lineId, -line.quantity)} className="rounded-lg p-1.5 text-rose-600"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  <input aria-label={`Nota para ${line.name}`} value={line.note} onChange={(event) => editLine(line.lineId, { note: event.target.value })} placeholder="Nota para cocina (opcional)" className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-xs" />
                </div>) : <p className="py-8 text-center text-sm text-zinc-400">Agrega productos para comenzar.</p>}
              </div>
              <p className="mt-3 flex justify-between border-t pt-4 font-black"><span>Total</span><span>{formatCOP(total)}</span></p>
              {cart.length > 0 && <button type="button" onClick={() => { setPaymentOpen(true); setError('') }} className="mt-3 w-full rounded-xl bg-orange-600 px-4 py-3 text-sm font-black text-white hover:bg-orange-700">Cobrar venta y enviar a cocina</button>}
            </section>
            {paymentOpen && cart.length > 0 && <section className="rounded-2xl border border-orange-200 bg-orange-50/50 p-4"><div className="mb-2 flex items-center justify-between"><h3 className="font-black">Forma de pago</h3><button type="button" onClick={() => setPaymentOpen(false)} aria-label="Cerrar pago"><X className="h-4 w-4" /></button></div><Payment total={total} onPay={pay} /></section>}
            {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-800">{error}</p>}
            <section className="rounded-2xl border border-zinc-200 bg-white p-4">
              <h2 className="flex items-center gap-2 font-black"><Clock3 className="h-4 w-4 text-orange-700" />Órdenes recientes</h2>
              <div className="mt-3 space-y-2">{orders.slice(0, 5).map((order) => <div key={order.id} className="flex items-center justify-between gap-2 rounded-xl bg-zinc-50 p-3 text-xs"><div><p className="font-black">#{order.number} · {order.type === 'table' ? `Mesa ${order.tableNumber}` : orderTypeLabel(order.type)}</p><p className="mt-1 text-zinc-500">{new Date(order.createdAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })} · {order.lines.reduce((sum, line) => sum + line.quantity, 0)} ítem(s)</p></div><div className="flex shrink-0 items-center gap-2"><span className={`rounded-full px-2 py-1 font-bold ${order.kitchenState === 'delivered' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}>{KITCHEN_LABELS[order.kitchenState]}</span>{order.paymentMethod && <button type="button" title="Sacar copia del ticket" aria-label={`Sacar copia del ticket de la orden ${order.number}`} onClick={() => void printOrderCopy(order)} className="grid h-9 w-9 place-items-center rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"><Printer className="h-4 w-4" /></button>}</div></div>)}
                {!orders.length && <p className="py-4 text-center text-xs text-zinc-500">Todavía no hay órdenes.</p>}</div>
            </section>
            <AdCarousel gremio="comidas_rapidas" />
          </aside>
        </div>
      )}
      {!kitchenOpen && !kitchenOnly && cart.length > 0 && <button type="button" onClick={() => cartRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="fixed inset-x-4 bottom-4 z-40 flex items-center justify-between rounded-2xl bg-orange-600 px-4 py-3 font-black text-white shadow-xl lg:hidden"><span><Utensils className="mr-2 inline h-4 w-4" />Ver orden · {cart.reduce((sum, line) => sum + line.quantity, 0)} producto(s)</span><span>{formatCOP(total)}</span></button>}

      {selectedMenuItem && <div role="dialog" aria-modal="true" aria-labelledby="quick-meal-modifiers" className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-zinc-950/60 p-4">
        <section className="my-6 w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl">
          <header className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-orange-700">Personalizar orden</p><h2 id="quick-meal-modifiers" className="mt-1 text-2xl font-black">{selectedMenuItem.name}</h2><p className="mt-1 text-sm text-zinc-500">{selectedMenuItem.description}</p></div><button type="button" onClick={() => setSelectedMenuItem(null)} aria-label="Cerrar" className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100"><X className="h-5 w-5" /></button></header>
          {!!selectedMenuItem.modifiers.length && <fieldset className="mt-5 space-y-2"><legend className="mb-2 text-sm font-black">Modificadores</legend>{selectedMenuItem.modifiers.map((modifier) => <label key={modifier.id} className="flex items-center gap-3 rounded-xl border border-zinc-200 p-3 text-sm"><input type="checkbox" checked={selectedModifiers.includes(modifier.id)} onChange={(event) => setSelectedModifiers((current) => event.target.checked ? [...current, modifier.id] : current.filter((id) => id !== modifier.id))} className="h-4 w-4 accent-orange-600" /><span className="flex-1 font-semibold">{modifier.label}</span>{modifier.price > 0 && <b>+{formatCOP(modifier.price)}</b>}</label>)}</fieldset>}
          <label className="mt-4 block text-sm font-bold">Nota para cocina<textarea value={note} onChange={(event) => setNote(event.target.value)} rows="2" maxLength="180" placeholder="Ej. bien asada, salsa aparte…" className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2.5 font-normal" /></label>
          <button type="button" onClick={addConfiguredItem} className="mt-4 w-full rounded-xl bg-orange-600 px-4 py-3 font-black text-white hover:bg-orange-700">Agregar · {formatCOP(selectedMenuItem.price + selectedMenuItem.modifiers.filter((modifier) => selectedModifiers.includes(modifier.id)).reduce((sum, modifier) => sum + modifier.price, 0))}</button>
        </section>
      </div>}

      {designOpen && !kitchenOnly && <TableDesigner floors={floors} tables={tables} onSave={saveTableDesign} onCancel={() => {
        updateData((current) => ({ ...current, designed: true }))
        setDesignOpen(false)
      }} />}
      {inventoryOpen && <InventoryManager title="Inventario de ingredientes" gremio="comidas_rapidas" products={allProducts} onAddProduct={addProduct} onImportProducts={importProducts} onAdjustStock={adjustStock} onUpdateProduct={updateProduct} onDeleteProduct={deleteProduct} onLoadSamples={loadSampleInventory} onClose={() => setInventoryOpen(false)} remote={inventoryRemote} loadError={inventoryError} />}
      {cashOpen && <div role="dialog" aria-modal="true" aria-label="Caja registradora" className="fixed inset-0 z-50 overflow-y-auto bg-zinc-950/60 p-4"><div className="mx-auto my-6 max-w-3xl rounded-3xl bg-white p-4 shadow-2xl sm:p-6"><div className="mb-3 flex justify-end"><button type="button" onClick={() => setCashOpen(false)} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold"><X className="h-4 w-4" />Cerrar</button></div><CashRegister gremio="comidas_rapidas" /></div></div>}
    </main>
  )
}
