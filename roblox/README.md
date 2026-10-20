# Blockverse para Roblox (Luau)

Versión de Blockverse hecha para Roblox. El juego web usa JavaScript y Three.js. Esta versión está reescrita en **Luau** con el motor, la física, la luz y el sistema de red de Roblox. Así funciona en PC, móvil y consola, y con varios jugadores a la vez.

## Cómo jugarlo

1. Abre **Roblox Studio**.
2. Abre el lugar: **Archivo → Abrir desde archivo…** (*File → Open from File…*) y elige `Blockverse.rbxlx`.
3. Pulsa **Play** (F5).
   - Para probar con varios jugadores, ve a **Prueba → Clientes y servidores** (*Test → Clients and Servers*), elige 2 jugadores y pulsa **Iniciar**.
4. Para publicarlo, usa **Archivo → Publicar en Roblox** (*File → Publish to Roblox*).
   - Para que se guarde el inventario de supervivencia, activa también **Configuración del juego → Seguridad → Permitir acceso de Studio a los servicios de API** (*Game Settings → Security → Enable Studio Access to API Services*).

Si usas **Rojo**, el archivo `default.project.json` monta el mismo árbol a partir de `src/`.

## Qué incluye

- **Mundo de bloques infinito**, generado con una semilla al azar en cada servidor:
  - Biomas: llanuras, bosques, desiertos con cactus, nieve con abetos, montañas nevadas, playas, mares y lagos.
  - Cuevas y menas: carbón, hierro, oro y diamante.
  - Flores, hierba alta y calabazas.
- **36 bloques**, cada uno con su material de Roblox:
  - Algunos tienen una capa de otro material encima: el césped tiene los lados de tierra y los troncos muestran anillos arriba.
  - Las menas muestran vetas de color.
  - El vidrio y el hielo son transparentes.
  - Las antorchas tienen llama y luz, y la piedra luminosa también da luz.
- **Agua de verdad** con el agua de Roblox: se puede nadar, y si cavas al lado de un lago, el agua entra en el hueco.
- **Picar y construir:**
  - Cada bloque tarda distinto en romperse según la herramienta.
  - La piedra y las menas necesitan un pico del nivel adecuado.
  - Mientras picas se ve el marco de selección, una barra de progreso y trocitos al romper.
- **Inventario** de 36 casillas, con barra rápida de 9.
  - **Libro de recetas:** 34 recetas, algunas necesitan una mesa de trabajo o un horno cerca.
- **16 herramientas:** pico, hacha, pala y espada, en madera, piedra, hierro y diamante, cada una con su durabilidad.
- **Supervivencia:**
  - 10 corazones y 10 de hambre.
  - La vida se recupera con el hambre llena.
  - Hay daño por caída.
  - La comida es manzana, carne cruda, filete y pan.
- **Criaturas:**
  - Los **zombis** salen de noche, persiguen al jugador y se queman al sol.
  - Los **cerdos, vacas y ovejas** pasean y huyen cuando les pegas. Sueltan carne o lana.
- **Día y noche:** un día dura 20 minutos. Hay sombras, niebla, nubes, brillo, estrellas y luces con sombra (iluminación *Future*).
- **Modo creativo:**
  - Todos los bloques y objetos a mano.
  - Se rompe al instante y se puede volar.
- **Multijugador:** todo pasa en el servidor, así que todos ven el mismo mundo.
- **Guardado:** se guarda el inventario de supervivencia.
- **Móvil:** botones táctiles ⛏ (picar), ✋ (poner o comer), 🎒 (inventario) y 🕊 (volar).

### Controles en PC

| Acción | Tecla |
|---|---|
| Picar / atacar | Clic izquierdo (mantener) |
| Poner bloque / comer | Clic derecho |
| Elegir objeto | 1–9 o rueda |
| Inventario y recetas | E |
| Cámara en 1ª / 3ª persona | V |
| Correr | Shift |
| Volar (creativo) | F; Espacio sube, Ctrl o C baja |

## Diferencias con la versión web

Esta es la base del juego: mundo, supervivencia, creativo y criaturas. Los modos de la versión web todavía no están portados a Roblox:
- Bed Wars
- One Block
- Mazmorras
- Leyendas

Tampoco lo están algunos sistemas avanzados:
- Redstone
- Encantamientos
- Aldeanos con comercio
- El Nether y el End

Se pueden ir añadiendo encima de esta base.

## Archivos

- `Blockverse.rbxlx`: el lugar listo para abrir en Roblox Studio.
- `src/compartido/` → `ReplicatedStorage.Blockverse`
  - `Config`: ajustes. `RADIO` es la distancia de visión: bájala a 3 si va lento en móvil.
  - `Bloques`, `Recetas`
  - `Generador`: crea el terreno.
  - `Mallador`: junta los bloques en pocas piezas para que vaya fluido.
- `src/servidor/` → `ServerScriptService.Servidor`
  - Script principal: jugadores, inventario y acciones.
  - `Mundo`: chunks y piezas.
  - `Mobs`: criaturas.
- `src/cliente/` → `StarterPlayerScripts.Cliente`
  - Controles, cámara y efectos.
  - `Interfaz`: barra, inventario, menú y botones táctiles.
- `src/personaje/Health`: quita la curación automática de Roblox.
- `construir_rbxlx.py`: vuelve a crear `Blockverse.rbxlx` a partir de `src/`.
- `pruebas/`: pruebas que se ejecutan con la consola de Luau, sin Roblox.
  - `probar.sh`: generador, mallado y recetas.
  - `probar_juego.sh`: ejecuta el servidor y el cliente en un «Roblox de mentira». En la prueba, un jugador entra, pica, fabrica, pone bloques, pelea, come y pasa la noche.

## Rendimiento

- Solo se crean piezas para los bloques que se ven.
- Los bloques iguales que están pegados se juntan en rectángulos grandes, unas 250 piezas por chunk en lugar de miles.
- El terreno se genera repartido en varios fotogramas.
- Con `RADIO = 4` hay unas 20 000–30 000 piezas en total.
