import { useCallback, useEffect, useState } from 'react'
import { GREMIOS } from '../../app/components/GremioSelector.jsx'
import { isDemoMode, readTenant, saveTenant } from '../services/tenantStorage.js'

function loadTenant() {
  const tenant = readTenant()
  if (!isDemoMode()) return tenant
  const gremios = [...new Set([...tenant.gremios, ...GREMIOS.map(({ id }) => id)])]
  const currentBranches = tenant.sucursales ?? []
  const sucursales = [
    ...currentBranches.filter((branch) => gremios.includes(branch.gremio)),
    ...gremios
      .filter((gremio) => !currentBranches.some((branch) => branch.gremio === gremio))
      .map((gremio) => ({ id: `demo-${gremio}`, name: 'Principal', gremio })),
  ]
  if (gremios.length === tenant.gremios.length && sucursales.length === currentBranches.length) return tenant
  return saveTenant({ gremios, sucursales })
}

export function useTenantGremio() {
  const [tenant, setTenant] = useState(loadTenant)
  const { gremios } = tenant
  const [activeGremio, setActiveGremio] = useState(gremios[0] ?? '')

  useEffect(() => {
    if (!gremios.includes(activeGremio)) setActiveGremio(gremios[0] ?? '')
  }, [activeGremio, gremios])

  const setGremios = useCallback((nextGremios) => {
    const unique = [...new Set(nextGremios)]
    const updates = { gremios: unique }
    if (isDemoMode()) {
      const currentBranches = readTenant().sucursales ?? []
      updates.sucursales = [
        ...currentBranches.filter((branch) => unique.includes(branch.gremio)),
        ...unique
          .filter((gremio) => !currentBranches.some((branch) => branch.gremio === gremio))
          .map((gremio) => ({ id: `demo-${gremio}`, name: 'Principal', gremio })),
      ]
    }
    setTenant(saveTenant(updates))
    setActiveGremio((current) => unique.includes(current) ? current : unique[0] ?? '')
  }, [])

  const updateTenant = useCallback((updates) => {
    setTenant(saveTenant(updates))
  }, [])

  return { ...tenant, gremios, setGremios, updateTenant, activeGremio, setActiveGremio }
}
