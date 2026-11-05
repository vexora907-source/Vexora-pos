import { useEffect } from 'react'
import { publishCustomerDisplay } from '../services/customerDisplay.js'
import { readTenant } from '../services/tenantStorage.js'

export function useCustomerDisplay({ gremio, items, total, status, customerName, paymentMethod, enabled = true }) {
  useEffect(() => {
    if (!enabled) return
    publishCustomerDisplay(readTenant(), {
      gremio,
      items,
      total,
      status,
      customerName,
      paymentMethod,
    })
  }, [customerName, enabled, gremio, items, paymentMethod, status, total])
}
