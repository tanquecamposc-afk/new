--!strict
-- Window manager. One modal window at a time: the main menu (tabs) or a station view opened
-- by the server (OpenView). Each view is a module in UI/Views with mount(container, ctx) and
-- an optional refresh(); views re-render when the synced profile changes.

local Players = game:GetService("Players")

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Net = require(Shared.Net)
local ClientState = require(script.Parent.Parent.ClientState)
local InputController = require(script.Parent.InputController)
local Kit = require(script.Parent.Parent.UI.Kit)
local Theme = require(script.Parent.Parent.UI.Theme)

local C = Theme.Colors
local Views = script.Parent.Parent.UI.Views
local UIController = {}

local player = Players.LocalPlayer
local gui: ScreenGui
local window: Frame? = nil
local content: Frame? = nil
local activeView: any = nil
local activeName: string? = nil
local tabButtons: { [string]: any } = {}

local MENU_TABS = {
	{ id = "Inventory", label = "Inventario" },
	{ id = "Loadout", label = "Equipo" },
	{ id = "Mastery", label = "Maestría" },
	{ id = "Quests", label = "Contratos" },
	{ id = "Codex", label = "Códice" },
	{ id = "Party", label = "Grupo" },
	{ id = "Stats", label = "Estadísticas" },
	{ id = "Settings", label = "Ajustes" },
	{ id = "Store", label = "Tienda" },
	{ id = "Help", label = "Ayuda" },
}

local STATION_TITLES = {
	Forge = "LA SOULFORGE",
	Fusion = "CÁMARA DE FUSIÓN",
	Expedition = "PORTAL DE LA GRIETA",
	BossGate = "PUERTA DEL CELADOR",
	Trial = "PRUEBA DE LA KATANA",
}

local function close()
	if activeView and activeView.destroy then
		pcall(activeView.destroy)
	end
	activeView = nil
	activeName = nil
	if window then
		window:Destroy()
		window = nil
		content = nil
	end
	tabButtons = {}
end

local function mountView(name: string, data: any?)
	if not content then
		return
	end
	if activeView and activeView.destroy then
		pcall(activeView.destroy)
	end
	Kit.clear(content :: Frame)
	local module = Views:FindFirstChild(name .. "View")
	if not module then
		Kit.text({ parent = content, text = "Esta vista aún no está disponible.", color = C.TextDim })
		return
	end
	local view = require(module) :: any
	activeName = name
	activeView = view.mount(content, { data = data, close = close, open = UIController.open })
	for id, button in tabButtons do
		button.instance.BackgroundColor3 = if id == name then C.Accent else C.PanelLight
	end
end

local function buildWindow(title: string, withTabs: boolean)
	close()
	local frame = Kit.panel({
		parent = gui,
		size = UDim2.fromScale(0.86, 0.82),
		anchor = Vector2.new(0.5, 0.5),
		position = UDim2.fromScale(0.5, 0.52),
		color = C.Background,
		name = "Window",
		strokeColor = C.Accent,
	})
	frame.BackgroundTransparency = 0.04
	Kit.new("UISizeConstraint", { MaxSize = Vector2.new(1100, 760), MinSize = Vector2.new(320, 300), Parent = frame })
	Kit.text({ parent = frame, text = title, font = Theme.Fonts.Title, textSize = 24, position = UDim2.fromOffset(20, 12), size = UDim2.new(1, -120, 0, 32) })
	Kit.button({ parent = frame, text = "✕", size = UDim2.fromOffset(40, 36), anchor = Vector2.new(1, 0), position = UDim2.new(1, -12, 0, 10), color = C.PanelLight, onClick = close })
	local top = 54
	if withTabs then
		local tabs = Kit.new("ScrollingFrame", {
			BackgroundTransparency = 1,
			Size = UDim2.new(1, -40, 0, 44),
			Position = UDim2.fromOffset(20, 50),
			CanvasSize = UDim2.new(),
			AutomaticCanvasSize = Enum.AutomaticSize.X,
			ScrollingDirection = Enum.ScrollingDirection.X,
			ScrollBarThickness = 3,
			BorderSizePixel = 0,
			Parent = frame,
		})
		Kit.list(tabs, 6, true)
		for i, tab in MENU_TABS do
			tabButtons[tab.id] = Kit.button({ parent = tabs, text = tab.label, size = UDim2.fromOffset(98, 36), color = C.PanelLight, order = i, textSize = 14, onClick = function()
				mountView(tab.id)
			end })
		end
		top = 100
	end
	local body = Kit.new("Frame", { Name = "Content", BackgroundTransparency = 1, Size = UDim2.new(1, -40, 1, -top - 16), Position = UDim2.fromOffset(20, top), Parent = frame })
	window = frame
	content = body
end

function UIController.open(name: string, data: any?)
	local station = STATION_TITLES[name]
	if station then
		buildWindow(station, false)
	else
		buildWindow("RIFTBOUND: SOULFORGE", true)
	end
	mountView(name, data)
end

function UIController.isOpen(): boolean
	return window ~= nil
end

function UIController.toggleMenu()
	if window then
		close()
	else
		UIController.open("Inventory")
	end
end

function UIController.init()
	gui = Kit.new("ScreenGui", {
		Name = "Menus",
		ResetOnSpawn = false,
		IgnoreGuiInset = false,
		DisplayOrder = 20,
		ZIndexBehavior = Enum.ZIndexBehavior.Sibling,
		Parent = player:WaitForChild("PlayerGui"),
	})
	InputController.isBlocked = UIController.isOpen
	InputController.toggleMenu = UIController.toggleMenu
	Net.event("OpenView").OnClientEvent:Connect(function(name, data)
		if type(name) == "string" then
			UIController.open(name, data)
		end
	end)
	ClientState.Changed:Connect(function(key)
		if activeView and activeView.refresh and (key == "profile" or key == "party" or key == "boss" or key == "trial" or key == "expedition") then
			local ok, err = pcall(activeView.refresh, key)
			if not ok then
				warn("[UI] refresh " .. tostring(activeName) .. ": " .. tostring(err))
			end
		end
	end)
	player.CharacterRemoving:Connect(function()
		-- keep menus open across respawn; nothing to clean
	end)
end

return UIController
