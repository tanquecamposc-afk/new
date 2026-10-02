import * as THREE from 'three';

/** Etiqueta de nombre sobre una bola (sprite con textura de canvas: 1 draw call, sin DOM). */
export class NameLabel {
  readonly sprite: THREE.Sprite;
  private readonly texture: THREE.CanvasTexture;

  constructor(name: string, color: number, isBot: boolean) {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 64;
    const g = c.getContext('2d')!;
    const text = isBot ? `${name} · BOT` : name;
    g.font = 'bold 30px system-ui, sans-serif';
    const w = Math.min(248, g.measureText(text).width + 40);
    const x = (256 - w) / 2;
    g.fillStyle = 'rgba(19,33,61,0.78)';
    g.beginPath();
    g.roundRect(x, 8, w, 48, 22);
    g.fill();
    g.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
    g.beginPath();
    g.arc(x + 22, 32, 9, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#ffffff';
    g.textBaseline = 'middle';
    g.fillText(text, x + 38, 33, w - 46);
    this.texture = new THREE.CanvasTexture(c);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.texture, depthTest: false, transparent: true }));
    this.sprite.scale.set(1.6, 0.4, 1);
    this.sprite.renderOrder = 20;
  }

  dispose(): void {
    this.texture.dispose();
    this.sprite.material.dispose();
  }
}
