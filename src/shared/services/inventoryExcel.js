export const INVENTORY_HEADERS = [
  'SKU / Código barras',
  'Nombre',
  'Categoría',
  'Precio venta COP',
  'Costo COP',
  'Stock',
  'Stock mínimo',
  'IVA %',
  'Descripción',
  'Activo',
  'Tipo',
  'Receta (SKU:cantidad; ...)',
  'Opciones (SKU:cantidad:precio; ...)',
  'Unidad',
]

const headerAliases = {
  sku: ['sku', 'codigobarras', 'barcode', 'skucodigobarras'],
  name: ['nombre', 'nombreproducto', 'name'],
  category: ['categoria', 'category'],
  price: ['precio', 'precioventa', 'precioventacop', 'price'],
  cost: ['costo', 'costocop', 'cost'],
  stock: ['stock', 'cantidad', 'existencias'],
  minStock: ['stockminimo', 'minstock'],
  iva: ['iva', 'ivaporcentaje'],
  description: ['descripcion', 'description'],
  active: ['activo', 'active'],
  type: ['tipo', 'tipoproducto', 'tipodeproducto'],
  recipe: ['receta', 'ingredientes', 'recetaporpizza', 'recetaskucantidad'],
  modifiers: ['opciones', 'toppings', 'ingredientesopcionales', 'opcionesskucantidadprecio'],
  unit: ['unidad', 'unit'],
}

function normalizedHeader(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

function parseNumber(value, field, rowNumber, { required = false, defaultValue = 0 } = {}) {
  if (value === '' || value === null || value === undefined) {
    if (required) throw new Error(`Fila ${rowNumber}: falta ${field}.`)
    return defaultValue
  }
  let numberText = String(value).trim().replace(/[$\s]/g, '')
  if (typeof value !== 'number') {
    numberText = numberText.includes(',')
      ? numberText.replace(/\./g, '').replace(',', '.')
      : /^\-?\d{1,3}(?:\.\d{3})+$/.test(numberText) ? numberText.replace(/\./g, '') : numberText
  }
  const number = typeof value === 'number' ? value : Number(numberText)
  if (!Number.isFinite(number)) throw new Error(`Fila ${rowNumber}: ${field} debe ser un número válido.`)
  return number
}

function createSku() {
  return `SKU-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`
}

function normalizeReference(value) {
  return String(value ?? '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase()
}

function readRecipeEntries(value, rowNumber, { withPrice = false } = {}) {
  if (!String(value ?? '').trim()) return []
  return String(value).split(';').map((entry) => {
    const parts = entry.trim().split(':').map((part) => part.trim())
    const expectedLength = withPrice ? 3 : 2
    if (parts.length !== expectedLength || !parts[0]) {
      throw new Error(`Fila ${rowNumber}: usa el formato ${withPrice ? 'SKU:cantidad:precio' : 'SKU:cantidad'} separado por punto y coma.`)
    }
    const quantity = parseNumber(parts[1], 'cantidad de receta', rowNumber, { required: true })
    if (quantity <= 0) throw new Error(`Fila ${rowNumber}: las cantidades de receta deben ser mayores que cero.`)
    if (!withPrice) return { reference: parts[0], quantity }
    const price = parseNumber(parts[2], 'precio de opción', rowNumber, { required: true })
    if (price < 0) throw new Error(`Fila ${rowNumber}: el precio de la opción no puede ser negativo.`)
    return { reference: parts[0], quantity, price }
  })
}

export async function parseInventoryWorkbook(data, gremio, existingProducts = []) {
  const XLSX = await import('xlsx')
  const workbook = XLSX.read(data, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) throw new Error('El archivo Excel no contiene hojas.')

  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: '', raw: true })
  if (rows.length < 2) throw new Error('La hoja debe incluir encabezados y al menos un producto.')

  const columns = new Map()
  rows[0].forEach((header, index) => {
    const value = normalizedHeader(header)
    for (const [field, aliases] of Object.entries(headerAliases)) {
      if (!columns.has(field) && aliases.includes(value)) columns.set(field, index)
    }
  })
  for (const field of ['name', 'price', 'stock']) {
    if (!columns.has(field)) throw new Error(`Falta la columna obligatoria: ${field === 'name' ? 'Nombre' : field === 'price' ? 'Precio venta COP' : 'Stock'}.`)
  }

  const seenSkus = new Set()
  const products = []
  rows.slice(1).forEach((row, index) => {
    if (!row.some((value) => String(value ?? '').trim())) return
    const rowNumber = index + 2
    const get = (field) => columns.has(field) ? row[columns.get(field)] : ''
    const name = String(get('name') ?? '').trim()
    if (!name) throw new Error(`Fila ${rowNumber}: el nombre del producto no puede estar vacío.`)
    if (name.length > 100) throw new Error(`Fila ${rowNumber}: el nombre supera los 100 caracteres.`)

    const price = parseNumber(get('price'), 'precio', rowNumber, { required: true })
    const quantity = parseNumber(get('stock'), 'stock', rowNumber, { required: true })
    const cost = parseNumber(get('cost'), 'costo', rowNumber)
    const minStock = parseNumber(get('minStock'), 'stock mínimo', rowNumber, { defaultValue: 5 })
    const iva = parseNumber(get('iva'), 'IVA', rowNumber)
    if (price <= 0) throw new Error(`Fila ${rowNumber}: el precio debe ser mayor que cero.`)
    if (quantity < 0) throw new Error(`Fila ${rowNumber}: el stock no puede ser negativo.`)
    if (gremio !== 'tienda' && !Number.isInteger(quantity)) {
      throw new Error(`Fila ${rowNumber}: el stock debe ser entero para este gremio.`)
    }
    if (cost < 0) throw new Error(`Fila ${rowNumber}: el costo no puede ser negativo.`)
    if (minStock < 0) throw new Error(`Fila ${rowNumber}: el stock mínimo no puede ser negativo.`)
    if (iva < 0 || iva > 100) throw new Error(`Fila ${rowNumber}: el IVA debe estar entre 0 y 100.`)

    const barcode = String(get('sku') ?? '').trim() || createSku()
    const skuKey = barcode.toLocaleLowerCase()
    if (seenSkus.has(skuKey)) throw new Error(`Fila ${rowNumber}: el SKU "${barcode}" está duplicado en el archivo.`)
    seenSkus.add(skuKey)

    const activeText = String(get('active') ?? '').trim().toLocaleUpperCase()
    if (activeText && !['SI', 'SÍ', 'NO', 'YES', 'TRUE', 'FALSE', '1', '0'].includes(activeText)) {
      throw new Error(`Fila ${rowNumber}: Activo debe ser SI o NO.`)
    }
    const active = !['NO', 'FALSE', '0'].includes(activeText)

    const existing = existingProducts.find((product) => String(product.barcode ?? '').trim().toLocaleLowerCase() === skuKey)
    const id = existing?.id ?? `excel-${barcode}`
    const type = String(get('type') ?? '').trim()
    const category = String(get('category') ?? '').trim() || 'General'
    const unit = String(get('unit') ?? '').trim() || existing?.unit
    products.push({
      id,
      barcode,
      name,
      category,
      price,
      cost,
      quantity,
      stock: quantity,
      minStock,
      iva,
      description: String(get('description') ?? '').trim(),
      active,
      activo: active ? 'SI' : 'NO',
      ...(unit ? { unit } : {}),
      type,
      recipeEntries: readRecipeEntries(get('recipe'), rowNumber),
      modifierEntries: readRecipeEntries(get('modifiers'), rowNumber, { withPrice: true }),
    })
  })
  if (products.length === 0) throw new Error('No se encontraron productos para importar.')

  const importedBySku = new Map(products.map((product) => [product.barcode.toLocaleLowerCase(), product]))
  const importedByName = new Map()
  const knownProducts = new Map()
  for (const product of [...existingProducts, ...products]) {
    const identity = String(product.id ?? product.barcode ?? product.name)
    if (knownProducts.has(identity)) continue
    knownProducts.set(identity, product)
    const key = normalizeReference(product.name)
    if (!key) continue
    const matches = importedByName.get(key) ?? []
    matches.push(product)
    importedByName.set(key, matches)
  }
  const resolveReference = (reference, rowNumber) => {
    const bySku = importedBySku.get(reference.toLocaleLowerCase())
      ?? existingProducts.find((product) => String(product.barcode ?? '').trim().toLocaleLowerCase() === reference.toLocaleLowerCase())
    if (bySku) return bySku
    const matches = importedByName.get(normalizeReference(reference)) ?? []
    if (matches.length > 1) throw new Error(`Fila ${rowNumber}: el ingrediente "${reference}" tiene nombres duplicados; referencia su SKU.`)
    if (matches.length === 1) return matches[0]
    throw new Error(`Fila ${rowNumber}: no se encontró el ingrediente "${reference}" en el archivo ni en el inventario.`)
  }
  for (const [index, product] of products.entries()) {
    if (!product.recipeEntries.length && !product.modifierEntries.length) {
      delete product.type
      delete product.recipeEntries
      delete product.modifierEntries
      continue
    }
    const rowNumber = index + 2
    if (!product.recipeEntries.length) {
      throw new Error(`Fila ${rowNumber}: las opciones requieren una receta base.`)
    }
    product.ingredients = product.recipeEntries.map(({ reference, quantity }) => {
      const ingredient = resolveReference(reference, rowNumber)
      return { productId: ingredient.id, quantity, unit: ingredient.unit || 'unidad' }
    })
    product.modifiers = product.modifierEntries.map(({ reference, quantity, price }) => {
      const ingredient = resolveReference(reference, rowNumber)
      return {
        id: `extra-${ingredient.id}`,
        label: ingredient.name,
        price,
        ingredients: [{ productId: ingredient.id, quantity, unit: ingredient.unit || 'unidad' }],
      }
    })
    const type = normalizeReference(product.type)
    if (type.includes('personalizada')) product.category = 'Pizza personalizada'
    else if (type.includes('pizza') || normalizeReference(product.category).includes('pizza') || normalizeReference(product.name).includes('pizza')) {
      product.category = 'Pizza de la casa'
    }
    delete product.type
    delete product.recipeEntries
    delete product.modifierEntries
  }
  return products
}

function workbookForRows(rows, XLSX) {
  const workbook = XLSX.utils.book_new()
  const sheet = XLSX.utils.aoa_to_sheet(rows)
  sheet['!cols'] = [
    { wch: 22 }, { wch: 30 }, { wch: 18 }, { wch: 18 }, { wch: 14 },
    { wch: 12 }, { wch: 15 }, { wch: 10 }, { wch: 32 }, { wch: 10 },
    { wch: 22 }, { wch: 42 }, { wch: 42 }, { wch: 14 },
  ]
  XLSX.utils.book_append_sheet(workbook, sheet, 'Inventario')
  return workbook
}

export async function createInventoryWorkbook(products) {
  const XLSX = await import('xlsx')
  const rows = [
    INVENTORY_HEADERS,
    ...products.map((product) => [
      product.barcode ?? '',
      product.name ?? '',
      product.category ?? 'General',
      Number(product.price) || 0,
      Number(product.cost) || 0,
      Number(product.quantity ?? product.stock) || 0,
      Number(product.minStock) || 0,
      Number(product.iva) || 0,
      product.description ?? '',
      product.active === false || product.activo === 'NO' ? 'NO' : 'SI',
      product.ingredients?.length ? (product.category === 'Pizza personalizada' ? 'Pizza personalizada' : 'Pizza de la casa') : '',
      product.ingredients?.map((ingredient) => {
        const match = products.find((item) => item.id === ingredient.productId)
        return `${match?.barcode || match?.name || ingredient.productId}:${ingredient.quantity}`
      }).join('; ') ?? '',
      product.modifiers?.flatMap((modifier) => (modifier.ingredients ?? []).map((ingredient) => {
        const match = products.find((item) => item.id === ingredient.productId)
        return `${match?.barcode || match?.name || ingredient.productId}:${ingredient.quantity}:${modifier.price ?? 0}`
      })).join('; ') ?? '',
      product.unit ?? '',
    ]),
  ]
  return workbookForRows(rows, XLSX)
}

export async function createInventoryTemplateWorkbook() {
  const XLSX = await import('xlsx')
  const workbook = workbookForRows([
    INVENTORY_HEADERS,
    ['SKU-001', 'Producto de ejemplo', 'General', 4500, 2500, 10, 2, 0, 'Edita o elimina esta fila de ejemplo', 'SI', '', '', '', ''],
  ], XLSX)
  const instructions = XLSX.utils.aoa_to_sheet([
    ['Instrucciones de la plantilla'],
    ['Completa una fila por producto y elimina la fila de ejemplo antes de importar.'],
    ['Nombre, Precio venta COP y Stock son obligatorios.'],
    ['Precio debe ser mayor que 0; stock, costo, stock mínimo e IVA no pueden ser negativos.'],
    ['Para este gremio, el stock debe ser entero. En Tienda se permiten cantidades fraccionarias.'],
    ['Activo acepta SI o NO. El SKU es opcional; si se repite un SKU existente, se actualiza ese producto.'],
    ['Para una pizza agrega una fila por cada ingrediente/insumo y otra fila para la pizza. En Tipo escribe Pizza de la casa o Pizza personalizada.'],
    ['La columna Receta usa SKU:cantidad separados por punto y coma (ej. QUESO:150;SALSA:80). También puedes usar el nombre exacto del ingrediente.'],
    ['Opciones agrega toppings opcionales con SKU:cantidad:precio separados por punto y coma (ej. PEPPERONI:50:3000). Cada ingrediente debe existir en el archivo o inventario.'],
    ['Unidad es opcional (ej. unidad, g o ml); debe coincidir con la unidad usada por la receta de la pizza.'],
    ['Las pizzas importadas necesitan una receta base para aparecer en el POS y descontar stock al cobrar. Las filas sin receta se importan como productos normales.'],
  ])
  instructions['!cols'] = [{ wch: 100 }]
  XLSX.utils.book_append_sheet(workbook, instructions, 'Instrucciones')
  return workbook
}
