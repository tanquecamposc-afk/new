"""Llena la Ficha 02 (Semana 2, U4) sobre el PDF original del colegio.
Los datos que solo el equipo puede medir u obtener (P1–P3, comentarios del
equipo observador, nombres, firma) se dejan en blanco para completarlos a mano."""
import sys
from io import BytesIO
from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib.utils import simpleSplit

ORIGEN, DESTINO = sys.argv[1], sys.argv[2]
H = 842                       # alto A4 en puntos (las Y de abajo se miden desde arriba)
AZUL = (0.05, 0.17, 0.52)
FUENTE = "Helvetica"


def texto(c, x, y, s, tam=7.6, negrita=False):
    c.setFont(FUENTE + ("-Bold" if negrita else ""), tam)
    c.drawString(x, H - y, s)


def renglones(c, x, ys, s, ancho, tam=7.6):
    """Reparte el texto en los renglones dados (posiciones Y desde arriba)."""
    lineas = simpleSplit(s, FUENTE, tam, ancho)
    assert len(lineas) <= len(ys), f"no entra: {s[:40]}… ({len(lineas)} > {len(ys)})"
    for y, l in zip(ys, lineas):
        texto(c, x, y, l, tam)


def celda(c, x0, x1, y0, s, tam=6.6, interl=7.8, negrita=False):
    lineas = simpleSplit(s, FUENTE + ("-Bold" if negrita else ""), tam, x1 - x0 - 6)
    for i, l in enumerate(lineas):
        texto(c, x0 + 3, y0 + 9 + i * interl, l, tam, negrita)
    return len(lineas)


def pagina1(c):
    c.setFillColorRGB(*AZUL)
    texto(c, 98, 152, "")                                               # Equipo: a mano
    texto(c, 330, 152, "III B", 9)
    texto(c, 98, 190, "27 / 10 / 2026", 9)
    renglones(c, 330, [184, 194], "Paso a desnivel (intercambio vial con puente), escala 1:200", 210, 8)

    renglones(c, 46, [306, 318],
              "Separa los flujos de un cruce de dos avenidas: la vía este–oeste pasa por un puente y la norte–sur por debajo, "
              "sin semáforo. Beneficia a conductores y transporte público (menos espera y choques), a peatones "
              "(cruces cebra junto al puente) y a vecinos (menos ruido).", 478)
    renglones(c, 46, [343, 355],
              "Que un auto de escala hace los 4 recorridos (de frente en cada avenida y los giros por los carriles curvos de "
              "las esquinas) sin cruzarse con el otro flujo, pasa bajo el puente sin chocar y el puente se sostiene solo con carga.", 478)
    renglones(c, 46, [384, 396, 408],
              "Se respetó: cruce de dos avenidas con bermas y árboles, puente de dos tableros con barandas, 4 islas con arbustos "
              "y postes, carriles de giro curvos, cebras y escala 1:200. Cambió: se construyó en cartón, cartulina y espuma; "
              "las rampas quedaron muy empinadas (~26 %) por el espacio de la base y los postes son decorativos (no encienden).", 478)

    filas = [(483, "1. Gálibo: un vehículo pasa bajo el puente",
              "Medir con regla la altura libre bajo el tablero en 3 puntos (izquierda, centro, derecha).",
              "Meta: mín. 25 mm (5 m reales a 1:200).   Sí / No"),
             (530, "2. Resistencia: el puente aguanta carga",
              "Poner 200 g (un celular) al centro del tablero 1 minuto y medir con regla cuánto baja.",
              "Meta: baja máx. 2 mm y sin daño.   Sí / No"),
             (578, "3. Flujos sin cruces",
              "Recorrer con un auto de juguete los 4 movimientos y contar los puntos donde se cruza con el otro flujo.",
              "Meta: 0 cruces en los 3 intentos.   Sí / No")]
    for y0, crit, met, res in filas:
        celda(c, 44, 140, y0, crit, negrita=True)
        celda(c, 140, 291, y0, met)
        celda(c, 401, 550, y0, res)
    renglones(c, 46, [673, 685],
              "Las rampas suben ~6 m reales en ~23 m (pendiente ~26 %); una vía real usa máx. 5–6 %. Además, el tablero de cartón "
              "puede ceder con peso: lo comprobaremos en la prueba 2.", 478)


def pagina2(c):
    c.setFillColorRGB(*AZUL)
    # H2 (retroalimentación): la escribe el equipo observador en clase -> en blanco
    filas = [(314, "Rampas muy empinadas (~26 %).",
              "La base no deja espacio para rampas largas; se priorizó que el puente entrara completo.",
              "Alargar las rampas hasta el borde de la base y poner un cartel con la pendiente real (5 %).",
              "Medir largo y altura de cada rampa y calcular la pendiente: menor que la del 100 %."),
             (379, "Los postes de luz no encienden; la maqueta no muestra cómo se ve de noche.",
              "Se hicieron solo decorativos, sin circuito.",
              "Instalar un LED blanco con pila de 3 V dentro de cada uno de los 4 postes.",
              "Encender y apagar 3 veces: los 4 LED prenden las 3 veces.")]
    for y0, *cols in filas:
        for (x0, x1), s in zip([(44, 168), (168, 267), (267, 409), (409, 550)], cols):
            celda(c, x0, x1, y0, s)
    renglones(c, 46, [474, 486],
              "LED en los postes: es lo que más se nota en la demostración (impacto), se hace en una clase con materiales baratos "
              "(viabilidad) y no obliga a rehacer la maqueta (recursos). Si la prueba 2 falla, primero reforzamos el puente.", 478)
    renglones(c, 46, [512], "Responsables: ______________  ·  Materiales: 4 LED, pila CR2032, cable, cinta  ·  Plazo: 1 semana", 478)


lector = PdfReader(ORIGEN)
escritor = PdfWriter()
for i, pagina in enumerate(lector.pages):
    capa = BytesIO()
    c = canvas.Canvas(capa, pagesize=(596, 842))
    (pagina1 if i == 0 else pagina2)(c)
    c.save()
    capa.seek(0)
    pagina.merge_page(PdfReader(capa).pages[0])
    escritor.add_page(pagina)
with open(DESTINO, "wb") as f:
    escritor.write(f)
print("Listo ->", DESTINO)
