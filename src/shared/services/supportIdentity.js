function tokenClaims(token) {
  const payload = token?.split('.')[1]
  if (!payload) return {}

  try {
    const base64 = payload.replaceAll('-', '+').replaceAll('_', '/')
    const paddedBase64 = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
    return JSON.parse(atob(paddedBase64))
  } catch {
    return {}
  }
}

export function getSupportIdentity() {
  const token = window.localStorage.getItem('vexora.accessToken')
  let tenant = {}
  try {
    tenant = JSON.parse(window.localStorage.getItem('vexora.tenant') ?? '{}')
  } catch {
    tenant = {}
  }

  const claims = tokenClaims(token)
  const tenantId = String(tenant.id ?? tenant.tenantId ?? claims.tenantId ?? '').trim()
  const userId = String(tenant.user?.id ?? claims.sub ?? '').trim()
  if (!tenantId || !userId) {
    throw new Error('No se pudo identificar tu negocio y usuario para abrir soporte. Cierra sesión e inicia sesión de nuevo.')
  }

  return {
    tenantId,
    userId,
    senderName: String(tenant.user?.name ?? tenant.user?.email ?? '').trim() || 'Usuario POS',
  }
}
