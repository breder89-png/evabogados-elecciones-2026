import fs from 'node:fs';

const YEARS = [2011, 2016];
const API = 'https://es.wikipedia.org';
const USER_AGENT = 'EVAbogados/1.0 (historical photo resolver)';

const aliases = new Map([
  ['ANA MARIA SOLORZANO FLORES DE SAQIB', ['Ana María Solórzano']],
  ['HECTOR VIRGILIO BECERRIL RODRIGUEZ', ['Héctor Becerril']],
  ['LUZ FILOMENA SALGADO RUBIANES', ['Luz Salgado']],
  ['MARTHA GLADYS CHAVEZ COSSIO', ['Martha Chávez']],
  ['FREDY ROLANDO OTAROLA PENARANDA', ['Fredy Otárola']],
  ['JAVIER DIEZ CANSECO CISNEROS', ['Javier Diez Canseco']],
  ['MAURICIO MULDER BEDOYA', ['Mauricio Mulder']],
  ['KENJI GERARDO FUJIMORI HIGUCHI', ['Kenji Fujimori']],
  ['YONHY LESCANO ANCIETA', ['Yonhy Lescano']],
  ['VICTOR ANDRES GARCIA BELAUNDE', ['Víctor Andrés García Belaúnde']],
  ['DANIEL FERNANDO ABUGATTAS MAJLUF', ['Daniel Abugattás']],
  ['ROSA MARIA BARTRA BARRANTES', ['Rosa Bartra']],
  ['MARIA SOLEDAD PEREZ TELLO DE RODRIGUEZ', ['Marisol Pérez Tello']],
  ['MARIA LOURDES ALCORTA SUERO', ['Lourdes Alcorta']],
  ['JUAN CARLOS EGUIGUREN PRAELI', ['Juan Carlos Eguren']],
  ['JUAN SHEPUT MOORE', ['Juan Sheput']],
  ['GLORIA MONTENEGRO FIGUEROA', ['Gloria Montenegro']],
  ['RICHARD ARCE CACERES', ['Richard Arce']],
  ['MARIA ELENA FORONDA FARRO', ['María Elena Foronda']],
  ['JUSTINIANO ROMULO APAZA ORDONEZ', ['Justiniano Apaza']],
  ['ALBERTO DE BELAUNDE DE CARDENAS', ['Alberto de Belaunde']],
  ['GUIDO LOMBARDI ELIAS', ['Guido Lombardi']],
  ['SALVADOR HERESI CHICOMA', ['Salvador Heresi']],
  ['LUIS GALARRETA VELARDE', ['Luis Galarreta']],
  ['MIGUEL ANGEL TORRES MORALES', ['Miguel Torres Morales']],
  ['URSULA LETONA PEREYRA', ['Úrsula Letona']],
  ['HECTOR VIRGILIO BECERRIL RODRIGUEZ', ['Héctor Becerril']],
  ['ALEJANDRA ARAMAYO GAONA', ['Alejandra Aramayo']],
  ['KARINA BETETA RUBIN', ['Karina Beteta']],
  ['LUIS ALBERTO YIKA GARCIA', ['Luis Yika']],
  ['CESAR VASQUEZ SANCHEZ', ['César Vásquez Sánchez']],
  ['MERCEDES ARAOZ FERNANDEZ', ['Mercedes Aráoz']]
]);

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/Ñ/g, 'N')
    .replace(/ñ/g, 'n')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();
}

function titleCaseToken(value) {
  return value ? value[0].toUpperCase() + value.slice(1).toLowerCase() : value;
}

function simpleAliases(name) {
  const parts = String(name || '').split(/\s+/).filter(Boolean);
  const out = [name];
  if (aliases.has(normalize(name))) out.push(...aliases.get(normalize(name)));
  if (parts.length >= 4) out.push(`${parts[0]} ${parts[2]}`);
  if (parts.length >= 3) out.push(`${parts[0]} ${parts[1]} ${parts[2]}`);
  if (parts.length >= 5) out.push(`${parts[0]} ${parts[1]} ${parts[3]}`);
  out.push(String(name).replace(/\s+de\s+[A-ZÁÉÍÓÚÑ][\p{L}'-]+$/u, ''));
  return [...new Set(out.map(v => v.trim()).filter(Boolean))];
}

async function fetchJSON(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, { headers: { 'user-agent': USER_AGENT }, signal: controller.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function exactSummary(title) {
  const url = `${API}/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const json = await fetchJSON(url);
  const source = json?.thumbnail?.source || json?.originalimage?.source || '';
  if (!source) return null;
  const pageTitle = json?.title || title;
  if (rejectTitle(pageTitle)) return null;
  return { imageUrl: source, title: pageTitle };
}

function rejectTitle(title) {
  return /^(Elecciones|Periodo parlamentario|Gobierno de|Caso |Partido |Cambio 90|Tr[aá]nsfuga|Comisi[oó]n )/i.test(String(title || ''));
}

function looksPersonal(page, name) {
  const title = String(page?.title || '');
  if (!title || rejectTitle(title)) return false;
  const desc = String(page?.description || '').toLowerCase();
  const goodDesc = /(pol[ií]tic|congres|abogad|economista|ingenier|m[eé]dic|periodista|ministro|parlamentari)/i.test(desc);
  const titleNorm = normalize(title);
  const nameTokens = normalize(name).split(' ').filter(t => t.length > 2);
  const overlap = nameTokens.filter(t => titleNorm.includes(t)).length;
  return goodDesc && overlap >= 2;
}

async function searchPhoto(name) {
  const terms = [`"${name}"`, `${name} congresista`, `${name} político peruano`];
  for (const term of terms) {
    const url = `${API}/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(term)}&gsrlimit=8&prop=pageimages%7Cdescription&piprop=thumbnail&pithumbsize=360&format=json&origin=*`;
    const json = await fetchJSON(url);
    const pages = Object.values(json?.query?.pages || {});
    const page = pages.find(p => p?.thumbnail?.source && looksPersonal(p, name));
    if (page) return { imageUrl: page.thumbnail.source, title: page.title };
  }
  return null;
}

async function resolvePhoto(name) {
  for (const variant of simpleAliases(name)) {
    const exact = await exactSummary(variant);
    if (exact) return exact;
  }
  for (const variant of simpleAliases(name)) {
    const search = await searchPhoto(variant);
    if (search) return search;
  }
  return null;
}

for (const year of YEARS) {
  const file = `data/parlamento-${year}.json`;
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  let resolved = 0;
  let cleared = 0;
  for (const camera of Object.values(data.camaras || {})) {
    for (const candidate of camera.candidates || []) {
      if (!String(candidate.imageUrl || '').includes('/api/wiki-thumb/')) continue;
      const found = await resolvePhoto(candidate.name);
      if (found?.imageUrl) {
        candidate.imageUrl = found.imageUrl;
        candidate.imageSource = `Wikipedia: ${found.title}`;
        resolved++;
      } else {
        candidate.imageUrl = '';
        candidate.imageSource = '';
        cleared++;
      }
      process.stdout.write(`${year} ${resolved} fotos, ${cleared} sin foto confirmada\r`);
    }
  }
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`\n${year}: ${resolved} fotos directas, ${cleared} con fallback a logo.`);
}
