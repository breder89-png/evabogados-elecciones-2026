function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function isAuthorized(request, env) {
  const token = env.BLOG_ADMIN_TOKEN;
  const header = request.headers.get("authorization") || "";
  return Boolean(token && header === `Bearer ${token}`);
}

function findImageBucket(env) {
  const candidates = [
    ["BLOG_IMAGES", env.BLOG_IMAGES],
    ["BLOG_IMAGES_BUCKET", env.BLOG_IMAGES_BUCKET],
    ["IMAGES", env.IMAGES],
    ["BLOG_R2", env.BLOG_R2]
  ];
  return candidates.find(([, bucket]) => bucket && typeof bucket.put === "function");
}

const ALLOWED = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"]
]);

const MAX_BYTES = 10 * 1024 * 1024;

export async function onRequestGet({ env, request }) {
  if (!isAuthorized(request, env)) return json({ error: "No autorizado." }, 401);
  const bucket = findImageBucket(env);
  return json({
    ok: Boolean(bucket),
    binding: bucket?.[0] || null,
    maxMB: MAX_BYTES / 1024 / 1024,
    allowedTypes: [...ALLOWED.keys()]
  });
}

export async function onRequestPost({ env, request }) {
  try {
    if (!isAuthorized(request, env)) return json({ error: "No autorizado." }, 401);
    const bucket = findImageBucket(env);
    if (!bucket) {
      return json({
        error: "No se encontró un binding R2 válido para imágenes.",
        detail: "Configura el binding BLOG_IMAGES en Cloudflare Pages, o usa BLOG_IMAGES_BUCKET, IMAGES o BLOG_R2."
      }, 500);
    }

    const form = await request.formData();
    const file = form.get("image");
    if (!file || typeof file === "string") return json({ error: "No se recibió imagen." }, 400);

    const contentType = file.type || "";
    if (!ALLOWED.has(contentType)) return json({ error: "Formato no permitido. Usa JPG, PNG, WEBP o GIF." }, 400);

    if (file.size > MAX_BYTES) return json({ error: "La imagen supera 10 MB. Redúcela o conviértela a WEBP/JPG antes de subirla." }, 400);

    const ext = ALLOWED.get(contentType);
    const uuid = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
    const key = `${Date.now()}-${uuid}.${ext}`;

    await bucket[1].put(key, await file.arrayBuffer(), {
      httpMetadata: {
        contentType,
        cacheControl: "public, max-age=31536000, immutable"
      },
      customMetadata: {
        originalName: file.name || "imagen-blog"
      }
    });

    return json({ key, url: `/api/images/${key}` }, 201);
  } catch (error) {
    return json({
      error: error.message || "Error interno.",
      detail: "La subida llegó al servidor, pero falló al guardar en R2. Revisa el binding de Cloudflare Pages y el tamaño/formato del archivo."
    }, 500);
  }
}
