# Soporte regulable para fichas y carteles

Soporte con **3 inclinaciones (60°, 45° y 30°)**, inspirado en la imagen de referencia.
El tablero gira sobre dos perillas (eje) y otras dos perillas lo traban en el ángulo elegido.

![armado](vista_armado.png)
![ángulos](vista_angulos.png)
![piezas](vista_piezas.png)

## Piezas y colores

| Pieza | Cantidad | Color | Archivo para imprimir |
|---|---|---|---|
| Base (marco de 72 × 70 × 2,4 mm con 4 ranuras) | 1 | Madera `#D9A366` | `1_base.stl` |
| Lateral (aleta de 3 mm con 1 agujero de giro + 3 de inclinación) | 2 | Azul `#1F5ABF` | `2_lateral_imprimir_x2.stl` |
| Tablero (63 × 58 mm, repisa con tope, 2 orejas con agujeros) | 1 | Blanco `#EDEDE6` | `3_tablero.stl` |
| Perilla (cabeza Ø 10 estriada + vástago Ø 4) | 4 | Amarillo `#FFCC1A` | `4_perilla_imprimir_x4.stl` |

## Cómo funciona

1. Las pestañas de cada lateral entran a presión en las ranuras de la base.
2. Dos perillas pasan por el **agujero de giro** del lateral y entran en la oreja del tablero: es el eje.
3. Se inclina el tablero y se meten las otras dos perillas en uno de los **3 agujeros de inclinación**:
   arriba = 60° (más vertical), medio = 45°, abajo = 30° (más inclinado).
4. La ficha se apoya en la repisa; el tope en rampa evita que resbale.

## Medidas

| Dato | Valor |
|---|---|
| Armado con perillas | **80 × 70 × 58,5 mm** (a 60°; límite 80 × 80 × 60) |
| Eje de giro | Y = 14, Z = 16 mm |
| Agujeros de inclinación | a 28 mm del eje, separados 7,3 mm |
| Perilla / agujero | Ø 4,0 / Ø 4,3 mm (0,15 mm de juego por lado) |
| Ficha que entra | hasta ~9 mm de grosor (pila de fichas) |
| Material | PLA, ~20 g |

## En Tinkercad (con colores)

Importa los 4 archivos (mm, 100 %) sin moverlos; entran armados a 45°:
`tinkercad_base_madera.stl` · `tinkercad_laterales_azul.stl` · `tinkercad_tablero_blanco.stl` · `tinkercad_perillas_amarillo.stl`.
Pinta cada uno con su color. Llevan 2 cubitos de 0,2 mm en las esquinas para alinearse;
para imprimir usa los archivos `1_` a `4_`.

## Prueba de ajuste

`prueba_agujeros.stl` (agujeros Ø 4,1 · 4,2 · 4,3 · 4,4) + `prueba_perilla.stl`.
Usa el diámetro en el que la perilla entra con presión suave y no se cae; si no es 4,3,
cambia `D_AGUJERO` en `generar_soporte_fichas.py` y vuelve a generar.

## Impresión (estimado en PrusaSlicer; verificar en Cura / Bambu Studio)

| Ajuste | Todas las piezas juntas |
|---|---|
| Impresora rápida (tipo Bambu), capa 0,20 | ~76 min · 20 g |
| Impresora lenta (50 mm/s), capa 0,28 | ~87 min · 22 g |
| Impresora lenta (50 mm/s), capa 0,20 | ~105 min (pasa los 90 min) |

Sin soportes: base plana, laterales acostados (agujeros redondos), tablero con la espalda
sobre la cama y perillas con la cabeza abajo.

## Regenerar

```bash
pip install trimesh shapely numpy scipy networkx mapbox_earcut manifold3d
python3 generar_soporte_fichas.py
```
