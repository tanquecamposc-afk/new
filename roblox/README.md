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
  - Raíles, redstone (solo se ve), portales y líquidos.
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

## Lo que todavía no está

Para ser claros, esto del juego web **aún no está portado**:
- Los modos **Bed Wars**, **Mazmorras** y **Leyendas**.
- El **Nether** y el **End**. Los portales se ven, pero no llevan a ningún sitio.
- Las **estructuras**: aldeas, templos, pirámides, mazmorras, fortalezas, minas, naufragios e iglús. Las tablas de botín ya están, pero el generador todavía no crea estas construcciones.
- **Mesa de encantamientos, yunque, soporte de pociones y mesa de herrería.** Se pueden poner, pero al usarlas sale un aviso.
- **Comercio con aldeanos.**
- **Lógica de redstone:** el polvo y los bloques se ponen y se ven, pero no transmiten señal.
- Sonidos propios: se usan los sonidos que trae Roblox.

## Archivos

- `Blockverse.rbxlx`: el lugar listo para abrir en Roblox Studio.
- `src/compartido/` → `ReplicatedStorage.Blockverse`
  - `Datos/`: datos exportados del juego web, generados por `herramientas/generar_datos.py`. No se editan a mano.
    - Bloques, objetos, recetas, hornos, biomas y claves.
    - Texturas, iconos y criaturas.
  - `Registro`: tablas rápidas de bloques y objetos, tiempo de picado y lo que suelta cada bloque.
  - `Generador`, `Ruido`: el generador del web, idéntico.
  - `MundoDatos`: chunks de datos y cambios.
  - `Crafteo`, `Rayo`, `Fisica`, `Codec`, `Config`.
- `src/servidor/` → `ServerScriptService.Servidor`
  - Script principal: jugadores, acciones, vida, hambre y daño.
  - `Mundo`: colisiones y agua.
  - `Simulacion`: líquidos, gravedad, hojas, cultivos y explosiones.
  - `Mobs`: IA de las criaturas.
  - `Entidades`: objetos tirados, experiencia y proyectiles.
  - `Inventario`, `Contenedores` (cofres y hornos), `Botin`, `Modos` (One Block).
- `src/cliente/` → `StarterPlayerScripts.Cliente`
  - Script principal: controles, cámara, picar y usar, efectos y sonidos.
  - `Render`: mallas con texturas, con un modo de respaldo hecho con piezas.
  - `Luz`.
  - `Interfaz`, `Iconos`.
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
  - `probar_respaldo.sh`: lo mismo, pero sin mallas ni imágenes editables.

## Rendimiento

- Una malla por sección de 16 capas en lugar de una pieza por bloque.
- La construcción se reparte en varios fotogramas (6 ms por fotograma) y empieza por lo más cercano.
- Las colisiones del servidor son bloques invisibles unidos en cajas grandes. Solo existen cerca de los jugadores.
- `Config.RADIO` es la distancia de visión, en chunks. Bájala a 3 o 4 si va lento en móvil.
