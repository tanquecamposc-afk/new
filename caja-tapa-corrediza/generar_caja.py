"""
Reto 9 · Caja de repuestos escolares con tapa corrediza.
Reproduce exactamente las figuras del paso a paso de Tinkercad (README.md).
Ejes como en Tinkercad: X = largo, Y = ancho, Z = alto. Unidades: mm.
"""
import os
import trimesh

B = trimesh.boolean


def caja(x, y, z, lx, ly, lz):
    """Caja con esquina en (x, y, z) y medidas lx, ly, lz."""
    return trimesh.creation.box(bounds=[[x, y, z], [x + lx, y + ly, z + lz]])


# Paso 1-2: cuerpo macizo menos el hueco interior
cuerpo = B.difference([caja(0, 0, 0, 70, 45, 25), caja(2, 2, 2, 66, 41, 24)])
# Paso 3: divisor central (llega a 20 mm para no rozar la tapa)
cuerpo = B.union([cuerpo, caja(34, 2, 2, 2, 41, 18)])
# Paso 4: ranura de las guías (laterales + fondo + entrada delantera)
cuerpo = B.difference([cuerpo, caja(-1, 0.5, 21, 70.5, 44, 2)])
# Paso 5: abertura delantera para meter la tapa con su relieve
cuerpo = B.difference([cuerpo, caja(-1, 2, 21, 3.5, 41, 5)])

# Paso 6-7: tapa 69 x 43 x 1.5 (0.25 mm de juego arriba y abajo) + relieve
tapa = B.union([caja(0, 1, 21.25, 69, 43, 1.5), caja(4, 10, 22.75, 3, 25, 1.5)])
tapa.apply_translation([0, 0, -21.25])  # apoyada en z = 0 para imprimir

out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "salida")
cuerpo.export(os.path.join(out, "caja_cuerpo.stl"))
tapa.export(os.path.join(out, "caja_tapa.stl"))
tapa.apply_translation([0, 0, 21.25])
trimesh.util.concatenate([cuerpo, tapa]).export(os.path.join(out, "caja_ensamblada.stl"))
for n, m in (("cuerpo", cuerpo), ("tapa", tapa)):
    print(n, m.is_watertight, m.extents.round(2), round(m.volume / 1000, 2), "cm3")
choque = B.intersection([cuerpo, tapa])
print("interferencia:", 0 if len(choque.faces) == 0 else round(choque.volume, 3))
