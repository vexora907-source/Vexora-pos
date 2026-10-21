export const theme = { primary: '#F59E0B', bg: 'bg-amber-50', icon: '🍔' }

export const DEFAULT_FLOORS = [
  { id: 'interior', name: 'Interior' },
  { id: 'terraza', name: 'Terraza' },
  { id: 'barra', name: 'Barra' },
]

export const DEFAULT_TABLES = Array.from({ length: 12 }, (_, index) => ({
  id: index + 1,
  name: `Mesa ${index + 1}`,
  floorId: index < 8 ? 'interior' : index < 10 ? 'terraza' : 'barra',
  capacity: 4,
  shape: index % 3 === 0 ? 'round' : 'square',
  x: (index % 4) * 23 + 12,
  y: Math.floor((index % 8) / 4) * 48 + 24,
  items: [],
  startedAt: null,
}))
