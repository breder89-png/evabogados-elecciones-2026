# V77 - Interfaz correcta + actualización live Decide/Dapper

Este paquete parte del ZIP que contiene la interfaz correcta del observatorio.

Corrige:
- Mantiene la interfaz horizontal correcta de candidatos.
- Desactiva el workflow antiguo AKLLA para que no sobrescriba el JSON con datos viejos.
- Deja activo el workflow Decide/Dapper live.
- La web 2026 intenta leer primero el JSON raw de GitHub, para que los cambios del Action se vean sin esperar un redeploy de Cloudflare.
- Si GitHub raw demora, cae al JSON local o a /api/parlamento.
- Mejora extracción de actas territoriales con alias de campos.
- Mejora primera pintura de candidatos 2026: pinta un primer bloque y completa el resto en segundo plano.
- Agrega _routes.json y /api/health para verificar Pages Functions.

Verificación local:
Test-Path ".\.github\workflows\actualizar-parlamento.yml"
Test-Path ".\.github\workflows\update-parlamento-json.yml"
Test-Path ".\elecciones-2026\index.html"
Test-Path ".\data\parlamento-2026.json"
Test-Path ".\_routes.json"

Debe salir True en todos. El workflow update-parlamento-json.yml existe, pero está DESACTIVADO.
