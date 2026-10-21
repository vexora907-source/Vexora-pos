import { io } from 'socket.io-client'
import { getAuthToken } from './auth.js'
import { isDemoMode } from './tenantStorage.js'

const API_URL = import.meta.env.VITE_API_URL

export function connectRealtimeSocket() {
  const token = getAuthToken()
  if (isDemoMode() || !token || !API_URL) return null
  return io(API_URL, {
    auth: { token },
    reconnection: true,
    reconnectionAttempts: Infinity,
    timeout: 10000,
  })
}
