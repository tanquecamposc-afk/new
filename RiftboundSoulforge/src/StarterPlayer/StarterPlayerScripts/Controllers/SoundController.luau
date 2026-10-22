--!strict
-- Plays named sounds from AudioConfig. Empty ids are skipped (safe fallback: silence).

local SoundService = game:GetService("SoundService")

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local AudioConfig = require(Shared.Config.AudioConfig)
local ClientState = require(script.Parent.Parent.ClientState)

local SoundController = {}

local cache: { [string]: Sound } = {}
local music: Sound? = nil

local function soundFor(name: string): Sound?
	local def = AudioConfig.Sounds[name]
	if not def or def.id == "" then
		return nil
	end
	local sound = cache[name]
	if not sound then
		sound = Instance.new("Sound")
		sound.Name = name
		sound.SoundId = def.id
		sound.Volume = def.volume
		sound.Looped = def.music == true
		sound.Parent = SoundService
		cache[name] = sound
	end
	return sound
end

function SoundController.play(name: string)
	local sound = soundFor(name)
	if not sound then
		return
	end
	local settings = ClientState.settings()
	sound.Volume = AudioConfig.Sounds[name].volume * settings.sfx
	SoundService:PlayLocalSound(sound)
end

function SoundController.music(name: string?)
	if music then
		music:Stop()
		music = nil
	end
	if not name then
		return
	end
	local sound = soundFor(name)
	if sound then
		sound.Volume = AudioConfig.Sounds[name].volume * ClientState.settings().music
		sound:Play()
		music = sound
	end
end

function SoundController.init() end

return SoundController
