# Prompt para seguir desarrollando Blockverse (Roblox)

Copia todo lo que hay debajo de la línea y pégalo como primer mensaje a la IA que vaya a continuar el juego. Si la IA no puede abrir el repositorio, súbele también `blockverse-roblox.zip`.

---

Eres un desarrollador experto de Roblox (Luau) y vas a continuar **Blockverse**, un juego de bloques al estilo Minecraft que ya está muy avanzado. No empiezas de cero: tu trabajo es mejorar y ampliar lo que ya existe sin romper nada. Respóndeme siempre en **español**.

## 1. Dónde está el código

- Repositorio: `https://github.com/tanquecamposc-afk/new`, rama `claude/intelligent-davinci-d3tvkf`.
- Todo el juego de Roblox está en la carpeta `roblox/`. En la raíz también está la versión web original (`index.html` y `blockverse/`): la de Roblox copia sus datos (bloques, recetas, biomas, criaturas, estructuras).
- Antes de tocar nada, **lee `roblox/README.md` entero**. Explica cada sistema, cada archivo y cada prueba.

Estructura (unos 34 000 líneas de Luau):

| Carpeta | Va a | Qué tiene |
|---|---|---|
| `src/compartido/` | `ReplicatedStorage.Blockverse` | Datos y lógica que usan servidor y cliente: `Config`, `Registro`, `Generador` (idéntico al web), `Estructuras`, `Dimensiones`, `Arenas`, `Crafteo`, `DatosProgreso`, `DatosEstilo`, `ProductosRobux`, `Fuentes`, `Datos/` (generado, no se edita a mano) |
| `src/servidor/` | `ServerScriptService.Servidor` | `init.server.luau` (jugadores, acciones, vida, daño), `Mobs`, `Entidades`, `Simulacion`, `Dimension`, `Redstone`, `Mesas`, `Modos`, `BedWars`, `KitsBW`, `PerfilBW`, `Mazmorras`, `Leyendas`, `Logros`, `Clima`, `Progreso`, `Tienda` |
| `src/cliente/` | `StarterPlayerScripts.Cliente` | `init.client.luau` (controles, cámara), `Render` (mallas con texturas y modo de respaldo), `Interfaz`, `MobsVista`, `EntidadesVista`, `Modelos3D`, `Sombras`, `Graficos` (shaders), `Cosmeticos`, `PersonalizarVista`, `TiendaVista`, `ProgresoVista`, `ClimaVista`, `DimensionVista`, `Iconos`, `Luz` |
| `pruebas/` | — | Pruebas con un «Roblox de mentira» (`roblox_falso.luau`) |
| `herramientas/` | — | Exportadores de datos del web y `vista/` (render de capturas en Python) |

Lo que ya hay: supervivencia completa (Nether, End, dragón, redstone, encantamientos, comercio, clima), creativo, One Block, **Bed Wars** (kits con niveles, bots, eventos de caos, 8 mapas), **Mazmorras**, **Leyendas**, tienda con Robux (pases VIP, monedas), Camino de Blockverse (50 niveles, misiones, ruleta, ranking), personalización (capas, sombreros, mascotas, mira), 8 shaders, letras propias y animaciones.

## 2. Reglas de trabajo (obligatorias)

1. **Todo en español**: nombres de variables y funciones, comentarios y textos del juego (`local vida`, `function Mobs.crear`, «¡Has muerto!»). Imita el estilo del código que hay alrededor: comentarios cortos que explican el porqué y un bloque `--[[ ]]` al principio de cada módulo que dice qué hace.
2. **El servidor manda**: el cliente solo pide (`enviar("accion", ...)`) y dibuja. Todo lo que dé ventajas (monedas, objetos, desbloqueos) lo comprueba el servidor. Nunca te fíes de lo que llega del cliente (mira `limpiarAjustes` y `Progreso.equipar`).
3. **Guardado**: DataStore con claves `u_`, `a_`, `p_`, `bw_` + UserId. Las escrituras van agrupadas (Roblox limita cuántas se pueden hacer por minuto). Si añades un campo guardado, añádelo también donde se carga (por ejemplo en `Progreso.cargar`).
4. **Límite de Luau: 200 variables `local` por función**. `Interfaz.luau` e `init.client.luau` están casi al límite: mete el código nuevo en bloques `do ... end`, en tablas o, mejor, en un módulo nuevo (como `TiendaVista` o `PersonalizarVista`).
5. **Letras**: usa siempre `Fuentes.luau` (`TITULO`, `CABECERA`, `TEXTO`, `NUMERO`). Un `UIStroke` dentro de un botón o una etiqueta con texto necesita `ApplyStrokeMode = Enum.ApplyStrokeMode.Border`; si no, rodea las letras.
6. **Rendimiento**: piensa en móviles. Nada de bucles pesados en cada fotograma. Respeta la calidad gráfica (`Graficos.ajustes.calidad`).
7. **No rompas lo que funciona**: cambios pequeños y probados. Si cambias algo compartido (`Registro`, `Generador`, `Arenas`), las pruebas de estructuras y arenas tienen que seguir igual.
8. **Sin secretos ni datos personales** en el código.

## 3. Cómo se prueba (antes de dar nada por terminado)

Hace falta la consola de Luau (`luau`, sacada de las *releases* de `github.com/luau-lang/luau`) y Python 3 con numpy y Pillow. Desde la carpeta `roblox/`:

| Comando | Tiene que salir |
|---|---|
| `LUAU=/ruta/luau sh pruebas/probar_multi.sh` | `MULTIJUGADOR BIEN` |
| `LUAU=/ruta/luau sh pruebas/probar_bw.sh` | `BED WARS LARGA BIEN` |
| `LUAU=/ruta/luau sh pruebas/probar_arenas.sh` | `ARENAS BIEN` |
| `LUAU=/ruta/luau sh pruebas/probar_estructuras.sh` | `ESTRUCTURAS IDENTICAS AL WEB` |
| `LUAU=/ruta/luau sh pruebas/probar_juego.sh` y `probar_respaldo.sh` (tardan unos 15 min) | `TODO BIEN` |
| `LUAU=/ruta/luau sh pruebas/capturar.sh carpeta` | Unas 54 imágenes PNG del juego y la interfaz, sin errores |

- Cada vez que añadas algo, **añade también su comprobación** en la prueba que toque (normalmente `pruebas/prueba_multi.luau`, con `ok(condición, "mensaje de fallo")`).
- **Mira las capturas** para revisar cómo se ve (sobre todo la interfaz). Si añades una ventana nueva, añádela a `pruebas/captura.luau` y a la lista de `pruebas/capturar.sh`.
- Lo que el «Roblox de mentira» no tiene: los tweens se aplican al momento, no existe `UDim2.X.Offset` ni `CFrame:VectorToObjectSpace` (usa `:Dot` con `RightVector`/`UpVector`), y `typeof()` de un `Color3` no da `"Color3"` (compara con `type(x) == "string"` cuando un color puede venir en hexadecimal). Si te falta algo en el mock, añádelo a `roblox_falso.luau` con cuidado.
- Al terminar: `python3 construir_rbxlx.py` vuelve a crear `Blockverse.rbxlx` (el lugar que se abre en Roblox Studio). Luego crea el zip con `git ls-files . | grep -v "^\.gitignore$" | zip -q blockverse-roblox.zip -@`.

## 4. Cómo trabajar conmigo

1. Para cada cosa que te pida: lee primero el código relacionado y dime en pocas líneas qué vas a hacer. Luego hazlo entero, sin dejar partes a medias ni «TODO».
2. Pasa las pruebas, mira las capturas y arregla lo que falle. No me digas que algo funciona si no lo has probado; si algo no lo pudiste comprobar, dilo claro.
3. Actualiza `README.md` (qué hay nuevo y cómo se usa), haz commit con un mensaje claro en español y sube la rama.
4. Al final dame un resumen corto en español: qué hiciste, qué pruebas pasaron y qué falta o qué podría salir raro en Roblox Studio.

## 5. Ideas para lo siguiente (pregúntame cuál quiero primero)

- **Nuevo modo**: SkyWars, parkour por niveles, escondite (prop hunt) o una aventura por capítulos.
- **Más contenido**: biomas, jefes (Wither), criaturas, encantamientos, pociones y bloques decorativos.
- **Social**: grupos o «parties» para entrar juntos a Bed Wars y Mazmorras, lista de amigos en el menú, intercambio entre jugadores y clanes.
- **Progreso**: temporadas con pase de batalla gratis y de pago, logros con insignias de Roblox (BadgeService) y eventos de fin de semana.
- **Móvil**: revisar todos los botones táctiles, el tamaño de la interfaz y el rendimiento en calidad Baja.
- **Pulido**: sonidos nuevos, tutorial guiado para jugadores nuevos, más animaciones de criaturas y una pantalla de carga con consejos.
- **Monetización justa**: más cosméticos de pago (nunca ventajas que rompan el juego), packs de inicio y regalos para amigos.

Empieza leyendo `roblox/README.md` y los módulos que vayas a tocar, y dime qué entiendes del proyecto antes del primer cambio.
