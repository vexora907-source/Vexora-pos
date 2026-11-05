import { apiRequest } from './api.js'
import { imprimirPosFirefox } from './firefoxPrint.js'
import { prepareTicketForPrinting } from './ticketCode.js'
import { printUniversalTicket } from './thermalPrint.js'
import { appStorage, isDemoMode } from './tenantStorage.js'

const encoder = new TextEncoder()
let selectedSerialPort = null
let selectedUsbDevice = null
const DEMO_CONFIG_KEY = 'vexora.business.config'

function escPosText(value) {
  return encoder.encode(`${String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7e\n]/g, '')}\n`)
}

function command(...bytes) {
  return new Uint8Array(bytes)
}

async function rasterizeLogo(source) {
  const image = new Image()
  image.crossOrigin = 'anonymous'
  image.src = source
  try {
    await image.decode()
  } catch {
    throw new Error('No se pudo cargar el logo para la impresora. Verifica que la URL de la imagen permita acceso desde Vexora.')
  }
  if (!image.naturalWidth || !image.naturalHeight) {
    throw new Error('El logo guardado no contiene una imagen imprimible.')
  }

  const scale = Math.min(1, 384 / image.naturalWidth, 120 / image.naturalHeight)
  const width = Math.max(1, Math.round(image.naturalWidth * scale))
  const height = Math.max(1, Math.round(image.naturalHeight * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('El navegador no pudo preparar el logo para la impresora.')
  context.fillStyle = '#fff'
  context.fillRect(0, 0, width, height)
  context.drawImage(image, 0, 0, width, height)

  let pixels
  try {
    pixels = context.getImageData(0, 0, width, height).data
  } catch {
    throw new Error('La imagen del logo no permite conversión para impresión. Usa una imagen del mismo sitio o habilita CORS en su servidor.')
  }
  const rowBytes = Math.ceil(width / 8)
  const bitmap = new Uint8Array(rowBytes * height)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixel = (y * width + x) * 4
      const luminance = pixels[pixel] * 0.299 + pixels[pixel + 1] * 0.587 + pixels[pixel + 2] * 0.114
      if (luminance < 160) bitmap[y * rowBytes + Math.floor(x / 8)] |= 0x80 >> (x % 8)
    }
  }
  return {
    width,
    height,
    data: btoa(String.fromCharCode(...bitmap)),
    printImage: canvas.toDataURL('image/png'),
  }
}

async function preparePrintableTicket(gremio, target, ticket) {
  const prepared = await prepareTicketForPrinting(gremio, ticket)
  if (target === 'caja' && prepared.negocio?.logo) {
    const logo = isDemoMode()
      ? prepared.negocio.logo
      : (await apiRequest(`/api/printers/${encodeURIComponent(gremio)}/ticket-logo`)).logoData
    if (typeof logo !== 'string' || !logo.startsWith('data:image/')) {
      throw new Error('El backend no devolvió una imagen válida para imprimir el logo.')
    }
    const raster = await rasterizeLogo(logo)
    prepared.negocio = {
      ...prepared.negocio,
      logoRaster: { width: raster.width, height: raster.height, data: raster.data },
      logoPrintImage: raster.printImage,
    }
  }
  return prepared
}

function qrCommands(value) {
  if (!value) return []
  const data = encoder.encode(String(value))
  const length = data.length + 3
  if (length > 65535) throw new Error('El enlace del código QR es demasiado largo para la impresora.')
  return [
    command(0x1d, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00),
    command(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, 0x06),
    command(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x30),
    command(0x1d, 0x28, 0x6b, length & 0xff, (length >> 8) & 0xff, 0x31, 0x50, 0x30),
    data,
    command(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30),
  ]
}

function barcodeCommands(value) {
  if (typeof value !== 'string' || !/^\d{12}$/.test(value)) return [escPosText('Codigo de barras no disponible: falta consecutivo de 12 digitos.')]
  const data = encoder.encode(`{B${value}`)
  return [
    command(0x1d, 0x48, 0x02),
    command(0x1d, 0x68, 0x50),
    command(0x1d, 0x77, 0x02),
    command(0x1d, 0x6b, 0x49, data.length),
    data,
    command(0x1d, 0x48, 0x00),
  ]
}

function logoCommands(logoRaster) {
  if (!logoRaster) return []
  const width = Number(logoRaster.width)
  const height = Number(logoRaster.height)
  if (!Number.isInteger(width) || width < 1 || width > 384 || !Number.isInteger(height) || height < 1 || height > 120) {
    throw new Error('Las dimensiones del logo no son válidas para impresión térmica.')
  }
  const rowBytes = Math.ceil(width / 8)
  const binary = atob(logoRaster.data)
  if (binary.length !== rowBytes * height) throw new Error('Los datos del logo están incompletos para impresión térmica.')
  const bitmap = Uint8Array.from(binary, (character) => character.charCodeAt(0))
  return [
    command(0x1d, 0x76, 0x30, 0x00, rowBytes & 0xff, rowBytes >> 8, height & 0xff, height >> 8),
    bitmap,
    command(0x0a),
  ]
}

function makeReceiptBytes(ticket, target) {
  const bytes = [
    command(0x1b, 0x40),
    command(0x1b, 0x61, 0x01),
    ...(target === 'caja' ? logoCommands(ticket.negocio?.logoRaster) : []),
    command(0x1b, 0x45, 0x01),
    escPosText(ticket.negocio?.nombre || 'VEXORA POS'),
    command(0x1b, 0x45, 0x00),
    escPosText(target === 'cocina' ? `COCINA · ${ticket.numero || 'Comanda'}` : 'TICKET / FACTURA'),
    escPosText('--------------------------------'),
    command(0x1b, 0x61, 0x00),
    ...(target === 'caja' ? [
      escPosText(`Factura: ${ticket.numero || 'Venta'}`),
      escPosText(`Cliente: ${ticket.cliente?.nombre || 'Cliente Final'}`),
    ] : []),
    ...(ticket.copy ? [
      command(0x1b, 0x61, 0x01),
      command(0x1b, 0x45, 0x01),
      escPosText('*** COPIA ***'),
      command(0x1b, 0x45, 0x00),
      command(0x1b, 0x61, 0x00),
    ] : []),
    ...(ticket.productos ?? []).flatMap((product) => [
      escPosText(`x${product.cantidad} ${product.nombre}${target === 'caja' ? `  ${product.total ?? ''}` : ''}`),
      ...(product.nota ? [escPosText(`  Nota: ${product.nota}`)] : []),
    ]),
    escPosText('--------------------------------'),
    command(0x1b, 0x61, 0x02),
    ...(target === 'caja' && ticket.total !== undefined ? [escPosText(`TOTAL: ${ticket.total}`)] : []),
    ...(target === 'caja' && ticket.paymentMethod ? [escPosText(`Pago: ${ticket.paymentMethod}`)] : []),
    ...(target === 'caja' && ticket.cashReceived !== undefined ? [
      escPosText(`Recibido: ${ticket.cashReceived}`),
      escPosText(`Devuelta: ${ticket.changeDue ?? 0}`),
    ] : []),
    command(0x1b, 0x61, 0x01),
    ...(target === 'caja' ? ticket.tipoCodigo === 'BARCODE' ? barcodeCommands(ticket.barcode12) : qrCommands(ticket.qrValue ?? ticket.qrUrl) : []),
    escPosText(ticket.negocio?.mensajeTicket || 'Gracias por su compra'),
    command(0x1d, 0x56, 0x00),
  ]
  const size = bytes.reduce((sum, chunk) => sum + chunk.length, 0)
  const result = new Uint8Array(size)
  let offset = 0
  for (const chunk of bytes) {
    result.set(chunk, offset)
    offset += chunk.length
  }
  return result
}

async function printWebSerial(ticket, target, requestPort) {
  if (typeof navigator.serial?.getPorts !== 'function') {
    throw new Error('Este navegador no permite Web Serial. Usa Chrome en un equipo con soporte de puerto serie USB.')
  }
  const ports = await navigator.serial.getPorts()
  const port = requestPort
    ? await navigator.serial.requestPort()
    : selectedSerialPort ?? (ports.length === 1 ? ports[0] : null)
  if (!port) throw new Error('No hay un puerto USB único ya autorizado. Abre Configuración y usa Probar impresión para seleccionar uno.')
  selectedSerialPort = port
  await port.open({ baudRate: 9600 })
  try {
    const writer = port.writable?.getWriter()
    if (!writer) throw new Error('La impresora no expone un puerto serie escribible.')
    try {
      await writer.write(makeReceiptBytes(ticket, target))
    } finally {
      writer.releaseLock()
    }
  } finally {
    await port.close()
  }
}

async function getUsbPrinter(requestDevice) {
  if (!('usb' in navigator)) {
    throw new Error('Este navegador no permite USB directo. Usa Chrome o Edge actualizado.')
  }
  if (requestDevice) {
    return navigator.usb.requestDevice({ acceptAllDevices: true })
  }

  const devices = await navigator.usb.getDevices()
  const authorized = selectedUsbDevice && devices.find((device) => (
    device.vendorId === selectedUsbDevice.vendorId
    && device.productId === selectedUsbDevice.productId
    && device.serialNumber === selectedUsbDevice.serialNumber
  ))
  const device = authorized ?? (devices.length === 1 ? devices[0] : null)
  if (!device) {
    throw new Error('No hay una impresora USB autorizada. Ve a Configuración → Impresoras y pulsa “Probar impresión”.')
  }
  selectedUsbDevice = device
  return device
}

async function printWebUsb(ticket, target, requestDevice) {
  const device = await getUsbPrinter(requestDevice)
  let claimedInterface
  try {
    await device.open()
    if (!device.configuration) {
      const configuration = device.configurations[0]
      if (!configuration) throw new Error('La impresora no ofrece una configuración USB.')
      await device.selectConfiguration(configuration.configurationValue)
    }

    const printerInterface = device.configuration.interfaces
      .flatMap((usbInterface) => usbInterface.alternates.map((alternate) => ({ usbInterface, alternate })))
      .find(({ alternate }) => alternate.endpoints.some((endpoint) => endpoint.direction === 'out' && endpoint.type === 'bulk'))
    if (!printerInterface) throw new Error('La impresora no expone una salida USB compatible con ESC/POS.')

    const { usbInterface, alternate } = printerInterface
    await device.claimInterface(usbInterface.interfaceNumber)
    claimedInterface = usbInterface.interfaceNumber
    if (alternate.alternateSetting !== 0) {
      await device.selectAlternateInterface(usbInterface.interfaceNumber, alternate.alternateSetting)
    }
    const endpoint = alternate.endpoints.find((item) => item.direction === 'out' && item.type === 'bulk')
    const result = await device.transferOut(endpoint.endpointNumber, makeReceiptBytes(ticket, target))
    if (result.status !== 'ok') throw new Error(`La transferencia USB terminó con estado ${result.status}.`)
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Error desconocido'
    throw new Error(`No se pudo imprimir por USB: ${message}. Cierra otras aplicaciones que estén usando la impresora y vuelve a probar.`)
  } finally {
    if (claimedInterface !== undefined) await device.releaseInterface(claimedInterface)
    if (device.opened) await device.close()
  }
}

async function printUsb(ticket, target, requestDevice = false) {
  if (isFirefoxDesktop()) {
    if (await imprimirPosFirefox(target, ticket)) return 'usb'
    if (requestDevice) {
      printUniversalTicket(ticket, target)
      return 'system'
    }
    throw new Error('No está disponible la extensión de impresión de Firefox. Pulsa “Imprimir ticket” para abrir la impresión del sistema.')
  }
  if (typeof navigator.usb?.requestDevice === 'function') {
    try {
      await printWebUsb(ticket, target, requestDevice)
      return 'usb'
    } catch (error) {
      if (!requestDevice) throw error
      printUniversalTicket(ticket, target)
      return 'system'
    }
  }
  if (typeof navigator.serial?.getPorts === 'function') {
    try {
      await printWebSerial(ticket, target, requestDevice)
      return 'serial'
    } catch (error) {
      if (!requestDevice) throw error
      printUniversalTicket(ticket, target)
      return 'system'
    }
  }
  if (requestDevice) {
    printUniversalTicket(ticket, target)
    return 'system'
  }
  throw new Error('La impresión directa no está disponible. Pulsa “Imprimir ticket” para abrir la impresión del sistema.')
}

export function isFirefoxDesktop(userAgent = globalThis.navigator?.userAgent ?? '') {
  return /Firefox\//.test(userAgent)
}

export async function getPrinterConfig(gremio) {
  if (isDemoMode()) {
    const config = JSON.parse(appStorage().getItem(`${DEMO_CONFIG_KEY}:${gremio}`) ?? 'null')
    return config?.hardware
      ? {
        caja: config.hardware.impresoraCaja,
        cocina: config.hardware.impresoraCocina,
        segundaPantalla: config.hardware.segundaPantalla === true,
      }
      : { caja: { tipo: 'usb', imprimirAutomaticamente: false }, cocina: { tipo: 'usb', imprimirAutomaticamente: false }, segundaPantalla: false }
  }
  return apiRequest(`/api/printers/${encodeURIComponent(gremio)}/config`).then((result) => result.printers)
}

export async function printPrinterTest(gremio, target, printer, ticket = {
  negocio: { nombre: 'PRUEBA VEXORA POS', nit: 'TEST' },
  numero: 'TEST-001',
  cliente: { nombre: 'Cliente de prueba' },
  mesa: 'Prueba',
  productos: [{ nombre: 'Prueba de impresión', cantidad: 1, total: 1000 }],
  total: 1000,
}) {
  const printableTicket = await preparePrintableTicket(gremio, target, ticket)
  if (printer.tipo === 'usb') {
    return printUsb(printableTicket, target, true)
  }
  if (isDemoMode()) throw new Error('La demo no se conecta a impresoras de red ni al backend.')
  const { codeImage: _codeImage, negocio, ...networkTicket } = printableTicket
  const { logoPrintImage: _logoPrintImage, ...networkBusiness } = negocio ?? {}
  await apiRequest(`/api/printers/${encodeURIComponent(gremio)}/test/${target}`, {
    method: 'POST',
    body: JSON.stringify({ ticket: { ...networkTicket, ...(negocio ? { negocio: networkBusiness } : {}) } }),
  })
}

export async function printConfiguredUsbTicket(gremio, target, ticket) {
  const printers = await getPrinterConfig(gremio)
  const printer = printers?.[target]
  if (!printer?.imprimirAutomaticamente || printer.tipo !== 'usb') return false
  const printableTicket = await preparePrintableTicket(gremio, target, ticket)
  await printUsb(printableTicket, target)
  return true
}

export async function printConfiguredTicket(gremio, target, ticket) {
  const printers = await getPrinterConfig(gremio)
  const printer = printers?.[target]
  if (!printer?.imprimirAutomaticamente) return false
  const printableTicket = await preparePrintableTicket(gremio, target, ticket)
  if (printer.tipo === 'usb') {
    await printUsb(printableTicket, target)
    return true
  }
  if (isDemoMode()) throw new Error('La demo no se conecta a impresoras de red ni al backend.')
  const { codeImage: _codeImage, negocio, ...networkTicket } = printableTicket
  const { logoPrintImage: _logoPrintImage, ...networkBusiness } = negocio ?? {}
  const result = await apiRequest(`/api/printers/${encodeURIComponent(gremio)}/print/${target}`, {
    method: 'POST',
    body: JSON.stringify({ ticket: { ...networkTicket, ...(negocio ? { negocio: networkBusiness } : {}) }, automatic: true }),
  })
  return result?.skipped !== true
}

export async function printReceipt(gremio, ticket, { requestDevice = true } = {}) {
  const printers = await getPrinterConfig(gremio)
  const printer = printers?.caja
  const printableTicket = await preparePrintableTicket(gremio, 'caja', ticket)
  if (printer?.tipo === 'red') {
    if (isDemoMode()) throw new Error('La demo no se conecta a impresoras de red ni al backend.')
    const { codeImage: _codeImage, negocio, ...networkTicket } = printableTicket
    const { logoPrintImage: _logoPrintImage, ...networkBusiness } = negocio ?? {}
    await apiRequest(`/api/printers/${encodeURIComponent(gremio)}/print/caja`, {
      method: 'POST',
      body: JSON.stringify({ ticket: { ...networkTicket, ...(negocio ? { negocio: networkBusiness } : {}) }, automatic: false }),
    })
    return
  }
  return printUsb(printableTicket, 'caja', requestDevice)
}
