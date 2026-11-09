import * as C from "./calc.js";

const $ = (s) => document.querySelector(s);
const fmt = (n) => "$" + Math.round(n).toLocaleString("es-CL");
const OSRM = "https://router.project-osrm.org/route/v1/driving/";
const NOMINATIM = "https://nominatim.openstreetmap.org/";
const KEY = { rutas: "peajes.rutas", hist: "peajes.historial", prefs: "peajes.prefs", datos: "peajes.datos" };

const store = {
  get(k, def) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch { return def; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } },
};

let DATA = null;
let FERIADOS = new Set();
let puntos = [];            // {tipo:'o'|'v'|'d', lat, lon, label}
let ultimo = null;          // último cálculo {res, ruta, params}
let capaRuta = null, capaPorticos = null, marcadores = [];

// ------------------------------------------------------------------ utilidades UI
function toast(msg, ms = 3200) {
  const t = $("#toast"); t.textContent = msg; t.hidden = false;
  clearTimeout(toast._t); toast._t = setTimeout(() => (t.hidden = true), ms);
}
function esc(s) { return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
function localISO(d) { const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000); return z.toISOString().slice(0, 16); }

// ------------------------------------------------------------------ datos
const SITIO = "https://soynonocl.github.io/peajes-santiago/";
const NATIVO = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());

function masNueva(a, b) { // compara "2026.11.1" con "2026.11.10" numéricamente
  const x = String(a).split(".").map(Number), y = String(b).split(".").map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); }
  return false;
}
async function bajar(url) {
  const r = await fetch(url, { cache: "no-cache" });
  if (!r.ok) throw new Error(r.status);
  return r.json();
}
/** Usa la versión de tarifas más nueva entre la publicada, la incluida en la app y la guardada. */
async function cargarDatos() {
  const guardada = store.get(KEY.datos, null);
  const fuentes = NATIVO ? [SITIO + "data/tarifas.json", "data/tarifas.json"] : ["data/tarifas.json"];
  let mejor = null;
  for (const u of fuentes) {
    try { const d = await bajar(u); if (!mejor || masNueva(d.version, mejor.version)) mejor = d; } catch { /* sin red o sin archivo */ }
  }
  if (guardada && (!mejor || masNueva(guardada.version, mejor.version))) mejor = guardada;
  DATA = mejor;
  if (!DATA) { $("#estadoDatos").textContent = "Sin tarifas: requiere conexión"; return; }
  store.set(KEY.datos, DATA);
  if (!navigator.onLine) toast("Sin conexión: usando las tarifas guardadas");
  FERIADOS = new Set(DATA.feriados);
  $("#estadoDatos").textContent = `Tarifas ${DATA.vigencia} · v${DATA.version}`;
  const sel = $("#cat");
  sel.innerHTML = DATA.categorias.map((c) => `<option value="${c.id}">${esc(c.nombre)}</option>`).join("");
  const z = $("#estacZona");
  z.innerHTML = '<option value="">No estaciono</option>' + DATA.estacionamiento.zonas.map((x) => `<option value="${x.id}">${esc(x.nombre)}</option>`).join("");
  $("#estacNota").textContent = `Valores referenciales (${DATA.estacionamiento.fuente.split(" (")[1]?.replace(")", "") || "2026"}). Primeros ${DATA.estacionamiento.gratis_min} min sin costo.`;
  aplicarPrefs();
  renderInfo();
  actualizarFeriados();
}

async function actualizarFeriados() {
  const y = new Date().getFullYear();
  for (const anio of [y, y + 1]) {
    try {
      const r = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${anio}/CL`);
      if (!r.ok) continue;
      for (const h of await r.json()) if (h.global) FERIADOS.add(h.date);
    } catch { /* sin red: se usa la lista incluida */ }
  }
}

function aplicarPrefs() {
  const p = store.get(KEY.prefs, {});
  if (p.cat) $("#cat").value = p.cat;
  if (p.pago) $("#pago").value = p.pago;
  if (p.trafico) $("#trafico").value = p.trafico;
}
function guardarPrefs() { store.set(KEY.prefs, { cat: $("#cat").value, pago: $("#pago").value, trafico: $("#trafico").value }); }

// ------------------------------------------------------------------ mapa
const mapa = L.map("mapa", { zoomControl: true }).setView([-33.44, -70.66], 11);
mapa.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>');
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(mapa);

function icono(tipo, n) {
  const color = tipo === "o" ? "#2f7d5b" : tipo === "d" ? "#c2412d" : "#4a5a9a";
  const txt = tipo === "o" ? "A" : tipo === "d" ? "B" : n;
  return L.divIcon({ className: "", html: `<div class="mk" style="background:${color}">${txt}</div>`, iconSize: [26, 26], iconAnchor: [13, 13] });
}

function ordenPuntos() {
  const o = puntos.filter((p) => p.tipo === "o"), v = puntos.filter((p) => p.tipo === "v"), d = puntos.filter((p) => p.tipo === "d");
  puntos = [...o, ...v, ...d];
}

function dibujarMarcadores() {
  marcadores.forEach((m) => m.remove()); marcadores = [];
  let n = 0;
  for (const p of puntos) {
    if (p.lat == null) continue;
    const m = L.marker([p.lat, p.lon], { icon: icono(p.tipo, p.tipo === "v" ? ++n : 0), draggable: true }).addTo(mapa);
    m.on("dragend", async () => { const ll = m.getLatLng(); p.lat = ll.lat; p.lon = ll.lng; p.label = await nombreLugar(ll.lat, ll.lng); renderPuntos(); limpiarResultado(); });
    marcadores.push(m);
  }
}

mapa.on("click", async (e) => {
  const { lat, lng } = e.latlng;
  let p = puntos.find((x) => x.lat == null);
  if (!p) {
    if (!puntos.some((x) => x.tipo === "o")) p = { tipo: "o" };
    else if (!puntos.some((x) => x.tipo === "d")) p = { tipo: "d" };
    else p = { tipo: "v" };
    puntos.push(p);
  }
  p.lat = lat; p.lon = lng; p.label = "Buscando dirección…";
  ordenPuntos(); renderPuntos(); dibujarMarcadores(); limpiarResultado();
  p.label = await nombreLugar(lat, lng);
  renderPuntos();
});

async function nombreLugar(lat, lon) {
  try {
    const r = await fetch(`${NOMINATIM}reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=17&accept-language=es`);
    const j = await r.json();
    const a = j.address || {};
    return [a.road || a.pedestrian || a.aeroway || j.name, a.suburb || a.city_district || a.town || a.city].filter(Boolean).join(", ") || `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  } catch { return `${lat.toFixed(5)}, ${lon.toFixed(5)}`; }
}

// ------------------------------------------------------------------ lista de puntos con búsqueda
function renderPuntos() {
  if (!puntos.some((p) => p.tipo === "o")) puntos.unshift({ tipo: "o" });
  if (!puntos.some((p) => p.tipo === "d")) puntos.push({ tipo: "d" });
  ordenPuntos();
  let n = 0;
  $("#puntos").innerHTML = puntos.map((p, i) => {
    const t = p.tipo === "o" ? "A" : p.tipo === "d" ? "B" : ++n;
    const ph = p.tipo === "o" ? "Origen: busca o toca el mapa" : p.tipo === "d" ? "Destino" : "Parada intermedia";
    return `<div class="punto" data-i="${i}">
      <span class="pin ${p.tipo}">${t}</span>
      <div class="campo"><input type="search" placeholder="${ph}" value="${esc(p.label || "")}" autocomplete="off" data-i="${i}"></div>
      ${p.tipo === "v" ? `<button class="quitar" data-quitar="${i}" aria-label="Quitar parada">×</button>` : ""}
    </div>`;
  }).join("");
}

$("#puntos").addEventListener("click", (e) => {
  const q = e.target.closest("[data-quitar]");
  if (q) { puntos.splice(+q.dataset.quitar, 1); renderPuntos(); dibujarMarcadores(); limpiarResultado(); }
});

let busquedaT;
$("#puntos").addEventListener("input", (e) => {
  const inp = e.target; if (inp.tagName !== "INPUT") return;
  clearTimeout(busquedaT);
  const q = inp.value.trim();
  cerrarSugerencias();
  if (q.length < 3) return;
  busquedaT = setTimeout(() => buscar(inp, q), 600);
});
$("#puntos").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target.tagName === "INPUT") { clearTimeout(busquedaT); buscar(e.target, e.target.value.trim()); }
});
document.addEventListener("click", (e) => { if (!e.target.closest(".campo")) cerrarSugerencias(); });
function cerrarSugerencias() { document.querySelectorAll(".sugerencias").forEach((x) => x.remove()); }

async function buscar(inp, q) {
  if (!q) return;
  try {
    const url = `${NOMINATIM}search?format=jsonv2&q=${encodeURIComponent(q)}&countrycodes=cl&viewbox=-71.3,-32.9,-70.2,-33.9&limit=6&accept-language=es`;
    const res = await (await fetch(url)).json();
    cerrarSugerencias();
    const ul = document.createElement("ul"); ul.className = "sugerencias";
    ul.innerHTML = res.length ? res.map((r, k) => `<li tabindex="0" data-k="${k}">${esc(r.display_name.split(", ").slice(0, 3).join(", "))}</li>`).join("") : "<li>Sin resultados</li>";
    inp.parentElement.appendChild(ul);
    ul.addEventListener("click", (ev) => {
      const li = ev.target.closest("li[data-k]"); if (!li) return;
      const r = res[+li.dataset.k], p = puntos[+inp.dataset.i];
      p.lat = +r.lat; p.lon = +r.lon; p.label = r.display_name.split(", ").slice(0, 2).join(", ");
      cerrarSugerencias(); renderPuntos(); dibujarMarcadores(); limpiarResultado();
      mapa.setView([p.lat, p.lon], Math.max(mapa.getZoom(), 13));
    });
  } catch { toast("No se pudo buscar la dirección. Revisa tu conexión."); }
}

$("#btnAgregarParada").onclick = () => { puntos.push({ tipo: "v" }); renderPuntos(); $("#puntos").querySelectorAll("input")[puntos.length - 2]?.focus(); toast("Busca la parada o toca el mapa"); };
$("#btnLimpiar").onclick = () => { puntos = []; renderPuntos(); dibujarMarcadores(); limpiarResultado(); };
$("#btnUbicacion").onclick = () => {
  if (!navigator.geolocation) return toast("Tu navegador no entrega ubicación");
  navigator.geolocation.getCurrentPosition(async (pos) => {
    const p = puntos.find((x) => x.tipo === "o");
    p.lat = pos.coords.latitude; p.lon = pos.coords.longitude; p.label = await nombreLugar(p.lat, p.lon);
    renderPuntos(); dibujarMarcadores(); mapa.setView([p.lat, p.lon], 14);
  }, () => toast("No se pudo obtener tu ubicación"), { enableHighAccuracy: true, timeout: 10000 });
};

// ------------------------------------------------------------------ cálculo
function limpiarResultado() {
  $("#resultado").innerHTML = ""; ultimo = null;
  capaRuta?.remove(); capaPorticos?.remove(); capaRuta = capaPorticos = null;
}

async function trazarRuta(pts) {
  const coords = pts.map((p) => `${p.lon.toFixed(6)},${p.lat.toFixed(6)}`).join(";");
  const r = await fetch(`${OSRM}${coords}?overview=full&geometries=geojson&annotations=duration&steps=false`);
  if (!r.ok) throw new Error("ruta");
  const j = await r.json();
  if (j.code !== "Ok" || !j.routes?.length) throw new Error("sin ruta");
  const ruta = j.routes[0];
  const latlon = ruta.geometry.coordinates.map(([lo, la]) => [la, lo]);
  const dur = ruta.legs.flatMap((l) => l.annotation?.duration || []);
  return { latlon, dur: dur.length === latlon.length - 1 ? dur : null };
}

async function calcularRecorrido() {
  if (!DATA) return toast("Aún no hay tarifas cargadas");
  const pts = puntos.filter((p) => p.lat != null);
  if (pts.length < 2 || !puntos.find((p) => p.tipo === "o").lat || !puntos.find((p) => p.tipo === "d").lat) return toast("Marca origen y destino");
  const btn = $("#btnCalcular"); btn.disabled = true; btn.textContent = "Calculando…";
  guardarPrefs();
  try {
    const { latlon, dur } = await trazarRuta(pts);
    const ruta = C.prepararRuta(latlon, dur, +$("#trafico").value);
    const salida = $("#salida").value ? new Date($("#salida").value) : new Date();
    const params = { cat: $("#cat").value, tag: $("#pago").value === "tag" };
    const res = C.calcular(DATA, ruta, salida, { ...params, feriados: FERIADOS });
    const zona = $("#estacZona").value;
    res.estacionamiento = zona ? C.estacionamiento(DATA, zona, (+$("#estacH").value || 0) * 60 + (+$("#estacM").value || 0)) : 0;
    res.totalFinal = res.total + res.estacionamiento;
    ultimo = { res, ruta, salida, params, zona, pts: pts.map(({ tipo, lat, lon, label }) => ({ tipo, lat, lon, label })) };
    dibujarRuta(latlon, res);
    renderResultado();
  } catch (e) {
    console.error(e);
    toast(navigator.onLine ? "No se pudo trazar la ruta. Intenta de nuevo." : "Sin conexión: el cálculo de rutas requiere internet.");
  } finally { btn.disabled = false; btn.textContent = "Calcular recorrido"; }
}
$("#btnCalcular").onclick = calcularRecorrido;

function colorBanda(b) { return getComputedStyle(document.documentElement).getPropertyValue({ TBFP: "--tbfp", NORMAL: "--tbfp", TBP: "--tbp", PUNTA: "--tbp", TS: "--ts" }[b] || "--plaza").trim(); }

function dibujarRuta(latlon, res) {
  capaRuta?.remove(); capaPorticos?.remove();
  capaRuta = L.polyline(latlon, { color: "#0f3d4a", weight: 5, opacity: .85 }).addTo(mapa);
  capaPorticos = L.layerGroup().addTo(mapa);
  for (const it of res.items) {
    const ll = res && ultimo?.ruta ? puntoEnRuta(ultimo.ruta, it.s) : null;
    if (!ll) continue;
    L.marker(ll, { icon: L.divIcon({ className: "", html: `<div class="gp" style="background:${colorBanda(it.banda)}"></div>`, iconSize: [12, 12], iconAnchor: [6, 6] }) })
      .bindPopup(`<b>${esc(it.autopista)}</b><br>${esc(it.codigo)} · ${esc(it.nombre)}<br>${C.hhmm(C.minutosDelDia(it.cuando))} · ${C.BANDAS[it.banda]} · ${fmt(it.montoFinal)}`)
      .addTo(capaPorticos);
  }
  mapa.fitBounds(capaRuta.getBounds(), { padding: [24, 24] });
}
function puntoEnRuta(ruta, s) {
  for (let i = 1; i < ruta.s.length; i++) if (ruta.s[i] >= s) {
    const f = (s - ruta.s[i - 1]) / ((ruta.s[i] - ruta.s[i - 1]) || 1);
    const a = ruta.coords[i - 1], b = ruta.coords[i];
    return [a[0] + f * (b[0] - a[0]), a[1] + f * (b[1] - a[1])];
  }
  return null;
}

function renderResultado() {
  const { res, salida, params } = ultimo;
  const cat = DATA.categorias.find((c) => c.id === params.cat);
  const llegada = new Date(salida.getTime() + res.duracion * 1000);
  const dia = { L: "día laboral", S: "sábado", D: "domingo", F: "festivo" }[C.tipoDia(salida, FERIADOS)];
  let h = `<div class="total">
    <div class="sub">Total estimado ${params.tag ? "con TAG" : "sin TAG"}</div>
    <div class="monto">${fmt(res.totalFinal)}</div>
    <div class="sub">${esc(cat.nombre)} · ${salida.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "short" })} (${dia}) · ${C.hhmm(C.minutosDelDia(salida))} → ${C.hhmm(C.minutosDelDia(llegada))} · ${(res.distancia / 1000).toFixed(1)} km</div>
    <div class="chips">${Object.entries(res.porAutopista).map(([k, v]) => `<span class="chip">${esc(k)}: ${fmt(v)}</span>`).join("")}${res.estacionamiento ? `<span class="chip">Estacionamiento: ${fmt(res.estacionamiento)}</span>` : ""}</div>
  </div>`;
  for (const a of res.avisos) h += `<div class="aviso">${esc(a)}</div>`;
  if (!res.items.length) h += `<div class="aviso">No se detectaron pórticos ni peajes en esta ruta. Si debería pasar por una autopista, agrega una parada sobre ella para forzar el camino.</div>`;
  let grupo = null;
  for (const it of res.items) {
    if (it.autopista !== grupo) { grupo = it.autopista; h += `<div class="grupo"><span>${esc(grupo)}</span><span>${esc(it.sentido || "")}</span></div>`; }
    const nota = [it.transicion ? `<div class="trans">${esc(it.transicion)}</div>` : "",
      it.cambio ? `<div class="cambio">A las ${C.hhmm(it.cambio.min)} pasa a ${C.BANDAS[it.cambio.banda].toLowerCase()}</div>` : "",
      it.nota ? `<div class="cambio">${esc(it.nota)}</div>` : ""].join("");
    h += `<div class="item"><div class="hora">${C.hhmm(C.minutosDelDia(it.cuando))}</div>
      <div><div class="nom">${esc(it.nombre)}</div><div class="cod">${esc(it.codigo)}</div><span class="badge ${it.banda}">${C.BANDAS[it.banda]}</span>${nota}</div>
      <div class="der">${fmt(it.montoFinal)}</div></div>`;
  }
  h += `<div class="acciones"><button class="btn sec" id="btnGuardarRuta">Guardar recorrido</button><button class="btn sec" id="btnRegistrar">Registrar viaje</button></div>
    <p class="nota">Estimación. Las horas de paso se calculan con tráfico «${esc($("#trafico").selectedOptions[0].text.toLowerCase())}».</p>`;
  $("#resultado").innerHTML = h;
  $("#btnGuardarRuta").onclick = guardarRuta;
  $("#btnRegistrar").onclick = registrarViaje;
  $("#resultado").scrollIntoView({ behavior: "smooth", block: "start" });
}

// ------------------------------------------------------------------ recorridos guardados
function guardarRuta() {
  const nombre = prompt("Nombre del recorrido", ultimo.pts.map((p) => p.label).filter(Boolean).slice(0, 2).join(" → "));
  if (!nombre) return;
  const rutas = store.get(KEY.rutas, []);
  rutas.unshift({ id: Date.now(), nombre, pts: ultimo.pts });
  store.set(KEY.rutas, rutas); renderRutas(); toast("Recorrido guardado");
}
function renderRutas() {
  const rutas = store.get(KEY.rutas, []);
  $("#listaRutas").innerHTML = rutas.length ? rutas.map((r) => `<li><div class="txt" data-cargar="${r.id}"><div class="t1">${esc(r.nombre)}</div><div class="t2">${r.pts.length - 2 > 0 ? `${r.pts.length - 2} parada(s)` : "Directo"}</div></div><button class="btn sec" data-borrar-ruta="${r.id}" aria-label="Borrar">Borrar</button></li>`).join("") : '<li class="vacio">Aún no guardas recorridos.</li>';
}
$("#listaRutas").addEventListener("click", (e) => {
  const c = e.target.closest("[data-cargar]"), b = e.target.closest("[data-borrar-ruta]");
  const rutas = store.get(KEY.rutas, []);
  if (b) { if (confirm("¿Borrar este recorrido?")) { store.set(KEY.rutas, rutas.filter((r) => r.id !== +b.dataset.borrarRuta)); renderRutas(); } return; }
  if (c) {
    const r = rutas.find((x) => x.id === +c.dataset.cargar); if (!r) return;
    puntos = r.pts.map((p) => ({ ...p })); renderPuntos(); dibujarMarcadores(); limpiarResultado();
    cambiarTab("calc"); $("#salida").value = localISO(new Date()); calcularRecorrido();
  }
});

// ------------------------------------------------------------------ historial
function registrarViaje() {
  const h = store.get(KEY.hist, []);
  h.unshift({ id: Date.now(), fecha: ultimo.salida.toISOString(), nombre: ultimo.pts.map((p) => p.label).filter(Boolean).slice(0, 2).join(" → "), total: ultimo.res.totalFinal, cat: ultimo.params.cat, tag: ultimo.params.tag });
  store.set(KEY.hist, h); renderHist(); toast("Viaje registrado en el historial");
}
function renderHist() {
  const h = store.get(KEY.hist, []);
  const meses = {};
  for (const v of h) { const k = v.fecha.slice(0, 7); meses[k] = (meses[k] || { n: 0, t: 0 }); meses[k].n++; meses[k].t += v.total; }
  $("#resumenMes").innerHTML = Object.entries(meses).slice(0, 12).map(([k, v]) => {
    const d = new Date(k + "-15T12:00:00");
    return `<div class="mes"><span>${d.toLocaleDateString("es-CL", { month: "long", year: "numeric" })} · ${v.n} viaje(s)</span><b>${fmt(v.t)}</b></div>`;
  }).join("");
  $("#listaHist").innerHTML = h.length ? h.map((v) => `<li><div class="txt"><div class="t1">${esc(v.nombre)}</div><div class="t2">${new Date(v.fecha).toLocaleString("es-CL", { dateStyle: "medium", timeStyle: "short" })} · ${v.tag ? "TAG" : "sin TAG"}</div></div><span class="monto">${fmt(v.total)}</span><button class="btn sec" data-borrar-hist="${v.id}" aria-label="Borrar">×</button></li>`).join("") : '<li class="vacio">Registra viajes desde el resultado de un cálculo para ver tus totales mensuales.</li>';
}
$("#listaHist").addEventListener("click", (e) => {
  const b = e.target.closest("[data-borrar-hist]"); if (!b) return;
  store.set(KEY.hist, store.get(KEY.hist, []).filter((v) => v.id !== +b.dataset.borrarHist)); renderHist();
});

// ------------------------------------------------------------------ info
function renderInfo() {
  const sinGeo = [];
  let total = 0, conGeo = 0;
  for (const u of DATA.urbanas) for (const s of Object.values(u.sentidos)) for (const p of s.porticos) { total++; p.geo ? conGeo++ : sinGeo.push(u.id + " " + p.codigo); }
  for (const p of DATA.avo.porticos) { total++; p.geo ? conGeo++ : 0; }
  for (const p of DATA.plazas) { total++; p.geo ? conGeo++ : 0; }
  const avisos = DATA.urbanas.filter((u) => u.aviso).map((u) => `<div class="aviso"><b>${esc(u.nombre)}:</b> ${esc(u.aviso)}</div>`).join("");
  $("#infoDatos").innerHTML = `<h3>Tarifas</h3>
    <p class="texto">Vigencia ${esc(DATA.vigencia)}, versión ${esc(DATA.version)} (generada el ${esc(DATA.generado)}). Fuente oficial: <a href="${esc(DATA.indiceFuentes)}" target="_blank" rel="noopener">Dirección General de Concesiones, MOP</a>. La app descarga la versión más reciente cada vez que hay conexión.</p>
    <p class="texto">Pórticos y plazas con ubicación: ${conGeo} de ${total}.</p>${avisos}
    <details><summary>Autopistas incluidas</summary><ul class="texto">${DATA.urbanas.map((u) => `<li><a href="${esc(u.fuente)}" target="_blank" rel="noopener">${esc(u.nombre)}</a></li>`).join("")}<li><a href="${esc(DATA.avo.fuente)}" target="_blank" rel="noopener">${esc(DATA.avo.nombre)}</a></li>${[...new Map(DATA.plazas.map((p) => [p.autopista, p])).values()].map((p) => `<li><a href="${esc(p.fuente)}" target="_blank" rel="noopener">${esc(p.autopistaNombre)}</a></li>`).join("")}</ul></details>`;
}

// ------------------------------------------------------------------ pestañas y arranque
function cambiarTab(t) {
  document.querySelectorAll(".pestanas button").forEach((b) => b.setAttribute("aria-selected", b.dataset.tab === t));
  document.querySelectorAll(".vista").forEach((v) => (v.hidden = v.id !== "v-" + t));
  if (t === "rutas") renderRutas();
  if (t === "hist") renderHist();
}
document.querySelector(".pestanas").addEventListener("click", (e) => { const b = e.target.closest("button[data-tab]"); if (b) cambiarTab(b.dataset.tab); });

$("#salida").value = localISO(new Date());
renderPuntos();
cargarDatos();
if (!NATIVO && "serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
if (NATIVO) document.querySelectorAll(".solo-web").forEach((e) => e.remove());
