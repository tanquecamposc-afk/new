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

const SURFACE_Y = 80;
const HOOK_REST_Y = 115;

// Color del agua según la profundidad (mundo)
const WATER_STOPS = [
    { d: 0, c: '#2196f3' },
    { d: 600, c: '#0d47a1' },
    { d: 1200, c: '#0a2472' },
    { d: 1900, c: '#071638' },
    { d: 2800, c: '#03060f' },
    { d: 4200, c: '#010208' }
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

// Especies ordenadas por profundidad mínima (px de mundo). value es el multiplicador base.
const SPECIES = [
    { key: 'sardina', name: 'Sardina',   minDepth: 0,    w: 32, h: 18, value: 1,  shape: 'fish',   colors: ['#cfe9f7', '#7fb3d3'], stripe: null },
    { key: 'payaso',  name: 'Payaso',    minDepth: 300,  w: 38, h: 24, value: 3,  shape: 'fish',   colors: ['#ff8a5c', '#f4511e'], stripe: '#ffffff' },
    { key: 'angel',   name: 'Ángel',     minDepth: 650,  w: 44, h: 30, value: 6,  shape: 'fish',   colors: ['#ffe082', '#ffa000'], stripe: '#5d4037' },
    { key: 'globo',   name: 'Pez Globo', minDepth: 1000, w: 40, h: 38, value: 11, shape: 'globo',  colors: ['#c5e1a5', '#7cb342'], stripe: null },
    { key: 'medusa',  name: 'Medusa',    minDepth: 1400, w: 42, h: 46, value: 18, shape: 'medusa', colors: ['#e1bee7', '#ab47bc'], stripe: null },
    { key: 'espada',  name: 'Pez Espada', minDepth: 1850, w: 64, h: 24, value: 30, shape: 'fish',  colors: ['#b0bec5', '#546e7a'], stripe: null, nose: true },
    { key: 'abisal',  name: 'Abisal',    minDepth: 2350, w: 50, h: 36, value: 55, shape: 'angler', colors: ['#455a64', '#1c262b'], stripe: null }
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
        const speed = MathUtils.randomRange(35, 100) * (species.shape === 'medusa' ? 0.5 : 1);
        this.speed = Math.random() < 0.5 ? -speed : speed;
        this.value = Math.ceil(species.value * (1 + depth / 400)) * (golden ? 5 : 1);
        this.wobblePhase = MathUtils.randomRange(0, Math.PI * 2);
        this.caught = false;
    }

    update(deltaSec, worldW, time) {
        if (this.caught) return;
        this.x += this.speed * deltaSec;
        if (this.speed > 0 && this.x > worldW) this.x = -this.width;
        else if (this.speed < 0 && this.x + this.width < 0) this.x = worldW;
        const amp = this.species.shape === 'medusa' ? 16 : 8;
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
        // Migración de partidas guardadas sin el stat de carrete
        this.saveData.stats = Object.assign({ fish: 1, depth: 1, offline: 1, speed: 1 }, this.saveData.stats);

        this.state = 'MENU';
        this.hook = { x: 0, targetX: 0, y: HOOK_REST_Y, width: 26, height: 36, fishes: [] };
        this.fishes = [];
        this.bubbles = [];
        this.particles = [];
        this.worldTexts = [];
        this.maxDepth = this.computeMaxDepth();
        this.cameraY = 0;
        this.time = 0;
        this.lastTime = performance.now();

        this.init();
    }

    computeMaxDepth() { return 400 + this.saveData.stats.depth * 220; }
    hookSpeed() { return 300 * (1 + 0.12 * (this.saveData.stats.speed - 1)); }

    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.bindInput();
        this.hook.x = this.w / 2 - this.hook.width / 2;
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
        const earned = Math.floor(cappedMin * this.saveData.stats.offline * 0.5);
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
            const cost = Math.floor(10 * Math.pow(1.5, level));
            document.getElementById(upg.lvl).innerText = level;

            const btn = document.getElementById(upg.btn);
            btn.innerText = '$' + cost;
            btn.disabled = this.saveData.money < cost;
            btn.style.opacity = btn.disabled ? '0.5' : '1';
            // onclick (y no addEventListener) para no acumular listeners en cada refresco
            btn.onclick = () => {
                if (this.saveData.money < cost) return;
                this.saveData.money -= cost;
                this.saveData.stats[upg.stat]++;
                if (upg.stat === 'depth') {
                    const before = this.maxDepth;
                    this.maxDepth = this.computeMaxDepth();
                    const unlocked = SPECIES.find(s => s.minDepth > before - 120 && s.minDepth <= this.maxDepth - 120);
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
        const count = Math.min(12 + this.saveData.stats.depth * 4, 90);
        for (let i = 0; i < count; i++) {
            const depth = MathUtils.randomRange(180, this.maxDepth - 30);
            const eligible = SPECIES.filter(s => depth >= s.minDepth);
            // Sesgo hacia las especies más profundas de la zona
            const species = eligible[Math.floor(Math.pow(Math.random(), 0.55) * eligible.length)];
            const golden = Math.random() < 0.08;
            this.fishes.push(new Fish(this.w, depth, species, golden));
        }
    }

    catchFish(fish) {
        fish.caught = true;
        this.hook.fishes.push(fish);
        this.worldTexts.push({
            x: fish.x + fish.width / 2, y: fish.y, life: 1,
            text: '+$' + fish.value, color: fish.golden ? '#ffd700' : '#ffffff'
        });
        for (let i = 0; i < 8; i++) {
            this.particles.push({
                x: fish.x + fish.width / 2, y: fish.y + fish.height / 2,
                vx: MathUtils.randomRange(-70, 70), vy: MathUtils.randomRange(-90, 20),
                r: MathUtils.randomRange(1.5, 3.5), life: 1,
                color: fish.golden ? '255,215,0' : '255,255,255'
            });
        }
    }

    update(dt) {
        const deltaSec = dt / 1000;
        this.time += deltaSec;
        const speed = this.hookSpeed();

        if (this.state === 'SINKING') {
            this.hook.y += speed * 1.15 * deltaSec;
            this.hook.x = MathUtils.lerp(this.hook.x, this.hook.targetX, 10 * deltaSec);
            if (this.hook.y >= this.maxDepth) this.state = 'REELING';

        } else if (this.state === 'REELING') {
            this.hook.y -= speed * deltaSec;
            this.hook.x = MathUtils.lerp(this.hook.x, this.hook.targetX, 10 * deltaSec);

            // Colisión AABB anzuelo vs peces libres, respetando la capacidad máxima
            for (const fish of this.fishes) {
                if (fish.caught) continue;
                if (this.hook.fishes.length >= this.saveData.stats.fish) break;
                const hit = this.hook.x < fish.x + fish.width &&
                            this.hook.x + this.hook.width > fish.x &&
                            this.hook.y < fish.y + fish.height &&
                            this.hook.y + this.hook.height > fish.y;
                if (hit) this.catchFish(fish);
            }

            if (this.hook.y <= HOOK_REST_Y) this.endFishing();
        }

        for (const fish of this.fishes) fish.update(deltaSec, this.w, this.time);

        // Los capturados cuelgan del centro del anzuelo (con leve escalonado para verlos)
        this.hook.fishes.forEach((fish, i) => {
            fish.x = this.hook.x + this.hook.width / 2 - fish.width / 2;
            fish.y = this.hook.y + this.hook.height / 2 - fish.height / 2 + i * 7;
        });

        // Burbujas ambientales cerca del anzuelo mientras se pesca
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
            return b.y > SURFACE_Y + 4;
        });

        this.particles = this.particles.filter(p => {
            p.x += p.vx * deltaSec;
            p.y += p.vy * deltaSec;
            p.life -= deltaSec * 1.6;
            return p.life > 0;
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
        if (earned > 0) {
            this.saveData.money += earned;
            this.showFloatingText('+$' + earned + ' · ' + this.hook.fishes.length + ' 🐟');
        }
        this.hook.fishes = [];
        this.fishes = [];

        this.save();
    }

    showFloatingText(text) {
        const container = document.getElementById('floating-text-container');
        const el = document.createElement('div');
        el.innerText = text;
        el.style.cssText =
            'position:absolute; left:50%; top:35%; transform:translate(-50%,0);' +
            'font-size:26px; font-weight:bold; color:#fbc531; white-space:nowrap;' +
            'text-shadow:0 2px 4px rgba(0,0,0,0.6); pointer-events:none;' +
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

        // Agua: gradiente según profundidad visible
        const grad = ctx.createLinearGradient(0, visTop, 0, visBottom);
        grad.addColorStop(0, waterColorAt(Math.max(0, visTop)));
        grad.addColorStop(1, waterColorAt(visBottom));
        ctx.fillStyle = grad;
        ctx.fillRect(0, visTop, this.w, this.h);

        // Cielo, sol y nubes
        if (visTop < SURFACE_Y) {
            const sky = ctx.createLinearGradient(0, 0, 0, SURFACE_Y);
            sky.addColorStop(0, '#aee7ff');
            sky.addColorStop(1, '#7ec8f0');
            ctx.fillStyle = sky;
            ctx.fillRect(0, Math.min(0, visTop), this.w, SURFACE_Y - Math.min(0, visTop));

            ctx.fillStyle = '#ffee99';
            ctx.beginPath();
            ctx.arc(this.w * 0.82, 26, 16, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(255,238,153,0.35)';
            ctx.beginPath();
            ctx.arc(this.w * 0.82, 26, 24, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = 'rgba(255,255,255,0.85)';
            const cx = ((this.time * 7) % (this.w + 140)) - 70;
            ctx.beginPath();
            ctx.ellipse(cx, 30, 26, 10, 0, 0, Math.PI * 2);
            ctx.ellipse(cx + 18, 26, 18, 8, 0, 0, Math.PI * 2);
            ctx.fill();

            // Olas en la superficie
            for (let pass = 0; pass < 2; pass++) {
                ctx.beginPath();
                ctx.strokeStyle = pass === 0 ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.25)';
                ctx.lineWidth = pass === 0 ? 2 : 1.5;
                const yOff = pass * 4;
                for (let x = 0; x <= this.w; x += 6) {
                    const y = SURFACE_Y + yOff + Math.sin(x / 26 + this.time * (2 - pass * 0.6)) * 2.5;
                    x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
                }
                ctx.stroke();
            }
        }

        // Rayos de sol bajo el agua
        if (visTop < 480) {
            ctx.fillStyle = 'rgba(255,255,255,0.05)';
            for (let i = 0; i < 4; i++) {
                const rx = this.w * (0.18 + i * 0.22) + Math.sin(this.time * 0.4 + i) * 14;
                ctx.beginPath();
                ctx.moveTo(rx - 12, SURFACE_Y);
                ctx.lineTo(rx + 12, SURFACE_Y);
                ctx.lineTo(rx + 55, 500);
                ctx.lineTo(rx - 55, 500);
                ctx.closePath();
                ctx.fill();
            }
        }

        // Fondo marino con arena, rocas y algas
        const floorY = this.maxDepth + 55;
        if (visBottom > floorY - 20) {
            ctx.fillStyle = lerpColor('#c9a96a', '#3d3323', Math.min(1, floorY / 3000));
            ctx.beginPath();
            ctx.moveTo(0, floorY + 12);
            for (let x = 0; x <= this.w; x += 24) {
                ctx.lineTo(x, floorY + Math.sin(x / 40) * 6);
            }
            ctx.lineTo(this.w, floorY + 220);
            ctx.lineTo(0, floorY + 220);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = 'rgba(40,36,30,0.75)';
            for (let i = 0; i < 4; i++) {
                const rx = this.w * (0.12 + i * 0.26);
                ctx.beginPath();
                ctx.ellipse(rx, floorY + 6, 16 + i * 4, 10, 0, Math.PI, 0);
                ctx.fill();
            }

            ctx.strokeStyle = '#2e7d5b';
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            for (let i = 0; i < 6; i++) {
                const ax = this.w * (0.08 + i * 0.17);
                const sway = Math.sin(this.time * 1.4 + i * 1.7) * 9;
                ctx.beginPath();
                ctx.moveTo(ax, floorY + 6);
                ctx.quadraticCurveTo(ax + sway * 0.4, floorY - 22, ax + sway, floorY - 46 - (i % 3) * 10);
                ctx.stroke();
            }
            ctx.lineCap = 'butt';
        }
    }

    drawBoat(ctx) {
        const bx = this.w / 2, by = SURFACE_Y;
        const bob = Math.sin(this.time * 1.8) * 1.5;

        ctx.save();
        ctx.translate(0, bob);
        // Casco
        ctx.fillStyle = '#c0392b';
        ctx.beginPath();
        ctx.moveTo(bx - 40, by - 8);
        ctx.lineTo(bx + 40, by - 8);
        ctx.lineTo(bx + 27, by + 10);
        ctx.lineTo(bx - 27, by + 10);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ecf0f1';
        ctx.fillRect(bx - 38, by - 8, 76, 4);
        // Pescador
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(bx + 1, by - 24, 10, 16);
        ctx.fillStyle = '#f1c27d';
        ctx.beginPath();
        ctx.arc(bx + 6, by - 29, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#8d6e63';
        ctx.fillRect(bx + 0, by - 36, 12, 4);
        // Caña
        ctx.strokeStyle = '#6d4c41';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(bx + 8, by - 20);
        ctx.lineTo(bx + 34, by - 42);
        ctx.stroke();
        ctx.restore();
    }

    drawHook(ctx) {
        const hx = this.hook.x + this.hook.width / 2;
        const hy = this.hook.y;
        const h = this.hook.height;

        // Hilo desde la punta de la caña
        ctx.beginPath();
        ctx.moveTo(this.w / 2 + 34, SURFACE_Y - 42 + Math.sin(this.time * 1.8) * 1.5);
        ctx.lineTo(hx, hy + 4);
        ctx.strokeStyle = 'rgba(255,255,255,0.55)';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Plomada
        ctx.fillStyle = '#78909c';
        ctx.beginPath();
        ctx.arc(hx, hy + 6, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.beginPath();
        ctx.arc(hx - 1.5, hy + 4.5, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Gancho metálico
        ctx.strokeStyle = '#cfd8dc';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(hx, hy + 10);
        ctx.lineTo(hx, hy + h - 12);
        ctx.arc(hx - 7, hy + h - 12, 7, 0, Math.PI * 0.9, false);
        ctx.stroke();
        // Punta
        ctx.beginPath();
        ctx.moveTo(hx - 13.4, hy + h - 10);
        ctx.lineTo(hx - 15, hy + h - 18);
        ctx.stroke();
        ctx.lineCap = 'butt';
    }

    drawFish(ctx, fish) {
        const { x, y, width: w, height: h } = fish;
        const cx = x + w / 2, cy = y + h / 2;
        const colors = fish.golden ? ['#ffe082', '#f9a825'] : fish.species.colors;
        const shape = fish.species.shape;

        ctx.save();
        // Voltear con scale(-1,1) cuando nada a la izquierda
        if (!fish.caught && fish.speed < 0) {
            ctx.translate(cx, 0);
            ctx.scale(-1, 1);
            ctx.translate(-cx, 0);
        }
        if (fish.golden) {
            ctx.shadowColor = '#ffd700';
            ctx.shadowBlur = 12;
        }

        const wag = Math.sin(this.time * 8 + fish.wobblePhase) * h * 0.14;

        if (shape === 'medusa') {
            ctx.globalAlpha = 0.85;
            // Campana
            const grad = ctx.createLinearGradient(x, y, x, y + h);
            grad.addColorStop(0, colors[0]);
            grad.addColorStop(1, colors[1]);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(cx, y + h * 0.34, w / 2, Math.PI, 0);
            ctx.quadraticCurveTo(cx + w * 0.4, y + h * 0.5, cx + w * 0.3, y + h * 0.52);
            ctx.lineTo(cx - w * 0.3, y + h * 0.52);
            ctx.quadraticCurveTo(cx - w * 0.4, y + h * 0.5, cx - w / 2, y + h * 0.34);
            ctx.closePath();
            ctx.fill();
            // Tentáculos
            ctx.strokeStyle = colors[1];
            ctx.lineWidth = 2;
            for (let i = 0; i < 4; i++) {
                const tx = cx - w * 0.3 + i * w * 0.2;
                const sw = Math.sin(this.time * 4 + fish.wobblePhase + i) * 5;
                ctx.beginPath();
                ctx.moveTo(tx, y + h * 0.5);
                ctx.quadraticCurveTo(tx + sw, y + h * 0.75, tx - sw, y + h);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;

        } else if (shape === 'globo') {
            // Púas
            ctx.strokeStyle = colors[1];
            ctx.lineWidth = 2;
            const r = Math.min(w, h) / 2;
            for (let i = 0; i < 10; i++) {
                const ang = (i / 10) * Math.PI * 2;
                ctx.beginPath();
                ctx.moveTo(cx + Math.cos(ang) * r * 0.85, cy + Math.sin(ang) * r * 0.85);
                ctx.lineTo(cx + Math.cos(ang) * (r + 4), cy + Math.sin(ang) * (r + 4));
                ctx.stroke();
            }
            // Cuerpo
            const grad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.2, cx, cy, r);
            grad.addColorStop(0, colors[0]);
            grad.addColorStop(1, colors[1]);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fill();
            // Cola pequeña
            ctx.fillStyle = colors[1];
            ctx.beginPath();
            ctx.moveTo(x + 2, cy);
            ctx.lineTo(x - 6, cy - 6 + wag);
            ctx.lineTo(x - 6, cy + 6 + wag);
            ctx.closePath();
            ctx.fill();
            this.drawEye(ctx, x + w * 0.68, cy - h * 0.14, h * 0.13);

        } else if (shape === 'angler') {
            // Antena con señuelo luminoso
            ctx.strokeStyle = colors[0];
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx + w * 0.15, y + 3);
            ctx.quadraticCurveTo(cx + w * 0.45, y - h * 0.4, x + w + 4, y - 2);
            ctx.stroke();
            const bulb = ctx.createRadialGradient(x + w + 4, y - 2, 1, x + w + 4, y - 2, 10);
            bulb.addColorStop(0, 'rgba(255,253,200,0.95)');
            bulb.addColorStop(1, 'rgba(255,253,200,0)');
            ctx.fillStyle = bulb;
            ctx.beginPath();
            ctx.arc(x + w + 4, y - 2, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fffde7';
            ctx.beginPath();
            ctx.arc(x + w + 4, y - 2, 3, 0, Math.PI * 2);
            ctx.fill();
            // Cola
            ctx.fillStyle = colors[1];
            ctx.beginPath();
            ctx.moveTo(x + w * 0.15, cy);
            ctx.lineTo(x - w * 0.16, cy - h * 0.34 + wag);
            ctx.lineTo(x - w * 0.16, cy + h * 0.34 + wag);
            ctx.closePath();
            ctx.fill();
            // Cuerpo
            const grad = ctx.createLinearGradient(x, y, x, y + h);
            grad.addColorStop(0, colors[0]);
            grad.addColorStop(1, colors[1]);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
            ctx.fill();
            // Dientes
            ctx.fillStyle = '#eceff1';
            for (let i = 0; i < 4; i++) {
                const tx = x + w * 0.55 + i * w * 0.09;
                ctx.beginPath();
                ctx.moveTo(tx, cy + h * 0.18);
                ctx.lineTo(tx + 3, cy + h * 0.34);
                ctx.lineTo(tx + 6, cy + h * 0.18);
                ctx.closePath();
                ctx.fill();
            }
            this.drawEye(ctx, x + w * 0.68, cy - h * 0.16, h * 0.14, '#ffeb3b');

        } else { // 'fish' clásico
            // Cola
            ctx.fillStyle = colors[1];
            ctx.beginPath();
            ctx.moveTo(x + w * 0.15, cy);
            ctx.lineTo(x - w * 0.18, cy - h * 0.36 + wag);
            ctx.lineTo(x - w * 0.18, cy + h * 0.36 + wag);
            ctx.closePath();
            ctx.fill();
            // Cuerpo
            const grad = ctx.createLinearGradient(x, y, x, y + h);
            grad.addColorStop(0, colors[0]);
            grad.addColorStop(1, colors[1]);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
            ctx.fill();
            // Espada (pez espada)
            if (fish.species.nose) {
                ctx.fillStyle = colors[1];
                ctx.beginPath();
                ctx.moveTo(x + w * 0.92, cy - 2.5);
                ctx.lineTo(x + w + w * 0.3, cy);
                ctx.lineTo(x + w * 0.92, cy + 2.5);
                ctx.closePath();
                ctx.fill();
            }
            // Aleta dorsal
            ctx.fillStyle = colors[1];
            ctx.beginPath();
            ctx.moveTo(cx - w * 0.18, y + h * 0.12);
            ctx.quadraticCurveTo(cx, y - h * 0.25, cx + w * 0.18, y + h * 0.12);
            ctx.closePath();
            ctx.fill();
            // Franjas dentro del cuerpo
            if (fish.species.stripe) {
                ctx.save();
                ctx.beginPath();
                ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
                ctx.clip();
                ctx.fillStyle = fish.species.stripe;
                ctx.fillRect(cx - w * 0.08, y, w * 0.13, h);
                ctx.fillRect(cx + w * 0.22, y, w * 0.11, h);
                ctx.restore();
            }
            // Aleta lateral
            ctx.fillStyle = 'rgba(0,0,0,0.15)';
            ctx.beginPath();
            ctx.moveTo(cx, cy + h * 0.05);
            ctx.lineTo(cx - w * 0.14, cy + h * 0.3);
            ctx.lineTo(cx + w * 0.1, cy + h * 0.22);
            ctx.closePath();
            ctx.fill();
            this.drawEye(ctx, x + w * 0.72, cy - h * 0.14, h * 0.14);
        }

        ctx.restore();
    }

    drawEye(ctx, ex, ey, r, color) {
        ctx.shadowBlur = 0;
        ctx.fillStyle = color || '#ffffff';
        ctx.beginPath();
        ctx.arc(ex, ey, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.arc(ex + r * 0.3, ey, r * 0.5, 0, Math.PI * 2);
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
            targetCameraY = MathUtils.clamp(targetCameraY, Math.min(0, -(this.maxDepth + 180 - this.h)), 0);
        }
        this.cameraY = MathUtils.lerp(this.cameraY, targetCameraY, 0.1);
        ctx.translate(0, this.cameraY);

        this.drawBackground(ctx);
        this.drawBoat(ctx);

        for (const fish of this.fishes) this.drawFish(ctx, fish);

        // Burbujas
        for (const b of this.bubbles) {
            ctx.strokeStyle = 'rgba(255,255,255,0.5)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = 'rgba(255,255,255,0.35)';
            ctx.beginPath();
            ctx.arc(b.x - b.r * 0.35, b.y - b.r * 0.35, b.r * 0.3, 0, Math.PI * 2);
            ctx.fill();
        }

        this.drawHook(ctx);

        // Partículas de captura
        for (const p of this.particles) {
            ctx.fillStyle = 'rgba(' + p.color + ',' + Math.max(0, p.life) + ')';
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
        }

        // Textos flotantes en el mundo (+$)
        ctx.font = 'bold 15px "Arial Rounded MT Bold", "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        for (const t of this.worldTexts) {
            ctx.globalAlpha = Math.max(0, t.life);
            ctx.fillStyle = '#000000';
            ctx.fillText(t.text, t.x + 1, t.y + 1);
            ctx.fillStyle = t.color;
            ctx.fillText(t.text, t.x, t.y);
        }
        ctx.globalAlpha = 1;

        ctx.restore();

        // HUD durante la pesca: profundidad y capacidad
        if (this.state !== 'MENU') {
            const meters = Math.max(0, Math.floor((this.hook.y - SURFACE_Y) / 10));
            const label = meters + ' m  ·  🐟 ' + this.hook.fishes.length + '/' + this.saveData.stats.fish;
            ctx.font = 'bold 16px "Arial Rounded MT Bold", "Segoe UI", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(0,0,0,0.45)';
            ctx.fillText(label, this.w / 2 + 1, 71);
            ctx.fillStyle = '#ffffff';
            ctx.fillText(label, this.w / 2, 70);
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
