--!strict
-- Forge & Artisan Bench. Deterministic recipes; every check and mutation happens here.
-- Requests must be made near the relevant station. No recipe can destroy equipment.

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Config = Shared.Config
local RecipeConfig = require(Config.RecipeConfig)
local WeaponConfig = require(Config.WeaponConfig)
local WorldConfig = require(Config.WorldConfig)
local Costs = require(Shared.Inventory.Costs)
local Net = require(Shared.Net)
local Registry = require(script.Parent.Parent.Registry)

local CraftingService = {}

local busy: { [Player]: boolean } = {}

local function near(player: Player, point: Vector3): boolean
	return Registry.get("SecurityService").within(player, point, 30)
end

local function nearForge(player: Player): boolean
	return near(player, WorldConfig.Points.Forge) or near(player, WorldConfig.Points.ArtisanBench)
end

-- Wraps a transaction so one player cannot run two at once (double-click / duplicate requests).
local function transaction(player: Player, fn: () -> (boolean, string?)): (boolean, string?)
	if busy[player] then
		return false, "Working on your last request..."
	end
	busy[player] = true
	local ok, a, b = pcall(fn)
	busy[player] = nil
	if not ok then
		warn("[Crafting] " .. tostring(a))
		return false, "Crafting failed."
	end
	return a, b
end

local function celebrate(player: Player, title: string)
	Net.event("Effect"):FireAllClients("Craft", { character = player.Character })
	Net.event("Effect"):FireClient(player, "Sound", { name = "CraftSuccess" })
	Net.event("Notify"):FireClient(player, "Craft", title)
	Registry.get("ProgressionService").stat(player, "crafts")
end

function CraftingService.Init() end

function CraftingService.Start()
	local Requests = Registry.get("RequestService")
	local PlayerData = Registry.get("PlayerDataService")
	local Inventory = Registry.get("InventoryService")

	Requests.on("UpgradeWeapon", "Request", function(player, args)
		if args.weapon ~= "Katana" then
			return false, "Unknown weapon."
		end
		if not nearForge(player) then
			return false, "Upgrades are done at the Forge."
		end
		return transaction(player, function()
			local profile = PlayerData.get(player)
			local weapon = profile.weapons.Katana
			local target = weapon.upgrade + 1
			local recipe = RecipeConfig.Upgrades.Katana[target]
			if not recipe then
				return false, "Already at maximum upgrade."
			end
			if profile.level < recipe.level then
				return false, "Requires level " .. recipe.level
			end
			if not Inventory.spend(player, recipe.cost) then
				local _, missing = Costs.canAfford(profile, recipe.cost)
				return false, "Missing: " .. table.concat(missing, ", ")
			end
			weapon.upgrade = target
			PlayerData.markDirty(player)
			Registry.get("CombatService").refresh(player)
			Registry.get("QuestService").record(player, "Upgrade", { weapon = "Katana", level = target })
			celebrate(player, string.format("Riftsteel Katana +%d", target - 1))
			return true, "Katana upgraded to +" .. (target - 1)
		end)
	end)

	Requests.on("ApplyTemper", "Request", function(player, args)
		local temperId = args.temper
		if type(temperId) ~= "string" or not RecipeConfig.Tempers[temperId] or not WeaponConfig.Tempers[temperId] then
			return false, "Unknown temper."
		end
		if not nearForge(player) then
			return false, "Tempers are applied at the Forge."
		end
		return transaction(player, function()
			local profile = PlayerData.get(player)
			local weapon = profile.weapons.Katana
			if weapon.temper == temperId then
				return false, "That temper is already applied."
			end
			local recipe = RecipeConfig.Tempers[temperId]
			if recipe.blueprint and not profile.blueprints[recipe.blueprint] then
				return false, "Requires a blueprint you have not found."
			end
			if not Inventory.spend(player, recipe.cost) then
				local _, missing = Costs.canAfford(profile, recipe.cost)
				return false, "Missing: " .. table.concat(missing, ", ")
			end
			weapon.temper = temperId
			PlayerData.markDirty(player)
			Registry.get("CombatService").refresh(player)
			Registry.get("QuestService").record(player, "Temper", { temper = temperId })
			celebrate(player, WeaponConfig.Tempers[temperId].displayName .. " applied")
			return true, WeaponConfig.Tempers[temperId].displayName .. " applied."
		end)
	end)

	Requests.on("Craft", "Request", function(player, args)
		local recipeId = args.recipe
		local recipe = type(recipeId) == "string" and RecipeConfig.Crafts[recipeId]
		if not recipe then
			return false, "Unknown recipe."
		end
		if not nearForge(player) then
			return false, "Crafting is done at the Artisan Bench or Forge."
		end
		return transaction(player, function()
			local profile = PlayerData.get(player)
			local result = recipe.result
			if result.kind == "Tool" and profile.tools.pickTier >= result.tier then
				return false, "You already own this tool."
			end
			if not Inventory.spend(player, recipe.cost) then
				local _, missing = Costs.canAfford(profile, recipe.cost)
				return false, "Missing: " .. table.concat(missing, ", ")
			end
			if result.kind == "Tool" then
				profile.tools.pickTier = result.tier
				PlayerData.markDirty(player)
			elseif result.kind == "Item" then
				Inventory.addItem(player, result.item, result.amount)
			end
			Registry.get("QuestService").record(player, "Craft", { recipe = recipeId })
			celebrate(player, recipe.displayName .. " crafted")
			return true, recipe.displayName .. " crafted."
		end)
	end)

	Requests.on("ChooseEvolution", "Request", function(player, args)
		local branch = args.branch
		local def = WeaponConfig.Weapons.Katana
		if type(branch) ~= "string" or not def.evolutions[branch] then
			return false, "Unknown evolution."
		end
		return transaction(player, function()
			local profile = PlayerData.get(player)
			local weapon = profile.weapons.Katana
			if weapon.mastery < def.evolutionMastery then
				return false, "Requires Katana mastery " .. def.evolutionMastery
			end
			if not profile.trials[def.evolutionTrial] then
				return false, "Complete the Katana Trial first (Training Arena)."
			end
			if weapon.evolution == branch then
				return false, "Already evolved into this branch."
			end
			if weapon.evolution ~= "None" then
				-- Respec: costs coins, never mastery.
				if not nearForge(player) then
					return false, "Changing branch is done at the Forge."
				end
				if not Inventory.spend(player, RecipeConfig.EvolutionRespec.cost) then
					return false, "Changing branch costs " .. Costs.describe(RecipeConfig.EvolutionRespec.cost)
				end
			end
			weapon.evolution = branch
			PlayerData.markDirty(player)
			Registry.get("CombatService").refresh(player)
			local evo = def.evolutions[branch]
			local Progression = Registry.get("ProgressionService")
			Progression.achieve(player, "Evolved")
			Progression.present(player, "Evolution_" .. branch, {
				title = evo.displayName,
				subtitle = "Weapon Evolution",
				body = table.concat(evo.details, "  "),
				color = evo.trailColor,
			})
			Net.event("Effect"):FireAllClients("Evolve", { character = player.Character, color = evo.trailColor })
			return true, "Your katana evolves into " .. evo.displayName .. "!"
		end)
	end)

	game:GetService("Players").PlayerRemoving:Connect(function(player)
		busy[player] = nil
	end)
end

return CraftingService
