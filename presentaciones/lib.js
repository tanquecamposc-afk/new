// Constructor de diapositivas reutilizable para las tres presentaciones.
const pptxgen = require("pptxgenjs");

const W = 13.3;
const H = 7.5;
const M = 0.7; // margen lateral

function build(cfg, outfile) {
  const P = cfg.palette;
  const pres = new pptxgen();
  pres.layout = "LAYOUT_WIDE";
  pres.author = "Colegio Santa María Marianistas";
  pres.title = cfg.title;

  const HEAD = cfg.fontHead || "Cambria";
  const BODY = cfg.fontBody || "Calibri";

  // ---------- primitivas ----------
  const dark = (s) => {
    s.background = { color: P.dark };
  };
  const light = (s) => {
    s.background = { color: P.light };
  };

  // círculo con contenido: el motivo visual que se repite en todo el deck
  function circle(s, x, y, d, fill, label, txtColor, size) {
    s.addShape(pres.ShapeType.ellipse, {
      x, y, w: d, h: d, fill: { color: fill },
    });
    if (label) {
      s.addText(label, {
        x, y, w: d, h: d, isTextBox: true, margin: 0,
        align: "center", valign: "middle",
        fontFace: HEAD, fontSize: size || 14, bold: true, color: txtColor,
      });
    }
  }

  // estimación de cuántas líneas ocupa un texto en un ancho dado
  function lines(text, widthIn, fontSize) {
    const perChar = fontSize * 0.5 / 72;
    return Math.max(1, Math.ceil(text.length / Math.max(1, widthIn / perChar)));
  }

  function slideTitle(s, text, onDark, kicker) {
    const col = onDark ? P.light : P.dark;
    if (kicker) {
      s.addText(kicker.toUpperCase(), {
        x: M, y: 0.45, w: W - 2 * M, h: 0.3, isTextBox: true, margin: 0,
        fontFace: BODY, fontSize: 11, bold: true, charSpacing: 2,
        color: P.accent,
      });
    }
    const L = text.length;
    const fs = L <= 44 ? 34 : L <= 56 ? 28 : L <= 70 ? 24 : 21;
    s.addText(text, {
      x: M, y: kicker ? 0.78 : 0.6, w: W - 2 * M, h: 0.85, isTextBox: true, margin: 0,
      fontFace: HEAD, fontSize: fs, bold: true, color: col, valign: "top",
    });
  }

  function footer(s, n, onDark) {
    s.addText(cfg.shortTitle, {
      x: M, y: H - 0.52, w: 6, h: 0.3, isTextBox: true, margin: 0,
      fontFace: BODY, fontSize: 9, color: onDark ? P.muted : P.mutedLight,
    });
    s.addText(String(n), {
      x: W - M - 0.6, y: H - 0.52, w: 0.6, h: 0.3, isTextBox: true, margin: 0,
      align: "right", fontFace: BODY, fontSize: 9,
      color: onDark ? P.muted : P.mutedLight,
    });
  }

  // ---------- tipos de diapositiva ----------
  const renderers = {
    cover(s, d) {
      dark(s);
      // motivo: constelación de círculos
      const spots = [[11.4, 1.0, 1.9], [12.6, 3.1, 0.55], [10.5, 3.9, 0.9], [12.2, 5.4, 0.35]];
      spots.forEach(([x, y, r], i) => {
        s.addShape(pres.ShapeType.ellipse, {
          x, y, w: r, h: r,
          fill: { color: i % 2 ? P.accent : P.second, transparency: i === 0 ? 0 : 35 },
        });
      });
      s.addText(d.kicker.toUpperCase(), {
        x: M, y: 1.5, w: 8.5, h: 0.35, isTextBox: true, margin: 0,
        fontFace: BODY, fontSize: 12, bold: true, charSpacing: 3, color: P.accent,
      });
      s.addText(d.title, {
        x: M, y: 2.0, w: 9.0, h: 1.9, isTextBox: true, margin: 0,
        fontFace: HEAD, fontSize: 52, bold: true, color: P.light, valign: "top",
      });
      s.addText(d.subtitle, {
        x: M, y: 4.0, w: 8.6, h: 0.9, isTextBox: true, margin: 0,
        fontFace: BODY, fontSize: 17, color: P.second, valign: "top",
      });
      s.addText(d.meta, {
        x: M, y: 5.9, w: 9.0, h: 0.9, isTextBox: true, margin: 0,
        fontFace: BODY, fontSize: 12, color: P.muted, lineSpacing: 18,
      });
    },

    // pregunta grande + 3 sub-preguntas en tarjetas
    question(s, d) {
      dark(s);
      slideTitle(s, d.title, true, d.kicker);
      s.addText(d.big, {
        x: M, y: 1.75, w: 7.4, h: 1.9, isTextBox: true, margin: 0,
        fontFace: HEAD, fontSize: 27, italic: true, color: P.accent, valign: "top",
      });
      s.addText(d.body, {
        x: M, y: 3.75, w: 7.2, h: 2.4, isTextBox: true, margin: 0,
        fontFace: BODY, fontSize: 14.5, color: P.light, lineSpacing: 23, valign: "top",
      });
      const bx = 8.5, bw = W - M - bx;
      s.addShape(pres.ShapeType.roundRect, {
        x: bx, y: 1.75, w: bw, h: 4.4, rectRadius: 0.12,
        fill: { color: P.panel },
      });
      s.addText(d.listTitle, {
        x: bx + 0.35, y: 2.05, w: bw - 0.7, h: 0.35, isTextBox: true, margin: 0,
        fontFace: BODY, fontSize: 11, bold: true, charSpacing: 1.5, color: P.accent,
      });
      d.list.forEach((t, i) => {
        const y = 2.55 + i * 1.05;
        circle(s, bx + 0.35, y, 0.36, P.accent, String(i + 1), P.dark, 13);
        s.addText(t, {
          x: bx + 0.85, y: y - 0.06, w: bw - 1.25, h: 0.95, isTextBox: true, margin: 0,
          fontFace: BODY, fontSize: 12.5, color: P.light, valign: "top", lineSpacing: 17,
        });
      });
    },

    // rejilla de tarjetas con círculo-icono
    cards(s, d) {
      const onDark = !!d.dark;
      onDark ? dark(s) : light(s);
      slideTitle(s, d.title, onDark, d.kicker);
      if (d.lead) {
        s.addText(d.lead, {
          x: M, y: 1.6, w: W - 2 * M - 0.4, h: 0.55, isTextBox: true, margin: 0,
          fontFace: BODY, fontSize: 14, color: onDark ? P.second : P.mutedLight,
          valign: "top", lineSpacing: 20,
        });
      }
      const items = d.items;
      const cols = d.cols || (items.length <= 3 ? items.length : Math.ceil(items.length / 2));
      const rows = Math.ceil(items.length / cols);
      const compact = rows >= 2;
      const top = d.lead ? (compact ? 2.25 : 2.35) : 1.85;
      const gap = 0.3;
      const cw = (W - 2 * M - gap * (cols - 1)) / cols;
      const ch = (H - top - (compact ? 0.75 : 0.85) - gap * (rows - 1)) / rows;
      const bodySize = compact ? 11.5 : 12;
      items.forEach((it, i) => {
        const r = Math.floor(i / cols), c = i % cols;
        const x = M + c * (cw + gap), y = top + r * (ch + gap);
        s.addShape(pres.ShapeType.roundRect, {
          x, y, w: cw, h: ch, rectRadius: 0.1,
          fill: { color: onDark ? P.panel : P.panelLight },
        });
        const dia = compact ? 0.44 : 0.5;
        circle(s, x + 0.32, y + (compact ? 0.26 : 0.3), dia, it.hi ? P.accent : P.second,
          it.tag || String(i + 1), P.dark, compact ? 13 : 15);
        const headX = compact ? x + 0.32 + dia + 0.18 : x + 0.32;
        const headW = compact ? cw - 0.64 - dia - 0.18 : cw - 0.64;
        const headY = compact ? y + 0.26 : y + 0.95;
        const hl = lines(it.head, headW, compact ? 19 : 21);
        const hh = 0.3 + hl * 0.26;
        s.addText(it.head, {
          x: headX, y: headY, w: headW, h: compact ? Math.max(dia, hh) : hh, isTextBox: true, margin: 0,
          fontFace: HEAD, fontSize: compact ? 15 : 16, bold: true,
          color: onDark ? P.light : P.dark, valign: "middle",
        });
        const by = compact
          ? y + Math.max(0.95, 0.3 + hh + 0.12)
          : y + 0.95 + hh + 0.1;
        s.addText(it.body, {
          x: x + 0.32, y: by, w: cw - 0.64, h: y + ch - 0.22 - by, isTextBox: true, margin: 0,
          fontFace: BODY, fontSize: bodySize, lineSpacing: 16,
          color: onDark ? P.second : P.mutedLight, valign: "top",
        });
      });
    },

    // tres cifras grandes
    stats(s, d) {
      dark(s);
      slideTitle(s, d.title, true, d.kicker);
      if (d.lead) {
        s.addText(d.lead, {
          x: M, y: 1.62, w: W - 2 * M, h: 0.5, isTextBox: true, margin: 0,
          fontFace: BODY, fontSize: 14, color: P.second, valign: "top",
        });
      }
      const n = d.items.length, gap = 0.3;
      const cw = (W - 2 * M - gap * (n - 1)) / n;
      d.items.forEach((it, i) => {
        const x = M + i * (cw + gap);
        s.addShape(pres.ShapeType.roundRect, {
          x, y: 2.3, w: cw, h: 3.1, rectRadius: 0.1, fill: { color: P.panel },
        });
        s.addText(it.value, {
          x: x + 0.25, y: 2.55, w: cw - 0.5, h: 1.15, isTextBox: true, margin: 0,
          fontFace: HEAD, fontSize: it.small ? 40 : 52, bold: true,
          color: P.accent, valign: "middle",
        });
        s.addText(it.label, {
          x: x + 0.25, y: 3.75, w: cw - 0.5, h: 1.45, isTextBox: true, margin: 0,
          fontFace: BODY, fontSize: 12.5, color: P.light, valign: "top", lineSpacing: 18,
        });
      });
      s.addText(d.note, {
        x: M, y: 5.65, w: W - 2 * M, h: 0.6, isTextBox: true, margin: 0,
        fontFace: BODY, fontSize: 10.5, italic: true, color: P.muted, valign: "top",
      });
    },

    // pasos numerados en fila
    steps(s, d) {
      light(s);
      slideTitle(s, d.title, false, d.kicker);
      if (d.lead) {
        s.addText(d.lead, {
          x: M, y: 1.62, w: W - 2 * M, h: 0.5, isTextBox: true, margin: 0,
          fontFace: BODY, fontSize: 14, color: P.mutedLight, valign: "top",
        });
      }
      const n = d.items.length, gap = 0.28;
      const cw = (W - 2 * M - gap * (n - 1)) / n;
      d.items.forEach((it, i) => {
        const x = M + i * (cw + gap);
        s.addShape(pres.ShapeType.roundRect, {
          x, y: 2.3, w: cw, h: 3.4, rectRadius: 0.1, fill: { color: P.panelLight },
        });
        circle(s, x + 0.28, 2.58, 0.52, P.accent, String(i + 1), P.dark, 16);
        s.addText(it.head, {
          x: x + 0.28, y: 3.28, w: cw - 0.56, h: 0.7, isTextBox: true, margin: 0,
          fontFace: HEAD, fontSize: 15, bold: true, color: P.dark, valign: "top",
        });
        s.addText(it.body, {
          x: x + 0.28, y: 3.86, w: cw - 0.56, h: 1.66, isTextBox: true, margin: 0,
          fontFace: BODY, fontSize: 11.5, color: P.mutedLight, valign: "top", lineSpacing: 16,
        });
      });
      if (d.note) {
        s.addText(d.note, {
          x: M, y: 5.9, w: W - 2 * M, h: 0.5, isTextBox: true, margin: 0,
          fontFace: BODY, fontSize: 10.5, italic: true, color: P.mutedLight,
        });
      }
    },

    // dos columnas enfrentadas
    versus(s, d) {
      light(s);
      slideTitle(s, d.title, false, d.kicker);
      const cw = (W - 2 * M - 0.4) / 2;
      [d.left, d.right].forEach((col, i) => {
        const x = M + i * (cw + 0.4);
        const isB = i === 1;
        s.addShape(pres.ShapeType.roundRect, {
          x, y: 1.8, w: cw, h: 4.55, rectRadius: 0.1,
          fill: { color: isB ? P.dark : P.panelLight },
        });
        circle(s, x + 0.4, 2.1, 0.5, isB ? P.accent : P.second, col.tag, P.dark, 15);
        s.addText(col.head, {
          x: x + 1.05, y: 2.13, w: cw - 1.45, h: 0.5, isTextBox: true, margin: 0,
          fontFace: HEAD, fontSize: 19, bold: true,
          color: isB ? P.light : P.dark, valign: "middle",
        });
        // escoge el cuerpo más grande que quepa dentro del panel
        const fit = [12.5, 11.5, 10.5].find((fs) => {
          const est = col.points.reduce(
            (a, p) => a + 0.06 + lines(p, cw - 1.0, fs * 1.36) * (fs * 0.0192) + 0.16, 0);
          return est <= 3.4;
        }) || 10;
        let vy = 2.9;
        col.points.forEach((p) => {
          const ln = lines(p, cw - 1.0, fit * 1.36);
          const hgt = 0.06 + ln * (fit * 0.0192);
          s.addText(p, {
            x: x + 0.4, y: vy, w: cw - 0.8, h: hgt, isTextBox: true, margin: 0,
            fontFace: BODY, fontSize: fit, lineSpacing: Math.round(fit * 1.36),
            color: isB ? P.second : P.mutedLight, valign: "top",
            bullet: { characterCode: "25CF", indent: 14 },
          });
          vy += hgt + 0.16;
        });
      });
    },

    // ficha CRAAP de una fuente
    craap(s, d) {
      light(s);
      slideTitle(s, d.source, false, d.kicker || "Evaluación CRAAP");
      s.addText(d.meta, {
        x: M, y: 1.62, w: 8.4, h: 0.65, isTextBox: true, margin: 0,
        fontFace: BODY, fontSize: 11.5, italic: true, color: P.mutedLight,
        valign: "top", lineSpacing: 16,
      });
      // panel de puntaje
      const px = W - M - 2.9;
      s.addShape(pres.ShapeType.roundRect, {
        x: px, y: 1.6, w: 2.9, h: 2.15, rectRadius: 0.1, fill: { color: P.dark },
      });
      s.addText(d.score, {
        x: px, y: 1.8, w: 2.9, h: 1.0, isTextBox: true, margin: 0,
        align: "center", fontFace: HEAD, fontSize: 40, bold: true, color: P.accent,
      });
      s.addText(d.verdict, {
        x: px + 0.2, y: 2.85, w: 2.5, h: 0.75, isTextBox: true, margin: 0,
        align: "center", fontFace: BODY, fontSize: 11.5, color: P.light,
        valign: "top", lineSpacing: 15,
      });
      // filas de criterios
      const labels = ["Currency", "Relevance", "Authority", "Accuracy", "Purpose"];
      const es = ["Vigencia", "Pertinencia", "Autoridad", "Exactitud", "Propósito"];
      d.rows.forEach((txt, i) => {
        const y = 2.55 + i * 0.82;
        s.addShape(pres.ShapeType.roundRect, {
          x: M, y, w: (i < 2 ? 8.4 : W - 2 * M), h: 0.72, rectRadius: 0.08,
          fill: { color: P.panelLight },
        });
        circle(s, M + 0.16, y + 0.16, 0.4, P.second, labels[i][0], P.dark, 14);
        s.addText(es[i], {
          x: M + 0.68, y: y + 0.04, w: 1.25, h: 0.64, isTextBox: true, margin: 0,
          fontFace: BODY, fontSize: 11, bold: true, color: P.dark, valign: "middle",
        });
        s.addText(txt, {
          x: M + 1.95, y: y + 0.02, w: (i < 2 ? 8.4 : W - 2 * M) - 2.15, h: 0.68,
          isTextBox: true, margin: 0,
          fontFace: BODY, fontSize: 11, color: P.mutedLight, valign: "middle", lineSpacing: 14,
        });
      });
    },

    // tabla resumen
    table(s, d) {
      dark(s);
      slideTitle(s, d.title, true, d.kicker);
      const colW = [4.6, 1.35, 1.35, 1.35, 1.35, 1.35];
      const head = ["Fuente", "Vig.", "Pert.", "Autor.", "Exact.", "Prop."];
      let x = M;
      head.forEach((h, i) => {
        s.addText(h, {
          x, y: 1.75, w: colW[i], h: 0.42, isTextBox: true, margin: 0,
          align: i ? "center" : "left",
          fontFace: BODY, fontSize: 11, bold: true, charSpacing: 1, color: P.accent,
          valign: "middle",
        });
        x += colW[i];
      });
      d.rows.forEach((r, ri) => {
        const y = 2.3 + ri * 0.82;
        s.addShape(pres.ShapeType.roundRect, {
          x: M, y, w: W - 2 * M, h: 0.7, rectRadius: 0.08,
          fill: { color: P.panel, transparency: ri % 2 ? 35 : 0 },
        });
        let cx = M + 0.25;
        s.addText(r.name, {
          x: cx, y: y + 0.02, w: colW[0] - 0.35, h: 0.66, isTextBox: true, margin: 0,
          fontFace: BODY, fontSize: 11.5, color: P.light, valign: "middle", lineSpacing: 14,
        });
        cx = M + colW[0];
        r.marks.forEach((m, i) => {
          s.addText(m, {
            x: cx, y: y + 0.02, w: colW[i + 1], h: 0.66, isTextBox: true, margin: 0,
            align: "center", fontFace: HEAD, fontSize: 14, bold: true,
            color: m === "Alta" ? P.accent : m === "Media" ? P.second : P.muted,
            valign: "middle",
          });
          cx += colW[i + 1];
        });
      });
      s.addText(d.note, {
        x: M, y: H - 1.25, w: W - 2 * M, h: 0.6, isTextBox: true, margin: 0,
        fontFace: BODY, fontSize: 11, italic: true, color: P.second,
        valign: "top", lineSpacing: 16,
      });
    },

    // conclusiones numeradas
    closing(s, d) {
      dark(s);
      slideTitle(s, d.title, true, d.kicker);
      d.items.forEach((t, i) => {
        const y = 1.85 + i * 1.12;
        circle(s, M, y, 0.6, i === 0 ? P.accent : P.panel, String(i + 1),
          i === 0 ? P.dark : P.accent, 18);
        s.addText(t.head, {
          x: M + 0.85, y: y - 0.02, w: W - 2 * M - 1.0, h: 0.4, isTextBox: true, margin: 0,
          fontFace: HEAD, fontSize: 16, bold: true, color: P.light, valign: "top",
        });
        s.addText(t.body, {
          x: M + 0.85, y: y + 0.4, w: W - 2 * M - 1.0, h: 0.65, isTextBox: true, margin: 0,
          fontFace: BODY, fontSize: 12.5, color: P.second, valign: "top", lineSpacing: 17,
        });
      });
    },

    // referencias en APA con sangría francesa
    refs(s, d) {
      light(s);
      slideTitle(s, d.title || "Referencias", false, "Formato APA — Colegio Santa María Marianistas");
      d.items.forEach((runs, i) => {
        s.addText(runs, {
          x: M, y: 1.7 + i * d.step, w: W - 2 * M, h: d.step, isTextBox: true, margin: 0,
          fontFace: BODY, fontSize: d.size || 11.5, color: P.dark,
          valign: "top", lineSpacing: 16,
          bullet: { characterCode: "200B", indent: 22 },
        });
      });
      if (d.note) {
        s.addText(d.note, {
          x: M, y: H - 1.15, w: W - 2 * M, h: 0.55, isTextBox: true, margin: 0,
          fontFace: BODY, fontSize: 10, italic: true, color: P.mutedLight, lineSpacing: 14,
        });
      }
    },
  };

  const DARK_TYPES = ["cover", "question", "stats", "table", "closing"];
  cfg.slides.forEach((d, i) => {
    const s = pres.addSlide();
    renderers[d.type](s, d);
    const onDark = DARK_TYPES.includes(d.type) || !!d.dark;
    if (d.type !== "cover") footer(s, i + 1, onDark);
    if (d.notes) s.addNotes(d.notes);
  });

  return pres.writeFile({ fileName: outfile });
}

module.exports = { build, W, H, M };
