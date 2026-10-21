@echo off
setlocal
set "HOST_DIR=%~dp0"
cd /d "%HOST_DIR%"

where py >nul 2>nul
if errorlevel 1 (
  echo No se encontro el launcher py. Instala Python 3 desde python.org y vuelve a ejecutar este archivo.
  exit /b 1
)
py -3 -c "import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)"
if errorlevel 1 (
  echo Se requiere Python 3.10 o superior.
  exit /b 1
)

if not exist ".venv\Scripts\python.exe" py -3 -m venv ".venv"
if errorlevel 1 exit /b 1
".venv\Scripts\python.exe" -m pip install --upgrade pip
if errorlevel 1 exit /b 1
".venv\Scripts\python.exe" -m pip install -r "requirements.txt" pyinstaller
if errorlevel 1 exit /b 1
".venv\Scripts\pyinstaller.exe" --clean --noconfirm --onefile --collect-submodules escpos --collect-submodules usb --name vexora_host --distpath "%HOST_DIR%dist" "%HOST_DIR%vexora_host.py"
if errorlevel 1 exit /b 1

if not exist "%HOST_DIR%dist\config.json" copy "%HOST_DIR%config.example.json" "%HOST_DIR%dist\config.json" >nul
".venv\Scripts\python.exe" "%HOST_DIR%write_native_manifest.py" "%HOST_DIR%dist\vexora_host.exe" "%HOST_DIR%dist\com.vexora.print.json"
if errorlevel 1 exit /b 1

reg add "HKCU\Software\Mozilla\NativeMessagingHosts\com.vexora.print" /ve /t REG_SZ /d "%HOST_DIR%dist\com.vexora.print.json" /f
if errorlevel 1 exit /b 1

echo.
echo Host instalado y registrado para el usuario actual.
echo Configura vendor_id y product_id en "%HOST_DIR%dist\config.json".
echo Luego carga vexora-extension\manifest.json desde Firefox about:debugging.
