import { useState } from 'react'
import { AlertTriangle, CreditCard, LogIn, RefreshCw, ShieldCheck } from 'lucide-react'

export function LicenseBlocked({ status, error, sessionExpired = false, onRetry, onLogin }) {
  const [retrying, setRetrying] = useState(false)

  async function retry() {
    setRetrying(true)
    try {
      await onRetry()
    } finally {
      setRetrying(false)
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-zinc-950 px-5 py-10 text-white">
      <section className="w-full max-w-xl rounded-3xl border border-white/10 bg-white p-8 text-center text-zinc-900 shadow-2xl sm:p-10">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-amber-100 text-amber-700">
          {error ? <AlertTriangle className="h-8 w-8" /> : <ShieldCheck className="h-8 w-8" />}
        </div>
        <p className="mt-6 text-xs font-black uppercase tracking-[0.2em] text-vexora-700">Vexora POS · Licencia</p>
        <h1 className="mt-3 text-3xl font-black">{error ? 'No pudimos validar tu licencia' : 'Tu licencia está vencida'}</h1>
        <p role={error ? 'alert' : undefined} className="mx-auto mt-3 max-w-md leading-6 text-zinc-600">
          {sessionExpired
            ? 'Tu sesión expiró o dejó de ser válida. Inicia sesión nuevamente para consultar tu licencia.'
            : error || status?.message || 'Renueva tu plan para volver a registrar ventas.'}
        </p>
        {status?.validUntil && <p className="mt-3 text-sm text-zinc-500">Vigencia registrada hasta {new Date(status.validUntil).toLocaleDateString('es-CO')}.</p>}
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          {sessionExpired
            ? <button type="button" onClick={onLogin} className="inline-flex items-center justify-center gap-2 rounded-xl bg-vexora-700 px-5 py-3.5 font-bold text-white hover:bg-vexora-800"><LogIn className="h-5 w-5" />Iniciar sesión</button>
            : <>
              <a href={status?.payUrl || '/billing'} className="inline-flex items-center justify-center gap-2 rounded-xl bg-vexora-700 px-5 py-3.5 font-bold text-white hover:bg-vexora-800">
                <CreditCard className="h-5 w-5" />Pagar ahora
              </a>
              <button type="button" onClick={retry} disabled={retrying} className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 px-5 py-3.5 font-bold text-zinc-700 hover:bg-zinc-50 disabled:opacity-60">
                <RefreshCw className={`h-4 w-4 ${retrying ? 'animate-spin' : ''}`} />Verificar de nuevo
              </button>
            </>}
        </div>
      </section>
    </main>
  )
}
