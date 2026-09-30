# NEXO: Tower Defense 🏰

Juego de defensa de torres hecho en **HTML5 + Canvas + JavaScript puro** — un solo archivo, sin dependencias ni assets externos. Interfaz completamente en español.

## ▶ Cómo jugar

Abre `index.html` en cualquier navegador moderno. No necesita servidor ni instalación.

**Objetivo:** sobrevive a las **40 olas** de enemigos y derrota al **Coloso del Vacío**. Si lo logras, se desbloquea el **modo infinito ∞**.

## 🗺 Mapas

| Mapa | Dificultad |
|---|---|
| Pradera Verde | Fácil |
| Desierto Carmesí | Medio (+15% vida enemiga) |
| Glaciar Nocturno | Difícil (+30% vida enemiga) |

El récord de olas de cada mapa se guarda en tu navegador.

## 🗼 Torres (9 tipos, 5 niveles cada una)

| Torre | Costo | Rol |
|---|---|---|
| 🔫 Recluta | $200 | Básica y barata; gana detección al nivel 4 |
| 🌀 Artillero | $550 | Cadencia altísima |
| 🎯 Francotirador | $400 | Enorme alcance y daño; ve ocultos desde nivel 1 |
| ❄️ Congelador | $450 | Pulsos de área que ralentizan |
| 💣 Demoledor | $700 | Daño explosivo en área |
| 🔥 Piromante | $500 | Chorro de fuego que incendia (daño con el tiempo) |
| ⚡ Tesla | $900 | Rayos en cadena; ve ocultos |
| 🌾 Granja | $300 | Genera dinero al final de cada ola |
| 📣 Comandante | $850 | Aura que acelera la cadencia de torres cercanas |

Cada torre puede **mejorarse** (⬆), **venderse** (70% de reembolso) y cambiar su **modo de objetivo**: primero, último, más fuerte o más cercano.

## 👾 Enemigos

- **Normal / Veloz / Blindado** — la carne del enjambre.
- **👻 Sombra** — invisible para torres sin detección 👁.
- **✚ Curandero** — sana a los enemigos cercanos: elimínalo primero.
- **Tanque** — lento pero enorme.
- **☠ DEVORADOR** — jefe cada 10 olas, con barra de vida propia.
- **💀 EL COLOSO DEL VACÍO** — jefe final de la ola 40.

## ⌨ Controles

| Tecla / acción | Efecto |
|---|---|
| `1`–`9` | Seleccionar torre para colocar |
| Clic izquierdo | Colocar / seleccionar torre |
| `Shift` + clic | Colocar varias torres seguidas |
| Clic derecho / `ESC` | Cancelar |
| `Espacio` | Pausa |
| `F` | Velocidad x1 / x2 / x3 |

## 🔊 Sonido

Todos los efectos de sonido se generan en tiempo real con WebAudio (sin archivos de audio). Botón 🔊 para silenciar.

---

# Blockverse 🧱

Juego de bloques en 3D inspirado en Minecraft, hecho desde cero con **Three.js**. Todas las texturas, iconos y sonidos se generan por código. Tiene dos modos (Supervivencia y Creativo) y la progresión completa: del primer tronco al **Ender Dragon**.

Abre `blockverse/index.html` en un navegador moderno (necesita internet para cargar Three.js desde cdnjs). Se juega con teclado y ratón o con controles táctiles en el móvil, y el mundo se guarda solo en el navegador.

## Qué incluye

- **Mundo aleatorio como Minecraft:** 14 biomas (llanura, bosque, bosque de abedules, taiga, tundra nevada, jungla, sabana, pantano, desierto, badlands, montañas, océano, playa y río), ríos, lagos de agua y lava, y colores de césped, hojas y agua que cambian según el bioma y se mezclan en los bordes.
- **Árboles:** roble, roble grande, abedul, abeto, jungla y acacia, cada uno con su brote.
- **Vetas de mineral con los valores de Minecraft 1.18** (intentos, tamaño y rango de altura), además de granito, diorita y andesita.
- **Estructuras:** aldeas con casas, granjas, herrería, pozo y farolas; aldeanos granjeros, bibliotecarios, herreros y clérigos con los que puedes comerciar esmeraldas; portales en ruinas y pozos del desierto.
- **Bloques de construcción:** escaleras, losas, puertas, escaleras de mano, vallas, paneles de vidrio, antorchas de pared, calabazas, linternas de calabaza, sandías, champiñones, flores, nenúfares, capas de nieve, arcilla, ladrillos, terracota y librerías (potencian la mesa de encantamientos).
- **Efectos:** agua, lava y portales animados; plantas que se mecen con el viento; tormentas con rayos y truenos; nieve en los biomas fríos; pasos que suenan según el suelo; balanceo de cámara; sacudida al recibir daño; llamas y humo en las antorchas; burbujas, salpicaduras y ceniza en el Nether.
- **Animaciones:** las criaturas giran la cabeza hacia ti, levantan los brazos al golpear y caen de lado al morir; la mano cambia de objeto, come y tensa el arco.

- **Mundo:** capas de Y -64 a 127, lecho de roca, pizarra profunda bajo Y 0, cuevas, lagos de lava profundos, océanos, playas y biomas (llanura, bosque, desierto, nevado y montañas).
- **Minerales por capas:** carbón, cobre, hierro, oro, redstone, lapislázuli, diamante (más abundante cerca de Y -59) y esmeralda en montañas, con sus variantes de pizarra profunda.
- **Minado como en Minecraft:** misma fórmula de tiempo por dureza y herramienta, niveles de pico (hierro necesita piedra, diamante necesita hierro, obsidiana necesita diamante) y botín con probabilidades (pedernal de la grava, brotes y manzanas de las hojas, semillas de la hierba…).
- **Iluminación:** luz del cielo y de bloques (antorchas, lava, piedra luminosa), ciclo de día y noche de 20 minutos y lluvia.
- **Líquidos:** agua y lava que fluyen, fuentes infinitas, obsidiana y roca al mezclarse, nadar, ahogarse y quemarse.
- **Supervivencia:** vida, armadura, hambre con saturación, experiencia, efectos (regeneración, veneno, hambre), daño por caída, fuego, cactus y vacío.
- **Fabricación:** inventario 2×2, mesa 3×3, más de 100 recetas; horno con combustibles; cofres; mesa de encantamientos.
- **Herramientas y combate:** madera, piedra, hierro, oro y diamante; armaduras de cuero, oro, hierro y diamante; arco y flechas; golpes críticos y recarga de ataque.
- **Granja:** azada, semillas, trigo que crece, polvo de hueso, árboles que crecen de brotes, caña de azúcar, cría de animales.
- **Criaturas:** cerdo, vaca, oveja, gallina, zombi, esqueleto, creeper, araña, enderman, piglin zombificado, ghast y blaze.
- **Estructuras:** mazmorras con generador y cofres, fortaleza con el portal del End y fortalezas del Nether con generadores de blazes.
- **El Nether:** portal de obsidiana (mínimo 4×5) encendido con mechero, coordenadas ×8, lava, piedra luminosa, cuarzo y arena de almas.
- **El End:** ojos de ender que guían a la fortaleza, 12 marcos, la isla con pilares de obsidiana, cristales que curan al dragón, el **Ender Dragon** y el portal de salida con el huevo.
- **Biomas del Nether:** desiertos de almas, bosques carmesí y distorsionado (hongos gigantes, nilio, luz de hongo), deltas de basalto y páramos, con hoglins, cubos de magma y verrugas del Nether que crecen en arena de almas.
- **Redstone:** polvo que pierde fuerza por bloque y sube/baja escalones, antorchas inversoras, palancas, botones, placas de presión, bloques de redstone, lámparas, puertas y dinamita que reaccionan, pistones normales y pegajosos (empujan hasta 12 bloques).
- **Pociones:** frascos que se llenan de agua, soporte para pociones con polvo de blaze como combustible y pociones de curación, fuerza, rapidez, regeneración y resistencia al fuego, bebibles o arrojadizas (con pólvora).
- **Yunque:** repara con el material o combinando dos objetos iguales y une sus encantamientos (coste en niveles, «¡Demasiado caro!» a partir de 40).
- **Vehículos:** barcos que navegan y vagonetas sobre raíles que se conectan solos (rectos, curvas y rampas); los raíles propulsores aceleran con redstone y frenan sin ella.
- **Gólems de hierro:** aparecen en las aldeas o se construyen con 4 bloques de hierro en T y una calabaza.
- **End exterior:** tras vencer al dragón aparece un portal de acceso que lleva a las islas exteriores, con plantas coro (su fruta teletransporta) y ciudades del End de púrpur con **élitros** y cohetes en su botín. Los élitros planean con la física de Minecraft y los cohetes te impulsan.
- **1.19 "The Wild":** bioma subterráneo **Deep Dark** con sculk, sensores de sculk (detectan vibraciones y dan señal de redstone), chilladores y catalizadores; **ciudades antiguas** con el gran portal de pizarra reforzada, faroles de almas y cofres; el **Warden** (ciego, se guía por vibraciones y olfato, golpea 30 de daño y lanza un ataque sónico que atraviesa la armadura) y el efecto de **oscuridad**. **Manglares** con raíces, barro y **ranas** de tres variantes que se comen los slimes pequeños.
- **1.20 "Trails & Tales":** **arboledas de cerezos** con pétalos que caen, **camellos** montables con embestida (Espacio), **arqueología** con el pincel (arena y grava sospechosas en pozos, **pirámides del desierto** con trampa de dinamita y **ruinas de sendero**), fragmentos de cerámica y vasijas decoradas, y la **mesa de herrería** con la plantilla de mejora a **netherite** (restos ancestrales en el Nether, herramientas y armaduras de netherite que no se queman en lava).
- **1.21 "Tricky Trials":** **cámaras de pruebas** subterráneas de toba y cobre con **generadores de pruebas** (oleadas que sueltan llaves) y **bóvedas**; el **Breeze** y las **cargas de viento** (te impulsan sin daño por caída y accionan puertas y palancas); el **núcleo pesado** y la **maza**, cuyo golpe crece con la altura de la caída.
- **Después de la 1.21:** **saquitos** (1.21.2) para guardar varios objetos en una ranura; **jardín pálido** (1.21.4) con robles pálidos, musgo, flores de ojo que se abren de noche, corazones de creaking y el **Creaking**, que solo se mueve cuando no lo miras y solo muere si rompes su corazón, además de la resina; **variantes cálidas y frías** de cerdos, vacas y gallinas, hojarasca, flores silvestres, arbustos, arbustos de luciérnagas y hojas que caen (1.21.5); **ghast seco**, ghastito y **ghast feliz** montable con arnés (1.21.6); **herramientas, armadura y cofre de cobre** y el **gólem de cobre**, que ordena los cofres (1.21.9).
- **Inventario completo:** tintes de 16 colores (de flores y mezclas), lana, hormigón, vidrio tintado y alfombras de todos los colores, piedra lisa, rocas pulidas, pizarra adoquinada y pulida, ladrillos agrietados y cincelados, arenisca cortada, cuarzo, ladrillos del Nether, bloques de lapislázuli y esmeralda, tablones de todas las maderas, escaleras y losas nuevas, farol, barril y telaraña. El modo creativo tiene pestañas por categoría y huevos generadores de todas las criaturas.
- **Encantamientos:** 32 en total, entre ellos castigo, perdición de los artrópodos, filo arrasador, reparación, todas las protecciones, espinas, afinidad y agilidad acuática, paso helado, velocidad de alma, sigilo, retroceso, densidad y ráfaga de viento para la maza y las maldiciones de ligamiento y desaparición. La mesa de encantamientos crea **libros encantados** y el yunque los aplica.
- **Estructuras:** minas abandonadas con raíles, soportes, telarañas y cofres; iglús, templos de la jungla, cabañas de bruja, puestos de avanzada con **saqueadores** y barcos naufragados, con su propio botín.
- **Más criaturas y estructuras:** la **bruja** vive en su cabaña y en los pantanos de noche, lanza pociones de veneno, lentitud, debilidad y daño y se cura bebiendo; **monumentos oceánicos** de prismarina con faroles marinos, esponjas y oro en el núcleo, protegidos por **guardianes** con láser y tres **guardianes ancianos** que causan fatiga minera; las **ciudades del End** ahora tienen casa, torre con puente y torre secundaria, sala con tejado piramidal, **shulkers** que te hacen levitar y **barcos del End** con los **élitros** expuestos en la bodega.
- **Animaciones:** los cofres abren y cierran la tapa y las puertas giran sobre su bisagra. Vista en **tercera persona (F5)** con el modelo del jugador, que muestra los élitros plegados o abiertos al planear. La **maza** tiene su propio modelo 3D.
- **Biomas nuevos y mejor repartidos:** **bosque oscuro** (robles oscuros de tronco doble que forman un techo de hojas y **setas gigantes**), **taiga nevada** con nieve sobre los árboles, **prados** llenos de flores en las laderas, **picos nevados** con hielo compacto, **océano cálido** de agua turquesa, **océano helado** con placas de hielo e **icebergs**, y **girasoles** en las llanuras. Las proporciones de cada bioma se parecen más a las del original: abundan llanuras y bosques, los badlands y el jardín pálido son raros, y las costas bajan poco a poco hasta **playas de arena** en lugar de acabar en acantilados.
- **Cielo nuevo:** degradado del horizonte al cénit, halo alrededor del sol, **atardeceres y amaneceres** anaranjados del lado del sol, nubes en 3D con caras sombreadas que se funden con el horizonte, sol y luna con resplandor, y luz de color según la hora (cálida al atardecer y azulada de noche).
- **Caballos y escudo:** los **caballos** aparecen en manadas en llanuras, sabanas y prados, con siete pelajes y velocidad y salto distintos. Para domarlos hay que montarlos varias veces hasta que dejan de encabritarse (las manzanas, el trigo, el azúcar y el pan ayudan). Con una **silla de montar** se dirigen y saltan con Espacio. El **escudo** bloquea golpes y flechas de frente mientras mantienes el clic derecho, pero te ralentiza y se desgasta. La **harina de hueso** convierte los champiñones en setas gigantes.
- **Gráficos vibrantes (edición 26.1):** al estilo de Vibrant Visuals, con **sombras reales** que proyectan el sol y la luna (árboles, casas y montañas; las hojas dejan pasar la luz por sus huecos), luz directa según hacia dónde mira cada cara, sombras azuladas por la luz del cielo, niebla que brilla del lado del sol (dorada al atardecer) y colores más vivos. En **Opciones → Gráficos** puedes cambiar entre *Vibrantes* y *Rápidos*.
- **Paquetes de recursos de Minecraft:** en **Opciones → Paquetes de recursos** puedes cargar un paquete de Minecraft Java Edition (.zip). Cambia las texturas de más de 250 bloques (incluidos lana, hormigón y vidrio de colores, con el tinte de bioma del césped y las hojas) y los iconos de los objetos (herramientas, armaduras, comida, minerales…). Admite texturas HD hasta 64×64 y se recuerda al volver a abrir el juego.
- **Mods:** en **Opciones → Mods** se añaden mods en JavaScript (los .jar de Java no pueden funcionar en un navegador) con la API `Blockverse`: `comando`, `receta`, `recetaSin`, `alRomperBloque`, `alActualizar`, `darObjeto`, `getBloque`/`setBloque`, `invocar`, `mensaje`, `efecto`. Hay un mod de ejemplo en `blockverse/mods/ejemplo.js` y un botón para instalarlo.
- **Saqueadores e invasiones:** saqueadores con ballesta, **vindicadores** con hacha, **patrullas** con un **capitán** que lleva el estandarte; matarlo da **Mal presagio** y, al entrar en una aldea, empieza una **invasión** de 3 a 5 oleadas con su barra; si ganas recibes **Héroe de la aldea** y esmeraldas.
- **Pirámides del desierto** como las del original (21×21, torres con franjas de terracota, sala con estrella de terracota y la cámara del tesoro con 4 cofres y trampa de dinamita) y **ciudades del End** con una segunda rama, sala colgante y estandartes.
- **Minerales** redibujados con vetas irregulares, borde oscuro y brillos. El **modo creativo** empieza con el inventario vacío, como en el original (todo está en la paleta).
- **Objetos como en el original:** espadas, picos, hachas, palas, azadas, lanzas, cascos, pecheras, pantalones, botas, pociones y arco redibujados píxel a píxel al estilo de Minecraft; la paleta del creativo muestra solo los iconos en ranuras (el nombre aparece al pasar el ratón).
- **Animaciones:** el arco se tensa con su cuerda y la flecha (y la vista se acerca, sin barra de carga), migas al comer y beber, brillo de encantamiento en el objeto de la mano, trozos al romperse una herramienta, y en tercera persona poses al tensar el arco, comer, cubrirse con el escudo y nadar.
- **Compatibilidad de versiones:** los paquetes de recursos se reconocen por su versión (Java 1.6 a 1.21 y 26.x por el `pack_format`, con los nombres antiguos de las texturas de la 1.12 o anterior) y también se cargan paquetes de **Bedrock (.mcpack)**; los mods pueden pedir una versión mínima con `// @blockverse 26.1` o `Blockverse.requiere('26.1')` y aceptan también los nombres en inglés de la API (`addCommand`, `addRecipe`, `onBlockBreak`, `onTick`, `give`).
- **Pantallas como en el original:** pantalla de título con panorámica que gira y frases amarillas, **Un jugador → Seleccionar mundo** con la lista de tus partidas guardadas (nombre, fecha, modo y tipo; buscar, jugar y borrar), **Crear nuevo mundo** (nombre, modo de juego, tipo Normal u One Block y semilla), **Opciones** y **menú de pausa** con «Guardar y salir al título». Cada mundo se guarda por separado con su propio modo de juego; la partida de versiones anteriores aparece en la lista como «Mi mundo».
- **Modo One Block:** al crear un mundo de tipo **One Block** empiezas sobre un único bloque flotando en el vacío. Cada vez que lo rompes aparece otro, siguiendo 11 fases: Llanuras, Subterráneo, Tundra helada, Jungla, Océano, Desierto, Cavernas profundas, Nether, Ciudad antigua, El End e Infinito. Cada fase tiene sus propios bloques, criaturas y cofres de botín. A los 10 bloques de cada fase sale un cofre con objetos clave (cubo de agua, cubo de lava, brotes, obsidiana, ojos de ender…). Al llegar al End aparece un **portal del End** unido a la isla para ir a por el dragón. Un marcador muestra la fase y el progreso, y la partida se guarda como cualquier otro mundo. Si te caes de la isla al vacío mueres al instante, también en creativo.
- **One Block moderno:** barra de jefe arriba con la fase, la barra por tramos y la siguiente fase; títulos grandes al empezar y al cambiar de fase; destellos del color de la fase alrededor del bloque mágico; **cofres raros** (con botín de la fase siguiente, diamantes, manzana dorada y libro encantado); y el comando `/oneblock` con tu progreso y la lista de fases.
- **Gráficos mejorados:** agua que refleja el cielo según el ángulo, con olas y el brillo del sol (o de la luna); hojas que se mecen con el viento; antorchas con un ligero parpadeo.
- **Lanzas y armaduras de caballo:** **lanzas** de todos los materiales con más alcance y un golpe de carga que crece con tu velocidad, sobre todo a caballo. **Armaduras de caballo** de cuero, hierro, oro y diamante que se ven sobre el caballo, reducen su daño y se sueltan si muere, igual que la silla.
- **Aspecto renovado:** interfaz al estilo clásico (paneles biselados, ranuras hundidas, botones de piedra, letra pixelada y descripciones emergentes), iconos con relieve, armas y objetos en 3D (en la mano y en el suelo), golpe en arco y balanceo de la mano, objetos que vuelan hacia ti al recogerlos, criaturas con textura, ojos, sombra, respiración, balanceo al caminar y que miran a su alrededor.
- **Encantamientos como en el original:** cada encantamiento tiene su peso y su rango de poder, la mesa calcula los tres costes según las librerías (hasta 15), muestra los costes en verde, el lapislázuli necesario y la pista «Filo III . . . ?» sobre un texto en alfabeto galáctico, y gasta 1, 2 o 3 niveles. Sobre la mesa flota un **libro que se abre y te mira**, y de las librerías salen runas hacia él. 43 encantamientos, con los nuevos **carga rápida, multidisparo, perforación, lealtad, conductividad, propulsión acuática, empalamiento, suerte marina, atracción, brecha y embestida**, y las incompatibilidades reales (infinidad y reparación, multidisparo y perforación…).
- **Afiladora:** quita los encantamientos (no las maldiciones) y devuelve experiencia, o une dos objetos iguales sumando durabilidad y un 5 % extra. El **yunque** ahora cobra como el original: penalización por uso previo que se duplica, coste según la rareza del encantamiento y «¡Demasiado caro!» a partir de 40. Los **bibliotecarios** venden libros encantados (esmeraldas + libro).
- **Ballesta, tridente y caña de pescar:** la ballesta se carga manteniendo el clic y dispara flechas críticas (3 con multidisparo, que atraviesan con perforación). El tridente se lanza manteniendo y soltando: con lealtad vuelve a tu mano, con conductividad llama a un rayo en las tormentas y con propulsión acuática te lanza por el agua o la lluvia sin daño de caída. Con la caña pescas bacalao, salmón, pez globo y pez tropical, además de basura y tesoros (arcos, cañas y libros encantados, sillas…); la atracción acorta la espera y la suerte marina da más tesoros. Nuevos **ahogados** en ríos y océanos: algunos llevan tridente y te lo lanzan.
- **Controles táctiles:** joystick, arrastrar para mirar, tocar para usar/colocar, mantener para romper y botones para saltar, agacharse, atacar, tirar e inventario.
- **Otros:** dinamita y explosiones, camas (dormir y punto de reaparición; en el Nether y el End explotan), perlas de ender, comandos y modo creativo con vuelo.

## Controles

| Tecla / acción | Efecto |
|---|---|
| `WASD` | Moverse (doble toque de `W` o mantener `R`: correr) |
| `Espacio` | Saltar y nadar (creativo: doble toque para volar) |
| `Shift` | Agacharse (no te caes de los bordes) / bajar volando / bajarse de un vehículo |
| Clic izquierdo (mantener) | Minar / atacar |
| Clic derecho | Colocar, usar, comer y beber, tensar el arco, abrir mesas, hornos, cofres, soportes y yunques, accionar palancas y botones, subirse a barcos, vagonetas y caballos, cubrirse con el escudo (mantener) |
| `Espacio` en el aire | Con élitros puestos: planear (clic derecho con un cohete para impulsarte) |
| Clic central | Creativo: copiar el bloque apuntado |
| `1`–`9` o rueda | Elegir objeto |
| `E` | Inventario |
| `Q` / `Shift+Q` | Tirar uno / toda la pila |
| `T` o `/` | Comandos (`/help`, `/gamemode`, `/time`, `/weather thunder`, `/give`, `/tp`, `/locate` (`fortress`, `stronghold`, `ancient`, `trial`, `cerezo`, `manglar`, `oscuro`, `prado`, `picos`, `helado`…), `/summon warden`…) |
| `F3` | Información de depuración |
| `F5` | Cambiar entre primera y tercera persona |
| `Esc` | Pausa |

## Cómo llegar al final

1. Tala árboles, fabrica una mesa, herramientas de madera y luego de piedra. Construye un refugio antes de la primera noche.
2. Baja por las cuevas: consigue carbón, hierro (funde en el horno) y diamantes cerca de Y -59.
3. Con pico de diamante mina obsidiana (o créala echando agua sobre lava) y arma un portal de 4×5. Enciéndelo con un mechero.
4. En el Nether busca una fortaleza (`/locate fortress` ayuda) y consigue varas de blaze. Caza endermen para las perlas.
5. Fabrica ojos de ender (polvo de blaze + perla). Lánzalos en la Superficie: te guían a la fortaleza.
6. Llena los 12 marcos del portal del End, entra y destruye los cristales de los pilares con flechas.
7. Derrota al Ender Dragon. Entra en el portal de salida para ver los créditos o busca el portal de acceso flotante para viajar a las islas exteriores, donde las ciudades del End guardan los élitros.

## Qué no incluye

Multijugador (necesitaría un servidor), caballos, sniffers, adornos de armadura, repetidores y comparadores de redstone, ruinas oceánicas y delfines. A partir de 2026 Mojang numera las versiones por año (26.1…); aquí se incluye hasta la 1.21.9.
