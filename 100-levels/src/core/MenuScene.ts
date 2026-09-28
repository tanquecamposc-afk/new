/**
 * Animated 3D background for the menus: the player's character (with the
 * equipped skin & weapon) on a floating platform, a giant glowing "100"
 * portal, orbiting camera, particles and bloom.
 */
import * as THREE from 'three';
import { Engine } from './Engine';
import { CharacterModel } from '../player/CharacterModel';
import { Animator } from '../player/Animator';
import { buildWeapon } from '../combat/Weapons';
import { Particles } from '../gfx/Particles';
import { Environment, THEMES } from '../gfx/Environment';
import { cachedGeo, glowMat, M } from '../gfx/Materials';
import { getTextTexture } from '../gfx/Textures';

export class MenuScene {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  private particles = new Particles(3000);
  private env: Environment;
  private model: CharacterModel | null = null;
  private anim: Animator | null = null;
  private t = 0;
  private ring: THREE.Group;
  private shards: THREE.Mesh[] = [];
  private skin = '';
  private weapon = '';
  private emoteT = 4;
  /** Camera focus (screens like shop zoom on the character). */
  focus: 'wide' | 'character' = 'wide';

  constructor(private engine: Engine) {
    this.camera = new THREE.PerspectiveCamera(50, engine.camera.aspect, 0.1, 900);
    this.env = new Environment(this.particles, 1024);
    this.scene.add(this.env.group, this.particles.group);
    this.env.apply(this.scene, THEMES.menu, engine.envMap);

    // Floating platform
    const plat = new THREE.Mesh(cachedGeo('menuPlat', () => new THREE.CylinderGeometry(3.2, 2.2, 1.2, 40)), M.darkMetal());
    plat.position.y = -0.6;
    plat.receiveShadow = true;
    const rim = new THREE.Mesh(cachedGeo('menuRim', () => new THREE.TorusGeometry(3.2, 0.05, 8, 64).rotateX(Math.PI / 2)), glowMat(0xffc94d, 3));
    rim.position.y = 0.01;
    const under = new THREE.Mesh(cachedGeo('menuUnder', () => new THREE.ConeGeometry(2.2, 4, 32).rotateX(Math.PI)), M.darkRock());
    under.position.y = -3.2;
    this.scene.add(plat, rim, under);

    // Giant "100" portal ring behind the hero
    this.ring = new THREE.Group();
    const torus = new THREE.Mesh(new THREE.TorusGeometry(6, 0.18, 16, 100), glowMat(0xffc94d, 2.5));
    const torus2 = new THREE.Mesh(new THREE.TorusGeometry(6.6, 0.05, 8, 100), glowMat(0xff6a3d, 3));
    const disk = new THREE.Mesh(new THREE.CircleGeometry(5.9, 64), new THREE.MeshBasicMaterial({ color: 0x2a1030, transparent: true, opacity: 0.6, depthWrite: false }));
    const label = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), new THREE.MeshBasicMaterial({ map: getTextTexture('100', '#ffd060', 'rgba(0,0,0,0)', 512, '900 300px Orbitron, Arial Black, sans-serif'), transparent: true, depthWrite: false, toneMapped: false, color: new THREE.Color(2.2, 1.8, 1.2) }));
    label.position.z = 0.1;
    this.ring.add(disk, torus, torus2, label);
    this.ring.position.set(0, 6, -9);
    this.scene.add(this.ring);

    // Orbiting shards (the 10 worlds)
    const colors = [0x34d4ff, 0xb48cff, 0xff6a3d, 0xffd23d, 0xc23b3b, 0x3dffa2, 0xff3d9a, 0x7bd24a, 0xff9a1f, 0xff2d55];
    colors.forEach((c) => {
      const m = new THREE.Mesh(cachedGeo('shard', () => new THREE.OctahedronGeometry(0.35, 0)), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 2.5, roughness: 0.2, metalness: 0.5 }));
      this.shards.push(m);
      this.scene.add(m);
    });

    // Distant floating islands
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const r = 25 + Math.random() * 30;
      const s = 1 + Math.random() * 3;
      const isl = new THREE.Mesh(cachedGeo('menuIsland', () => new THREE.ConeGeometry(1, 2, 7).rotateX(Math.PI)), M.darkRock());
      isl.scale.set(s * 2, s, s * 2);
      isl.position.set(Math.cos(a) * r, -4 + Math.random() * 14, Math.sin(a) * r - 10);
      const top = new THREE.Mesh(cachedGeo('menuIslandTop', () => new THREE.CylinderGeometry(1, 1, 0.2, 7)), M.grass());
      top.position.y = 1;
      isl.add(top);
      this.scene.add(isl);
    }
    const key = new THREE.SpotLight(0xffe0c0, 60, 30, 0.5, 0.6);
    key.position.set(4, 8, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    this.scene.add(key, key.target);
    const rimL = new THREE.PointLight(0x6070ff, 25, 20);
    rimL.position.set(-4, 3, -3);
    this.scene.add(rimL);
  }

  setCharacter(skin: string, weapon: string) {
    if (skin === this.skin && weapon === this.weapon && this.model) return;
    const newSkin = skin !== this.skin;
    this.skin = skin;
    this.weapon = weapon;
    if (!this.model || newSkin) {
      this.model?.dispose();
      this.model = new CharacterModel(skin);
      this.anim = new Animator(this.model);
      this.scene.add(this.model.root);
      this.model.root.rotation.y = 0.35;
      this.particles.emit('magic', new THREE.Vector3(0, 1, 0), { count: 60, velSpread: 4, color: 0xffc94d });
    }
    const w = buildWeapon(weapon);
    this.model.setWeapon(w.right, w.left);
  }

  activate() {
    this.engine.setScene(this.scene, this.camera);
    this.engine.post.resetTransient();
    this.engine.post.setGrade(THEMES.menu.grade);
    this.engine.renderer.toneMappingExposure = 1;
    this.particles.setViewport(this.engine.viewportHeight, this.camera.fov);
  }

  update(dt: number) {
    this.t += dt;
    const t = this.t;
    // Camera orbit
    const wide = this.focus === 'wide';
    const r = wide ? 11 : 5.2;
    const a = wide ? Math.sin(t * 0.08) * 0.5 + 0.2 : 0.25 + Math.sin(t * 0.2) * 0.1;
    const target = new THREE.Vector3(Math.sin(a) * r, wide ? 3.2 : 1.6, Math.cos(a) * r);
    this.camera.position.lerp(target, Math.min(1, dt * 1.5));
    const look = new THREE.Vector3(wide ? 1.5 : -0.9, wide ? 2.6 : 1.1, 0);
    this.camera.lookAt(look);
    this.ring.rotation.z = Math.sin(t * 0.3) * 0.05;
    this.ring.children[1].rotation.z = t * 0.3;
    this.ring.children[2].rotation.z = -t * 0.2;
    this.shards.forEach((s, i) => {
      const ang = t * 0.3 + (i / this.shards.length) * Math.PI * 2;
      s.position.set(Math.cos(ang) * 4.5, 1.5 + Math.sin(t + i) * 0.5, Math.sin(ang) * 4.5);
      s.rotation.y += dt * 2;
      s.rotation.x += dt;
    });
    if (this.model && this.anim) {
      this.emoteT -= dt;
      if (this.emoteT <= 0) {
        this.emoteT = 6 + Math.random() * 4;
        const acts = ['slash1', 'spin', 'victory', 'slash3'];
        const act = acts[Math.floor(Math.random() * acts.length)];
        this.anim.play(act, 0.9);
        if (act === 'victory') setTimeout(() => this.anim?.release('victory'), 1800);
      }
      this.anim.update(dt, { speed: 0, grounded: true, vy: 0, crouch: false, sprint: false });
      this.model.updateCloth(t, 0.5, 0);
    }
    this.env.update(dt, t, new THREE.Vector3(), this.camera.position);
    this.particles.camPos.copy(this.camera.position);
    this.particles.update(dt);
  }
}
