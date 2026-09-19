--!strict
--[[
	ShadowRenderController.luau
	Renderizado e interpolacion de las Sombras. El servidor manda posiciones
	logicas cada 0.1 s; aqui se crean los modelos locales (nunca replicados) y
	se interpolan con CFrame:Lerp para que se vean fluidas a 60+ FPS.

	Los modelos viven en el cliente: no consumen replicacion ni fisica del
	servidor, y un jugador con 4 Sombras no afecta el Heartbeat de nadie.
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local TweenService = game:GetService("TweenService")
local Debris = game:GetService("Debris")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Types = require(Shared.Types)
local Config = require(Shared.Modules.Config)
local NetBridge = require(Shared.Network.NetBridge)

local LERP_ALPHA_PER_SECOND = 12 -- suavizado exponencial independiente del FPS
local STALE_TIMEOUT = 3 -- s sin snapshot -> la Sombra se retira

local ShadowRenderController = {}

type Rendered = {
	Model: Model,
	Target: CFrame,
	LastSeen: number,
}

local rendered: { [string]: Rendered } = {}
local container: Folder? = nil
local connections: { any } = {}

local function getContainer(): Folder
	if container and container.Parent then
		return container
	end
	local folder = Instance.new("Folder")
	folder.Name = "LocalShadows"
	folder.Parent = workspace.CurrentCamera
	container = folder
	return folder
end

-- Modelo de respaldo si no hay asset para esa Sombra en ReplicatedStorage.
local function buildFallbackModel(shadowId: string): Model
	local definition = Config.Shadows[shadowId]
	local model = Instance.new("Model")
	model.Name = `Shadow_{shadowId}`

	local torso = Instance.new("Part")
	torso.Name = "Root"
	torso.Size = Vector3.new(2, 3, 1)
	torso.Anchored = true
	torso.CanCollide = false
	torso.CanQuery = false
	torso.CanTouch = false
	torso.Material = Enum.Material.Neon
	torso.Color = Color3.fromRGB(60, 120, 255)
	torso.Transparency = 0.25
	torso.Parent = model
	model.PrimaryPart = torso

	local light = Instance.new("PointLight")
	light.Color = torso.Color
	light.Range = 10
	light.Brightness = 1.5
	light.Parent = torso

	local billboard = Instance.new("BillboardGui")
	billboard.Size = UDim2.fromScale(4, 1)
	billboard.StudsOffset = Vector3.new(0, 2.5, 0)
	billboard.AlwaysOnTop = true
	billboard.Parent = torso

	local label = Instance.new("TextLabel")
	label.Size = UDim2.fromScale(1, 1)
	label.BackgroundTransparency = 1
	label.Font = Enum.Font.GothamBold
	label.TextScaled = true
	label.TextColor3 = Color3.fromRGB(180, 210, 255)
	label.TextStrokeTransparency = 0.4
	label.Text = if definition then definition.Name else shadowId
	label.Parent = billboard

	return model
end

local function acquireModel(shadowId: string): Model
	local assets = ReplicatedStorage:FindFirstChild("ShadowModels")
	local template = assets and assets:FindFirstChild(shadowId)
	local model: Model
	if template and template:IsA("Model") then
		model = template:Clone()
		for _, descendant in model:GetDescendants() do
			if descendant:IsA("BasePart") then
				descendant.Anchored = true
				descendant.CanCollide = false
				descendant.CanQuery = false
			end
		end
		if not model.PrimaryPart then
			model.PrimaryPart = model:FindFirstChildWhichIsA("BasePart")
		end
	else
		model = buildFallbackModel(shadowId)
	end
	model.Parent = getContainer()
	return model
end

local function onSnapshot(ownerUserId: number, snapshots: { Types.ShadowSnapshot })
	if typeof(snapshots) ~= "table" then
		return
	end
	local now = os.clock()
	for _, snapshot in snapshots do
		local entry = rendered[snapshot.uuid]
		if not entry then
			entry = {
				Model = acquireModel(snapshot.id),
				Target = CFrame.new(snapshot.px, snapshot.py, snapshot.pz),
				LastSeen = now,
			}
			rendered[snapshot.uuid] = entry
			entry.Model:PivotTo(entry.Target)
		end
		local position = Vector3.new(snapshot.px, snapshot.py, snapshot.pz)
		local current = entry.Model:GetPivot().Position
		local direction = position - current
		-- Orienta la Sombra hacia su direccion de avance.
		entry.Target = if direction.Magnitude > 0.1
			then CFrame.lookAt(position, position + direction.Unit)
			else CFrame.new(position) * (entry.Target - entry.Target.Position)
		entry.LastSeen = now
	end
end

local function removeShadow(uuid: string)
	local entry = rendered[uuid]
	if not entry then
		return
	end
	rendered[uuid] = nil
	local model = entry.Model
	local primary = model.PrimaryPart
	if primary then
		local tween = TweenService:Create(primary, TweenInfo.new(0.35), { Transparency = 1, Size = primary.Size * 0.2 })
		tween:Play()
	end
	Debris:AddItem(model, 0.4)
end

local function onRenderStep(dt: number)
	local now = os.clock()
	-- Alpha exponencial: mismo resultado visual a 30 o a 144 FPS.
	local alpha = 1 - math.exp(-LERP_ALPHA_PER_SECOND * dt)
	for uuid, entry in rendered do
		if now - entry.LastSeen > STALE_TIMEOUT then
			removeShadow(uuid)
			continue
		end
		if entry.Model.Parent then
			entry.Model:PivotTo(entry.Model:GetPivot():Lerp(entry.Target, alpha))
		else
			rendered[uuid] = nil
		end
	end
end

-- Efecto de ataque: se ejecuta 100% en el cliente.
local function onShadowAttack(uuid: string, _enemyGuid: string)
	local entry = rendered[uuid]
	local primary = entry and entry.Model.PrimaryPart
	if not primary then
		return
	end
	local emitter = Instance.new("ParticleEmitter")
	emitter.Color = ColorSequence.new(Color3.fromRGB(90, 150, 255))
	emitter.Lifetime = NumberRange.new(0.25, 0.45)
	emitter.Speed = NumberRange.new(8, 16)
	emitter.Rate = 0
	emitter.Parent = primary
	emitter:Emit(18)
	Debris:AddItem(emitter, 1)
end

function ShadowRenderController.Start()
	table.insert(connections, NetBridge.OnClientUnreliable(NetBridge.Unreliable.ShadowSnapshot, onSnapshot))
	table.insert(connections, NetBridge.OnClientEvent(NetBridge.Events.ShadowAttack, onShadowAttack))
	table.insert(connections, NetBridge.OnClientEvent(NetBridge.Events.ShadowsEquippedChanged, function(userId, equipped)
		if userId ~= Players.LocalPlayer.UserId or typeof(equipped) ~= "table" then
			return
		end
		local keep: { [string]: boolean } = {}
		for _, uuid in equipped do
			keep[uuid] = true
		end
		for uuid in rendered do
			if not keep[uuid] then
				removeShadow(uuid)
			end
		end
	end))
	table.insert(connections, RunService.RenderStepped:Connect(onRenderStep))
end

function ShadowRenderController.Stop()
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
	for uuid in rendered do
		removeShadow(uuid)
	end
	if container then
		container:Destroy()
		container = nil
	end
end

return ShadowRenderController
