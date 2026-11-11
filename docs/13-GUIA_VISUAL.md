# 13. GUÍA VISUAL DEL PROYECTO Y DECISIONES DE IDENTIDAD

Transcripción de la **guía visual de 18 paneles** entregada por el autor del proyecto el
2026-11-10 («Referencias, interfaces, modos, sistemas y estilo gráfico»). La imagen no se versiona;
este documento recoge lo que pide para que cualquier sesión futura pueda consultarlo.

**Cómo se usa:** como mapa de pantallas, datos y jerarquía. **No** como plantilla de apariencia:
`CLAUDE.md` exige identidad propia, así que no se copian iconos, personajes, moneda, tipografía ni
la composición exacta de la interfaz de ningún juego comercial.

## Los 18 paneles

| # | Panel | Qué define | Fase |
|---|---|---|---|
| 1 | Lobby principal | Barra superior (jugar, pase, taquilla, tienda, misiones, competir), moneda, ajustes; personaje 3D al centro; tarjeta de temporada; modo actual y botón JUGAR; acceso a grupo | 5 (versión mínima hecha en 1) |
| 2 | Selección de modos | Pestañas de experiencias, tarjetas de modo con nº de jugadores, variantes clasificatorias | 4-5 |
| 3 | Pase de batalla | Temporada, nivel y XP, carril de recompensas por nivel, reclamar | 5 |
| 4 | Tienda de objetos | Pestañas (destacado, diario, lotes, estilos), tarjetas con rareza y precio, saldo | 5 |
| 5 | Gameplay Royale | Cámara al hombro, lista de equipo, brújula, minimapa con zona, contador de vivos, vida y escudo, materiales, 5 casillas, construcción | 2-3 |
| 6 | Recarga | Aviso «tu equipo puede reaparecer», mismo HUD con estado de equipo | 4 |
| 7 | Pilares | Plataformas elevadas, 8 jugadores, objeto aleatorio temporizado | 4 |
| 8 | Creativo | Pestañas crear / mis islas / explorar / publicar, paleta de categorías, gizmo de transformación, herramientas de terreno | 6 |
| 9 | Otros modos | Sin construcción, clasificatorias, mapa clásico, partidas rápidas, arenas | 4 (solo los que tengan jugabilidad propia) |
| 10 | Taquilla | Categorías (personaje, mochila, pico, planeador, estela, gestos, envoltorios, lobby), rejilla, vista previa 3D, guardar | 5 |
| 11 | Misiones y progreso | Pestañas misiones / historial / logros, semanales con progreso y XP, misiones de temporada | 5 |
| 12 | Configuración | Pestañas vídeo / juego / controles / audio / accesibilidad, filas con selector, vista previa, restablecer y aplicar | 5 (subconjunto hecho en 1) |
| 13 | Estilo visual y paleta | Violeta, azul, cian, amarillo, rosa y azul marino; «futurista, colorido, alto contraste» | Aplicado desde 1 |
| 14 | Diseño de personajes | Hoja de personaje con vistas y detalle de cabeza | 5 |
| 15 | Armas | Categorías: asalto, escopeta, subfusil, francotirador, pistola, explosiva; rarezas mítica y exótica | 2-3 |
| 16 | Espíritus | Compañeros coleccionables con habilidades (escudo, velocidad, invisibilidad, curación) | 4-5 |
| 17 | Mapa de referencia | Isla con biomas diferenciados | 3 |
| 18 | HUD en partida | Vida y escudo, materiales, 5 casillas con rareza y piezas de construcción | 2-3 |

## Identidad propia de NEXUS ROYALE (lo que ya está decidido)

- **Universo:** los jugadores son *Corredores del Nexo*; los puntos de control son *anclas*.
- **Paleta:** base azul tinta; ámbar para la acción principal; turquesa/cian para energía y
  progreso; violeta y azul como acentos secundarios; coral para alertas. Coincide con la paleta
  del panel 13 sin reproducir el aspecto de otro juego. Definida en
  `src/client/render/palette.ts` y `src/client/styles.css`.
- **Mundo:** hora dorada (cielo azul profundo, horizonte melocotón), geometría de pocos
  polígonos con sombreado plano, contornos oscuros en las piezas.
- **Interfaz:** paneles con dos esquinas achaflanadas y filo ámbar, rótulos en mayúsculas con
  espaciado amplio, brújula de cinta. Sin copiar disposición ni iconografía ajenas.
- **Personaje:** avatar procedural con casco y visor luminoso, emblema en el pecho, mochila con
  núcleo y bufanda. Las 12 skins de la fase 5 serán variaciones paramétricas originales.
- **Moneda:** *Nexus Coins*, ficticia y sin pagos reales.

## Lo que la guía muestra y aquí no se hará igual

- Nombres, logotipos, personajes, vehículos de despliegue, iconos de moneda o mapas que
  pertenezcan a otros juegos: se sustituyen por equivalentes originales.
- Modos que son marcas o colaboraciones de terceros: solo se implementan mecánicas genéricas
  (último en pie, reaparición por equipo, plataformas con objetos aleatorios, clasificatorias)
  con nombres y mapas propios.
- Cifras de jugadores que el juego no pueda sostener de verdad: en local se indica «práctica
  con bots» y nunca se muestran como jugadores humanos.
