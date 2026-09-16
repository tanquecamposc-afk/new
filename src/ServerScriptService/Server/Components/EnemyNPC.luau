--!strict
--[[
	EnemyNPC.luau
	Componente de enemigo del mundo. Es el UNICO lugar donde el servidor crea
	un Humanoid, y solo para el enemigo (no para las Sombras del jugador).

	Ciclo de vida:
		Vivo -> (salud 0) -> Inerte (sin Humanoid, sin colisiones, ProximityPrompt
		exclusivo para quien asesto el ultimo golpe) -> Extraido o descartado.
]]

local CollectionService = game:GetService("CollectionService")
local Debris = game:GetService("Debris")

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Types = require(Shared.Types)
local Config = require(Shared.Modules.Config)

local INERT_LIFETIME = 30 -- segundos antes de limpiar un cadaver ignorado

local EnemyNPC = {}
EnemyNPC.__index = EnemyNPC

export type EnemyNPC = typeof(setmetatable(
	{} :: {
		State: Types.EnemyState,
		Model: Model?,
		_connections: { RBXScriptConnection },
		_destroyed: boolean,
		OnInert: ((EnemyNPC) -> ())?,
		OnDestroyed: ((EnemyNPC) -> ())?,
	},
	EnemyNPC
))

local registry: { [string]: EnemyNPC } = {}

function EnemyNPC.new(definition: Types.EnemyDefinition, position: Vector3, model: Model?): EnemyNPC
	local self = setmetatable({}, EnemyNPC) :: EnemyNPC
	self.State = {
		Guid = game:GetService("HttpService"):GenerateGUID(false),
		Definition = definition,
		Health = definition.MaxHealth,
		Position = position,
		KillerUserId = nil,
		AriseAttempts = 0,
		Inert = false,
		InertAt = nil,
	}
	self.Model = model
	self._connections = {}
	self._destroyed = false

	if model then
		model:SetAttribute("EnemyGuid", self.State.Guid)
		model:SetAttribute("EnemyId", definition.Id)
		CollectionService:AddTag(model, "EnemyNPC")
		local humanoid = model:FindFirstChildOfClass("Humanoid")
		if humanoid then
			humanoid.MaxHealth = definition.MaxHealth
			humanoid.Health = definition.MaxHealth
		end
		table.insert(self._connections, model.AncestryChanged:Connect(function(_, parent)
			if parent == nil then
				self:Destroy()
			end
		end))
	end

	registry[self.State.Guid] = self
	return self
end

function EnemyNPC.Get(guid: string): EnemyNPC?
	return registry[guid]
end

function EnemyNPC.GetAll(): { [string]: EnemyNPC }
	return registry
end

function EnemyNPC:GetPosition(): Vector3
	local model = self.Model
	if model and model.PrimaryPart then
		self.State.Position = model.PrimaryPart.Position
	end
	return self.State.Position
end

function EnemyNPC:IsAlive(): boolean
	return not self._destroyed and not self.State.Inert and self.State.Health > 0
end

--[[
	Aplica dano YA VALIDADO por CombatService. Devuelve el dano efectivo
	(recortado a la salud restante) y si este golpe causo el colapso.
]]
function EnemyNPC:TakeDamage(amount: number, attackerUserId: number?): (number, boolean)
	if not self:IsAlive() or amount <= 0 then
		return 0, false
	end
	local applied = math.min(amount, self.State.Health)
	self.State.Health -= applied

	local model = self.Model
	if model then
		local humanoid = model:FindFirstChildOfClass("Humanoid")
		if humanoid then
			humanoid.Health = self.State.Health
		end
	end

	if self.State.Health <= 0 then
		self.State.KillerUserId = attackerUserId
		self:BecomeInert()
		return applied, true
	end
	return applied, false
end

--[[
	Estado inerte: se destruye el Humanoid (libera el paso de simulacion del
	servidor), se anclan y descolisionan las partes, y se abre un
	ProximityPrompt visible SOLO para el jugador que remato al enemigo.
]]
function EnemyNPC:BecomeInert()
	if self.State.Inert or self._destroyed then
		return
	end
	self.State.Inert = true
	self.State.InertAt = os.clock()
	self.State.Health = 0

	local model = self.Model
	if model then
		self.State.Position = self:GetPosition()

		local humanoid = model:FindFirstChildOfClass("Humanoid")
		if humanoid then
			humanoid:Destroy()
		end
		for _, descendant in model:GetDescendants() do
			if descendant:IsA("BasePart") then
				descendant.CanCollide = false
				descendant.CanTouch = false
				descendant.CanQuery = false
				descendant.Anchored = true
			elseif descendant:IsA("Script") or descendant:IsA("LocalScript") then
				descendant:Destroy()
			end
		end

		local anchor = model.PrimaryPart or model:FindFirstChildWhichIsA("BasePart")
		if anchor then
			anchor.CanQuery = true
			local prompt = Instance.new("ProximityPrompt")
			prompt.Name = "ArisePrompt"
			prompt.ActionText = "ARISE"
			prompt.ObjectText = self.State.Definition.Name
			prompt.HoldDuration = 0.35
			prompt.MaxActivationDistance = Config.ARISE_RANGE
			prompt.RequiresLineOfSight = false
			prompt.Enabled = true
			prompt.Parent = anchor
			-- La visibilidad exclusiva se aplica en el cliente leyendo este atributo;
			-- el servidor ademas revalida el UserId al recibir AttemptArise.
			prompt:SetAttribute("OwnerUserId", self.State.KillerUserId)
			prompt:SetAttribute("EnemyGuid", self.State.Guid)
		end
	end

	-- Red de seguridad: si nadie interactua, el cadaver no vive para siempre.
	task.delay(INERT_LIFETIME, function()
		if not self._destroyed and self.State.Inert then
			self:Destroy()
		end
	end)

	if self.OnInert then
		self.OnInert(self)
	end
end

function EnemyNPC:Destroy()
	if self._destroyed then
		return
	end
	self._destroyed = true
	registry[self.State.Guid] = nil

	for _, connection in self._connections do
		if connection.Connected then
			connection:Disconnect()
		end
	end
	table.clear(self._connections)

	local model = self.Model
	self.Model = nil
	if model and model.Parent then
		Debris:AddItem(model, 0.1)
	end

	if self.OnDestroyed then
		self.OnDestroyed(self)
	end
end

function EnemyNPC.DestroyAll()
	for _, enemy in registry do
		enemy:Destroy()
	end
	table.clear(registry)
end

return EnemyNPC
