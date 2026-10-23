--!strict
-- Pure build maths: turns a weapon's persistent state into an effective moveset.
-- Used by the server (authoritative) and by the client (forge previews, local timing).

local Config = script.Parent.Parent.Config
local WeaponConfig = require(Config.WeaponConfig)
local GameConfig = require(Config.GameConfig)

local CombatMath = {}

export type WeaponState = { mastery: number, upgrade: number, temper: string, evolution: string }

function CombatMath.weaponBuild(weaponId: string, state: WeaponState)
	local def = WeaponConfig.Weapons[weaponId]
	assert(def and def.implemented, "weapon not implemented: " .. tostring(weaponId))
	local temper = WeaponConfig.Tempers[state.temper] or WeaponConfig.Tempers.None
	local evo = def.evolutions[state.evolution]
	local upgrade = math.clamp(math.floor(state.upgrade or 1), 1, WeaponConfig.MaxUpgrade)
	local mastery = state.mastery or 1

	local light = {}
	for _, strike in def.light do
		if (strike.masteryRequired or 0) <= mastery then
			table.insert(light, strike)
		end
	end
	if evo and evo.extraLight and #light >= #def.light then
		table.insert(light, evo.extraLight)
	end

	local base = def.baseDamage * WeaponConfig.UpgradeDamage[upgrade] * (temper.damage or 1)
	if mastery >= 10 then
		base *= 1.1
	end

	local block = def.block
	return {
		weaponId = weaponId,
		base = base,
		light = light,
		heavy = (evo and evo.heavy) or def.heavy,
		heavyMult = temper.heavyDamage or 1,
		heavyStaggerBonus = (temper.heavyStagger or 0) + (if mastery >= 2 then 0.4 else 0),
		attackSpeed = ((evo and evo.attackSpeed) or 1) * (temper.attackSpeed or 1),
		parryWindow = block.parryWindow + ((evo and evo.parryWindowBonus) or 0) + (temper.parryWindowBonus or 0),
		blockReduction = math.min(0.95, block.damageReduction + ((evo and evo.blockBonus) or 0) + (temper.blockBonus or 0)),
		blockStamina = block.staminaPerHit,
		dodge = def.dodge,
		dodgeCooldown = def.dodge.cooldown * ((evo and evo.dodgeCooldownMult) or 1),
		abilityMult = temper.abilityDamage or 1,
		resonanceMult = (temper.resonanceGain or 1) * (if mastery >= 7 then 1.15 else 1),
		trailColor = (evo and evo.trailColor) or def.trailColor,
		finisherShockwave = temper.finisherShockwave == true,
		riposte = evo and evo.riposteDamage,
		evolution = state.evolution,
		comboResetTime = def.comboResetTime,
	}
end

-- Ability power scales gently with player level and essence mastery.
function CombatMath.abilityPower(playerLevel: number, essenceMastery: number, abilityMult: number): number
	local power = 12 * (1 + 0.04 * (playerLevel - 1))
	if essenceMastery >= 5 then
		power *= 1.15
	end
	return power * abilityMult
end

-- Combo rank for a hit count: returns the rank letter (or nil below the first rank) and the
-- damage / resonance bonus it grants.
function CombatMath.comboRank(count: number): (string?, number)
	for _, tier in GameConfig.Combat.ComboRanks do
		if count >= tier.min then
			return tier.rank, tier.bonus
		end
	end
	return nil, 0
end

-- Critical chance for katana strikes at a given combo count.
function CombatMath.critChance(combo: number): number
	local c = GameConfig.Combat
	return math.min(c.CritCap, c.CritBase + math.floor(math.max(0, combo) / 5) * c.CritPerFiveCombo)
end

-- Elemental affinity of an enemy definition against the essences of a cast.
-- Weakness wins if any essence matches it; resistance applies only if every essence is resisted.
function CombatMath.affinity(def: any, essences: { string }): (number, string?)
	local c = GameConfig.Combat
	if not def or #essences == 0 then
		return 1, nil
	end
	for _, essence in essences do
		if def.weakTo == essence then
			return c.WeakMult, "weak"
		end
	end
	if def.resists then
		for _, essence in essences do
			if def.resists ~= essence then
				return 1, nil
			end
		end
		return c.ResistMult, "resist"
	end
	return 1, nil
end

-- Human readable stats for UI comparisons.
function CombatMath.summary(build): { { label: string, value: string } }
	local lightTotal = 0
	for _, strike in build.light do
		lightTotal += strike.damage
	end
	local heavy = build.heavy
	return {
		{ label = "Daño de golpe", value = string.format("%.1f", build.base) },
		{ label = "Longitud del combo", value = tostring(#build.light) .. " golpes" },
		{ label = "Daño del combo completo", value = string.format("%.0f", build.base * lightTotal) },
		{ label = "Pesado (" .. heavy.name .. ")", value = string.format("%.0f", build.base * heavy.damage * build.heavyMult) },
		{ label = "Velocidad de ataque", value = string.format("x%.2f", build.attackSpeed) },
		{ label = "Ventana de parada", value = string.format("%.2fs", build.parryWindow) },
		{ label = "Reducción al bloquear", value = string.format("%d%%", math.floor(build.blockReduction * 100 + 0.5)) },
		{ label = "Daño de habilidades", value = string.format("x%.2f", build.abilityMult) },
	}
end

return CombatMath
