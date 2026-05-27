# V72 - Corrección de espaciado de candidatos

Parte de V71 y conserva:
- fotos históricas,
- fix de caché,
- fix de blog/functions,
- logos reales,
- carrusel móvil.

Corrige el espacio excesivo entre candidatos producido por:
.winner-card { content-visibility:auto; contain-intrinsic-size:154px 320px }

Ese `contain-intrinsic-size` reservaba demasiada altura en Chrome antes de pintar cada tarjeta.

## Deploy

Desde esta carpeta:

npx wrangler@latest pages deploy . --project-name=evabogados --branch=main

## Prueba

Abrir con caché limpio:

https://evabogados.com/elecciones-2026/?anio=2026&test=v72
https://evabogados.com/elecciones-2026/?anio=2011&test=v72
https://evabogados.com/elecciones-2026/?anio=2016&test=v72

