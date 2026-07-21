const MathUtils = {
    lerp: (start, end, amt) => (1 - amt) * start + amt * end,
    randomRange: (min, max) => Math.random() * (max - min) + min
};

class AssetManager {
    constructor() {
        this.images = {};
        this.loaded = 0;
        this.total = 0;
    }
    queue(key, path) {
        this.total++;
        this.images[key] = new Image();
        this.images[key].src = path;
    }
    loadAll() {
        return new Promise((resolve, reject) => {
            if (this.total === 0) resolve();
            for (let key in this.images) {
                this.images[key].onload = () => {
                    this.loaded++;
                    if (this.loaded === this.total) resolve();
                };
                this.images[key].onerror = () => reject();
            }
        });
    }
    get(key) { return this.images[key]; }
}

class Fish {
    constructor(canvasWidth, depth) {
        const isRare = Math.random() < 0.15;
        this.rarity = isRare ? 'rare' : 'common';
        this.type = isRare ? 'fish_rare' : 'fish_common';
        this.width = isRare ? 46 : 34;
        this.height = isRare ? 30 : 22;
        this.x = MathUtils.randomRange(0, canvasWidth - this.width);
        this.baseY = depth;
        this.y = depth;
        // Los raros son más rápidos y valen mucho más; todos valen más a mayor profundidad
        const speed = MathUtils.randomRange(40, 110) * (isRare ? 1.4 : 1);
        this.speed = Math.random() < 0.5 ? -speed : speed;
        this.value = Math.ceil((1 + depth / 150) * (isRare ? 4 : 1));
        this.wobblePhase = MathUtils.randomRange(0, Math.PI * 2);
        this.caught = false;
    }

    update(deltaSec, canvasWidth) {
        if (this.caught) return;
        this.x += this.speed * deltaSec;
        if (this.speed > 0 && this.x > canvasWidth) this.x = -this.width;
        else if (this.speed < 0 && this.x + this.width < 0) this.x = canvasWidth;
        this.y = this.baseY + Math.sin(Date.now() / 1000 + this.wobblePhase) * 8;
    }
}

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        this.saveData = JSON.parse(localStorage.getItem('tinyFishingSave')) || {
            money: 0, lastPlayed: Date.now(),
            stats: { fish: 1, depth: 1, offline: 1 }
        };

        this.state = 'MENU';
        this.hook = { x: 0, targetX: 0, y: 50, width: 30, height: 40, speed: 300, fishes: [] };
        this.fishes = [];
        this.maxDepth = 500 + (this.saveData.stats.depth * 150);
        this.cameraY = 0;
        this.lastTime = performance.now();

        this.assets = new AssetManager();
        this.assets.queue('hook', 'assets/hook.png');
        this.assets.queue('fish_common', 'assets/fish_common.png');
        this.assets.queue('fish_rare', 'assets/fish_rare.png');

        this.assets.loadAll().then(() => this.init()).catch(() => {
            console.warn("Faltan imágenes, usando rectángulos de fallback.");
            this.init();
        });
    }

    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.bindInput();
        this.hook.x = this.canvas.width / 2;
        this.hook.targetX = this.hook.x;
        this.collectOfflineEarnings();
        this.updateUI();
        requestAnimationFrame((t) => this.loop(t));
    }

    resize() {
        this.canvas.width = this.canvas.parentElement.clientWidth;
        this.canvas.height = this.canvas.parentElement.clientHeight;
    }

    bindInput() {
        document.getElementById('btn-play').addEventListener('click', () => {
            if (this.state === 'MENU') this.startCast();
        });

        const handleMove = (e) => {
            if (this.state !== 'REELING') return;
            const rect = this.canvas.getBoundingClientRect();
            let clientX = e.clientX || (e.touches && e.touches[0].clientX);
            this.hook.targetX = clientX - rect.left - (this.hook.width / 2);
            this.hook.targetX = Math.max(0, Math.min(this.hook.targetX, this.canvas.width - this.hook.width));
        };

        this.canvas.addEventListener('mousemove', handleMove);
        this.canvas.addEventListener('touchmove', handleMove, {passive: true});
        this.canvas.addEventListener('touchstart', handleMove, {passive: true});
    }

    collectOfflineEarnings() {
        const elapsedMin = (Date.now() - this.saveData.lastPlayed) / 60000;
        if (elapsedMin < 1) return;
        const cappedMin = Math.min(elapsedMin, 480); // máximo 8 horas acumulables
        const earned = Math.floor(cappedMin * this.saveData.stats.offline * 0.5);
        if (earned > 0) {
            this.saveData.money += earned;
            this.showFloatingText('Offline +$' + earned);
            this.save();
        }
    }

    save() {
        this.saveData.lastPlayed = Date.now();
        localStorage.setItem('tinyFishingSave', JSON.stringify(this.saveData));
        this.updateUI();
    }

    updateUI() {
        document.getElementById('cash').innerText = Math.floor(this.saveData.money);

        const upgrades = [
            { stat: 'fish',    lvl: 'lvl-fish',    btn: 'btn-upg-fish' },
            { stat: 'depth',   lvl: 'lvl-depth',   btn: 'btn-upg-depth' },
            { stat: 'offline', lvl: 'lvl-offline', btn: 'btn-upg-offline' }
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
                if (upg.stat === 'depth') this.maxDepth = 500 + (this.saveData.stats.depth * 150);
                this.save();
            };
        }
    }

    startCast() {
        this.state = 'SINKING';
        document.getElementById('upgrade-menu').style.display = 'none';
        this.hook.fishes = [];

        this.maxDepth = 500 + (this.saveData.stats.depth * 150);
        this.fishes = [];
        const count = 10 + this.saveData.stats.depth * 3;
        for (let i = 0; i < count; i++) {
            const depth = MathUtils.randomRange(160, this.maxDepth - 20);
            this.fishes.push(new Fish(this.canvas.width, depth));
        }
    }

    update(dt) {
        const deltaSec = dt / 1000;

        if (this.state === 'SINKING') {
            this.hook.y += this.hook.speed * deltaSec;
            if (this.hook.y >= this.maxDepth) this.state = 'REELING';

        } else if (this.state === 'REELING') {
            this.hook.y -= this.hook.speed * deltaSec;
            this.hook.x = MathUtils.lerp(this.hook.x, this.hook.targetX, 10 * deltaSec);

            // Colisión AABB anzuelo vs peces libres, respetando la capacidad máxima
            for (const fish of this.fishes) {
                if (fish.caught) continue;
                if (this.hook.fishes.length >= this.saveData.stats.fish) break;
                const hit = this.hook.x < fish.x + fish.width &&
                            this.hook.x + this.hook.width > fish.x &&
                            this.hook.y < fish.y + fish.height &&
                            this.hook.y + this.hook.height > fish.y;
                if (hit) {
                    fish.caught = true;
                    this.hook.fishes.push(fish);
                }
            }

            if (this.hook.y <= 50) this.endFishing();
        }

        for (const fish of this.fishes) fish.update(deltaSec, this.canvas.width);

        // Los capturados cuelgan del centro del anzuelo (con leve escalonado para verlos)
        this.hook.fishes.forEach((fish, i) => {
            fish.x = this.hook.x + this.hook.width / 2 - fish.width / 2;
            fish.y = this.hook.y + this.hook.height / 2 - fish.height / 2 + i * 6;
        });
    }

    endFishing() {
        this.state = 'MENU';
        document.getElementById('upgrade-menu').style.display = '';

        let earned = 0;
        for (const fish of this.hook.fishes) earned += fish.value;
        if (earned > 0) {
            this.saveData.money += earned;
            this.showFloatingText('+$' + earned);
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
            'font-size:28px; font-weight:bold; color:#fbc531;' +
            'text-shadow:0 2px 4px rgba(0,0,0,0.6); pointer-events:none;' +
            'transition:transform 1.2s ease-out, opacity 1.2s ease-out; opacity:1;';
        container.appendChild(el);
        requestAnimationFrame(() => {
            el.style.transform = 'translate(-50%,-80px)';
            el.style.opacity = '0';
        });
        setTimeout(() => el.remove(), 1300);
    }

    // Solo devuelve la imagen si realmente se pudo decodificar (drawImage lanza con imágenes rotas)
    getDrawable(key) {
        const img = this.assets.get(key);
        return (img && img.complete && img.naturalWidth > 0) ? img : null;
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.save();

        let targetCameraY = 0;
        if (this.state === 'SINKING' || this.state === 'REELING') {
            targetCameraY = -(this.hook.y - this.canvas.height / 3);
            targetCameraY = Math.min(0, targetCameraY);
        }
        this.cameraY = MathUtils.lerp(this.cameraY, targetCameraY, 0.1);
        this.ctx.translate(0, this.cameraY);

        // Hilo
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvas.width / 2, -this.cameraY);
        this.ctx.lineTo(this.hook.x + this.hook.width / 2, this.hook.y);
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.lineWidth = 1.5;
        this.ctx.stroke();

        // Anzuelo (Usar imagen o fallback)
        let hookImg = this.getDrawable('hook');
        if (hookImg) {
            this.ctx.drawImage(hookImg, this.hook.x, this.hook.y, this.hook.width, this.hook.height);
        } else {
            this.ctx.fillStyle = '#ff3838';
            this.ctx.fillRect(this.hook.x, this.hook.y, this.hook.width, this.hook.height);
        }

        // Peces: volteados con scale(-1,1) cuando nadan a la izquierda
        for (const fish of this.fishes) {
            this.ctx.save();
            if (!fish.caught && fish.speed < 0) {
                this.ctx.translate(fish.x + fish.width / 2, 0);
                this.ctx.scale(-1, 1);
                this.ctx.translate(-(fish.x + fish.width / 2), 0);
            }
            const img = this.getDrawable(fish.type);
            if (img) {
                this.ctx.drawImage(img, fish.x, fish.y, fish.width, fish.height);
            } else {
                this.ctx.fillStyle = fish.rarity === 'rare' ? '#9c88ff' : '#ff9f43';
                this.ctx.fillRect(fish.x, fish.y, fish.width, fish.height);
                this.ctx.fillStyle = '#2f3640';
                this.ctx.fillRect(fish.x + fish.width - 9, fish.y + 4, 4, 4);
            }
            this.ctx.restore();
        }

        this.ctx.restore();
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

window.onload = () => new Game();
