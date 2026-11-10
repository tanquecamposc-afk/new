# Proyecto: NEXUS ROYALE (nombre provisional)
Desarrolla un videojuego shooter 3D original, inspirado en la amplitud funcional de Battle Royale modernos. NO copies assets, interfaz pixel a pixel, marcas, personajes, mapas o música de Fortnite. Responde al usuario en español, código/documentación técnica con nombres ingleses.

## Prioridades
1. Producto **jugable** > demo visual > cantidad de funciones.
2. Todo código nuevo debe compilar, tener un flujo jugable verificable y no romper la fase anterior.
3. Primero inspecciona el repositorio y ejecuta pruebas existentes. No sobrescribas módulos existentes sin comprobar impactos.
4. El núcleo de dominio (`src/core/`) no depende del renderizador, React, plataforma ni base de datos.
5. Inicia tareas de más de un archivo con un plan breve; implementa vertical slices comprobables.
6. No declares «completo» lo que solo sea botón, mock, dato estático, bot no funcional o una simulación de servidor.
7. Si no puedes ejecutar la app, registra explícitamente la limitación y provee comandos de verificación.
8. Antes de añadir una dependencia, comprueba API/versión/compatibilidad. Congela versiones y elige un solo stack.
9. Datos y reglas configurables por modo; no copies/pegues motores distintos para BR, Recarga, Ranked y Pillars.
10. No almacenes secretos en repositorio ni uses permisos irrestrictos por defecto.

## Comandos
- `npm run check`: comprobar tipos del núcleo TypeScript.
- `npm test`: compilar y ejecutar tests del núcleo.
- Cuando exista cliente web: `npm run dev`, `npm run build`, `npm run test:e2e` (crearlos y verificar en esa fase).

## Archivos importantes
- `README_EMPIEZA_AQUI.md`: instalación y límites de este kit.
- `docs/00-PLAN_MAESTRO.md`: fases, dependencias y entregables.
- `docs/01-ARQUITECTURA.md`: organización técnica y single-source-of-truth.
- `docs/02-CONTRATOS_Y_ESTADOS.md`: eventos, invariantes y máquinas de estado.
- `docs/03-GAMEPLAY_NUMEROS.md`: valores de prueba originales, modificables.
- `docs/04-MODOS_Y_PILLARS.md`: mecánicas diferenciadas por experiencia.
- `docs/05-MULTIJUGADOR.md`: autoridad del servidor, netcode y persistencia.
- `docs/06-ARTE_Y_RENDIMIENTO.md`: gráficos, pipeline 3D y presupuestos.
- `docs/07-UX_CONFIG.md`: todos los menús/controles con acciones reales.
- `docs/08-CRITERIOS_QA.md`: pruebas y definición de completitud.
- `docs/09-PROMPTS_PARA_SESIONES.md`: prompts listos.
- `docs/10-DATOS_SEGURIDAD_ECONOMIA.md`: cuentas, XP, tienda, recompensas.
- `docs/11-CREATIVO.md`: editor de mapas y aislamiento del sandbox.
- `docs/12-REFERENCIAS.md`: fuentes y fechas.
- `src/core`: reglas de ejemplo ejecutables. `tests`: pruebas.

## Entregable al cerrar cada iteración
- Qué está **jugable** realmente y cómo se prueba.
- Archivos editados y por qué.
- Salida exacta de comandos que ejecutaste (sin inventar resultados).
- Captura o evidencia visual si hay navegador disponible; si no, decirlo.
- Deudas, errores conocidos y siguiente tarea mínima.
- Actualiza `docs/PROGRESO.md` y guarda commit descriptivo si el usuario lo autoriza.

## Normas de calidad
- TypeScript en modo strict. Nada de `any` innecesario.
- Simulación lógica a pasos fijos; separar red, simulación, render y UI.
- Backend autoritativo para daño, eliminaciones, recompensas, moneda y rangos una vez habilitado multijugador real.
- Tests con semillas fijas y sin depender de FPS.
- Interfaces documentadas; esquemas/validadores para red, guardados y contenido externo.
- Etiquetar datos de Fortnite como referencia histórica, no código de producto ni contenido licenciado.
