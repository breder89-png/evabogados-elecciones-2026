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

function normalizePost(row) {
  return {
    ...row,
    image_url: row.image_url || "",
    tags: parseTags(row.tags)
  };
}

export async function onRequestGet({ env, request }) {
  try {
    if (!env.BLOG_DB) {
      return json({ error: "No se encontró el binding D1 BLOG_DB." }, 500);
    }

    const url = new URL(request.url);
    const q = (url.searchParams.get("q") || "").trim();
    const category = (url.searchParams.get("category") || "").trim();
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || 50), 1), 100);

    let sql = `
      SELECT id, slug, title, excerpt, body, image_url, category, tags, status, author, created_at, updated_at, published_at
      FROM posts
      WHERE status = 'published'
    `;
    const params = [];

    if (category) {
      sql += " AND category = ?";
      params.push(category);
    }

    if (q) {
      sql += " AND (lower(title) LIKE ? OR lower(excerpt) LIKE ? OR lower(body) LIKE ? OR lower(category) LIKE ? OR lower(tags) LIKE ?)";
      const like = `%${q.toLowerCase()}%`;
      params.push(like, like, like, like, like);
    }

    sql += " ORDER BY COALESCE(published_at, created_at) DESC LIMIT ?";
    params.push(limit);

    const result = await env.BLOG_DB.prepare(sql).bind(...params).all();
    return json({ posts: (result.results || []).map(normalizePost) });
  } catch (error) {
    return json({ error: error.message || "Error interno." }, 500);
  }
}
