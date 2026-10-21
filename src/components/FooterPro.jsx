import { useEffect, useRef, useState } from 'react'
import { MessageCircle, X } from 'lucide-react'
import PrivacyPolicy from '../app/components/PrivacyPolicy.jsx'

const whatsappNumber = '573247635413'

function whatsappLink(message) {
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`
}

export default function FooterPro({ onTutorialsClick }) {
  const [termsOpen, setTermsOpen] = useState(false)
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const closeTermsButton = useRef(null)

  useEffect(() => {
    if (!termsOpen) return undefined

    closeTermsButton.current?.focus()
    function closeOnEscape(event) {
      if (event.key === 'Escape') setTermsOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [termsOpen])

  return (
    <>
      <footer className="border-t border-gray-100 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
            <div>
              <a href="/" aria-label="Vexora POS, inicio" className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-black text-sm font-bold text-white">V</span>
                <span className="text-[15px] font-bold tracking-tight">Vexora POS</span>
              </a>
              <p className="mt-3 text-sm leading-relaxed text-gray-500">
                Punto de venta multi-gremio con facturación electrónica DIAN. Hecho en cali para negocios de Colombia.
              </p>
              <a
                href={whatsappLink('Hola, quiero información sobre Vexora POS.')}
                target="_blank"
                rel="noreferrer"
                aria-label="Contactar a Vexora POS por WhatsApp"
                className="mt-4 inline-flex h-9 w-9 items-center justify-center rounded-full border bg-gray-50 text-gray-700 transition hover:bg-black hover:text-white"
              >
                <MessageCircle className="h-4 w-4" />
              </a>
            </div>

            <nav aria-label="Producto">
              <p className="text-sm font-semibold">Producto</p>
              <ul className="mt-4 space-y-3 text-sm text-gray-500">
                <li><a href="#planes" className="hover:text-black">Planes</a></li>
                <li><a href="#gremios" className="hover:text-black">Gremios</a></li>
                <li><a href="#demo" className="hover:text-black">Ver demo</a></li>
                <li><a href="#planes" className="hover:text-black">Modo offline</a></li>
              </ul>
            </nav>

            <nav aria-label="Soporte">
              <p className="text-sm font-semibold">Soporte</p>
              <ul className="mt-4 space-y-3 text-sm text-gray-500">
                <li><a href={whatsappLink('Hola, necesito ayuda con Vexora POS.')} target="_blank" rel="noreferrer" className="hover:text-black">Centro de ayuda</a></li>
                <li><button type="button" onClick={onTutorialsClick} className="text-left hover:text-black">Tutoriales por gremio</button></li>
                <li><a href={whatsappLink('Hola, quisiera consultar el estado del servicio Vexora POS.')} target="_blank" rel="noreferrer" className="hover:text-black">Estado del servicio</a></li>
                <li><a href={whatsappLink('Hola, quiero comunicarme con soporte de Vexora POS.')} target="_blank" rel="noreferrer" className="hover:text-black">WhatsApp</a></li>
              </ul>
            </nav>

            <nav aria-label="Información legal">
              <p className="text-sm font-semibold">Legal</p>
              <ul className="mt-4 space-y-3 text-sm text-gray-500">
                <li><button type="button" onClick={() => setTermsOpen(true)} className="text-left hover:text-black">Términos</button></li>
                <li><button type="button" onClick={() => setPrivacyOpen(true)} className="text-left hover:text-black">Privacidad</button></li>
                <li><a href="#planes" className="hover:text-black">Planes y facturación DIAN</a></li>
                <li className="pt-2">
                  <a href={whatsappLink('Hola, tengo una consulta sobre facturación electrónica DIAN.')} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs hover:border-gray-400 hover:text-black">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Consultas por WhatsApp
                  </a>
                </li>
              </ul>
            </nav>
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-gray-100 pt-6 md:flex-row">
            <p className="text-center text-xs text-gray-400 md:text-left">
              © {new Date().getFullYear()} Vexora POS · cali, Valle del Cauca, Colombia.
            </p>
            <p className="flex items-center gap-2 text-center text-xs text-gray-400">
              Hecho para comerciantes colombianos
              <a href={whatsappLink('Hola, quiero comunicarme con Vexora POS.')} target="_blank" rel="noreferrer" className="ml-2 inline-flex rounded-full border px-2 py-0.5 hover:text-black">
                324 763 5413
              </a>
            </p>
          </div>
        </div>
      </footer>

      {termsOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="terms-title"
          onClick={(event) => {
            if (event.target === event.currentTarget) setTermsOpen(false)
          }}
          className="fixed inset-0 z-50 overflow-y-auto bg-zinc-950/60 p-4 sm:p-6"
        >
          <section className="mx-auto my-4 max-w-4xl rounded-2xl bg-white shadow-2xl sm:my-8">
            <header className="sticky top-0 flex items-center justify-between gap-4 rounded-t-2xl border-b border-gray-100 bg-white px-5 py-4 sm:px-8">
              <div>
                <h2 id="terms-title" className="text-lg font-black sm:text-xl">Términos y condiciones - Vexora POS</h2>
                <p className="mt-1 text-xs text-gray-500">Última actualización: 21 de mayo de 2026</p>
              </div>
              <button ref={closeTermsButton} type="button" onClick={() => setTermsOpen(false)} aria-label="Cerrar términos y condiciones" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-black">
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="max-h-[75vh] space-y-6 overflow-y-auto px-5 py-6 text-sm leading-6 text-gray-700 sm:px-8">
              <p><strong>Razón Social:</strong> VexoraIA S.A.S. - Cali, Valle del Cauca, Colombia.</p>

              <section>
                <h3 className="font-bold text-gray-950">1. OBJETO</h3>
                <p className="mt-2">Vexora POS es un software como servicio (SaaS) de punto de venta multi-gremio, que incluye módulos de inventario, ventas, cierre de caja, administración y facturación electrónica habilitada ante la DIAN como proveedor tecnológico a través de aliado.</p>
                <p className="mt-2">Al contratar, crear cuenta o pagar cualquier plan, usted acepta estos términos.</p>
              </section>

              <section>
                <h3 className="font-bold text-gray-950">2. PLANES Y GREMIOS</h3>
                <p className="mt-2"><strong>2.1 Lógica de Gremios:</strong> Cada plan incluye un número de gremios activos simultáneos:</p>
                <ul className="mt-2 list-disc space-y-1 pl-6">
                  <li>Inicio ($79.000): 1 gremio.</li>
                  <li>Negocio ($149.000): 1 gremio potenciado.</li>
                  <li>Pro ($259.000): 2 gremios simultáneos.</li>
                  <li>Vexora ($399.000): 3 a 5 gremios.</li>
                </ul>
                <p className="mt-2">El cliente elige su gremio inicial (Tienda, Papelería, Ropa, Comidas Rápidas, Cerrajería, etc.). El cambio de gremio en Plan Inicio se permite 1 vez cada 30 días. En planes superiores, la activación de un nuevo gremio la realiza Vexora desde el Super Admin.</p>
                <p className="mt-2"><strong>2.2 Usuarios y Sucursales:</strong> El límite es por plan. Superar el límite requiere upgrade de plan. Está prohibido compartir un mismo usuario entre varios cajeros.</p>
              </section>

              <section>
                <h3 className="font-bold text-gray-950">3. PAGOS, FACTURACIÓN Y RENOVACIÓN</h3>
                <p className="mt-2"><strong>3.1</strong> Todos los precios están en pesos colombianos (COP) y no incluyen IVA si no se especifica. El pago es anticipado, mensual o anual.</p>
                <p className="mt-2"><strong>3.2</strong> La falta de pago en la fecha genera suspensión automática del servicio a las 72 horas. No se borran datos por 30 días. Después de 60 días sin pago, Vexora podrá eliminar la base de datos del cliente.</p>
                <p className="mt-2"><strong>3.3</strong> No hay reembolsos por meses no usados. Puede cancelar cuando quiera y el servicio seguirá activo hasta el fin del periodo pagado.</p>
                <p className="mt-2"><strong>3.4</strong> El costo de implementación presencial ($120.000 COP) es único y no reembolsable.</p>
              </section>

              <section>
                <h3 className="font-bold text-gray-950">4. FACTURACIÓN ELECTRÓNICA DIAN</h3>
                <p className="mt-2"><strong>4.1</strong> Vexora POS actúa como intermediario tecnológico. La responsabilidad tributaria, de consecutivos, CUFE y reporte a la DIAN es del CLIENTE como facturador.</p>
                <p className="mt-2"><strong>4.2</strong> Los planes incluyen un número de facturas: Inicio 0, Negocio 30, Pro 100, Vexora 250. Facturas adicionales tienen costo: $500 COP (Inicio/Negocio), $450 COP (Pro), $400 COP (Vexora).</p>
                <p className="mt-2"><strong>4.3</strong> Si la DIAN presenta intermitencia, Vexora guarda la factura en contingencia y la reintenta automáticamente. No nos hacemos responsables por sanciones DIAN por datos incorrectos del cliente (NIT, correo, IVA mal configurado).</p>
                <p className="mt-2"><strong>4.4</strong> El cliente debe tener su certificado digital y resolución de facturación vigente.</p>
              </section>

              <section>
                <h3 className="font-bold text-gray-950">5. SOPORTE Y DISPONIBILIDAD</h3>
                <p className="mt-2"><strong>5.1</strong> Soporte por WhatsApp: lunes a sábado, 8 a. m. - 8 p. m. Plan Pro y Vexora tienen soporte prioritario (&lt; 2 horas).</p>
                <p className="mt-2"><strong>5.2</strong> Garantizamos 99% de disponibilidad mensual. Mantenimientos programados se avisan con 24 h de anticipación.</p>
                <p className="mt-2"><strong>5.3 Modo Offline:</strong> El sistema permite vender sin internet. La sincronización es responsabilidad del cliente de reconectar el equipo. Vexora no responde por pérdida de datos si el navegador es borrado antes de sincronizar.</p>
              </section>

              <section>
                <h3 className="font-bold text-gray-950">6. OBLIGACIONES DEL CLIENTE</h3>
                <p className="mt-2">No usar el sistema para lavado de activos, venta de productos ilegales o alteración de precios para evasión. Vexora puede suspender sin previo aviso si detecta uso fraudulento.</p>
                <p className="mt-2">El cliente es responsable de sus claves, cierre de caja y arqueo. Compartir claves de administrador es bajo su riesgo.</p>
              </section>

              <section>
                <h3 className="font-bold text-gray-950">7. PROPIEDAD INTELECTUAL Y DATOS</h3>
                <p className="mt-2"><strong>7.1</strong> El software, código, marca Vexora POS y VexoraIA son propiedad de VexoraIA S.A.S. El cliente solo obtiene licencia de uso.</p>
                <p className="mt-2"><strong>7.2 Base de datos:</strong> El inventario, clientes y ventas son propiedad del CLIENTE. Vexora no usa ni vende esos datos. Al cancelar, el cliente puede pedir exportación completa en Excel por 30 días.</p>
                <p className="mt-2"><strong>7.3 Protección de Datos (Ley 1581 de 2012 - Habeas Data):</strong> Al usar Vexora, el cliente autoriza el tratamiento de datos de contacto para soporte y facturación. Puede solicitar eliminación escribiendo a <a href="mailto:vexora907@gmail.com" className="font-semibold text-blue-700 underline">vexora907@gmail.com</a>.</p>
              </section>

              <section>
                <h3 className="font-bold text-gray-950">8. LIMITACIÓN DE RESPONSABILIDAD</h3>
                <p className="mt-2">Vexora no es responsable por daños por mal uso de la impresora, pérdida de dinero por mala configuración de base de caja, cierres de la DIAN por incumplimiento del cliente ni fallas de internet del operador (Claro, Movistar, etc.). El monto máximo de responsabilidad de Vexora será el valor pagado por el cliente en el último mes.</p>
              </section>

              <section>
                <h3 className="font-bold text-gray-950">9. INSTALACIÓN Y HARDWARE</h3>
                <p className="mt-2">La impresora térmica, cajón monedero y lector de barras son propiedad del cliente. Vexora solo brinda configuración. No cubrimos garantía de hardware de terceros. La instalación en Yumbo/Cali incluida en Plan Vexora es una sola visita.</p>
              </section>

              <section>
                <h3 className="font-bold text-gray-950">10. MODIFICACIONES</h3>
                <p className="mt-2">Vexora puede actualizar precios y funciones avisando con 15 días de anticipación por correo. El uso continuado implica aceptación.</p>
              </section>

              <section>
                <h3 className="font-bold text-gray-950">11. LEY APLICABLE</h3>
                <p className="mt-2">Estos términos se rigen por las leyes de la República de Colombia. Cualquier controversia se resolverá en juzgados de Cali, Valle del Cauca.</p>
              </section>

              <section className="rounded-xl bg-gray-50 p-4">
                <h3 className="font-bold text-gray-950">CONTACTO</h3>
                <p className="mt-2">VexoraIA S.A.S.<br />Cali, Valle del Cauca</p>
                <p className="mt-2">WhatsApp: <a href={whatsappLink('Hola, tengo una consulta sobre los términos y condiciones.')} target="_blank" rel="noreferrer" className="font-semibold text-blue-700 underline">+57 3247635413</a></p>
                <p>Email: <a href="mailto:hola@vexoraia.com" className="font-semibold text-blue-700 underline">vexora907@gmail.com</a></p>
              </section>
            </div>
          </section>
        </div>
      )}
      {privacyOpen && <PrivacyPolicy onClose={() => setPrivacyOpen(false)} />}
    </>
  )
}
