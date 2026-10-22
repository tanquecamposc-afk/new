--!strict
-- Onboarding guide: a soft beam + marker pointing at the current main-quest destination.

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local QuestConfig = require(Shared.Config.QuestConfig)
local WorldConfig = require(Shared.Config.WorldConfig)
local ClientState = require(script.Parent.Parent.ClientState)

local WaypointController = {}

local player = Players.LocalPlayer
local marker: Part? = nil
local playerAttachment: Attachment? = nil
local enabled = true

-- The first unclaimed main quest whose requirements are met.
function WaypointController.currentMainQuest(): any?
	local profile = ClientState.profile
	if not profile then
		return nil
	end
	for _, id in QuestConfig.Order do
		local def = QuestConfig.Quests[id]
		if def.category == "Main" and not profile.quests.claimed[id] then
			local ok = true
			for _, req in def.requires or {} do
				if not profile.quests.completed[req] then
					ok = false
				end
			end
			if ok then
				return def
			end
		end
	end
	return nil
end

local function targetPosition(): Vector3?
	local quest = WaypointController.currentMainQuest()
	if not quest then
		return nil
	end
	local profile = ClientState.profile
	if profile.quests.completed[quest.id] then
		return nil -- complete: claim it from the menu, no destination needed
	end
	local key = WorldConfig.QuestWaypoints[quest.id]
	local region = player:GetAttribute("Region")
	if not key then
		-- Emberfall quests without a fixed point: guide to the portal while in the Nexus.
		if region == "Nexus" then
			return WorldConfig.Points.ExpeditionPortal
		end
		return nil
	end
	local position = WorldConfig.Points[key]
	if not position then
		return nil
	end
	-- Emberfall destinations seen from the Nexus: point to the portal first.
	local inNexus = region == "Nexus"
	if quest.id == "m03_rift" and not inNexus then
		return WorldConfig.Points.FrontierGate
	end
	if inNexus and position.X > 500 then
		return WorldConfig.Points.ExpeditionPortal
	end
	if not inNexus and position.X < 500 and quest.id ~= "m06_extract" then
		return WorldConfig.Points.CampReturnPortal
	end
	return position
end

function WaypointController.setEnabled(value: boolean)
	enabled = value
end

function WaypointController.init()
	marker = Instance.new("Part")
	local m = marker :: Part
	m.Name = "QuestWaypoint"
	m.Anchored = true
	m.CanCollide = false
	m.CanQuery = false
	m.CanTouch = false
	m.Transparency = 1
	m.Size = Vector3.one
	m.Parent = workspace
	local a1 = Instance.new("Attachment")
	a1.Parent = m
	local gui = Instance.new("BillboardGui")
	gui.Size = UDim2.fromOffset(60, 60)
	gui.AlwaysOnTop = true
	gui.StudsOffset = Vector3.new(0, 6, 0)
	gui.Parent = m
	local label = Instance.new("TextLabel")
	label.Size = UDim2.fromScale(1, 1)
	label.BackgroundTransparency = 1
	label.Text = "▼"
	label.TextScaled = true
	label.TextColor3 = Color3.fromRGB(255, 220, 120)
	label.TextStrokeTransparency = 0.3
	label.Parent = gui
	local distance = Instance.new("TextLabel")
	distance.Name = "Distance"
	distance.Size = UDim2.new(2, 0, 0.4, 0)
	distance.Position = UDim2.new(-0.5, 0, 1, 0)
	distance.BackgroundTransparency = 1
	distance.TextScaled = true
	distance.Font = Enum.Font.GothamBold
	distance.TextColor3 = Color3.fromRGB(255, 235, 180)
	distance.TextStrokeTransparency = 0.3
	distance.Parent = gui

	local b = Instance.new("Beam")
	b.Attachment1 = a1
	b.Color = ColorSequence.new(Color3.fromRGB(255, 220, 120))
	b.Transparency = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.5), NumberSequenceKeypoint.new(1, 0.9) })
	b.Width0 = 0.4
	b.Width1 = 0.4
	b.FaceCamera = true
	b.LightEmission = 1
	b.Segments = 1
	b.Parent = m

	local function attach()
		local character = player.Character or player.CharacterAdded:Wait()
		local root = character:WaitForChild("HumanoidRootPart", 10)
		if root then
			local a0 = Instance.new("Attachment")
			a0.Name = "WaypointAttachment"
			a0.Position = Vector3.new(0, -2, 0)
			a0.Parent = root
			playerAttachment = a0
			b.Attachment0 = a0
		end
	end
	player.CharacterAdded:Connect(function()
		task.defer(attach)
	end)
	task.spawn(attach)

	local accumulator = 0
	RunService.Heartbeat:Connect(function(dt)
		accumulator += dt
		if accumulator < 0.25 then
			return
		end
		accumulator = 0
		local target = if enabled then targetPosition() else nil
		if target then
			m.CFrame = CFrame.new(target + Vector3.new(0, 2, 0))
			gui.Enabled = true
			b.Enabled = true
			local root = player.Character and player.Character:FindFirstChild("HumanoidRootPart") :: BasePart?
			if root then
				local d = (root.Position - target).Magnitude
				distance.Text = string.format("%dm", math.floor(d))
				if d < 12 then
					b.Enabled = false
				end
			end
		else
			gui.Enabled = false
			b.Enabled = false
		end
		local _ = playerAttachment
	end)
end

return WaypointController
