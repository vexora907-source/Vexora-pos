import { CheckCircle2, Clock3, FileX2 } from 'lucide-react'

export function DianStatus({ dian }) {
  if (!dian?.enabled) {
    return <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600"><FileX2 className="h-4 w-4" />DIAN desactivada · tickets internos</div>
  }
  if (dian.status === 'active') {
    return <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"><CheckCircle2 className="h-4 w-4" />Conexión DIAN activa ✓ · NIT {dian.nit}</div>
  }
  return <div role="status" className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900"><Clock3 className="h-4 w-4" />Configuración DIAN guardada · pendiente de conexión segura{dian.nit ? ` · NIT ${dian.nit}` : ''}</div>
}
