# Progresión, economía y cosméticos

La economía es **sólo cosmética**: nada de lo que se compra cambia velocidad, potencia,
física, puntuación ni hitbox (un test comprueba que el catálogo no tiene parámetros de juego;
la bola física es idéntica para todos).

## Moneda y XP (`src/config/economy.ts`, valores de tuning propios)

- Moneda inicial: 150. Se gana al completar hoyos, hoyos en uno, puesto final (con 2+
  jugadores) y al subir de nivel. La práctica local da ×0,5 (con bots se puede repetir).
- XP: hoyos jugados/completados, puntuación, hoyos en uno, puesto. Curva de nivel
  `xpBase · nivel^xpExponent`.
- `computeRewards(outcome)` devuelve el desglose línea a línea que muestra la pantalla de
  recompensas.

## Servicios

`ProfileService` (`src/profile/`) es la única capa de guardado (vía `PersistenceService`):
perfil, ajustes de nombre, moneda, inventario, equipados, XP, estadísticas e historial.

- **CurrencyService:** `getBalance`, `addCurrency`, `spendCurrency`, `canAfford`. Importes
  enteros positivos; cada operación lleva un id de transacción y un id repetido se rechaza.
- **Tienda:** `purchase(itemId, txId)` comprueba existencia, propiedad, nivel y saldo, y
  confirma todo de una vez. Un doble clic (mismo txId) nunca cobra dos veces; además la UI
  bloquea el botón mientras se procesa.
- **Inventario:** `equip` sólo con objetos poseídos; `unequip` vuelve al de por defecto.
- **Recompensas:** `grantMatchRewards(matchId, …)` es idempotente (id estable de partida,
  también tras reconectar).
- Datos corruptos al cargar: se corrigen (saldo negativo, objetos inexistentes, equipados no
  poseídos) o se restaura un perfil nuevo, sin romper la aplicación.

## Catálogo (`src/cosmetics/catalog.ts`)

Categorías: **bolas** (patrón: clásica, lisa, rayas, lunares, ajedrez, estrellada, planeta,
cromada), **colores** (incluido "Automático", el color de la plaza en la sala), **estelas** y
**efectos** (halo, chispas, confeti dorado al embocar). Rarezas: común, rara, épica,
legendaria. Algunos requieren nivel.

Render: texturas procedurales cacheadas (`ballTextures.ts`), estela como cinta orientada a
cámara con alpha por vértice, halo como sprite aditivo y chispas como partículas. En calidad
baja se omiten estela y chispas. Online, los equipados viajan en el saludo y el servidor los
valida contra el catálogo (sin cuentas todavía, no puede verificar la propiedad: queda para
el backend de cuentas).
