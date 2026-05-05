const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

export async function onRequestGet({ env, request }) {
  try {
    const candidates = [];
    if (env.ONPE_PARLAMENTO_JSON_URL) candidates.push(env.ONPE_PARLAMENTO_JSON_URL);
    candidates.push(new URL("/data/parlamento-2026.json", request.url).toString());

    let lastError = null;
    for (const sourceUrl of candidates) {
      try {
        const upstream = await fetch(sourceUrl, {
          headers: { "User-Agent": "EVA-Abogados-Parlamento/1.0" },
          cf: { cacheTtl: 120, cacheEverything: true }
        });
        if (!upstream.ok) throw new Error(`Fuente electoral no disponible: ${upstream.status}`);
        const data = await upstream.json();
        return json({ ...data, sourceMode: data.sourceMode || "upstream", proxiedAt: new Date().toISOString() });
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error("No se encontró fuente electoral normalizada.");
  } catch (error) {
    return json({ error: error.message, sourceMode: "error", fallback: sampleData() }, 502);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}

function sampleData() {
  const parties = [
    { name: "FUERZA POPULAR", short: "FP", color: "#f97316" },
    { name: "RENOVACIÓN POPULAR", short: "RP", color: "#1d4ed8" },
    { name: "PARTIDO DEL BUEN GOBIERNO", short: "PBG", color: "#059669" },
    { name: "JUNTOS POR EL PERÚ", short: "JP", color: "#dc2626" },
    { name: "ALIANZA PARA EL PROGRESO", short: "APP", color: "#0ea5e9" },
    { name: "ACCIÓN POPULAR", short: "AP", color: "#16a34a" },
    { name: "PODEMOS PERÚ", short: "PP", color: "#7c3aed" },
    { name: "AHORA NACIÓN", short: "AN", color: "#9333ea" },
    { name: "PARTIDO CÍVICO OBRAS", short: "OBRAS", color: "#64748b" },
    { name: "PERÚ LIBRE", short: "PL", color: "#b91c1c" }
  ];
  const pv = Object.fromEntries(parties.map((p, i) => [p.name, [1680000, 1510000, 1370000, 1280000, 980000, 820000, 610000, 490000, 430000, 390000][i]]));
  function votes(seed, factor = 1) {
    return parties.map((p, i) => ({ party: p.name, votes: Math.max(1000, Math.round((pv[p.name] / 18) * factor * (0.55 + ((seed + i * 7) % 19) / 20))) }));
  }
  const circDip = [
    ["LIMA METROPOLITANA", 40, 4.8], ["PIURA", 8, 1.1], ["LA LIBERTAD", 7, 1.0], ["AREQUIPA", 7, 0.92], ["CAJAMARCA", 6, 0.85], ["JUNÍN", 5, 0.72], ["CUSCO", 5, 0.68], ["ÁNCASH", 5, 0.66], ["LAMBAYEQUE", 5, 0.62], ["PUNO", 5, 0.61], ["CALLAO", 4, 0.55], ["ICA", 4, 0.52], ["LORETO", 4, 0.49], ["SAN MARTÍN", 4, 0.46], ["HUÁNUCO", 3, 0.42], ["AYACUCHO", 3, 0.39], ["UCAYALI", 3, 0.34], ["APURÍMAC", 2, 0.26], ["TACNA", 2, 0.24], ["TUMBES", 2, 0.18], ["PASCO", 2, 0.16], ["MOQUEGUA", 1, 0.12]
  ];
  const circSen = [["NACIONAL", 30, 6.2], ["NORTE", 8, 1.2], ["CENTRO", 8, 1.15], ["SUR", 8, 1.08], ["ORIENTE", 4, 0.58], ["RESIDENTES EN EL EXTRANJERO", 2, 0.34]];
  const circAnd = [["NACIONAL", 5, 1.0]];
  const candidates = ["CARLOS DOMÍNGUEZ HERRERA", "CECILIA CHACÓN DE VETTORI", "DIETHELL COLUMBUS MURATA", "ROSANGELLA BARBARÁN REYES", "LUIS ALEGRÍA GARCÍA", "KARINA BETETA RUBIN", "MARCO PACHECO QUISPE", "ANA PATIÑO URCO", "ALEXANDER SALAS RIVERA", "JESSICA NAVAS SÁNCHEZ", "EDUARDO CASTILLO RIVAS", "GILMER TRUJILLO ZEGARRA"];
  function buildCam(name, seatRows, baseFactor) {
    const circunscripciones = seatRows.map((r, idx) => ({ name: r[0], seats: r[1], votes: votes(idx + 3, r[2] * baseFactor) }));
    const nationalVotes = parties.map(p => ({ party: p.name, votes: circunscripciones.reduce((s, c) => s + (c.votes.find(v => v.party === p.name)?.votes || 0), 0) }));
    const cand = [];
    circunscripciones.forEach((c, ci) => parties.slice(0, 7).forEach((p, pi) => cand.push({ name: candidates[(ci + pi) % candidates.length], party: p.name, partyShort: p.short, circunscripcion: c.name, votosPref: Math.round((c.votes.find(v=>v.party===p.name)?.votes || 0) * (0.08 + ((ci + pi) % 8) / 100)), posicion: (pi % 6) + 1 })));
    return { name, seats: seatRows.reduce((s,r)=>s+r[1],0), barrier: 0.05, parties, circunscripciones, nationalVotes, candidates: cand, blankNull: Math.round(nationalVotes.reduce((s,v)=>s+v.votes,0)*0.22) };
  }
  return {
    sourceMode: "sample",
    updatedAt: new Date().toISOString(),
    status: { percent: 83.40, processed: 77366, total: 92766 },
    camaras: {
      diputados: buildCam("Diputados", circDip, 1.0),
      senado: buildCam("Senado", circSen, 0.75),
      andino: buildCam("Parlamento Andino", circAnd, 0.22)
    }
  };
}
