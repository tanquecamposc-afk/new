# Cómo hacer que Lovable trabaje sobre este juego

Guía práctica: primero cómo meter el proyecto, luego qué pegarle para que no
rompa nada, y después un catálogo de peticiones listas para copiar.

---

## 1. Meter el proyecto en Lovable

Lovable importa repositorios con **un solo `package.json` en la raíz**, stack
Vite + React + TypeScript y Tailwind. Este proyecto lo cumple, pero vive en
`lovable/` dentro de un repo que tiene más cosas, así que hay que subirlo como
repositorio propio:

```bash
# desde una copia del repo
cd lovable
rm -rf node_modules dist
git init
git add -A
git commit -m "Arise Crossover+: juego 3D en React + Vite"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/arise-crossover-plus.git
git push -u origin main
```

Si prefieres no usar la terminal: descomprime el zip que te pasé, crea un repo
vacío en GitHub y sube el **contenido de la carpeta `lovable/`** (que
`package.json` quede en la raíz, no dentro de otra carpeta).

Luego, en Lovable: **New Project → Import from GitHub**, autoriza la GitHub App
de Lovable para ese repo y elígelo. Instala dependencias y arranca la vista
previa solo. No hace falta ninguna variable de entorno.

> Comprueba antes que `npm install && npm run build` funciona en tu máquina. Si
> falla en local, fallará en Lovable.

---

## 2. Lo primero que pegas: las reglas del proyecto

Ve a **Project Settings → Knowledge** y pega esto. Son las reglas que Lovable
lee antes de cada cambio, y evitan el 90% de los desastres.

```text
Este proyecto es un juego ARPG 3D que ya funciona. No es una app CRUD.

ARQUITECTURA — respétala:
- src/game/engine.ts es el motor completo (~186 KB, código imperativo con
  three.js). Está generado desde un HTML fuente y lleva @ts-nocheck a propósito.
- src/game/markup.ts y src/game/styles.ts son el HUD y su CSS, también
  generados. Son cadenas de texto, no JSX.
- src/components/AriseGame.tsx solo monta el HUD, inyecta el CSS y arranca el
  motor con mountArise(), que devuelve la función de desmontaje.

REGLAS:
1. NUNCA reescribas engine.ts entero, ni lo "conviertas a React", ni lo partas
   en módulos, ni le quites el @ts-nocheck. Es un bucle a 60 fps: pasar su
   estado por el render de React lo haría inservible.
2. Para cambiar el juego, edita SOLO la función concreta dentro de engine.ts
   que te indique, con la mínima modificación posible. Busca la función por su
   nombre y no toques nada más.
3. No cambies la versión de three (está fijada en 0.128 a propósito; las
   versiones nuevas rompen el render de este motor).
4. No toques markup.ts ni styles.ts salvo que te lo pida explícitamente.
5. Todo lo nuevo que sea interfaz (portada, ajustes, perfiles, login, tablas)
   va en componentes React nuevos con Tailwind, FUERA del motor.
6. El juego guarda la partida en localStorage con la clave
   "arise-crossover-v9/v1". No cambies esa clave ni el formato sin migración.
7. Después de cada cambio dime en una línea qué archivo tocaste y por qué.

Si una petición mía choca con estas reglas, dímelo antes de tocar código.
```

Y en el primer mensaje, en **modo Plan** (el que no escribe código):

```text
Antes de escribir nada: lee el Knowledge del proyecto y los archivos
src/components/AriseGame.tsx, src/game/markup.ts y el índice de funciones de
src/game/engine.ts. Dime con tus palabras cómo se monta el juego, dónde está el
bucle principal y dónde está el HUD. No cambies nada todavía.
```

Si lo que responde no encaja con lo de arriba, no sigas: vuelve a pegarle las
reglas. Un Lovable que no ha entendido la arquitectura va a intentar
"modernizar" el motor y romperlo.

---

## 3. Peticiones seguras (interfaz alrededor del juego)

Estas son las que mejor se le dan, porque son React puro y no tocan el motor.

### Portada antes de jugar

```text
Crea src/components/Landing.tsx: una portada a pantalla completa con el título
"Arise Crossover+", una frase corta ("Caza. Extrae su sombra. Tu ejército
crece."), un botón "Jugar" grande y tres tarjetas con las características del
juego (mundo abierto sin cargas, 14 sombras extraíbles, 13 regiones).
Usa Tailwind con la paleta del juego: fondo #04070f, acentos #2fe4ff y #bb8cff,
tipografía Cinzel para títulos y Fredoka para el resto.
En App.tsx: muestra Landing primero y monta <AriseGame /> solo al pulsar Jugar.
No toques nada dentro de src/game/.
```

### Pantalla de ajustes

```text
Crea src/components/Settings.tsx: un panel modal con volumen (0-100),
calidad (auto/baja/media/alta) e idioma. Guarda las preferencias en
localStorage con la clave "arise-settings".
Aplícalas al juego escribiendo window.__ariseSettings antes de montar
<AriseGame />. No modifiques engine.ts en este paso: solo deja las preferencias
disponibles y dime qué línea tendría que leerlas.
Añade un botón de engranaje fijo arriba a la izquierda que abra el panel.
```

### Guardado en la nube y cuentas

```text
Conecta Supabase. Crea una tabla "saves" con columnas: user_id (uuid, FK a
auth.users), profile (jsonb), updated_at (timestamptz). Activa RLS para que
cada usuario solo vea y escriba su propia fila.
Crea src/components/CloudSave.tsx con login por email (magic link) y dos
botones: "Subir partida" (lee localStorage["arise-crossover-v9/v1"] y lo guarda
en la tabla) y "Bajar partida" (escribe la fila en esa misma clave de
localStorage y recarga la página).
No toques engine.ts: el juego ya lee esa clave al arrancar.
```

### Tabla de clasificación

```text
Con Supabase ya conectado, crea una tabla "scores": user_id, nombre (text),
nivel (int), sombras (int), region (text), updated_at. RLS: lectura pública,
escritura solo de la propia fila.
Crea src/components/Leaderboard.tsx que muestre el top 50 por nivel.
Añade una función exportada en src/lib/score.ts, publicarPuntuacion(perfil),
que lea el perfil de localStorage y haga upsert. Llámala desde un botón
"Publicar mi progreso" en el panel; todavía no la enganches al motor.
```

### Instalable en el móvil (PWA)

```text
Convierte la app en PWA instalable: manifest con nombre "Arise Crossover+",
orientación landscape, tema #04070f e iconos generados a partir de un cuadrado
con el símbolo de una sombra. Añade un service worker que cachee el bundle para
que el juego abra sin conexión. No cambies nada de src/game/.
```

---

## 4. Peticiones que sí tocan el motor

Aquí hay que ser quirúrgico. El patrón que funciona: **nombra la función, di
qué cambiar y qué no**. Siempre en modo Plan primero, y revisa el plan antes de
dejarle escribir.

### Plantilla

```text
En src/game/engine.ts, busca la función NOMBRE_EXACTO.
Cambia solo eso: DESCRIPCIÓN DEL CAMBIO.
No toques ninguna otra función, no reordenes el archivo, no quites @ts-nocheck.
Cuando termines, dime qué líneas cambiaste.
```

### Ejemplos concretos que merecen la pena

**Esquivar con invulnerabilidad**
```text
En src/game/engine.ts, en la función requestDash: durante el dash el jugador
debe ser invulnerable. Pon player.invuln = now() + CFG.DASH_TIME + 0.15 al
iniciarlo. La función hitPlayer ya respeta player.invuln, no la toques.
```

**Aviso antes del golpe de un jefe**
```text
En src/game/engine.ts, en la lógica de enemigos jefe (busca telegraph), haz que
medio segundo antes de atacar el jefe dibuje un círculo rojo en el suelo con la
función ring(x, y, radio, color, vida) que ya existe, y que SFX emita un tono
grave. Solo para enemigos con e.boss true.
```

**Racha de combo con recompensa**
```text
En src/game/engine.ts: lleva la cuenta de enemigos matados sin recibir daño
(reiníciala en hitPlayer). Cada 10 seguidos, llama a banner("RACHA x" + n,
"#ffd24a") y multiplica el oro de killEnemy por 1 + n*0.1, con tope en 2.
Usa las funciones banner, note y SFX que ya existen.
```

**Diario de misiones**
```text
En src/game/markup.ts hay un panel con id "modal" y en engine.ts están las
funciones panelStats, panelShadows, panelShop, panelItems, panelMap y
panelHelp. Añade panelQuests con el mismo estilo (usa shell(titulo, cuerpo)):
debe listar el capítulo actual de CAMPAIGN con su objetivo, la misión activa de
P.quests y el progreso. Engánchalo a la tecla 6 y añade un hexágono en la fila
de menús. No cambies los paneles existentes.
```

**Mando de consola**
```text
Crea src/game/gamepad.ts con una función conectarMando() que lea la Gamepad API
y traduzca: stick izquierdo a movimiento, stick derecho a cámara, A a golpe,
X a extraer, B a dash, Y a habilidad, LB/RB a cambiar de menú.
Escribe el resultado en window.__ariseGamepad como {mx, my, cx, cy, botones}.
Dime después qué dos líneas de inputVector y cameraKeys en engine.ts habría que
tocar para leerlo, pero no las cambies todavía.
```

---

## 5. Cuando algo se rompe

```text
La pantalla se queda en negro después de pulsar Jugar. Abre la consola del
navegador, dime el error exacto y en qué archivo y línea ocurre antes de
proponer nada. No cambies código hasta que hayamos identificado la causa.
```

```text
Revierte tu último cambio: el juego funcionaba antes y ahora no. Vuelve al
estado anterior exacto, sin "mejoras" de paso.
```

```text
Has modificado src/game/engine.ts más de lo que te pedí. Deja solo el cambio en
la función NOMBRE y devuelve el resto del archivo a como estaba.
```

---

## 6. Lo que NO le pidas

| Petición | Qué pasa |
|---|---|
| "Convierte el juego a componentes de React" | Destruye el motor. El bucle de 60 fps no puede pasar por el render de React. |
| "Refactoriza engine.ts en módulos" | 186 KB reescritos a ciegas: se rompe algo y no sabrás qué. |
| "Actualiza three a la última versión" | La 0.128 está fijada a propósito; las nuevas cambian APIs que este motor usa. |
| "Quita el @ts-nocheck y tipa el motor" | Miles de errores de tipo en código de juego que ya está probado en navegador. |
| "Mejora el juego" (a secas) | Demasiado vago: tocará cualquier cosa. Pide una mejora concreta cada vez. |
| "Añade multijugador" | No es un cambio, es otro proyecto: hace falta servidor autoritativo. |

---

## 7. Comprobar cada cambio

Después de cada tanda, en este orden:

1. La vista previa de Lovable carga sin pantalla negra.
2. Pulsas **Jugar** y el personaje se mueve con WASD.
3. Golpeas con clic izquierdo y el enemigo pierde vida.
4. Matas uno, te pones encima del cuerpo y **B** extrae la sombra.
5. Abres los menús con 1-5 y se cierran con Escape.
6. Recargas: la partida sigue donde estaba.
7. La consola del navegador no tiene errores en rojo.

Si algo de esto falla, revierte antes de seguir pidiendo cosas. Un cambio roto
encima de otro cambio roto es imposible de desenredar.

---

## 8. Ritmo que funciona

- **Una mejora por mensaje.** Pedir tres cosas a la vez multiplica el riesgo.
- **Plan antes de Build** en todo lo que toque `engine.ts`.
- **Commit después de cada mejora que funcione**, para poder volver.
- Las peticiones de la sección 3 (interfaz) son casi gratis en riesgo: empieza
  por ahí y deja el motor para cuando le hayas cogido el pulso.
