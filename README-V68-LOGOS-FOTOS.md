# V68 - Restauración de logos y fotos locales oficiales

Cambios aplicados sobre V67:

- `_routes.json` corregido: sin reglas superpuestas de Cloudflare.
- Logos: se restaura prioridad de logos reales/locales por alias normalizados; ya no debe caer a letras cuando existe logo.
- Fotos locales:
  - 2020: 130 fotos locales desde página oficial del Congreso adjunta.
  - 2011: 110 fotos locales desde página oficial del Congreso adjunta; 20 quedan con búsqueda diferida por `/api/wiki-thumb`.
  - 2016: 32 fotos locales por coincidencia exacta con 2011/2020; los demás requieren el ZIP correcto de la página del Congreso filtrada a Julio 2016 - Setiembre 2019 o equivalente.
- Candidatos sin foto local usan `/api/wiki-thumb` y luego logo del partido; no letras salvo que no exista logo.

IMPORTANTE SOBRE 2016:
El ZIP `Congresistas por Distrito Electoral – Parlamento Peruano16_files.zip` que se adjuntó contiene nombres como Absalón Montoya y Hirma Alencastre, es decir corresponde al Congreso complementario 2020-2021 dentro del periodo 2016-2021, no a la nómina electa 2016-2019. Para cargar fotos completas 2016 se necesita guardar la página del Congreso seleccionando:
Periodo: Parlamentario 2016 - 2021
Condición/fecha: Julio 2016 - Setiembre 2019 o equivalente a electos 2016 antes de disolución.
Luego enviar el `.html` y la carpeta `_files.zip`.

Pasos:
1. Descomprimir.
2. Revisar `Test-Path -LiteralPath ".\functions\api\wiki-thumb\[name].js"`.
3. Desplegar con `npx wrangler@latest pages deploy . --project-name=evabogados --branch=main`.
4. Verificar `https://evabogados.com/api/health`.
