
    const fmt = new Intl.NumberFormat('es-PE');
    let RAW = null;
    let currentView = 'comparison';
    const $ = (id) => document.getElementById(id);
    const clean = (v) => String(v ?? '').trim();
    const numeric = (v) => Number(v || 0);
    const normalize = (v) => clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
    const percentText = (n, whole=false) => {
      const value = Number(n || 0);
      const normalized = whole || value > 1 ? value : value * 100;
      return `${normalized.toFixed(2)} %`;
    };
    const cameraMeta = {
      diputados:{label:'Diputados', seats:130, sub:'Distrito múltiple'},
      senadoNacional:{label:'Senado nacional', seats:30, sub:'Distrito único', hidden:true},
      senadoRegional:{label:'Senado regional', seats:30, sub:'Ámbito regional', hidden:true},
      senadoTotal:{label:'Senadores', seats:60, sub:'Sin filtro, nacional y regional'},
      andino:{label:'Parlamento Andino', seats:5, sub:'5 representantes'}
    };
    const diputadosSeatMap = {
      'AMAZONAS':2,'ÁNCASH':5,'APURÍMAC':2,'AREQUIPA':6,'AYACUCHO':3,'CAJAMARCA':6,
      'CALLAO':4,'CUSCO':5,'HUANCAVELICA':2,'HUÁNUCO':3,'ICA':4,'JUNÍN':5,
      'LA LIBERTAD':7,'LAMBAYEQUE':5,'LIMA METROPOLITANA':32,'LIMA PROVINCIAS':4,
      'RESIDENTES EN EL EXTRANJERO':2,'LORETO':4,'MADRE DE DIOS':2,'MOQUEGUA':2,
      'PASCO':2,'PIURA':7,'PUNO':5,'SAN MARTÍN':4,'TACNA':2,'TUMBES':2,'UCAYALI':3
    };
    const regionalSeatMap = {
      'AMAZONAS':1,'ÁNCASH':1,'APURÍMAC':1,'AREQUIPA':1,'AYACUCHO':1,'CAJAMARCA':1,
      'CALLAO':1,'CUSCO':1,'HUANCAVELICA':1,'HUÁNUCO':1,'ICA':1,'JUNÍN':1,
      'LA LIBERTAD':1,'LAMBAYEQUE':1,'LIMA METROPOLITANA':4,'LIMA PROVINCIAS':1,
      'RESIDENTES EN EL EXTRANJERO':1,'LORETO':1,'MADRE DE DIOS':1,'MOQUEGUA':1,
      'PASCO':1,'PIURA':1,'PUNO':1,'SAN MARTÍN':1,'TACNA':1,'TUMBES':1,'UCAYALI':1
    };

    const QUALIFIED_PARTIES_2026 = new Set([
      'FUERZA POPULAR',
      'RENOVACION POPULAR',
      'RENOVACIÓN POPULAR',
      'AHORA NACION',
      'AHORA NACIÓN',
      'PARTIDO CIVICO OBRAS',
      'PARTIDO CÍVICO OBRAS',
      'PARTIDO DEL BUEN GOBIERNO',
      'JUNTOS POR EL PERU',
      'JUNTOS POR EL PERÚ'
    ].map(normalize));
    const REGIONAL_SCOPE_PREFIX = 'REGIONAL::';
    function isQualifiedParty2026(party){return QUALIFIED_PARTIES_2026.has(normalize(party));}
    function regionalScopeName(value){return String(value||'').startsWith(REGIONAL_SCOPE_PREFIX)?String(value).slice(REGIONAL_SCOPE_PREFIX.length):'';}

    function hashColor(str){let h=0;const s=String(str||'');for(let i=0;i<s.length;i++) h=(h*31+s.charCodeAt(i))>>>0;return `hsl(${h%360} 62% 43%)`;}
    function getCamera(){return $('camara').value;}
    function getCirc(){return $('circ').value;}
    function emptyCamera(key){return {name:cameraMeta[key]?.label || key,barrier:.05,parties:[],circunscripciones:[],nationalVotes:[],candidates:[],blankNull:0};}
    function clone(obj){return JSON.parse(JSON.stringify(obj || {}));}
    function dataFor(key){
      const cams = RAW?.camaras || {};
      if(key === 'senadoNacional') return normalizeCamera(cams.senadoNacional || cams.senado_nacional || cams.senado || emptyCamera(key), 'senadoNacional');
      if(key === 'senadoRegional') return normalizeCamera(cams.senadoRegional || cams.senado_regional || cams.senadoMultiple || cams.senadoDistritoMultiple || emptyCamera(key), 'senadoRegional');
      if(key === 'senadoTotal') return mergeSenateTotal();
      if(key === 'andino') return normalizeCamera(cams.andino || cams.parlamentoAndino || emptyCamera(key), 'andino');
      return normalizeCamera(cams.diputados || emptyCamera(key), 'diputados');
    }
    function officialSeatMapFor(key){
      if(key==='diputados') return diputadosSeatMap;
      if(key==='senadoRegional') return regionalSeatMap;
      if(key==='senadoNacional') return {'NACIONAL':30};
      if(key==='andino') return {'NACIONAL':5};
      return {};
    }
    function canonicalCircName(value,key){
      const norm=normalize(String(value||'').replace(/^REGIONAL · /,'').replace(/^NACIONAL · /,''));
      if(!norm || norm==='PENDIENTE') return key==='senadoNacional'||key==='andino'?'NACIONAL':'PENDIENTE';
      if(norm.includes('EXTRANJERO')) return 'RESIDENTES EN EL EXTRANJERO';
      if(norm==='LIMA') return 'LIMA METROPOLITANA';
      if(key==='senadoNacional'||key==='andino') return 'NACIONAL';
      const official=officialSeatMapFor(key);
      for(const name of Object.keys(official)) if(normalize(name)===norm) return name;
      return clean(value).toUpperCase();
    }
    function normalizeCamera(data, key){
      const out = clone(data); out.name = cameraMeta[key]?.label || out.name || key; out.barrier = Number(out.barrier ?? .05);
      out.parties = Array.isArray(out.parties) ? out.parties : [];
      out.nationalVotes = Array.isArray(out.nationalVotes) ? out.nationalVotes : [];
      out.candidates = Array.isArray(out.candidates) ? out.candidates : [];
      out.blankNull = Number(out.blankNull || 0);
      const official=officialSeatMapFor(key);
      const rawCircs = Array.isArray(out.circunscripciones) ? out.circunscripciones : [];
      const byName=new Map();
      rawCircs.forEach(c=>{
        const name=canonicalCircName(c?.name,key);
        if(!name || name==='PENDIENTE') return;
        const existing=byName.get(name)||{name,seats:official[name]??numeric(c?.seats),votes:[]};
        existing.seats=(official[name] ?? numeric(c?.seats)) || existing.seats;
        const votes=new Map((existing.votes||[]).map(v=>[v.party,numeric(v.votes)]));
        (c.votes||[]).forEach(v=>{ if(v?.party) votes.set(v.party, Math.max(votes.get(v.party)||0,numeric(v.votes))); });
        existing.votes=[...votes.entries()].map(([party,votes])=>({party,votes})).sort((a,b)=>b.votes-a.votes);
        byName.set(name,existing);
      });
      const officialNames=Object.keys(official);
      if(officialNames.length){
        out.circunscripciones=officialNames.map(name=>byName.get(name)||{name,seats:official[name],votes:[]});
      } else {
        out.circunscripciones=[...byName.values()];
      }
      if(!out.circunscripciones.length && out.nationalVotes.length){out.circunscripciones=[{name:'NACIONAL',seats:cameraMeta[key]?.seats||1,votes:out.nationalVotes}];}
      return out;
    }
    function mergeSenateTotal(){
      const nacional = dataFor('senadoNacional');
      const regional = dataFor('senadoRegional');
      const parties = new Map();
      [...(nacional.parties||[]),...(regional.parties||[])].forEach(p=>{if(p?.name&&!parties.has(p.name)) parties.set(p.name,p)});
      const circs = [];
      (nacional.circunscripciones||[]).forEach(c=>circs.push({...c,name:`NACIONAL · ${c.name || 'NACIONAL'}`,group:'Nacional'}));
      (regional.circunscripciones||[]).forEach(c=>circs.push({...c,name:`REGIONAL · ${c.name}`,group:'Regional'}));
      return {name:'Senadores',barrier:.05,parties:[...parties.values()],circunscripciones:circs,nationalVotes:aggregateNationalFromCircs(circs),candidates:[...(nacional.candidates||[]).map(c=>({...c,senateBlock:'Nacional'})),...(regional.candidates||[]).map(c=>({...c,senateBlock:'Regional'}))],allocations:{noBarrier:[...((nacional.allocations?.noBarrier)||[]).map(a=>({...a,circunscripcion:`NACIONAL · ${a.circunscripcion||'NACIONAL'}`,group:'Nacional'})),...((regional.allocations?.noBarrier)||[]).map(a=>({...a,circunscripcion:`REGIONAL · ${a.circunscripcion}`,group:'Regional'}))],barrier:[...((nacional.allocations?.barrier)||[]).map(a=>({...a,circunscripcion:`NACIONAL · ${a.circunscripcion||'NACIONAL'}`,group:'Nacional'})),...((regional.allocations?.barrier)||[]).map(a=>({...a,circunscripcion:`REGIONAL · ${a.circunscripcion}`,group:'Regional'}))]},blankNull:numeric(nacional.blankNull)+numeric(regional.blankNull),_parts:{nacional,regional}};
    }

    function seatsByDhondt(votes, seats){const totalSeats=Math.max(0,Number(seats||0));if(!totalSeats||!votes.length)return new Map();const rows=[];votes.forEach(v=>{const value=Number(v.votes||0);if(value<=0)return;for(let d=1;d<=totalSeats;d++)rows.push({party:v.party,votes:value,q:value/d});});rows.sort((a,b)=>b.q-a.q||b.votes-a.votes||a.party.localeCompare(b.party,'es'));const out=new Map();rows.slice(0,totalSeats).forEach(r=>out.set(r.party,(out.get(r.party)||0)+1));return out;}
    function aggregateVotes(circs){const out=new Map();(circs||[]).forEach(c=>(c.votes||[]).forEach(v=>out.set(v.party,(out.get(v.party)||0)+numeric(v.votes))));return [...out.entries()].map(([party,votes])=>({party,votes})).sort((a,b)=>b.votes-a.votes);}
    function allocateAcrossCircunscripciones(circs, eligible=null){const out=new Map();(circs||[]).forEach(c=>{let votes=(c.votes||[]).slice();if(eligible)votes=votes.filter(v=>eligible.has(v.party));const alloc=seatsByDhondt(votes,numeric(c.seats));alloc.forEach((seats,party)=>out.set(party,(out.get(party)||0)+seats));});return out;}
    function rawSeatsByDistrict(circs){return allocateAcrossCircunscripciones(circs,null);}

    function stripScopeName(value){return clean(String(value||'').replace(/^REGIONAL · /,'').replace(/^NACIONAL · /,''));}
    function allocationMatchesCirc(allocation, circ){const a=normalize(stripScopeName(allocation.circunscripcion||allocation.scope||allocation.name));const c=normalize(stripScopeName(circ.name||''));return a&&c&&(a===c||a.includes(c)||c.includes(a));}
    function precomputedAllocation(data, scenario, circs, expectedSeats){
      const rows=(data.allocations&&Array.isArray(data.allocations[scenario]))?data.allocations[scenario]:[];
      if(!rows.length||!circs.length)return null;
      const out=new Map();
      for(const row of rows){
        const party=row.party||row.organizacion||row.organizacionPolitica;
        const seats=numeric(row.seats??row.curules??row.escanos??row['escaños']);
        if(!party||!seats)continue;
        if(!circs.some(c=>allocationMatchesCirc(row,c)))continue;
        out.set(party,(out.get(party)||0)+seats);
      }
      const total=[...out.values()].reduce((s,n)=>s+numeric(n),0);
      if(expectedSeats && total!==expectedSeats) return null;
      return out.size?out:null;
    }
    function qualifyingParties(data, cameraKey){const allCircs=data.circunscripciones||[];const nationalVotes=(data.nationalVotes&&data.nationalVotes.length)?data.nationalVotes:aggregateVotes(allCircs);const nationalTotal=nationalVotes.reduce((s,v)=>s+numeric(v.votes),0)||1;const barrier=Number(data.barrier??.05);const rawSeats=rawSeatsByDistrict(allCircs);let minSeats=0;if(cameraKey==='diputados')minSeats=7;else if(cameraKey==='senadoTotal'||cameraKey==='senadoNacional'||cameraKey==='senadoRegional')minSeats=3;const eligible=new Set();nationalVotes.forEach(v=>{const share=nationalTotal?numeric(v.votes)/nationalTotal:0;const seats=rawSeats.get(v.party)||0;if(minSeats){if(share>=barrier && seats>=minSeats)eligible.add(v.party);}else if(share>=barrier)eligible.add(v.party);});if(cameraKey==='diputados'||cameraKey==='senadoTotal'||cameraKey==='senadoNacional'||cameraKey==='senadoRegional'){return new Set([...eligible].filter(isQualifiedParty2026));}return eligible;}
    function displayCameraName(){const r=regionalScopeName(getCirc());if(getCamera()==='senadoTotal'&&getCirc()==='NACIONAL')return 'Senadores · Nacional';if(getCamera()==='senadoTotal'&&getCirc()==='REGIONAL')return 'Senadores · Regional';if(getCamera()==='senadoTotal'&&r)return `Senadores · ${r}`;return dataFor(getCamera()).name;}
    function getPartyMap(){const map=new Map();if(!RAW?.camaras)return map;Object.keys(cameraMeta).forEach(k=>{(dataFor(k).parties||[]).forEach(p=>map.set(p.name,p));});return map;}
    function logoSources(meta, party){
      const existing=[meta?.logo,meta?.logoUrl,meta?.urlLogo].filter(Boolean);
      const short=clean(meta?.short||initials(party));
      const code=normalize(short).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
      const name=normalize(party).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
      const local=[];
      for(const slug of [code,name,short]){
        const safe=String(slug||'').replace(/[^A-Za-z0-9_-]+/g,'-').replace(/^-|-$/g,'');
        if(safe) local.push(`/logos/${safe}.png`,`/logos/${safe}.jpg`,`/logos/${safe}.webp`);
      }
      const base='https://congresoeg2026.akllaperu.pe';
      const paths=['logos','logo','img','imagenes','images','assets','assets/logos','assets/img','simbolos'];
      const guessed=[];
      for(const dir of paths){for(const slug of [code,name]){if(slug) guessed.push(`${base}/${dir}/${slug}.png`,`${base}/${dir}/${slug}.jpg`,`${base}/${dir}/${slug}.webp`);}}
      return [...new Set([...existing,...local,...guessed])];
    }
    function logoOnError(img,label){
      try{
        const list=JSON.parse(img.dataset.sources||'[]');
        const idx=Number(img.dataset.idx||0)+1;
        if(idx<list.length){img.dataset.idx=String(idx);img.src=list[idx];return;}
      }catch{}
      img.replaceWith(document.createTextNode(label));
    }

    function aggregateForCurrentSelection(){
      const camera=getCamera();
      const data=dataFor(camera);
      const selectedCirc=getCirc();
      const allCircs=data.circunscripciones||[];
      let circs;
      const selectedRegional=regionalScopeName(selectedCirc);
      if(camera==='senadoTotal' && selectedCirc==='NACIONAL') circs=allCircs.filter(c=>normalize(c.group||c.name).includes('NACIONAL'));
      else if(camera==='senadoTotal' && selectedCirc==='REGIONAL') circs=allCircs.filter(c=>normalize(c.group||c.name).includes('REGIONAL'));
      else if(camera==='senadoTotal' && selectedRegional) circs=allCircs.filter(c=>normalize(c.group||'').includes('REGIONAL') && normalize(c.name).includes(normalize(selectedRegional)));
      else circs=selectedCirc?allCircs.filter(c=>c.name===selectedCirc):allCircs;
      const totalSeats=circs.reduce((s,c)=>s+numeric(c.seats),0);
      const votes=aggregateVotes(circs);
      const valid=votes.reduce((s,v)=>s+v.votes,0);
      const nationalVotes=(data.nationalVotes&&data.nationalVotes.length)?data.nationalVotes:aggregateVotes(allCircs);
      const nationalTotal=nationalVotes.reduce((s,v)=>s+numeric(v.votes),0)||valid||1;
      let seatsNoBarrier=precomputedAllocation(data,'noBarrier',circs,totalSeats)||allocateAcrossCircunscripciones(circs,null);
      const fallbackEligible=qualifyingParties(data,camera);
      let seatsBarrier=precomputedAllocation(data,'barrier',circs,totalSeats)||allocateAcrossCircunscripciones(circs,fallbackEligible);
      const eligible=seatsBarrier.size?new Set([...seatsBarrier.keys()]):fallbackEligible;
      return {data,selectedCirc,circs,totalSeats,votes,valid,nationalTotal,eligible,seatsNoBarrier,seatsBarrier};
    }
    function aggregateNationalFromCircs(circs){const totals=new Map();(circs||[]).forEach(c=>(c.votes||[]).forEach(v=>totals.set(v.party,(totals.get(v.party)||0)+numeric(v.votes))));return [...totals.entries()].map(([party,votes])=>({party,votes})).sort((a,b)=>b.votes-a.votes);}
    function initials(value){return clean(value).split(/\s+/).filter(w=>!['DE','DEL','LA','EL','Y','POR','PARA','LOS','LAS'].includes(w.toUpperCase())).slice(0,3).map(w=>w[0]||'').join('').toUpperCase()||'—';}

    function seatArray(map,total){const arr=[];[...map.entries()].sort((a,b)=>b[1]-a[1]).forEach(([party,n])=>{for(let i=0;i<n;i++)arr.push(party)});while(arr.length<total)arr.push('Sin asignar');return arr.slice(0,total);}
    function candidateImage(c){return c?.imageUrl||c?.fotoUrl||c?.photoUrl||c?.foto||c?.imagen||c?.urlFoto||c?.urlImagen||'';}
    function candidateAge(c){return c?.edad??c?.age??c?.edadActual??c?.anios??c?.años??'';}
    function esc(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));}
    function candidateKey(c){return [c?.name,c?.party,c?.circunscripcion,c?.posicion,c?.votosPref].map(v=>String(v??'')).join('|');}
    function candidateMatchesCirc(c,circ){if(!circ)return true;const cc=clean(c?.circunscripcion||'');const sc=clean(circ||'');return !cc||cc==='NACIONAL'||cc===sc||sc.includes(cc)||cc.includes(sc);}
    function seatDetailsForMap(agg,map,total){const arr=[];const scope=agg?.selectedCirc||'';const allowedCircs=new Set((agg?.circs||[]).map(c=>clean(c.name)));const candidates=(agg?.data?.candidates||[]).filter(c=>candidateAllowedByScope(c,scope)).slice().sort((a,b)=>numeric(b.votosPref)-numeric(a.votosPref));const used=new Set();[...map.entries()].sort((a,b)=>b[1]-a[1]).forEach(([party,n])=>{const list=candidates.filter(c=>clean(c.party)===clean(party)&&(!scope||scope==='REGIONAL'||scope==='NACIONAL'||allowedCircs.has(clean(c.circunscripcion))||candidateMatchesCirc(c,scope)));for(let i=0;i<n;i++){let c=list.find(item=>!used.has(candidateKey(item)))||null;if(c)used.add(candidateKey(c));arr.push({party,candidate:c,seat:i+1,total:n,circ:scope||c?.circunscripcion||'NACIONAL'});}});while(arr.length<total)arr.push({party:'Sin asignar',candidate:null});return arr.slice(0,total);}
    function tooltipHTML(detail,meta,index){const party=detail?.party||'Sin asignar';const c=detail?.candidate;if(party==='Sin asignar'||party==='Pendiente')return `<span class="seat-tooltip"><span class="tip-note">${party==='Pendiente'?'Datos regionales pendientes de normalización.':'Curul pendiente de asignación.'}</span></span>`;const img=candidateImage(c);const age=candidateAge(c);const initialsText=(meta?.short||initials(party)).slice(0,3);if(!c)return `<span class="seat-tooltip"><span class="tip-name">${esc(party)}</span><span class="tip-note">Curul proyectada. La fuente aún no incluye detalle suficiente del candidato.</span></span>`;return `<span class="seat-tooltip"><span class="tip-grid"><span class="tip-photo">${img?`<img src="${esc(img)}" alt="${esc(c.name||'Candidato')}" onerror="this.remove()">`:esc(initialsText)}</span><span><span class="tip-name">${esc(c.name||'Candidato sin nombre')}</span><span class="tip-party">${esc(c.party||party)}</span><span class="tip-row"><b>Edad</b><span>${age?esc(age)+' años':'No informada'}</span></span><span class="tip-row"><b>Votos</b><span>${fmt.format(numeric(c.votosPref))}</span></span><span class="tip-row"><b>Posición</b><span>${c.posicion||'—'}</span></span><span class="tip-row"><b>Ámbito</b><span>${esc(c.circunscripcion||detail.circ||'NACIONAL')}</span></span></span></span></span>`;}
    function renderSeatSquare(detail,partyMap,index,pending=false){const party=typeof detail==='string'?detail:(detail?.party||'Sin asignar');const meta=partyMap.get(party);const color=meta?.color||(party==='Sin asignar'?'#d8e0eb':party==='Pendiente'?'#edf2f7':hashColor(party));const label=party==='Sin asignar'?'—':party==='Pendiente'?'':(meta?.short||initials(party));const logos=logoSources(meta,party);const src=logos[0]||'';const safeSources=esc(JSON.stringify(logos));const content=src?`<img class="seat-logo" src="${esc(src)}" data-sources="${safeSources}" data-idx="0" alt="${esc(party)}" onerror="logoOnError(this,'${esc(label)}')">`:label;const cls=(pending?' pending-seat':(party==='Sin asignar'?' empty-seat':''))+(src?' has-logo':'');return `<span class="seat-square${cls}" style="background:${color}" tabindex="0" aria-label="${esc(party)}">${content}${tooltipHTML(typeof detail==='string'?{party,candidate:null}:detail,meta,index)}</span>`;}
    function renderMosaic(el,map,total,partyMap,type,agg){const details=seatDetailsForMap(agg,map,total);const cls=type==='andino'?'pa':type==='senadoTotal'?'s60':type==='senadoRegional'?'regional':type==='mini'?'mini':type==='large'?'large':type==='diputados'?'dip':'s30';el.innerHTML=`<div class="seat-mosaic ${cls}">${details.map((d,i)=>renderSeatSquare(d,partyMap,i)).join('')}</div>`;}
    function renderHemicycle(el,map,total,partyMap,agg){el.innerHTML='';const details=seatDetailsForMap(agg,map,total);if(!total){el.innerHTML='<div class="empty">Sin curules para mostrar.</div>';return;}const box=document.createElement('div');box.className='hemicycle';el.appendChild(box);const width=620,height=350,cx=width/2,cy=height+18,rowCount=total<=30?3:7,perRow=Math.ceil(total/rowCount),minR=85,maxR=326;let idx=0;for(let r=0;r<rowCount;r++){const rad=rowCount===1?150:minR+(maxR-minR)*(r/(rowCount-1));const remaining=total-idx;const count=Math.min(perRow,remaining);const start=203,end=337;for(let j=0;j<count;j++){const deg=start+(end-start)*(count===1?.5:j/(count-1));const a=deg*Math.PI/180;const detail=details[idx++]||{party:'Sin asignar',candidate:null};const party=detail.party;const meta=partyMap.get(party);const color=meta?.color||(party==='Sin asignar'?'#d8e0eb':hashColor(party));const x=cx+rad*Math.cos(a),y=cy+rad*Math.sin(a);const seat=document.createElement('span');seat.className='seat-dot';seat.tabIndex=0;seat.setAttribute('aria-label',party);seat.style.left=`${x}px`;seat.style.top=`${y}px`;seat.style.background=color;seat.innerHTML=tooltipHTML(detail,meta,idx);box.appendChild(seat);}}}
    function renderTotalSenate(el,map,total,partyMap){
      const cam=dataFor('senadoTotal'), nacional=cam._parts?.nacional||emptyCamera('senadoNacional'), regional=cam._parts?.regional||emptyCamera('senadoRegional');
      const q=qualifyingParties(cam,'senadoTotal');
      const aggNMap=allocateAcrossCircunscripciones(nacional.circunscripciones||[],q);
      const aggRMap=allocateAcrossCircunscripciones(regional.circunscripciones||[],q);
      const hasR=(regional.circunscripciones||[]).some(c=>(c.votes||[]).length);
      const aggN={data:cam,selectedCirc:'NACIONAL',circs:nacional.circunscripciones||[]};
      const aggR={data:cam,selectedCirc:'REGIONAL',circs:regional.circunscripciones||[]};
      el.innerHTML=`<div class="total-senate"><div class="senate-block"><h3>Senado nacional · 30</h3><p>Distrito único nacional.</p><div class="seat-mosaic s30">${seatDetailsForMap(aggN,aggNMap,30).map((d,i)=>renderSeatSquare(d,partyMap,i)).join('')}</div></div><div class="senate-block"><h3>Senado regional · 30</h3><p>${hasR?'Ámbitos regionales agregados.':'Datos regionales pendientes de normalización.'}</p><div class="seat-mosaic regional">${hasR?seatDetailsForMap(aggR,aggRMap,30).map((d,i)=>renderSeatSquare(d,partyMap,i)).join(''):Array.from({length:30}).map(()=>renderSeatSquare({party:'Pendiente',candidate:null},partyMap,0,true)).join('')}</div></div></div>`;
    }
    function allocationForCamera(cam){const key=normalize(cam.name).includes('DIPUTADOS')?'diputados':normalize(cam.name).includes('SENADOR')?'senadoTotal':'';const circs=cam.circunscripciones||[];const pre=precomputedAllocation(cam,'barrier',circs);if(pre)return pre;const eligible=key?qualifyingParties(cam,key):null;return allocateAcrossCircunscripciones(circs,eligible);}
    function renderSeats(el,map,total,partyMap,agg){const cam=getCamera();const selected=getCirc();el.className='';if(cam==='andino'){$('stageSB').className=$('stageCB').className='seat-stage small';renderMosaic(el,map,5,partyMap,'andino',agg);return;}if(cam==='senadoTotal'){if(selected==='NACIONAL'){$('stageSB').className=$('stageCB').className='seat-stage medium';renderMosaic(el,map,30,partyMap,'senadoNacional',agg);return;}if(selected==='REGIONAL'){$('stageSB').className=$('stageCB').className='seat-stage medium';renderMosaic(el,map,30,partyMap,'senadoRegional',agg);return;}if(regionalScopeName(selected)){$('stageSB').className=$('stageCB').className='seat-stage medium';renderMosaic(el,map,total,partyMap,total<=4?'large':'senadoRegional',agg);return;}$('stageSB').className=$('stageCB').className='seat-stage total';renderTotalSenate(el,map,total,partyMap);return;}if(cam==='diputados'){$('stageSB').className=$('stageCB').className='seat-stage medium';renderMosaic(el,map,total,partyMap,total<=4?'large':total<=15?'mini':'diputados',agg);return;}$('stageSB').className=$('stageCB').className='seat-stage';renderHemicycle(el,map,total,partyMap,agg);}
    function renderLegend(el,map,partyMap){const rows=[...map.entries()].sort((a,b)=>b[1]-a[1]);if(!rows.length){el.innerHTML='<div class="empty">Sin asignación proyectada.</div>';return;}el.innerHTML=rows.map(([party,n])=>{const meta=partyMap.get(party)||{short:initials(party),color:hashColor(party)};return `<div class="party"><span class="dot" style="background:${meta.color}"></span><span class="num">${n}</span><span class="name"><span class="short">${meta.short||initials(party)}</span><br>${party}</span></div>`;}).join('');}
    function renderKPIs(agg){const blankNull=numeric(agg.data.blankNull);const useful=[...agg.seatsBarrier.entries()].reduce((sum,[party,seats])=>seats>0?sum+numeric(agg.votes.find(v=>v.party===party)?.votes):sum,0);const lost=Math.max(0,agg.valid-useful);const rows=[['Votos válidos',agg.valid,'Suma de votos válidamente emitidos'],['Nulos y blancos',blankNull,'Dato consignado en la fuente normalizada'],['Votos útiles',useful,'Votos con representación proyectada'],['Sin representación',lost,'Votos no convertidos en curules']];$('kpis').innerHTML=rows.map(([label,value,sub])=>`<article class="card kpi"><div class="label">${agg.data.name} · ${label}</div><div class="value">${fmt.format(value)}</div><div class="sub">${sub}</div></article>`).join('');}
    function renderTable(agg){const rows=agg.votes.map(v=>{const noBarrier=agg.seatsNoBarrier.get(v.party)||0,barrier=agg.seatsBarrier.get(v.party)||0,diff=barrier-noBarrier,pct=agg.valid?v.votes/agg.valid:0;return `<tr><td>${v.party}${agg.eligible.has(v.party)?'':' <span class="muted">· fuera de valla</span>'}</td><td class="num">${fmt.format(v.votes)}</td><td class="num">${percentText(pct)}</td><td class="num">${noBarrier}</td><td class="num">${barrier}</td><td class="num ${diff>=0?'pos':'neg'}">${diff>0?'+':''}${diff}</td></tr>`;}).join('');$('tableBody').innerHTML=rows||'<tr><td colspan="6" class="muted">No hay votos cargados para esta selección.</td></tr>';}
    function candidateAllowedByScope(c,scope){const circ=normalize(c?.circunscripcion||'');const block=normalize(c?.senateBlock||'');const regional=regionalScopeName(scope);if(scope==='NACIONAL')return block.includes('NACIONAL')||circ==='NACIONAL'||circ.includes('DISTRITO UNICO');if(scope==='REGIONAL')return block.includes('REGIONAL')||(circ&&circ!=='NACIONAL'&&!circ.includes('DISTRITO UNICO'));if(regional)return (block.includes('REGIONAL')||(circ&&circ!=='NACIONAL'&&!circ.includes('DISTRITO UNICO'))) && normalize(regional) && (circ.includes(normalize(regional))||normalize(regional).includes(circ));return true;}
    function projectedCandidates(agg){const data=agg.data,selectedCirc=agg.selectedCirc,byCirc=new Map(),targetCircs=agg.circs||[];const eligible=qualifyingParties(data,getCamera());targetCircs.forEach(circ=>{const pre=precomputedAllocation(data,'barrier',[circ]);if(pre){byCirc.set(circ.name,pre);return;}const votes=(circ.votes||[]).slice().sort((a,b)=>numeric(b.votes)-numeric(a.votes));const allocation=seatsByDhondt(votes.filter(v=>eligible.has(v.party)),numeric(circ.seats));byCirc.set(circ.name,allocation);});const candidates=(data.candidates||[]).filter(c=>candidateAllowedByScope(c,selectedCirc)).slice().sort((a,b)=>numeric(b.votosPref)-numeric(a.votosPref));const winners=[];for(const [circ,allocation] of byCirc.entries()){for(const [party,seats] of allocation.entries()){const cleanCirc=normalize(circ.replace(/^REGIONAL · /,'').replace(/^NACIONAL · /,''));const list=candidates.filter(c=>{const cc=normalize(c.circunscripcion||'');const sameCirc=!cc||cc===cleanCirc||cleanCirc.includes(cc)||cc.includes(cleanCirc)||circ==='NACIONAL'||c.circunscripcion==='NACIONAL'||selectedCirc==='REGIONAL'||selectedCirc==='NACIONAL';return c.party===party&&sameCirc;});list.slice(0,seats).forEach((c,index)=>winners.push({...c,projectedSeat:index+1,projectedCirc:circ,projectedPartySeats:seats}));}}return winners.sort((a,b)=>clean(a.projectedCirc).localeCompare(clean(b.projectedCirc),'es')||clean(a.party).localeCompare(clean(b.party),'es')||numeric(a.projectedSeat)-numeric(b.projectedSeat));}
    function renderCandidates(agg){let winners=projectedCandidates(agg);if(!winners.length){const fallback=(agg.data.candidates||[]).filter(c=>!agg.selectedCirc||c.circunscripcion===agg.selectedCirc||clean(agg.selectedCirc).includes(clean(c.circunscripcion))).sort((a,b)=>numeric(b.votosPref)-numeric(a.votosPref)).slice(0,50);if(!fallback.length){$('candidateList').innerHTML='<div class="empty">La fuente todavía no incluye candidatos para esta cámara o circunscripción.</div>';return;}$('candidateList').innerHTML=fallback.map(c=>candidateHTML(c,'Mayor votación')).join('');return;}$('candidateList').innerHTML=winners.slice(0,100).map(c=>candidateHTML(c,`Curul ${c.projectedSeat}/${c.projectedPartySeats}`)).join('');}
    function candidateHTML(c,badge){const short=clean(c.partyShort)||initials(c.party);const img=candidateImage(c);const age=candidateAge(c);return `<article class="candidate"><div class="avatar">${img?`<img src="${esc(img)}" alt="${esc(c.name||'Candidato')}" onerror="this.remove()">`:short.slice(0,3)}</div><div><b>${c.name||'Candidato sin nombre'}</b><small>${c.party||'Organización no informada'} · ${c.circunscripcion||c.projectedCirc||'NACIONAL'}</small><small>Votos pref.: <b>${fmt.format(numeric(c.votosPref))}</b> · Edad: ${age?esc(age)+' años':'—'} · Posición: ${c.posicion||'—'}</small></div><span class="seat-badge">${badge}</span></article>`;}
    function fillCircunscripciones(){const data=dataFor(getCamera());const select=$('circ');const current=select.value;if(getCamera()==='senadoTotal'){const regional=(dataFor('senadoRegional').circunscripciones||[]).map(c=>c.name).filter(Boolean).sort((a,b)=>a.localeCompare(b,'es'));select.innerHTML='<option value="">Sin filtro</option><option value="NACIONAL">Nacional</option><option value="REGIONAL">Regional</option>'+regional.map(name=>`<option value="${REGIONAL_SCOPE_PREFIX}${name}">Regional · ${name}</option>`).join('');const valid=['','NACIONAL','REGIONAL',...regional.map(name=>REGIONAL_SCOPE_PREFIX+name)];select.value=valid.includes(current)?current:'';return;}const options=(data.circunscripciones||[]).map(c=>c.name).filter(Boolean).sort((a,b)=>a.localeCompare(b,'es'));select.innerHTML='<option value="">Sin filtro</option>'+options.map(name=>`<option value="${name}">${name}</option>`).join('');select.value=options.includes(current)?current:'';}
    function renderStatus(){const status=RAW?.status||{},percent=status.percent,percentDisplay=percent==null?'—':(Number(percent)>1?`${Number(percent).toFixed(2)} %`:percentText(percent));$('statusPercent').textContent=percentDisplay;$('heroPercent').textContent=percentDisplay;$('statusRatio').innerHTML=status.processed!=null?`<b>${fmt.format(status.processed)}</b> / ${fmt.format(status.total||0)} actas`:'Fuente cargada sin detalle de actas.';$('heroStatusText').textContent=status.processed!=null?`${fmt.format(status.processed)} actas procesadas de ${fmt.format(status.total||0)}.`:'Fuente cargada.';$('statusTime').textContent=RAW?.updatedAt?new Date(RAW.updatedAt).toLocaleString('es-PE'):'—';$('statusSource').textContent=RAW?.sourceMode==='sample'?'Fuente: demostrativa':'Fuente: normalizada';const alert=$('sourceAlert');if(RAW?.sourceMode==='sample'){alert.className='source-alert show';alert.textContent='Modo demostrativo: configure ONPE_PARLAMENTO_JSON_URL en Cloudflare Pages para consumir la fuente normalizada real.';}else{alert.className='source-alert';alert.textContent='';}}
    function renderCameraStrip(){const current=getCamera(),scope=getCirc();const tiles=[
      {key:'diputados',label:'Diputados',sub:'Distrito múltiple',seats:130,camera:'diputados',circ:''},
      {key:'senadoTotal',label:'Senadores',sub:'Sin filtro',seats:60,camera:'senadoTotal',circ:''},
      {key:'senadoNacionalTile',label:'Senado nacional',sub:'30 escaños',seats:30,camera:'senadoTotal',circ:'NACIONAL'},
      {key:'senadoRegionalTile',label:'Senado regional',sub:'30 escaños',seats:30,camera:'senadoTotal',circ:'REGIONAL'},
      {key:'andino',label:'Parlamento Andino',sub:'5 representantes',seats:5,camera:'andino',circ:''}
    ];$('cameraStrip').innerHTML=tiles.map(t=>{const active=current===t.camera&&(t.camera!=='senadoTotal'||scope===t.circ);return `<article class="camera-tile ${active?'active':''}" data-camera="${t.camera}" data-circ="${t.circ}"><b>${t.label}</b><small>${t.sub}</small><div class="count">${t.seats}</div></article>`;}).join('');document.querySelectorAll('.camera-tile').forEach(el=>el.addEventListener('click',()=>{$('camara').value=el.dataset.camera;fillCircunscripciones();$('circ').value=el.dataset.circ||'';renderAll();}));}
    function renderAll(){if(!RAW)return;renderCameraStrip();const agg=aggregateForCurrentSelection();const partyMap=getPartyMap();$('titleSB').textContent=`${displayCameraName()} · Sin valla`;$('titleCB').textContent=`${displayCameraName()} · Con valla`;$('subSB').textContent=getCamera()==='senadoTotal'?(getCirc()==='NACIONAL'?'Bloque nacional de 30 escaños.':getCirc()==='REGIONAL'?'Bloque regional de 30 escaños.':regionalScopeName(getCirc())?`Distrito electoral regional: ${regionalScopeName(getCirc())}.`:'Lectura combinada nacional y regional de 60 escaños.'):'Distribución técnica antes de barrera.';$('subCB').textContent=getCamera()==='senadoTotal'?(getCirc()==='NACIONAL'?'Bloque nacional aplicando filtro referencial.':getCirc()==='REGIONAL'?'Bloque regional aplicando filtro referencial.':regionalScopeName(getCirc())?`Distrito regional aplicando filtro referencial.`:'Bloque nacional más bloque regional.'):'Distribución técnica aplicando barrera referencial.';$('pillSB').textContent=`${agg.totalSeats||cameraMeta[getCamera()]?.seats||0} curules`;$('pillCB').textContent=`${Math.round(numeric(agg.data.barrier??.05)*100)} % valla`;renderSeats($('seatsSB'),agg.seatsNoBarrier,agg.totalSeats||cameraMeta[getCamera()]?.seats||0,partyMap,agg);renderSeats($('seatsCB'),agg.seatsBarrier,agg.totalSeats||cameraMeta[getCamera()]?.seats||0,partyMap,agg);renderLegend($('legendSB'),agg.seatsNoBarrier,partyMap);renderLegend($('legendCB'),agg.seatsBarrier,partyMap);renderKPIs(agg);renderTable(agg);renderCandidates(agg);applyViewMode();}
    async function loadData(){$('sourceAlert').className='source-alert show';$('sourceAlert').textContent='Actualizando lectura de datos...';const response=await fetch('/api/parlamento',{cache:'no-store'});if(!response.ok)throw new Error(`No se pudo cargar /api/parlamento: HTTP ${response.status}`);RAW=await response.json();fillCircunscripciones();renderStatus();renderAll();if(RAW?.sourceMode!=='sample')$('sourceAlert').className='source-alert';}
    function applyViewMode(){document.querySelectorAll('.mode-card').forEach(el=>el.classList.toggle('active',el.dataset.view===currentView));$('comparisonSection').style.display=currentView==='candidates'||currentView==='table'?'none':'grid';$('tableSection').style.display=currentView==='candidates'?'none':'block';$('candidateSection').style.display=currentView==='table'?'none':'block';}
    function showError(error){$('sourceAlert').className='source-alert show';$('sourceAlert').textContent=error.message||'No se pudo actualizar la fuente.';}
    $('camara').addEventListener('change',()=>{fillCircunscripciones();renderAll();});$('circ').addEventListener('change',renderAll);$('refresh').addEventListener('click',()=>loadData().catch(showError));$('heroRefresh').addEventListener('click',()=>loadData().catch(showError));document.querySelectorAll('.mode-card').forEach(el=>el.addEventListener('click',()=>{currentView=el.dataset.view;applyViewMode();}));$('year').textContent=new Date().getFullYear();loadData().catch(showError);setInterval(()=>loadData().catch(()=>{}),180000);
  