# Persistencia

`PersistenceService` (`src/persistence/`) es la única capa de guardado.

- Claves con prefijo `minigolf-party:` y sobre `{ v: versión, data }`.
- Cada tipo de dato tiene un validador: los valores fuera de rango se acotan y los tipos
  incorrectos vuelven a su valor por defecto.
- JSON corrupto o versión distinta → se restauran los valores por defecto y se reescriben.
- Si `localStorage` no está disponible (modo privado, bloqueado) se usa memoria: el juego
  funciona igual, sin guardar entre sesiones.

Datos guardados: ajustes (`settings`) y perfil (`profile`: moneda, inventario, equipados,
XP, estadísticas, historial y transacciones recientes para idempotencia). Un backend de
cuentas podría sincronizar el perfil detrás de `ProfileService` sin cambiar la UI.
