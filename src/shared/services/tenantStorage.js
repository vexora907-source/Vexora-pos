const TENANT_KEY = 'vexora.tenant'
const LEGACY_GREMIO_KEY = 'vexora.gremios'
const DEMO_MODE_KEY = 'vexora.demoMode'

export function isDemoMode() {
  return window.sessionStorage.getItem(DEMO_MODE_KEY) === 'true'
}

export function appStorage() {
  return isDemoMode()
    ? window.sessionStorage
    : window.localStorage
}

function clearDemoSessionData() {
  for (let index = window.sessionStorage.length - 1; index >= 0; index -= 1) {
    const key = window.sessionStorage.key(index)
    if (key.startsWith('vexora.')) window.sessionStorage.removeItem(key)
  }
}

function removePreviousDemoData() {
  try {
    const tenant = JSON.parse(window.localStorage.getItem(TENANT_KEY) ?? '{}')
    if (tenant.isDemo || ['Cuenta Demo Vexora', 'Demo Vexora POS'].includes(tenant.business?.name)) {
      window.localStorage.removeItem(TENANT_KEY)
      window.localStorage.removeItem(LEGACY_GREMIO_KEY)
    }
  } catch (error) {
    console.error('No se pudieron identificar datos antiguos de la demo.', error)
  }
  for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
    const key = window.localStorage.key(index)
    if (key.toLowerCase().includes('cuenta demo vexora') || key.toLowerCase().includes('demo vexora pos') || key.includes('demo-vexora-pos')) {
      window.localStorage.removeItem(key)
    }
  }
  window.localStorage.removeItem('vexora.quick-meals.orders.v1')
  window.localStorage.removeItem('vexora.restaurant.tables:demo')
}

export function startDemoMode() {
  clearDemoSessionData()
  removePreviousDemoData()
  window.localStorage.removeItem('vexora.accessToken')
  window.sessionStorage.setItem(DEMO_MODE_KEY, 'true')
}

export function stopDemoMode() {
  if (!isDemoMode()) return false
  clearDemoSessionData()
  window.sessionStorage.removeItem(DEMO_MODE_KEY)
  return true
}

export function resetDemoOnReload() {
  if (!isDemoMode()) return false
  const [navigation] = window.performance.getEntriesByType('navigation')
  if (navigation?.type !== 'reload') return false
  clearDemoSessionData()
  window.history.replaceState(null, '', '/')
  return true
}

export function clearTenant() {
  if (isDemoMode()) {
    clearDemoSessionData()
    return
  }
  const storage = appStorage()
  storage.removeItem(TENANT_KEY)
  storage.removeItem(LEGACY_GREMIO_KEY)
}

export function readTenant() {
  try {
    const storage = appStorage()
    const tenant = JSON.parse(storage.getItem(TENANT_KEY) ?? '{}')
    const legacyGremios = JSON.parse(storage.getItem(LEGACY_GREMIO_KEY) ?? '[]')
    return {
      ...tenant,
      gremios: Array.isArray(tenant.gremios)
        ? tenant.gremios.filter((item) => typeof item === 'string')
        : Array.isArray(legacyGremios) ? legacyGremios.filter((item) => typeof item === 'string') : [],
    }
  } catch (error) {
    console.error('No se pudo leer la configuración del negocio.', error)
    return { gremios: [] }
  }
}

export function saveTenant(updates) {
  const current = readTenant()
  const next = { ...current, ...updates }
  const storage = appStorage()
  storage.setItem(TENANT_KEY, JSON.stringify(next))
  if (Array.isArray(next.gremios)) {
    storage.setItem(LEGACY_GREMIO_KEY, JSON.stringify(next.gremios))
  }
  return next
}
