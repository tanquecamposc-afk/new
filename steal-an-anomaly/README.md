# 👁 Steal an Anomaly — juego para Roblox

![Miniatura](marketing/thumbnail_1280x720.png)

Juego completo y listo para abrir en **Roblox Studio**: `StealAnAnomaly.rbxlx`.
Está diseñado siguiendo el informe *Anatomía de la Viralidad en Roblox (2026)*: aplica la **regla 80/20**.
El 80 % es el bucle ya probado de *Steal an Egg* / *Steal a Brainrot* (comprar, producir, robar y defender).
El 20‑40 % restante es innovación: **Imitadores** (detección de anomalías al estilo *Animal Hospital*) y un **APAGÓN global cada 5 minutos** (escasez física al estilo *Grow a Garden 2*).

## ▶ Cómo abrirlo

1. Descarga `StealAnAnomaly.rbxlx` y ábrelo con Roblox Studio (*File → Open from File*).
2. Pulsa **Play**. Todo se genera solo: mapa, anomalías, interfaz y efectos. No hay que subir mallas, imágenes ni animaciones.
3. Para que se guarde el progreso:
   - Publica el juego (*File → Publish to Roblox*).
   - Activa *Game Settings → Security → Enable Studio Access to API Services*.
   - Sin esto, en Studio se juega sin guardar.
4. En *Game Settings → Places* pon **Max Players = 8**, porque hay 8 bases.

> Para regenerar el `.rbxlx` después de editar los scripts en `src/`, ejecuta `python3 build_rbxlx.py`.

## 🔁 El bucle de juego

```
 ┌──────────── LA GRIETA (cinta) ─────────────┐
 │  Salen anomalías cada 3 s (rareza+mutación) │
 └───────────────┬─────────────────────────────┘
                 ▼  Mantén E: "Contener $X"
        La anomalía camina sola a tu base
                 ▼
   Cápsula → genera $/s → pisa el COLECTOR 💰
                 ▼
  Compra mejores ▸ Mejora base ▸ ASCIENDE (x1.5 permanente)
                 ▲
  ROBA de otras bases 😈  ◂──▸  DEFIENDE con láser 🔒 y bate 🏏
```

**Corto plazo:** comprar la siguiente anomalía, robar una o defenderte.
**Medio plazo:** las misiones diarias, mejorar la base y sobrevivir al apagón.
**Largo plazo:** completar el Índice (14 anomalías y 4 mutaciones), Ascender, la racha de 7 días y conseguir **La Entidad ∞** (SECRETA).

## 🧠 Mecánicas únicas (el 20 % que lo hace viral)

### ☠ Imitadores
Alrededor del 14 % de las anomalías de la Grieta son **Imitadores disfrazados**: se ven igual que una anomalía real (a menudo de las caras).
Tienen una **pista visual** sutil:

| Pista | Qué notar |
|---|---|
| `redeyes` | Ojos rojos brillantes |
| `noshadow` | No proyectan sombra y parpadean |
| `inverted` | Caminan **de espaldas** y sus animaciones van al revés |
| `flicker` | Partes del cuerpo desaparecen un instante |
| `wrongcolor` | Color principal invertido |

- El **🔬 Escáner** (tecla 1) revela la verdad. Si es un Imitador, explota y **te pagan el 60 % de su precio**.
- Si compras uno sin escanearlo, en el siguiente **apagón devora tu anomalía más valiosa** y huye.
- Venderlo da **$0**.
- Truco: puedes dejar un Imitador en tu base como **cebo**. Si te lo roban, devora en la base del ladrón. Eso genera clips de “trampa” para TikTok.

### ☾ El APAGÓN (cada 5 minutos, 45 s)
Es el *restock* global y físico que recomienda el informe. Obliga a todo el servidor a converger:
- El cielo se vuelve rojo, las farolas se apagan y cada jugador lleva una linterna.
- **Todos los láseres caen**: no se puede cerrar ninguna base.
- **Surge en la Grieta**: sale una anomalía **Legendaria o mejor**, con triple probabilidad de mutación.
- **Despiertan los Imitadores** de las bases y quedan sueltos. Atraparlos da recompensa.
- **Fugas**: algunas anomalías escapan de su cápsula y **cualquiera puede capturarlas gratis**. Si nadie lo hace, vuelven a su dueño 30 s después del amanecer.

### 🔒 Defensa
- **Láser** (botón junto a la puerta): dura 60 s, y más con cada mejora. El dueño lo atraviesa; los demás no.
- **Bate** (tecla 2): si golpeas a un ladrón, suelta la anomalía y esta vuelve a tu base.
- Al dueño le llega una **alerta** (sirena y el ladrón resaltado en rojo).

## 📈 Retención y señales del algoritmo (según el informe)

| Señal (Explore API) | Cómo la ataca el juego |
|---|---|
| **qPTR / icono 150×150** | Icono con un solo punto focal, sin texto y en alto contraste (`marketing/icon_512.png`) |
| **Retención D1 / D7** | Racha diaria de 7 días (el día 7 regala una Épica), misiones diarias y ganancias offline (25 %, máx. 2 h) |
| **Sesiones de retorno (tope de 60 min/día)** | El apagón cada 5 min y el surge crean el “vuelvo a ver qué sale” |
| **Co‑Play Days** | **+10 % de dinero por amigo** en el servidor (máx. +50 %) y botón 👥 **Invitar** |
| **Spend Signal (1–4 % de compradores)** | *Starter Pack* de 25 R$, pases y productos; nada es *pay‑to‑win* puro |
| **Like ratio > 70 %** | Fricción cero (tutorial con flechas, sin textos largos) y aviso de “Like/Favorito” a los 10 min |
| **CCU Velocity / Launch Spike** | Códigos rotativos y comandos de *admin abuse* para directos |

## 🛠 Configuración (`src/ReplicatedStorage/Shared/Config.lua`)

Todo el balance está en un solo archivo: precios, tiempos, probabilidad de Imitador, duración del apagón, mutaciones, misiones y costes de Ascenso.

**Monetización:** crea los pases y productos en el Creator Hub y pega sus IDs:

```lua
Config.GamePasses.VIP.Id = 123456789
Config.Products.StarterPack.Id = 987654321
```

| Pase | Efecto |
|---|---|
| 👑 VIP | x2 dinero y etiqueta VIP |
| 🧲 Auto‑Recolector | Cobra solo |
| 🔬 Escáner PRO | Escanea 2,5 veces más rápido |
| 👟 Zapatillas Fantasma | +25 % de velocidad |

| Producto | Efecto |
|---|---|
| 🎁 Pack Inicial | $5K y una Épica al azar |
| 💼 Maletín / 🏦 Bóveda | 10 o 60 min de ingresos |
| 🌑 Provocar Apagón | Fuerza un apagón en todo el servidor (muy viral en directos) |

**Códigos:** `Config.Codes` ya trae `ANOMALIA`, `APAGON`, `LANZAMIENTO` e `IMITADOR`. Rótalos en Discord y TikTok.

**Admins:** añade UserIds en `Config.Admins`. En Studio todos son admin. Comandos de chat:

| Comando | Efecto |
|---|---|
| `/apagon` | Fuerza el apagón |
| `/surge` | Saca una Legendaria+ |
| `/secreto [mutación]` | Saca La Entidad ∞ |
| `/lluvia` | 12 anomalías raras seguidas (*admin abuse*) |
| `/imitador` | Saca un Imitador |
| `/spawn <id> [mutación]` | Saca una anomalía concreta |
| `/dinero <n>` | Da dinero |

## 👾 Bestiario

| Anomalía | Rareza | Precio | $/s |
|---|---|---|---|
| Ojo Vigilante | Común | $100 | 2 |
| Tele Viviente | Común | $250 | 5 |
| Cubo Hambriento | Común | $550 | 9 |
| Medusa del Vacío | Raro | $1.6K | 22 |
| Gato Duplicado | Raro | $3.2K | 40 |
| Cuello Largo | Raro | $6.5K | 72 |
| Reloj Sin Tiempo | Épico | $16K | 155 |
| Árbol Susurrante | Épico | $32K | 270 |
| Sin Rostro | Épico | $58K | 440 |
| Skinwalker | Legendario | $160K | 1.05K |
| Ángel Glitcheado | Legendario | $320K | 1.9K |
| Luna Sonriente | Mítico | $1.1M | 5.2K |
| ERROR_404 | Mítico | $2.6M | 11.5K |
| La Entidad ∞ | SECRETO | $12M | 42K |

**Mutaciones:**

| Mutación | Multiplicador | Probabilidad |
|---|---|---|
| Dorado | x2 | 6 % |
| Glitch | x3 | 3 % |
| Vacío | x5 | 1,5 % |
| Espectral | x10, arcoíris | 0,5 % |

## 📂 Estructura

```
steal-an-anomaly/
├─ StealAnAnomaly.rbxlx          ← ábrelo en Roblox Studio
├─ build_rbxlx.py                ← genera el mapa + empaqueta los scripts
├─ marketing/                    ← icono y miniatura
└─ src/
   ├─ ReplicatedStorage/Shared/  Config, AnomalyData, AnomalyBuilder, Util
   ├─ ServerScriptService/       Main + Modules/ (Data, Anoms, Bases, Rift, Steal, Cycle, Progression)
   └─ StarterPlayerScripts/      ClientMain (UI/efectos/herramientas), AnomalyAnimator
```

## 🚀 Plan de lanzamiento (del informe)

1. **Título:** “Steal an Anomaly 👁” (menos de 50 caracteres e incluye la palabra clave).
2. **Descripción:** pon el gancho en las 2 primeras líneas. Ejemplo: “¡Roba anomalías, pero cuidado: algunas son IMITADORES que devoran tu base en el APAGÓN!”
3. **Antes de lanzar:** sube 3‑5 devlogs a TikTok y Shorts (Imitador devorando una base, apagón, robo de una Secreta).
4. **Anuncios:** 5‑7 días de anuncios patrocinados para llegar a 100‑250 jugadores muy comprometidos. Vigila la conversión y la retención D1/D7.
5. **Fase Muerta:** es normal tras los anuncios. Si la retención supera la mediana, el algoritmo rescata el juego.
6. **Mantén la velocidad de CCU:** códigos nuevos, eventos de *admin abuse* en directo y actualizaciones de temporada (Halloween: anomalías nuevas en `AnomalyData.lua`).
