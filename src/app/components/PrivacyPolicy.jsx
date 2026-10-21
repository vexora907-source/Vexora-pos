import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

const whatsappLink = `https://wa.me/573247635413?text=${encodeURIComponent('Hola, tengo una consulta sobre la política de privacidad de Vexora POS.')}`

export default function PrivacyPolicy({ onClose }) {
  const closeButton = useRef(null)

  useEffect(() => {
    closeButton.current?.focus()
    function closeOnEscape(event) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="privacy-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      className="fixed inset-0 z-[80] overflow-y-auto bg-zinc-950/60 p-4 sm:p-6"
    >
      <section className="mx-auto my-4 max-w-4xl rounded-2xl bg-white shadow-2xl sm:my-8">
        <header className="sticky top-0 flex items-center justify-between gap-4 rounded-t-2xl border-b border-gray-100 bg-white px-5 py-4 sm:px-8">
          <div>
            <h2 id="privacy-title" className="text-lg font-black sm:text-xl">Política de privacidad - Vexora POS</h2>
            <p className="mt-1 text-xs text-gray-500">Última actualización: 21 de mayo de 2026</p>
          </div>
          <button ref={closeButton} type="button" onClick={onClose} aria-label="Cerrar política de privacidad" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-black">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="max-h-[75vh] space-y-6 overflow-y-auto px-5 py-6 text-sm leading-6 text-gray-700 sm:px-8">
          <section className="rounded-xl bg-gray-50 p-4">
            <p><strong>Responsable:</strong> VexoraIA S.A.S.</p>
            <p><strong>NIT:</strong> 1006180026-5</p>
            <p><strong>Domicilio:</strong> Cali, Valle del Cauca, Colombia.</p>
            <p><strong>Contacto:</strong> <a href="mailto:vexora907@gmail.com" className="font-semibold text-blue-700 underline">vexora907@gmail.com</a> · <a href={whatsappLink} target="_blank" rel="noreferrer" className="font-semibold text-blue-700 underline">+57 324 763 5413</a></p>
          </section>

          <section>
            <h3 className="font-bold text-gray-950">1. Qué datos recogemos</h3>
            <p className="mt-2"><strong>Del titular o administrador:</strong> nombre, cédula o NIT, teléfono, correo, nombre y dirección del negocio, logo, gremios y plan seleccionados, y los datos necesarios para crear y administrar la cuenta.</p>
            <p className="mt-2"><strong>Del negocio:</strong> productos, precios, costos e inventario; ventas, comprobantes y métodos de pago; y, cuando se usan funciones de fiados o apartados, los datos de contacto y saldos de los clientes finales que el comercio decida registrar. El comercio es responsable de contar con autorización para incluir los datos de sus clientes.</p>
            <p className="mt-2"><strong>Datos técnicos:</strong> información de uso, fecha y hora de actividad, registros de errores y datos técnicos del navegador o la impresión que sean necesarios para operar, proteger y dar soporte al servicio.</p>
            <p className="mt-2">Vexora POS no solicita las credenciales bancarias de los clientes finales ni recopila conversaciones de WhatsApp o ubicación GPS precisa. Los pagos se gestionan mediante el proveedor de pago que corresponda.</p>
          </section>

          <section>
            <h3 className="font-bold text-gray-950">2. Para qué usamos los datos</h3>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Crear, administrar y proteger la cuenta y sus gremios.</li>
              <li>Prestar las funciones de punto de venta, inventario, caja y soporte.</li>
              <li>Gestionar el plan, los pagos y la facturación de Vexora.</li>
              <li>Cuando el usuario activa la facturación electrónica, tramitar los datos de los documentos ante el proveedor tecnológico y la DIAN, y permitir su entrega al destinatario indicado.</li>
              <li>Diagnosticar fallos, atender solicitudes y mejorar el servicio con información de uso.</li>
              <li>Enviar avisos operativos relacionados con la cuenta. Los mensajes promocionales se enviarán solo si el titular los autoriza y podrá solicitar que cesen.</li>
            </ul>
            <p className="mt-2"><strong>Base del tratamiento:</strong> la ejecución del servicio solicitado, el cumplimiento de obligaciones legales y las autorizaciones otorgadas por el titular, según el tipo de dato y finalidad.</p>
          </section>

          <section>
            <h3 className="font-bold text-gray-950">3. Quién puede tratar los datos</h3>
            <p className="mt-2">No vendemos los datos personales. Podemos compartirlos únicamente con proveedores que se requieran para alojar y operar la plataforma, procesar pagos, prestar soporte o gestionar facturación electrónica. El acceso se limita a lo necesario para cada servicio y se sujeta a las obligaciones de confidencialidad y protección aplicables.</p>
            <p className="mt-2">Los datos del inventario, ventas y clientes finales pertenecen al comercio. El soporte solo debe acceder a ellos cuando sea necesario para atender una solicitud autorizada.</p>
          </section>

          <section>
            <h3 className="font-bold text-gray-950">4. Tiempo de conservación</h3>
            <p className="mt-2">Conservamos la información mientras la cuenta esté activa y durante el tiempo adicional necesario para atender solicitudes, resolver obligaciones pendientes y cumplir la ley. De acuerdo con los Términos y Condiciones, después de la cancelación o terminación por falta de pago, los datos de la cuenta pueden eliminarse una vez transcurrido el periodo de hasta 60 días. Los documentos contables y tributarios se conservarán por los plazos legales aplicables.</p>
            <p className="mt-2">El titular puede solicitar una exportación de los datos disponibles antes de que se eliminen, contactándonos por los canales indicados en esta política.</p>
          </section>

          <section>
            <h3 className="font-bold text-gray-950">5. Derechos de los titulares</h3>
            <p className="mt-2">De acuerdo con la Ley 1581 de 2012 y normas aplicables, puedes conocer, actualizar y rectificar tus datos; solicitar prueba de la autorización; conocer el uso dado a tus datos; presentar quejas ante la Superintendencia de Industria y Comercio; revocar la autorización o solicitar la supresión cuando proceda; y acceder gratuitamente a tus datos.</p>
            <p className="mt-2">Para ejercer estos derechos, escribe a <a href="mailto:vexora907@gmail.com" className="font-semibold text-blue-700 underline">vexora907@gmail.com</a> con el asunto “Habeas Data”. Atenderemos la solicitud dentro de los plazos previstos por la ley. También puedes acudir a la Superintendencia de Industria y Comercio, conforme al procedimiento legal.</p>
          </section>

          <section>
            <h3 className="font-bold text-gray-950">6. Seguridad</h3>
            <p className="mt-2">Aplicamos medidas técnicas y organizativas razonables para proteger los datos y limitar el acceso a personas autorizadas. Algunas funciones pueden guardar temporalmente información en el navegador, incluso en IndexedDB para operar sin conexión, y sincronizarla cuando se restablezca la conexión. El usuario debe proteger sus dispositivos y credenciales y permitir la sincronización de las ventas pendientes.</p>
            <p className="mt-2">Si ocurre un incidente que comprometa datos personales, se gestionará y notificará a los titulares y autoridades cuando corresponda conforme a la ley.</p>
          </section>

          <section>
            <h3 className="font-bold text-gray-950">7. Almacenamiento del navegador</h3>
            <p className="mt-2">La aplicación puede utilizar almacenamiento local o de sesión del navegador para mantener la sesión y guardar preferencias o datos operativos necesarios, incluidos datos de trabajo sin conexión. No usamos estos datos para vender perfiles publicitarios a terceros.</p>
          </section>

          <section>
            <h3 className="font-bold text-gray-950">8. Menores de edad</h3>
            <p className="mt-2">La cuenta debe ser creada por una persona con capacidad legal para contratar. El titular del negocio administra las cuentas de sus colaboradores y debe cumplir las normas aplicables cuando estos sean menores de edad.</p>
          </section>

          <section>
            <h3 className="font-bold text-gray-950">9. Transferencias y transmisión de datos</h3>
            <p className="mt-2">Algunos proveedores tecnológicos pueden tratar datos desde otros países. Cuando exista transmisión o transferencia internacional, Vexora adoptará las condiciones y salvaguardas exigidas por la normativa colombiana de protección de datos personales.</p>
          </section>

          <section>
            <h3 className="font-bold text-gray-950">10. Cambios a esta política</h3>
            <p className="mt-2">Podemos actualizar esta política para reflejar cambios en el servicio o en la normativa. Publicaremos la versión vigente e informaremos los cambios relevantes por los canales de contacto disponibles.</p>
          </section>

          <section>
            <h3 className="font-bold text-gray-950">11. Autorización</h3>
            <p className="mt-2">Al marcar la casilla de autorización durante el registro, declaras que conoces esta política y autorizas de manera previa, expresa e informada el tratamiento de tus datos personales para las finalidades necesarias para prestar y administrar Vexora POS, conforme a la Ley 1581 de 2012 y normas aplicables. La autorización para recibir información comercial es opcional y puede retirarse en cualquier momento.</p>
          </section>
        </div>
      </section>
    </div>
  )
}
