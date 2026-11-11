# Registro de licencias de arte

Todos los nuevos modelos, música, texturas, sonidos y fuentes deben registrar creador, licencia, URL de origen, fecha y permiso de uso comercial antes de integrarlos. Las imágenes de `references/images` son conceptos originales del dossier, no assets de personajes listos para producción. No usar recursos extraídos de Fortnite o de mapas de terceros sin permiso.

## Estado a 2026-11-10 (fase 1)

El juego **no incluye ningún archivo de arte ni de audio**. Todo se genera en tiempo de ejecución a partir de código del propio repositorio:

| Recurso | Cómo se genera | Archivo | Licencia |
|---|---|---|---|
| Terreno, piezas, árboles, rocas | Geometría procedural con semilla fija | `src/core/maps/trainingGrounds.ts`, `src/client/render/worldView.ts`, `geometry.ts` | Original del proyecto |
| Avatar y animaciones | Primitivas y animación por código | `src/client/render/avatar.ts` | Original del proyecto |
| Texturas de detalle y rótulos | Dibujadas en un canvas 2D al arrancar | `src/client/render/textures.ts` | Original del proyecto |
| Cielo, nubes, partículas | Shaders GLSL propios | `src/client/render/sky.ts`, `particles.ts` | Original del proyecto |
| Efectos de sonido y ambiente | Síntesis con Web Audio | `src/client/audio/AudioEngine.ts` | Original del proyecto |
| Tipografía | Fuentes del sistema (`Segoe UI`, `system-ui`, etc.); no se distribuye ninguna | `src/client/styles.css` | No aplica |
| Icono de la pestaña | SVG en línea | `index.html` | Original del proyecto |

## Dependencias de código (no son arte)

| Paquete | Versión | Licencia |
|---|---|---|
| three | 0.187.0 | MIT |
| react, react-dom | 19.3.1 | MIT |
| vite (desarrollo) | 8.3.7 | MIT |
| typescript (desarrollo) | 5.9.3 | Apache-2.0 |
| playwright (pruebas) | 1.63.0 | Apache-2.0 |

## Material de referencia que NO forma parte del juego

Los PDF, DOCX e imágenes del kit y la guía visual de 18 paneles son moodboard y especificación. Contienen composiciones con un aspecto cercano a juegos comerciales y no se versionan ni se usan como recurso. Lo que se toma de ellos es estructura (qué pantallas y sistemas existen), no su apariencia.
