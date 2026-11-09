"""Genera data/tarifas.json a partir de las transcripciones de las tablas oficiales.

Uso:  python3 tools/build_tarifas.py
"""
import json, os, sys, datetime

sys.path.insert(0, os.path.dirname(__file__))
from fuente_urbanas_2026 import URBANAS
import fuente_otras_2026 as O

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CATS = [
    {"id": "auto", "nombre": "Auto o camioneta", "urb": "c14"},
    {"id": "moto", "nombre": "Moto", "urb": "c14"},
    {"id": "autoRem", "nombre": "Auto o camioneta con remolque", "urb": "c14"},
    {"id": "bus2", "nombre": "Bus de dos ejes", "urb": "c2"},
    {"id": "cam2", "nombre": "Camión de dos ejes", "urb": "c2"},
    {"id": "bus3", "nombre": "Bus de más de dos ejes", "urb": "c3"},
    {"id": "cam3", "nombre": "Camión de más de dos ejes o con remolque", "urb": "c3"},
]
ORDEN = ["moto", "auto", "autoRem", "bus2", "cam2", "bus3", "cam3"]


def mins(rango):
    a, b = rango.split("-")
    ha, ma = map(int, a.split(":")); hb, mb = map(int, b.split(":"))
    fin = hb * 60 + mb
    return [ha * 60 + ma, fin if fin else 1440]


def horarios(h):
    """Expande SF/DF a días individuales y pasa a minutos."""
    out = {}
    for k, v in (h or {}).items():
        dias = {"SF": ["S", "F"], "DF": ["D", "F"]}.get(k, [k])
        for d in dias:
            out[d] = {t: [mins(r) for r in lst] for t, lst in v.items()}
    return out


def r2(x):
    return None if x is None else round(float(x), 2)


def urbana(a):
    sent = {}
    for sid, s in a["sentidos"].items():
        lst = []
        for (cod, tramo, km, c14, c2, c3, h) in s["porticos"]:
            lst.append({
                "id": f'{a["id"]}-{sid}-{cod}', "codigo": cod, "tramo": tramo, "km": km,
                "t": {"c14": [r2(x) for x in c14], "c2": [r2(x) for x in c2], "c3": [r2(x) for x in c3]},
                "h": horarios(h), "geo": None,
            })
        sent[sid] = {"nombre": s["nombre"], "porticos": lst}
    d = {k: a[k] for k in ("id", "nombre", "operador", "fuente", "tipo")}
    if a.get("aviso"):
        d["aviso"] = a["aviso"]
    d["sentidos"] = sent
    return d


def tupla_cat(t):
    return None if t is None else dict(zip(ORDEN, [r2(x) for x in t]))


def main():
    urb = [urbana(a) for a in URBANAS]
    tsc = next(u for u in urb if u["id"] == "TSC")
    for sid, tabla in O.TSC_SIN_TAG.items():
        tsc["sentidos"][sid]["porticos"][0]["sinTag"] = {k: [r2(x) for x in v] for k, v in tabla.items()}

    avo = {k: O.AVO[k] for k in ("id", "nombre", "operador", "fuente", "tipo", "sin_tag")}
    avo["h"] = horarios(O.AVO["horarios"])
    avo["tarifaKm"] = {"c14": [232, 464], "c2": [464, 928], "c3": [696, 1392]}  # área 1, TBFP / TBP
    avo["porticos"] = [{"codigo": c, "nombre": n, "geo": None} for c, n in O.AVO_PORTICOS.items()]
    avo["pares"] = [{"area": ar, "entrada": e, "salida": s, "km": km,
                     "t": {"c14": list(a), "c2": list(b), "c3": list(c)}} for (ar, e, s, km, a, b, c) in O.AVO_PARES]

    plazas = []
    for au in (O.ACCESO_NORORIENTE, O.ACCESO_VIAL_AMB):
        for p in au["plazas"]:
            pid, nom, normal, punta = p[0], p[1], p[2], p[3]
            extra = p[4] if len(p) > 4 else {}
            d = {"id": pid, "autopista": au["id"], "autopistaNombre": au["nombre"], "nombre": nom,
                 "normal": tupla_cat(normal), "punta": tupla_cat(punta),
                 "regla": "horario" if punta else None, "h": horarios(au.get("horarios")) if punta else {},
                 "fuente": au["fuente"], "geo": None}
            if "manual" in extra:
                d["manual"] = tupla_cat(extra["manual"])
            if au.get("horario_fuente"):
                d["notaHorario"] = "Horario punta según " + au["horario_fuente"]
            plazas.append(d)
    for aid, au in O.INTERURBANAS.items():
        for (pid, nom, normal, punta, regla) in au["plazas"]:
            d = {"id": pid, "autopista": aid, "autopistaNombre": au["nombre"], "nombre": nom,
                 "normal": tupla_cat(normal), "punta": tupla_cat(punta), "regla": regla,
                 "h": horarios(au.get("horarios")) if regla == "horario" else {},
                 "fuente": au["fuente"], "geo": None}
            if au.get("nota_punta") and punta:
                d["notaHorario"] = au["nota_punta"]
            plazas.append(d)

    data = {
        "version": "2026.11.1",
        "vigencia": "2026",
        "generado": datetime.date.today().isoformat(),
        "indiceFuentes": "https://concesiones.mop.gob.cl/peajes-y-porticos/",
        "categorias": CATS,
        "feriados": O.FERIADOS,
        "sinTag": O.SIN_TAG,
        "reglas": {"temporada": O.REGLA_TEMPORADA},
        "estacionamiento": O.ESTACIONAMIENTO_SCL,
        "urbanas": urb,
        "avo": avo,
        "plazas": plazas,
    }
    os.makedirs(os.path.join(RAIZ, "data"), exist_ok=True)
    ruta = os.path.join(RAIZ, "data", "tarifas.json")
    # conserva coordenadas ya asignadas si el archivo existe
    geo = {}
    if os.path.exists(ruta):
        old = json.load(open(ruta, encoding="utf8"))
        for u in old.get("urbanas", []):
            for s in u["sentidos"].values():
                for p in s["porticos"]:
                    if p.get("geo"):
                        geo[p["id"]] = p["geo"]
        for p in old.get("avo", {}).get("porticos", []):
            if p.get("geo"):
                geo["AVO-" + p["codigo"]] = p["geo"]
        for p in old.get("plazas", []):
            if p.get("geo"):
                geo[p["id"]] = p["geo"]
    for u in urb:
        for s in u["sentidos"].values():
            for p in s["porticos"]:
                p["geo"] = geo.get(p["id"])
    for p in avo["porticos"]:
        p["geo"] = geo.get("AVO-" + p["codigo"])
    for p in plazas:
        p["geo"] = geo.get(p["id"])
    json.dump(data, open(ruta, "w", encoding="utf8"), ensure_ascii=False, separators=(",", ":"))
    n = sum(len(s["porticos"]) for u in urb for s in u["sentidos"].values())
    print(f"OK {ruta}: {n} pórticos urbanos, {len(avo['pares'])} pares AVO, {len(plazas)} plazas")


if __name__ == "__main__":
    main()
