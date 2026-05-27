function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

export async function onRequestGet({ env }) {
  return json({
    ok: true,
    service: "EV Abogados Pages Functions",
    message: "Pages Functions está activo para /api/*.",
    hasBlogDb: Boolean(env.BLOG_DB),
    hasBlogImages: Boolean(env.BLOG_IMAGES),
    hasBlogAdminToken: Boolean(env.BLOG_ADMIN_TOKEN),
    timestamp: new Date().toISOString()
  });
}
