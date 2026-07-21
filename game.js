const MathUtils = {
    lerp: (start, end, amt) => (1 - amt) * start + amt * end,
    randomRange: (min, max) => Math.random() * (max - min) + min,
    clamp: (v, min, max) => Math.max(min, Math.min(max, v))
};

// localStorage puede estar bloqueado en iframes sandbox; degradar a memoria
const SafeStorage = {
    _mem: {},
    get(key) {
        try { return localStorage.getItem(key); } catch (e) { return this._mem[key] || null; }
    },
    set(key, value) {
        try { localStorage.setItem(key, value); } catch (e) { this._mem[key] = value; }
    }
};

function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function lerpColor(hex1, hex2, t) {
    const a = hexToRgb(hex1), b = hexToRgb(hex2);
    return 'rgb(' + Math.round(MathUtils.lerp(a[0], b[0], t)) + ',' +
        Math.round(MathUtils.lerp(a[1], b[1], t)) + ',' +
        Math.round(MathUtils.lerp(a[2], b[2], t)) + ')';
}
// Pseudo-aleatorio determinista para decorar la escena sin parpadeos
function seeded(i) {
    const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
}
function roundRectPath(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}
// Relleno + trazo del mismo color con lineJoin redondeado = esquinas suaves estilo flat
function flatPath(ctx, color, lw, pathFn) {
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    pathFn();
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
}

const SURFACE_Y = 150;
const HOOK_REST_Y = 198;

// El agua pasa de azul a violeta profundo, como en el juego original
const WATER_STOPS = [
    { d: 0, c: '#4a90d9' },
    { d: 500, c: '#6a62d8' },
    { d: 1000, c: '#7b4fc8' },
    { d: 1600, c: '#5b2e9e' },
    { d: 2400, c: '#3b1b6e' },
    { d: 3400, c: '#200d45' },
    { d: 5000, c: '#0f0524' }
];
function waterColorAt(depth) {
    if (depth <= WATER_STOPS[0].d) return WATER_STOPS[0].c;
    for (let i = 1; i < WATER_STOPS.length; i++) {
        if (depth <= WATER_STOPS[i].d) {
            const a = WATER_STOPS[i - 1], b = WATER_STOPS[i];
            return lerpColor(a.c, b.c, (depth - a.d) / (b.d - a.d));
        }
    }
    return WATER_STOPS[WATER_STOPS.length - 1].c;
}

// Especies ordenadas por profundidad mínima. body/belly = colores planos.
const SPECIES = [
    { key: 'pececillo', name: 'Pececillo', minDepth: 0,    w: 28, h: 18, value: 1,  shape: 'fish',   body: '#ffd93c', belly: '#fff3b0' },
    { key: 'azulita',   name: 'Azulita',   minDepth: 0,    w: 42, h: 27, value: 2,  shape: 'fish',   body: '#4ecdc4', belly: '#b8f0ea' },
    { key: 'rosada',    name: 'Rosada',    minDepth: 350,  w: 46, h: 31, value: 5,  shape: 'fish',   body: '#ff6b8a', belly: '#ffc1ce' },
    { key: 'rayada',    name: 'Rayada',    minDepth: 750,  w: 50, h: 33, value: 9,  shape: 'fish',   body: '#ff8a5c', belly: '#ffd9c4', stripe: '#ffffff' },
    { key: 'globo',     name: 'Pez Globo', minDepth: 1150, w: 44, h: 42, value: 15, shape: 'globo',  body: '#b084f5', belly: '#dcc8ff' },
    { key: 'medusa',    name: 'Medusa',    minDepth: 1600, w: 46, h: 50, value: 24, shape: 'medusa', body: '#ff9ecf', belly: '#ffd3e8' },
    { key: 'espada',    name: 'Pez Espada', minDepth: 2100, w: 68, h: 27, value: 38, shape: 'fish',  body: '#6fa8dc', belly: '#cfe2f3', nose: true },
    { key: 'abisal',    name: 'Abisal',    minDepth: 2700, w: 54, h: 40, value: 60, shape: 'angler', body: '#3d3a5c', belly: '#57527e' }
];

class Fish {
    constructor(worldW, depth, species, golden) {
        this.species = species;
        this.golden = golden;
        this.width = species.w * (golden ? 1.15 : 1);
        this.height = species.h * (golden ? 1.15 : 1);
        this.x = MathUtils.randomRange(0, worldW - this.width);
        this.baseY = depth;
        this.y = depth;
        const speed = MathUtils.randomRange(35, 95) * (species.shape === 'medusa' ? 0.5 : 1);
        this.speed = Math.random() < 0.5 ? -speed : speed;
        this.value = Math.ceil(species.value * (1 + depth / 350)) * (golden ? 5 : 1);
        this.wobblePhase = MathUtils.randomRange(0, Math.PI * 2);
        this.caught = false;
    }

    update(deltaSec, worldW, time) {
        if (this.caught) return;
        this.x += this.speed * deltaSec;
        if (this.speed > 0 && this.x > worldW) this.x = -this.width;
        else if (this.speed < 0 && this.x + this.width < 0) this.x = worldW;
        const amp = this.species.shape === 'medusa' ? 16 : 7;
        this.y = this.baseY + Math.sin(time * 1.1 + this.wobblePhase) * amp;
    }
}

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        this.saveData = JSON.parse(SafeStorage.get('tinyFishingSave')) || {
            money: 0, lastPlayed: Date.now(),
            stats: { fish: 1, depth: 1, offline: 1, speed: 1 }
        };
        this.saveData.stats = Object.assign({ fish: 1, depth: 1, offline: 1, speed: 1 }, this.saveData.stats);

        this.state = 'MENU';
        this.hook = { x: 0, targetX: 0, y: HOOK_REST_Y, width: 26, height: 36, fishes: [] };
        this.fishes = [];
        this.chest = null;
        this.bubbles = [];
        this.particles = [];
        this.coins = [];
        this.worldTexts = [];
        this.maxDepth = this.computeMaxDepth();
        this.cameraY = 0;
        this.time = 0;
        this.lastTime = performance.now();

        this.init();
    }

    computeMaxDepth() { return 400 + this.saveData.stats.depth * 200; }
    capacity() { return this.saveData.stats.fish + 1; }
    hookSpeed() { return 300 * (1 + 0.15 * (this.saveData.stats.speed - 1)); }
    restX() { return this.w / 2 - 36 - this.hook.width / 2; }

    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.bindInput();
        this.hook.x = this.restX();
        this.hook.targetX = this.hook.x;
        this.collectOfflineEarnings();
        this.updateUI();
        requestAnimationFrame((t) => this.loop(t));
    }

    resize() {
        const dpr = window.devicePixelRatio || 1;
        this.dpr = dpr;
        this.w = this.canvas.parentElement.clientWidth;
        this.h = this.canvas.parentElement.clientHeight;
        this.canvas.width = this.w * dpr;
        this.canvas.height = this.h * dpr;

        // Decoración determinista de la orilla
        this.trees = [];
        let i = 0;
        for (let x = -14; x < this.w + 20; x += 34 + seeded(i) * 30, i++) {
            this.trees.push({
                x, kind: seeded(i * 3 + 1) < 0.42 ? 'pine' : 'bush',
                size: 0.75 + seeded(i * 7 + 2) * 0.5,
                tint: Math.floor(seeded(i * 13 + 3) * 3)
            });
        }
        this.clouds = [];
        for (let c = 0; c < 3; c++) {
            this.clouds.push({
                x: seeded(c * 31 + 5) * this.w, y: 22 + seeded(c * 17 + 8) * 46,
                s: 0.7 + seeded(c * 11 + 4) * 0.6, v: 6 + seeded(c * 23 + 9) * 6
            });
        }
        this.leaves = [];
        for (let l = 0; l < 8; l++) {
            this.leaves.push({
                x: seeded(l * 19 + 6) * this.w, y: seeded(l * 29 + 7) * SURFACE_Y,
                vy: 14 + seeded(l * 37 + 2) * 18, phase: seeded(l * 41 + 1) * Math.PI * 2,
                tint: Math.floor(seeded(l * 43 + 5) * 3)
            });
        }
    }

    bindInput() {
        document.getElementById('btn-play').addEventListener('click', () => {
            if (this.state === 'MENU') this.startCast();
        });

        const handleMove = (e) => {
            if (this.state !== 'REELING' && this.state !== 'SINKING') return;
            const rect = this.canvas.getBoundingClientRect();
            let clientX = e.clientX || (e.touches && e.touches[0].clientX);
            this.hook.targetX = clientX - rect.left - (this.hook.width / 2);
            this.hook.targetX = MathUtils.clamp(this.hook.targetX, 0, this.w - this.hook.width);
        };

        this.canvas.addEventListener('mousemove', handleMove);
        this.canvas.addEventListener('touchmove', handleMove, { passive: true });
        this.canvas.addEventListener('touchstart', handleMove, { passive: true });
    }

    collectOfflineEarnings() {
        const elapsedMin = (Date.now() - this.saveData.lastPlayed) / 60000;
        if (elapsedMin < 1) return;
        const cappedMin = Math.min(elapsedMin, 720); // máximo 12 horas acumulables
        const earned = Math.floor(cappedMin * this.saveData.stats.offline * 0.6);
        if (earned > 0) {
            this.saveData.money += earned;
            this.showFloatingText('Offline +$' + earned);
            this.save();
        }
    }

    save() {
        this.saveData.lastPlayed = Date.now();
        SafeStorage.set('tinyFishingSave', JSON.stringify(this.saveData));
        this.updateUI();
    }

    updateUI() {
        document.getElementById('cash').innerText = Math.floor(this.saveData.money);

        const upgrades = [
            { stat: 'fish',    lvl: 'lvl-fish',    btn: 'btn-upg-fish' },
            { stat: 'depth',   lvl: 'lvl-depth',   btn: 'btn-upg-depth' },
            { stat: 'offline', lvl: 'lvl-offline', btn: 'btn-upg-offline' },
            { stat: 'speed',   lvl: 'lvl-speed',   btn: 'btn-upg-speed' }
        ];

        for (const upg of upgrades) {
            const level = this.saveData.stats[upg.stat];
            const cost = Math.floor(8 * Math.pow(1.4, level));
            document.getElementById(upg.lvl).innerText = level;

            const btn = document.getElementById(upg.btn);
            btn.innerText = '$' + cost;
            btn.disabled = this.saveData.money < cost;
            // onclick (y no addEventListener) para no acumular listeners en cada refresco
            btn.onclick = () => {
                if (this.saveData.money < cost) return;
                this.saveData.money -= cost;
                this.saveData.stats[upg.stat]++;
                if (upg.stat === 'depth') {
                    const before = this.maxDepth;
                    this.maxDepth = this.computeMaxDepth();
                    const unlocked = SPECIES.find(s => s.minDepth > before - 40 && s.minDepth <= this.maxDepth - 40);
                    if (unlocked) this.showFloatingText('¡Nuevo pez: ' + unlocked.name + '!');
                }
                this.save();
            };
        }
    }

    startCast() {
        this.state = 'SINKING';
        document.getElementById('upgrade-menu').style.display = 'none';
        this.hook.fishes = [];
        this.maxDepth = this.computeMaxDepth();

        this.fishes = [];
        const count = Math.min(14 + this.saveData.stats.depth * 5, 110);
        for (let i = 0; i < count; i++) {
            const depth = MathUtils.randomRange(240, this.maxDepth - 40);
            const eligible = SPECIES.filter(s => depth >= s.minDepth);
            // Sesgo hacia las especies más profundas de la zona
            const species = eligible[Math.floor(Math.pow(Math.random(), 0.5) * eligible.length)];
            const golden = Math.random() < 0.08;
            this.fishes.push(new Fish(this.w, depth, species, golden));
        }

        // Cofre del tesoro cerca del fondo (bonus, no ocupa capacidad)
        this.chest = null;
        if (Math.random() < 0.65) {
            this.chest = {
                x: MathUtils.randomRange(20, this.w - 56),
                y: MathUtils.randomRange(this.maxDepth * 0.6, this.maxDepth - 70),
                width: 36, height: 28, caught: false,
                value: Math.floor(12 + this.saveData.stats.depth * 9)
            };
        }
    }

    catchFish(fish) {
        fish.caught = true;
        this.hook.fishes.push(fish);
        this.worldTexts.push({
            x: fish.x + fish.width / 2, y: fish.y, life: 1,
            text: '+$' + fish.value, color: fish.golden ? '#ffd93c' : '#ffffff'
        });
        for (let i = 0; i < 8; i++) {
            this.particles.push({
                x: fish.x + fish.width / 2, y: fish.y + fish.height / 2,
                vx: MathUtils.randomRange(-70, 70), vy: MathUtils.randomRange(-90, 20),
                r: MathUtils.randomRange(1.5, 3.5), life: 1,
                color: fish.golden ? '255,217,60' : '255,255,255'
            });
        }
    }

    update(dt) {
        const deltaSec = dt / 1000;
        this.time += deltaSec;
        const speed = this.hookSpeed();

        if (this.state === 'SINKING') {
            this.hook.y += speed * 1.25 * deltaSec;
            this.hook.x = MathUtils.lerp(this.hook.x, this.hook.targetX, 12 * deltaSec);
            if (this.hook.y >= this.maxDepth) this.state = 'REELING';

        } else if (this.state === 'REELING') {
            this.hook.y -= speed * deltaSec;
            this.hook.x = MathUtils.lerp(this.hook.x, this.hook.targetX, 12 * deltaSec);

            // Colisión AABB anzuelo vs peces libres, respetando la capacidad máxima
            for (const fish of this.fishes) {
                if (fish.caught) continue;
                if (this.hook.fishes.length >= this.capacity()) break;
                const hit = this.hook.x < fish.x + fish.width &&
                            this.hook.x + this.hook.width > fish.x &&
                            this.hook.y < fish.y + fish.height &&
                            this.hook.y + this.hook.height > fish.y;
                if (hit) this.catchFish(fish);
            }

            // El cofre no ocupa capacidad
            if (this.chest && !this.chest.caught) {
                const c = this.chest;
                const hit = this.hook.x < c.x + c.width &&
                            this.hook.x + this.hook.width > c.x &&
                            this.hook.y < c.y + c.height &&
                            this.hook.y + this.hook.height > c.y;
                if (hit) {
                    c.caught = true;
                    this.worldTexts.push({ x: c.x + c.width / 2, y: c.y, life: 1, text: '+$' + c.value, color: '#ffd93c' });
                    for (let i = 0; i < 10; i++) {
                        this.particles.push({
                            x: c.x + c.width / 2, y: c.y + c.height / 2,
                            vx: MathUtils.randomRange(-80, 80), vy: MathUtils.randomRange(-100, 10),
                            r: MathUtils.randomRange(2, 4), life: 1, color: '255,217,60'
                        });
                    }
                }
            }

            if (this.hook.y <= HOOK_REST_Y) this.endFishing();

        } else { // MENU: el anzuelo cuelga y se mece bajo la caña
            this.hook.x = MathUtils.lerp(this.hook.x, this.restX(), 5 * deltaSec);
            this.hook.y = MathUtils.lerp(this.hook.y, HOOK_REST_Y + Math.sin(this.time * 1.8) * 3, 5 * deltaSec);
        }

        for (const fish of this.fishes) fish.update(deltaSec, this.w, this.time);

        // Los capturados cuelgan del centro del anzuelo (con leve escalonado para verlos)
        this.hook.fishes.forEach((fish, i) => {
            fish.x = this.hook.x + this.hook.width / 2 - fish.width / 2;
            fish.y = this.hook.y + this.hook.height / 2 - fish.height / 2 + i * 7;
        });
        if (this.chest && this.chest.caught) {
            this.chest.x = this.hook.x + this.hook.width / 2 - this.chest.width / 2;
            this.chest.y = this.hook.y + this.hook.height * 0.6 + this.hook.fishes.length * 7;
        }

        // Hojas cayendo en la escena de la orilla
        for (const leaf of this.leaves) {
            leaf.y += leaf.vy * deltaSec;
            leaf.x += Math.sin(this.time * 2 + leaf.phase) * 18 * deltaSec;
            if (leaf.y > SURFACE_Y - 2) { leaf.y = -6; leaf.x = Math.random() * this.w; }
        }
        for (const c of this.clouds) {
            c.x += c.v * deltaSec;
            if (c.x - 70 * c.s > this.w) c.x = -70 * c.s;
        }

        // Burbujas cerca del anzuelo mientras se pesca
        if (this.state !== 'MENU' && Math.random() < deltaSec * 4) {
            this.bubbles.push({
                x: this.hook.x + MathUtils.randomRange(-25, 25),
                y: this.hook.y + MathUtils.randomRange(-10, 30),
                r: MathUtils.randomRange(1.5, 4),
                vy: MathUtils.randomRange(35, 75),
                phase: MathUtils.randomRange(0, Math.PI * 2)
            });
        }
        this.bubbles = this.bubbles.filter(b => {
            b.y -= b.vy * deltaSec;
            b.x += Math.sin(this.time * 3 + b.phase) * 12 * deltaSec;
            return b.y > SURFACE_Y + 6;
        });

        this.particles = this.particles.filter(p => {
            p.x += p.vx * deltaSec;
            p.y += p.vy * deltaSec;
            p.life -= deltaSec * 1.6;
            return p.life > 0;
        });

        // Monedas que saltan del bote al cobrar
        this.coins = this.coins.filter(c => {
            c.vy += 420 * deltaSec;
            c.x += c.vx * deltaSec;
            c.y += c.vy * deltaSec;
            c.life -= deltaSec;
            return c.life > 0;
        });

        this.worldTexts = this.worldTexts.filter(t => {
            t.y -= 32 * deltaSec;
            t.life -= deltaSec * 0.85;
            return t.life > 0;
        });
    }

    endFishing() {
        this.state = 'MENU';
        document.getElementById('upgrade-menu').style.display = '';

        let earned = 0;
        for (const fish of this.hook.fishes) earned += fish.value;
        if (this.chest && this.chest.caught) earned += this.chest.value;

        if (earned > 0) {
            this.saveData.money += earned;
            this.showFloatingText('+$' + earned);
            const n = Math.min(16, 5 + this.hook.fishes.length * 3);
            for (let i = 0; i < n; i++) {
                this.coins.push({
                    x: this.w / 2 + MathUtils.randomRange(-30, 30),
                    y: SURFACE_Y - 22,
                    vx: MathUtils.randomRange(-90, 90),
                    vy: MathUtils.randomRange(-270, -130),
                    life: MathUtils.randomRange(0.7, 1.1)
                });
            }
        }
        this.hook.fishes = [];
        this.fishes = [];
        this.chest = null;
        this.hook.targetX = this.restX();

        this.save();
    }

    showFloatingText(text) {
        const container = document.getElementById('floating-text-container');
        const el = document.createElement('div');
        el.innerText = text;
        el.style.cssText =
            'position:absolute; left:50%; top:30%; transform:translate(-50%,0);' +
            'font-size:28px; font-weight:800; color:#ffd93c; white-space:nowrap;' +
            'text-shadow:0 3px 0 rgba(0,0,0,0.35); pointer-events:none;' +
            'transition:transform 1.2s ease-out, opacity 1.2s ease-out; opacity:1;';
        container.appendChild(el);
        requestAnimationFrame(() => {
            el.style.transform = 'translate(-50%,-80px)';
            el.style.opacity = '0';
        });
        setTimeout(() => el.remove(), 1300);
    }

    // ==================== Dibujo ====================

    drawBackground(ctx) {
        const visTop = -this.cameraY;
        const visBottom = visTop + this.h;

        // Agua: azul → violeta según profundidad visible
        const grad = ctx.createLinearGradient(0, visTop, 0, visBottom);
        grad.addColorStop(0, waterColorAt(Math.max(0, visTop)));
        grad.addColorStop(1, waterColorAt(visBottom));
        ctx.fillStyle = grad;
        ctx.fillRect(0, visTop, this.w, this.h);

        // Marcadores de profundidad al lado derecho (cada 25 m)
        ctx.font = 'bold 13px "Arial Rounded MT Bold", "Trebuchet MS", sans-serif';
        ctx.textAlign = 'right';
        for (let d = 250; d <= this.maxDepth - SURFACE_Y + 250; d += 250) {
            const wy = SURFACE_Y + d;
            if (wy < visTop - 20 || wy > visBottom + 20) continue;
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.fillRect(this.w - 34, wy - 1.5, 22, 3);
            ctx.fillStyle = 'rgba(255,255,255,0.55)';
            ctx.fillText((d / 10) + 'm', this.w - 40, wy + 4);
        }
        ctx.textAlign = 'left';

        // Fondo del lago
        const floorY = this.maxDepth + 60;
        if (visBottom > floorY - 20) {
            const sand = lerpColor('#4b3a7d', '#1a1136', Math.min(1, floorY / 3600));
            flatPath(ctx, sand, 8, () => {
                ctx.moveTo(-10, floorY + 14);
                for (let x = 0; x <= this.w + 20; x += 30) {
                    ctx.lineTo(x, floorY + Math.sin(x / 46) * 7);
                }
                ctx.lineTo(this.w + 10, floorY + 240);
                ctx.lineTo(-10, floorY + 240);
            });
            // Algas violetas y coral
            ctx.lineCap = 'round';
            for (let i = 0; i < 6; i++) {
                const ax = this.w * (0.08 + i * 0.17);
                const sway = Math.sin(this.time * 1.4 + i * 1.7) * 9;
                ctx.strokeStyle = i % 2 ? '#9d6fe0' : '#ff9ecf';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(ax, floorY + 8);
                ctx.quadraticCurveTo(ax + sway * 0.4, floorY - 24, ax + sway, floorY - 48 - (i % 3) * 12);
                ctx.stroke();
            }
            ctx.lineCap = 'butt';
        }
    }

    drawScene(ctx) {
        const visTop = -this.cameraY;
        if (visTop > SURFACE_Y + 30) return;

        // Cielo plano turquesa
        ctx.fillStyle = '#4ec9c4';
        ctx.fillRect(0, 0, this.w, SURFACE_Y);

        // Nubes planas
        ctx.fillStyle = '#ffffff';
        for (const c of this.clouds) {
            ctx.beginPath();
            ctx.arc(c.x, c.y, 14 * c.s, 0, Math.PI * 2);
            ctx.arc(c.x + 16 * c.s, c.y - 6 * c.s, 11 * c.s, 0, Math.PI * 2);
            ctx.arc(c.x + 32 * c.s, c.y, 12 * c.s, 0, Math.PI * 2);
            ctx.fill();
        }

        // Orilla con pinos y árboles de otoño
        const bushTints = ['#f2884b', '#e8633c', '#f5a25c'];
        for (const t of this.trees) {
            const s = t.size;
            if (t.kind === 'pine') {
                ctx.fillStyle = '#2a7f7c';
                ctx.beginPath();
                ctx.moveTo(t.x, SURFACE_Y - 52 * s);
                ctx.lineTo(t.x - 13 * s, SURFACE_Y - 24 * s);
                ctx.lineTo(t.x + 13 * s, SURFACE_Y - 24 * s);
                ctx.closePath();
                ctx.fill();
                ctx.beginPath();
                ctx.moveTo(t.x, SURFACE_Y - 38 * s);
                ctx.lineTo(t.x - 17 * s, SURFACE_Y - 4);
                ctx.lineTo(t.x + 17 * s, SURFACE_Y - 4);
                ctx.closePath();
                ctx.fill();
            } else {
                ctx.fillStyle = '#6e4229';
                ctx.fillRect(t.x - 2.5 * s, SURFACE_Y - 16 * s, 5 * s, 16 * s);
                ctx.fillStyle = bushTints[t.tint];
                ctx.beginPath();
                ctx.arc(t.x, SURFACE_Y - 28 * s, 13 * s, 0, Math.PI * 2);
                ctx.arc(t.x - 10 * s, SURFACE_Y - 20 * s, 10 * s, 0, Math.PI * 2);
                ctx.arc(t.x + 10 * s, SURFACE_Y - 20 * s, 10 * s, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Hojas cayendo
        for (const leaf of this.leaves) {
            ctx.save();
            ctx.translate(leaf.x, leaf.y);
            ctx.rotate(Math.sin(this.time * 2 + leaf.phase) * 0.8);
            ctx.fillStyle = bushTints[leaf.tint];
            ctx.beginPath();
            ctx.ellipse(0, 0, 4.5, 2.5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Línea de agua y destellos planos
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fillRect(0, SURFACE_Y, this.w, 4);
        for (let i = 0; i < 4; i++) {
            const dx = ((this.time * (10 + i * 4) + i * 137) % (this.w + 70)) - 35;
            roundRectPath(ctx, dx, SURFACE_Y + 12 + (i % 2) * 12, 26 + i * 5, 4, 2);
            ctx.fillStyle = 'rgba(255,255,255,0.22)';
            ctx.fill();
        }
    }

    drawBoat(ctx) {
        const bx = this.w / 2, by = SURFACE_Y - 4;
        const bob = Math.sin(this.time * 1.8) * 1.6;

        ctx.save();
        ctx.translate(0, bob);

        // Casco de madera
        roundRectPath(ctx, bx - 46, by - 8, 92, 20, 9);
        ctx.fillStyle = '#8c5a3c';
        ctx.fill();
        roundRectPath(ctx, bx - 46, by - 8, 92, 7, 3.5);
        ctx.fillStyle = '#6e4229';
        ctx.fill();

        // Pescador (mirando a la izquierda)
        flatPath(ctx, '#e8633c', 5, () => { // chaqueta
            ctx.moveTo(bx + 4, by - 32);
            ctx.lineTo(bx + 22, by - 32);
            ctx.lineTo(bx + 24, by - 10);
            ctx.lineTo(bx + 2, by - 10);
        });
        ctx.fillStyle = '#f5c99b'; // cabeza
        ctx.beginPath();
        ctx.arc(bx + 12, by - 42, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#d94f4f'; // gorro
        ctx.beginPath();
        ctx.arc(bx + 12, by - 45, 8.5, Math.PI, 0);
        ctx.fill();
        roundRectPath(ctx, bx + 3.5, by - 47, 17, 4.5, 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff'; // pompón
        ctx.beginPath();
        ctx.arc(bx + 12, by - 53, 3.2, 0, Math.PI * 2);
        ctx.fill();
        // Brazo hacia la caña
        ctx.strokeStyle = '#e8633c';
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(bx + 6, by - 27);
        ctx.lineTo(bx - 8, by - 31);
        ctx.stroke();
        // Caña
        ctx.strokeStyle = '#4a3728';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(bx - 6, by - 30);
        ctx.lineTo(bx - 36, by - 58);
        ctx.stroke();
        ctx.lineCap = 'butt';

        ctx.restore();
    }

    drawHook(ctx) {
        const hx = this.hook.x + this.hook.width / 2;
        const hy = this.hook.y;
        const h = this.hook.height;
        const bob = Math.sin(this.time * 1.8) * 1.6;

        // Sedal desde la punta de la caña
        ctx.beginPath();
        ctx.moveTo(this.w / 2 - 36, SURFACE_Y - 62 + bob);
        ctx.lineTo(hx, hy + 4);
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Plomada
        ctx.fillStyle = '#eceff4';
        ctx.beginPath();
        ctx.arc(hx, hy + 6, 4.5, 0, Math.PI * 2);
        ctx.fill();

        // Gancho
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(hx, hy + 10);
        ctx.lineTo(hx, hy + h - 12);
        ctx.arc(hx - 7, hy + h - 12, 7, 0, Math.PI * 0.9, false);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(hx - 13.4, hy + h - 10);
        ctx.lineTo(hx - 15, hy + h - 18);
        ctx.stroke();
        ctx.lineCap = 'butt';
    }

    drawChest(ctx) {
        const c = this.chest;
        if (!c) return;
        const { x, y, width: w, height: h } = c;

        roundRectPath(ctx, x, y + h * 0.32, w, h * 0.68, 4);
        ctx.fillStyle = '#8c5a3c';
        ctx.fill();
        roundRectPath(ctx, x, y, w, h * 0.46, 6);
        ctx.fillStyle = '#6e4229';
        ctx.fill();
        ctx.fillStyle = '#ffc93c';
        ctx.fillRect(x + w / 2 - 3, y, 6, h);
        roundRectPath(ctx, x + w / 2 - 5.5, y + h * 0.36, 11, 10, 2.5);
        ctx.fill();
        ctx.fillStyle = '#6e4229';
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h * 0.36 + 5, 2, 0, Math.PI * 2);
        ctx.fill();
    }

    drawFish(ctx, fish) {
        const { x, y, width: w, height: h } = fish;
        const cx = x + w / 2, cy = y + h / 2;
        const body = fish.golden ? '#ffd93c' : fish.species.body;
        const belly = fish.golden ? '#fff3b0' : fish.species.belly;
        const shape = fish.species.shape;

        ctx.save();
        // Voltear con scale(-1,1) cuando nada a la izquierda
        if (!fish.caught && fish.speed < 0) {
            ctx.translate(cx, 0);
            ctx.scale(-1, 1);
            ctx.translate(-cx, 0);
        }
        if (fish.golden) {
            ctx.shadowColor = '#ffd93c';
            ctx.shadowBlur = 14;
        }

        const wag = Math.sin(this.time * 8 + fish.wobblePhase) * h * 0.13;

        if (shape === 'medusa') {
            ctx.globalAlpha = 0.88;
            flatPath(ctx, body, 4, () => { // campana
                ctx.arc(cx, y + h * 0.32, w / 2, Math.PI, 0);
                ctx.quadraticCurveTo(cx + w * 0.42, y + h * 0.5, cx + w * 0.3, y + h * 0.5);
                ctx.lineTo(cx - w * 0.3, y + h * 0.5);
                ctx.quadraticCurveTo(cx - w * 0.42, y + h * 0.5, cx - w / 2, y + h * 0.32);
            });
            ctx.strokeStyle = belly;
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            for (let i = 0; i < 4; i++) {
                const tx = cx - w * 0.3 + i * w * 0.2;
                const sw = Math.sin(this.time * 4 + fish.wobblePhase + i) * 6;
                ctx.beginPath();
                ctx.moveTo(tx, y + h * 0.5);
                ctx.quadraticCurveTo(tx + sw, y + h * 0.74, tx - sw, y + h);
                ctx.stroke();
            }
            ctx.lineCap = 'butt';
            // Ojitos
            ctx.fillStyle = '#5d3a6e';
            ctx.beginPath();
            ctx.arc(cx - w * 0.14, y + h * 0.26, 2.2, 0, Math.PI * 2);
            ctx.arc(cx + w * 0.14, y + h * 0.26, 2.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;

        } else if (shape === 'globo') {
            const r = Math.min(w, h) / 2;
            // Púas
            ctx.strokeStyle = body;
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            for (let i = 0; i < 10; i++) {
                const ang = (i / 10) * Math.PI * 2;
                ctx.beginPath();
                ctx.moveTo(cx + Math.cos(ang) * r * 0.85, cy + Math.sin(ang) * r * 0.85);
                ctx.lineTo(cx + Math.cos(ang) * (r + 5), cy + Math.sin(ang) * (r + 5));
                ctx.stroke();
            }
            ctx.lineCap = 'butt';
            // Cuerpo y panza
            ctx.fillStyle = body;
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.save();
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.clip();
            ctx.fillStyle = belly;
            ctx.beginPath();
            ctx.ellipse(cx, cy + r * 0.75, r * 0.95, r * 0.7, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            // Cola pequeña
            flatPath(ctx, body, 4, () => {
                ctx.moveTo(x + 3, cy);
                ctx.lineTo(x - 6, cy - 7 + wag);
                ctx.lineTo(x - 6, cy + 7 + wag);
            });
            this.drawEye(ctx, x + w * 0.66, cy - h * 0.14, h * 0.15);

        } else if (shape === 'angler') {
            // Antena con señuelo luminoso
            ctx.strokeStyle = belly;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(cx + w * 0.15, y + 4);
            ctx.quadraticCurveTo(cx + w * 0.45, y - h * 0.4, x + w + 5, y - 2);
            ctx.stroke();
            const bulb = ctx.createRadialGradient(x + w + 5, y - 2, 1, x + w + 5, y - 2, 11);
            bulb.addColorStop(0, 'rgba(255,247,196,0.95)');
            bulb.addColorStop(1, 'rgba(255,247,196,0)');
            ctx.fillStyle = bulb;
            ctx.beginPath();
            ctx.arc(x + w + 5, y - 2, 11, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fff7c4';
            ctx.beginPath();
            ctx.arc(x + w + 5, y - 2, 3.2, 0, Math.PI * 2);
            ctx.fill();
            // Cola y cuerpo
            flatPath(ctx, body, 5, () => {
                ctx.moveTo(x + w * 0.16, cy);
                ctx.lineTo(x - w * 0.14, cy - h * 0.32 + wag);
                ctx.lineTo(x - w * 0.14, cy + h * 0.32 + wag);
            });
            ctx.fillStyle = body;
            ctx.beginPath();
            ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.save();
            ctx.beginPath();
            ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
            ctx.clip();
            ctx.fillStyle = belly;
            ctx.beginPath();
            ctx.ellipse(cx, cy + h * 0.38, w * 0.46, h * 0.34, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            // Dientes
            ctx.fillStyle = '#ffffff';
            for (let i = 0; i < 4; i++) {
                const tx = x + w * 0.54 + i * w * 0.1;
                ctx.beginPath();
                ctx.moveTo(tx, cy + h * 0.16);
                ctx.lineTo(tx + 3.5, cy + h * 0.34);
                ctx.lineTo(tx + 7, cy + h * 0.16);
                ctx.closePath();
                ctx.fill();
            }
            this.drawEye(ctx, x + w * 0.66, cy - h * 0.16, h * 0.15, '#ffd93c');

        } else { // pez clásico gordito
            // Cola redondeada
            flatPath(ctx, body, 5, () => {
                ctx.moveTo(x + w * 0.18, cy);
                ctx.lineTo(x - w * 0.16, cy - h * 0.34 + wag);
                ctx.quadraticCurveTo(x - w * 0.22, cy + wag, x - w * 0.16, cy + h * 0.34 + wag);
            });
            // Espada (pez espada)
            if (fish.species.nose) {
                flatPath(ctx, body, 3, () => {
                    ctx.moveTo(x + w * 0.9, cy - 3);
                    ctx.lineTo(x + w + w * 0.3, cy);
                    ctx.lineTo(x + w * 0.9, cy + 3);
                });
            }
            // Aleta dorsal
            flatPath(ctx, body, 4, () => {
                ctx.moveTo(cx - w * 0.2, y + h * 0.14);
                ctx.quadraticCurveTo(cx, y - h * 0.28, cx + w * 0.16, y + h * 0.14);
            });
            // Cuerpo
            ctx.fillStyle = body;
            ctx.beginPath();
            ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
            ctx.fill();
            // Panza clara
            ctx.save();
            ctx.beginPath();
            ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
            ctx.clip();
            ctx.fillStyle = belly;
            ctx.beginPath();
            ctx.ellipse(cx - w * 0.05, cy + h * 0.36, w * 0.48, h * 0.36, 0, 0, Math.PI * 2);
            ctx.fill();
            // Franja blanca
            if (fish.species.stripe) {
                ctx.fillStyle = fish.species.stripe;
                roundRectPath(ctx, cx - w * 0.1, y - 2, w * 0.16, h + 4, 5);
                ctx.fill();
            }
            ctx.restore();
            // Aleta lateral
            flatPath(ctx, belly, 3, () => {
                ctx.moveTo(cx + w * 0.02, cy + h * 0.02);
                ctx.lineTo(cx - w * 0.16, cy + h * 0.26);
                ctx.lineTo(cx + w * 0.12, cy + h * 0.2);
            });
            this.drawEye(ctx, x + w * 0.72, cy - h * 0.12, h * 0.17);
        }

        ctx.restore();
    }

    drawEye(ctx, ex, ey, r, color) {
        ctx.shadowBlur = 0;
        ctx.fillStyle = color || '#ffffff';
        ctx.beginPath();
        ctx.arc(ex, ey, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#26203a';
        ctx.beginPath();
        ctx.arc(ex + r * 0.28, ey, r * 0.52, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ex + r * 0.1, ey - r * 0.22, r * 0.16, 0, Math.PI * 2);
        ctx.fill();
    }

    draw() {
        const ctx = this.ctx;
        ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        ctx.clearRect(0, 0, this.w, this.h);
        ctx.save();

        let targetCameraY = 0;
        if (this.state === 'SINKING' || this.state === 'REELING') {
            targetCameraY = -(this.hook.y - this.h / 3);
            targetCameraY = MathUtils.clamp(targetCameraY, Math.min(0, -(this.maxDepth + 200 - this.h)), 0);
        }
        this.cameraY = MathUtils.lerp(this.cameraY, targetCameraY, 0.1);
        ctx.translate(0, this.cameraY);

        this.drawBackground(ctx);
        this.drawScene(ctx);
        this.drawBoat(ctx);
        this.drawChest(ctx);

        for (const fish of this.fishes) this.drawFish(ctx, fish);

        // Burbujas
        for (const b of this.bubbles) {
            ctx.strokeStyle = 'rgba(255,255,255,0.5)';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
            ctx.stroke();
        }

        this.drawHook(ctx);

        // Partículas de captura
        for (const p of this.particles) {
            ctx.fillStyle = 'rgba(' + p.color + ',' + Math.max(0, p.life) + ')';
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
        }

        // Monedas
        for (const c of this.coins) {
            ctx.fillStyle = '#ffd93c';
            ctx.strokeStyle = '#d9a51e';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(c.x, c.y, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }

        // Textos flotantes en el mundo (+$)
        ctx.font = 'bold 15px "Arial Rounded MT Bold", "Trebuchet MS", sans-serif';
        ctx.textAlign = 'center';
        for (const t of this.worldTexts) {
            ctx.globalAlpha = Math.max(0, t.life);
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillText(t.text, t.x + 1, t.y + 1);
            ctx.fillStyle = t.color;
            ctx.fillText(t.text, t.x, t.y);
        }
        ctx.globalAlpha = 1;

        ctx.restore();

        // HUD durante la pesca: contador de capturas estilo "×13"
        if (this.state !== 'MENU') {
            ctx.font = 'bold 22px "Arial Rounded MT Bold", "Trebuchet MS", sans-serif';
            ctx.textAlign = 'right';
            const label = '×' + this.hook.fishes.length + '/' + this.capacity();
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.fillText(label, this.w - 13, 37);
            ctx.fillStyle = '#ffffff';
            ctx.fillText(label, this.w - 14, 36);

            const meters = Math.max(0, Math.floor((this.hook.y - SURFACE_Y) / 10));
            ctx.font = 'bold 15px "Arial Rounded MT Bold", "Trebuchet MS", sans-serif';
            ctx.textAlign = 'left';
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.fillText(meters + ' m', 15, 37);
            ctx.fillStyle = '#ffffff';
            ctx.fillText(meters + ' m', 14, 36);
        }
        ctx.textAlign = 'left';
    }

    loop(timestamp) {
        let dt = timestamp - this.lastTime;
        this.lastTime = timestamp;
        if (dt > 100) dt = 16;
        this.update(dt);
        this.draw();
        requestAnimationFrame((t) => this.loop(t));
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new Game());
} else {
    new Game();
}
