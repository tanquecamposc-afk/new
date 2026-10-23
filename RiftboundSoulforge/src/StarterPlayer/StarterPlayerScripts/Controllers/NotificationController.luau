--!strict
-- Toasts, loot feed, banners, presentation moments (first essence/fusion/evolution/awakening,
-- boss intro/defeat, secrets), death summaries and party invites. Concise by design.

local Players = game:GetService("Players")
local TweenService = game:GetService("TweenService")

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Net = require(Shared.Net)
local ItemConfig = require(Shared.Config.ItemConfig)
local ClientState = require(script.Parent.Parent.ClientState)
local SoundController = require(script.Parent.SoundController)
local Kit = require(script.Parent.Parent.UI.Kit)
local Theme = require(script.Parent.Parent.UI.Theme)

local C = Theme.Colors
local NotificationController = {}

local player = Players.LocalPlayer
local gui: ScreenGui
local toastHolder: Frame
local lootHolder: Frame
local bannerLabel: TextLabel
local warningBar: TextLabel
local presentQueue: { any } = {}
local presenting = false

local KIND_COLORS: { [string]: Color3 } = {
	Error = C.Bad,
	Success = C.Good,
	Info = C.TextDim,
	Hint = C.Accent,
	Lore = Color3.fromRGB(255, 220, 160),
	Achievement = C.Gold,
	Unlock = C.Gold,
	QuestComplete = C.Good,
	Mastery = Color3.fromRGB(150, 220, 255),
	Craft = C.Gold,
	Attune = C.Accent,
	Party = Color3.fromRGB(140, 200, 255),
	Discovery = Color3.fromRGB(255, 220, 140),
	Resonance = C.Resonance,
	Extract = Color3.fromRGB(110, 255, 210),
}

function NotificationController.toast(kind: string, text: string, extra: any?)
	if not toastHolder or text == "" then
		return
	end
	local color = (extra and extra.color) or KIND_COLORS[kind] or C.TextDim
	local frame = Kit.panel({
		parent = toastHolder,
		size = UDim2.new(1, 0, 0, 0),
		autoSize = Enum.AutomaticSize.Y,
		color = C.Panel,
		strokeColor = color,
		pad = 10,
		order = -math.floor(os.clock() * 100),
	})
	frame.BackgroundTransparency = 0.08
	Kit.list(frame, 2)
	local title = if kind == "Achievement" then "★ LOGRO" elseif kind == "QuestComplete" then "✔ CONTRATO COMPLETADO" else nil
	if title then
		Kit.text({ parent = frame, text = title, color = color, font = Theme.Fonts.Bold, textSize = 13, order = 1 })
	end
	local body = Kit.text({ parent = frame, text = text, color = C.Text, textSize = 15, order = 2, size = UDim2.new(1, 0, 0, 0), autoSize = Enum.AutomaticSize.Y })
	body.Font = Theme.Fonts.Medium
	if extra and extra.description then
		Kit.text({ parent = frame, text = extra.description, color = C.TextDim, textSize = 13, order = 3, size = UDim2.new(1, 0, 0, 0), autoSize = Enum.AutomaticSize.Y })
	end
	if extra and extra.unlock then
		Kit.text({ parent = frame, text = "Desbloqueado: " .. extra.unlock, color = C.Gold, textSize = 13, order = 4, size = UDim2.new(1, 0, 0, 0), autoSize = Enum.AutomaticSize.Y })
	end
	if extra and extra.actions then
		local row = Kit.row(frame, 5, 32)
		for _, action in extra.actions do
			Kit.button({ parent = row, text = action.text, size = UDim2.fromOffset(100, 30), color = action.color, onClick = function()
				action.fn()
				frame:Destroy()
			end })
		end
	end
	local children = toastHolder:GetChildren()
	local count = 0
	for _, child in children do
		if child:IsA("Frame") then
			count += 1
		end
	end
	if count > 5 then
		local oldest, oldestOrder = nil, math.huge
		for _, child in children do
			if child:IsA("Frame") and child.LayoutOrder > -oldestOrder then
				oldest, oldestOrder = child, -child.LayoutOrder
			end
		end
		if oldest and oldest ~= frame then
			oldest:Destroy()
		end
	end
	task.delay((extra and extra.duration) or 4, function()
		if frame.Parent then
			TweenService:Create(frame, TweenInfo.new(0.3), { BackgroundTransparency = 1 }):Play()
			task.wait(0.3)
			frame:Destroy()
		end
	end)
end

local function loot(items: any, coins: number, satchel: boolean)
	local lines = {}
	if coins and coins > 0 then
		table.insert(lines, string.format("+%d monedas", coins))
	end
	for item, n in items or {} do
		local def = ItemConfig.Items[item]
		table.insert(lines, string.format("+%d %s", n, def and def.name or item))
	end
	for _, line in lines do
		local label = Kit.text({
			parent = lootHolder,
			text = line .. (if satchel then "  (Mochila)" else ""),
			color = if satchel then Color3.fromRGB(255, 220, 150) else C.Good,
			font = Theme.Fonts.Bold,
			textSize = 15,
			strokeT = 0.4,
			order = -math.floor(os.clock() * 100),
		})
		task.delay(2.6, function()
			TweenService:Create(label, TweenInfo.new(0.4), { TextTransparency = 1, TextStrokeTransparency = 1 }):Play()
			task.wait(0.4)
			label:Destroy()
		end)
	end
end

function NotificationController.banner(text: string, color: Color3?, duration: number?)
	bannerLabel.Text = text
	bannerLabel.TextColor3 = color or C.Text
	bannerLabel.Visible = true
	bannerLabel.TextTransparency = 0
	local token = os.clock()
	bannerLabel:SetAttribute("Token", token)
	task.delay(duration or 3, function()
		if bannerLabel:GetAttribute("Token") == token then
			TweenService:Create(bannerLabel, TweenInfo.new(0.4), { TextTransparency = 1 }):Play()
		end
	end)
end

local function showNextPresentation()
	if presenting or #presentQueue == 0 then
		return
	end
	presenting = true
	local data = table.remove(presentQueue, 1)
	local color = data.color or C.Gold
	local card = Kit.panel({
		parent = gui,
		size = UDim2.fromOffset(520, 0),
		autoSize = Enum.AutomaticSize.Y,
		anchor = Vector2.new(0.5, 0.5),
		position = UDim2.fromScale(0.5, 0.36),
		color = Color3.fromRGB(12, 12, 20),
		strokeColor = color,
		pad = 20,
	})
	card.ZIndex = 10
	Kit.new("UISizeConstraint", { MaxSize = Vector2.new(560, 400), Parent = card })
	Kit.list(card, 6, false, Enum.HorizontalAlignment.Center)
	Kit.text({ parent = card, text = string.upper(data.subtitle or ""), color = color, font = Theme.Fonts.Bold, textSize = 14, alignX = Enum.TextXAlignment.Center, order = 1 })
	Kit.text({ parent = card, text = data.title or "", color = C.Text, font = Theme.Fonts.Title, textSize = 34, alignX = Enum.TextXAlignment.Center, order = 2, size = UDim2.new(1, 0, 0, 0), autoSize = Enum.AutomaticSize.Y })
	Kit.text({ parent = card, text = data.body or "", color = C.TextDim, textSize = 16, alignX = Enum.TextXAlignment.Center, order = 3, size = UDim2.new(1, 0, 0, 0), autoSize = Enum.AutomaticSize.Y })
	Kit.text({ parent = card, text = "clic para cerrar", color = C.TextMuted, textSize = 12, alignX = Enum.TextXAlignment.Center, order = 4 })
	local scale = Kit.new("UIScale", { Scale = 0.8, Parent = card })
	TweenService:Create(scale, TweenInfo.new(0.35, Enum.EasingStyle.Back), { Scale = 1 }):Play()
	SoundController.play("ItemDiscovery")
	local closed = false
	local function close()
		if closed then
			return
		end
		closed = true
		card:Destroy()
		presenting = false
		showNextPresentation()
	end
	local hit = Kit.new("TextButton", { BackgroundTransparency = 1, Text = "", Size = UDim2.fromScale(1, 1), ZIndex = 20, Parent = card })
	hit.Activated:Connect(close)
	task.delay(5.5, close)
end

function NotificationController.present(data: any)
	table.insert(presentQueue, data)
	showNextPresentation()
end

local function onNotify(kind: string, text: string, extra: any)
	extra = extra or {}
	if kind == "DataWarning" then
		warningBar.Text = "⚠ " .. text
		warningBar.Visible = true
	elseif kind == "Loot" then
		loot(extra.items, extra.coins or 0, extra.satchel == true)
	elseif kind == "Extract" then
		SoundController.play("Extraction")
		NotificationController.toast("Extract", "¡Botín asegurado! Ahora es permanente.", { color = KIND_COLORS.Extract })
	elseif kind == "Death" then
		local lines = {}
		for item, n in extra.lostItems or {} do
			local def = ItemConfig.Items[item]
			table.insert(lines, string.format("-%d %s", n, def and def.name or item))
		end
		if (extra.lostCoins or 0) > 0 then
			table.insert(lines, string.format("-%d monedas", extra.lostCoins))
		end
		NotificationController.present({
			title = "Has Caído",
			subtitle = string.format("Profundidad %d", extra.depth or 0),
			body = if #lines > 0 then "Perdido de tu Mochila: " .. table.concat(lines, ", ") .. ". Maestría, EXP y desbloqueos están a salvo." else "No se perdió nada. Maestría, EXP y desbloqueos siempre están a salvo.",
			color = C.Bad,
		})
	elseif kind == "LevelUp" then
		SoundController.play("LevelUp")
		NotificationController.banner(text, C.Gold, 3)
		if extra.unlock then
			NotificationController.toast("Unlock", "Desbloqueado: " .. extra.unlock)
		end
	elseif kind == "Coop" then
		NotificationController.banner("RESONANCIA COOPERATIVA: " .. string.upper(text), extra.color, 3)
		NotificationController.toast("Success", table.concat(extra.players or {}, " + ") .. " activaron " .. text .. "!", { color = extra.color })
	elseif kind == "Boss" or kind == "BossPhase" or kind == "WorldEvent" then
		NotificationController.banner(text, extra.color or Color3.fromRGB(255, 120, 170), 3.5)
	elseif kind == "QuestComplete" then
		SoundController.play("QuestComplete")
		NotificationController.toast(kind, text .. " (reclámala en el menú de Contratos)", extra)
	elseif kind == "PartyInvite" then
		NotificationController.toast("Party", text, {
			duration = 30,
			actions = {
				{ text = "Aceptar", color = C.Good, fn = function()
					ClientState.request("PartyRespond", { userId = extra.from, accept = true })
				end },
				{ text = "Rechazar", color = C.Bad, fn = function()
					ClientState.request("PartyRespond", { userId = extra.from, accept = false })
				end },
			},
		})
	else
		NotificationController.toast(kind, text, extra)
	end
end

function NotificationController.init()
	gui = Kit.new("ScreenGui", {
		Name = "Notifications",
		ResetOnSpawn = false,
		IgnoreGuiInset = true,
		DisplayOrder = 30,
		ZIndexBehavior = Enum.ZIndexBehavior.Sibling,
		Parent = player:WaitForChild("PlayerGui"),
	})
	toastHolder = Kit.new("Frame", {
		Name = "Toasts",
		BackgroundTransparency = 1,
		Size = UDim2.fromOffset(320, 400),
		AnchorPoint = Vector2.new(1, 1),
		Position = UDim2.new(1, -16, 1, -150),
		Parent = gui,
	})
	local layout = Kit.list(toastHolder, 6)
	layout.VerticalAlignment = Enum.VerticalAlignment.Bottom
	lootHolder = Kit.new("Frame", {
		Name = "Loot",
		BackgroundTransparency = 1,
		Size = UDim2.fromOffset(300, 200),
		AnchorPoint = Vector2.new(0, 1),
		Position = UDim2.new(0, 16, 1, -190),
		Parent = gui,
	})
	local lootLayout = Kit.list(lootHolder, 2)
	lootLayout.VerticalAlignment = Enum.VerticalAlignment.Bottom
	bannerLabel = Kit.text({
		parent = gui,
		text = "",
		font = Theme.Fonts.Title,
		textSize = 30,
		alignX = Enum.TextXAlignment.Center,
		size = UDim2.new(0.8, 0, 0, 40),
		position = UDim2.fromScale(0.5, 0.2),
		anchor = Vector2.new(0.5, 0.5),
		strokeT = 0.3,
	})
	bannerLabel.Visible = false
	warningBar = Kit.text({
		parent = gui,
		text = "",
		color = Color3.new(1, 1, 1),
		font = Theme.Fonts.Bold,
		textSize = 14,
		alignX = Enum.TextXAlignment.Center,
		size = UDim2.new(1, 0, 0, 26),
		position = UDim2.new(0, 0, 0, 0),
	})
	warningBar.BackgroundTransparency = 0.1
	warningBar.BackgroundColor3 = Color3.fromRGB(150, 40, 40)
	warningBar.Visible = false

	ClientState.toast = NotificationController.toast
	Net.event("Notify").OnClientEvent:Connect(function(kind, text, extra)
		local ok, err = pcall(onNotify, kind, text or "", extra)
		if not ok then
			warn("[Notify] " .. tostring(err))
		end
	end)
	Net.event("Present").OnClientEvent:Connect(function(_momentId, data)
		if type(data) == "table" then
			NotificationController.present(data)
		end
	end)
end

return NotificationController
