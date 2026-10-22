-- Cordura (estilo Animal Hospital): durante el turno de noche baja fuera de
-- tu clínica y mucho más cerca de un Imitador suelto. A 0 te desmayas:
-- sueltas lo que llevas y despiertas en tu clínica.
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Config = require(ReplicatedStorage.Shared.Config)

local Sanity = {}
local ctx
local values = {}
local coffeeCd = {}
local TICK = 0.5

local function set(player, v)
	v = math.clamp(v, 0, Config.SanityMax)
	values[player] = v
	player:SetAttribute("Sanity", math.floor(v + 0.5))
end

function Sanity.Get(player)
	return values[player] or Config.SanityMax
end

function Sanity.Add(player, delta)
	set(player, Sanity.Get(player) + delta)
end

local function faint(player)
	ctx.Steal.Drop(player, "faint")
	ctx.Remotes.Knock:FireClient(player, Vector3.new(0, 0, 0), 0, true)
	ctx.Notify(player, "😵 ¡Perdiste la cordura y te desmayaste!", Color3.fromRGB(200, 120, 255))
	task.delay(1.2, function()
		if player.Parent then
			ctx.Bases.Teleport(player)
			set(player, Config.SanityMax * 0.5)
		end
	end)
end

function Sanity.Coffee(player, model)
	local b = ctx.Bases.ByModel(model)
	if not b or b.Player ~= player then
		return
	end
	if coffeeCd[player] and os.clock() - coffeeCd[player] < 20 then
		ctx.Notify(player, "☕ La cafetera se está recargando...", Color3.fromRGB(200, 170, 140))
		return
	end
	coffeeCd[player] = os.clock()
	Sanity.Add(player, Config.CoffeeRestore)
	ctx.Remotes.Effect:FireClient(player, "heal", model:FindFirstChild("Coffee").Position + Vector3.new(0, 2, 0), Color3.fromRGB(210, 160, 110))
	ctx.Notify(player, "☕ +" .. Config.CoffeeRestore .. " de cordura", Color3.fromRGB(210, 170, 130))
end

local function tick()
	local night = workspace:GetAttribute("Phase") == "Blackout"
	for _, player in ipairs(Players:GetPlayers()) do
		local char = player.Character
		local hrp = char and char:FindFirstChild("HumanoidRootPart")
		if hrp then
			local v = Sanity.Get(player)
			local home = ctx.Bases.IsInside(ctx.Bases.Get(player), hrp.Position)
			if night then
				if home then
					v += Config.SanityRegen * TICK
				else
					v -= Config.SanityDrain * TICK
				end
				if ctx.Steal.RevealedNear(hrp.Position, 18) then
					v -= Config.SanityMimicDrain * TICK
				end
			else
				v += Config.SanityRegen * 0.5 * TICK
			end
			local was = Sanity.Get(player)
			set(player, v)
			if v <= 0 and was > 0 then
				faint(player)
			end
		end
	end
end

function Sanity.Init(c)
	ctx = c
	Players.PlayerAdded:Connect(function(p)
		set(p, Config.SanityMax)
	end)
	for _, p in ipairs(Players:GetPlayers()) do
		set(p, Config.SanityMax)
	end
	Players.PlayerRemoving:Connect(function(p)
		values[p] = nil
		coffeeCd[p] = nil
	end)
	task.spawn(function()
		while true do
			task.wait(TICK)
			tick()
		end
	end)
end

return Sanity
