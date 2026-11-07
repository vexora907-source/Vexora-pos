import React from 'react'
import ReactDOM from 'react-dom/client'
import TenantRouter from './router/TenantRouter.jsx'
import { API_URL } from './shared/services/api.js'
import { createPosWebsiteVisitRecorder } from './shared/services/websiteVisits.js'
import { resetDemoOnReload } from './shared/services/tenantStorage.js'
import './styles.css'

resetDemoOnReload()

const recordPosWebsiteVisit = createPosWebsiteVisitRecorder(API_URL)
function reportPosWebsiteVisit() {
  void recordPosWebsiteVisit().catch((error) => {
    console.error('No se pudo registrar la visita web del POS.', error)
  })
}

if (API_URL) {
  reportPosWebsiteVisit()
  window.addEventListener('online', reportPosWebsiteVisit)
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/service-worker.js')
      .catch((error) => console.error('No se pudo habilitar el almacenamiento offline de la aplicación.', error))
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <TenantRouter />
  </React.StrictMode>,
)
