import { useState } from 'react'
import { ArrowLeft, Mail } from 'lucide-react'
import { requestPasswordReset } from '../../shared/services/auth.js'

export default function ForgotPassword() {
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    const form = new FormData(event.currentTarget)

    try {
      await requestPasswordReset(String(form.get('email')))
      setSent(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo solicitar el restablecimiento.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[.85fr_1.15fr]">
      <aside className="hidden flex-col justify-between bg-zinc-950 p-12 text-white lg:flex">
        <a href="/" aria-label="Vexora POS, inicio" className="flex items-center gap-3 font-black"><img src="/logo/logo-vexoraia.png" alt="Vexoraia" className="h-14 w-14 object-contain" />VEXORA POS</a>
        <div><p className="text-sm font-bold uppercase tracking-widest text-vexora-300">Recupera tu acceso</p><h1 className="mt-4 text-4xl font-black leading-tight">Tu negocio te espera.</h1><p className="mt-5 max-w-sm leading-7 text-zinc-400">Te enviaremos instrucciones para crear una contraseña nueva.</p></div>
        <p className="flex items-center gap-2 text-sm text-zinc-400"><Mail className="h-4 w-4 text-emerald-400" />El enlace de recuperación vence en 30 minutos.</p>
      </aside>
      <section className="flex items-center justify-center p-6 py-14">
        <div className="w-full max-w-md">
          <a href="/login" className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-500 hover:text-zinc-900"><ArrowLeft className="h-4 w-4" />Volver a iniciar sesión</a>
          <p className="mt-12 text-sm font-bold uppercase tracking-widest text-vexora-600">Recuperación de cuenta</p>
          <h2 className="mt-3 text-4xl font-black tracking-tight">¿Olvidaste tu contraseña?</h2>
          {sent ? (
            <div role="status" className="mt-6 rounded-xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
              Si existe una cuenta con ese correo, recibirás instrucciones para restablecer la contraseña. Revisa también la carpeta de correo no deseado.
            </div>
          ) : (
            <>
              <p className="mt-3 text-zinc-500">Escribe el correo asociado a tu cuenta y te enviaremos un enlace para cambiarla.</p>
              <form onSubmit={submit} className="mt-8 space-y-5">
                <label className="block text-sm font-semibold">Correo electrónico<input name="email" required type="email" autoComplete="email" placeholder="tu@negocio.com" className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3.5 outline-none transition focus:border-vexora-500 focus:ring-4 focus:ring-vexora-100" /></label>
                {error && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">{error}</p>}
                <button type="submit" disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-vexora-600 px-5 py-4 font-bold text-white hover:bg-vexora-700 disabled:cursor-wait disabled:opacity-60"><Mail className="h-5 w-5" />{submitting ? 'Enviando…' : 'Enviar enlace de recuperación'}</button>
              </form>
            </>
          )}
        </div>
      </section>
    </main>
  )
}
