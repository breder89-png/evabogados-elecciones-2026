# V79 - corrección integral de datos 2026, fotos y velocidad

Base usada: V72 (fotos históricas y espaciado correcto) + scripts/workflows de actualización live corregidos.

Corrige:
- No se pierden fotos/logos históricos de V72.
- 2026 usa datos actualizados de Decide/Dapper, pero conserva fotos de candidatos del respaldo cuando la fuente live no las trae.
- El orden de candidatos vuelve a ser por voto preferencial primero, no por si tiene foto. Esto corrige casos como Áncash.
- Las actas territoriales ya no deben copiar el total nacional; el updater busca actas por circunscripción de forma recursiva en el JSON live.
- La primera carga usa JSON local rápido y luego intenta refrescar GitHub Raw en segundo plano.
- Mantiene candidatos en carrusel horizontal y el diseño correcto de V72.
- Mantiene `_routes.json` válido para blog/API.

Pasos:
1. Desplegar esta carpeta en Cloudflare.
2. Copiar el contenido en el repositorio GitHub real y hacer commit/push.
3. Ejecutar manualmente Actions > Actualizar Parlamento 2026.
4. Esperar que se actualice data/parlamento-2026.json.
