# Desarrollo

```bash
npm install
npm run dev       # servidor de desarrollo
npm test          # tests (Vitest, Rapier corre en Node)
npm run build     # typecheck + build de producción
npm run preview   # sirve dist/
```

Variables de entorno: copia `.env.example` a `.env.local`. `VITE_ENABLE_DEBUG=true` activa el
panel de rendimiento (F3 o `) y expone `window.__minigolf` para QA automatizado.

## Controles

| Acción | Ratón / teclado | Táctil |
|---|---|---|
| Apuntar y golpear | Arrastrar hacia atrás y soltar | Arrastrar con un dedo y soltar |
| Cancelar tiro | Esc | Poner un segundo dedo |
| Rotar cámara | Botón derecho + arrastrar, Q/E, flechas | Dos dedos |
| Zoom | Rueda, +/− | Pellizcar |
| Reiniciar bola | R o botón | Botón |
| Vista general | V o botón 🗺 | Botón 🗺 |
| Ajustes | Botón ⚙ | Botón ⚙ |
