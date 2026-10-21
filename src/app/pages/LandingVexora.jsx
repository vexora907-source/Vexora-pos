import { ArrowRight, Check, ShieldCheck, Sparkles, Store } from 'lucide-react'
import { GREMIOS } from '../components/GremioSelector.jsx'
import { clearRegistrationDraft } from '../../shared/services/registrationDraft.js'
import { saveTenant, startDemoMode } from '../../shared/services/tenantStorage.js'
import { PricingCalculator } from '../components/PricingCalculator.jsx'
import FooterPro from '../../components/FooterPro.jsx'

const benefits = ['Un POS diseñado para cómo trabaja tu negocio', 'Agrega más de un gremio a tu cuenta', 'Caja, pagos y atención en un solo lugar']
const gremioTones = {
  blue: 'bg-blue-100',
  zinc: 'bg-zinc-200',
  amber: 'bg-amber-100',
}

export default function LandingVexora() {
  function enterDemo(openTutorial = false) {
    clearRegistrationDraft()
    startDemoMode()
    saveTenant({
      business: {
        name: 'Demo Vexora POS',
        owner: 'Usuario Demo',
        email: 'demo@vexorapos.local',
        phone: '',
      },
      gremios: GREMIOS.map(({ id }) => id),
      sucursales: GREMIOS.map(({ id }) => ({ id: `demo-${id}`, name: 'Principal', gremio: id })),
      plan: 'VEXORA',
      dian: { enabled: false, status: 'disabled' },
      user: { id: 'demo-owner', userCode: '000000', name: 'Usuario Demo', email: 'demo@vexorapos.local', role: 'OWNER' },
      isDemo: true,
    })
    window.location.assign(openTutorial ? '/pos?tutorial=gremio' : '/pos')
  }

  return (
    <main className="min-h-screen overflow-hidden bg-white">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <a href="/" aria-label="Vexora POS, inicio" className="flex items-center gap-2.5 font-black tracking-tight"><img src="/logo/logo-vexoraia.png" alt="Vexoraia" className="h-14 w-14 object-contain" /><span>VEXORA<span className="text-vexora-600">POS</span></span></a>
        <nav className="flex items-center gap-3">
          <a href="/login" className="rounded-full px-4 py-2.5 text-sm font-semibold text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900">Iniciar sesión</a>
          <a href="/register" className="rounded-full border border-zinc-200 px-5 py-2.5 text-sm font-semibold hover:border-vexora-500 hover:text-vexora-700">Iniciar configuración <ArrowRight className="ml-1 inline h-4 w-4" /></a>
          <button id="demo" type="button" onClick={() => enterDemo()} className="rounded-full bg-vexora-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-vexora-700">Probar demo</button>
        </nav>
      </header>
      <section id="gremios" className="relative mx-auto grid max-w-7xl items-center gap-14 px-6 pb-24 pt-16 lg:grid-cols-[1.05fr_.95fr] lg:pt-24">
        <div className="absolute -left-40 top-20 -z-0 h-96 w-96 rounded-full bg-blue-100/70 blur-3xl" />
        <div className="relative z-10">
          <p className="inline-flex items-center gap-2 rounded-full border border-vexora-100 bg-vexora-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-vexora-700"><Sparkles className="h-4 w-4" />Una plataforma. Tu forma de trabajar.</p>
          <h1 className="mt-6 max-w-2xl text-5xl font-black leading-[1.06] tracking-tight text-zinc-950 sm:text-6xl">El POS hecho <span className="text-vexora-600">para tu negocio.</span></h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-600">Papelería, cerrajería, restaurante o ferretería: Vexora adapta la experiencia de venta a tu negocio. Combina varios gremios en una misma cuenta.</p>
          <a href="/register" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-vexora-600 px-6 py-4 font-bold text-white shadow-lg shadow-vexora-600/20 transition hover:bg-vexora-700">Configurar mi negocio <ArrowRight className="h-5 w-5" /></a>
          <ul className="mt-8 space-y-3">{benefits.map((benefit) => <li key={benefit} className="flex items-center gap-3 text-sm text-zinc-600"><Check className="h-5 w-5 text-emerald-600" />{benefit}</li>)}</ul>
        </div>
        <div className="relative z-10 rounded-[2rem] border border-zinc-200 bg-zinc-50 p-5 shadow-2xl shadow-zinc-200/70 sm:p-8">
          <div className="flex items-center justify-between"><div><p className="text-sm font-semibold text-zinc-500">Tu espacio de trabajo</p><h2 className="mt-1 text-2xl font-black">Un POS, varios gremios</h2></div><span className="grid h-12 w-12 place-items-center rounded-2xl bg-vexora-100 text-vexora-700"><Store /></span></div>
          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {GREMIOS.map((gremio) => <div key={gremio.id} className="rounded-2xl border border-zinc-200 bg-white p-4"><span className={`grid h-12 w-12 place-items-center rounded-xl text-2xl ${gremioTones[gremio.color]}`}>{gremio.icon}</span><p className="mt-3 font-bold">{gremio.name}</p><p className="mt-1 text-xs text-zinc-500">{gremio.desc}</p></div>)}
          </div>
          <div className="mt-4 flex items-center gap-3 rounded-2xl bg-zinc-900 p-4 text-white"><ShieldCheck className="h-6 w-6 text-emerald-400" /><p className="text-sm"><b>Todo bajo control</b><br /><span className="text-zinc-400">Ventas, caja y equipo en un solo lugar</span></p></div>
        </div>
      </section>
      <div id="planes" className="mx-auto max-w-7xl px-6 pb-24">
        <PricingCalculator
          gremioCount={1}
          showSelection={false}
          onChoosePlan={() => window.location.assign('/register')}
        />
        <p className="mt-4 text-center text-sm text-zinc-500">Completa el registro de tu comercio para continuar. El pago se realiza después desde tu cuenta.</p>
      </div>
      <FooterPro onTutorialsClick={() => enterDemo(true)} />
    </main>
  )
}
