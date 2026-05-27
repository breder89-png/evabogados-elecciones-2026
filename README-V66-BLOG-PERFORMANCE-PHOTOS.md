# V66 - Fix blog, rendimiento móvil y fotos históricas diferidas

Este paquete parte del último V65 y agrega:

1. `_routes.json` más amplio para que Cloudflare Pages ejecute Functions en `/api/*`.
2. `/api/health` para verificar si Pages Functions está activo.
3. `/api/wiki-thumb/[name]` con búsqueda diferida en Wikipedia y páginas del Congreso.
4. URLs diferidas de foto para candidatos 2011/2016 que no tenían imagen.
5. Mejoras de rendimiento: `loading="lazy"`, `decoding="async"`, `fetchpriority="low"`.
6. Corrección móvil: carrusel horizontal visible para totales y sin bloqueo vertical al final/inicio del scroll.
7. Reordenamiento de logos locales para evitar íconos rotos de partidos históricos.
8. Limpieza de duplicados no usados (`assets/historicos`, backups V57).

## Verificación después del deploy

Abrir:

https://evabogados.com/api/health

Debe devolver JSON. Si devuelve HTML, Cloudflare no está ejecutando Pages Functions o se desplegó desde una carpeta equivocada.

## Nota técnica sobre fotos

2020 tiene fotos locales. 2011/2016 usan fotos remotas diferidas si existen en Wikipedia/Congreso. Si no existe una foto pública recuperable, la tarjeta usa logo del partido como respaldo, sin romper la interfaz.
