const { build } = require("./lib");

const palette = {
  dark: "8E0B26",      // rojo peruano
  panel: "A8203C",
  light: "FDF7F6",
  panelLight: "F3E4E3",
  accent: "E8B54C",    // dorado
  second: "F6CFCB",
  muted: "E7AFAD",
  mutedLight: "5A4241",
};

const I = (t) => ({ text: t, options: { italic: true } });
const T = (t) => ({ text: t });

const refs = [
  [T("Blakeslee, S. (2004). The CRAAP test. "), I("LOEX Quarterly, 31"), T("(3), 6-7. https://commons.emich.edu/loexquarterly/vol31/iss3/4")],
  [T("Congreso de la República del Perú. (2014). "), I("Ley N.° 30220, Ley Universitaria"), T(". Diario Oficial El Peruano. https://diariooficial.elperuano.pe/Normas/obtenerDocumento?idNorma=50")],
  [T("Congreso de la República del Perú. (2016). "), I("Ley N.° 30476, Ley que regula los Programas Deportivos de Alta Competencia en las universidades"), T(". https://www.leyes.congreso.gob.pe/Documentos/Leyes/30476.pdf")],
  [T("Pontificia Universidad Católica del Perú. (s. f.). "), I("Beca para Deportistas Destacados (BECAD)"), T(". PUCP. Recuperado el 11 de septiembre de 2026, de https://www.pucp.edu.pe/beca/deporte/")],
  [T("Universidad Peruana de Ciencias Aplicadas. (s. f.). "), I("Deportistas calificados"), T(". Deportes UPC. Recuperado el 11 de septiembre de 2026, de https://www.upc.edu.pe/servicios/vida-universitaria/deportes-upc/deportistas-calificados/")],
];

const cfg = {
  title: "Beneficios para las universidades de representar a la selección peruana",
  shortTitle: "Universidades y selección peruana · Método CRAAP",
  palette,
  slides: [
    {
      type: "cover",
      kicker: "Investigación · Deporte y educación superior",
      title: "Universidades y selección peruana",
      subtitle: "¿Le conviene a una universidad tener estudiantes que representan al Perú? La respuesta corta es sí, pero con condiciones.",
      meta: "Evaluación de fuentes con el método CRAAP  ·  Referencias en formato APA\nColegio Santa María Marianistas  ·  2026",
      notes: "Dejar claro desde el inicio que es un trabajo argumentativo: hay una postura y hay que defenderla con evidencia normativa y datos.",
    },
    {
      type: "question",
      kicker: "Punto de partida",
      title: "La pregunta y nuestra postura",
      big: "¿Le conviene de verdad a una universidad peruana tener estudiantes en la selección nacional?",
      body: "Postura: sí los hay, y son de tres tipos, normativos, reputacionales y de vida universitaria. Pero no aparecen solos. Solo se concretan cuando la universidad sostiene un programa deportivo real, con tutoría académica y flexibilidad curricular, y no una beca suelta con foto para redes sociales.",
      listTitle: "Sub-preguntas",
      list: [
        "¿Qué obliga la ley peruana a hacer a las universidades?",
        "¿Qué gana efectivamente la institución?",
        "¿Cuánto cuesta y en qué casos no compensa?",
      ],
    },
    {
      type: "cards",
      kicker: "Metodología",
      title: "El método CRAAP: cinco filtros antes de citar",
      lead: "Creado por Sarah Blakeslee y el equipo de la Meriam Library (California State University, Chico). En este tema casi todas las fuentes disponibles son de las propias universidades, así que el criterio de propósito pesa más que en un trabajo de ciencias.",
      cols: 5,
      items: [
        { tag: "C", hi: true, head: "Currency", body: "Vigencia. ¿La norma citada sigue en vigor? ¿La página de becas corresponde al proceso de admisión actual?" },
        { tag: "R", head: "Relevance", body: "Pertinencia. ¿Habla del beneficio para la universidad o solo del beneficio para el deportista? No es lo mismo." },
        { tag: "A", head: "Authority", body: "Autoridad. ¿Es el texto legal publicado por el Congreso o el resumen de un blog sin firma?" },
        { tag: "A", head: "Accuracy", body: "Exactitud. ¿Da cifras concretas y verificables o solo adjetivos como «gran apoyo» y «excelencia»?" },
        { tag: "P", head: "Purpose", body: "Propósito. Una página de admisión busca matrículas. Puede ser cierta y a la vez estar escrita para vender." },
      ],
    },
    {
      type: "steps",
      kicker: "Marco normativo",
      title: "Lo que manda la ley peruana",
      lead: "En el Perú esto no es una decisión libre de cada casa de estudios: hay una obligación legal detrás.",
      items: [
        { head: "Ley 30220 (2014)", body: "La Ley Universitaria establece en su artículo 131 que la universidad promueve la práctica del deporte y la recreación como factores educativos de la formación de la persona." },
        { head: "Art. 131: PRODAC", body: "Obliga a crear Programas Deportivos de Alta Competencia con un mínimo de tres disciplinas olímpicas, en categoría femenina y masculina." },
        { head: "Ley 30476 (2016)", body: "Regula en detalle el PRODAC: tipos de beca, dirección técnica, infraestructura, equipamiento y sistema de tutoría académica obligatorio." },
        { head: "Consecuencia", body: "Tener deportistas de alto nivel deja de ser un gasto opcional y pasa a formar parte de lo que la universidad debe acreditar." },
      ],
      note: "Este es el argumento más fuerte de todo el trabajo: no es solo que convenga, es que la ley lo exige y el deportista de selección es quien da contenido real a ese programa.",
      notes: "Si preguntan por la fuente, citar el artículo 131 de la Ley 30220 y la Ley 30476 completa, ambas publicadas por el Congreso.",
    },
    {
      type: "cards",
      kicker: "Ley 30476",
      title: "Qué exige exactamente el PRODAC",
      cols: 4,
      items: [
        { tag: "01", hi: true, head: "Mínimo tres disciplinas", body: "La universidad debe mantener el programa en al menos tres disciplinas deportivas, en sus distintas categorías, para mujeres y para hombres." },
        { tag: "02", head: "Tres tipos de beca", body: "Beca parcial (cubre el 50 % de matrícula y pensión), beca total y beca total especial. Cada universidad debe incluir un mínimo de estudiantes becados por disciplina." },
        { tag: "03", head: "Tutoría obligatoria", body: "Todo becado va acompañado de un sistema de tutoría que garantice su rendimiento académico. La beca sin tutoría no cumple la norma." },
        { tag: "04", head: "Derechos del estudiante", body: "Matricularse en menos créditos sin perder la condición de alumno regular, justificar inasistencias por entrenamiento o competencia y reprogramar evaluaciones." },
      ],
    },
    {
      type: "cards",
      kicker: "El sí",
      title: "Qué gana la universidad",
      dark: true,
      cols: 3,
      items: [
        { tag: "01", hi: true, head: "Visibilidad de marca", body: "Cada transmisión, nota de prensa o medalla asocia el nombre de la institución a un logro nacional. Es publicidad con una credibilidad que un aviso pagado no compra." },
        { tag: "02", head: "Cumplimiento normativo", body: "Los deportistas de selección son el sustento real del PRODAC que la Ley 30220 y la Ley 30476 exigen acreditar. Sin ellos, el programa existe solo en el papel." },
        { tag: "03", head: "Captación de postulantes", body: "Las universidades usan el deporte como argumento de admisión. Un deportista conocido en el campus atrae a otros y diferencia la oferta frente a la competencia." },
        { tag: "04", head: "Vida universitaria", body: "Selecciones activas, torneos y competencias internas mejoran el clima institucional y el sentido de pertenencia de toda la comunidad, no solo de los becados." },
        { tag: "05", head: "Red de convenios", body: "Da acceso a federaciones, al IPD y a competencias internacionales, y abre convenios de intercambio y de investigación en ciencias del deporte." },
        { tag: "06", head: "Retención y egreso", body: "Un buen sistema de tutoría no solo protege al deportista: suele terminar aplicándose al resto de estudiantes con carga académica atípica." },
      ],
    },
    {
      type: "stats",
      kicker: "Evidencia disponible",
      title: "Los números que se pueden verificar",
      lead: "Las tres cifras provienen de páginas institucionales de las propias universidades. Por eso hay que leerlas con el criterio de propósito puesto.",
      items: [
        { value: "+200", label: "Deportistas calificados que representan al Perú y estudian en la Universidad Peruana de Ciencias Aplicadas, según su propia página de Deportes UPC." },
        { value: "50 %", label: "Cobertura mínima de matrícula y pensión que la Ley 30476 fija para la beca parcial del PRODAC. La beca total cubre el íntegro." },
        { value: "100 %", label: "Beca que varias universidades ofrecen al Deportista Calificado de Alto Nivel (DECAN), la categoría en la que suelen entrar los seleccionados nacionales." },
      ],
      note: "Ninguna universidad publica cuánto le retorna esa inversión en matrículas nuevas o en valor de marca. Ese vacío es, en sí mismo, un hallazgo del trabajo.",
    },
    {
      type: "versus",
      kicker: "El otro lado",
      title: "Costos, riesgos y el «no» que también existe",
      left: {
        tag: "$", head: "Lo que cuesta",
        points: [
          "Becas totales y parciales que la universidad financia con recursos propios, sin subsidio estatal directo.",
          "Infraestructura, equipamiento, dirección técnica y personal de apoyo acordes al nivel de alta competencia.",
          "Horas de tutoría y de reprogramación de evaluaciones, que recaen sobre los docentes.",
          "Gestión administrativa de viajes, concentraciones y ausencias prolongadas durante el ciclo lectivo.",
        ],
      },
      right: {
        tag: "!", head: "Cuándo no compensa",
        points: [
          "Cuando el deportista no llega a competir o a destacar: el gasto se ejecuta igual y el retorno de imagen no aparece.",
          "Cuando la universidad beca pero no acompaña: el estudiante abandona o alarga su carrera y el resultado es una mala historia, no una buena.",
          "Cuando la visibilidad depende de un solo nombre: si ese deportista se retira o cambia de casa de estudios, el programa se queda sin relato.",
          "Cuando el programa se arma solo para la foto: incumple la finalidad formativa del artículo 131 y no sostiene el licenciamiento.",
        ],
      },
      notes: "Este es el contraargumento. Sostenerlo con honestidad es lo que hace que la conclusión no suene a propaganda.",
    },
    {
      type: "cards",
      kicker: "Corpus documental",
      title: "Las cuatro fuentes que se evaluaron",
      lead: "Dos normas legales publicadas por el Congreso y dos páginas institucionales de universidades privadas. La comparación entre unas y otras es parte del ejercicio.",
      cols: 4,
      items: [
        { tag: "F1", hi: true, head: "Ley 30220 (2014)", body: "Ley Universitaria. El artículo 131 es la base normativa de todo el trabajo." },
        { tag: "F2", hi: true, head: "Ley 30476 (2016)", body: "Regula el PRODAC en detalle: becas, tutoría, disciplinas mínimas y derechos del estudiante." },
        { tag: "F3", head: "Deportes UPC", body: "Página institucional con la cifra de deportistas calificados y la descripción de su programa de apoyo." },
        { tag: "F4", head: "BECAD – PUCP", body: "Página de la Beca para Deportistas Destacados. Describe requisitos y coberturas." },
      ],
    },
    {
      type: "craap",
      source: "F1 · Ley N.° 30220, Ley Universitaria (2014)",
      meta: "Congreso de la República del Perú · Publicada en el Diario Oficial El Peruano · Artículo 131, sobre deporte universitario · Informe / norma gubernamental",
      score: "5/5",
      verdict: "Fuente normativa principal. Citable directamente.",
      rows: [
        "2014, con modificaciones posteriores. Sigue vigente y es la norma marco del sistema universitario peruano.",
        "El artículo 131 responde de lleno a la sub-pregunta sobre qué obliga la ley a hacer a las universidades.",
        "Emitida por el Congreso de la República y publicada en el diario oficial. Máxima autoridad posible en la materia.",
        "Texto legal literal y verificable. Conviene siempre consultar la versión actualizada, no una copia en un blog.",
        "Regular el sistema universitario. No tiene intención persuasiva ni comercial de ningún tipo.",
      ],
    },
    {
      type: "craap",
      source: "F2 · Ley N.° 30476, PRODAC (2016)",
      meta: "Congreso de la República del Perú · Vigente desde el 30 de junio de 2016 · Regula los Programas Deportivos de Alta Competencia en las universidades",
      score: "5/5",
      verdict: "Fuente normativa principal. Citable directamente.",
      rows: [
        "2016. Es la reglamentación específica del artículo 131 y continúa vigente.",
        "Aporta el detalle operativo: tipos de beca, tutoría, disciplinas mínimas y derechos concretos del estudiante.",
        "Congreso de la República. Publicada también en el portal de normas legales de El Peruano.",
        "Establece porcentajes y mínimos exactos, no formulaciones vagas. Se puede contrastar con el texto original en PDF.",
        "Regular una obligación institucional. Sin interés promocional de ninguna universidad en particular.",
      ],
    },
    {
      type: "craap",
      source: "F3 · Deportes UPC, «Deportistas calificados» (s. f.)",
      meta: "Universidad Peruana de Ciencias Aplicadas · Página institucional del área de Vida Universitaria · Sitio web de actualización constante · Consultada el 11 de septiembre de 2026",
      score: "3/5",
      verdict: "Útil como dato de caso. Requiere contraste.",
      rows: [
        "Sin fecha de publicación visible. Se actualiza con cada proceso de admisión, por eso se anota la fecha de consulta.",
        "Da un caso concreto peruano con cifra incluida, que es justo lo que falta en las fuentes normativas.",
        "La propia universidad. Es autoridad sobre sus datos internos, pero es parte interesada en el tema.",
        "La cifra de más de 200 deportistas calificados no está respaldada por un informe público ni auditada externamente.",
        "Captar postulantes. El dato puede ser cierto y estar, aun así, redactado para convencer. Ese es el punto del criterio.",
      ],
      notes: "Aquí conviene detenerse: una fuente puede ser verdadera y a la vez interesada. CRAAP no la descarta, la ubica.",
    },
    {
      type: "craap",
      source: "F4 · BECAD, PUCP (s. f.)",
      meta: "Pontificia Universidad Católica del Perú · Página de la Beca para Deportistas Destacados · Sitio web de actualización constante · Consultada el 11 de septiembre de 2026",
      score: "3/5",
      verdict: "Válida para comparar modelos de beca. Parte interesada.",
      rows: [
        "Sin fecha visible; corresponde al proceso de admisión vigente al momento de la consulta.",
        "Permite comparar cómo aplica una universidad distinta el mismo marco legal. Aporta contraste, no evidencia de impacto.",
        "Universidad con prestigio académico reconocido, pero informando sobre su propio programa.",
        "Describe requisitos y coberturas de forma clara; no publica número de becados ni resultados del programa.",
        "Promocional y de admisión. Igual que F3, sirve como ejemplo documentado, no como prueba del beneficio institucional.",
      ],
    },
    {
      type: "table",
      kicker: "Síntesis de la evaluación",
      title: "Las cuatro fuentes, criterio por criterio",
      rows: [
        { name: "F1 · Ley N.° 30220 (2014), art. 131", marks: ["Alta", "Alta", "Alta", "Alta", "Alta"] },
        { name: "F2 · Ley N.° 30476 (2016), PRODAC", marks: ["Alta", "Alta", "Alta", "Alta", "Alta"] },
        { name: "F3 · Deportes UPC, «Deportistas calificados»", marks: ["Media", "Alta", "Media", "Baja", "Baja"] },
        { name: "F4 · BECAD, PUCP", marks: ["Media", "Media", "Media", "Media", "Baja"] },
      ],
      note: "Decisión final: el argumento se sostiene sobre F1 y F2, que son normas vigentes y verificables. F3 y F4 se citan solo como ejemplos de aplicación, siempre indicando que son las propias universidades quienes hablan de sí mismas.",
    },
    {
      type: "closing",
      kicker: "Conclusiones",
      title: "Respuesta a la pregunta: sí, con condiciones",
      items: [
        { head: "Sí hay beneficio, y empieza por la ley", body: "La Ley 30220 y la Ley 30476 obligan a sostener un PRODAC. Los deportistas de selección son quienes convierten ese requisito en un programa real y acreditable." },
        { head: "El retorno de imagen es real pero no se mide", body: "Ninguna universidad peruana publica cuánto le retorna en matrículas o en valor de marca. Se afirma en todas partes y no se demuestra en ninguna." },
        { head: "La beca sin tutoría no sirve a nadie", body: "La propia ley exige acompañamiento académico. Sin él, el estudiante abandona o alarga la carrera y la universidad pierde la inversión y el relato." },
        { head: "La respuesta honesta es condicionada", body: "Conviene cuando existe programa, tutoría y continuidad. No conviene cuando todo se reduce a una beca aislada y una publicación en redes." },
      ],
    },
    {
      type: "refs",
      items: refs,
      step: 0.9,
      size: 11,
      note: "Referencias ordenadas alfabéticamente, con sangría francesa, según la guía de citas del Colegio Santa María Marianistas. Las normas legales se citan con el formato de informe gubernamental y las páginas de universidades con el de sitio web de actualización constante.",
    },
  ],
};

build(cfg, "Universidades_seleccion_peruana_CRAAP.pptx").then((f) => console.log("OK:", f));
