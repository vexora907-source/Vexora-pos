import { io } from 'socket.io-client'
import { getAuthToken } from './auth.js'
import { isDemoMode } from './tenantStorage.js'
import { API_URL } from './api.js'

export function connectRealtimeSocket() {
  const token = getAuthToken()
  if (isDemoMode() || !token || !API_URL) return null
  const socketUrl = new URL(API_URL)
  return io(socketUrl.origin, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    timeout: 10000,
  })
}
