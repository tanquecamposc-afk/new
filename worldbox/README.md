# MUNDO·CAJA — simulador de dios 🌍

Sandbox de dios en pixel art inspirado en WorldBox. Es un solo archivo (`index.html`), sin dependencias: ábrelo en el navegador y listo. No necesita servidor.

Reemplaza al prototipo 3D anterior (Three.js). Ese dependía de `/game/vendor/...`, así que no cargaba al abrirlo como archivo, y la simulación era sobre todo números sin nada visible. Esta versión funciona sobre un mapa de casillas, como WorldBox: cada casilla tiene altura, bioma, árboles, minerales, cultivos, fuego y dueño.

## Qué pasa en el mundo

- **Reinos y ciudades.** Humanos, orcos, elfos y enanos fundan aldeas con ayuntamiento y bandera. Talan árboles, pican piedra, cosechan campos y llevan todo a su ciudad. Con esos recursos construyen casas, graneros, cuarteles, herrerías, templos, torres y puertos, y la población crece.
- **Caminos.** Cada edificio nuevo se une al ayuntamiento con un camino, y las ciudades hermanas también se conectan entre sí. Por los caminos se anda más rápido.
- **Territorio.** Cada ciudad reclama tierra a su alrededor. Las fronteras se dibujan con el color del reino.
- **Expansión por tierra y mar.** Cuando una ciudad se llena, manda colonos a fundar otra. Si no queda sitio en su isla y tiene puerto, los manda en barco a otras tierras.
- **Barcos.** Los puertos tienen barcos pesqueros que traen comida y barcos que llevan colonos o ejércitos a otras islas.
- **Comercio.** Las caravanas viajan entre ciudades del mismo reino o de reinos aliados y dejan oro. El oro sirve para mejorar a los soldados, pagar magos y construir templos.
- **Tecnologías con efecto real.** Con la cultura se descubren Agricultura, Carpintería, Navegación, Albañilería, Metalurgia, Arquería, Fortificaciones, Ingeniería y Magia. Cada una cambia algo: más cosechas, puertos, arqueros, magos que lanzan bolas de fuego y curan…
- **Diplomacia, guerra y rebeliones.** Los reinos firman alianzas, se declaran la guerra (también por mar) y hacen las paces. Los ejércitos derriban ayuntamientos y conquistan ciudades. Las ciudades lejanas, hambrientas o recién conquistadas pierden lealtad y pueden rebelarse para formar su propio reino.
- **Reyes, niveles y rasgos.** Cada reino tiene rey. Las criaturas suben de nivel y heredan rasgos.
- **Estaciones.** Primavera, verano, otoño e invierno. En otoño los árboles se ponen naranjas. En invierno nieva, los cultivos no crecen y los mares fríos se congelan (se puede caminar sobre el hielo).
- **Estados.** Las criaturas pueden arder, congelarse, enloquecer o contagiarse la plaga.
- **Naturaleza.** Los bosques se expanden, el fuego se propaga, la ceniza se recupera, la lava fluye y se enfría en roca, y los animales se reproducen y se cazan entre sí.
- **Día y noche**, con ventanas, fuego y lava iluminados.
- **Libro del mundo (📖).** Crónica de todo lo que pasa, estadísticas con gráfico de población por reino y 18 logros que se guardan en el navegador.

## Poderes

| Pestaña | Poderes |
|---|---|
| ⛰️ Terreno | Inspeccionar, subir/bajar tierra, montaña, océano, aplanar, limpiar, hielo, camino, sequía |
| 🌳 Biomas | 13 biomas (pradera, bosque, desierto, permafrost, encantado, setas, corrupto, infernal…), plantar árboles, minerales |
| 🏰 Civilizaciones | Soltar humanos, orcos, elfos y enanos; declarar guerra, paz, alianza; bendición, maldición, plaga; rebelión, locura, **mano divina** (agarra criaturas y lánzalas), empujón, borrar criaturas; **poseer** una criatura |
| 🐑 Criaturas | Ovejas, vacas, pollos, conejos, lobos, osos, cocodrilos, zombis, esqueletos, nigromante, demonios, Greg, Crabzilla, dragón, gusano de arena, OVNI, monolito y 4 hormigas que transforman el terreno (negra: montañas, azul: agua, verde: bosque, roja: lava) |
| 💥 Destrucción | Fuego, rayo, bomba, nuclear, meteorito, lluvia de meteoritos, volcán, agujero negro, napalm, bomba de racimo, tsunami, ventisca, bomba de hielo, rayo de la muerte, invasión alien, portal demoníaco, tornado, terremoto, lava, lluvia ácida, lluvia |
| 📜 Leyes y eras | 8 eras (paz, guerra, caos, hielo, infierno, corrupción…) y 6 leyes del mundo |

Los poderes de pincel usan el tamaño elegido a la derecha de la barra.

## Controles

| Acción | Control |
|---|---|
| Usar poder | Clic izquierdo (mantén para pintar) |
| Mover cámara | Clic derecho y arrastrar, WASD / flechas, o arrastrar con 🔎 Inspeccionar |
| Zoom | Rueda, Q / E, o pellizcar en el móvil |
| Pausa / velocidad | Espacio, 1–4 |
| Reinos / libro del mundo | K / H |
| Mano divina | Mantén pulsado sobre criaturas, arrastra y suelta en movimiento para lanzarlas |
| Poseer | WASD para moverte, F para atacar, Esc para soltar |

En el menú ☰ puedes crear un mundo nuevo (continentes, archipiélago, pangea u océano vacío), guardar y cargar en el navegador, y abrir el juego en `about:blank`.
