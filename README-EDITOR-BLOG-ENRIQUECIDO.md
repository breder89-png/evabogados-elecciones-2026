# Editor enriquecido para el blog

Esta versión modifica `/blog/admin/` para que el contenido de cada publicación pueda editarse con formato visual.

Incluye controles para:

- fuente;
- tamaño de letra;
- color de texto;
- negrita;
- cursiva;
- subrayado;
- tachado;
- títulos H2, H3 y H4;
- cita;
- alineación izquierda, centrada, derecha y justificada;
- aumento y reducción de sangría;
- listas con viñetas y numeradas;
- enlaces;
- limpieza de formato;
- vista HTML.

No requiere migración de D1. El contenido se sigue guardando en el campo `body`, pero ahora puede contener HTML limpio.

Después de desplegar con Wrangler, ingresa a:

```txt
https://evabogados.com/blog/admin/
```

Edita o crea una publicación y usa el nuevo editor visual.

Para que el contenido enriquecido se vea en la lectura pública, también se actualizaron:

```txt
/blog/index.html
/functions/blog/post/[slug].js
```

Despliegue recomendado:

```cmd
npx wrangler pages deploy . --project-name=evabogados --branch=main
```
