-- Configuración global de Steal an Anomaly.
-- Todo el balance del juego vive aquí: cambia números sin tocar la lógica.
local Config = {}

Config.GameName = "Steal an Anomaly"

-- Economía básica
Config.StartCash = 150
Config.SellRatio = 0.5              -- vender devuelve 50% del valor
Config.WalkSpeed = 20
Config.CarrySpeed = 12              -- velocidad mientras cargas una anomalía robada
Config.StealHold = 1.6              -- segundos manteniendo E para robar
Config.CaptureHold = 1.0

-- La Grieta (cinta transportadora)
Config.SpawnInterval = 3.2          -- segundos entre anomalías
Config.ConveyorSpeed = 9            -- studs/seg
Config.WalkToBaseSpeed = 22
Config.MimicChance = 0.14           -- probabilidad de que una anomalía sea un Imitador disfrazado
Config.MimicBountyRatio = 0.6       -- recompensa por exponer un imitador (x precio aparente)
Config.MimicTells = { "redeyes", "noshadow", "inverted", "flicker", "wrongcolor" }

-- Ciclo global (restock de 5 minutos con escasez física)
Config.CycleLength = 300
Config.BlackoutDuration = 45
Config.BlackoutWarning = 10
Config.BreachChance = 0.18          -- probabilidad de fuga por jugador en cada apagón
Config.BreachReducePerLevel = 0.025 -- cada mejora de base reduce la probabilidad
Config.BreachReturnDelay = 30       -- segundos tras el amanecer antes de que las fugadas vuelvan a casa

-- Bases
Config.BaseStartPods = 5
Config.MaxPods = 10
Config.BaseUpgradeCost = { 1500, 8000, 40000, 175000, 750000 }
Config.LockDuration = 60
Config.LockPerLevel = 6

-- Ascensos (rebirth)
Config.RebirthBonus = 0.5
function Config.RebirthCost(rebirths)
	return math.floor(250000 * (rebirths + 1) ^ 2.3)
end

-- Social
Config.FriendBonus = 0.10
Config.MaxFriendBonus = 0.50

-- Ganancias offline (incentiva volver)
Config.OfflineRatio = 0.25
Config.OfflineMaxSeconds = 2 * 60 * 60

-- Herramientas
Config.ScanCooldown = 3
Config.ScanCooldownPro = 1.2
Config.ScanRange = 26
Config.BatCooldown = 1.1
Config.BatRange = 9
Config.BatForce = 70

-- Recompensas diarias (D1..D7). El día 7 regala una anomalía Épica.
Config.DailyRewards = { 500, 1200, 3000, 7500, 15000, 30000, 0 }
Config.Day7Anomaly = "faceless"

-- Códigos (rótalos en Discord / TikTok para picos de tráfico)
Config.Codes = {
	ANOMALIA = 750,
	APAGON = 2500,
	LANZAMIENTO = 5000,
	IMITADOR = 1500,
}

-- Monetización. Pon aquí los IDs reales tras crearlos en el Creator Hub.
-- Con Id = 0 el botón muestra un aviso en vez de abrir la compra.
Config.GamePasses = {
	VIP = { Id = 0, Name = "VIP", Price = 199, Icon = "👑", Desc = "x2 dinero para siempre + etiqueta VIP" },
	AutoCollect = { Id = 0, Name = "Auto-Recolector", Price = 149, Icon = "🧲", Desc = "Tu dinero se recoge solo" },
	ScannerPro = { Id = 0, Name = "Escáner PRO", Price = 99, Icon = "🔬", Desc = "Escanea 2.5x más rápido" },
	Speed = { Id = 0, Name = "Zapatillas Fantasma", Price = 79, Icon = "👟", Desc = "+25% velocidad al correr" },
}
Config.Products = {
	StarterPack = { Id = 0, Name = "Pack Inicial", Price = 25, Icon = "🎁", Desc = "$5K + anomalía Épica al azar", Cash = 5000, Anomaly = "Epico" },
	Cash1 = { Id = 0, Name = "Maletín de Dinero", Price = 49, Icon = "💼", Desc = "10 min de tus ingresos (mín. $10K)", Minutes = 10, Min = 10000 },
	Cash2 = { Id = 0, Name = "Bóveda de Dinero", Price = 199, Icon = "🏦", Desc = "60 min de tus ingresos (mín. $75K)", Minutes = 60, Min = 75000 },
	ForceBlackout = { Id = 0, Name = "Provocar Apagón", Price = 99, Icon = "🌑", Desc = "Fuerza un APAGÓN para todo el servidor", Blackout = true },
}

-- Admins (UserIds) para eventos de "admin abuse". En Studio todos son admin.
Config.Admins = {}

-- Sonidos (rbxasset:// vienen con el cliente; cámbialos por IDs propios si quieres)
Config.Sounds = {
	Buy = "rbxasset://sounds/electronicpingshort.wav",
	Cash = "rbxasset://sounds/electronicpingshort.wav",
	Steal = "rbxasset://sounds/swordlunge.wav",
	Hit = "rbxasset://sounds/swordslash.wav",
	Scan = "rbxasset://sounds/unsheath.wav",
	Alarm = "rbxasset://sounds/electronicpingshort.wav",
	Click = "rbxasset://sounds/electronicpingshort.wav",
}

Config.Rarities = {
	{ Id = "Comun", Name = "Común", Color = Color3.fromRGB(175, 200, 175), Weight = 55, Order = 1 },
	{ Id = "Raro", Name = "Raro", Color = Color3.fromRGB(70, 165, 255), Weight = 26, Order = 2 },
	{ Id = "Epico", Name = "Épico", Color = Color3.fromRGB(185, 95, 255), Weight = 12.4, Order = 3 },
	{ Id = "Legendario", Name = "Legendario", Color = Color3.fromRGB(255, 200, 40), Weight = 5, Order = 4 },
	{ Id = "Mitico", Name = "Mítico", Color = Color3.fromRGB(255, 60, 125), Weight = 1.3, Order = 5 },
	{ Id = "Secreto", Name = "SECRETO", Color = Color3.fromRGB(30, 255, 205), Weight = 0.3, Order = 6 },
}
Config.RarityById = {}
for _, r in ipairs(Config.Rarities) do
	Config.RarityById[r.Id] = r
end

Config.Mutations = {
	{ Id = "Dorado", Name = "Dorado", Mult = 2, Chance = 0.06, Color = Color3.fromRGB(255, 205, 60) },
	{ Id = "Glitch", Name = "Glitch", Mult = 3, Chance = 0.03, Color = Color3.fromRGB(255, 0, 200) },
	{ Id = "Vacio", Name = "Vacío", Mult = 5, Chance = 0.015, Color = Color3.fromRGB(140, 60, 255) },
	{ Id = "Espectral", Name = "Espectral", Mult = 10, Chance = 0.005, Color = Color3.fromRGB(120, 255, 255) },
}
Config.MutationById = {}
for _, m in ipairs(Config.Mutations) do
	Config.MutationById[m.Id] = m
end

Config.Missions = {
	{ Type = "Buy", Text = "Contén %d anomalías", Target = 5, Reward = 1.0 },
	{ Type = "Steal", Text = "Roba %d anomalías", Target = 2, Reward = 1.6 },
	{ Type = "Scan", Text = "Escanea %d anomalías", Target = 8, Reward = 0.8 },
	{ Type = "Expose", Text = "Expón %d Imitador", Target = 1, Reward = 1.4 },
	{ Type = "Capture", Text = "Captura %d anomalía fugada", Target = 1, Reward = 1.4 },
	{ Type = "Survive", Text = "Sobrevive %d apagones", Target = 2, Reward = 1.0 },
	{ Type = "Hit", Text = "Golpea a %d ladrones con el bate", Target = 3, Reward = 1.0 },
}

return Config
