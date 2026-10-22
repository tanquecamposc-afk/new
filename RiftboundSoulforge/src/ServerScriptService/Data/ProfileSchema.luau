--!strict
-- Versioned profile schema: defaults, migrations and validation. Pure Luau (unit tested).
-- Stores only serialisable values: numbers, strings, booleans and plain tables.

local ProfileSchema = {}

ProfileSchema.Version = 2

local function deepCopy(value: any): any
	if type(value) ~= "table" then
		return value
	end
	local out = {}
	for k, v in value do
		out[k] = deepCopy(v)
	end
	return out
end
ProfileSchema.deepCopy = deepCopy

function ProfileSchema.default(): { [string]: any }
	return {
		schemaVersion = ProfileSchema.Version,
		coins = 0,
		level = 1,
		xp = 0,
		materials = { Iron = 0, Cobalt = 0, Emberstone = 0, EssenceShard = 0, BossSigil = 0, FractureCore = 0, EmberTonic = 1 },
		tools = { pickTier = 1 },
		weapons = {
			Katana = { owned = true, mastery = 1, masteryXp = 0, upgrade = 1, temper = "None", evolution = "None" },
		},
		essences = {
			Ember = { unlocked = true, mastery = 1, xp = 0 },
			Storm = { unlocked = false, mastery = 1, xp = 0 },
			Gravity = { unlocked = false, mastery = 1, xp = 0 },
		},
		fusions = {
			CollapsingSun = { researched = false, attunement = 0, unlocked = false },
			MagneticRift = { researched = false, attunement = 0, unlocked = false },
		},
		blueprints = {},
		loadout = { weapon = "Katana", primary = "Ember", secondary = "" },
		loadouts = {},
		quests = { progress = {}, completed = {}, claimed = {} },
		daily = { dayKey = 0, progress = {}, claimed = {} },
		codex = { enemies = {}, discoveries = {}, regions = {} },
		bosses = { FractureWarden = { clears = 0, firstClearAt = 0, bestTime = 0 } },
		achievements = {},
		trials = {},
		cosmetics = { owned = { Default = true }, trail = "Default" },
		tutorial = { moments = {} },
		stats = {
			kills = 0,
			deaths = 0,
			perfectParries = 0,
			dodges = 0,
			extractions = 0,
			oreMined = 0,
			crafts = 0,
			awakenings = 0,
			coopCombos = 0,
			fusionsCast = 0,
			bossKills = 0,
			playTime = 0,
			lootLost = 0,
		},
		settings = {
			cameraShake = 1,
			effects = 1,
			music = 0.5,
			sfx = 0.8,
			hudScale = 1,
			reducedClutter = false,
			highContrastTelegraphs = false,
		},
		receipts = {},
		passes = {},
	}
end

-- Migrations: migrations[n] upgrades a profile FROM version n-1 TO version n.
local migrations: { [number]: (any) -> any } = {}

-- v0 -> v1: unversioned prototype data. Ensure the root shape exists.
migrations[1] = function(data)
	data.coins = tonumber(data.coins) or 0
	data.materials = type(data.materials) == "table" and data.materials or {}
	return data
end

-- v1 -> v2: essences moved from a list of unlocked names to per-essence mastery records.
migrations[2] = function(data)
	if type(data.unlockedEssences) == "table" then
		data.essences = type(data.essences) == "table" and data.essences or {}
		for _, name in data.unlockedEssences do
			if type(name) == "string" then
				data.essences[name] = data.essences[name] or { unlocked = true, mastery = 1, xp = 0 }
				data.essences[name].unlocked = true
			end
		end
		data.unlockedEssences = nil
	end
	return data
end

ProfileSchema.migrations = migrations

local function isFiniteNumber(v: any): boolean
	return type(v) == "number" and v == v and v ~= math.huge and v ~= -math.huge
end

-- Fill missing keys from defaults and repair wrong types. Unknown keys are preserved.
local function reconcile(target: any, defaults: any)
	for key, defaultValue in defaults do
		local current = target[key]
		if current == nil then
			target[key] = deepCopy(defaultValue)
		elseif type(defaultValue) == "table" then
			if type(current) ~= "table" then
				target[key] = deepCopy(defaultValue)
			else
				reconcile(current, defaultValue)
			end
		elseif type(defaultValue) == "number" then
			if not isFiniteNumber(current) then
				target[key] = defaultValue
			end
		elseif type(current) ~= type(defaultValue) then
			target[key] = defaultValue
		end
	end
end

function ProfileSchema.sanitize(data: any)
	data.coins = math.max(0, math.floor(data.coins))
	data.level = math.clamp(math.floor(data.level), 1, 1000)
	data.xp = math.max(0, data.xp)
	for key, amount in data.materials do
		if not isFiniteNumber(amount) then
			data.materials[key] = 0
		else
			data.materials[key] = math.max(0, math.floor(amount))
		end
	end
	for _, weapon in data.weapons do
		if type(weapon) == "table" then
			weapon.mastery = math.max(1, math.floor(tonumber(weapon.mastery) or 1))
			weapon.upgrade = math.max(1, math.floor(tonumber(weapon.upgrade) or 1))
			weapon.masteryXp = math.max(0, tonumber(weapon.masteryXp) or 0)
		end
	end
	-- receipts are an ordered list of purchase ids; keep it bounded.
	if #data.receipts > 200 then
		local trimmed = {}
		for i = #data.receipts - 199, #data.receipts do
			table.insert(trimmed, data.receipts[i])
		end
		data.receipts = trimmed
	end
end

-- Converts raw stored data into a valid current-version profile.
-- Returns nil + reason when the data must NOT be used (e.g. written by a newer server).
function ProfileSchema.load(raw: any): (any?, string?)
	if raw == nil then
		return ProfileSchema.default(), nil
	end
	if type(raw) ~= "table" then
		return nil, "stored profile is not a table"
	end
	local data = deepCopy(raw)
	local version = tonumber(data.schemaVersion) or 0
	if version > ProfileSchema.Version then
		return nil, string.format("profile schema %d is newer than this server (%d)", version, ProfileSchema.Version)
	end
	for v = version + 1, ProfileSchema.Version do
		local migrate = migrations[v]
		if migrate then
			local ok, result = pcall(migrate, data)
			if not ok then
				return nil, "migration to v" .. v .. " failed: " .. tostring(result)
			end
			data = result
		end
	end
	data.schemaVersion = ProfileSchema.Version
	reconcile(data, ProfileSchema.default())
	ProfileSchema.sanitize(data)
	return data, nil
end

ProfileSchema.reconcile = reconcile

-- Public, client-safe projection of the profile (strips receipts).
function ProfileSchema.publicView(data: any): any
	local view = deepCopy(data)
	view.receipts = nil
	return view
end

return ProfileSchema
