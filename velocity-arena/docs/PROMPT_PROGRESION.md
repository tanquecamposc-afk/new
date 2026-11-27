# Prompt de la fase 1.0 — controles de PC, más coches y progresión

> Prompt de trabajo escrito antes de implementar. Todo lo que se marque como hecho debe
> estar verificado con una prueba real (Playwright/Godot), no supuesto.

## Objetivo

Convertir VELOCITY ARENA (versión web dentro de Claude) en un juego con progresión:
controles de PC al estilo de los jugadores competitivos, más coches originales y agresivos,
personalización, tienda, ruleta diaria y pase de temporada con recompensas. Todo original:
sin nombres, coches, logotipos ni assets de juegos comerciales.

## 1. Controles de PC (esquema "Pro PC", por defecto)

Esquema de teclado + ratón habitual en el género entre jugadores de PC:

| Acción | Tecla |
|---|---|
| Acelerar / marcha atrás | W / S |
| Girar | A / D |
| En el aire: cabeceo | W (morro abajo) / S (morro arriba) |
| **Saltar** (doble salto / esquive) | **Clic derecho** |
| **Turbo** | **Clic izquierdo** |
| Derrape / giro aéreo libre | Shift izquierdo |
| Giro aéreo izquierda / derecha | Q / E |
| Cámara de balón (on/off) | Espacio |
| Menú | Esc |

- Otros esquemas seleccionables: **Clásico** (Shift salta, Espacio turbo) y **Personalizado**
  (reasignar cada acción pulsando la tecla o botón del ratón).
- El clic derecho no debe abrir el menú contextual dentro del juego. El ratón solo controla
  el coche cuando no hay ningún panel abierto.
- El mando no cambia (A saltar, B turbo, X derrape, RT/LT acelerar/frenar, LB/RB giro aéreo).

## 2. Coches nuevos (originales, deportivos y agresivos)

Generados con la carrocería continua de `tools/blender/build_fleet.py`. Reutilizan las tres
familias de hitbox existentes para que nadie gane ventaja por pagar:

| Coche | Estilo | Hitbox |
|---|---|---|
| Striker | Coupé en cuña muy agresivo, alerón alto, tomas grandes | Equilibrada (Velocity X) |
| Specter | Hiperdeportivo furtivo, cabina adelantada, aletas | Larga y baja (Lancer) |
| Nova GT | GT ancho y musculoso, capó largo, difusor enorme | Larga y baja (Lancer) |

## 3. Economía y progresión

- **Créditos (CR)**: se empieza con 500. Por partida terminada (≥ 60 s jugados):
  victoria 150, empate 90, derrota 60, +25 por gol propio.
- **XP y pase de temporada**: 30 niveles, 1000 XP por nivel. XP por partida: victoria 300,
  empate 220, derrota 180, +50 por gol, +2 por segundo jugado (máx. 300).
  Cada nivel da una recompensa que se reclama a mano: créditos, cosméticos, potenciadores
  y coches (Nova GT en el nivel 30).
- **Bonus**: *Potenciador de XP +50 %* y *Créditos ×2*, por número de partidas.
  Los bonus son de progresión, **no** de juego: en línea nadie corre más ni salta más por
  haber pagado (sería injusto con los amigos).
- **Ruleta diaria**: una tirada por día (fecha local). Premios con pesos: 50/100/200/500 CR,
  bote de 1000 CR (raro), potenciador de XP, créditos ×2 o un cosmético al azar no poseído.
- **Tienda**: catálogo fijo (coches, acabados, colores de acento, llantas, estelas de turbo)
  + **ofertas del día**: 4 artículos rotativos con −25 %, iguales para todos ese día.

## 4. Personalización (garaje)

Coche, acabado de pintura (metálico, mate, perla, cromo), color de acento, color de
llantas y estela de turbo. El color principal sigue siendo el del equipo (azul/naranja)
para que se lea bien en partida. En línea, los cosméticos viajan en la presencia de la sala
y el anfitrión los muestra a todos.

## 5. Guardado

- Siempre en el navegador del jugador (`localStorage`).
- Además, si el visor puede escribir en la base de datos del artefacto (dueño/editores),
  se sincroniza en `data/users/<id>/save/profile` (privado de cada persona) para no perder
  el progreso entre dispositivos. Los amigos con enlace de solo lectura guardan en su navegador.
- Limitación honesta: es un juego local; un jugador con conocimientos podría editar su
  guardado. No hay dinero real ni compras con dinero real.

## 6. Pruebas obligatorias

- Controles: clic derecho salta, clic izquierdo turbo, Shift derrapa, Espacio cambia cámara;
  reasignar una acción funciona y persiste.
- Comprar un artículo descuenta créditos y lo marca como poseído; no se puede comprar sin saldo.
- Ruleta: una tirada por día; la segunda se bloquea; el premio se aplica.
- Pase: terminar una partida da XP/créditos; subir de nivel permite reclamar una vez.
- Los coches nuevos cargan (con la CSP del visor) y se pueden equipar.
- Regresión: solo contra bots y multijugador de 2 pestañas siguen funcionando.
