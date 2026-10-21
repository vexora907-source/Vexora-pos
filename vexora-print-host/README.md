# Vexora Print Host

Native Messaging host para conectar Firefox con impresoras ESC/POS USB locales. El frontend envía el ticket a la extensión; la extensión lo entrega por el protocolo Native Messaging; el host Python valida el mensaje y lo imprime usando `python-escpos` y `pyusb`.

## Requisitos de impresora

- Impresora USB compatible con ESC/POS.
- Python 3.10 o superior para instalar o ejecutar el host.
- Identificadores USB `vendor_id` y `product_id`.
- En Windows, la impresora debe exponer una interfaz USB compatible con libusb. Algunas impresoras requieren cambiar el driver con Zadig a WinUSB/libusbK; esto puede impedir que otros programas utilicen el driver anterior. Hazlo solo si conoces el impacto y conserva el instalador del driver original.
- En Linux, el usuario necesita permiso para acceder a ese dispositivo USB.

## Linux

Desde esta carpeta:

```sh
bash install_linux.sh
```

El instalador crea un entorno virtual local, instala dependencias y registra el manifiesto en `~/.mozilla/native-messaging-hosts/`. Luego:

1. Obtén los IDs con `lsusb` (aparecen como `ID vvvv:pppp`).
2. Edita `config.json` y reemplaza `0x0000` por esos valores, por ejemplo `"vendor_id": "0x04b8"`.
3. Si Linux niega el acceso USB, crea una regla udev específica para esos IDs y agrega tu usuario al grupo con acceso USB. Cierra e inicia sesión de nuevo para aplicar el grupo.
4. Carga la extensión desde `../vexora-extension/README.md`.

No ejecutes el POS como root para resolver permisos USB.

## Windows

Desde esta carpeta, ejecuta `install_windows.bat` con Python 3 instalado. El instalador crea un entorno virtual, instala dependencias, compila `vexora_host.exe` con PyInstaller y registra el manifiesto bajo `HKCU\Software\Mozilla\NativeMessagingHosts\com.vexora.print` para el usuario actual.

Después:

1. Abre `dist/config.json`.
2. En el Administrador de dispositivos, abre las propiedades de la impresora y consulta **Detalles → Id. de hardware**. Copia los valores `VID_xxxx` y `PID_yyyy` como `0xxxx` hexadecimal, por ejemplo `"vendor_id": "0x04b8"`.
3. Carga la extensión desde `../vexora-extension/README.md`.

No uses el `.bat` como `path` del manifiesto: Firefox necesita iniciar un ejecutable Native Messaging. El instalador registra el `.exe` generado.

## Configuración USB

`config.json` junto al host debe tener este formato:

```json
{
  "vendor_id": "0x04b8",
  "product_id": "0x0202",
  "interface": 0
}
```

Los valores del ejemplo son ilustrativos; usa los IDs de tu impresora. El host rechaza IDs vacíos o inválidos. Si el fabricante o modelo no implementa ESC/POS, el host no podrá crear recibos correctos.

## Flujo y seguridad

- El host solo acepta las acciones `print` para `caja` y `cocina`.
- El contenido del ticket se limita y se imprime como texto ESC/POS; no se aceptan comandos USB arbitrarios desde la página.
- El manifiesto permite únicamente `vexora-print@vexoraia.com`.
- La extensión limita la página a los matches de `vexora-extension/manifest.json`.
- La carga temporal de la extensión en Firefox se pierde al cerrar el navegador; para distribuirla permanentemente, debe firmarse en Mozilla Add-on Developer Hub.

## Diagnóstico

Si la extensión reporta que no puede conectar al host, confirma el registro del manifiesto, reinicia Firefox y revisa que su `path` exista. Si el host conecta pero no imprime, revisa los IDs en `config.json`, el permiso USB del sistema y el soporte ESC/POS de la impresora. El protocolo y el render de tickets pueden probarse sin conectar una impresora con `python -m unittest discover -s tests`.
