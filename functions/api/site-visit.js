const FALLBACK_TOTAL = 10876;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

async function ensureMetric(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS site_metrics (
      key TEXT PRIMARY KEY,
      value INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `).run();
  await db
    .prepare("INSERT OR IGNORE INTO site_metrics (key, value) VALUES ('total_visits', ?)")
    .bind(FALLBACK_TOTAL)
    .run();
}

async function readTotal(db) {
  const row = await db
    .prepare("SELECT value FROM site_metrics WHERE key = 'total_visits' LIMIT 1")
    .first();
  return Math.max(FALLBACK_TOTAL, Number(row?.value || 0));
}

export async function onRequestGet({ env }) {
  if (!env.BLOG_DB) return json({ total: FALLBACK_TOTAL, fallback: true });
  try {
    await ensureMetric(env.BLOG_DB);
    return json({ total: await readTotal(env.BLOG_DB) });
  } catch (error) {
    return json({ total: FALLBACK_TOTAL, fallback: true, error: error.message || "site-visit" });
  }
}

export async function onRequestPost({ env }) {
  if (!env.BLOG_DB) return json({ total: FALLBACK_TOTAL, fallback: true });
  try {
    await ensureMetric(env.BLOG_DB);
    await env.BLOG_DB
      .prepare("UPDATE site_metrics SET value = MAX(value + 1, ?), updated_at = datetime('now') WHERE key = 'total_visits'")
      .bind(FALLBACK_TOTAL + 1)
      .run();
    return json({ total: await readTotal(env.BLOG_DB) });
  } catch (error) {
    return json({ total: FALLBACK_TOTAL, fallback: true, error: error.message || "site-visit" });
  }
}
