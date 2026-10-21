import React from 'react'
import ReactDOM from 'react-dom/client'
import TenantRouter from './router/TenantRouter.jsx'
import { resetDemoOnReload } from './shared/services/tenantStorage.js'
import './styles.css'

resetDemoOnReload()

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
