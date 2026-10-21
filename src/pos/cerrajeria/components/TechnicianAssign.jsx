const techs = ['Sin asignar', 'Carlos Rodríguez', 'Andrés López', 'Equipo de turno']

export function TechnicianAssign({ value = techs[0], onChange = () => {} }) {
  return <label className="block text-sm font-semibold text-zinc-300">Técnico asignado<select name="technician" value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-800 p-3 text-white">{techs.map((tech) => <option key={tech}>{tech}</option>)}</select></label>
}
