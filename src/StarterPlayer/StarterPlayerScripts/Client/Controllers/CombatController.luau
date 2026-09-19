--!strict
--[[
	CombatController.luau
	Entrada del jugador, animaciones e indicadores de dano.

	Regla central: el cliente NUNCA envia numeros. Solo envia "quiero atacar al
	enemigo con este Guid". El servidor decide el dano y responde. Ademas se
	aplica un cooldown local (predictivo) para no inundar la red: no es una
	medida de seguridad, solo de ancho de banda; la autoridad es del servidor.
]]

local ContextActionService = game:GetService("ContextActionService")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService = game:GetService("TweenService")
local Debris = game:GetService("Debris")
local UserInputService = game:GetService("UserInputService")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Types = require(Shared.Types)
local Config = require(Shared.Modules.Config)
local NetBridge = require(Shared.Network.NetBridge)

local LocalPlayer = Players.LocalPlayer

local CombatController = {}

local connections: { any } = {}
local lastAttackAt = 0
local currentInert: { Guid: string, AttemptsLeft: number }? = nil
local profileCache: Types.PlayerProfile? = nil

-- Objetivo: enemigo taggeado mas cercano dentro del rango de ataque.
local function findClosestEnemy(): (string?, BasePart?)
	local character = LocalPlayer.Character
	local root = character and character:FindFirstChild("HumanoidRootPart")
	if not root or not root:IsA("BasePart") then
		return nil, nil
	end
	local bestGuid: string? = nil
	local bestPart: BasePart? = nil
	local bestDistance = Config.ATTACK_RANGE
	for _, model in game:GetService("CollectionService"):GetTagged("EnemyNPC") do
		if not model:IsA("Model") or not model.PrimaryPart then
			continue
		end
		local guid = model:GetAttribute("EnemyGuid")
		if typeof(guid) ~= "string" then
			continue
		end
		local distance = (model.PrimaryPart.Position - root.Position).Magnitude
		if distance < bestDistance then
			bestDistance = distance
			bestGuid = guid
			bestPart = model.PrimaryPart
		end
	end
	return bestGuid, bestPart
end

local function playAttackAnimation()
	local character = LocalPlayer.Character
	local humanoid = character and character:FindFirstChildOfClass("Humanoid")
	local animator = humanoid and humanoid:FindFirstChildOfClass("Animator")
	local animations = ReplicatedStorage:FindFirstChild("Animations")
	local asset = animations and animations:FindFirstChild("Attack")
	if animator and asset and asset:IsA("Animation") then
		local track = animator:LoadAnimation(asset)
		track.Priority = Enum.AnimationPriority.Action
		track:Play(0.1)
		task.delay(1.2, function()
			track:Stop(0.1)
			track:Destroy()
		end)
	end
end

-- Numero flotante de dano (100% local).
local function showDamageIndicator(position: Vector3, damage: number, fromShadow: boolean)
	local anchor = Instance.new("Part")
	anchor.Anchored = true
	anchor.CanCollide = false
	anchor.CanQuery = false
	anchor.Transparency = 1
	anchor.Size = Vector3.one
	anchor.CFrame = CFrame.new(position + Vector3.new(math.random(-2, 2), 3, math.random(-2, 2)))
	anchor.Parent = workspace.CurrentCamera

	local billboard = Instance.new("BillboardGui")
	billboard.Size = UDim2.fromScale(4, 1.2)
	billboard.AlwaysOnTop = true
	billboard.Parent = anchor

	local label = Instance.new("TextLabel")
	label.Size = UDim2.fromScale(1, 1)
	label.BackgroundTransparency = 1
	label.Font = Enum.Font.GothamBlack
	label.TextScaled = true
	label.TextStrokeTransparency = 0.2
	label.TextColor3 = if fromShadow then Color3.fromRGB(120, 170, 255) else Color3.fromRGB(255, 235, 140)
	label.Text = CombatController.FormatNumber(damage)
	label.Parent = billboard

	TweenService:Create(anchor, TweenInfo.new(0.9, Enum.EasingStyle.Quad), {
		CFrame = anchor.CFrame + Vector3.new(0, 6, 0),
	}):Play()
	TweenService:Create(label, TweenInfo.new(0.9), { TextTransparency = 1, TextStrokeTransparency = 1 }):Play()
	Debris:AddItem(anchor, 1)
end

-- Formato abreviado (K, M, B, T...) como en el genero.
local SUFFIXES = { "", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc" }
function CombatController.FormatNumber(value: number): string
	local index = 1
	local amount = value
	while amount >= 1000 and index < #SUFFIXES do
		amount /= 1000
		index += 1
	end
	if index == 1 then
		return string.format("%d", math.floor(amount))
	end
	return string.format("%.2f%s", amount, SUFFIXES[index])
end

local function requestAttack()
	local now = os.clock()
	if now - lastAttackAt < Config.ATTACK_COOLDOWN then
		return
	end
	local guid = findClosestEnemy()
	if not guid then
		return
	end
	lastAttackAt = now
	playAttackAnimation()
	NetBridge.FireServer(NetBridge.Events.RequestAttack, guid)
end

local function requestArise()
	local inert = currentInert
	if not inert then
		return
	end
	NetBridge.FireServer(NetBridge.Events.AttemptArise, inert.Guid)
end

function CombatController.Start()
	table.insert(connections, NetBridge.OnClientEvent(NetBridge.Events.ProfileUpdated, function(profile)
		profileCache = profile
	end))

	table.insert(connections, NetBridge.OnClientEvent(NetBridge.Events.DamageDealt, function(guid, damage, fromShadow)
		for _, model in game:GetService("CollectionService"):GetTagged("EnemyNPC") do
			if model:GetAttribute("EnemyGuid") == guid and model:IsA("Model") and model.PrimaryPart then
				showDamageIndicator(model.PrimaryPart.Position, damage, fromShadow == true)
				break
			end
		end
	end))

	table.insert(connections, NetBridge.OnClientEvent(NetBridge.Events.EnemyInert, function(guid, _enemyId, attempts)
		currentInert = { Guid = guid, AttemptsLeft = attempts }
	end))

	table.insert(connections, NetBridge.OnClientEvent(NetBridge.Events.EnemyRemoved, function(guid)
		if currentInert and currentInert.Guid == guid then
			currentInert = nil
		end
	end))

	table.insert(connections, NetBridge.OnClientEvent(NetBridge.Events.AriseResult, function(result: Types.AriseResult)
		if result.Success and result.Shadow then
			currentInert = nil
		elseif currentInert then
			currentInert.AttemptsLeft = result.AttemptsLeft
			if result.AttemptsLeft <= 0 then
				currentInert = nil
			end
		end
	end))

	-- M1 = atacar, E = ARISE. Compatible con teclado, gamepad y tactil.
	ContextActionService:BindAction("AriseCombat_Attack", function(_, state)
		if state == Enum.UserInputState.Begin then
			requestAttack()
		end
		return Enum.ContextActionResult.Pass
	end, true, Enum.UserInputType.MouseButton1, Enum.KeyCode.ButtonR2)

	ContextActionService:BindAction("AriseCombat_Arise", function(_, state)
		if state == Enum.UserInputState.Begin then
			requestArise()
		end
		return Enum.ContextActionResult.Pass
	end, true, Enum.KeyCode.E, Enum.KeyCode.ButtonX)

	-- Auto-ataque manteniendo pulsado (comportamiento esperado del genero),
	-- respetando el mismo cooldown que valida el servidor.
	table.insert(connections, game:GetService("RunService").Heartbeat:Connect(function()
		if UserInputService:IsMouseButtonPressed(Enum.UserInputType.MouseButton1) then
			requestAttack()
		end
	end))
end

function CombatController.Stop()
	ContextActionService:UnbindAction("AriseCombat_Attack")
	ContextActionService:UnbindAction("AriseCombat_Arise")
	for _, connection in connections do
		if typeof(connection) == "RBXScriptConnection" then
			if connection.Connected then
				connection:Disconnect()
			end
		else
			connection:Disconnect()
		end
	end
	table.clear(connections)
end

return CombatController
