# Vexora POS Print para Firefox

La extension comunica el POS con el Native Messaging host `com.vexora.print`. No accede a USB desde JavaScript ni expone `browser.runtime` al código de la página.

## Cargar para desarrollo

1. Instala primero el host siguiendo `../vexora-print-host/README.md`.
2. Abre `about:debugging#/runtime/this-firefox` en Firefox.
3. Selecciona **Load Temporary Add-on** y elige `manifest.json`.
4. Reinicia la pestaña del POS para que cargue `content.js`.

La carga temporal desaparece al cerrar Firefox. Para distribución a clientes, empaqueta y firma la extension con Mozilla Add-on Developer Hub.

## Enrutamiento por navegador

- Firefox envía la impresión POS a esta extension y al Native Messaging host. Si la extension no está cargada, el POS abre el diálogo de impresión del sistema.
- Chrome y Edge no usan esta extension: imprimen con WebUSB, luego Web Serial si está disponible, y recurren al diálogo del sistema cuando no hay una API directa.
- Carga la extension temporalmente en cada perfil de Firefox que use el POS y recarga la pestaña del POS.

## Orígenes permitidos

`manifest.json` limita el content script a `vexoraia.com`, sus subdominios y localhost. Si el frontend se publica en otro dominio, añade su match pattern explícito; no uses `<all_urls>`.
