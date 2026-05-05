function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function parseTags(value) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function onRequestGet({ env, params }) {
  try {
    if (!env.BLOG_DB) {
      return json({ error: "No se encontró el binding D1 BLOG_DB." }, 500);
    }

    const row = await env.BLOG_DB
      .prepare(`
        SELECT id, slug, title, excerpt, body, image_url, category, tags, status, author, created_at, updated_at, published_at
        FROM posts
        WHERE slug = ? AND status = 'published'
        LIMIT 1
      `)
      .bind(params.slug)
      .first();

    if (!row) return json({ error: "Publicación no encontrada." }, 404);
    return json({ post: { ...row, tags: parseTags(row.tags) } });
  } catch (error) {
    return json({ error: error.message || "Error interno." }, 500);
  }
}
