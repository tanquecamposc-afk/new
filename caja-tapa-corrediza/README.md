# Reto 9 · Caja de repuestos escolares con tapa corrediza (versión 2)

3 piezas que se arman y desarman a mano, sin pegamento:
**cuerpo** + **tapa corrediza** + **divisor extraíble**.

![piezas](vista_abierta.png)

Ejes como en Tinkercad: **X = largo · Y = ancho · Z = alto**. Medidas en mm.
Posición = distancia desde la esquina de la caja (Regla en la esquina 0, 0).

## Pieza 1 · Cuerpo

| Paso | Figura | Tipo | Tamaño X × Y × Z | Posición X ; Y ; Z |
|---|---|---|---|---|
| 1 | Caja exterior | Sólido | 70 × 45 × 25 | 0 ; 0 ; 0 |
| 2 | Hueco interior | Agujero | 66 × 41 × 24 | 2 ; 2 ; 2 |
| — | **Agrupar 1 + 2** | | | |
| 3a | Riel | Sólido | 1,5 × 1 × 18 | 32,5 ; 2 ; 2 |
| 3b | Riel | Sólido | 1,5 × 1 × 18 | 36 ; 2 ; 2 |
| 3c | Riel | Sólido | 1,5 × 1 × 18 | 32,5 ; 42 ; 2 |
| 3d | Riel | Sólido | 1,5 × 1 × 18 | 36 ; 42 ; 2 |
| — | **Agrupar con lo anterior** | | | |
| 4 | Guías de la tapa | Agujero | 70,2 × 43,4 × 2 | −1 ; 0,8 ; 21 |
| 5 | Entrada delantera | Agujero | 3,5 × 41 × 5 | −1 ; 2 ; 21 |
| — | **Agrupar todo → cuerpo** | | | |

## Pieza 2 · Tapa

| Paso | Figura | Tipo | Tamaño X × Y × Z | Posición X ; Y ; Z |
|---|---|---|---|---|
| 6 | Placa | Sólido | 68,9 × 42,8 × 1,5 | 0 ; 1,1 ; 21,25 |
| 7 | Tirador | Sólido | 3 × 25 × 1,5 | 1 ; 10 ; 22,75 |
| — | **Agrupar 6 + 7 → tapa** | | | |

## Pieza 3 · Divisor

| Paso | Figura | Tipo | Tamaño X × Y × Z | Posición X ; Y ; Z |
|---|---|---|---|---|
| 8 | Placa | Sólido | 1,6 × 40,6 × 18 | 34,2 ; 2,2 ; 2 |
| 9 | Hueco para el dedo | Agujero, cilindro acostado en X, Ø 12, largo 4 | 4 × 12 × 12 | 33 ; 16,5 ; 14 |
| — | **Agrupar 8 + 9 → divisor** | | | |

## Holguras (prueba de ajuste)

| Unión | Medida | Juego |
|---|---|---|
| Tapa en guías (ancho) | guía 43,4 · tapa 42,8 | 0,3 mm por lado |
| Tapa en guías (alto) | guía 2 · tapa 1,5 | 0,25 mm arriba y abajo |
| Tapa al fondo | guía hasta 69,2 · tapa 68,9 | 0,3 mm |
| Divisor entre rieles | ranura 2 · divisor 1,6 | 0,2 mm por lado |
| Divisor a lo ancho | interior 41 · divisor 40,6 | 0,2 mm por lado |

La tapa queda atrapada 0,9 mm en cada guía y el divisor 0,8 mm en cada par de rieles.

## Cambios respecto a la versión 1 (registro de cambios)

| Cambio | Antes | Ahora | Por qué |
|---|---|---|---|
| Grosor de la tapa | 2 mm | 1,5 mm | con 2 mm en guía de 2 mm no había juego y se trababa |
| Profundidad de guía | 1,5 mm | 1,2 mm | la pared quedaba de 0,5 mm; ahora 0,8 mm, más resistente |
| Holgura lateral | 0,5 mm | 0,3 mm | con guía de 1,2 mm, 0,5 mm dejaba la tapa casi suelta |
| Divisor | fijo | extraíble con rieles | se arma y desarma; permite un solo compartimiento grande |
| Tirador | a 4 mm del borde | en el borde (1 mm) | se empuja mejor con el dedo |

## Impresión (estimado en PrusaSlicer, verificar en Cura / Bambu Studio)

| Ajuste | 3 piezas juntas |
|---|---|
| Capa 0,28 mm · relleno 15 % · 2 paredes | **~88 min · 25 g** |
| Capa 0,20 mm · relleno 15 % · 2 paredes | ~101 min (pasa el límite) |
| Prueba de ajuste (`prueba_guia` + `prueba_tapa`) | ~12 min · 3 g |

Velocidades usadas: 50 mm/s paredes, 80 mm/s relleno. En Bambu Studio sale bastante menos.
Sin soportes: el cuerpo boca arriba, la tapa con el tirador arriba y el divisor acostado.

## Pruebas sugeridas (objetivo D)

| Criterio | Prueba | Se cumple si… |
|---|---|---|
| Tapa desliza | abrir y cerrar 20 veces | no se traba ni se sale por arriba |
| Tapa no se cae | caja boca abajo y sacudir | la tapa no se sale |
| Divisor desmontable | sacar y poner 10 veces | entra a mano y no se cae solo |
| Dos compartimientos | poner minas en uno y clips en otro | no se mezclan con la caja cerrada |
| Medidas | regla o vernier | 70 × 45 × 25 mm ± 0,5 |
| Tiempo | captura de Cura | ≤ 90 min |
