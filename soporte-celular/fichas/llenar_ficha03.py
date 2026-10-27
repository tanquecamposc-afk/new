"""Llena la Ficha 03 (Semana 3, U4 · reto individual 3D) del soporte para celular
sobre el PDF original del colegio. Uso: python3 llenar_ficha03.py ORIGEN.pdf DESTINO.pdf"""
import os
import sys
from io import BytesIO
from PIL import Image, ImageChops
from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib.utils import simpleSplit, ImageReader

ORIGEN, DESTINO = sys.argv[1], sys.argv[2]
AQUI = os.path.dirname(os.path.abspath(__file__))
IMG = lambda n: os.path.join(AQUI, "..", n)
H = 842
AZUL = (0.05, 0.17, 0.52)
F = "Helvetica"


def t(c, x, y, s, tam=7.6, b=False):
    c.setFont(F + ("-Bold" if b else ""), tam)
    c.drawString(x, H - y, s)


def renglones(c, x, ys, s, ancho=478, tam=7.6):
    lin = simpleSplit(s, F, tam, ancho)
    assert len(lin) <= len(ys), f"no entra ({len(lin)}>{len(ys)}): {s[:50]}"
    for y, l in zip(ys, lin):
        t(c, x, y, l, tam)


def celda(c, x0, x1, y0, s, tam=6.6, inter=7.8, b=False, maxl=99):
    lin = simpleSplit(s, F + ("-Bold" if b else ""), tam, x1 - x0 - 6)
    assert len(lin) <= maxl, f"celda llena ({len(lin)}>{maxl}): {s[:50]}"
    for i, l in enumerate(lin):
        t(c, x0 + 3, y0 + 9 + i * inter, l, tam, b)
    return y0 + 9 + len(lin) * inter


def marca(c, x, y):                     # X dentro de una casilla ☐ (x, y = esquina sup. izq.)
    c.setFont(F + "-Bold", 8.5)
    c.drawString(x + 1.3, H - (y + 7.6), "X")


def imagen(c, ruta, x0, y0, x1, y1):
    im = Image.open(ruta).convert("RGB")
    fondo = Image.new("RGB", im.size, (255, 255, 255))
    caja = ImageChops.difference(im, fondo).getbbox()
    im = im.crop(caja)
    w, h = im.size
    esc = min((x1 - x0) / w, (y1 - y0) / h)
    dw, dh = w * esc, h * esc
    c.drawImage(ImageReader(im), x0 + (x1 - x0 - dw) / 2, H - y0 - dh, dw, dh)


def pagina1(c):
    t(c, 106, 145, "Campos", 9)
    t(c, 330, 145, "III B", 9)
    t(c, 106, 168, "27 / 10 / 2026", 9)
    t(c, 330, 168, "N.º 14 · Soporte desmontable", 8)
    t(c, 330, 179, "para celular", 8)

    renglones(c, 46, [291, 303],
              "Al estudiar con el celular (videos, fichas, videollamadas) hay que agacharse para verlo o apoyarlo en algo y se cae. "
              "Lo usarán estudiantes de secundaria en su escritorio, con o sin funda y a veces cargando el celular.")
    renglones(c, 46, [328],
              "Sostener el celular a 65°, vertical u horizontal, sin caerse al tocar la pantalla, dejar enchufar el cargador y armarse/desarmarse a mano.")

    filas = [(372, "Soporte de aluminio Lamicall (producto comercial). newegg.com/p/359-04A3-002H7",
              "Es muy estable, acepta celulares con funda y tiene una abertura abajo para el cable.",
              "Es pesado, caro y de una sola pieza. Haré uno de PLA, en 2 piezas que se separan para guardarlo, manteniendo el paso del cable."),
             (422, "Minimal Desk Phone Stand, 2 piezas que encajan (Printables). printables.com/model/1527484",
              "Se imprime sin soportes y sus dos piezas encajan sin tornillos ni pegamento.",
              "Su encaje por fricción puede quedar flojo. Usaré botones tipo LEGO con prueba de holgura y una cuna en V para cualquier grosor.")]
    for y0, *cols in filas:
        for (x0, x1), s in zip([(44, 190), (190, 339), (339, 550)], cols):
            celda(c, x0, x1, y0, s, maxl=6)

    t(c, 103, 514, "un soporte desmontable para celular", 7.4)
    t(c, 281, 514, "estudiantes que usan el celular en su escritorio", 7.4)
    t(c, 112, 531, "verlo y cargarlo a una altura cómoda sin que se caiga, y guardarlo desarmado en la mochila", 7.4)
    renglones(c, 46, [558],
              "Máx. 80 × 80 × 60 mm, 2–3 piezas de PLA, impresión de hasta 90 min sin soportes, sin bordes filosos.")

    criterios = [(605, "Sostiene celulares de 7 a 12 mm de grosor a 65°, en vertical y horizontal: no se cae ni se mueve al tocar la pantalla "
                       "20 veces. El enchufe del cargador entra sin forzar con el celular puesto."),
                 (643, "4 botones Ø 4,8 mm en agujeros Ø 5,0 mm (0,1 mm de juego por lado): se arma y desarma a mano 20 veces sin "
                       "aflojarse. La holgura final se elige con una probeta de Ø 4,9 / 5,0 / 5,1 mm."),
                 (681, "Armado mide 57 × 76 × 53 mm (máx. 80 × 80 × 60), medido con regla. Sin aristas filosas. Impresión estimada "
                       "~78 min y ~17 g en Cura (máx. 90 min), sin soportes.")]
    for y0, s in criterios:
        celda(c, 196, 550, y0, s, tam=7, inter=8.4, maxl=4)


def pagina2(c):
    imagen(c, IMG("alternativa_A_vista.png"), 50, 198, 290, 318)
    celda(c, 44, 296, 318, "A: base + 1 respaldo inclinado unidos con 2 pestañas en ranuras; tope delantero con muesca para el cable. "
                           "~91 min de impresión; las pestañas de 4 mm se sueltan y el enchufe choca con la base.", maxl=6)
    imagen(c, IMG("vista_piezas.png"), 302, 198, 544, 318)
    celda(c, 296, 550, 318, "B: base sólida con 4 botones tipo LEGO + respaldo con 2 laterales en V unidos por una barra. "
                            "Repisa a 20 mm con centro libre para el cargador. ~78 min, sin soportes.", maxl=6)
    renglones(c, 46, [413, 425, 437],
              "A: 2 piezas (base y respaldo de placa) con unión por pestañas inclinadas y cuñas de apoyo. "
              "B: 2 piezas (base sólida y respaldo con dos laterales) con unión a presión tipo LEGO (4 botones y 4 agujeros); "
              "el celular se calza en una cuna en V de 90° y el cable pasa por una muesca de la base.")
    for y, a, b in ((513, "2", "3"), (536.5, "2", "3"), (560, "1", "3"), (583.5, "5", "9")):
        t(c, 336, y, a, 9, b=(y > 580))
        t(c, 476, y, b, 9, b=(y > 580))
    renglones(c, 46, [627, 639],
              "Elijo la B (9 de 9 puntos): cumple los 3 criterios. Encaje firme y desmontable, permite cargar el celular, acepta "
              "celulares de 7 a 12 mm, mide 57 × 76 × 53 mm y se imprime en ~78 min sin soportes.")
    marca(c, 129, 664)
    t(c, 266, 671, "botones tipo LEGO a presión", 7.6)
    t(c, 212, 688, "76", 8.5)
    t(c, 292, 688, "57", 8.5)
    t(c, 362, 688, "53", 8.5)


def pagina3(c):
    for x, y in ((44, 165), (287, 165), (44, 176), (247, 176), (44, 186), (202, 186)):
        marca(c, x, y)
    t(c, 212, 226, "Campos_14_SoporteCelular", 8)
    t(c, 243, 242, "No se comparte (diseño de clase)", 8)
    imagen(c, IMG("vista_colores.png"), 50, 272, 300, 423)
    y = celda(c, 305, 550, 270, "Piezas modeladas:", tam=7, inter=8.6, b=True)
    texto = ["1) Base: placa sólida 57 × 76 × 3 mm, muesca del cable y 4 botones Ø 4,8 × 3,5 mm.",
             "2) Respaldo: 2 laterales en V (cuerpo, repisa a 25°, tope y apoyo a 65°) unidos por una barra, con 4 agujeros Ø 5 mm.",
             "Dificultad técnica: orientar las cuñas (repisa alta adelante, apoyo alto atrás) y lograr que el tope quede unido a la "
             "repisa; también elegir la holgura de los botones (0,1 mm por lado)."]
    for s in texto:
        y = celda(c, 305, 550, y - 6, s, tam=7, inter=8.6)
    renglones(c, 46, [457, 469],
              "Cajas, cuñas, cilindros-agujero, Agrupar, Alinear y Duplicar (Ctrl + D). Resolví que el tope delantero quedaba suelto "
              "(solo tocaba la repisa por una línea): lo bajé a Z = 28,2 mm y quedó unido a la pieza.")
    marca(c, 185, 495)
    marca(c, 293, 495)
    renglones(c, 46, [590, 602],
              "Logré modelar la base y el respaldo que encajan tipo LEGO y verifiqué la medida (57 × 76 × 53 mm). Siguiente paso: "
              "imprimir la probeta de holgura, ajustar el Ø de los agujeros, exportar STL y verificar el tiempo en Cura.")


lector = PdfReader(ORIGEN)
escritor = PdfWriter()
for i, pagina in enumerate(lector.pages):
    capa = BytesIO()
    c = canvas.Canvas(capa, pagesize=(596, 842))
    c.setFillColorRGB(*AZUL)
    (pagina1, pagina2, pagina3)[i](c)
    c.save()
    capa.seek(0)
    pagina.merge_page(PdfReader(capa).pages[0])
    escritor.add_page(pagina)
with open(DESTINO, "wb") as f:
    escritor.write(f)
print("Listo ->", DESTINO)
