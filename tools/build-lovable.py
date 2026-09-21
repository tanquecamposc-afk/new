#!/usr/bin/env python3
"""Genera el proyecto de Lovable a partir de arise-3d.html.

El HTML es la fuente de verdad: de el salen el CSS, el marcado del HUD y el
motor del juego. Asi no hay dos copias del juego que puedan divergir.
"""
import re, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC  = ROOT / "arise-3d.html"
OUT  = ROOT / "lovable"

html = SRC.read_text(encoding="utf-8")

css = re.search(r"<style>\n(.*?)\n</style>", html, re.S).group(1)
body = re.search(r'(<div id="app">.*?\n</div>)\n', html, re.S).group(1)
scripts = re.findall(r"<script>(.*?)</script>", html, re.S)
engine = scripts[-1]

engine = engine.replace('const THREE_OK = typeof THREE !== "undefined";',
                        "const THREE_OK = true;   // three llega por import")

def lit(text):
    return text.replace("\\", "\\\\").replace("`", "\\`").replace("${", "\\${")

(OUT / "src" / "game").mkdir(parents=True, exist_ok=True)

(OUT / "src/game/styles.ts").write_text(
    "// Generado por tools/build-lovable.py — no editar a mano.\n"
    "// Hoja de estilo del HUD, extraida de arise-3d.html.\n"
    f"export const GAME_CSS = `{lit(css)}`;\n", encoding="utf-8")

(OUT / "src/game/markup.ts").write_text(
    "// Generado por tools/build-lovable.py — no editar a mano.\n"
    "// Marcado del HUD (barras, paneles, hotbar, minimapa, pantalla de inicio).\n"
    f"export const GAME_HTML = `{lit(body)}`;\n", encoding="utf-8")

engine_ts = '''// @ts-nocheck
// Generado por tools/build-lovable.py desde arise-3d.html — no editar a mano.
//
// Motor de Arise Crossover+. Es codigo imperativo: crea su propia escena de
// three.js, escucha teclado y puntero y pinta el HUD que monta AriseGame.tsx.
// Se expone como una funcion de montaje para que React controle su ciclo de
// vida: `mountArise()` devuelve la funcion que lo desmonta.
import * as THREE from "three";

export function mountArise(): () => void {
  (window as any).THREE = THREE;
  const listeners: Array<[string, EventListener]> = [];
  const origAdd = window.addEventListener.bind(window);
  const addEventListener = (type: string, fn: EventListener, opts?: any) => {
    listeners.push([type, fn]);
    origAdd(type, fn, opts);
  };
  let rafId = 0;
  const origRaf = window.requestAnimationFrame.bind(window);
  const requestAnimationFrame = (cb: FrameRequestCallback) => (rafId = origRaf(cb));
  let disposed = false;

''' + engine + '''

  return () => {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(rafId);
    for (const [type, fn] of listeners) window.removeEventListener(type, fn);
    try { renderer && renderer.dispose(); } catch {}
  };
}
'''
(OUT / "src/game/engine.ts").write_text(engine_ts, encoding="utf-8")

print("CSS  :", len(css), "bytes")
print("HUD  :", len(body), "bytes")
print("motor:", len(engine), "bytes")
