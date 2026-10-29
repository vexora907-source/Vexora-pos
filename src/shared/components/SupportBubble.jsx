import { useEffect, useRef, useState } from 'react'
import { LifeBuoy, MessageCircle, Send, X } from 'lucide-react'
import { fetchSupportMessages, isSupportEnabled, sendSupportMessage, synchronizeSupportOutbox } from '../services/support.js'

function formatTime(value) {
  return new Intl.DateTimeFormat('es-CO', { hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

export function SupportBubble() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [waiting, setWaiting] = useState(0)
  const [connected, setConnected] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const endRef = useRef(null)
  const enabled = isSupportEnabled()

  useEffect(() => {
    if (!enabled) return undefined
    let active = true
    async function refresh() {
      try {
        const delivery = await synchronizeSupportOutbox()
        if (active) setWaiting(delivery.waiting)
        const result = await fetchSupportMessages()
        if (active) {
          setWaiting(result.waiting)
          setMessages(result.messages)
          setConnected(true)
          setError('')
          setNotice('')
        }
      } catch (cause) {
        if (active) {
          setConnected(false)
          setError(cause.message)
          setWaiting((count) => Math.max(count, 1))
        }
      }
    }
    void refresh()
    const interval = window.setInterval(refresh, 12_000)
    window.addEventListener('online', refresh)
    return () => {
      active = false
      window.clearInterval(interval)
      window.removeEventListener('online', refresh)
    }
  }, [enabled])

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, open])

  async function submit(event) {
    event.preventDefault()
    if (!draft.trim() || sending) return
    setSending(true)
    setError('')
    setNotice('')
    try {
      const message = await sendSupportMessage(draft)
      setDraft('')
      setMessages((current) => [...current, {
        ...message,
        senderName: 'Tú',
        direction: 'pos',
        local: true,
      }])
      setWaiting((count) => count + 1)
      setNotice('Mensaje guardado y en espera de confirmación del CRM.')
    } catch (cause) {
      setError(cause.message)
    } finally {
      setSending(false)
    }
  }

  if (!enabled) return null

  return (
    <div className="support-widget">
      {open && <section className="support-panel" aria-label="Soporte Vexoraia">
        <header className="support-panel-heading">
          <span className="support-panel-avatar"><LifeBuoy size={18} /></span>
          <span><strong>Soporte Vexoraia</strong><small>{connected ? (waiting ? `${waiting} mensaje(s) esperando sincronización` : 'Conectado al backend del POS') : 'Sin conexión · tus mensajes quedan en espera'}</small></span>
          <button type="button" aria-label="Cerrar soporte" onClick={() => setOpen(false)}><X size={17} /></button>
        </header>
        <div className="support-panel-messages" aria-live="polite">
          {messages.length === 0 && <p className="support-panel-empty">Hola. Escríbenos y te responderemos por aquí.</p>}
          {messages.map((message, index) => (
            <article key={`${message.messageId ?? message.createdAt}-${index}`} className={`support-bubble-message ${message.direction === 'pos' ? 'support-bubble-own' : ''}`}>
              <strong>{message.senderName}</strong>
              <p>{message.body}</p>
              <small>{formatTime(message.createdAt)}{message.pending ? ' · En espera' : ''}</small>
            </article>
          ))}
          <div ref={endRef} />
        </div>
        {(error || notice) && <p role={error ? 'alert' : 'status'} className={`support-panel-feedback ${error ? 'support-panel-error' : ''}`}>{error || notice}</p>}
        <form className="support-panel-form" onSubmit={(event) => void submit(event)}>
          <textarea value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={2000} placeholder="Escribe tu mensaje…" aria-label="Mensaje de soporte" required />
          <button type="submit" disabled={sending || !draft.trim()} aria-label="Enviar mensaje">{sending ? '…' : <Send size={17} />}</button>
        </form>
      </section>}
      <button type="button" className="support-bubble-button" aria-expanded={open} aria-label={open ? 'Cerrar soporte' : 'Abrir soporte'} onClick={() => setOpen((value) => !value)}>
        {open ? <X size={23} /> : <MessageCircle size={23} />}
        {waiting > 0 && <span>{waiting > 99 ? '99+' : waiting}</span>}
      </button>
    </div>
  )
}
