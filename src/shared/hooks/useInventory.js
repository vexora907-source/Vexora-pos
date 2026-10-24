import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getAuthToken } from '../services/auth.js'
import { initializeInventory, saveInventory } from '../services/inventory.js'
import { newSaleKey, registerSale as submitSale } from '../services/sales.js'
import { appStorage, isDemoMode, readTenant } from '../services/tenantStorage.js'
import { cacheProducts, readCachedProducts } from '../services/offlineDB.js'
import { getCachedLicenseStatus } from '../services/licenseService.js'
import { isNetworkUnavailable, pendingSalesCount, registerOfflineSale, reservePendingSales } from '../services/offlineSales.js'
import { getProductIcon } from '../utils/productIcons.js'
import { API_URL } from '../services/api.js'

const INVENTORY_UPDATED_EVENT = 'vexora:offline-queue-updated'

function inventoryKey(gremio) {
  const tenant = readTenant()
  const businessKey = tenant.business?.email || tenant.dian?.nit || tenant.business?.name || 'demo'
  return `vexora.inventory:${businessKey.toLowerCase()}:${gremio}`
}

function normalizeProduct(item, gremio) {
  const quantity = Number(item.quantity ?? item.stock) || 0
  return {
    ...item,
    price: Number(item.price),
    quantity,
    stock: Number(item.stock ?? quantity) || 0,
    icon: !item.icon || item.icon === '📦' ? getProductIcon(gremio, item.name, item.category) : item.icon,
  }
}

function isProductActive(product) {
  return product.active !== false && product.activo !== 'NO'
}

function readInventory(key, initialItems, gremio) {
  try {
    const saved = appStorage().getItem(key)
    if (!saved) return initialItems.map((item) => normalizeProduct(item, gremio))
    const parsed = JSON.parse(saved)
    if (!Array.isArray(parsed)) throw new Error('El inventario guardado no tiene el formato esperado.')
    const normalized = parsed.map((item) => normalizeProduct(item, gremio))
    if (JSON.stringify(parsed) !== JSON.stringify(normalized)) appStorage().setItem(key, JSON.stringify(normalized))
    return normalized
  } catch (error) {
    console.error('No se pudo cargar el inventario guardado.', error)
    return initialItems.map((item) => ({ ...item, icon: item.icon || getProductIcon(gremio, item.name, item.category) }))
  }
}

function cacheInventory(key, products) {
  try {
    appStorage().setItem(key, JSON.stringify(products))
  } catch (error) {
    console.error('No se pudo actualizar la copia local del inventario.', error)
  }
}

export function useInventory(gremio, initialItems) {
  const key = useMemo(() => inventoryKey(gremio), [gremio])
  const remote = useMemo(() => Boolean(API_URL && getAuthToken() && !isDemoMode()), [])
  const initialItemsRef = useRef(initialItems)
  const [products, setProducts] = useState(() => remote ? [] : readInventory(key, initialItems, gremio))
  const [loading, setLoading] = useState(remote)
  const [error, setError] = useState('')
  const productsRef = useRef(products)
  const loadingRef = useRef(remote)
  const offlineReadyRef = useRef(false)
  const versionRef = useRef(0)
  const mutationQueue = useRef(Promise.resolve())

  const refreshInventory = useCallback(async () => {
    if (!remote) return productsRef.current
    loadingRef.current = true
    setLoading(true)
    try {
      const inventory = await initializeInventory(gremio, [])
      const withPendingSales = await reservePendingSales(gremio, inventory.products)
      const normalized = withPendingSales.map((item) => normalizeProduct(item, gremio))
      versionRef.current = inventory.version
      productsRef.current = normalized
      setProducts(normalized)
      cacheInventory(key, normalized)
      await cacheProducts(gremio, normalized)
      offlineReadyRef.current = true
      setError('')
      return normalized
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo actualizar el inventario de la cuenta.')
      const cached = await readCachedProducts(gremio)
      if (cached.length) {
        const normalized = cached.map((item) => normalizeProduct(item, gremio))
        productsRef.current = normalized
        setProducts(normalized)
        offlineReadyRef.current = true
        return normalized
      }
      throw cause
    } finally {
      loadingRef.current = false
      setLoading(false)
    }
  }, [gremio, key, remote])

  useEffect(() => {
    if (!remote) return undefined
    let current = true
    loadingRef.current = true
    setLoading(true)
    setError('')

    const load = async () => {
      try {
        const cachedProducts = await readCachedProducts(gremio)
        const localProducts = cachedProducts.length
          ? cachedProducts.map((item) => normalizeProduct(item, gremio))
          : readInventory(key, initialItemsRef.current, gremio)
        const inventory = await initializeInventory(gremio, localProducts)
        if (!current) return
        const withPendingSales = await reservePendingSales(gremio, inventory.products)
        const normalized = withPendingSales.map((item) => normalizeProduct(item, gremio))
        versionRef.current = inventory.version
        productsRef.current = normalized
        setProducts(normalized)
        cacheInventory(key, normalized)
        await cacheProducts(gremio, normalized)
        offlineReadyRef.current = true
      } catch (cause) {
        if (!current) return
        const cached = await readCachedProducts(gremio)
        const fallback = cached.length
          ? cached.map((item) => normalizeProduct(item, gremio))
          : readInventory(key, initialItemsRef.current, gremio)
        productsRef.current = fallback
        setProducts(fallback)
        offlineReadyRef.current = fallback.length > 0
        setError(cause instanceof Error ? cause.message : 'No se pudo cargar el inventario de la cuenta.')
      } finally {
        if (current) {
          loadingRef.current = false
          setLoading(false)
        }
      }
    }
    void load()

    return () => {
      current = false
    }
  }, [gremio, key, remote])

  useEffect(() => {
    if (!remote) return undefined
    let current = true
    const refreshCachedProducts = async () => {
      try {
        const cached = await readCachedProducts(gremio)
        if (!current || !cached.length) return
        const normalized = cached.map((item) => normalizeProduct(item, gremio))
        productsRef.current = normalized
        setProducts(normalized)
        cacheInventory(key, normalized)
      } catch (cause) {
        if (current) setError(cause instanceof Error ? cause.message : 'No se pudo leer el inventario local.')
      }
    }
    window.addEventListener(INVENTORY_UPDATED_EVENT, refreshCachedProducts)
    return () => {
      current = false
      window.removeEventListener(INVENTORY_UPDATED_EVENT, refreshCachedProducts)
    }
  }, [gremio, key, remote])

  const saveProducts = useCallback((updater) => {
    const operation = mutationQueue.current.then(async () => {
      if (loadingRef.current) throw new Error('Espera a que termine de cargar el inventario.')
      if (remote && !navigator.onLine) throw new Error('No puedes modificar el inventario sin conexión. Las ventas seguirán guardándose en la cola local.')
      if (remote && await pendingSalesCount() > 0) {
        throw new Error('Sincroniza las ventas pendientes antes de modificar el inventario.')
      }
      const current = productsRef.current
      const next = typeof updater === 'function' ? updater(current) : updater
      let saved = next
      if (remote) {
        const inventory = await saveInventory(gremio, next, versionRef.current)
        versionRef.current = inventory.version
        saved = inventory.products
        await cacheProducts(gremio, saved.map((item) => normalizeProduct(item, gremio)))
      } else {
        appStorage().setItem(key, JSON.stringify(next))
      }
      productsRef.current = saved
      setProducts(saved)
      setError('')
      return saved
    }).catch((cause) => {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar el inventario.')
      throw cause
    })
    mutationQueue.current = operation.catch(() => {})
    return operation
  }, [gremio, key, remote])

  const addProduct = useCallback((input) => {
    const product = {
      ...input,
      id: `product-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`,
      price: Number(input.price),
      quantity: Number(input.quantity),
      stock: Number(input.quantity),
      icon: input.icon || getProductIcon(gremio, input.name, input.category),
    }
    return saveProducts((current) => [...current, product])
  }, [gremio, saveProducts])

  const importProducts = useCallback(async (importedProducts) => {
    let created = 0
    let updated = 0
    const importedIdMap = new Map()
    const savedProducts = await saveProducts((current) => {
      const productsByBarcode = new Map(
        current
          .filter((product) => product.barcode)
          .map((product) => [String(product.barcode).trim().toLocaleLowerCase(), product]),
      )
      const next = [...current]
      for (const imported of importedProducts) {
        const barcodeKey = String(imported.barcode).trim().toLocaleLowerCase()
        const existing = productsByBarcode.get(barcodeKey)
        if (existing) {
          const index = next.findIndex((product) => product.id === existing.id)
          const id = existing.id
          next[index] = { ...existing, ...imported, id }
          if (imported.id) importedIdMap.set(imported.id, id)
          productsByBarcode.set(barcodeKey, next[index])
          updated += 1
        } else {
          const product = {
            ...imported,
            id: imported.id || `product-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`,
            icon: getProductIcon(gremio, imported.name, imported.category),
          }
          if (imported.id) importedIdMap.set(imported.id, product.id)
          next.push(product)
          productsByBarcode.set(barcodeKey, product)
          created += 1
        }
      }
      return next.map((product) => ({
        ...product,
        ...(product.ingredients ? {
          ingredients: product.ingredients.map((ingredient) => ({
            ...ingredient,
            productId: importedIdMap.get(ingredient.productId) ?? ingredient.productId,
          })),
        } : {}),
        ...(product.modifiers ? {
          modifiers: product.modifiers.map((modifier) => ({
            ...modifier,
            ingredients: (modifier.ingredients ?? []).map((ingredient) => ({
              ...ingredient,
              productId: importedIdMap.get(ingredient.productId) ?? ingredient.productId,
            })),
          })),
        } : {}),
      }))
    })
    return { products: savedProducts, created, updated }
  }, [gremio, saveProducts])

  const adjustStock = useCallback((id, amount) => {
    return saveProducts((current) => current.map((product) => {
      if (product.id !== id) return product
      const quantity = Math.max(0, Number(product.quantity ?? product.stock) + amount)
      return { ...product, quantity, stock: quantity }
    }))
  }, [saveProducts])

  const updateProduct = useCallback((id, updates) => {
    return saveProducts((current) => current.map((product) => product.id === id ? { ...product, ...updates } : product))
  }, [saveProducts])

  const deleteProduct = useCallback((id) => {
    return saveProducts((current) => {
      if (gremio === 'comidas_rapidas') {
        const referencedBy = current.find((product) => product.id !== id && (
          product.ingredients?.some((ingredient) => ingredient.productId === id)
          || product.modifiers?.some((modifier) => modifier.ingredients?.some((ingredient) => ingredient.productId === id))
        ))
        if (referencedBy) {
          throw new Error(`No puedes eliminar este ingrediente porque hace parte de la receta de ${referencedBy.name}.`)
        }
      }
      return current.filter((product) => product.id !== id)
    })
  }, [gremio, saveProducts])

  const loadSampleInventory = useCallback(() => {
    if (!initialItemsRef.current.length) throw new Error('No hay productos de prueba configurados para este negocio.')
    return saveProducts((current) => {
      if (current.length) throw new Error('Solo puedes cargar productos de prueba cuando el inventario está vacío.')
      return initialItemsRef.current.map((item) => normalizeProduct(item, gremio))
    })
  }, [gremio, saveProducts])

  const validateSale = useCallback((items) => {
    if (loadingRef.current) throw new Error('Espera a que termine de cargar el inventario.')
    if (error && !offlineReadyRef.current) throw new Error(error)
    for (const item of items) {
      const product = products.find((entry) => entry.id === item.id)
      if (product && !isProductActive(product)) throw new Error(`${product.name} está inactivo y no se puede vender.`)
      if (!product || Number(product.quantity ?? product.stock) < item.quantity) {
        throw new Error(`Inventario insuficiente para ${product?.name ?? item.name}.`)
      }
    }
  }, [error, products])

  const recordSale = useCallback((items, paymentMethod = 'efectivo') => {
    for (const item of items) {
      const product = productsRef.current.find((entry) => entry.id === item.id)
      if (product && !isProductActive(product)) throw new Error(`${product.name} está inactivo y no se puede vender.`)
    }
    if (remote) {
      const operation = mutationQueue.current.then(async () => {
        if (loadingRef.current) throw new Error('Espera a que termine de cargar el inventario.')
        const saleKey = newSaleKey()
        const occurredAt = new Date().toISOString()
        try {
          if (!navigator.onLine) throw new Error('Sin conexión de red.')
          const result = await submitSale(gremio, items, paymentMethod, saleKey, occurredAt)
          if (result.inventory) {
            const withPendingSales = await reservePendingSales(gremio, result.inventory.products)
            const normalized = withPendingSales.map((item) => normalizeProduct(item, gremio))
            versionRef.current = result.inventory.version
            productsRef.current = normalized
            setProducts(normalized)
            cacheInventory(key, normalized)
            await cacheProducts(gremio, normalized)
          }
          setError('')
          return result.sale
        } catch (cause) {
          if (!isNetworkUnavailable(cause)) throw cause
          if (!offlineReadyRef.current) {
            const cached = await readCachedProducts(gremio)
            if (!cached.length) throw new Error('No hay inventario local disponible. Conecta el POS para cargar los productos.')
            offlineReadyRef.current = true
          }
          const status = await getCachedLicenseStatus()
          const result = await registerOfflineSale(gremio, items, paymentMethod, saleKey, occurredAt, status)
          const normalized = result.products.map((item) => normalizeProduct(item, gremio))
          productsRef.current = normalized
          setProducts(normalized)
          cacheInventory(key, normalized)
          setError('')
          return result.sale
        }
      }).catch((cause) => {
        setError(cause instanceof Error ? cause.message : 'No se pudo registrar la venta.')
        throw cause
      })
      mutationQueue.current = operation.catch(() => {})
      return operation
    }
    return saveProducts((current) => current.map((product) => {
      const sold = items.find((item) => item.id === product.id)
      if (!sold) return product
      if (Number(product.quantity ?? product.stock) < sold.quantity) {
        throw new Error(`Inventario insuficiente para ${product.name}.`)
      }
      const quantity = Number(product.quantity ?? product.stock) - sold.quantity
      return { ...product, quantity, stock: quantity }
    }))
  }, [gremio, key, remote, saveProducts])

  const sellableProducts = useMemo(() => products.filter(isProductActive), [products])
  return { products: sellableProducts, allProducts: products, addProduct, importProducts, adjustStock, updateProduct, deleteProduct, loadSampleInventory, validateSale, recordSale, refreshInventory, loading, error, remote }
}
