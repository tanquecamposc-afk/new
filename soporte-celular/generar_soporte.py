"""
Reto 14 · Soporte desmontable para celular — versión final (alternativa B).
Unión tipo LEGO: la base tiene 4 botones redondos y cada respaldo tiene
2 agujeros redondos en su pie que encajan a presión.

3 piezas, sin pegamento ni tornillos:
  1) BASE: marco en U de 64 x 76 x 3 mm con 4 botones (Ø 4,8 x 3,5 mm).
  2) y 3) RESPALDOS: 2 piezas iguales (imprimir 2 veces) con tope delantero,
     repisa a 20 mm de altura y apoyo inclinado a 65°. Placa de 4 mm, pie de 9 mm
     con 2 agujeros Ø 5,0 x 4 mm.
La repisa elevada deja el centro libre para enchufar el cargador.

Ejes y posiciones como en Tinkercad (Regla en la esquina de la base):
X = ancho, Y = fondo (Y = 0 es el frente), Z = alto. Unidades: mm.
"""
import os
import numpy as np
import trimesh
from shapely.geometry import Polygon

B = trimesh.boolean
D_BOTON, H_BOTON = 4.8, 3.5        # como LEGO: botón de 4,8 mm
D_AGUJERO, H_AGUJERO = 5.0, 4.0    # 0,1 mm de juego por lado (ajustar con la probeta)


def caja(x, y, z, lx, ly, lz):
    return trimesh.creation.box(bounds=[[x, y, z], [x + lx, y + ly, z + lz]])


def cilindro(cx, cy, z, d, h):
    """Cilindro vertical: centro (cx, cy), desde z hasta z + h."""
    c = trimesh.creation.cylinder(d / 2, h, sections=64)
    c.apply_translation([cx, cy, z + h / 2])
    return c


def cuna(x, y, z, lx, ly, lz):
    """Cuña con la cara inclinada hacia el frente y la cara recta atrás."""
    perfil = Polygon([(y, z), (y + ly, z), (y + ly, z + lz)])
    m = trimesh.creation.extrude_polygon(perfil, lx)
    m.vertices = m.vertices[:, [2, 0, 1]] + [x, 0, 0]
    m.fix_normals()
    return m


BOTONES = [(8, 7), (8, 22), (56, 7), (56, 22)]   # centros (x, y)

# ------------------------------------------------------------------- BASE
base = B.difference([caja(0, 0, 0, 64, 76, 3),
                     caja(17, -1, -1, 30, 70, 5),            # ventana del cable (abierta adelante)
                     caja(3.5, 30, -1, 9, 40, 5),            # ventanas para ahorrar material
                     caja(51.5, 30, -1, 9, 40, 5)])
base = B.union([base] + [cilindro(x, y, 3, D_BOTON, H_BOTON) for x, y in BOTONES])


# --------------------------------------------------------------- RESPALDO
def respaldo(cx):
    x = cx - 2                                    # placa de 4 mm centrada en cx
    cuerpo = B.union([caja(x, 0, 3, 4, 3, 26),        # tope delantero (labio)
                      caja(x, 3, 3, 4, 26, 20),       # cuerpo bajo la repisa
                      cuna(x, 15, 23, 4, 14, 30),     # apoyo inclinado a 65°
                      caja(cx - 4.5, 0, 3, 9, 29, 6)])  # pie de 9 mm
    agujeros = [cilindro(cx, y, 2, D_AGUJERO, H_AGUJERO + 1) for y in (7, 22)]
    return B.difference([cuerpo] + agujeros)


izq, der = respaldo(8), respaldo(56)

# ------------------------------------------------------- PRUEBA DE AJUSTE
# placa con 3 agujeros (Ø 4,9 · 5,0 · 5,1) + placa con 3 botones Ø 4,8
probeta = caja(0, 0, 0, 36, 12, 5)
for i, d in enumerate((4.9, 5.0, 5.1)):
    cx = 6 + i * 12
    probeta = B.difference([probeta, cilindro(cx, 6, -1, d, 5)])          # agujero ciego de 4 mm
    for k in range(i + 1):                                                 # 1, 2 y 3 rayas
        probeta = B.difference([probeta, caja(cx - 2 + k * 1.6, 0.6, 4.4, 0.8, 1.6, 1)])
botones_prueba = B.union([caja(0, 0, 0, 36, 12, 2)] +
                         [cilindro(6 + i * 12, 6, 2, D_BOTON, H_BOTON) for i in range(3)])

# --------------------------------------------------------------- chequeos
ens = trimesh.util.concatenate([base, izq, der])
print("Armado:", ens.extents.round(2), "mm (límite 80 x 80 x 60)")
for n, m in (("base", base), ("respaldo", izq), ("probeta", probeta), ("botones", botones_prueba)):
    print(f"  {n:9s} estanco={m.is_watertight} {m.extents.round(2)} vol={m.volume/1000:.2f} cm3")
for n, r in (("izq", izq), ("der", der)):
    x = B.intersection([base, r])
    print(f"  choque base/{n}:", 0 if len(x.faces) == 0 else round(x.volume, 3), "mm3")

# --------------------------------------------------------------- exportar
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "salida")
os.makedirs(out, exist_ok=True)
for f in os.listdir(out):
    os.remove(os.path.join(out, f))
ens.export(os.path.join(out, "soporte_armado.stl"))
base.export(os.path.join(out, "1_base.stl"))
r = izq.copy()
r.apply_translation(-r.bounds[0])          # se imprime de pie, como va armado
r.export(os.path.join(out, "2_respaldo_imprimir_x2.stl"))
probeta.export(os.path.join(out, "prueba_agujeros.stl"))
botones_prueba.export(os.path.join(out, "prueba_botones.stl"))

colores = {"base": (0.13, 0.36, 0.65), "respaldo": (0.96, 0.62, 0.10)}
with open(os.path.join(out, "soporte_color.obj"), "w") as f:
    off = 1
    for k, m in (("base", base), ("respaldo", izq), ("respaldo", der)):
        c = colores[k]
        f.write(f"o {k}\n")
        for v in m.vertices:
            f.write(f"v {v[0]:.3f} {v[1]:.3f} {v[2]:.3f} {c[0]} {c[1]} {c[2]}\n")
        for fc in m.faces + off:
            f.write(f"f {fc[0]} {fc[1]} {fc[2]}\n")
        off += len(m.vertices)
print("Listo ->", out)
