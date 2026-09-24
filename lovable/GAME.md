# Arise Crossover+ — descripción completa

Fan game inspirado en *Solo Leveling* y en el estilo de *Arise Crossover*. Todo
el arte, el sonido y el mundo se generan con código: no se ha extraído ningún
recurso del juego original ni del anime. Es un proyecto personal, no comercial.

---

## 1. La idea en una frase

Eres el cazador más débil de la humanidad. Matas algo, extraes su sombra, y esa
sombra pelea a tu lado. Repites hasta tener un ejército y ser lo más fuerte que
hay.

## 2. La historia

Diez capítulos que siguen el arco del protagonista. Cada uno tiene un objetivo
en el mundo, un diálogo cuando lo cumples y una recompensa.

| # | Capítulo | Qué tienes que hacer | Quién te habla |
|---|---|---|---|
| 1 | El cazador más débil de la humanidad | Derrota a 10 enemigos en Seúl | Woo Jinchul |
| 2 | El Doble Dungeon | Camina hasta el templo (segunda región) | Sistema |
| 3 | Has adquirido el Sistema | Llega a nivel 10 y reparte tus puntos | Sistema |
| 4 | Cambio de clase · Monarca de las Sombras | Extrae tu primera sombra | Sistema |
| 5 | Un ejército propio | Forma un escuadrón de 6 sombras | Yoo Jinho |
| 6 | Igris, el Caballero Sangriento | Derrota a la Estatua de Dios y extrae a Igris | Sistema |
| 7 | Los Altos Orcos | Llega a la isla de los orcos y derrota a Baruka | Baek Yoonho |
| 8 | La incursión de la Isla Jeju | Cruza a Jeju y arrebátale la sombra al Rey Hormiga | Cha Hae-In |
| 9 | La sombra del dragón | Alcanza el Castillo del Demonio y vence a Kamish | Choi Jong-In |
| 10 | La guerra de los Monarcas | Llega al Trono del Rey de las Sombras y derrota a Antares | Sistema |

## 3. El mundo

Un mundo abierto **continuo y sin pantallas de carga**: 34.000 × 34.000
unidades. El centro es Seúl y cada anillo de 1.400 unidades que te alejas es una
región nueva, con su bioma, sus enemigos y su nivel recomendado. Cuanto más
lejos, más duro.

| # | Región | Nivel | Bioma | Enemigo común | Jefe |
|---|---|---|---|---|---|
| 0 | Seúl · Distrito de Guardias | 1 | ciudad | Gnomo de Mazmorra | Kasaka |
| 1 | Hongdae · Puerta Clase D | 20 | urbano | Lagarto Kasaka | Cazador de Élite |
| 2 | El Doble Dungeon | 50 | templo | Estatua Menor | Estatua de Dios |
| 3 | Cárcel de Reawakening | 100 | oscuro | Guardia Sombrío | Caballero del Templo |
| 4 | Isla de los Altos Orcos | 200 | hielo | Alto Orco | Baruka |
| 5 | La Puerta Roja | 350 | volcánico | Lobo de Hielo | Rey de los Hielos |
| 6 | Isla Jeju | 500 | bosque | Hormiga Soldado | Rey Hormiga |
| 7 | Puerta de Shinjuku | 650 | real | Cazador Caído | Rey Demonio Baran |
| 8 | Castillo del Demonio | 800 | dragón | Guardia Demoníaco | Kamish |
| 9 | Dominio del Monarca de Hielo | 950 | tormenta | Soldado de Escarcha | Monarca de Hielo |
| 10 | Dominio del Monarca Bestia | 1100 | gremio | Bestia Menor | Monarca de las Bestias |
| 11 | Sala del Arquitecto | 1250 | místico | Eco del Sistema | El Arquitecto |
| 12 | Trono del Rey de las Sombras | 1400 | cíber | Soberano Caído | Antares |

La dificultad sube **de forma continua dentro de cada anillo**: cuanto más te
acercas al borde, más se parecen los enemigos a los de la región siguiente
(pasado el 62% del anillo salen como «veteranos»). Cruzar una frontera ya no es
un muro: el salto de vida al pasar de un anillo al otro es de ×1,1 en vez de
×346.

El cielo tiene **islas flotantes**: trozos de tierra con hierba, roca acabada en
punta y un par de árboles encima, colgados entre las nubes y acompañando al
jugador.

Cada bioma construye con **cuatro piezas distintas** en vez de repetir una: la
ciudad mezcla rascacielos, árboles, casas bajas y monumentos; el bosque, palmeras,
árboles frondosos, rocas con musgo y troncos caídos; el hielo, agujas, arcos
helados, bloques agrietados y abetos nevados; el templo, torii, faroles de
piedra, pagodas y campanas; y así las catorce zonas, hasta la mazmorra con sus
jaulas, altares y muros de púas.

Cada región tiene su propia familia de criaturas, no humanos recoloreados:
limos con núcleo brillante, bestias cuadrúpedas, golems de roca agrietada,
hormigas de seis patas y espectros flotantes. Los jefes rompen el molde: siempre
humanoides con armadura completa, capa y guadaña.

Y encima, **rasgos por isla**, para que dos zonas con el mismo cuerpo no se
parezcan: melenas de púas, alas membranosas con el hueso encendido, cristales en
la espalda, caparazón segmentado, colmillos, filas de ojos de más, colas con
punta brillante y halos flotantes. Los brutos añaden caparazón y los jefes, halo
y cristales, así que se reconocen de lejos sin mirar la barra de vida.

## 4. El bucle de juego

```
pelear → matar → el cuerpo deja un CorpseToken (11 s, 3 intentos)
       → ARISE → la sombra se une al escuadrón
       → subir nivel, repartir atributos, comprar y fusionar armas
       → cruzar a la región siguiente → portal → mazmorra → jefe
       → rango y renacer
```

### Extracción (ARISE)

Cada enemigo muerto deja un cuerpo durante **11 segundos** con **3 intentos**.
Te pones encima y pulsas **B**. La probabilidad depende de la sombra y de tu
suerte de extracción:

```
tasaEfectiva = min(0,95 ; tasaBase × (1 + suerteArise/100))
```

Si agotas los tres intentos sin éxito, el cuerpo se convierte en gemas. Nunca te
vas con las manos vacías.

### Las sombras

Catorce sombras en cinco niveles. Cuanto mejor la sombra, más rara:

| Sombra | Nivel | Daño base | Vida | Tasa base |
|---|---|---|---|---|
| Soldado | C | 18 | 120 | 55% |
| Iron | B | 120 | 900 | 32% |
| Tank | B | 260 | 2.600 | 26% |
| Igris | A | 940 | 5.200 | 16% |
| Tusk | A | 2.600 | 9.000 | 11% |
| Kaisel | S | 16.000 | 38.000 | 7% |
| Greed | S | 92.000 | 180.000 | 5% |
| Baruka | S | 520.000 | 1,1 M | 3,8% |
| Beru | S Elite | 4,2 M | 8,5 M | 2,6% |
| Bellion | S Elite | 34 M | 68 M | 2% |
| Kamish | S Elite | 260 M | 520 M | 1,5% |
| Antares | Monarca | 2,1 G | 4,2 G | 1% |
| Arquitecto | Monarca | 16 G | 32 G | 0,8% |
| Ashborn | Monarca | 120 G | 240 G | 0,6% |

Las sombras no son caballeros de placas: son siluetas oscuras encapuchadas, con
jirones de sombra que cuelgan de la espalda y ondean, los ojos y el arma
encendidos del color de su rango, y corona en las Monarca.

Cada sombra hereda el **rango (E–S)** del enemigo del que sale, y ese rango
multiplica su daño y su vida (ver «Rangos de los enemigos»). El
escuadrón empieza con 6 huecos y crece 2 por cada rango que subes, hasta 16. Al
extraer una sombra mejor que la peor del escuadrón, el cambio es automático.

### Las sombras en combate

Cada sombra es una máquina de estados: `IDLE_FOLLOW` (formación en anillos
concéntricos a tu alrededor), `TARGET_ACQUIRE`, `ATTACK`, `RECOVER`,
`BOSS_FOCUS` y `RECALLED`. Puntúan objetivos por distancia, por si el enemigo te
está pegando a ti y por si es un jefe. Si te alejas demasiado (viaje rápido,
mazmorra, reaparición) vuelven junto a ti en vez de arrastrarse durante minutos.

## 5. Sistemas

### Atributos

Seis atributos, 3 puntos por nivel:

| Atributo | Efecto |
|---|---|
| STR | +1,5 de daño físico por punto |
| INT | daño de habilidad y suerte de extracción |
| SDW | +1,2% daño y +0,8% vida de cada sombra |
| VIT | +15 de vida máxima |
| AGI | velocidad, enfriamiento del dash; doble salto a partir de 200 |
| MNA | +10 de maná máximo |

Si te arrepientes del reparto, el panel de Atributos tiene **Reiniciar
atributos**: te devuelve todos los puntos colocados para que los repartas de
otra forma, gratis y sin tocar tu nivel.

### Fórmulas

```
DañoFísico    = DañoArma + STR × 1,5
DañoMágico    = INT × 1,6 × modificador
DañoSombra    = Base × (1 + SDW × 0,012)
VidaSombra    = Base × (1 + SDW × 0,008)
VidaMáxima    = VidaBase + VIT × 15
ManáMáximo    = 100 + MNA × 10
Velocidad     = 16 + AGI × 0,05
EnfriamientoDash = 3 / (1 + AGI × 0,005)
EXPNecesaria(N)  = 100 × N^1,85 + N × 50
EXPRecompensa    = NivelEnemigo × 25 × (1 + Renaceres × 0,25)
```

### Clases

Eliges una y puedes cambiarla: Guerrero (+15% daño, +20% vida), Asesino (+35%
crítico, +20% velocidad), Mago (+50% daño de habilidad, +40% maná), Tanque
(+70% vida, −35% daño recibido) y Monarca (+45% daño de sombras, +15% suerte).

### Talentos

Seis talentos de 10 niveles que se pagan con gemas y doblan de precio cada
nivel: Poder, Celeridad, Crítico, Legión, Fortuna y Vigor.

### Rangos

De E a S. Cada rango pide nivel y gemas, y da daño y suerte de extracción:

| Rango | Nivel | Gemas | Daño | Suerte |
|---|---|---|---|---|
| E | 1 | — | +0% | 0 |
| D | 25 | 120 | +18% | 8 |
| C | 80 | 600 | +42% | 18 |
| B | 180 | 2.600 | +80% | 32 |
| A | 330 | 12.000 | +150% | 55 |
| S | 560 | 60.000 | +280% | 90 |

Tu aspecto cambia con el rango: cazador encapuchado con arnés táctico en E/D,
placas y hombreras en C/B, armadura completa con yelmo y visor en A/S. Al
**despertar** cambia la silueta entera: abrigo largo negro de faldones, vetas de
energía violeta recorriendo pecho, cinturón, antebrazos y abrigo, hombreras
oscuras, pelo en púas, ojos encendidos y una hoja de energía con su halo.

### Renacer

A partir del nivel 200 puedes renacer: vuelves al nivel 1 y pierdes los
atributos, pero te quedas **+50% de daño permanente** y +25% de EXP por renacer.
El coste se multiplica por 10 cada vez.

### Armas

26 armas, dos por región, del Cuchillo de Cazador a la Hoja de Ashborn. Tres
copias de la misma arma se fusionan y suben su rango (+25% de daño). La herrera
también la templa a cambio de oro.

### Reliquias y runas

Reliquias que suben daño de sombras, suerte de extracción, suerte de rango y
probabilidad de botín. Las runas se activan dentro de las mazmorras y modifican
esa incursión.

### Bestiario de regiones

Cada región tiene su propia especie, con cuerpo, paleta y animación propios:

| Región | Criatura | Rasgos |
|---|---|---|
| Seúl | Goblin | encorvado, orejas largas, daga oxidada, rodillas que se doblan al correr |
| Hongdae | Serpiente Kasaka | diez anillos que ondulan, capucha con borde encendido, colmillos; se yergue para morder |
| Doble Dungeon | Estatua viviente | bloques de piedra con grietas encendidas |
| Cárcel de Reawakening | Caballero sombrío | yelmo con visor rojo, escudo de torre con blasón, capa |
| Altos Orcos | Alto orco | piel verde, colmillos, hacha y hombreras de piel |
| Puerta Roja / Monarca Bestia | Lobo | pelo erizado en el lomo, patas con rodilla, hocico con mandíbula que se abre |
| Jeju | Hormiga | caparazón con bandas brillantes, seis patas en trípode, mandíbulas que chasquean |
| Shinjuku | Cazador caído | capucha y jirones |
| Castillo del Demonio | Demonio | piel roja, cuernos, alas, cola y alabarda |
| Monarca de Hielo | Elfo de escarcha | yelmo de hielo, cristales y lanza |

Al atacar, las criaturas embisten hacia delante y abren la boca o las mandíbulas.

### Habilidades de las armas

Cada arma tiene su propio modelo, su color, una habilidad para la tecla **V** y
una pasiva que se activa con los golpes normales. Hay 11 tipos de habilidad:

- **estocada**: te lanzas hacia delante atravesando la línea
- **tajo**: onda cortante en arco
- **torbellino**: giras con el arma
- **terremoto**: saltas y golpeas el suelo, con aturdimiento
- **veneno**: nube tóxica
- **iaido**: cinco cortes saltando de enemigo en enemigo
- **fuego**: llamarada que deja ardiendo
- **hielo**: nova que congela
- **meteoro**: impacto que cae del cielo
- **garra**: seis zarpazos que curan
- **sombra**: anillo de dagas que además potencia a tus sombras

| Arma | Modelo | Habilidad (V) | Pasiva |
|---|---|---|---|
| Cuchillo de Cazador | dagger | Puñalada veloz (estocada) | crítico |
| Espada Corta de Acero | sword | Tajo de acero (tajo) | sangrado |
| Colmillo Venenoso de Kasaka | dagger | Mordida de Kasaka (veneno) | veneno |
| Maza de Hierro | hammer | Golpe sísmico (terremoto) | aturdir |
| Espada del Templo | sword | Juicio del Templo (tajo) | daño a jefes |
| Hacha del Guardián | axe | Remolino del Guardián (torbellino) | robo de vida |
| Matacaballeros | sword | Ejecución (iaido) | ejecutar |
| Daga de Baruka | dagger | Sombra de Baruka (iaido) | crítico |
| Hacha de Kargalgan | axe | Ira del Chamán (terremoto) | rayo en cadena |
| Lanza de Escarcha | spear | Lanza de escarcha (estocada) | ralentizar |
| Filo Carmesí | sword | Luna carmesí (tajo) | sangrado |
| Aguijón de la Reina | dagger | Aguijón real (veneno) | veneno |
| Espada de la Élite | sword | Frenesí de la Élite (garra) | robo de vida |
| Naginata Demoníaca | spear | Danza demoníaca (torbellino) | quemadura |
| Ira de Kamish | greatsword | Aliento de Kamish (meteoro) | quemadura |
| Filo Glacial | sword | Filo glacial (hielo) | ralentizar |
| Cetro de Escarcha | staff | Tormenta de escarcha (hielo) | ralentizar |
| Garra del Monarca Bestia | claw | Frenesí bestial (garra) | robo de vida |
| Maza Bestial | hammer | Rugido bestial (terremoto) | aturdir |
| Runa Viva | orb | Runas vivas (meteoro) | ejecutar |
| Dagas del Monarca de las Sombras | dagger | Danza de sombras (sombra) | crítico |
| Filo de Ashborn | greatsword | Juicio de Ashborn (sombra) | robo de vida |

### Poderes de las reliquias

Además de su bono, cada reliquia tiene un poder propio:

| Reliquia | Poder |
|---|---|
| Anillo del Demonio | cada 12 golpes, una garra demoníaca estalla alrededor del objetivo |
| Velo del Asesino | tras un dash eres invisible 1,5 s y tu siguiente golpe es crítico |
| Tinta del Abismo | los enemigos que matas dejan un charco de tinta que sigue dañando |
| Cresta de Kamish | 10% al golpear: nova de fuego |
| Emblema del Sistema | pulso automático cada 8 s |
| Núcleo de Monarca | escudo que absorbe la mitad del daño con menos del 30% de vida |
| Black Monarch Sigil | cada ARISE te cura un 20% y da +30% de daño durante 5 s |
| Eye of Ascension | los críticos devuelven 5 de maná |

### Rangos de los enemigos

Las sombras ya no se fusionan. Cada enemigo nace con un rango de **E** a
**SSS** que se ve en su nombre y en el aura del suelo:

| Rango | Probabilidad | Vida | Daño | Botín | Facilidad de extracción | Poder de su sombra |
|---|---|---|---|---|---|---|
| E | 47% | ×1 | ×1 | ×1 | 100% | ×1 |
| D | 30% | ×1,7 | ×1,25 | ×1,7 | 92% | ×1,4 |
| C | 15% | ×2,8 | ×1,55 | ×2,8 | 82% | ×2 |
| B | 5,5% | ×4,5 | ×1,9 | ×4,5 | 70% | ×3 |
| A | 1,39% | ×7,5 | ×2,4 | ×8 | 56% | ×4,6 |
| S | 1% | ×14 | ×3,2 | ×18 | 42% | ×8 |
| **SS** | 0,1% | ×40 | ×4,6 | ×80 | 30% | ×22 |
| **SSS** | 0,01% | ×120 | ×6,5 | ×400 | 20% | ×70 |

La suerte de Arise solo mueve probabilidad de E hacia D–A: S, SS y SSS no se
pueden forzar. Cuando aparece un SS o un SSS salta un aviso en pantalla y el
enemigo lleva una columna de luz visible desde lejos. Derrotarlo da un botín
enorme y muchas gemas, y su sombra (que hereda el rango) brilla en el
inventario. Los rangos A y superiores tienen contorno.

### Monumentos de las islas

Cada región tiene tres monumentos únicos que se ven de lejos:

| Región | Monumento |
|---|---|
| Seúl | torre de la Asociación de Cazadores |
| Hongdae | puerta dimensional |
| Doble Dungeon | estatua de dios con los ojos encendidos |
| Cárcel de Reawakening | torre-prisión con ventanas rojas |
| Altos Orcos | campamento con tótems y hoguera |
| Puerta Roja | agujas de cristal rojo |
| Jeju | hormiguero gigante |
| Shinjuku | torii con linternas |
| Castillo del Demonio | castillo sobre un foso de lava |
| Monarca de Hielo | trono de hielo |
| Monarca Bestia | cráneo colosal |
| Sala del Arquitecto | cubos rúnicos flotando |
| Trono del Rey de las Sombras | trono de obsidiana |

### Enemigos élite

Los enemigos de rango **A** o **S** son élites: más grandes, con contorno, halo
y un aura giratoria del color de su rango, y con el nombre siempre visible.

### Peleas de jefe

Todos los jefes —de mazmorra y de mundo abierto— tienen **cuatro fases** según
les baja la vida (70%, 40%, 15%), y cada fase abre un movimiento nuevo:

| Fase | Qué hace |
|---|---|
| 1 | Golpe al suelo: un círculo se llena donde estás, tienes ~1,4 s para salir |
| 2 | Añade el combo: tres golpes encadenados, cada uno cae donde estés |
| 3 | Añade la onda expansiva: solo daña en su anillo exterior, así que se esquiva pegándote al jefe o corriendo lejos |
| 4 | Enrage: llama a dos guardias, ataca más rápido y avisa con menos tiempo |

Cada aviso suena antes de caer, y el cambio de fase tiene su propio golpe de
cámara y de sonido.

### Mazmorras

Cada 110 segundos se abre un portal cerca de ti. Cuatro modos:

| Modo | Salas | Multiplicador | Recompensa |
|---|---|---|---|
| Estándar | 3 | ×1,6 | ×1,5 |
| Puerta Roja | 4 | ×3,2 | ×3,0 |
| Double Dungeon | 2 | ×5,0 | ×6,0 |
| Boss Rush | 5 | ×2,4 | ×4,0 |

El **Double Dungeon** otorga el Despertar: +60% de suerte de extracción y el
sigilo del Monarca Negro. Al salir vuelves exactamente a donde estabas.

### Transformación del Monarca

Una vez despertado aparece el botón **Monarca** (tecla **T**). Durante 15 s te
conviertes en una bestia de sombra: un 50% más grande, piel violeta casi negra,
cuernos, púas, jirones y una sonrisa dentada que brilla en magenta. Mientras
dura:

- **+60% de daño** y un 15% más de velocidad
- el golpe básico se vuelve un **barrido de 130°** que alcanza a todos los
  enemigos delante de ti, con un 40% más de alcance
- recibes un **40% menos de daño**

Luego tiene 60 s de recarga. El botón muestra los segundos que quedan y
"LISTO" cuando se puede volver a usar.

### Cazadores

Siete cazadores con nombre repartidos por el mundo. Te acercas y pulsas **G**:

- **Yoo Jinho** — suministros: oro y un ticket de puerta
- **Woo Jinchul** — Asociación: te da encargos
- **Cha Hae-In** — te cura del todo y te da +40% de daño durante 30 s
- **Baek Yoonho** — entrenamiento: 5 puntos de atributo por gemas
- **Choi Jong-In** — forja: templa tu arma
- **Go Gunhee** — examen de rango
- **Thomas Andre** — desafío: invoca un jefe para ti

## 6. El tutorial

Once pasos encadenados que cubren todo el juego, no solo los primeros minutos:
moverse, golpear, extraer, esquivar, usar la habilidad, repartir atributos,
reunir tres sombras, comprar arma, hablar con un cazador, cruzar a la región
siguiente y entrar a un portal. Cada paso espera a que lo hagas de verdad antes
de pasar al siguiente, y los textos cambian según juegues con teclado o táctil.

## 7. Controles

| Acción | Teclado y ratón | Móvil |
|---|---|---|
| Moverse | W A S D (relativo a la cámara) | arrastrar en la mitad izquierda |
| Girar cámara | arrastrar con el ratón o ← → | arrastrar en la mitad derecha |
| Acercar cámara | rueda o ↑ ↓ | — |
| Golpear | clic izquierdo (mantén para encadenar) | botón GOLPE |
| Habilidad | V | botón ARMA |
| Extraer sombra | B | botón ARISE |
| Dash | Q | botón DASH |
| Saltar | Espacio | — |
| Auto (golpe + arise) | R | botón AUTO |
| Montura | M | botón MONTURA |
| Entrar al portal | F | botón PORTAL |
| Hablar con un cazador | G | acercarse |
| Transformación (despertado) | T | botón MONARCA |
| Menús | 1-5, H | botones hexagonales |

El combo de golpe encadena cuatro ataques (×1,00, ×1,05, ×1,15, ×1,45) con
hitstop e impulso de cámara crecientes.

## 8. Cómo está hecho por dentro

- **Render**: three.js con luz direccional y sombras reales, niebla, cielo por
  shader, suelo con textura procedural y personajes articulados por jerarquía de
  nodos (caderas, torso, hombros, cuello) animados por rotación.
- **Estilo**: sombreado toon, contorno oscuro alrededor del protagonista y
  tajos en media luna que siguen cada golpe (más grandes en el remate del combo
  y en la habilidad, y del color de tu forma: blanco, violeta o magenta).
- **Animación**: los personajes respiran en reposo, se inclinan al correr,
  recogen las piernas al saltar y se echan atrás al encajar un golpe. El golpe
  del jugador tiene tres tiempos (carga, tajo y recogida) con giro de cadera,
  alternando el lado en cada golpe del combo. Las alas baten, las colas se mecen
  y los halos giran.
- **Enemigos**: brotan del suelo con un rebote y un anillo al aparecer, y al
  morir caen de espaldas, se hunden y se deshacen en humo. Los ojos brillan con
  el color de su región, y la barra de vida deja una estela blanca que muestra
  cuánto les acabas de quitar.
- **Clima por bioma**: pétalos en los santuarios y en el reino, luciérnagas en
  el bosque, nieve en el hielo, ascuas en el volcán y en la región del dragón,
  fuegos fatuos en las zonas oscuras y místicas, datos de neón en la ciudad
  cyber y lluvia con relámpagos en la tormenta. El suelo también cambia: vetas
  de lava, grietas de hielo, matas de hierba o circuitos.
- **Accesibilidad de los menús**: en sombras, armería y bestiario las flechas
  mueven la selección y **Enter** hace la acción principal (equipar, comprar,
  viajar). En móvil, tocar otra vez la tarjeta elegida la equipa o la compra, y
  el botón de acción queda fijo abajo. El mapa tiene una fila de botones
  numerados por región y flechas ◀ ▶ además de los anillos. Los botones son más
  grandes, el foco del teclado se ve, y las sombras se filtran por rango.
- **Mapa del mundo**: un plano circular con los 13 anillos pintados del color
  de su bioma, tu posición con un pulso, el portal y los cazadores. Al tocar un
  anillo se abre su ficha, con el enemigo, el bruto o el jefe en 3D, sus números
  y el botón de viaje. Hay pestañas para cazadores y puertas.
- **Inventario**: reliquias, runas e índice en tarjetas con una barra de
  colección, y un **bestiario** con la criatura de cada región en 3D (las
  regiones sin descubrir salen bloqueadas).
- **Menús**: entran con una animación y sus filas aparecen escalonadas. Las
  sombras y la armería son rejillas de tarjetas con el color de su rango, con
  filtros y orden, y una ficha lateral con la figura en 3D sobre un pedestal
  que gira sola y se puede arrastrar. La armería compara cada arma con la
  equipada y abre directamente en la siguiente mejora. En los atributos hay
  botones +1, +5 y MAX, y los números que cambian dan un salto. Los contadores
  de oro y gemas ruedan hasta su valor.
- **Golpes**: al recibir daño, el enemigo se aplasta un instante y suelta un
  destello rojo propio. Así no toca los materiales compartidos, y los ojos,
  núcleos y cristales de los demás enemigos siguen brillando.
- **Calidad adaptativa**: el juego mide sus propios fps y sube o baja el detalle
  (sombras, hierba, props, número de personajes detallados, resolución) para
  mantener la fluidez. También se puede fijar a mano.
- **Nivel de detalle**: cada personaje tiene dos versiones, una de ~20 mallas de
  cerca y otra de 3 cajas de lejos.
- **Sonido**: todo se sintetiza con WebAudio en el momento — golpes, críticos,
  muerte, extracción, subida de nivel, portal, dash, avisos y golpes de jefe.
  No hay ficheros de audio.
- **Música**: una progresión de acordes por bioma, tocada nota a nota desde el
  bucle del juego (sin temporizadores sueltos). Cada región tiene su escala y su
  tempo, y la música acelera cuando hay enemigos cerca. El interruptor de sonido
  del HUD la silencia también.
- **Guardado**: `localStorage`, con validación al cargar. Un guardado viejo o
  manipulado (textos donde van números, sombras de otra versión) se normaliza en
  vez de romper la partida.
- **Sin red**: three.js va incrustado en la versión de un solo archivo y llega
  por npm en la versión de Lovable. El juego funciona sin conexión.

## 9. Dos entregables

1. **`arise-3d.html`** — el juego entero en un archivo. Lo abres y juega, sin
   servidor ni instalación.
2. **`lovable/`** — el mismo juego como proyecto Vite + React + TypeScript +
   Tailwind, listo para importar en Lovable.

El repositorio también incluye `src/`, una implementación del mismo bucle en
Luau para Roblox (servidor autoritativo, ProfileService, anti-exploit) con 409
aserciones de prueba, que fue el punto de partida del diseño.
