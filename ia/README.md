# NEXO IA 🤖

Un asistente de IA en **un solo archivo HTML**, con 11 skills listas y un estudio aparte para crear imágenes.
Sin build, sin dependencias, sin `npm install`.

El archivo detecta solo dónde está corriendo:

| | Como página en claude.ai | Como archivo local |
|---|---|---|
| Qué necesita | Nada: tu cuenta de Claude | Tu clave de la API de Anthropic |
| Buscar en la web | No | **Sí** |
| Leer PDFs | Solo imágenes | **Sí**, hasta 25 MB |
| Ver el razonamiento | No | **Sí** |
| Elegir modelo | Rápido / Equilibrado / Profundo | Opus 5, Fable 5.1, Sonnet 5, Haiku 4.5 |
| Historial | Sincronizado entre dispositivos | En ese navegador |

## ▶ Cómo arrancar

**En claude.ai** — publícalo como artifact y ábrelo. La primera vez pide permiso para usar tu cuenta; aceptas y ya.

**En tu compu** — abre `index.html` con doble clic, consigue una clave en
[console.anthropic.com](https://console.anthropic.com/settings/keys) y pégala en Ajustes.
Se guarda solo en tu navegador y viaja únicamente a `api.anthropic.com`. Nunca la escribas dentro del archivo.

## 🧠 Skills incluidas

Se eligen en el desplegable de arriba y se suman a tus instrucciones, sin reemplazarlas.

| Skill | Qué hace |
|---|---|
| 📚 **Tarea del colegio** | Muestra el razonamiento paso a paso y cierra con preguntas de autoevaluación. No escribe el trabajo por ti. |
| 📎 **Citas en APA 7** | Referencias en APA 7 en español, con la cita en el texto aparte. Si falta un dato, lo pide en vez de inventarlo. |
| ✍ **Humanizar texto** | Reescribe para que no suene a IA: fuera el relleno, los conectores repetidos y los cierres de ensayo escolar. |
| 📄 **Resumir** | Idea central, viñetas con datos concretos, tabla de cifras y qué se quedó sin decir. |
| ✓ **Corregir** | Devuelve el texto corregido y una tabla con cada cambio y su porqué. |
| ⌨ **Programar** | Archivo completo y ejecutable, con manejo de errores y cómo se corre. |
| 💡 **Explicar simple** | Analogía cotidiana, frases cortas, y una pregunta al final para comprobar. |
| 🌐 **Traducir** | Respeta el registro y explica las expresiones sin equivalente directo. |
| 🎯 **Preguntas de práctica** | 8 preguntas que suben de dificultad, con respuestas al final. |
| ⚖ **Ver las dos caras** | El mejor argumento de cada lado y una postura al cierre, sin "depende". |

## ⚙ Herramientas

Con el interruptor **⚙ Herramientas** de la franja superior, el modelo deja de solo escribir y empieza a
*hacer*. Cuando le sirve, llama por su cuenta a:

| Herramienta | Para qué |
|---|---|
| ⚡ **Ejecutar JavaScript** | Calcular, contar, ordenar, convertir unidades o comprobar una fórmula ejecutándola de verdad, en vez de estimar el resultado |
| 🔎 **Buscar en tus conversaciones** | Recuperar algo que ya hablaste con él |
| 📃 **Leer un archivo adjunto** | Releer entero un archivo que le pasaste |
| 🎨 **Crear una imagen** | Dibujar cuando le pides ver algo, sin cambiar de pestaña |

Debajo de la respuesta ves qué usó y si salió bien. **Viene apagado** a propósito: cada vuelta con
herramientas es una petición más, así que cuesta y tarda. Enciéndelo cuando lo necesites.

### El entorno de ejecución

El código no corre en la página. Corre en un **Worker dentro de un iframe con `sandbox` y sin
`allow-same-origin`**, lo que da tres cosas a la vez:

- **Origen opaco**: no ve el DOM de la página ni el almacenamiento donde viven tus claves. Comprobado:
  intentar leer `parent.document` o `localStorage` desde ahí devuelve un error de referencia.
- **Hilo aparte**: un bucle infinito no congela la interfaz.
- **Se puede matar**: al pasarse del tiempo se llama a `terminate()` y el entorno queda listo para la
  siguiente ejecución. No hay que recargar nada.

Ese mismo entorno alimenta el botón **▶ Ejecutar** que aparece en los bloques de código JavaScript:
lo pruebas ahí mismo y ves lo que imprime y el valor que devuelve.

## ✨ Acabado

- **Código resaltado.** Los bloques salen con colores por lenguaje, derivados de los tokens del tema
  y no de una hoja ajena, así que combinan en claro y en oscuro. Se resalta solo lo ya terminado:
  hacerlo durante el streaming sería repintar decenas de veces por segundo.
- **Títulos de verdad.** En vez de recortar tu primera frase, al cerrar el primer intercambio le pide
  al modelo un nombre de dos a cinco palabras. Es una petición mínima —nivel rápido, sin herramientas,
  sin razonar— y ocurre una sola vez por conversación.
- **El riel agrupa por antigüedad**: Hoy, Ayer, Esta semana, Este mes, Más antiguas.
- **Hora de cada mensaje**, al pasar el mouse por encima.
- **Reanuda donde lo dejaste**: al abrir, vuelve a la última conversación en vez de la pantalla vacía.
- **Escuchar** la respuesta en voz alta, con la voz del sistema.
- **Imprimible.** `Ctrl+P` saca la conversación como documento limpio: sin paneles, sin botones,
  negro sobre blanco y sin cortar los bloques de código por la mitad.
- **Accesible.** El hilo es una bitácora que se anuncia sola a los lectores de pantalla
  (`role="log"`, `aria-live`), y el contraste del botón principal es 17:1 en claro y 8,2:1 en oscuro.

## 👁 Vista previa

Cuando genera una página web o un SVG, el bloque de código trae un botón **▶ Ver**: abre un panel al lado
donde eso corre de verdad. Puedes alternar entre la vista y el código, y descargarlo.

El HTML generado se ejecuta en un `iframe` con `sandbox` y sin `allow-same-origin`, así que no puede
tocar la página ni tus datos.

## 🎨 Estudio de imágenes

Pestaña aparte, solo para crear. Escribes qué quieres, eliges estilo (plano, isométrico, línea, cartel,
degradados, pixel, diagrama, logo) y formato, y opcionalmente una paleta. Hay **tres motores**:

| Motor | Qué da | Dónde funciona | Qué necesita |
|---|---|---|---|
| **Vectorial** | Claude dibuja en SVG: nítido a cualquier tamaño, ideal para ilustraciones, íconos, diagramas y logos. Sin fotorrealismo. | En los dos lados | Nada más |
| **Gemini** | Fotorrealismo, y además **retoca** una imagen tuya | Solo archivo local | Clave de Google AI Studio |
| **Compatible** | Cualquier proveedor con endpoint tipo OpenAI | Solo archivo local | Su clave |

> **Los motores externos no corren en la página publicada.** Los artifacts bloquean por política de
> seguridad toda llamada a servidores de terceros. La app te lo avisa antes de intentarlo y te dice que
> uses el vectorial o abras el archivo local.

### Para usar Gemini

1. Saca una clave gratis en **aistudio.google.com/apikey**. Es una clave de API, no tu cuenta de Google:
   no inicias sesión en ninguna parte.
2. Abre `ia/index.html` desde tu computadora, ve a Ajustes → *Imágenes fotográficas* y pégala.
3. En el Estudio elige el motor **Gemini**.

Queda guardada solo en tu navegador. **Nunca la escribas dentro del archivo ni se la pases a nadie**, ni
siquiera en un chat: quien la tenga gasta de tu cuota.

El modelo por defecto es `gemini-2.5-flash-image`. Los `gemini-…-image` generan y también retocan;
los `imagen-…` solo generan. Si Google renombra alguno, se cambia en ese mismo campo sin tocar el código.

**Retocar**: con Gemini aparece un hueco para subir una imagen de partida, y el botón pasa a decir
"Retocar". También sale al pulsar *Retocar* en una foto que ya generaste.

Las imágenes se guardan en el navegador con su descripción; "Otra" pide una variación. Como las fotos pesan
mucho más que un SVG, si el navegador se queda sin espacio se van soltando las más viejas.

Los SVG se sanean antes de mostrarse: fuera `<script>`, atributos `on*` y referencias externas.

## ⌨ Atajos

| Tecla | Efecto |
|---|---|
| `Enter` | Enviar (o dibujar, en el Estudio) |
| `Shift` + `Enter` | Salto de línea |
| `Ctrl` + `V` | Pegar una imagen del portapapeles |
| Doble clic en el título | Renombrar la conversación |
| `Esc` | Cerrar Ajustes |

## 📱 Instalarla en el celular

Sírvela por https (con GitHub Pages queda en `https://<tu-usuario>.github.io/new/ia/`), ábrela en el celular
y dale a "Añadir a pantalla de inicio". El *service worker* cachea el armazón de la app, nunca las respuestas.

## 🔧 Detalles técnicos

- **Las capacidades del visor tardan hasta 10 segundos en resolverse**, así que todo lo que necesita el
  motor espera a una promesa de arranque antes de disparar. Si escribes apenas carga la página, el mensaje
  queda en espera y sale solo al conectar, en vez de fallar.
- **Dos motores tras una misma interfaz.** En claude.ai usa la capacidad `sample` del runtime; como archivo
  local habla con la [Messages API](https://platform.claude.com/docs/en/api/messages) por `fetch`,
  parseando el stream SSE a mano.
- **Sin `<!doctype>` a propósito.** Así el mismo archivo sirve como artifact (que añade su propio armazón)
  y como archivo local (el navegador lo completa solo).
- Guarda los **bloques de contenido completos** de cada respuesta —texto, razonamiento con su firma,
  resultados de búsqueda, compactación— y los reenvía tal cual. Quedarse solo con el texto rompería
  la compactación.
- **Degradación progresiva**: si una función beta no está habilitada y la API responde `400`, reintenta sin
  ella en vez de mostrar un error.
- Los parámetros se ajustan por modelo: `output_config.effort` no se manda a Haiku 4.5, y el razonamiento
  usa `adaptive` o `budget_tokens` según corresponda.
- En modo `sample` el tope de entrada son 64 KiB: al acercarse, resume la parte vieja y la conversación sigue.
- Las descargas pasan por la capacidad `downloads` cuando existe, porque el visor deja inertes los enlaces
  de descarga normales.
- Cuando una respuesta se corta por largo, **Continuar** pide el resto y lo pega al mismo turno, sin dejar
  dos respuestas partidas en el hilo.
- El medidor de la franja superior muestra cuánto del contexto llevas usado.
- La clave de Gemini viaja en la cabecera `x-goog-api-key`, no en la URL, que suele quedar en registros.
- Gemini tiene dos formas según el modelo: `gemini-…-image` usa `:generateContent` y la imagen vuelve en
  `inlineData`; `imagen-…` usa `:predict` y vuelve en `bytesBase64Encoded`. La app elige por el nombre.
- La proporción va en `generationConfig.imageConfig`, que no todos los modelos aceptan: si lo rechazan con
  un `400`, se reintenta una vez sin ella.

## 🚧 Qué *no* hace

La app no le pone límites propios: ni tope de mensajes, ni recortes, ni instrucciones ocultas. El prompt
del sistema es tuyo y lo reescribes entero desde Ajustes.

Lo que sigue en pie es el entrenamiento del modelo: Claude a veces se niega por su cuenta, y eso no se
desactiva desde el cliente. Si pasa, la app te lo muestra tal cual en vez de esconderlo.

Y en la versión publicada **no navega por internet**: la capacidad `sample` no tiene acceso a la web.
Para eso está el modo local con clave de API.
