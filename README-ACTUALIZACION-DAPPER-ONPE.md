# Actualización parlamentaria por respaldo Dapper/ONPE

Esta versión agrega un actualizador alternativo para cuando AKLLA esté caído o desfasado.

## Qué usa

El script consulta endpoints públicos de `https://elecciones2026.dapperglobal.com`, que declaran fuente ONPE y exponen datos ya normalizados por cámara, circunscripción, actas y candidatos. No son endpoints crudos oficiales de ONPE; por eso el JSON queda marcado como:

```json
"sourceMode": "generated-dapper-onpe-fallback-v1"
```

## Comando local

```powershell
npm run update:parlamento:dapper
```

Eso regenera:

- `data/parlamento-2026.json`
- `data/diagnostico-dapper.json`

## GitHub Actions

El workflow `.github/workflows/actualizar-parlamento.yml` ya quedó apuntando a:

```yaml
run: npm run update:parlamento:dapper
```

Con eso GitHub intentará actualizar cada 5 minutos y hará commit solo si el JSON cambia.

## Rutas principales usadas

- `/api/pe-electoral-districts`
- `/api/pe-legislative-district?tipo=diputados&distrito=2`
- `/api/pe-legislative-district?tipo=senadores&distrito=nacional`
- `/api/pe-legislative-district?tipo=senadores&distrito=2`
- `/api/pe-seat-assignment`
- `/api/pe-parlamento-andino`

## Advertencia

Sirve como continuidad operativa para que el observatorio no quede congelado cuando AKLLA no responda. Para una publicación final o proclamatoria, debe contrastarse con ONPE/JNE.
