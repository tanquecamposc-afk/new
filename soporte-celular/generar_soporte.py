"""
Reto 14 · Soporte desmontable para celular — versión final (alternativa B).
Unión tipo LEGO: la base tiene 4 botones redondos y cada respaldo tiene
2 agujeros redondos en su pie que encajan a presión.

2 piezas, sin pegamento ni tornillos:
  1) BASE: placa sólida de 57 x 76 x 3 mm con muesca para el cable y 4 botones (Ø 4,8 x 3,5 mm).
  2) RESPALDO: una pieza con dos laterales en V (repisa a 25° + apoyo a 65°)
     unidos por una barra trasera; 4 agujeros Ø 5,0 x 4 mm en los pies.
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


def cuna(x, y, z, lx, ly, lz, alta="atras"):
    """Cuña de Tinkercad girada. alta="atras": sube del frente hacia atrás
    (cara inclinada mirando al frente). alta="frente": al revés."""
    if alta == "atras":
        perfil = Polygon([(y, z), (y + ly, z), (y + ly, z + lz)])
    else:
        perfil = Polygon([(y, z), (y + ly, z), (y, z + lz)])
    m = trimesh.creation.extrude_polygon(perfil, lx)
    m.vertices = m.vertices[:, [2, 0, 1]] + [x, 0, 0]
    m.fix_normals()
    return m


BOTONES = [(8, 7), (8, 22), (56, 7), (56, 22)]   # centros (x, y)

# ------------------------------------------------------------------- BASE
# Placa sólida (más peso y rigidez) con una muesca adelante para el enchufe del cargador.
def placa_base():
    return B.difference([caja(3.5, 0, 0, 57, 76, 3),        # placa sólida
                         caja(24, -1, -1, 16, 23, 5)])      # muesca del cable


base = placa_base()
base = B.union([base] + [cilindro(x, y, 3, D_BOTON, H_BOTON) for x, y in BOTONES])


# --------------------------------------------------------------- RESPALDO
# Una sola pieza: dos laterales unidos por una barra trasera a ras del piso.
def lateral(cx):
    """Perfil en V: la repisa baja hacia atrás a 25° y forma 90° con el
    apoyo de 65°; el celular se calza solo en la esquina de la V."""
    x = cx - 2                                          # placa de 4 mm centrada en cx
    return [caja(x, 0, 3, 4, 29, 20),                   # cuerpo
            cuna(x, 0, 23, 4, 15, 7, alta="frente"),    # repisa inclinada (25°)
            cuna(x, 0, 28.2, 4, 4, 4, alta="frente"),   # tope delantero (apoyado en la repisa)
            cuna(x, 15, 23, 4, 14, 30, alta="atras"),   # apoyo inclinado (65°)
            caja(cx - 4.5, 0, 3, 9, 29, 6)]             # pie de 9 mm


solidos = lateral(8) + lateral(56) + [caja(3.5, 21, 3, 57, 8, 6)]   # barra trasera
agujeros = [cilindro(x, y, 2, D_AGUJERO, H_AGUJERO + 1) for x, y in BOTONES]
respaldo = B.difference([B.union(solidos)] + agujeros)


# ------------------------------------------------------- PRUEBA DE AJUSTE
# Bloque con 3 agujeros (Ø 4,9 · 5,0 · 5,1) acostados, igual que en el respaldo
# impreso, + placa con 3 botones Ø 4,8 (los botones salen de pie, igual que en la base).
def cilindro_y(cx, y, cz, d, largo):
    c = trimesh.creation.cylinder(d / 2, largo, sections=64)
    c.apply_transform(trimesh.transformations.rotation_matrix(np.pi / 2, [1, 0, 0]))
    c.apply_translation([cx, y + largo / 2, cz])
    return c


probeta = caja(0, 0, 0, 36, 10, 10)
for i, d in enumerate((4.9, 5.0, 5.1)):
    cx = 6 + i * 12
    probeta = B.difference([probeta, cilindro_y(cx, -1, 5, d, 5)])      # 4 mm de profundidad
    for k in range(i + 1):                                                # 1, 2 y 3 rayas
        probeta = B.difference([probeta, caja(cx - 2 + k * 1.6, 3, 9.4, 0.8, 5, 1)])
botones_prueba = B.union([caja(0, 0, 0, 36, 12, 2)] +
                         [cilindro(6 + i * 12, 6, 2, D_BOTON, H_BOTON) for i in range(3)])

# --------------------------------------------------------------- chequeos
ens = trimesh.util.concatenate([base, respaldo])
print("Armado:", ens.extents.round(2), "mm (límite 80 x 80 x 60)")
for n, m in (("base", base), ("respaldo", respaldo), ("probeta", probeta), ("botones", botones_prueba)):
    print(f"  {n:9s} estanco={m.is_watertight} {m.extents.round(2)} vol={m.volume/1000:.2f} cm3")
x = B.intersection([base, respaldo])
print("  choque base/respaldo:", 0 if len(x.faces) == 0 else round(x.volume, 3), "mm3")

# --------------------------------------------------------------- exportar
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "salida")
os.makedirs(out, exist_ok=True)
for f in os.listdir(out):
    os.remove(os.path.join(out, f))
ens.export(os.path.join(out, "soporte_armado.stl"))
base.export(os.path.join(out, "1_base.stl"))
# Respaldo acostado sobre su espalda (cara trasera plana, Y = 29):
# imprime más rápido, sin soportes, y las capas quedan en la dirección fuerte.
acostar = trimesh.transformations.rotation_matrix(-np.pi / 2, [1, 0, 0])
r = respaldo.copy()
r.apply_transform(acostar)
r.apply_translation(-r.bounds[0])
r.export(os.path.join(out, "2_respaldo.stl"))
probeta.export(os.path.join(out, "prueba_agujeros.stl"))   # ya está en posición de impresión
botones_prueba.export(os.path.join(out, "prueba_botones.stl"))

colores = {"base": (0.13, 0.36, 0.65), "respaldo": (0.96, 0.62, 0.10)}
with open(os.path.join(out, "soporte_color.obj"), "w") as f:
    off = 1
    for k, m in (("base", base), ("respaldo", respaldo)):
        c = colores[k]
        f.write(f"o {k}\n")
        for v in m.vertices:
            f.write(f"v {v[0]:.3f} {v[1]:.3f} {v[2]:.3f} {c[0]} {c[1]} {c[2]}\n")
        for fc in m.faces + off:
            f.write(f"f {fc[0]} {fc[1]} {fc[2]}\n")
        off += len(m.vertices)
print("Listo ->", out)
