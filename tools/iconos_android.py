"""Genera íconos y pantallas de inicio de Android a partir del diseño de la app."""
from PIL import Image, ImageDraw
import os
RES = os.path.join(os.path.dirname(__file__), "..", "android", "app", "src", "main", "res")
AZUL, ORO = "#0f3d4a", "#e8a33d"

def logo(d, x0, y0, s):
    """Dibuja el logo (camino con línea central) en un cuadro de 512*s."""
    w = max(2, int(36 * s))
    d.line([(x0 + 128 * s, y0 + 432 * s), (x0 + 220 * s, y0 + 80 * s)], fill="white", width=w)
    d.line([(x0 + 292 * s, y0 + 80 * s), (x0 + 384 * s, y0 + 432 * s)], fill="white", width=w)
    for y in (140, 244, 348):
        d.line([(x0 + 256 * s, y0 + y * s), (x0 + 256 * s, y0 + (y + 44) * s)], fill=ORO, width=max(2, int(28 * s)))
    d.rounded_rectangle([x0 + 96 * s, y0 + 96 * s, x0 + 416 * s, y0 + 130 * s], radius=int(10 * s), fill=ORO)

dens = {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}
for k, f in dens.items():
    n = int(48 * f)
    im = Image.new("RGBA", (n, n), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rounded_rectangle([0, 0, n - 1, n - 1], radius=int(n * .19), fill=AZUL); logo(d, 0, 0, n / 512)
    im.save(f"{RES}/mipmap-{k}/ic_launcher.png")
    im = Image.new("RGBA", (n, n), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.ellipse([0, 0, n - 1, n - 1], fill=AZUL); logo(d, n * .1, n * .1, n * .8 / 512)
    im.save(f"{RES}/mipmap-{k}/ic_launcher_round.png")
    m = int(108 * f)  # primer plano adaptativo: zona segura central de 66 dp
    im = Image.new("RGBA", (m, m), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    lado = m * 0.56; logo(d, (m - lado) / 2, (m - lado) / 2, lado / 512)
    im.save(f"{RES}/mipmap-{k}/ic_launcher_foreground.png")

for root, _, files in os.walk(RES):
    for fn in files:
        if fn == "splash.png":
            p = os.path.join(root, fn); w, h = Image.open(p).size
            im = Image.new("RGB", (w, h), AZUL); d = ImageDraw.Draw(im)
            lado = min(w, h) * 0.32; logo(d, (w - lado) / 2, (h - lado) / 2, lado / 512)
            im.save(p)
with open(f"{RES}/values/ic_launcher_background.xml", "w") as fh:
    fh.write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#0F3D4A</color>\n</resources>\n')
print("íconos listos")
