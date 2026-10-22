-- Punto de entrada del servidor: crea los Remotes, inicia los módulos
-- y conecta jugadores, prompts y herramientas.
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ProximityPromptService = game:GetService("ProximityPromptService")

local Modules = script.Parent:WaitForChild("Modules")

local ctx = {}

-- Remotes ---------------------------------------------------------------
local remotesFolder = Instance.new("Folder")
remotesFolder.Name = "Remotes"
local function remoteEvent(name)
	local r = Instance.new("RemoteEvent")
	r.Name = name
	r.Parent = remotesFolder
	return r
end
ctx.Remotes = {
	Notify = remoteEvent("Notify"),
	Announce = remoteEvent("Announce"),
	Sync = remoteEvent("Sync"),
	Tool = remoteEvent("Tool"),
	Knock = remoteEvent("Knock"),
	Alert = remoteEvent("Alert"),
	Effect = remoteEvent("Effect"),
	PhotoResult = remoteEvent("PhotoResult"),
	ReportResult = remoteEvent("ReportResult"),
	Hatched = remoteEvent("Hatched"),
	Combo = remoteEvent("Combo"),
}
local request = Instance.new("RemoteFunction")
request.Name = "Request"
request.Parent = remotesFolder
ctx.Request = request
remotesFolder.Parent = ReplicatedStorage

function ctx.Notify(player, text, color)
	ctx.Remotes.Notify:FireClient(player, text, color)
end
function ctx.NotifyAll(text, color)
	ctx.Remotes.Notify:FireAllClients(text, color)
end
function ctx.Announce(title, subtitle, color)
	ctx.Remotes.Announce:FireAllClients(title, subtitle, color)
end
function ctx.Effect(kind, position, color)
	ctx.Remotes.Effect:FireAllClients(kind, position, color)
end

-- Módulos ---------------------------------------------------------------
local ORDER = { "Data", "Anoms", "Bases", "Progression", "Market", "Care", "Steal", "Sanity", "Cycle" }
for _, name in ipairs(ORDER) do
	ctx[name] = require(Modules:WaitForChild(name))
end
for _, name in ipairs(ORDER) do
	ctx[name].Init(ctx)
end

-- Jugadores -------------------------------------------------------------
local function onCharacter(player, char)
	ctx.Bases.OnCharacter(player, char)
	ctx.Steal.OnCharacter(player, char)
	ctx.Progression.OnCharacter(player, char)
end

local function onPlayerAdded(player)
	local data = ctx.Data.Load(player)
	if not player.Parent then
		ctx.Data.Release(player)
		return
	end
	local offline = 0
	if data.LastOnline and data.LastOnline > 0 then
		offline = math.clamp(os.time() - data.LastOnline, 0, 6 * 3600)
	end
	local ok = ctx.Bases.Assign(player, offline)
	if not ok then
		player:Kick("Este servidor está lleno de anomalías. ¡Prueba otro servidor!")
		return
	end
	ctx.Progression.Setup(player, data)
	player.CharacterAdded:Connect(function(char)
		onCharacter(player, char)
	end)
	if player.Character then
		onCharacter(player, player.Character)
	end
	ctx.Progression.Sync(player)
end

Players.PlayerAdded:Connect(onPlayerAdded)
for _, p in ipairs(Players:GetPlayers()) do
	task.spawn(onPlayerAdded, p)
end

Players.PlayerRemoving:Connect(function(player)
	ctx.Steal.OnLeave(player)
	ctx.Progression.OnLeave(player)
	ctx.Bases.Release(player)
	ctx.Data.Release(player)
end)

game:BindToClose(function()
	ctx.Data.SaveAll()
end)

-- ProximityPrompts --------------------------------------------------------
ProximityPromptService.PromptTriggered:Connect(function(prompt, player)
	local kind = prompt:GetAttribute("Kind")
	if not kind then
		return
	end
	local model = prompt:FindFirstAncestorOfClass("Model")
	if kind == "Lock" then
		ctx.Bases.Lock(player, model)
		return
	elseif kind == "Coffee" then
		ctx.Sanity.Coffee(player, model)
		return
	end
	local info = model and ctx.Anoms.Registry[model]
	if not info then
		return
	end
	if kind == "Buy" then
		ctx.Market.Buy(player, info)
	elseif kind == "Treat" then
		ctx.Care.Treat(player, info)
	elseif kind == "Steal" then
		ctx.Steal.StartSteal(player, info)
	elseif kind == "Sell" then
		ctx.Bases.Sell(player, info)
	elseif kind == "Capture" then
		ctx.Steal.Capture(player, info)
	elseif kind == "Catch" then
		ctx.Steal.CatchMimic(player, info)
	end
end)

-- Herramientas (Escáner y Bate) -----------------------------------------------
ctx.Remotes.Tool.OnServerEvent:Connect(function(player, action, target)
	if action == "Photo" then
		ctx.Steal.Photo(player, target)
	elseif action == "Report" then
		ctx.Steal.Report(player)
	elseif action == "Swing" then
		ctx.Steal.Swing(player)
	end
end)

request.OnServerInvoke = function(player, action, arg)
	return ctx.Progression.HandleRequest(player, action, arg)
end
