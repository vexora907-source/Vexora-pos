import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Megaphone } from 'lucide-react'

const promos = {
  papeleria: ['Imprime tus ideas', '¡Color para cada proyecto!', 'Pregunta por nuestras ofertas escolares'],
  cerrajeria: ['Seguridad para tu hogar', 'Copia de llaves en minutos', 'Servicio confiable cuando lo necesitas'],
  comidas_rapidas: ['Un antojo merece algo delicioso', 'Preparado al momento para ti', 'Combina tu plato favorito con algo para compartir'],
  restaurante: ['Un sabor para recordar', 'Recién preparado para ti', 'Pregunta por el menú de hoy'],
  ferreteria: ['Lo que tu proyecto necesita', 'Herramientas para hacerlo bien', 'Encuentra materiales y más'],
  ropa: ['Encuentra tu próximo estilo favorito', 'Prendas para cada ocasión', 'Pregunta por nuestras novedades'],
  tienda: ['Todo lo que necesitas, cerca de ti', 'Productos frescos para tu día', 'Pregunta por nuestros productos y ofertas'],
}

export function AdCarousel({ gremio = 'papeleria' }) {
  const slides = promos[gremio] ?? ['Bienvenido a nuestro negocio', 'Gracias por visitarnos', 'Tenemos novedades para ti']
  const [index, setIndex] = useState(0)
  useEffect(() => {
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % slides.length), 5000)
    return () => window.clearInterval(timer)
  }, [slides.length])

  return (
    <div className="relative min-h-40 overflow-hidden rounded-2xl bg-gradient-to-br from-vexora-900 via-vexora-700 to-vexora-500 p-6 text-white shadow-lg">
      <span className="absolute -right-4 -top-7 text-[9rem] opacity-10">✦</span>
      <div className="relative"><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-white/75"><Megaphone className="h-4 w-4" />Vexora para tu negocio</p><motion.div key={`${gremio}-${index}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}><h2 className="mt-5 text-2xl font-black">{slides[index]}</h2><p className="mt-1 text-sm text-white/80">Una experiencia hecha para tu gremio.</p></motion.div></div>
    </div>
  )
}
