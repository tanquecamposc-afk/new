# Arise Crossover+ — ARPG de Sombras para Roblox

Reimplementación de grado de producción del bucle de juego de *Arise Crossover*: farmear
enemigos, extraer sus **Sombras** (mecánica "ARISE"), gestionar un escuadrón de 4 unidades,
subir de rango y limpiar mazmorras con el evento **Double Dungeon**.

Escrito en **Luau con tipado estricto** (`--!strict`), servidor autoritativo y una
arquitectura de simulación híbrida que mantiene el `Heartbeat` del servidor estable sin
importar cuántas Sombras haya en el mundo.

---

## 1. Arquitectura

```
src/
├─ ReplicatedStorage/Shared/
│  ├─ Types.luau                  Contrato de datos cliente/servidor
│  ├─ Modules/
│  │  ├─ Config.luau              Balance: rangos, armas, sombras, enemigos, islas
│  │  └─ StatCalculator.luau      Fórmulas puras (probadas unitariamente)
│  └─ Network/NetBridge.luau      Envoltura de Remote/UnreliableRemote + registro de conexiones
├─ ServerScriptService/Server/
│  ├─ init.server.luau            Arranque ordenado (Init → Start)
│  ├─ Services/
│  │  ├─ DataService.luau         ProfileService, session locking, atributos, monedas, XP
│  │  ├─ CombatService.luau       Validación autoritativa de daño, distancia y cooldown
│  │  ├─ ShadowServerService.luau Extracción (ARISE) + FSM y simulación de Sombras
│  │  └─ DungeonService.luau      Portales, TeleportService, Double Dungeon, Awakening
│  ├─ Components/EnemyNPC.luau    Enemigo, estado inerte y ProximityPrompt exclusivo
│  └─ Test/
│     ├─ IntegrationTest.luau     10 jugadores simulados en paralelo
│     └─ MockProfileStore.luau    ProfileService en memoria (CI / Studio limpio)
└─ StarterPlayer/StarterPlayerScripts/Client/
   ├─ init.client.luau
   └─ Controllers/
      ├─ ShadowRenderController.luau  Modelos locales + interpolación CFrame:Lerp
      └─ CombatController.luau        Entrada, animaciones, números de daño flotantes
```

### Principios que se respetan en todo el código

| Principio | Cómo se cumple |
|---|---|
| **Tipado estricto** | Todos los módulos abren con `--!strict` y usan los tipos de `Types.luau`. |
| **Servidor autoritativo** | El cliente solo envía *intención* (`"ataco al enemigo <guid>"`). Nunca números de daño, vida ni oro. |
| **Sin memory leaks** | Cada `RBXScriptConnection` se guarda y se libera en `Stop()`; `NetBridge` mantiene un registro central con `DisconnectAll()`. |
| **Cero `Humanoid` masivos** | Solo el enemigo (y el personaje del jugador) usan `Humanoid`. Las Sombras son posiciones `Vector3` en el servidor y modelos locales en el cliente. |

---

## 2. Fórmulas

**Daño físico** (`StatCalculator.GetPhysicalDamage`)

```
DañoTotal = (DañoBaseArma + (STR × 1.5)) × (1 + MultiplicadorRango)
```

**Tasa de éxito de extracción** (`StatCalculator.GetAriseChance`), acotada a `[0, 1]`

```
TasaÉxito = ProbabilidadBaseSombra + (ProbabilidadBaseSombra × AriseLuck)
```

`AriseLuck` = suerte del rango + `INT × 0.002` + **+60 %** si el jugador está *Awakened*.

Derivadas: vida (`100 + VIT × 12`), maná (`50 + MNA × 8`), velocidad
(`16 + AGI × 0.12`, con techo anti-exploit) y daño de Sombra
(`BaseDamage × (1 + (Nivel−1) × 0.08) × (1 + SDW × 0.01)`).

---

## 3. Mecánicas clave

### Extracción "ARISE" (3 intentos)

1. Al llegar a 0 de vida, el enemigo pasa a **inerte**: se destruye su `Humanoid`, se anclan
   y descolisionan sus partes y aparece un `ProximityPrompt` marcado para quien asestó el
   último golpe.
2. Cada intento consume uno de los **3** disponibles y tira contra la tasa de éxito. El
   servidor revalida el dueño y la distancia: el prompt del cliente no es la autoridad.
3. **Éxito con escuadrón lleno (4/4):** se evalúa el daño efectivo de las 4 Sombras activas y
   se desequipa automáticamente la de menor rendimiento. Si la nueva es peor que todas, se
   queda en el inventario sin romper el escuadrón.
4. **Fallo en los 3 intentos o rechazo:** el cadáver se destruye y se otorgan gemas
   proporcionales al nivel del enemigo.

### Simulación de Sombras (híbrida cliente-servidor)

- **Servidor:** una FSM por Sombra (`Idle → Follow → Chase → Attack → Return`) sobre
  posiciones `Vector3` relativas al jugador. Sin modelos 3D, sin física, sin `Humanoid`.
  Incluye correa (`leash`) para que una Sombra nunca se quede perdida persiguiendo.
- **Red:** un snapshot compacto cada **0.1 s** por `UnreliableRemoteEvent` (un paquete
  perdido se corrige en el siguiente tick, sin bloquear la cola ordenada).
- **Cliente:** modelos locales bajo `CurrentCamera` (no replicados) interpolados con
  `CFrame:Lerp` y un alfa exponencial independiente del FPS, de modo que se ven igual de
  fluidos a 30 o a 144 FPS. Animaciones, partículas y números de daño son 100 % locales.

### Mazmorras y Double Dungeon

- Temporizador maestro que genera un portal cada **15–30 min** en coordenadas aleatorias.
- Al entrar, se agrupa a los jugadores cercanos y se usa `ReserveServer` +
  `TeleportPartyAsync` (con reintentos y *backoff*) hacia una instancia privada.
- En la mazmorra, al caer el jefe de fase 1 arranca el **Double Dungeon**: se reinicia el
  temporizador, reaparecen los enemigos con estadísticas duplicadas y se abre la cámara de
  **Statue of God**.
- Al derrotarla, el perfil pasa a `IsAwakened = true` con el título **Awakened**
  (+60 % de *Rank Up Luck*).

---

## 4. Anti-exploit (casos límite cubiertos)

| Vector de ataque | Defensa |
|---|---|
| **Fast-attack / macro** | Cooldown por jugador con tolerancia de latencia; el cooldown solo se consume si el golpe es legal. |
| **Spam de remotes** | Ventana deslizante de 6 peticiones/segundo por jugador. |
| **Teleport-hit / rango infinito** | Distancia validada con `Magnitude` contra la posición real del `HumanoidRootPart`. |
| **Robo de cadáver** | Solo el `UserId` que remató puede extraer; se revalida en el servidor. |
| **4.º intento de Arise** | Contador por cadáver, no por petición. |
| **Payloads inválidos** | Tipos, `NaN`, negativos y atributos inexistentes se rechazan sin lanzar. |
| **Puntos de atributo inflados** | `AllocateStats` comprueba `UnassignedPoints >= points` en el servidor. |
| **Duplicación de ítems** | Session locking de ProfileService + liberación atómica en `PlayerRemoving` y `BindToClose`. |
| **Desconexión a mitad de carga** | Si el jugador se va durante `LoadProfileAsync`, el perfil se libera en vez de quedar bloqueado. |

Tras `EXPLOIT_STRIKES_BEFORE_KICK` infracciones el jugador es expulsado.

---

## 5. Puesta en marcha

```bash
aftman install                 # rojo, wally, stylua, selene
wally install                  # descarga ProfileService a Packages/
rojo serve                     # conecta Roblox Studio al plugin de Rojo
```

`DataService` detecta si `ProfileService` está presente: si no lo está (CI, Studio limpio),
cae en `MockProfileStore` con la misma interfaz y avisa por consola, en lugar de fallar.

Antes de publicar mazmorras, define `Config.DUNGEON_PLACE_ID` con el `PlaceId` real. Con el
valor `0` el servicio avisa y no teletransporta, para no expulsar a nadie a un lugar inexistente.

---

## 6. Pruebas

**En Studio** (Command Bar):

```lua
require(game.ServerScriptService.Server.Test.IntegrationTest).Run()
```

**Sin Studio** (CI o local), con el binario [`luau`](https://github.com/luau-lang/luau/releases):

```bash
./tests/headless/run.sh
```

El arnés aplana `src/`, sustituye los `require` por instancia por `require` por ruta e
inyecta stubs de las APIs de Roblox. **La lógica probada es la real**, sin modificar: solo el
objeto `Player` y el DataStore están simulados.

Cobertura actual (**409 aserciones, 10 jugadores simulados en paralelo**):

1. Carga de perfil con session locking y recarga tras liberar la sesión.
2. Asignación de 50 puntos a STR y verificación exacta de la fórmula de daño, más el
   rechazo de puntos insuficientes, negativos y atributos inexistentes.
3. 10 extracciones continuas: el escuadrón nunca supera 4 y siempre conserva las 4 Sombras
   de mayor daño; una Sombra inferior no desplaza a ninguna.
4. Ráfaga de ataques acelerados: 20 peticiones seguidas, 0 aceptadas, infracciones
   registradas y ataque válido de nuevo tras respetar el cooldown.
5. Ataque fuera de rango y contra objetivo inexistente.
6. Arise: éxito forzado, robo de cadáver ajeno bloqueado, agotamiento de los 3 intentos con
   conversión a gemas y destrucción del cadáver.
7. Limpieza: ni enemigos ni perfiles sobreviven al final de la prueba.

---

## 7. Build web jugable (V9 ULTRA)

`arise-3d.html` es la build actual: el mismo juego con **render 3D real en WebGL**
(Three.js desde CDN, sin bundler). Frente a la versión anterior en canvas 2D:

- luz direccional con **sombras dinámicas**, luz hemisférica y ambiental, niebla por isla;
- **cel shading** (MeshToonMaterial) para el aspecto anime del original;
- personajes como **jerarquía de nodos** (caderas, torso, hombros, cuello) animados por
  rotación: caminan, golpean, respiran y giran hacia donde avanzan;
- suelo con relieve real deformado por ruido y textura procedural por isla, props 3D
  propios de cada uno de los 14 temas, cielo con degradado por shader y nubes;
- efectos en escena: partículas, anillos de impacto, portal emisivo con luz puntual,
  números de daño como sprites y columna espectral en cada cadáver.

`arise-v9.html` conserva la versión anterior con el motor 2D por software.


`arise-v9.html` es la build actual, construida sobre el contrato **Arise Crossover V9 ULTRA**:

- **Fórmulas del contrato** aisladas en `FORMULA`: `Arma + STR×1.5`, `INT×1.6×mod`,
  `Sombra×(1+SDW·0.012)`, `HPBase+VIT×15`, `100+MNA×10`, `16+AGI×0.05`,
  `3/(1+AGI·0.005)`, doble salto a AGI 200, `EXPRequired(N)=100·N^1.85+N·50`.
- **Combate**: cadena M1_1→M1_4 (×1.00/1.05/1.15/1.45) con startup/active/recovery,
  hitstop e impulso de cámara por golpe, habilidad `Sword_BladeWave` (arco 70°, 30 de maná,
  7 s de enfriamiento), dash, salto y doble salto, críticos.
- **ARISE**: `CorpseToken` con UUID, dueño, expiración y 3 intentos; tasa efectiva
  `clamp(base × (1+suerte/100), 0, 0.95)`; éxito consume el token, tercer fallo lo convierte
  en gemas; registro de transacciones.
- **Sombras**: FSM del contrato (IDLE_FOLLOW → TARGET_ACQUIRE → ATTACK → RECOVER, más
  BOSS_FOCUS y RECALLED) con puntuación de objetivo por distancia, amenaza al dueño, foco
  manual y peso de jefe. Escuadrón de 4 con reemplazo automático y fusión de 3 copias.
- **Mazmorras**: Estándar, Puerta Roja, Double Dungeon y Boss Rush, con semilla, salas,
  temporizador, runas (Salud, Gemas, Tiempo, Oro), jefes con fases 70/40/15% + enrage y
  telegrafías en el suelo. El Double Dungeon otorga el Despertar.
- **Contenido**: las 13 islas del catálogo con sus enemigos, jefes y armas; reliquias con sus
  efectos reales; índice de sombras; rangos E→S y renacer.

### Versión anterior

`arise-crossover.html` es la build previa (V7): mismo motor pseudo-3D, alcance más pequeño.

El renderizador es un pequeño motor por software sobre Canvas 2D: proyección en perspectiva
con la cámara detrás del personaje, personajes construidos con cajas 3D al estilo Roblox
(piernas, torso, brazos y cabeza animados), suelo de baldosas en perspectiva, cielo con nubes
y niebla de horizonte, props generados de forma determinista y orden de dibujo por el
algoritmo del pintor. Corre a 60 FPS sin librerías.

Usa **las mismas fórmulas y los mismos límites** que el servidor Luau (daño físico, tasa de
extracción, vida, velocidad, daño de sombra, curva de experiencia, gemas por enemigo) y
reproduce el mismo bucle: farmear → cuerpo inerte → ARISE de 3 intentos → escuadrón de 4 con
reemplazo automático del más débil → portal → Double Dungeon → Statue of God → *Awakened*.

| | |
|---|---|
| Mover | `WASD` / flechas (en móvil, arrastra) |
| Atacar / Extraer | `Espacio` / `E` |
| Auto-ataque y auto-arise | `Q` / `R` |
| Entrar al portal | `F` |
| Paneles | `1` atributos · `2` sombras · `3` armería · `4` islas · `H` ayuda |

Diferencia deliberada con el servidor: el portal aparece cada **100 s** en vez de cada 15–30
minutos, para que una sesión de navegador vea el evento completo. La partida se guarda en
`localStorage`.

---

## 8. Otro proyecto en este repositorio

`index.html` contiene **NEXO: Tower Defense**, un juego independiente en HTML5 Canvas.
Su documentación está en [`docs/NEXO-TowerDefense.md`](docs/NEXO-TowerDefense.md).
