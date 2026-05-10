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

export async function onRequestGet({ env, request }) {
  try {
    if (!isAuthorized(request, env)) return json({ error: "No autorizado." }, 401);
    if (!env.BLOG_DB) return json({ error: "No se encontró el binding D1 BLOG_DB." }, 500);

    const result = await env.BLOG_DB
      .prepare(`
        SELECT c.id, c.post_id, c.author_name, c.author_facebook, c.body, c.status, c.created_at, c.updated_at,
               p.title, p.slug
        FROM post_comments c
        JOIN posts p ON p.id = c.post_id
        WHERE c.status = 'pending'
        ORDER BY c.created_at DESC
        LIMIT 100
      `)
      .all();

    return json({ comments: result.results || [] });
  } catch (error) {
    return json({ error: error.message || "Error interno." }, 500);
  }
}
