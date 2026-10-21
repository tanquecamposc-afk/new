# Blockverse para Roblox (Luau) · versión 2

Blockverse reescrito en **Luau** para jugarlo en Roblox. La versión 2 ya no imita el juego web a ojo: usa **los mismos datos del juego web**, exportados directamente de él.
- Las texturas de los bloques, los iconos y los modelos de criaturas son los mismos.
- También los bloques, los objetos, las recetas y los biomas.
- El generador de terreno da exactamente el mismo mundo con la misma semilla. Está comprobado bloque a bloque contra el juego web.

## Cómo jugarlo

1. Abre **Roblox Studio**.
2. **Archivo → Abrir desde archivo…** (*File → Open from File…*) y elige `Blockverse.rbxlx`.
3. Activa las mallas e imágenes editables: **Configuración del juego → Seguridad → Permitir API de mallas / imágenes** (*Game Settings → Security → Allow Mesh / Image APIs*).
   - Sin esto el juego funciona igual, pero dibuja el mundo con piezas de colores (modo de respaldo) en lugar de las texturas pixeladas.
   - En un juego publicado, Roblox puede pedir que la cuenta dueña esté verificada para usar estas API.
4. Pulsa **Play** (F5).
   - Para varios jugadores: **Prueba → Clientes y servidores** (*Test → Clients and Servers*).
5. Para que se guarde el inventario de supervivencia al publicar, activa **Permitir acceso de Studio a los servicios de API**.

Con **Rojo**, `default.project.json` monta el mismo árbol desde `src/`.

## Qué incluye

### Mundo, igual que el web
- El generador es una copia exacta del web:
  - Ruido, biomas, alturas, cuevas, vetas de minerales, lagos y los 13 tipos de árbol.
  - 32 biomas.
  - Con la misma semilla sale el mismo mundo.
- **656 bloques** con sus texturas originales de 16×16. Se dibujan como en `malla.js`:
  - Una malla por sección de 16 capas.
  - Oclusión ambiental en las esquinas y sombra por cara.
  - Luz del cielo y de antorchas, lava y piedra luminosa propagada como en `luz.js`.
  - Césped y hojas teñidos según el bioma.
- Formas especiales:
  - Losas, plantas en cruz y antorchas en pared.
  - Escaleras, puertas, camas y cofres.
  - Vallas y muros que se conectan.
  - Raíles, redstone, portales y líquidos.
- El agua es el agua de Roblox (se puede nadar).
- Simulación del servidor:
  - El agua y la lava fluyen.
  - La arena y la grava caen.
  - Las hojas se secan sin tronco, los brotes crecen y la TNT explota.

### Jugabilidad
- **774 objetos** y **382 recetas**: con forma, en espejo, sin forma, y con maderas equivalentes.
- **Inventario** como en el web:
  - Barra rápida y mochila.
  - 4 casillas de armadura y mano izquierda.
  - Fabricación 2×2.
  - Clic izquierdo, clic derecho (la mitad o una) y Mayús + clic (mover rápido o fabricar todo).
- **Mesa de trabajo** 3×3, **libro de recetas** (las que puedes hacer o todas) y **cofres** de 27 casillas.
- **Hornos**, ahumadores y altos hornos, con sus combustibles y tiempos.
- **Picar** con la fórmula del web:
  - Dureza, herramienta, nivel de pico, más lento bajo el agua o en el aire.
  - Grietas de 10 fases y trocitos del color del bloque.
- **Herramientas con durabilidad**, ataque con carga, golpes críticos al caer y empuje al correr.
- **Armadura** que reduce el daño con la fórmula del web.
- **Vida, hambre y saturación** con la regeneración del web. También:
  - Aire bajo el agua.
  - Fuego y lava, cactus, daño por caída y vacío.
  - Efectos de pociones.
- **Experiencia** con orbes y niveles.
- Objetos tirados que se juntan y se recogen.
- **Usar objetos:**
  - Comer y beber, el arco y las flechas.
  - Cubos de agua y lava, mechero, polvo de hueso, azada y semillas.
  - Huevos de criaturas, perlas de Ender y pociones arrojadizas.
  - Abrir puertas y dormir en camas, que guardan el punto de reaparición.
- **79 criaturas** con sus modelos y texturas del web y la IA de `mobs.js`:
  - Pasivas que huyen, se alimentan, crían y se esquilan.
  - Zombis y esqueletos que se queman al sol.
  - Creepers que se hinchan y parpadean antes de explotar.
  - Arañas, slimes que se dividen, endermans que se teletransportan, ghasts y blazes que disparan, gólems y criaturas acuáticas.
  - Las animaciones son las del web: patas, brazos, golpe, cabeza que te mira, destello rojo y caída al morir.
  - Las criaturas aparecen por bioma y por oscuridad y desaparecen lejos.
- **Botín de cofres** con las tablas del web.
- **Modo creativo:**
  - Paleta con todos los objetos, buscador y pestañas, y papelera.
  - Volar con F o con doble Espacio.
  - Coger el bloque apuntado con el botón central.
- **One Block:**
  - Cada jugador tiene su propia isla con un bloque que se regenera.
  - 16 fases, cofres raros, hitos y criaturas.
  - Barra de progreso arriba.
- **Estructuras** idénticas a las del web (comprobado chunk a chunk y cofre a cofre):
  - Aldeas con aldeanos y gólems, templos, pirámides, iglús, cabañas de bruja, puestos de saqueadores, mansiones, monumentos con guardianes, naufragios, ruinas, minas, mazmorras con generadores, fortalezas, ciudades antiguas, cámaras de prueba, geodas y fósiles.
  - Cofres con el botín del web y generadores de criaturas.
- **El Nether y el End**, con sus generadores portados del web:
  - Portales que se encienden con mechero (y el del End con ojos de Ender), viaje 1:8 al Nether, fortalezas y bastiones.
  - El End con sus islas, ciudades del End y barcos con élitros.
  - **Ender Dragon** con cristales que lo curan, su barra de vida, el portal de salida y el huevo.
  - **Élitros** para planear y cohetes.
- **Redstone** (`redstone.js`): polvo con señal 0-15, antorchas, palancas, botones, placas de presión, lámparas, puertas, TNT, pistones y raíles propulsores.
- **Mesas:** encantamientos (con librerías), yunque, afiladora, soporte de pociones y mesa de herrería.
- **Encantamientos que funcionan como en Minecraft:**
  - Herramientas: Eficiencia (pica más rápido), Fortuna (más minerales de las menas), Toque de seda (las menas, el césped, el vidrio… salen enteros) e Irrompibilidad.
  - Armas: Filo, Castigo (más daño a zombis y esqueletos), Perdición de los artrópodos (arañas…), Aspecto ígneo (prende fuego), Empuje y Botín (más botín y más objetos raros).
  - Arco: Poder, Llama (flechas de fuego) e Infinidad (no gasta flechas).
  - Armadura: Protección, Protección contra el fuego, las explosiones y los proyectiles, Caída de pluma, Respiración (aguantas más bajo el agua), Afinidad acuática (picas igual bajo el agua) y Espinas.
  - Reparación: la experiencia que recoges arregla el objeto. La maldición de desaparición borra el objeto al morir.
- **Detalles de supervivencia:** caer sobre heno quita el 80 % del daño, sobre una cama la mitad y en una telaraña nada; los monstruos a veces salen en grupo; las flechas de esqueleto hacen 2–4 de daño. Las criaturas, su botín y las menas siguen los valores de Minecraft.
  - El **filo**, el **empuje**, el **poder** y la **protección** cambian el daño de verdad.
- **Comercio con aldeanos:** 13 profesiones, niveles y libros encantados del bibliotecario.
- **Bed Wars** (`bedwars.js` y `bedwars2.js`): una partida para todo el servidor.
  - Sala de espera de cristal con cuenta atrás.
  - 8 equipos (o 4 si hay más de 8 jugadores), los huecos los ocupan bots.
  - Cuatro mapas: Jardín, Invierno, Infierno y Desierto.
  - Camas de dos bloques y generadores de hierro, oro, diamante y esmeralda con sus niveles.
  - Tienda de objetos con compra rápida, mejoras del equipo y trampas.
  - Objetos especiales: bola de fuego, huevo puente, torre compacta, defensor de los sueños, chinche y leche mágica.
  - Eventos de la partida y marcador lateral.
  - Bots que recogen, compran, tienden puentes, protegen su cama, rompen las ajenas y pelean.
  - Solo se rompen los bloques puestos por los jugadores. Sin cama no se reaparece.
- **Novedades de Bed Wars en la versión de Roblox:**
  - **Progreso guardado** (DataStore): monedas, experiencia con nivel en estrellas `[N✫]`, estadísticas y racha de victorias.
  - **Ventana de kits** con tarjetas del color de su rareza (estado: equipado, tuyo, gratis hoy o precio, y estrellas de nivel) y un panel con el detalle: descripción, lo que da el siguiente nivel, si tiene habilidad y un botón grande para comprar, equipar, mejorar o probar.
  - **22 kits** con rareza (común, raro, épico y legendario) y tres niveles que se mejoran con monedas. Tres kits gratis cada día. Los legendarios (Ninja, Martillo y Fantasma) tienen una habilidad con la tecla G. Kits nuevos: Ingeniero (torretas de nieve), Imán (atrae los minerales) y Fantasma (invisible un rato). Los bots también llevan kit.
  - **Misiones diarias:** tres al día, con premio en monedas.
  - **Votación de mapa** en la sala y botones para kits y efectos en el panel.
  - **Momentos de caos** durante la partida: lluvia de meteoritos, fiebre del oro (generadores al doble), gravedad baja y el **cofre del cielo**, que cae en el centro con botín raro.
  - **Rachas de bajas** (En racha, Imparable, Leyenda) con efectos, y premio por cortar la racha de otro.
  - **Objetos nuevos** en la pestaña «Novedades»: globo salvavidas (te salva del vacío), escudo de cama (45 s), trampolín, mina terrestre y torreta de nieve.
  - **Efectos de baja final** que se compran: fuegos artificiales, corazones, rayo, alma en pena y confeti.
  - Etiqueta de equipo y nivel encima de cada jugador, compañeros resaltados, registro de bajas arriba a la derecha y pantalla final con MVP, monedas, nivel, misiones y «Jugar otra vez».
  - Muerte súbita: el vacío sube poco a poco.
  - Cada mapa tiene su ambiente y su hora (Jardín soleado, Invierno con bruma fría, Infierno al atardecer rojo, Desierto con calima): nunca se juega de noche.
  - Bots más listos: rodean los obstáculos, sacan lana de reserva si se quedan sin ella lejos de casa y, cuando llegan a una cama, van a por ella en vez de perseguir a cualquiera.
  - Espectadores: botón «Mirar a otro» para seguir a los que siguen vivos.
- **Mazmorras** (`modos52.js` y `modos53.js`), una para cada jugador:
  - Tres ambientaciones: Catacumbas, Cripta y Fortaleza del Nether.
  - Salas cuadradas, redondas y en cruz, y salas secretas de tesoro.
  - Oleadas de enemigos y élites. Las puertas se cierran hasta limpiar la sala.
  - Cofres con esmeraldas, mejoras de arma y armadura, artefactos, pociones y flechas.
  - 3 vidas por nivel y un jefe al final, con su barra de vida.
- **Leyendas** (`modos52.js` y `modos53.js`), una isla para cada jugador:
  - Aldea con plaza, casas, caminos y huertos, y tres portales piglin con torres.
  - Ayudantes que recogen madera y piedra.
  - Generadores de golems, torres de flechas, muros, reparar la aldea y mejorar golems.
  - Órdenes a los golems, piglins que atacan y asaltos cada cierto tiempo.
- **Logros** (18, como los avances de Minecraft): desde «¡A por madera!» hasta derrotar al Ender Dragon, ganar en Bed Wars, superar una mazmorra o salvar la aldea de Leyendas. Al conseguir uno sale un aviso; en el menú está la pantalla con todos. Se guardan en el DataStore.
- **Guía para quien empieza:** en supervivencia, arriba a la izquierda sale el siguiente objetivo (pica un árbol, haz una mesa, un pico, un horno…).
- **Tabla de jugadores de Roblox** con el nivel de Bed Wars y los logros de cada uno.
- **Clima:** cielo despejado, lluvia o tormenta, que cambian solos. Llueve alrededor del jugador (no pasa los techos), nieva en los biomas fríos y en el desierto, la sabana y las badlands no cae nada. El cielo se nubla poco a poco. En la tormenta caen rayos (con destello y trueno) que hacen daño si te dan; está tan oscuro que salen monstruos y se puede dormir. Con lluvia los zombis no arden al sol. Dormir despeja el cielo.
- **Modelos 3D de los objetos** (`Modelos3D`): los bloques son cubitos (o losas) con las mismas texturas del mundo y los demás objetos se hacen con los píxeles de su icono con volumen, como en Minecraft. Se ven:
  - en la mano en primera persona, con el brazo, que se balancea al golpear, se mueve al andar y baja y sube al cambiar de objeto;
  - en el suelo, girando (dos si es un montón);
  - en la mano de cada jugador (y en la tuya en tercera persona).
  Si Roblox no deja crear mallas editables se usan los iconos de antes.
- **Criaturas con más vida:** cuando no hay nadie cerca miran a su alrededor y en reposo los brazos se mecen un poco.
- **Animaciones nuevas:**
  - Criaturas: aparecen creciendo con un rebote, el cuerpo sube y baja con cada paso y se balancea, los brazos van al contrario que las piernas, se echan hacia atrás al recibir un golpe, se lanzan hacia delante al atacar y al morir caen de lado (rápido al principio y suave al final) antes de la nube de humo.
  - Mano en primera persona: se queda un poco atrás al girar la cámara, baja y se mueve más al correr, da un tirón al aterrizar, se acerca a la boca y muerde al comer, se lleva al centro con el arco (y tiembla cuando está tenso) y levanta el escudo.
  - Personajes: el brazo derecho da el golpe al pegar, picar o poner bloques y se levanta con el escudo; lo ven todos los jugadores (en tercera persona también el tuyo).
  - Objetos: al caer dan un saltito y al recogerlos vuelan hacia quien los coge encogiéndose; los orbes de experiencia también.
  - Interfaz: el marco de la barra se desliza, el objeto elegido da un saltito, la barra de experiencia se llena poco a poco y el número de nivel salta al subir; los corazones parpadean al recibir daño, tiemblan con poca vida y hacen la ola con regeneración; la comida tiembla con mucha hambre; las ventanas se abren con un pequeño rebote y los títulos entran grandes.
- **Escudo:** con clic derecho (en la mano, o en la otra mano si en esta no hay nada que usar) te cubres: paras los golpes, flechas y explosiones que vienen de delante (no los de la espalda), el escudo se gasta y andas más despacio mientras te cubres.
- **Pantalla de carga** con el fondo de tierra de Minecraft, el título, una barra con porcentaje y un consejo al azar; **pantalla de muerte** que dice quién o qué te mató («Te mató un Zombi», «Caíste desde muy alto mientras huías de un Creeper»), con su icono, cuánto aguantaste vivo, las coordenadas donde moriste, cuántos objetos quedaron en el suelo, los niveles perdidos, un consejo según la causa y una barra que se llena hasta reaparecer.
- **Menú principal interactivo (estilo Roblox):**
  - Detrás, la cámara gira despacio sobre el mundo (vista panorámica) mientras el menú está abierto.
  - Tarjeta del jugador con su avatar de Roblox, nivel con estrellas y barra de experiencia, monedas, logros conseguidos y victorias de Bed Wars.
  - **Recompensa diaria** con racha: 40 monedas el primer día y 15 más por cada día seguido (hasta 130 el 7.º). El botón late cuando está lista y, si no, muestra la cuenta atrás.
  - Tarjetas de modo de colores con icono, etiquetas («CLÁSICO», «★ POPULAR», «NUEVO») y cuántos jugadores hay en cada modo en ese momento («● 3 jugando» o «¡Sé el primero!»).
  - Animaciones: las tarjetas entran una tras otra, crecen y se iluminan al pasar el ratón, se aplastan al hacer clic, y cada acción tiene su sonido.
  - Botones de Ajustes, Controles, Logros y «Volver al juego».
- **Ajustes que se guardan:** sensibilidad del ratón, campo de visión, efecto de velocidad al correr, balanceo de la mano, números de daño y volumen.
- **Cámara en tercera persona (V) mejorada:** gira con el ratón sin mantener el clic derecho, el personaje mira hacia donde apuntas y la cámara no atraviesa los bloques.
- **Enemigos más listos:** solo te persiguen si te ven (y se acuerdan unos segundos), no se tiran por los precipicios ni a la lava, rodean los muros, avisan a los de su clase cuando les pegas y los esqueletos se mueven de lado cambiando de dirección. Al golpearlos sale su barra de vida y al morir desaparecen en una nube de humo.
- **Números de daño** que saltan al golpear (amarillos con «!» en los críticos).
- **Guardado seguro:** la partida se guarda al salir y cada 2 minutos, con los encantamientos. Si el DataStore falla al entrar, no se guarda nada para no pisar lo que había.
- **Día y noche** de 20 minutos, cielo, nubes, niebla, brillo e iluminación *Future*.
- **Multijugador:**
  - El servidor manda.
  - Cada cliente genera el terreno con la semilla y solo recibe los cambios.
- **Interfaz** con el aspecto del web:
  - Paneles grises con relieve, casillas hundidas y los iconos del juego.
  - Corazones, comida, armadura y burbujas en el pixel art del web.
  - Mira, objeto en la mano y avisos.
  - Pantallas de carga, inicio y muerte, e información con F3.
- **Móvil:** botones para picar, usar, inventario, volar, agacharse y tirar.

### Controles en PC

| Acción | Tecla |
|---|---|
| Picar / atacar | Clic izquierdo (mantener) |
| Usar / poner / comer / tensar el arco | Clic derecho (mantener) |
| Elegir objeto | 1–9 o rueda |
| Inventario | E |
| Tirar objeto (Ctrl: toda la pila) | Q |
| Correr | Ctrl |
| Agacharse | Mayús |
| Volar (creativo) | F o doble Espacio; Espacio sube, Mayús baja |
| Coger el bloque apuntado (creativo) | Botón central |
| Cámara en 1ª / 3ª persona | V |
| Información | F3 |
| Menú de modos de juego | M |
| Leyendas: recoger / ¡al ataque! / seguidme | G / R / F |
| Leyendas: construir | 1–6 (o los botones del panel) |
| Mazmorras: usar un artefacto | Clic derecho con él en la mano |
| Bed Wars: habilidad del kit | G (o el botón táctil) |

## Lo que es distinto del web

Para ser claros, esto **no es igual** que en el juego web:
- **Sonidos:** se usan los sonidos que trae Roblox, no los sintetizados del web.
- **Mazmorras:** la cámara es la normal de Roblox, no la cenital del web. Por eso todas las paredes son altas. El ataque y la esquiva son los normales del juego (sin combo de tres golpes ni voltereta). Los artefactos son objetos de la barra que se usan con clic derecho.
- **Leyendas:** se juega en una isla generada aparte, no en un mundo nuevo entero. La isla tiene hierba, árboles y rocas para recoger.
- **Bed Wars:** el cielo no cambia según el mapa. No hay salas por separado: hay una partida a la vez para todo el servidor, y quien llega a mitad la ve desde la sala.

## Archivos

- `Blockverse.rbxlx`: el lugar listo para abrir en Roblox Studio.
- `src/compartido/` → `ReplicatedStorage.Blockverse`
  - `Datos/`: datos exportados del juego web, generados por `herramientas/generar_datos.py`. No se editan a mano.
    - Bloques, objetos, recetas, hornos, biomas y claves.
    - Texturas, iconos y criaturas.
  - `Registro`: tablas rápidas de bloques y objetos, tiempo de picado y lo que suelta cada bloque.
  - `Generador`, `Ruido`: el generador del web, idéntico.
  - `Estructuras`, `Dimensiones`: las estructuras, el Nether y el End del web, idénticos.
  - `Arenas`: los mapas de Bed Wars, las mazmorras y la isla de Leyendas. Se generan como parte del terreno, así el servidor y los clientes los crean igual sin enviarlos por la red.
  - `Botin`, `Encantamientos`: tablas de botín y encantamientos del web.
  - `MundoDatos`: chunks de datos y cambios.
  - `Crafteo`, `Rayo`, `Fisica`, `Codec`, `Config`.
- `src/servidor/` → `ServerScriptService.Servidor`
  - Script principal: jugadores, acciones, vida, hambre y daño.
  - `Mundo`: colisiones y agua.
  - `Simulacion`: líquidos, gravedad, hojas, cultivos y explosiones.
  - `Mobs`: IA de las criaturas.
  - `Entidades`: objetos tirados, experiencia y proyectiles.
  - `Inventario`, `Contenedores` (cofres y hornos), `Habitantes` (generadores de criaturas y habitantes de las estructuras).
  - `Dimension` (portales, el Nether, el End y el Ender Dragon), `Redstone`, `Mesas` (mesas y comercio).
  - `Modos` (One Block, y reparte el trabajo de los demás modos), `BedWars`, `Mazmorras`, `Leyendas`.
  - `PerfilBW` (progreso guardado de Bed Wars y misiones diarias) y `KitsBW` (kits, niveles y habilidades).
  - `Logros` (logros, guía y tabla de jugadores) y `Clima` (lluvia, tormentas y rayos).
- `src/cliente/` → `StarterPlayerScripts.Cliente`
  - Script principal: controles, cámara, picar y usar, efectos y sonidos.
  - `Render`: mallas con texturas, con un modo de respaldo hecho con piezas.
  - `Luz`.
  - `Interfaz`, `Iconos`, `Modelos3D` (objetos en 3D: mano, suelo y personajes), `ClimaVista` (lluvia, nieve y rayos).
  - `MobsVista`, `EntidadesVista`.
  - `Imagenes`.
- `src/personaje/Health`: quita la curación automática de Roblox.
- `construir_rbxlx.py`: vuelve a crear `Blockverse.rbxlx` desde `src/`.
- `herramientas/`: exportadores (Playwright) que sacan los datos del juego web y los convierten a Luau.
- `pruebas/`: se ejecutan con la consola de Luau, sin Roblox.
  - `probar.sh`: compara el generador con muestras del juego web. Tiene que salir «GENERADOR IDENTICO AL WEB».
  - `probar_juego.sh`: ejecuta el servidor y el cliente juntos en un «Roblox de mentira». En la prueba:
    - Se dibuja el mundo con mallas y se elige el modo.
    - Se pica, se recoge y se fabrica en la mesa.
    - Se pone un bloque, se ataca a criaturas y hay una explosión.
    - Se abre el inventario y se prueba One Block.
    - Redstone, mesas, comercio, el Nether, el End y el dragón.
    - Bed Wars (tienda, generadores, camas, bots, muerte y reaparición), Mazmorras (salas, puertas, cofres, artefactos y jefe) y Leyendas (construir, golems, piglins y portales).
  - `probar_respaldo.sh`: lo mismo, pero sin mallas ni imágenes editables.
  - `probar_estructuras.sh`: compara chunks con estructuras, del Nether y del End, y el botín de los cofres, con el juego web. Tiene que salir «ESTRUCTURAS IDENTICAS AL WEB».
  - `probar_multi.sh`: varios jugadores a la vez en el servidor. Tiene que salir «MULTIJUGADOR BIEN». En la prueba:
    - Supervivencia: los bloques llegan a todos, cofre compartido, sin golpes entre jugadores, objetos al morir y guardado al salir (con encantamientos y ajustes).
    - Pantalla de muerte: llegan los objetos soltados, el sitio y el tiempo vivo, y «Te mató un Zombi».
    - Encantamientos: Eficiencia acelera, Fortuna III multiplica los diamantes, Toque de seda da la mena entera y Botín III da más botín.
    - Escudo: para los golpes de delante y no los de la espalda, y los demás ven que te cubres.
    - Enemigos: no persiguen a través de paredes, no se tiran por los bordes, se avisan entre ellos y mandan su vida para la barra.
    - Logros y clima: se consiguen, salen en la tabla de jugadores y se guardan (y no cuentan dentro de Bed Wars); con lluvia los zombis no arden, en la tormenta es «de noche» y el rayo hace daño.
    - Bed Wars con 3 y 4 jugadores: votación, compra de kits y efectos (y que se guarden), equipos, golpes, escudo de cama, trampolín, momentos de caos y cofre del cielo, baja final con efecto, espectador, irse a mitad, victoria con recompensas, «Jugar otra vez» e inventario devuelto.
    - Mazmorras y Leyendas: cada jugador tiene la suya.
  - `probar_bw.sh`: una partida entera de Bed Wars con cuatro jugadores con kits y bots: momentos de caos, minas, torretas, trampolín, habilidades, invisibilidad, bots que tienden puentes y rompen camas, muerte súbita y final. Tiene que salir «BED WARS LARGA BIEN».
  - `probar_arenas.sh`: genera los 8 mapas de Bed Wars, varias mazmorras y una isla de Leyendas. Tiene que salir «ARENAS BIEN».
  - `capturar.sh`: saca imágenes de lo que dibuja el cliente en Bed Wars, Mazmorras y Leyendas (mallas con texturas, criaturas y carteles) y de la interfaz (tienda, paneles, barra del jefe). Así se revisa cómo se ve sin abrir Roblox Studio. Usa `herramientas/vista/` (Python con numpy y Pillow).

## Rendimiento

- Una malla por sección de 16 capas en lugar de una pieza por bloque.
- La construcción se reparte en varios fotogramas (6 ms por fotograma) y empieza por lo más cercano.
- Las colisiones del servidor son bloques invisibles unidos en cajas grandes. Solo existen cerca de los jugadores.
- `Config.RADIO` es la distancia de visión, en chunks. Bájala a 3 o 4 si va lento en móvil.
