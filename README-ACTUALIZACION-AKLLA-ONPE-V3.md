# Actualización Aklla + ONPE v3

Esta versión corrige la generación de `data/parlamento-2026.json` para no mezclar Diputados con una falsa circunscripción nacional.

## Orden correcto

1. Descomprimir el paquete.
2. Ejecutar:

```cmd
npm install
npm run update:parlamento
```

3. Revisar el diagnóstico generado:

```cmd
notepad data\diagnostico-aklla.json
```

4. Revisar el JSON:

```cmd
notepad data\parlamento-2026.json
```

Debe contener, como mínimo:

- `camaras.diputados.circunscripciones` con regiones.
- `camaras.senadoRegional.circunscripciones` con regiones.
- `camaras.senadoNacional.circunscripciones` con `NACIONAL`.
- `camaras.andino.circunscripciones` con `NACIONAL`.

5. Recién después desplegar:

```cmd
npx wrangler pages deploy . --project-name=evabogados --branch=main
```

## Verificación pública

Abrir:

```txt
https://evabogados.com/data/parlamento-2026.json
https://evabogados.com/api/parlamento
https://evabogados.com/elecciones-2026/
```

## Nota técnica

Si `data/diagnostico-aklla.json` muestra `rows: 0` en todos los XLSX, el script no logró descargar Aklla. En ese caso no debe desplegarse, porque el JSON no tendría datos reales.
