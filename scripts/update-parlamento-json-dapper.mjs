import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const dataDir = path.join(rootDir, "data");
const outFile = path.join(dataDir, "parlamento-2026.json");
const diagnosticFile = path.join(dataDir, "diagnostico-dapper.json");
const previousFile = outFile;
const candidateBackupFile = path.join(dataDir, "candidatos-respaldo-2026.json");

const DAPPER_BASE_URL = trimSlash(process.env.DAPPER_BASE_URL || "https://elecciones2026.dapperglobal.com");
const JNE_SERVICE_BASE_URL = trimSlash(process.env.JNE_SERVICE_BASE_URL || "https://web.jne.gob.pe/serviciovotoinformado");
const JNE_IMAGE_BASE_URL = trimSlash(process.env.JNE_IMAGE_BASE_URL || "https://mpesije.jne.gob.pe/apidocs");
const JNE_PROCESS_ID = 124;
const JNE_ELECTION = {
  andino: 3,
  diputados: 15,
  senadoNacional: 20,
  senadoRegional: 21
};

const DISTRICT_NAME = new Map([
  [1, "AMAZONAS"],
  [2, "ÁNCASH"],
  [3, "APURÍMAC"],
  [4, "AREQUIPA"],
  [5, "AYACUCHO"],
  [6, "CAJAMARCA"],
  [7, "CALLAO"],
  [8, "CUSCO"],
  [9, "HUANCAVELICA"],
  [10, "HUÁNUCO"],
  [11, "ICA"],
  [12, "JUNÍN"],
  [13, "LA LIBERTAD"],
  [14, "LAMBAYEQUE"],
  [15, "LIMA METROPOLITANA"],
  [16, "LIMA PROVINCIAS"],
  [17, "LORETO"],
  [18, "MADRE DE DIOS"],
  [19, "MOQUEGUA"],
  [20, "PASCO"],
  [21, "PIURA"],
  [22, "PUNO"],
  [23, "SAN MARTÍN"],
  [24, "TACNA"],
  [25, "TUMBES"],
  [26, "UCAYALI"],
  [27, "RESIDENTES EN EL EXTRANJERO"]
]);

const JNE_UBIGEO_BY_DISTRICT = new Map([
  ["AMAZONAS", "010000"],
  ["ÁNCASH", "020000"],
  ["APURÍMAC", "030000"],
  ["AREQUIPA", "040000"],
  ["AYACUCHO", "050000"],
  ["CAJAMARCA", "060000"],
  ["CALLAO", "240000"],
  ["CUSCO", "070000"],
  ["HUANCAVELICA", "080000"],
  ["HUÁNUCO", "090000"],
  ["ICA", "100000"],
  ["JUNÍN", "110000"],
  ["LA LIBERTAD", "120000"],
  ["LAMBAYEQUE", "130000"],
  ["LIMA METROPOLITANA", "140100"],
  ["LIMA PROVINCIAS", "140000"],
  ["LORETO", "150000"],
  ["MADRE DE DIOS", "160000"],
  ["MOQUEGUA", "170000"],
  ["PASCO", "180000"],
  ["PIURA", "190000"],
  ["PUNO", "200000"],
  ["SAN MARTÍN", "210000"],
  ["TACNA", "220000"],
  ["TUMBES", "230000"],
  ["UCAYALI", "250000"],
  ["RESIDENTES EN EL EXTRANJERO", "140133"],
  ["NACIONAL", ""]
]);

const PARTY_CANONICAL = new Map([
  ["FUERZA POPULAR", ["FP", "FUERZA POPULAR"]],
  ["JUNTOS POR EL PERU", ["JP", "JUNTOS POR EL PERÚ"]],
  ["RENOVACION POPULAR", ["RP", "RENOVACIÓN POPULAR"]],
  ["PARTIDO DEL BUEN GOBIERNO", ["BG", "PARTIDO DEL BUEN GOBIERNO"]],
  ["PARTIDO CIVICO OBRAS", ["CO", "PARTIDO CÍVICO OBRAS"]],
  ["AHORA NACION - AN", ["AN-", "AHORA NACIÓN - AN"]],
  ["PARTIDO PAIS PARA TODOS", ["PT", "PARTIDO PAÍS PARA TODOS"]],
  ["ALIANZA PARA EL PROGRESO", ["AP", "ALIANZA PARA EL PROGRESO"]],
  ["PODEMOS PERU", ["PP", "PODEMOS PERÚ"]],
  ["PARTIDO DEMOCRATICO SOMOS PERU", ["DSP", "PARTIDO DEMOCRÁTICO SOMOS PERÚ"]],
  ["PRIMERO LA GENTE - COMUNIDAD, ECOLOGIA, LIBERTAD Y PROGRESO", ["PG–", "PRIMERO LA GENTE – COMUNIDAD, ECOLOGÍA, LIBERTAD Y PROGRESO"]],
  ["PARTIDO FRENTE DE LA ESPERANZA 2021", ["FE", "PARTIDO FRENTE DE LA ESPERANZA 2021"]],
  ["PARTIDO APRISTA PERUANO", ["PAP", "PARTIDO APRISTA PERUANO"]],
  ["FRENTE POPULAR AGRICOLA FIA DEL PERU", ["FREPAP", "FRENTE POPULAR AGRÍCOLA FIA DEL PERÚ"]],
  ["PARTIDO POLITICO PERU PRIMERO", ["PP1", "PARTIDO POLÍTICO PERÚ PRIMERO"]],
  ["PARTIDO DEMOCRATA VERDE", ["PDV", "PARTIDO DEMÓCRATA VERDE"]],
  ["ALIANZA ELECTORAL VENCEREMOS", ["V", "VENCEREMOS"]],
  ["PROGRESEMOS", ["PR", "PROGRESEMOS"]],
  ["PARTIDO POLITICO NACIONAL PERU LIBRE", ["PL", "PARTIDO POLÍTICO NACIONAL PERÚ LIBRE"]],
  ["PARTIDO PATRIOTICO DEL PERU", ["PPP", "PARTIDO PATRIÓTICO DEL PERÚ"]],
  ["UN CAMINO DIFERENTE", ["UCD", "UN CAMINO DIFERENTE"]],
  ["LIBERTAD POPULAR", ["LP", "LIBERTAD POPULAR"]],
  ["PARTIDO DEMOCRATA UNIDO PERU", ["PDUP", "PARTIDO DEMÓCRATA UNIDO PERÚ"]],
  ["PARTIDO POLITICO COOPERACION POPULAR", ["PCP", "PARTIDO POLÍTICO COOPERACIÓN POPULAR"]],
  ["PARTIDO MORADO", ["PM", "PARTIDO MORADO"]],
  ["FE EN EL PERU", ["FE", "FE EN EL PERÚ"]],
  ["UNIDAD NACIONAL", ["UN", "UNIDAD NACIONAL"]],
  ["PARTIDO POLITICO INTEGRIDAD DEMOCRATICA", ["PID", "PARTIDO POLÍTICO INTEGRIDAD DEMOCRÁTICA"]],
  ["AVANZA PAIS - PARTIDO DE INTEGRACION SOCIAL", ["AVP", "AVANZA PAÍS - PARTIDO DE INTEGRACIÓN SOCIAL"]],
  ["FUERZA Y LIBERTAD", ["FY", "FUERZA Y LIBERTAD"]],
  ["SALVEMOS AL PERU", ["SAP", "SALVEMOS AL PERÚ"]],
  ["PARTIDO POLITICO PERU ACCION", ["PEA", "PARTIDO POLÍTICO PERÚ ACCIÓN"]],
  ["PARTIDO DEMOCRATICO FEDERAL", ["PDF", "PARTIDO DEMOCRÁTICO FEDERAL"]],
  ["PARTIDO POLITICO PRIN", ["PRIN", "PARTIDO POLÍTICO PRIN"]],
  ["PERU MODERNO", ["PMO", "PERÚ MODERNO"]],
  ["PARTIDO SICREO", ["S", "PARTIDO SÍCREO"]],
  ["PARTIDO SICREO", ["S", "PARTIDO SÍCREO"]]
]);

const LOGO_FALLBACKS = new Map([
  ["PARTIDO SÍCREO", "https://sroppublico.jne.gob.pe/Consulta/Simbolo/GetSimbolo/2935"]
]);

async function main() {
  await mkdir(dataDir, { recursive: true });
  const previous = await loadJson(previousFile, {});
  const candidateBackup = await loadJson(candidateBackupFile, {});
  const enrich = buildEnrichment(previous, candidateBackup);

  const [districtsPayload, seatsPayload, andinoPayload] = await Promise.all([
    fetchJson("/api/pe-electoral-districts"),
    fetchJson("/api/pe-seat-assignment"),
    fetchJson("/api/pe-parlamento-andino")
  ]);

  const districts = (districtsPayload.districts || [])
    .filter((d) => Number.isFinite(Number(d.code)))
    .sort((a, b) => Number(a.code) - Number(b.code));

  const [diputadosRows, senadoRegionalRows, senadoNacionalRow] = await Promise.all([
    fetchDistrictSeries("diputados", districts),
    fetchDistrictSeries("senadores", districts),
    fetchJson("/api/pe-legislative-district?tipo=senadores&distrito=nacional")
  ]);

  const jneEnrichment = await buildJneCandidateEnrichment({ districts, seatsPayload, andinoPayload });
  enrich.jneByDni = jneEnrichment.byDni;
  enrich.jneByKey = jneEnrichment.byKey;

  const cameras = {};
  cameras.diputados = buildDistrictCamera({
    key: "diputados",
    name: "Diputados",
    seats: 130,
    rows: diputadosRows,
    elected: electedByHouse(seatsPayload, "diputados"),
    enrich,
    barrierAllocations: allocationsFromElected(electedByHouse(seatsPayload, "diputados"), "diputados")
  });

  cameras.senadoNacional = buildSingleCamera({
    key: "senadoNacional",
    name: "Senado nacional único",
    seats: 30,
    source: senadoNacionalRow,
    elected: electedByHouse(seatsPayload, "senate").filter((c) => normalize(c.mode) === "NACIONAL"),
    enrich,
    barrierAllocations: allocationsFromElected(electedByHouse(seatsPayload, "senate").filter((c) => normalize(c.mode) === "NACIONAL"), "senadoNacional")
  });

  cameras.senadoRegional = buildDistrictCamera({
    key: "senadoRegional",
    name: "Senado regional",
    seats: 30,
    rows: senadoRegionalRows,
    elected: electedByHouse(seatsPayload, "senate").filter((c) => normalize(c.mode) === "REGIONAL"),
    enrich,
    barrierAllocations: allocationsFromElected(electedByHouse(seatsPayload, "senate").filter((c) => normalize(c.mode) === "REGIONAL"), "senadoRegional")
  });

  cameras.andino = buildAndinoCamera(andinoPayload, enrich);
  cameras.senado = mergeSenateAlias(cameras.senadoNacional, cameras.senadoRegional);
  cameras.senadoTotal = cameras.senado;

  const payload = {
    updatedAt: latestDate(
      seatsPayload.updatedAt,
      andinoPayload.updatedAt,
      cameras.diputados.status?.updated,
      cameras.senado.status?.updated
    ) || new Date().toISOString(),
    status: combineStatusObjects(cameras.diputados.status, cameras.senado.status, cameras.andino.status),
    camaras: cameras,
    sourceMode: "generated-dapper-onpe-fallback-v1",
    sourceNotes: [
      "Respaldo temporal generado desde endpoints públicos de Dapper Global, usados por proyecciones periodísticas y declarados con fuente ONPE.",
      "Las fotos de candidatos se completan, cuando están disponibles, cruzando DNI/lista con Voto Informado del JNE.",
      "Los candidatos faltantes para escenarios sin valla se conservan desde un respaldo histórico del proveedor anterior, sin alterar los votos por partido actualizados por Dapper.",
      "No es endpoint crudo oficial de ONPE; es una normalización externa. Úsese como continuidad operativa mientras AKLLA esté caída o desfasada.",
      "La web mantiene su propia lectura de valla electoral y D'Hondt sobre los votos normalizados por cámara y circunscripción."
    ]
  };

  await writeFile(outFile, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  await writeFile(diagnosticFile, `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    dapperBaseUrl: DAPPER_BASE_URL,
    updatedAt: payload.updatedAt,
    districts: districts.length,
    fotosJne: {
      porDni: jneEnrichment.byDni.size,
      porClave: jneEnrichment.byKey.size
    },
    respaldoCandidatos: {
      disponible: Boolean(candidateBackup?.camaras),
      porCamara: Object.fromEntries(Object.entries(enrich.candidatesByCamera || {}).map(([key, list]) => [key, list.length]))
    },
    cameras: Object.fromEntries(Object.entries(cameras).filter(([k]) => !["senado", "senadoTotal"].includes(k)).map(([k, c]) => [k, {
      parties: c.parties.length,
      circunscripciones: c.circunscripciones.length,
      candidates: c.candidates.length,
      status: c.status
    }]))
  }, null, 2)}\n`, "utf8");

  console.log(`OK: ${path.relative(rootDir, outFile)}`);
  console.log(`Diagnóstico: ${path.relative(rootDir, diagnosticFile)}`);
  console.log(`Fuente: ${DAPPER_BASE_URL}`);
}

async function fetchDistrictSeries(tipo, districts) {
  const rows = [];
  for (const district of districts) {
    try {
      const row = await fetchJson(`/api/pe-legislative-district?tipo=${tipo}&distrito=${district.code}`);
      if (row?.hasData !== false) rows.push(row);
    } catch (error) {
      console.warn(`Aviso: no se pudo leer ${tipo} distrito ${district.code}: ${error.message}`);
    }
  }
  return rows;
}

function buildDistrictCamera({ key, name, seats, rows, elected, enrich, barrierAllocations }) {
  const circunscripciones = rows.map((row) => {
    const circName = districtName(row);
    return {
      name: circName,
      seats: number(row.seats),
      blankNull: blankNullFromScrutiny(row.scrutiny),
      votes: partyVotes(row.parties),
      status: statusFromScrutiny(row.scrutiny)
    };
  }).filter((c) => c.name && c.votes.length);

  const parties = buildParties([...circunscripciones.flatMap((c) => c.votes), ...candidatePartyVotes(elected)], enrich);
  const candidates = mergeCandidateLists(
    mapElectedCandidates(elected, key, enrich),
    backupCandidatesForCamera(enrich, key, circunscripciones.map((c) => c.name))
  );
  const nationalVotes = aggregateVotes(circunscripciones);
  const status = combineStatusObjects(...circunscripciones.map((c) => c.status));

  return {
    name,
    seats,
    barrier: 0.05,
    parties,
    circunscripciones,
    nationalVotes,
    candidates,
    blankNull: sum(circunscripciones.map((c) => c.blankNull)),
    status,
    allocations: {
      noBarrier: [],
      barrier: barrierAllocations
    }
  };
}

function buildSingleCamera({ key, name, seats, source, elected, enrich, barrierAllocations }) {
  const circ = {
    name: "NACIONAL",
    seats,
    blankNull: blankNullFromScrutiny(source.scrutiny),
    votes: partyVotes(source.parties),
    status: statusFromScrutiny(source.scrutiny)
  };

  return {
    name,
    seats,
    barrier: 0.05,
    parties: buildParties([...circ.votes, ...candidatePartyVotes(elected)], enrich),
    circunscripciones: [circ],
    nationalVotes: circ.votes,
    candidates: mergeCandidateLists(
      mapElectedCandidates(elected, key, enrich),
      backupCandidatesForCamera(enrich, key, [circ.name])
    ),
    blankNull: circ.blankNull,
    status: circ.status,
    allocations: {
      noBarrier: [],
      barrier: barrierAllocations
    }
  };
}

function buildAndinoCamera(source, enrich) {
  const votes = (source.parties || []).map((p) => {
    const party = canonicalParty(p.partyName);
    return { party: party.name, votes: number(p.totalVotes) };
  }).filter((v) => v.party && v.votes > 0);

  const candidates = [];
  for (const partyRow of source.parties || []) {
    const party = canonicalParty(partyRow.partyName);
    for (const candidate of partyRow.candidates || []) {
      candidates.push(mapCandidate({
        ...candidate,
        partyName: party.name,
        partyShort: party.short,
        districtName: "NACIONAL"
      }, "andino", enrich));
    }
  }

  const status = statusFromScrutiny(source.scrutiny);
  const circ = {
    name: "NACIONAL",
    seats: number(source.totalSeats) || 5,
    blankNull: blankNullFromScrutiny(source.scrutiny),
    votes,
    status
  };

  const mergedCandidates = mergeCandidateLists(candidates, backupCandidatesForCamera(enrich, "andino", [circ.name]));

  return {
    name: "Parlamento Andino",
    seats: number(source.totalSeats) || 5,
    barrier: 0.05,
    parties: buildParties([...votes, ...candidatePartyVotes(candidates)], enrich),
    circunscripciones: [circ],
    nationalVotes: votes,
    candidates: mergedCandidates,
    blankNull: circ.blankNull,
    status,
    allocations: {
      noBarrier: [],
      barrier: []
    }
  };
}

function mapElectedCandidates(elected, key, enrich) {
  return (elected || []).map((candidate) => mapCandidate(candidate, key, enrich));
}

function mapCandidate(candidate, key, enrich) {
  const party = canonicalParty(candidate.partyName || candidate.party || candidate.partido);
  const name = properName(candidate.candidateName || candidate.name || candidate.candidato);
  const circunscripcion = key === "senadoNacional" || key === "andino"
    ? "NACIONAL"
    : districtName(candidate);
  const old = enrich.candidates.get(candidateKey({ name, party: party.name, circunscripcion })) || {};
  const dni = cleanDocument(candidate.candidateDni ?? candidate.txDocId ?? candidate.dni ?? candidate.numeroDocumento ?? old.dni);
  const jne = (dni && enrich.jneByDni?.get(dni))
    || enrich.jneByKey?.get(candidateKey({ name, party: party.name, circunscripcion }))
    || {};

  return {
    name,
    party: party.name,
    partyShort: party.short,
    circunscripcion,
    dni: dni || jne.dni || old.dni || "",
    votosPref: number(candidate.candidateVotes ?? candidate.preferentialVotes ?? candidate.votes ?? candidate.votosPref),
    posicion: positiveOrNull(candidate.listNumber ?? candidate.position ?? candidate.posicion),
    edad: old.edad || null,
    imageUrl: old.imageUrl || jne.imageUrl || "",
    idHojaVida: positiveOrNull(candidate.idHojaVida ?? candidate.idhojavida ?? jne.idHojaVida ?? old.idHojaVida),
    tipoCandidatura: key === "senadoNacional" ? "Senado nacional" : key === "senadoRegional" ? "Senado regional" : key === "andino" ? "Parlamento Andino" : "Diputados",
    numEscanioPartido: positiveOrNull(candidate.seatNumber ?? candidate.numEscanioPartido),
    senateBlock: key === "senadoNacional" ? "Nacional" : key === "senadoRegional" ? "Regional" : undefined
  };
}

function allocationsFromElected(elected, key) {
  const grouped = new Map();
  for (const candidate of elected || []) {
    const party = canonicalParty(candidate.partyName || candidate.party || candidate.partido).name;
    const circ = key === "senadoNacional" ? "NACIONAL" : districtName(candidate);
    const id = `${circ}||${party}`;
    grouped.set(id, (grouped.get(id) || 0) + 1);
  }
  return [...grouped.entries()].map(([id, seats]) => {
    const [circunscripcion, party] = id.split("||");
    return { circunscripcion, party, seats };
  });
}

function electedByHouse(payload, house) {
  const block = house === "diputados" ? payload?.deputies : payload?.senate;
  return Array.isArray(block?.elected) ? block.elected : [];
}

function partyVotes(parties) {
  return (parties || []).map((p) => {
    const party = canonicalParty(p.partido || p.partyName || p.name);
    return { party: party.name, votes: number(p.votos ?? p.totalVotes ?? p.votes) };
  }).filter((v) => v.party && v.votes > 0);
}

function candidatePartyVotes(candidates) {
  return (candidates || []).map((c) => {
    const party = canonicalParty(c.partyName || c.party || c.partido);
    return { party: party.name, votes: 0, color: c.color };
  });
}

async function buildJneCandidateEnrichment({ districts, seatsPayload, andinoPayload }) {
  const byDni = new Map();
  const byKey = new Map();
  const targets = new Map();
  const addTarget = (key, idTipoEleccion, circunscripcion) => {
    const ubigeo = JNE_UBIGEO_BY_DISTRICT.get(circunscripcion) ?? JNE_UBIGEO_BY_DISTRICT.get(clean(circunscripcion)) ?? "";
    targets.set(key, { idTipoEleccion, strUbiDepartamento: ubigeo, circunscripcion });
  };

  for (const candidate of electedByHouse(seatsPayload, "diputados")) {
    const circunscripcion = districtName(candidate);
    addTarget(`diputados:${circunscripcion}`, JNE_ELECTION.diputados, circunscripcion);
  }
  if (electedByHouse(seatsPayload, "senate").some((c) => normalize(c.mode) === "NACIONAL")) {
    addTarget("senado-nacional", JNE_ELECTION.senadoNacional, "NACIONAL");
  }
  for (const candidate of electedByHouse(seatsPayload, "senate").filter((c) => normalize(c.mode) === "REGIONAL")) {
    const circunscripcion = districtName(candidate);
    addTarget(`senado-regional:${circunscripcion}`, JNE_ELECTION.senadoRegional, circunscripcion);
  }
  if ((andinoPayload?.parties || []).some((party) => (party.candidates || []).length)) {
    addTarget("andino", JNE_ELECTION.andino, "NACIONAL");
  }

  let token = "";
  try {
    token = await fetchJneToken();
  } catch (error) {
    console.warn(`Aviso: no se pudo obtener token JNE para fotos: ${error.message}`);
    return { byDni, byKey };
  }

  for (const target of targets.values()) {
    try {
      const rows = await fetchJneCandidates(target, token);
      for (const row of rows || []) addJneCandidate(row, target.circunscripcion, byDni, byKey);
    } catch (error) {
      console.warn(`Aviso: no se pudieron leer fotos JNE ${target.circunscripcion}: ${error.message}`);
    }
  }

  return { byDni, byKey };
}

function addJneCandidate(row, circunscripcion, byDni, byKey) {
  const name = properName(`${row?.txNom || ""} ${row?.txApePat || ""} ${row?.txApeMat || ""}`);
  const party = canonicalParty(row?.txOrgPol || row?.organizacionPolitica);
  const dni = cleanDocument(row?.txDocId || row?.numeroDocumento);
  const imageUrl = row?.txNombre ? `${JNE_IMAGE_BASE_URL}/${String(row.txNombre).replace(/^\/+/, "")}` : "";
  if (!name || !party.name) return;
  const item = {
    name,
    party: party.name,
    circunscripcion,
    dni,
    imageUrl,
    idHojaVida: positiveOrNull(row?.idHojaVida)
  };
  if (dni) byDni.set(dni, item);
  byKey.set(candidateKey(item), item);
}

async function fetchJneToken() {
  const response = await fetch(`${JNE_SERVICE_BASE_URL}/api/authentication/token`, {
    headers: {
      "accept": "application/json,text/plain,*/*",
      "user-agent": "EVAbogadosParlamentoUpdater/1.0"
    }
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} al solicitar token JNE`);
  const json = await response.json();
  if (!json?.token) throw new Error("token JNE vacío");
  return json.token;
}

async function fetchJneCandidates({ idTipoEleccion, strUbiDepartamento }, token) {
  const response = await fetch(`${JNE_SERVICE_BASE_URL}/api/candidatos/listarcandidatos`, {
    method: "POST",
    headers: {
      "accept": "application/json,text/plain,*/*",
      "content-type": "application/json",
      "user-agent": "EVAbogadosParlamentoUpdater/1.0",
      "X-Session-Token": token
    },
    body: JSON.stringify({
      idProcesoElectoral: JNE_PROCESS_ID,
      strUbiDepartamento,
      idTipoEleccion
    })
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} al consultar candidatos JNE`);
  return response.json();
}

function buildParties(rows, enrich) {
  const map = new Map();
  for (const row of rows || []) {
    const party = canonicalParty(row.party || row.partyName || row.partido);
    if (!party.name) continue;
    const old = enrich.parties.get(normalize(party.name)) || {};
    const logo = LOGO_FALLBACKS.get(party.name) || old.logo || `/logos/${slug(party.short)}.png`;
    if (!map.has(party.name)) {
      map.set(party.name, {
        name: party.name,
        short: party.short,
        color: row.color || old.color || hashColor(party.name),
        logo
      });
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "es"));
}

function aggregateVotes(circs) {
  const totals = new Map();
  for (const circ of circs || []) {
    for (const vote of circ.votes || []) {
      totals.set(vote.party, (totals.get(vote.party) || 0) + number(vote.votes));
    }
  }
  return [...totals.entries()]
    .map(([party, votes]) => ({ party, votes }))
    .sort((a, b) => b.votes - a.votes);
}

function mergeSenateAlias(nacional, regional) {
  const parties = buildParties([
    ...(nacional.parties || []).map((p) => ({ party: p.name, color: p.color })),
    ...(regional.parties || []).map((p) => ({ party: p.name, color: p.color }))
  ], { parties: new Map([...indexByParty(nacional.parties), ...indexByParty(regional.parties)]), candidates: new Map() });

  const circunscripciones = [
    ...(nacional.circunscripciones || []).map((c) => ({ ...c, name: c.name === "NACIONAL" ? "SENADO NACIONAL" : c.name, group: "Nacional" })),
    ...(regional.circunscripciones || []).map((c) => ({ ...c, group: "Regional" }))
  ];
  const candidates = [
    ...(nacional.candidates || []).map((c) => ({ ...c, senateBlock: "Nacional" })),
    ...(regional.candidates || []).map((c) => ({ ...c, senateBlock: "Regional" }))
  ];
  return {
    name: "Senadores",
    seats: 60,
    barrier: 0.05,
    parties,
    circunscripciones,
    nationalVotes: aggregateVotes(circunscripciones),
    candidates,
    blankNull: sum(circunscripciones.map((c) => c.blankNull)),
    status: combineStatusObjects(nacional.status, regional.status),
    allocations: {
      noBarrier: [],
      barrier: [
        ...((nacional.allocations?.barrier || []).map((a) => ({ ...a, circunscripcion: a.circunscripcion === "NACIONAL" ? "SENADO NACIONAL" : a.circunscripcion }))),
        ...(regional.allocations?.barrier || [])
      ]
    }
  };
}

function buildEnrichment(previous, candidateBackup = {}) {
  const parties = new Map();
  const candidates = new Map();
  const candidatesByCamera = {};

  for (const [cameraKey, camera] of Object.entries(previous?.camaras || {})) {
    for (const party of camera?.parties || []) {
      if (!party?.name) continue;
      const canonical = canonicalParty(party.name);
      if (!parties.has(normalize(canonical.name)) || betterLogo(party.logo, parties.get(normalize(canonical.name))?.logo)) {
        parties.set(normalize(canonical.name), { ...party, name: canonical.name, short: canonical.short });
      }
    }
    for (const candidate of camera?.candidates || []) {
      if (!candidate?.name) continue;
      const normalized = normalizeCandidateRecord(candidate);
      candidates.set(candidateKey(normalized), mergeCandidateRecords(candidates.get(candidateKey(normalized)), normalized));
      addCandidateToCamera(candidatesByCamera, cameraKey, normalized);
    }
  }

  for (const [cameraKey, camera] of Object.entries(candidateBackup?.camaras || {})) {
    for (const candidate of camera?.candidates || []) {
      if (!candidate?.name) continue;
      const normalized = { ...normalizeCandidateRecord(candidate), sourceBackup: true };
      candidates.set(candidateKey(normalized), mergeCandidateRecords(candidates.get(candidateKey(normalized)), normalized));
      addCandidateToCamera(candidatesByCamera, cameraKey, normalized);
    }
  }

  return { parties, candidates, candidatesByCamera };
}

function normalizeCandidateRecord(candidate) {
  const party = canonicalParty(candidate.partyName || candidate.party || candidate.partido);
  return {
    ...candidate,
    name: properName(candidate.name || candidate.candidateName || candidate.candidato),
    party: party.name,
    partyShort: candidate.partyShort || party.short,
    circunscripcion: districtName(candidate),
    votosPref: number(candidate.votosPref ?? candidate.candidateVotes ?? candidate.preferentialVotes ?? candidate.votes),
    posicion: positiveOrNull(candidate.posicion ?? candidate.listNumber ?? candidate.position),
    edad: candidate.edad || null,
    imageUrl: candidate.imageUrl || candidate.fotoUrl || candidate.photoUrl || "",
    dni: cleanDocument(candidate.dni ?? candidate.candidateDni ?? candidate.txDocId ?? candidate.numeroDocumento),
    idHojaVida: positiveOrNull(candidate.idHojaVida ?? candidate.idhojavida)
  };
}

function mergeCandidateRecords(existing, incoming) {
  if (!existing) return incoming;
  const authoritative = !incoming.sourceBackup || existing.sourceBackup ? incoming : existing;
  const supplemental = authoritative === incoming ? existing : incoming;
  return {
    ...supplemental,
    ...authoritative,
    votosPref: number(authoritative.votosPref) || number(supplemental.votosPref),
    posicion: authoritative.posicion || supplemental.posicion || null,
    edad: authoritative.edad || supplemental.edad || null,
    imageUrl: authoritative.imageUrl || supplemental.imageUrl || "",
    dni: authoritative.dni || supplemental.dni || "",
    idHojaVida: authoritative.idHojaVida || supplemental.idHojaVida || null,
    sourceBackup: Boolean(authoritative.sourceBackup && supplemental.sourceBackup)
  };
}

function addCandidateToCamera(candidatesByCamera, cameraKey, candidate) {
  if (cameraKey === "senado" || cameraKey === "senadoTotal") return;
  const key = canonicalCameraKey(cameraKey);
  candidatesByCamera[key] ||= [];
  candidatesByCamera[key] = mergeCandidateLists(candidatesByCamera[key], [candidate]);
}

function canonicalCameraKey(cameraKey) {
  if (cameraKey === "senado") return "senadoTotal";
  return cameraKey;
}

function backupCandidatesForCamera(enrich, cameraKey, circNames = []) {
  const allowedCircs = new Set(circNames.map(normalize));
  return (enrich.candidatesByCamera?.[canonicalCameraKey(cameraKey)] || [])
    .filter((candidate) => !allowedCircs.size || allowedCircs.has(normalize(candidate.circunscripcion)));
}

function mergeCandidateLists(primary = [], secondary = []) {
  const map = new Map();
  const aliases = new Map();
  for (const candidate of [...secondary, ...primary]) {
    if (!candidate?.name) continue;
    const normalized = normalizeCandidateRecord(candidate);
    const keys = candidateIdentityKeys(normalized);
    const targetKey = keys.map((key) => aliases.get(key)).find(Boolean) || keys[0] || candidateKey(normalized);
    const merged = mergeCandidateRecords(map.get(targetKey), normalized);
    map.set(targetKey, merged);
    for (const key of candidateIdentityKeys(merged)) aliases.set(key, targetKey);
    for (const key of keys) aliases.set(key, targetKey);
  }
  return [...map.values()].sort((a, b) =>
    normalize(a.circunscripcion).localeCompare(normalize(b.circunscripcion), "es") ||
    normalize(a.party).localeCompare(normalize(b.party), "es") ||
    number(b.votosPref) - number(a.votosPref)
  );
}

function candidateIdentityKeys(candidate) {
  const party = normalize(candidate.party);
  const circ = normalize(candidate.circunscripcion);
  const position = number(candidate.posicion);
  const keys = [];
  if (candidate.dni) keys.push(`dni|${cleanDocument(candidate.dni)}`);
  if (candidate.idHojaVida) keys.push(`hv|${number(candidate.idHojaVida)}`);
  if (party && circ && position) keys.push(`slot|${party}|${circ}|${position}`);
  if (candidate.imageUrl && party && circ) keys.push(`img|${normalize(candidate.imageUrl)}|${party}|${circ}`);
  keys.push(`name|${candidateKey(candidate)}`);
  return keys.filter(Boolean);
}

function indexByParty(parties) {
  return (parties || []).map((p) => [normalize(canonicalParty(p.name).name), p]);
}

function betterLogo(next, current) {
  const score = (value) => {
    const text = String(value || "");
    if (text.includes("sroppublico.jne.gob.pe")) return 3;
    if (text.startsWith("/logos/")) return 2;
    if (text) return 1;
    return 0;
  };
  return score(next) >= score(current);
}

function districtName(row) {
  const code = Number(row?.districtCode ?? row?.distrito ?? row?.code);
  if (DISTRICT_NAME.has(code)) return DISTRICT_NAME.get(code);
  const raw = row?.districtName || row?.distritoName || row?.circunscripcion || row?.district || row?.name || "NACIONAL";
  const norm = normalize(raw);
  if (norm.includes("RESIDENTES") || norm.includes("EXTRANJERO")) return "RESIDENTES EN EL EXTRANJERO";
  if (norm === "LA LIBERTAD" || norm === "LA LIBERTAD") return "LA LIBERTAD";
  if (norm === "LIMA METROPOLITANA") return "LIMA METROPOLITANA";
  if (norm === "LIMA PROVINCIAS") return "LIMA PROVINCIAS";
  for (const name of DISTRICT_NAME.values()) if (normalize(name) === norm) return name;
  return clean(raw);
}

function canonicalParty(value) {
  const raw = clean(value || "");
  const norm = normalize(raw).replace(/[–—]/g, "-");
  const direct = PARTY_CANONICAL.get(norm);
  if (direct) return { short: direct[0], name: direct[1] };
  for (const [key, item] of PARTY_CANONICAL.entries()) {
    if (norm.includes(key) || key.includes(norm)) return { short: item[0], name: item[1] };
  }
  return { short: initials(raw), name: raw };
}

function statusFromScrutiny(scrutiny) {
  if (!scrutiny) return { percent: null, processed: null, total: null, jee: null, pending: null, blankNull: 0 };
  const processed = number(scrutiny.countedActas);
  const total = number(scrutiny.totalActas);
  const pending = Math.max(0, total - processed);
  return {
    percent: number(scrutiny.percentage),
    processed,
    total,
    jee: 0,
    pending,
    blankNull: blankNullFromScrutiny(scrutiny),
    updated: scrutiny.updatedAt || null
  };
}

function combineStatusObjects(...items) {
  const rows = items.filter(Boolean);
  if (!rows.length) return { percent: null, processed: null, total: null, jee: null, pending: null, blankNull: 0 };
  const processed = sum(rows.map((r) => r.processed));
  const total = sum(rows.map((r) => r.total));
  const jee = sum(rows.map((r) => r.jee));
  const pending = sum(rows.map((r) => r.pending));
  return {
    percent: total ? Number(((processed / total) * 100).toFixed(3)) : null,
    processed,
    total,
    jee,
    pending,
    blankNull: sum(rows.map((r) => r.blankNull)),
    updated: latestDate(...rows.map((r) => r.updated))
  };
}

function blankNullFromScrutiny(scrutiny) {
  return Math.max(0, number(scrutiny?.totalVotesEmitted) - number(scrutiny?.totalVotesValid));
}

async function fetchJson(pathname) {
  const url = pathname.startsWith("http") ? pathname : `${DAPPER_BASE_URL}${pathname}`;
  const response = await fetch(url, {
    headers: {
      "accept": "application/json,text/plain,*/*",
      "user-agent": "EVAbogadosParlamentoUpdater/1.0"
    }
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} al consultar ${url}`);
  return response.json();
}

async function loadJson(file, fallback) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}

function candidateKey(candidate) {
  return [normalize(candidate.name), normalize(candidate.party), normalize(candidate.circunscripcion)].join("|");
}

function properName(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleUpperCase("es-PE");
}

function latestDate(...values) {
  const dates = values
    .map((value) => value instanceof Date ? value : new Date(value))
    .filter((date) => Number.isFinite(date.getTime()))
    .sort((a, b) => b.getTime() - a.getTime());
  return dates[0]?.toISOString() || null;
}

function hashColor(value) {
  const colors = ["#f97316", "#1d4ed8", "#059669", "#dc2626", "#0ea5e9", "#16a34a", "#7c3aed", "#b91c1c"];
  let hash = 0;
  for (const ch of String(value || "")) hash = ((hash << 5) - hash) + ch.charCodeAt(0);
  return colors[Math.abs(hash) % colors.length];
}

function initials(value) {
  return normalize(value).split(/\s+/).filter(Boolean).slice(0, 3).map((p) => p[0]).join("") || "OP";
}

function slug(value) {
  return normalize(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function trimSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim().toUpperCase();
}

function cleanDocument(value) {
  return String(value || "").replace(/\D+/g, "").trim();
}

function number(value) {
  const n = Number(String(value ?? 0).replace(/,/g, "").replace("%", "").trim());
  return Number.isFinite(n) ? n : 0;
}

function positiveOrNull(value) {
  const n = number(value);
  return n > 0 ? n : null;
}

function sum(values) {
  return values.reduce((total, value) => total + number(value), 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
