# V65 - rendimiento 2026/2021 y fotos historicas seguras

Base: v64 blog-functions-fix.

Cambios:

- Se conserva `_routes.json` de v64 para que el blog y Pages Functions sigan funcionando.
- 2026 carga primero `/data/parlamento-2026.json` para cambios normales de ano/camara y usa `/api/parlamento` solo con los botones de actualizar o refresco automatico.
- Se agrega cache en memoria y precarga de anos para que 2026 y 2021 no se sientan mas lentos al volver a ellos.
- Se reemplazan las llamadas `/api/wiki-thumb` de 2011 y 2016 por fotos directas de Wikimedia cuando se pudo confirmar una pagina personal.
- Cuando no hubo foto publica confirmada, se deja fallback inmediato al logo local del partido, sin llamadas lentas en vivo.

Validaciones:

- JavaScript embebido de `elecciones-2026/index.html`: OK.
- JSON de `data/*.json`: OK.
- Conteo de electos: 2011 = 130 + 5, 2016 = 130 + 5, 2020 = 130, 2021 = 130 + 5.
