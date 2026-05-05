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

const ALLOWED = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"]
]);

export async function onRequestPost({ env, request }) {
  try {
    if (!isAuthorized(request, env)) return json({ error: "No autorizado." }, 401);
    if (!env.BLOG_IMAGES) return json({ error: "No se encontró el binding R2 BLOG_IMAGES." }, 500);

    const form = await request.formData();
    const file = form.get("image");
    if (!file || typeof file === "string") return json({ error: "No se recibió imagen." }, 400);

    const contentType = file.type || "";
    if (!ALLOWED.has(contentType)) return json({ error: "Formato no permitido. Usa JPG, PNG, WEBP o GIF." }, 400);

    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) return json({ error: "La imagen supera 5 MB." }, 400);

    const ext = ALLOWED.get(contentType);
    const uuid = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
    const key = `${Date.now()}-${uuid}.${ext}`;

    await env.BLOG_IMAGES.put(key, await file.arrayBuffer(), {
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
    return json({ error: error.message || "Error interno." }, 500);
  }
}
