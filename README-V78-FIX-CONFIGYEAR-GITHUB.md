# V78 - Fix configYear y subida correcta a GitHub

Corrige el error en pantalla:

configYear is not defined

Causa: la interfaz llamaba una función inexistente. Se reemplazó por:

electionConfig().year

También se movió el workflow viejo `update-parlamento-json.yml` fuera de `.github/workflows` para que no aparezca como Action activa.

## Deploy Cloudflare

Desde esta carpeta:

npx wrangler@latest pages deploy . --project-name=evabogados --branch=main

## GitHub

Esta carpeta descomprimida NO es repositorio Git. Para subir a GitHub hay que copiar su contenido dentro de la carpeta clonada del repo que sí contiene `.git`, o clonar nuevamente el repo y copiar encima.
