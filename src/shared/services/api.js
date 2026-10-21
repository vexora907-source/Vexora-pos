import { isDemoMode } from './tenantStorage.js'

const runtimeEnv = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {}
export const API_URL = runtimeEnv.VITE_API_URL
const TOKEN_KEY = 'vexora.accessToken'

export async function apiRequest(path, options = {}) {
  if (isDemoMode()) throw new Error('La cuenta demo funciona solo en este navegador y no guarda datos en el backend.')
  if (!API_URL) throw new Error('Configura VITE_API_URL para conectar el backend.')
  const headers = new Headers(options.headers)
  headers.set('Accept', 'application/json')
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  const token = window.localStorage.getItem(TOKEN_KEY)
  if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`)

  let response
  try {
    response = await fetch(new URL(path, API_URL), { ...options, headers })
  } catch (cause) {
    throw new Error('No se pudo conectar con el backend. Verifica que esté activo y que VITE_API_URL sea correcto.', { cause })
  }

  const body = await response.text()
  let result = null
  if (body) {
    try {
      result = JSON.parse(body)
    } catch (cause) {
      if (response.ok) throw new Error('El backend devolvió una respuesta no válida.', { cause })
    }
  }
  if (!response.ok) {
    const error = new Error(result?.message ?? result?.error ?? `La solicitud falló (${response.status}).`)
    error.status = response.status
    throw error
  }
  return result
}
