# 09. PROMPTS ESPECÍFICOS PARA CLAUDE CODE, LISTOS PARA COPIAR

## PROMPT A — primera sesión, auditoría del repositorio
```text
Estoy desarrollando NEXUS ROYALE, un videojuego 3D original. Lee CLAUDE.md, README_EMPIEZA_AQUI.md, docs/PROGRESO.md y docs/00-PLAN_MAESTRO.md. Primero inspecciona mi repositorio y ejecuta `npm run check` y `npm test` si están disponibles. No inventes resultados: dame los comandos y la salida exacta. Después propón un plan F0-F1 de un vertical slice real que incluya cámara tercera persona, WASD, salto y colisiones. Separa qué archivos tocarías, riesgos, dependencias y pruebas de aceptación. No programes aún hasta que revise el plan. Reutiliza todo lo existente.
```

## PROMPT B — crear escena jugable F1
```text
Implementa F1 según docs/00-PLAN_MAESTRO.md y docs/03-GAMEPLAY_NUMEROS.md. Si aún no hay frontend, configura un proyecto Vite + TypeScript + React Three Fiber / Three.js y Rapier con versiones compatibles verificadas. La demo debe iniciar una escena 3D real, un avatar original provisional (puede ser geometría simple), cámara tercera persona, WASD, mouse, salto, sprint y colisiones con suelo y 3 obstáculos. Incluye un HUD mínimo de estado, Esc para liberar pointer lock, ayuda de controles y un botón volver al lobby. No diseñes tienda, pase ni 20 pantallas antes de tener movimiento jugable. Prueba build y describe cómo comprobarlo manualmente. Deja el proyecto ejecutable.
```

## PROMPT C — combate y bots F2-F3
```text
Lee docs/01-ARQUITECTURA.md, docs/02-CONTRATOS_Y_ESTADOS.md y docs/03-GAMEPLAY_NUMEROS.md. Conecta src/core/combat.ts al gameplay real. Implementa un arma hitscan, daño por escudo/vida, ammo y recarga; crea 2-8 bots con percepción y movimiento básico. El disparo debe raycast contra colliders, no solo generar efectos. Agrega daño de enemigo, escudo, eliminación, HUD de munición, indicador de impacto y pruebas. Evita repetir estado de vida en UI, física y gameplay.
```

## PROMPT D — BR completo local F4
```text
Implementa una partida corta completa: lobby → start → mapa 3D → spawn → loot → tormenta con 4 fases → eliminar bots → ganar/perder → pantalla resultados → volver lobby. Usa estados explícitos y el núcleo src/core, datos parametrizados y pruebas para condición de victoria y tormenta. Debe poder jugarse sin servidor. No mostrar 80 jugadores si solo hay 8 bots: etiquetar claramente partida de práctica.
```

## PROMPT E — construir y Zero Build F5
```text
Implementa paredes, pisos, rampas y techos con preview verde/rojo, snapping, coste de materiales y colisión; permite editar piezas propias y destruirlas. Implementa Zero Build como regla de simulación que rechaza construir, incluso si un usuario envía el comando. Añade pruebas, UI de materiales, menú de control y ejemplos de construcción funcional.
```

## PROMPT F — Recarga F6
```text
Implementa Recarga como `ModeRules` compartiendo combate e inventario, no como otro motor. En duos/squad, el jugador muerto inicia cuenta atrás y reaparece si queda un compañero vivo y no hay final lockout. El team wipe termina el equipo. Prueba eliminación simultánea, desconexión del último compañero, reducción de timer opcional y ganador único. Distingue claramente protocolo local de infraestructura online futura.
```

## PROMPT G — THE PILLARS actualizado F7
```text
Lee docs/04-MODOS_Y_PILLARS.md. Implementa primero una variante original inspirada en THE PILLARS Nexiph v121 (referencia 8 nov 2026) con hasta 8 jugadores, pilares separados, caída elimina, ítem aleatorio cada 5 segundos y ganador último superviviente. Reutiliza daño y lobby. El temporizador debe depender del tick fijo y no setInterval. Incluye bots de práctica, HUD de ronda y botón revancha. Después crea un preset Hive-style diferente de 12 jugadores con drop cada 6 segundos. No mezcles reglas y no copies mapa exacto, logos ni skins. Escribe pruebas específicas por variante.
```

## PROMPT H — lobby, taquilla, tienda y pase F8-F9
```text
Implementa las rutas descritas en docs/07-UX_CONFIG.md con UI pulida y real. Login local de prueba, guardar skin equipada y configuración, perfil, quests y pase demo. Inventario y monedas como ledger idempotente; simulación de tienda sin pago real, compra condicionada a saldo; no botones vacíos. Al reiniciar la app deben conservarse skin, opciones y premios. Prueba E2E de compra/pase/equipamiento.
```

## PROMPT I — multijugador F10
```text
Refactoriza la simulación en Node server autoritativo usando docs/05-MULTIJUGADOR.md. Implementa sala de 2 a 8 clientes reales; cliente envía inputs, servidor simula, valida daño/loot, retorna snapshots versionados; añade reconciliación e interpolación básicas. Con dos navegadores prueba movimiento y daño sincronizados, reconexión y rechazo de paquetes maliciosos. No mostrar status 'online multiplayer ready' si solo se conecta un cliente o se emulan bots.
```

## PROMPT J — QA de cierre de fase
```text
Usa la skill verificar-entrega. Audita la fase actual contra docs/08-CRITERIOS_QA.md. Ejecuta los comandos de tipo/build/tests, reproduce el flujo completo, comprueba 720p y 1080p si tienes navegador, detecta botones falsos y errores de consola. Devuélveme tabla por criterio: PASS/FAIL/NOT TESTED con evidencia concreta. Corrige los FAIL críticos y actualiza docs/PROGRESO.md. No declares terminada una fase si solo está visualmente dibujada.
```

## PROMPT K — continuar otro día sin perder trabajo
```text
Lee CLAUDE.md y docs/PROGRESO.md. Inspecciona git status y los commits recientes; ejecuta pruebas baseline. Resume qué está implementado con evidencia y qué queda por hacer. Propón la siguiente tarea mínima dentro de la fase actual. No elimines código útil ni cambies el stack. Continúa solo después de entender arquitectura existente.
```

## PROMPT L — debugging real
```text
Tengo este fallo [PEGAR ERROR Y PASOS]. Analiza el código en lugar de crear una solución nueva desde cero. Primero reproduce con un test que falle, localiza la causa raíz, corrige lo mínimo, ejecuta toda la suite y documenta regresión. Entrega rutas de archivos y resultados de comandos. No apagues errores de tipos ni ignores excepciones para que parezca que funciona.
```

## PROMPT M — revisar actualización externa sin confundir fuentes
```text
Consulta documentación actual de cada modo y actualiza solamente el dossier de referencias con URL, fecha, modo, creador y versión. Separa HECHO ACTUAL, CAMBIO ANUNCIADO FUTURO, HISTÓRICO y REGLA ORIGINAL DE NUESTRO JUEGO. No reescribas las mecánicas internas automáticamente al descubrir una actualización de Fortnite; propón los cambios como una decisión de diseño y una migración de config.
```

## Cómo enviar el trabajo
En Claude Code utiliza el repositorio como contexto vivo. No pegues 40 páginas en cada turno. Menciona una ruta específica del archivo que necesitas; mantén `CLAUDE.md` corto y procedimientos detallados en `.claude/skills`. Solicita pruebas y resultados, no solo texto y promesas. Cuando termine una fase, haz commit y registra las decisiones.
