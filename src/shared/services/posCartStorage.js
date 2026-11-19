export function getPosCartStorageKey(tenant, gremio) {
  const business = tenant?.business ?? {}
  const identity = business.id
    ?? business._id
    ?? tenant?.id
    ?? tenant?._id
    ?? business.email
    ?? tenant?.email
    ?? tenant?.dian?.nit
    ?? business.name

  if (!identity || !gremio) return null
  return `vexora.pos.cart.v1:${encodeURIComponent(String(identity).trim().toLowerCase())}:${encodeURIComponent(gremio)}`
}

export function readPosCart(storage, key) {
  if (!key) return []
  const saved = storage.getItem(key)
  if (!saved) return []

  try {
    const cart = JSON.parse(saved)
    if (!Array.isArray(cart)) throw new Error('El carrito guardado no tiene el formato esperado.')
    if (cart.some((item) => !item || typeof item !== 'object' || Array.isArray(item))) {
      throw new Error('El carrito guardado contiene productos no válidos.')
    }
    return cart
  } catch (error) {
    console.error('No se pudo cargar el carrito guardado.', error)
    return []
  }
}

export function writePosCart(storage, key, cart) {
  if (!key) return
  storage.setItem(key, JSON.stringify(cart))
}
