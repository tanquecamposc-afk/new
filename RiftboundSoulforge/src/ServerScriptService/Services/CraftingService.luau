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
		return false, "Procesando tu última petición..."
	end
	busy[player] = true
	local ok, a, b = pcall(fn)
	busy[player] = nil
	if not ok then
		warn("[Crafting] " .. tostring(a))
		return false, "La fabricación falló."
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
			return false, "Arma desconocida."
		end
		if not nearForge(player) then
			return false, "Las mejoras se hacen en la Forja."
		end
		return transaction(player, function()
			local profile = PlayerData.get(player)
			local weapon = profile.weapons.Katana
			local target = weapon.upgrade + 1
			local recipe = RecipeConfig.Upgrades.Katana[target]
			if not recipe then
				return false, "Ya tiene la mejora máxima."
			end
			if profile.level < recipe.level then
				return false, "Requiere nivel " .. recipe.level
			end
			if not Inventory.spend(player, recipe.cost) then
				local _, missing = Costs.canAfford(profile, recipe.cost)
				return false, "Falta: " .. table.concat(missing, ", ")
			end
			weapon.upgrade = target
			PlayerData.markDirty(player)
			Registry.get("CombatService").refresh(player)
			Registry.get("QuestService").record(player, "Upgrade", { weapon = "Katana", level = target })
			celebrate(player, string.format("Katana de Acero de Grieta +%d", target - 1))
			return true, "Katana mejorada a +" .. (target - 1)
		end)
	end)

	Requests.on("ApplyTemper", "Request", function(player, args)
		local temperId = args.temper
		if type(temperId) ~= "string" or not RecipeConfig.Tempers[temperId] or not WeaponConfig.Tempers[temperId] then
			return false, "Temple desconocido."
		end
		if not nearForge(player) then
			return false, "Los temples se aplican en la Forja."
		end
		return transaction(player, function()
			local profile = PlayerData.get(player)
			local weapon = profile.weapons.Katana
			if weapon.temper == temperId then
				return false, "Ese temple ya está aplicado."
			end
			local recipe = RecipeConfig.Tempers[temperId]
			if recipe.blueprint and not profile.blueprints[recipe.blueprint] then
				return false, "Requiere un plano que no has encontrado."
			end
			if not Inventory.spend(player, recipe.cost) then
				local _, missing = Costs.canAfford(profile, recipe.cost)
				return false, "Falta: " .. table.concat(missing, ", ")
			end
			weapon.temper = temperId
			PlayerData.markDirty(player)
			Registry.get("CombatService").refresh(player)
			Registry.get("QuestService").record(player, "Temper", { temper = temperId })
			celebrate(player, WeaponConfig.Tempers[temperId].displayName .. " aplicado")
			return true, WeaponConfig.Tempers[temperId].displayName .. " aplicado."
		end)
	end)

	Requests.on("Craft", "Request", function(player, args)
		local recipeId = args.recipe
		local recipe = type(recipeId) == "string" and RecipeConfig.Crafts[recipeId]
		if not recipe then
			return false, "Receta desconocida."
		end
		if not nearForge(player) then
			return false, "Se fabrica en el Banco del Artesano o en la Forja."
		end
		return transaction(player, function()
			local profile = PlayerData.get(player)
			local result = recipe.result
			if result.kind == "Tool" and profile.tools.pickTier >= result.tier then
				return false, "Ya tienes esta herramienta."
			end
			if not Inventory.spend(player, recipe.cost) then
				local _, missing = Costs.canAfford(profile, recipe.cost)
				return false, "Falta: " .. table.concat(missing, ", ")
			end
			if result.kind == "Tool" then
				profile.tools.pickTier = result.tier
				PlayerData.markDirty(player)
			elseif result.kind == "Item" then
				Inventory.addItem(player, result.item, result.amount)
			end
			Registry.get("QuestService").record(player, "Craft", { recipe = recipeId })
			celebrate(player, recipe.displayName .. " fabricado")
			return true, recipe.displayName .. " fabricado."
		end)
	end)

	Requests.on("ChooseEvolution", "Request", function(player, args)
		local branch = args.branch
		local def = WeaponConfig.Weapons.Katana
		if type(branch) ~= "string" or not def.evolutions[branch] then
			return false, "Evolución desconocida."
		end
		return transaction(player, function()
			local profile = PlayerData.get(player)
			local weapon = profile.weapons.Katana
			if weapon.mastery < def.evolutionMastery then
				return false, "Requiere maestría de katana " .. def.evolutionMastery
			end
			if not profile.trials[def.evolutionTrial] then
				return false, "Completa primero la Prueba de la Katana (Arena de Entrenamiento)."
			end
			if weapon.evolution == branch then
				return false, "Ya evolucionó en esta rama."
			end
			if weapon.evolution ~= "None" then
				-- Respec: costs coins, never mastery.
				if not nearForge(player) then
					return false, "El cambio de rama se hace en la Forja."
				end
				if not Inventory.spend(player, RecipeConfig.EvolutionRespec.cost) then
					return false, "Cambiar de rama cuesta " .. Costs.describe(RecipeConfig.EvolutionRespec.cost)
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
				subtitle = "Evolución del Arma",
				body = table.concat(evo.details, "  "),
				color = evo.trailColor,
			})
			Net.event("Effect"):FireAllClients("Evolve", { character = player.Character, color = evo.trailColor })
			return true, "Tu katana evoluciona a " .. evo.displayName .. "!"
		end)
	end)

	game:GetService("Players").PlayerRemoving:Connect(function(player)
		busy[player] = nil
	end)
end

return CraftingService
