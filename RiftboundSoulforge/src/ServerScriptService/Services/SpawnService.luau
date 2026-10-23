--!strict
-- Player lifecycle: load profile -> spawn character -> equip katana -> combat state.
-- Deaths apply the expedition penalty, fail trials and respawn after a short delay at the
-- camp (if mid-expedition) or the Nexus.

local Players = game:GetService("Players")

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local GameConfig = require(Shared.Config.GameConfig)
local Registry = require(script.Parent.Parent.Registry)
local Models = require(script.Parent.Parent.World.Models)

local SpawnService = {}

local loaded: { [Player]: boolean } = {}

local function onCharacter(player: Player, character: Model)
	local humanoid = character:WaitForChild("Humanoid", 10) :: Humanoid?
	local root = character:WaitForChild("HumanoidRootPart", 10) :: BasePart?
	if not humanoid or not root then
		return
	end
	local profile = Registry.get("PlayerDataService").get(player)
	local level = profile and profile.level or 1
	humanoid.MaxHealth = 100 + (level - 1) * 5
	humanoid.Health = humanoid.MaxHealth
	humanoid.BreakJointsOnDeath = false

	local spawnAt = Registry.get("ExpeditionService").respawnPoint(player)
	task.defer(function()
		if character.Parent then
			character:PivotTo(CFrame.new(spawnAt + Vector3.new(math.random(-3, 3), 0, math.random(-3, 3))))
		end
	end)

	character:WaitForChild("RightHand", 5)
	local build = Registry.get("CombatService").buildFor(player)
	Models.katana(character, build.trailColor)
	Registry.get("CombatService").onCharacter(player, character)

	humanoid.Died:Connect(function()
		Registry.get("ProgressionService").stat(player, "deaths")
		Registry.get("ExpeditionService").onDeath(player)
		Registry.get("TrialService").fail(player, "fuiste derrotado")
		task.delay(GameConfig.Player.RespawnDelay, function()
			if player.Parent and loaded[player] then
				player:LoadCharacter()
			end
		end)
	end)
end

local function onPlayer(player: Player)
	player.CharacterAdded:Connect(function(character)
		onCharacter(player, character)
	end)
	local data = Registry.get("PlayerDataService").load(player)
	if not player.Parent or not data then
		return
	end
	loaded[player] = true
	player:LoadCharacter()
end

function SpawnService.Init() end

function SpawnService.Start()
	Players.PlayerAdded:Connect(onPlayer)
	for _, player in Players:GetPlayers() do
		task.spawn(onPlayer, player)
	end
	Players.PlayerRemoving:Connect(function(player)
		loaded[player] = nil
	end)
end

return SpawnService
