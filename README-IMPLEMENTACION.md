# Sitio EVAbogados con blog, panel admin e imágenes

Este paquete consolida la página principal, la página de equipo, el brochure y el blog dinámico con soporte de imagen principal por publicación.

## Estructura principal

- `index.html`: página principal.
- `equipo/index.html`: página Nuestro Equipo en `/equipo/`.
- `Brochure.pdf`: brochure institucional.
- `blog/index.html`: blog público con tarjetas e imagen principal.
- `blog/admin/index.html`: panel de administración para crear, editar y eliminar publicaciones.
- `functions/api/posts.js`: API pública de posts.
- `functions/api/admin/posts.js`: API administrativa de posts.
- `functions/api/admin/upload.js`: API para subir imágenes a R2.
- `functions/api/images/[key].js`: API pública para servir imágenes desde R2.
- `schema.sql`: esquema actualizado de D1 para crear la tabla con `image_url`.
- `migration-add-image-url.sql`: migración para bases D1 creadas con la versión anterior.

## Bindings necesarios en Cloudflare Pages

Para posts:

- Tipo: D1 database
- Nombre del binding: `BLOG_DB`
- Base: la base D1 que creaste para el blog

Para imágenes:

- Tipo: R2 bucket
- Nombre del binding: `BLOG_IMAGES`
- Bucket: `evabogados-blog-images` o el nombre que elijas

Para administración:

- Variable secreta: `BLOG_ADMIN_TOKEN`
- Valor: una clave larga que solo conozca el administrador

## Si la base D1 es nueva

Ejecuta solo:

```bash
npx wrangler d1 execute evabogados-blog-db --remote --file=./schema.sql
```

## Si ya habías creado la base D1 con la versión anterior

Ejecuta solo esta migración:

```bash
npx wrangler d1 execute evabogados-blog-db --remote --file=./migration-add-image-url.sql
```

No ejecutes esa migración más de una vez, porque SQLite/D1 puede devolver error por columna duplicada.

## Crear bucket R2 por comando

```bash
npx wrangler r2 bucket create evabogados-blog-images
```

También puedes crearlo desde el dashboard de Cloudflare.

## Despliegue recomendado

Debes desplegar con Wrangler para que Cloudflare incluya la carpeta `functions`:

```bash
npx wrangler pages deploy . --project-name=evabogados --branch=main
```

## Rutas finales

- Página principal: `/`
- Equipo: `/equipo/`
- Blog público: `/blog/`
- Panel de administración: `/blog/admin/`
- API pública: `/api/posts`


## Compartir publicaciones

Esta versión agrega botones para compartir posts por Facebook, WhatsApp y Messenger. Para que Facebook y WhatsApp muestren mejor título, descripción e imagen, cada publicación tiene una ruta pública con metadatos Open Graph: `/blog/post/[slug]/`.

El botón Messenger usa un enlace profundo móvil (`fb-messenger://`). En escritorio puede depender de la aplicación instalada; por eso también se incluye el botón `Copiar enlace`.


Actualización: el blog incluye botones para compartir publicaciones en Facebook, WhatsApp, Messenger, X (Twitter) y copiar enlace.


## Panel electoral agregado

Se añadió la ruta `/elecciones-2026/` y la función `/api/parlamento`. Revise `README-PARLAMENTO.md`.
