import { formatCOP } from './ticket.js'

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character])
}

export function printUniversalTicket(ticket, target) {
  if (typeof window.print !== 'function') {
    throw new Error('Este navegador no ofrece impresión del sistema.')
  }

  const business = ticket.negocio ?? {}
  const isCashClosure = ticket.tipo === 'CIERRE'
  const date = new Date(ticket.createdAt ?? Date.now()).toLocaleString('es-CO')
  const copyLabel = ticket.copy ? '<div class="ticket-center"><strong>*** COPIA ***</strong></div>' : ''
  const codeBlock = ticket.codeImage
    ? `<div class="ticket-center"><img src="${escapeHtml(ticket.codeImage)}" alt="${ticket.tipoCodigo === 'BARCODE' ? 'Código de barras' : 'Código QR'}" style="max-width:100%;max-height:150px" /></div>`
    : ticket.tipoCodigo === 'BARCODE'
      ? '<div class="ticket-center">Falta el consecutivo de 12 dígitos</div>'
      : ''
  const products = (ticket.productos ?? []).map((product) => `
    <div class="ticket-item">
      <span>${escapeHtml(`x${product.cantidad} ${product.nombre}`)}</span>
      ${target === 'caja' && product.total !== undefined ? `<span>${escapeHtml(formatCOP(Number(product.total)))}</span>` : ''}
      ${product.nota ? `<small>${escapeHtml(`Nota: ${product.nota}`)}</small>` : ''}
    </div>
  `).join('')
    const details = isCashClosure ? `
      <div class="ticket-center"><strong>CIERRE DE CAJA</strong></div>
      <div class="ticket-rule"></div>
      ${(ticket.resumen ?? []).map((row) => `<div class="ticket-item"><span>${escapeHtml(row.label)}</span><strong>${escapeHtml(row.valor)}</strong></div>`).join('')}
      <div class="ticket-rule"></div>
      <strong>DESGLOSE DE EFECTIVO</strong>
      ${(ticket.desglose ?? []).map((row) => `<div class="ticket-item"><span>${escapeHtml(`${row.label} × ${row.cantidad}`)}</span><span>${escapeHtml(row.total)}</span></div>`).join('') || '<div>Sin efectivo contado</div>'}
    ` : target === 'caja' ? `
    <div class="ticket-rule"></div>
    <div>Factura: ${escapeHtml(ticket.numero || 'Venta')}</div>
    <div>Cliente: ${escapeHtml(ticket.cliente?.nombre || 'Cliente Final')}</div>
  ` : `<div class="ticket-center">COMANDA · ${escapeHtml(ticket.numero || 'Cocina')}</div>`
    const total = isCashClosure
      ? `<div class="ticket-total">${escapeHtml(ticket.resultado || 'CIERRE')}</div>`
      : target === 'caja' && ticket.total !== undefined
    ? `<div class="ticket-total">TOTAL: ${escapeHtml(formatCOP(Number(ticket.total)))}</div>`
    : ''
  const payment = target === 'caja' && ticket.paymentMethod
    ? `<div>Pago: ${escapeHtml(ticket.paymentMethod)}</div>`
    : ''
  const footer = escapeHtml(business.mensajeTicket || 'Gracias por su compra')
  const printRoot = document.createElement('div')
  printRoot.className = 'universal-thermal-ticket'
  printRoot.setAttribute('role', 'dialog')
  printRoot.setAttribute('aria-label', 'Ticket térmico')
  printRoot.innerHTML = `
    <header class="ticket-center">
      <strong>${escapeHtml(business.nombre || 'VEXORA POS')}</strong>
      ${business.nit ? `<div>NIT: ${escapeHtml(business.nit)}</div>` : ''}
      ${business.direccion ? `<div>${escapeHtml(business.direccion)}</div>` : ''}
    </header>
    <div class="ticket-rule"></div>
    <div>Fecha: ${escapeHtml(date)}</div>
    ${copyLabel}
    ${details}
    <div class="ticket-rule"></div>
    ${products}
    <div class="ticket-rule"></div>
    ${total}
    ${payment}
    ${codeBlock}
    <footer class="ticket-center">${footer}<br>VexoraIA POS</footer>
  `
  const cleanup = () => {
    window.removeEventListener('afterprint', cleanup)
    document.body.classList.remove('printing-universal-ticket')
    printRoot.remove()
  }
  document.body.append(printRoot)
  document.body.classList.add('printing-universal-ticket')
  window.addEventListener('afterprint', cleanup, { once: true })
  try {
    window.print()
  } catch (cause) {
    cleanup()
    throw cause
  }
}
