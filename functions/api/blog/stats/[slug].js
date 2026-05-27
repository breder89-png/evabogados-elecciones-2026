const jsonHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store"
};

async function ensureStats(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS post_stats (
      post_id INTEGER PRIMARY KEY,
      views INTEGER NOT NULL DEFAULT 0,
      likes INTEGER NOT NULL DEFAULT 0,
      dislikes INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(post_id) REFERENCES posts(id)
    )
  `).run();
}

function seededStats(post) {
  const seedSource = `${post.id || ""}:${post.slug || ""}:${post.title || ""}`;
  let seed = 0;
  for (let i = 0; i < seedSource.length; i += 1) seed = (seed * 31 + seedSource.charCodeAt(i)) >>> 0;
  const views = 1280 + (seed % 8200);
  const likes = Math.max(38, Math.min(views - 12, Math.round(views * (0.045 + ((seed % 70) / 1000)))));
  const id = Number(post.id || 0);
  const dislikes = id === 2 ? 1 : id === 5 ? 2 : 0;
  return { views, likes, dislikes };
}

async function statsFor(db, post, initialViews = 0) {
  const baseline = seededStats(post);
  const viewsFloor = Math.max(baseline.views, Number(initialViews) || 0);
  await db.prepare(`
    INSERT OR IGNORE INTO post_stats (post_id, views, likes, dislikes)
    VALUES (?, ?, ?, ?)
  `).bind(post.id, viewsFloor, baseline.likes, baseline.dislikes).run();
  let row = await db.prepare(`
    SELECT views, likes, dislikes
    FROM post_stats
    WHERE post_id = ?
  `).bind(post.id).first();
  if (!Number(row?.views || 0) && !Number(row?.likes || 0) && !Number(row?.dislikes || 0)) {
    await db.prepare(`
      UPDATE post_stats
      SET views = ?, likes = ?, dislikes = ?, updated_at = datetime('now')
      WHERE post_id = ?
    `).bind(viewsFloor, baseline.likes, baseline.dislikes, post.id).run();
  } else if (Number.isFinite(viewsFloor) && viewsFloor > Number(row?.views || 0)) {
    await db.prepare(`
      UPDATE post_stats
      SET views = max(views, ?), updated_at = datetime('now')
      WHERE post_id = ?
    `).bind(viewsFloor, post.id).run();
  }
  return db.prepare(`
    SELECT views, likes, dislikes
    FROM post_stats
    WHERE post_id = ?
  `).bind(post.id).first();
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: jsonHeaders });
}

async function postBySlug(db, slug) {
  return db.prepare(`
    SELECT id, slug, title
    FROM posts
    WHERE slug = ? AND status = 'published'
    LIMIT 1
  `).bind(slug).first();
}

export async function onRequestGet({ env, params }) {
  if (!env.BLOG_DB) return json({ error: "BLOG_DB no configurado." }, 500);
  await ensureStats(env.BLOG_DB);
  const post = await postBySlug(env.BLOG_DB, params.slug);
  if (!post) return json({ error: "Publicación no encontrada." }, 404);
  return json(await statsFor(env.BLOG_DB, post, Number(env.POST_VIEWS_INITIAL || 0)));
}

export async function onRequestPost({ env, request, params }) {
  if (!env.BLOG_DB) return json({ error: "BLOG_DB no configurado." }, 500);
  await ensureStats(env.BLOG_DB);
  const post = await postBySlug(env.BLOG_DB, params.slug);
  if (!post) return json({ error: "Publicación no encontrada." }, 404);
  await statsFor(env.BLOG_DB, post, Number(env.POST_VIEWS_INITIAL || 0));

  const body = await request.json().catch(() => ({}));
  if (body.event === "view") {
    await env.BLOG_DB.prepare(`
      UPDATE post_stats
      SET views = views + 1, updated_at = datetime('now')
      WHERE post_id = ?
    `).bind(post.id).run();
    return json(await statsFor(env.BLOG_DB, post));
  }

  const previous = body.previous === "like" || body.previous === "dislike" ? body.previous : "";
  const next = body.reaction === "like" || body.reaction === "dislike" ? body.reaction : "";
  if (previous === next) return json(await statsFor(env.BLOG_DB, post));

  const likeDelta = (next === "like" ? 1 : 0) - (previous === "like" ? 1 : 0);
  const dislikeDelta = (next === "dislike" ? 1 : 0) - (previous === "dislike" ? 1 : 0);
  await env.BLOG_DB.prepare(`
    UPDATE post_stats
    SET likes = max(0, likes + ?),
        dislikes = max(0, dislikes + ?),
        updated_at = datetime('now')
    WHERE post_id = ?
  `).bind(likeDelta, dislikeDelta, post.id).run();

  return json(await statsFor(env.BLOG_DB, post));
}
