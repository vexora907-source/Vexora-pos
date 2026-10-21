import { useRef, useState } from 'react'
import { Download, FileSpreadsheet, Upload } from 'lucide-react'
import {
  createInventoryTemplateWorkbook,
  createInventoryWorkbook,
  parseInventoryWorkbook,
} from '../../services/inventoryExcel.js'

async function downloadWorkbook(workbook, filename) {
  const XLSX = await import('xlsx')
  const data = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function ExcelInventoryActions({ gremio, products, onImportProducts }) {
  const inputRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function exportInventory() {
    setError('')
    setMessage('')
    try {
      await downloadWorkbook(await createInventoryWorkbook(products), `inventario-${gremio}-${new Date().toISOString().slice(0, 10)}.xlsx`)
      setMessage(`Se exportaron ${products.length} productos de ${gremio.replaceAll('_', ' ')}.`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo exportar el inventario.')
    }
  }

  async function downloadTemplate() {
    setError('')
    setMessage('')
    try {
      await downloadWorkbook(await createInventoryTemplateWorkbook(), 'plantilla-inventario-vexora.xlsx')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo descargar la plantilla.')
    }
  }

  async function importInventory(event) {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const productsToImport = await parseInventoryWorkbook(await file.arrayBuffer(), gremio, products)
      const result = await onImportProducts(productsToImport)
      setMessage(`Importación completa: ${result.created} nuevos y ${result.updated} actualizados en ${gremio.replaceAll('_', ' ')}.`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo importar el archivo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-label="Importar y exportar inventario Excel" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={exportInventory} className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-800">
          <Download className="h-4 w-4" />Exportar Excel
        </button>
        <button type="button" disabled={busy} onClick={() => inputRef.current?.click()} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-3 py-2 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50">
          <Upload className="h-4 w-4" />{busy ? 'Importando…' : 'Importar Excel'}
        </button>
        <button type="button" onClick={downloadTemplate} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-zinc-700 underline underline-offset-2 hover:bg-white">
          <FileSpreadsheet className="h-4 w-4" />Descargar plantilla
        </button>
        <input ref={inputRef} type="file" accept=".xlsx,.xls" onChange={(event) => void importInventory(event)} className="hidden" />
      </div>
      <p className="mt-2 text-xs text-zinc-600">Se trabaja únicamente sobre el inventario visible de este gremio y cuenta. Valida nombres, precios, stock y SKU duplicados antes de guardar.</p>
      {error && <p role="alert" className="mt-2 text-sm font-semibold text-rose-700">{error}</p>}
      {message && <p role="status" className="mt-2 text-sm font-semibold text-emerald-800">{message}</p>}
    </section>
  )
}
