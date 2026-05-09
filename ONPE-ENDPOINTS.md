# Captura de endpoints ONPE para normalizar datos

La web actual puede actualizarse cada 5 minutos, pero hoy sus votos y candidatos salen de archivos XLSX de AKLLA. Si AKLLA está atrasado, el JSON también queda atrasado.

Para alimentar la web directamente con ONPE necesitamos los `Request URL` reales que devuelve JSON. Captúralos así:

1. Abre `https://resultadoelectoral.onpe.gob.pe/main/resumen`.
2. Presiona `F12`.
3. Entra a `Network`.
4. Filtra por `Fetch/XHR`.
5. Elige la cámara: Diputados, Senadores o Parlamento Andino.
6. Cambia la circunscripción, por ejemplo `ÁNCASH`.
7. Abre estas pestañas de ONPE: resultado por ubicación geográfica, organización política, candidato y actas.
8. En cada request que devuelva datos, clic derecho > `Copy` > `Copy link address`.
9. Pega cada URL completa en `data/onpe-endpoints.txt`, una por línea.
10. Ejecuta:

```bash
npm run probe:onpe
```

El script guardará muestras en `data/onpe-samples/`. Con esas muestras ya se puede escribir el normalizador ONPE real para votos, actas, blancos/nulos, candidatos y votos preferenciales.
