function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function parseTags(value) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatDate(value) {
  try {
    return new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(value));
  } catch {
    return "";
  }
}

function sanitizeRichContent(body) {
  const raw = String(body || "");
  if (!/<\/?[a-z][\s\S]*>/i.test(raw)) {
    return esc(raw).split(/\n{2,}/).map(p => `<p>${p.replaceAll("\n", "<br>")}</p>`).join("\n");
  }

  let html = raw
    .replace(/<\s*(script|style|iframe|object|embed|form|input|button|textarea|select|meta|link)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<\s*(script|style|iframe|object|embed|form|input|button|textarea|select|meta|link)[^>]*\/?>/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|src)\s*=\s*("|')\s*javascript:[\s\S]*?\2/gi, '$1="#"')
    .replace(/style\s*=\s*("|')([\s\S]*?)\1/gi, (_m, quote, value) => {
      const safe = [];
      for (const rule of value.split(";")) {
        const parts = rule.split(":");
        if (parts.length < 2) continue;
        const prop = parts.shift().trim().toLowerCase();
        const val = parts.join(":").trim();
        if (!["font-weight","font-style","text-decoration","text-align","margin-left","font-size","font-family","color"].includes(prop)) continue;
        if (/url\s*\(|expression\s*\(|javascript:/i.test(val)) continue;
        if (prop === "font-size" && !/^(1[0-9]|2[0-9]|3[0-6])px$/.test(val)) continue;
        if (prop === "margin-left" && !/^(0|[1-9][0-9]{0,2})px$/.test(val)) continue;
        if (prop === "text-align" && !/^(left|right|center|justify)$/.test(val)) continue;
        safe.push(`${prop}:${val}`);
      }
      return safe.length ? `style=${quote}${safe.join(";")}${quote}` : "";
    });

  html = html.replace(/<\/?([a-z0-9]+)(\s[^>]*)?>/gi, (match, tag, attrs = "") => {
    const allowed = new Set(["p","br","strong","b","em","i","u","s","h2","h3","h4","blockquote","ul","ol","li","a","span","div"]);
    const lower = tag.toLowerCase();
    if (!allowed.has(lower)) return "";
    if (match.startsWith("</")) return `</${lower}>`;
    if (lower === "a") {
      const href = (attrs.match(/href\s*=\s*("[^"]*"|'[^']*')/i) || [])[1] || "\"#\"";
      return `<a href=${href} target="_blank" rel="noopener">`;
    }
    const style = (attrs.match(/style\s*=\s*("[^"]*"|'[^']*')/i) || [])[0] || "";
    return lower === "br" ? "<br>" : `<${lower}${style ? " " + style : ""}>`;
  });

  return html;
}

function absoluteUrl(request, value) {
  if (!value) return "";
  try { return new URL(value, request.url).toString(); } catch { return ""; }
}

export async function onRequestGet({ env, request, params }) {
  if (!env.BLOG_DB) {
    return new Response("No se encontró el binding D1 BLOG_DB.", { status: 500 });
  }

  const post = await env.BLOG_DB
    .prepare(`
      SELECT id, slug, title, excerpt, body, image_url, category, tags, status, author, created_at, updated_at, published_at
      FROM posts
      WHERE slug = ? AND status = 'published'
      LIMIT 1
    `)
    .bind(params.slug)
    .first();

  if (!post) return new Response("Publicación no encontrada.", { status: 404 });

  const url = new URL(request.url).toString();
  const image = absoluteUrl(request, post.image_url || "");
  const tags = parseTags(post.tags);
  const title = `${post.title} | Eder Velásquez Abogados`;
  const description = post.excerpt || "Publicación del blog institucional de Eder Velásquez Abogados.";
  const fb = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  const wa = `https://wa.me/?text=${encodeURIComponent(post.title + " - " + url)}`;
  const ms = `fb-messenger://share/?link=${encodeURIComponent(url)}`;
  const x = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(post.title)}`;
  const shareBlock = `<section class="share-box" aria-label="Compartir publicación"><p class="share-title">Compartir esta publicación</p><div class="share"><a class="fb" href="${fb}" target="_blank" rel="noopener">Facebook</a><a class="wa" href="${wa}" target="_blank" rel="noopener">WhatsApp</a><a class="ms" href="${ms}" rel="noopener">Messenger</a><a class="x" href="${x}" target="_blank" rel="noopener">X</a><button class="cp" type="button" onclick="navigator.clipboard.writeText(location.href).then(()=>this.textContent='Enlace copiado')">Copiar enlace</button></div></section>`;

  const html = `<!DOCTYPE html>
<html lang="es-PE">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />
  <link rel="canonical" href="${esc(url)}" />
  <meta property="og:type" content="article" />
  <meta property="og:title" content="${esc(post.title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:url" content="${esc(url)}" />
  ${image ? `<meta property="og:image" content="${esc(image)}" />` : ""}
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(post.title)}" />
  <meta name="twitter:description" content="${esc(description)}" />
  ${image ? `<meta name="twitter:image" content="${esc(image)}" />` : ""}
  <style>
    :root{--bg:#07111f;--gold:#c9a45c;--gold2:#f0d38a;--text:#172033;--muted:#64748b;--line:#dbe3ee;--paper:#fff;--soft:#f6f2ea;--primary:#0f4c81;--radius:22px;--shadow:0 18px 52px rgba(7,17,31,.10)}
    *{box-sizing:border-box}body{margin:0;font-family:Georgia,'Times New Roman',serif;background:#fff;color:var(--text);line-height:1.72}a{text-decoration:none;color:inherit}.topbar{background:#050b14;color:#cfd6df;font-family:Arial,sans-serif;font-size:13px;padding:9px 5%;display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap}.navbar{position:sticky;top:0;z-index:30;background:rgba(7,17,31,.96);color:#f7f3ea;padding:14px 5%;display:flex;align-items:center;justify-content:space-between;gap:24px;border-bottom:1px solid rgba(255,255,255,.14)}.brand{font-weight:800;letter-spacing:.04em;text-transform:uppercase}.navlinks{display:flex;gap:18px;font-family:Arial,sans-serif;color:#cfd6df;font-size:14px}.hero{background:linear-gradient(90deg,rgba(7,17,31,.97),rgba(7,17,31,.70)),url('https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=2100&q=84') center/cover no-repeat;color:#fff;padding:82px 5% 76px}.hero-inner{max-width:980px}.badge{display:inline-flex;width:fit-content;padding:7px 12px;border-radius:999px;background:rgba(240,211,138,.16);color:var(--gold2);font-family:Arial,sans-serif;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.08em}h1{font-size:clamp(36px,6vw,66px);line-height:1.02;letter-spacing:-.045em;margin:18px 0 18px}.meta{font-family:Arial,sans-serif;color:#cfd6df}.wrap{max-width:980px;margin:0 auto;padding:42px 22px 72px}.cover{width:100%;max-height:520px;object-fit:cover;border-radius:26px;box-shadow:var(--shadow);margin-top:-70px;border:1px solid rgba(255,255,255,.32);background:#e5eaf1}.content{font-size:19px}.content p{margin:0 0 20px}.content h2,.content h3,.content h4{line-height:1.22;margin:28px 0 14px}.content ul,.content ol{padding-left:30px;margin:0 0 20px}.content blockquote{margin:22px 0;padding:14px 20px;border-left:4px solid var(--primary);background:#f8fafc;color:#334155}.content a{color:var(--primary);text-decoration:underline}.share-box{margin:24px 0 34px;padding:18px;border:1px solid var(--line);border-radius:22px;background:#f8fafc}.share-title{margin:0 0 12px;font-family:Arial,sans-serif;font-weight:900;color:#334155}.share{display:flex;flex-wrap:wrap;gap:10px}.share a,.share button{border:1px solid var(--line);background:#fff;padding:10px 14px;border-radius:999px;font-family:Arial,sans-serif;font-weight:800;cursor:pointer}.share .fb{background:#eef4ff}.share .wa{background:#ecfdf3}.share .ms{background:#f2f4ff}.share .x{background:#f8fafc}.share .cp{background:#fff7ed}.back{display:inline-flex;margin-top:34px;color:var(--primary);font-family:Arial,sans-serif;font-weight:800}footer{border-top:1px solid var(--line);padding:28px 5%;font-family:Arial,sans-serif;color:var(--muted);text-align:center}@media(max-width:700px){.navlinks{display:none}.cover{margin-top:-42px}.content{font-size:17px}}
  </style>
</head>
<body>
  <div class="topbar"><span>Servicios jurídicos especializados para el sector público, actividad parlamentaria y relaciones institucionales.</span><span>consultas@evabogados.com</span></div>
  <header class="navbar"><a class="brand" href="/">Eder Velásquez Abogados</a><nav class="navlinks"><a href="/">Inicio</a><a href="/equipo/">Nuestro Equipo</a><a href="/blog/">Blog</a></nav></header>
  <section class="hero"><div class="hero-inner"><span class="badge">${esc(post.category)}</span><h1>${esc(post.title)}</h1><div class="meta">${esc(formatDate(post.published_at || post.created_at))} · ${(tags || []).map(t => "#" + esc(t)).join(" ")}</div></div></section>
  <main class="wrap">
    ${image ? `<img class="cover" src="${esc(image)}" alt="${esc(post.title)}" />` : ""}
    ${shareBlock}
    <article class="content">${sanitizeRichContent(post.body)}</article>
    ${shareBlock}
    <a class="back" href="/blog/">← Volver al blog</a>
  </main>
  <footer>© ${new Date().getFullYear()} Eder Velásquez Abogados.</footer>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=300"
    }
  });
}
