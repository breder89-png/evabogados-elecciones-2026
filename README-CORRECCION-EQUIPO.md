# Corrección de ruta /equipo/

Este paquete corrige el error ERR_TOO_MANY_REDIRECTS en la página Nuestro Equipo.

Cambios aplicados:

1. Se eliminó `_redirects`, porque la regla que reescribía `/equipo` hacia `/equipo.html` podía entrar en conflicto con las rutas limpias de Cloudflare Pages.
2. Se eliminó `equipo.html` como ruta duplicada.
3. La página de equipo queda únicamente como `equipo/index.html`.
4. Todos los enlaces internos fueron cambiados a `/equipo/`.

Rutas esperadas:

- Inicio: `/`
- Equipo: `/equipo/`
- Blog: `/blog/`
- Administrador del blog: `/blog/admin/`
- Brochure: `/Brochure.pdf`

Si después de desplegar este ZIP el error continúa, revise en Cloudflare si existe alguna regla externa en `Rules > Redirect Rules` o `Rules > Page Rules` que fuerce una redirección sobre `/equipo`.
