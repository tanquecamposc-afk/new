---
paths:
  - "src/core/**"
  - "src/simulation/**"
  - "tests/**"
---
# Reglas de simulación
- Mantén funciones puras y deterministas cuando sea posible.
- El cliente solicita acciones; la simulación valida precondiciones antes de emitir eventos.
- No leas Date.now(), Math.random() o estado global mutable desde reglas puras; recibe reloj/semilla como argumentos.
- Evita cálculos vinculados a FPS: `dt` explícito y fijo.
- Añade pruebas para valores límite, transiciones inválidas y doble aplicación del mismo evento.
- Separa `config` por modo y guarda `schemaVersion` para futuras migraciones.
