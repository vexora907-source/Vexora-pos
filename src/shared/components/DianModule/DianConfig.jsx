import { useState } from 'react'
import { FileKey2, LockKeyhole, ShieldCheck, Upload } from 'lucide-react'

export function DianConfig({ initial = {}, onSubmit, busy = false, error = '', apiConfigured = false }) {
  const [certificateName, setCertificateName] = useState('')

  return (
    <form onSubmit={(event) => {
      event.preventDefault()
      const data = new FormData(event.currentTarget)
      onSubmit({
        nit: String(data.get('nit')).replace(/\D/g, ''),
        legalName: String(data.get('legalName')).trim(),
        prefix: String(data.get('prefix')).trim().toUpperCase(),
        certificate: data.get('certificate'),
        certificatePassword: data.get('certificatePassword'),
      })
    }} className="space-y-4">
      <label className="block text-sm font-semibold">NIT<input name="nit" inputMode="numeric" required defaultValue={initial.nit ?? ''} placeholder="900123456" pattern="[0-9. -]{9,15}" className="mt-1.5 w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:border-vexora-500 focus:ring-4 focus:ring-vexora-100" /><span className="mt-1 block text-xs font-normal text-zinc-500">Escríbelo con dígito de verificación si aplica, sin puntos ni guion.</span></label>
      <label className="block text-sm font-semibold">Razón social<input name="legalName" required defaultValue={initial.legalName ?? ''} placeholder="Razón social registrada en el RUT" className="mt-1.5 w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:border-vexora-500 focus:ring-4 focus:ring-vexora-100" /></label>
      <label className="block text-sm font-semibold">Prefijo de facturación<input name="prefix" required defaultValue={initial.prefix ?? ''} placeholder="PAPEL" maxLength={5} className="mt-1.5 w-full rounded-xl border border-zinc-200 px-4 py-3 uppercase outline-none focus:border-vexora-500 focus:ring-4 focus:ring-vexora-100" /><span className="mt-1 block text-xs font-normal text-zinc-500">De 1 a 5 letras o números, por ejemplo PAPEL.</span></label>
      {!apiConfigured && <>
        <label className="block text-sm font-semibold">Certificado digital (.p12)<span className="mt-1.5 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-3 hover:border-vexora-500"><Upload className="h-5 w-5 text-vexora-600" /><span className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-600">{certificateName || 'Seleccionar certificado .p12'}</span><input name="certificate" type="file" accept=".p12,application/x-pkcs12" required onChange={(event) => setCertificateName(event.target.files?.[0]?.name ?? '')} className="sr-only" /></span><span className="mt-1 block text-xs font-normal text-zinc-500">Vuelve a seleccionarlo al editar; el archivo no se almacena en el navegador.</span></label>
        <label className="block text-sm font-semibold">Contraseña del certificado<input name="certificatePassword" type="password" autoComplete="new-password" required placeholder="Se enviará solo al backend seguro" className="mt-1.5 w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:border-vexora-500 focus:ring-4 focus:ring-vexora-100" /><span className="mt-1 flex items-center gap-1 text-xs font-normal text-zinc-500"><LockKeyhole className="h-3.5 w-3.5" />No guardamos esta contraseña en el navegador.</span></label>
      </>}
      {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm font-medium text-rose-700">{error}</p>}
      <p className="flex gap-2 rounded-xl bg-blue-50 p-3 text-xs leading-5 text-blue-900"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />{apiConfigured ? 'El backend actual guarda los datos fiscales, pero aún no tiene conectada la integración con un proveedor DIAN. No se solicitará ni enviará el certificado hasta que esa ruta esté disponible.' : 'El certificado nunca se guarda en localStorage. Sin un backend DIAN configurado, este formulario solo guarda los datos comerciales y deja la integración pendiente.'}</p>
      <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-vexora-600 px-5 py-4 font-bold text-white hover:bg-vexora-700 disabled:opacity-50"><FileKey2 className="h-5 w-5" />{busy ? 'Configurando…' : apiConfigured ? 'Guardar datos y crear cuenta' : 'Guardar configuración DIAN'}</button>
    </form>
  )
}
