import { io } from 'socket.io-client'
import { getAuthToken } from './auth.js'
import { isDemoMode } from './tenantStorage.js'
import { API_URL } from './api.js'

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
