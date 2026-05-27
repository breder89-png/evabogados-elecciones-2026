# V67 - restauración de logos, fotos históricas y móvil totales

Cambios:
- Restaura prioridad de logos reales: usa primero `logoUrl`/JNE/Wikimedia y deja los SVG de siglas solo como último respaldo.
- Agrega fotos locales livianas para 2011 desde la página oficial del Congreso adjunta.
- Mantiene y refuerza fotos locales 2020 desde la página oficial del Congreso adjunta.
- Para 2016 usa fotos locales por coincidencia de nombre con legislaturas 2011/2020 y mantiene `/api/wiki-thumb` como fallback diferido.
- Mejora `/api/wiki-thumb/[name]` con búsqueda flexible en Wikipedia.
- Corrige móvil en `Totales`: carrusel horizontal con barra/scroll, sin bloquear la navegación vertical de la página.
- Mantiene el arreglo del blog con `_routes.json` y Pages Functions.

Verificación:
Test-Path -LiteralPath ".\functions\api\wiki-thumb\[name].js"
Test-Path ".\_routes.json"
Test-Path ".\functions\api\health.js"

Deploy:
npx wrangler@latest pages deploy . --project-name=evabogados --branch=main
