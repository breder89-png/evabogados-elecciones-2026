# V70 - Fix real del Maximum call stack size exceeded

El V69 aún conservaba esta línea defectuosa:

return partyMeta(partyMap,party)||...

Eso hacía que partyMeta() se llamara a sí misma infinitamente.

Esta versión reemplaza la función por una búsqueda iterativa segura y mantiene:
- _routes.json válido
- blog functions
- logos reales
- fotos locales/carga diferida del paquete anterior

## Despliegue

Desde la carpeta descomprimida:

npx wrangler@latest pages deploy . --project-name=evabogados --branch=main

## Prueba

Abrir con caché limpio:

https://evabogados.com/elecciones-2026/?anio=2026&test=v70
https://evabogados.com/elecciones-2026/?anio=2020&test=v70
https://evabogados.com/elecciones-2026/?anio=2016&test=v70
https://evabogados.com/elecciones-2026/?anio=2011&test=v70

Verificar blog:

https://evabogados.com/api/health
