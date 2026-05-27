# V71 - Fotos históricas locales, cache y móvil

Base: V70.

Correcciones:
- Se corrige el problema de caché observado entre modo normal/incógnito: las fotos locales históricas y la ruta wiki-thumb usan `v=71`.
- Se integran fotos locales optimizadas desde los ZIP oficiales del Congreso que contienen `distrito-electoral.html`.
- 2020 queda con 130 fotos locales.
- 2011 queda con 125 fotos locales y 5 por búsqueda diferida.
- 2016 queda con 119 fotos locales y 11 por búsqueda diferida.
- Se conserva el `_routes.json` válido para el blog.
- En móvil, cuando hay muchos candidatos, el bloque principal usa carrusel horizontal con barra visible y touch-action `pan-x pan-y`.

## Despliegue

Desde esta carpeta:

npx wrangler@latest pages deploy . --project-name=evabogados --branch=main

## Prueba

Abrir con parámetro de caché:

https://evabogados.com/elecciones-2026/?anio=2026&test=v71
https://evabogados.com/elecciones-2026/?anio=2020&test=v71
https://evabogados.com/elecciones-2026/?anio=2016&test=v71
https://evabogados.com/elecciones-2026/?anio=2011&test=v71

Blog:
https://evabogados.com/api/health
