# Interfaz propia para el panel Elecciones 2026

Esta versión reemplaza la apariencia anterior de `/elecciones-2026/` por una interfaz institucional propia de EVA Abogados.

## Cambios principales

- Encabezado institucional oscuro con identidad EVA.
- Panel de control con cámara, circunscripción, estado de actas y botón de actualización.
- Indicadores de votos válidos, nulos/blancos, votos útiles y votos sin representación.
- Vista de curules con y sin valla electoral.
- Tabla comparativa por organización política.
- Bloque de candidatos que alcanzarían curul cuando la fuente normalizada incluya candidatos, partido, circunscripción y voto preferencial.
- Modos de visualización: comparativo, candidatos y matriz.
- Actualización automática cada 3 minutos desde `/api/parlamento`.

## Variable requerida

La página sigue leyendo datos desde:

```txt
/api/parlamento
```

Por ello, en Cloudflare Pages debe mantenerse configurada esta variable:

```txt
ONPE_PARLAMENTO_JSON_URL=https://evabogados-parlamento-normalizador.breder89.workers.dev/parlamento-2026
```

Si la variable no existe o la fuente falla, el panel puede mostrar datos demostrativos según la configuración de `functions/api/parlamento.js`.

## Despliegue

Desplegar con Wrangler desde la carpeta principal del sitio:

```cmd
npx wrangler pages deploy . --project-name=evabogados --branch=main
```
