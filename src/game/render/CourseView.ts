import * as THREE from 'three';
import { PhysicsConfig } from '@/config/physics';
import { SURFACES } from '@/config/surfaces';
import type { BlockDef, CourseData, DecorationDef } from '@/game/courses/types';
import { applyWorldPlanarUV, createStripeTexture } from './textures';

const STRIPE_SCALE = 0.25;

/** Construye los meshes de un curso a partir de sus datos. Sólo visual: la física vive en PhysicsWorld. */
export class CourseView {
  readonly group = new THREE.Group();
  private flag: THREE.Group;
  private flagCloth: THREE.Mesh;
  private flagLift = 0;
  private disposables: { dispose(): void }[] = [];

  constructor(private readonly course: CourseData) {
    const greenTex = this.track(createStripeTexture('#4cc35a', '#45b553'));
    const roughTex = this.track(createStripeTexture('#69b84c', '#64b048', 6));

    const mats: Record<string, THREE.Material> = {
      green: this.track(new THREE.MeshStandardMaterial({ map: greenTex, roughness: 0.92 })),
      rough: this.track(new THREE.MeshStandardMaterial({ map: roughTex, roughness: 1 })),
      wall: this.track(new THREE.MeshStandardMaterial({ color: SURFACES.wall.color, roughness: 0.55 })),
    };
    const matFor = (b: BlockDef) =>
      mats[b.surface] ?? (mats[b.surface] = this.track(new THREE.MeshStandardMaterial({ color: SURFACES[b.surface].color, roughness: 0.8 })));

    for (const b of course.surfaces) this.addBlock(b, matFor(b), true);
    for (const b of course.outOfBounds) this.addBlock(b, matFor(b), false);
    for (const b of course.walls) this.addWall(b, matFor(b));
    for (const d of course.decorations) this.addDecoration(d);
    this.addCup();
    const { flag, cloth } = this.createFlag();
    this.flag = flag;
    this.flagCloth = cloth;
  }

  private track<T extends { dispose(): void }>(o: T): T {
    this.disposables.push(o);
    return o;
  }

  private blockMatrix(b: BlockDef): THREE.Matrix4 {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(b.rotation?.x ?? 0, b.rotation?.y ?? 0, b.rotation?.z ?? 0));
    return new THREE.Matrix4().compose(new THREE.Vector3(b.center.x, b.center.y, b.center.z), q, new THREE.Vector3(1, 1, 1));
  }

  private containsHole(b: BlockDef): boolean {
    const h = this.course.hole.position;
    const r = b.rotation;
    if (r && (r.x || r.y || r.z)) return false;
    const top = b.center.y + b.size.y / 2;
    return Math.abs(top - h.y) < 1e-3 && Math.abs(h.x - b.center.x) < b.size.x / 2 && Math.abs(h.z - b.center.z) < b.size.z / 2;
  }

  private addBlock(b: BlockDef, mat: THREE.Material, receiveOnly: boolean): void {
    const m = this.blockMatrix(b);
    const geo = this.containsHole(b) ? this.holedBlockGeometry(b) : new THREE.BoxGeometry(b.size.x, b.size.y, b.size.z);
    applyWorldPlanarUV(geo, m, STRIPE_SCALE);
    const mesh = new THREE.Mesh(this.track(geo), mat);
    mesh.applyMatrix4(m);
    mesh.receiveShadow = true;
    mesh.castShadow = !receiveOnly;
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    this.group.add(mesh);
  }

  /** Bloque con un agujero cilíndrico real en la geometría visual para la copa. */
  private holedBlockGeometry(b: BlockDef): THREE.BufferGeometry {
    const hx = b.size.x / 2;
    const hz = b.size.z / 2;
    const shape = new THREE.Shape();
    shape.moveTo(-hx, -hz);
    shape.lineTo(hx, -hz);
    shape.lineTo(hx, hz);
    shape.lineTo(-hx, hz);
    shape.lineTo(-hx, -hz);
    const h = this.course.hole.position;
    const lx = h.x - b.center.x;
    const lz = h.z - b.center.z;
    const hole = new THREE.Path();
    hole.absarc(lx, -lz, PhysicsConfig.hole.radius, 0, Math.PI * 2, true);
    shape.holes.push(hole);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: b.size.y, bevelEnabled: false, curveSegments: 32 });
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, -b.size.y / 2, 0);
    return geo;
  }

  private addWall(b: BlockDef, mat: THREE.Material): void {
    const geo = this.track(new THREE.BoxGeometry(b.size.x, b.size.y, b.size.z));
    const mesh = new THREE.Mesh(geo, mat);
    mesh.applyMatrix4(this.blockMatrix(b));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    this.group.add(mesh);
  }

  private addCup(): void {
    const { radius, depth } = PhysicsConfig.hole;
    const p = this.course.hole.position;
    const inner = this.track(new THREE.MeshStandardMaterial({ color: 0x1d2a22, roughness: 1, side: THREE.BackSide }));
    const tube = new THREE.Mesh(this.track(new THREE.CylinderGeometry(radius, radius, depth, 32, 1, true)), inner);
    tube.position.set(p.x, p.y - depth / 2, p.z);
    const bottom = new THREE.Mesh(this.track(new THREE.CircleGeometry(radius, 32)), this.track(new THREE.MeshStandardMaterial({ color: 0x101814 })));
    bottom.rotation.x = -Math.PI / 2;
    bottom.position.set(p.x, p.y - depth, p.z);
    const rim = new THREE.Mesh(
      this.track(new THREE.RingGeometry(radius, radius + 0.035, 40)),
      this.track(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 })),
    );
    rim.rotation.x = -Math.PI / 2;
    rim.position.set(p.x, p.y + 0.003, p.z);
    rim.receiveShadow = true;
    this.group.add(tube, bottom, rim);
  }

  private createFlag(): { flag: THREE.Group; cloth: THREE.Mesh } {
    const p = this.course.hole.position;
    const g = new THREE.Group();
    const pole = new THREE.Mesh(
      this.track(new THREE.CylinderGeometry(0.025, 0.025, 1.9, 8)),
      this.track(new THREE.MeshStandardMaterial({ color: 0xf2f2f2, metalness: 0.3, roughness: 0.4 })),
    );
    pole.position.y = 0.95 - PhysicsConfig.hole.depth;
    pole.castShadow = true;
    const clothGeo = this.track(new THREE.PlaneGeometry(0.7, 0.42, 8, 2));
    clothGeo.translate(0.35, 0, 0);
    const cloth = new THREE.Mesh(
      clothGeo,
      this.track(new THREE.MeshStandardMaterial({ color: 0xff3b4e, roughness: 0.7, side: THREE.DoubleSide })),
    );
    cloth.position.set(0.02, 1.9 - PhysicsConfig.hole.depth - 0.24, 0);
    cloth.castShadow = true;
    g.add(pole, cloth);
    g.position.set(p.x, p.y, p.z);
    this.group.add(g);
    return { flag: g, cloth };
  }

  private addDecoration(d: DecorationDef): void {
    const s = d.scale ?? 1;
    const g = new THREE.Group();
    const leaf = (color: number) => this.track(new THREE.MeshStandardMaterial({ color, roughness: 0.9, flatShading: true }));
    switch (d.kind) {
      case 'tree': {
        const trunk = new THREE.Mesh(this.track(new THREE.CylinderGeometry(0.16, 0.22, 1.2, 7)), leaf(0x8a5a35));
        trunk.position.y = 0.6;
        const c1 = new THREE.Mesh(this.track(new THREE.ConeGeometry(1.1, 1.8, 8)), leaf(0x2f9e4f));
        c1.position.y = 1.8;
        const c2 = new THREE.Mesh(this.track(new THREE.ConeGeometry(0.8, 1.4, 8)), leaf(0x3cb85c));
        c2.position.y = 2.6;
        g.add(trunk, c1, c2);
        break;
      }
      case 'bush': {
        const b = new THREE.Mesh(this.track(new THREE.IcosahedronGeometry(0.6, 0)), leaf(0x3fae4d));
        b.position.y = 0.4;
        b.scale.set(1.3, 0.9, 1.1);
        g.add(b);
        break;
      }
      case 'rock': {
        const r = new THREE.Mesh(this.track(new THREE.DodecahedronGeometry(0.5, 0)), leaf(0x9ba3ab));
        r.position.y = 0.25;
        r.scale.set(1.3, 0.75, 1);
        g.add(r);
        break;
      }
      case 'flower': {
        const colors = [0xff6fa8, 0xffd84d, 0xffffff, 0xa77bff];
        for (let i = 0; i < 5; i++) {
          const f = new THREE.Mesh(this.track(new THREE.SphereGeometry(0.09, 6, 4)), leaf(colors[i % colors.length]!));
          const a = (i / 5) * Math.PI * 2;
          f.position.set(Math.cos(a) * 0.25, 0.12, Math.sin(a) * 0.25);
          g.add(f);
        }
        break;
      }
    }
    g.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    g.position.set(d.position.x, d.position.y, d.position.z);
    g.scale.setScalar(s);
    g.rotation.y = (d.position.x * 12.9898 + d.position.z * 78.233) % (Math.PI * 2);
    this.group.add(g);
  }

  /** Animación del banderín: ondea y se levanta cuando la bola se acerca (para no taparla). */
  update(time: number, dt: number, ballDistanceToHole: number): void {
    const target = ballDistanceToHole < 2.4 ? 1 : 0;
    this.flagLift += (target - this.flagLift) * Math.min(1, dt * 4);
    this.flag.position.y = this.course.hole.position.y + this.flagLift * 1.4;
    this.flag.visible = this.flagLift < 0.98;
    const pos = (this.flagCloth.geometry as THREE.BufferGeometry).getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      pos.setZ(i, Math.sin(time * 5 + x * 6) * 0.06 * x);
    }
    pos.needsUpdate = true;
  }

  dispose(): void {
    for (const d of this.disposables) d.dispose();
    this.disposables = [];
    this.group.clear();
  }
}
