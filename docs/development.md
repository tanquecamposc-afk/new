# Desarrollo

```bash
npm install
npm run dev       # desarrollo: Vite (:5173) + servidor de juego (:2567) a la vez
npm test          # tests (Vitest, Rapier corre en Node)
npm run lint      # oxlint (src + server)
npm run check     # typecheck + lint + tests (lo mismo que debería pasar CI)
npm run build     # typecheck + build de producción
npm run dev:client  # sólo Vite (sin servidor: los modos online darán error)
npm run preview   # sirve dist/ con el servidor de juego en :2567
npm run server    # sólo el servidor de juego (multijugador) en :2567
npm start         # build + servidor que sirve el juego y el WebSocket en el mismo puerto
```

`npm run dev` lanza el servidor y Vite juntos (`scripts/dev.mjs`); Vite redirige `/ws` al
servidor. Si el servidor no está disponible, la pantalla de error ofrece *Jugar práctica local*.

Variables de entorno: copia `.env.example` a `.env.local`. `VITE_ENABLE_DEBUG=true` activa el
panel de rendimiento (F3 o `). `window.__minigolf` (motor para QA automatizado) se expone en
`npm run dev` o con `VITE_EXPOSE_ENGINE=true`; nunca en producción. Despliegue:
[deployment.md](./deployment.md). Seguridad: [security.md](./security.md).

## Lint

Se usa **oxlint** (`.oxlintrc.json`): typescript-eslint no admite TypeScript 7 (sólo hasta 6.0).
Reglas desactivadas a propósito: `no-useless-spread` (las copias de colecciones son
intencionadas, se itera mientras se borra), `no-control-regex` (`sanitizeName` elimina
caracteres de control), y reglas de estilo de *unicorn* que no detectan errores.

## Controles

| Acción | Ratón / teclado | Táctil |
|---|---|---|
| Apuntar y golpear | Arrastrar hacia atrás y soltar | Arrastrar con un dedo y soltar |
| Cancelar tiro | Esc | Poner un segundo dedo |
| Rotar cámara | Botón derecho + arrastrar, Q/E, flechas | Dos dedos o botones ⟲ ⟳ |
| Zoom | Rueda, +/− | Pellizcar |
| Reiniciar bola | R o botón | Botón |
| Vista general | V o botón 🗺 | Botón 🗺 |
| Pausa / menú | Esc o botón ⏸ | Botón ⏸ |
| Espectador: cambiar jugador | Tab / Mayús+Tab | Botones ◀ ▶ |
| Ajustes | Botón ⚙ | Botón ⚙ |
