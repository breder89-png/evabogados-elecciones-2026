function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function cleanText(value, max = 1000) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function validFacebookUrl(value) {
  const raw = cleanText(value, 240);
  if (!raw) return "";
  try {
    const url = new URL(raw);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    if (!["facebook.com", "m.facebook.com", "fb.com"].includes(host)) throw new Error();
    return url.toString();
  } catch {
    throw new Error("El enlace de Facebook no es válido.");
  }
}

async function getPost(db, slug) {
  return db.prepare("SELECT id, slug, title, category, published_at, created_at FROM posts WHERE slug = ? AND status = 'published' LIMIT 1").bind(slug).first();
}

function stableHash(value) {
  let hash = 2166136261;
  const text = String(value || "");
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

const SAMPLE_NAMES = [
  "Carlos Medina", "Rosa Huamán", "Luis Paredes", "María Quispe", "Jorge Salazar",
  "Patricia León", "Miguel Rojas", "Carmen Castillo", "Hugo Torres", "Andrea Chávez",
  "Víctor Ramos", "Mónica Flores", "José Gálvez", "Elena Vargas", "Renzo Aguilar",
  "Lucía Cárdenas", "Pedro Campos", "Milagros Núñez", "Daniel Meza", "Sonia Villanueva"
];

const SAMPLE_BODIES = [
  "Buen análisis. A veces se informa la elección como si ya estuviera cerrada, pero todavía falta respetar el procedimiento.",
  "Me parece correcto explicar la diferencia entre tendencia y resultado oficial. Mucha gente se confunde con eso.",
  "La lectura es clara. No todos seguimos los detalles técnicos, pero sí interesa saber qué falta para que el resultado sea definitivo.",
  "Coincido en que el conteo debe cuidarse hasta el final. La prisa política no debería reemplazar la formalidad electoral.",
  "Interesante el enfoque. Sería bueno que el JNE y la ONPE comuniquen estos puntos de manera más simple para el ciudadano común.",
  "El tema de las actas pendientes es clave. No se trata de favorecer a nadie, sino de que el resultado sea jurídicamente seguro.",
  "Se agradece una explicación sin tanto ruido político. En estas elecciones hay demasiadas versiones circulando.",
  "Buen aporte. En mi opinión, la transparencia también exige no generar falsas certezas antes de tiempo.",
  "La nota ayuda a entender por qué un resultado virtual no es lo mismo que una proclamación oficial.",
  "Más allá de las simpatías políticas, el proceso debe cerrarse bien. Eso le da legitimidad al resultado."
];

function sampleCommentsForPost(post) {
  const seed = stableHash(post.slug);
  if (seed % 100 >= 68) return [];
  const count = 1 + (seed % 5);
  const baseDate = new Date(post.published_at || post.created_at || Date.now()).getTime();
  const out = [];
  for (let i = 0; i < count; i++) {
    const name = SAMPLE_NAMES[(seed + i * 7) % SAMPLE_NAMES.length];
    const body = SAMPLE_BODIES[(Math.floor(seed / 7) + i * 3) % SAMPLE_BODIES.length];
    const created = new Date(baseDate + (i + 1) * 47 * 60 * 1000).toISOString();
    out.push({
      id: `sample-${post.slug}-${i + 1}`,
      author_name: name,
      author_facebook: "",
      body,
      created_at: created,
      sample: true
    });
  }
  return out.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
}

function sampleCommentsEnabled(env) {
  return ["1", "true", "yes", "sample"].includes(String(env.BLOG_SAMPLE_COMMENTS || "").trim().toLowerCase());
}

export async function onRequestGet({ env, params }) {
  try {
    if (!env.BLOG_DB) return json({ error: "No se encontró el binding D1 BLOG_DB." }, 500);
    const post = await getPost(env.BLOG_DB, params.slug);
    if (!post) return json({ error: "Publicación no encontrada." }, 404);

    const result = await env.BLOG_DB
      .prepare(`
        SELECT id, author_name, author_facebook, body, created_at
        FROM post_comments
        WHERE post_id = ? AND status = 'approved'
        ORDER BY created_at DESC
        LIMIT 80
      `)
      .bind(post.id)
      .all();

    const approved = result.results || [];
    if (approved.length || !sampleCommentsEnabled(env)) {
      return json({ comments: approved, sample: false });
    }

    return json({ comments: sampleCommentsForPost(post), sample: true });
  } catch (error) {
    return json({ error: error.message || "Error interno." }, 500);
  }
}

export async function onRequestPost({ env, request, params }) {
  try {
    if (!env.BLOG_DB) return json({ error: "No se encontró el binding D1 BLOG_DB." }, 500);
    const input = await request.json();
    if (cleanText(input.website, 120)) return json({ ok: true, pending: true });

    const post = await getPost(env.BLOG_DB, params.slug);
    if (!post) return json({ error: "Publicación no encontrada." }, 404);

    const authorName = cleanText(input.author_name, 80);
    const body = cleanText(input.body, 1200);
    const authorFacebook = validFacebookUrl(input.author_facebook);

    if (authorName.length < 2) throw new Error("Escribe tu nombre.");
    if (body.length < 3) throw new Error("Escribe un comentario.");

    const now = new Date().toISOString();
    await env.BLOG_DB
      .prepare(`
        INSERT INTO post_comments (post_id, author_name, author_facebook, body, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'pending', ?, ?)
      `)
      .bind(post.id, authorName, authorFacebook, body, now, now)
      .run();

    return json({ ok: true, pending: true }, 201);
  } catch (error) {
    return json({ error: error.message || "No se pudo guardar el comentario." }, 400);
  }
}
