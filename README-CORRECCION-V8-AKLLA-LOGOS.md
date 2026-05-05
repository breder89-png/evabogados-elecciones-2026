# Corrección v8 — cálculo por fuente Aklla, valla y logos

Esta versión corrige la lectura de escaños para evitar que la interfaz vuelva a recalcular indebidamente la distribución cuando los XLSX de Aklla ya entregan resultados con y sin barrera.

## Cambios principales

1. El script `scripts/update-parlamento-json.mjs` incorpora `allocations.noBarrier` y `allocations.barrier` por cámara y circunscripción, tomados preferentemente de los archivos de resultado de Aklla.
2. La interfaz `/elecciones-2026/` usa primero esas asignaciones precomputadas. Solo si no existen, aplica cálculo D'Hondt como respaldo.
3. Para Diputados, la lógica de respaldo aplica la regla: 5% de votos válidos nacionales en la cámara y 7 diputados obtenidos previamente con votación propia antes de la barrera.
4. Para Senadores, la lógica de respaldo aplica la regla: 5% de votos válidos nacionales de la cámara y 3 senadores obtenidos previamente con votación propia.
5. La vista de Senadores mantiene el selector: Sin filtro, Nacional, Regional y cada distrito regional.
6. Los escaños intentan mostrar logos de partidos cuando la fuente XLSX entregue logo/símbolo. Si no hay logo, se mantiene la sigla.
7. Los distritos con pocos escaños usan cuadros más grandes para evitar que se vean demasiado pequeños.

## Prueba recomendada

Ejecutar:

```cmd
npm install
npm run update:parlamento
notepad data\diagnostico-aklla.json
notepad data\parlamento-2026.json
npx wrangler pages deploy . --project-name=evabogados --branch=main
```

Luego abrir la web con Ctrl+F5.

