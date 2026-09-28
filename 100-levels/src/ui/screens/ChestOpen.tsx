/**
 * Chest opening sequence rendered in its own small Three.js canvas:
 * shake → burst of light & particles → lid opens → reward reveal with rarity.
 */
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useProfile, ChestReward } from '../../store/profileStore';
import { Rarity, RARITY_COLOR, CHESTS } from '../../data/items';
import { Audio } from '../../audio/AudioManager';
import { Btn } from '../components/Common';
import { Particles } from '../../gfx/Particles';

export function ChestOpen({ rarity, onClose }: { rarity: Rarity; onClose: () => void }) {
  const host = useRef<HTMLDivElement>(null);
  const [reward, setReward] = useState<ChestReward | null>(null);
  const [phase, setPhase] = useState<'idle' | 'opening' | 'done'>('idle');
  const openRef = useRef<() => void>(() => {});
  const openedOnce = useRef(false);

  useEffect(() => {
    const el = host.current!;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(40, el.clientWidth / el.clientHeight, 0.1, 100);
    cam.position.set(0, 2.2, 5.5);
    cam.lookAt(0, 0.7, 0);
    const color = new THREE.Color(RARITY_COLOR[rarity]);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x202030, 1.2));
    const key = new THREE.DirectionalLight(0xffffff, 2);
    key.position.set(3, 5, 4);
    scene.add(key);
    const glow = new THREE.PointLight(color, 0, 12);
    glow.position.set(0, 1.4, 0.4);
    scene.add(glow);

    const wood = new THREE.MeshStandardMaterial({ color: 0x7a4a28, roughness: 0.7 });
    const trim = new THREE.MeshStandardMaterial({ color, metalness: 0.9, roughness: 0.25, emissive: color, emissiveIntensity: 0.4 });
    const chest = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 1.1), wood);
    base.position.y = 0.45;
    const lid = new THREE.Group();
    const lidMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.6, 20, 1, false, 0, Math.PI).rotateZ(Math.PI / 2), wood);
    lidMesh.position.z = 0.55;
    lid.add(lidMesh);
    lid.position.set(0, 0.9, -0.55);
    for (const x of [-0.62, 0.62]) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.94, 1.14), trim);
      b.position.set(x, 0.45, 0);
      chest.add(b);
      const lb = new THREE.Mesh(new THREE.CylinderGeometry(0.57, 0.57, 0.14, 20, 1, false, 0, Math.PI).rotateZ(Math.PI / 2), trim);
      lb.position.set(x, 0, 0.55);
      lid.add(lb);
    }
    const lock = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.3, 0.08), trim);
    lock.position.set(0, 0.8, 0.58);
    chest.add(base, lid, lock);
    scene.add(chest);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.9, 6, 24, 1, true).translate(0, 3, 0), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    beam.position.y = 0.8;
    scene.add(beam);
    const particles = new Particles(1500);
    particles.setViewport(el.clientHeight * renderer.getPixelRatio(), 40);
    scene.add(particles.group);

    let t = 0;
    let openT = -1;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;
      particles.camPos.copy(cam.position);
      if (openT < 0) {
        chest.rotation.y = Math.sin(t * 0.8) * 0.3;
        chest.position.y = Math.sin(t * 2) * 0.05;
        if (Math.random() < 0.1) particles.emit('magic', new THREE.Vector3(0, 0.9, 0), { count: 1, color: color.getHex(), velSpread: 1.2 });
      } else {
        openT += dt;
        if (openT < 1.2) {
          // Shake building up
          const k = openT / 1.2;
          chest.rotation.set((Math.random() - 0.5) * 0.1 * k, chest.rotation.y * 0.9, (Math.random() - 0.5) * 0.1 * k);
          glow.intensity = k * 20;
          if (Math.random() < k) particles.emit('sparks', new THREE.Vector3(0, 0.9, 0.5), { count: 2, color: color.getHex() });
        } else {
          chest.rotation.set(0, 0, 0);
          lid.rotation.x = Math.max(-2, lid.rotation.x - dt * 8);
          (beam.material as THREE.MeshBasicMaterial).opacity = Math.min(0.5, (openT - 1.2) * 1.5);
          beam.rotation.y += dt;
          glow.intensity = 40 + Math.sin(t * 6) * 8;
          if (Math.random() < 0.6) particles.emit('magic', new THREE.Vector3(0, 1, 0), { count: 2, color: color.getHex(), velSpread: 2, up: 3 });
        }
      }
      particles.update(dt);
      renderer.render(scene, cam);
    };
    raf = requestAnimationFrame(loop);
    openRef.current = () => {
      openT = 0;
      Audio.play('charge');
      setTimeout(() => {
        particles.emit('explosion', new THREE.Vector3(0, 1, 0), { count: 80, color: 0xffffff, color2: color.getHex(), velSpread: 6 });
        particles.emit('coin', new THREE.Vector3(0, 1, 0), { count: 60, velSpread: 5, up: 5 });
        Audio.play('chestOpen');
      }, 1200);
    };
    return () => {
      cancelAnimationFrame(raf);
      particles.dispose();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        const mat = m.material as THREE.Material | undefined;
        mat?.dispose?.();
      });
      renderer.dispose();
      el.removeChild(renderer.domElement);
    };
  }, [rarity]);

  const open = () => {
    if (openedOnce.current) return; // anti-duplication
    openedOnce.current = true;
    const r = useProfile.getState().openChest(rarity);
    if (!r) {
      onClose();
      return;
    }
    setPhase('opening');
    openRef.current();
    setTimeout(() => {
      setReward(r);
      setPhase('done');
    }, 1700);
  };

  const rc = RARITY_COLOR[rarity];
  return (
    <div className="screen chest-open" style={{ ['--rc' as string]: rc }}>
      <div className="rarity-banner">{CHESTS[rarity].name.toUpperCase()}</div>
      <div ref={host} className="chest-canvas" />
      {phase === 'idle' && <Btn variant="primary" size="lg" onClick={open}>Open chest</Btn>}
      {phase === 'opening' && <div className="h2 pulse">...</div>}
      {phase === 'done' && reward && (
        <div className="reveal col" style={{ alignItems: 'center', ['--rc' as string]: reward.item ? RARITY_COLOR[reward.item.rarity] : rc }}>
          {reward.item && (
            <>
              <div className="icon">{reward.item.icon}</div>
              <div className="rarity-banner">{reward.item.rarity.toUpperCase()}</div>
              <div className="h2">{reward.item.name}</div>
              {reward.duplicate && <div className="muted">Duplicate — converted to bonus coins</div>}
            </>
          )}
          <div className="coins-pill" style={{ fontSize: 22 }}>+{reward.coins} 💰</div>
          <div className="row">
            <Btn onClick={onClose}>Continue</Btn>
          </div>
        </div>
      )}
    </div>
  );
}
