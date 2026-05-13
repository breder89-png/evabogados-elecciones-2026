import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const REQUIRED_FOR_GENERATION = ["OPENAI_API_KEY"];
const REQUIRED_FOR_PUBLISH = ["BLOG_ADMIN_URL", "BLOG_ADMIN_TOKEN"];
const DEFAULT_RSS = [
  "https://news.google.com/rss/search?q=Per%C3%BA%20pol%C3%ADtica%20OR%20Congreso%20OR%20JNE%20OR%20ONPE&hl=es-419&gl=PE&ceid=PE:es-419"
];

function todayStamp() {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

function missing(names) {
  return names.filter((name) => !String(process.env[name] || "").trim());
}

function stripHtml(value) {
  return String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function extractItems(xml, sourceUrl) {
  const items = [];
  const blocks = String(xml || "").match(/<item[\s\S]*?<\/item>/gi) || [];
  for (const block of blocks.slice(0, 20)) {
    const get = (tag) => {
      const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
      return stripHtml((match?.[1] || "").replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, ""));
    };
    const title = get("title");
    const link = get("link");
    const description = get("description");
    const pubDate = get("pubDate");
    if (title) items.push({ title, link, description, pubDate, sourceUrl });
  }
  return items;
}

async function fetchNews() {
  const urls = String(process.env.NEWS_RSS_URLS || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  const feeds = urls.length ? urls : DEFAULT_RSS;
  const items = [];
  for (const url of feeds.slice(0, 6)) {
    try {
      const res = await fetch(url, { headers: { "user-agent": "EVAbogadosAutoBlog/1.0" } });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const xml = await res.text();
      items.push(...extractItems(xml, url));
    } catch (error) {
      console.warn(`No se pudo leer RSS: ${url} :: ${error.message}`);
    }
  }
  return items.slice(0, 18);
}

function buildSystemPrompt() {
  return `Eres editor jurídico de EV Abogados en Perú. Redacta una publicación breve pero sólida sobre actualidad política, electoral o parlamentaria peruana. Debe tener título sobrio, bajada inicial, enfoque jurídico claro, categoría, etiquetas y cuerpo en HTML semántico. No inventes hechos: usa solo las noticias proporcionadas. Si la noticia parece extraordinaria por proclamación oficial, 100% de actas, decisión del JNE/ONPE o hecho parlamentario decisivo, priorízala. Devuelve JSON estricto con estas claves: title, excerpt, category, tags, body, imagePrompt.`;
}

async function generatePost(newsItems) {
  const prompt = `Noticias disponibles:\n${newsItems.map((item, i) => `${i + 1}. ${item.title}\nResumen: ${item.description}\nFecha: ${item.pubDate || "s/f"}\nLink: ${item.link || item.sourceUrl}`).join("\n\n")}\n\nRedacta un post para EV Abogados. Mantén tono jurídico claro y prudente.`;
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.35,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildSystemPrompt() },
        { role: "user", content: prompt }
      ]
    })
  });
  if (!res.ok) throw new Error(`OpenAI respondió ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || "{}";
  const post = JSON.parse(text);
  if (!post.title || !post.body) throw new Error("La generación no produjo título o cuerpo.");
  return {
    title: String(post.title).trim(),
    excerpt: String(post.excerpt || "").trim(),
    category: String(post.category || "Actualidad electoral").trim(),
    tags: Array.isArray(post.tags) ? post.tags.slice(0, 8) : ["Perú", "elecciones", "Congreso"],
    body: String(post.body).trim(),
    image_url: String(process.env.AUTO_BLOG_IMAGE_URL || "").trim(),
    author: process.env.AUTO_BLOG_AUTHOR || "EV Abogados",
    status: process.env.AUTO_BLOG_STATUS === "draft" ? "draft" : "published"
  };
}

async function writeDraft(payload, reason, extra = {}) {
  const dir = path.join("drafts", "auto-blog");
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, `${todayStamp()}-auto-blog.json`);
  await writeFile(file, JSON.stringify({ reason, ...extra, payload }, null, 2), "utf8");
  console.log(`Borrador/reporte generado: ${file}`);
}

async function publishPost(payload) {
  const base = String(process.env.BLOG_ADMIN_URL || "").replace(/\/+$/, "");
  const res = await fetch(`${base}/api/admin/posts`, {
    method: "POST",
    headers: {
      "authorization": `Bearer ${process.env.BLOG_ADMIN_TOKEN}`,
      "content-type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  const text = await res.text();
  let data = {};
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!res.ok) throw new Error(`No se pudo publicar: ${res.status} ${text}`);
  return data;
}

async function main() {
  const missingGeneration = missing(REQUIRED_FOR_GENERATION);
  const missingPublishing = missing(REQUIRED_FOR_PUBLISH);
  const news = await fetchNews();

  if (!news.length) {
    await writeDraft(null, "No se encontraron noticias en los RSS configurados.", { missing: { generation: missingGeneration, publishing: missingPublishing } });
    return;
  }

  if (missingGeneration.length) {
    await writeDraft(null, "Faltan variables para redactar automáticamente.", { missing: { generation: missingGeneration, publishing: missingPublishing }, news });
    return;
  }

  const post = await generatePost(news);
  if (missingPublishing.length) {
    await writeDraft(post, "Faltan variables para publicar mediante la API/admin del blog.", { missing: { publishing: missingPublishing }, news });
    return;
  }

  const result = await publishPost(post);
  console.log(`Post publicado: ${result.post?.title || post.title}`);
  console.log(result.post?.slug ? `URL: ${process.env.BLOG_ADMIN_URL.replace(/\/+$/, "")}/blog/post/${result.post.slug}/` : JSON.stringify(result));
}

main().catch(async (error) => {
  console.error(error);
  await writeDraft(null, "Error en automatización.", { error: error.message });
  process.exitCode = 1;
});
