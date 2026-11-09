/*
 * about:blank cloak — abre la app dentro de una pestaña "about:blank".
 *
 * Uso en Lovable (Vite + React): pega este archivo en /public/about-blank.js
 * y añade en index.html, dentro de <head>, ANTES del script de src/main.tsx:
 *
 *   <script src="/about-blank.js"></script>
 *
 * Opciones (edita CONFIG abajo):
 *   - redirectTo: a dónde se manda la pestaña original (null = la deja igual)
 *   - title / icon: título e icono que muestra la pestaña about:blank
 *   - Añade ?nocloak a la URL para desactivarlo (útil mientras desarrollas).
 */
(function () {
  var CONFIG = {
    redirectTo: "https://classroom.google.com/",
    title: "Google Classroom",
    icon: "https://ssl.gstatic.com/classroom/favicon.png",
    // No cloaquear dentro del editor/preview de Lovable
    skipHosts: ["lovable.dev", "lovableproject.com", "localhost", "127.0.0.1"],
  };

  try {
    // Ya estamos dentro del iframe del about:blank -> no hacer nada
    if (window.self !== window.top) return;
    if (/[?&]nocloak\b/.test(location.search)) return;
    var host = location.hostname;
    for (var i = 0; i < CONFIG.skipHosts.length; i++) {
      var h = CONFIG.skipHosts[i];
      if (host === h || host.slice(-(h.length + 1)) === "." + h) return;
    }
  } catch (e) {
    return; // window.top inaccesible = estamos embebidos en otro sitio
  }

  function openCloak() {
    var win = window.open("about:blank", "_blank");
    if (!win || win.closed) return false; // bloqueado por el navegador

    var doc = win.document;
    doc.title = CONFIG.title;

    var link = doc.createElement("link");
    link.rel = "icon";
    link.href = CONFIG.icon;
    doc.head.appendChild(link);

    var style = doc.createElement("style");
    style.textContent =
      "html,body{margin:0;padding:0;height:100%;overflow:hidden;background:#000}" +
      "iframe{border:0;width:100vw;height:100vh;display:block}";
    doc.head.appendChild(style);

    var iframe = doc.createElement("iframe");
    iframe.src = location.href;
    iframe.allow = "fullscreen; autoplay; clipboard-read; clipboard-write; gamepad";
    iframe.setAttribute("allowfullscreen", "");
    doc.body.appendChild(iframe);

    if (CONFIG.redirectTo) location.replace(CONFIG.redirectTo);
    return true;
  }

  // Intento directo (funciona si el navegador permite popups para el sitio)
  if (openCloak()) return;

  // Si se bloqueó el popup: abrir en el primer clic/tecla del usuario
  function onGesture() {
    if (openCloak()) {
      window.removeEventListener("pointerdown", onGesture, true);
      window.removeEventListener("keydown", onGesture, true);
    }
  }
  window.addEventListener("pointerdown", onGesture, true);
  window.addEventListener("keydown", onGesture, true);
})();
