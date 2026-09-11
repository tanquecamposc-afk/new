const { build } = require("./lib");

const palette = {
  dark: "04303A",      // verde azulado profundo
  panel: "0B4E5C",
  light: "EFF8F7",
  panelLight: "DCEDEC",
  accent: "FF7FA4",    // rosa medusa
  second: "8AD9D0",
  muted: "79ADB3",
  mutedLight: "3C5A61",
};

const I = (t) => ({ text: t, options: { italic: true } });
const T = (t) => ({ text: t });

const refs = [
  [T("Blakeslee, S. (2004). The CRAAP test. "), I("LOEX Quarterly, 31"), T("(3), 6-7. https://commons.emich.edu/loexquarterly/vol31/iss3/4")],
  [T("Natural History Museum. (s. f.). "), I("Immortal jellyfish: the secret to cheating death"), T(". Recuperado el 11 de septiembre de 2026, de https://www.nhm.ac.uk/discover/immortal-jellyfish-secret-to-cheating-death.html")],
  [T("OpenAI. (2026). "), I("ChatGPT"), T(" (versión de septiembre de 2026) [modelo de lenguaje grande]. https://chat.openai.com/chat")],
  [T("Pascual-Torner, M., Carrero, D., Pérez-Silva, J. G., Álvarez-Puente, D., Roiz-Valle, D., Bretones, G., Rodríguez, D., Maeso, D., Mateo-González, E., Español, Y., Mariño, G., Acuña, J. L., Quesada, V. y López-Otín, C. (2022). Comparative genomics of mortal and immortal cnidarians unveils novel keys behind rejuvenation. "), I("PNAS, 119"), T("(36), e2118763119. https://doi.org/10.1073/pnas.2118763119")],
  [T("Piraino, S., Boero, F., Aeschbach, B. y Schmid, V. (1996). Reversing life cycle: medusae transforming into polyps and cell transdifferentiation in "), I("Turritopsis nutricula"), T(". "), I("The Biological Bulletin, 190"), T("(3), 302-312. https://doi.org/10.2307/1543022")],
];

const cfg = {
  title: "La inmortalidad biológica de Turritopsis dohrnii",
  shortTitle: "Turritopsis dohrnii · Método CRAAP",
  palette,
  slides: [
    {
      type: "cover",
      kicker: "Investigación en biología",
      title: "La medusa inmortal",
      subtitle: "Turritopsis dohrnii: el único animal capaz de rebobinar su propio ciclo de vida. Qué sabemos, qué se exagera y qué falta por demostrar.",
      meta: "Evaluación de fuentes con el método CRAAP  ·  Referencias en formato APA\nColegio Santa María Marianistas  ·  2026",
      notes: "Arrancar con el gancho: no es que no se muera, es que puede volver a ser bebé. Aclarar la diferencia desde el primer minuto.",
    },
    {
      type: "question",
      kicker: "Punto de partida",
      title: "La pregunta que guía el trabajo",
      big: "¿En qué sentido exacto es «inmortal» una medusa de 4,5 milímetros?",
      body: "Turritopsis dohrnii es el único metazoo conocido capaz de rejuvenecer una y otra vez después de haberse reproducido. La palabra «inmortal» aparece en titulares, en libros de divulgación y hasta en artículos científicos, pero significa cosas distintas en cada uno. Separar el fenómeno biológico real del titular es la mitad del trabajo.",
      listTitle: "Sub-preguntas",
      list: [
        "¿Qué ocurre a nivel celular durante la reversión del ciclo?",
        "¿Qué encontró la genómica comparada en 2022?",
        "¿Por qué «inmortal» no significa que no pueda morir?",
      ],
    },
    {
      type: "cards",
      kicker: "Metodología",
      title: "El método CRAAP: cinco filtros antes de citar",
      lead: "Creado por Sarah Blakeslee y el equipo de la Meriam Library (California State University, Chico). En un tema tan viralizado como este, el criterio de propósito es el que más fuentes descarta.",
      cols: 5,
      items: [
        { tag: "C", hi: true, head: "Currency", body: "Vigencia. La genómica del animal cambió por completo en 2022: una fuente anterior puede estar entera pero incompleta." },
        { tag: "R", head: "Relevance", body: "Pertinencia. ¿Habla de T. dohrnii o de «las medusas» en general? La confusión de especies es constante." },
        { tag: "A", head: "Authority", body: "Autoridad. ¿Firma un equipo de investigación, un museo de historia natural o una cuenta de divulgación anónima?" },
        { tag: "A", head: "Accuracy", body: "Exactitud. ¿Distingue entre inmortalidad biológica y no poder morir? Ahí se cae la mayoría del contenido viral." },
        { tag: "P", head: "Purpose", body: "Propósito. Un texto que promete «la cura de la vejez» busca clics, no informar. El titular delata la intención." },
      ],
    },
    {
      type: "cards",
      kicker: "Ficha de la especie",
      title: "Quién es Turritopsis dohrnii",
      cols: 4,
      items: [
        { tag: "01", hi: true, head: "Clasificación", body: "Hidrozoo de la familia Oceaniidae, filo Cnidaria. No es una medusa «verdadera» de la clase Scyphozoa, como la medusa común de playa." },
        { tag: "02", head: "Tamaño", body: "Unos 4,5 mm de ancho y de alto en su fase adulta: más pequeña que la uña del dedo meñique. Casi transparente, con el estómago rojo visible." },
        { tag: "03", head: "Distribución", body: "Originaria del Mediterráneo, hoy presente en aguas templadas de todo el mundo. Se ha dispersado en el agua de lastre de los barcos." },
        { tag: "04", head: "Descubrimiento", body: "Su capacidad se detectó por accidente en los años ochenta: los estudiantes Christian Sommer y Giorgio Bavestrello vieron medusas estresadas volver a fase de pólipo en un frasco." },
      ],
      notes: "El detalle del frasco funciona muy bien en exposición: un hallazgo mayor que salió de un experimento que salió mal.",
    },
    {
      type: "steps",
      kicker: "El fenómeno",
      title: "La reversión del ciclo de vida, paso a paso",
      lead: "Lo normal en un cnidario es pólipo → medusa → reproducción → muerte. T. dohrnii puede devolver la cinta.",
      items: [
        { head: "Estrés", body: "Hambre, cambios bruscos de temperatura, daño físico o simple envejecimiento disparan el proceso en la medusa adulta." },
        { head: "Contracción", body: "La medusa se deja caer al fondo, reabsorbe sus tentáculos y su campana, y se compacta en una masa celular llamada quiste." },
        { head: "Quiste", body: "Aquí ocurre la transdiferenciación: las células cambian de identidad. Es la fase donde se concentra la actividad génica del proceso." },
        { head: "Nuevo pólipo", body: "Del quiste brota un estolón que forma pólipos, y de ellos nacen medusas genéticamente idénticas. El ciclo vuelve a empezar." },
      ],
      note: "Importante: no es la misma medusa la que «resucita». Es su material celular el que se reorganiza y da origen a una colonia nueva.",
    },
    {
      type: "versus",
      kicker: "Concepto clave",
      title: "Transdiferenciación: qué es y qué no es",
      left: {
        tag: "✓", head: "Lo que sí ocurre",
        points: [
          "Una célula ya especializada cambia directamente a otro tipo celular distinto, sin volver a ser una célula madre indiferenciada.",
          "Células del músculo estriado de la campana pueden convertirse en células nerviosas, del cnidocilio o del epitelio del pólipo.",
          "Ocurre de forma masiva y coordinada, no en una o dos células sueltas.",
          "Piraino y su equipo lo documentaron y nombraron en 1996, en el trabajo que abrió toda esta línea de investigación.",
        ],
      },
      right: {
        tag: "✕", head: "Lo que no significa",
        points: [
          "No es regeneración: la medusa no repara lo dañado, desmonta su cuerpo adulto y construye otro distinto.",
          "No es clonación ni reproducción sexual: no hay fecundación ni fase larvaria de por medio.",
          "No es exclusivo de esta especie en términos absolutos, pero sí lo es hacerlo de forma repetida y después de reproducirse.",
          "No se ha logrado reproducir el mecanismo en células humanas. Es investigación básica, no una terapia.",
        ],
      },
    },
    {
      type: "cards",
      kicker: "Genómica comparada (2022)",
      title: "Qué encontró el estudio de PNAS",
      dark: true,
      lead: "Pascual-Torner y el equipo de Carlos López-Otín (Universidad de Oviedo) secuenciaron el genoma de T. dohrnii y lo compararon con el de su prima mortal, Turritopsis rubra.",
      cols: 2,
      items: [
        { tag: "01", hi: true, head: "Genes de reparación duplicados", body: "T. dohrnii tiene copias extra de genes de replicación y reparación del ADN. Se activan o se apagan según la fase del ciclo en la que esté el animal." },
        { tag: "02", head: "Mantenimiento de telómeros", body: "Variantes en los genes que protegen los extremos de los cromosomas, uno de los relojes moleculares clásicos del envejecimiento." },
        { tag: "03", head: "Control de transposones", body: "Silencia mejor los elementos genéticos móviles que desestabilizan el genoma con la edad. En la fase de quiste esa maquinaria se dispara." },
        { tag: "04", head: "Células madre y entorno redox", body: "Cambios en la población de células madre, en la comunicación entre células y en el manejo del estrés oxidativo." },
      ],
      notes: "El equipo aclara expresamente que no buscan la fuente de la eterna juventud, sino entender rutas de reparación celular. Conviene citarlo así.",
    },
    {
      type: "versus",
      kicker: "Precisión conceptual",
      title: "Inmortal no quiere decir invencible",
      left: {
        tag: "!", head: "Mitos que circulan",
        points: [
          "«No se muere nunca»: en el mar la comen otros animales, la matan infecciones y muere por daño físico como cualquier otro organismo.",
          "«Vive miles de años»: no hay ningún individuo con edad documentada. Lo observado ocurre en laboratorio y en escalas cortas.",
          "«Va a curar el envejecimiento humano»: entre un hidrozoo de 4,5 mm y un mamífero hay una distancia evolutiva enorme.",
          "«Todas las medusas lo hacen»: se confunde a menudo con T. nutricula y con otros hidrozoos.",
        ],
      },
      right: {
        tag: "=", head: "Lo que sí se puede afirmar",
        points: [
          "Es inmortalidad biológica: la probabilidad de morir no aumenta con la edad. No es invulnerabilidad.",
          "Es el único metazoo documentado que rejuvenece de forma repetida después de haberse reproducido.",
          "El mecanismo es la transdiferenciación celular concentrada en la fase de quiste.",
          "Su interés real para la ciencia está en las rutas de reparación del ADN y el control del genoma, no en una pastilla.",
        ],
      },
    },
    {
      type: "cards",
      kicker: "Corpus documental",
      title: "Las cuatro fuentes que se evaluaron",
      lead: "Un artículo fundacional, un artículo genómico reciente, un museo de historia natural y una herramienta de inteligencia artificial. La última se incluyó a propósito para mostrar sus límites.",
      cols: 4,
      items: [
        { tag: "F1", hi: true, head: "PNAS (2022)", body: "Pascual-Torner et al. Genómica comparada de un cnidario mortal y uno inmortal. Revisión de pares y DOI." },
        { tag: "F2", head: "Biological Bulletin (1996)", body: "Piraino et al. El trabajo que describió y nombró por primera vez la reversión del ciclo." },
        { tag: "F3", head: "Natural History Museum", body: "Página divulgativa del museo de Londres. Buena para contexto histórico y datos de la especie." },
        { tag: "F4", head: "ChatGPT (IA)", body: "Modelo de lenguaje consultado en la fase exploratoria. Se evalúa como fuente, no como autor." },
      ],
    },
    {
      type: "craap",
      source: "F1 · Pascual-Torner et al. (2022), PNAS",
      meta: "«Comparative genomics of mortal and immortal cnidarians unveils novel keys behind rejuvenation» · Artículo de revista científica en línea con DOI · https://doi.org/10.1073/pnas.2118763119",
      score: "5/5",
      verdict: "Fuente principal. Citable directamente.",
      rows: [
        "2022. Es el estudio genómico de referencia y el más reciente sobre el mecanismo molecular.",
        "Responde directamente a la sub-pregunta sobre qué explica el fenómeno a nivel genético.",
        "Equipo de la Universidad de Oviedo dirigido por Carlos López-Otín; PNAS, con revisión de pares.",
        "Compara dos especies hermanas, una mortal y otra inmortal, y publica los ensamblados de genoma.",
        "Investigación básica. Los propios autores advierten contra la lectura de «elixir de juventud».",
      ],
    },
    {
      type: "craap",
      source: "F2 · Piraino et al. (1996), The Biological Bulletin",
      meta: "«Reversing life cycle: medusae transforming into polyps and cell transdifferentiation in Turritopsis nutricula» · Artículo de revista científica con DOI",
      score: "4/5",
      verdict: "Fuente fundacional. Citable, con nota sobre la especie.",
      rows: [
        "1996. Antigua, pero es la descripción original del fenómeno: en ciencia, el trabajo fundacional no caduca.",
        "Explica el mecanismo celular, que es el núcleo de la segunda sub-pregunta del trabajo.",
        "Stefano Piraino y Ferdinando Boero, referentes en cnidarios; revista de la Marine Biological Laboratory.",
        "Observación experimental documentada. Ojo: usa el nombre T. nutricula, antes de que se separara T. dohrnii.",
        "Comunicar un hallazgo original a la comunidad científica. Sin intención divulgativa ni comercial.",
      ],
      notes: "El cambio de nombre de la especie es un buen ejemplo de por qué hay que leer la fuente completa y no solo el título.",
    },
    {
      type: "craap",
      source: "F3 · Natural History Museum (s. f.)",
      meta: "«Immortal jellyfish: the secret to cheating death» · Página divulgativa del Natural History Museum de Londres · Sitio web de actualización constante · Consultada el 11 de septiembre de 2026",
      score: "4/5",
      verdict: "Excelente apoyo divulgativo. No sustituye al artículo científico.",
      rows: [
        "Sin fecha visible de publicación; se actualiza de forma continua, por eso se anota la fecha de consulta.",
        "Aporta el contexto histórico del descubrimiento y datos concretos de la especie, a un nivel escolar ideal.",
        "Museo de historia natural con equipo científico propio; el texto está revisado internamente.",
        "Los datos coinciden con la literatura revisada por pares, pero el artículo no enlaza sus fuentes una por una.",
        "Divulgación científica de una institución pública. Sin interés comercial, aunque el título juega con «cheating death».",
      ],
    },
    {
      type: "craap",
      source: "F4 · ChatGPT, OpenAI (2026)",
      meta: "Modelo de lenguaje grande consultado en la fase exploratoria · Se cita como herramienta, nunca como autor · https://chat.openai.com/chat",
      score: "1.5/5",
      verdict: "Solo orientación inicial. No respalda ningún dato.",
      rows: [
        "La versión utilizada se indica en la referencia, pero no se sabe con qué datos ni hasta qué fecha fue entrenada.",
        "Ayuda a ordenar ideas y a encontrar por dónde empezar a buscar, no a sostener una afirmación.",
        "Una IA no es humana y nunca puede considerarse autora del contenido que entrega.",
        "Puede dar información falsa o inventada, incluidas referencias que no existen. Todo debe contrastarse.",
        "Producto comercial. Además existe riesgo de plagio, porque puede generar redacciones muy similares a otras (UCM, 2023).",
      ],
      notes: "Aclarar en clase: que se acepte la IA como referencia formal depende siempre del asesor o del docente.",
    },
    {
      type: "table",
      kicker: "Síntesis de la evaluación",
      title: "Las cuatro fuentes, criterio por criterio",
      rows: [
        { name: "F1 · Pascual-Torner et al. (2022), PNAS", marks: ["Alta", "Alta", "Alta", "Alta", "Alta"] },
        { name: "F2 · Piraino et al. (1996), Biological Bulletin", marks: ["Media", "Alta", "Alta", "Alta", "Alta"] },
        { name: "F3 · Natural History Museum", marks: ["Media", "Alta", "Alta", "Media", "Alta"] },
        { name: "F4 · ChatGPT (OpenAI, 2026)", marks: ["Baja", "Media", "Baja", "Baja", "Baja"] },
      ],
      note: "Decisión final: F1 y F2 sostienen todas las afirmaciones científicas; F3 aporta contexto histórico y datos de la especie; F4 se usó solo para orientarse al inicio y se declara aquí por transparencia, sin respaldar ningún dato de la exposición.",
    },
    {
      type: "closing",
      kicker: "Conclusiones",
      title: "Cuatro ideas para llevarse",
      items: [
        { head: "Inmortal biológicamente, no invulnerable", body: "Su probabilidad de morir no crece con la edad, pero la depredación, la infección y el daño físico la matan igual que a cualquier otro animal." },
        { head: "El mecanismo tiene nombre: transdiferenciación", body: "Células ya especializadas cambian de identidad de forma masiva durante la fase de quiste. Piraino y su equipo lo describieron en 1996." },
        { head: "La genómica de 2022 explicó el cómo", body: "Genes de reparación del ADN duplicados, mejor mantenimiento de telómeros y un control más estricto de los transposones frente a su prima mortal." },
        { head: "El titular viaja más rápido que el dato", body: "«La medusa que vive para siempre» es falso y aparece por todas partes. Aplicar CRAAP, y sobre todo el criterio de propósito, es lo que separa una cosa de la otra." },
      ],
    },
    {
      type: "refs",
      items: refs,
      step: 0.95,
      size: 11,
      note: "Referencias ordenadas alfabéticamente, con sangría francesa, según la guía de citas del Colegio Santa María Marianistas. La herramienta de IA se cita con el formato propio de la guía y se declara como consulta, no como autoría.",
    },
  ],
};

build(cfg, "Medusa_inmortal_CRAAP.pptx").then((f) => console.log("OK:", f));
