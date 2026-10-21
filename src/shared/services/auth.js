import { apiRequest } from './api.js'
import { readTenant, stopDemoMode } from './tenantStorage.js'

const TOKEN_KEY = 'vexora.accessToken'
const DUPLICATE_EMAIL_MESSAGE = 'Ya existe una cuenta con este correo. Inicia sesión o usa otro correo.'

export function normalizeEmail(value) {
  return String(value ?? '').trim().toLowerCase()
}

export function getAuthToken() {
  return window.localStorage.getItem(TOKEN_KEY)
}

export function saveAuthToken(token) {
  if (typeof token !== 'string' || token.trim() === '') throw new Error('El token de acceso no es válido.')
  window.localStorage.setItem(TOKEN_KEY, token)
}

export function clearAuthToken() {
  window.localStorage.removeItem(TOKEN_KEY)
}

function assertEmailAvailable(email) {
  const normalizedEmail = normalizeEmail(email)
  if (!normalizedEmail) return
  const existingEmail = normalizeEmail(readTenant()?.business?.email)
  if (existingEmail && existingEmail === normalizedEmail) {
    throw new Error(DUPLICATE_EMAIL_MESSAGE)
  }
}

function mapDuplicateEmailError(error) {
  const message = String(error?.message ?? '').toLowerCase()
  if (
    error?.status === 409
    || /ya existe una cuenta con este correo|ya existe.*correo|email already exists|user already exists|account.*already exists/i.test(message)
  ) {
    throw new Error(DUPLICATE_EMAIL_MESSAGE)
  }
  throw error
}

export async function register(input) {
  stopDemoMode()
  const email = normalizeEmail(input?.email)
  assertEmailAvailable(email)
  try {
    const result = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ ...input, email }),
    })
    saveAuthToken(result.token)
    return result
  } catch (error) {
    mapDuplicateEmailError(error)
  }
}

export async function login(email, password) {
  stopDemoMode()
  const normalizedEmail = normalizeEmail(email)
  try {
    const result = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: normalizedEmail, password }),
    })
    saveAuthToken(result.token)
    return result
  } catch (error) {
    mapDuplicateEmailError(error)
  }
}
