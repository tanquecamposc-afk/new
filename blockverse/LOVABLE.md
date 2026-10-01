# Cómo pasar Blockverse a Lovable

Guía completa para llevar el juego a un proyecto de Lovable sin perder nada.

## 1. Lo que tienes que saber antes

- **Blockverse no es una app de React.** Es un juego en HTML y JavaScript "clásico": un `index.html` que carga 52 archivos `.js` en orden con etiquetas `<script>`, sin compilar y sin `npm`. Lovable, en cambio, crea proyectos con **Vite + React + TypeScript + Tailwind**.
- **La forma segura de pasarlo** es meter el juego tal cual dentro de la carpeta `public/` del proyecto de Lovable y mostrarlo desde React. Lo que hay en `public/` se sirve sin tocar, así que el juego funciona igual que ahora.
- **No le pidas a Lovable que "reescriba" el juego en React.** Son más de 14 000 líneas y casi 1 MB de código; la IA de Lovable lo rompería. Úsala para lo que rodea al juego (página de inicio, diseño, etc.), no para el juego en sí.
- **Lovable no importa repositorios existentes directamente.** Hay que crear el proyecto en Lovable, conectarlo a GitHub y copiar los archivos a ese repositorio nuevo (pasos abajo).

## 2. Qué hay que copiar

Todo está en el repositorio `tanquecamposc-afk/new`, rama `claude/intelligent-davinci-d3tvkf`, carpeta `blockverse/`:

```
blockverse/
├── index.html        ← la página del juego (27 KB: estilos + pantallas + lista de scripts)
├── js/               ← 52 archivos .js (1256 KB en total)
└── mods/ejemplo.js   ← mod de ejemplo (opcional)
```

No hace falta nada más: no hay imágenes ni sonidos sueltos. Las texturas, iconos y sonidos se generan con código.

**Dependencias externas** (se cargan desde internet, ya están en `index.html`):

| Qué | De dónde |
|---|---|
| Three.js r128 (motor 3D) | `https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js` |
| Fuente Pixelify Sans | `https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@400;500;600;700&display=swap` |

**Importante:** no cambies la versión de Three.js. El código usa la API de la r128 y la variable global `THREE`; con versiones nuevas deja de funcionar. No lo instales con `npm install three`.

## 3. Pasos

### Paso 1: crear el proyecto en Lovable
1. Entra en lovable.dev y crea un proyecto nuevo con este mensaje:
   > Crea una página a pantalla completa, fondo negro, sin barras ni márgenes, que solo muestre un iframe que ocupe toda la ventana con src "/blockverse/index.html". Nada más.
2. Espera a que termine.

### Paso 2: conectarlo a GitHub
1. En Lovable, abre el menú de GitHub y pulsa **Connect to GitHub**.
2. Elige tu cuenta y deja que cree el repositorio. Lovable sincroniza en los dos sentidos con la rama principal (`main`) de ese repositorio.

### Paso 3: copiar el juego al repositorio de Lovable
Desde tu ordenador (con Git instalado):

```bash
# 1. Descarga los dos repositorios
git clone https://github.com/tanquecamposc-afk/new.git blockverse-origen
cd blockverse-origen && git checkout claude/intelligent-davinci-d3tvkf && cd ..
git clone https://github.com/TU_USUARIO/TU_REPO_DE_LOVABLE.git lovable

# 2. Copia la carpeta del juego dentro de public/
mkdir -p lovable/public/blockverse
cp -r blockverse-origen/blockverse/index.html blockverse-origen/blockverse/js blockverse-origen/blockverse/mods lovable/public/blockverse/

# 3. Súbelo
cd lovable
git add public/blockverse
git commit -m "Añadir Blockverse"
git push
```

Si no quieres usar la terminal, puedes hacerlo desde la web de GitHub: en tu repositorio de Lovable entra en `public/`, pulsa **Add file → Upload files** y arrastra la carpeta `blockverse` completa (con `index.html`, `js/` y `mods/`). Tiene que quedar `public/blockverse/index.html` y `public/blockverse/js/…`.

A los pocos segundos Lovable recibe los archivos.

### Paso 4: comprobar el código de React
Si Lovable no generó exactamente esto, pídele que ponga este contenido en `src/App.tsx`:

```tsx
export default function App() {
  return (
    <iframe
      src="/blockverse/index.html"
      title="Blockverse"
      allow="fullscreen; pointer-lock; autoplay"
      allowFullScreen
      style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh", border: 0, background: "#000" }}
    />
  );
}
```

Y en `src/index.css`, asegúrate de que haya:

```css
html, body, #root { margin: 0; height: 100%; overflow: hidden; background: #000; }
```

Si el proyecto usa rutas (`react-router`), la ruta `/` debe mostrar ese `App`.

**Alternativa sin iframe:** si prefieres que el juego sea la página directamente, en `src/main.tsx` basta con `window.location.replace("/blockverse/index.html");`. El iframe es mejor porque luego puedes añadir cosas alrededor.

### Paso 5: publicar
Pulsa **Publish** en Lovable. El juego quedará en `https://tu-proyecto.lovable.app`, y abriendo directamente `https://tu-proyecto.lovable.app/blockverse/index.html` también funciona.

## 4. Cosas que no debes tocar (o el juego se rompe)

1. **El orden de los scripts en `index.html`.** Cada archivo amplía los anteriores (reasigna funciones como `actualizarFinal`, `crearMob`, `herirMob`, `setBloque`…). El orden correcto es:
   `three.min.js` → `base` → `texturas` → `registro` → `mundo` → `luz` → `escena` → `iconos` → `malla` → `simulacion` → `redstone` → `entidades` → `mobs` → `dragon` → `jugador` → `inventario` → `efectos` → `extras` → `v120` → `v121` → `recientes` → `completo` → `final` → `mejoras` → `vibrante` → `oneblock` → `v26` → `animaciones` → `encantamientos` → `criaturas` → `main` → `menus` → `packs` → `tactil` → `interfaz` → `ambiente` → `sombreado` → `interfaz2` → `objetos27` → `criaturas2` → `estructuras27` → `biomas27` → `cultivos` → `sonidos` → `aldeanos` → `bloques28` → `manos28` → `estructuras28` → `bedwars` → `red` → `bwred` → `bedwars2` → `graficos29` → `mobs30` → `rendimiento31` → `animaciones32` → `atajos33` → `manos34` → `mesas35` → `red36` → `tiendaBW37`.
2. **No los conviertas en módulos (`type="module"`) ni los importes desde React.** Comparten variables globales; como módulos dejan de verse entre sí.
3. **No dejes que Lovable "limpie" o "refactorice" la carpeta `public/blockverse`.** Si le pides cambios al juego, dile explícitamente que solo edite el archivo concreto y que no toque el orden de los scripts.
4. **Los números de los bloques y objetos (IDs) no se pueden cambiar**, porque los mundos guardados los usan. Los bloques van del 1 al 1618 y los objetos del 200 al 711.
5. **Mantén la misma dirección web (dominio).** Las partidas se guardan en el navegador (`localStorage`), que depende del dominio. Al pasar a Lovable, los mundos creados en la versión anterior (el artefacto de Claude) **no aparecerán**, porque es otro dominio. En el nuevo sitio empiezas de cero.

## 5. Cómo guarda los datos

Todo se guarda en el navegador del jugador, sin servidor ni base de datos:

| Clave de `localStorage` | Qué guarda |
|---|---|
| `blockverse-mundos` | Lista de mundos (nombre, modo, tipo, fecha, fase de One Block) |
| `blockverse-mundo-<id>` | Cada mundo: semilla, bloques cambiados, cofres, hornos, inventario, vida, posición, mascotas… |
| `blockverse-mini-<id>` | Miniatura del mundo (imagen JPG pequeña) |
| `blockverse-opciones` | Opciones: campo de visión, brillo, sensibilidad, volumen, partículas, nubes, shaders, reflejos… |
| `blockverse-radio` | Distancia de visión |
| IndexedDB `blockverse` | Paquete de recursos cargado y mods instalados |

Si algún día quieres guardar las partidas en la nube (Supabase, que Lovable integra), habría que cambiar las funciones `guardarYa()` y `abrirMundo()`. Es un cambio aparte y no hace falta para que funcione.

## 6. Qué es el juego (descripción completa para Lovable o para quien lo lea)

Juego de bloques en 3D al estilo de Minecraft, en español, que funciona en el navegador (ordenador y móvil).

**Mundo**
- Mundo infinito generado con una semilla: 32 biomas (llanuras, bosques, taigas, jungla, jungla de bambú, desierto, sabana, badlands y badlands erosionados, pantano, manglar, cerezos, jardín pálido, bosque oscuro, prado, montañas, picos nevados y pedregosos, espigas de hielo, campos de champiñones, bosque de flores, llanura de girasoles, taiga gigante, océanos normal, profundo, cálido y helado, ríos, playas…).
- Cuevas con menas (carbón, hierro, cobre, oro, lapislázuli, redstone, diamante, esmeralda) y pizarra profunda; cuevas frondosas y de espeleotemas; geodas de amatista; arrecifes de coral.
- Nether con 5 biomas, cascadas de lava, fortalezas y bastiones; El End con el Ender Dragon, ciudades del End y élitros.
- Estructuras: aldeas con aldeanos y comercio, pirámides, templos de la jungla, cabañas de bruja, iglús con sótano, puestos de saqueadores, monumentos oceánicos, naufragios, ruinas oceánicas, tesoros enterrados, minas, mazmorras, fortaleza con portal del End, portales en ruinas, ciudades antiguas con el Warden, cámaras de prueba, mansión del bosque, fósiles y rocas del bosque.
- Día y noche, lluvia, tormentas con rayos, nieve.

**Jugabilidad**
- Modos supervivencia y creativo, y un modo **One Block** con 16 fases.
- Más de 600 bloques y más de 700 objetos; fabricación 2×2 y 3×3 con cientos de recetas; horno, ahumador, alto horno, soporte para pociones, yunque, afiladora, mesa de herrería, mesa de encantamientos (con el sistema real), cofres, redstone básica.
- Unas 85 criaturas: animales (se crían, se doman lobos, gatos y caballos), enemigos, jefes (Ender Dragon, Warden, guardián anciano) e invasiones de saqueadores.
- Armas y herramientas: espadas, hachas, picos, lanzas, maza, arco, ballesta, tridente, escudo, caña de pescar; encantamientos, pociones, élitros, cohetes.
- Comandos (`/help`, `/gamemode`, `/time`, `/tp`, `/give`, `/locate`, `/oneblock`…), paquetes de recursos de Minecraft (.zip/.mcpack) y mods en JavaScript.

**Gráficos**
- Texturas pixeladas generadas por código, iluminación suave, sombras del sol, agua con reflejos y olas, shaders (resplandor, rayos de sol, color según la hora), nubes 3D, partículas, animaciones de criaturas y del jugador, tercera persona (F5).

**Interfaz**
- Pantalla de título con logotipo, selección y creación de mundos con miniaturas, pantalla de carga, opciones con deslizadores, pausa, inventario con el muñeco del jugador, inventario creativo con pestañas y buscador, barra de vida con efectos.

**Controles**
- Ratón y teclado: WASD moverse, Espacio saltar, Shift agacharse, R correr, clic izquierdo minar/atacar, clic derecho usar/colocar, E inventario, Q tirar, 1-9 o rueda cambiar objeto, T o / comandos, F3 información, F5 cámara, Esc pausa.
- En móvil: joystick y botones táctiles.

## 7. Si algo falla en Lovable

| Síntoma | Causa probable | Solución |
|---|---|---|
| Pantalla negra o en blanco | La ruta del iframe no coincide | Comprueba que exista `public/blockverse/index.html` y abre `/blockverse/index.html` directamente |
| "THREE is not defined" en la consola | No carga Three.js (sin internet o bloqueado) | Revisa que la etiqueta de cdnjs siga en `index.html` |
| No se puede mirar con el ratón | El iframe no permite bloquear el puntero | Añade `allow="pointer-lock"` al iframe (ya está en el código de arriba) |
| Letras normales en vez de pixeladas | No carga Google Fonts | Solo es estética; el juego funciona |
| Errores de "ya declarado" | Algún archivo se cargó dos veces o se cambió el orden | Restaura el `index.html` original |
| Muy lento en móvil | Shaders o distancia alta | En Opciones: Shaders "No", distancia 4 chunks, partículas reducidas |

## 8. Resumen corto (para pegar en Lovable como contexto)

> Este proyecto contiene un juego de navegador ya terminado llamado Blockverse (estilo Minecraft), escrito en JavaScript sin compilar y con Three.js r128 cargado desde CDN. El juego vive completo en `public/blockverse/` (index.html + 60 scripts en `js/`). La app de React solo debe mostrarlo a pantalla completa en un iframe con `src="/blockverse/index.html"` y `allow="fullscreen; pointer-lock; autoplay"`. No modifiques, reordenes, conviertas a módulos ni refactorices nada dentro de `public/blockverse/`, salvo que te lo pida archivo por archivo.
