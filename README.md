# 🕹 ARCADE NEXO

Treinta y cuatro juegos hechos a mano en **HTML5 + Canvas + JavaScript puro**. Sin dependencias, sin librerías, sin assets externos y sin conexión a internet: todos los gráficos se dibujan por código y todo el sonido se genera en tiempo real con WebAudio.

## ▶ Cómo jugar

Abre `index.html` en cualquier navegador moderno y elige un juego. No necesita servidor ni instalación.

Cada juego tiene su botón **🕹 Arcade** arriba a la izquierda para volver a la portada.

### 📦 Versión de un solo archivo

`arcade.html` es el arcade **entero** (portada y los treinta y cuatro juegos) empaquetado en un único archivo, sin CSS ni JS externos. Sirve para cuando solo puedes usar una página suelta: mandarlo por correo, subirlo a cualquier sitio o abrirlo desde una memoria USB.

Se genera a partir de los archivos de `juegos/`, que siguen siendo la fuente de verdad:

```bash
node construir-arcade.js
```

Cada juego queda aislado en su propia pantalla: su CSS se prefija con el selector de su contenedor y su JS se envuelve en una función donde `document`, `addEventListener` y `Arcade.bucle` están acotados a esa pantalla, así que ni los IDs ni las teclas se pisan entre juegos. **Si tocas un juego, vuelve a lanzar el script** para regenerar `arcade.html`.

## 🎮 Los juegos

| Juego | Género | De qué va |
|---|---|---|
| 🏰 [NEXO Tower Defense](juegos/nexo-tower-defense.html) | Estrategia | 12 torres mejorables, 3 mapas y 40 oleadas hasta el Coloso del Vacío |
| 👻 [Comecocos](juegos/comecocos.html) | Arcade | El laberinto clásico de 244 cocos, con 4 fantasmas de IA propia |
| 🌻 [Plantas vs Zombis](juegos/plantas-vs-zombies.html) | Defensa | 8 plantas, 5 tipos de zombi y 20 oleadas sobre el césped |
| 💣 [Minas](juegos/minas.html) | Casino | Destapa gemas, esquiva minas y retírate a tiempo (fichas ficticias) |
| 🧩 [Block Blast](juegos/block-blast.html) | Puzle | Encaja piezas en un 8x8 y revienta filas y columnas con combos |
| 🐍 [Serpiente Neón](juegos/serpiente.html) | Arcade | Snake con fruta dorada, rocas y modo fantasma |
| ✈ [Aviator](juegos/aviator.html) | Casino | Juego de tipo *crash*: cobra antes de que el avión se vaya volando |
| 🎱 [8 Ball Pool](juegos/8-ball-pool.html) | Deportes | Billar con física real, efecto y rival controlado por la máquina |
| ⚽ [Rumble Stars](juegos/rumble-stars.html) | Arena | Fútbol de arena: lanza bichos al campo y empuja el balón |
| ⛏ [Mining Tycoon](juegos/mining-tycoon.html) | Tycoon | Cuatro minas con moneda propia: del carbón del valle a la singularita del Vacío |
| 📦 [Cofres Minecraft](juegos/cofres-minecraft.html) | Cajas | Abre cofres con ruleta, colecciona objetos y fúndelos para subir de rareza |
| 🍪 [Galletas](juegos/cookie-clicker.html) | Incremental | Pica la galleta, monta un imperio y caza las galletas doradas |
| 🏍 [Moto X3M](juegos/moto-x3m.html) | Carreras | Suspensión en las dos ruedas, rampas que lanzan y vueltas en el aire |
| 📈 [Money Market](juegos/money-market.html) | Simulación | Velas, volumen, SMA y RSI; largos, cortos y apalancamiento con liquidación |
| 🧠 [Spartahoppers](juegos/spartahoppers.html) | Memoria | Fichas de Esparta con repetición espaciada SM-2 y combos |
| 🃏 [Blackjack](juegos/blackjack.html) | Casino | 21 con zapato de 6 barajas: doblar, dividir y seguro |
| 🎡 [Ruleta](juegos/ruleta.html) | Casino | Ruleta europea de un solo cero con tapete completo |
| ♠ [Texas Hold'em](juegos/poker-texas.html) | Casino | Póker contra tres rivales con evaluador de siete cartas |
| 🀄 [Bacarrá](juegos/bacara.html) | Casino | Punto y Banca con la tabla oficial de tercera carta |
| 🎲 [Dados](juegos/dados-craps.html) | Casino | Craps con línea de pase, odds sin ventaja de casa y campo |
| 🐔 [Chicken+](juegos/chicken.html) | Riesgo | Cruza la carretera paso a paso y retírate antes del coche |
| 🗼 [Spire+](juegos/spire.html) | Riesgo | Nueve pisos de losetas: acierta la segura y sube el multiplicador |
| 🛗 [Limbo+](juegos/limbo.html) | Riesgo | Fija un objetivo y mira si el ascensor lo alcanza |
| 🎣 [Big Bass Crash](juegos/big-bass-crash.html) | Riesgo | Crash de pesca con tres cañas independientes |
| 🔻 [Plinko](juegos/plinko.html) | Riesgo | Bolas por un bosque de clavos, tres riesgos y hasta 16 filas |
| 🛹 [Subway Surfers](juegos/subway-surfers.html) | Corredor | Tres vías en falso 3D: trenes, vallas, monedas e imán |
| 🟢 [Slope](juegos/slope.html) | Corredor | Una bola que no frena por un tobogán de neón infinito |
| 🕸 [Stickman Hook](juegos/stickman-hook.html) | Física | Péndulos de cuerda: cuanto más abajo sueltas, más lejos llegas |
| 🟩 [Paper.io 2](juegos/paper-io.html) | Arena | Conquista territorio rodeándolo, y no dejes que te corten el rastro |
| 🏃 [Vex](juegos/vex.html) | Plataformas | Tres actos de precisión con salto en pared, pinchos y sierras |
| 🌀 [Tunnel Rush](juegos/tunnel-rush.html) | Corredor | Un túnel de 16 sectores que gira y cambia de sentido |
| 🍬 [Cut the Rope](juegos/cut-the-rope.html) | Puzle | Corta cuerdas, coge las tres estrellas y dale de comer a Ñam |
| 🏀 [Basket Random](juegos/basket-random.html) | Deportes | Un botón, dos muñecos y unas reglas que cambian cada punto |
| 🏎 [Smash Karts](juegos/smash-karts.html) | Arena | Cuatro karts, misiles, minas y turbo. Solo queda uno |

---

### 👻 Comecocos

Laberinto de 28x31 con los **244 cocos** del original y túneles laterales que teletransportan.

- **⚪ Coco** 10 pts · **🔵 Coco de poder** 50 pts y los fantasmas huyen.
- Comerte fantasmas asustados encadena **200 → 400 → 800 → 1600** puntos.
- **🍒 Fruta** bajo la casa de los fantasmas a los 70 y 170 cocos; su valor sube cada nivel.
- **Vida extra** a los 10 000 puntos.
- Cada fantasma persigue distinto: 🔴 va directo a ti, 🩷 apunta 4 casillas por delante,
  🩵 te rodea usando la posición del rojo y 🟠 se acobarda cuando te acercas.
  Alternan fases de **dispersión** y **persecución**.
- **Controles:** flechas / `WASD`, deslizar el dedo en móvil, `Espacio` para pausar.

### 🌻 Plantas vs Zombis

Cinco calles, nueve casillas y 20 oleadas. Los **☀️ soles** caen del cielo o los producen los girasoles: haz clic para recogerlos.

| Planta | Coste | Qué hace |
|---|---|---|
| 🌻 Girasol | 50 | Produce 25 soles cada 12 s |
| 🌱 Lanza guisantes | 100 | Dispara sin parar |
| 🧱 Nuez | 50 | Muro con muchísima vida |
| 🥔 Patamina | 25 | Se arma en 12 s y explota al contacto |
| ❄️ Hielo guisante | 175 | Dispara y congela |
| 🌿 Repetidora | 200 | Dos guisantes por disparo |
| 🍒 Cereza bomba | 150 | Explosión enorme en 3x3 |
| 🌶️ Jalapeño | 125 | Quema la fila entera |

Zombis: **normal**, **con cono**, **con cubo**, **corredor** y el **GARGANTÚA** de las oleadas 10 y 20.
Cada fila tiene un **cortacésped** que la arrasa entera… pero solo una vez. Teclas `1`-`8` para elegir planta, **🔨 Pala** para quitarlas.

### 💣 Minas

Versión arcade de las minas de los casinos, **con fichas ficticias**: no hay dinero real ni forma de depositar o retirar nada. Comparte cartera con el Aviator, que empieza en 50.000 NEXO-COINS.

- Eliges apuesta y número de minas (1 a 24) en una cuadrícula de 25 casillas.
- Cada 💎 sube el multiplicador; una 💣 y pierdes la apuesta.
- El multiplicador se calcula con la probabilidad real de la jugada: `0,99 × C(25,k) / C(25−minas,k)`, es decir, un 1 % de ventaja de la casa.
- Puedes **retirarte** cuando quieras. El panel te enseña siempre cuánto pagaría la siguiente casilla y con qué probabilidad.
- Si te quedas sin fichas, el botón **🎁 Fichas gratis** te da 500 más.

### 🧩 Block Blast

Tablero de 8x8 y tres piezas que **no rotan**. Arrastra cada una a su sitio; al completar una fila o una columna, estalla.

- Varias líneas a la vez multiplican los puntos (1 → 100, 2 → 300, 3 → 600, 4 → 1000…).
- Jugadas seguidas que revientan líneas suben el **combo**, que suma un 50 % extra por nivel.
- Las tres piezas se reponen solo cuando has usado las tres.
- La partida acaba cuando ninguna pieza cabe ya en el tablero.

### 🐍 Serpiente Neón

- **🍎 Manzana:** creces y aceleras un poco.
- **🍋 Fruta dorada:** aparece unos segundos cada 7 manzanas y vale 75 puntos.
- **👻 Fantasma:** 7 segundos atravesando paredes y tu propio cuerpo.
- **🪨 Rocas:** aparece una nueva cada 5 manzanas.
- **Controles:** flechas / `WASD`, deslizar el dedo en móvil, `Espacio` para pausar.

### ✈ Aviator

Juego de tipo *crash*, también con **fichas ficticias**.

- El avión despega y el multiplicador sube sin parar; en cualquier momento se va volando.
- Puedes **retirarte** cuando quieras: el cobro es inmediato al multiplicador que se vea en pantalla.
- El punto de caída sale de la distribución habitual de estos juegos, `P(caída > x) = 0,99 / x`, con un **1 % de ventaja de la casa**: la mitad de las rondas se quedan por debajo de 2x, una de cada diez pasa de 10x y un 1 % se estrella nada más despegar.
- **Apuesta automática** para repetir la jugada cada ronda y **retiro automático** para cobrar solo al llegar a tu multiplicador.
- La franja de arriba guarda el historial de las últimas rondas.

### 🎱 8 Ball Pool

Billar contra la máquina con un motor de física propio: subpasos fijos a 300 Hz, rozamiento con el paño, rebote con pérdida en las bandas y transferencia de energía entre bolas.

- **Apuntar:** mueve el ratón o el dedo. Verás la línea de tiro, la **bola fantasma** en el punto de contacto, hacia dónde saldrá la bola objeto y hacia dónde se irá la blanca.
- **Tirar:** mantén pulsado y arrastra hacia atrás; el taco se echa para atrás según la fuerza.
- **Efecto:** arrastra el punto sobre la bola blanca del panel. Arriba corre, abajo retrocede y a los lados aplica efecto lateral, que curva la bola y cambia el rebote en banda.
- **Reglas de 8-ball:** grupos asignados con la primera bola legal, faltas con bola en mano para el rival y la 8 al final. Meterla antes de tiempo, o junto con la blanca, es perder.

### ⚽ Rumble Stars

Fútbol de arena a 90 segundos con seis bichos, cada uno con su masa, su velocidad y su manera de jugar.

| Bicho | Coste | Qué hace |
|---|---|---|
| 🐆 Guepardo | 3 | El más rápido del campo |
| 🦁 León | 4 | Chuta durísimo |
| 🦏 Rinoceronte | 4 | Embiste en línea recta sin corregir |
| 🐘 Elefante | 5 | Pesa tanto que aparta a todos |
| 🐧 Pingüino | 2 | Resbala sin frenar |
| 🐢 Tortuga | 3 | Se queda defendiendo tu portería |

Elige uno del banquillo y **arrastra en tu mitad** hacia donde quieres lanzarlo: cuanto más largo el arrastre, más fuerte entra. La energía se rellena sola y los bichos se cansan y abandonan el campo al cabo de unos segundos.

### ⛏ Mining Tycoon

Un *idle* de gestión con una cadena de producción que se ve entera en pantalla:

```
minero → pozo → ascensor → silo → camión → dinero
```

Cada mejora arregla un cuello de botella distinto, y el que va apretado se nota mirando la mina:

| Mejora | Arregla |
|---|---|
| 👷 Minero novato | Producción: pica carbón en la veta izquierda |
| 👷 Minero experto | Producción: baja a la veta de oro, que vale cuatro veces más |
| ⚙️ Taladro de plasma | Velocidad de picado de toda la plantilla |
| 🚡 Ascensor de carga | Transporte: si el montón del pozo crece, el ascensor no da abasto |
| 🚚 Camión blindado | Precio por mineral y carga por viaje |

- **Picar a mano:** haz clic en cualquier veta y arrancas mineral tú mismo. Útil al empezar.
- **Se guarda solo** en el navegador, y al volver te abona lo que produjo el turno de noche mientras no estabas (a medio rendimiento, con tope de 8 horas).
- El **Mercado Nexo** cambia moneda del juego por NEXO-COINS, y cuanto más abajo se pica mejor paga: 250 en el Valle, 900 en las Cavernas y 4.500 en el Núcleo por cada 5.000 de moneda local. Además del canje suelto hay dos botones de vaciado:
  - **Canjear todo** convierte la caja entera del mundo en curso, prorrateando el mismo cambio (una unidad da `premio / coste`, redondeando hacia abajo).
  - **Vaciar los N mundos** recorre todos los que tengas abiertos y cambia cada caja **al cambio de su propio mundo**, no al del que estés mirando. El botón enseña el total antes de pulsarlo y el registro desglosa mundo por mundo.
- El **registro** de la parte de abajo va contando lo que pasa: contrataciones, mejoras y camiones vendidos.

**Cuatro mundos, cuatro monedas.** La mina no es una sola: son cuatro, cada una con su moneda, sus minerales, su paleta y su dificultad. Se juegan por separado —cada una guarda su dinero, su plantilla y sus mejoras— y se cambia de una a otra con el selector de arriba.

| Mundo | Moneda | Minerales | Se abre con | Cambio Nexo |
|---|---|---|---|---|
| ⛏ **Valle Nexo** | `$` dólares | carbón · oro | abierto desde el principio | $5.000 → **250** |
| 🔮 **Cavernas de Gea** | `₡` cristales | amatista · esmeralda | ganar $450.000 y pagar $320.000 | ₡5.000 → **900** |
| 🔥 **Núcleo Omega** | `Ω` núcleos | obsidiana · nexonita | ganar ₡4.000.000 y pagar ₡2.800.000 | Ω5.000 → **4.500** |
| 🕳 **Vacío Cuántico** | `Ψ` psiones | cuarzo temporal · singularita | ganar Ω100.000.000 y pagar Ω70.000.000 | Ψ5.000 → **22.000** |

- El peaje **se paga con la moneda del mundo anterior**: para bajar a las Cavernas hay que haber exprimido el Valle.
- El **Núcleo Omega** ya no es el final: sacar sus Ω100.000.000 es a la vez su hito y la llave del Vacío. Todo cuesta casi el doble de un nivel al siguiente todo cuesta casi el doble de un nivel al siguiente (factor 1,72–2,0 frente a 1,35–1,6 del Valle) y los obreros pican a un tercio del ritmo. Esa meta paga **250.000 NEXO-COINS** una sola vez.
- El **Vacío Cuántico** es el escalón final: factores de 1,9 a 2,25, sondas que pican a un cuarto del ritmo del Valle y un arranque de Ψ6.000.000 que se evapora en dos mejoras. Su meta son **Ψ5.000.000.000**. No hay techo, hay islas flotando, auroras y una grieta de singularidad al fondo. Simulando la economía con compra codiciosa —siempre la mejora con más ingreso por moneda— el Valle se pasa en unos 22 min, las Cavernas en 1 h 19, y el Núcleo pide más de **7 horas**.
- **Empezar una mina nueva** reinicia solo la mina en la que estás; los otros mundos y lo que hayas abierto no se tocan.

Cada mundo tiene su propio cielo: el Valle se pica de noche a cielo abierto con luna y sierra al fondo; las Cavernas no tienen cielo, sino bóveda con estalactitas que gotean, hongos bioluminiscentes y un lago subterráneo; el Núcleo, una bóveda de basalto con grietas incandescentes, coladas colgando y un río de lava; y el Vacío, ni techo ni suelo firme: islas de roca flotando sobre su propio brillo, bandas de aurora y una singularidad abierta al fondo. Cambian también los estratos, el entibado (madera, acero húmedo, acero al rojo), el color de las lámparas, la ropa y el casco de los obreros, y la maquinaria.

**La mina está dibujada entera por código**, en dos capas: una fija que se pinta una sola vez (cielo estrellado con luna y halo, sierra al fondo en dos planos, seis estratos de roca con su grano y sus líneas de contacto, guijarros incrustados, grietas ramificadas y el entibado de madera con vetas y pernos) y otra viva encima. El mineral no está esparcido al azar: sale en **bolsadas inclinadas** de cristales facetados que sueltan un destello al pasar. Los mineros están articulados —piernas con ciclo de paso, brazo que gira con el pico, casco con visera y frontal encendido, saco que crece al llenarse— y cada uno lleva su **cono de luz** hacia donde mira. El pozo tiene marco entibado, guías, faroles con parpadeo y raíl de vagoneta; el ascensor es una jaula con barrotes, franja de peligro y baliza; y arriba están el silo sobre zapata de hormigón, el castillete de celosía con su polea girando y el camión con ruedas de tacos y faro encendido.

### 📦 Cofres Minecraft

Simulador de cajas con interfaz de bloques: cuatro cofres, veinte objetos repartidos en cinco rarezas y encantamientos con el brillo morado animado.

**Todos los iconos son pixel art de 16x16 dibujado por código** (bloques con ruido, espadas en diagonal, picos, lingotes, gemas talladas, élitros, tótem, faro…) y se amplían sin suavizado. Nada de imágenes descargadas: el arcade sigue funcionando sin conexión.

| Cofre | Precio | Probabilidades |
|---|---|---|
| Madera | 50 💎 | común 80 % · raro 20 % |
| Hierro | 220 💎 | común 40 % · raro 40 % · épico 20 % |
| Diamante | 780 💎 | raro 52 % · épico 36 % · legendario 12 % |
| Ender | 2.850 💎 | épico 55 % · legendario 37 % · **mítico 8 %** |

Las probabilidades están **escritas en cada cofre** y son las que se usan de verdad. Comprobado con 60.000 aperturas por cofre: las frecuencias salen clavadas y el retorno medio es del **89-91 %** del precio, así que se pierde poco a poco, como en cualquier simulador de cajas.

- **Ruleta** con aguja central que frena poco a poco; el chasquido se va espaciando conforme se para.
- **Barra de experiencia y niveles:** cada apertura da 25 XP y cada fusión 40. Al subir de nivel estallan partículas de píxeles.
- **Encantamientos:** las armas, herramientas y armaduras salen encantadas un 45 % de las veces, valen un 50 % más y llevan el **glint** morado animado.
- **Tooltip** al pasar el ratón, con el nombre en color de rareza, el encantamiento y el valor.
- **Contrato de fusión:** cinco objetos de la misma rareza se forjan en uno de la rareza superior. Los míticos ya no suben.
- Clic para meter en el contrato, **botón derecho para vender**, y venta rápida de todo lo común.
- Cambia **100 NEXO-COINS por 1.000 esmeraldas** para conectarlo con el resto del arcade.

### 🍪 Galletas

Incremental de clics con los diez edificios clásicos y sus precios de siempre, que suben un 15 % con cada compra.

| Edificio | Precio base | Produce |
|---|---|---|
| 👆 Cursor | 15 | 0,1/s |
| 👵 Abuela | 100 | 1/s |
| 🌾 Granja | 1.100 | 8/s |
| ⛏️ Mina | 12.000 | 47/s |
| 🏭 Fábrica | 130.000 | 260/s |
| 🏦 Banco | 1,4 M | 1.400/s |
| 🏛️ Templo | 20 M | 7.800/s |
| 🗼 Torre mágica | 330 M | 44.000/s |
| 🚀 Nave espacial | 5,1 B | 260.000/s |
| 🌀 Portal | 75 B | 1,6 M/s |

- **18 mejoras** que se desbloquean solas al cumplir su requisito: multiplican lo que da cada clic, duplican lo que produce un edificio concreto, o suben toda la producción de golpe. «Mil dedos» añade producción por clic según cuántos edificios tengas.
- **🌟 Galleta dorada:** aparece cada minuto o dos en un sitio al azar y dura unos segundos. Puede dar **Frenesí** (producción ×7 durante 15 s), **Suerte** (un pellizco enorme de golpe) o **Clic frenético** (×777 por clic durante 10 s).
- **Comprar de 10 en 10 o de 100 en 100**, con el precio calculado con la suma de la progresión geométrica, no multiplicando por diez.
- La producción va **por tiempo real**, no por fotograma: comprobado, 0 % de desviación en tres segundos, así que da igual a cuántos hercios vaya tu pantalla.
- **Se guarda solo** y al volver te abona lo producido mientras no estabas (al 60 %, con tope de 12 horas).
- Cambia **1 millón de galletas por 100 NEXO-COINS**.
- La galleta está dibujada por código: borde irregular, grumos en la masa, chispas con volumen y migas que saltan en cada clic.

### 🏍 Moto X3M

Carrera de 2.400 m sobre terreno generado, con un motor de física propio de **cuerpo rígido con dos ruedas**.

- Cada rueda es un **muelle amortiguado** contra el terreno, y el par que generan entre las dos es lo que endereza la moto. Por eso se posa sobre las lomas en vez de pegarse al suelo, y las rampas la lanzan de verdad.
- El terreno es **determinista por semilla**: la misma pista se puede repetir, y al reaparecer en una bandera sigue siendo la de antes. Cada 1.150 px hay una rampa con perfil `1 − cos`, que **arranca plana y llega a su punto más inclinado justo en el borde**, donde el terreno cae en seco: ese corte es el que te manda por los aires. Ninguna pendiente pasa de 49°, y las amplitudes están elegidas para que el terreno quepa entero en el lienzo sin recortes.
- **Detrás de cada rampa hay un foso** de 130 a 210 px: para eso está la rampa. A plena velocidad se cruzan de sobra, pero si vienes frenado o reapareces en un control, hay que coger carrerilla. Caer dentro cuenta como caída.
- **Nitro** con `Shift` o `Espacio`: empuja fuerte, se gasta y se recupera solo. Cada vuelta completa te devuelve un cuarto del depósito.
- En el aire mandas tú con ← →; la velocidad de giro está topada a 12 rad/s, que es justo lo que cabe en un salto largo. Una **vuelta completa** son 500 puntos. Si no tocas nada, la moto **se pone plana sola**: perdona los saltos pequeños sin quitarte el control cuando sí corriges.
- **Siete banderas de control.** Si te estrellas, reapareces en la última. Tienes **cinco caídas**; a la quinta se acaba la carrera.
- Caer de cabeza (más de 106° de inclinación tocando suelo) es caída.
- Física a **pasos fijos de 240 Hz** dentro del bucle: con la suspensión así de rígida, un `dt` grande la haría explotar. El par de las ruedas va escalado por `dt` como cualquier aceleración, y la velocidad de giro está topada siempre, no solo al pulsar una tecla.
- **Mandos táctiles** en pantallas pequeñas, con captura de puntero para que no se queden pegados si sacas el dedo del botón.
- **Cámara con zoom 1,7×** que deja la moto fija en pantalla y mueve el mundo por debajo: se ve el detalle de la máquina sin perder el terreno de vista. Detrás hay tres capas de montañas en paralaje con nieve en las cumbres, sol con halo y nubes; delante, el terreno con estratos, gravilla, borde de hierba y línea naranja encendida, más rocas, matojos y postes sembrados de forma determinista. La moto lleva neumáticos con tacos que giran, llantas de radios, disco de freno, escape, faro y un piloto articulado con casco y visera.

### 📈 Money Market

Terminal de trading simulado, **con dinero de mentira**: no hay dinero real, ni cuentas, ni nada que depositar. Sesión de **120 velas** empezando con 10.000 $.

- **Gráfico de velas** con volumen debajo, medias móviles **SMA 10** y **SMA 30**, y un panel de **RSI 14** calculado como Wilder, con las bandas de 30 y 70 marcadas.
- **Largo** y **corto**, con apalancamiento de **1x a 20x**. Solo se bloquea el margen; el nominal es margen × apalancamiento.
- **Liquidación real:** el gráfico te dibuja tu precio de entrada y el precio al que el margen se agota. Si el mercado lo toca, la posición se cierra sola y pierdes ese margen.
- **Comisión del 0,08 %** al abrir y al cerrar.
- El precio es un paseo aleatorio con volatilidad variable y **rachas de sesgo**, que salen anunciadas como titulares: terremoto en Laconia, revuelta de ilotas, nueva ruta comercial…
- Al cerrar la sesión, **lo que hayas ganado por encima de los 10.000 $ se cambia a NEXO-COINS**, a 1 ficha por cada 5 $.

### 🧠 Spartahoppers

Fichas de historia de Esparta con **repetición espaciada de verdad**: 24 cartas en cuatro bloques (gobierno, sociedad, guerra y cultura).

- Miras la pregunta, giras la carta y dices qué tal: **Difícil**, **Bien** o **Fácil**. Cada botón te enseña **cuándo volverás a verla** antes de pulsarlo.
- El planificador es **SM-2**: mantiene por carta un factor de facilidad (mínimo 1,3), el número de repeticiones seguidas y la fecha de vencimiento. Con «bien» el intervalo va 1 → 6 → intervalo × facilidad; con «fácil» arranca en 3 días y crece un 30 % más rápido.
- Lo que fallas **reinicia su contador y vuelve dentro de la misma sesión**, tres cartas más adelante, no al final del todo.
- Doce cartas por sesión, escogiendo primero las que llevan más tiempo vencidas.
- El **combo** sube cada tres aciertos seguidos y multiplica lo que ganas; el fallo lo reinicia.
- **Se guarda la programación entera**, así que la próxima vez el mazo te pregunta lo que te toca. Rehidrata por id: si el mazo cambia, lo que ya no existe se descarta sin romper nada.
- **Atajos:** espacio para girar, `1` `2` `3` para evaluar.

## 🎰 Los cinco clásicos del casino

Todos con **fichas ficticias**: no hay dinero real ni forma de depositar o retirar nada. Comparten la cartera de NEXO-COINS con Minas y Aviator, y las tres mesas de cartas usan la baraja común de `arcade.js` (`Cartas`), que dibuja cada naipe por código.

Las mesas comparten dos módulos de `arcade.js`, los dos dibujados a mano con Canvas y sin una sola imagen descargada:

- **`Cartas`** — baraja francesa completa: los pips van en la disposición clásica (y girados en la mitad de abajo, como en un naipe de verdad), las figuras llevan su retrato con corona, tiara o gorro, los índices de la esquina inferior van del revés, y el dorso tiene celosía de rombos con brillo.
- **`Mesa`** — el paño: penumbra y foco cenital, elipse de fieltro con grano y filete interior, borde de cuero con pespunte, viñeta, y `Mesa.fichas()` para apilar fichas de casino de 1 a 1.000 con su color, canto, aro interior y muescas.

### 🃏 Blackjack

- **Zapato de 6 barajas** que se rebaraja al gastar tres cuartas partes.
- **Blackjack paga 3:2**, la banca se planta en todo 17 (también el blando).
- **Doblar** (una carta y se acabó), **dividir** hasta cuatro manos —los ases divididos reciben una sola carta— y **seguro** 2:1 cuando la banca enseña un as.
- Comprobado: 4.000 manos con la estrategia de "pedir hasta 17" dan un −7,6 %, que es justo lo que tiene esa estrategia; los blackjacks salieron el 4,3 % de las manos, frente al 4,75 % teórico.
- **Mesa dibujada por código**: paño con grano y filete, borde de cuero con pespunte, foco cenital y viñeta; el arco de apuestas y el lema serigrafiados dentro del paño; caja de zapato a un lado y **montones de fichas de casino** —con canto, aros y muescas— por cada mano apostada.

### 🎡 Ruleta

- **Europea de un solo cero**, con el orden real de la rueda (0, 32, 15, 19, 4, 21…).
- **151 apuestas**: plenos, caballos, calles, cuadros, líneas, columnas, docenas y las de fuera.
- Comprobado por construcción: **todas** devuelven exactamente `números × (pago+1) / 37 = 36/37`, es decir, la ventaja de la casa del **2,70 %** en cualquier apuesta. Con 200.000 giros, χ² = 30,7 sobre 36 grados de libertad.
- **Deshacer** ficha a ficha y **Repetir** la última jugada entera.
- La bola **para en la casilla que paga**. El ángulo de frenada se fija una sola vez y se encaja exacto al detenerse: recalcularlo cada cuadro dejaba la bola desviada tantas casillas como el número sorteado, así que en 36 de cada 37 giros enseñaba un número distinto del que cobraba. La casilla ganadora se resalta en amarillo. Comprobado leyendo el píxel bajo la bola en 40 giros seguidos: 0 desajustes entre el color que se ve y el que paga.

### ♠ Texas Hold'em

- Mesa de cuatro con ciegas de **25/50** y botón rotatorio; preflop, flop, turn y river.
- **Evaluador de siete cartas** que empaqueta categoría y desempates en un entero comparable. Verificado con las diez categorías, la escalera A-2-3-4-5, los desempates por pareja y por color, y la mejor mano de siete.
- Los rivales deciden con la fuerza de su mano y las **probabilidades del bote**, con una tabla de manos iniciales antes del flop, y **farolean** un 12 % de las veces.
- Paño ovalado con foco y borde de cuero, **bote representado en tres montones de fichas** y lo apostado por cada jugador dejado en el tapete a un lado de su placa, nunca encima del nombre ni de las cartas.

### 🀄 Bacarrá

- Punto y Banca con la **tabla oficial de tercera carta**: el punto roba con 0-5; la banca, según su total y qué carta le salió al punto.
- **Pagos:** punto 1:1 · banca 0,95:1 (5 % de comisión) · empate 8:1, y en empate se devuelven punto y banca.
- Comprobado con 300.000 manos: punto 44,74 %, banca 45,82 %, empate 9,44 % (teóricos 44,62 / 45,86 / 9,52).
- **Camino de resultados** al estilo de las mesas de verdad.

### 🎲 Dados (Craps)

- **Línea de pase** y **no pase**, con el 12 en tablas en la salida.
- **Odds** verificadas: pagan exactamente `formas del 7 / formas del punto`, o sea 2:1, 3:2 y 6:5 — **sin ventaja de casa**, la única apuesta justa de todo el casino.
- **Campo** (el 2 paga 2:1 y el 12, 3:1) y **colocadas de 6 y 8** a 7:6.
- Comprobado con 300.000 series: la línea de pase gana el 49,15 % (teórico 49,29 %) y el campo devuelve −2,79 % (teórico −2,78 %).

## 🎯 Los cinco de riesgo

Juegos de multiplicador, todos con **fichas ficticias** y todos con el **1 % de ventaja de la casa** del arcade. Son originales míos: la mecánica es la del género, pero el código, el arte y los nombres son propios.

### 🐔 Chicken+

Cruzas una carretera de 24 carriles. Cada paso multiplica; en cada uno puede pasar un coche.

- Cuatro dificultades, de **1 muerte de cada 25 pasos** (Fácil) a **10 de cada 25** (Locura).
- El multiplicador sale de la probabilidad real: <code>0,99 / p^pasos</code>. Comprobado: cobrar en el paso 1, 3, 8, 16 o 24 devuelve **exactamente 0,9900** en las cuatro dificultades.
- En Locura el paso 24 paga **208.932x**… con una probabilidad de 1 entre 211.000.
- Escena nocturna con skyline en dos capas de paralaje, coches con haz de faros, plumas al vuelo y la gallina animada por código.

### 🗼 Spire+

Torre de **9 pisos**. Cada piso tiene varias losetas y solo algunas aguantan.

- Cinco dificultades, de **3 seguras de 4** a **1 segura de 4**.
- <code>0,99 / (seguras/total)^pisos</code>. Verificado a **0,9900** exacto en los pisos 1, 3, 6 y 9 de las cinco dificultades.
- La cima paga de **13,2x** en Fácil a **259.522x** en Pesadilla.
- La torre entera se sortea **antes** de que toques nada, y al caer se destapa completa.

### 🛗 Limbo+

El más directo: eliges un objetivo y el ascensor sube hasta un número al azar.

- <code>P(resultado ≥ x) = 0,99 / x</code>. Medido sobre 400.000 tiradas: a 2x sale el **49,53 %** (teórico 49,50), a 10x el **9,88 %** (teórico 9,90) y a 100x el **1,000 %** (teórico 0,990).
- El panel enseña la probabilidad exacta antes de jugar, con cinco decimales cuando hace falta.
- **Modo automático** que repite la jugada hasta que lo pares.

### 🎣 Big Bass Crash

Crash con tema de pesca y una diferencia real frente al Aviator: **tres cañas independientes**.

- Cada caña tiene su apuesta y su botón de recoger, y puede llevar **recogida automática** a un multiplicador propio.
- Escena submarina con rayos de luz, burbujas, vegetación que se mece, barca en la superficie y el pez dibujado por código.
- Distribución de siempre. Medido sobre 300.000 rondas: **50,4 %** por debajo de 2x, **9,99 %** por encima de 10x, y retornos de −0,81 %, −0,98 % y −0,01 % apuntando a 2x, 1,5x y 10x.

### 🔻 Plinko

Bolas que caen por un bosque de clavos y acaban en una casilla siguiendo la **campana de Galton**.

- **8, 12 o 16 filas** y **tres riesgos**, nueve tablas en total.
- Las tablas se calculan solas: se parte de un perfil de forma, se escala para que <code>Σ prob·pago = 0,99</code> y se corrige el residuo del redondeo en el par simétrico de mayor probabilidad. Ninguna casilla baja de **0,2x**, y el suelo se compensa quitándoselo a las casillas de arriba.
- Resultado: las nueve tablas quedan entre el **98,94 %** y el **99,09 %** de retorno, todas simétricas. Cambiar el riesgo cambia la varianza (de 4,4x a 260x de máximo), nunca la ventaja de la casa.
- Puedes soltar **diez bolas seguidas**, cada una con su estela.

## 💾 Récords

Cada juego guarda su récord en el `localStorage` de tu navegador, así que son tuyos y no salen de tu equipo. Desde la portada puedes borrarlos todos con **🗑 Borrar todos mis récords**.

## 🗂 Estructura

```
index.html                      portada del arcade
arcade.html                     todo el arcade en un solo archivo (generado)
construir-arcade.js             genera arcade.html a partir de juegos/
juegos/
  arcade.css                    estilos compartidos
  arcade.js                     audio WebAudio, récords y utilidades
  nexo-tower-defense.html       (autocontenido)
  comecocos.html
  plantas-vs-zombies.html
  minas.html
  block-blast.html
  serpiente.html
  aviator.html
  8-ball-pool.html
  rumble-stars.html
  mining-tycoon.html
  cofres-minecraft.html
  cookie-clicker.html
  moto-x3m.html
  money-market.html
  spartahoppers.html
  blackjack.html
  ruleta.html
  poker-texas.html
  bacara.html
  dados-craps.html
  chicken.html
  spire.html
  limbo.html
  big-bass-crash.html
  plinko.html
```

## 🎨 Estética

Toda la interfaz comparte una identidad **neón cyberpunk**: fondos muy profundos con dos halos de color, acentos en cian, rosa, verde y amarillo, y brillos en los bordes al pasar por encima. Los tokens de color viven en `juegos/arcade.css`, así que cambiar la paleta ahí retoca los veinticinco juegos de golpe. La portada lleva cabecera fija con la cartera de **NEXO-COINS** (las fichas ficticias que comparten Minas y Aviator), que se actualiza al volver de cualquier partida.

Una partida nueva arranca con **50.000 NEXO-COINS**. El saldo inicial es la constante `Arcade.fichas.INICIAL` en `juegos/arcade.js`; con un **doble clic en la cartera** de la portada vuelve a ese valor.

### 💾 Guardado

Todo se guarda solo en el navegador, sin cuentas ni servidor. La portada tiene un panel **💾 Tu progreso** con las partidas jugadas, las fichas ganadas, el saldo y los códigos, más una tabla por juego.

**Qué se guarda**

| Qué | Dónde | Cuándo |
|---|---|---|
| Cartera de NEXO-COINS | `arcade_fichas` | en cada movimiento |
| Perfil: partidas, victorias, mejor marca y fichas ganadas por juego | `arcade_perfil` | al acabar cada partida |
| Récords | `arcade_<juego>`, `nexo_record_<mapa>` en Tower Defense | al acabar cada partida |
| Códigos canjeados | `arcade_codigos` | al canjear |
| Partidas de Mining Tycoon, Cofres y Galletas | `arcade_mina`, `arcade_cofres`, `arcade_galletas` | cada 10 s y al salir |
| Partida a medias de Block Blast y Serpiente | `arcade_estado_<juego>` | en cada jugada y al salir |

**Cómo se dispara.** `Guardado.registrar(fn)` apunta la función de guardar de cada juego y el arcade la ejecuta al cerrar la pestaña (`beforeunload`, `pagehide`), al pasar a segundo plano (`visibilitychange`) y al cambiar de pantalla en la versión de un solo archivo. Así no hace falta acordarse de guardar en cada rincón del código.

**Partidas a medias.** Block Blast y Serpiente guardan la partida entera; si cierras a mitad, el menú te ofrece **▶ Seguir la partida** además de empezar de cero. Lo guardado se lee una sola vez al arrancar, antes de que `nuevaPartida()` pise las variables.

**Fichas por jugar.** Al acabar una partida, cada juego abona NEXO-COINS a través de `Arcade.perfil.partida(id, resultado)`:

| Juego | Premio |
|---|---|
| 🏰 Tower Defense | 30 por ola + 1.000 al ganar |
| 🌻 Plantas vs Zombis | 25 por oleada + 500 al ganar |
| ⚽ Rumble Stars | 400 ganar / 150 empatar / 75 jugar, + 50 por gol |
| 🎱 8 Ball Pool | 400 al ganar, 75 al perder |
| 👻 Comecocos | 1 por cada 100 puntos |
| 🐍 Serpiente | 1 por cada 50 puntos |
| 🧩 Block Blast | 1 por cada 200 puntos |
| 🏍 Moto X3M | 1 por cada 25 puntos + 800 al llegar a meta |
| 🧠 Spartahoppers | 12 por acierto, escalado por la retención de la sesión |
| 📈 Money Market | 1 por cada 5 $ ganados por encima del capital inicial |
| 💣 Minas · ✈ Aviator | ninguno: ya mueven fichas con las apuestas |

**Sesiones a medias.** Además de Block Blast y Serpiente, **Money Market** guarda la sesión entera —mercado, posición abierta y liquidez— y ofrece **▶ Seguir la sesión** al volver.

**Si el navegador no deja guardar** (modo privado, ventana restringida), `Almacen` cae a una copia en memoria para que la sesión funcione igual, y la portada avisa de que el progreso se perderá al recargar.

### 🎁 Códigos promocionales

La portada lleva un panel de canje con **20 códigos, del 1 al 20**, que dan **1.000 NEXO-COINS cada uno**:

- Se escribe el número suelto (`7`), con ceros delante (`007`) o con la marca (`NEXO-7`, `nexo 7`) — da igual mayúsculas, espacios y guion.
- **Cada código se canjea una sola vez.** Los canjeados quedan tachados en la lista y el contador enseña cuántos llevas.
- Con un **doble clic en el contador** (`0 / 20`) los veinte vuelven a estar sin usar y se pueden canjear otra vez. El saldo que ya te llevaste no se toca.
- Debajo hay una **segunda serie pública, la grande**: los códigos **110–120**, once en total, de **100.000.000 NEXO-COINS cada uno**. Se ven en la portada con su propia lista y su propio contador, se canjean en la misma casilla y también valen una sola vez. El doble clic del contador libera las dos series.
- Y quedan **códigos que no se anuncian en ningún sitio**. Todo lo que no esté en `Arcade.codigos.PUBLICOS` es secreto: se canjea igual, pero no aparece ni suma a ningún marcador.
- Unos y otros viven en `Arcade.codigos.EXTRA` y admiten tanto números como palabras: `normalizarExtra()` quita espacios, guiones, tildes y el prefijo de la marca antes de buscar, así que `nexo suerte` y `SUERTE` son el mismo código.
- Canjearlos todos son **20.000 NEXO-COINS**, así que con el saldo inicial se llega a 70.000.
- Vive en `Arcade.codigos` (`juegos/arcade.js`): `TOTAL`, `PREMIO`, `usados()`, `canjear(texto)` y `olvidar()`. Para cambiar el premio o cuántos hay basta con tocar esas dos constantes.
- El registro se guarda en `localStorage` bajo `arcade_codigos`, y el botón **🗑 Borrar todos mis récords** también lo limpia.

## 🕹 Los nueve de Poki

Nueve de los juegos más jugados del mundo en Poki, rehechos desde cero con la misma receta del resto del arcade: Canvas, código y nada más.

| Juego | Lo que tiene por dentro |
|---|---|
| 🛹 **Subway Surfers** | Falso 3D de un punto de fuga: cada objeto guarda su distancia y se escala por `1/(1+z/FOCO)`. El generador **mira los trenes de tramos anteriores** antes de tapar un carril, así que nunca cierra las tres vías a la vez. |
| 🟢 **Slope** | La pista es una función del avance: centro y ancho salen de tres senos cuya suma de *amplitud × frecuencia* queda en **0,21 unidades por unidad de avance**, justo por debajo de lo que la bola puede corregir a velocidad máxima. |
| 🕸 **Stickman Hook** | Péndulo de verdad: la cuerda proyecta la posición sobre el círculo y **elimina solo la componente radial** de la velocidad, así que la energía se conserva y soltar abajo te lanza. Un enganche por pulsación. |
| 🟩 **Paper.io 2** | La captura es un **relleno por inundación**: se marca el rastro como tuyo y se inunda el mapa desde los bordes; lo que la inundación no alcanza estaba encerrado, y pasa a ser tuyo. |
| 🏃 **Vex** | Mapas de texto de 34 px por casilla, **colisión por ejes separados** y las tres cortesías del género: *coyote time*, cola de salto y salto en pared. |
| 🌀 **Tunnel Rush** | 16 sectores; la nave y los anillos se miden en el sistema del túnel, que gira. La nave acelera a 26 rad/s² para poder **cruzar medio túnel entre anillo y anillo**. |
| 🍬 **Cut the Rope** | Cada cuerda es una restricción de distancia **máxima**: solo tira cuando está estirada, y por eso el caramelo cae y luego frena. El corte es una intersección de segmentos. |
| 🏀 **Basket Random** | Dos muñecos con pierna de muelle y choque elástico con el balón. **Nueve reglas** que cambian cada punto: gravedad, tamaño del balón, altura de los aros y rebote. |
| 🏎 **Smash Karts** | Los karts **solo giran si se mueven**, como un coche. Misiles, minas con retardo y turbo que arrolla, tres vidas cada uno y bots que van a por la caja si están desarmados. |

Todos se comprobaron con **pilotos automáticos** además de a ojo, que es como salieron los ajustes de dificultad: el corredor moría siempre a la misma distancia (era el tope de tiempo de la prueba, no un muro), el túnel parecía imposible hasta que el piloto compensó el giro, y el generador de Subway Surfers cerraba los tres carriles hasta que se le enseñó a mirar hacia atrás.

## 🎛 Ayuda, volumen y pausa

Tres cosas que faltaban en todos los juegos a la vez, resueltas una sola vez en `arcade.js` y `arcade.css`:

- **❓ Ayuda en cualquier momento.** Antes las instrucciones solo se veían en la pantalla de inicio: una vez dentro, para volver a leerlas había que abandonar la partida. Ahora cada juego tiene un botón **❓** en su barra que abre las mismas instrucciones sobre el juego, sin tocar nada de lo que llevas. También con la tecla <kbd>?</kbd> o <kbd>H</kbd>.
- **🔊 Volumen de verdad, no solo mudo.** El botón de sonido apagaba del todo o nada. Ahora hay un **control de volumen** en ese mismo panel, que multiplica todo lo que suena —efectos, motor del Aviator y música del tower defense—. El ajuste **se guarda** y viaja de un juego a otro y entre visitas, en `arcade_sonido`.
- **⏸ Pausa que no te cuesta la partida.** <kbd>Esc</kbd> o <kbd>P</kbd> pausan, y al volver a la pestaña el juego **te espera** con un aviso en vez de seguir corriendo mientras mirabas a otro lado. En pausa el bucle sigue pidiendo cuadros pero no avanza el reloj, así que al reanudar no hay un salto de golpe.

**La pausa solo vale en los juegos de acción** —Comecocos, Serpiente, Moto X3M, Plantas vs Zombis y Rumble Stars, marcados con `data-ritmo="accion"`—. En los de apuesta está deshabilitada a propósito: poder congelar el Aviator a 40x y cobrar con calma no sería pausar, sería hacer caja. Los *idle* como Mining Tycoon o Galletas tampoco se pausan solos, porque su gracia es seguir produciendo.

El tower defense es autocontenido y no carga `arcade.js`, así que lleva su propia copia de todo esto y **comparte la preferencia de sonido por la misma clave de almacenamiento**. De paso se corrigió que su música se quedaba a todo volumen aunque bajaras el resto.

## 👑 Modo administrador

Hay un código que no paga monedas: **enciende la consola del creador**. Una vez activo se queda encendido entre visitas y funciona desde cualquier pantalla del arcade — **F9** la abre y la cierra, <kbd>Esc</kbd> la cierra, y las flechas <kbd>↑</kbd> <kbd>↓</kbd> recorren el historial.

| Comando | Qué hace |
|---|---|
| `ayuda` | Lista todos los comandos |
| `monedas <n>` | Fija la cartera en esa cantidad |
| `dar <n>` | Suma (o resta, con negativos) a la cartera |
| `codigos` · `codigos reset` | Ve qué códigos van gastados, o los libera todos |
| `record <juego> [valor]` | Consulta o fija el récord de cualquier juego |
| `mina` · `mina abrir` · `mina dinero <n>` · `mina borrar` | Estado de Mining Tycoon, abrir los cuatro mundos, llenar las cajas o borrar la partida |
| `perfil` · `perfil reset` | Estadísticas acumuladas, o borrarlas |
| `ir <juego>` | Salta a un juego por su id (solo en `arcade.html`) |
| `todo` | Modo dios de golpe: cartera a tope, códigos libres y mina abierta |
| `trucos` | Lista los juegos que tienen trucos propios |
| `juego` · `juego <truco> [args]` | Trucos del juego que tengas delante |
| `salir` | Apaga el modo administrador |

La consola vive en `Arcade.admin` (`juegos/arcade.js`). Añadir un comando es añadir una función a `Arcade.admin.COMANDOS`: el nombre de la función es el comando y sus argumentos llegan como cadenas.

### Trucos por juego

Los **34 juegos** tienen sus propios comandos: 133 en total. No pueden vivir en la consola porque en el arcade empaquetado el estado de cada juego queda encerrado dentro de su función, así que **cada juego se apunta desde su propio script** con `Arcade.admin.registrar(id, nombre, trucos)`, y la consola solo mira qué pantalla está abierta.

Dentro de un juego, `juego` lista lo que tiene a mano y `juego <truco>` lo ejecuta:

```
> juego
Minas — trucos disponibles:
  juego ver       ver — enseña dónde están las bombas
  juego limpiar   limpiar — quita las bombas del tablero
  juego mover     mover <casilla> — pone una bomba en otro sitio (1-25)

> juego ver
Bombas en: fila 3 col 5 · fila 5 col 4 · fila 5 col 5
```

Unos cuantos ejemplos de lo que hay:

| Juego | Trucos |
|---|---|
| Serpiente | `puntos` `crecer` `fantasma` `velocidad` `rocas` |
| Comecocos | `vidas` `puntos` `miedo` `nivel` `lento` |
| Aviator · Big Bass | `ver` chiva el multiplicador de caída · `caida`/`rotura` lo deciden |
| Ruleta · Limbo · Plinko · Dados | `forzar` amaña el sorteo, `azar` lo devuelve a su sitio |
| Minas · Spire | `ver` destapa dónde están las bombas o las losetas seguras |
| Blackjack · Bacarrá | `ver` lee el zapato, `poner` coloca la próxima carta |
| Moto X3M | `nitro` `caidas` `bandera <n>` `meta` `puntos` |
| Subway Surfers | `inmune` `iman` `monedas` `velocidad` `despejar` |
| Mining Tycoon | `dinero` `mejoras` `mineros` `vaciar` |
| Tower Defense | `vidas` `dinero` `ola` `barrer` `habilidades` |

Un truco es `{ que:'descripción', fn(){ … } }`. La descripción es lo que sale al escribir `juego`, y lo que devuelve `fn` es lo que se imprime.

## 🖥 Rendimiento y nitidez

Todos los juegos ajustan el búfer del canvas a la densidad de píxeles de la pantalla (`Arcade.nitido`), así que en pantallas Retina o 4K se ven nítidos en vez de escalados. Los fondos que no cambian —el laberinto del comecocos, el paño del billar, el campo de Rumble Stars y el mapa del tower defense— se dibujan una sola vez en un lienzo aparte y se reutilizan en cada cuadro.
