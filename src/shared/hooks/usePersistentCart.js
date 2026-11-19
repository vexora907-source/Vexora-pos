import { useEffect, useMemo, useState } from 'react'
import { appStorage, readTenant } from '../services/tenantStorage.js'
import { getPosCartStorageKey, readPosCart, writePosCart } from '../services/posCartStorage.js'

export function usePersistentCart(gremio) {
  const storageKey = useMemo(() => getPosCartStorageKey(readTenant(), gremio), [gremio])
  const [cart, setCart] = useState(() => {
    try {
      return readPosCart(appStorage(), storageKey)
    } catch (error) {
      console.error('No se pudo acceder al carrito guardado.', error)
      return []
    }
  })

  useEffect(() => {
    try {
      writePosCart(appStorage(), storageKey, cart)
    } catch (error) {
      console.error('No se pudo guardar el carrito del punto de venta.', error)
    }
  }, [cart, storageKey])

  return [cart, setCart]
}
