# V80 - Corrección de actas, workflow GitHub y hora Perú

Base: V79.

Corrige:
- GitHub Actions: elimina `npm ci`. El log fallaba con "npm error Exit handler never called"; el updater no necesita dependencias.
- Actas territoriales: el updater ahora prioriza `_metadata.acta_onpe` / tablas globales antes que bloques territoriales viejos del row.
- Hora: la web interpreta ISO sin zona como UTC y muestra la fecha en `America/Lima`, evitando que 17:00 aparezca como 22:00.
- Mantiene interfaz, fotos, logos y carga rápida de V79.

Luego de desplegar y subir a GitHub, debes ejecutar manualmente:
Actions > Actualizar Parlamento 2026 > Run workflow

Después revisa `data/diagnostico-dapper.json`, especialmente `statusSamples.LA LIBERTAD`.
