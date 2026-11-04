import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Banknote, ClipboardList, KeyRound, LayoutDashboard, LockKeyhole, Package, Pencil, Plus, Printer, Save, TrendingUp, Users, Wallet } from 'lucide-react'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts'
import { assignTenantGremios, createAdminUser, createBranch, createExpense, getAccountingReport, getAdminActivity, getAdminLicenses, getAdminUsers, getInventoryReport, getSalesReport, updateAdminUser } from '../../shared/services/admin.js'
import { adminPlanHasFeature, canonicalAdminPlan, FEATURE_PLANS } from '../../shared/services/adminPlanFeatures.js'
import { CashRegister } from '../../shared/components/CashRegister/CashRegister.jsx'
import { fetchLicenseSummary } from '../../shared/services/licenseService.js'
import { printUniversalTicket } from '../../shared/services/thermalPrint.js'
import { readTenant } from '../../shared/services/tenantStorage.js'

const gremioLabels = { papeleria: 'Papelería', cerrajeria: 'Cerrajería', restaurante: 'Restaurante', ferreteria: 'Ferretería', tienda: 'Tienda', ropa: 'Ropa', comidas_rapidas: 'Comidas rápidas' }
const allGremios = Object.keys(gremioLabels)
const dateValue = (date) => date.toISOString().slice(0, 10)
const money = (value) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value ?? 0)
const chartColors = ['#0F172A', '#334155', '#64748B', '#94A3B8', '#7C3AED', '#0F766E', '#D97706']
const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'accounting', label: 'Contabilidad', icon: Wallet },
  { id: 'inventory', label: 'Inventario', icon: Package },
  { id: 'cash', label: 'Caja', icon: Banknote },
  { id: 'users', label: 'Usuarios', icon: Users },
  { id: 'activity', label: 'Actividad', icon: ClipboardList },
  { id: 'licenses', label: 'Licencias', icon: KeyRound },
]
const planNames = { INICIO: 'Inicio', NEGOCIO: 'Negocio', PRO: 'Pro', VEXORA: 'Vexora' }

function UpgradeNotice({ feature, currentPlan }) {
  const requiredPlan = FEATURE_PLANS[feature]
  return <section className="rounded-2xl border border-violet-200 bg-violet-50 p-5">
    <div className="flex items-start gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-700"><LockKeyhole className="h-5 w-5" /></span>
      <div className="min-w-0 flex-1">
        <h3 className="font-black text-violet-950">Disponible desde el plan {planNames[requiredPlan]}</h3>
        <p className="mt-1 text-sm text-violet-800">Tu plan actual es {planNames[currentPlan]}. Actualiza tu plan para desbloquear esta función.</p>
        <a href="/billing" className="mt-3 inline-flex rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-800">Ver planes y actualizar</a>
      </div>
    </div>
  </section>
}

function printInventoryA4() {
  if (typeof window.print !== 'function') throw new Error('Este navegador no ofrece impresión del sistema.')
  const cleanup = () => {
    window.removeEventListener('afterprint', cleanup)
    document.body.classList.remove('printing-inventory-a4')
  }
  document.body.classList.add('printing-inventory-a4')
  window.addEventListener('afterprint', cleanup, { once: true })
  try {
    window.print()
  } catch (cause) {
    cleanup()
    throw cause
  }
}

function printInventoryThermal(report) {
  printUniversalTicket({
    tipo: 'INVENTARIO',
    createdAt: new Date().toISOString(),
    gremio: gremioLabels[report.gremio] ?? report.gremio,
    negocio: { nombre: 'VEXORA POS' },
    total: report.metrics?.stockValue ?? 0,
    productos: (report.products ?? []).map((product) => ({
      cantidad: product.stock,
      nombre: product.name,
      total: product.stockValue,
    })),
  }, 'caja')
}

function UserEditor({ user, branches, gremios, onSave }) {
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    role: user.role === 'CASHIER' ? 'CAJERO' : user.role,
    gremio: user.gremio ?? gremios[0],
    sucursal: user.sucursal ?? '',
    active: user.active !== false,
  })
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const availableBranches = useMemo(() => branches.filter((branch) => branch.gremio === form.gremio), [branches, form.gremio])

  useEffect(() => {
    if (!availableBranches.some((branch) => branch.id === form.sucursal)) {
      const nextBranch = availableBranches[0]?.id ?? ''
      setForm((current) => current.sucursal === nextBranch ? current : { ...current, sucursal: nextBranch })
    }
  }, [form.sucursal, availableBranches])

  async function submit(event) {
    event.preventDefault()
    setError('')
    if (password && password !== passwordConfirmation) {
      setError('La confirmación de contraseña no coincide.')
      return
    }
    if (password && password.length < 10) {
      setError('La contraseña debe tener al menos 10 caracteres.')
      return
    }
    setBusy(true)
    try {
      await onSave(user._id, {
        ...form,
        password,
        passwordConfirmation: password ? passwordConfirmation : undefined,
      })
      setPassword('')
      setPasswordConfirmation('')
      setEditing(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo actualizar el usuario.')
    } finally {
      setBusy(false)
    }
  }

  return <form onSubmit={submit} className="min-w-[900px] border-t p-3">
    <div className="grid grid-cols-[1.2fr_120px_1fr_1fr_80px_auto] items-center gap-2 text-xs">
      <div><strong>{user.name}</strong><p className="text-zinc-500">{user.email}</p><p className="text-[10px] font-semibold tracking-wider text-zinc-500">Código: {user.userCode ?? '—'}</p></div>
      {editing ? <>
        <select aria-label={`Rol de ${user.name}`} value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))} className="rounded-lg border p-2"><option value="ADMIN">Admin</option><option value="CAJERO">Cajero</option><option value="VENDEDOR">Vendedor</option><option value="COCINA">Cocina</option></select>
        <select aria-label={`Gremio de ${user.name}`} value={form.gremio} onChange={(event) => setForm((current) => ({ ...current, gremio: event.target.value }))} className="rounded-lg border p-2">{gremios.map((id) => <option key={id} value={id}>{gremioLabels[id] ?? id}</option>)}</select>
        <select aria-label={`Sucursal de ${user.name}`} value={form.sucursal} onChange={(event) => setForm((current) => ({ ...current, sucursal: event.target.value }))} className="rounded-lg border p-2">{availableBranches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select>
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.active} onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))} />Activo</label>
      </> : <>
        <span>{user.role}</span><span>{gremioLabels[user.gremio] ?? user.gremio ?? '—'}</span>
        <span>{branches.find((branch) => branch.id === user.sucursal)?.name ?? 'Principal'}</span>
        <span className={`font-bold ${user.active === false ? 'text-rose-700' : 'text-emerald-700'}`}>{user.active === false ? 'Inactivo' : 'Activo'}</span>
      </>}
      {editing ? <button disabled={busy} className="inline-flex items-center justify-center gap-1 rounded-lg bg-zinc-900 px-3 py-2 font-bold text-white disabled:opacity-50"><Save className="h-3.5 w-3.5" />{busy ? 'Guardando' : 'Guardar'}</button>
        : ['OWNER', 'SUPER_ADMIN'].includes(user.role)
          ? <span className="text-center text-[10px] font-semibold text-zinc-500">Cuenta protegida</span>
          : <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center justify-center gap-1 rounded-lg border px-3 py-2 font-bold"><Pencil className="h-3.5 w-3.5" />Editar</button>}
    </div>
    {editing && <div className="mt-3 grid gap-2 sm:grid-cols-2"><input type="password" autoComplete="new-password" minLength="10" maxLength="72" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Nueva contraseña (opcional)" className="rounded-lg border p-2.5 text-xs" /><input type="password" autoComplete="new-password" minLength="10" maxLength="72" value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} placeholder="Verificar nueva contraseña" className="rounded-lg border p-2.5 text-xs" /><p className="sm:col-span-2 text-[11px] text-zinc-500">La contraseña se almacena con hash y nunca se muestra en pantalla.</p>{error && <p role="alert" className="sm:col-span-2 text-xs text-rose-700">{error}</p>}<button type="button" onClick={() => { setEditing(false); setPassword(''); setPasswordConfirmation(''); setError('') }} className="justify-self-start rounded-lg px-3 py-2 text-xs font-bold text-zinc-600">Cancelar</button></div>}
  </form>
}

export default function Admin() {
  const tenant = readTenant()
  const isSuperAdmin = tenant.user?.role === 'SUPER_ADMIN'
  const [currentPlan, setCurrentPlan] = useState(canonicalAdminPlan(tenant.plan))
  const [tab, setTab] = useState('dashboard')
  const [users, setUsers] = useState([])
  const [activity, setActivity] = useState([])
  const [licenses, setLicenses] = useState([])
  const [report, setReport] = useState({ sales: [], summary: [], daily: [], byGremio: [], topProducts: [], metrics: {}, truncated: false })
  const [inventoryReports, setInventoryReports] = useState({})
  const [accountingReport, setAccountingReport] = useState({ income: 0, expenses: 0, net: 0, tickets: 0, expenseCount: 0, expenseRecords: [] })
  const [branches, setBranches] = useState(tenant.sucursales ?? [])
  const [from, setFrom] = useState(dateValue(new Date(Date.now() - 29 * 86400000)))
  const [to, setTo] = useState(dateValue(new Date()))
  const [gremio, setGremio] = useState(tenant.gremios?.[0] ?? '')
  const [reportGremio, setReportGremio] = useState(tenant.gremios?.[0] ?? '')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)
  const [salesRange, setSalesRange] = useState('30')
  const [expenseBusy, setExpenseBusy] = useState(false)
  const [expenseError, setExpenseError] = useState('')
  const [planError, setPlanError] = useState('')

  const branchesForGremio = useMemo(() => branches.filter((branch) => branch.gremio === gremio), [branches, gremio])

  useEffect(() => {
    let active = true
    fetchLicenseSummary()
      .then((summary) => {
        if (active && summary?.plan) setCurrentPlan(canonicalAdminPlan(summary.plan))
      })
      .catch((cause) => {
        if (active) setPlanError(cause instanceof Error ? `No se pudo validar el plan actual: ${cause.message}` : 'No se pudo validar el plan actual.')
      })
    return () => { active = false }
  }, [])

  async function loadInventoryReports() {
    const results = await Promise.all((tenant.gremios ?? []).map((id) => getInventoryReport(id)))
    setInventoryReports(Object.fromEntries(results.map((result) => [result.gremio, result])))
  }

  async function loadTab(nextTab = tab) {
    setLoading(true)
    setError('')
    try {
      if (nextTab === 'dashboard') {
        const [sales, inventory, accounting] = await Promise.all([
          getSalesReport(from, to),
          Promise.all((tenant.gremios ?? []).map((id) => getInventoryReport(id))),
          adminPlanHasFeature(currentPlan, 'accounting') ? getAccountingReport(from, to) : Promise.resolve(null),
        ])
        setReport(sales)
        setInventoryReports(Object.fromEntries(inventory.map((result) => [result.gremio, result])))
        if (accounting) setAccountingReport(accounting)
      }
      if (nextTab === 'inventory') await loadInventoryReports()
      if (nextTab === 'accounting' && adminPlanHasFeature(currentPlan, 'accounting')) {
        setAccountingReport(await getAccountingReport(from, to))
      }
      if (nextTab === 'users') {
        const result = await getAdminUsers()
        setUsers(result.users)
      }
      if (nextTab === 'activity') {
        const result = await getAdminActivity()
        setActivity(result.activity)
      }
      if (nextTab === 'licenses' && isSuperAdmin) {
        const result = await getAdminLicenses()
        setLicenses(result.licenses)
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo cargar la información.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadTab(tab) }, [tab, from, to, currentPlan])

  async function submitUser(event) {
    event.preventDefault()
    setNotice('')
    setError('')
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    try {
      const password = String(form.get('password'))
      if (password !== String(form.get('passwordConfirmation'))) throw new Error('La confirmación de contraseña no coincide.')
      await createAdminUser({
        name: String(form.get('name')),
        email: String(form.get('email')),
        password,
        passwordConfirmation: String(form.get('passwordConfirmation')),
        role: String(form.get('role')),
        gremio,
        sucursal: String(form.get('sucursal')),
      })
      formElement.reset()
      const result = await getAdminUsers()
      setUsers(result.users)
      setNotice('Usuario creado y asignado a un único gremio y sucursal.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo crear el usuario.')
    }
  }

  async function saveUser(userId, input) {
    await updateAdminUser(userId, input)
    const result = await getAdminUsers()
    setUsers(result.users)
    setNotice('Usuario actualizado.')
  }

  function setDateRange(range) {
    const today = new Date()
    const start = new Date(today)
    if (range === '7') start.setDate(today.getDate() - 6)
    else if (range === '30') start.setDate(today.getDate() - 29)
    else start.setDate(1)
    setSalesRange(range)
    setFrom(dateValue(start))
    setTo(dateValue(today))
  }

  async function submitBranch(event) {
    event.preventDefault()
    setNotice('')
    setError('')
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    try {
      const result = await createBranch({ name: String(form.get('branchName')), gremio })
      setBranches((current) => [...current, result.branch])
      formElement.reset()
      setNotice('Sucursal creada.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo crear la sucursal.')
    }
  }

  async function submitExpense(event) {
    event.preventDefault()
    setExpenseError('')
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    setExpenseBusy(true)
    try {
      await createExpense({
        description: String(form.get('description')),
        category: String(form.get('category')),
        amount: Number(form.get('amount')),
        date: String(form.get('date')),
      })
      formElement.reset()
      setAccountingReport(await getAccountingReport(from, to))
      setNotice('Gasto registrado correctamente.')
    } catch (cause) {
      setExpenseError(cause instanceof Error ? cause.message : 'No se pudo registrar el gasto.')
    } finally {
      setExpenseBusy(false)
    }
  }

  async function updateTenantGremios(license, nextGremios) {
    setError('')
    setNotice('')
    try {
      await assignTenantGremios(license.tenant._id, nextGremios)
      const result = await getAdminLicenses()
      setLicenses(result.licenses)
      setNotice(`Gremios asignados a ${license.tenant.name}.`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo asignar el gremio.')
    }
  }

  const totalSales = report.metrics?.total ?? report.sales.reduce((sum, sale) => sum + sale.total, 0)
  const totalCount = report.metrics?.tickets ?? report.sales.length
  const productsWithSales = report.topProducts ?? []
  const salesByGremio = report.byGremio ?? []
  const allCriticalProducts = Object.values(inventoryReports).flatMap((inventory) => inventory.criticalProducts ?? [])
  const inventoryForGremio = inventoryReports[reportGremio] ?? { products: [], criticalProducts: [], metrics: {} }

  return <main className="min-h-screen bg-slate-100 p-4 text-slate-900 sm:p-6"><div className="mx-auto flex max-w-[1600px] gap-6">
    <aside className="hidden w-[260px] shrink-0 rounded-[28px] border border-slate-200 bg-white/85 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.06)] backdrop-blur xl:block">
      <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-vexora-100 text-lg font-black text-vexora-700">V</div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Vexora</p>
          <h2 className="text-base font-black">Admin</h2>
        </div>
      </div>
      <nav aria-label="Secciones administrativas" className="mt-5 space-y-2">
        {tabs.filter((item) => item.id !== 'licenses' || isSuperAdmin).map(({ id, label, icon: Icon }) => <button key={id} type="button" aria-pressed={tab === id} onClick={() => setTab(id)} className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-semibold transition ${tab === id ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}><Icon className="h-4 w-4" />{label}</button>)}
      </nav>
      <div className="mt-6 rounded-2xl bg-gradient-to-br from-vexora-50 to-violet-50 p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-700">Cliente</p>
        <p className="mt-2 text-sm font-bold text-slate-900">{tenant.business?.name ?? 'Negocio'}</p>
        <p className="mt-1 text-xs text-slate-500">clienteId · {tenant.user?.id ?? tenant.business?.email ?? 'sin id'}</p>
      </div>
    </aside>

    <section className="min-w-0 flex-1 rounded-[30px] border border-slate-200 bg-white/90 p-4 shadow-[0_20px_50px_rgba(15,23,42,0.06)] backdrop-blur sm:p-6">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <a href="/pos" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500"><ArrowLeft className="h-4 w-4" />Volver al punto de venta</a>
          <p className="mt-4 text-xs font-bold uppercase tracking-[0.22em] text-vexora-600">Administración del negocio</p>
          <h1 className="mt-1 text-3xl font-black text-slate-900">Panel administrativo · {planNames[currentPlan]}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start">
          {tabs.filter((item) => item.id !== 'licenses' || isSuperAdmin).map(({ id, label, icon: Icon }) => <button key={id} type="button" aria-pressed={tab === id} onClick={() => setTab(id)} className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition ${tab === id ? 'bg-slate-900 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}><Icon className="h-4 w-4" />{label}</button>)}
        </div>
      </div>
      <p className="mt-4 text-sm text-slate-600">{isSuperAdmin ? 'Acceso de plataforma y administración del negocio.' : 'Consulta ventas, utilidad, inventario y caja; administra también usuarios y actividad.'}</p>
      {error && <p role="alert" className="mt-4 rounded-2xl bg-rose-50 p-4 text-sm text-rose-800">{error}</p>}
      {planError && <p role="alert" className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">{planError} Se usó el último plan guardado en este dispositivo.</p>}
      {notice && <p role="status" className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</p>}
      {loading && <p className="mt-4 text-sm text-slate-500">Cargando información…</p>}

    {tab === 'dashboard' && <section className="mt-5 space-y-5">
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]"><label className="text-sm font-semibold">Periodo<select value={salesRange} onChange={(event) => setDateRange(event.target.value)} className="mt-1 w-full rounded-lg border bg-white p-2.5"><option value="7">Últimos 7 días</option><option value="30">Últimos 30 días</option><option value="month">Este mes</option></select></label><label className="text-sm font-semibold">Desde<input type="date" value={from} onChange={(event) => { setSalesRange('custom'); setFrom(event.target.value) }} className="mt-1 w-full rounded-lg border bg-white p-2.5" /></label><label className="text-sm font-semibold">Hasta<input type="date" value={to} onChange={(event) => { setSalesRange('custom'); setTo(event.target.value) }} className="mt-1 w-full rounded-lg border bg-white p-2.5" /></label><button type="button" onClick={() => loadTab('dashboard')} className="self-end rounded-xl bg-vexora-600 px-4 py-2.5 font-bold text-white">Actualizar</button></div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><article className="rounded-2xl border bg-white p-5"><p className="text-xs uppercase tracking-wide text-zinc-500">Ventas totales</p><p className="mt-2 text-2xl font-black">{money(totalSales)}</p></article><article className="rounded-2xl border bg-white p-5"><p className="text-xs uppercase tracking-wide text-zinc-500">Tickets</p><p className="mt-2 text-2xl font-black">{totalCount}</p></article><article className="rounded-2xl border bg-white p-5"><p className="text-xs uppercase tracking-wide text-zinc-500">Ticket promedio</p><p className="mt-2 text-2xl font-black">{money(report.metrics?.average ?? 0)}</p></article><article className="rounded-2xl border bg-white p-5"><p className="text-xs uppercase tracking-wide text-zinc-500">Gremios con ventas</p><p className="mt-2 text-2xl font-black">{salesByGremio.length}</p></article><article className="rounded-2xl border bg-white p-5"><p className="text-xs uppercase tracking-wide text-zinc-500">Resultado neto operativo</p>{adminPlanHasFeature(currentPlan, 'accounting') ? <p className="mt-2 text-2xl font-black">{money(accountingReport.net)}</p> : <a href="/billing" className="mt-2 inline-flex text-sm font-bold text-violet-700">Disponible desde Negocio · subir plan</a>}</article></div>
      {adminPlanHasFeature(currentPlan, 'accounting') && <p className="text-xs text-zinc-500">Resultado neto = ventas − gastos registrados; no incluye costo de mercancía.</p>}
      <article className="rounded-2xl border bg-white p-5"><h2 className="flex items-center gap-2 font-bold"><TrendingUp className="h-4 w-4" />Stock crítico · hasta 5 unidades</h2><div className="mt-3 space-y-2">{allCriticalProducts.slice(0, 8).map((product) => <div key={`${product.id}-${product.name}`} className="flex items-center justify-between gap-3 rounded-xl bg-amber-50 p-3 text-sm"><span>{product.name}</span><b className="text-amber-900">{product.stock} unidades</b></div>)}{!allCriticalProducts.length && <p className="text-sm text-zinc-500">No hay productos con stock crítico registrado.</p>}</div></article>
      {report.truncated && <p className="text-sm text-amber-800">El reporte está limitado a las 500 ventas más recientes; acota las fechas para consultar el periodo completo.</p>}
      {adminPlanHasFeature(currentPlan, 'advancedCharts') ? <>
      <div className="grid gap-5 xl:grid-cols-[2fr_1fr]">
        <article className="rounded-2xl border bg-white p-5"><h2 className="font-bold text-slate-900">Evolución de ventas</h2><div className="mt-4 h-72"><ResponsiveContainer width="100%" height="100%"><AreaChart data={report.daily ?? []}><defs><linearGradient id="vexoraSalesFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0F172A" stopOpacity={0.2} /><stop offset="95%" stopColor="#0F172A" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" /><XAxis dataKey="fecha" tickFormatter={(value) => new Date(`${value}T12:00:00`).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })} fontSize={11} /><YAxis tickFormatter={(value) => `$${Math.round(value / 1000)}k`} fontSize={11} /><Tooltip formatter={(value) => money(value)} labelFormatter={(value) => value} /><Area type="monotone" dataKey="ventas" name="Ventas" stroke="#0F172A" strokeWidth={2.5} fill="url(#vexoraSalesFill)" /></AreaChart></ResponsiveContainer></div></article>
        <article className="rounded-2xl border bg-white p-5"><h2 className="font-bold text-slate-900">Ventas por gremio</h2><div className="mt-3 h-64"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={salesByGremio} dataKey="value" nameKey="gremio" innerRadius={62} outerRadius={92} paddingAngle={4}>{salesByGremio.map((row, index) => <Cell key={row.gremio} fill={chartColors[index % chartColors.length]} />)}</Pie><Tooltip formatter={(value) => money(value)} labelFormatter={(value) => gremioLabels[value] ?? value} /></PieChart></ResponsiveContainer></div><div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px]">{salesByGremio.map((row, index) => <span key={row.gremio} className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full" style={{ backgroundColor: chartColors[index % chartColors.length] }} />{gremioLabels[row.gremio] ?? row.gremio}</span>)}</div></article>
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <article className="rounded-2xl border bg-white p-5"><h2 className="font-bold text-slate-900">Productos más vendidos</h2><div className="mt-4 h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={productsWithSales} layout="vertical" margin={{ left: 10 }}><CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" /><XAxis type="number" fontSize={11} /><YAxis dataKey="name" type="category" width={120} fontSize={11} /><Tooltip formatter={(value) => `${value} unidades`} /><Bar dataKey="ventas" name="Unidades" fill="#0F172A" radius={[0, 8, 8, 0]} /></BarChart></ResponsiveContainer></div></article>
        <article className="rounded-2xl border bg-white p-5"><h2 className="font-bold text-slate-900">Registro reciente</h2><div className="mt-4 max-h-72 space-y-2 overflow-y-auto">{report.sales.slice(0, 8).map((sale) => <div key={sale.saleKey} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3"><div><p className="text-sm font-semibold">{gremioLabels[sale.gremio] ?? sale.gremio} · {sale.user?.name ?? 'Usuario'}</p><p className="mt-1 text-xs text-slate-500">{new Date(sale.createdAt).toLocaleString('es-CO')} · {sale.paymentMethod}</p></div><b className="whitespace-nowrap text-sm">{money(sale.total)}</b></div>)}{!report.sales.length && <p className="py-8 text-center text-sm text-zinc-500">No hay ventas en este periodo.</p>}</div></article>
      </div>
      </> : <UpgradeNotice feature="advancedCharts" currentPlan={currentPlan} />}
      <div className="overflow-x-auto rounded-2xl border bg-white"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-zinc-100 text-xs uppercase text-zinc-500"><tr><th className="p-3">Fecha</th><th className="p-3">Gremio</th><th className="p-3">Cajero</th><th className="p-3">N.º ventas</th><th className="p-3">Total</th></tr></thead><tbody>{report.summary.map((row) => <tr key={`${row.fecha}:${row.gremio}:${row.cajero}`} className="border-t"><td className="p-3">{row.fecha}</td><td className="p-3">{gremioLabels[row.gremio] ?? row.gremio}</td><td className="p-3">{row.cajero}</td><td className="p-3">{row.ventas}</td><td className="p-3 font-bold">{money(row.total)}</td></tr>)}{!report.summary.length && <tr><td colSpan="5" className="p-6 text-center text-zinc-500">Sin datos agregados para este periodo.</td></tr>}</tbody></table></div>
      <details className="overflow-hidden rounded-2xl border bg-white"><summary className="cursor-pointer p-4 font-bold">Ver historial detallado de ventas</summary><div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-zinc-100 text-xs uppercase text-zinc-500"><tr><th className="p-3">Fecha</th><th className="p-3">Gremio</th><th className="p-3">Cajero</th><th className="p-3">Pago</th><th className="p-3">Total</th></tr></thead><tbody>{report.sales.map((sale) => <tr key={sale.saleKey} className="border-t"><td className="p-3">{new Date(sale.createdAt).toLocaleString('es-CO')}</td><td className="p-3">{gremioLabels[sale.gremio] ?? sale.gremio}</td><td className="p-3">{sale.user?.name ?? 'Usuario'}</td><td className="p-3">{sale.paymentMethod}</td><td className="p-3 font-bold">{money(sale.total)}</td></tr>)}{!report.sales.length && <tr><td colSpan="5" className="p-8 text-center text-zinc-500">No hay ventas en el periodo seleccionado.</td></tr>}</tbody></table></div></details>
    </section>}

    {tab === 'accounting' && <section className="mt-5 space-y-5">
      {adminPlanHasFeature(currentPlan, 'accounting') ? <>
        <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold">Desde<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="mt-1 w-full rounded-lg border bg-white p-2.5" /></label><label className="text-sm font-semibold">Hasta<input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="mt-1 w-full rounded-lg border bg-white p-2.5" /></label></div>
        <div className="grid gap-3 sm:grid-cols-3">
          <article className="rounded-2xl border bg-white p-5"><p className="text-xs uppercase tracking-wide text-zinc-500">Ingresos por ventas</p><p className="mt-2 text-2xl font-black">{money(accountingReport.income)}</p><p className="mt-1 text-xs text-zinc-500">{accountingReport.tickets} tickets</p></article>
          <article className="rounded-2xl border bg-white p-5"><p className="text-xs uppercase tracking-wide text-zinc-500">Egresos / gastos registrados</p><p className="mt-2 text-2xl font-black">{money(accountingReport.expenses)}</p><p className="mt-1 text-xs text-zinc-500">{accountingReport.expenseCount} registros</p></article>
          <article className="rounded-2xl border bg-white p-5"><p className="text-xs uppercase tracking-wide text-zinc-500">Resultado neto operativo</p><p className={`mt-2 text-2xl font-black ${accountingReport.net < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>{money(accountingReport.net)}</p></article>
        </div>
        <p className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">El resultado se calcula como ventas menos gastos registrados. No descuenta costo de mercancía porque las ventas históricas no guardan el costo unitario.</p>
        <form onSubmit={submitExpense} className="grid gap-3 rounded-2xl border bg-white p-5 sm:grid-cols-2 xl:grid-cols-5">
          <h2 className="font-black sm:col-span-2 xl:col-span-5">Registrar gasto</h2>
          <label className="text-sm font-semibold">Descripción<input required minLength="2" maxLength="160" name="description" placeholder="Ej. Pago de servicios" className="mt-1 w-full rounded-lg border p-2.5 font-normal" /></label>
          <label className="text-sm font-semibold">Categoría<input required minLength="2" maxLength="60" name="category" placeholder="Servicios, transporte…" className="mt-1 w-full rounded-lg border p-2.5 font-normal" /></label>
          <label className="text-sm font-semibold">Valor COP<input required type="number" min="1" step="1" name="amount" className="mt-1 w-full rounded-lg border p-2.5 font-normal" /></label>
          <label className="text-sm font-semibold">Fecha<input required type="date" name="date" defaultValue={to} className="mt-1 w-full rounded-lg border p-2.5 font-normal" /></label>
          <button type="submit" disabled={expenseBusy} className="self-end rounded-xl bg-vexora-600 px-4 py-2.5 font-bold text-white disabled:opacity-50">{expenseBusy ? 'Guardando…' : 'Guardar gasto'}</button>
          {expenseError && <p role="alert" className="text-sm text-rose-700 sm:col-span-2 xl:col-span-5">{expenseError}</p>}
        </form>
        <div className="overflow-x-auto rounded-2xl border bg-white">
          <table className="w-full min-w-[600px] text-left text-sm"><thead className="bg-zinc-100 text-xs uppercase text-zinc-500"><tr><th className="p-3">Fecha</th><th className="p-3">Descripción</th><th className="p-3">Categoría</th><th className="p-3">Registró</th><th className="p-3">Valor</th></tr></thead><tbody>
            {accountingReport.expenseRecords.map((expense) => <tr key={expense._id} className="border-t"><td className="p-3">{new Date(expense.spentAt).toLocaleDateString('es-CO')}</td><td className="p-3">{expense.description}</td><td className="p-3">{expense.category}</td><td className="p-3">{expense.createdBy?.name ?? 'Usuario'}</td><td className="p-3 font-bold">{money(expense.amount)}</td></tr>)}
            {!accountingReport.expenseRecords.length && <tr><td colSpan="5" className="p-6 text-center text-zinc-500">No hay gastos registrados en este periodo.</td></tr>}
          </tbody></table>
        </div>
        {accountingReport.truncated && <p className="text-sm text-amber-800">Se muestran los 300 gastos más recientes de este periodo.</p>}
      </> : <UpgradeNotice feature="accounting" currentPlan={currentPlan} />}
    </section>}

    {tab === 'inventory' && <section className="mt-5 space-y-5">
      <label className="block max-w-sm text-sm font-semibold">Gremio<select value={reportGremio} onChange={(event) => setReportGremio(event.target.value)} className="mt-1 w-full rounded-lg border bg-white p-2.5">{(tenant.gremios ?? []).map((id) => <option key={id} value={id}>{gremioLabels[id] ?? id}</option>)}</select></label>
      <div className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-2xl border bg-white p-5"><p className="text-xs uppercase tracking-wide text-zinc-500">Productos</p><p className="mt-2 text-2xl font-black">{inventoryForGremio.metrics.products ?? 0}</p></article>
        <article className="rounded-2xl border bg-white p-5"><p className="text-xs uppercase tracking-wide text-zinc-500">Stock crítico</p><p className="mt-2 text-2xl font-black">{inventoryForGremio.metrics.criticalStock ?? 0}</p></article>
        <article className="rounded-2xl border bg-white p-5"><p className="text-xs uppercase tracking-wide text-zinc-500">Valor al costo registrado</p><p className="mt-2 text-2xl font-black">{money(inventoryForGremio.metrics.stockValue ?? 0)}</p></article>
      </div>
      <div className="flex flex-wrap gap-2">
        {adminPlanHasFeature(currentPlan, 'a4InventoryReport') ? <button type="button" onClick={() => { try { printInventoryA4() } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo imprimir el reporte.') } }} className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white"><Printer className="h-4 w-4" />Imprimir reporte A4</button> : <UpgradeNotice feature="a4InventoryReport" currentPlan={currentPlan} />}
        {adminPlanHasFeature(currentPlan, 'thermalInventoryReport') ? <button type="button" onClick={() => { try { printInventoryThermal(inventoryForGremio) } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo imprimir el reporte térmico.') } }} className="inline-flex items-center gap-2 rounded-xl bg-vexora-600 px-4 py-2.5 text-sm font-bold text-white"><Printer className="h-4 w-4" />Imprimir reporte térmico</button> : <UpgradeNotice feature="thermalInventoryReport" currentPlan={currentPlan} />}
      </div>
      <div role="region" aria-label="Lista de productos del inventario" tabIndex={0} className="max-h-[min(26dvh,220px)] overflow-auto overscroll-contain rounded-2xl border bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vexora-600 sm:max-h-[min(30dvh,300px)]"><table className="w-full min-w-[700px] text-left text-sm"><thead className="sticky top-0 bg-zinc-100 text-xs uppercase text-zinc-500"><tr><th className="p-3">Producto</th><th className="p-3">Categoría</th><th className="p-3">Existencia</th><th className="p-3">Costo unitario</th><th className="p-3">Valor en stock</th></tr></thead><tbody>{inventoryForGremio.products.map((product) => <tr key={product.id} className={`border-t ${product.stock <= 5 ? 'bg-amber-50' : ''}`}><td className="p-3 font-semibold">{product.name}</td><td className="p-3">{product.category}</td><td className="p-3">{product.stock} {product.unit}</td><td className="p-3">{money(product.cost)}</td><td className="p-3 font-bold">{money(product.stockValue)}</td></tr>)}{!inventoryForGremio.products.length && <tr><td colSpan="5" className="p-6 text-center text-zinc-500">No hay productos guardados para este gremio.</td></tr>}</tbody></table></div>
      <div className="inventory-report-a4">
        <h1>Reporte de inventario · {gremioLabels[reportGremio] ?? reportGremio}</h1>
        <p>{tenant.business?.name ?? 'Vexora POS'} · {new Date().toLocaleString('es-CO')}</p>
        <p>Productos: {inventoryForGremio.metrics.products ?? 0} · Stock crítico: {inventoryForGremio.metrics.criticalStock ?? 0} · Valor al costo: {money(inventoryForGremio.metrics.stockValue ?? 0)}</p>
        <table><thead><tr><th>Producto</th><th>Categoría</th><th>Existencia</th><th>Costo unitario</th><th>Valor stock</th></tr></thead><tbody>{inventoryForGremio.products.map((product) => <tr key={product.id}><td>{product.name}</td><td>{product.category}</td><td>{product.stock} {product.unit}</td><td>{money(product.cost)}</td><td>{money(product.stockValue)}</td></tr>)}</tbody></table>
      </div>
    </section>}

    {tab === 'cash' && <section className="mt-5 space-y-5">
      <label className="block max-w-sm text-sm font-semibold">Gremio<select value={reportGremio} onChange={(event) => setReportGremio(event.target.value)} className="mt-1 w-full rounded-lg border bg-white p-2.5">{(tenant.gremios ?? []).map((id) => <option key={id} value={id}>{gremioLabels[id] ?? id}</option>)}</select></label>
      <CashRegister key={reportGremio} gremio={reportGremio || tenant.gremios?.[0]} />
    </section>}

    {tab === 'users' && <section className="mt-5 grid gap-5 lg:grid-cols-[1fr_1fr]">
      <form onSubmit={submitUser} className="space-y-3 rounded-2xl border bg-white p-5"><h2 className="text-lg font-black">Crear usuario</h2>
        <input required name="name" minLength="2" maxLength="120" placeholder="Nombre" className="w-full rounded-lg border p-3" />
        <input required name="email" type="email" placeholder="Correo electrónico" className="w-full rounded-lg border p-3" />
        <input required name="password" type="password" minLength="10" maxLength="72" placeholder="Contraseña (mínimo 10 caracteres)" className="w-full rounded-lg border p-3" />
        <input required name="passwordConfirmation" type="password" minLength="10" maxLength="72" placeholder="Verificar contraseña" className="w-full rounded-lg border p-3" />
        <label className="block text-sm font-semibold">Gremio<select value={gremio} onChange={(event) => setGremio(event.target.value)} className="mt-1 w-full rounded-lg border bg-white p-3">{tenant.gremios?.map((id) => <option key={id} value={id}>{gremioLabels[id] ?? id}</option>)}</select></label>
        <label className="block text-sm font-semibold">Sucursal<select required name="sucursal" className="mt-1 w-full rounded-lg border bg-white p-3">{branchesForGremio.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
        <label className="block text-sm font-semibold">Rol<select name="role" className="mt-1 w-full rounded-lg border bg-white p-3"><option value="CAJERO">Cajero</option><option value="VENDEDOR">Vendedor</option><option value="ADMIN">Administrador de sucursal</option><option value="COCINA">Cocina</option></select></label>
        <p className="text-xs text-zinc-500">El usuario queda asignado de forma permanente a un solo gremio y sucursal; no podrá cambiarlos desde su cuenta.</p>
        <button className="inline-flex items-center gap-2 rounded-xl bg-vexora-600 px-4 py-3 font-bold text-white"><Plus className="h-4 w-4" />Crear usuario</button>
      </form>
      <div className="space-y-4">
        <form onSubmit={submitBranch} className="flex flex-wrap items-end gap-3 rounded-2xl border bg-white p-5"><label className="min-w-40 flex-1 text-sm font-semibold">Nueva sucursal<input name="branchName" required minLength="2" maxLength="120" placeholder="Nombre de sucursal" className="mt-1 w-full rounded-lg border p-3" /></label><button className="rounded-xl border border-zinc-300 px-4 py-3 font-bold">Añadir sucursal</button></form>
        <div className="overflow-x-auto rounded-2xl border bg-white"><div className="grid min-w-[900px] grid-cols-[1.2fr_130px_1fr_1fr_110px_90px] gap-2 bg-zinc-100 p-3 text-[10px] font-bold uppercase text-zinc-500"><span>Usuario</span><span>Rol</span><span>Gremio</span><span>Sucursal</span><span>Estado</span><span>Acción</span></div>{users.map((user) => <UserEditor key={user._id} user={user} branches={branches} gremios={tenant.gremios ?? []} onSave={saveUser} />)}{!users.length && <p className="p-6 text-center text-sm text-zinc-500">Todavía no hay usuarios cargados.</p>}</div>
      </div>
    </section>}

    {tab === 'activity' && <section className="mt-5 overflow-x-auto rounded-2xl border bg-white"><table className="w-full min-w-[600px] text-left text-sm"><thead className="bg-zinc-100 text-xs uppercase text-zinc-500"><tr><th className="p-3">Fecha y hora</th><th className="p-3">Usuario</th><th className="p-3">Actividad</th><th className="p-3">Detalle</th></tr></thead><tbody>{activity.map((entry) => <tr key={entry._id} className="border-t"><td className="p-3">{new Date(entry.createdAt).toLocaleString('es-CO')}</td><td className="p-3">{entry.actorName}</td><td className="p-3">{entry.action}</td><td className="p-3">{entry.detail}</td></tr>)}{!activity.length && <tr><td colSpan="4" className="p-8 text-center text-zinc-500">Aún no hay actividad registrada.</td></tr>}</tbody></table></section>}

    {tab === 'licenses' && isSuperAdmin && <section className="mt-5 space-y-4">{licenses.map((license) => <LicenseRow key={license._id} license={license} onSave={updateTenantGremios} />)}{!licenses.length && <p className="rounded-xl border bg-white p-6 text-zinc-500">No hay licencias registradas.</p>}</section>}
    </section>
  </div></main>
}

function LicenseRow({ license, onSave }) {
  const [selected, setSelected] = useState(license.tenant?.gremios ?? [])
  const tenant = license.tenant
  if (!tenant) return null
  function toggle(id) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length < 3 ? [...current, id] : current)
  }
  return <article className="rounded-2xl border bg-white p-5">
    <header className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-black">{tenant.name}</h2><p className="text-sm text-zinc-500">{tenant.email} · {license.plan} · {license.status}</p></div><p className="text-xs text-zinc-500">Vence: {license.validUntil ? new Date(license.validUntil).toLocaleDateString('es-CO') : 'sin vigencia'}</p></header>
    <fieldset className="mt-4"><legend className="text-sm font-bold">Gremios asignados (máximo 3)</legend><div className="mt-2 flex flex-wrap gap-2">{allGremios.map((id) => <label key={id} className="rounded-lg border px-3 py-2 text-sm"><input type="checkbox" checked={selected.includes(id)} disabled={!selected.includes(id) && selected.length >= 3} onChange={() => toggle(id)} /> <span className="ml-1">{gremioLabels[id]}</span></label>)}</div></fieldset>
    <button type="button" disabled={!selected.length} onClick={() => onSave(license, selected)} className="mt-4 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">Guardar asignación</button>
  </article>
}
