/* NEXO ARCADE — engine/input.js
   Entrada unificada: teclado, ratón, táctil, gamepad y mandos virtuales. */
(function (global) {
  'use strict';
  const NX = (global.NX = global.NX || {});
  const M = NX.M;

  /* Alias amigables -> códigos de tecla. */
  const ALIAS = {
    left: ['ArrowLeft', 'KeyA'],
    right: ['ArrowRight', 'KeyD'],
    up: ['ArrowUp', 'KeyW'],
    down: ['ArrowDown', 'KeyS'],
    space: ['Space'],
    enter: ['Enter', 'NumpadEnter'],
    esc: ['Escape'],
    shift: ['ShiftLeft', 'ShiftRight'],
    ctrl: ['ControlLeft', 'ControlRight'],
    alt: ['AltLeft', 'AltRight'],
    tab: ['Tab'],
    back: ['Backspace'],
    a: ['KeyA'], b: ['KeyB'], c: ['KeyC'], d: ['KeyD'], e: ['KeyE'], f: ['KeyF'],
    g: ['KeyG'], h: ['KeyH'], i: ['KeyI'], j: ['KeyJ'], k: ['KeyK'], l: ['KeyL'],
    m: ['KeyM'], n: ['KeyN'], o: ['KeyO'], p: ['KeyP'], q: ['KeyQ'], r: ['KeyR'],
    s: ['KeyS'], t: ['KeyT'], u: ['KeyU'], v: ['KeyV'], w: ['KeyW'], x: ['KeyX'],
    y: ['KeyY'], z: ['KeyZ'],
    '1': ['Digit1'], '2': ['Digit2'], '3': ['Digit3'], '4': ['Digit4'], '5': ['Digit5'],
    '6': ['Digit6'], '7': ['Digit7'], '8': ['Digit8'], '9': ['Digit9'], '0': ['Digit0'],
  };
  /* Teclas cuyo comportamiento por defecto rompe el juego (scroll de página). */
  const BLOCK = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'Tab']);

  function Input(canvas) {
    this.canvas = canvas;
    this.enabled = true;
    this._down = new Set();
    this._pressed = new Set();
    this._released = new Set();
    this._virtual = new Set();
    this._chars = [];
    this.pointer = {
      x: 0, y: 0, px: 0, py: 0, dx: 0, dy: 0,
      down: false, pressed: false, released: false,
      startX: 0, startY: 0, downTime: 0, moved: 0, inside: false, id: null,
    };
    this.touches = [];          /* [{id,x,y,sx,sy}] en coordenadas lógicas */
    this.wheelDelta = 0;
    this.swipe = null;          /* {dir,dx,dy,dist} durante un frame */
    this.tap = null;            /* {x,y} durante un frame */
    this.gamepad = { connected: false, axes: [0, 0], buttons: {} };
    this._toLogical = (x, y) => ({ x, y });
    this._bind();
  }
  const I = Input.prototype;

  I.setTransform = function (fn) { this._toLogical = fn; };

  I._bind = function () {
    const self = this;
    const cv = this.canvas;

    this._onKeyDown = (e) => {
      if (!self.enabled) return;
      if (BLOCK.has(e.code) && !/^(INPUT|TEXTAREA)$/.test((document.activeElement || {}).tagName || '')) e.preventDefault();
      if (e.repeat) return;
      self._down.add(e.code);
      self._pressed.add(e.code);
      if (e.key && e.key.length === 1) self._chars.push(e.key);
      else if (e.key === 'Backspace') self._chars.push('\b');
      else if (e.key === 'Enter') self._chars.push('\n');
    };
    this._onKeyUp = (e) => {
      self._down.delete(e.code);
      self._released.add(e.code);
    };
    this._onBlur = () => { self._down.clear(); self.pointer.down = false; };

    window.addEventListener('keydown', this._onKeyDown, { passive: false });
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur);

    const pos = (ev) => {
      const r = cv.getBoundingClientRect();
      const cx = (ev.clientX - r.left) / r.width * cv.clientWidth;
      const cy = (ev.clientY - r.top) / r.height * cv.clientHeight;
      return self._toLogical(cx, cy);
    };
    this._pos = pos;

    this._onDown = (ev) => {
      if (!self.enabled) return;
      if (ev.pointerType === 'mouse' && ev.button !== 0) { self.rightDown = true; return; }
      const p = pos(ev);
      const P = self.pointer;
      P.x = P.px = p.x; P.y = P.py = p.y;
      P.startX = p.x; P.startY = p.y;
      P.down = true; P.pressed = true; P.moved = 0; P.id = ev.pointerId;
      P.downTime = performance.now();
      self.touches.push({ id: ev.pointerId, x: p.x, y: p.y, sx: p.x, sy: p.y });
      if (cv.setPointerCapture) { try { cv.setPointerCapture(ev.pointerId); } catch (_) {} }
      ev.preventDefault();
    };
    this._onMove = (ev) => {
      if (!self.enabled) return;
      const p = pos(ev);
      const P = self.pointer;
      if (P.id == null || ev.pointerId === P.id || !P.down) {
        P.dx += p.x - P.x; P.dy += p.y - P.y;
        P.x = p.x; P.y = p.y;
        if (P.down) P.moved += Math.hypot(p.x - P.px, p.y - P.py);
      }
      const t = self.touches.find((t) => t.id === ev.pointerId);
      if (t) { t.x = p.x; t.y = p.y; }
    };
    this._onUp = (ev) => {
      const P = self.pointer;
      const p = pos(ev);
      if (ev.pointerType === 'mouse' && ev.button !== 0) { self.rightDown = false; return; }
      if (P.id != null && ev.pointerId !== P.id) {
        self.touches = self.touches.filter((t) => t.id !== ev.pointerId);
        return;
      }
      P.down = false; P.released = true; P.id = null;
      P.x = p.x; P.y = p.y;
      const dt = performance.now() - P.downTime;
      const dx = p.x - P.startX, dy = p.y - P.startY;
      const dd = Math.hypot(dx, dy);
      if (dd > 34 && dt < 620) {
        self.swipe = { dx, dy, dist: dd,
          dir: Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up') };
      } else if (dd < 16 && dt < 420) {
        self.tap = { x: p.x, y: p.y };
      }
      self.touches = self.touches.filter((t) => t.id !== ev.pointerId);
    };
    this._onEnter = () => { self.pointer.inside = true; };
    this._onLeave = () => { self.pointer.inside = false; self.pointer.down = false; };
    this._onWheel = (ev) => { if (!self.enabled) return; self.wheelDelta += ev.deltaY; ev.preventDefault(); };
    this._onCtx = (ev) => ev.preventDefault();

    cv.addEventListener('pointerdown', this._onDown);
    window.addEventListener('pointermove', this._onMove);
    window.addEventListener('pointerup', this._onUp);
    window.addEventListener('pointercancel', this._onUp);
    cv.addEventListener('pointerenter', this._onEnter);
    cv.addEventListener('pointerleave', this._onLeave);
    cv.addEventListener('wheel', this._onWheel, { passive: false });
    cv.addEventListener('contextmenu', this._onCtx);
  };

  I.destroy = function () {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('blur', this._onBlur);
    window.removeEventListener('pointermove', this._onMove);
    window.removeEventListener('pointerup', this._onUp);
    window.removeEventListener('pointercancel', this._onUp);
    const cv = this.canvas;
    cv.removeEventListener('pointerdown', this._onDown);
    cv.removeEventListener('pointerenter', this._onEnter);
    cv.removeEventListener('pointerleave', this._onLeave);
    cv.removeEventListener('wheel', this._onWheel);
    cv.removeEventListener('contextmenu', this._onCtx);
  };

  /* --- consultas de teclado --- */
  function codes(name) {
    if (ALIAS[name]) return ALIAS[name];
    return [name];
  }
  I.down = function (name) {
    if (this._virtual.has(name)) return true;
    const cs = codes(name);
    for (let i = 0; i < cs.length; i++) if (this._down.has(cs[i])) return true;
    if (this.gamepad.connected && this.gamepad.buttons[name]) return true;
    return false;
  };
  I.pressed = function (name) {
    if (this._vpressed && this._vpressed.has(name)) return true;
    const cs = codes(name);
    for (let i = 0; i < cs.length; i++) if (this._pressed.has(cs[i])) return true;
    return false;
  };
  I.released = function (name) {
    const cs = codes(name);
    for (let i = 0; i < cs.length; i++) if (this._released.has(cs[i])) return true;
    return false;
  };
  I.anyPressed = function () {
    return this._pressed.size > 0 || (this._vpressed && this._vpressed.size > 0);
  };
  /* Vector de dirección normalizado (WASD/flechas/dpad/stick). */
  I.axis = function () {
    let x = 0, y = 0;
    if (this.down('left')) x -= 1;
    if (this.down('right')) x += 1;
    if (this.down('up')) y -= 1;
    if (this.down('down')) y += 1;
    if (this.gamepad.connected) {
      if (Math.abs(this.gamepad.axes[0]) > 0.18) x += this.gamepad.axes[0];
      if (Math.abs(this.gamepad.axes[1]) > 0.18) y += this.gamepad.axes[1];
    }
    const l = Math.hypot(x, y);
    if (l > 1) { x /= l; y /= l; }
    return { x, y, len: Math.min(1, l) };
  };
  /* Caracteres tecleados este frame (para juegos de palabras). */
  I.chars = function () { return this._chars; };

  /* --- mandos virtuales (DOM) --- */
  I.setVirtual = function (name, on) {
    if (on) {
      if (!this._virtual.has(name)) {
        this._virtual.add(name);
        (this._vpressed || (this._vpressed = new Set())).add(name);
      }
    } else this._virtual.delete(name);
  };

  /* --- gamepad --- */
  I.pollGamepad = function () {
    if (!navigator.getGamepads) return;
    const gps = navigator.getGamepads();
    let gp = null;
    for (let i = 0; i < gps.length; i++) if (gps[i]) { gp = gps[i]; break; }
    const G = this.gamepad;
    if (!gp) { G.connected = false; return; }
    G.connected = true;
    G.axes[0] = gp.axes[0] || 0;
    G.axes[1] = gp.axes[1] || 0;
    const b = gp.buttons;
    const map = { space: 0, a: 0, b: 1, x: 2, y: 3, enter: 9, esc: 8, shift: 6 };
    for (const k in map) G.buttons[k] = b[map[k]] && b[map[k]].pressed;
    if (b[12] && b[12].pressed) G.buttons.up = true; else G.buttons.up = false;
    if (b[13] && b[13].pressed) G.buttons.down = true; else G.buttons.down = false;
    if (b[14] && b[14].pressed) G.buttons.left = true; else G.buttons.left = false;
    if (b[15] && b[15].pressed) G.buttons.right = true; else G.buttons.right = false;
  };

  /* Se llama al final de cada frame. */
  I.endFrame = function () {
    this._pressed.clear();
    this._released.clear();
    if (this._vpressed) this._vpressed.clear();
    this._chars.length = 0;
    const P = this.pointer;
    P.pressed = false; P.released = false;
    P.px = P.x; P.py = P.y;
    P.dx = 0; P.dy = 0;
    this.wheelDelta = 0;
    this.swipe = null;
    this.tap = null;
  };

  NX.Input = Input;
  NX.Input.ALIAS = ALIAS;
})(typeof window !== 'undefined' ? window : globalThis);
