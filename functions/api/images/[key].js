export async function onRequestGet({ env, params }) {
  if (!env.BLOG_IMAGES) {
    return new Response("No se encontró el binding R2 BLOG_IMAGES.", { status: 500 });
  }

  const key = String(params.key || "");
  if (!key || key.includes("/") || key.includes("..")) {
    return new Response("Imagen inválida.", { status: 400 });
  }

  const object = await env.BLOG_IMAGES.get(key);
  if (!object) return new Response("Imagen no encontrada.", { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", headers.get("cache-control") || "public, max-age=86400");

  return new Response(object.body, { headers });
}
