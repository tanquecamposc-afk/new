/**
 * Pooled transient visual effects: slash arcs, shockwave rings, telegraph
 * decals, ribbon trails and a fixed pool of dynamic flash lights (a fixed light
 * count avoids shader recompiles).
 */
import * as THREE from 'three';
import { cachedGeo } from './Materials';

interface Transient {
  mesh: THREE.Mesh;
  t: number;
  dur: number;
  active: boolean;
  update: (k: number, tr: Transient) => void;
}

const ringGeo = () => cachedGeo('fxRing', () => {
  const g = new THREE.RingGeometry(0.92, 1, 64);
  g.rotateX(-Math.PI / 2);
  return g;
});
const diskGeo = () => cachedGeo('fxDisk', () => {
  const g = new THREE.CircleGeometry(1, 48);
  g.rotateX(-Math.PI / 2);
  return g;
});
const slashGeo = () => cachedGeo('fxSlash', () => {
  const g = new THREE.RingGeometry(0.55, 1, 32, 1, -1.3, 2.6);
  // Fade alpha towards the ends of the arc using vertex colours
  const pos = g.attributes.position as THREE.BufferAttribute;
  const cols = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const a = Math.atan2(pos.getY(i), pos.getX(i));
    const k = Math.max(0, 1 - Math.abs(a) / 1.3);
    const r = Math.hypot(pos.getX(i), pos.getY(i));
    const edge = (r - 0.55) / 0.45;
    const v = k * (0.3 + edge * 0.7);
    cols[i * 3] = cols[i * 3 + 1] = cols[i * 3 + 2] = v;
  }
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  g.rotateX(-Math.PI / 2);
  return g;
});
const rectGeo = () => cachedGeo('fxRect', () => {
  const g = new THREE.PlaneGeometry(1, 1);
  g.rotateX(-Math.PI / 2);
  g.translate(0, 0, 0.5);
  return g;
});

export class Effects {
  readonly group = new THREE.Group();
  private pool: Transient[] = [];
  private lights: { l: THREE.PointLight; t: number; dur: number; i0: number }[] = [];
  private trails: Trail[] = [];

  constructor(lightCount = 4) {
    for (let i = 0; i < lightCount; i++) {
      const l = new THREE.PointLight(0xffffff, 0, 14, 2);
      l.castShadow = false;
      this.group.add(l);
      this.lights.push({ l, t: 0, dur: 0, i0: 0 });
    }
  }

  private get(geo: THREE.BufferGeometry, vertexColors = false): Transient {
    let tr = this.pool.find((p) => !p.active && p.mesh.geometry === geo);
    if (!tr) {
      const m = new THREE.MeshBasicMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
        toneMapped: false, vertexColors,
      });
      const mesh = new THREE.Mesh(geo, m);
      mesh.renderOrder = 8;
      tr = { mesh, t: 0, dur: 1, active: false, update: () => {} };
      this.pool.push(tr);
      this.group.add(mesh);
    }
    tr.active = true;
    tr.t = 0;
    tr.mesh.visible = true;
    tr.mesh.rotation.set(0, 0, 0);
    tr.mesh.scale.set(1, 1, 1);
    return tr;
  }

  /** Curved weapon slash in front of an attacker. */
  slash(pos: THREE.Vector3, yaw: number, radius: number, color: THREE.ColorRepresentation, tilt = 0, dur = 0.22) {
    const tr = this.get(slashGeo(), true);
    const m = tr.mesh.material as THREE.MeshBasicMaterial;
    m.color.set(color).multiplyScalar(2.2);
    tr.mesh.position.copy(pos);
    tr.mesh.rotation.set(tilt, yaw - Math.PI / 2, 0, 'YXZ');
    tr.dur = dur;
    tr.update = (k, t) => {
      const s = radius * (0.75 + k * 0.35);
      t.mesh.scale.set(s, s, s);
      m.opacity = (1 - k) * 0.95;
    };
  }

  /** Expanding ring on the ground. */
  shockwave(pos: THREE.Vector3, maxR: number, color: THREE.ColorRepresentation, dur = 0.6) {
    const tr = this.get(ringGeo());
    const m = tr.mesh.material as THREE.MeshBasicMaterial;
    m.color.set(color).multiplyScalar(2);
    tr.mesh.position.copy(pos).setY(pos.y + 0.06);
    tr.dur = dur;
    tr.update = (k, t) => {
      const s = 0.3 + maxR * k;
      t.mesh.scale.set(s, 1, s);
      m.opacity = 1 - k;
    };
  }

  /** Ground telegraph for incoming attacks: a filling circle. */
  telegraph(pos: THREE.Vector3, r: number, dur: number, color: THREE.ColorRepresentation = 0xff3020) {
    const ring = this.get(ringGeo());
    const rm = ring.mesh.material as THREE.MeshBasicMaterial;
    rm.color.set(color).multiplyScalar(1.6);
    ring.mesh.position.copy(pos).setY(pos.y + 0.05);
    ring.mesh.scale.set(r, 1, r);
    ring.dur = dur;
    ring.update = (k) => { rm.opacity = 0.6 + Math.sin(k * 30) * 0.3; };
    const fill = this.get(diskGeo());
    const fm = fill.mesh.material as THREE.MeshBasicMaterial;
    fm.color.set(color);
    fill.mesh.position.copy(pos).setY(pos.y + 0.04);
    fill.dur = dur;
    fill.update = (k, t) => {
      const s = Math.max(0.01, r * k);
      t.mesh.scale.set(s, 1, s);
      fm.opacity = 0.35;
    };
  }

  /** Rectangular telegraph (charges, beams). */
  telegraphLine(from: THREE.Vector3, yaw: number, length: number, width: number, dur: number, color: THREE.ColorRepresentation = 0xff3020) {
    const tr = this.get(rectGeo());
    const m = tr.mesh.material as THREE.MeshBasicMaterial;
    m.color.set(color);
    tr.mesh.position.copy(from).setY(from.y + 0.05);
    tr.mesh.rotation.y = yaw;
    tr.dur = dur;
    tr.update = (k, t) => {
      t.mesh.scale.set(width, 1, length * Math.min(1, k * 1.5));
      m.opacity = 0.25 + 0.2 * Math.sin(k * 25);
    };
  }

  /** Flash a pooled point light. */
  flash(pos: THREE.Vector3, color: THREE.ColorRepresentation, intensity = 30, dur = 0.25, dist = 14) {
    let best = this.lights[0];
    for (const l of this.lights) if (l.t >= l.dur) { best = l; break; } else if (l.dur - l.t < best.dur - best.t) best = l;
    best.l.position.copy(pos);
    best.l.color.set(color);
    best.l.distance = dist;
    best.i0 = intensity;
    best.t = 0;
    best.dur = dur;
    best.l.intensity = intensity;
  }

  addTrail(t: Trail) {
    this.trails.push(t);
    this.group.add(t.mesh);
  }
  removeTrail(t: Trail) {
    this.trails = this.trails.filter((x) => x !== t);
    this.group.remove(t.mesh);
    t.dispose();
  }

  update(dt: number) {
    for (const tr of this.pool) {
      if (!tr.active) continue;
      tr.t += dt;
      const k = Math.min(1, tr.t / tr.dur);
      tr.update(k, tr);
      if (tr.t >= tr.dur) {
        tr.active = false;
        tr.mesh.visible = false;
      }
    }
    for (const l of this.lights) {
      if (l.t < l.dur) {
        l.t += dt;
        l.l.intensity = l.i0 * Math.max(0, 1 - l.t / l.dur);
      } else l.l.intensity = 0;
    }
    for (const t of this.trails) t.update();
  }

  clear() {
    for (const tr of this.pool) {
      tr.active = false;
      tr.mesh.visible = false;
    }
    for (const l of this.lights) {
      l.t = l.dur = 0;
      l.l.intensity = 0;
    }
  }

  dispose() {
    for (const tr of this.pool) (tr.mesh.material as THREE.Material).dispose();
    for (const t of this.trails) t.dispose();
    this.pool = [];
    this.trails = [];
  }
}

/** Camera-independent ribbon trail following a target object. */
export class Trail {
  readonly mesh: THREE.Mesh;
  private points: THREE.Vector3[] = [];
  private geo: THREE.BufferGeometry;
  private pos: Float32Array;
  private col: Float32Array;
  private color: THREE.Color;
  private rainbow: boolean;
  private hue = 0;
  enabled = true;

  constructor(private target: THREE.Object3D, color: THREE.ColorRepresentation, private width = 0.35, private length = 24, private offsetY = 0.9) {
    this.color = new THREE.Color(color);
    this.rainbow = color === 'rainbow';
    this.pos = new Float32Array(length * 2 * 3);
    this.col = new Float32Array(length * 2 * 3);
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    const idx: number[] = [];
    for (let i = 0; i < length - 1; i++) {
      const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
      idx.push(a, b, c, b, d, c);
    }
    this.geo.setIndex(idx);
    this.geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
    this.mesh = new THREE.Mesh(
      this.geo,
      new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }),
    );
    this.mesh.frustumCulled = false;
  }

  update() {
    const p = new THREE.Vector3();
    this.target.getWorldPosition(p);
    p.y += this.offsetY;
    const last = this.points[0];
    if (!this.enabled) {
      if (this.points.length) this.points.pop();
    } else if (!last || last.distanceToSquared(p) > 0.01) {
      this.points.unshift(p);
      if (this.points.length > this.length) this.points.pop();
    } else if (this.points.length > 2) {
      this.points.pop();
    }
    const n = this.points.length;
    this.hue = (this.hue + 0.01) % 1;
    const c = new THREE.Color();
    for (let i = 0; i < this.length; i++) {
      const q = this.points[Math.min(i, n - 1)] ?? p;
      const k = n > 1 ? 1 - i / (this.length - 1) : 0;
      const w = this.width * k;
      const i6 = i * 6;
      this.pos[i6] = q.x; this.pos[i6 + 1] = q.y + w; this.pos[i6 + 2] = q.z;
      this.pos[i6 + 3] = q.x; this.pos[i6 + 4] = q.y - w; this.pos[i6 + 5] = q.z;
      if (this.rainbow) c.setHSL((this.hue + i / this.length) % 1, 1, 0.55);
      else c.copy(this.color);
      const a = i < n ? k * k * 1.5 : 0;
      this.col[i6] = this.col[i6 + 3] = c.r * a;
      this.col[i6 + 1] = this.col[i6 + 4] = c.g * a;
      this.col[i6 + 2] = this.col[i6 + 5] = c.b * a;
    }
    (this.geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.geo.attributes.color as THREE.BufferAttribute).needsUpdate = true;
  }

  dispose() {
    this.geo.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
