import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DEFAULT_FLOORS, DEFAULT_TABLES } from '../theme.js'
import { appStorage, readTenant } from '../../../shared/services/tenantStorage.js'

const CHANNEL_NAME = 'vexora.restaurant.tables'

function storageKey(gremio) {
  const tenant = readTenant()
  const tenantKey = tenant.isDemo ? 'demo-vexora-pos' : tenant.business?.email || tenant.dian?.nit || tenant.business?.name || 'demo'
  return `vexora.${gremio}.tables:${tenantKey.toLowerCase()}`
}

function readState(key) {
  const saved = appStorage().getItem(key)
  if (!saved) return { floors: DEFAULT_FLOORS, tables: DEFAULT_TABLES, designed: false }
  try {
    const parsed = JSON.parse(saved)
    if (!Array.isArray(parsed.floors) || !Array.isArray(parsed.tables)) throw new Error('El plano guardado no tiene el formato esperado.')
    return {
      floors: parsed.floors,
      tables: parsed.tables.map((table) => ({ ...table, items: Array.isArray(table.items) ? table.items : [] })),
      designed: parsed.designed === true,
    }
  } catch (error) {
    console.error('No se pudo cargar el plano de mesas guardado.', error)
    return { floors: DEFAULT_FLOORS, tables: DEFAULT_TABLES, designed: false }
  }
}

export function useTableSocket(gremio = 'restaurant') {
  const key = useMemo(() => storageKey(gremio), [gremio])
  const [data, setData] = useState(() => readState(key))
  const dataRef = useRef(data)

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return undefined
    const channel = new BroadcastChannel(CHANNEL_NAME)
    channel.onmessage = (event) => {
      if (event.data?.key === key && event.data.state) {
        dataRef.current = event.data.state
        setData(event.data.state)
      }
    }
    return () => channel.close()
  }, [key])

  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === key && event.newValue) {
        const next = readState(key)
        dataRef.current = next
        setData(next)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [key])

  const updateData = useCallback((updater) => {
    const next = typeof updater === 'function' ? updater(dataRef.current) : updater
    dataRef.current = next
    appStorage().setItem(key, JSON.stringify(next))
    setData(next)
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(CHANNEL_NAME)
      channel.postMessage({ key, state: next })
      channel.close()
    }
  }, [key])

  return { floors: data.floors, tables: data.tables, designed: data.designed, updateData }
}
