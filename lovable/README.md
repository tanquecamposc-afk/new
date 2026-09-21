# Arise Crossover+ — proyecto para Lovable

ARPG de mundo abierto en 3D que corre entero en el navegador: cazas, extraes la
sombra de lo que matas y esa sombra pelea contigo. Sin servidor, sin cuentas,
sin assets externos — todo el arte, el sonido y el mundo se generan con código.

Este directorio es un proyecto **Vite + React + TypeScript + Tailwind**, el
mismo esqueleto que usa Lovable, listo para importar.

## Cómo llevarlo a Lovable

Lovable importa repositorios con **un solo `package.json` en la raíz**, así que
sube el *contenido* de este directorio como repositorio propio (no el repo
entero, donde `package.json` quedaría en un subdirectorio):

```bash
cd lovable && rm -rf node_modules dist
git init && git add -A && git commit -m "Arise Crossover+"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/arise-crossover-plus.git
git push -u origin main
```

Luego, en Lovable: **New Project → Import from GitHub**, autoriza la GitHub App
para ese repo y elígelo. Instala las dependencias y arranca la vista previa
solo. No hace falta ninguna variable de entorno ni ningún servicio: el juego
guarda la partida en el `localStorage` del navegador.

Antes de importar, comprueba en tu máquina que `npm install && npm run build`
funciona: si falla en local, falla en Lovable.

También funciona en local:

```bash
npm install
npm run dev      # http://localhost:8080
npm run build    # comprueba tipos y genera dist/
```

## Estructura

```
index.html                  arranque de Vite y fuentes
src/main.tsx                punto de entrada de React
src/App.tsx                 carcasa de la aplicación
src/components/AriseGame.tsx  monta el HUD, inyecta el CSS y arranca el motor
src/game/engine.ts          el motor completo (three.js, combate, mundo, IA)
src/game/markup.ts          marcado del HUD como cadena
src/game/styles.ts          hoja de estilo del HUD como cadena
```

### Por qué el motor no es un componente de React

El juego es un bucle a 60 fps que mueve cientos de objetos por frame. Pasar ese
estado por el render de React costaría más que el propio juego, así que el motor
es imperativo y dueño de su HUD, y React se encarga del ciclo de vida:
`AriseGame` inyecta el marcado una vez, llama a `mountArise()` y guarda la
función que devuelve para desmontar todo al salir (listeners, bucle de animación
y contexto de WebGL incluidos). El motor se importa de forma diferida, así que
three.js viaja en su propio trozo del bundle y la portada aparece al instante.

`src/game/*.ts` se generan desde `arise-3d.html` con `tools/build-lovable.py`
(en la raíz del repositorio). Si tocas el juego, edita el HTML y vuelve a
ejecutar el script; así no hay dos copias que puedan divergir. Si prefieres
trabajar solo aquí, borra el script y edita `engine.ts` directamente.

`engine.ts` lleva `@ts-nocheck`: es código JavaScript de juego, con tipos
implícitos por todas partes, y comprobarlo pieza a pieza no aportaría nada
frente a las pruebas de navegador que ya lo cubren. El resto del proyecto sí va
en TypeScript estricto.

## Descripción del juego

En [`GAME.md`](./GAME.md): historia, sistemas, fórmulas, progresión y controles.

## Cómo pedirle cambios a Lovable

En [`PROMPTS.md`](./PROMPTS.md): cómo importarlo, qué reglas darle y un catálogo
de peticiones listas para copiar.
