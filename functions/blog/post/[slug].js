function html(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function escapeHtml(value) {
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
  if (!value) return "Sin fecha";
  try {
    return new Intl.DateTimeFormat("es-PE", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    }).format(new Date(value));
  } catch {
    return "Sin fecha";
  }
}

function paragraphBody(body) {
  const raw = String(body || "");
  if (/<\/?[a-z][\s\S]*>/i.test(raw)) {
    return raw
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
      .replace(/\son\w+="[^"]*"/gi, "")
      .replace(/\son\w+='[^']*'/gi, "")
      .replace(/javascript:/gi, "");
  }
  return raw
    .split(/\n{2,}/)
    .map((part) => `<p>${escapeHtml(part).replaceAll("\n", "<br>")}</p>`)
    .join("");
}

function socialIcon(name) {
  const common = 'class="social-icon" viewBox="0 0 24 24" aria-hidden="true"';
  const icons = {
    facebook: `<svg ${common}><path d="M15.1 8.3h2.2V4.6c-.4-.1-1.7-.2-3.2-.2-3.2 0-5.4 2-5.4 5.6v3.1H5.2v4.2h3.5V24H13v-6.7h3.4l.5-4.2H13v-2.7c0-1.2.3-2.1 2.1-2.1z" fill="currentColor"/></svg>`,
    whatsapp: `<svg ${common}><path d="M12 2a9.8 9.8 0 0 0-8.5 14.7L2.4 22l5.4-1.4A9.8 9.8 0 1 0 12 2zm5.7 14.2c-.2.6-1.2 1.1-1.7 1.2-.5.1-1 .2-3.2-.7-2.7-1.1-4.5-3.9-4.6-4.1-.1-.2-1.1-1.5-1.1-2.8s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .6l-.4.6c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1.1 2.1 1.4 2.4 1.6.3.1.5.1.7-.1l.9-1.1c.2-.3.4-.2.7-.1l2 .9c.3.1.5.2.6.4.1 0 .1.5-.1 1z" fill="currentColor"/></svg>`,
    x: `<svg ${common}><path d="M18.9 2.7h3.2l-7 8 8.2 10.8h-6.4l-5-6.5-5.7 6.5H3l7.5-8.6L2.6 2.7h6.6l4.5 5.9 5.2-5.9zm-1.1 16.9h1.8L8.2 4.5H6.3l11.5 15.1z" fill="currentColor"/></svg>`,
    blog: `<svg ${common}><path d="M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm2 4v2h10V8H7zm0 4v2h10v-2H7zm0 4v2h6v-2H7z" fill="currentColor"/></svg>`,
    observatory: `<svg ${common}><path d="M4 19h16v2H4v-2zm2-7h3v5H6v-5zm5-8h3v13h-3V4zm5 5h3v8h-3V9z" fill="currentColor"/></svg>`
  };
  return icons[name] || "";
}

async function postBySlug(db, slug) {
  const row = await db
    .prepare(`
      SELECT id, slug, title, excerpt, body, image_url, category, tags, status, author, created_at, updated_at, published_at
      FROM posts
      WHERE slug = ? AND status = 'published'
      LIMIT 1
    `)
    .bind(slug)
    .first();
  return row ? { ...row, tags: parseTags(row.tags) } : null;
}

function page(post, origin) {
  const title = escapeHtml(post.title);
  const description = escapeHtml(post.excerpt || "Publicación del blog institucional de EV Abogados.");
  const url = `${origin}/blog/post/${encodeURIComponent(post.slug)}/`;
  const image = post.image_url ? escapeHtml(post.image_url) : "";
  const date = formatDate(post.published_at || post.created_at);
  const body = paragraphBody(post.body);
  const tags = (post.tags || []).map((tag) => `#${escapeHtml(tag)}`).join(" ");
  const slugJson = JSON.stringify(post.slug);

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${description}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${escapeHtml(url)}">
  ${image ? `<meta property="og:image" content="${image}">` : ""}
  <title>${title} | EV Abogados</title>
  <style>
    :root{--bg:#f6f7f9;--surface:#fff;--text:#18212f;--muted:#64748b;--line:#dbe3ee;--primary:#0f4c81;--accent:#c49a4a;--shadow:0 14px 40px rgba(15,23,42,.08)}
    *{box-sizing:border-box}body{margin:0;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:var(--bg);color:var(--text);line-height:1.7}a{color:inherit;text-decoration:none}.site-header{position:sticky;top:0;z-index:10;background:rgba(255,255,255,.94);backdrop-filter:blur(14px);border-bottom:1px solid var(--line)}.nav{max-width:1080px;margin:0 auto;padding:10px 22px;display:flex;align-items:center;justify-content:space-between;gap:18px}.brand{display:flex;align-items:center;gap:10px;font-weight:800}.brand img{width:44px;height:44px;border-radius:12px;object-fit:cover}.nav-links{display:flex;gap:10px;flex-wrap:wrap}.nav-links a,.share-link{border:1px solid var(--line);background:#fff;padding:9px 13px;border-radius:999px;font-weight:800;font-size:14px}.nav-links .observatory-link,.share-row .observatory-link{background:#fff7df;border-color:#e8c76f;color:#111827}.hero{background:linear-gradient(135deg,#0b365c 0%,#123f67 46%,#0f4c81 100%);color:#fff;padding:54px 22px 84px}.hero-inner{max-width:1080px;margin:0 auto}.eyebrow{color:#f3d28c;font-weight:800;text-transform:uppercase;letter-spacing:.12em;font-size:13px;margin-bottom:12px}h1{font-size:clamp(34px,5vw,58px);line-height:1.05;margin:0 0 16px;letter-spacing:0}.meta{display:flex;gap:8px;flex-wrap:wrap;color:rgba(255,255,255,.78);font-size:14px}.badge{display:inline-flex;padding:6px 10px;border-radius:999px;background:#eef5ff;color:#0b365c;font-weight:800;font-size:12px;text-transform:uppercase;letter-spacing:.04em}.article-wrap{max-width:1080px;margin:-48px auto 60px;padding:0 22px}.article{background:var(--surface);border:1px solid var(--line);box-shadow:var(--shadow);border-radius:18px;overflow:hidden}.cover{width:100%;max-height:460px;object-fit:cover;background:#e5eaf1;border-bottom:1px solid var(--line)}.content{padding:clamp(24px,5vw,48px)}.content p{margin:0 0 18px}.content h2,.content h3{line-height:1.18;margin:28px 0 12px}.share-row{display:flex;flex-wrap:wrap;gap:8px;margin:20px 0 0}.share-link{display:inline-flex;align-items:center;justify-content:center;gap:7px}.social-icon{width:17px;height:17px;flex:0 0 17px}.share-facebook{background:#eef4ff;color:#1877f2}.share-whatsapp{background:#ecfdf3;color:#128c7e}.share-x{background:#f8fafc;color:#111827}.comments{margin-top:34px;padding-top:26px;border-top:1px solid var(--line)}.comments h2{margin:0 0 14px;font-size:24px}.comment-list{display:grid;gap:12px;margin-bottom:18px}.comment{border:1px solid var(--line);border-radius:14px;background:#f8fafc;padding:13px 14px}.comment b{display:block;color:#172033;margin-bottom:3px}.comment small{display:block;color:var(--muted);font-size:12px;margin-bottom:6px}.comment p{margin:0}.comment-form{display:grid;gap:10px}.comment-form input,.comment-form textarea{width:100%;border:1px solid var(--line);border-radius:12px;padding:11px 12px;font:inherit;background:#fff}.comment-form textarea{min-height:112px;resize:vertical}.comment-form button{width:fit-content;border:0;border-radius:999px;background:#0f4c81;color:#fff;padding:11px 16px;font-weight:900;cursor:pointer}.comment-status{margin:0;color:var(--muted);font-size:13px}.hp-field{display:none}.footer{border-top:1px solid var(--line);background:#fff;padding:28px 22px;color:var(--muted);text-align:center;font-size:14px}.footer{border-top:1px solid var(--line);background:#fff;padding:28px 22px;color:var(--muted);text-align:center;font-size:14px}

.content{
  text-align:justify;
  text-justify:inter-word;
}

.content p,
.content li{
  text-align:justify;
  text-justify:inter-word;
}

.content h2,
.content h3,
.share-row,
.comments,
.comment,
.comment p,
.comment-form,
.comment-status{
  text-align:left;
}

@media(max-width:640px){.nav{align-items:flex-start;flex-direction:column}.hero{padding-top:42px}.article-wrap{margin-top:-34px}.content{padding:22px}.comment-form button{width:100%}}@media(max-width:640px){.nav{align-items:flex-start;flex-direction:column}.hero{padding-top:42px}.article-wrap{margin-top:-34px}.content{padding:22px}.comment-form button{width:100%}}
  </style>
</head>
<body>
  <header class="site-header"><nav class="nav" aria-label="Navegación principal"><a class="brand" href="/"><img src="/logos/ev.jpg" alt="Logo EV Abogados"><span>EV Abogados</span></a><div class="nav-links"><a href="/">Inicio</a><a href="/blog/">Blog</a><a class="observatory-link" href="/elecciones-2026/">Observatorio electoral</a></div></nav></header>
  <section class="hero"><div class="hero-inner"><div class="eyebrow">Blog institucional</div><h1>${title}</h1><div class="meta"><span class="badge">${escapeHtml(post.category || "Publicación")}</span><span>${date}</span>${tags ? `<span>${tags}</span>` : ""}</div></div></section>
  <main class="article-wrap"><article class="article">${image ? `<img class="cover" src="${image}" alt="${title}">` : ""}<div class="content">${body}<div class="share-row"><a class="share-link share-facebook" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}" target="_blank" rel="noopener">${socialIcon("facebook")}<span>Facebook</span></a><a class="share-link share-whatsapp" href="https://wa.me/?text=${encodeURIComponent(post.title + " - " + url)}" target="_blank" rel="noopener">${socialIcon("whatsapp")}<span>WhatsApp</span></a><a class="share-link share-x" href="https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(post.title)}" target="_blank" rel="noopener">${socialIcon("x")}<span>X</span></a><a class="share-link observatory-link" href="/elecciones-2026/">${socialIcon("observatory")}<span>Ir al observatorio</span></a><a class="share-link" href="/blog/">${socialIcon("blog")}<span>Volver al blog</span></a></div><section class="comments" aria-labelledby="commentsTitle"><h2 id="commentsTitle">Comentarios</h2><div class="comment-list" id="commentList"><p class="comment-status">Cargando comentarios...</p></div><form class="comment-form" id="commentForm"><input name="author_name" maxlength="80" autocomplete="name" placeholder="Nombre" required><input name="author_facebook" maxlength="160" autocomplete="off" placeholder="Facebook o perfil público (opcional)"><textarea name="body" maxlength="1200" placeholder="Escribe tu comentario" required></textarea><input class="hp-field" name="website" tabindex="-1" autocomplete="off"><button type="submit">Publicar comentario</button><p class="comment-status" id="commentStatus"></p></form></section></div></article></main>
  <footer class="footer">© ${new Date().getFullYear()} EV Abogados. Blog institucional y publicaciones de análisis.</footer>
  <script>
    const postSlug = ${slugJson};
    const escapeText = (value) => String(value || '').replace(/[&<>"']/g, (ch) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
    const commentList = document.getElementById('commentList');
    const commentStatus = document.getElementById('commentStatus');
    const renderComments = (items, sampleMode = false) => {
      if (!items.length) {
        commentList.innerHTML = '<p class="comment-status">Aún no hay comentarios publicados.</p>';
        return;
      }
      const note = sampleMode ? '<p class="comment-status">Comentarios de muestra editorial. No sustituyen comentarios reales de lectores.</p>' : '';
      commentList.innerHTML = note + items.map((item) => '<article class="comment"><b>' + escapeText(item.author_name || 'Lector') + '</b><small>' + escapeText(new Date(item.created_at || Date.now()).toLocaleDateString('es-PE')) + '</small><p>' + escapeText(item.body || '').replace(/\n/g, '<br>') + '</p></article>').join('');
    };
    async function loadComments() {
      try {
        const res = await fetch('/api/blog/comments/' + encodeURIComponent(postSlug), { cache: 'no-store' });
        const data = await res.json();
        renderComments(Array.isArray(data.comments) ? data.comments : [], Boolean(data.sample));
      } catch {
        commentList.innerHTML = '<p class="comment-status">No se pudieron cargar los comentarios.</p>';
      }
    }
    document.getElementById('commentForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const payload = Object.fromEntries(new FormData(form).entries());
      commentStatus.textContent = 'Enviando...';
      try {
        const res = await fetch('/api/blog/comments/' + encodeURIComponent(postSlug), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error('comment failed');
        form.reset();
        commentStatus.textContent = 'Comentario enviado. Aparecerá después de revisión.';
      } catch {
        commentStatus.textContent = 'No se pudo enviar el comentario.';
      }
    });
    loadComments();
    fetch('/api/blog/stats/${encodeURIComponent(post.slug)}',{method:'POST',cache:'no-store',headers:{'content-type':'application/json'},body:JSON.stringify({event:'view'})}).catch(()=>{});
  </script>
</body>
</html>`;
}

export async function onRequestGet({ env, request, params }) {
  if (!env.BLOG_DB) {
    return html("<!doctype html><meta charset=\"utf-8\"><title>Blog no configurado</title><p>BLOG_DB no configurado.</p>", 500);
  }
  const post = await postBySlug(env.BLOG_DB, params.slug);
  if (!post) {
    return html("<!doctype html><meta charset=\"utf-8\"><title>Publicación no encontrada</title><p>Publicación no encontrada.</p><p><a href=\"/blog/\">Volver al blog</a></p>", 404);
  }
  const origin = new URL(request.url).origin;
  return html(page(post, origin));
}
