--!strict
-- Forge (upgrades, tempers, evolution respec) + Artisan Bench crafting. Shows requirements,
-- current stats and resulting stats before confirming. The server re-validates everything.
local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Config = Shared.Config
local RecipeConfig = require(Config.RecipeConfig)
local WeaponConfig = require(Config.WeaponConfig)
local CombatMath = require(Shared.Combat.CombatMath)
local Costs = require(Shared.Inventory.Costs)
local Kit = require(script.Parent.Parent.Kit)
local Theme = require(script.Parent.Parent.Theme)
local ViewUtil = require(script.Parent.Parent.ViewUtil)
local ClientState = require(script.Parent.Parent.Parent.ClientState)

local C = Theme.Colors
local View = {}

local function compare(parent: Instance, before: any, after: any, order: number)
	local a = CombatMath.summary(before)
	local b = CombatMath.summary(after)
	for i, entry in a do
		local changed = entry.value ~= b[i].value
		ViewUtil.para(parent, string.format("%s: %s%s", entry.label, entry.value, if changed then "  →  <b>" .. b[i].value .. "</b>" else ""), if changed then C.Good else C.TextMuted, order + i, 13)
	end
end

function View.mount(container: Instance, ctx: any)
	local tab = if ctx.data and ctx.data.station == "Bench" then "Craft" else "Forge"
	local view
	view = ViewUtil.simple(container, function(body, profile)
		local row = Kit.row(body, 0, 40)
		for i, name in { "Forge", "Craft" } do
			Kit.button({ parent = row, text = if name == "Forge" then "Forja de Armas" else "Artesanía", size = UDim2.fromOffset(180, 36), order = i, color = if tab == name then C.Accent else C.PanelLight, onClick = function()
				tab = name
				view.redraw()
			end })
		end
		local weapon = profile.weapons.Katana
		local current = CombatMath.weaponBuild("Katana", weapon)
		if tab == "Forge" then
			-- upgrade
			local target = weapon.upgrade + 1
			local recipe = RecipeConfig.Upgrades.Katana[target]
			local up = Kit.card(body, string.format("Mejorar Katana de Acero de Grieta +%d", weapon.upgrade - 1), 1, C.Gold)
			if recipe then
				local lines = ViewUtil.costLines(profile, recipe.cost)
				table.insert(lines, 1, { text = "Nivel de jugador " .. recipe.level, met = profile.level >= recipe.level })
				Kit.requirements(up, lines, 1)
				local after = table.clone(weapon)
				after.upgrade = target
				compare(up, current, CombatMath.weaponBuild("Katana", after), 10)
				local ok = Costs.canAfford(profile, recipe.cost) and profile.level >= recipe.level
				local b = Kit.button({ parent = up, text = "Mejorar a +" .. (target - 1), color = C.Gold, textColor = Color3.new(0, 0, 0), order = 30, size = UDim2.fromOffset(220, 38), onClick = function()
					ClientState.request("UpgradeWeapon", { weapon = "Katana" })
				end })
				b.setEnabled(ok, if not ok then "Faltan requisitos" else nil)
			else
				ViewUtil.para(up, "Mejora máxima alcanzada.", C.Good, 1)
			end
			-- tempers
			local tempers = Kit.card(body, "Temples (uno activo): actual " .. WeaponConfig.Tempers[weapon.temper].displayName, 2, C.Accent)
			for i, id in WeaponConfig.TemperOrder do
				if id ~= "None" then
					local def = WeaponConfig.Tempers[id]
					local recipe2 = RecipeConfig.Tempers[id]
					local card = Kit.card(tempers, def.displayName .. (if weapon.temper == id then "  (aplicado)" else ""), 10 + i)
					ViewUtil.para(card, def.description, C.TextDim, 1, 13)
					local lines = ViewUtil.costLines(profile, recipe2.cost)
					if recipe2.blueprint then
						table.insert(lines, 1, { text = "Plano: Ocaso Solar (oculto en algún lugar de Emberfall)", met = profile.blueprints[recipe2.blueprint] == true })
					end
					Kit.requirements(card, lines, 2)
					local after = table.clone(weapon)
					after.temper = id
					compare(card, current, CombatMath.weaponBuild("Katana", after), 10)
					local ok = Costs.canAfford(profile, recipe2.cost) and (not recipe2.blueprint or profile.blueprints[recipe2.blueprint] == true) and weapon.temper ~= id
					local b = Kit.button({ parent = card, text = "Aplicar temple", order = 30, onClick = function()
						ClientState.request("ApplyTemper", { temper = id })
					end })
					b.setEnabled(ok, if weapon.temper == id then "Applied" elseif not ok then "Faltan requisitos" else nil)
				end
			end
			ViewUtil.para(body, "Los temples y mejoras nunca rompen ni destruyen tu arma. Cambiar de temple reemplaza el anterior.", C.TextMuted, 3, 12)
			if weapon.evolution ~= "None" then
				local respec = Kit.card(body, "Cambiar rama de evolución", 4)
				ViewUtil.para(respec, "Cuesta " .. Costs.describe(RecipeConfig.EvolutionRespec.cost) .. ". La maestría se conserva. Usa la pestaña Maestría aquí para elegir la otra rama.", C.TextDim, 1, 13)
			end
		else
			local tools = Kit.card(body, "Banco del Artesano", 1, Color3.fromRGB(150, 210, 255))
			for i, id in RecipeConfig.CraftOrder do
				local recipe = RecipeConfig.Crafts[id]
				local card = Kit.card(tools, recipe.displayName, 10 + i)
				ViewUtil.para(card, recipe.description, C.TextDim, 1, 13)
				Kit.requirements(card, ViewUtil.costLines(profile, recipe.cost), 2)
				local done = recipe.result.kind == "Tool" and profile.tools.pickTier >= recipe.result.tier
				local ok = Costs.canAfford(profile, recipe.cost) and not done
				local b = Kit.button({ parent = card, text = "Fabricar", order = 3, onClick = function()
					ClientState.request("Craft", { recipe = id })
				end })
				b.setEnabled(ok, if done then "Ya lo tienes" elseif not ok then "Faltan materiales" else nil)
			end
		end
	end, { "profile" })
	return view
end

return View
