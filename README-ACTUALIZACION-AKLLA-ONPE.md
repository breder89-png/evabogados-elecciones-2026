# Actualización automática del panel parlamentario EVA

Este paquete genera el archivo normalizado que consume el panel electoral:

```txt
/data/parlamento-2026.json
```

La web lee ese archivo mediante:

```txt
/api/parlamento
```

Si `ONPE_PARLAMENTO_JSON_URL` no existe en Cloudflare Pages, `/api/parlamento` intenta leer `/data/parlamento-2026.json`. Por eso puedes mantener eliminada temporalmente esa variable y trabajar con el archivo generado por script.

## Fuentes usadas

### ONPE

Se usa para el avance general de actas y totales cuando sus endpoints responden JSON desde el entorno que ejecuta el script.

### Aklla

Se usa como fuente secundaria estructurada para curules, candidatos, edades, fotos, voto preferencial y distribución por cámara. El script descarga automáticamente estos XLSX públicos:

```txt
https://congresoeg2026.akllaperu.pe/resumen_diputados.xlsx
https://congresoeg2026.akllaperu.pe/resumen_diputados_nac.xlsx
https://congresoeg2026.akllaperu.pe/resumen_senado.xlsx
https://congresoeg2026.akllaperu.pe/resumen_senado_nac.xlsx
https://congresoeg2026.akllaperu.pe/resumen_andino.xlsx
https://congresoeg2026.akllaperu.pe/resumen_andino_nac.xlsx
https://congresoeg2026.akllaperu.pe/electos_totales_sin_barrera.xlsx
https://congresoeg2026.akllaperu.pe/electos_totales_con_barrera.xlsx
https://congresoeg2026.akllaperu.pe/resultado_diputados_sin_barrera.xlsx
https://congresoeg2026.akllaperu.pe/resultado_diputados_con_barrera.xlsx
https://congresoeg2026.akllaperu.pe/resultado_senado_multiple_sin_barrera.xlsx
https://congresoeg2026.akllaperu.pe/resultado_senado_multiple_con_barrera.xlsx
https://congresoeg2026.akllaperu.pe/resultado_senado_nacional_sin_barrera.xlsx
https://congresoeg2026.akllaperu.pe/resultado_senado_nacional_con_barrera.xlsx
https://congresoeg2026.akllaperu.pe/rresultado_andino_con_barrera.xlsx
https://congresoeg2026.akllaperu.pe/resultado_final_escanos_combinado.xlsx
https://congresoeg2026.akllaperu.pe/resultados_actas.xlsx
```

El parámetro `v=` se agrega automáticamente para evitar caché.

## Prueba local

Desde la carpeta raíz del proyecto:

```cmd
npm install
npm run update:parlamento
```

Luego verifica que exista:

```txt
data/parlamento-2026.json
```

Debe contener, como mínimo:

```txt
updatedAt
status
camaras.diputados
camaras.senadoNacional
camaras.senadoRegional
camaras.senadoTotal
camaras.andino
```

## Despliegue manual

Después de generar el JSON:

```cmd
npx wrangler pages deploy . --project-name=evabogados --branch=main
```

O todo junto:

```cmd
npm run update-and-deploy
```

## Automatización con Windows

Puedes programar esta acción cada 10 o 15 minutos:

Programa:

```txt
cmd.exe
```

Argumentos:

```cmd
/c cd /d "C:\RUTA\A\TU\PROYECTO" && npm run update-and-deploy
```

Esta opción depende de que la PC esté encendida, con internet y con sesión de Wrangler activa.

## Automatización con GitHub Actions

El paquete incluye:

```txt
.github/workflows/update-parlamento-json.yml
```

Ese workflow ejecuta `npm run update:parlamento` cada 15 minutos y commitea `data/parlamento-2026.json` si cambió.

Si Cloudflare Pages está conectado al repositorio de GitHub, cada commit puede disparar un despliegue automático. Si tu sitio sigue como Direct Upload, GitHub actualizará el repositorio, pero no publicará la web salvo que agregues un paso con Wrangler y token de Cloudflare.

## Nota metodológica sugerida

Fuente oficial de resultados: ONPE. Fuente secundaria de estructuración parlamentaria: archivos XLSX públicos procesados desde Aklla. La proyección es referencial y no reemplaza la proclamación oficial de resultados por los órganos electorales competentes.
