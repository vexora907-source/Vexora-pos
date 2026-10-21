const options = ['Yale', 'Seguridad', 'Carro', 'Multipunto']

export function KeyTypeSelector({ value = 'Yale', onChange = () => {} }) {
  return <label className="block text-sm font-semibold text-zinc-300">Tipo de llave<select name="keyType" value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-800 p-3 text-white">{options.map((option) => <option key={option}>{option}</option>)}</select></label>
}
