--!strict
-- The always-on HUD: vitals, resonance, ability bar with cooldowns, build line, currencies,
-- satchel/depth risk, quest + trial trackers, party frames, world event strip, boss bar,
-- lock-on status and touch controls. Display only.

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local UserInputService = game:GetService("UserInputService")

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Config = Shared.Config
local ItemConfig = require(Config.ItemConfig)
local WeaponConfig = require(Config.WeaponConfig)
local EssenceConfig = require(Config.EssenceConfig)
local AwakeningConfig = require(Config.AwakeningConfig)
local ProgressionConfig = require(Config.ProgressionConfig)
local Leveling = require(Shared.Progression.Leveling)
local Format = require(Shared.Util.Format)
local CombatMath = require(Shared.Combat.CombatMath)
local ClientState = require(script.Parent.Parent.ClientState)
local CombatController = require(script.Parent.CombatController)
local InputController = require(script.Parent.InputController)
local Kit = require(script.Parent.Parent.UI.Kit)
local Theme = require(script.Parent.Parent.UI.Theme)
local QuestLogic = require(script.Parent.Parent.UI.QuestLogic)

local C = Theme.Colors
local HUDController = {}

local player = Players.LocalPlayer
local gui: ScreenGui
local scale: UIScale
local refs: { [string]: any } = {}
local slots: { [string]: any } = {}

local function makeSlot(parent: Instance, id: string, key: string, order: number, accent: Color3?)
	local frame = Kit.panel({ parent = parent, size = UDim2.fromOffset(66, 66), color = C.Panel, order = order, strokeColor = accent, name = "Slot" .. id })
	frame.BackgroundTransparency = 0.15
	local title = Kit.text({ parent = frame, text = "", textSize = 11, font = Theme.Fonts.Bold, alignX = Enum.TextXAlignment.Center, size = UDim2.new(1, -6, 0, 30), position = UDim2.fromOffset(3, 14) })
	title.TextScaled = false
	local keyLabel = Kit.text({ parent = frame, text = key, textSize = 11, font = Theme.Fonts.Bold, color = C.Gold, alignX = Enum.TextXAlignment.Left, size = UDim2.new(1, -8, 0, 14), position = UDim2.fromOffset(5, 2) })
	local sub = Kit.text({ parent = frame, text = "", textSize = 10, color = C.TextDim, alignX = Enum.TextXAlignment.Center, size = UDim2.new(1, -4, 0, 14), position = UDim2.new(0, 2, 1, -17) })
	local overlay = Kit.new("Frame", { BackgroundColor3 = Color3.new(0, 0, 0), BackgroundTransparency = 0.35, BorderSizePixel = 0, Size = UDim2.fromScale(1, 0), AnchorPoint = Vector2.new(0, 1), Position = UDim2.fromScale(0, 1), ZIndex = 3, Parent = frame })
	Kit.corner(overlay, 10)
	local cd = Kit.text({ parent = frame, text = "", textSize = 20, font = Theme.Fonts.Title, alignX = Enum.TextXAlignment.Center, size = UDim2.fromScale(1, 1), strokeT = 0.3 })
	cd.ZIndex = 4
	local lock = Kit.text({ parent = frame, text = "🔒", textSize = 18, alignX = Enum.TextXAlignment.Right, size = UDim2.new(1, -4, 0, 18), position = UDim2.fromOffset(0, 1) })
	lock.Visible = false
	slots[id] = { frame = frame, title = title, sub = sub, overlay = overlay, cd = cd, lock = lock, key = keyLabel }
	return slots[id]
end

local function buildVitals(root: Instance)
	local panel = Kit.panel({ parent = root, size = UDim2.fromOffset(300, 108), anchor = Vector2.new(0, 1), position = UDim2.new(0, 16, 1, -16), pad = 10, name = "Vitals" })
	panel.BackgroundTransparency = 0.25
	Kit.list(panel, 6)
	refs.health = Kit.bar({ parent = panel, color = C.Health, size = UDim2.new(1, 0, 0, 20), order = 1, textSize = 13 })
	refs.stamina = Kit.bar({ parent = panel, color = C.Stamina, size = UDim2.new(1, 0, 0, 10), order = 2, instant = true })
	local resRow = Kit.new("Frame", { BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 18), LayoutOrder = 3, Parent = panel })
	refs.resonance = Kit.bar({ parent = resRow, color = C.Resonance, size = UDim2.new(1, -86, 1, 0), textSize = 11 })
	refs.resonanceLabel = Kit.text({ parent = resRow, text = "RESONANCE", textSize = 11, font = Theme.Fonts.Bold, color = C.Resonance, size = UDim2.new(0, 82, 1, 0), position = UDim2.new(1, -82, 0, 0), alignX = Enum.TextXAlignment.Right })
	refs.awaken = Kit.text({ parent = panel, text = "", textSize = 13, font = Theme.Fonts.Bold, color = C.Gold, order = 4 })
end

local function buildAbilityBar(root: Instance)
	local holder = Kit.new("Frame", { Name = "Abilities", BackgroundTransparency = 1, Size = UDim2.fromOffset(620, 110), AnchorPoint = Vector2.new(0.5, 1), Position = UDim2.new(0.5, 0, 1, -12), Parent = root })
	refs.build = Kit.text({ parent = holder, text = "", textSize = 14, font = Theme.Fonts.Bold, alignX = Enum.TextXAlignment.Center, size = UDim2.new(1, 0, 0, 20), strokeT = 0.5, rich = true })
	local row = Kit.new("Frame", { BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 70), Position = UDim2.fromOffset(0, 32), Parent = holder })
	local layout = Kit.list(row, 6, true, Enum.HorizontalAlignment.Center)
	layout.VerticalAlignment = Enum.VerticalAlignment.Center
	makeSlot(row, "Light", "LMB", 1)
	makeSlot(row, "Heavy", "V", 2)
	makeSlot(row, "Dodge", "SHIFT", 3)
	makeSlot(row, "Q", "Q", 4)
	makeSlot(row, "E", "E", 5)
	makeSlot(row, "R", "R", 6, C.Gold)
	makeSlot(row, "G", "G", 7, C.Resonance)
	makeSlot(row, "H", "H", 8)
end

local function buildTopLeft(root: Instance)
	local panel = Kit.panel({ parent = root, size = UDim2.fromOffset(320, 0), autoSize = Enum.AutomaticSize.Y, position = UDim2.fromOffset(16, 16), pad = 10, name = "Profile" })
	panel.BackgroundTransparency = 0.25
	Kit.list(panel, 4)
	refs.level = Kit.text({ parent = panel, text = "Lv 1", textSize = 16, font = Theme.Fonts.Bold, order = 1, rich = true })
	refs.xp = Kit.bar({ parent = panel, color = C.Gold, size = UDim2.new(1, 0, 0, 8), order = 2 })
	refs.currency = Kit.text({ parent = panel, text = "", textSize = 13, color = C.TextDim, order = 3, size = UDim2.new(1, 0, 0, 0), autoSize = Enum.AutomaticSize.Y, rich = true })
	-- satchel / expedition
	local satchel = Kit.panel({ parent = root, size = UDim2.fromOffset(320, 0), autoSize = Enum.AutomaticSize.Y, position = UDim2.fromOffset(16, 120), pad = 10, name = "Satchel", strokeColor = C.Warn })
	satchel.BackgroundTransparency = 0.25
	Kit.list(satchel, 3)
	refs.region = Kit.text({ parent = satchel, text = "", textSize = 15, font = Theme.Fonts.Bold, order = 1 })
	refs.risk = Kit.text({ parent = satchel, text = "", textSize = 13, color = C.Warn, order = 2, rich = true })
	refs.satchel = Kit.text({ parent = satchel, text = "", textSize = 13, color = C.Text, order = 3, size = UDim2.new(1, 0, 0, 0), autoSize = Enum.AutomaticSize.Y })
	refs.satchelPanel = satchel
	-- party
	local party = Kit.panel({ parent = root, size = UDim2.fromOffset(220, 0), autoSize = Enum.AutomaticSize.Y, anchor = Vector2.new(0, 1), position = UDim2.new(0, 16, 1, -140), pad = 8, name = "Party" })
	party.BackgroundTransparency = 0.3
	Kit.list(party, 4)
	refs.partyPanel = party
end

local function buildRight(root: Instance)
	local menu = Kit.button({ parent = root, text = "☰  MENU  (M)", size = UDim2.fromOffset(150, 38), anchor = Vector2.new(1, 0), position = UDim2.new(1, -16, 0, 16), color = C.PanelLight, onClick = function()
		InputController.toggleMenu()
	end })
	menu.instance.Name = "MenuButton"
	local tracker = Kit.panel({ parent = root, size = UDim2.fromOffset(300, 0), autoSize = Enum.AutomaticSize.Y, anchor = Vector2.new(1, 0), position = UDim2.new(1, -16, 0, 66), pad = 10, name = "Quests" })
	tracker.BackgroundTransparency = 0.3
	Kit.list(tracker, 4)
	refs.tracker = tracker
	local trial = Kit.panel({ parent = root, size = UDim2.fromOffset(300, 0), autoSize = Enum.AutomaticSize.Y, anchor = Vector2.new(1, 0), position = UDim2.new(1, -16, 0, 300), pad = 10, name = "Trial", strokeColor = Color3.fromRGB(120, 230, 255) })
	trial.BackgroundTransparency = 0.25
	Kit.list(trial, 3)
	refs.trial = trial
	refs.lock = Kit.text({ parent = root, text = "", textSize = 14, font = Theme.Fonts.Bold, color = Color3.fromRGB(255, 240, 160), alignX = Enum.TextXAlignment.Center, size = UDim2.fromOffset(300, 20), anchor = Vector2.new(0.5, 1), position = UDim2.new(0.5, 0, 1, -128), strokeT = 0.4 })
end

local function buildTop(root: Instance)
	local event = Kit.panel({ parent = root, size = UDim2.fromOffset(460, 0), autoSize = Enum.AutomaticSize.Y, anchor = Vector2.new(0.5, 0), position = UDim2.new(0.5, 0, 0, 10), pad = 8, name = "Event" })
	event.BackgroundTransparency = 0.25
	Kit.list(event, 2, false, Enum.HorizontalAlignment.Center)
	refs.eventTitle = Kit.text({ parent = event, text = "", textSize = 16, font = Theme.Fonts.Bold, alignX = Enum.TextXAlignment.Center, order = 1 })
	refs.eventBody = Kit.text({ parent = event, text = "", textSize = 12, color = C.TextDim, alignX = Enum.TextXAlignment.Center, order = 2, size = UDim2.new(1, 0, 0, 0), autoSize = Enum.AutomaticSize.Y })
	refs.event = event
	local boss = Kit.panel({ parent = root, size = UDim2.fromOffset(620, 0), autoSize = Enum.AutomaticSize.Y, anchor = Vector2.new(0.5, 0), position = UDim2.new(0.5, 0, 0, 74), pad = 10, name = "Boss", strokeColor = Color3.fromRGB(255, 70, 140) })
	boss.BackgroundTransparency = 0.2
	Kit.list(boss, 4, false, Enum.HorizontalAlignment.Center)
	refs.bossName = Kit.text({ parent = boss, text = "", textSize = 18, font = Theme.Fonts.Title, alignX = Enum.TextXAlignment.Center, order = 1 })
	local barHolder = Kit.new("Frame", { BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 20), LayoutOrder = 2, Parent = boss })
	refs.bossBar = Kit.bar({ parent = barHolder, color = Color3.fromRGB(230, 60, 120), size = UDim2.fromScale(1, 1), textSize = 12 })
	for _, threshold in { 0.7, 0.4, 0.15 } do
		local pip = Kit.new("Frame", { BackgroundColor3 = Color3.new(1, 1, 1), BorderSizePixel = 0, Size = UDim2.new(0, 2, 1, 4), Position = UDim2.new(threshold, -1, 0, -2), ZIndex = 5, Parent = barHolder })
		local _ = pip
	end
	refs.bossPhase = Kit.text({ parent = boss, text = "", textSize = 13, color = C.TextDim, alignX = Enum.TextXAlignment.Center, order = 3, rich = true })
	refs.overload = Kit.bar({ parent = boss, color = Color3.fromRGB(120, 255, 200), size = UDim2.new(0.7, 0, 0, 12), order = 4, textSize = 10 })
	refs.boss = boss
end

-- Touch controls --------------------------------------------------------------------------------

local function touchButton(parent: Instance, text: string, action: string, position: UDim2, size: number, color: Color3)
	local button = Kit.new("TextButton", {
		Name = "Touch" .. action,
		Text = text,
		Font = Theme.Fonts.Bold,
		TextSize = 14,
		TextColor3 = Color3.new(1, 1, 1),
		TextWrapped = true,
		BackgroundColor3 = color,
		BackgroundTransparency = 0.25,
		AutoButtonColor = false,
		Size = UDim2.fromOffset(size, size),
		AnchorPoint = Vector2.new(0.5, 0.5),
		Position = position,
		Parent = parent,
	})
	Kit.corner(button, size)
	Kit.stroke(button, Color3.new(1, 1, 1), 2, 0.5)
	button.InputBegan:Connect(function(input)
		if input.UserInputType == Enum.UserInputType.Touch or input.UserInputType == Enum.UserInputType.MouseButton1 then
			button.BackgroundTransparency = 0
			InputController.press(action, true)
		end
	end)
	button.InputEnded:Connect(function(input)
		if input.UserInputType == Enum.UserInputType.Touch or input.UserInputType == Enum.UserInputType.MouseButton1 then
			button.BackgroundTransparency = 0.25
			InputController.press(action, false)
		end
	end)
	return button
end

local function buildTouch(root: Instance)
	local pad = Kit.new("Frame", { Name = "TouchControls", BackgroundTransparency = 1, Size = UDim2.fromOffset(330, 300), AnchorPoint = Vector2.new(1, 1), Position = UDim2.new(1, -10, 1, -110), Parent = root })
	touchButton(pad, "ATTACK", "Light", UDim2.new(1, -60, 1, -60), 96, Color3.fromRGB(200, 60, 80))
	touchButton(pad, "HEAVY", "Heavy", UDim2.new(1, -170, 1, -40), 62, Color3.fromRGB(160, 80, 60))
	touchButton(pad, "BLOCK", "Block", UDim2.new(1, -60, 1, -170), 62, Color3.fromRGB(80, 90, 130))
	touchButton(pad, "DODGE", "Dodge", UDim2.new(1, -150, 1, -130), 62, Color3.fromRGB(70, 120, 150))
	touchButton(pad, "Q", "Q", UDim2.new(1, -250, 1, -40), 54, C.Ember)
	touchButton(pad, "E", "E", UDim2.new(1, -240, 1, -110), 54, C.Storm)
	touchButton(pad, "R", "R", UDim2.new(1, -200, 1, -180), 54, C.Gold)
	touchButton(pad, "AWAKEN", "Awaken", UDim2.new(1, -120, 1, -230), 58, C.Resonance)
	touchButton(pad, "LOCK", "Lock", UDim2.new(1, -30, 1, -250), 44, Color3.fromRGB(110, 110, 130))
	touchButton(pad, "TONIC", "Tonic", UDim2.new(1, -290, 1, -170), 44, Color3.fromRGB(200, 120, 70))
	refs.touch = pad
end

-- Refresh --------------------------------------------------------------------------------------

local function refreshProfile()
	local profile = ClientState.profile
	if not profile then
		return
	end
	refs.level.Text = string.format("<b>Lv %d</b>  <font color=\"#a0a5bc\">%s</font>", profile.level, player.DisplayName)
	refs.xp.set(Leveling.progress(profile.level, profile.xp, ProgressionConfig.levelXp, ProgressionConfig.MaxLevel))
	local m = profile.materials
	refs.currency.Text = string.format(
		"<font color=\"#ffcd6e\">◆ %s</font>   Iron %d  •  Cobalt %d  •  Ember %d\nShards %d  •  Sigils %d  •  Cores %d",
		Format.number(profile.coins),
		m.Iron or 0,
		m.Cobalt or 0,
		m.Emberstone or 0,
		m.EssenceShard or 0,
		m.BossSigil or 0,
		m.FractureCore or 0
	)
	local weapon = profile.weapons.Katana
	local def = WeaponConfig.Weapons.Katana
	local evo = def.evolutions[weapon.evolution]
	local primary = EssenceConfig.Essences[profile.loadout.primary]
	local secondary = EssenceConfig.Essences[profile.loadout.secondary]
	local function hex(c: Color3): string
		return string.format("#%02x%02x%02x", math.floor(c.R * 255), math.floor(c.G * 255), math.floor(c.B * 255))
	end
	refs.build.Text = string.format(
		"%s +%d%s  •  <font color=\"%s\">%s</font>%s",
		def.displayName,
		weapon.upgrade - 1,
		if evo then " (" .. evo.displayName .. ")" else "",
		hex(primary and primary.color or C.TextDim),
		primary and primary.displayName or "—",
		if secondary then string.format(" + <font color=\"%s\">%s</font>", hex(secondary.color), secondary.displayName) else ""
	)
	local build = CombatMath.weaponBuild("Katana", weapon)
	slots.Light.title.Text = string.format("Combo\n%d hits", #build.light)
	slots.Heavy.title.Text = build.heavy.name
	slots.Heavy.sub.Text = build.heavy.stamina .. " stam"
	slots.Dodge.title.Text = "Dodge"
	slots.Dodge.sub.Text = build.dodge.stamina .. " stam"
	for _, key in { "Q", "E", "R" } do
		local ability, reason = CombatController.slotInfo(key)
		local slot = slots[key]
		slot.title.Text = if ability then ability.displayName else (reason or "—")
		slot.lock.Visible = reason ~= nil
		slot.sub.Text = if reason and ability then reason else ""
		slot.title.TextColor3 = if reason then C.TextMuted else C.Text
	end
	local form = AwakeningConfig.Forms[profile.loadout.primary]
	slots.G.title.Text = if form then form.displayName else "Awaken"
	slots.H.title.Text = "Ember Tonic"
	slots.H.sub.Text = "x" .. tostring(m.EmberTonic or 0)
	-- quest tracker
	Kit.clear(refs.tracker)
	Kit.text({ parent = refs.tracker, text = "CONTRACTS", textSize = 12, font = Theme.Fonts.Bold, color = C.Gold, order = 0 })
	local tracked = QuestLogic.tracked(profile, 3)
	for i, entry in tracked do
		local def2 = entry.def
		Kit.text({ parent = refs.tracker, text = def2.title, textSize = 14, font = Theme.Fonts.Bold, order = i * 10, color = if entry.complete then C.Good else C.Text })
		if entry.complete then
			Kit.text({ parent = refs.tracker, text = "✔ Complete — claim in Menu > Quests", textSize = 12, color = C.Good, order = i * 10 + 1 })
		else
			for j, objective in def2.objectives do
				Kit.text({
					parent = refs.tracker,
					text = string.format("• %s %d/%d", objective.label, math.min(entry.counts[j] or 0, objective.count), objective.count),
					textSize = 12,
					color = C.TextDim,
					order = i * 10 + j,
				})
			end
			if def2.hint and def2.category == "Main" then
				Kit.text({ parent = refs.tracker, text = def2.hint, textSize = 11, color = C.TextMuted, order = i * 10 + 9, size = UDim2.new(1, 0, 0, 0), autoSize = Enum.AutomaticSize.Y })
			end
		end
	end
	if #tracked == 0 then
		Kit.text({ parent = refs.tracker, text = "Visit the Quest Board for new contracts.", textSize = 12, color = C.TextDim, order = 1 })
	end
end

local function refreshExpedition()
	local e = ClientState.expedition
	local inExpedition = e and e.expedition
	refs.satchelPanel.Visible = inExpedition == true
	if not inExpedition then
		return
	end
	local WorldConfig = require(Config.WorldConfig)
	local region = WorldConfig.regionById(e.region or "")
	refs.region.Text = region and region.name or "Emberfall"
	if e.depth > 0 then
		refs.risk.Text = string.format("<b>DEPTH %d</b> • death loses %d%% of your Satchel", e.depth, math.floor(e.loss * 100))
		refs.risk.TextColor3 = if e.depth >= 3 then C.Bad elseif e.depth == 2 then C.Warn else Color3.fromRGB(255, 220, 140)
	else
		refs.risk.Text = "<b>SAFE ZONE</b> • nothing can be lost here"
		refs.risk.TextColor3 = C.Good
	end
	local lines = {}
	if e.satchel.coins > 0 then
		table.insert(lines, string.format("◆ %d coins", e.satchel.coins))
	end
	for _, id in ItemConfig.Order do
		local n = e.satchel.items[id]
		if n and n > 0 then
			table.insert(lines, string.format("%s x%d", ItemConfig.Items[id].name, n))
		end
	end
	refs.satchel.Text = if #lines > 0 then "SATCHEL (unbanked):\n" .. table.concat(lines, "\n") else "Satchel empty. Loot found here must be extracted at a beacon."
end

local function refreshParty()
	local party = ClientState.party
	local panel = refs.partyPanel
	Kit.clear(panel)
	panel.Visible = party ~= nil
	if not party then
		return
	end
	Kit.text({ parent = panel, text = "PARTY", textSize = 12, font = Theme.Fonts.Bold, color = Color3.fromRGB(140, 200, 255), order = 0 })
	for i, member in party.members do
		local row = Kit.new("Frame", { BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 30), LayoutOrder = i, Parent = panel })
		Kit.text({ parent = row, text = (if member.userId == party.leader then "★ " else "") .. member.name, textSize = 12, size = UDim2.new(1, 0, 0, 14) })
		local bar = Kit.bar({ parent = row, color = C.Health, size = UDim2.new(1, 0, 0, 8), position = UDim2.fromOffset(0, 18), instant = true })
		bar.frame:SetAttribute("UserId", member.userId)
	end
end

local function refreshTrial()
	local trial = ClientState.trial
	local panel = refs.trial
	Kit.clear(panel)
	panel.Visible = trial ~= nil
	if not trial then
		return
	end
	Kit.text({ parent = panel, text = trial.name, textSize = 14, font = Theme.Fonts.Bold, color = Color3.fromRGB(120, 230, 255), order = 0 })
	refs.trialTimer = Kit.text({ parent = panel, text = "", textSize = 13, color = C.Warn, order = 1 })
	for i, o in trial.objectives do
		Kit.text({
			parent = panel,
			text = string.format("%s %s %d/%d", if o.current >= o.count then "✔" else "•", o.label, o.current, o.count),
			textSize = 12,
			color = if o.current >= o.count then C.Good else C.TextDim,
			order = i + 1,
		})
	end
end

local function refreshTimers()
	local now = ClientState.serverNow()
	-- world event
	local event = ClientState.worldEvent
	if event and event.phase ~= "Idle" and event.name then
		refs.event.Visible = true
		local remaining = Format.time(event.endsAt - now)
		refs.eventTitle.Text = if event.phase == "Warning" then string.format("⚠ %s begins in %s", event.name, remaining) else string.format("★ %s — %s left", event.name, remaining)
		refs.eventTitle.TextColor3 = event.color or C.Text
		refs.eventBody.Text = event.description or ""
	else
		refs.event.Visible = false
	end
	-- boss
	local boss = ClientState.boss
	local region = player:GetAttribute("Region")
	local showBoss = boss and (boss.state == "Active" or boss.state == "Countdown") and (region == "Arena" or region == "Approach")
	refs.boss.Visible = showBoss == true
	if showBoss then
		refs.bossName.Text = string.upper(boss.name) .. "  —  " .. boss.title
		if boss.state == "Countdown" then
			refs.bossBar.set(1, string.format("The arena seals in %ds — step inside!", math.max(0, math.ceil(boss.countdownEnds - now))))
			refs.bossPhase.Text = ""
			refs.overload.frame.Visible = false
		else
			local fraction = boss.health / math.max(1, boss.maxHealth)
			refs.bossBar.set(fraction, string.format("%s / %s", Format.number(boss.health), Format.number(boss.maxHealth)))
			local tags = {}
			if boss.exposed then
				table.insert(tags, "<font color=\"#ffe68c\"><b>◆ WEAK POINT EXPOSED — strike its back</b></font>")
			end
			if boss.opening then
				table.insert(tags, "<font color=\"#ffffff\"><b>FINAL OPENING x3</b></font>")
			end
			refs.bossPhase.Text = string.format("Phase %d: %s   %s", boss.phase, boss.phaseName, table.concat(tags, "  "))
			refs.overload.frame.Visible = boss.overload ~= nil
			if boss.overload then
				refs.overload.set(boss.overload.progress, string.format("INTERRUPT %d%%  (%ds)", math.floor(boss.overload.progress * 100), math.max(0, math.ceil(boss.overload.endsAt - now))))
			end
		end
	end
	-- trial timer
	local trial = ClientState.trial
	if trial and refs.trialTimer then
		refs.trialTimer.Text = "Time left: " .. Format.time(trial.endsAt - now)
	end
	-- cooldowns
	for _, key in { "Q", "E", "R", "H" } do
		local slot = slots[key]
		local cd = ClientState.cooldowns[key]
		if cd and cd.endsAt > now then
			local left = cd.endsAt - now
			slot.overlay.Size = UDim2.fromScale(1, math.clamp(left / cd.duration, 0, 1))
			slot.cd.Text = string.format("%d", math.ceil(left))
		else
			slot.overlay.Size = UDim2.fromScale(1, 0)
			slot.cd.Text = ""
		end
	end
	-- awakening
	local awakened = player:GetAttribute("Awakened") == true
	local resonance = player:GetAttribute("Resonance") or 0
	local burnout = (player:GetAttribute("BurnoutEnds") or 0) - now
	local gslot = slots.G
	if awakened then
		local left = (player:GetAttribute("AwakenEnds") or 0) - now
		refs.awaken.Text = string.format("AWAKENED — %ds  •  press G for your signature", math.max(0, math.ceil(left)))
		gslot.sub.Text = "SIGNATURE"
		gslot.overlay.Size = UDim2.fromScale(1, 0)
	elseif burnout > 0 then
		refs.awaken.Text = string.format("Burnout: resonance returns in %ds", math.ceil(burnout))
		gslot.sub.Text = "burnout"
		gslot.overlay.Size = UDim2.fromScale(1, 1)
	elseif resonance >= 100 then
		refs.awaken.Text = "RESONANCE FULL — press G to Awaken"
		gslot.sub.Text = "READY"
		gslot.overlay.Size = UDim2.fromScale(1, 0)
	else
		refs.awaken.Text = ""
		gslot.sub.Text = string.format("%d%%", resonance)
		gslot.overlay.Size = UDim2.fromScale(1, 1 - resonance / 100)
	end
	-- party health
	for _, child in refs.partyPanel:GetDescendants() do
		local userId = child:GetAttribute("UserId")
		if userId then
			local member = Players:GetPlayerByUserId(userId)
			local humanoid = member and member.Character and member.Character:FindFirstChildOfClass("Humanoid")
			local fill = child:FindFirstChild("Fill")
			if fill and humanoid then
				fill.Size = UDim2.fromScale(math.clamp(humanoid.Health / humanoid.MaxHealth, 0, 1), 1)
			end
		end
	end
	-- lock on
	local target = ClientState.lockTarget
	refs.lock.Text = if target then "LOCKED: " .. tostring(target.Name) .. "  (T to release)" else ""
end

local function bindCharacter(character: Model)
	local humanoid = character:WaitForChild("Humanoid", 10) :: Humanoid?
	if not humanoid then
		return
	end
	local function update()
		refs.health.set(humanoid.Health / humanoid.MaxHealth, string.format("%d / %d", math.ceil(humanoid.Health), humanoid.MaxHealth))
	end
	humanoid.HealthChanged:Connect(update)
	humanoid:GetPropertyChangedSignal("MaxHealth"):Connect(update)
	update()
end

local function applyScale()
	local settings = ClientState.settings()
	local viewport = workspace.CurrentCamera.ViewportSize
	local auto = if viewport.Y < 600 then 0.75 elseif viewport.Y < 800 then 0.88 else 1
	scale.Scale = settings.hudScale * auto
end

function HUDController.init()
	gui = Kit.new("ScreenGui", {
		Name = "HUD",
		ResetOnSpawn = false,
		IgnoreGuiInset = false,
		DisplayOrder = 5,
		ZIndexBehavior = Enum.ZIndexBehavior.Sibling,
		Parent = player:WaitForChild("PlayerGui"),
	})
	scale = Kit.new("UIScale", { Parent = gui })
	buildVitals(gui)
	buildAbilityBar(gui)
	buildTopLeft(gui)
	buildRight(gui)
	buildTop(gui)
	if UserInputService.TouchEnabled then
		buildTouch(gui)
	end
	refs.trial.Visible = false
	refs.partyPanel.Visible = false
	refs.boss.Visible = false
	refs.event.Visible = false
	refs.satchelPanel.Visible = false

	ClientState.Changed:Connect(function(key)
		if key == "profile" or key == "lock" then
			refreshProfile()
			applyScale()
		elseif key == "expedition" then
			refreshExpedition()
		elseif key == "party" then
			refreshParty()
		elseif key == "trial" then
			refreshTrial()
		end
	end)
	player:GetAttributeChangedSignal("Stamina"):Connect(function()
		local stamina = player:GetAttribute("Stamina") or 0
		local max = player:GetAttribute("MaxStamina") or 100
		refs.stamina.set(stamina / max)
	end)
	player:GetAttributeChangedSignal("Resonance"):Connect(function()
		local r = player:GetAttribute("Resonance") or 0
		refs.resonance.set(r / 100, if r >= 100 then "FULL" else "")
		refs.resonance.fill.BackgroundColor3 = if r >= 100 then C.Gold else C.Resonance
	end)
	player.CharacterAdded:Connect(bindCharacter)
	if player.Character then
		task.spawn(bindCharacter, player.Character)
	end
	workspace.CurrentCamera:GetPropertyChangedSignal("ViewportSize"):Connect(applyScale)
	applyScale()

	local accumulator = 0
	RunService.RenderStepped:Connect(function(dt)
		accumulator += dt
		if accumulator >= 0.1 then
			accumulator = 0
			local ok, err = pcall(refreshTimers)
			if not ok then
				warn("[HUD] " .. tostring(err))
			end
		end
	end)
end

function HUDController.setVisible(visible: boolean)
	if gui then
		gui.Enabled = visible
	end
end

return HUDController
