# V69 - corrección urgente

Esta versión parte del V68 y corrige el error crítico:

Maximum call stack size exceeded

Causa: `partyMeta()` quedó llamándose a sí misma de forma recursiva.

También conserva:
- `_routes.json` válido para Cloudflare Pages Functions.
- `/api/health` para verificar el blog.
- Prioridad de logos reales del V68.
- Fotos locales y carga diferida del V68.

## Verificación

Después del deploy:

https://evabogados.com/api/health

Debe devolver JSON.

Probar:
https://evabogados.com/elecciones-2026/?anio=2026&test=v69
https://evabogados.com/elecciones-2026/?anio=2020&test=v69
https://evabogados.com/elecciones-2026/?anio=2016&test=v69
https://evabogados.com/elecciones-2026/?anio=2011&test=v69
