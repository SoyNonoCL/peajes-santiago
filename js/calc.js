// Motor de cálculo de peajes. Sin dependencias del navegador: se puede probar con Node.

export const BANDAS = { TBFP: "Fuera de punta", TBP: "Punta", TS: "Saturación", NORMAL: "Normal", PUNTA: "Punta", FLAT: "Tarifa única" };
const IDX = { TBFP: 0, TBP: 1, TS: 2 };

// ------------------------------------------------------------------ utilidades de fecha
export function ymd(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function hhmm(min) {
  min = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}
export function minutosDelDia(d) { return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60; }

/** Tipo de día para las tablas: F festivo, D domingo, S sábado, L laboral. */
export function tipoDia(d, feriados) {
  if (feriados.has(ymd(d))) return "F";
  const w = d.getDay();
  return w === 0 ? "D" : w === 6 ? "S" : "L";
}

function dentro(lista, m) { return (lista || []).some(([a, b]) => m >= a && m < b); }

/** Banda horaria (TBFP/TBP/TS) de un horario de pórtico en un momento. */
export function banda(h, dia, m) {
  const x = (h || {})[dia];
  if (!x) return "TBFP";
  if (dentro(x.S, m)) return "TS";
  if (dentro(x.P, m)) return "TBP";
  return "TBFP";
}

/** Próximo cambio de banda dentro de `ventana` minutos (para avisar "a las 07:30 sube a saturación"). */
export function proximoCambio(h, dia, m, ventana = 30) {
  const actual = banda(h, dia, m);
  for (let k = 1; k <= ventana; k++) {
    const b = banda(h, dia, m + k);
    if (m + k >= 1440) break;
    if (b !== actual) return { min: Math.floor(m + k), banda: b };
  }
  return null;
}

/** Precio con regla de respaldo: si falta TS se cobra TBP; si falta TBP se cobra TBFP. */
export function precio(t, b) {
  let i = IDX[b];
  while (i > 0 && (t[i] === null || t[i] === undefined)) i--;
  return { monto: t[i], bandaCobrada: Object.keys(IDX)[i] };
}

// ------------------------------------------------------------------ fines de semana largos y temporada
export function finesDeSemanaLargos(feriados, anio) {
  const grupos = [];
  const d = new Date(anio, 0, 1);
  let actual = [];
  const libre = (x) => x.getDay() === 0 || x.getDay() === 6 || feriados.has(ymd(x));
  while (d.getFullYear() <= anio) {
    if (libre(d)) actual.push(ymd(d));
    else { if (actual.length >= 3 && actual.some((x) => feriados.has(x))) grupos.push(actual); actual = []; }
    d.setDate(d.getDate() + 1);
  }
  if (actual.length >= 3) grupos.push(actual);
  return grupos;
}

function enTemporadaAlta(d) {
  const m = d.getMonth() + 1, dd = d.getDate();
  return (m === 12 && dd >= 20) || m === 1 || m === 2 || (m === 3 && dd <= 10);
}

/** Regla de punta de rutas transversales. haciaSantiago: true/false. */
export function puntaTemporada(d, haciaSantiago, feriados) {
  const m = minutosDelDia(d), w = d.getDay(), hoy = ymd(d);
  const tarde = m >= 18 * 60 && m < 22 * 60, manana = m >= 10 * 60 && m < 13 * 60;
  if (enTemporadaAlta(d)) {
    if (haciaSantiago && w === 0 && tarde) return true;
    if (!haciaSantiago && ((w === 5 && tarde) || (w === 6 && manana))) return true;
  }
  for (const g of finesDeSemanaLargos(feriados, d.getFullYear())) {
    const primero = g[0], ultimo = g[g.length - 1];
    const v = new Date(primero + "T12:00:00"); v.setDate(v.getDate() - 1);
    if (haciaSantiago && hoy === ultimo && tarde) return true;
    if (!haciaSantiago && ((hoy === ymd(v) && tarde) || (hoy === primero && manana))) return true;
  }
  return false;
}

// ------------------------------------------------------------------ geometría
const R = 6371000;
const rad = (x) => (x * Math.PI) / 180;
export function distancia(a, b) {
  const dLat = rad(b[0] - a[0]), dLon = rad(b[1] - a[1]);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
export function rumbo(a, b) {
  const y = Math.sin(rad(b[1] - a[1])) * Math.cos(rad(b[0]));
  const x = Math.cos(rad(a[0])) * Math.sin(rad(b[0])) - Math.sin(rad(a[0])) * Math.cos(rad(b[0])) * Math.cos(rad(b[1] - a[1]));
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}
function difAngulo(a, b) { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; }

/** Proyección de un punto sobre un segmento (aprox. plana local). Devuelve distancia y fracción. */
function proyectar(p, a, b) {
  const kx = Math.cos(rad(p[0])) * 111320, ky = 110540;
  const ax = (a[1] - p[1]) * kx, ay = (a[0] - p[0]) * ky, bx = (b[1] - p[1]) * kx, by = (b[0] - p[0]) * ky;
  const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
  let f = L ? -(ax * dx + ay * dy) / L : 0;
  f = Math.max(0, Math.min(1, f));
  const x = ax + f * dx, y = ay + f * dy;
  return { d: Math.sqrt(x * x + y * y), f };
}

/** Prepara la ruta: puntos [lat,lon], distancia y tiempo acumulados. duraciones por segmento opcionales. */
export function prepararRuta(coords, duraciones, factorTiempo = 1) {
  const s = [0], t = [0];
  for (let i = 1; i < coords.length; i++) {
    s.push(s[i - 1] + distancia(coords[i - 1], coords[i]));
    t.push(t[i - 1] + (duraciones ? duraciones[i - 1] : distancia(coords[i - 1], coords[i]) / 16) * factorTiempo);
  }
  let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
  for (const [la, lo] of coords) { minLat = Math.min(minLat, la); maxLat = Math.max(maxLat, la); minLon = Math.min(minLon, lo); maxLon = Math.max(maxLon, lo); }
  return { coords, s, t, bbox: [minLat - 0.003, minLon - 0.004, maxLat + 0.003, maxLon + 0.004] };
}

/** Todos los pasos de la ruta cerca de un punto (puede pasar más de una vez). */
export function pasos(ruta, geo, tol, rumboEsperado = null, maxDif = 55) {
  const p = [geo.lat, geo.lon];
  const [a, b, c, d] = ruta.bbox;
  if (p[0] < a || p[0] > c || p[1] < b || p[1] > d) return [];
  const out = [];
  for (let i = 0; i < ruta.coords.length - 1; i++) {
    const q = proyectar(p, ruta.coords[i], ruta.coords[i + 1]);
    if (q.d > tol) continue;
    const r = rumbo(ruta.coords[i], ruta.coords[i + 1]);
    if (rumboEsperado !== null && rumboEsperado !== undefined && difAngulo(r, rumboEsperado) > maxDif) continue;
    const seg = ruta.s[i + 1] - ruta.s[i];
    const s = ruta.s[i] + q.f * seg, t = ruta.t[i] + q.f * (ruta.t[i + 1] - ruta.t[i]);
    const ult = out[out.length - 1];
    if (ult && s - ult.s < 400) { if (q.d < ult.d) Object.assign(ult, { s, t, d: q.d, rumbo: r, i }); continue; }
    out.push({ s, t, d: q.d, rumbo: r, i });
  }
  return out;
}

// ------------------------------------------------------------------ cálculo principal
const CENTRO = [-33.4378, -70.6505]; // Plaza de Armas

/**
 * data: tarifas.json; ruta: prepararRuta(); salida: Date; opts: {cat, tag:boolean, feriados:Set}
 * Devuelve { items, total, avisos, porAutopista }
 */
export function calcular(data, ruta, salida, opts) {
  const feriados = opts.feriados || new Set(data.feriados);
  const cat = data.categorias.find((c) => c.id === opts.cat) || data.categorias[0];
  const ck = cat.urb;
  const pasados = [];

  // 1. pórticos urbanos
  for (const u of data.urbanas) for (const [sid, s] of Object.entries(u.sentidos)) for (const p of s.porticos) {
    if (!p.geo) continue;
    for (const x of pasos(ruta, p.geo, p.geo.tol || 25, p.geo.rumbo)) pasados.push({ tipo: "urb", u, sid, s, p, ...x });
  }
  // 2. pórticos AVO (entradas y salidas)
  const avoPasos = [];
  for (const p of data.avo.porticos) {
    if (!p.geo) continue;
    for (const x of pasos(ruta, p.geo, p.geo.tol || 25, p.geo.rumbo)) avoPasos.push({ p, ...x });
  }
  avoPasos.sort((a, b) => a.s - b.s);
  // 3. plazas
  for (const p of data.plazas) {
    if (!p.geo) continue;
    for (const x of pasos(ruta, p.geo, p.geo.tol || 60, p.geo.rumbo)) pasados.push({ tipo: "plaza", p, ...x });
  }

  const items = [];
  const momento = (t) => new Date(salida.getTime() + t * 1000);

  for (const x of pasados) {
    const cuando = momento(x.t), dia = tipoDia(cuando, feriados), m = minutosDelDia(cuando);
    if (x.tipo === "urb") {
      const b = banda(x.p.h, dia, m);
      const pr = precio(x.p.t[ck], b);
      let monto = pr.monto;
      let sinTagNota = null;
      if (!opts.tag) {
        if (x.p.sinTag) { monto = precio(x.p.sinTag[ck], b).monto; sinTagNota = "tarifa sin TAG del túnel"; }
      }
      items.push({
        s: x.s, t: x.t, cuando, autopista: x.u.nombre, autopistaId: x.u.id, sentido: x.s.nombre,
        codigo: x.p.codigo, nombre: x.p.tramo, banda: pr.bandaCobrada, bandaHorario: b, monto,
        sinTagPropio: !!x.p.sinTag, cambio: proximoCambio(x.p.h, dia, m), sinTagNota,
      });
    } else {
      const p = x.p;
      let esPunta = false;
      if (p.punta) {
        if (p.regla === "horario") esPunta = banda(p.h, dia, m) !== "TBFP";
        else if (p.regla === "temporada") {
          const j = Math.min(x.i + 25, ruta.coords.length - 1);
          const haciaStgo = distancia(ruta.coords[j], CENTRO) < distancia(ruta.coords[x.i], CENTRO);
          esPunta = puntaTemporada(cuando, haciaStgo, feriados);
        }
      }
      let tabla = esPunta ? p.punta : p.normal;
      if (!opts.tag && p.manual) tabla = p.manual;
      items.push({
        s: x.s, t: x.t, cuando, autopista: p.autopistaNombre, autopistaId: p.autopista, sentido: "",
        codigo: p.id, nombre: p.nombre, banda: p.punta ? (esPunta ? "PUNTA" : "NORMAL") : "FLAT",
        monto: tabla[opts.cat], nota: p.notaHorario || null, plaza: true,
      });
    }
  }

  // AVO: emparejar entrada → salida en el orden recorrido
  const avisos = [];
  const pares = data.avo.pares;
  let k = 0;
  while (k < avoPasos.length) {
    const e = avoPasos[k];
    let par = null, j = k + 1;
    if (e.p.codigo === "P110") par = pares.find((q) => q.entrada === "P110");
    else for (; j < avoPasos.length && j <= k + 4; j++) {
      par = pares.find((q) => q.entrada === e.p.codigo && q.salida === avoPasos[j].p.codigo);
      if (par) break;
    }
    if (!par) { k++; continue; }
    const fin = par.entrada === "P110" ? e : avoPasos[j];
    const cuando = momento(e.t), dia = tipoDia(cuando, feriados), m = minutosDelDia(cuando);
    const b = banda(data.avo.h, dia, m);
    let monto = precio(par.t[ck], b).monto;
    if (!opts.tag) monto = data.avo.sin_tag.pasada[ck];
    const nom = (c) => (data.avo.porticos.find((p) => p.codigo === c) || {}).nombre || c;
    items.push({
      s: e.s, t: e.t, cuando, autopista: data.avo.nombre, autopistaId: "AVO", sentido: "",
      codigo: par.entrada === par.salida ? par.entrada : `${par.entrada}→${par.salida}`,
      nombre: par.entrada === par.salida ? nom(par.entrada) : `${nom(par.entrada)} → ${nom(par.salida)}`,
      banda: b, monto, cambio: proximoCambio(data.avo.h, dia, m), sinTagPropio: true,
    });
    k = par.entrada === "P110" ? k + 1 : j + 1;
  }

  items.sort((a, b) => a.s - b.s);

  // cambios de banda a lo largo del viaje, por autopista
  const ultimaBanda = {};
  for (const it of items) {
    if (it.plaza) continue;
    const prev = ultimaBanda[it.autopistaId];
    if (prev && prev !== it.banda) it.transicion = `Desde las ${hhmm(minutosDelDia(it.cuando))} rige ${BANDAS[it.banda].toLowerCase()}`;
    ultimaBanda[it.autopistaId] = it.banda;
  }

  // total
  let total = 0;
  const porAutopista = {};
  for (const it of items) {
    let m = it.monto || 0;
    if (!opts.tag && !it.plaza && !it.sinTagPropio) m = m * data.sinTag.factor[ck];
    it.montoFinal = m;
    total += m;
    porAutopista[it.autopista] = (porAutopista[it.autopista] || 0) + m;
  }
  if (!opts.tag && items.some((i) => !i.plaza && !i.sinTagPropio)) {
    avisos.push(`Sin TAG en autopistas urbanas se usa el ${data.sinTag.sistema}: suma de pórticos × ${data.sinTag.factor[ck]}. Se paga en ${data.sinTag.pago}.`);
  }
  for (const u of data.urbanas) if (u.aviso && items.some((i) => i.autopistaId === u.id)) avisos.push(`${u.nombre}: ${u.aviso}`);
  return { items, total: Math.round(total), porAutopista, avisos, duracion: ruta.t[ruta.t.length - 1], distancia: ruta.s[ruta.s.length - 1] };
}

/** Estacionamiento del aeropuerto. minutos de estadía, zona id. */
export function estacionamiento(data, zonaId, minutos) {
  const e = data.estacionamiento, z = e.zonas.find((x) => x.id === zonaId);
  if (!z || minutos <= e.gratis_min) return 0;
  const dias = Math.floor(minutos / 1440), resto = minutos % 1440;
  return Math.round(dias * z.tope_dia + Math.min(z.tope_dia, resto * z.por_minuto));
}
