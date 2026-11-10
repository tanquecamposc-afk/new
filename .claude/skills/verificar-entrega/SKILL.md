---
name: verificar-entrega
description: Verifica que una entrega del videojuego compila, se puede jugar, no presenta errores graves y cumple criterios de aceptación.
---
# Verificación
1. Ejecuta `npm run check` y `npm test`.
2. Si existe cliente, ejecuta build y smoke test (lobby → partida → eliminación → resultados → lobby).
3. Registra capturas/evidencias solo si fueron obtenidas realmente.
4. Compara checklist de `docs/08-CRITERIOS_QA.md`; marca `pass`, `fail` o `not tested`.
5. Enumera escenarios que siguen siendo simulación, local con bots, beta online o producción.
6. Actualiza `docs/PROGRESO.md`. No marques terminado sin evidencias.
