--!strict
-- Cooperative Resonance: a primer status applied by one player + a detonating essence from a
-- DIFFERENT player within the window. Validated entirely on the server: players, timing,
-- positions, ownership of the primer, per-pair cooldowns and once-per-cast limits.

local Players = game:GetService("Players")

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local CoopConfig = require(Shared.Config.CoopConfig)
local AwakeningConfig = require(Shared.Config.AwakeningConfig)
local Net = require(Shared.Net)
local Registry = require(script.Parent.Parent.Registry)

local CoopService = {}

local pairCooldowns: { [string]: number } = {}
local lastCast: { [Player]: number } = {}

local function pairKey(comboId: string, a: number, b: number): string
	return comboId .. ":" .. math.min(a, b) .. ":" .. math.max(a, b)
end

local function rootOf(player: Player): BasePart?
	local character = player.Character
	local humanoid = character and character:FindFirstChildOfClass("Humanoid")
	if not humanoid or humanoid.Health <= 0 then
		return nil
	end
	return character:FindFirstChild("HumanoidRootPart") :: BasePart?
end

-- Grants rewards + feedback for a successful co-op combo (also used by BossService for Breach).
function CoopService.reward(players: { Player }, comboId: string, position: Vector3)
	local combo = CoopConfig.Combos[comboId]
	local Progression = Registry.get("ProgressionService")
	local Quest = Registry.get("QuestService")
	local Combat = Registry.get("CombatService")
	local names = {}
	for _, p in players do
		table.insert(names, p.DisplayName)
	end
	for _, p in players do
		Combat.addResonance(p, AwakeningConfig.Gains.CoopResonance)
		Progression.stat(p, "coopCombos")
		Progression.achieve(p, "Bonded")
		Quest.record(p, "Coop", { combo = comboId })
		Net.event("Notify"):FireClient(p, "Coop", combo.displayName, { players = names, color = combo.color })
	end
	Net.event("Effect"):FireAllClients("Coop", { position = position, name = combo.displayName, color = combo.color, players = names })
end

function CoopService.onAbilityHit(player: Player, record: any, essences: { string }, castId: number)
	if record.kind == "Training" or lastCast[player] == castId then
		return
	end
	local Enemy = Registry.get("EnemyService")
	local t = os.clock()
	for _, id in CoopConfig.Order do
		local combo = CoopConfig.Combos[id]
		if not combo.boss and table.find(essences, combo.detonatorEssence) then
			local primer = Enemy.hasStatus(record, combo.primerTag)
			if primer and primer.by and primer.by ~= player.UserId and t - primer.time <= CoopConfig.Window then
				local partner = Players:GetPlayerByUserId(primer.by)
				local myRoot = rootOf(player)
				local partnerRoot = partner and rootOf(partner)
				local key = pairKey(id, player.UserId, primer.by)
				if
					partner
					and myRoot
					and partnerRoot
					and (myRoot.Position - record.root.Position).Magnitude <= CoopConfig.MaxDistance
					and (partnerRoot.Position - record.root.Position).Magnitude <= CoopConfig.MaxDistance
					and t >= (pairCooldowns[key] or 0)
				then
					pairCooldowns[key] = t + CoopConfig.PairCooldown
					lastCast[player] = castId
					local center = record.root.Position
					local targets = Enemy.query(function(position, r)
						return (Vector3.new(position.X - center.X, 0, position.Z - center.Z)).Magnitude <= combo.radius + r
					end, 8)
					for _, target in targets do
						local result = Enemy.damage(target, combo.damage, { player = player, kind = "Coop", stagger = 0.6, position = myRoot.Position })
						if result.dealt > 0 then
							target.mechanicsBy[partner.UserId] = (target.mechanicsBy[partner.UserId] or 0) + 1
						end
						if combo.effect == "ChainBurst" then
							Net.event("Effect"):FireAllClients("Lightning", { points = { center + Vector3.new(0, 4, 0), target.root.Position }, color = combo.color })
						end
					end
					CoopService.reward({ player, partner }, id, center)
					return
				end
			end
		end
	end
end

function CoopService.Init() end

function CoopService.Start()
	Players.PlayerRemoving:Connect(function(player)
		lastCast[player] = nil
	end)
	-- Bound the pair-cooldown table.
	task.spawn(function()
		while true do
			task.wait(60)
			local t = os.clock()
			for key, expires in pairCooldowns do
				if expires < t then
					pairCooldowns[key] = nil
				end
			end
		end
	end)
end

return CoopService
