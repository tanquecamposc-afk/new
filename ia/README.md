# NEXO IA 🤖

Un asistente de IA en **un solo archivo HTML**, con 23 skills listas (y las que tú crees), ejecución de
código en un entorno aislado y un estudio para crear imágenes.
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

## 🧠 Skills

**23 skills de fábrica**, en el catálogo que se abre con el botón de la franja o con `Ctrl+J`. Tiene buscador
—busca también en los ejemplos, no solo en los nombres— y cada una dice en una línea para qué sirve.
Todas se **suman** a tus instrucciones generales, no las reemplazan.

**Colegio** · Tarea del colegio · Citas en APA 7 · Ensayo y monografía · Exposición oral ·
Matemáticas paso a paso · Preguntas de práctica · Plan de estudio · Análisis literario

**Escribir** · Humanizar texto · Corregir · Parafrasear · Resumir · Carta o correo formal

**Entender** · Explicar simple · Ver las dos caras · Traducir · Verificar una afirmación

**Código** · Programar · Revisar código · Explicar código

**Trabajo** · CV y carta de presentación · Practicar entrevista · Hoja de cálculo

No son etiquetas vacías: cada una lleva reglas concretas. La de **APA 7** trae los moldes de cada tipo de
fuente y se niega a inventar un DOI. La de **parafrasear** avisa de que parafrasear no exime de citar. La de
**CV** insiste en logros con número en vez de listas de tareas. La de **plan de estudio** reparte con
repetición espaciada y deja el último día para repaso. La de **entrevista** hace una pregunta y espera, en
vez de soltarte las cinco de golpe.

### Tus propias skills

En el catálogo, **＋ Crear una skill**. Le pones nombre, para qué sirve y las instrucciones, y aparece en un
grupo *Mías* al principio, lista para usar y reusar. Se guardan en tu navegador.

La **envoltura** es lo que las vuelve cómodas: si escribes `Revisa este texto de historia: {texto}`, lo que
tecleés se mete donde dice `{texto}` y no tienes que repetir la instrucción cada vez. Es lo mismo que hacen
por dentro Humanizar, Corregir y Parafrasear.

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

## 📏 Sobre los topes de uso

La app **no te limita**: ni tope de mensajes, ni de largo, ni recortes, ni instrucciones ocultas. El prompt
del sistema es tuyo y lo reescribes entero desde Ajustes. Pero de dónde sale el uso cambia las cosas:

| | Tope diario |
|---|---|
| **Abierta en claude.ai** | El de tu plan de Claude. Lo pone Anthropic y **ninguna página puede levantarlo desde dentro** |
| **Archivo local con clave de API** | **Ninguno.** Se paga por token: gastas lo que uses |

Si el plan se te queda corto, esa segunda vía es la respuesta. Para estirar el plan: el nivel **Rápido**
gasta bastante menos que Profundo, y apagar ⚙ Herramientas ahorra las peticiones extra de cada vuelta.
Abajo a la izquierda ves lo que llevas gastado hoy — en modo local con tokens y costo estimado; en la
página publicada solo el número de mensajes, porque la capacidad `sample` no informa tokens y no se
inventan cifras.

## 🚧 Qué *no* hace

Lo que sigue en pie es el entrenamiento del modelo: Claude a veces se niega por su cuenta, y eso no se
desactiva desde el cliente. Si pasa, la app te lo muestra tal cual en vez de esconderlo.

Y en la versión publicada **no navega por internet**: la capacidad `sample` no tiene acceso a la web.
Para eso está el modo local con clave de API.
