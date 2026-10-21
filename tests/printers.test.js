import test from 'node:test'
import assert from 'node:assert/strict'

const sessionStorage = new Map([['vexora.demoMode', 'true']])
const bodyNodes = []
const listeners = new Map()
const bodyClasses = new Set()
let printCalls = 0
let printingClassWasSet = false

function makeNode() {
  const classes = new Set()
  const attributes = new Map()
  return {
    className: '',
    innerHTML: '',
    removed: false,
    setAttribute: (name, value) => attributes.set(name, value),
    getAttribute: (name) => attributes.get(name) ?? null,
    classList: {
      add: (name) => classes.add(name),
      remove: (name) => classes.delete(name),
    },
    remove() {
      this.removed = true
    },
  }
}

globalThis.window = {
  sessionStorage: {
    getItem: (key) => sessionStorage.get(key) ?? null,
    setItem: (key, value) => sessionStorage.set(key, value),
  },
  localStorage: {
    getItem: () => null,
    setItem: () => {},
  },
  addEventListener: (name, callback) => listeners.set(name, callback),
  removeEventListener: (name) => listeners.delete(name),
  print() {
    printCalls += 1
    printingClassWasSet = bodyClasses.has('printing-universal-ticket')
    listeners.get('afterprint')?.()
  },
}
globalThis.document = {
  head: { append: () => {} },
  body: {
    classList: {
      add: (name) => bodyClasses.add(name),
      remove: (name) => bodyClasses.delete(name),
    },
    append(node) {
      bodyNodes.push(node)
    },
  },
  createElement: makeNode,
}
Object.defineProperty(globalThis, 'navigator', {
  value: {},
  configurable: true,
})

const { printUniversalTicket } = await import('../src/shared/services/thermalPrint.js')

test('renders and opens a thermal test ticket through system print', () => {
  printUniversalTicket({
    negocio: { nombre: 'PRUEBA VEXORA POS' },
    numero: 'TEST-001',
    cliente: { nombre: 'Cliente de prueba' },
    productos: [{ nombre: 'Prueba de impresión', cantidad: 1, total: 1000 }],
    total: 1000,
  }, 'caja')
  assert.equal(printCalls, 1)
  const ticket = bodyNodes.find((node) => node.className === 'universal-thermal-ticket')
  assert.match(ticket.innerHTML, /Prueba de impresión/)
  assert.equal(ticket.getAttribute('role'), 'dialog')
  assert.equal(printingClassWasSet, true)
  assert.equal(listeners.has('afterprint'), false)
  assert.equal(bodyClasses.has('printing-universal-ticket'), false)
})

test('prints a cash closure summary and denomination breakdown', () => {
  printUniversalTicket({
    tipo: 'CIERRE',
    negocio: { nombre: 'PRUEBA VEXORA POS' },
    resumen: [{ label: 'Diferencia efectivo', valor: '$0' }],
    desglose: [{ label: '$50.000', cantidad: 2, total: '$100.000' }],
    resultado: 'CAJA CUADRADA',
  }, 'caja')
  const ticket = bodyNodes.at(-1)
  assert.match(ticket.innerHTML, /CIERRE DE CAJA/)
  assert.match(ticket.innerHTML, /Diferencia efectivo/)
  assert.match(ticket.innerHTML, /\$50\.000 × 2/)
  assert.match(ticket.innerHTML, /CAJA CUADRADA/)
})

test('marks a reprinted ticket as a copy', () => {
  printUniversalTicket({ copy: true, numero: 'T-3', productos: [] }, 'caja')
  assert.match(bodyNodes.at(-1).innerHTML, /\*\*\* COPIA \*\*\*/)
})
