const ICONS_BY_BUSINESS = {
  papeleria: ['📒', '✏️', '🖍️', '📄', '🎨', '📚', '🧴', '🖨️'],
  ferreteria: ['🔧', '🛠️', '🔩', '🪣', '🧰', '🔨', '🧤', '🪚'],
  cerrajeria: ['🔑', '🗝️', '🔒', '🔐', '🚪', '🛠️'],
  restaurante: ['🍔', '🍟', '🥤', '🥗', '🍕', '🍗', '🍰', '☕'],
}

const PRODUCT_ICON_RULES = {
  papeleria: [
    [/cuaderno|libreta/i, '📒'],
    [/papel|hoja|folio/i, '📄'],
    [/marcador|color|arte|cartulina/i, '🖍️'],
    [/pegante|pegamento|adhesivo/i, '🧴'],
    [/lapiz|lápiz|escritura|esfero|bolígrafo/i, '✏️'],
    [/impres|tinta|fotogr/i, '🖨️'],
    [/escolar|libro/i, '📚'],
  ],
  ferreteria: [
    [/taladro|herramienta/i, '🛠️'],
    [/tornillo|tuerca|perno/i, '🔩'],
    [/pintura|galón/i, '🪣'],
    [/cinta|eléctric/i, '🧰'],
    [/martillo/i, '🔨'],
    [/guante|seguridad/i, '🧤'],
    [/sierra|corte|madera/i, '🪚'],
  ],
  cerrajeria: [
    [/llave|copia/i, '🗝️'],
    [/cilindro|chapa/i, '🔐'],
    [/cerradura|candado/i, '🔒'],
    [/puerta|apertura/i, '🚪'],
    [/herramienta|servicio/i, '🛠️'],
  ],
  restaurante: [
    [/hamburguesa|burger/i, '🍔'],
    [/papa|frita/i, '🍟'],
    [/jugo|bebida|limonada/i, '🥤'],
    [/ensalada|verdura/i, '🥗'],
    [/pizza/i, '🍕'],
    [/pollo|carne|asado/i, '🍗'],
    [/postre|torta|pastel/i, '🍰'],
    [/café|cafe|té|te\b/i, '☕'],
  ],
}

export function getProductIcon(gremio, name = '', category = '') {
  const description = `${name} ${category}`
  return PRODUCT_ICON_RULES[gremio]?.find(([pattern]) => pattern.test(description))?.[1]
    ?? ICONS_BY_BUSINESS[gremio]?.[0]
    ?? '📦'
}

export function getBusinessProductIcons(gremio) {
  return ICONS_BY_BUSINESS[gremio] ?? ['📦']
}
