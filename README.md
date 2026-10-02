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
- **Modo One Block:** al crear un mundo de tipo **One Block** empiezas sobre un único bloque flotando en el vacío. Cada vez que lo rompes aparece otro, siguiendo 16 fases: Llanuras, Subterráneo, Tundra helada, Bosque de cerezos, Jungla, Pantano, Océano, Pradera de setas, Desierto, Montañas, Cavernas profundas, Mazmorra, Nether, Ciudad antigua, El End e Infinito. Cada fase tiene sus propios bloques, criaturas y cofres de botín. A los 10 bloques de cada fase sale un cofre con objetos clave (cubo de agua, cubo de lava, brotes, obsidiana, ojos de ender…). Al llegar al End aparece un **portal del End** unido a la isla para ir a por el dragón. Un marcador muestra la fase y el progreso, y la partida se guarda como cualquier otro mundo. Si te caes de la isla al vacío mueres al instante, también en creativo.
- **One Block moderno:** barra de jefe arriba con la fase, la barra por tramos y la siguiente fase; títulos grandes al empezar y al cambiar de fase; destellos del color de la fase alrededor del bloque mágico; **cofres raros** (con botín de la fase siguiente, diamantes, manzana dorada y libro encantado); y el comando `/oneblock` con tu progreso y la lista de fases.
- **Gráficos mejorados:** agua que refleja el cielo según el ángulo, con olas y el brillo del sol (o de la luna); hojas que se mecen con el viento; antorchas con un ligero parpadeo.
- **Lanzas y armaduras de caballo:** **lanzas** de todos los materiales con más alcance y un golpe de carga que crece con tu velocidad, sobre todo a caballo. **Armaduras de caballo** de cuero, hierro, oro y diamante que se ven sobre el caballo, reducen su daño y se sueltan si muere, igual que la silla.
- **Aspecto renovado:** interfaz al estilo clásico (paneles biselados, ranuras hundidas, botones de piedra, letra pixelada y descripciones emergentes), iconos con relieve, armas y objetos en 3D (en la mano y en el suelo), golpe en arco y balanceo de la mano, objetos que vuelan hacia ti al recogerlos, criaturas con textura, ojos, sombra, respiración, balanceo al caminar y que miran a su alrededor.
- **Encantamientos como en el original:** cada encantamiento tiene su peso y su rango de poder, la mesa calcula los tres costes según las librerías (hasta 15), muestra los costes en verde, el lapislázuli necesario y la pista «Filo III . . . ?» sobre un texto en alfabeto galáctico, y gasta 1, 2 o 3 niveles. Sobre la mesa flota un **libro que se abre y te mira**, y de las librerías salen runas hacia él. 43 encantamientos, con los nuevos **carga rápida, multidisparo, perforación, lealtad, conductividad, propulsión acuática, empalamiento, suerte marina, atracción, brecha y embestida**, y las incompatibilidades reales (infinidad y reparación, multidisparo y perforación…).
- **Afiladora:** quita los encantamientos (no las maldiciones) y devuelve experiencia, o une dos objetos iguales sumando durabilidad y un 5 % extra. El **yunque** ahora cobra como el original: penalización por uso previo que se duplica, coste según la rareza del encantamiento y «¡Demasiado caro!» a partir de 40. Los **bibliotecarios** venden libros encantados (esmeraldas + libro).
- **Ballesta, tridente y caña de pescar:** la ballesta se carga manteniendo el clic y dispara flechas críticas (3 con multidisparo, que atraviesan con perforación). El tridente se lanza manteniendo y soltando: con lealtad vuelve a tu mano, con conductividad llama a un rayo en las tormentas y con propulsión acuática te lanza por el agua o la lluvia sin daño de caída. Con la caña pescas bacalao, salmón, pez globo y pez tropical, además de basura y tesoros (arcos, cañas y libros encantados, sillas…); la atracción acorta la espera y la suerte marina da más tesoros. Nuevos **ahogados** en ríos y océanos: algunos llevan tridente y te lo lanzan.
- **Más criaturas:** **lobos** (se doman con huesos, se sientan con clic derecho, te siguen, se teletransportan a tu lado, atacan a lo que golpeas o a lo que te ataca y se curan con carne), **gatos** (se doman con bacalao o salmón crudo y los creepers huyen de ellos), **zorros** (duermen de día y cazan gallinas y conejos), **conejos** (saltan y huyen; sueltan carne, piel y pata), **calamares** (sueltan tinta), **murciélagos** en las cuevas, **cabras** (saltan mucho, embisten y pierden los cuernos al chocar) y **osos polares** que defienden a sus crías. Cada una aparece en sus biomas y tiene su huevo en el creativo. Las mascotas domadas se guardan con el mundo.
- **IA mejorada:** las criaturas evitan precipicios, lava, fuego y cactus y buscan otro camino si se atascan; hay zombis bebé (más rápidos) y zombis y esqueletos con armadura de cuero, oro o hierro que les protege y a veces la sueltan.
- **Inventario en creativo:** la pestaña 🎒 de la paleta abre tu inventario (armadura, mochila y una papelera para destruir objetos) y un botón vuelve a los objetos del creativo.
- **Repartir arrastrando:** con una pila en el cursor, mantén el clic izquierdo y pasa por varias ranuras (por ejemplo, las de fabricación) para repartirla a partes iguales, o mantén el clic derecho para poner uno en cada ranura.
- **One Block ampliado:** 16 fases (nuevas: Bosque de cerezos, Pantano, Pradera de setas, Montañas y Mazmorra), bloques raros de cada fase (bloques de hierro, oro, esmeralda, diamante…), hitos cada 100 bloques con experiencia y premio, y las nuevas criaturas en sus fases.
- **Menús renovados:** pantalla de título sin marco con el logotipo de piedra en 3D, la frase amarilla que late, botones de piedra con borde blanco al pasar el ratón y sonido de clic, y pantalla completa. Las demás pantallas ocupan toda la ventana sobre la panorámica desenfocada. Los mundos muestran su **miniatura**, hay una **pantalla de carga** con el mapa de chunks y la barra de progreso, y en la pausa puedes guardar una **captura de pantalla**. La pantalla de muerte es un velo rojo y la cámara cae de lado.
- **Opciones con deslizadores:** campo de visión, distancia de visión (2 a 12 chunks), brillo, sensibilidad del ratón y volumen; y botones para partículas (todas, reducidas, mínimas), nubes, movimiento de cámara, animación de chunks y gráficos. Los controles están en su propia pantalla. Todo se guarda.
- **Más ambiente:** llamas y humo en las antorchas y el fuego, chispas de la lava, remolinos morados del portal del Nether, halos de luz cálida alrededor de antorchas, faroles y fuego de noche o bajo tierra, salpicaduras de lluvia en el suelo y el agua, y chunks que suben suavemente al cargarse.
- **Animaciones nuevas:** la cámara baja suavemente al agacharse y se hunde al caer desde alto, las ovejas comen hierba (convierten el césped en tierra) y la barra de objetos salta al cambiar de ranura.
- **Shaders (opción «Shaders: Sí»):** resplandor en lo brillante (sol, lava, antorchas, piedra luminosa), rayos de sol que atraviesan las nubes y los árboles, color cinematográfico según la hora (amaneceres dorados, noches azuladas), el aire que ondula por el calor en el Nether, contraste, saturación y viñeta. En móviles viene desactivado por rendimiento.
- **Nether y End más vistosos:** cascadas de lava que caen del techo del Nether, partículas flotantes en cada bioma (esporas rojas y turquesa, ceniza, almas que suben del valle), cielo del End con su textura clásica, ojos que brillan en la oscuridad (enderman, arañas, ahogados) y partículas moradas alrededor de los enderman.
- **Inventario creativo como el original:** pestañas arriba y abajo con iconos (bloques de construcción, colores, naturales, útiles, redstone, buscar, herramientas, combate, comida, ingredientes, huevos e inventario de supervivencia), rejilla de 9 columnas con barra de desplazamiento, papelera y barra de objetos. El inventario de supervivencia muestra el **muñeco del jugador** con la armadura puesta, que sigue el ratón con la mirada.
- **Barra de vida mejorada:** los corazones parpadean al recibir daño, hacen una ola al regenerarse, se vuelven negros con la descomposición y dorados con la absorción; el hambre tiembla sin saturación y, a caballo, se ve la vida de la montura.
- **Más de 150 bloques y objetos nuevos:** terracota de 16 colores y esmaltada, hormigón en polvo, velas, amatista y geodas, calcita, espeleotemas, corales, cobre que se oxida, nidos de abejas, colmenas, miel, campana, cadena, fogatas, diana, magnetita, ancla de reaparición, andamios, bambú, algas, azaleas, hielo azul, micelio, podzol, bloques de oficio (cartografía, telar, ahumador, alto horno, compostador, cortapiedras, atril, mesa de flechas, caldero, tocadiscos); comida (zanahoria, patata, remolacha, bayas, galleta, pastel de calabaza, miel, estofado de conejo…) y objetos con su función: **tótem de la inmortalidad**, **catalejo**, **brújula**, **reloj**, **mapa** que se dibuja al tenerlo en la mano, **etiquetas** para poner nombre, **riendas**, bolas de nieve y huevos que se lanzan, **discos de música** en el tocadiscos y el compostador que da polvo de hueso.
- **32 criaturas nuevas:** ajolotes, abejas, loros, pandas, llamas que escupen, tortugas, delfines, bacalaos, salmones, peces tropicales, peces globo que se hinchan, champiñacas (dan estofado), ocelotes, striders en la lava, sniffers que desentierran semillas, armadillos que se enroscan, calamares brillantes, burros, mulas, esqueletos errantes (ralentizan), momias (dan hambre), esqueletos wither, piglins brutos, evocadores con colmillos y vex, devastadores en las invasiones, phantoms de noche, lepismas, endermitas, **gólems de nieve y de hierro que se construyen**, allays que te traen objetos y aldeanos zombi que se curan con una manzana dorada.
- **Estructuras nuevas:** mansión del bosque (con vindicadores y evocadores), bastión en ruinas en el Nether (con piglins brutos y oro), geodas de amatista, fósiles, ruinas oceánicas, tesoro enterrado, rocas del bosque y el sótano secreto del iglú. `/locate mansion` y `/locate bastion` las encuentran.
- **9 biomas nuevos:** campos de champiñones, bosque de flores, llanura de girasoles, espigas de hielo, jungla de bambú, badlands erosionados, taiga de árboles gigantes, océano profundo y picos pedregosos; además arrecifes de coral en el océano cálido, algas y pasto marino en los océanos, y **cuevas frondosas** y **cuevas de espeleotemas**.
- **Agua con reflejos:** con los shaders, el agua refleja el paisaje, las nubes, el sol y la luna, con olas; los atardeceres tiñen el cielo de rosa y morado. Las menas tienen el aspecto moderno (gemas de diamante y esmeralda, polvo de redstone, vetas de cuarzo).
- **Cultivos como en el original:** trigo, zanahorias, patatas, remolachas, sandías y calabazas (su tallo hace crecer el fruto al lado) y arbustos de bayas dulces (se recogen con clic derecho y pinchan al atravesarlos). La tierra de cultivo se oscurece y humedece cerca del agua o con lluvia (los cultivos crecen el doble de rápido), vuelve a tierra si se seca sin nada plantado y se pisotea al caer encima. Las hileras alternas crecen mejor, la harina de hueso adelanta etapas y los huertos de las aldeas mezclan cultivos.
- **Sonidos para todo:** cada material suena distinto al romper, poner, golpear y pisar (piedra, madera, tierra, arena, grava, nieve, lana, vidrio, metal, plantas, hojas, netherrack, almas, sculk, amatista, cobre, miel, slime, hueso, barro, musgo, coral). Todas las criaturas tienen voz, sonido de daño y de muerte. Ambiente de pájaros, grillos, ranas, viento, olas, goteo en cuevas, agua, fuego, hornos, portales, Nether y End, agua amortiguada al bucear; y **música de piano** generada al momento (opción «Música»). También suenan el inventario, la armadura, tirar objetos, nadar, arar, plantar y cosechar.
- **Aldeanos mejorados:** 12 profesiones con ropa propia (granjero, bibliotecario, herrero, clérigo, pescador, carnicero, cartógrafo, flechero, armero, pastor, albañil y herramientero, además de curtidor) y **niveles** de novato a maestro: al comerciar ganan experiencia, suben de nivel con partículas y desbloquean más ofertas. Reabastecen por la mañana y a mediodía, duermen de noche en el centro de la aldea, los granjeros cosechan y replantan, los niños corretean y los aldeanos tienen hijos. Si les pegas protestan y los gólems te persiguen.
- **Criaturas más listas:** los zombis cazan aldeanos (y pueden convertirlos en aldeanos zombi), las crías siguen a sus padres y los esqueletos huyen de los lobos.
- **Bloques como en la edición Java:** todas las texturas de bloques rehechas con paletas de pocos tonos y los patrones del original: piedra moteada, adoquín con juntas y relieve, tierra, césped con borde irregular, tablones de cuatro tablas con uniones y vetas (con el color exacto de cada madera), troncos con surcos y anillos, abedul con marcas negras, ladrillos pieza a pieza, ladrillos de piedra, arenisca por capas, lana tejida, hormigón liso, vidrio con reflejos, cuarzo, purpur en baldosas, piedra del End, prismarina, obsidiana con vetas moradas, roca madre, granito, diorita, andesita, bloques de metal con bisel y paneles, piedra luminosa y arena de almas con caras. Los iconos del inventario se sombrean como en el original (arriba a plena luz, laterales al 80 % y 60 %) y la pestaña «Bloques de construcción» sigue el orden de Java: maderas, piedras, pizarra, ladrillos, arenisca, prismarina, Nether, End, cuarzo, cobre y metales.
- **Herramientas y armas rediseñadas:** picos, hachas, palas, azadas, espadas y lanzas de todos los materiales se dibujan como en el original, con contorno oscuro del color del material, cuatro tonos (filo brillante, cara clara, cuerpo y sombra) y el palo en diagonal. La flecha, el tridente, la caña de pescar, la maza y el mechero también se rehicieron con ese estilo, y en la mano se ven igual de nítidos.
- **Cofres dobles:** pon un cofre al lado de otro y se unen en un **cofre grande de 54 huecos** (agachado se pone suelto, como en Java). El modelo es una sola pieza con un único cerrojo en el centro y la tapa grande se abre entera; al romper una mitad, la otra vuelve a ser un cofre normal y la rota suelta lo que tenía.
- **Mano secundaria:** nuevo hueco con silueta de escudo en el inventario (Mayús+clic lleva ahí escudos y tótems) y a la izquierda de la barra rápida. Con **F** cambias el objeto entre las dos manos (volar en creativo sigue siendo doble Espacio). Lo que llevas se ve en la mano izquierda y en el muñeco. Con un pico, una espada o la mano vacía, el clic derecho coloca las antorchas o bloques de la mano secundaria; las flechas de la secundaria se gastan primero y el tótem también te salva desde ella.
- **Escudos como en Java:** se levantan **manteniendo el clic derecho** (al momento, sin retraso apreciable), tanto en la mano principal como en la secundaria; desde la secundaria funcionan con casi todo en la principal, salvo si el clic derecho ya hace algo (comer, beber, tensar el arco o la ballesta, lanzar la caña o colocar el bloque que apuntas) y se ven a la izquierda cubriéndote. Paran golpes, flechas y ahora también explosiones de frente, y gastan su propia durabilidad.
- **Pesca más clara:** con la caña, lanza el corcho al agua y espera (de 5 a 30 s, menos con lluvia o Atracción). Cuando el pez se acerca verás la estela; al picar suena, el corcho se hunde y un aviso dice «¡Ha picado! Clic derecho para recoger». Tienes casi el doble de tiempo que antes para recoger, y te avisa de lo que has pescado o si recogiste demasiado pronto o sobre tierra. Se pescan bacalao, salmón, pez tropical y pez globo, además de tesoros (libros encantados, arcos, cañas, sillas, nenúfares) y algo de basura.
- **Estructuras más variadas y botín como en Java:** cada cofre usa las tablas de botín del original por grupos (cada grupo hace varias tiradas y elige por peso, con tiradas vacías), las pilas se reparten en trozos por huecos al azar y las armas y armaduras pueden salir encantadas o gastadas: no hay dos cofres iguales. Las mazmorras miden 7×7, 7×9 o 9×9, tienen 1 o 2 cofres en paredes al azar y su generador es de zombi (50 %), esqueleto (25 %) o araña (25 %). Las estructuras se desgastan al azar (ladrillos musgosos y agrietados, adoquín musgoso bajo tierra, telarañas en las minas). Con `/probabilidades` ves la probabilidad de cada estructura y con `/botin <tipo>` lo que puede salir en cada cofre; todas las tablas están en [PROBABILIDADES.md](blockverse/PROBABILIDADES.md).
- **Objetos y bloques rediseñados:** unos 60 objetos se dibujan ahora como en el original, con contorno del color del material y cuatro tonos: palo, carbón, minerales en bruto, lingotes (hierro, oro, cobre, netherita, ladrillo), diamante tallado, esmeralda, lapislázuli, cuarzo, amatista, pedernal, pepitas, manzanas, pan, carnes crudas y cocinadas (con grasa o marcas de parrilla), muslos de pollo, polvos (redstone, piedra luminosa, pólvora, azúcar, blaze, harina de hueso), hueso, cuerda, pluma, perla y ojo de ender, bolas de slime, nieve y arcilla, huevo, varas, trigo, semillas, cuero, papel, libro, zanahoria, patatas, remolacha, galleta, cubos (vacío, con agua y con lava), brújula y reloj. También se rehicieron la mesa de trabajo (con sierra y martillo), el horno (boca con rejilla), la calabaza y su linterna, la sandía, la bala de heno y el cactus.
- **Más objetos rediseñados:** todas las armaduras (casco, pechera, pantalones y botas de cada material, con costuras y brillo), todas las pociones y pociones arrojadizas (frasco redondo de vidrio con tapón y el líquido de su color), el frasco vacío, el de agua y el de miel, los 16 tintes, todos los huevos generadores (con los dos colores de cada criatura), los peces (bacalao, salmón, pez tropical y pez globo), cuencos y estofados, rodaja de sandía normal y brillante, zanahoria dorada, lágrima de ghast, crema de magma, verruga del Nether, fruta coral, fragmentos y cristales de prismarina, caparazón de shulker, corazón del mar, escama de tortuga, membrana de phantom, bolsa de tinta, pata y piel de conejo, etiqueta, rienda, silla, mapa, tótem, bayas, pastel de calabaza, flecha espectral, cohete, ojo de araña y libro encantado.
- **Controles táctiles:** joystick, arrastrar para mirar, tocar para usar/colocar, mantener para romper y botones para saltar, agacharse, atacar, tirar e inventario.
- **Otros:** dinamita y explosiones, camas (dormir y punto de reaparición; en el Nether y el End explotan), perlas de ender, comandos y modo creativo con vuelo.

## Controles

| Tecla / acción | Efecto |
|---|---|
| `WASD` | Moverse (doble toque de `W`, o mantener `R` o `Ctrl`: correr) |
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

## Bed Wars

Botón **Bed Wars** en el menú principal (o `/bedwars [1-4]` en el chat).

- **Mapa:** cuatro equipos (Rojo, Azul, Verde y Amarillo) en islas flotantes con su cama, su generador, la TIENDA y las MEJORAS; cuatro islas de diamante y un centro con dos generadores de esmeraldas. Debajo, el vacío.
- **Modos:** Solos, Dúos, Tríos y Cuartetos (tus compañeros y los rivales los controlan bots) y tres dificultades de bots.
- **Generadores:** hierro cada ~1 s (hasta 48) y oro cada 6 s (hasta 12) en cada isla; diamantes cada 30/23/15 s y esmeraldas cada 65/50/35 s según la fase, con un cartel que muestra el nivel y la cuenta atrás.
- **Tienda de objetos** (con el precio en hierro, oro o esmeraldas como en el original): lana de tu color, terracota, vidrio a prueba de explosiones, piedra del End, escaleras, tablones, obsidiana; espadas de piedra, hierro y diamante y el palo de empuje; armadura permanente de cota, hierro y diamante; picos y hachas que se mejoran por niveles; flechas y arcos (normal, Poder I y Poder I + Impacto I); pociones de Rapidez II, Supersalto V e Invisibilidad; manzana dorada, bola de fuego, dinamita que se enciende sola, perla de ender, cubo de agua, huevo puente (va dejando un puente de lana) y esponjas.
- **Mejoras del equipo** (con diamantes): Espadas afiladas, Armadura reforzada I-IV, Minero frenético I-II, Forja I-IV (la III da esmeraldas en tu isla) y Fuente de curación; y una cola de hasta 3 **trampas** (¡Es una trampa!, Contraofensiva, Alarma y Fatiga minera) que saltan cuando un enemigo pisa tu isla.
- **Reglas:** solo se pueden romper los bloques que ponen los jugadores; tu propia cama no se puede romper; las explosiones no rompen el mapa ni el vidrio ni la obsidiana. Mientras tu cama siga en pie reapareces a los 5 s (conservas la armadura comprada, el pico y el hacha bajan un nivel); sin cama, la muerte es **definitiva** y pasas a espectador. Si te matan, tus recursos son para quien te mató.
- **Fases:** Diamante II (5:00), Esmeralda II (10:00), Diamante III (15:00), Esmeralda III (20:00), Camas destruidas (25:00) y Fin de la partida (30:00).
- **Bots:** recogen recursos, compran lana, espadas, armadura y mejoras, patrullan su cama, tienden puentes de lana hasta otras islas, rompen las defensas y la cama enemiga, y pelean contigo y entre ellos.
- **Marcador** a la derecha con el siguiente evento, el estado de cada equipo (✔ cama en pie, número de vivos o ✘) y tus bajas, bajas finales y camas rotas; pantalla de victoria o derrota con estadísticas y «Jugar otra vez».

### Bed Wars 2.0 (al estilo de Hypixel)
- **Modos como en el original:** Solos y Dúos con **8 equipos** (Rojo, Azul, Verde, Amarillo, Aguamarina, Blanco, Rosa y Gris) y Tríos, Cuartetos o 4×1 con 4 equipos.
- **Cuatro mapas** con su ambiente y su hora del día: **Jardín** (robles y flores), **Invierno** (nieve, hielo y abetos), **Infierno** (netherrack, hongos carmesí y piedra luminosa al atardecer) y **Desierto** (arena, arenisca y cactus), o uno al azar.
- **Islas decoradas:** plataforma de aparición con la lana del equipo, **cama de dos bloques de su color** sobre terracota, generador de hierro vallado, casetas con techo para la TIENDA y las MEJORAS, cofre del equipo, farolas y árboles. Islas de diamante con rocas y un centro de dos alturas con un faro y 2 o 4 generadores de esmeraldas.
- **Sala de espera** de cristal sobre el centro con cuenta atrás («Empieza en 5…») y bocina al empezar.
- **Bloques de diamante y esmeralda girando** sobre sus generadores, con un holograma de tres líneas (tipo, nivel y «Aparece en N s»).
- **Compra rápida** como primera pestaña de la tienda y objetos nuevos: **torre compacta** (se monta sola una torre de lana con escalera y almenas), **chinche** (lanzas una bola de nieve y sale una lepisma que pelea por ti 15 s), **defensor de los sueños** (un gólem de hierro de tu equipo durante 4 minutos) y **leche mágica** (30 s sin trampas).
- **Bots con nombre de jugador** (xXProGamerXx, SrPuentes, CapitanCama…) que hablan en el chat («gg», «ez», «¡cama rota! 😈», «lag»…), **cubren su cama con lana y terracota** al empezar, lanzan **bolas de fuego** contra las defensas y empujan más fuerte hacia el vacío.
- **Chat de colores** (CAMA DESTRUIDA, ¡ELIMINACIÓN FINAL!, EQUIPO ELIMINADO y nombres con el color del equipo), «+1 baja» / «¡BAJA FINAL!» con sonido, título grande al morir con la cuenta atrás y **marcador como el original** (fecha, siguiente evento, equipos y www.blockverse.net).
- **Niveles con estrellas [N✫]** y estadísticas guardadas: victorias, partidas, bajas, bajas finales, camas, FKDR y racha. Al acabar recibes **XP de Bed Wars** (con barra de progreso y subida de nivel) y, si ganas, **fuegos artificiales**.

### Tienda de Bed Wars (al estilo de Hypixel)

- **Cuadrícula de objetos** con iconos, **pestañas con iconos** y tu dinero (hierro, oro, diamantes y esmeraldas) siempre a la vista.
- Cada objeto muestra su **precio con el icono de la moneda**: en rojo si no te llega, con ✔ si ya lo tienes, y el nivel actual del pico y del hacha. Al pasar el ratón: descripción, coste y si puedes comprarlo, con colores.
- **Clic:** comprar · **Mayús+clic:** comprar varias veces (hasta 64, por ejemplo 64 de lana de golpe) · **Clic derecho:** añadir o quitar de **Compra rápida** (se guarda).
- Destello verde al comprar y rojo (con temblor) si no te alcanza.
- Nuevo: **Tijeras permanentes** (20 hierro), que cortan la lana al instante y no se pierden al morir.
- **Mejoras del equipo** en cuadrícula con sus niveles (puntos verdes) y la **cola de trampas** con sus iconos.

- **Recursos compartidos:** si un compañero (bot o jugador en red) coge hierro u oro del generador de tu equipo y tú estás en la base, a ti también te llega lo mismo, como en Hypixel.

- **Salir de una partida** («Guardar y salir al título», «Abandonar Bed Wars» o «Salir al menú» al terminar) la cierra del todo, sin recargar la página: se quitan bots, carteles, hologramas y el marcador, se acaban las reglas de Bed Wars y el modo espectador, y vuelves al título. Antes, al salir con «Guardar y salir al título» la partida seguía activa por debajo y estropeaba los mundos normales.

### Bed Wars en red
Conéctate antes en **Multijugador** y que el anfitrión pulse **Bed Wars → ¡Jugar!**: cada jugador conectado ocupa el sitio de un bot en un equipo (en Solos, un equipo cada uno; en Dúos, Tríos o Cuartetos se van llenando). El anfitrión simula los bots, lleva el reloj, las camas, las eliminaciones y decide quién gana; se comparten los bloques, los golpes entre jugadores y a los bots, las camas rotas, las muertes y las explosiones (quien la provoca rompe los bloques y los demás ven el efecto y reciben el daño). Quien entra con la partida empezada la ve como espectador.

## Calidad gráfica
En **Opciones → Calidad gráfica**: Baja, Media, Alta y Ultra. Ajusta la resolución de dibujo (Ultra hace supermuestreo ×1,5), el antialiasing **MSAA 4×** (con los shaders) y el **filtrado anisótropo** (hasta 16×). Si el ordenador no tiene tarjeta gráfica (o es un móvil), empieza en Media. Las texturas de los bloques usan ahora **mipmaps** hechos a medida (conservan la transparencia y el tinte de hojas y césped), así que el terreno lejano se ve nítido y sin parpadeo ni muaré. Además, la cara de arriba de césped, tierra, arena, grava, piedra, nieve, netherrack y otros suelos se **gira al azar** en cada bloque, como en el original, para que no se note la repetición.

## Combate

- **Golpe crítico** como en el original: **salta y golpea mientras caes** con la barra de ataque cargada (espada, hacha o lo que lleves) para hacer **×1,5 de daño**. Ahora se nota: estrellas de crítico (azules si el arma está encantada), sonido, cabeceo de cámara y número de daño dorado con ✦. También funciona contra otros jugadores en Bed Wars en red.
- **Indicador de ataque** con forma de espada bajo la mira: se va llenando mientras se recarga el golpe y se ilumina cuando está listo y tienes a alguien al alcance.
- **Números de daño** flotantes sobre el enemigo (se pueden quitar en Opciones).
- Los **bots de Bed Wars** también saltan para dar críticos.
- **Se ve el equipo del enemigo:** armadura con textura (cuero del color del equipo, cobre, hierro, oro, diamante y netherite) y el **objeto que lleva en la mano**, en los bots de Bed Wars, en los demás jugadores en red, en los zombis con armadura y en tu propio personaje (F5).

## Mobs, animales y skins

- **Texturas pixeladas cara a cara** en los mobs principales, como las hojas de textura del original: cerdos con hocico y orejas, vacas con manchas, ubre y morro (y la champiñaca roja), ovejas con lana esponjosa, gallinas con cresta y barbilla, zombis, momias y aldeanos zombi, esqueletos con costillas y calavera, el camuflaje y la cara del creeper, arañas peludas, endermans, aldeanos con uniceja y sombrero según su oficio, el gólem de hierro agrietado y con enredaderas, y lobos.
- **Ojos que brillan** en la oscuridad (arañas y endermans), **parpadeo**, colas que se mueven, cabeceo al andar, gallinas que adelantan la cabeza, zombis que tambalean los brazos y **crías con la cabeza grande**. Los ojos, hocicos y sombreros de todos los mobs giran ahora junto con la cabeza.
- **Ovejas de colores naturales** (blanca, gris, negra, marrón y rosa muy rara). Se **tiñen** con clic derecho y un tinte, y se **esquilan** con las **tijeras** nuevas (2 lingotes de hierro en diagonal): sueltan 1–3 de lana de su color y les vuelve a crecer al comer hierba.
- **Skins del jugador** con el formato 64×64 del original (capa base y capa exterior): Steve, Alex (brazos finos), Exploradora, Caballero, Ninja, Sudadera y Astronauta, o **sube tu propio PNG** (64×64 o el antiguo 64×32) en **Skins…** del menú o de la pausa. Se ve en tercera persona (F5), en el brazo en primera persona, en el muñeco del inventario y la ven los demás jugadores en el multijugador. Los bots de Bed Wars llevan una skin del color de su equipo.

## Rendimiento (más FPS)

- **Sombras en caché:** el mapa de sombras del sol (2048×2048) ya no se redibuja en cada fotograma, solo cuando cambia el terreno, el sol avanza un poco o te alejas un par de bloques. Era lo que más costaba; con la cámara quieta el juego va unas 2,5 veces más rápido.
- **No se dibuja lo que tapa la niebla:** los chunks, criaturas y entidades que quedan del todo dentro de la niebla se saltan (en la vista y en el reflejo del agua).
- **Reflejo del agua** a un tercio de la resolución.
- **Resolución dinámica:** si los FPS bajan de 48 de forma sostenida se reduce la resolución de la imagen interna (hasta el 60 %) y se recupera cuando hay margen. El lienzo no se redimensiona, así que la pantalla ya no parpadea en negro.
- En **Opciones**: «Resolución dinámica», «Mostrar FPS» (contador arriba a la derecha) y «No dibujar tras la niebla». Para aún más FPS: Calidad gráfica Baja, Gráficos Rápidos o menos distancia de renderizado.

## Animaciones de espadas y herramientas

- **Cada herramienta tiene su golpe**, con preparación, impacto y recuperación suaves:
  - **Espada:** tajos que alternan de derecha a izquierda y de revés si encadenas golpes, con una **estela** que sigue al filo (ancha en el ataque de barrido y dorada en los críticos).
  - **Hacha:** hachazo de arriba abajo con estela vertical. **Maza:** mazazo cargado.
  - **Pico y azada:** pican. **Pala:** palea. **Lanza y tridente:** estocada. **Mano vacía:** puñetazo. **Usar o colocar:** un gesto corto.
- Al **picar un bloque** el golpe se repite en bucle sin saltos.
- La **cámara cabecea** un poco al impactar: más con el hacha, la maza y los críticos.
- Si atacas antes de que se recargue el golpe, el movimiento es más corto y flojo.
- En **tercera persona** el brazo hace el mismo golpe y el torso gira con él.

## Chromebook y teclados sin teclas F

- **F + 5** = F5 (tercera persona) y **F + 3** = F3 (información de depuración). Puedes mantener F y pulsar el número, o pulsar F y justo después el número.
- La **F sola** sigue cambiando el objeto de mano (ahora al soltarla).
- **Arreglado el salto sin parar:** si una tecla se suelta sin que el juego se entere (por ejemplo, con Ctrl+Espacio, que en Chromebook cambia el idioma del teclado), ahora se suelta sola.
- **Correr con Ctrl** (como en el original). Mientras juegas, los atajos del navegador con Ctrl quedan bloqueados; en pantalla completa también Ctrl+W, y si el navegador intenta cerrar la pestaña, pregunta antes.

## Objetos en la mano en tercera persona (F5)

- Las **herramientas y armas** se agarran por el mango con la punta hacia delante y arriba, como en el original (antes se veían tumbadas, como una raya).
- **Comida, cubos, antorchas y otros objetos** van de pie en el puño, más pequeños; los **bloques**, como un cubito girado.
- La **lanza y el tridente** se sujetan como lanzas, el **arco** de lado, y el **escudo** y la **maza** con su modelo 3D.
- La **mano secundaria** también se ve (por ejemplo, el escudo en la izquierda) y el objeto principal va en la mano **derecha**.
- Los objetos reciben la **luz del entorno** (ya no brillan de noche) y los **encantados** brillan en morado.

## Modo espectador

- Al quedar **eliminado en Bed Wars** (o con `/gamemode espectador` en cualquier mundo) ya no juegas: **vuelas atravesando bloques** y **no puedes pegar**, romper, poner, usar, abrir el inventario ni recoger nada. Los mobs y los bots te ignoran y los demás jugadores no te ven.
- **Mira a cada jugador:** clic izquierdo/derecho para pasar al siguiente o al anterior (bots y jugadores en red), **1–9** para elegir de la lista y **Mayús** para volver a volar libre. Lo ves desde sus ojos (o en tercera persona con F5) y un panel muestra su nombre, equipo, vida y lo que lleva en la mano. La **rueda** cambia la velocidad de vuelo.

## Opciones, paquetes de recursos y mods

- **Opciones ordenadas** como en el original: Gráficos y rendimiento, Música y sonidos, Controles y cámara, Interfaz, Skins, Paquetes de recursos y Mods. Caben en pantallas bajas (Chromebook) y se pueden desplazar.
- Nuevo: **Tamaño de la interfaz** (80 % a 130 %).
- Arreglado: **«Nubes: No»** ya quita las nubes y el botón **Multijugador** repetido (y apagado) de la pantalla de título.
- **Paquetes de recursos y mods:** además del botón, puedes **arrastrar** el archivo (.zip/.mcpack, .js o una skin .png) a la ventana del juego. Los mods se pueden **escribir o pegar** directamente. Si el navegador no deja guardar, siguen funcionando mientras juegas; si la página no deja ejecutar código con `new Function`, el mod se carga de otra forma, y si nada funciona te dice que descargues el juego (`blockverse-un-archivo.html`) para usarlos.

## Mesas de trabajo, fabricación y hornos

- **Números de las pilas nítidos:** se dibujan con una fuente de píxeles propia (como la del original) a la resolución real de la pantalla, sin bordes borrosos.
- **Libro de recetas** junto al inventario y la mesa de trabajo: muestra lo que puedes fabricar con lo que llevas (o todas las recetas, con buscador). **Clic** coloca los ingredientes; **Mayús+clic** coloca para fabricar todo lo posible.
- **Arrastrar** una pila por varias casillas la reparte a partes iguales (con clic derecho, una en cada una) y **doble clic** junta todas las del mismo tipo.
- Sonido al fabricar.
- **Horno** con la llama y la flecha de progreso del original. Los hornos **se encienden** mientras queman: se ve el fuego dentro, **dan luz** y echan humo y chispas.
- **Ahumador:** solo comida, el doble de rápido. **Alto horno:** solo minerales, metales y armaduras, el doble de rápido.
- Arreglado: romper un ahumador o un alto horno ahora suelta lo que tenga dentro.

## Biomas sin errores

- **Campos de champiñones:** los champiñones gigantes salían a trozos (solo el sombrero, flotando y sin tronco). Ahora salen completos: rojos con cúpula y marrones con sombrero plano, sobre su tallo. Las islas suben poco a poco desde el mar, con playa.
- **Taiga de árboles gigantes:** muchos árboles salían cortados por el mismo fallo. Ahora salen enteros.
- **Pantanos, manglares, desiertos y badlands:** el terreno ya no cambia de altura de golpe en el borde del bioma (antes había paredes verticales de decenas de bloques). Ahora hay pendientes.
- **Ríos:** se hacen menos profundos al subir a la montaña, en vez de cortarse de golpe dejando paredes.
- **Bosques carmesí y distorsionado (Nether):** había un solo hongo gigante por chunk. Ahora hay unas 5 veces más, solo donde hay sitio encima, así que no atraviesan el techo de la cueva.

## Shaders que afectan a todo

- **Sombras del sol para todo:** criaturas, jugadores, bots, objetos tirados y la tapa de los cofres proyectan sombra sobre el suelo, y se oscurecen al pasar a la sombra de un árbol o un techo. Tu personaje proyecta sombra aunque juegues en primera persona. Con sombras reales desaparecen los círculos negros bajo las criaturas.
- **La mano y lo que llevas** también se oscurecen en la sombra.
- **Luz del sol que sigue la hora:** la luz de las criaturas viene del sol o de la luna y tiene su color (dorada al atardecer, azulada de noche).
- **Luz dinámica:** una antorcha, un farol, lava o cualquier bloque que dé luz en tu mano ilumina el terreno y las criaturas a tu alrededor.

## Todas las opciones funcionan

- Se probaron una por una las 19 opciones (distancia, campo de visión, calidad, resolución dinámica, FPS, niebla, shaders, reflejos, brillo, partículas, nubes, animación de chunks, gráficos vibrantes, música, volumen, sensibilidad, movimiento de cámara, tamaño de la interfaz y números de daño) y que se guardan al recargar.
- **Brillo:** ahora funciona como en el original. «Brillante» levanta mucho las zonas oscuras y «Oscuro» las hunde, en el terreno y también en las criaturas, los objetos y la mano.
- **Música:** al quitarla se calla al momento, aunque esté sonando una pieza.
- **Sensibilidad:** también se aplica a los controles táctiles.

## Cofres menos cuadrados

- Los cofres tienen las esquinas biseladas, la tapa sobresale un poco del cuerpo y la parte de arriba está redondeada con un escalón. Vale para cofres sencillos, dobles y para la tapa animada al abrirlos.

## Bed Wars: kits, monedas, marcador y combate

- **Monedas:** se ganan jugando Bed Wars (baja +5, baja final +15, cama rota +30, partida +15, victoria +100). Al conseguirlas sale un aviso y al terminar se ve el total.
- **Kits (estilo Bed Wars de Roblox):** en el menú de Bed Wars, botón **Kits…**. Hay 18 kits en cuatro rarezas. Se compran con monedas y el equipado se aplica al empezar y al reaparecer.
  - **Niveles:** cada kit comprado se mejora hasta el **nivel 3** (★★★). La tarjeta muestra lo que da el siguiente nivel.
  - **Gratis hoy:** cada día rotan 3 kits que puedes probar sin comprar.
  - **Bots con kit:** los bots llevan Tanque, Piro, Escarcha o Vampiro, y se ve debajo de su nombre.
  - **En partida:** abajo a la izquierda se ve tu kit, su nivel y su estado (furia, recarga, saltos…).
  - **Comunes:**
    - **Constructor**: lana inicial y +2 cada pocos segundos.
    - **Saltarín**: doble salto (triple en nivel 3).
    - **Velocista**: Rapidez (y Salto).
    - **Minero**: pico gratis y Prisa.
  - **Raros:**
    - **Arquero**: arco con Poder y flechas que se recargan.
    - **Médico**: te curas a ti y a tus compañeros.
    - **Guerrero**: espada de piedra (de hierro en nivel 3).
    - **Tanque**: cobre y menos daño.
    - **Cazarrecompensas**: hierro y oro por baja.
  - **Épicos:**
    - **Bárbaro**: la espada sube con las bajas.
    - **Segador**: las almas curan y dan velocidad.
    - **Escarcha**: los golpes congelan.
    - **Piro**: los golpes queman.
    - **Planeador**: planea con Espacio.
    - **Vampiro**: robo de vida.
  - **Legendarios:**
    - **Ejecutor**: triple de daño a enemigos con poca vida.
    - **Ninja**: **G** para una embestida invulnerable.
    - **Martillo**: **G** para saltar y golpear el suelo.
- **Marcador lateral nuevo:** el próximo evento con su barra de progreso, los equipos en filas con su color (cama ✔, jugadores vivos o ✘), tu equipo resaltado, tus bajas, finales y camas, las monedas ganadas en la partida y tu kit.
- **Minerales:** salen del generador con un pequeño salto y un brillo de su color, y se apilan en un solo montón que se ve más grande cuantos más hay. Los diamantes y esmeraldas suenan al aparecer.
- **Combate:** al recibir un golpe la cámara solo se inclina un poco, sin temblar, y los golpes de los bots ya no te lanzan tan lejos.

## Salir de Bed Wars

- **Guardar y salir al título**, **Abandonar Bed Wars** y **Salir al menú** (al acabar) cierran la partida del todo, sin recargar la página: se quitan los bots, tenderos, carteles, hologramas, el marcador y los avisos, se vacía el inventario de la partida y se vuelve al título con un mundo de fondo nuevo.
- Un mundo normal ya no hereda las reglas de Bed Wars (límite de construcción, espectador…), y una partida nueva limpia lo que quedara de la anterior.
- Al morir ya no salen dos letreros de «Reapareces en» a la vez.

## Sonidos mejorados

- **Mezcla nueva:** compresor para que nada sature, eco según el sitio (mucho en cuevas, algo en el Nether y el End, poco al aire libre) y sonido apagado **bajo el agua**.
- **Sonido 3D:** lo que suena a tu izquierda se oye por la izquierda, y lo lejano suena más bajo y apagado.
- **Voces nuevas** para las criaturas (zombis, cerdos, vacas, ovejas, gallinas, aldeanos, endermans, ghasts, blazes, esqueletos, arañas, slimes, lobos, gatos, zorros, golems…), con quejidos al herirlas y sonidos al morir que cambian según su tamaño.
- Golpes, **críticos**, daño, explosiones y truenos más contundentes; al romper bloques se oyen caer los trocitos. Cada sonido varía un poco de tono para no repetirse.
- La música de piano tiene su propio canal con eco suave.

## Cómo jugar con amigos (multijugador fácil)

Solo hace falta internet y un código de 5 letras. No necesitas instalar nada ni tener servidor.

1. **Uno crea la partida (el anfitrión).** Entra en **Multijugador** (en el menú principal) o, si ya está jugando, en **Pausa → Abrir a multijugador**, y pulsa **Crear partida**. Le sale un código, por ejemplo **K7Q2M** (con el botón **Copiar** lo copia). Se juega en el mundo del anfitrión: uno normal, One Block, o Bed Wars si lo empieza después.
2. **Le pasa el código** a sus amigos (por mensaje o en voz) y pulsa **Jugar**.
3. **Cada amigo** abre el juego, entra en **Multijugador**, escribe el código y pulsa **Unirse**. Entra solo al mundo del anfitrión. Pueden unirse varios a la vez.

- En el chat, `/codigo` vuelve a mostrar el código de la partida, y `/jugadores` dice quién está.
- **Bed Wars en equipo:** cuando estéis todos, el anfitrión entra en **Bed Wars** y pulsa **¡Jugar!**; a cada amigo le toca un equipo.
- **Si no conecta:** algunas redes (colegio, trabajo) bloquean las conexiones entre jugadores. Probad con los datos del móvil o en otra red. Si la página publicada no deja conectar, descarga el juego (`blockverse-un-archivo.html`) y ábrelo en el navegador.
- Cómo funciona: los navegadores se conectan directamente entre sí (WebRTC, con la librería PeerJS incluida en `js/lib`). El servidor público y gratuito de PeerJS solo sirve para que se encuentren con el código. El anfitrión reenvía los mensajes entre todos los invitados.
- Las formas antiguas (otra pestaña, códigos largos de WebRTC y servidor propio) siguen en **Otras formas de conectar (avanzado)**.

## Multijugador (base)

Botón **Multijugador** en el menú, o **Abrir a multijugador** en la pausa para compartir el mundo en el que estás (normal o **One Block**). El anfitrión comparte su mundo (semilla y cambios) y se sincronizan los jugadores (se ven con su nombre y se animan al andar), los bloques que se ponen y rompen y el chat. `/nombre <tu nombre>` cambia tu nombre y `/jugadores` dice quién está.

- **One Block en multijugador:** el invitado recibe la isla y el progreso del anfitrión; cuando cualquiera rompe el bloque mágico, el anfitrión decide el siguiente y se lo manda a todos (con el contenido de los cofres y el portal del End).
- **Cofres compartidos** (al cerrarlos y mientras están abiertos) y **hora del día** sincronizada con la del anfitrión.
- **En este ordenador:** «Crear sala» da un código; en otra pestaña, «Unirse» con ese código.
- **Por internet sin servidor (WebRTC):** el anfitrión crea una invitación y la envía; el invitado la pega, pulsa «Responder» y devuelve su código; el anfitrión lo pega y pulsa «Conectar».
- **Con servidor:** `servidor/servidor-multijugador.js` es un servidor de retransmisión por salas (Node + `ws`: `npm install ws && node servidor-multijugador.js`). En el juego se escribe su dirección (`wss://…`) y el nombre de la sala.
