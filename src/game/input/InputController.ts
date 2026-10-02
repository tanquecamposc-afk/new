import { CameraConfig } from '@/config/camera';
import { InputConfig } from '@/config/input';

export interface InputHandlers {
  /** ¿Puede el jugador empezar a apuntar ahora? */
  canAim(): boolean;
  /** Posición de la bola en píxeles de pantalla (para "agarrar" la bola). */
  ballScreenPosition(): { x: number; y: number } | null;
  aimStart(): void;
  aimMove(dragPx: { x: number; y: number }): void;
  aimRelease(): void;
  aimCancel(): void;
  rotateCamera(dYaw: number, dPitch: number): void;
  zoomCamera(factor: number): void;
  resetBall(): void;
  toggleDebug(): void;
}

type Mode = 'none' | 'pending-aim' | 'aiming' | 'orbit';

/**
 * Entrada unificada ratón + táctil (Pointer Events):
 * - 1 dedo / botón izquierdo: arrastrar → apuntar → soltar.
 * - 2 dedos / botón derecho: rotar cámara; pellizco / rueda: zoom.
 * - Teclado: R reiniciar, Q/E rotar, +/- zoom, Esc cancelar, F3 debug.
 */
export class InputController {
  private mode: Mode = 'none';
  private start = { x: 0, y: 0 };
  private last = { x: 0, y: 0 };
  private pointers = new Map<number, { x: number; y: number }>();
  private pinchDist = 0;
  private keys = new Set<string>();
  private readonly ac = new AbortController();

  constructor(
    private readonly el: HTMLElement,
    private readonly h: InputHandlers,
  ) {
    const o = { signal: this.ac.signal };
    el.addEventListener('pointerdown', this.onDown, o);
    el.addEventListener('pointermove', this.onMove, o);
    el.addEventListener('pointerup', this.onUp, o);
    el.addEventListener('pointercancel', this.onCancel, o);
    el.addEventListener('wheel', this.onWheel, { ...o, passive: false });
    el.addEventListener('contextmenu', (e) => e.preventDefault(), o);
    window.addEventListener('keydown', this.onKeyDown, o);
    window.addEventListener('keyup', (e) => this.keys.delete(e.code), o);
    window.addEventListener('blur', () => this.keys.clear(), o);
    el.style.touchAction = 'none';
  }

  /** Rotación continua con teclado; se llama cada frame. */
  update(dt: number): void {
    const dir = (this.keys.has('KeyQ') || this.keys.has('ArrowLeft') ? 1 : 0) - (this.keys.has('KeyE') || this.keys.has('ArrowRight') ? 1 : 0);
    const pitch = (this.keys.has('ArrowUp') ? 1 : 0) - (this.keys.has('ArrowDown') ? 1 : 0);
    if (dir || pitch) this.h.rotateCamera(dir * CameraConfig.keyRotateSpeed * dt, pitch * CameraConfig.keyRotateSpeed * 0.5 * dt);
  }

  private local(e: PointerEvent) {
    const r = this.el.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private onDown = (e: PointerEvent) => {
    const p = this.local(e);
    this.pointers.set(e.pointerId, p);
    this.el.setPointerCapture?.(e.pointerId);

    if (this.pointers.size === 2) {
      // Segundo dedo: cancela el apuntado y pasa a cámara.
      if (this.mode === 'aiming' || this.mode === 'pending-aim') this.h.aimCancel();
      this.mode = 'orbit';
      this.pinchDist = this.pointerSpread();
      this.last = this.pointerCenter();
      return;
    }
    if (this.pointers.size > 2) return;

    const isAimButton = e.pointerType !== 'mouse' || e.button === 0;
    if (isAimButton && this.h.canAim() && this.grabOk(p)) {
      this.mode = 'pending-aim';
      this.start = p;
    } else if (e.pointerType === 'mouse' && (e.button === 2 || e.button === 1)) {
      this.mode = 'orbit';
      this.last = p;
    } else if (isAimButton) {
      // No se puede apuntar (bola moviéndose): el arrastre rota la cámara.
      this.mode = 'orbit';
      this.last = p;
    }
  };

  private grabOk(p: { x: number; y: number }): boolean {
    if (!InputConfig.requireBallGrab) return true;
    const b = this.h.ballScreenPosition();
    return !!b && Math.hypot(b.x - p.x, b.y - p.y) <= InputConfig.grabRadiusPx;
  }

  private onMove = (e: PointerEvent) => {
    if (!this.pointers.has(e.pointerId)) return;
    const p = this.local(e);
    this.pointers.set(e.pointerId, p);

    if (this.mode === 'orbit') {
      if (this.pointers.size >= 2) {
        const c = this.pointerCenter();
        this.h.rotateCamera(-(c.x - this.last.x) * CameraConfig.rotateSpeed, (c.y - this.last.y) * CameraConfig.rotateSpeed);
        this.last = c;
        const d = this.pointerSpread();
        if (this.pinchDist > 0 && d > 0) this.h.zoomCamera(this.pinchDist / d);
        this.pinchDist = d;
      } else {
        this.h.rotateCamera(-(p.x - this.last.x) * CameraConfig.rotateSpeed, (p.y - this.last.y) * CameraConfig.rotateSpeed);
        this.last = p;
      }
      return;
    }
    const drag = { x: p.x - this.start.x, y: p.y - this.start.y };
    if (this.mode === 'pending-aim' && Math.hypot(drag.x, drag.y) >= InputConfig.dragStartPx) {
      if (!this.h.canAim()) {
        this.mode = 'none';
        return;
      }
      this.mode = 'aiming';
      this.h.aimStart();
    }
    if (this.mode === 'aiming') this.h.aimMove(drag);
  };

  private onUp = (e: PointerEvent) => {
    this.pointers.delete(e.pointerId);
    if (this.mode === 'aiming') this.h.aimRelease();
    if (this.pointers.size === 0) this.mode = 'none';
    else if (this.mode === 'orbit') this.last = this.pointerCenter();
  };

  private onCancel = (e: PointerEvent) => {
    this.pointers.delete(e.pointerId);
    if (this.mode === 'aiming') this.h.aimCancel();
    if (this.pointers.size === 0) this.mode = 'none';
  };

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    this.h.zoomCamera(e.deltaY > 0 ? CameraConfig.zoomStep : 1 / CameraConfig.zoomStep);
  };

  private onKeyDown = (e: KeyboardEvent) => {
    if ((e.target as HTMLElement | null)?.closest?.('input, textarea')) return;
    this.keys.add(e.code);
    switch (e.code) {
      case 'KeyR':
        this.h.resetBall();
        break;
      case 'Escape':
        if (this.mode === 'aiming' || this.mode === 'pending-aim') {
          this.h.aimCancel();
          this.mode = 'none';
        }
        break;
      case 'Equal':
      case 'NumpadAdd':
        this.h.zoomCamera(1 / CameraConfig.zoomStep);
        break;
      case 'Minus':
      case 'NumpadSubtract':
        this.h.zoomCamera(CameraConfig.zoomStep);
        break;
      case 'F3':
      case 'Backquote':
        e.preventDefault();
        this.h.toggleDebug();
        break;
    }
  };

  private pointerCenter() {
    const ps = [...this.pointers.values()];
    return { x: ps.reduce((s, p) => s + p.x, 0) / ps.length, y: ps.reduce((s, p) => s + p.y, 0) / ps.length };
  }

  private pointerSpread() {
    const [a, b] = [...this.pointers.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  }

  dispose(): void {
    this.ac.abort();
  }
}
