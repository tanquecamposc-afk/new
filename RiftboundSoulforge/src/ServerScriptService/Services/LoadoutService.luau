--!strict
-- Build management: essence slots, saved loadouts, cosmetics and settings.
-- Essence swaps are allowed only in safe zones so builds are chosen before an expedition.

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Config = Shared.Config
local EssenceConfig = require(Config.EssenceConfig)
local ProgressionConfig = require(Config.ProgressionConfig)
local WorldConfig = require(Config.WorldConfig)
local Registry = require(script.Parent.Parent.Registry)

local LoadoutService = {}

local function inSafeZone(player: Player): boolean
	local root = player.Character and player.Character:FindFirstChild("HumanoidRootPart") :: BasePart?
	if not root then
		return true -- respawning: allowed
	end
	local region = WorldConfig.regionAt(root.Position)
	return region ~= nil and region.safe == true
end

local function slotCount(player: Player): number
	local Economy = Registry.get("EconomyService")
	return ProgressionConfig.FreeLoadoutSlots + (if Economy.ownsPass(player, "ExtraLoadouts") then ProgressionConfig.PassLoadoutSlots else 0)
end

local function validateEssence(profile: any, essence: any, allowEmpty: boolean): (boolean, string?)
	if allowEmpty and essence == "" then
		return true, nil
	end
	if not EssenceConfig.isPlayable(essence) then
		return false, "Esa esencia no está disponible."
	end
	if not profile.essences[essence] or not profile.essences[essence].unlocked then
		return false, "No has desbloqueado " .. tostring(essence) .. "."
	end
	return true, nil
end

local SETTINGS = {
	cameraShake = { kind = "number", min = 0, max = 1 },
	effects = { kind = "number", min = 0.2, max = 1 },
	music = { kind = "number", min = 0, max = 1 },
	sfx = { kind = "number", min = 0, max = 1 },
	hudScale = { kind = "number", min = 0.7, max = 1.3 },
	reducedClutter = { kind = "boolean" },
	highContrastTelegraphs = { kind = "boolean" },
}

function LoadoutService.Init() end

function LoadoutService.Start()
	local Requests = Registry.get("RequestService")
	local PlayerData = Registry.get("PlayerDataService")

	Requests.on("EquipEssence", "Request", function(player, args)
		local profile = PlayerData.get(player)
		local slot = args.slot
		if slot ~= "primary" and slot ~= "secondary" then
			return false, "Ranura no válida."
		end
		if not inSafeZone(player) then
			return false, "Cambia de esencias en el Nexo o en el campamento."
		end
		local ok, err = validateEssence(profile, args.essence, slot == "secondary")
		if not ok then
			return false, err
		end
		if slot == "secondary" and args.essence ~= "" and profile.level < EssenceConfig.SecondarySlotLevel then
			return false, "La ranura secundaria se desbloquea en el nivel " .. EssenceConfig.SecondarySlotLevel .. "."
		end
		local loadout = profile.loadout
		if slot == "primary" then
			if loadout.secondary == args.essence then
				loadout.secondary = loadout.primary
			end
			loadout.primary = args.essence
		else
			if loadout.primary == args.essence then
				return false, "Ya es tu esencia principal."
			end
			loadout.secondary = args.essence
		end
		PlayerData.markDirty(player)
		return true, "Equipamiento actualizado."
	end)

	Requests.on("SaveLoadout", "Request", function(player, args)
		local profile = PlayerData.get(player)
		local index = args.index
		if type(index) ~= "number" or index % 1 ~= 0 or index < 1 or index > slotCount(player) then
			return false, "Esa ranura de equipamiento está bloqueada."
		end
		if index == 2 and profile.level < 4 then
			return false, "La segunda ranura de equipamiento se desbloquea en el nivel 4."
		end
		profile.loadouts[tostring(index)] = {
			primary = profile.loadout.primary,
			secondary = profile.loadout.secondary,
			saved = os.time(),
		}
		PlayerData.markDirty(player)
		return true, "Equipamiento " .. index .. " guardado."
	end)

	Requests.on("ApplyLoadout", "Request", function(player, args)
		local profile = PlayerData.get(player)
		local saved = type(args.index) == "number" and profile.loadouts[tostring(args.index)]
		if not saved then
			return false, "Ranura de equipamiento vacía."
		end
		if not inSafeZone(player) then
			return false, "Cambia de equipamiento en el Nexo o en el campamento."
		end
		local ok, err = validateEssence(profile, saved.primary, false)
		if not ok then
			return false, err
		end
		local ok2, err2 = validateEssence(profile, saved.secondary, true)
		if not ok2 then
			return false, err2
		end
		profile.loadout.primary = saved.primary
		profile.loadout.secondary = if profile.level >= EssenceConfig.SecondarySlotLevel then saved.secondary else ""
		PlayerData.markDirty(player)
		return true, "Equipamiento aplicado."
	end)

	Requests.on("SelectCosmetic", "Request", function(player, args)
		local profile = PlayerData.get(player)
		local id = args.id
		if type(id) ~= "string" or not ProgressionConfig.Cosmetics[id] or not profile.cosmetics.owned[id] then
			return false, "No tienes ese cosmético."
		end
		profile.cosmetics.trail = id
		PlayerData.markDirty(player)
		Registry.get("CombatService").refresh(player)
		return true, "Cosmético equipado."
	end)

	Requests.on("UpdateSettings", "Request", function(player, args)
		local profile = PlayerData.get(player)
		for key, value in args do
			local rule = SETTINGS[key]
			if rule then
				if rule.kind == "number" and type(value) == "number" and value == value then
					profile.settings[key] = math.clamp(value, rule.min, rule.max)
				elseif rule.kind == "boolean" and type(value) == "boolean" then
					profile.settings[key] = value
				end
			end
		end
		PlayerData.markDirty(player)
		return true, nil
	end)
end

return LoadoutService
