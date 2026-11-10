# 10. DATOS, RANGOS, TIENDA, MISIONES Y SEGURIDAD

## 10.1 Entidades de datos mínimas (producción futura)
- `accounts`: id, alias, hash externo/auth provider, created_at, status.
- `settings`: account_id, locale, graphics_profile, sensitivity, bindings, accessibility, version.
- `cosmetics`: sku, type, rarity, render_asset_id, category, variants, entitlement_type.
- `entitlements`: account_id, sku, acquired_at, acquisition_event_id, revoked_at nullable.
- `wallet_ledger`: transaction_id, account_id, amount_signed, currency, reason, created_at; balance derived/transactionally cached.
- `shop_catalog`: offer_id, bundle_skus, price, region_rules, starts_at, ends_at, version.
- `seasons`: id, start_at, end_at, xp_curve_version, ruleset_version.
- `quests`: quest_id, event_type, objective, target, reward, start_at, expires_at, ruleset.
- `quest_progress`: account_id, quest_id, current, completed_at, claimed_at, last_event_id.
- `battle_pass_levels`: season_id, level, xp_threshold, reward_entitlement_ids, premium_flag.
- `match_results`: match_id, mode_id, authoritative_result, created_at, checksum.
- `player_match_results`: match_id, account_id, placement, eliminations, damage, survival_seconds, result_hash.
- `rating_history`: account_id, mode_id, rating_before, delta, rating_after, match_id, algorithm_version.
- `created_maps`: map_id, author_id, version, validation_status, content_hash, published_at.

## 10.2 Reglas de base de datos
Índices únicos en `(account_id, event_id)` para otorgamientos y `(account_id, offer_purchase_id)` para compras; transacciones para débito+entitlement; validación de expiración en tiempo de servidor; no confiar en saldo de localStorage en juego online. Auditoría y corrección de saldo. En prototipo offline puedes usar IndexedDB pero la UI debe decir que es progreso local.

## 10.3 Ejemplo de compra idempotente
`purchaseRequest { offerId, idempotencyKey }` → servidor valida sesión, precio, ventana de venta, ownership, saldo, moneda → `BEGIN` → inserta request (unique) → descuenta en ledger → crea entitlements → `COMMIT` → emite recibo → UI actualiza. Repetición de request devuelve el recibo original. Si falla, rollback total. Evitar saldo negativo o compra doble.

## 10.4 Misiones por eventos reales
`deal_damage`: daño confirmado, `survive_seconds`: segundos de partida con jugador vivo, `open_chest`: cofre válido, `assist`: asistencia confirmada, `revive_teammate`: revive completo, `win_match`: resultado autoritativo. No aceptar «misión completada» por cliente. Límite temporal y cap por partida si corresponde, evitar farm infinito. XP UI sale del mismo evento y no de un contador distinto.

## 10.5 Battle Pass de demostración
Tabla de 50 niveles ficticios con XP no lineal y skins originales. Distinguir recompensas gratuitas/premium, claimed/unclaimed/locked. En juego offline no cobrar ni simular una compra con tarjeta. Si pasas a monetización real, requerir términos, pagos a través de procesador autorizado, reembolsos, menores y legislación local.

## 10.6 Ranked: especificación de producto propia
Los rangos pueden denominarse Bronce, Plata, Oro, Platino, Diamante, Campeón y Leyenda **como categorías genéricas**, pero conviene crear nombres propios. Algoritmo de rating ejemplo (no oficial): `delta = 0.4 * placementScore + 0.6 * adjustedEliminationScore - penalty`, cap +/-50, adjustment por fuerza de sala, normalización por tamaño de equipo, y season reset versionado. Nunca decir que reproduce la fórmula exacta de Fortnite.

## 10.7 Gestión de eventos y temporadas
Configuración versionada: `seasonId`, `eventId`, `startAt`, `endAt`, `timeZoneUTC`, `missionSetId`, `lootPoolId`, `mapRotationId`, `bannerAssetId`. Reloj de servidor: el cliente no puede adelantar fecha para desbloquear ofertas. Para eventos programados, puedes mantener el ítem «próximamente» hasta el timestamp real y no activarlo adelantadamente.

## 10.8 Seguridad, privacidad y propiedad intelectual
Revisar derechos sobre assets y marcas antes de publicar. No afirmar afiliación con Epic o Anthropic. Usar identidad original, colección de recursos con licencia y registros. Anticheat de red; moderación/reportes; límites de voz/chat y UGC; respetar datos de menores. Recomendable una revisión legal y de protección de datos antes de monetizar o publicar un servicio multijugador.
