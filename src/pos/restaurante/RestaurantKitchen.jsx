import { KDS } from './components/kitchen/KDS.jsx'

export function RestaurantKitchen() {
  return <KDS tables={[]} onBump={() => Promise.resolve()} remote />
}

export function QuickMealsKitchen() {
  return <KDS tables={[]} onBump={() => Promise.resolve()} remote gremio="comidas_rapidas" />
}
