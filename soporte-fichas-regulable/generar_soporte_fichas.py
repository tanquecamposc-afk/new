"""
Soporte regulable para fichas / carteles (inspirado en la imagen de referencia).

Piezas (cada tipo en su color):
  1) BASE            72 x 70 x 3 mm sólida, con 4 ranuras para los laterales.
  2) LATERALES (x2)  aletas de 4 mm con 1 agujero de giro y 3 agujeros de
                     inclinación (60°, 45° y 30°); 2 pestañas que entran en la base.
  3) TABLERO         placa de 65 x 54 mm con repisa y tope para la ficha y dos
                     orejas con agujero de giro y agujero de traba.
  5) REPISA         se encaja en el borde de abajo del tablero y sostiene la ficha.
  4) PERILLAS (x4)   2 hacen de eje de giro y 2 traban el ángulo: se meten por
                     el agujero del lateral y entran en la oreja del tablero.

Ejes como en Tinkercad: X = ancho, Y = fondo (Y = 0 es el frente), Z = alto. mm.
"""
import os
import numpy as np
import trimesh
from shapely.geometry import Point, Polygon, box as rect
from shapely.ops import unary_union

B = trimesh.boolean
D_PERNO, D_AGUJERO = 4.0, 4.3          # 0,15 mm de juego por lado (ajustar con la probeta)
PIVOTE = np.array([14.0, 14.0])        # (y, z) del eje de giro
R_TRABA = 28.0                         # distancia eje -> agujero de traba
ANGULOS = (60, 45, 30)
L_TABLERO = 48.0
W = 72.0                               # ancho de la base (con perillas: W + 8 = 80 mm)
T_BASE, T_LAT, T_OREJA, T_PLACA = 3.0, 3.0, 3.0, 2.0
JL = 0.4                               # espacio entre lateral y oreja del tablero


def caja(x, y, z, lx, ly, lz):
    return trimesh.creation.box(bounds=[[x, y, z], [x + lx, y + ly, z + lz]])


def cil_x(x0, largo, y, z, d, secciones=48):
    """Cilindro acostado a lo largo de X, desde x0, centrado en (y, z)."""
    c = trimesh.creation.cylinder(d / 2, largo, sections=secciones)
    c.apply_transform(trimesh.transformations.rotation_matrix(np.pi / 2, [0, 1, 0]))
    c.apply_translation([x0 + largo / 2, y, z])
    return c


def placa_yz(poligono, x0, grosor):
    """Extruye un perfil (y, z) a lo largo de X."""
    m = trimesh.creation.extrude_polygon(poligono, grosor)
    m.vertices = m.vertices[:, [2, 0, 1]] + [x0, 0, 0]
    m.fix_normals()
    return m


def traba(ang):
    a = np.radians(ang)
    return PIVOTE + R_TRABA * np.array([np.cos(a), np.sin(a)])


# ----------------------------------------------------------- 1) BASE
TABS = [(14, 10), (34, 10)]            # (y inicio, largo) de las pestañas de cada lateral
base = caja(0, 0, 0, W, 70, T_BASE)
huecos = []                                                 # base sólida, como en la foto
for x in (0, W - T_LAT):
    for y, l in TABS:
        huecos.append(caja(x - 0.15, y - 0.15, -1, T_LAT + 0.3, l + 0.3, 5))
base = B.difference([base] + huecos)

# ------------------------------------------------------- 2) LATERAL
perfil = unary_union([Point(*PIVOTE).buffer(7, 48)] +
                     [Point(*traba(a)).buffer(6, 48) for a in ANGULOS] +
                     [rect(6, 0, 48, 12)]).convex_hull
perfil = perfil.intersection(rect(0, T_BASE, 80, 80))     # apoya sobre la base


def lateral(x0):
    cuerpo = B.union([placa_yz(perfil, x0, T_LAT)] +
                     [caja(x0, y, 0.2, T_LAT, l, T_BASE) for y, l in TABS])          # pestañas (entran 0,2 mm en el lateral)
    agujeros = [cil_x(x0 - 1, T_LAT + 2, *PIVOTE, D_AGUJERO)] + \
               [cil_x(x0 - 1, T_LAT + 2, *traba(a), D_AGUJERO) for a in ANGULOS]
    return B.difference([cuerpo] + agujeros)


lat_izq, lat_der = lateral(0), lateral(W - T_LAT)

# ------------------------------------------------------- 3) TABLERO
# Sistema propio: u = a lo largo del tablero (y), w = hacia atrás (z).
# Se imprime parado sobre el borde de la repisa (u = -6 sobre la cama).
X0 = T_LAT + JL                        # borde izquierdo del tablero
ANCHO = W - 2 * X0


def prisma_uw(puntos, x0, lx):
    return placa_yz(Polygon(puntos), x0, lx)


def tablero_local():
    """Placa delante del eje y orejas detrás (no estorban a las fichas)."""
    placa = caja(X0, -6, -7, ANCHO, L_TABLERO + 6, T_PLACA)          # w de -7 a -5
    orejas = []
    for x in (X0, W - X0 - T_OREJA):
        perfil_o = unary_union([Point(0, 0).buffer(6, 48), Point(R_TRABA, 0).buffer(6, 48)]).convex_hull
        perfil_o = unary_union([perfil_o, rect(-6, -7, R_TRABA + 6, 0)])
        orejas.append(placa_yz(perfil_o, x, T_OREJA))
    cuerpo = B.union([placa] + orejas)                               # tablero sólido
    agujeros = []
    for x in (X0 - 1, W - X0 - T_OREJA - 1):
        agujeros += [cil_x(x, T_OREJA + 2, 0, 0, D_AGUJERO), cil_x(x, T_OREJA + 2, R_TRABA, 0, D_AGUJERO)]
    return B.difference([cuerpo] + agujeros)


# Repisa: pieza aparte que abraza el borde inferior del tablero (canal de 2,2 mm
# para la placa de 2 mm) y sostiene la ficha. Entra entre las dos orejas.
RX0, RX1 = X0 + T_OREJA + 0.3, W - X0 - T_OREJA - 0.3


def repisa_local():
    perfil_r = unary_union([
        rect(-8, -18, -6, -3.4),             # piso de la repisa
        rect(-6, -4.9, 0, -3.4),             # pared trasera del canal (detrás de la placa)
        rect(-6, -8.5, -3, -7.1),            # pared delantera del canal
        Polygon([(-6, -18), (-6, -15), (-3, -18)]),   # tope en rampa (45°)
    ])
    return placa_yz(perfil_r, RX0, RX1 - RX0)


rep_local = repisa_local()


def a_posicion(m_local, ang):
    a = np.radians(ang)
    M = np.eye(4)
    M[:3, :3] = [[1, 0, 0], [0, np.cos(a), np.sin(a)], [0, np.sin(a), -np.cos(a)]]
    M[:3, 3] = [0, PIVOTE[0], PIVOTE[1]]
    m = m_local.copy()
    m.apply_transform(M)
    m.fix_normals()
    return m


tab_local = tablero_local()


def tablero_armado(ang):
    return a_posicion(tab_local, ang)


def repisa_armada(ang):
    return a_posicion(rep_local, ang)


# ------------------------------------------------------- 4) PERILLA
L_VASTAGO = T_LAT + JL + T_OREJA - 0.2


def perilla():
    cabeza = trimesh.creation.cylinder(5, 4, sections=48)             # Ø 10 x 4
    cabeza.apply_translation([0, 0, 2])
    vastago = trimesh.creation.cylinder(D_PERNO / 2, L_VASTAGO, sections=48)
    vastago.apply_translation([0, 0, 4 + L_VASTAGO / 2])
    p = B.union([cabeza, vastago])
    for k in range(12):                                                # estrías para agarrarla
        e = trimesh.creation.cylinder(0.7, 5, sections=12)
        e.apply_translation([5 * np.cos(k * np.pi / 6), 5 * np.sin(k * np.pi / 6), 2])
        p = B.difference([p, e])
    return p


per = perilla()


def perillas_armadas(ang):
    """2 en el eje de giro y 2 en el agujero de traba del ángulo elegido."""
    out = []
    for (y, z) in (PIVOTE, traba(ang)):
        for lado in (-1, 1):
            p = per.copy()
            if lado == -1:
                p.apply_transform(trimesh.transformations.rotation_matrix(np.pi / 2, [0, 1, 0]))
                p.apply_translation([-4, y, z])
            else:
                p.apply_transform(trimesh.transformations.rotation_matrix(-np.pi / 2, [0, 1, 0]))
                p.apply_translation([W + 4, y, z])
            out.append(p)
    return trimesh.util.concatenate(out)


# --------------------------------------------------- PRUEBA DE AJUSTE
probeta = caja(0, 0, 0, 36, 10, 4)
for i, d in enumerate((4.1, 4.2, 4.3, 4.4)):
    c = trimesh.creation.cylinder(d / 2, 6, sections=48)
    c.apply_translation([5 + i * 8.7, 5, 2])
    probeta = B.difference([probeta, c])

if __name__ == "__main__":
    for ang in ANGULOS:
        t = tablero_armado(ang)
        r = repisa_armada(ang)
        choques = [B.intersection([t, m]) for m in (base, lat_izq, lat_der)] + \
                  [B.intersection([r, m]) for m in (base, lat_izq, lat_der, t)]
        v = sum(c.volume for c in choques if len(c.faces))
        pe = perillas_armadas(ang)
        vp = sum(c.volume for c in [B.intersection([pe, m]) for m in (base, lat_izq, lat_der, t)] if len(c.faces))
        todo = trimesh.util.concatenate([base, lat_izq, lat_der, t, r, pe])
        print(f"{ang}°: choque tablero={v:.2f} mm3  perillas={vp:.2f} mm3  "
              f"tamaño={np.round(todo.extents, 1)}  z mín tablero={t.bounds[0][2]:.1f}")
    for n, m in (("base", base), ("lateral", lat_izq), ("tablero", tab_local), ("repisa", rep_local), ("perilla", per), ("probeta", probeta)):
        print(f"  {n:8s} estanco={m.is_watertight} cuerpos={len(m.split())} {np.round(m.extents, 1)} vol={m.volume/1000:.2f} cm3")

    # ------------------------------------------------------------ exportar
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "salida")
    os.makedirs(out, exist_ok=True)
    for f in os.listdir(out):
        os.remove(os.path.join(out, f))

    # Piezas para imprimir (orientación sin soportes)
    base.export(os.path.join(out, "1_base.stl"))
    lat = lat_izq.copy()                                   # acostado: agujeros verticales y redondos
    lat.apply_transform(trimesh.transformations.rotation_matrix(np.pi / 2, [0, 1, 0]))
    lat.apply_translation(-lat.bounds[0])
    lat.export(os.path.join(out, "2_lateral_imprimir_x2.stl"))
    t = tab_local.copy()                                   # cara delantera sobre la cama, orejas arriba
    t.apply_translation(-t.bounds[0])
    t.export(os.path.join(out, "3_tablero.stl"))
    r = rep_local.copy()                                   # apoyada en su piso, paredes hacia arriba
    r.apply_transform(trimesh.transformations.rotation_matrix(np.pi / 2, [1, 0, 0]))
    r.apply_translation(-r.bounds[0])
    r.export(os.path.join(out, "5_repisa.stl"))
    p = per.copy()
    p.apply_translation(-p.bounds[0])
    p.export(os.path.join(out, "4_perilla_imprimir_x4.stl"))
    probeta.export(os.path.join(out, "prueba_agujeros.stl"))
    pp = per.copy(); pp.apply_translation(-pp.bounds[0]); pp.export(os.path.join(out, "prueba_perilla.stl"))

    # Archivos para Tinkercad, numerados en el orden de importación y con su color.
    # ARMADO: cada pieza en su lugar (tablero a 45°).  DESPIECE: las piezas separadas
    # y ordenadas, para mostrarlas. Cada archivo de un mismo grupo lleva 2 cubitos de
    # 0,2 mm en las esquinas: así todos tienen la misma caja y, con Alinear
    # (izquierda + adelante + abajo), quedan exactos en su lugar.
    t45, r45, p45 = tablero_armado(45), repisa_armada(45), perillas_armadas(45)
    armado = [("1_base_madera", base),
              ("2_laterales_azul", trimesh.util.concatenate([lat_izq, lat_der])),
              ("3_tablero_blanco", t45),
              ("4_repisa_verde", r45),
              ("5_perillas_amarillo", p45)]

    def mover(m, d):
        m = m.copy(); m.apply_translation(d); return m
    perillas_sep = [mover(q, [(-14 if q.centroid[0] < W / 2 else 14), 0, 0]) for q in p45.split()]
    despiece = [("1_base_madera", base),
                ("2_laterales_azul", trimesh.util.concatenate([mover(lat_izq, [-12, 0, 0]), mover(lat_der, [12, 0, 0])])),
                ("3_tablero_blanco", mover(t45, [0, 0, 45])),
                ("4_repisa_verde", mover(r45, [0, -30, 18])),
                ("5_perillas_amarillo", trimesh.util.concatenate(perillas_sep))]

    for grupo, partes in (("armado", armado), ("despiece", despiece)):
        lo, hi = trimesh.util.concatenate([m for _, m in partes]).bounds
        for n, m in partes:
            anclas = [trimesh.creation.box(bounds=[q, q + 0.2]) for q in (lo, hi - 0.2)]
            trimesh.util.concatenate([m] + anclas).export(os.path.join(out, f"tinkercad_{grupo}_{n}.stl"))
    todo = trimesh.util.concatenate([m for _, m in armado])
    todo.export(os.path.join(out, "soporte_armado_45.stl"))
    todo.export(os.path.join(out, "tinkercad_TODO_JUNTO_un_color.stl"))   # respaldo: una sola pieza
    print("Listo ->", out)
