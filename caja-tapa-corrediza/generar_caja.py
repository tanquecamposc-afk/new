"""
Reto 9 · Caja de repuestos escolares con tapa corrediza (versión 2).

3 piezas que se arman y desarman a mano:
  1) CUERPO   70 x 45 x 25 mm, paredes y piso de 2 mm, guías para la tapa
              y rieles para el divisor.
  2) TAPA     corrediza, entra por el frente y corre por las guías.
  3) DIVISOR  extraíble, encaja entre dos pares de rieles -> 2 compartimientos.
Prueba de ajuste: un tramo corto del cuerpo + un tramo de tapa (imprimir primero).

Ejes como en Tinkercad: X = largo, Y = ancho, Z = alto. Unidades: mm.
Todas las figuras son cajas/cilindros con la misma posición y medida del README.
"""
import os
import numpy as np
import trimesh

B = trimesh.boolean


def caja(x, y, z, lx, ly, lz):
    """Caja con su esquina en (x, y, z) y medidas lx, ly, lz (como en Tinkercad)."""
    return trimesh.creation.box(bounds=[[x, y, z], [x + lx, y + ly, z + lz]])


def cilindro_x(x, y, z, largo, d):
    """Cilindro acostado a lo largo de X, centro de la cara en (x, y, z)."""
    c = trimesh.creation.cylinder(d / 2, largo, sections=48)
    c.apply_transform(trimesh.transformations.rotation_matrix(np.pi / 2, [0, 1, 0]))
    c.apply_translation([x + largo / 2, y, z])
    return c


# ------------------------------------------------------------------ CUERPO
cuerpo = B.difference([caja(0, 0, 0, 70, 45, 25),          # 1 sólido
                       caja(2, 2, 2, 66, 41, 24)])          # 2 hueco
rieles = [caja(32.5, 2, 2, 1.5, 1, 18), caja(36, 2, 2, 1.5, 1, 18),     # 3 rieles
          caja(32.5, 42, 2, 1.5, 1, 18), caja(36, 42, 2, 1.5, 1, 18)]
cuerpo = B.union([cuerpo] + rieles)
cuerpo = B.difference([cuerpo,
                       caja(-1, 0.8, 21, 70.2, 43.4, 2),     # 4 guías (1,2 mm de profundidad)
                       caja(-1, 2, 21, 3.5, 41, 5)])         # 5 entrada delantera

# -------------------------------------------------------------------- TAPA
tapa = B.union([caja(0, 1.1, 21.25, 68.9, 42.8, 1.5),        # 6 placa
                caja(1, 10, 22.75, 3, 25, 1.5)])             # 7 tirador

# ----------------------------------------------------------------- DIVISOR
divisor = B.difference([caja(34.2, 2.2, 2, 1.6, 40.6, 18),   # 8 placa
                        cilindro_x(33, 22.5, 20, 4, 12)])    # 9 hueco para el dedo

# ----------------------------------------------------------- PRUEBA AJUSTE
probeta = B.difference([caja(0, 0, 0, 15, 45, 7),
                        caja(-1, 2, 1.5, 17, 41, 7),
                        caja(-1, 0.8, 3, 17, 43.4, 2)])
tapa_prueba = caja(0, 0, 0, 15, 42.8, 1.5)

# ---------------------------------------------------------------- chequeos
piezas = {"cuerpo": cuerpo, "tapa": tapa, "divisor": divisor}
ens = trimesh.util.concatenate(list(piezas.values()))
print("Armado:", ens.extents.round(2), "mm (límite 80 x 80 x 60)")
for n, m in piezas.items():
    print(f"  {n:8s} estanco={m.is_watertight} {m.extents.round(2)} vol={m.volume/1000:.2f} cm3")
for a, b in (("cuerpo", "tapa"), ("cuerpo", "divisor"), ("tapa", "divisor")):
    x = B.intersection([piezas[a], piezas[b]])
    print(f"  choque {a}/{b}:", 0 if len(x.faces) == 0 else round(x.volume, 3), "mm3")

# ---------------------------------------------------------------- exportar
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "salida")
os.makedirs(out, exist_ok=True)
for f in os.listdir(out):
    os.remove(os.path.join(out, f))
ens.export(os.path.join(out, "caja_armada.stl"))
cuerpo.export(os.path.join(out, "1_cuerpo.stl"))
t = tapa.copy(); t.apply_translation([0, 0, -21.25]); t.export(os.path.join(out, "2_tapa.stl"))
d = divisor.copy()                                  # acostado para imprimir sin soporte
d.apply_transform(trimesh.transformations.rotation_matrix(np.pi / 2, [0, 1, 0]))
d.apply_translation(-d.bounds[0]); d.export(os.path.join(out, "3_divisor.stl"))
probeta.export(os.path.join(out, "prueba_guia.stl"))
tapa_prueba.export(os.path.join(out, "prueba_tapa.stl"))
print("Listo ->", out)
