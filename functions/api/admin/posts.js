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

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90) || `post-${Date.now()}`;
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
  return { ...row, image_url: row.image_url || "", tags: parseTags(row.tags) };
}

async function ensureUniqueSlug(db, baseSlug) {
  let slug = baseSlug;
  let i = 2;
  while (true) {
    const existing = await db.prepare("SELECT id FROM posts WHERE slug = ? LIMIT 1").bind(slug).first();
    if (!existing) return slug;
    slug = `${baseSlug}-${i++}`;
  }
}

function sanitizeUrl(value) {
  const url = String(value || "").trim();
  if (!url) return "";
  if (url.startsWith("/api/images/")) return url;
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
    return parsed.toString();
  } catch {
    throw new Error("La URL de imagen no es válida.");
  }
}

function sanitizePayload(input) {
  const title = String(input.title || "").trim();
  const body = String(input.body || "").trim();
  if (!title) throw new Error("El título es obligatorio.");
  if (!body) throw new Error("El contenido es obligatorio.");

  const status = input.status === "draft" ? "draft" : "published";
  const tags = Array.isArray(input.tags)
    ? input.tags.map(tag => String(tag).trim()).filter(Boolean).slice(0, 20)
    : String(input.tags || "").split(",").map(tag => tag.trim()).filter(Boolean).slice(0, 20);

  return {
    title,
    body,
    image_url: sanitizeUrl(input.image_url),
    excerpt: String(input.excerpt || "").trim(),
    category: String(input.category || "General").trim() || "General",
    tags,
    status,
    author: String(input.author || "EVA Abogados").trim() || "EVA Abogados",
    slug: slugify(input.slug || title)
  };
}

export async function onRequestGet({ env, request }) {
  try {
    if (!isAuthorized(request, env)) return json({ error: "No autorizado." }, 401);
    if (!env.BLOG_DB) return json({ error: "No se encontró el binding D1 BLOG_DB." }, 500);

    const result = await env.BLOG_DB
      .prepare(`
        SELECT id, slug, title, excerpt, body, image_url, category, tags, status, author, created_at, updated_at, published_at
        FROM posts
        ORDER BY updated_at DESC, created_at DESC
      `)
      .all();

    return json({ posts: (result.results || []).map(normalizePost) });
  } catch (error) {
    return json({ error: error.message || "Error interno." }, 500);
  }
}

export async function onRequestPost({ env, request }) {
  try {
    if (!isAuthorized(request, env)) return json({ error: "No autorizado." }, 401);
    if (!env.BLOG_DB) return json({ error: "No se encontró el binding D1 BLOG_DB." }, 500);

    const payload = sanitizePayload(await request.json());
    const slug = await ensureUniqueSlug(env.BLOG_DB, payload.slug);
    const now = new Date().toISOString();
    const publishedAt = payload.status === "published" ? now : null;

    const result = await env.BLOG_DB
      .prepare(`
        INSERT INTO posts (slug, title, excerpt, body, image_url, category, tags, status, author, created_at, updated_at, published_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        RETURNING id, slug, title, excerpt, body, image_url, category, tags, status, author, created_at, updated_at, published_at
      `)
      .bind(slug, payload.title, payload.excerpt, payload.body, payload.image_url, payload.category, JSON.stringify(payload.tags), payload.status, payload.author, now, now, publishedAt)
      .first();

    return json({ post: normalizePost(result) }, 201);
  } catch (error) {
    return json({ error: error.message || "Error interno." }, 400);
  }
}
