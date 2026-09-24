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

Un mundo abierto **continuo y sin pantallas de carga**: 64.000 × 64.000
unidades. El centro es Seúl y cada anillo de 2.400 unidades que te alejas es una
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

El botón **⚡ Equipar las mejores** del menú de sombras llena el escuadrón
con las de más daño que no estén de expedición.

**Daño de las sombras**: el golpe de cada sombra acompaña al tuyo. Es una
parte de tu daño según su clase (15% las C, 30% las A, 40% las S, 62% las
Monarca), multiplicada por la raíz de su multiplicador de rango y por el
atributo SDW. Si su tabla propia da más, se queda con la tabla. Tú golpeas
unas cuatro veces por segundo y cada sombra una vez cada 0,8 s, así que un
escuadrón de 6 sombras hace más o menos tu mismo daño por segundo.

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

### Clases y ruleta

Hay **20 clases** ordenadas por rareza. No se eligen: salen de la **ruleta de
clases** en Atributos › Clase, y cada giro gasta uno de tus giros. Los giros
**solo** se consiguen con códigos (20 en total). Una clase nueva se activa sola. Si sale una
repetida se convierte en gemas (más cuanto más rara). Entre las clases que ya
tienes puedes cambiar gratis cuando quieras.

| Clase | Rareza | Probabilidad |
|---|---|---|
| Novato | Común | 12% |
| Guerrero | Común | 10% |
| Explorador | Común | 9% |
| Sanador | Común | 9% |
| Mago | Común | 8% |
| Asesino | Poco común | 7% |
| Tanque | Poco común | 7% |
| Berserker | Poco común | 6% |
| Invocador | Poco común | 5,5% |
| Caballero | Poco común | 4,5% |
| Espada del Viento | Rara | 4% |
| Mago de Hielo | Rara | 3,5% |
| Cazadragones | Rara | 3% |
| Paladín | Rara | 2,5% |
| Nigromante | Rara | 2% |
| Maestro de Armas | Épica | 2% |
| Archimago | Épica | 1,5% |
| Señor de la Guerra | Épica | 1,1% |
| Monarca | Legendaria | 1,9% |
| **Monarca de las Sombras** | **Mítica** | 0,5% |

La mejor, **Monarca de las Sombras** (0,5%), da +80% daño, +50% vida, +120%
daño de sombras, +30% suerte de Arise, +15% crítico, +20% velocidad, +50% daño
de habilidad y −20% daño recibido. Las partidas anteriores conservan la clase
que tenían.

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

### Aspecto del cazador (vestidor)

En **Atributos › Aspecto** eliges cómo va vestido el cazador entre lo que has
desbloqueado jugando. Hay **doce categorías y 61 piezas**: conjunto, armadura,
peinado, color de pelo, ojos, **piel** (seis tonos), **altura** (bajo, normal,
alto y gigante), **cabeza** (cinta, máscara, yelmo, cuernos, corona),
**espalda** (espada, púas, alas de sombra), **brillo del arma** (cinco
colores), capa y aura. Cada pieza pide algo: un nivel, un rango, un número
de bajas, el Despertar o haber vencido a un enemigo SS o SSS. Al conseguirla
salta un aviso de «Nuevo aspecto».

Lo más difícil de conseguir es lo que más da. El bono se suma entre todas las
piezas que lleves puestas (conjunto, armadura, ojos, capa y aura):

| Pieza | Requisito | Bono |
|---|---|---|
| Conjunto Noche | nivel 25 | +4% velocidad |
| Conjunto Carmesí | 2.000 bajas | +7% daño |
| Blanco de Élite | rango B y nivel 150 | +10% vida, +4% daño |
| Dorado de Rango S | rango S y 10.000 bajas | +16% daño, +8% vida |
| Monarca | Despertar y nivel 300 | +25% daño, +12% vida, +4% vel. |
| **Leyenda SSS** | 3 SSS vencidos y nivel 600 | **+50% daño, +30% vida, +10% vel.** |
| Armadura pesada | rango A y nivel 250 | +8% vida |
| Abrigo largo | Despertar y rango S | +6% daño, +3% vel. |
| Ojos Rojo sangre / Oro SSS | 3 SS / 2 SSS y nivel 500 | +8% / +15% daño |
| Capa de sombras | Despertar y 20.000 bajas | +8% daño, +6% vida |
| Aura de Fuego / Dorada | 2 SS / rango S y 25.000 bajas | +10% / +12% daño |
| **Aura Luz SSS** | 5 SSS vencidos y nivel 800 | **+40% daño, +25% vida, +8% vel.** |

La cara del cazador siempre se ve: cejas, ojos con iris y brillo (los ojos
brillan con los colores especiales), nariz y orejas en relieve, boca y rubor.

### Monturas

La tecla **M** monta y desmonta; en **Atributos › Monturas** eliges cuál usar.
Cada montura tiene su criatura, sus colores y su velocidad. Todas salvo la
inicial se encuentran: caen de los enemigos como un orbe brillante con una
columna de luz, y hay que recogerlo antes de 60 segundos.

Hay **una montura por isla** y cuanto más lejos está su isla, más rápida es:
las mejores solo se consiguen en las últimas.

| Montura | Velocidad | Dónde |
|---|---|---|
| Lobo sombrío | ×2,1 | inicial |
| Sabueso de la Puerta | ×2,15 | 2,5% en Seúl |
| Kasaka domada | ×2,2 | 2% en Hongdae |
| Gólem del Templo | ×2,25 | 2% en el Doble Dungeon |
| Corcel del Caballero Rojo | ×2,3 | 1,8% en la Cárcel de Reawakening |
| Jabalí de guerra | ×2,35 | 1,8% en los Altos Orcos |
| Colmillo de Escarcha | ×2,4 | 1,6% en la Puerta Roja |
| Hormiga alada | ×2,5 | 1,5% en Jeju |
| Kitsune de Shinjuku | ×2,6 | 1,3% en Shinjuku |
| Corcel infernal | ×2,7 | 1,2% en el Castillo del Demonio |
| Oso Glacial | ×2,8 | 1% en el Dominio del Monarca de Hielo |
| Tigre de guerra | ×2,9 | 0,9% en el Dominio del Monarca Bestia |
| Disco del Sistema (vuela) | ×3,1 | 0,8% en la Sala del Arquitecto |
| Dragón de Kaisel (vuela) | ×3,3 | 25% al vencer a un SS o SSS en las tres últimas regiones |
| Lobo dorado | ×3,45 | seguro al vencer a un SSS en las cuatro últimas regiones |
| **Dragón de Obsidiana** (vuela) | **×3,6** | 0,6% en el Trono del Rey de las Sombras |

Las diez monturas de las islas altas llevan **silla con borde encendido y
estribos** y efectos propios, animados también en la vista 3D del menú:

- **Colmillo de Escarcha**: cristales en el lomo que brillan, aliento helado y rastro de escarcha.
- **Hormiga alada**: alas que zumban y bandas del abdomen que laten.
- **Kitsune**: nueve colas en abanico que ondulan y tres fuegos fatuos orbitando.
- **Corcel infernal**: crin y cola de fuego que parpadean, aliento ardiente y brasas al galopar.
- **Oso Glacial**: armadura de hielo, púas de cristal, aliento blanco y aura de escarcha.
- **Tigre de guerra**: rayas, placas doradas y un estandarte que ondea al correr.
- **Disco del Sistema**: tres anillos de runas girando en sentidos opuestos y un cono de luz.
- **Dragón de Obsidiana**: cresta de cristales violetas, alas enormes batiendo, aliento violeta y humo.
- **Dragón de Kaisel**: alas grandes, ojos rojos, aliento y estelas de viento.
- **Lobo dorado**: armadura de oro, gran halo y chispas doradas constantes.

El cofre del día 7 solo puede dar monturas de las primeras siete islas, y solo
de islas a las que ya has llegado.

Los enemigos de rango alto multiplican la probabilidad de soltar su montura.

### Enemigos retocados

La estatua del Doble Dungeon tiene ahora máscara tallada, boca encendida,
hombreras de losa, runas en los brazos, falda de piedra, núcleo y un halo que
gira a su espalda. El espectro del Arquitecto lleva máscara blanca, cadenas y
fragmentos de runa orbitando. El cazador caído de Shinjuku empuña katana con
capa larga, y el soberano caído del Trono lleva abrigo, cuernos, púas y mandoble.

### Sombras shiny

Cada sombra extraída de un enemigo de rango **A o superior** tiene un **1%** de
salir con la **mutación shiny**. Es el doble de fuerte (daño y vida ×2), un 8%
más grande, sin transparencia, con piel violeta clara, todas las vetas, ojos,
arma y corona en oro, contorno dorado, halo y chispas de colores al moverse.
Al conseguirla sale un cartel especial. En el inventario lleva ✨, una
tarjeta tornasolada con brillo que la recorre y la etiqueta «SHINY ×2».

### Una sombra por cada enemigo

Cada región da **tres sombras**: la de su enemigo común, la de su bruto y la
del jefe. En total hay 40 sombras. Las sombras de enemigo tienen **la misma
forma que el enemigo del que salen**: el goblin sombrío es un goblin, la
serpiente sombría es una serpiente, el caballero sombrío lleva escudo… hechas
de negro violáceo translúcido, con las vetas del color de su región, los ojos
del color de su clase y un halo. La del bruto es una clase más alta que la del
común. De vez en cuando (8%), un enemigo normal deja en su lugar la sombra con
nombre de su región. La ficha del mapa muestra las tres sombras de cada región.

### Diseño de las sombras

Cada sombra conserva la forma de lo que fue, hecha de sombra translúcida con el
brillo de su clase: Iron es un coloso con escudo y martillo, Tank un oso, Igris
un caballero con penacho rojo y mandoble, Tusk un chamán orco, Kaisel y Kamish
dragones alados, Greed un asesino con dagas, Baruka un elfo de hielo, Beru la
hormiga reina alada, Bellion un mariscal con alas y halo, Antares un rey dragón
con corona y Ashborn el primer Monarca con abrigo, púas y corona. En el mundo
llevan un aura del color de su rango en el suelo, una llama de sombra que
crece al atacar y humo negro al moverse, y los dragones vuelan. La ficha de
cada sombra incluye una línea de historia.

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

En la **Armería**, el botón **⚡ Equipar lo mejor** pone tu arma más fuerte
(contando su rango de fusión) y tu clase más rara de las que ya tienes.

La habilidad **V** funciona también en modo **AUTO**: si la pulsas en mitad
de un golpe, queda en cola y sale en cuanto este termina. Además, en AUTO el
cazador la lanza solo cuando tiene dos o más enemigos cerca, o un jefe o un
élite, si hay maná y está lista.

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

### Mundo ampliado y cofres

El mundo pasó de 34.000 a **64.000 unidades** de lado y cada región mide ahora
2.400 de ancho en vez de 1.400, así que hay mucho más que recorrer. Las
partidas anteriores conservan su región y su dirección al cargar.

Por todo el mapa hay **104 cofres escondidos** (ocho por región), con un
brillo dorado y una columna de luz que se ven de lejos, y un punto dorado en el
minimapa cuando estás cerca. Basta con acercarse para abrirlos. Dan oro y
gemas según la región, y a veces un ticket o una runa. Se rellenan cada día.

### Monumentos de las islas

Cada región tiene cinco monumentos únicos que se ven de lejos:

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

### Recompensas diarias

En **Inventario › Diario** hay un calendario de 7 días: se reclama una vez por
día natural. Si pasas un día entero sin entrar, la racha vuelve al día 1. Al
entrar, si hay una recompensa pendiente, el calendario se abre solo.

Cada cofre es una **tirada al azar**: la cantidad de oro y gemas cambia de
×0,5 a ×2,5 cada vez, a veces sale un **golpe de suerte ×5**, puede caer un
ticket extra y hay un 4% de runa común. Todo crece con tu nivel. El último cofre
abierto queda a la vista.

El **día 7 es el Cofre del Monarca**, muy por encima del resto (de media unas
35 veces las gemas del día 1): entre 3 y 7 tickets, un 35% de runa (que puede ser
legendaria), un 12% de montura y un 15% de golpe de
suerte ×5.

### Códigos

Hay **diez** códigos y no aparecen en el juego: hay que escribirlos en
**Atributos › Códigos**. Dan sobre todo giros de la ruleta de clases (veinte
en total) y un poco de oro, gemas o tickets. Si el código no existe, el campo tiembla y lo avisa; los canjeados
se listan debajo.

### Historia ampliada

- **Crónicas de región**: la primera vez que pisas cada una de las 13 regiones,
  un personaje (o el Sistema) cuenta su historia. Todas quedan guardadas en
  Inventario › Historia, y la ficha del mapa muestra su primera línea.
- **Frases de jefe**: cada jefe de mazmorra dice algo al aparecer.
- **Epílogo**: seis capítulos más tras la guerra de los Monarcas (Los
  Gobernantes, La Legión sin fin, Jinete de sombras, Lo que no debería existir,
  El ciclo del Monarca y Arise), con recompensas y los títulos «Cazador de
  Leyendas» y «Monarca Eterno».
- En la Historia los capítulos cerrados muestran de nuevo su diálogo.

### Expediciones de sombras

En **Sombras › Expediciones** mandas hasta 4 sombras de tu colección a una
misión que dura horas reales. Tienes 3 huecos a la vez. El tiempo corre con
el reloj del sistema, así que la expedición avanza aunque cierres el juego.
Mientras tanto, esas sombras salen del escuadrón.

Los destinos se desbloquean según tu **nivel** y tu **mejor DPS**. Los
difíciles duran más y pagan mucho más:

| Destino | Duración | Requisito |
|---|---|---|
| Patrulla por Seúl | 1 h | nivel 1 |
| Alcantarillas de Hongdae | 2 h | nivel 15 · 500 DPS |
| Ruinas del Templo | 3 h | nivel 45 · 20K DPS |
| Pasillos de la Cárcel | 4 h | nivel 90 · 800K DPS |
| Glaciar de los Orcos | 6 h | nivel 180 · 30M DPS |
| Más allá de la Puerta Roja | 8 h | nivel 320 · 1B DPS |
| Nido de la Reina de Jeju | 10 h | nivel 480 · 50B DPS |
| Asedio al Castillo del Demonio | 12 h | nivel 780 · 50T DPS |
| Grieta de los Monarcas | 16 h | nivel 1100 · 100Qa DPS |

La probabilidad de éxito depende del poder de las sombras que mandes frente al
recomendado (entre 35% y 100%). Si fallan, traen solo el 30% del botín. Las
recompensas son oro, gemas, tickets y, en las altas, runas, y crecen con tu
nivel. Cuando una vuelve, un aviso te lo recuerda.

### Modo infinito

Desde el mapa (pestaña Puertas), gratis y sin ticket. Son oleadas sin fin:
cada una tiene un 13% más de vida y un 7% más de daño, y cada 10 aparece un
jefe del Abismo. Superar una oleada da oro, gemas y 35 s más de tiempo (máximo
120). La partida acaba si caes o se agota el tiempo, y se guarda tu récord.

| Oleada | Probabilidad de runa al superarla | Techo de rareza |
|---|---|---|
| 1–9 | 0% | — |
| 10–19 | 3% | común |
| 20–39 | 6–10% | épica |
| 40–59 | 10–15% | legendaria |
| 60+ | 15% | **mítica** |

### Runas por rareza

Las runas son escasas a propósito. Cuando cae una, lo normal es que sea común;
las buenas casi nunca salen:

| Rareza | Runas | Efecto | Probabilidad dentro de la tirada |
|---|---|---|---|
| Común | Salud, Gemas, Tiempo, Oro | modifican mazmorras | ~78% |
| Épica | Vacío, Eternidad | +5% daño / +5% gemas por copia (máx. 10) | ~16% |
| Legendaria | **Codicia** | +40% oro y gemas por copia (máx. 3) | ~5% (a partes iguales con el Tiempo Roto) |
| Legendaria | **Tiempo Roto** | −15% recarga de habilidad por copia (máx. 3) | |
| Mítica | **Runa del Monarca** | +30% daño y +30% vida por copia (máx. 3) | ~1% |

Dónde caen: modo infinito (tabla de arriba), 25% al completar una mazmorra
(hasta épica en Puerta Roja y Double Dungeon), 4% en el cofre diario normal,
35% en el Cofre del Monarca (hasta legendaria) y rara vez en expediciones
largas. Las épicas o mejores se anuncian con un cartel del color de su rareza,
y en el inventario las que aún no tienes salen como «Runa desconocida».

### Mazmorras

Cada sala de mazmorra pide **una cantidad de bajas según el portal**: los
enemigos siguen llegando (hasta 6 a la vez) y, al llegar a la cuota, se anuncia
«¡Sala superada!» y se pasa a la siguiente. El HUD muestra las bajas de la
sala: por ejemplo «Sala 1/3 · 7/12 bajas».

| Portal | Salas | Bajas por sala |
|---|---|---|
| Estándar | 3 | 12 |
| Puerta Roja | 4 | 25 |
| Double Dungeon | 2 | 18 |
| Boss Rush | 5 | 6 |

### Mazmorras (detalles)

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
- **Rendimiento con menús**: con un menú abierto la escena del fondo se dibuja a
  un tercio del ritmo y sin desenfoque, la vista 3D va a 30 fps, el daño de
  las sombras se calcula una sola vez por repintado y elegir una tarjeta solo
  cambia la ficha lateral. Las listas largas se cargan de 60 en 60.
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

## Aspecto del cazador (look por defecto)
- Pelo negro revuelto con flequillo (`messyHair`), ojos azules brillantes, piel clara.
- Abrigo largo negro abierto con capucha sobre camiseta blanca, pantalón negro y botas con cordones (`outfit: shadowcoat`, `coatOpen`, `laces`).
- Nueva categoría de vestuario **Modelo del arma**: `monarchblade`, un espadón cian con vetas oscuras y guarda negra con púas.
- Las partidas antiguas migran una vez a este look mediante `lookV3`. Las demás prendas siguen disponibles en el vestuario.

## Cómo se llevan y se ven las armas
- Cada tipo de arma tiene su postura de carga (`WEAPON_CARRY`) cuando no estás atacando:
  - **Espadones, hachas, martillos y guadañas:** apoyados en el hombro.
  - **Espadas y katanas:** en guardia hacia delante.
  - **Lanzas y bastones:** de pie, como un bastón.
  - **Dagas:** hacia abajo, en agarre invertido.
- Al golpear, el arma pasa suavemente de esa postura a alinearse con el brazo y después vuelve a ella.
- Al cortar, la punta del arma deja una estela luminosa (`updateSlashTrail`, 18 destellos reutilizados). La estela es del color del arma si brilla y blanca si no.
- Los modelos tienen más detalle:
  - **Espada:** acanaladura, doble filo, punta, gavilanes, gema, empuñadura con vendas y pomo.
  - **Katana:** hoja curva con filo claro, habaki y punta (kissaki).
  - **Hacha:** cabeza con barba, filo claro, contrapunta y mango con vendas.
  - **Guadaña:** hoja curva en cuatro tramos con filo.
  - **Alabarda:** hoja con punta, filo claro y borla.
  - **Bastón:** anillos dorados y tres garras que sujetan un orbe con halo.
