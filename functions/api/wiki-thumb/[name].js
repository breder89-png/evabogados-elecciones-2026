function redirect(url, status = 302) {
  return new Response(null, {
    status,
    headers: {
      location: url,
      "cache-control": "public, max-age=604800, stale-while-revalidate=2592000"
    }
  });
}
function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
function cleanName(value){ return decodeURIComponent(String(value||"")).replace(/\s+/g," ").trim(); }
async function summary(title){
  const res = await fetch(`https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`, {headers:{"user-agent":"EVAbogados/1.0"}});
  if(!res.ok) return null;
  const data = await res.json();
  return data?.thumbnail?.source || data?.originalimage?.source || null;
}
async function searchTitle(name){
  const api = `https://es.wikipedia.org/w/api.php?action=opensearch&namespace=0&limit=5&format=json&search=${encodeURIComponent(name)}`;
  const res = await fetch(api, {headers:{"user-agent":"EVAbogados/1.0"}});
  if(!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data?.[1]) ? data[1] : [];
}
export async function onRequestGet({ params }) {
  const name = cleanName(params.name || "");
  if(!name) return json({error:"Imagen no encontrada"}, 404);
  let img = await summary(name);
  if(img) return redirect(img);
  for(const title of await searchTitle(name)){
    img = await summary(title);
    if(img) return redirect(img);
  }
  return json({error:"Imagen no encontrada", name}, 404);
}
