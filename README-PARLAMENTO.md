# Panel de curules proyectadas - Elecciones Generales 2026

## Ruta agregada

La página nueva queda disponible en:

```txt
/elecciones-2026/
```

El menú principal incluye el enlace **Elecciones 2026**.

## Qué incluye

- Selector de cámara: Diputados, Senado y Parlamento Andino.
- Selector de circunscripción.
- Resumen de actas contabilizadas.
- Cuatro métricas: votos nulos/blancos, votos válidos, votos perdidos y votos útiles.
- Dos paneles de curules: **sin valla** y **con valla**.
- Tabla comparativa por organización política.
- Lista referencial de candidatos.
- Actualización automática cada 3 minutos.

## Modo demostrativo y modo real

Por defecto, la API `/api/parlamento` devuelve datos de demostración. Esto permite probar el diseño inmediatamente.

Para alimentar el panel con datos reales, configure en Cloudflare Pages una variable de entorno:

```txt
ONPE_PARLAMENTO_JSON_URL
```

El valor debe ser una URL pública que devuelva JSON normalizado con esta estructura:

```json
{
  "updatedAt": "2026-05-04T18:30:00.000Z",
  "status": { "percent": 83.4, "processed": 77366, "total": 92766 },
  "camaras": {
    "diputados": {
      "name": "Diputados",
      "barrier": 0.05,
      "parties": [{ "name": "FUERZA POPULAR", "short": "FP", "color": "#f97316" }],
      "circunscripciones": [
        {
          "name": "LIMA METROPOLITANA",
          "seats": 40,
          "votes": [{ "party": "FUERZA POPULAR", "votes": 123456 }]
        }
      ],
      "nationalVotes": [{ "party": "FUERZA POPULAR", "votes": 1500000 }],
      "candidates": [
        {
          "name": "NOMBRE DEL CANDIDATO",
          "party": "FUERZA POPULAR",
          "partyShort": "FP",
          "circunscripcion": "LIMA METROPOLITANA",
          "votosPref": 74000,
          "posicion": 1
        }
      ],
      "blankNull": 100000
    }
  }
}
```

La función `functions/api/parlamento.js` puede adaptarse para transformar la fuente oficial de ONPE al esquema anterior.

## Despliegue

Despliegue con Wrangler, no con carga manual, para que Pages Functions funcione:

```cmd
npx wrangler pages deploy . --project-name=evabogados --branch=main
```

Luego verifique:

```txt
https://evabogados.com/elecciones-2026/
https://evabogados.com/api/parlamento
```

Si `/api/parlamento` muestra JSON, la función está activa.

## Nota técnica

El cálculo de curules usa método D'Hondt sobre los datos normalizados. La barrera electoral está fijada por defecto en `0.05` dentro de cada cámara. El resultado es una proyección técnica referencial y no reemplaza la información oficial ni la proclamación de resultados por los órganos electorales competentes.
