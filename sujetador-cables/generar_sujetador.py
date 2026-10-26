"""
Reto 11 · Sujetador de cables para escritorio con cuña ajustable.

2 piezas, sin pegamento:
  1) BASE: bloque 50 x 40 x 20 mm con canal para el cable (10 mm de ancho),
     túnel horizontal para la cuña y 2 agujeros para tornillo (o cinta doble faz).
  2) CUÑA: barra de 72 mm que se afina de 10,5 a 1,5 mm (pendiente 1:8 = 7°)
     con un tirador que hace de tope. Al empujarla, su cara inclinada baja
     sobre el cable y lo aprieta; la fricción la deja fija (7° < ángulo de fricción del PLA).
Rango: cables de 3 a 8 mm de diámetro.

Ejes y posiciones como en Tinkercad (Regla en la esquina de la base):
X = largo (dirección en que se mueve la cuña), Y = ancho (dirección del cable), Z = alto.
"""
import os
import numpy as np
import trimesh
from shapely.geometry import Polygon

B = trimesh.boolean
JUEGO = 0.2                 # holgura por lado cuña/túnel (elegir con la probeta)
PEND = 9 / 72               # 1:8


def caja(x, y, z, lx, ly, lz):
    return trimesh.creation.box(bounds=[[x, y, z], [x + lx, y + ly, z + lz]])


def cilindro(cx, cy, z, d, h):
    c = trimesh.creation.cylinder(d / 2, h, sections=48)
    c.apply_translation([cx, cy, z + h / 2])
    return c


def cuna_x(x, y, z, lx, ly, lz):
    """Cuña de Tinkercad: alta en x (talón) y baja en x + lx (punta)."""
    m = trimesh.creation.extrude_polygon(Polygon([(x, z), (x + lx, z), (x, z + lz)]), ly)
    m.vertices = m.vertices[:, [0, 2, 1]] + [0, y, 0]
    m.fix_normals()
    return m


# ------------------------------------------------------------------- BASE
base = B.union([caja(0, 0, 0, 50, 40, 3),             # 1 pestaña para atornillar
                caja(0, 8, 0, 50, 24, 20)])           # 2 bloque
base = B.difference([base,
                     caja(10, -1, 4, 10, 42, 17),                         # 3 canal del cable
                     caja(-1, 20 - 6 - JUEGO, 4.5, 52, 12 + 2 * JUEGO, 11),    # 4 túnel de la cuña
                     cilindro(40, 4, -1, 4, 5),                           # 5 agujero tornillo
                     cilindro(40, 36, -1, 4, 5)])                         # 6 agujero tornillo

# -------------------------------------------- CUÑA (en posición de impresión)
cuna_imp = B.union([caja(0, 0, 0, 72, 12, 1.5),       # 7 lomo plano (va contra el techo del túnel)
                    cuna_x(0, 0, 1.5, 72, 12, 9),     # 8 rampa: talón 10,5 mm, punta 1,5 mm
                    caja(-4, -3, 0, 4, 18, 14.5)])    # 9 tirador / tope


def cuna_armada(x_punta):
    """La cuña dada vuelta dentro del túnel, con la punta en x_punta."""
    m = cuna_imp.copy()
    m.apply_transform(trimesh.transformations.rotation_matrix(np.pi, [1, 0, 0]))
    m.apply_translation([x_punta - 72, 26, 15.5])      # lomo contra el techo (z = 15,5)
    return m


def hueco_sobre_cable(x_punta, x=15):
    """Espacio libre entre la cuña y el fondo del canal en el centro del canal."""
    s = x_punta - x                                     # distancia desde la punta
    return 15.5 - 4 - (1.5 + PEND * s)


# -------------------------------------------------------- PRUEBA DE AJUSTE
probeta = caja(0, 0, 0, 54, 10, 16)
for i, j in enumerate((0.1, 0.2, 0.3)):
    cx = 9 + i * 18
    probeta = B.difference([probeta, caja(cx - 6 - j, -1, 3, 12 + 2 * j, 12, 11)])
    for k in range(i + 1):
        probeta = B.difference([probeta, caja(cx - 2 + k * 1.6, 3, 15.4, 0.8, 4, 1)])
barra_prueba = caja(0, 0, 0, 40, 12, 6)

if __name__ == "__main__":
    print("Base:", base.extents.round(2), "estanca", base.is_watertight, "vol", round(base.volume / 1000, 2), "cm3")
    print("Cuña:", cuna_imp.extents.round(2), "estanca", cuna_imp.is_watertight, "vol", round(cuna_imp.volume / 1000, 2), "cm3")
    print("Cuerpos: base", len(base.split()), "cuña", len(cuna_imp.split()))
    for xp in (31, 40, 50, 60, 72):
        c = cuna_armada(xp)
        x = B.intersection([base, c])
        print(f"  punta en x={xp}: hueco sobre el cable {hueco_sobre_cable(xp):.1f} mm, "
              f"choque {0 if len(x.faces) == 0 else round(x.volume, 2)} mm3, largo total {c.bounds[1][0] - min(0, c.bounds[0][0]):.0f} mm")
    # cables de prueba: con la cuña apretando, ¿toca sin aplastar?
    for d in (3, 5, 8):
        xp = 15 + ((15.5 - 4 - d) - 1.5) / PEND          # posición donde el hueco = d
        cable = trimesh.creation.cylinder(d / 2, 60, sections=48)
        cable.apply_transform(trimesh.transformations.rotation_matrix(np.pi / 2, [1, 0, 0]))
        cable.apply_translation([15, 20, 4 + d / 2])
        print(f"  cable Ø{d}: la cuña aprieta con la punta en x={xp:.0f} mm "
              f"(posible: {30 <= xp <= 72})")

    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "salida")
    os.makedirs(out, exist_ok=True)
    base.export(os.path.join(out, "1_base.stl"))
    cuna_imp.export(os.path.join(out, "2_cuna.stl"))
    trimesh.util.concatenate([base, cuna_armada(45)]).export(os.path.join(out, "sujetador_armado.stl"))
    probeta.export(os.path.join(out, "prueba_tuneles.stl"))
    barra_prueba.export(os.path.join(out, "prueba_barra.stl"))
    print("Listo ->", out)
