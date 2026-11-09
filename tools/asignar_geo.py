"""Asigna coordenadas (y rumbo de la calzada) de OpenStreetMap a los pórticos y plazas de data/tarifas.json.

Uso: python3 tools/asignar_geo.py porticos.json [vias.json]
  porticos.json: salida Overpass de nodos highway=toll_gantry y barrier=toll_booth (out center tags)
  vias.json:     (opcional) vías que contienen esos nodos (out geom) para calcular el rumbo.
Las asignaciones manuales de tools/geo_manual.json tienen prioridad.
"""
import json, math, os, re, sys, unicodedata
from difflib import SequenceMatcher

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def norm(s):
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode().lower()
    s = re.sub(r"\b(av|avenida|pte|puente|gral|general|gnmo|a\.|americo|kms?|longitud|de|la|el|del|las|los|y)\b", " ", s)
    s = re.sub(r"[^a-z0-9]+", " ", s)
    return " ".join(s.split())


def ref_norm(r):
    r = (r or "").upper().replace(" ", "")
    r = re.split(r"[-–]", r)[0]
    m = re.match(r"^(PA|PC|P|T)?0*(\d+(?:\.\d+)?)$", r)
    if m:
        return (m.group(1) or "") + m.group(2)
    return r


def rumbo(a, b):
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    y = math.sin(lo2 - lo1) * math.cos(la2)
    x = math.cos(la1) * math.sin(la2) - math.sin(la1) * math.cos(la2) * math.cos(lo2 - lo1)
    return (math.degrees(math.atan2(y, x)) + 360) % 360


def cargar_nodos(ruta):
    out = {}
    for e in json.load(open(ruta, encoding="utf8"))["elements"]:
        if e["type"] == "node":
            la, lo = e["lat"], e["lon"]
        elif "center" in e:
            la, lo = e["center"]["lat"], e["center"]["lon"]
        else:
            continue
        t = e.get("tags", {})
        out[e["id"]] = {"id": e["id"], "lat": la, "lon": lo, "ref": t.get("ref", ""), "name": t.get("name", ""),
                        "operator": t.get("operator", ""), "tipo": "booth" if t.get("barrier") == "toll_booth" else "gantry"}
    return out


def rumbos_desde_vias(ruta, nodos):
    """Rumbo de circulación en cada nodo, si la vía es de un sentido."""
    res = {}
    if not ruta or not os.path.exists(ruta):
        return res
    por_coord = {(round(n["lat"], 7), round(n["lon"], 7)): nid for nid, n in nodos.items()}
    for w in json.load(open(ruta, encoding="utf8"))["elements"]:
        if w["type"] != "way" or "geometry" not in w:
            continue
        t = w.get("tags", {})
        oneway = t.get("oneway") in ("yes", "1", "-1") or t.get("highway", "").endswith("_link") or t.get("highway") == "motorway"
        if not oneway:
            continue
        rev = t.get("oneway") == "-1"
        g = [(p["lat"], p["lon"]) for p in w["geometry"]]
        for i, c in enumerate(g):
            nid = por_coord.get((round(c[0], 7), round(c[1], 7)))
            if nid is None or nid in res:
                continue
            a = g[max(0, i - 1)]; b = g[min(len(g) - 1, i + 1)]
            if a == b:
                continue
            r = rumbo(a, b)
            res[nid] = ((r + 180) % 360) if rev else r
    return res


def sim(a, b):
    return SequenceMatcher(None, norm(a), norm(b)).ratio()


# Zonas aproximadas de cada concesión (lat_min, lon_min, lat_max, lon_max) para no cruzar códigos repetidos.
ZONAS = {
    "CN": (-33.46, -70.80, -33.36, -70.52),
    "VN": (-33.49, -70.80, -33.36, -70.62),
    "VS": (-33.55, -70.76, -33.47, -70.56),
    "AC": (-33.70, -70.73, -33.36, -70.64),
    "TSC": (-33.41, -70.63, -33.39, -70.60),
}


def main():
    nodos = cargar_nodos(sys.argv[1])
    rumbos = rumbos_desde_vias(sys.argv[2] if len(sys.argv) > 2 else None, nodos)
    manual = {}
    mp = os.path.join(RAIZ, "tools", "geo_manual.json")
    if os.path.exists(mp):
        manual = json.load(open(mp, encoding="utf8"))
    ruta_data = os.path.join(RAIZ, "data", "tarifas.json")
    data = json.load(open(ruta_data, encoding="utf8"))
    usados, informe = set(), []

    def geo_de(ids):
        pts = []
        for nid in ids:
            n = nodos.get(int(nid))
            if not n:
                continue
            g = {"lat": round(n["lat"], 6), "lon": round(n["lon"], 6), "osm": n["id"]}
            if n["id"] in rumbos:
                g["rumbo"] = round(rumbos[n["id"]])
            pts.append(g)
            usados.add(n["id"])
        return pts or None

    # ---- urbanas
    for u in data["urbanas"]:
        z = ZONAS.get(u["id"])
        cand = [n for n in nodos.values() if n["tipo"] == "gantry" and z and z[0] <= n["lat"] <= z[2] and z[1] <= n["lon"] <= z[3]]
        for sid, s in u["sentidos"].items():
            for p in s["porticos"]:
                if p["id"] in manual:
                    p["geo"] = geo_de(manual[p["id"]]); informe.append(("manual", p["id"], manual[p["id"]])); continue
                if u["id"] == "TSC":
                    want = "PC101" if sid == "SK" else "PC102"
                    hits = [n for n in cand if ref_norm(n["ref"]) == want]
                else:
                    code = ref_norm(p["codigo"] if not re.match(r"^\d", p["codigo"]) else "P" + p["codigo"])
                    hits = [n for n in cand if ref_norm(n["ref"]) == code]
                    tramo = re.sub(r"^Kennedy:\s*", "", p["tramo"])
                    # nombre del nodo sin el código inicial
                    def txt(n):
                        t = n["name"] or n["ref"]
                        return re.sub(r"^(PA|PC|P)\s*[\d.]+\s*-?\s*", "", t, flags=re.I)
                    hits = sorted(hits, key=lambda n: -sim(txt(n), tramo))
                    if len(hits) > 1:
                        best = sim(txt(hits[0]), tramo)
                        hits = [h for h in hits if best - sim(txt(h), tramo) < 0.08]
                if hits:
                    p["geo"] = geo_de([h["id"] for h in hits])
                    informe.append(("ok" if len(hits) == 1 else "multi", p["id"], [(h["id"], h["name"] or h["ref"]) for h in hits]))
                else:
                    p["geo"] = None
                    informe.append(("FALTA", p["id"], p["tramo"]))
    # ---- AVO
    for p in data["avo"]["porticos"]:
        k = "AVO-" + p["codigo"]
        if k in manual:
            p["geo"] = geo_de(manual[k]); informe.append(("manual", k, manual[k])); continue
        hits = [n for n in nodos.values() if ref_norm(n["ref"]) == p["codigo"] and -33.44 < n["lat"] < -33.38 and -70.63 < n["lon"] < -70.56]
        p["geo"] = geo_de([h["id"] for h in hits])
        informe.append(("ok" if hits else "FALTA", k, [(h["id"], h["ref"]) for h in hits] or p["nombre"]))
    # ---- plazas: solo manual (nombres libres)
    for p in data["plazas"]:
        if p["id"] in manual:
            p["geo"] = geo_de(manual[p["id"]]); informe.append(("manual", p["id"], manual[p["id"]]))
        else:
            p["geo"] = None; informe.append(("FALTA", p["id"], p["nombre"]))

    json.dump(data, open(ruta_data, "w", encoding="utf8"), ensure_ascii=False, separators=(",", ":"))
    for fila in informe:
        if fila[0] != "ok":
            print(*fila)
    libres = [n for n in nodos.values() if n["id"] not in usados]
    print(f"\nAsignados: {sum(1 for f in informe if f[0] in ('ok','multi','manual'))}/{len(informe)}. Nodos OSM sin usar: {len(libres)}")
    for n in sorted(libres, key=lambda n: (n["lat"], n["lon"])):
        print("  libre", n["id"], round(n["lat"], 5), round(n["lon"], 5), n["tipo"], n["ref"], "|", n["name"], "|", n["operator"], "| rumbo", rumbos.get(n["id"]))


if __name__ == "__main__":
    main()
