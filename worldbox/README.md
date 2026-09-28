# MUNDO·CAJA — simulador de dios 🌍

Sandbox de dios en pixel art inspirado en WorldBox. Es un solo archivo (`index.html`), sin dependencias: ábrelo en el navegador y listo. No necesita servidor.

Reemplaza al prototipo 3D anterior (Three.js). Ese dependía de `/game/vendor/...`, así que no cargaba al abrirlo como archivo, y la simulación era sobre todo números sin nada visible. Esta versión funciona sobre un mapa de casillas, como WorldBox: cada casilla tiene altura, bioma, árboles, minerales, cultivos, fuego y dueño.

## Qué pasa en el mundo

- **Reinos y ciudades.** Humanos, orcos, elfos y enanos fundan aldeas con ayuntamiento y bandera. Talan árboles, pican piedra, cosechan campos y llevan todo a su ciudad. Con los recursos construyen casas y torres de vigilancia, y la población crece.
- **Territorio.** Cada ciudad reclama tierra a su alrededor. Las fronteras se dibujan con el color del reino.
- **Expansión.** Cuando una ciudad se llena, manda colonos a fundar otra.
- **Diplomacia y guerra.** Los reinos vecinos firman alianzas, se declaran la guerra y hacen las paces. En guerra, cada ciudad arma un ejército que marcha contra la ciudad enemiga más cercana, derriba su ayuntamiento y la conquista. Un reino sin ciudades desaparece.
- **Reyes, niveles y rasgos.** Cada reino tiene rey (con corona). Las criaturas suben de nivel matando y heredan rasgos como *Fuerte*, *Rápido* o *Longevo*.
- **Naturaleza.** Los bosques se expanden, el fuego se propaga por árboles y casas, la ceniza se recupera, la lava fluye y se enfría en roca. Ovejas y vacas se reproducen, y lobos y osos las cazan.
- **Día y noche**, con las ventanas y el fuego iluminados de noche.

## Poderes

| Pestaña | Poderes |
|---|---|
| ⛰️ Terreno | Inspeccionar, subir/bajar tierra, montaña, océano, aplanar, limpiar |
| 🌳 Biomas | 13 biomas (pradera, bosque, desierto, permafrost, encantado, setas, corrupto, infernal…), plantar árboles, minerales |
| 🏰 Civilizaciones | Soltar humanos, orcos, elfos y enanos; declarar guerra, paz, alianza; bendición, maldición, plaga; **poseer** una criatura |
| 🐑 Criaturas | Ovejas, vacas, lobos, osos, zombis, demonios, Greg, Crabzilla, OVNI, monolito |
| 💥 Destrucción | Fuego, rayo, bomba, nuclear, meteorito, tornado, terremoto, lava, lluvia ácida, lluvia |
| 📜 Leyes y eras | 8 eras (paz, guerra, caos, hielo, infierno, corrupción…) y 6 leyes del mundo |

Los poderes de pincel usan el tamaño elegido a la derecha de la barra.

## Controles

| Acción | Control |
|---|---|
| Usar poder | Clic izquierdo (mantén para pintar) |
| Mover cámara | Clic derecho y arrastrar, WASD / flechas, o arrastrar con 🔎 Inspeccionar |
| Zoom | Rueda, Q / E, o pellizcar en el móvil |
| Pausa / velocidad | Espacio, 1–4 |
| Reinos / crónica | K / H |
| Poseer | WASD para moverte, F para atacar, Esc para soltar |

En el menú ☰ puedes crear un mundo nuevo (continentes, archipiélago, pangea u océano vacío), guardar y cargar en el navegador, y abrir el juego en `about:blank`.
