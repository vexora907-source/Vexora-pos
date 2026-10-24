import { useEffect, useState } from 'react'
import { ArrowLeft, KeyRound } from 'lucide-react'
import { resetPassword } from '../../shared/services/auth.js'

export default function ResetPassword() {
  const [token] = useState(() => new URL(window.location.href).searchParams.get('token') ?? '')
  const [error, setError] = useState('')
  const [reset, setReset] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (token) window.history.replaceState(null, '', window.location.pathname)
  }, [token])

  async function submit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    const form = new FormData(event.currentTarget)

    try {
      await resetPassword(token, String(form.get('password')), String(form.get('passwordConfirmation')))
      setReset(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo cambiar la contraseña.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[.85fr_1.15fr]">
      <aside className="hidden flex-col justify-between bg-zinc-950 p-12 text-white lg:flex">
        <a href="/" aria-label="Vexora POS, inicio" className="flex items-center gap-3 font-black"><img src="/logo/logo-vexoraia.png" alt="Vexoraia" className="h-14 w-14 object-contain" />VEXORA POS</a>
        <div><p className="text-sm font-bold uppercase tracking-widest text-vexora-300">Acceso seguro</p><h1 className="mt-4 text-4xl font-black leading-tight">Crea una contraseña nueva.</h1><p className="mt-5 max-w-sm leading-7 text-zinc-400">Usa al menos 10 caracteres para proteger tu cuenta.</p></div>
        <p className="flex items-center gap-2 text-sm text-zinc-400"><KeyRound className="h-4 w-4 text-emerald-400" />El enlace es de un solo uso.</p>
      </aside>
      <section className="flex items-center justify-center p-6 py-14">
        <div className="w-full max-w-md">
          <a href="/login" className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-500 hover:text-zinc-900"><ArrowLeft className="h-4 w-4" />Volver a iniciar sesión</a>
          <p className="mt-12 text-sm font-bold uppercase tracking-widest text-vexora-600">Nueva contraseña</p>
          <h2 className="mt-3 text-4xl font-black tracking-tight">Restablecer acceso</h2>
          {reset ? (
            <div className="mt-6 space-y-5">
              <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">La contraseña se actualizó. Ya puedes iniciar sesión con tu nueva clave.</p>
              <a href="/login" className="flex w-full items-center justify-center rounded-xl bg-vexora-600 px-5 py-4 font-bold text-white hover:bg-vexora-700">Ir a iniciar sesión</a>
            </div>
          ) : !token ? (
            <div className="mt-6 space-y-5">
              <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm leading-6 text-rose-800">El enlace no es válido. Solicita uno nuevo para continuar.</p>
              <a href="/recuperar-contrasena" className="flex w-full items-center justify-center rounded-xl bg-vexora-600 px-5 py-4 font-bold text-white hover:bg-vexora-700">Solicitar otro enlace</a>
            </div>
          ) : (
            <>
              <p className="mt-3 text-zinc-500">Elige una contraseña de al menos 10 caracteres.</p>
              <form onSubmit={submit} className="mt-8 space-y-5">
                <label className="block text-sm font-semibold">Nueva contraseña<input name="password" required type="password" minLength={10} maxLength={72} autoComplete="new-password" className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3.5 outline-none transition focus:border-vexora-500 focus:ring-4 focus:ring-vexora-100" /></label>
                <label className="block text-sm font-semibold">Confirmar contraseña<input name="passwordConfirmation" required type="password" minLength={10} maxLength={72} autoComplete="new-password" className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3.5 outline-none transition focus:border-vexora-500 focus:ring-4 focus:ring-vexora-100" /></label>
                {error && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">{error}</p>}
                <button type="submit" disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-vexora-600 px-5 py-4 font-bold text-white hover:bg-vexora-700 disabled:cursor-wait disabled:opacity-60"><KeyRound className="h-5 w-5" />{submitting ? 'Actualizando…' : 'Guardar nueva contraseña'}</button>
              </form>
            </>
          )}
        </div>
      </section>
    </main>
  )
}
