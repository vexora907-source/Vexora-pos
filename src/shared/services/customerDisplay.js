const CHANNEL_PREFIX = 'vexora.customer-display.v1'
const RECEIPT_DISPLAY_MS = 45_000
const channels = new Map()
const latestStates = new Map()
const sessionId = globalThis.crypto?.randomUUID?.() ?? `display-${Date.now()}-${Math.random().toString(36).slice(2)}`

export function getCustomerDisplayTenantKey(tenant) {
  const business = tenant?.business ?? {}
  const identity = business.id ?? business._id ?? business.email ?? tenant?.email ?? business.name
  return identity ? encodeURIComponent(String(identity).trim().toLowerCase()) : 'unknown'
}

function getChannel(tenant) {
  if (typeof BroadcastChannel !== 'function') return null
  const key = `${CHANNEL_PREFIX}.${getCustomerDisplayTenantKey(tenant)}`
  if (!channels.has(key)) channels.set(key, new BroadcastChannel(key))
  return channels.get(key)
}

export function getCustomerDisplaySessionId() {
  return sessionId
}

export function normalizeCustomerDisplayState(state) {
  const safeItems = (Array.isArray(state.items) ? state.items : []).map((item) => {
    const quantity = Number(item.quantity ?? item.cantidad) || 0
    const price = Number(item.price ?? item.precio) || 0
    const variant = item.variant
    const variantLabel = variant ? [variant.size, variant.color].filter(Boolean).join(' · ') : ''
    return {
      name: [String(item.name ?? item.nombre ?? 'Producto'), variantLabel].filter(Boolean).join(' · '),
      quantity,
      price,
      total: price * quantity,
      note: String(item.note ?? item.nota ?? '').slice(0, 120),
    }
  }).filter((item) => item.quantity > 0)
  const requestedStatus = state.status
  const status = ['idle', 'purchase', 'receipt'].includes(requestedStatus)
    ? requestedStatus
    : safeItems.length ? 'purchase' : 'idle'
  const requestedTotal = Number(state.total)
  return {
    gremio: String(state.gremio ?? ''),
    status,
    items: safeItems,
    total: Number.isFinite(requestedTotal) && requestedTotal >= 0
      ? requestedTotal
      : safeItems.reduce((sum, item) => sum + item.total, 0),
    customerName: String(state.customerName ?? '').slice(0, 120),
    paymentMethod: String(state.paymentMethod ?? '').slice(0, 40),
    updatedAt: Date.now(),
  }
}

export function publishCustomerDisplay(tenant, state) {
  const payload = normalizeCustomerDisplayState(state)
  const current = latestStates.get(sessionId)
  if (payload.status === 'idle' && current?.status === 'receipt' && Date.now() - current.updatedAt < RECEIPT_DISPLAY_MS) return
  latestStates.set(sessionId, payload)
  getChannel(tenant)?.postMessage({ type: 'update', sourceId: sessionId, payload })
}

export function listenForCustomerDisplayRequests(tenant) {
  const channel = getChannel(tenant)
  const handleMessage = (event) => {
    if (event.origin && event.origin !== window.location.origin) return
    if (event.data?.type !== 'request' || event.data.sourceId !== sessionId) return
    const response = {
      type: 'update',
      sourceId: sessionId,
      payload: latestStates.get(sessionId) ?? {
        status: 'idle',
        gremio: '',
        items: [],
        total: 0,
        customerName: '',
        paymentMethod: '',
        updatedAt: Date.now(),
      },
    }
    if (channel) {
      channel.postMessage(response)
    } else if (event.source && 'postMessage' in event.source) {
      event.source.postMessage(response, window.location.origin)
    }
  }
  if (channel) {
    channel.addEventListener('message', handleMessage)
    return () => channel.removeEventListener('message', handleMessage)
  }
  window.addEventListener('message', handleMessage)
  return () => window.removeEventListener('message', handleMessage)
}

export function subscribeToCustomerDisplay(tenant, sourceId, listener) {
  const channel = getChannel(tenant)
  const handleMessage = (event) => {
    if (event.origin && event.origin !== window.location.origin) return
    if (!channel && event.source !== window.opener) return
    if (event.data?.type === 'update' && event.data.sourceId === sourceId) {
      listener(event.data.payload)
    }
  }
  if (channel) {
    channel.addEventListener('message', handleMessage)
    channel.postMessage({ type: 'request', sourceId })
    return () => channel.removeEventListener('message', handleMessage)
  }
  window.addEventListener('message', handleMessage)
  window.opener?.postMessage({ type: 'request', sourceId }, window.location.origin)
  return () => window.removeEventListener('message', handleMessage)
}

export async function detectExternalDisplay() {
  const isExtended = window.screen?.isExtended === true
  if (typeof window.getScreenDetails !== 'function') {
    return { connected: isExtended, supported: false, screen: null }
  }

  try {
    const details = await window.getScreenDetails()
    const screens = Array.from(details.screens ?? [])
    const secondary = screens.find((screen) => !screen.isPrimary) ?? screens[1] ?? null
    return { connected: screens.length > 1, supported: true, screen: secondary }
  } catch (error) {
    if (error?.name === 'NotAllowedError' || error?.name === 'SecurityError') {
      return { connected: isExtended, supported: true, permissionDenied: true, screen: null }
    }
    throw error
  }
}

export function openCustomerDisplay(gremio) {
  const url = new URL('/customer-display', window.location.origin)
  url.searchParams.set('gremio', gremio)
  url.searchParams.set('sourceId', sessionId)
  const displayWindow = window.open(url, 'vexora-customer-display', 'popup=yes,width=1100,height=760')
  if (!displayWindow) throw new Error('El navegador bloqueó la nueva pantalla. Permite ventanas emergentes para abrir la pantalla del cliente.')
  return displayWindow
}
