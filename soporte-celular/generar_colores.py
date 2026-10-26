"""
Archivos para importar en Tinkercad ya en su lugar y con un color por pieza:
  tinkercad_base_azul.stl, tinkercad_respaldo_rojo.stl, tinkercad_botones_amarillo.stl
Cada archivo lleva 2 cubitos de 0,2 mm en esquinas opuestas para que Tinkercad
los centre igual y las tres partes entren alineadas. (Para imprimir se usan
1_base.stl y 2_respaldo.stl, que no tienen cubitos.)
"""
import os
import numpy as np
import trimesh

exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "generar_soporte.py"))
     .read().split("# ------------------------------------------------------- PRUEBA DE AJUSTE")[0])

botones = trimesh.util.concatenate([cilindro(x, y, 3, D_BOTON, H_BOTON) for x, y in BOTONES])
placa = placa_base()                                # base sin botones
partes = {"base_azul": placa, "respaldo_rojo": respaldo, "botones_amarillo": botones}
todo = trimesh.util.concatenate(list(partes.values()))
lo, hi = todo.bounds
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "salida")
for n, m in partes.items():
    anclas = [trimesh.creation.box(bounds=[p, p + 0.2]) for p in (lo, hi - 0.2)]
    trimesh.util.concatenate([m] + anclas).export(os.path.join(out, f"tinkercad_{n}.stl"))
    print(n, np.round(m.extents, 1))
print("caja común:", np.round(hi - lo, 1))

# vista previa con los mismos colores (respaldo levantado para ver los botones)
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d.art3d import Poly3DCollection
L = np.array([0.4, -0.6, 0.7]); L /= np.linalg.norm(L)
r = respaldo.copy(); r.apply_translation([0, 0, 25])
fig = plt.figure(figsize=(7, 7), dpi=110); ax = fig.add_subplot(111, projection="3d")
for m, c in ((placa, (0.10, 0.35, 0.85)), (botones, (1.0, 0.82, 0.05)), (r, (0.85, 0.12, 0.12))):
    f = np.clip(np.array(c) * (0.45 + 0.55 * np.clip(m.face_normals @ L, 0, 1))[:, None] + 0.05, 0, 1)
    ax.add_collection3d(Poly3DCollection(m.triangles, facecolors=f, edgecolors=(0, 0, 0, 0.2), linewidths=0.3))
ax.set_xlim(-8, 68); ax.set_ylim(-4, 72); ax.set_zlim(0, 76); ax.set_box_aspect((1, 1, 1))
ax.view_init(24, -58); ax.set_axis_off()
plt.savefig(os.path.join(os.path.dirname(out), "vista_colores.png"), bbox_inches="tight")
