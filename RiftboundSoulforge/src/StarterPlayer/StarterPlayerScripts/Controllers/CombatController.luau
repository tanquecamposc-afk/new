--!strict
-- Client side of combat: immediate local feedback (pose, trail, dodge movement, facing) and
-- REQUESTS to the server. Local timers only gate spam; the server re-validates everything.

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local UserInputService = game:GetService("UserInputService")

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Net = require(Shared.Net)
local CombatMath = require(Shared.Combat.CombatMath)
local EssenceConfig = require(Shared.Config.EssenceConfig)
local GameConfig = require(Shared.Config.GameConfig)
local ClientState = require(script.Parent.Parent.ClientState)
local AnimationController = require(script.Parent.AnimationController)
local EffectsController = require(script.Parent.EffectsController)
local CameraController = require(script.Parent.CameraController)
local SoundController = require(script.Parent.SoundController)

local CombatController = {}

local player = Players.LocalPlayer
local remote: RemoteEvent
local busyUntil = 0
local comboIndex = 0
local lastLight = 0
local dodgeReadyAt = 0
local blocking = false
local lockMarker: BillboardGui? = nil

local function character(): (Model?, BasePart?, Humanoid?)
	local c = player.Character
	local root = c and c:FindFirstChild("HumanoidRootPart") :: BasePart?
	local humanoid = c and c:FindFirstChildOfClass("Humanoid")
	if not c or not root or not humanoid or humanoid.Health <= 0 then
		return nil, nil, nil
	end
	return c, root, humanoid
end

local function build()
	local profile = ClientState.profile
	if not profile then
		return CombatMath.weaponBuild("Katana", { mastery = 1, upgrade = 1, temper = "None", evolution = "None" })
	end
	return CombatMath.weaponBuild("Katana", profile.weapons.Katana)
end

local function speedMult(b: any): number
	local s = b.attackSpeed
	if player:GetAttribute("Awakened") and player:GetAttribute("AwakenForm") == "Storm" then
		s *= 1.3
	end
	return s
end

-- Aim direction: lock target > camera look (flattened).
local function aimDirection(root: BasePart): Vector3
	local target = ClientState.lockTarget
	local targetRoot = target and target.Parent and target:FindFirstChild("HumanoidRootPart") :: BasePart?
	if targetRoot then
		local flat = Vector3.new(targetRoot.Position.X - root.Position.X, 0, targetRoot.Position.Z - root.Position.Z)
		if flat.Magnitude > 0.5 then
			return flat.Unit
		end
	end
	local look = workspace.CurrentCamera.CFrame.LookVector
	local flat = Vector3.new(look.X, 0, look.Z)
	if flat.Magnitude < 0.1 then
		flat = root.CFrame.LookVector
	end
	return flat.Unit
end

local function face(root: BasePart, dir: Vector3)
	root.CFrame = CFrame.lookAt(root.Position, root.Position + dir)
end

-- Aim point for targeted abilities.
local rayParams = RaycastParams.new()
rayParams.FilterType = Enum.RaycastFilterType.Exclude
local function aimPoint(root: BasePart): Vector3
	local target = ClientState.lockTarget
	local targetRoot = target and target.Parent and target:FindFirstChild("HumanoidRootPart") :: BasePart?
	if targetRoot then
		return targetRoot.Position
	end
	if UserInputService.MouseEnabled and not UserInputService.TouchEnabled then
		local mouse = UserInputService:GetMouseLocation()
		local ray = workspace.CurrentCamera:ViewportPointToRay(mouse.X, mouse.Y)
		rayParams.FilterDescendantsInstances = { player.Character :: Instance, workspace:FindFirstChild("ClientFX") :: Instance, workspace:FindFirstChild("Telegraphs") :: Instance }
		local hit = workspace:Raycast(ray.Origin, ray.Direction * 200, rayParams)
		if hit then
			return hit.Position
		end
	end
	return root.Position + aimDirection(root) * 14
end

function CombatController.light()
	local c, root = character()
	if not c or not root or blocking then
		return
	end
	local now = os.clock()
	if now < busyUntil then
		return
	end
	local b = build()
	local count = #b.light
	if now - lastLight <= b.comboResetTime + 0.6 then
		comboIndex = (comboIndex % count) + 1
	else
		comboIndex = 1
	end
	lastLight = now
	local strike = b.light[comboIndex]
	local speed = speedMult(b)
	busyUntil = now + (strike.windup + strike.recovery) / speed
	local dir = aimDirection(root)
	face(root, dir)
	AnimationController.swing(c, comboIndex, false, strike.windup / speed)
	SoundController.play("LightAttack")
	remote:FireServer("Light", { dir = dir })
end

function CombatController.heavy()
	local c, root = character()
	if not c or not root or blocking then
		return
	end
	local now = os.clock()
	if now < busyUntil then
		return
	end
	local b = build()
	if (player:GetAttribute("Stamina") or 0) < b.heavy.stamina then
		EffectsController.floatText(root.Position + Vector3.new(0, 4, 0), "NO STAMINA", Color3.fromRGB(255, 160, 120), 22, 0.6)
		return
	end
	local speed = b.attackSpeed
	busyUntil = now + (b.heavy.windup + b.heavy.recovery) / speed
	comboIndex = 0
	local dir = aimDirection(root)
	face(root, dir)
	AnimationController.swing(c, 0, true, b.heavy.windup / speed)
	SoundController.play("HeavyAttack")
	remote:FireServer("Heavy", { dir = dir })
end

function CombatController.block(active: boolean)
	local c = character()
	if not c then
		return
	end
	if active == blocking then
		return
	end
	blocking = active
	AnimationController.block(c, active)
	remote:FireServer(if active then "BlockStart" else "BlockEnd", {})
end

function CombatController.dodge()
	local c, root, humanoid = character()
	if not c or not root or not humanoid then
		return
	end
	local now = os.clock()
	local b = build()
	if now < dodgeReadyAt or now < busyUntil - 0.1 then
		return
	end
	if (player:GetAttribute("Stamina") or 0) < b.dodge.stamina then
		return
	end
	if blocking then
		CombatController.block(false)
	end
	local cooldown = b.dodgeCooldown
	if player:GetAttribute("Awakened") and player:GetAttribute("AwakenForm") == "Storm" then
		cooldown *= 0.5
	end
	dodgeReadyAt = now + cooldown
	busyUntil = now + b.dodge.duration
	comboIndex = 0
	local move = humanoid.MoveDirection
	local dir = if move.Magnitude > 0.1 then Vector3.new(move.X, 0, move.Z).Unit else -Vector3.new(root.CFrame.LookVector.X, 0, root.CFrame.LookVector.Z).Unit
	remote:FireServer("Dodge", { dir = dir })
	EffectsController.burst(root.Position, Color3.fromRGB(200, 220, 255), 10, 8)
	local finish = now + b.dodge.duration
	local connection
	connection = RunService.Heartbeat:Connect(function()
		if os.clock() >= finish or not root.Parent then
			connection:Disconnect()
			return
		end
		local v = root.AssemblyLinearVelocity
		root.AssemblyLinearVelocity = Vector3.new(dir.X * b.dodge.speed, math.min(v.Y, 5), dir.Z * b.dodge.speed)
	end)
end

function CombatController.ability(slot: string)
	local c, root = character()
	if not c or not root or blocking then
		return
	end
	local cd = ClientState.cooldowns[slot]
	if cd and cd.endsAt > ClientState.serverNow() + 0.05 then
		return
	end
	if os.clock() < busyUntil then
		return
	end
	busyUntil = os.clock() + 0.35
	local point = aimPoint(root)
	local flat = Vector3.new(point.X - root.Position.X, 0, point.Z - root.Position.Z)
	if flat.Magnitude > 1 then
		face(root, flat.Unit)
	end
	AnimationController.cast(c)
	remote:FireServer("Ability", { slot = slot, aim = point })
end

function CombatController.awaken()
	if character() then
		remote:FireServer("Awaken", {})
	end
end

function CombatController.tonic()
	if character() then
		remote:FireServer("Tonic", {})
	end
end

-- Lock-on targeting ----------------------------------------------------------------------------

local function clearLock()
	ClientState.lockTarget = nil
	if lockMarker then
		lockMarker:Destroy()
		lockMarker = nil
	end
	ClientState.Changed:Fire("lock")
end

function CombatController.toggleLock()
	if ClientState.lockTarget then
		clearLock()
		return
	end
	local _, root = character()
	local enemies = workspace:FindFirstChild("Enemies")
	if not root or not enemies then
		return
	end
	local camLook = workspace.CurrentCamera.CFrame.LookVector
	local best, bestScore = nil, math.huge
	for _, model in enemies:GetChildren() do
		local r = model:FindFirstChild("HumanoidRootPart") :: BasePart?
		if r then
			local offset = r.Position - root.Position
			local d = offset.Magnitude
			if d < 60 then
				local facing = Vector3.new(offset.X, 0, offset.Z).Unit:Dot(Vector3.new(camLook.X, 0, camLook.Z).Unit)
				local score = d * (1.6 - facing)
				if score < bestScore then
					best, bestScore = model, score
				end
			end
		end
	end
	if best then
		ClientState.lockTarget = best
		local r = best:FindFirstChild("HumanoidRootPart") :: BasePart
		local gui = Instance.new("BillboardGui")
		gui.Name = "LockMarker"
		gui.Size = UDim2.fromOffset(46, 46)
		gui.AlwaysOnTop = true
		gui.Adornee = r
		gui.Parent = player:WaitForChild("PlayerGui")
		local label = Instance.new("TextLabel")
		label.Size = UDim2.fromScale(1, 1)
		label.BackgroundTransparency = 1
		label.Text = "◎"
		label.TextScaled = true
		label.TextColor3 = Color3.fromRGB(255, 240, 160)
		label.TextStrokeTransparency = 0.3
		label.Parent = gui
		lockMarker = gui
		ClientState.Changed:Fire("lock")
	end
end

-- Server feedback ------------------------------------------------------------------------------

local function onFeedback(kind: string, data: any)
	local c, root = character()
	if kind == "Hits" then
		for _, hit in data.hits do
			local color = if hit.guarded then Color3.fromRGB(160, 170, 190) else Color3.fromRGB(255, 255, 255)
			EffectsController.damageNumber(hit.position, hit.amount, color, data.finisher)
			EffectsController.burst(hit.position, Color3.fromRGB(255, 240, 220), 10, 16)
			if hit.guarded then
				EffectsController.floatText(hit.position + Vector3.new(0, 5, 0), "GUARDED", color, 22, 0.6)
			end
		end
		SoundController.play("EnemyHit")
		CameraController.shake(if data.finisher then 0.3 else 0.12)
		if c then
			AnimationController.hitStop(c, GameConfig.Combat.HitStop)
		end
	elseif kind == "Rejected" then
		busyUntil = 0 -- resync with the server's view
		local reason = data and data.reason
		if root and type(reason) == "string" and reason ~= "busy" and reason ~= "cooldown" and reason ~= "dead" then
			EffectsController.floatText(root.Position + Vector3.new(0, 4, 0), reason, Color3.fromRGB(255, 180, 140), 20, 1.0)
		end
	elseif kind == "Parry" and root then
		SoundController.play("ParrySuccess")
		CameraController.shake(0.3)
		EffectsController.floatText(root.Position + Vector3.new(0, 5, 0), "PERFECT PARRY", Color3.fromRGB(255, 240, 180), 34, 0.9)
	elseif kind == "Evaded" and root then
		EffectsController.floatText(root.Position + Vector3.new(0, 4, 0), "EVADED", Color3.fromRGB(180, 220, 255), 26, 0.7)
	elseif kind == "Blocked" and root then
		EffectsController.burst(root.Position + root.CFrame.LookVector * 2, Color3.fromRGB(200, 210, 230), 10, 10)
	elseif kind == "GuardBroken" and root then
		blocking = false
		if c then
			AnimationController.block(c, false)
		end
		EffectsController.floatText(root.Position + Vector3.new(0, 4, 0), "GUARD BROKEN", Color3.fromRGB(255, 120, 120), 30, 1)
		CameraController.shake(0.4)
	elseif kind == "Hurt" then
		CameraController.shake(math.clamp((data.amount or 10) / 40, 0.1, 0.6))
	elseif kind == "Interrupt" then
		EffectsController.floatText(data.position + Vector3.new(0, 6, 0), "INTERRUPT!", Color3.fromRGB(120, 255, 200), 30, 0.9)
	elseif kind == "WeakPoint" and root then
		EffectsController.floatText(root.Position + root.CFrame.LookVector * 6 + Vector3.new(0, 6, 0), "WEAK POINT x2", Color3.fromRGB(255, 230, 120), 26, 0.6)
	elseif kind == "Immune" and root then
		EffectsController.floatText(root.Position + root.CFrame.LookVector * 6 + Vector3.new(0, 6, 0), "IMMUNE", Color3.fromRGB(200, 200, 220), 22, 0.5)
	elseif kind == "ResonanceFull" then
		ClientState.toast("Resonance", "Resonance full! Press G to AWAKEN.")
	elseif kind == "Suppressed" then
		ClientState.toast("Error", "Your Awakening was suppressed!")
	end
end

-- Abilities shown on the HUD (slot -> ability def or nil + lock reason), derived from profile.
function CombatController.slotInfo(slot: string): (any?, string?)
	local profile = ClientState.profile
	if not profile then
		return nil, "Loading"
	end
	local primary = profile.loadout.primary
	if slot == "Q" or slot == "E" then
		local essence = EssenceConfig.Essences[primary]
		if not essence then
			return nil, "No essence"
		end
		local ability = EssenceConfig.Abilities[essence.abilities[slot]]
		local record = profile.essences[primary]
		if record.mastery < ability.masteryRequired then
			return ability, string.format("%s mastery %d", essence.displayName, ability.masteryRequired)
		end
		return ability, nil
	end
	local FusionConfig = require(Shared.Config.FusionConfig)
	local fusionId = FusionConfig.forPair(primary, profile.loadout.secondary)
	if not fusionId then
		return nil, "Equip 2 essences"
	end
	local def = FusionConfig.Fusions[fusionId]
	local record = profile.fusions[fusionId]
	if not def.implemented then
		return nil, "Unavailable"
	end
	if not record or not record.unlocked then
		return EssenceConfig.Abilities[def.ability], "Locked (Codex)"
	end
	return EssenceConfig.Abilities[def.ability], nil
end

function CombatController.init()
	remote = Net.event("CombatAction")
	Net.event("CombatFeedback").OnClientEvent:Connect(function(kind, data)
		local ok, err = pcall(onFeedback, kind, data or {})
		if not ok then
			warn("[Combat] feedback error: " .. tostring(err))
		end
	end)
	player.CharacterAdded:Connect(function()
		busyUntil = 0
		comboIndex = 0
		blocking = false
		clearLock()
	end)
	-- drop the lock when the target dies or leaves range
	RunService.Heartbeat:Connect(function()
		local target = ClientState.lockTarget
		if target then
			local r = target.Parent and target:FindFirstChild("HumanoidRootPart") :: BasePart?
			local _, root = character()
			if not r or not root or (r.Position - root.Position).Magnitude > 80 then
				clearLock()
			end
		end
	end)
end

return CombatController
