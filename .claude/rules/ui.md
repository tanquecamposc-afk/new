---
paths:
  - "src/client/**"
  - "apps/web/**"
---
# Reglas de UI/HUD
- Cada control visible debe tener efecto real, o aparecer inhabilitado con mensaje 'Próximamente'.
- Los menús no deben detener la simulación por accidente; usa estado de pausa explícito para partidas locales.
- UI legible a 1920x1080 y 1280x720; navegación con teclado/mando y foco visible.
- Lobby y partida usan el mismo equipamiento persistido.
- No afirmes compra/recompensa exitosa sin confirmación del backend o guardado local validado.
