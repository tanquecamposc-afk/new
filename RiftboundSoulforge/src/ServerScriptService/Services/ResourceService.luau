--!strict
-- Mining nodes: discoverable models with hold-to-mine prompts. Charges are shared and
-- decremented synchronously (no yield between check and claim), so two players can never
-- claim the same last charge. Rewards are granted only here, on the server.

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Config = Shared.Config
local ResourceConfig = require(Config.ResourceConfig)
local WorldConfig = require(Config.WorldConfig)
local ItemConfig = require(Config.ItemConfig)
local Net = require(Shared.Net)
local Registry = require(script.Parent.Parent.Registry)
local Models = require(script.Parent.Parent.World.Models)

local ResourceService = {}

type Node = {
	id: number,
	def: any,
	model: Model,
	base: BasePart,
	prompt: ProximityPrompt,
	charges: number,
	position: Vector3,
	temporary: boolean,
	softTier: boolean,
	depleted: boolean,
}

local nodes: { [number]: Node } = {}
local nextId = 0
local folder: Folder

local function setDepleted(node: Node, depleted: boolean)
	node.depleted = depleted
	node.prompt.Enabled = not depleted
	for _, part in node.model:GetChildren() do
		if part:IsA("BasePart") and part.Name:sub(1, 4) == "Vein" then
			part.Transparency = if depleted then 1 else 0
		end
	end
	local light = node.base:FindFirstChildOfClass("PointLight")
	if light then
		light.Enabled = not depleted
	end
end

local function onMine(node: Node, player: Player)
	local Security = Registry.get("SecurityService")
	if not Security.allow(player, "Interact") then
		return
	end
	if node.depleted or node.charges <= 0 then
		return
	end
	if not Security.within(player, node.position, node.prompt.MaxActivationDistance + 5) then
		Security.flag(player, "mena fuera de alcance")
		return
	end
	local profile = Registry.get("PlayerDataService").get(player)
	if not profile then
		return
	end
	if profile.tools.pickTier < node.def.tier and not node.softTier then
		Net.event("Notify"):FireClient(
			player,
			"Error",
			string.format("%s requiere %s (fabrícalo en el Banco del Artesano).", node.def.displayName, ResourceConfig.ToolTiers[node.def.tier])
		)
		return
	end
	-- claim (synchronous)
	node.charges -= 1
	local amount = math.random(node.def.yield[1], node.def.yield[2])
	local item = node.def.item
	Registry.get("ExpeditionService").giveLoot(player, { [item] = amount }, 0, node.position)
	Registry.get("ProgressionService").addXp(player, node.def.xp)
	Registry.get("ProgressionService").stat(player, "oreMined", amount)
	Registry.get("QuestService").record(player, "Mine", { item = item, node = node.def.id }, amount)
	Net.event("Effect"):FireAllClients("Mine", { position = node.position, color = node.def.glow, item = ItemConfig.Items[item].name })
	if node.charges <= 0 then
		if node.temporary or node.def.respawn <= 0 then
			nodes[node.id] = nil
			node.model:Destroy()
		else
			setDepleted(node, true)
			task.delay(node.def.respawn, function()
				if nodes[node.id] then
					node.charges = node.def.charges
					setDepleted(node, false)
				end
			end)
		end
	end
end

function ResourceService.spawnNode(nodeId: string, position: Vector3, opts: any?): Node?
	local def = ResourceConfig.Nodes[nodeId]
	if not def then
		return nil
	end
	local o = opts or {}
	local model, base = Models.node(def, position, folder)
	local prompt = Instance.new("ProximityPrompt")
	prompt.ActionText = "Minar"
	prompt.ObjectText = def.displayName .. (if def.tier > 1 and not o.softTier then " (Pico de Cobalto)" else "")
	prompt.HoldDuration = def.holdDuration
	prompt.MaxActivationDistance = 10
	prompt.RequiresLineOfSight = false
	prompt.KeyboardKeyCode = Enum.KeyCode.F
	prompt.GamepadKeyCode = Enum.KeyCode.ButtonX
	prompt.Parent = base
	nextId += 1
	local node: Node = {
		id = nextId,
		def = def,
		model = model,
		base = base,
		prompt = prompt,
		charges = def.charges,
		position = position,
		temporary = o.temporary == true,
		softTier = o.softTier == true,
		depleted = false,
	}
	model:SetAttribute("Resource", def.item)
	nodes[node.id] = node
	prompt.Triggered:Connect(function(player)
		onMine(node, player)
	end)
	prompt.PromptButtonHoldBegan:Connect(function(player)
		Net.event("Effect"):FireAllClients("MineSwing", { character = player.Character, position = position })
	end)
	return node
end

function ResourceService.removeNode(node: Node)
	nodes[node.id] = nil
	if node.model.Parent then
		node.model:Destroy()
	end
end

function ResourceService.Init()
	folder = Instance.new("Folder")
	folder.Name = "Resources"
	folder.Parent = workspace
end

function ResourceService.Start()
	for _, placement in WorldConfig.Nodes do
		ResourceService.spawnNode(placement.node, placement.position)
	end
end

return ResourceService
