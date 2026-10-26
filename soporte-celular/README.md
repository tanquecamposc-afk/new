# Reto 14 · Soporte desmontable para celular (versión final)

Tres piezas que **encajan como LEGO**: la base tiene 4 botones redondos y cada
respaldo tiene 2 agujeros en su pie. Se arma a presión y se desarma tirando hacia arriba.

![piezas](vista_piezas.png) ![con celular](vista_con_celular.png)

## Ficha técnica

| Dato | Valor |
|---|---|
| Piezas | 3: base + 2 respaldos iguales |
| Medida armado | **64 × 76 × 53 mm** (límite 80 × 80 × 60) |
| Unión | 4 botones Ø 4,8 × 3,5 mm en agujeros Ø 5,0 × 4 mm (0,1 mm de juego por lado) |
| Ángulo del celular | 65° respecto a la mesa |
| Canal del celular | 12 mm (celular con funda gruesa) |
| Repisa | a 20 mm de la base: deja el centro libre para enchufar el cargador |
| Posición | vertical u horizontal |
| Material | PLA, ~13–15 g |
| Soportes de impresión | no necesita |

## Paso a paso en Tinkercad

Regla en la esquina de la base. X = ancho, Y = fondo (Y = 0 es el frente), Z = alto.
Posición = esquina de la figura (lo que marca la Regla).

### Pieza 1 · Base

| Paso | Figura | Tipo | Tamaño X × Y × Z | Posición X ; Y ; Z |
|---|---|---|---|---|
| 1 | Placa | Caja sólida | 64 × 76 × 3 | 0 ; 0 ; 0 |
| 2 | Ventana del cable | Caja agujero | 30 × 70 × 5 | 17 ; −1 ; −1 |
| 3 | Ventana izquierda | Caja agujero | 9 × 40 × 5 | 3,5 ; 30 ; −1 |
| 4 | Ventana derecha | Caja agujero | 9 × 40 × 5 | 51,5 ; 30 ; −1 |
| — | **Agrupar 1 a 4** | | | |
| 5 | 4 botones | Cilindro sólido Ø 4,8 | 4,8 × 4,8 × 3,5 | (5,6 ; 4,6 ; 3) · (5,6 ; 19,6 ; 3) · (53,6 ; 4,6 ; 3) · (53,6 ; 19,6 ; 3) |
| — | **Agrupar todo → base** | | | |

### Piezas 2 y 3 · Respaldo (hacer uno y duplicarlo con Ctrl + D)

| Paso | Figura | Tipo | Tamaño X × Y × Z | Posición X ; Y ; Z |
|---|---|---|---|---|
| 6 | Tope delantero | Caja sólida | 4 × 3 × 26 | 6 ; 0 ; 3 |
| 7 | Cuerpo | Caja sólida | 4 × 26 × 20 | 6 ; 3 ; 3 |
| 8 | Apoyo inclinado | Cuña sólida, cara inclinada hacia el frente | 4 × 14 × 30 | 6 ; 15 ; 23 |
| 9 | Pie | Caja sólida | 9 × 29 × 6 | 3,5 ; 0 ; 3 |
| 10 | 2 agujeros | Cilindro agujero Ø 5 | 5 × 5 × 5 | (5,5 ; 4,5 ; 2) · (5,5 ; 19,5 ; 2) |
| — | **Agrupar 6 a 10 → respaldo** | | | |
| 11 | Segundo respaldo | Duplicar (Ctrl + D) y mover | igual | X = 51,5 (el pie empieza en 51,5) |

Cuña del paso 8: la parte alta va atrás (Y = 29) y la cara inclinada mira al frente,
hacia el celular. Gírala con las flechas curvas hasta que quede así.

## Prueba de ajuste (imprimir primero, ~13 min)

`prueba_agujeros.stl` tiene 3 agujeros de Ø 4,9 · 5,0 · 5,1 mm (1, 2 y 3 rayas) y
`prueba_botones.stl` tiene 3 botones Ø 4,8. Encaja la placa de botones en cada agujero:

| Resultado | Qué hacer |
|---|---|
| El de 2 rayas (Ø 5,0) entra con presión y no se suelta | dejar Ø 5,0 |
| Solo entra el de 3 rayas | cambiar los agujeros del respaldo a Ø 5,1 |
| El de 1 raya ya queda firme | cambiar los agujeros del respaldo a Ø 4,9 |

## Impresión (estimado en PrusaSlicer a 50 mm/s; verificar en Cura / Bambu Studio)

| Ajuste | Base + 2 respaldos |
|---|---|
| Capa 0,28 mm · relleno 15 % · 2 paredes | **~60 min · 13 g** |
| Capa 0,20 mm · relleno 15 % · 2 paredes | ~85 min · 15 g |

Base acostada; respaldos **de pie** (como van armados) para que los agujeros salgan bien redondos.

## Dos alternativas (objetivo B)

| Criterio | A: base + respaldo con pestañas (versión 1) | B: base + 2 respaldos tipo LEGO (elegida) |
|---|---|---|
| Medidas | 68 × 62 × 56,6 mm | 64 × 76 × 53 mm |
| Tiempo (capa 0,20) | ~91 min, pasa el límite | ~85 min |
| Unión | 2 pestañas de 4 mm, se sueltan fácil | 4 botones redondos, encaje firme |
| Cargar el celular | el enchufe choca con la base | repisa a 20 mm, centro libre |
| Estabilidad | base corta | base de 76 mm de fondo, centro de masa del celular a 35 mm del borde trasero |
| Prueba de ajuste | probeta de ranuras | probeta de botones y agujeros |

![alternativa A](alternativa_A_vista.png)

## Criterios de éxito y pruebas (objetivo D)

| Criterio | Prueba | Se cumple si… |
|---|---|---|
| Medidas | regla o vernier | todo ≤ 80 × 80 × 60 mm |
| Tiempo | captura de Cura / Bambu | ≤ 90 min |
| Encaje tipo LEGO | armar y desarmar 20 veces | entra a presión y no se afloja |
| Estabilidad | celular vertical y horizontal, tocar la pantalla 20 veces | no se vuelca ni se mueve |
| Carga | enchufar el cargador con el celular puesto | el enchufe entra sin forzar |
| Funda | probar con funda gruesa | entra en el canal de 12 mm |
