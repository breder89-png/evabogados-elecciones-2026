# Corrección de valla electoral e interfaz parlamentaria

## Cambios principales

1. Se corrige la regla de elegibilidad para Diputados y Senadores. El cálculo con valla ya no aplica solo el 5% de votos válidos nacionales. Para Diputados exige simultáneamente:
   - 5% de votos válidos nacionales en la cámara respectiva; y
   - al menos 5% del número legal de miembros antes de barrera, lo que equivale a 7 diputados.

   Para Senadores se aplica sobre 60 curules, por lo que el umbral de miembros es 3 senadores.

2. La visualización de Diputados deja de usar hemiciclo semicircular y pasa a un mosaico compacto de 130 escaños para evitar deformaciones visuales.

3. La sección de Senadores queda como una sola cámara. Dentro del selector de circunscripción aparecen:
   - Sin filtro: muestra los 60 senadores.
   - Nacional: muestra los 30 senadores nacionales.
   - Regionales: muestra los 30 senadores regionales.
   - Regiones individuales: muestra la circunscripción regional específica.

4. Las fotos de candidatos se ajustan con recorte proporcional mediante object-fit: cover y object-position: center top, para evitar que se desborden o deformen las tarjetas.

## Archivo principal modificado

- elecciones-2026/index.html

## Despliegue

Ejecutar desde la raíz del proyecto:

```cmd
npx wrangler pages deploy . --project-name=evabogados --branch=main
```

Mantener eliminada la variable ONPE_PARLAMENTO_JSON_URL si se está usando data/parlamento-2026.json como fuente principal.
