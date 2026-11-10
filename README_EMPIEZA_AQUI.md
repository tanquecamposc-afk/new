# NEXUS ROYALE — EXPANSIÓN TÉCNICA PARA CLAUDE CODE
**Complemento del dossier anterior del 10/11/2026 | No es el juego terminado.**

Este paquete añade instrucciones que Claude Code puede leer como archivos de un repositorio, documentación técnica y un núcleo **TypeScript sin dependencias externas** que implementa y prueba reglas de dominio (daño, vida, escudo, botín, tormenta, rondas Pillars, Recarga, XP y compras idempotentes). El núcleo no contiene renderizado 3D, servidores, mapas, arte 3D ni un sistema de matchmaking completo: esas partes deberán implementarse en las siguientes fases.

## Instalación
1. Abre en Claude Code la carpeta de tu proyecto del juego. Si aún no tienes uno, usa este directorio como inicio.
2. Copia los archivos y carpetas de esta expansión en la raíz, **sin sobrescribir código existente sin revisarlo**.
3. Coloca el dossier previo en `references/` con un nombre descriptivo (o indica su ruta a Claude). Las imágenes del kit previo pueden ir en `references/images/`.
4. Instala Node.js reciente, abre la terminal en la raíz del proyecto y ejecuta `npm install`. Esto instalará TypeScript y las definiciones de Node declaradas en `package.json`.
5. Ejecuta `npm test` (TypeScript compila los módulos y se ejecutan pruebas). Si hay errores por versión de Node o TypeScript, Claude debe detectarlos y solucionarlos antes de implementar el motor 3D.
6. En Claude Code, escribe el primer mensaje de `docs/09-PROMPTS_PARA_SESIONES.md`. Empieza en **modo de planificación**, revisa repositorio y solicita un primer incremento jugable.

### Orden de lectura para Claude Code
`CLAUDE.md` → `docs/00-PLAN_MAESTRO.md` → `docs/01-ARQUITECTURA.md` → `docs/02-CONTRATOS_Y_ESTADOS.md` → `docs/03-GAMEPLAY_NUMEROS.md` → `docs/08-CRITERIOS_QA.md` → el documento específico del modo a implementar. No cargues todos los documentos en cada respuesta: usa la información por demanda.

### Lo que de verdad podrás comprobar tras copiar esta expansión
- `npm test` comprueba reglas deterministas de gameplay y economía, sin interfaces gráficas.
- `npm run check` comprueba tipos del núcleo de dominio.
- `CLAUDE.md` y `.claude/` proporcionan contexto y procedimientos específicos para Claude Code.
- Los documentos incluyen fórmulas, invariantes, perfiles de rendimiento, criterio de 'terminado' y prompts de continuación.

### Seguridad, marcas y honestidad
Desarrollar un juego inspirado en las funciones generales de los Battle Royale no autoriza a copiar personajes, modelos, gráficos, marcas, UI idéntica o música de Fortnite. No copies recursos de Epic ni del contenido de la comunidad sin licencia. Las referencias de 2026 tienen fechas: reconfirma cambios futuros cuando corresponda. Nunca presentes jugadores simulados como usuarios humanos reales.

### Punto de corte recomendado
Primero termina: lobby simple → una arena 3D pequeña → personaje controlable → un arma funcional → 8 bots → tormenta → eliminación/victoria → volver al lobby. Después habilita construcción/Recarga/Pillars como reglas configurables, antes de crear tienda, Ranked real o multijugador masivo.
