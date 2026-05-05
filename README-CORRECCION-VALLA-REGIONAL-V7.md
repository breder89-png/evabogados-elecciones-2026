# Corrección v7: valla parlamentaria y desglose regional del Senado

Esta versión corrige dos aspectos de la interfaz electoral:

1. Valla para Diputados y Senado: se aplica una lista estricta de organizaciones calificadas conforme a la lectura actual del escenario cargado: FP, RP, AN, OBRAS, PBG y JPP. La regla se usa para evitar que organizaciones como PPT aparezcan en la distribución con valla cuando no cumplen el umbral de escaños propios previo.

2. Senadores: se mantiene una sola categoría principal, pero el selector de circunscripción incluye:
   - Sin filtro
   - Nacional
   - Regional
   - Regional · cada distrito electoral

La vista de Senado Regional ya permite revisar distrito por distrito, incluido Lima Metropolitana con cuatro escaños y los demás distritos con un escaño.

Para desplegar:

```cmd
npm install
npm run update:parlamento
npx wrangler pages deploy . --project-name=evabogados --branch=main
```

Luego presionar Ctrl + F5 en el navegador.
