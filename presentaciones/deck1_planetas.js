const { build } = require("./lib");

const palette = {
  dark: "0A1028",      // azul nocturno
  panel: "182246",
  light: "F2F4FB",
  panelLight: "E4E8F6",
  accent: "F3C053",    // ámbar
  second: "8AA6F2",
  muted: "8E9AC4",
  mutedLight: "4E5878",
};

const I = (t) => ({ text: t, options: { italic: true } });
const T = (t) => ({ text: t });

const refs = [
  [T("Blakeslee, S. (2004). The CRAAP test. "), I("LOEX Quarterly, 31"), T("(3), 6-7. https://commons.emich.edu/loexquarterly/vol31/iss3/4")],
  [T("Miret-Roig, N., Bouy, H., Raymond, S. N., Tamura, M., Barrado, D., Olivares, J., Bayo, A., Berihuete, A., Bertin, E., Bouvier, J., Cuillandre, J.-C., Huélamo, N., Jamal, S., Pérez-Garrido, A. y Sarro, L. M. (2022). A rich population of free-floating planets in the Upper Scorpius young stellar association. "), I("Nature Astronomy, 6"), T("(1), 89-97. https://doi.org/10.1038/s41550-021-01513-x")],
  [T("NASA. (s. f.). "), I("Rogue planets"), T(". NASA Science — Nancy Grace Roman Space Telescope. Recuperado el 11 de septiembre de 2026, de https://science.nasa.gov/mission/roman-space-telescope/rogue-planets/")],
  [T("Planeta interestelar. (s. f.). En "), I("Wikipedia"), T(". Recuperado el 11 de septiembre de 2026, de https://es.wikipedia.org/wiki/Planeta_interestelar")],
  [T("Roman Space Telescope Project. (2025). "), I("New study reveals NASA's Roman could find 400 Earth-mass rogue planets"), T(". IPAC — Caltech. https://roman.ipac.caltech.edu/news/new-study-reveals-nasa-s-roman-could-find-400-earth-mass-rogue-planets")],
];


const cfg = {
  title: "Planetas errantes",
  shortTitle: "Planetas errantes · Método CRAAP",
  palette,
  slides: [
    {
      type: "cover",
      kicker: "Investigación científica",
      title: "Planetas errantes",
      subtitle: "Mundos sin sol: qué son, cómo se detectan y por qué podrían ser mayoría en la galaxia.",
      meta: "Evaluación de fuentes con el método CRAAP  ·  Referencias en formato APA\nColegio Santa María Marianistas  ·  2026",
      notes: "Abrir con la idea contraintuitiva: la imagen escolar de 'planeta = cuerpo que gira alrededor de una estrella' se rompe con estos objetos.",
    },
    {
      type: "question",
      kicker: "Punto de partida",
      title: "La pregunta que guía el trabajo",
      big: "¿Puede existir un planeta que no orbite ninguna estrella y aun así siga siendo un planeta?",
      body: "Durante casi toda la historia de la astronomía, «planeta» y «estrella anfitriona» fueron inseparables. Desde 2011, las campañas de microlente gravitacional detectan cuerpos de masa planetaria que cruzan el campo de visión sin ninguna estrella cerca. Eso obliga a discutir dos cosas a la vez: qué hay ahí afuera y cómo definimos lo que encontramos.",
      listTitle: "Sub-preguntas",
      list: [
        "¿Cómo se detecta algo que no emite luz propia ni refleja la de un sol?",
        "¿De dónde salen: fueron expulsados o nacieron solos?",
        "¿Cuántos hay realmente y qué tan fiables son esas cifras?",
      ],
      notes: "Aclarar que la tercera sub-pregunta es la que más se beneficia del CRAAP: las cifras varían muchísimo entre fuentes.",
    },
    {
      type: "cards",
      kicker: "Metodología",
      title: "El método CRAAP: cinco filtros antes de citar",
      lead: "Creado por Sarah Blakeslee y el equipo de la Meriam Library (California State University, Chico). Cada fuente se somete a los mismos cinco criterios y recibe una valoración, no un simple «sirve / no sirve».",
      cols: 5,
      items: [
        { tag: "C", hi: true, head: "Currency", body: "Vigencia. ¿Cuándo se publicó? ¿Se ha actualizado? En un campo que se mueve tan rápido, una cifra de 2011 puede estar corregida hoy." },
        { tag: "R", head: "Relevance", body: "Pertinencia. ¿Responde a mi pregunta o solo la roza? ¿El nivel es el adecuado para un trabajo escolar?" },
        { tag: "A", head: "Authority", body: "Autoridad. ¿Quién firma? ¿Qué institución respalda? ¿Pasó por revisión de pares?" },
        { tag: "A", head: "Accuracy", body: "Exactitud. ¿Aporta datos verificables, citas y márgenes de error? ¿Se puede contrastar con otra fuente?" },
        { tag: "P", head: "Purpose", body: "Propósito. ¿Informa, enseña, vende o busca clics? Un titular sensacionalista delata la intención." },
      ],
      notes: "Insistir: el CRAAP no descarta fuentes, las clasifica. Wikipedia puede ser un buen punto de partida y una mala cita final.",
    },
    {
      type: "versus",
      kicker: "Concepto",
      title: "Qué es (y qué no es) un planeta errante",
      left: {
        tag: "✓", head: "Lo que sí es",
        points: [
          "Un cuerpo de masa planetaria que se desplaza libre por la galaxia, sin estar ligado gravitacionalmente a ninguna estrella.",
          "También se le llama planeta interestelar, planeta huérfano o, en inglés, free-floating planet.",
          "Puede conservar calor interno por decaimiento radiactivo y por la contracción gravitatoria de su formación.",
          "Se detecta por microlente gravitacional o, si es joven y caliente, en el infrarrojo directamente.",
        ],
      },
      right: {
        tag: "✕", head: "Lo que no es",
        points: [
          "No es una enana marrón: esas superan las ~13 masas de Júpiter y llegan a fusionar deuterio. La frontera sigue en debate.",
          "No es un cuerpo necesariamente frío y muerto: algunos jóvenes todavía acretan gas y polvo de su entorno.",
          "No es un objeto raro ni excepcional: los conteos actuales sugieren lo contrario.",
          "No es un «planeta» según la definición de la UAI de 2006, que exige orbitar el Sol. Ahí está el conflicto.",
        ],
      },
      notes: "El choque con la definición oficial de la UAI es un gancho útil: la ciencia también discute palabras, no solo datos.",
    },
    {
      type: "stats",
      kicker: "Los números",
      title: "Cifras que conviene mirar con lupa",
      lead: "Las tres proceden de fuentes distintas y no todas tienen el mismo peso. Justamente por eso se evalúan después con CRAAP.",
      items: [
        { value: "70–170", small: true, label: "Planetas errantes de masa joviana identificados en la asociación estelar de Upper Scorpius, el mayor grupo detectado de una sola vez (Miret-Roig et al., 2022)." },
        { value: "6 : 1", label: "Proporción estimada por la NASA entre mundos errantes y mundos ligados a una estrella: serían, con diferencia, el tipo más común de la galaxia." },
        { value: "~400", label: "Planetas errantes de masa terrestre que el telescopio espacial Nancy Grace Roman podría encontrar, frente a los ~50 que estimaba el cálculo anterior." },
      ],
      note: "Ojo con el salto de 50 a 400: no es que aparecieran planetas nuevos, cambió el modelo estadístico. Es exactamente el tipo de dato que exige revisar la vigencia (Currency) de la fuente.",
    },
    {
      type: "steps",
      kicker: "Método de detección",
      title: "Microlente gravitacional, paso a paso",
      lead: "La única técnica capaz de detectar un cuerpo oscuro, frío y sin estrella que lo delate.",
      items: [
        { head: "Alineación", body: "Un objeto masivo pasa casi exactamente por delante de una estrella lejana del bulbo galáctico, vista desde la Tierra." },
        { head: "Curvatura", body: "Su gravedad deforma el espacio-tiempo y desvía la luz de la estrella de fondo, actuando como una lente natural." },
        { head: "Destello", body: "La estrella de fondo parece brillar más durante horas o días. Cuanto menor es la masa, más breve es el evento." },
        { head: "Interpretación", body: "Si no aparece ninguna señal de estrella anfitriona, el objeto es candidato a planeta errante. El evento no se repite jamás." },
      ],
      note: "Limitación clave: cada microlente es irrepetible, así que el resultado no se puede verificar observando otra vez. Toda la estadística depende de modelos.",
      notes: "Recalcar la irrepetibilidad: eso explica por qué las cifras cambian tanto de un estudio a otro.",
    },
    {
      type: "versus",
      kicker: "Origen",
      title: "Dos hipótesis sobre cómo quedan a la deriva",
      left: {
        tag: "1", head: "Expulsión planetaria",
        points: [
          "Nacen en un disco protoplanetario, como cualquier planeta normal.",
          "Interacciones gravitatorias con planetas gigantes hermanos o con estrellas que pasan cerca los aceleran.",
          "Superan la velocidad de escape del sistema y salen disparados al medio interestelar.",
          "Predice sobre todo objetos pequeños y abundantes: por eso importa el censo de masas terrestres de Roman.",
        ],
      },
      right: {
        tag: "2", head: "Colapso directo",
        points: [
          "Se forman como una estrella en miniatura: una nube de gas colapsa sobre sí misma, pero sin masa suficiente para encender fusión.",
          "Nunca tuvieron estrella anfitriona ni la perdieron.",
          "Predice objetos más masivos, cercanos a la frontera con las enanas marrones.",
          "Miret-Roig y su equipo concluyen que ninguna de las dos explica sola lo observado: probablemente operan ambas.",
        ],
      },
    },
    {
      type: "cards",
      kicker: "Implicancias",
      title: "Por qué esto importa más allá de la curiosidad",
      dark: true,
      cols: 2,
      items: [
        { tag: "01", hi: true, head: "Cambia el censo de la galaxia", body: "Si los errantes superan en número a los mundos con sol, nuestro modelo de cuántos planetas hay y cómo se reparten está incompleto. La Vía Láctea sería mayoritariamente un lugar de mundos a la deriva." },
        { tag: "02", head: "Obliga a redefinir «planeta»", body: "La definición de la UAI (2006) exige orbitar el Sol. Aplicada al pie de la letra, estos objetos no son planetas aunque tengan masa, composición y geología planetarias. El debate sigue abierto." },
        { tag: "03", head: "Habitabilidad sin estrella", body: "Un mundo errante con océano bajo una capa gruesa de hielo podría mantener agua líquida con calor radiogénico interno, sin depender de luz solar. Es especulativo, pero no absurdo." },
        { tag: "04", head: "Pone a prueba instrumentos nuevos", body: "El Roman Space Telescope hará el sondeo de microlente más sensible jamás realizado sobre el bulbo galáctico. En pocos años la estadística actual quedará desactualizada." },
      ],
    },
    {
      type: "cards",
      kicker: "Corpus documental",
      title: "Las cuatro fuentes que se evaluaron",
      lead: "Se eligieron a propósito de distinta naturaleza y calidad: un artículo con revisión de pares, dos páginas institucionales y una enciclopedia colaborativa. La comparación es parte del ejercicio.",
      cols: 4,
      items: [
        { tag: "F1", hi: true, head: "Nature Astronomy (2022)", body: "Miret-Roig et al. Artículo de investigación con revisión de pares y DOI permanente." },
        { tag: "F2", head: "NASA Science", body: "Página institucional sobre planetas errantes, vinculada a la misión Roman. Divulgación oficial." },
        { tag: "F3", head: "IPAC – Caltech (2025)", body: "Nota de prensa científica que difunde un estudio sobre el rendimiento esperado de Roman." },
        { tag: "F4", head: "Wikipedia en español", body: "Artículo enciclopédico colaborativo, sin autoría identificable ni revisión formal." },
      ],
    },
    {
      type: "craap",
      source: "F1 · Miret-Roig et al. (2022), Nature Astronomy",
      meta: "«A rich population of free-floating planets in the Upper Scorpius young stellar association» · Artículo de revista científica en línea con DOI · https://doi.org/10.1038/s41550-021-01513-x",
      score: "5/5",
      verdict: "Fuente principal. Citable directamente.",
      rows: [
        "2022. Sigue siendo el mayor catálogo publicado de errantes en una sola asociación estelar.",
        "Responde de lleno a dos sub-preguntas: cuántos hay y de dónde salen.",
        "15 autores de universidades europeas y japonesas; revista con revisión de pares (Nature Portfolio).",
        "Da rango (70–170), no cifra cerrada; declara incertidumbres, método y datos de 20 años de observación.",
        "Comunicar resultados originales a la comunidad científica. Sin interés comercial ni promocional.",
      ],
    },
    {
      type: "craap",
      source: "F2 · NASA, «Rogue planets» (s. f.)",
      meta: "Página del sitio NASA Science, sección Nancy Grace Roman Space Telescope · Sitio web de actualización constante · Consultada el 11 de septiembre de 2026",
      score: "4/5",
      verdict: "Muy útil para contexto. Verificar cifras en el estudio original.",
      rows: [
        "Sin fecha de publicación visible; se actualiza de forma continua. Por eso se anota la fecha de consulta.",
        "Explica el concepto y la técnica de microlente en un nivel ideal para exposición escolar.",
        "Agencia espacial estadounidense, responsable directa de la misión que producirá los datos.",
        "La proporción de 6 a 1 se presenta sin el estudio de respaldo enlazado en la propia página.",
        "Divulgación y difusión de una misión propia: hay interés institucional en destacar su relevancia.",
      ],
    },
    {
      type: "craap",
      source: "F3 · Roman Space Telescope Project / IPAC (2025)",
      meta: "«New study reveals NASA's Roman could find 400 Earth-mass rogue planets» · Nota de prensa científica de IPAC, Caltech · Sitio web institucional",
      score: "3.5/5",
      verdict: "Válida como dato de apoyo, no como fuente primaria.",
      rows: [
        "2025. Es la estimación más reciente disponible y corrige de forma explícita la cifra anterior de ~50.",
        "Aporta la proyección a futuro, pero no sustituye a un dato observacional ya confirmado.",
        "Centro de procesamiento y análisis de datos de Caltech, socio científico de la NASA.",
        "Es un resumen divulgativo: no publica el modelo estadístico completo ni las barras de error del original.",
        "Comunicar el valor científico de una misión propia. Hay que leerla como comunicación institucional.",
      ],
    },
    {
      type: "craap",
      source: "F4 · «Planeta interestelar», Wikipedia (s. f.)",
      meta: "Artículo enciclopédico colaborativo en español · Sitio web de actualización constante · Consultado el 11 de septiembre de 2026",
      score: "2/5",
      verdict: "Punto de partida, nunca cita final.",
      rows: [
        "Sin fecha fija de publicación y con historial de ediciones abierto: el contenido de hoy puede no ser el de mañana.",
        "Buen panorama general y vocabulario útil para orientarse antes de leer literatura especializada.",
        "Sin autoría identificable ni revisión de pares. Cualquier persona puede editar el artículo.",
        "Parte de las afirmaciones no tiene referencia, y la versión en español va por detrás de la inglesa.",
        "Divulgación abierta sin fines de lucro; el riesgo no es el interés, es la falta de control editorial.",
      ],
      notes: "Explicar la estrategia correcta: usar Wikipedia para localizar las referencias del pie de página y luego ir a esas fuentes originales.",
    },
    {
      type: "table",
      kicker: "Síntesis de la evaluación",
      title: "Las cuatro fuentes, criterio por criterio",
      rows: [
        { name: "F1 · Miret-Roig et al. (2022), Nature Astronomy", marks: ["Alta", "Alta", "Alta", "Alta", "Alta"] },
        { name: "F2 · NASA Science, «Rogue planets»", marks: ["Media", "Alta", "Alta", "Media", "Media"] },
        { name: "F3 · IPAC – Caltech (2025)", marks: ["Alta", "Media", "Alta", "Media", "Media"] },
        { name: "F4 · Wikipedia, «Planeta interestelar»", marks: ["Media", "Media", "Baja", "Baja", "Media"] },
      ],
      note: "Decisión final: F1 sostiene las afirmaciones centrales; F2 y F3 aportan contexto y actualidad siempre citando su carácter institucional; F4 se usó solo en la fase de exploración y no respalda ningún dato de esta exposición.",
    },
    {
      type: "closing",
      kicker: "Conclusiones",
      title: "Cuatro ideas para llevarse",
      items: [
        { head: "Existen y probablemente son mayoría", body: "Los planetas errantes pasaron de curiosidad teórica a población detectada y contada. La NASA los sitúa superando seis a uno a los mundos con estrella." },
        { head: "Los detectamos por su gravedad, no por su luz", body: "La microlente gravitacional es la única llave disponible, y su gran limitación es que cada evento ocurre una sola vez y no puede repetirse." },
        { head: "No hay un único origen", body: "Expulsión y colapso directo conviven. La distribución de masas que mida Roman será la prueba que permita saber cuánto aporta cada mecanismo." },
        { head: "Las cifras exigen leer la fuente, no el titular", body: "Pasar de ~50 a ~400 planetas previstos no fue un descubrimiento: fue un cambio de modelo. Sin aplicar CRAAP, esa diferencia se cita como si fuera un hallazgo." },
      ],
    },
    {
      type: "refs",
      items: refs,
      step: 0.95,
      size: 11,
      note: "Referencias ordenadas alfabéticamente, con sangría francesa, según la guía de citas del Colegio Santa María Marianistas. Se prefiere el DOI sobre el URL simple cuando el artículo lo tiene.",
    },
  ],
};

build(cfg, "Planetas_errantes_CRAAP.pptx").then((f) => console.log("OK:", f));
