--!strict
-- Server entry point. Deterministic startup: every service is registered, then Init() runs
-- in order (no cross-service calls), then Start() runs in order (connections, loops).

local Registry = require(script.Parent.Registry)
local Services = script.Parent.Services

local ORDER = {
	"WorldService", -- must be first: builds workspace.World used by later Start() calls
	"SecurityService",
	"PlayerDataService",
	"RequestService",
	"InventoryService",
	"ProgressionService",
	"QuestService",
	"ExpeditionService",
	"PartyService",
	"EnemyService",
	"CombatService",
	"FusionService",
	"CoopService",
	"BossService",
	"ResourceService",
	"CraftingService",
	"DiscoveryService",
	"TrialService",
	"WorldEventService",
	"EconomyService",
	"LoadoutService",
	"InteractionService",
	"SpawnService", -- last: players spawn only once everything is ready
}

local loaded = {}
for _, name in ORDER do
	local module = Services:FindFirstChild(name)
	assert(module, "missing service module " .. name)
	local service = require(module)
	Registry.register(name, service)
	table.insert(loaded, { name = name, service = service })
end

for _, entry in loaded do
	if entry.service.Init then
		local ok, err = pcall(entry.service.Init)
		if not ok then
			warn(string.format("[Main] %s.Init failed: %s", entry.name, tostring(err)))
		end
	end
end

for _, entry in loaded do
	if entry.service.Start then
		local ok, err = pcall(entry.service.Start)
		if not ok then
			warn(string.format("[Main] %s.Start failed: %s", entry.name, tostring(err)))
		end
	end
end

print("[Main] RIFTBOUND: SOULFORGE server ready")
