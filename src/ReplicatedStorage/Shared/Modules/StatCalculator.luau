--!strict
--[[
	StatCalculator.luau
	Funciones puras (sin efectos secundarios, sin acceso a Instances) para que
	cliente y servidor calculen exactamente el mismo numero y las pruebas de
	integracion puedan verificarlas sin levantar el juego.
]]

local Types = require(script.Parent.Parent.Types)
local Config = require(script.Parent.Config)

local StatCalculator = {}

--[[
	Dano fisico total.
		DanoTotal = (DanoBaseArma + (STR * 1.5)) * (1 + MultiplicadorRango)
]]
function StatCalculator.GetPhysicalDamage(weaponBaseDamage: number, strength: number, rankMultiplier: number): number
	assert(weaponBaseDamage >= 0, "weaponBaseDamage debe ser no negativo")
	assert(strength >= 0, "strength debe ser no negativo")
	return (weaponBaseDamage + (strength * 1.5)) * (1 + rankMultiplier)
end

function StatCalculator.GetRankInfo(rankName: string): Config.RankInfo
	return Config.RankByName[rankName] or Config.Ranks[1]
end

function StatCalculator.GetWeaponBaseDamage(weaponId: string): number
	local weapon = Config.Weapons[weaponId] or Config.Weapons[Config.DEFAULT_WEAPON]
	return weapon.BaseDamage
end

-- Dano del jugador resuelto desde su perfil completo.
function StatCalculator.GetProfileDamage(profile: Types.PlayerProfile): number
	local rank = StatCalculator.GetRankInfo(profile.Rank)
	local multiplier = rank.DamageMultiplier
	if profile.IsAwakened then
		multiplier += 0.25
	end
	return StatCalculator.GetPhysicalDamage(
		StatCalculator.GetWeaponBaseDamage(profile.EquippedWeapon),
		profile.Stats.STR,
		multiplier
	)
end

--[[
	Tasa de exito de extraccion.
		TasaExito = ProbabilidadBase + (ProbabilidadBase * AriseLuck)
	Se limita a [0, 1] porque AriseLuck acumulada puede superar 1.
]]
function StatCalculator.GetAriseChance(baseChance: number, ariseLuck: number): number
	local chance = baseChance + (baseChance * ariseLuck)
	return math.clamp(chance, 0, 1)
end

-- Suerte total de extraccion de un perfil (rango + INT + despertar + titulo).
function StatCalculator.GetAriseLuck(profile: Types.PlayerProfile): number
	local luck = StatCalculator.GetRankInfo(profile.Rank).AriseLuck
	luck += profile.Stats.INT * 0.002
	if profile.IsAwakened then
		luck += Config.AWAKENED_RANK_UP_LUCK
	end
	return luck
end

-- Dano de una Sombra: escala con su nivel y con el atributo SDW del dueno.
function StatCalculator.GetShadowDamage(shadow: Types.ShadowData, ownerStats: Types.StatBlock): number
	local levelScale = 1 + ((shadow.Level - 1) * 0.08)
	local sdwScale = 1 + (ownerStats.SDW * 0.01)
	return shadow.BaseDamage * levelScale * sdwScale
end

-- Vida maxima derivada de VIT.
function StatCalculator.GetMaxHealth(stats: Types.StatBlock): number
	return 100 + (stats.VIT * 12)
end

-- Mana maximo derivado de MNA.
function StatCalculator.GetMaxMana(stats: Types.StatBlock): number
	return 50 + (stats.MNA * 8)
end

-- Velocidad de desplazamiento derivada de AGI (con techo anti-exploit).
function StatCalculator.GetWalkSpeed(stats: Types.StatBlock): number
	return math.min(16 + (stats.AGI * 0.12), 120)
end

-- Experiencia requerida para el siguiente nivel (curva cuadratica suave).
function StatCalculator.GetExperienceForLevel(level: number): number
	return math.floor(100 * (level ^ 1.55))
end

-- Gemas otorgadas al descartar un cadaver inerte.
function StatCalculator.GetGemsForEnemy(definition: Types.EnemyDefinition): number
	local shadow = Config.Shadows[definition.ShadowId]
	local base = if shadow then shadow.GemValue else 1
	return math.max(1, math.floor(base + definition.Level * 1.5))
end

table.freeze(StatCalculator)

return StatCalculator
