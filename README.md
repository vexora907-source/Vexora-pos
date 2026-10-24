# Frontend Vexora POS

Aplicación web de Vexora POS construida con React y Vite. El navegador se
conecta a la API del backend; nunca se conecta directamente a MongoDB Atlas.

## Desarrollo local

```bash
npm install
cp .env.example .env
npm run dev
```

`VITE_API_URL` debe apuntar al origen del backend, por ejemplo
`http://localhost:4000`. No agregues `/api`: las rutas de API ya incluyen ese
prefijo. Si no está definida en producción, el frontend usa
`https://backend-vexora-pos-jkc6.vercel.app`; un valor definido explícitamente
siempre tiene prioridad.

## Despliegue en Vercel

Configura las variables en **Project Settings → Environment Variables** del
proyecto frontend y selecciona los entornos que uses:

- `VITE_API_URL`: opcional si usas el dominio por defecto
  `https://backend-vexora-pos-jkc6.vercel.app`. Si tienes otro dominio, configúralo
  aquí. Usa solo el origen, sin `/api` ni una barra final.

Guarda la variable y vuelve a desplegar el frontend, porque Vite la incorpora
durante la compilación. No uses aquí `MONGODB_URI`, `JWT_SECRET` ni credenciales
privadas: las variables con prefijo `VITE_` se publican en el navegador.

En el proyecto backend, configura `CORS_ORIGIN` con el origen exacto del
frontend, por ejemplo `https://tu-frontend.vercel.app`. Para permitir más de un
dominio, sepáralos por comas. Guarda el cambio y vuelve a desplegar el backend.
Si tienes dominios personalizados, permite también los que realmente usen tus
usuarios.

Puedes comprobar que el backend está disponible visitando
`https://backend-vexora-pos-jkc6.vercel.app/health`; debe responder
`{"status":"ok"}`.
Después, prueba el inicio de sesión o el registro desde el dominio del frontend.
Si el navegador muestra un error CORS, confirma que `CORS_ORIGIN` coincide
exactamente con el origen del sitio (protocolo y dominio, sin ruta) y que el
backend se haya redeplegado.

El frontend envía las solicitudes a la API mediante `VITE_API_URL` y conserva
el token de sesión para las rutas que requieren autenticación.
