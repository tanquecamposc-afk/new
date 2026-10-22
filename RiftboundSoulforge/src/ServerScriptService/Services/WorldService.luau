--!strict
-- Builds the procedural world synchronously during Init so every later service can find
-- its stations, prompts and markers in workspace.World.

local Workspace = game:GetService("Workspace")

local Build = require(script.Parent.Parent.World.Build)
local Lighting = require(script.Parent.Parent.World.Lighting)
local Nexus = require(script.Parent.Parent.World.Nexus)
local Emberfall = require(script.Parent.Parent.World.Emberfall)
local TerrainGen = require(script.Parent.Parent.World.TerrainGen)

local WorldService = {}

function WorldService.Init()
	local existing = Workspace:FindFirstChild("World")
	if existing then
		existing:Destroy() -- a stale copy (e.g. saved into the place file) would duplicate everything
	end
	local world = Build.folder(Workspace, "World")
	Lighting.apply()
	local started = os.clock()
	Nexus.build(world)
	Emberfall.build(world)
	local ok, err = pcall(TerrainGen.build, world)
	if not ok then
		warn("[World] terrain generation failed (parts remain visible): " .. tostring(err))
	end
	-- Remove the default baseplate if the place template had one.
	local baseplate = Workspace:FindFirstChild("Baseplate")
	if baseplate then
		baseplate:Destroy()
	end
	print(string.format("[World] built %d instances in %.2fs", #world:GetDescendants(), os.clock() - started))
end

function WorldService.Start() end

return WorldService
