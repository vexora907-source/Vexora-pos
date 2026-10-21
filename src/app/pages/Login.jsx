import { useState } from 'react'
import { ArrowLeft, LogIn, ShieldCheck } from 'lucide-react'
import { login } from '../../shared/services/auth.js'
import { saveTenant } from '../../shared/services/tenantStorage.js'

export default function Login() {
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    const form = new FormData(event.currentTarget)

    try {
      const result = await login(String(form.get('email')).trim(), String(form.get('password')))
      const tenant = result.tenant
      saveTenant({
        business: {
          name: tenant.name,
          owner: tenant.ownerName,
          email: tenant.email,
          phone: tenant.phone,
          address: tenant.address,
        },
        gremios: tenant.gremios,
        sucursales: tenant.sucursales ?? [],
        dian: tenant.dian,
        plan: result.license?.plan ?? tenant.plan,
        user: result.user,
      })
      window.location.assign('/pos')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo iniciar sesión.')
      setSubmitting(false)
    }
  }

  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[.85fr_1.15fr]">
      <aside className="hidden flex-col justify-between bg-zinc-950 p-12 text-white lg:flex">
        <a href="/" aria-label="Vexora POS, inicio" className="flex items-center gap-3 font-black"><img src="/logo/logo-vexoraia.png" alt="Vexoraia" className="h-14 w-14 object-contain" />VEXORA POS</a>
        <div><p className="text-sm font-bold uppercase tracking-widest text-vexora-300">Tu negocio, en marcha</p><h1 className="mt-4 text-4xl font-black leading-tight">Bienvenido de nuevo.</h1><p className="mt-5 max-w-sm leading-7 text-zinc-400">Inicia sesión para abrir el espacio de trabajo de tu negocio.</p></div>
        <p className="flex items-center gap-2 text-sm text-zinc-400"><ShieldCheck className="h-4 w-4 text-emerald-400" />Acceso protegido para tu equipo.</p>
      </aside>
      <section className="flex items-center justify-center p-6 py-14">
        <div className="w-full max-w-md">
          <a href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-500 hover:text-zinc-900"><ArrowLeft className="h-4 w-4" />Volver al inicio</a>
          <p className="mt-12 text-sm font-bold uppercase tracking-widest text-vexora-600">Acceso a tu negocio</p>
          <h2 className="mt-3 text-4xl font-black tracking-tight">Iniciar sesión</h2>
          <p className="mt-3 text-zinc-500">Usa las credenciales de tu cuenta Vexora.</p>
          <form onSubmit={submit} className="mt-8 space-y-5">
            <label className="block text-sm font-semibold">Correo electrónico<input name="email" required type="email" autoComplete="username" placeholder="tu@negocio.com" className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3.5 outline-none transition focus:border-vexora-500 focus:ring-4 focus:ring-vexora-100" /></label>
            <label className="block text-sm font-semibold">Contraseña<input name="password" required type="password" autoComplete="current-password" className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3.5 outline-none transition focus:border-vexora-500 focus:ring-4 focus:ring-vexora-100" /></label>
            {error && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">{error}</p>}
            <button type="submit" disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-vexora-600 px-5 py-4 font-bold text-white hover:bg-vexora-700 disabled:cursor-wait disabled:opacity-60"><LogIn className="h-5 w-5" />{submitting ? 'Ingresando…' : 'Ingresar'}</button>
          </form>
          <p className="mt-4 text-center text-xs leading-5 text-zinc-400">Necesitas el backend activo y una cuenta registrada para iniciar sesión.</p>
        </div>
      </section>
    </main>
  )
}
