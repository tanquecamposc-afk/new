/**
 * Closed race track built from a Catmull-Rom spline: sampled frame
 * (position / tangent / right / distance), elevation with ramps & jumps,
 * road ribbon mesh with procedural markings, curbs, barriers and lamps.
 */
import * as THREE from 'three';
import { Builder } from '../levels/Builder';
import { glowMat, cachedGeo, mat, M } from '../gfx/Materials';

export interface TrackSample {
  p: THREE.Vector3;
  t: THREE.Vector3;
  r: THREE.Vector3;
  s: number;
  curv: number;
}

export interface TrackOpts {
  points: THREE.Vector3[];
  width: number;
  samples?: number;
  ramps?: { at: number; len: number; height: number }[];
}

let roadTex: THREE.Texture | null = null;
function roadTexture() {
  if (roadTex) return roadTex;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const x = c.getContext('2d')!;
  const img = x.createImageData(256, 256);
  for (let i = 0; i < 256 * 256; i++) {
    const v = 40 + Math.random() * 22;
    img.data[i * 4] = v;
    img.data[i * 4 + 1] = v;
    img.data[i * 4 + 2] = v + 4;
    img.data[i * 4 + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  x.fillStyle = '#e8e8e8';
  x.fillRect(6, 0, 6, 256);
  x.fillRect(244, 0, 6, 256);
  x.fillStyle = '#ffd23d';
  for (let y = 0; y < 256; y += 64) x.fillRect(125, y, 6, 36);
  x.fillStyle = 'rgba(255,255,255,0.6)';
  for (let y = 32; y < 256; y += 64) {
    x.fillRect(64, y, 3, 30);
    x.fillRect(189, y, 3, 30);
  }
  roadTex = new THREE.CanvasTexture(c);
  roadTex.wrapS = roadTex.wrapT = THREE.RepeatWrapping;
  roadTex.colorSpace = THREE.SRGBColorSpace;
  roadTex.anisotropy = 8;
  roadTex.userData.cached = true;
  return roadTex;
}

export class Track {
  samples: TrackSample[] = [];
  length = 0;
  width: number;
  curve: THREE.CatmullRomCurve3;

  constructor(o: TrackOpts) {
    this.width = o.width;
    this.curve = new THREE.CatmullRomCurve3(o.points, true, 'centripetal');
    const N = o.samples ?? 600;
    const pts = this.curve.getSpacedPoints(N);
    pts.pop();
    let s = 0;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const n = pts[(i + 1) % pts.length];
      const t = n.clone().sub(p).setY(0).normalize();
      const r = new THREE.Vector3(-t.z, 0, t.x);
      if (i > 0) s += p.distanceTo(pts[i - 1]);
      this.samples.push({ p: p.clone(), t, r, s, curv: 0 });
    }
    this.length = s + pts[pts.length - 1].distanceTo(pts[0]);
    // Curvature (for AI speed)
    const M = this.samples.length;
    for (let i = 0; i < M; i++) {
      const a = this.samples[(i - 4 + M) % M].t, b = this.samples[(i + 4) % M].t;
      this.samples[i].curv = Math.acos(Math.max(-1, Math.min(1, a.dot(b))));
    }
    // Ramps: rise then an abrupt drop → jumps
    for (const rp of o.ramps ?? []) {
      const i0 = Math.floor(rp.at * M);
      const n = Math.max(3, Math.round((rp.len / this.length) * M));
      for (let k = 0; k < n; k++) {
        const smp = this.samples[(i0 + k) % M];
        smp.p.y += (k / n) * rp.height;
      }
    }
  }

  /** Nearest sample index to a position, searching around a hint. */
  nearest(p: THREE.Vector3, hint = -1): number {
    const M = this.samples.length;
    let best = hint >= 0 ? hint : 0;
    let bestD = Infinity;
    const range = hint >= 0 ? 30 : M;
    for (let k = -range; k <= range; k++) {
      const i = hint >= 0 ? (hint + k + M) % M : k + range;
      if (i < 0 || i >= M) continue;
      const q = this.samples[i].p;
      const d = (q.x - p.x) ** 2 + (q.z - p.z) ** 2;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return best;
  }

  sample(i: number) {
    const M = this.samples.length;
    return this.samples[((i % M) + M) % M];
  }

  /** Point on track at sample i with lateral offset. */
  at(i: number, lateral: number, out = new THREE.Vector3()) {
    const s = this.sample(i);
    return out.copy(s.p).addScaledVector(s.r, lateral);
  }

  /** Build the visible road, curbs, barriers, lamps. */
  build(b: Builder, opts: { barrierColor: number; lampColor: number; boostPads?: { at: number; lateral: number }[] }) {
    const NS = this.samples.length;
    const W = this.width / 2;
    // Road ribbon
    const pos: number[] = [], uv: number[] = [], idx: number[] = [];
    for (let i = 0; i <= NS; i++) {
      const s = this.samples[i % NS];
      const v = (i === NS ? this.length : s.s) / 12;
      for (const side of [-1, 1]) {
        const p = s.p.clone().addScaledVector(s.r, side * W);
        pos.push(p.x, p.y + 0.02, p.z);
        uv.push(side < 0 ? 0 : 1, v);
      }
      if (i < NS) {
        const a = i * 2;
        idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    const road = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: roadTexture(), roughness: 0.55, metalness: 0.15, envMapIntensity: 1.2 }));
    road.receiveShadow = true;
    b.deco(road);
    // Underside / supports so elevated sections read as bridges
    const under = new THREE.Mesh(g.clone(), M.darkConcrete());
    under.position.y = -0.8;
    b.deco(under);

    // Curbs + barriers (instanced segments)
    const curbGeo = cachedGeo('curb', () => new THREE.BoxGeometry(1, 0.2, 1));
    const barrierGeo = cachedGeo('barrier', () => new THREE.BoxGeometry(1, 1, 1));
    const curbs: { pos: THREE.Vector3; rot: THREE.Euler; scale: THREE.Vector3 }[] = [];
    const curbs2: typeof curbs = [];
    const bars: typeof curbs = [];
    const strips: typeof curbs = [];
    for (let i = 0; i < NS; i++) {
      const s = this.samples[i], n = this.samples[(i + 1) % NS];
      const len = s.p.distanceTo(n.p) + 0.05;
      const yaw = Math.atan2(s.t.x, s.t.z);
      for (const side of [-1, 1]) {
        const c = s.p.clone().lerp(n.p, 0.5).addScaledVector(s.r, side * (W + 0.5));
        (i % 2 ? curbs : curbs2).push({ pos: c.clone().setY(c.y + 0.1), rot: new THREE.Euler(0, yaw, 0), scale: new THREE.Vector3(1, 1, len) });
        const bc = s.p.clone().lerp(n.p, 0.5).addScaledVector(s.r, side * (W + 1.6));
        bars.push({ pos: bc.clone().setY(bc.y + 0.6), rot: new THREE.Euler(0, yaw, 0), scale: new THREE.Vector3(0.5, 1.2, len) });
        strips.push({ pos: bc.clone().setY(bc.y + 1.1).addScaledVector(s.r, -side * 0.26), rot: new THREE.Euler(0, yaw, 0), scale: new THREE.Vector3(0.05, 0.12, len) });
      }
    }
    b.instanced(curbGeo, mat('curbR', { color: 0xd02020, roughness: 0.6 }), curbs, false);
    b.instanced(curbGeo, mat('curbW', { color: 0xeeeeee, roughness: 0.6 }), curbs2, false);
    b.instanced(barrierGeo, M.metal(), bars, true);
    b.instanced(barrierGeo, glowMat(opts.barrierColor, 3), strips, false);
    // Lamps
    const lampPole = cachedGeo('lampPole', () => new THREE.CylinderGeometry(0.1, 0.14, 8, 6).translate(0, 4, 0));
    const lampHead = cachedGeo('lampHead', () => new THREE.BoxGeometry(1.4, 0.2, 0.4));
    const poles: { pos: THREE.Vector3; rot: THREE.Euler }[] = [];
    const heads: { pos: THREE.Vector3; rot: THREE.Euler }[] = [];
    for (let i = 0; i < NS; i += 12) {
      const s = this.samples[i];
      const side = (i / 12) % 2 ? 1 : -1;
      const p = s.p.clone().addScaledVector(s.r, side * (W + 2.6));
      const yaw = Math.atan2(s.t.x, s.t.z);
      poles.push({ pos: p, rot: new THREE.Euler(0, yaw, 0) });
      heads.push({ pos: p.clone().setY(p.y + 8).addScaledVector(s.r, -side * 0.6), rot: new THREE.Euler(0, yaw + Math.PI / 2, 0) });
    }
    b.instanced(lampPole, M.darkMetal(), poles, false);
    b.instanced(lampHead, glowMat(opts.lampColor, 1.8), heads, false);
    // Boost pads
    for (const bp of opts.boostPads ?? []) {
      const i = Math.floor(bp.at * NS);
      const s = this.sample(i);
      const p = s.p.clone().addScaledVector(s.r, bp.lateral);
      const m = new THREE.Mesh(cachedGeo('boostPad', () => new THREE.PlaneGeometry(3.5, 6).rotateX(-Math.PI / 2)), glowMat(0x34d4ff, 2.5, 0.85));
      m.position.copy(p).setY(p.y + 0.05);
      m.rotation.y = Math.atan2(s.t.x, s.t.z);
      b.deco(m);
    }
  }
}
