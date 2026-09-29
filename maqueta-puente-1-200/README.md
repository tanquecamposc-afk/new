# Maqueta paso a desnivel – modelo 3D escala 1/200

Modelo 3D de la maqueta del intercambio vial (puente E–O sobre avenida N–S),
listo para importar en **Tinkercad**. Unidades: **milímetros**.

| | Real | Maqueta 1/200 |
|---|---|---|
| Terreno | 100 m × 120 m | 500 × 600 mm |
| Cada avenida (2 calzadas + berma) | 22 m | 110 mm |
| Carril | 4,25 m | ~21 mm |
| Berma central | 5 m | 25 mm |
| Gálibo bajo el puente | 5 m | 25 mm |
| Rasante del puente | 6 m | 30 mm |
| Vano del puente | 26 m | 130 mm |
| Árboles | ~8 m | ~40 mm |
| Postes de luz | 10 m | 50 mm |

Incluye: plancha base, asfalto, 4 lotes marrones con esquinas curvas, carriles de
giro, 4 islas con arbustos y poste de alumbrado, bermas centrales con árboles,
líneas de carril, cruces peatonales (cebra), rampas en terraplén, puente de dos
tableros con barandas y 10 autos.

## Archivos (`salida/`)

- `maqueta_color.obj` (+ `.mtl`) – **modelo completo con colores**.
- `maqueta_color.zip` – el mismo OBJ + MTL juntos.
- `piezas_stl/*.stl` – una pieza por color (asfalto, lote, berma, copa, auto…).
- `maqueta_completa.stl` – todo en una sola pieza, sin color.

## Cómo importarlo en Tinkercad

1. **Import** → elige `maqueta_color.obj`. Deja la escala en 100 % y unidades en mm.
   En el panel de color activa **Multicolor** si aparece.
2. Si los colores no aparecen: importa cada archivo de `piezas_stl/` y
   píntalo con su color. Cada STL lleva dos cubitos de 0,2 mm en esquinas
   opuestas para que todas las piezas entren alineadas; al final puedes borrarlos.
3. La maqueta mide 500 × 600 mm: en **Edit Grid** pon la plancha de trabajo en
   por lo menos 600 × 600 mm.

## Regenerar / modificar

```bash
pip install trimesh shapely numpy scipy networkx mapbox_earcut
python3 generar_modelo.py
```

Las medidas están en metros reales al inicio de `generar_modelo.py`
(`H_PUENTE`, `BORDE_VIA`, `R_ESQUINA`, etc.).
