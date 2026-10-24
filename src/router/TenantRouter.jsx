import { useCallback, useEffect, useState } from 'react'
import { Banknote, LogOut, ShoppingBag } from 'lucide-react'
import LandingVexora from '../app/pages/LandingVexora.jsx'
import { GREMIOS } from '../app/components/GremioSelector.jsx'
import Register from '../app/pages/Register.jsx'
import Login from '../app/pages/Login.jsx'
import OnboardingGremios from '../app/pages/OnboardingGremios.jsx'
import OnboardingDIAN from '../app/pages/OnboardingDIAN.jsx'
import Billing from '../app/pages/Billing.jsx'
import Admin from '../app/pages/Admin.jsx'
import Configuration from '../app/pages/Configuration.jsx'
import { useTenantGremio } from '../shared/hooks/useTenantGremio.js'
import { DianStatus } from '../shared/components/DianModule/DianStatus.jsx'
import PapeleriaPOS from '../pos/papeleria/PapeleriaPOS.jsx'
import CerrajeriaPOS from '../pos/cerrajeria/CerrajeriaPOS.jsx'
import RestaurantePOS from '../pos/restaurante/RestaurantePOS.jsx'
import FerreteriaPOS from '../pos/ferreteria/FerreteriaPOS.jsx'
import TiendaPOS from '../pos/tienda/TiendaPOS.jsx'
import RopaPOS from '../pos/ropa/RopaPOS.jsx'
import ComidasRapidasPOS from '../pos/comidas_rapidas/ComidasRapidasPOS.jsx'
import { LicenseBlocked } from '../shared/components/LicenseBlocked.jsx'
import { CashRegister } from '../shared/components/CashRegister/CashRegister.jsx'
import { fetchLicenseStatus } from '../shared/services/licenseService.js'
import { clearAuthToken, getAuthToken } from '../shared/services/auth.js'
import { clearRegistrationDraft } from '../shared/services/registrationDraft.js'
import { clearTenant } from '../shared/services/tenantStorage.js'
import { readCashRegister } from '../shared/services/cashRegister.js'
import { OfflineStatus } from '../shared/components/OfflineStatus.jsx'
import { getCachedLicenseStatus } from '../shared/services/licenseService.js'
import { isNetworkUnavailable, canSellOffline } from '../shared/services/offlineSales.js'
import { TutorialGremio } from '../app/components/TutorialGremio.jsx'
import { hasSeenTutorial, tutorialStorageKey } from '../shared/services/tutorial.js'
import { API_URL } from '../shared/services/api.js'

const views = { papeleria: PapeleriaPOS, cerrajeria: CerrajeriaPOS, restaurante: RestaurantePOS, ferreteria: FerreteriaPOS, tienda: TiendaPOS, ropa: RopaPOS, comidas_rapidas: ComidasRapidasPOS }
const gremioLabels = { papeleria: '📚 Papelería', cerrajeria: '🔑 Cerrajería', restaurante: '🍔 Restaurante', ferreteria: '🔧 Ferretería', tienda: '🛒 Tienda', ropa: '👕 Ropa', comidas_rapidas: '🍟 Comidas rápidas' }

function MultiGremioSwitcher({ gremios, activeGremio, onSelect }) {
  return (
    <nav className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-200 bg-white p-2">
      {gremios.map((id) => {
        const label = gremioLabels[id] ?? id
        return <button key={id} type="button" onClick={() => onSelect(id)} aria-pressed={activeGremio === id} className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${activeGremio === id ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'}`}>{label}</button>
      })}
      <a href="/billing" className="ml-auto rounded-xl px-3 py-2.5 text-sm font-semibold text-vexora-700 hover:bg-vexora-50">Plan y facturación</a>
    </nav>
  )
}

function DemoGremioManager({ gremios, onToggle }) {
  return (
    <section aria-label="Administrar gremios de la demo" className="mx-auto mt-3 grid max-w-[1500px] gap-2 rounded-2xl border border-violet-200 bg-violet-50 p-4 sm:grid-cols-2 lg:grid-cols-4">
      <p className="text-sm font-bold text-violet-950 sm:col-span-2 lg:col-span-4">Gremios de prueba · Los cambios se guardan solo en esta sesión demo.</p>
      {GREMIOS.map((gremio) => {
        const selected = gremios.includes(gremio.id)
        return <button key={gremio.id} type="button" aria-pressed={selected} onClick={() => onToggle(gremio.id)} className={`rounded-xl border px-3 py-2 text-left text-sm font-semibold ${selected ? 'border-violet-300 bg-white text-violet-900' : 'border-transparent bg-violet-100 text-violet-800'}`}>
          <span aria-hidden="true">{selected ? '✓ ' : '+ '}</span>{gremio.name}
        </button>
      })}
    </section>
  )
}

export default function TenantRouter() {
  const tenant = useTenantGremio()
  const { gremios, activeGremio, setActiveGremio, setGremios } = tenant
  const role = tenant.user?.role
  const canAdmin = role === 'OWNER' || role === 'SUPER_ADMIN'
  const accessibleGremios = role === 'COCINA'
    ? gremios.filter((gremio) => gremio === 'comidas_rapidas' && gremio === tenant.user?.gremio)
    : canAdmin ? gremios : gremios.filter((gremio) => gremio === tenant.user?.gremio)
  const tutorialGremio = accessibleGremios.includes(activeGremio) ? activeGremio : accessibleGremios[0]
  const tutorialPlan = tenant.plan ?? 'INICIO'
  const tutorialKey = tutorialGremio ? tutorialStorageKey(tenant, tutorialGremio, tutorialPlan) : ''
  const [path, setPath] = useState(window.location.pathname)
  const [posSection, setPosSection] = useState('sales')
  const [licenseState, setLicenseState] = useState({ checking: false, status: null, error: '', sessionExpired: false })
  const [showDemoGremios, setShowDemoGremios] = useState(false)
  const [showTutorial, setShowTutorial] = useState(false)

  const verifyLicense = useCallback(async () => {
    setLicenseState({ checking: true, status: null, error: '', sessionExpired: false })
    try {
      const status = await fetchLicenseStatus()
      setLicenseState({ checking: false, status, error: '', sessionExpired: false })
    } catch (cause) {
      if (isNetworkUnavailable(cause)) {
        try {
          const cachedStatus = await getCachedLicenseStatus()
          if (await canSellOffline(cachedStatus)) {
            setLicenseState({ checking: false, status: cachedStatus, error: '', sessionExpired: false })
            return
          }
        } catch (cacheError) {
          console.error('No se pudo validar la licencia local para trabajar sin conexión.', cacheError)
        }
      }
      setLicenseState({
        checking: false,
        status: null,
        error: cause instanceof Error ? cause.message : 'No se pudo validar la licencia.',
        sessionExpired: cause?.status === 401,
      })
    }
  }, [])

  useEffect(() => {
    if (path !== '/pos' || role === 'COCINA' || !tutorialGremio) {
      setShowTutorial(false)
      return
    }
    const url = new URL(window.location.href)
    if (url.searchParams.get('tutorial') === 'gremio') {
      url.searchParams.delete('tutorial')
      window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
      setShowTutorial(true)
      return
    }
    setShowTutorial(!hasSeenTutorial(tenant, tutorialGremio, tutorialPlan))
  }, [path, role, tutorialKey])

  function logout() {
    const openRegisters = gremios.filter((gremio) => readCashRegister(gremio)?.isOpen)
    if (openRegisters.length > 0) {
      const labels = openRegisters.map((gremio) => gremioLabels[gremio] ?? gremio).join(', ')
      const confirmed = window.confirm(
        `Tienes caja(s) abierta(s): ${labels}.\n\n¿Quieres cerrar sesión sin cerrar la caja? La caja y sus ventas se conservarán abiertas para cuando vuelvas a ingresar.`,
      )
      if (!confirmed) return
    }
    clearAuthToken()
    clearRegistrationDraft()
    clearTenant()
    window.location.assign(tenant.isDemo ? '/login' : '/')
  }

  useEffect(() => {
    const onPopState = () => {
      const nextPath = window.location.pathname
      const signedIn = tenant.isDemo || Boolean(getAuthToken())
      if (signedIn && ['/', '/login', '/register', '/onboarding', '/onboarding-dian'].includes(nextPath)) {
        window.history.replaceState(null, '', '/pos')
        setPath('/pos')
        return
      }
      setPath(nextPath)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [tenant.isDemo])

  useEffect(() => {
    const signedIn = tenant.isDemo || Boolean(getAuthToken())
    if (signedIn && ['/', '/login', '/register', '/onboarding', '/onboarding-dian'].includes(path)) {
      window.history.replaceState(null, '', '/pos')
      setPath('/pos')
    }
  }, [path, tenant.isDemo])

  useEffect(() => {
    if (path !== '/pos' || tenant.isDemo || !API_URL || !window.localStorage.getItem('vexora.accessToken')) {
      setLicenseState({ checking: false, status: null, error: '', sessionExpired: false })
      return
    }
    void verifyLicense()
  }, [path, verifyLicense])

  if (role === 'COCINA' && path !== '/pos') {
    return <main className="grid min-h-screen place-items-center bg-zinc-50 p-6"><section className="max-w-md rounded-2xl border bg-white p-6 text-center"><h1 className="text-xl font-black">Acceso de cocina</h1><p className="mt-2 text-sm text-zinc-600">Esta cuenta solo puede consultar y actualizar las comandas de comidas rápidas.</p><button type="button" onClick={logout} className="mt-5 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white">Cerrar sesión</button></section></main>
  }
  if (path === '/register') return <Register />
  if (path === '/login') return <Login />
  if (path === '/onboarding') return !tenant.isDemo && window.localStorage.getItem('vexora.accessToken') ? <LandingVexora /> : <OnboardingGremios />
  if (path === '/onboarding-dian') return !tenant.isDemo && window.localStorage.getItem('vexora.accessToken') ? <LandingVexora /> : gremios.length ? <OnboardingDIAN /> : <OnboardingGremios />
  if (path === '/billing') return <Billing />
  if (path === '/admin' || path === '/dashboard') return canAdmin ? <Admin /> : <Login />
  if (path === '/configuracion') return canAdmin ? <Configuration /> : <Login />
  const mustCheckLicense = path === '/pos' && !tenant.isDemo && Boolean(API_URL && window.localStorage.getItem('vexora.accessToken'))
  if (mustCheckLicense && (licenseState.checking || (!licenseState.status && !licenseState.error) || licenseState.error || licenseState.status?.blocked)) {
    return <LicenseBlocked
      status={licenseState.status}
      error={licenseState.checking ? 'Consultando el estado de tu plan…' : licenseState.error}
      sessionExpired={licenseState.sessionExpired}
      onRetry={verifyLicense}
      onLogin={() => {
        clearAuthToken()
        clearRegistrationDraft()
        clearTenant()
        window.location.assign('/login')
      }}
    />
  }
  if (path !== '/pos') return <LandingVexora />
  if (accessibleGremios.length === 0) {
    return role === 'COCINA'
      ? <main className="grid min-h-screen place-items-center bg-zinc-50 p-6"><section className="max-w-md rounded-2xl border bg-white p-6 text-center"><h1 className="text-xl font-black">Gremio no asignado</h1><p className="mt-2 text-sm text-zinc-600">La cuenta de cocina debe ser asignada a Comidas rápidas por el propietario.</p><button type="button" onClick={logout} className="mt-5 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white">Cerrar sesión</button></section></main>
      : <OnboardingGremios />
  }

  const effectiveGremio = accessibleGremios.includes(activeGremio) ? activeGremio : accessibleGremios[0]
  const SelectedPOS = views[effectiveGremio] ?? views[accessibleGremios[0]]
  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3 px-4 pt-4 sm:px-6"><a href="/" className="font-black tracking-tight">VEXORA <span className="text-vexora-600">POS</span></a><div className="flex flex-wrap items-center justify-end gap-3">{role !== 'COCINA' && <a href="/billing" className="text-sm font-semibold text-vexora-700 hover:text-vexora-900">Plan y facturación</a>}<p className="hidden text-xs font-medium text-zinc-500 sm:block">{tenant.isDemo ? 'Espacio de negocio · Vista de demostración' : `Negocio · ${tenant.business?.name ?? tenant.business?.email ?? ''}`}</p>{tenant.user?.userCode && <p className="text-xs font-semibold text-zinc-700">Código de usuario: {tenant.user.userCode}</p>}<button type="button" onClick={logout} className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 px-3 py-2 text-sm font-bold text-zinc-700 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"><LogOut className="h-4 w-4" />{tenant.isDemo ? 'Cambiar a cuenta de pruebas' : 'Cerrar sesión'}</button></div></header>
      {accessibleGremios.length > 1 && <div className="mx-auto max-w-[1500px] px-4 pt-4 sm:px-6"><MultiGremioSwitcher gremios={accessibleGremios} activeGremio={effectiveGremio} onSelect={setActiveGremio} /></div>}
      {!tenant.isDemo && tenant.user && <OfflineStatus />}
      {tenant.isDemo && <div className="mx-auto max-w-[1500px] px-4 pt-3 sm:px-6">
        <button type="button" aria-expanded={showDemoGremios} onClick={() => setShowDemoGremios((visible) => !visible)} className="rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm font-bold text-violet-800 hover:bg-violet-50">
          {showDemoGremios ? 'Cerrar gremios de prueba' : 'Agregar o quitar gremios de prueba'}
        </button>
        {showDemoGremios && <DemoGremioManager gremios={gremios} onToggle={(id) => {
          if (gremios.includes(id)) {
            if (gremios.length === 1) return
            setGremios(gremios.filter((gremio) => gremio !== id))
          } else {
            setGremios([...gremios, id])
          }
        }} />}
      </div>}
      {canAdmin && <div className="mx-auto flex max-w-[1500px] gap-2 px-4 pt-3 sm:px-6"><a href="/admin" className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 hover:border-vexora-500">Panel administrativo</a><a href="/configuracion" className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 hover:border-vexora-500">Configuración</a></div>}
      {role !== 'COCINA' && <div className="mx-auto max-w-[1500px] px-4 pt-4 sm:px-6"><DianStatus dian={tenant.dian} /></div>}
      {role !== 'COCINA' && <nav aria-label="Secciones del negocio" className="mx-auto mt-4 flex max-w-[1500px] gap-2 px-4 sm:px-6">
        <button type="button" aria-pressed={posSection === 'sales'} onClick={() => setPosSection('sales')} className={`inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition ${posSection === 'sales' ? 'bg-vexora-600 text-white' : 'border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100'}`}><ShoppingBag className="h-4 w-4" />Punto de venta</button>
        <button type="button" aria-pressed={posSection === 'cash'} onClick={() => setPosSection('cash')} className={`inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition ${posSection === 'cash' ? 'bg-vexora-600 text-white' : 'border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100'}`}><Banknote className="h-4 w-4" />Apertura y cierre de caja</button>
      </nav>}
      {role === 'COCINA' ? <SelectedPOS kitchenOnly /> : <div hidden={posSection !== 'sales'}><SelectedPOS /></div>}
      {posSection === 'cash' && <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <header className="mb-5">
          <p className="text-xs font-bold uppercase tracking-widest text-vexora-600">Gestión de caja</p>
          <h1 className="mt-1 text-3xl font-black">Apertura y cierre de caja</h1>
          <p className="mt-2 text-sm text-zinc-500">Registra la base inicial, concilia los pagos y consulta el historial del turno.</p>
        </header>
        <CashRegister key={activeGremio} gremio={activeGremio || gremios[0]} />
      </main>}
      {showTutorial && tutorialGremio && <TutorialGremio tenant={tenant} gremio={tutorialGremio} plan={tutorialPlan} onClose={() => setShowTutorial(false)} />}
    </div>
  )
}
