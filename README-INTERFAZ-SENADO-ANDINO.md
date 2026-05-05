# Interfaz EVA v2 para Elecciones 2026

Esta versión rediseña `/elecciones-2026/` para diferenciar visualmente cámaras pequeñas y cámaras territoriales.

## Cambios principales

- Parlamento Andino se muestra como mosaico de 5 escaños.
- Senado nacional único se muestra como cuadrícula de 30 escaños.
- Senado regional se agrega como cámara independiente de 30 escaños.
- Cámara de Senadores total se agrega como vista combinada de 60 escaños: 30 nacionales + 30 regionales.
- Diputados mantiene visualización tipo hemiciclo por ser una cámara de mayor tamaño.
- El bloque de candidatos se mantiene y proyecta ganadores cuando la fuente normalizada incluye candidatos y votos preferenciales.

## Claves de datos esperadas

La vista usa `/api/parlamento`, que a su vez lee la variable de Pages `ONPE_PARLAMENTO_JSON_URL`.

El JSON puede incluir estas cámaras:

```txt
camaras.diputados
camaras.senado              // tratado como Senado nacional único
camaras.senadoNacional      // alternativa explícita
camaras.senadoRegional      // Senado regional
camaras.andino
```

La vista `Cámara de Senadores total` combina `senado/senadoNacional` con `senadoRegional`. Si `senadoRegional` aún no está disponible, muestra el bloque regional como pendiente.

## Despliegue

Desplegar con Wrangler desde la carpeta principal del sitio:

```cmd
npx wrangler pages deploy . --project-name=evabogados --branch=main
```
