-- Configuración global de Steal an Anomaly.
-- Todo el balance del juego vive aquí: cambia números sin tocar la lógica.
local Config = {}

Config.GameName = "Steal an Anomaly"

-- Economía básica
Config.StartCash = 250
Config.SellRatio = 0.5              -- vender un paciente devuelve 50% de su valor
Config.WalkSpeed = 20
Config.CarrySpeed = 13              -- velocidad cargando un huevo o una anomalía
Config.StealHold = 1.6              -- segundos manteniendo E para robar
Config.CaptureHold = 1.0
Config.WalkToBedSpeed = 16

-- Mercado de la Grieta (estilo Steal an Egg)
Config.Pedestals = 10               -- pedestales de huevos en el mercado
Config.MiniRestock = 60             -- cada minuto se rellenan los pedestales vacíos
Config.ContaminationChance = 0.13   -- huevo contaminado: eclosiona un IMITADOR
Config.MimicTells = { "redeyes", "noshadow", "inverted", "flicker", "wrongcolor" }

-- Fotos Polaroid (estilo Animal Hospital)
Config.PhotoCooldown = 4
Config.PhotoCooldownPro = 1.5
Config.PhotoRange = 30
Config.ReportBountyRatio = 0.6      -- recompensa por reportar un Imitador (x valor aparente)
Config.FalseReportFine = 0.15       -- multa por reportar una anomalía real (x su valor)
Config.PhotoSigns = { "ojos", "silueta", "invertida", "sincabeza", "estatica" }

-- Cuidados de pacientes
Config.ConditionMin = 70            -- segundos mínimos entre síntomas
Config.ConditionMax = 140
Config.CriticalAfter = 60           -- sin tratar este tiempo => CRÍTICO (se fuga en el apagón)
Config.TreatHold = 1.2
Config.TreatTipSeconds = 25         -- propina = 25 s de ingresos del paciente
Config.HelperTipRatio = 0.5         -- si tratas al paciente de otro, recibes la mitad de la propina
Config.ComboWindow = 25
Config.ComboMax = 5
Config.Conditions = {
	{ Id = "Fiebre", Name = "Fiebre", Icon = "🔥", Color = Color3.fromRGB(255, 120, 40), Action = "Enfriar" },
	{ Id = "Glitch", Name = "Glitch", Icon = "🌀", Color = Color3.fromRGB(255, 0, 200), Action = "Reiniciar" },
	{ Id = "Panico", Name = "Pánico", Icon = "💢", Color = Color3.fromRGB(255, 60, 60), Action = "Calmar" },
	{ Id = "Hambre", Name = "Hambre", Icon = "🍖", Color = Color3.fromRGB(255, 210, 80), Action = "Alimentar" },
}

-- Ciclo global: restock de 5 minutos + turno de noche
Config.CycleLength = 300
Config.BlackoutDuration = 50
Config.BlackoutWarning = 10
Config.BreachChance = 0.12          -- fuga de pacientes estables en el apagón
Config.BreachReducePerLevel = 0.02
Config.BreachReturnDelay = 30

-- Cordura (turno de noche)
Config.SanityMax = 100
Config.SanityDrain = 1.6            -- por segundo fuera de tu clínica durante el apagón
Config.SanityMimicDrain = 6         -- extra cerca de un Imitador suelto
Config.SanityRegen = 6              -- dentro de tu clínica
Config.CoffeeRestore = 45

-- Bases (clínicas)
Config.BaseStartBeds = 4
Config.MaxBeds = 10
Config.BaseStartIncubators = 2
Config.MaxIncubators = 4
Config.BaseUpgradeCost = { 1500, 8000, 40000, 175000, 750000, 2500000 }
Config.LockDuration = 60
Config.LockPerLevel = 6

-- Ascensos (rebirth)
Config.RebirthBonus = 0.5
function Config.RebirthCost(rebirths)
	return math.floor(300000 * (rebirths + 1) ^ 2.3)
end

-- Social
Config.FriendBonus = 0.10
Config.MaxFriendBonus = 0.50

-- Ganancias offline
Config.OfflineRatio = 0.25
Config.OfflineMaxSeconds = 2 * 60 * 60

-- Herramientas
Config.BatCooldown = 1.1
Config.BatRange = 9
Config.BatForce = 70

-- Recompensas diarias (D1..D7). El día 7 regala un Huevo Épico ya incubando.
Config.DailyRewards = { 500, 1200, 3000, 7500, 15000, 30000, 0 }
Config.Day7Egg = "epico"

-- Códigos
Config.Codes = {
	ANOMALIA = 750,
	APAGON = 2500,
	LANZAMIENTO = 5000,
	POLAROID = 1500,
	HOSPITAL = 2000,
}

-- Monetización. Pon aquí los IDs reales tras crearlos en el Creator Hub.
Config.GamePasses = {
	VIP = { Id = 0, Name = "VIP", Price = 199, Icon = "👑", Desc = "x2 dinero para siempre + etiqueta VIP" },
	AutoCollect = { Id = 0, Name = "Auto-Caja", Price = 149, Icon = "🧲", Desc = "Tus honorarios se cobran solos" },
	CameraPro = { Id = 0, Name = "Cámara PRO", Price = 99, Icon = "📸", Desc = "Fotos 2.5x más rápidas" },
	FastHatch = { Id = 0, Name = "Incubadora Turbo", Price = 249, Icon = "⚡", Desc = "Los huevos eclosionan 2x más rápido" },
	Speed = { Id = 0, Name = "Zapatillas Fantasma", Price = 79, Icon = "👟", Desc = "+25% velocidad al correr" },
}
Config.Products = {
	StarterPack = { Id = 0, Name = "Pack Inicial", Price = 25, Icon = "🎁", Desc = "$5K + Huevo Épico incubando", Cash = 5000, Egg = "epico" },
	Cash1 = { Id = 0, Name = "Maletín", Price = 49, Icon = "💼", Desc = "10 min de ingresos (mín. $10K)", Minutes = 10, Min = 10000 },
	Cash2 = { Id = 0, Name = "Bóveda", Price = 199, Icon = "🏦", Desc = "60 min de ingresos (mín. $75K)", Minutes = 60, Min = 75000 },
	HatchNow = { Id = 0, Name = "Eclosión Instantánea", Price = 29, Icon = "🐣", Desc = "Todas tus incubadoras eclosionan YA", HatchAll = true },
	ForceBlackout = { Id = 0, Name = "Provocar Apagón", Price = 99, Icon = "🌑", Desc = "Fuerza el turno de noche en el servidor", Blackout = true },
}

-- Admins (UserIds) para eventos de "admin abuse". En Studio todos son admin.
Config.Admins = {}

-- Sonidos (rbxasset:// vienen con el cliente; cámbialos por IDs propios)
Config.Sounds = {
	Buy = "rbxasset://sounds/electronicpingshort.wav",
	Cash = "rbxasset://sounds/electronicpingshort.wav",
	Steal = "rbxasset://sounds/swordlunge.wav",
	Hit = "rbxasset://sounds/swordslash.wav",
	Photo = "rbxasset://sounds/unsheath.wav",
	Alarm = "rbxasset://sounds/electronicpingshort.wav",
	Click = "rbxasset://sounds/electronicpingshort.wav",
	Hatch = "rbxasset://sounds/swordlunge.wav",
}

Config.Rarities = {
	{ Id = "Comun", Name = "Común", Color = Color3.fromRGB(175, 200, 175), Order = 1 },
	{ Id = "Raro", Name = "Raro", Color = Color3.fromRGB(70, 165, 255), Order = 2 },
	{ Id = "Epico", Name = "Épico", Color = Color3.fromRGB(185, 95, 255), Order = 3 },
	{ Id = "Legendario", Name = "Legendario", Color = Color3.fromRGB(255, 200, 40), Order = 4 },
	{ Id = "Mitico", Name = "Mítico", Color = Color3.fromRGB(255, 60, 125), Order = 5 },
	{ Id = "Secreto", Name = "SECRETO", Color = Color3.fromRGB(30, 255, 205), Order = 6 },
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

-- Huevos: precio, tiempo de incubación y probabilidades de rareza
Config.Eggs = {
	{ Id = "comun", Name = "Huevo Común", Price = 100, Hatch = 20, Color = Color3.fromRGB(190, 210, 190), Spots = Color3.fromRGB(110, 140, 110), Weight = 50,
		Pool = { Comun = 85, Raro = 15 } },
	{ Id = "raro", Name = "Huevo Raro", Price = 1500, Hatch = 40, Color = Color3.fromRGB(90, 170, 255), Spots = Color3.fromRGB(30, 80, 190), Weight = 28,
		Pool = { Raro = 75, Epico = 25 } },
	{ Id = "epico", Name = "Huevo Épico", Price = 20000, Hatch = 80, Color = Color3.fromRGB(185, 100, 255), Spots = Color3.fromRGB(90, 30, 170), Weight = 13,
		Pool = { Epico = 78, Legendario = 22 } },
	{ Id = "legendario", Name = "Huevo Legendario", Price = 150000, Hatch = 140, Color = Color3.fromRGB(255, 205, 60), Spots = Color3.fromRGB(200, 120, 20), Weight = 6,
		Pool = { Legendario = 82, Mitico = 18 } },
	{ Id = "mitico", Name = "Huevo Mítico", Price = 1000000, Hatch = 220, Color = Color3.fromRGB(255, 70, 130), Spots = Color3.fromRGB(150, 10, 60), Weight = 2.4,
		Pool = { Mitico = 88, Secreto = 12 } },
	{ Id = "vacio", Name = "Huevo del Vacío", Price = 8000000, Hatch = 300, Color = Color3.fromRGB(20, 10, 30), Spots = Color3.fromRGB(30, 255, 205), Weight = 0.6,
		Pool = { Secreto = 100 } },
}
Config.EggById = {}
for i, e in ipairs(Config.Eggs) do
	e.Order = i
	Config.EggById[e.Id] = e
end

Config.Missions = {
	{ Type = "Buy", Text = "Compra %d huevos", Target = 4, Reward = 1.0 },
	{ Type = "Hatch", Text = "Eclosiona %d huevos", Target = 4, Reward = 1.0 },
	{ Type = "Treat", Text = "Trata %d síntomas", Target = 10, Reward = 1.2 },
	{ Type = "Steal", Text = "Roba %d veces", Target = 2, Reward = 1.6 },
	{ Type = "Photo", Text = "Saca %d fotos", Target = 8, Reward = 0.8 },
	{ Type = "Report", Text = "Reporta %d Imitador", Target = 1, Reward = 1.5 },
	{ Type = "Capture", Text = "Captura %d anomalía fugada", Target = 1, Reward = 1.4 },
	{ Type = "Survive", Text = "Sobrevive %d turnos de noche", Target = 2, Reward = 1.0 },
	{ Type = "Hit", Text = "Golpea a %d ladrones", Target = 3, Reward = 1.0 },
}

return Config
