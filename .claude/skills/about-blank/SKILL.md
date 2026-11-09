---
name: about-blank
description: Añade un "about:blank cloak" a un proyecto de Lovable (Vite + React) o a cualquier página HTML, para que la app se abra dentro de una pestaña about:blank con título e icono personalizados. Úsalo cuando el usuario pida "volver about blank", "about:blank cloak" o "abrir en about:blank" su app de Lovable.
---

# about:blank cloak para proyectos de Lovable

Objetivo: cuando alguien abre la app publicada, se abre una pestaña nueva
`about:blank` que muestra la app a pantalla completa dentro de un `<iframe>`,
y la pestaña original se redirige a otra página (configurable).

La implementación de referencia está en `lovable/about-blank.js` de este repo.

## Pasos

1. **Detecta el tipo de proyecto**
   - Lovable / Vite: existe `index.html` en la raíz y `src/main.tsx`.
   - HTML suelto: un `index.html` con todo dentro.

2. **Copia el script**
   - Lovable / Vite: copia `lovable/about-blank.js` a `public/about-blank.js`.
   - HTML suelto: copia el contenido dentro de un `<script>` inline al
     principio de `<head>`.

3. **Engánchalo en `index.html`**, dentro de `<head>` y antes de
   `<script type="module" src="/src/main.tsx">`:

   ```html
   <script src="/about-blank.js"></script>
   ```

4. **Configura** el objeto `CONFIG` del script según lo que pida el usuario:
   - `redirectTo`: URL a la que va la pestaña original (`null` para no redirigir).
   - `title` / `icon`: título e icono de la pestaña about:blank.
   - `skipHosts`: dominios donde NO se activa (por defecto el editor/preview
     de Lovable y localhost, para que se pueda seguir editando).

5. **Verifica**
   - Abre la URL publicada (no el preview de Lovable).
   - Si el navegador bloquea el popup, el script espera al primer clic o tecla
     y abre el about:blank entonces.
   - `?nocloak` al final de la URL lo desactiva.

## Reglas

- No rompas el router: el iframe carga `location.href` completo, así que las
  rutas de React Router funcionan igual.
- No toques `src/` salvo que el usuario lo pida; todo va en `index.html` y
  `public/`.
- Mantén el check `window.self !== window.top` para evitar bucles infinitos
  (el iframe volvería a abrir otro about:blank).

## Prompt para pegarle a Lovable directamente

Si el usuario prefiere que lo haga el propio chat de Lovable, dale este texto:

> Crea el archivo `public/about-blank.js` con este contenido exacto: [pegar
> `lovable/about-blank.js`]. Luego añade `<script src="/about-blank.js"></script>`
> en `index.html` dentro de `<head>`, antes del script de `/src/main.tsx`.
> No cambies nada más.
