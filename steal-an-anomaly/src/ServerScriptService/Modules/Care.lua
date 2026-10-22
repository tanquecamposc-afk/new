-- Cuidados de pacientes (estilo Animal Hospital): cada anomalía en cama
-- desarrolla síntomas que hay que tratar. Sin tratar no produce dinero y,
-- si llega a CRÍTICO, se fuga en el turno de noche. Cualquiera puede ayudar.
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = ReplicatedStorage.Shared
local Config = require(Shared.Config)
local Util = require(Shared.Util)

local Care = {}
local ctx
local combos = {} -- [player] = { Count, Last }

local function now()
	return workspace:GetServerTimeNow()
end

local CondById = {}
for _, c in ipairs(Config.Conditions) do
	CondById[c.Id] = c
end
Care.ById = CondById

function Care.Admit(info)
	local first = info.Base and info.Base.Player and ctx.Data.Get(info.Base.Player)
	local fast = first and (first.Stats.Treated or 0) == 0
	info.NextCondition = now() + (fast and 18 or math.random(Config.ConditionMin, Config.ConditionMax))
end

local function applyCondition(info, cond)
	info.Condition = cond.Id
	info.ConditionSince = now()
	info.Critical = nil
	info.Model:SetAttribute("Condition", cond.Id)
	ctx.Anoms.ClearPrompts(info, "Treat")
	local p = ctx.Anoms.AddPrompt(info, "Treat", cond.Icon .. " " .. cond.Action, Config.TreatHold, Enum.KeyCode.R)
	p.ObjectText = info.Def.Name .. " • " .. cond.Name
	ctx.Anoms.SetLabel(info, cond.Icon .. " " .. cond.Name:upper(), cond.Color, "⛔ Sin producir", Color3.fromRGB(255, 140, 140))
	if info.Base then
		local bed = info.Base.Beds[info.BedIndex]
		if bed then
			ctx.Bases.BedStatus(bed)
		end
	end
end

function Care.Clear(info)
	info.Condition = nil
	info.Critical = nil
	info.Model:SetAttribute("Condition", nil)
	info.Model:SetAttribute("Critical", nil)
	ctx.Anoms.ClearPrompts(info, "Treat")
	ctx.Anoms.SetLabel(info, nil, nil, "+" .. Util.Money(Util.Income(info.Record)) .. "/s")
	info.NextCondition = now() + math.random(Config.ConditionMin, Config.ConditionMax)
	if info.Base then
		local bed = info.Base.Beds[info.BedIndex]
		if bed then
			ctx.Bases.BedStatus(bed)
		end
	end
end

function Care.Treat(player, info)
	if info.State ~= "bed" or not info.Condition or not info.Base then
		return
	end
	local char = player.Character
	local hrp = char and char:FindFirstChild("HumanoidRootPart")
	if not hrp or (hrp.Position - info.Model.Root.Position).Magnitude > 16 then
		return
	end
	local owner = info.Base.Player
	local cond = CondById[info.Condition]
	local c = combos[player]
	local t = os.clock()
	if c and t - c.Last <= Config.ComboWindow then
		c.Count = math.min(Config.ComboMax, c.Count + 1)
	else
		c = { Count = 1 }
		combos[player] = c
	end
	c.Last = t
	local base = Util.Income(info.Record) * Config.TreatTipSeconds * ctx.Progression.Multiplier(owner or player)
	local tip = math.floor(math.max(25, base) * (1 + (c.Count - 1) * 0.25))
	if owner ~= player then
		tip = math.floor(tip * Config.HelperTipRatio)
		if owner then
			ctx.Notify(owner, "🤝 " .. player.DisplayName .. " trató a tu " .. info.Def.Name, Color3.fromRGB(120, 220, 255))
		end
	end
	Care.Clear(info)
	ctx.Progression.AddCash(player, tip)
	ctx.Progression.Progress(player, "Treat", 1)
	local data = ctx.Data.Get(player)
	data.Stats.Treated = (data.Stats.Treated or 0) + 1
	ctx.Effect("heal", info.Model.Root.Position + Vector3.new(0, 3, 0), cond and cond.Color or Color3.fromRGB(120, 255, 180))
	ctx.Remotes.Combo:FireClient(player, c.Count, tip, cond and cond.Name or "")
	if (data.Stats.Treated or 0) == 1 then
		ctx.Progression.Sync(player)
	end
end

local function tick()
	local t = now()
	for _, b in ipairs(ctx.Bases.All()) do
		local owner = b.Player
		if owner then
			for _, bed in pairs(b.Beds) do
				local info = bed.Info
				if info and info.State == "bed" then
					if not info.Condition then
						if t >= (info.NextCondition or t + 60) then
							local cond = Config.Conditions[math.random(1, #Config.Conditions)]
							applyCondition(info, cond)
							ctx.Remotes.Alert:FireClient(owner, nil, info.Def.Name, cond.Id)
						end
					elseif not info.Critical and t - (info.ConditionSince or t) >= Config.CriticalAfter then
						info.Critical = true
						info.Model:SetAttribute("Critical", true)
						ctx.Anoms.SetInfoText(info, "☠ CRÍTICO: se fugará de noche", Color3.fromRGB(255, 60, 60))
						ctx.Bases.BedStatus(bed)
						ctx.Notify(owner, "☠ " .. info.Def.Name .. " está CRÍTICO. ¡Trátalo antes del apagón!", Color3.fromRGB(255, 70, 70))
					end
				end
			end
		end
	end
end

function Care.Init(c)
	ctx = c
	task.spawn(function()
		while true do
			task.wait(1)
			tick()
		end
	end)
	Players.PlayerRemoving:Connect(function(p)
		combos[p] = nil
	end)
end

return Care
