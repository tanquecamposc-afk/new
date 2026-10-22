--!strict
-- Region mood: tweens atmosphere / colour grading per region and swaps music hooks.
-- Also applies the Warden arena's "Last Fracture" transformation tint.

local Lighting = game:GetService("Lighting")
local Players = game:GetService("Players")
local TweenService = game:GetService("TweenService")

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local WorldConfig = require(Shared.Config.WorldConfig)
local SoundController = require(script.Parent.SoundController)
local EffectsController = require(script.Parent.EffectsController)

local ZoneController = {}

local player = Players.LocalPlayer
local current: string? = nil
local arenaOverride = false

local function apply(regionId: string)
	local mood = WorldConfig.Moods[regionId]
	if not mood then
		return
	end
	local info = TweenInfo.new(2.5, Enum.EasingStyle.Sine)
	local atmosphere = Lighting:FindFirstChildOfClass("Atmosphere")
	if atmosphere then
		TweenService:Create(atmosphere, info, { Color = mood.fog, Haze = mood.haze, Density = mood.density }):Play()
	end
	local grade = Lighting:FindFirstChildOfClass("ColorCorrectionEffect")
	if grade then
		local tint = if arenaOverride then Color3.fromRGB(255, 170, 190) else mood.tint
		TweenService:Create(grade, info, { TintColor = tint }):Play()
	end
	TweenService:Create(Lighting, info, { ClockTime = mood.clock }):Play()
	if regionId == "Nexus" then
		SoundController.music("MusicNexus")
	elseif regionId == "Arena" then
		SoundController.music("MusicBoss")
	else
		SoundController.music("MusicEmberfall")
	end
end

function ZoneController.init()
	EffectsController.onArenaTransform = function(active: boolean)
		arenaOverride = active
		if current then
			apply(current)
		end
	end
	local function check()
		local region = player:GetAttribute("Region")
		if type(region) == "string" and region ~= "" and region ~= current then
			current = region
			apply(region)
		end
	end
	player:GetAttributeChangedSignal("Region"):Connect(check)
	check()
end

return ZoneController
