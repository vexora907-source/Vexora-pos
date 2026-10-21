import test from 'node:test'
import assert from 'node:assert/strict'
import * as XLSX from 'xlsx'
import { createInventoryTemplateWorkbook, createInventoryWorkbook, INVENTORY_HEADERS, parseInventoryWorkbook } from '../src/shared/services/inventoryExcel.js'

function workbookBuffer(rows) {
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), 'Inventario')
  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
}

test('parses supported Excel inventory columns and Colombian currency values', async () => {
  const products = await parseInventoryWorkbook(workbookBuffer([
    INVENTORY_HEADERS,
    ['P-001', 'Cuaderno', 'Útiles', '4.500', 2500, 12, 3, 19, 'Cuadriculado', 'SI'],
    ['', 'Papel a granel', 'Papel', 500, 100, 0.5, 0, 0, '', 'NO'],
  ]), 'tienda')

  assert.equal(products.length, 2)
  assert.equal(products[0].price, 4500)
  assert.equal(products[0].quantity, 12)
  assert.equal(products[0].iva, 19)
  assert.equal(products[0].active, true)
  assert.equal(products[1].quantity, 0.5)
  assert.equal(products[1].active, false)
  assert.match(products[1].barcode, /^SKU-/)
})

test('rejects negative stock before mutating inventory', async () => {
  await assert.rejects(parseInventoryWorkbook(workbookBuffer([
    INVENTORY_HEADERS,
    ['P-001', 'Cuaderno', 'Útiles', 4500, 2500, -1, 3, 0, '', 'SI'],
  ]), 'papeleria'), /Fila 2: el stock no puede ser negativo/)
})

test('rejects duplicate imported SKU and non-integer stock outside grocery store', async () => {
  await assert.rejects(parseInventoryWorkbook(workbookBuffer([
    INVENTORY_HEADERS,
    ['P-001', 'Producto A', 'General', 100, 0, 1, 0, 0, '', 'SI'],
    ['p-001', 'Producto B', 'General', 100, 0, 2, 0, 0, '', 'SI'],
  ]), 'papeleria'), /está duplicado/)

  await assert.rejects(parseInventoryWorkbook(workbookBuffer([
    INVENTORY_HEADERS,
    ['P-002', 'Producto', 'General', 100, 0, 1.5, 0, 0, '', 'SI'],
  ]), 'ferreteria'), /stock debe ser entero/)
})

test('imports pizza recipes and optional toppings linked to imported inventory', async () => {
  const products = await parseInventoryWorkbook(workbookBuffer([
    INVENTORY_HEADERS,
    ['DOUGH', 'Masa', 'Pizzería', 1000, 500, 20, 2, 0, '', 'SI', 'Ingrediente', '', '', 'unidad'],
    ['CHEESE', 'Mozzarella', 'Pizzería', 500, 250, 2000, 100, 0, '', 'SI', 'Ingrediente', '', '', 'g'],
    ['SAUCE', 'Salsa', 'Pizzería', 300, 100, 1000, 100, 0, '', 'SI', 'Ingrediente', '', '', 'g'],
    ['PEPPERONI', 'Pepperoni', 'Pizzería', 500, 250, 1000, 100, 0, '', 'SI', 'Ingrediente', '', '', 'g'],
    ['PIZZA-001', 'Pizza personalizada', 'Menú', 24000, 10000, 0, 0, 0, '', 'SI', 'Pizza personalizada', 'DOUGH:1;SAUCE:80;CHEESE:150', 'PEPPERONI:50:3500', ''],
  ]), 'comidas_rapidas')

  const pizza = products.find((product) => product.barcode === 'PIZZA-001')
  assert.equal(pizza.category, 'Pizza personalizada')
  assert.deepEqual(pizza.ingredients.map(({ productId, quantity, unit }) => ({ productId, quantity, unit })), [
    { productId: 'excel-DOUGH', quantity: 1, unit: 'unidad' },
    { productId: 'excel-SAUCE', quantity: 80, unit: 'g' },
    { productId: 'excel-CHEESE', quantity: 150, unit: 'g' },
  ])
  assert.deepEqual(pizza.modifiers[0], {
    id: 'extra-excel-PEPPERONI',
    label: 'Pepperoni',
    price: 3500,
    ingredients: [{ productId: 'excel-PEPPERONI', quantity: 50, unit: 'g' }],
  })
})

test('requires recipe ingredients to exist and rejects malformed pizza recipes', async () => {
  await assert.rejects(parseInventoryWorkbook(workbookBuffer([
    INVENTORY_HEADERS,
    ['PIZZA', 'Pizza Hawaiana', 'Pizza de la casa', 29000, 0, 0, 0, 0, '', 'SI', 'Pizza de la casa', 'QUESO:150;PIÑA:50', ''],
  ]), 'comidas_rapidas'), /no se encontró el ingrediente "QUESO"/)

  await assert.rejects(parseInventoryWorkbook(workbookBuffer([
    INVENTORY_HEADERS,
    ['PIZZA', 'Pizza Hawaiana', 'Pizza de la casa', 29000, 0, 0, 0, 0, '', 'SI', 'Pizza de la casa', 'QUESO', ''],
  ]), 'comidas_rapidas'), /usa el formato SKU:cantidad/)
})

test('exports the selected inventory and provides a template with instructions', async () => {
  const exportBook = await createInventoryWorkbook([
    { barcode: 'P-001', name: 'Cuaderno', category: 'Útiles', price: 4500, cost: 2500, quantity: 3, minStock: 1, iva: 19, description: 'Rayado', active: false },
  ])
  const exportedRows = XLSX.utils.sheet_to_json(exportBook.Sheets.Inventario, { header: 1 })
  assert.deepEqual(exportedRows[0], INVENTORY_HEADERS)
  assert.equal(exportedRows[1][0], 'P-001')
  assert.equal(exportedRows[1][9], 'NO')

  const template = await createInventoryTemplateWorkbook()
  assert.deepEqual(template.SheetNames, ['Inventario', 'Instrucciones'])
  assert.match(template.Sheets.Instrucciones.A1.v, /Instrucciones/)
})
