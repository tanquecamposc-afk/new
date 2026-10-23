--!strict
-- Power Fusion: research (discovery + masteries + cost, at the Fusion Chamber), attunement
-- (the playable challenge: chain essence A into essence B on the same enemy) and essence attunement.

local Players = game:GetService("Players")

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Config = Shared.Config
local FusionConfig = require(Config.FusionConfig)
local EssenceConfig = require(Config.EssenceConfig)
local WorldConfig = require(Config.WorldConfig)
local Costs = require(Shared.Inventory.Costs)
local Net = require(Shared.Net)
local Registry = require(script.Parent.Parent.Registry)

local FusionService = {}

local lastAttuneCast: { [Player]: number } = {}
local hinted: { [Player]: { [string]: boolean } } = {}

local function data(player: Player): any
	return Registry.get("PlayerDataService").get(player)
end

local function notify(player: Player, kind: string, text: string, extra: any?)
	Net.event("Notify"):FireClient(player, kind, text, extra)
end

-- Returns (ok, missing list) for research requirements.
function FusionService.researchStatus(profile: any, fusionId: string): (boolean, { string })
	local def = FusionConfig.Fusions[fusionId]
	local missing = {}
	if not def or not def.implemented then
		return false, { "No disponible en esta versión" }
	end
	for _, essence in def.essences do
		if not profile.essences[essence] or not profile.essences[essence].unlocked then
			table.insert(missing, essence .. " (esencia)")
		end
	end
	local research = def.research
	for essence, level in research.masteries do
		local record = profile.essences[essence]
		if not record or record.mastery < level then
			table.insert(missing, string.format("%s maestría %d", essence, level))
		end
	end
	if research.discovery and not profile.codex.discoveries[research.discovery] then
		table.insert(missing, "Descubrimiento: ???")
	end
	local affordable, lacking = Costs.canAfford(profile, research.cost)
	if not affordable then
		for _, item in lacking do
			table.insert(missing, item)
		end
	end
	return #missing == 0, missing
end

local function unlockFusion(player: Player, profile: any, fusionId: string)
	local def = FusionConfig.Fusions[fusionId]
	local record = profile.fusions[fusionId]
	record.unlocked = true
	Registry.get("PlayerDataService").markDirty(player)
	local Progression = Registry.get("ProgressionService")
	Progression.achieve(player, "FirstFusion")
	Progression.present(player, "Fusion_" .. fusionId, {
		title = def.displayName,
		subtitle = "Técnica de Fusión Desbloqueada",
		body = def.summary .. " Equipa " .. EssenceConfig.names(def.essences) .. " y pulsa R.",
		color = def.color,
	})
	notify(player, "Unlock", def.displayName .. " ¡desbloqueado! (R)", { color = def.color })
	Net.event("Effect"):FireClient(player, "Sound", { name = "FusionActivation" })
end

function FusionService.onAbilityHit(player: Player, record: any, essences: { string }, castId: number)
	if #essences ~= 1 or record.kind == "Training" then
		return
	end
	local essence = essences[1]
	local profile = data(player)
	if not profile then
		return
	end
	local t = os.clock()
	local uid = player.UserId
	local prev = record.tags[uid]
	if prev and prev.essence ~= essence and prev.cast ~= castId then
		local fusionId = FusionConfig.forPair(prev.essence, essence)
		local def = fusionId and FusionConfig.Fusions[fusionId]
		if fusionId and def and def.implemented and t - prev.time <= def.attunement.window then
			local fusion = profile.fusions[fusionId]
			if fusion and not fusion.unlocked then
				if fusion.researched then
					if lastAttuneCast[player] ~= castId then
						lastAttuneCast[player] = castId
						fusion.attunement = math.min(def.attunement.count, fusion.attunement + 1)
						Registry.get("PlayerDataService").markDirty(player)
						notify(player, "Attune", string.format("%s sintonía %d/%d", def.displayName, fusion.attunement, def.attunement.count), { color = def.color })
						if fusion.attunement >= def.attunement.count then
							unlockFusion(player, profile, fusionId)
						end
					end
				else
					hinted[player] = hinted[player] or {}
					if not hinted[player][fusionId] then
						hinted[player][fusionId] = true
						notify(
							player,
							"Hint",
							string.format("%s y %s resuenan... Investiga esta unión en la Cámara de Fusión.", def.essences[1], def.essences[2]),
							{ color = def.color }
						)
					end
				end
			end
		end
	end
	record.tags[uid] = { essence = essence, time = t, cast = castId }
end

function FusionService.refreshResearchHints(_player: Player)
	-- Research availability is computed client-side from the synced profile (Fusion Codex);
	-- this hook exists so future systems can push proactive hints.
end

local function nearChamber(player: Player): boolean
	return Registry.get("SecurityService").within(player, WorldConfig.Points.FusionChamber, 28)
end

function FusionService.Init() end

function FusionService.Start()
	local Requests = Registry.get("RequestService")
	Requests.on("ResearchFusion", "Request", function(player, args)
		local id = args.id
		if type(id) ~= "string" or not FusionConfig.Fusions[id] then
			return false, "Fusión desconocida."
		end
		if not nearChamber(player) then
			return false, "La investigación se hace en la Cámara de Fusión."
		end
		local profile = data(player)
		local fusion = profile.fusions[id]
		if not fusion then
			return false, "Esta fusión aún no se puede investigar."
		end
		if fusion.researched then
			return false, "Ya investigado."
		end
		local ok, missing = FusionService.researchStatus(profile, id)
		if not ok then
			return false, "Falta: " .. table.concat(missing, ", ")
		end
		if not Registry.get("InventoryService").spend(player, FusionConfig.Fusions[id].research.cost) then
			return false, "No puedes pagar la investigación."
		end
		fusion.researched = true
		Registry.get("PlayerDataService").markDirty(player)
		local def = FusionConfig.Fusions[id]
		return true, "Investigación completa. Ahora sintoniza: " .. def.attunement.description
	end)

	Requests.on("AttuneEssence", "Request", function(player, args)
		local essence = args.essence
		if not EssenceConfig.isPlayable(essence) then
			return false, "Esencia desconocida."
		end
		if not nearChamber(player) then
			return false, "La sintonía se hace en la Cámara de Fusión."
		end
		local profile = data(player)
		local def = EssenceConfig.Essences[essence]
		if profile.essences[essence].unlocked then
			return false, "Ya sintonizada."
		end
		if not def.attuneCost then
			return false, "Esta esencia no se puede sintonizar aquí."
		end
		if profile.level < (def.attuneLevel or 1) then
			return false, "Requiere nivel " .. tostring(def.attuneLevel)
		end
		if not Registry.get("InventoryService").spend(player, def.attuneCost) then
			return false, "Falta: " .. Costs.describe(def.attuneCost)
		end
		Registry.get("ProgressionService").unlockEssence(player, essence, "Sintonizada en la Cámara de Fusión.")
		return true, def.displayName .. " sintonizada."
	end)

	Players.PlayerRemoving:Connect(function(player)
		lastAttuneCast[player] = nil
		hinted[player] = nil
	end)
end

return FusionService
