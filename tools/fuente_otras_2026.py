"""Segunda parte de la transcripción 2026: AVO I, Acceso Nororiente, Acceso Vial AMB,
plazas interurbanas, feriados, estacionamiento del aeropuerto y reglas sin TAG."""

MOP = "https://concesiones.mop.gob.cl/uploads/sites/4/2026/"

# ---------------------------------------------------------------- AVO I (Vespucio Oriente)
# Cobra por par pórtico de entrada → pórtico de salida. TBP lun-vie (no festivos) 07:30-09:30 y 17:30-19:30.
# Precios: (c1y4 TBFP, TBP), (c2 TBFP, TBP), (c3 TBFP, TBP)
_AVO_H = {"L": {"P": ["07:30-09:30", "17:30-19:30"]}}
AVO_PORTICOS = {
    "P101": "Bilbao", "P102": "Martín de Zamora", "P103": "Los Militares", "P104": "Presidente Riesco",
    "P105": "Salida Kennedy Oriente", "P106": "Salida Kennedy Poniente", "P107": "Kennedy-Vespucio",
    "P108": "Costanera Norte – Nororiente", "P109": "Puente Centenario", "P110": "La Pirámide",
    "P111": "Cerro Colorado", "P201": "C. Empresarial – El Salto", "P202": "Viaducto",
    "P203": "Costanera Norte Oriente", "P204": "Salida Av. Vitacura", "P205": "Vitacura",
    "P206": "Kennedy-Vespucio Sur", "P209": "Cristóbal Colón", "P210": "Isabel la Católica",
    "P211": "Tobalaba", "P212": "Costanera Sur",
}
AVO_PARES = [
    # dirección Príncipe de Gales → El Salto
    ("SN", "P101", "P103", 2.35, (545, 1090), (1090, 2181), (1635, 3271)),
    ("SN", "P101", "P111", 2.77, (644, 1287), (1287, 2574), (1931, 3862)),
    ("SN", "P101", "P105", 3.88, (900, 1799), (1799, 3599), (2699, 5398)),
    ("SN", "P101", "P106", 3.62, (841, 1682), (1682, 3364), (2523, 5046)),
    ("SN", "P101", "P108", 4.24, (983, 1966), (1966, 3932), (2949, 5898)),
    ("SN", "P101", "P109", 5.47, (1269, 2538), (2538, 5077), (3808, 7615)),
    ("SN", "P102", "P103", 1.09, (254, 507), (507, 1015), (761, 1522)),
    ("SN", "P102", "P111", 1.52, (352, 704), (704, 1409), (1056, 2113)),
    ("SN", "P102", "P105", 2.62, (608, 1216), (1216, 2433), (1825, 3649)),
    ("SN", "P102", "P106", 2.37, (549, 1099), (1099, 2198), (1648, 3297)),
    ("SN", "P102", "P108", 2.98, (692, 1383), (1383, 2766), (2075, 4149)),
    ("SN", "P102", "P109", 4.21, (978, 1955), (1955, 3911), (2933, 5866)),
    ("SN", "P104", "P105", 1.29, (300, 601), (601, 1201), (901, 1802)),
    ("SN", "P104", "P106", 1.04, (242, 483), (483, 967), (725, 1450)),
    ("SN", "P104", "P108", 1.65, (384, 767), (767, 1535), (1151, 2302)),
    ("SN", "P104", "P109", 2.89, (670, 1340), (1340, 2680), (2010, 4019)),
    ("SN", "P107", "P108", 1.61, (374, 748), (748, 1497), (1122, 2245)),
    ("SN", "P107", "P109", 2.85, (660, 1321), (1321, 2641), (1981, 3962)),
    # Área 2, La Pirámide (pórtico único)
    ("PIR", "P110", "P110", 2.30, (267, 534), (534, 1067), (800, 1601)),
    # dirección El Salto → Príncipe de Gales
    ("NS", "P201", "P203", 2.31, (536, 1072), (1072, 2144), (1608, 3217)),
    ("NS", "P201", "P212", 3.30, (765, 1530), (1530, 3059), (2295, 4589)),
    ("NS", "P201", "P204", 3.71, (860, 1720), (1720, 3441), (2581, 5161)),
    ("NS", "P201", "P103", 6.55, (1519, 3038), (3038, 6076), (4557, 9114)),
    ("NS", "P201", "P210", 7.90, (1834, 3667), (3667, 7334), (5501, 11001)),
    ("NS", "P201", "P211", 8.62, (1999, 3998), (3998, 7996), (5997, 11994)),
    ("NS", "P202", "P203", 3.03, (704, 1407), (1407, 2815), (2111, 4222)),
    ("NS", "P202", "P212", 4.02, (932, 1865), (1865, 3730), (2797, 5595)),
    ("NS", "P202", "P204", 4.43, (1028, 2056), (2056, 4111), (3083, 6167)),
    ("NS", "P202", "P103", 7.27, (1686, 3373), (3373, 6746), (5059, 10119)),
    ("NS", "P202", "P210", 8.63, (2001, 4002), (4002, 8004), (6003, 12007)),
    ("NS", "P202", "P211", 9.34, (2167, 4333), (4333, 8666), (6500, 13000)),
    ("NS", "P205", "P103", 2.02, (468, 936), (936, 1873), (1405, 2809)),
    ("NS", "P205", "P210", 3.37, (783, 1566), (1566, 3131), (2348, 4697)),
    ("NS", "P205", "P211", 4.09, (948, 1897), (1897, 3793), (2845, 5690)),
    ("NS", "P107", "P103", 2.20, (510, 1020), (1020, 2039), (1529, 3059)),
    ("NS", "P107", "P210", 3.55, (824, 1649), (1649, 3298), (2473, 4946)),
    ("NS", "P107", "P211", 4.27, (990, 1980), (1980, 3960), (2970, 5939)),
    ("NS", "P206", "P210", 2.78, (645, 1289), (1289, 2579), (1934, 3868)),
    ("NS", "P206", "P211", 3.49, (810, 1620), (1620, 3241), (2430, 4861)),
    ("NS", "P209", "P211", 1.20, (278, 557), (557, 1114), (835, 1670)),
]
AVO = {
    "id": "AVO", "nombre": "Vespucio Oriente (AVO I)", "operador": "Sociedad Concesionaria Vespucio Oriente",
    "fuente": MOP + "01/AVO-I.pdf", "tipo": "pares",
    "horarios": _AVO_H,
    "sin_tag": {"pasada": {"c14": 3343, "c2": 6686, "c3": 10029}, "pase_diario": {"c14": 13372, "c2": 26744, "c3": 40116},
                "nota": "Cobro por pasada: un viaje en un sentido; pase diario: todo el día, solo AVO."},
}

# ---------------------------------------------------------------- ACCESO NORORIENTE
# Tarifa fija por sector. Horario punta tomado de certramit.cl (no figura en la tabla del MOP).
ACCESO_NORORIENTE = {
    "id": "ANO", "nombre": "Acceso Nororiente", "operador": "Sociedad Concesionaria Autopista Nororiente",
    "fuente": MOP + "01/ACCESO-NORORIENTE.pdf", "tipo": "plazas",
    "horario_fuente": "https://certramit.cl/autopista-radial-nororiente/ (no oficial)",
    "horarios": {"L": {"P": ["07:00-09:00", "19:00-21:00"]}, "S": {"P": ["08:00-10:00", "17:00-21:00"]}, "D": {"P": ["08:00-10:00"]}},
    "plazas": [
        # id, nombre, (moto, auto, autoRem, bus2, cam2, bus3, cam3) normal, idem punta
        ("ANO-PON", "Sector Poniente (Ruta 5 – Av. del Valle)", (1235, 4116, 4116, 7408, 7408, 13170, 13170), (1852, 6173, 6173, 11112, 11112, 19755, 19755)),
        ("ANO-ORI", "Sector Oriente (Av. del Valle – Centenario)", (1235, 4116, 4116, 7408, 7408, 13170, 13170), (1852, 6173, 6173, 11112, 11112, 19755, 19755)),
    ],
}

# ---------------------------------------------------------------- ACCESO VIAL AEROPUERTO AMB
ACCESO_VIAL_AMB = {
    "id": "AMB", "nombre": "Acceso Vial Aeropuerto AMB", "operador": "Sociedad Concesionaria Acceso Vial AMB",
    "fuente": MOP + "01/ACCESO-VIAL.pdf", "tipo": "plazas",
    "plazas": [
        # con TAG (pórtico) / pago manual
        ("AMB", "Pórtico Acceso Vial Aeropuerto", (889, 889, 889, 1778, 1778, 2667, 2667), None,
         {"manual": (1800, 1800, 1800, 2650, 2650, 3550, 3550)}),
    ],
}

# ---------------------------------------------------------------- INTERURBANAS
# Regla de punta "temporada y fines de semana largos" (texto oficial de la tabla de Ruta 78).
REGLA_TEMPORADA = {
    "id": "temporada",
    "texto": "Punta hacia Santiago: domingos 18:00-22:00 entre el 20 dic y el 10 mar, y días de retorno de fines de semana largos 18:00-22:00. "
             "Punta saliendo de Santiago: viernes 18:00-22:00 y sábados 10:00-13:00 entre el 20 dic y el 10 mar; vísperas de fin de semana largo 18:00-22:00 y primer feriado 10:00-13:00.",
}
# Cada plaza: id, nombre, autopista, tarifas normal (moto, auto, autoRem, bus2, cam2, bus3, cam3), punta o None, regla
INTERURBANAS = {
    "R68": {"nombre": "Ruta 68 Santiago – Valparaíso", "fuente": MOP + "01/RUTA-68.pdf",
            "nota_punta": "La tabla del MOP no define el horario punta de Ruta 68; se usa la regla de temporada de las rutas transversales (estimación).",
            "plazas": [
                ("R68-LOPRADO", "Peaje Lo Prado (troncal)", (800, 2700, 2700, 4800, 4800, 8600, 8600), (1200, 4000, 4000, 7200, 7200, 12900, 12900), "temporada"),
                ("R68-ZAPATA", "Peaje Zapata (troncal)", (800, 2700, 2700, 4800, 4800, 8600, 8600), (1200, 4000, 4000, 7200, 7200, 12900, 12900), "temporada"),
                ("R68-LAT", "Peaje lateral / Troncal Sur Ruta 68", (300, 1100, 1100, 1900, 1900, 3500, 3500), None, None),
            ]},
    "R78": {"nombre": "Ruta 78 Santiago – San Antonio", "fuente": MOP + "07/RUTA-78.pdf",
            "plazas": [
                ("R78-AV", "Pórtico Américo Vespucio", (215.40, 718, 718, 1436, 1436, 2513, 2513), (430.80, 1077, 1077, 2872, 2872, 5026, 5026), "temporada"),
                ("R78-RINCONADA", "Pórtico Rinconada", (99, 330, 330, 660, 660, 1155, 1155), (198, 495, 495, 1320, 1320, 2310, 2310), "temporada"),
                ("R78-MALLOCO", "Pórtico Malloco", (67.50, 225, 225, 450, 450, 787.50, 787.50), (135, 337.50, 337.50, 900, 900, 1575, 1575), "temporada"),
                ("R78-PADREHURTADO", "Pórtico Padre Hurtado", (67.50, 225, 225, 450, 450, 787.50, 787.50), (135, 337.50, 337.50, 900, 900, 1575, 1575), "temporada"),
                ("R78-TALAGANTE", "Pórtico Talagante", (112.50, 375, 375, 750, 750, 1312.50, 1312.50), (225, 562.50, 562.50, 1500, 1500, 2625, 2625), "temporada"),
                ("R78-ELPAICO", "Pórtico El Paico", (112.50, 375, 375, 750, 750, 1312.50, 1312.50), (225, 562.50, 562.50, 1500, 1500, 2625, 2625), "temporada"),
                ("R78-POMAIRE", "Pórtico Pomaire / Melipilla", (179.70, 599, 599, 1198, 1198, 2096.50, 2096.50), (359.40, 898.50, 898.50, 2396, 2396, 4193, 4193), "temporada"),
                ("R78-PUANGUE", "Peaje Puangue", (348.30, 1161, 1161, 2322, 2322, 4063.50, 4063.50), (696.60, 1741.50, 1741.50, 4644, 4644, 8127, 8127), "temporada"),
            ]},
    "R57": {"nombre": "Autopista Los Libertadores (Ruta 57)", "fuente": MOP + "02/LOS-LIBERTADORES-FEBRERO.pdf",
            "plazas": [
                ("R57-CHACABUCO", "Peaje Chacabuco (troncal)", (1000, 3300, 3300, 6000, 6000, 10600, 10600), None, None),
                ("R57-SANLUIS", "Peaje San Luis / Chicureo", (400, 1200, 1200, 2100, 2100, 3800, 3800), None, None),
                ("R57-CANTERAS", "Peaje Las Canteras / San José", (400, 1400, 1400, 2500, 2500, 4500, 4500), None, None),
            ]},
    "R5S": {"nombre": "Ruta 5 Sur Santiago – Talca", "fuente": MOP + "04/SANTIAGO-TALCA.pdf",
            "plazas": [
                ("R5S-ANGOSTURA", "Peaje Angostura (troncal Ruta 5)", (1100, 3800, 5600, 6900, 6900, 12200, 12200), None, None),
                ("R5S-LAT", "Peaje lateral Ruta 5 Sur", (300, 900, 1400, 1600, 1600, 2900, 2900), None, None),
                ("R5S-RIOMAIPO", "Pórtico Río Maipo", (186, 621, 931, 1117, 1117, 1986, 1986), None, None),
                ("R5S-GABRIELA", "Pórtico Gabriela", (186, 621, 931, 1117, 1117, 1986, 1986), None, None),
                ("R5S-TOCORNAL", "Pórtico Tocornal", (62, 207, 310, 372, 372, 662, 662), None, None),
            ]},
    "R5N": {"nombre": "Ruta 5 Norte Santiago – Los Vilos", "fuente": MOP + "05/STGO-LOS-VILOS.pdf",
            "nota_punta": "Los pórticos urbanos de Ruta 5 Norte tienen TBP; la tabla no publica el horario, se usa lun-vie 07:00-09:00 y 18:00-20:00 (estimación).",
            "horarios": {"L": {"P": ["07:00-09:00", "18:00-20:00"]}},
            "plazas": [
                ("R5N-MARCOLETA", "Pórtico Lo Marcoleta", (54, 181, 181, 326, 326, 579, 579), (109, 362, 362, 652, 652, 1158, 1158), "horario"),
                ("R5N-BUENAVENTURA", "Pórtico Enlace Buenaventura", (65, 218, 218, 392, 392, 698, 698), (131, 436, 436, 785, 785, 1395, 1395), "horario"),
                ("R5N-LAMONTANA", "Pórtico La Montaña", (119, 397, 397, 715, 715, 1270, 1270), (238, 794, 794, 1429, 1429, 2541, 2541), "horario"),
                ("R5N-LOPINTO", "Pórtico Enlace Lo Pinto", (146, 486, 486, 875, 875, 1555, 1555), (292, 972, 972, 1750, 1750, 3110, 3110), "horario"),
                ("R5N-LAMPA", "Peaje Lampa", (300, 900, 900, 1600, 1600, 2900, 2900), None, None),
                ("R5N-LASVEGAS", "Peaje Las Vegas", (900, 2900, 2900, 5300, 5300, 9400, 9400), None, None),
                ("R5N-MELON", "Peaje Túnel El Melón", (900, 2900, 2900, 5300, 5300, 9400, 9400), None, None),
                ("R5N-PICHIDANGUI", "Peaje Pichidangui", (900, 2900, 2900, 5300, 5300, 9400, 9400), None, None),
            ]},
    "VMEL": {"nombre": "Variante Melipilla", "fuente": MOP + "01/VARIANTE-MELIPILLA.pdf",
             "plazas": [("VMEL", "Peaje Variante Melipilla", (1150, 3900, 5850, 7000, 7000, 12450, 12450), None, None)]},
    "LITORAL": {"nombre": "Red Vial Litoral Central", "fuente": MOP + "01/RED-VIAL.pdf",
                "plazas": [
                    ("LIT-F90", "Troncal Ruta F-90 Sector 1", (600, 1950, 1950, 3850, 3850, 5800, 5800), (850, 2900, 2900, 5800, 7750, 8700, 11600), "temporada"),
                    ("LIT-F94", "Troncal F-94", (400, 1300, 1300, 2600, 2600, 3900, 3900), None, None),
                    ("LIT-F965", "Troncal F-965 / G", (1250, 4100, 4100, 8250, 8250, 12350, 12350), None, None),
                    ("LIT-CRUCES", "Las Cruces G-984", (250, 850, 850, 1700, 1700, 2550, 2550), None, None),
                ]},
    "R60": {"nombre": "Ruta 60 CH", "fuente": MOP + "01/RUTA-60-CH.pdf",
            "plazas": [
                ("R60-QUILLOTA", "Troncal Quillota", (1600, 5350, 5350, 9650, 9650, 17200, 17200), (2400, 8050, 8050, 14500, 14500, 25800, 25800), "temporada"),
                ("R60-QUILLOTALAT", "Quillota lateral", (900, 3050, 3050, 5500, 5500, 9800, 9800), (1400, 4600, 4600, 8300, 8300, 14750, 14750), "temporada"),
                ("R60-LAT", "Laterales Ruta 60 CH", (600, 2050, 2050, 3700, 3700, 6550, 6550), (900, 3100, 3100, 5550, 5550, 9850, 9850), "temporada"),
                ("R60-PANQUEHUE", "Panquehue", (700, 2300, 2300, 4150, 4150, 7400, 7400), (1050, 3450, 3450, 6250, 6250, 11050, 11050), "temporada"),
                ("R60-MONASTERIO", "Monasterio", (400, 1300, 1300, 2300, 2300, 4100, 4100), (550, 1900, 1900, 3450, 3450, 6150, 6150), "temporada"),
            ]},
    "NOGALES": {"nombre": "Camino Nogales – Puchuncaví", "fuente": MOP + "01/NOGALES-PUCHUNCAVI.pdf",
                "plazas": [
                    ("NOG-TRONCAL", "Troncal Nogales", (800, 1950, 2950, 3900, 4300, 5850, 7450), (1550, 3900, 5850, 7850, 12900, 11750, 18600), "temporada"),
                    ("NOG-BYPASS", "Bypass Puchuncaví", (200, 500, 750, 1000, 1100, 1550, 1950), (400, 1000, 1550, 2050, 3350, 3050, 4850), "temporada"),
                ]},
}

# ---------------------------------------------------------------- SIN TAG (autopistas urbanas)
SIN_TAG = {
    "sistema": "Pago Tardío de Transacciones (PTT)",
    "factor": {"c14": 2.0, "c2": 1.5, "c3": 1.33},
    "pago": "pasastesintag.cl, dentro de 30 días desde el tránsito",
    "infractor_dia": {"c14": 11120, "c2": 22240, "c3": 33360},
    "nota": "Desde julio de 2025 no existe Pase Diario para autopistas urbanas: se paga la suma de los pórticos del día multiplicada por un factor. Vespucio Oriente y Túnel San Cristóbal tienen tarifas propias sin TAG.",
    "fuente": "https://www.meganoticias.cl/dato-util/520024-fin-pase-diario-unico-nuevo-sistema-cambio-sin-tag-multas-21-04-2026.html",
}
TSC_SIN_TAG = {  # tabla oficial, columnas infractores / sin contrato TAG
    "SK": {"c14": (3164, 5062, 6334), "c2": (9498, 15193, 18995), "c3": (15826, 25323, 31657)},
    "KS": {"c14": (2531, 3797, None), "c2": (7599, 11396, None), "c3": (12662, 18995, None)},
}

# ---------------------------------------------------------------- ESTACIONAMIENTO AEROPUERTO (referencial)
ESTACIONAMIENTO_SCL = {
    "fuente": "https://www.autofact.cl/blog/mi-auto/cotizar-precios/estacionamiento-aeropuerto (enero 2026, referencial)",
    "gratis_min": 10,
    "zonas": [
        {"id": "expreso", "nombre": "Expreso 1 y 2 (junto a terminales)", "por_minuto": 49.5, "tope_dia": 29700},
        {"id": "pehuen", "nombre": "Pehuén (larga estadía)", "por_minuto": 22, "tope_dia": 12900},
        {"id": "patagua", "nombre": "Patagua (larga estadía)", "por_minuto": 21.47, "tope_dia": 12900},
    ],
}

FERIADOS = [
    "2026-01-01", "2026-04-03", "2026-04-04", "2026-05-01", "2026-05-21", "2026-06-21", "2026-06-29",
    "2026-07-16", "2026-08-15", "2026-09-18", "2026-09-19", "2026-10-12", "2026-10-31", "2026-11-01",
    "2026-12-08", "2026-12-25",
    "2027-01-01", "2027-03-26", "2027-03-27", "2027-05-01", "2027-05-21", "2027-06-21", "2027-06-28",
    "2027-07-16", "2027-08-15", "2027-09-18", "2027-09-19", "2027-10-11", "2027-10-31", "2027-11-01",
    "2027-12-08", "2027-12-25",
]
