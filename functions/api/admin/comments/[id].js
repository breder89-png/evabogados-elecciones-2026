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

export async function onRequestPut({ env, request, params }) {
  try {
    if (!isAuthorized(request, env)) return json({ error: "No autorizado." }, 401);
    if (!env.BLOG_DB) return json({ error: "No se encontró el binding D1 BLOG_DB." }, 500);

    const id = Number(params.id);
    if (!Number.isInteger(id) || id <= 0) return json({ error: "ID inválido." }, 400);

    const payload = await request.json().catch(() => ({}));
    const status = payload.status === "approved" ? "approved" : payload.status === "rejected" ? "rejected" : "";
    if (!status) return json({ error: "Estado inválido." }, 400);

    const now = new Date().toISOString();
    const result = await env.BLOG_DB
      .prepare(`
        UPDATE post_comments
        SET status = ?, updated_at = ?
        WHERE id = ?
        RETURNING id, post_id, author_name, author_facebook, body, status, created_at, updated_at
      `)
      .bind(status, now, id)
      .first();

    if (!result) return json({ error: "Comentario no encontrado." }, 404);
    return json({ comment: result });
  } catch (error) {
    return json({ error: error.message || "Error interno." }, 500);
  }
}
