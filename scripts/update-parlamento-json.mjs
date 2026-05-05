import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as XLSX from "xlsx";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const dataDir = path.join(rootDir, "data");
const outFile = path.join(dataDir, "parlamento-2026.json");
const diagnosticFile = path.join(dataDir, "diagnostico-aklla.json");
const overrideFile = path.join(dataDir, "parlamento-overrides.json");

const AKLLA_BASE_URL = trimSlash(process.env.AKLLA_BASE_URL || "https://congresoeg2026.akllaperu.pe");
const USE_ONPE_STATUS = (process.env.USE_ONPE_STATUS || "true").toLowerCase() !== "false";
const USE_AKLLA_CACHE = (process.env.USE_AKLLA_CACHE || "false").toLowerCase() === "true";

const QUALIFIED_PARTIES_2026 = new Set([
  "FUERZA POPULAR",
  "RENOVACION POPULAR",
  "RENOVACIÓN POPULAR",
  "AHORA NACION",
  "AHORA NACIÓN",
  "PARTIDO CIVICO OBRAS",
  "PARTIDO CÍVICO OBRAS",
  "PARTIDO DEL BUEN GOBIERNO",
  "JUNTOS POR EL PERU",
  "JUNTOS POR EL PERÚ"
].map(normalize));

const FILES = {
  resumenDiputados: "resumen_diputados.xlsx",
  resumenDiputadosNac: "resumen_diputados_nac.xlsx",
  resumenSenado: "resumen_senado.xlsx",
  resumenSenadoNac: "resumen_senado_nac.xlsx",
  resumenAndino: "resumen_andino.xlsx",
  resumenAndinoNac: "resumen_andino_nac.xlsx",
  electosSinBarrera: "electos_totales_sin_barrera.xlsx",
  electosConBarrera: "electos_totales_con_barrera.xlsx",
  resultadoDipSB: "resultado_diputados_sin_barrera.xlsx",
  resultadoDipCB: "resultado_diputados_con_barrera.xlsx",
  resultadoSenMulSB: "resultado_senado_multiple_sin_barrera.xlsx",
  resultadoSenMulCB: "resultado_senado_multiple_con_barrera.xlsx",
  resultadoSenNacSB: "resultado_senado_nacional_sin_barrera.xlsx",
  resultadoSenNacCB: "resultado_senado_nacional_con_barrera.xlsx",
  resultadoAndinoCB: "rresultado_andino_con_barrera.xlsx",
  combinado: "resultado_final_escanos_combinado.xlsx",
  actas: "resultados_actas.xlsx"
};

const ONPE = {
  andinoTotales: "https://resultadoelectoral.onpe.gob.pe/presentacion-backend/resumen-general/totales?idEleccion=12&tipoFiltro=eleccion",
  diputadosTotales: "https://resultadoelectoral.onpe.gob.pe/presentacion-backend/resumen-general/totales?idEleccion=13&tipoFiltro=eleccion",
  senadoRegionalTotales: "https://resultadoelectoral.onpe.gob.pe/presentacion-backend/resumen-general/totales?idEleccion=14&tipoFiltro=eleccion",
  senadoNacionalTotales: "https://resultadoelectoral.onpe.gob.pe/presentacion-backend/resumen-general/totales?idEleccion=15&tipoFiltro=eleccion"
};

const DIPUTADOS_SEATS = {
  "AMAZONAS": 2,
  "ÁNCASH": 5,
  "APURÍMAC": 2,
  "AREQUIPA": 6,
  "AYACUCHO": 3,
  "CAJAMARCA": 6,
  "CALLAO": 4,
  "CUSCO": 5,
  "HUANCAVELICA": 2,
  "HUÁNUCO": 3,
  "ICA": 4,
  "JUNÍN": 5,
  "LA LIBERTAD": 7,
  "LAMBAYEQUE": 5,
  "LIMA METROPOLITANA": 32,
  "LIMA PROVINCIAS": 4,
  "LORETO": 4,
  "MADRE DE DIOS": 2,
  "MOQUEGUA": 2,
  "PASCO": 2,
  "PIURA": 7,
  "PUNO": 5,
  "SAN MARTÍN": 4,
  "TACNA": 2,
  "TUMBES": 2,
  "UCAYALI": 3,
  "RESIDENTES EN EL EXTRANJERO": 2
};

const REGIONAL_SEATS = {
  "AMAZONAS": 1,
  "ÁNCASH": 1,
  "APURÍMAC": 1,
  "AREQUIPA": 1,
  "AYACUCHO": 1,
  "CAJAMARCA": 1,
  "CALLAO": 1,
  "CUSCO": 1,
  "HUANCAVELICA": 1,
  "HUÁNUCO": 1,
  "ICA": 1,
  "JUNÍN": 1,
  "LA LIBERTAD": 1,
  "LAMBAYEQUE": 1,
  "LIMA METROPOLITANA": 4,
  "LIMA PROVINCIAS": 1,
  "LORETO": 1,
  "MADRE DE DIOS": 1,
  "MOQUEGUA": 1,
  "PASCO": 1,
  "PIURA": 1,
  "PUNO": 1,
  "SAN MARTÍN": 1,
  "TACNA": 1,
  "TUMBES": 1,
  "UCAYALI": 1,
  "RESIDENTES EN EL EXTRANJERO": 1
};

const CAMERA_META = {
  diputados: { name: "Diputados", seats: 130, circSeats: DIPUTADOS_SEATS },
  senadoNacional: { name: "Senado nacional único", seats: 30, circSeats: { "NACIONAL": 30 } },
  senadoRegional: { name: "Senado regional", seats: 30, circSeats: REGIONAL_SEATS },
  andino: { name: "Parlamento Andino", seats: 5, circSeats: { "NACIONAL": 5 } }
};

const COLORS = [
  "#f97316", "#1d4ed8", "#059669", "#dc2626", "#0ea5e9", "#16a34a",
  "#7c3aed", "#9333ea", "#64748b", "#b91c1c", "#ca8a04", "#0891b2",
  "#be123c", "#4f46e5", "#15803d", "#a16207", "#0f766e", "#334155"
];

const sourceNotes = [];
const diagnostics = {
  generatedAt: new Date().toISOString(),
  akllaBaseUrl: AKLLA_BASE_URL,
  files: {},
  cameras: {}
};

async function main() {
  await mkdir(dataDir, { recursive: true });
  const overrides = await loadJson(overrideFile, {});
  const source = await loadAkllaSource();

  const loadedRows = Object.values(source).flatMap((rows) => Array.isArray(rows) ? rows : []).length;
  if (loadedRows === 0) {
    throw new Error("No se pudo cargar ningún XLSX de Aklla. No se genera JSON nuevo para evitar publicar datos vacíos.");
  }

  const status = USE_ONPE_STATUS ? await tryOnpeStatus() : null;
  const cameras = {
    diputados: buildCamera("diputados", source, overrides?.camaras?.diputados),
    senadoNacional: buildCamera("senadoNacional", source, overrides?.camaras?.senadoNacional),
    senadoRegional: buildCamera("senadoRegional", source, overrides?.camaras?.senadoRegional),
    andino: buildCamera("andino", source, overrides?.camaras?.andino)
  };

  applyComputedAllocations(cameras);
  applyCameraStatuses(cameras, source.actas);
  validateCameraStructure(cameras);

  const payload = {
    updatedAt: new Date().toISOString(),
    status: buildStatusFromActas(source.actas) || status,
    camaras: cameras,
    sourceMode: "generated-aklla-onpe-v9",
    sourceNotes
  };

  payload.camaras.senado = mergeSenateAlias(payload.camaras.senadoNacional, payload.camaras.senadoRegional);
  payload.camaras.senadoTotal = payload.camaras.senado;

  await writeFile(outFile, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  await writeFile(diagnosticFile, `${JSON.stringify(diagnostics, null, 2)}\n`, "utf8");

  console.log(`OK: ${path.relative(rootDir, outFile)}`);
  console.log(`Diagnóstico: ${path.relative(rootDir, diagnosticFile)}`);
  for (const [key, cam] of Object.entries(payload.camaras)) {
    if (["senado", "senadoTotal"].includes(key)) continue;
    console.log(`${key}: ${cam.parties.length} partidos, ${cam.circunscripciones.length} circunscripciones, ${cam.nationalVotes.length} votaciones, ${cam.candidates.length} candidatos`);
  }
}

async function loadAkllaSource() {
  const entries = [];
  for (const [key, filename] of Object.entries(FILES)) {
    try {
      const rows = await loadWorkbook(filename);
      diagnostics.files[key] = { filename, rows: rows.length, ok: true };
      entries.push([key, rows]);
    } catch (e) {
      diagnostics.files[key] = { filename, rows: 0, ok: false, error: e.message };
      note(`No se pudo cargar ${filename}: ${e.message}`);
      entries.push([key, []]);
    }
  }
  const source = Object.fromEntries(entries);
  source.allRows = Object.values(source).flatMap((rows) => Array.isArray(rows) ? rows : []);
  return source;
}

async function loadWorkbook(filename) {
  const localPath = path.join(dataDir, "aklla-cache", filename);
  let buffer;

  if (USE_AKLLA_CACHE) {
    try {
      buffer = await readFile(localPath);
      note(`Usando cache local: data/aklla-cache/${filename}`);
    } catch {
      buffer = await downloadWorkbook(filename);
    }
  } else {
    buffer = await downloadWorkbook(filename);
  }

  const workbook = XLSX.read(buffer, { type: "buffer" });
  const rows = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const sheetRows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    rows.push(...sheetRows.map((row) => ({ ...row, __sheetName: sheetName })));
  }
  return normalizeRows(rows);
}

async function downloadWorkbook(filename) {
  const url = `${AKLLA_BASE_URL}/${filename}`;
  const response = await fetch(noCache(url), {
    headers: {
      "Accept": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/octet-stream,*/*",
      "User-Agent": "Mozilla/5.0 EVA-Abogados-Observatorio/3.0",
      "Referer": `${AKLLA_BASE_URL}/`
    },
    cache: "no-store"
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} en ${url}`);
  const contentType = response.headers.get("content-type") || "";
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const head = buffer.toString("utf8", 0, Math.min(buffer.length, 120)).trim();
  if (/^<!doctype html/i.test(head) || /^<html/i.test(head)) throw new Error(`Aklla devolvió HTML, no XLSX. Content-Type=${contentType}`);
  return buffer;
}

function buildCamera(key, source, override = {}) {
  const meta = CAMERA_META[key];
  const rows = rowsForCamera(key, source);
  const candidateRows = candidateRowsForCamera(key, source);
  const fallbackNationalRows = nationalRowsForCamera(key, source);

  const parties = buildParties([...rows, ...candidateRows, ...fallbackNationalRows], override?.parties || []);
  const circunscripciones = buildCircunscripciones(key, rows, override?.circunscripciones || []);
  const nationalVotes = aggregateNational(circunscripciones);
  const fallbackNationalVotes = nationalVotes.length ? nationalVotes : votesFromRows(fallbackNationalRows);
  const blankNull = sum(rows.filter((row) => isBlankNull(getParty(row))).map((row) => getVotes(row))) || override?.blankNull || 0;
  const candidates = buildCandidates(candidateRows, parties, key, override?.candidates || []);
  const allocations = { noBarrier: [], barrier: [] };

  diagnostics.cameras[key] = {
    inputRows: rows.length,
    nationalRows: fallbackNationalRows.length,
    candidateRows: candidateRows.length,
    allocationRowsNoBarrier: allocationRowsForCamera(key, source, false).length,
    allocationRowsBarrier: allocationRowsForCamera(key, source, true).length,
    allocationsNoBarrier: allocations?.noBarrier?.length || 0,
    allocationsBarrier: allocations?.barrier?.length || 0,
    parties: parties.length,
    circunscripciones: circunscripciones.length,
    nationalVotes: fallbackNationalVotes.length,
    candidates: candidates.length,
    sampleRows: rows.slice(0, 3)
  };

  return {
    name: meta.name,
    seats: meta.seats,
    barrier: 0.05,
    parties,
    circunscripciones,
    nationalVotes: fallbackNationalVotes,
    candidates,
    allocations,
    blankNull
  };
}

function rowsForCamera(key, source) {
  // Para votos base por circunscripción usamos los archivos sin barrera; la valla se recalcula abajo.
  // Los resúmenes nacionales quedan como respaldo para porcentajes y logos.
  const explicit = {
    diputados: [source.resultadoDipSB, source.resumenDiputados],
    senadoRegional: [source.resultadoSenMulSB, source.resumenSenado],
    senadoNacional: [source.resultadoSenNacSB, source.resumenSenadoNac],
    andino: [source.resumenAndino, source.resumenAndinoNac]
  }[key] || [];
  const rows = explicit.flat().filter(Boolean);
  return dedupeRows(rows, key);
}

function nationalRowsForCamera(key, source) {
  const explicit = {
    diputados: [source.resumenDiputadosNac],
    senadoRegional: [],
    senadoNacional: [source.resumenSenadoNac],
    andino: [source.resumenAndinoNac]
  }[key] || [];
  return explicit.flat().filter(Boolean);
}

function candidateRowsForCamera(key, source) {
  const rows = [...(source.electosConBarrera || []), ...(source.electosSinBarrera || []), ...(source.combinado || [])];
  return dedupeRows(rows.filter((row) => rowCameraKey(row) === key && getCandidate(row)), key);
}

function allocationRowsForCamera(key, source, withBarrier) {
  const specific = {
    diputados: withBarrier ? source.resultadoDipCB : source.resultadoDipSB,
    senadoRegional: withBarrier ? source.resultadoSenMulCB : source.resultadoSenMulSB,
    senadoNacional: withBarrier ? source.resultadoSenNacCB : source.resultadoSenNacSB,
    andino: withBarrier ? source.resultadoAndinoCB : source.resultadoAndinoCB
  }[key] || [];

  let rows = Array.isArray(specific) ? specific.filter((row) => !rowCameraKey(row) || rowCameraKey(row) === key) : [];
  if (rows.length) return dedupeRows(rows, key);

  const electos = withBarrier ? source.electosConBarrera : source.electosSinBarrera;
  rows = (electos || []).filter((row) => rowCameraKey(row) === key);
  if (rows.length) return dedupeRows(rows, key);

  rows = (source.combinado || []).filter((row) => rowCameraKey(row) === key);
  return dedupeRows(rows, key);
}

function buildAkllaAllocations(key, source, candidates = []) {
  const noBarrier = buildAllocationListFromRows(key, allocationRowsForCamera(key, source, false), candidates);
  const barrier = buildAllocationListFromRows(key, allocationRowsForCamera(key, source, true), candidates);
  return { noBarrier, barrier };
}

function buildAllocationListFromRows(key, rows, candidates = []) {
  const buckets = new Map();
  for (const row of rows || []) {
    const party = clean(getParty(row));
    if (!party || isBlankNull(party)) continue;
    const circ = normalizeCirc(getCirc(row, key), key);
    if (!circ || circ === "PENDIENTE") continue;
    const bucketKey = `${circ}|${party}`;
    if (!buckets.has(bucketKey)) buckets.set(bucketKey, { circ, party, maxSeats: 0, rows: new Set(), candidateNames: new Set() });
    const bucket = buckets.get(bucketKey);
    const seats = getSeats(row);
    if (seats > 0) bucket.maxSeats = Math.max(bucket.maxSeats, seats);
    const cand = clean(getCandidate(row));
    const seatNo = getNumEscanioPartido(row);
    if (cand) bucket.candidateNames.add(cand);
    else if (seatNo > 0) bucket.rows.add(`seat:${seatNo}`);
    else bucket.rows.add(JSON.stringify([party, circ, getVotes(row), seats, getLista(row)]));
  }

  const list = [];
  for (const b of buckets.values()) {
    const counted = b.candidateNames.size || b.rows.size;
    let seats = b.maxSeats || counted;
    // Los resúmenes nacionales pueden traer votos pero no curules; no inventar escaños si no hay indicador de escaño/candidato.
    if (!seats) continue;
    list.push({ circunscripcion: b.circ, party: b.party, seats });
  }

  return list.sort((a, b) => a.circunscripcion.localeCompare(b.circunscripcion, "es") || b.seats - a.seats || a.party.localeCompare(b.party, "es"));
}

function dedupeRows(rows, key) {
  const seen = new Set();
  const result = [];
  for (const row of rows) {
    const k = [
      key,
      rowCameraKey(row) || key,
      getParty(row),
      normalizeCirc(getCirc(row, key), key),
      getVotes(row),
      getCandidate(row),
      getLista(row),
      getTipoCandidatura(row),
      getNumEscanioPartido(row)
    ].join("|");
    if (seen.has(k)) continue;
    seen.add(k);
    result.push(row);
  }
  return result;
}

function buildParties(rows, overrideParties) {
  const map = new Map();
  for (const row of rows) {
    const party = clean(getParty(row));
    if (!party || isBlankNull(party)) continue;
    if (!map.has(party)) {
      map.set(party, {
        name: party,
        short: get(row, ["SIGLA", "sigla", "ABREVIATURA", "abreviatura"]) || initials(party),
        color: get(row, ["COLOR", "color"]) || COLORS[map.size % COLORS.length],
        logo: absolutizeUrl(getPartyLogo(row)) || partyLogoFallback(party, get(row, ["SIGLA", "sigla", "ABREVIATURA", "abreviatura"]) || initials(party))
      });
    } else {
      const current = map.get(party);
      if (!current.color && get(row, ["COLOR", "color"])) current.color = get(row, ["COLOR", "color"]);
      const rowLogo = absolutizeUrl(getPartyLogo(row));
      if (rowLogo && (!current.logo || isLocalLogoFallback(current.logo))) current.logo = rowLogo;
    }
  }
  if (!map.size && Array.isArray(overrideParties)) for (const p of overrideParties) if (p?.name) map.set(clean(p.name), p);
  return [...map.values()];
}

function buildCircunscripciones(key, rows, overrides) {
  const meta = CAMERA_META[key];
  const byCirc = new Map();

  for (const row of rows) {
    const party = clean(getParty(row));
    if (!party || isBlankNull(party)) continue;
    const rawCirc = getCirc(row, key);
    const circ = normalizeCirc(rawCirc, key);
    if (!circ || circ === "PENDIENTE") continue;
    if ((key === "diputados" || key === "senadoRegional") && !isKnownCirc(key, circ)) continue;
    if (!byCirc.has(circ)) byCirc.set(circ, { votes: new Map() });
    const current = byCirc.get(circ);
    const votes = getVotes(row);
    if (votes > 0) current.votes.set(party, Math.max(current.votes.get(party) || 0, votes));
  }

  let result = [...byCirc.entries()].map(([name, value]) => ({
    name,
    seats: seatsFor(key, name),
    votes: [...value.votes.entries()].map(([party, votes]) => ({ party, votes })).sort((a, b) => b.votes - a.votes)
  })).sort((a, b) => a.name.localeCompare(b.name, "es"));

  if (!result.length && Array.isArray(overrides) && overrides.length) result = overrides;
  if (!result.length) result = defaultCircunscripciones(key);

  // Para Diputados y Senado Regional, nunca convertir falta de datos en una falsa circunscripción nacional.
  if ((key === "diputados" || key === "senadoRegional") && result.length === 1 && normalize(result[0].name) === "NACIONAL") {
    result = defaultCircunscripciones(key);
  }

  return result;
}

function defaultCircunscripciones(key) {
  const meta = CAMERA_META[key];
  if (key === "andino" || key === "senadoNacional") return [{ name: "NACIONAL", seats: meta.seats, votes: [] }];
  return Object.entries(meta.circSeats).map(([name, seats]) => ({ name, seats, votes: [] }));
}

function seatsFor(key, name) {
  const meta = CAMERA_META[key];
  const normalized = normalize(name);
  for (const [label, seats] of Object.entries(meta.circSeats)) if (normalize(label) === normalized) return seats;
  return key === "andino" || key === "senadoNacional" ? meta.seats : 0;
}

function isKnownCirc(key, name) {
  const meta = CAMERA_META[key];
  if (!meta?.circSeats) return true;
  const normalized = normalize(name);
  return Object.keys(meta.circSeats).some((label) => normalize(label) === normalized);
}

function votesFromRows(rows) {
  const map = new Map();
  for (const row of rows) {
    const party = clean(getParty(row));
    if (!party || isBlankNull(party)) continue;
    const votes = getVotes(row);
    if (votes > 0) map.set(party, Math.max(map.get(party) || 0, votes));
  }
  return [...map.entries()].map(([party, votes]) => ({ party, votes })).sort((a, b) => b.votes - a.votes);
}

function aggregateNational(circs) {
  const totals = new Map();
  for (const circ of circs) for (const vote of circ.votes || []) totals.set(vote.party, (totals.get(vote.party) || 0) + num(vote.votes));
  return [...totals.entries()].map(([party, votes]) => ({ party, votes })).sort((a, b) => b.votes - a.votes);
}

function buildCandidates(rows, parties, key, overrides) {
  const partyMap = new Map(parties.map((p) => [clean(p.name), p]));
  const seen = new Set();
  const candidates = [];
  for (const row of rows) {
    const party = clean(getParty(row));
    const name = clean(getCandidate(row));
    if (!party || !name || name === "-" || isBlankNull(party)) continue;
    const circ = normalizeCirc(getCirc(row, key), key);
    const id = `${key}|${party}|${name}|${circ}|${getTipoCandidatura(row)}|${getNumEscanioPartido(row)}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const born = get(row, ["feNacimiento", "FENACIMIENTO", "fechaNacimiento", "FE_NACIMIENTO"]);
    const edad = get(row, ["EDAD", "edad"]) || ageFromBirthDate(born);
    candidates.push({
      name,
      party,
      partyShort: partyMap.get(party)?.short || initials(party),
      circunscripcion: circ,
      votosPref: getVotosPref(row),
      posicion: positiveOrNull(get(row, ["POSICION", "posicion", "LISTA", "lista", "NUM_LISTA", "num_lista", "NUM_ESCANIO_PARTIDO", "num_escanio_partido"])),
      edad,
      imageUrl: absolutizeUrl(get(row, ["foto", "FOTO", "Foto", "foto_url", "FOTO_URL", "imagen", "IMAGEN", "LINK_FOTO"])),
      tipoCandidatura: getTipoCandidatura(row),
      numEscanioPartido: getNumEscanioPartido(row)
    });
  }
  if (!candidates.length && Array.isArray(overrides)) return overrides;
  return candidates.sort(candidateSort).slice(0, 5000);
}

function candidateSort(a, b) {
  const party = clean(a.party).localeCompare(clean(b.party), "es");
  if (party !== 0) return party;
  const circ = clean(a.circunscripcion).localeCompare(clean(b.circunscripcion), "es");
  if (circ !== 0) return circ;
  const seat = num(a.numEscanioPartido) - num(b.numEscanioPartido);
  if (seat !== 0) return seat;
  const tipo = tipoPriority(a.tipoCandidatura) - tipoPriority(b.tipoCandidatura);
  if (tipo !== 0) return tipo;
  return num(b.votosPref) - num(a.votosPref);
}

function tipoPriority(value) {
  const tipo = normalize(value);
  if (tipo === "TITULAR") return 0;
  if (tipo === "PRIMER SUPLENTE") return 1;
  if (tipo === "SEGUNDO SUPLENTE") return 2;
  return 3;
}


function applyComputedAllocations(cameras) {
  cameras.diputados.allocations = computeCameraAllocations(cameras.diputados, "diputados");

  const senateNacionalRaw = allocateAcrossCircunscripciones(cameras.senadoNacional.circunscripciones || [], null);
  const senateRegionalRaw = allocateAcrossCircunscripciones(cameras.senadoRegional.circunscripciones || [], null);
  const senateRaw = mergeSeatMaps(senateNacionalRaw, senateRegionalRaw);
  const senateVotes = aggregateVotesList([
    ...(cameras.senadoNacional.nationalVotes || []),
    ...(cameras.senadoRegional.nationalVotes || [])
  ]);
  const senateTotalVotes = sum(senateVotes.map((v) => v.votes)) || 1;
  const senateEligible = new Set();
  for (const v of senateVotes) {
    const share = num(v.votes) / senateTotalVotes;
    const rawSeats = senateRaw.get(v.party) || 0;
    if (share >= 0.05 && rawSeats >= 3 && isQualifiedParty2026(v.party)) senateEligible.add(v.party);
  }
  cameras.senadoNacional.allocations = {
    noBarrier: allocationListFromCircs(cameras.senadoNacional.circunscripciones || [], null),
    barrier: allocationListFromCircs(cameras.senadoNacional.circunscripciones || [], senateEligible)
  };
  cameras.senadoRegional.allocations = {
    noBarrier: allocationListFromCircs(cameras.senadoRegional.circunscripciones || [], null),
    barrier: allocationListFromCircs(cameras.senadoRegional.circunscripciones || [], senateEligible)
  };
  cameras.andino.allocations = computeCameraAllocations(cameras.andino, "andino");
}

function computeCameraAllocations(camera, key) {
  const circs = camera.circunscripciones || [];
  const noBarrier = allocationListFromCircs(circs, null);
  let eligible = null;
  if (key === "diputados") {
    const rawSeats = allocationMapFromList(noBarrier);
    const nationalVotes = camera.nationalVotes?.length ? camera.nationalVotes : aggregateNational(circs);
    const totalVotes = sum(nationalVotes.map((v) => v.votes)) || 1;
    eligible = new Set();
    for (const v of nationalVotes) {
      const share = num(v.votes) / totalVotes;
      const seats = rawSeats.get(v.party) || 0;
      if (share >= 0.05 && seats >= 7 && isQualifiedParty2026(v.party)) eligible.add(v.party);
    }
  } else if (key === "andino") {
    const nationalVotes = camera.nationalVotes?.length ? camera.nationalVotes : aggregateNational(circs);
    const totalVotes = sum(nationalVotes.map((v) => v.votes)) || 1;
    eligible = new Set(nationalVotes.filter((v) => num(v.votes) / totalVotes >= 0.05).map((v) => v.party));
  }
  return { noBarrier, barrier: allocationListFromCircs(circs, eligible) };
}

function allocationListFromCircs(circs, eligible) {
  const list = [];
  for (const circ of circs || []) {
    const seats = num(circ.seats);
    if (!seats) continue;
    let votes = (circ.votes || []).filter((v) => num(v.votes) > 0);
    if (eligible) votes = votes.filter((v) => eligible.has(v.party));
    const alloc = seatsByDhondt(votes, seats);
    for (const [party, assigned] of alloc.entries()) {
      if (assigned > 0) list.push({ circunscripcion: circ.name, party, seats: assigned });
    }
  }
  return list;
}

function allocateAcrossCircunscripciones(circs, eligible) {
  return allocationMapFromList(allocationListFromCircs(circs, eligible));
}

function allocationMapFromList(list) {
  const out = new Map();
  for (const item of list || []) out.set(item.party, (out.get(item.party) || 0) + num(item.seats));
  return out;
}

function mergeSeatMaps(...maps) {
  const out = new Map();
  for (const map of maps) for (const [party, seats] of map.entries()) out.set(party, (out.get(party) || 0) + seats);
  return out;
}

function aggregateVotesList(votes) {
  const out = new Map();
  for (const v of votes || []) if (v?.party) out.set(v.party, (out.get(v.party) || 0) + num(v.votes));
  return [...out.entries()].map(([party, votes]) => ({ party, votes })).sort((a, b) => b.votes - a.votes);
}

function seatsByDhondt(votes, seats) {
  const totalSeats = Math.max(0, num(seats));
  if (!totalSeats || !votes?.length) return new Map();
  const rows = [];
  for (const v of votes) {
    const value = num(v.votes);
    if (value <= 0) continue;
    for (let d = 1; d <= totalSeats; d++) rows.push({ party: v.party, votes: value, q: value / d });
  }
  rows.sort((a, b) => b.q - a.q || b.votes - a.votes || clean(a.party).localeCompare(clean(b.party), "es"));
  const out = new Map();
  rows.slice(0, totalSeats).forEach((r) => out.set(r.party, (out.get(r.party) || 0) + 1));
  return out;
}

function partyLogoFallback(party, short) {
  const code = slug(short || initials(party));
  // Prioridad local: si el usuario sube /logos/FP.png, /logos/RP.png, etc., la interfaz lo toma directamente.
  return `/logos/${code}.png`;
}

function isLocalLogoFallback(value) {
  return String(value || "").startsWith("/logos/");
}

function slug(value) {
  return normalize(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function isQualifiedParty2026(party) {
  const value = normalize(party);
  if (QUALIFIED_PARTIES_2026.has(value)) return true;
  if (value.startsWith("AHORA NACION")) return true;
  if (value.startsWith("PARTIDO CIVICO OBRAS")) return true;
  if (value.startsWith("PARTIDO DEL BUEN GOBIERNO")) return true;
  if (value.startsWith("JUNTOS POR EL PERU")) return true;
  if (value.startsWith("RENOVACION POPULAR")) return true;
  return value === "FUERZA POPULAR";
}

function mergeSenateAlias(nacional, regional) {
  const parties = mergeParties(nacional.parties || [], regional.parties || []);
  const circunscripciones = [
    ...(nacional.circunscripciones || []).map((c) => ({ ...c, name: c.name === "NACIONAL" ? "SENADO NACIONAL" : c.name, group: "Nacional" })),
    ...(regional.circunscripciones || []).map((c) => ({ ...c, group: "Regional" }))
  ];
  return {
    name: "Cámara de Senadores total",
    seats: 60,
    barrier: 0.05,
    status: combineStatuses(nacional.status, regional.status),
    parties,
    circunscripciones,
    nationalVotes: aggregateNational(circunscripciones),
    candidates: [
      ...(nacional.candidates || []).map((c) => ({ ...c, senateBlock: "Nacional" })),
      ...(regional.candidates || []).map((c) => ({ ...c, senateBlock: "Regional" }))
    ].sort((a, b) => num(b.votosPref) - num(a.votosPref)),
    allocations: {
      noBarrier: [
        ...((nacional.allocations?.noBarrier) || []).map((a) => ({ ...a, circunscripcion: `NACIONAL · ${a.circunscripcion || "NACIONAL"}`, group: "Nacional" })),
        ...((regional.allocations?.noBarrier) || []).map((a) => ({ ...a, circunscripcion: `REGIONAL · ${a.circunscripcion}`, group: "Regional" }))
      ],
      barrier: [
        ...((nacional.allocations?.barrier) || []).map((a) => ({ ...a, circunscripcion: `NACIONAL · ${a.circunscripcion || "NACIONAL"}`, group: "Nacional" })),
        ...((regional.allocations?.barrier) || []).map((a) => ({ ...a, circunscripcion: `REGIONAL · ${a.circunscripcion}`, group: "Regional" }))
      ]
    },
    blankNull: num(nacional.blankNull) + num(regional.blankNull)
  };
}

function mergeParties(...lists) {
  const map = new Map();
  for (const list of lists) for (const p of list) if (p?.name && !map.has(clean(p.name))) map.set(clean(p.name), p);
  return [...map.values()];
}


function validateCameraStructure(cameras) {
  const checks = [
    ['diputados', 130, DIPUTADOS_SEATS],
    ['senadoNacional', 30, { 'NACIONAL': 30 }],
    ['senadoRegional', 30, REGIONAL_SEATS],
    ['andino', 5, { 'NACIONAL': 5 }]
  ];
  for (const [key, expected, official] of checks) {
    const cam = cameras[key];
    const sumSeats = sum((cam.circunscripciones || []).map((c) => c.seats));
    if (sumSeats !== expected) {
      throw new Error(`${key} tiene ${sumSeats} curules en circunscripciones; debe tener ${expected}.`);
    }
    for (const [name, seats] of Object.entries(official)) {
      const found = (cam.circunscripciones || []).find((c) => normalize(c.name) === normalize(name));
      if (!found) throw new Error(`${key} no contiene la circunscripción oficial ${name}.`);
      if (num(found.seats) !== seats) throw new Error(`${key} / ${name}: ${found.seats} curules; debe tener ${seats}.`);
    }
    for (const scenario of ['noBarrier', 'barrier']) {
      const total = sum((cam.allocations?.[scenario] || []).map((a) => a.seats));
      if ((cam.allocations?.[scenario] || []).length && total !== expected) {
        throw new Error(`${key}.${scenario} asigna ${total} curules; debe asignar ${expected}.`);
      }
    }
  }
}

async function tryOnpeStatus() {
  const docs = [];
  for (const [label, url] of Object.entries(ONPE)) {
    try {
      const r = await fetch(noCache(url), { headers: { "Accept": "application/json,text/plain,*/*", "User-Agent": "Mozilla/5.0 EVA-Abogados-Observatorio/3.0" }, cache: "no-store" });
      const text = await r.text();
      if (!r.ok || /^\s*</.test(text)) throw new Error(`HTTP/HTML ${r.status}`);
      docs.push(JSON.parse(text));
    } catch (e) {
      note(`ONPE status ${label}: ${e.message}`);
    }
  }
  const statuses = docs.map((d) => extractStatus(d)).filter(Boolean);
  if (!statuses.length) return null;
  const processed = Math.max(...statuses.map((s) => num(s.processed)).filter(Boolean), 0);
  const total = Math.max(...statuses.map((s) => num(s.total)).filter(Boolean), 0);
  return { percent: total ? Number(((processed / total) * 100).toFixed(3)) : statuses[0].percent, processed: processed || null, total: total || null };
}

function buildStatusFromActas(rows) {
  if (!Array.isArray(rows) || !rows.length) return { percent: null, processed: null, total: null };
  const processed = sum(rows.map((r) => num(get(r, ["contabilizadas", "actasContabilizadas", "procesadas"], 0))));
  const total = sum(rows.map((r) => num(get(r, ["totalActas", "total"], 0))));
  const updated = Math.max(...rows.map((r) => num(get(r, ["fechaActualizacion"], 0))).filter(Boolean), 0);
  return { percent: total ? Number(((processed / total) * 100).toFixed(3)) : null, processed: processed || null, total: total || null, updated };
}

function applyCameraStatuses(cameras, actasRows) {
  const statuses = buildCameraStatusesFromActas(actasRows);
  for (const [key, status] of Object.entries(statuses)) {
    if (cameras[key]) cameras[key].status = status;
  }
  const senateStatus = combineStatuses(statuses.senadoNacional, statuses.senadoRegional);
  if (senateStatus) {
    cameras.senadoNacional.status = statuses.senadoNacional || senateStatus;
    cameras.senadoRegional.status = statuses.senadoRegional || senateStatus;
  }
}

function buildCameraStatusesFromActas(rows) {
  if (!Array.isArray(rows) || !rows.length) return {};
  const groups = { diputados: [], senadoNacional: [], senadoRegional: [], andino: [] };
  for (const row of rows) {
    const key = rowCameraKey(row);
    if (groups[key]) groups[key].push(row);
  }
  const out = {};
  for (const [key, group] of Object.entries(groups)) {
    if (group.length) out[key] = buildStatusFromActas(group);
  }
  return out;
}

function combineStatuses(...statuses) {
  const valid = statuses.filter((s) => s && (s.processed != null || s.total != null));
  if (!valid.length) return null;
  const processed = sum(valid.map((s) => s.processed));
  const total = sum(valid.map((s) => s.total));
  const updated = Math.max(...valid.map((s) => num(s.updated)).filter(Boolean), 0);
  return { percent: total ? Number(((processed / total) * 100).toFixed(3)) : null, processed: processed || null, total: total || null, updated };
}

function extractStatus(doc) {
  const data = doc?.data || doc || {};
  return {
    percent: numberOrNull(get(data, ["actasContabilizadas", "porcentajeActasContabilizadas", "percent"])),
    processed: numberOrNull(get(data, ["contabilizadas", "actasProcesadas", "processed"])),
    total: numberOrNull(get(data, ["totalActas", "total"]))
  };
}

function rowCameraKey(row) {
  const value = normalize(getEleccion(row));
  const circ = normalize(getCirc(row, ""));
  const tipo = normalize(getTipoCandidatura(row));
  const joined = `${value} ${circ} ${tipo}`;
  if (joined.includes("DIPUT")) return "diputados";
  if (joined.includes("PARLAMENTO ANDINO") || joined.includes("ANDINO")) return "andino";
  if (joined.includes("SENADORES DISTRITO UNICO") || joined.includes("SENADORES DISTRITO UNICO NACIONAL") || joined.includes("DISTRITO UNICO") || joined.includes("DISTRITO NACIONAL")) return "senadoNacional";
  if (joined.includes("SENADORES DISTRITO MULTIPLE") || joined.includes("DISTRITO MULTIPLE")) return "senadoRegional";
  if (joined.includes("SENADORES") || joined.includes("SENADO")) return "senadoRegional";
  return "";
}

function getPartyLogo(row) { return get(row, ["LINK_FOTO", "link_foto", "FOTO", "foto", "LOGO_OP", "logo_op", "LOGO_PARTIDO", "logo_partido", "logoPartido", "LOGO", "logo", "URL_LOGO", "urlLogo", "SIMBOLO", "simbolo", "linkLogo", "LINK_LOGO", "IMAGEN_OP", "imagen_op", "RUTA_LOGO", "ruta_logo", "ARCHIVO_LOGO", "archivo_logo", "EMBLEMA", "emblema", "URL_SIMBOLO", "url_simbolo"], ""); }
function getSeats(row) { return num(get(row, ["ESCANOS", "ESCAÑOS", "escanos", "escaños", "CURULES", "curules", "NUM_ESCANOS", "NUM_ESCAÑOS", "numEscanos", "numEscaños", "TOTAL_ESCANOS", "TOTAL_ESCAÑOS", "totalEscanos", "totalEscaños", "CANTIDAD_ESCANOS", "CANTIDAD_ESCAÑOS"], 0)); }
function getParty(row) { return get(row, ["DESCRIPCION_OP", "descripcion_op", "DESC_OP", "desc_op", "PARTIDO", "partido", "ORGANIZACION_POLITICA", "organizacion_politica", "ORGANIZACIÓN POLÍTICA", "nombre", "nombreAgrupacionPolitica", "AGRUPACION", "agrupacion", "NOMPART", "organizacionPolitica", "descripcionOrganizacion", "OP", "op"], ""); }
function getVotes(row) { return num(get(row, ["SUMA_VOTOS_PART", "suma_votos_part", "SUMA_VOTOS", "suma_votos", "VOTOS", "votos", "TOTAL_VOTOS", "totalVotos", "VOTOS_TOTAL", "votos_total", "VOTOS_OBTENIDOS", "votosObtenidos", "VOTACION", "votacion", "VOTOS_PARTIDO", "votos_partido"], 0)); }
function getCirc(row, key) { return get(row, ["circunscripción", "CIRCUNSCRIPCION", "circunscripcion", "CIRCUNSCRIPCIÓN", "DISTRITO_ELECTORAL", "distrito_electoral", "DISTRITO ELECTORAL", "strDistritoElec", "STRDISTRITOELEC", "NOMBRE_DISTRITO_ELECTORAL", "nombre_distrito_electoral", "DISTRITO", "distrito", "departamento", "DEPARTAMENTO", "ambito", "AMBITO", "ÁMBITO"], key === "andino" || key === "senadoNacional" ? "NACIONAL" : "PENDIENTE"); }
function getEleccion(row) { return get(row, ["Elecc", "ELECC", "elecc", "ELECCION", "ELECCIÓN", "TIPO_ELECCION", "TIPO ELECCION", "TIPO_DE_ELECCION", "tipo_de_eleccion", "camara", "CAMARA", "CÁMARA", "tipoEleccion", "ELECCION_NOMBRE", "eleccion_nombre", "__sheetName"], ""); }
function getCandidate(row) { return get(row, ["CANDIDATO", "candidato", "NOMBRE_CANDIDATO", "nombre_candidato", "NOMBRES_CANDIDATO", "APELLIDOS_NOMBRES", "apellidos_nombres", "nombreCompleto", "NOMBRE_COMPLETO", "NOMBRE", "nombre"], ""); }
function getVotosPref(row) { return num(get(row, ["VOTOS_PREF", "VOTOS_PREFERENCIALES", "votos_pref", "votosPreferenciales", "VOTO_PREFERENCIAL", "voto_preferencial", "PREFERENCIALES", "preferenciales"], 0)); }
function getLista(row) { return get(row, ["LISTA", "lista", "NUM_LISTA", "num_lista"], "-"); }
function getTipoCandidatura(row) { return clean(get(row, ["TIPO_CANDIDATURA", "tipo_candidatura", "tipoCandidatura"], "")); }
function getNumEscanioPartido(row) { const n = num(get(row, ["NUM_ESCANIO_PARTIDO", "num_escanio_partido", "numEscanioPartido"], 0)); return n > 0 ? n : 0; }

function normalizeCirc(value, key) {
  const text = clean(value || "");
  const norm = normalize(text);
  if (!text || norm === "PENDIENTE") return key === "andino" || key === "senadoNacional" ? "NACIONAL" : "PENDIENTE";
  if (["UNICO NACIONAL", "DISTRITO UNICO", "DISTRITO UNICO NACIONAL", "DISTRITO NACIONAL", "UNICO", "NACIONAL"].includes(norm)) return "NACIONAL";
  if (norm === "PERUANOS RESIDENTES EN EL EXTRANJERO") return "RESIDENTES EN EL EXTRANJERO";
  if (key === "andino" || key === "senadoNacional") return "NACIONAL";
  return canonicalCirc(text);
}

function canonicalCirc(value) {
  const norm = normalize(value);
  if (["LIMA", "LIMA METROPOLITANA"].includes(norm)) return "LIMA METROPOLITANA";
  if (norm.includes("EXTRANJERO")) return "RESIDENTES EN EL EXTRANJERO";
  const all = { ...DIPUTADOS_SEATS, ...REGIONAL_SEATS };
  for (const label of Object.keys(all)) if (normalize(label) === norm) return label;
  return clean(value);
}

function normalizeRows(rows) {
  return rows.map((row) => {
    const out = { ...row };
    for (const k of Object.keys(out)) if (/votos|esca|actas|contabilizadas|total|lista|posicion|fechaActualizacion|identifica|num_esc|por_/i.test(k)) out[k] = parseMaybeNumber(out[k]);
    return out;
  });
}

function get(row, keys, fallback = "") { for (const key of keys) { const found = findCaseInsensitive(row, key); if (found !== undefined && found !== null && found !== "") return found; } return fallback; }
function findCaseInsensitive(obj, wanted) { const target = normalizeKey(wanted); for (const [k, v] of Object.entries(obj || {})) if (normalizeKey(k) === target) return v; return undefined; }
function normalizeKey(value) { return normalize(value).replace(/[^A-Z0-9]/g, ""); }
function normalize(value) { return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toUpperCase(); }
function clean(value) { return String(value || "").replace(/\s+/g, " ").trim().toUpperCase(); }
function num(value) { const n = Number(String(value ?? 0).replace(/,/g, "").replace("%", "").trim()); return Number.isFinite(n) ? n : 0; }
function numberOrNull(value) { const n = num(value); return Number.isFinite(n) && String(value ?? "") !== "" ? n : null; }
function positiveOrNull(value) { const n = num(value); return n > 0 ? n : null; }
function sum(values) { return values.reduce((a, b) => a + num(b), 0); }
function parseMaybeNumber(value) { if (typeof value === "number") return value; const s = String(value ?? "").trim(); if (!s) return value; const n = Number(s.replace(/,/g, "")); return Number.isFinite(n) ? n : value; }
function isBlankNull(value) { const t = normalize(value); return t.includes("BLANCO") || t.includes("NULO") || t.includes("IMPUGNADO"); }
function initials(value) { return clean(value).split(" ").filter((w) => !["DE", "DEL", "LA", "EL", "Y", "POR", "PARA", "PARTIDO", "LOS", "LAS"].includes(w)).slice(0, 3).map((w) => w[0]).join(""); }
function ageFromBirthDate(value) { const raw = String(value || "").trim(); const m = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/); if (!m) return ""; const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])); const now = new Date(); let age = now.getFullYear() - d.getFullYear(); const mo = now.getMonth() - d.getMonth(); if (mo < 0 || (mo === 0 && now.getDate() < d.getDate())) age--; return age >= 0 ? age : ""; }
function absolutizeUrl(value) { const raw = String(value || "").trim().replace(/^['"]+|['"]+$/g, ""); if (!raw) return ""; try { return new URL(raw, `${AKLLA_BASE_URL}/`).toString(); } catch { return raw; } }
function noCache(url) { const u = new URL(url); u.searchParams.set("v", Date.now().toString()); return u.toString(); }
function trimSlash(value) { return String(value).replace(/\/$/, ""); }
function note(message) { sourceNotes.push(message); console.log(`Nota: ${message}`); }
async function loadJson(file, fallback) { try { return JSON.parse(await readFile(file, "utf8")); } catch { return fallback; } }

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
