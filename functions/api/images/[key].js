function findImageBucket(env) {
  const candidates = [
    ["BLOG_IMAGES", env.BLOG_IMAGES],
    ["BLOG_IMAGES_BUCKET", env.BLOG_IMAGES_BUCKET],
    ["IMAGES", env.IMAGES],
    ["BLOG_R2", env.BLOG_R2]
  ];
  return candidates.find(([, bucket]) => bucket && typeof bucket.get === "function");
}

export async function onRequestGet({ env, params }) {
  const bucket = findImageBucket(env);
  if (!bucket) {
    return new Response("No se encontró un binding R2 válido para imágenes.", { status: 500 });
  }

  const key = String(params.key || "");
  if (!key || key.includes("/") || key.includes("..")) {
    return new Response("Imagen inválida.", { status: 400 });
  }

  const object = await bucket[1].get(key);
  if (!object) return new Response("Imagen no encontrada.", { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", headers.get("cache-control") || "public, max-age=86400");

  return new Response(object.body, { headers });
}
