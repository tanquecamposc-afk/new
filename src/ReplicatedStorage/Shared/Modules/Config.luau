--!strict
--[[
	Config.luau
	Fuente unica de verdad para balance: rangos, armas, sombras y enemigos.
	Compartido cliente/servidor solo para presentacion; los calculos que
	afectan al perfil siempre se resuelven en el servidor.
]]

local Types = require(script.Parent.Parent.Types)

local Config = {}

-- Limites duros del juego --------------------------------------------------
Config.MAX_EQUIPPED_SHADOWS = 4
Config.MAX_ARISE_ATTEMPTS = 3
Config.MAX_STAT_POINTS_PER_REQUEST = 1000
Config.STAT_POINTS_PER_LEVEL = 5

-- Combate ------------------------------------------------------------------
Config.ATTACK_COOLDOWN = 0.45 -- segundos entre golpes validos
Config.ATTACK_COOLDOWN_TOLERANCE = 0.05 -- margen por latencia
Config.ATTACK_RANGE = 18 -- studs
Config.ATTACK_RANGE_TOLERANCE = 6 -- margen por interpolacion del cliente
Config.ARISE_RANGE = 20
Config.EXPLOIT_STRIKES_BEFORE_KICK = 12

-- Simulacion de sombras ----------------------------------------------------
Config.SHADOW_TICK_RATE = 0.1 -- envio de snapshots (UnreliableRemoteEvent)
Config.SHADOW_FOLLOW_RADIUS = 9
Config.SHADOW_AGGRO_RADIUS = 45
Config.SHADOW_ATTACK_RANGE = 8
Config.SHADOW_ATTACK_COOLDOWN = 1.0
Config.SHADOW_MOVE_SPEED = 26 -- studs/segundo (integracion logica, sin fisica)
Config.SHADOW_LEASH_DISTANCE = 90

-- Mazmorras ----------------------------------------------------------------
Config.PORTAL_MIN_INTERVAL = 15 * 60
Config.PORTAL_MAX_INTERVAL = 30 * 60
Config.PORTAL_LIFETIME = 120
Config.PORTAL_MAX_PARTY = 6
Config.DUNGEON_PLACE_ID = 0 -- configurar con el PlaceId real de la mazmorra
Config.DOUBLE_DUNGEON_STAT_MULTIPLIER = 2
Config.DOUBLE_DUNGEON_TIMER = 300
Config.AWAKENED_RANK_UP_LUCK = 0.60

-- Rangos: multiplicador de dano y suerte de extraccion ----------------------
export type RankInfo = { Name: string, DamageMultiplier: number, AriseLuck: number }

Config.Ranks = {
	{ Name = "E", DamageMultiplier = 0.00, AriseLuck = 0.00 },
	{ Name = "D", DamageMultiplier = 0.15, AriseLuck = 0.05 },
	{ Name = "C", DamageMultiplier = 0.35, AriseLuck = 0.10 },
	{ Name = "B", DamageMultiplier = 0.60, AriseLuck = 0.18 },
	{ Name = "A", DamageMultiplier = 1.00, AriseLuck = 0.28 },
	{ Name = "S", DamageMultiplier = 1.75, AriseLuck = 0.40 },
	{ Name = "National", DamageMultiplier = 3.00, AriseLuck = 0.60 },
	{ Name = "Monarch", DamageMultiplier = 5.00, AriseLuck = 0.85 },
} :: { RankInfo }

Config.RankByName = {} :: { [string]: RankInfo }
for index, rank in Config.Ranks do
	Config.RankByName[rank.Name] = rank
	;(Config.RankByName[rank.Name] :: any).Index = index
end

-- Armas --------------------------------------------------------------------
Config.Weapons = {
	WoodenSword = { Id = "WoodenSword", Name = "Espada de Madera", BaseDamage = 10 },
	SteelDagger = { Id = "SteelDagger", Name = "Daga de Acero", BaseDamage = 45 },
	KnightBlade = { Id = "KnightBlade", Name = "Hoja del Caballero", BaseDamage = 180 },
	DemonKingLongsword = { Id = "DemonKingLongsword", Name = "Mandiblas del Rey Demonio", BaseDamage = 900 },
	MonarchDaggers = { Id = "MonarchDaggers", Name = "Dagas del Monarca", BaseDamage = 4200 },
} :: { [string]: { Id: string, Name: string, BaseDamage: number } }

Config.DEFAULT_WEAPON = "WoodenSword"

-- Sombras ------------------------------------------------------------------
Config.Shadows = {
	Goblin = { Id = "Goblin", Name = "Goblin", Tier = "Common", BaseDamage = 12, BaseAriseChance = 0.55, GemValue = 4 },
	Wolf = { Id = "Wolf", Name = "Lobo de Hielo", Tier = "Rare", BaseDamage = 48, BaseAriseChance = 0.35, GemValue = 12 },
	Knight = { Id = "Knight", Name = "Igris", Tier = "Epic", BaseDamage = 210, BaseAriseChance = 0.18, GemValue = 40 },
	Beru = { Id = "Beru", Name = "Beru", Tier = "Legendary", BaseDamage = 950, BaseAriseChance = 0.07, GemValue = 160 },
	Bellion = { Id = "Bellion", Name = "Bellion", Tier = "Mythic", BaseDamage = 3800, BaseAriseChance = 0.025, GemValue = 700 },
	StatueOfGod = { Id = "StatueOfGod", Name = "Estatua de Dios", Tier = "Monarch", BaseDamage = 12000, BaseAriseChance = 0.01, GemValue = 3000 },
} :: { [string]: Types.ShadowDefinition }

-- Enemigos -----------------------------------------------------------------
Config.Enemies = {
	GoblinScout = { Id = "GoblinScout", Name = "Explorador Goblin", Level = 1, MaxHealth = 120, Damage = 8, ShadowId = "Goblin", ExperienceReward = 25, GoldReward = 10 },
	IceWolf = { Id = "IceWolf", Name = "Lobo de Hielo", Level = 15, MaxHealth = 1500, Damage = 60, ShadowId = "Wolf", ExperienceReward = 220, GoldReward = 95 },
	BlueKnight = { Id = "BlueKnight", Name = "Caballero Azul", Level = 40, MaxHealth = 24000, Damage = 420, ShadowId = "Knight", ExperienceReward = 2600, GoldReward = 900 },
	AntKing = { Id = "AntKing", Name = "Rey Hormiga", Level = 80, MaxHealth = 480000, Damage = 3100, ShadowId = "Beru", ExperienceReward = 42000, GoldReward = 12000 },
	ShadowCommander = { Id = "ShadowCommander", Name = "Comandante Sombrio", Level = 120, MaxHealth = 3200000, Damage = 11000, ShadowId = "Bellion", ExperienceReward = 260000, GoldReward = 70000 },
	StatueOfGod = { Id = "StatueOfGod", Name = "Estatua de Dios", Level = 200, MaxHealth = 40000000, Damage = 55000, ShadowId = "StatueOfGod", ExperienceReward = 2500000, GoldReward = 400000 },
} :: { [string]: Types.EnemyDefinition }

-- Islas --------------------------------------------------------------------
Config.Islands = {
	{ Id = "StarterVillage", Name = "Aldea Inicial", RequiredLevel = 1 },
	{ Id = "FrozenPeak", Name = "Pico Helado", RequiredLevel = 20 },
	{ Id = "DemonCastle", Name = "Castillo Demoniaco", RequiredLevel = 55 },
	{ Id = "AntIsland", Name = "Isla de las Hormigas", RequiredLevel = 95 },
	{ Id = "ShadowRealm", Name = "Reino de las Sombras", RequiredLevel = 150 },
}

table.freeze(Config)

return Config
