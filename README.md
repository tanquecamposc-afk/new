# 🕹 ARCADE NEXO

Quince juegos hechos a mano en **HTML5 + Canvas + JavaScript puro**. Sin dependencias, sin librerías, sin assets externos y sin conexión a internet: todos los gráficos se dibujan por código y todo el sonido se genera en tiempo real con WebAudio.

## ▶ Cómo jugar

Abre `index.html` en cualquier navegador moderno y elige un juego. No necesita servidor ni instalación.

Cada juego tiene su botón **🕹 Arcade** arriba a la izquierda para volver a la portada.

### 📦 Versión de un solo archivo

`arcade.html` es el arcade **entero** (portada y los quince juegos) empaquetado en un único archivo, sin CSS ni JS externos. Sirve para cuando solo puedes usar una página suelta: mandarlo por correo, subirlo a cualquier sitio o abrirlo desde una memoria USB.

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
| ⛏ [Mining Tycoon](juegos/mining-tycoon.html) | Tycoon | Monta un imperio minero: plantilla, ascensor, camiones y progreso sin conexión |
| 📦 [Cofres Minecraft](juegos/cofres-minecraft.html) | Cajas | Abre cofres con ruleta, colecciona objetos y fúndelos para subir de rareza |
| 🍪 [Galletas](juegos/cookie-clicker.html) | Incremental | Pica la galleta, monta un imperio y caza las galletas doradas |
| 🏍 [Moto X3M](juegos/moto-x3m.html) | Carreras | Suspensión en las dos ruedas, rampas que lanzan y vueltas en el aire |
| 📈 [Money Market](juegos/money-market.html) | Simulación | Velas, volumen, SMA y RSI; largos, cortos y apalancamiento con liquidación |
| 🧠 [Spartahoppers](juegos/spartahoppers.html) | Memoria | Fichas de Esparta con repetición espaciada SM-2 y combos |

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

Versión arcade de las minas de los casinos, **con fichas ficticias**: no hay dinero real ni forma de depositar o retirar nada. Comparte cartera con el Aviator, que empieza en 5.000 NEXO-COINS.

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
- El punto de caída sale de la distribución habitual de estos juegos, `P(caída > x) = 0,99 / x`: la mitad de las rondas se quedan por debajo de 2x, una de cada diez pasa de 10x y un 1 % se estrella nada más despegar.
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
- El **Mercado Nexo** cambia $5.000 por 50 NEXO-COINS, las fichas ficticias que se usan en Minas y Aviator.
- El **registro** de la parte de abajo va contando lo que pasa: contrataciones, mejoras y camiones vendidos.

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
```

## 🎨 Estética

Toda la interfaz comparte una identidad **neón cyberpunk**: fondos muy profundos con dos halos de color, acentos en cian, rosa, verde y amarillo, y brillos en los bordes al pasar por encima. Los tokens de color viven en `juegos/arcade.css`, así que cambiar la paleta ahí retoca los quince juegos de golpe. La portada lleva cabecera fija con la cartera de **NEXO-COINS** (las fichas ficticias que comparten Minas y Aviator), que se actualiza al volver de cualquier partida.

Una partida nueva arranca con **5.000 NEXO-COINS**. El saldo inicial es la constante `Arcade.fichas.INICIAL` en `juegos/arcade.js`; con un **doble clic en la cartera** de la portada vuelve a ese valor.

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
- Canjearlos todos son **20.000 NEXO-COINS**, así que con el saldo inicial se llega a 25.000.
- Vive en `Arcade.codigos` (`juegos/arcade.js`): `TOTAL`, `PREMIO`, `usados()`, `canjear(texto)` y `olvidar()`. Para cambiar el premio o cuántos hay basta con tocar esas dos constantes.
- El registro se guarda en `localStorage` bajo `arcade_codigos`, y el botón **🗑 Borrar todos mis récords** también lo limpia.

## 🖥 Rendimiento y nitidez

Todos los juegos ajustan el búfer del canvas a la densidad de píxeles de la pantalla (`Arcade.nitido`), así que en pantallas Retina o 4K se ven nítidos en vez de escalados. Los fondos que no cambian —el laberinto del comecocos, el paño del billar, el campo de Rumble Stars y el mapa del tower defense— se dibujan una sola vez en un lienzo aparte y se reutilizan en cada cuadro.
