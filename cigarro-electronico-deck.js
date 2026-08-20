const path = require("path");
const pptxgen = require("pptxgenjs");
const sharp = require("sharp");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const Fa = require("react-icons/fa6");

// ---------- paleta ----------
const INK = "0E2A33";      // petróleo profundo
const INK2 = "17414E";     // petróleo medio
const TEAL = "2FBFA8";     // vapor
const TEAL_DK = "17796B";
const CORAL = "FF6B4A";    // alerta
const WHITE = "FFFFFF";
const MIST = "EDF5F6";     // tarjeta clara
const MIST2 = "F7FBFB";
const TEXT = "16292F";
const MUTED = "5E757D";
const LIGHT_ON_DARK = "C6DDE1";

const HEAD = "Arial";
const BODY = "Calibri";

const W = 10, H = 5.625;

// ---------- iconos ----------
const iconCache = {};
async function icon(name, hex, size = 256) {
  const key = name + hex + size;
  if (iconCache[key]) return iconCache[key];
  const Comp = Fa[name];
  if (!Comp) throw new Error("icono inexistente: " + name);
  let svg = ReactDOMServer.renderToStaticMarkup(
    React.createElement(Comp, { size: size })
  );
  svg = svg.split("currentColor").join("#" + hex);
  const buf = await sharp(Buffer.from(svg), { density: 400 })
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const data = "image/png;base64," + buf.toString("base64");
  iconCache[key] = data;
  return data;
}

// ---------- helpers ----------
function shadow() {
  return { type: "outer", color: "0E2A33", opacity: 0.13, blur: 10, offset: 2, angle: 90 };
}

async function iconBadge(slide, opts) {
  // círculo relleno + icono centrado
  const { x, y, d, fill, iconName, iconColor, iconScale = 0.52 } = opts;
  slide.addShape("ellipse", { x, y, w: d, h: d, fill: { color: fill } });
  const s = d * iconScale;
  slide.addImage({
    data: await icon(iconName, iconColor),
    x: x + (d - s) / 2,
    y: y + (d - s) / 2,
    w: s,
    h: s,
  });
}

function card(slide, x, y, w, h, fill, opts = {}) {
  const o = {
    x, y, w, h,
    fill: { color: fill },
    rectRadius: 0.12,
    shadow: shadow(),
  };
  if (opts.line) o.line = { color: opts.line, width: opts.lineWidth || 1.25 };
  slide.addShape("roundRect", o);
}

// ---------- contenido ----------
const FUENTES = [
  {
    n: "01",
    tipo: "COMUNICADO INSTITUCIONAL · OMS",
    icono: "FaEarthAmericas",
    titulo: "Hay que actuar con urgencia para evitar que los niños y los jóvenes consuman cigarrillos electrónicos",
    craap: [
      ["C", "Diciembre de 2023: es la postura vigente de la OMS."],
      ["R", "Va directo a nuestra primera pregunta: adolescentes y vapeo."],
      ["A", "Organización Mundial de la Salud, la máxima autoridad sanitaria."],
      ["A", "Cifras verificables: 34 países prohíben la venta y 88 no fijan edad mínima."],
      ["P", "Informa y empuja regulación; no vende ningún producto."],
    ],
    veredicto: "PASA EL FILTRO",
    cita: "(Organización Mundial de la Salud [OMS], 2023)",
  },
  {
    n: "02",
    tipo: "COMUNICADO DE PRENSA · CDC (EE. UU.)",
    icono: "FaChartLine",
    titulo: "Youth e-cigarette use drops to lowest level in a decade",
    craap: [
      ["C", "Septiembre de 2024, con datos recogidos ese mismo año."],
      ["R", "Muestra la tendencia real en escolares, no una impresión."],
      ["A", "CDC y FDA, las agencias federales de salud de EE. UU."],
      ["A", "Publica la encuesta completa, con muestra y metodología."],
      ["P", "Difundir datos oficiales de vigilancia epidemiológica."],
    ],
    veredicto: "PASA EL FILTRO",
    cita: "(Centers for Disease Control and Prevention [CDC], 2024)",
  },
  {
    n: "03",
    tipo: "REVISIÓN SISTEMÁTICA · COCHRANE",
    icono: "FaFlask",
    titulo: "Electronic cigarettes for smoking cessation",
    craap: [
      ["C", "Enero de 2025. Es una revisión viva: se actualiza cada cierto tiempo."],
      ["R", "Contesta nuestra segunda pregunta casi palabra por palabra."],
      ["A", "Cochrane, referencia mundial en revisión de evidencia médica."],
      ["A", "Compara decenas de ensayos clínicos y califica la certeza de cada resultado."],
      ["P", "Sintetizar evidencia. No acepta plata de la industria del tabaco."],
    ],
    veredicto: "PASA EL FILTRO",
    cita: "(Lindson et al., 2025)",
  },
  {
    n: "04",
    tipo: "ARTÍCULO EN REVISTA ARBITRADA · PERÚ",
    icono: "FaFileLines",
    titulo: "El cigarrillo electrónico: un problema de salud pública emergente",
    craap: [
      ["C", "2020: la más antigua de las cinco, por eso la cruzamos con datos nuevos."],
      ["R", "Aterriza el tema en el Perú y en población adolescente."],
      ["A", "Neumólogos del Hospital Cayetano Heredia; revista del INS peruano."],
      ["A", "Revisada por pares, con bibliografía completa y mecanismos explicados."],
      ["P", "Académico y de acceso abierto, sin patrocinio comercial."],
    ],
    veredicto: "PASA, CON NOTA EN ACTUALIDAD",
    cita: "(Accinelli et al., 2020)",
  },
  {
    n: "05",
    tipo: "NORMA LEGAL · CONGRESO DEL PERÚ",
    icono: "FaGavel",
    titulo: "Ley N.° 32159, del control del consumo de productos de tabaco, nicotina o sucedáneos",
    craap: [
      ["C", "Publicada el 12 de noviembre de 2024 y en vigencia."],
      ["R", "Define qué se puede y qué no en colegios y espacios públicos."],
      ["A", "Congreso de la República; texto oficial en El Peruano."],
      ["A", "Es fuente primaria: el articulado tal cual, sin intermediarios."],
      ["P", "Regular la venta y el consumo. Cero intención comercial."],
    ],
    veredicto: "PASA EL FILTRO",
    cita: "(Ley N.° 32159, 2024)",
  },
];

const DESCARTADA = {
  n: "X",
  tipo: "BLOG DE UNA TIENDA DE VAPEADORES",
  icono: "FaTriangleExclamation",
  titulo: "«Guía rápida: por qué vapear es 95 % más seguro que fumar»",
  craap: [
    ["C", "Sin fecha por ningún lado."],
    ["R", "Habla del tema, pero solo del lado que le conviene."],
    ["A", "Sin autor, sin credenciales, sin institución detrás."],
    ["A", "Suelta un «95 % más seguro» y no enlaza el estudio original."],
    ["P", "Vender. El botón de compra está al costado del texto."],
  ],
  veredicto: "DESCARTADA · FALLA EN A Y EN P",
  cita: "No la citamos en ninguna parte del trabajo.",
};

// ---------- tarjeta de fuente ----------
async function fuenteCard(slide, f, x, mal = false) {
  const y = 1.02, w = 4.45, h = 3.86;
  const pad = 0.24;
  const acc = mal ? CORAL : TEAL_DK;

  card(slide, x, y, w, h, mal ? "FFF3F0" : MIST2, { line: mal ? "FFC9BC" : "D5E6E8" });

  await iconBadge(slide, {
    x: x + pad, y: y + 0.22, d: 0.42,
    fill: mal ? CORAL : TEAL,
    iconName: f.icono,
    iconColor: mal ? "FFFFFF" : "0E2A33",
    iconScale: 0.54,
  });

  slide.addText(f.tipo, {
    x: x + pad + 0.54, y: y + 0.22, w: w - pad * 2 - 1.0, h: 0.42,
    fontFace: HEAD, fontSize: 8.5, bold: true, color: acc,
    charSpacing: 0.8, valign: "middle", margin: 0,
  });

  slide.addText(f.n, {
    x: x + w - pad - 0.62, y: y + 0.18, w: 0.62, h: 0.42,
    fontFace: HEAD, fontSize: 20, bold: true,
    color: mal ? "F0A38F" : "BBD8D8", align: "right", valign: "middle", margin: 0,
  });

  slide.addText(f.titulo, {
    x: x + pad, y: y + 0.68, w: w - pad * 2, h: 0.70,
    fontFace: HEAD, fontSize: 12, bold: true, color: TEXT,
    lineSpacingMultiple: 0.92, valign: "top", margin: 0,
  });

  const items = f.craap.map(([letra, txt], i) => [
    { text: letra + "  ", options: { bold: true, color: acc, fontFace: HEAD, fontSize: 9.5 } },
    {
      text: txt,
      options: {
        color: mal ? "6B4438" : "3E5A62", fontFace: BODY, fontSize: 9.5,
        breakLine: i < f.craap.length - 1,
      },
    },
  ]).flat();

  slide.addText(items, {
    x: x + pad, y: y + 1.42, w: w - pad * 2, h: 1.72,
    valign: "top", margin: 0, paraSpaceAfter: 5, lineSpacingMultiple: 0.95,
  });

  slide.addShape("roundRect", {
    x: x + pad, y: y + 3.20, w: w - pad * 2, h: 0.32,
    fill: { color: mal ? CORAL : TEAL_DK }, rectRadius: 0.06,
  });
  slide.addText(f.veredicto, {
    x: x + pad, y: y + 3.20, w: w - pad * 2, h: 0.32,
    fontFace: HEAD, fontSize: 9, bold: true, color: WHITE,
    align: "center", valign: "middle", charSpacing: 0.6, margin: 0,
  });

  slide.addText(f.cita, {
    x: x + pad, y: y + 3.54, w: w - pad * 2, h: 0.30,
    fontFace: BODY, fontSize: 10, italic: true,
    color: mal ? "9A5A48" : INK2, valign: "middle", margin: 0,
  });
}

function tituloSlide(slide, texto, sub, dark = false) {
  slide.addText(texto, {
    x: 0.45, y: 0.30, w: 9.1, h: 0.52,
    fontFace: HEAD, fontSize: 27, bold: true,
    color: dark ? WHITE : INK, valign: "middle", margin: 0,
  });
  if (sub) {
    slide.addText(sub, {
      x: 0.45, y: 0.78, w: 9.1, h: 0.28,
      fontFace: BODY, fontSize: 12,
      color: dark ? LIGHT_ON_DARK : MUTED, valign: "middle", margin: 0,
    });
  }
}

// ---------- deck ----------
async function build() {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9";
  pres.author = "Proyecto Personal";
  pres.title = "Cigarro electrónico: 5 fuentes puestas a prueba";

  // ===== 1. PORTADA =====
  {
    const s = pres.addSlide();
    s.background = { color: INK };

    // motivo: círculos de vapor
    s.addShape("ellipse", { x: 7.05, y: 0.55, w: 3.5, h: 3.5, fill: { color: TEAL, transparency: 90 } });
    s.addShape("ellipse", { x: 7.75, y: 1.25, w: 2.1, h: 2.1, fill: { color: TEAL, transparency: 84 } });
    s.addShape("ellipse", { x: 8.32, y: 1.82, w: 0.96, h: 0.96, fill: { color: TEAL, transparency: 66 } });
    s.addShape("ellipse", { x: -0.55, y: 4.50, w: 1.85, h: 1.85, fill: { color: TEAL, transparency: 92 } });

    s.addShape("roundRect", { x: 0.62, y: 0.62, w: 3.42, h: 0.34, fill: { color: INK2 }, rectRadius: 0.17 });
    s.addText("PROYECTO PERSONAL · OBJETIVO C", {
      x: 0.62, y: 0.62, w: 3.42, h: 0.34,
      fontFace: HEAD, fontSize: 9.5, bold: true, color: TEAL,
      align: "center", valign: "middle", charSpacing: 1.2, margin: 0,
    });

    s.addText("Cigarro electrónico:\n5 fuentes puestas a prueba", {
      x: 0.62, y: 1.10, w: 6.35, h: 1.80,
      fontFace: HEAD, fontSize: 35, bold: true, color: WHITE,
      lineSpacingMultiple: 0.94, valign: "top", margin: 0,
    });

    s.addText(
      "Buscamos, pasamos cada fuente por el filtro CRAAP y armamos la cita y la referencia en APA 7.",
      {
        x: 0.62, y: 2.62, w: 5.9, h: 0.72,
        fontFace: BODY, fontSize: 14.5, color: LIGHT_ON_DARK,
        lineSpacingMultiple: 1.05, valign: "top", margin: 0,
      }
    );

    s.addShape("roundRect", { x: 0.62, y: 4.35, w: 5.5, h: 0.56, fill: { color: INK2 }, rectRadius: 0.1 });
    s.addText(
      [
        { text: "Integrantes:  ", options: { bold: true, color: TEAL, fontFace: HEAD, fontSize: 11 } },
        { text: "________________________________", options: { color: LIGHT_ON_DARK, fontFace: BODY, fontSize: 11 } },
      ],
      { x: 0.86, y: 4.35, w: 5.1, h: 0.56, valign: "middle", margin: 0 }
    );
    s.addText("Bitácora de investigación", {
      x: 6.35, y: 4.35, w: 3.0, h: 0.56,
      fontFace: BODY, fontSize: 11, color: "7FA3AB", align: "right", valign: "middle", margin: 0,
    });

    s.addNotes(
      "Presentamos el tema y el método: cinco fuentes, cada una filtrada con CRAAP y citada en APA 7. " +
      "Completar la línea de integrantes antes de exponer."
    );
  }

  // ===== 2. POR QUÉ EL VAPEO =====
  {
    const s = pres.addSlide();
    s.background = { color: WHITE };
    tituloSlide(s, "Por qué elegimos el vapeo", "El tema y las dos preguntas que queríamos responder.");

    s.addText(
      "Lo elegimos porque se ve en el colegio todas las semanas y casi nadie sabe qué está inhalando. " +
      "El otro problema era la información: buena parte de lo que aparece en redes o en las webs del rubro " +
      "la escribe alguien que gana dinero si tú compras.",
      {
        x: 0.45, y: 1.30, w: 5.05, h: 1.0,
        fontFace: BODY, fontSize: 12.5, color: "3E5A62",
        lineSpacingMultiple: 1.06, valign: "top", margin: 0,
      }
    );

    const preguntas = [
      "¿Qué le hace el vapeo al cuerpo de alguien de nuestra edad?",
      "¿De verdad sirve para dejar de fumar o solo cambia una adicción por otra?",
    ];
    for (let i = 0; i < preguntas.length; i++) {
      const y = 2.52 + i * 1.20;
      card(s, 0.45, y, 5.05, 1.02, MIST);
      await iconBadge(s, {
        x: 0.70, y: y + 0.28, d: 0.46, fill: TEAL,
        iconName: "FaCircleQuestion", iconColor: "0E2A33", iconScale: 0.56,
      });
      s.addText(preguntas[i], {
        x: 1.32, y: y + 0.14, w: 3.95, h: 0.74,
        fontFace: HEAD, fontSize: 12, bold: true, color: INK,
        valign: "middle", lineSpacingMultiple: 0.95, margin: 0,
      });
    }

    const stats = [
      {
        big: "13 a 15",
        sub: "años. En todas las regiones de la OMS ese grupo vapea más que los adultos.",
        cita: "(OMS, 2023)",
      },
      {
        big: "1,63 M",
        sub: "de escolares vapeaban en EE. UU. en 2024. En 2019 pasaban de 5 millones.",
        cita: "(CDC, 2024)",
      },
    ];
    for (let i = 0; i < stats.length; i++) {
      const y = 1.30 + i * 2.02;
      card(s, 5.80, y, 3.75, 1.86, INK);
      s.addText(stats[i].big, {
        x: 6.04, y: y + 0.16, w: 3.27, h: 0.66,
        fontFace: HEAD, fontSize: 34, bold: true, color: TEAL,
        valign: "middle", margin: 0,
      });
      s.addText(stats[i].sub, {
        x: 6.04, y: y + 0.84, w: 3.27, h: 0.62,
        fontFace: BODY, fontSize: 11.5, color: LIGHT_ON_DARK,
        lineSpacingMultiple: 1.0, valign: "top", margin: 0,
      });
      s.addText(stats[i].cita, {
        x: 6.04, y: y + 1.46, w: 3.27, h: 0.28,
        fontFace: BODY, fontSize: 10, italic: true, color: "7FA3AB",
        valign: "middle", margin: 0,
      });
    }

    s.addNotes(
      "Justificamos la elección del tema y planteamos las dos preguntas de indagación. " +
      "Las dos cifras de la derecha ya vienen citadas: así se ve que la cita va pegada al dato."
    );
  }

  // ===== 3. EL FILTRO CRAAP =====
  {
    const s = pres.addSlide();
    s.background = { color: INK };
    tituloSlide(s, "Cinco preguntas antes de citar nada", "El filtro CRAAP aplicado a cada resultado de la búsqueda.", true);

    const crit = [
      ["C", "Actualidad", "¿De cuándo es? ¿El dato sigue vigente?", "FaRegClock"],
      ["R", "Relevancia", "¿Responde a nuestras preguntas o es relleno?", "FaBullseye"],
      ["A", "Autoridad", "¿Quién firma y con qué credenciales?", "FaIdBadge"],
      ["A", "Exactitud", "¿Muestra evidencia que podamos verificar?", "FaMicroscope"],
      ["P", "Propósito", "¿Informa, enseña o quiere venderme algo?", "FaBullhorn"],
    ];
    for (let i = 0; i < crit.length; i++) {
      const x = 0.40 + i * 1.87;
      card(s, x, 1.42, 1.72, 2.55, INK2, { line: "27596A" });
      await iconBadge(s, {
        x: x + 0.63, y: 1.80, d: 0.46, fill: TEAL,
        iconName: crit[i][3], iconColor: "0E2A33", iconScale: 0.55,
      });
      s.addText(crit[i][0], {
        x: x + 0.14, y: 2.40, w: 1.44, h: 0.34,
        fontFace: HEAD, fontSize: 20, bold: true, color: TEAL,
        align: "center", valign: "middle", margin: 0,
      });
      s.addText(crit[i][1], {
        x: x + 0.10, y: 2.74, w: 1.52, h: 0.28,
        fontFace: HEAD, fontSize: 11.5, bold: true, color: WHITE,
        align: "center", valign: "middle", margin: 0,
      });
      s.addText(crit[i][2], {
        x: x + 0.14, y: 3.06, w: 1.44, h: 0.84,
        fontFace: BODY, fontSize: 9.5, color: LIGHT_ON_DARK,
        align: "center", valign: "top", lineSpacingMultiple: 1.0, margin: 0,
      });
    }

    card(s, 0.40, 4.28, 9.19, 0.76, INK2);
    await iconBadge(s, {
      x: 0.64, y: 4.48, d: 0.36, fill: CORAL,
      iconName: "FaXmark", iconColor: "FFFFFF", iconScale: 0.5,
    });
    s.addText(
      "Las fuentes que descartamos casi siempre se cayeron en la misma casilla: Autoridad o Propósito. " +
      "Una página puede verse ordenada y aun así no decirte quién la escribió.",
      {
        x: 1.14, y: 4.28, w: 8.20, h: 0.76,
        fontFace: BODY, fontSize: 11, color: LIGHT_ON_DARK,
        valign: "middle", lineSpacingMultiple: 1.0, margin: 0,
      }
    );

    s.addNotes(
      "Recordamos el embudo CRAAP visto en clase y explicamos que lo corrimos sobre cada resultado, " +
      "no solo sobre los que ya nos gustaban."
    );
  }

  // ===== 4-6. FUENTES =====
  const bloques = [
    ["Fuentes 1 y 2: los organismos de salud", "Lo que dicen las instituciones que vigilan el tema.", [FUENTES[0], FUENTES[1]]],
    ["Fuentes 3 y 4: la evidencia científica", "Una revisión sistemática global y un artículo peruano arbitrado.", [FUENTES[2], FUENTES[3]]],
    ["Fuente 5 y una que no sobrevivió", "La norma peruana vigente, y el contraste con lo que el filtro dejó fuera.", [FUENTES[4], DESCARTADA]],
  ];
  for (let b = 0; b < bloques.length; b++) {
    const s = pres.addSlide();
    s.background = { color: WHITE };
    tituloSlide(s, bloques[b][0], bloques[b][1]);
    await fuenteCard(s, bloques[b][2][0], 0.45, false);
    await fuenteCard(s, bloques[b][2][1], 5.10, b === 2);
    s.addNotes(
      b === 2
        ? "Cerramos con la fuente legal peruana y mostramos, al costado, un caso real de fuente descartada. " +
          "El punto: el filtro sirve justamente para dejar cosas fuera."
        : "Explicamos criterio por criterio por qué cada fuente pasó, y leemos la cita in-text tal como irá en el texto."
    );
  }

  // ===== 7. HALLAZGOS =====
  {
    const s = pres.addSlide();
    s.background = { color: INK };
    tituloSlide(s, "Lo que las cinco fuentes, juntas, nos dejaron claro", "Cada afirmación va con su cita: si no hay cita, no entra.", true);

    const hallazgos = [
      ["FaLungs", "No es vapor de agua",
        "El aerosol libera nicotina, partículas finas y compuestos orgánicos volátiles, y genera inflamación y estrés oxidativo en varios tipos de células.",
        "(Accinelli et al., 2020)"],
      ["FaUserGroup", "Los adolescentes vapean más que los adultos",
        "En todas las regiones de la OMS, el grupo de 13 a 15 años consume más cigarrillos electrónicos que la población adulta.",
        "(OMS, 2023)"],
      ["FaFlask", "Para dejar de fumar sí hay evidencia, pero es para adultos",
        "La revisión Cochrane halla evidencia de certeza alta de que los dispositivos con nicotina logran más abandonos del tabaco que parches o chicles, en personas que ya fumaban.",
        "(Lindson et al., 2025)"],
      ["FaGavel", "En el Perú ya hay reglas",
        "Desde 2024 está prohibido vapear en colegios, centros de salud, espacios públicos cerrados y transporte, y venderlos a menores de 18 años.",
        "(Ley N.° 32159, 2024)"],
    ];
    for (let i = 0; i < hallazgos.length; i++) {
      const col = i % 2, row = Math.floor(i / 2);
      const x = 0.42 + col * 4.68, y = 1.26 + row * 1.66;
      card(s, x, y, 4.48, 1.52, INK2, { line: "27596A" });
      await iconBadge(s, {
        x: x + 0.22, y: y + 0.22, d: 0.44, fill: TEAL,
        iconName: hallazgos[i][0], iconColor: "0E2A33", iconScale: 0.54,
      });
      s.addText(hallazgos[i][1], {
        x: x + 0.76, y: y + 0.17, w: 3.50, h: 0.52,
        fontFace: HEAD, fontSize: 11.5, bold: true, color: WHITE,
        valign: "middle", lineSpacingMultiple: 0.94, margin: 0,
      });
      s.addText(
        [
          { text: hallazgos[i][2] + "  ", options: { color: LIGHT_ON_DARK, fontFace: BODY, fontSize: 9.5 } },
          { text: hallazgos[i][3], options: { color: TEAL, fontFace: BODY, fontSize: 9.5, italic: true } },
        ],
        {
          x: x + 0.22, y: y + 0.74, w: 4.04, h: 0.68,
          valign: "top", lineSpacingMultiple: 0.98, margin: 0,
        }
      );
    }

    card(s, 0.42, 4.56, 9.16, 0.62, "0A2029", { line: TEAL_DK });
    s.addText(
      [
        { text: "El dato que nos sorprendió:  ", options: { bold: true, color: TEAL, fontFace: HEAD, fontSize: 11 } },
        {
          text: "el consumo escolar en EE. UU. bajó de 2,13 a 1,63 millones entre 2023 y 2024, y sigue lejos del pico de 2019 (CDC, 2024).",
          options: { color: LIGHT_ON_DARK, fontFace: BODY, fontSize: 11 },
        },
      ],
      { x: 0.68, y: 4.56, w: 8.66, h: 0.62, valign: "middle", margin: 0 }
    );

    s.addNotes(
      "Cerramos con lo que aprendimos, no con un resumen del método. Cada bloque lleva la cita de la fuente que lo sostiene."
    );
  }

  // ===== 8. REFERENCIAS =====
  {
    const s = pres.addSlide();
    s.background = { color: WHITE };
    tituloSlide(s, "Referencias en APA 7", "Orden alfabético, títulos principales en cursiva y enlaces completos.");

    const refs = [
      [
        { text: "Accinelli, R. A., Lam, J. y Tafur, K. (2020). El cigarrillo electrónico: un problema de salud pública emergente. " },
        { text: "Revista Peruana de Medicina Experimental y Salud Pública, 37", options: { italic: true } },
        { text: "(1), 122-128. https://doi.org/10.17843/rpmesp.2020.371.4780" },
      ],
      [
        { text: "Centers for Disease Control and Prevention. (2024, 5 de septiembre). " },
        { text: "Youth e-cigarette use drops to lowest level in a decade", options: { italic: true } },
        { text: " [Comunicado de prensa]. CDC Newsroom. https://www.cdc.gov/media/releases/2024/p0905-youth-ecigarette.html" },
      ],
      [
        { text: "Ley N.° 32159 de 2024. Ley del control del consumo de productos de tabaco, nicotina o sucedáneos de ambos para la protección de la vida y la salud. 12 de noviembre de 2024. Diario Oficial El Peruano. https://busquedas.elperuano.pe/dispositivo/NL/2343203-1" },
      ],
      [
        { text: "Lindson, N., Butler, A. R., McRobbie, H., Bullen, C., Hajek, P., Wu, A. D., Begh, R., Theodoulou, A., Notley, C., Rigotti, N. A., Turner, T., Livingstone-Banks, J., Morris, T. y Hartmann-Boyce, J. (2025). Electronic cigarettes for smoking cessation. " },
        { text: "Cochrane Database of Systematic Reviews", options: { italic: true } },
        { text: ", (1), Artículo CD010216. https://doi.org/10.1002/14651858.CD010216.pub9" },
      ],
      [
        { text: "Organización Mundial de la Salud. (2023, 14 de diciembre). " },
        { text: "Hay que actuar con urgencia para evitar que los niños y los jóvenes consuman cigarrillos electrónicos", options: { italic: true } },
        { text: ". Organización Mundial de la Salud. https://www.who.int/es/news/item/14-12-2023-urgent-action-needed-to-protect-children-and-prevent-the-uptake-of-e-cigarettes" },
      ],
    ];

    const runs = [];
    refs.forEach((r, i) => {
      r.forEach((piece, j) => {
        const opts = Object.assign(
          { fontFace: BODY, fontSize: 10.5, color: TEXT },
          piece.options || {}
        );
        if (j === r.length - 1) opts.breakLine = true;
        runs.push({ text: piece.text, options: opts });
      });
    });

    card(s, 0.45, 1.20, 9.10, 3.12, MIST2, { line: "D5E6E8" });
    s.addText(runs, {
      x: 0.72, y: 1.40, w: 8.56, h: 2.80,
      valign: "top", margin: 0, paraSpaceAfter: 8, lineSpacingMultiple: 0.98,
    });

    await iconBadge(s, {
      x: 0.55, y: 4.56, d: 0.36, fill: TEAL,
      iconName: "FaCircleCheck", iconColor: "0E2A33", iconScale: 0.56,
    });
    s.addText(
      "Regla que aplicamos: si aparece citada en el texto, tiene que estar en esta lista; y si está en la lista, es porque la citamos.",
      {
        x: 1.02, y: 4.50, w: 8.5, h: 0.48,
        fontFace: BODY, fontSize: 10.5, color: MUTED, valign: "middle", margin: 0,
      }
    );

    s.addNotes(
      "Lista final en orden alfabético. Revisamos el ticket de salida: orden A-Z, cursivas en el título principal y URLs que llevan directo al material."
    );
  }

  const out = path.join(__dirname, "cigarro-electronico-fuentes-craap-apa7.pptx");
  await pres.writeFile({ fileName: out });
  console.log("escrito:", out);
}

build().catch((e) => {
  console.error(e);
  process.exit(1);
});
