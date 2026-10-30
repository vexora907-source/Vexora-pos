import { apiRequest } from './api.js'
import { getAuthToken } from './auth.js'
import { getSupportIdentity } from './supportIdentity.js'
import { isDemoMode } from './tenantStorage.js'

const OUTBOX_KEY_PREFIX = 'vexora.support.outbox:'
const HISTORY_KEY_PREFIX = 'vexora.support.history:'
const MAX_OUTBOX_MESSAGES = 100

function outboxKey(tenantId, userId) {
  return `${OUTBOX_KEY_PREFIX}${tenantId}:${userId}`
}

function historyKey(tenantId, userId) {
  return `${HISTORY_KEY_PREFIX}${tenantId}:${userId}`
}

function readOutbox(key) {
  try {
    const stored = JSON.parse(window.localStorage.getItem(key) ?? '[]')
    return Array.isArray(stored) ? stored : []
  } catch (cause) {
    throw new Error('No se pudo leer la cola local de soporte.', { cause })
  }
}

function saveOutbox(key, messages) {
  try {
    window.localStorage.setItem(key, JSON.stringify(messages))
  } catch (cause) {
    throw new Error('No se pudo guardar el mensaje pendiente en este dispositivo.', { cause })
  }
}

function appendHistory(key, messages) {
  const history = readOutbox(key)
  const byId = new Map([...history, ...messages].map((message) => [message.messageId, message]))
  saveOutbox(key, [...byId.values()].slice(-200))
}

export function isSupportEnabled() {
  return !isDemoMode() && Boolean(getAuthToken())
}

export async function sendSupportMessage(body) {
  if (!isSupportEnabled()) throw new Error('Inicia sesión con un negocio para contactar al soporte.')
  const identity = getSupportIdentity()
  const key = outboxKey(identity.tenantId, identity.userId)
  const outbox = readOutbox(key)
  if (outbox.length >= MAX_OUTBOX_MESSAGES) {
    throw new Error('La bandeja sin conexión está llena. Conéctate y sincroniza los mensajes pendientes.')
  }
  const message = {
    messageId: crypto.randomUUID(),
    body: String(body).trim(),
    createdAt: new Date().toISOString(),
    status: 'waiting',
  }
  if (!message.body || message.body.length > 2000) throw new Error('El mensaje debe tener entre 1 y 2000 caracteres.')
  saveOutbox(key, [...outbox, message])
  appendHistory(historyKey(identity.tenantId, identity.userId), [{
    ...message,
    senderName: identity.senderName,
    direction: 'pos',
    local: true,
  }])
  await synchronizeSupportOutbox()
  return message
}

export async function synchronizeSupportOutbox() {
  if (!isSupportEnabled()) return { sent: 0, waiting: 0 }
  const identity = getSupportIdentity()
  const key = outboxKey(identity.tenantId, identity.userId)
  const messages = readOutbox(key)
  if (!messages.length) return { sent: 0, waiting: 0 }

  let sent = 0
  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index]
    try {
      await apiRequest('/api/support/messages', {
        method: 'POST',
        body: JSON.stringify({ messageId: message.messageId, body: message.body }),
      })
    } catch (cause) {
      if (cause?.status && cause.status < 500 && cause.status !== 429) throw cause
      saveOutbox(key, messages.slice(index))
      return { sent, waiting: messages.length - index }
    }
    sent += 1
  }
  saveOutbox(key, [])
  return { sent, waiting: 0 }
}

export async function fetchSupportMessages() {
  if (!isSupportEnabled()) return { messages: [], waiting: 0 }
  const identity = getSupportIdentity()
  const outbox = readOutbox(outboxKey(identity.tenantId, identity.userId))
  const history = readOutbox(historyKey(identity.tenantId, identity.userId))
  const result = await apiRequest('/api/support/messages')
  const pendingIds = new Set([
    ...outbox.map((message) => message.messageId),
    ...(result.pendingToCrmIds ?? []),
  ])

  const newReplies = (result.messages ?? []).map((message) => ({ ...message, direction: 'crm', local: false }))
  appendHistory(historyKey(identity.tenantId, identity.userId), newReplies)
  if (newReplies.length) {
    await apiRequest('/api/support/messages/ack', {
      method: 'POST',
      body: JSON.stringify({ messageIds: newReplies.map((message) => message.messageId) }),
    })
  }
  const mergedMessages = [...new Map(
    [...history, ...newReplies].map((message) => [
      message.messageId,
      { ...message, pending: pendingIds.has(message.messageId) },
    ]),
  ).values()].sort((first, second) => new Date(first.createdAt) - new Date(second.createdAt))
  return {
    messages: mergedMessages,
    waiting: Math.max(pendingIds.size, Number(result.pendingToCrm ?? 0)),
  }
}
