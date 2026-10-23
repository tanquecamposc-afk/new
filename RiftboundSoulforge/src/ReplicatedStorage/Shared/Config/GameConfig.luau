--!strict
-- Global tuning values that are not owned by a single feature.

local GameConfig = {
	Version = "0.1.0",

	Data = {
		DataStoreName = "RiftboundProfiles_v1",
		KeyPrefix = "Player_",
		SchemaVersion = 2,
		AutosaveInterval = 120, -- seconds
		SessionLockTimeout = 1800, -- a lock older than this is considered abandoned
		LoadAttempts = 5,
		SaveAttempts = 4,
		RetryBaseDelay = 1, -- exponential backoff base, seconds
		MaxReceiptHistory = 200,
	},

	Player = {
		BaseWalkSpeed = 18,
		BlockWalkSpeed = 8,
		MaxStamina = 100,
		StaminaRegenPerSecond = 22,
		StaminaRegenDelay = 0.8,
		RespawnDelay = 4,
	},

	Combat = {
		MaxTargetsPerSwing = 6,
		ActionTolerance = 0.08, -- latency tolerance on action timing (seconds)
		ParryLatencyAllowance = 0.1, -- extra parry window granted for network delay
		ResonanceMax = 100,
		AwakeningBurnout = 10, -- seconds with no resonance gain after awakening ends
		PvPEnabled = false, -- foundation flag only; no PvP mode ships in this build
		HitStop = 0.05,
		-- Combo meter: consecutive hits within the window build a rank that adds damage and
		-- resonance. Taking a real hit (not blocked/parried/evaded) breaks the combo.
		ComboWindow = 3.0,
		ComboRanks = {
			{ min = 60, rank = "S", bonus = 0.18 },
			{ min = 40, rank = "A", bonus = 0.12 },
			{ min = 25, rank = "B", bonus = 0.08 },
			{ min = 12, rank = "C", bonus = 0.05 },
			{ min = 5, rank = "D", bonus = 0.02 },
		},
		-- Critical hits (katana strikes): base chance, +1% per 5 combo, capped.
		CritBase = 0.10,
		CritPerFiveCombo = 0.01,
		CritCap = 0.25,
		CritMult = 1.6,
		-- Elemental affinities (essence abilities vs. enemy weak / resist element).
		WeakMult = 1.5,
		ResistMult = 0.6,
		-- "Flujo": evading a telegraphed attack grants bonus damage for a short time.
		FlowDuration = 3.0,
		FlowBonus = 0.2,
	},

	Party = {
		MaxSize = 4,
		InviteTimeout = 60,
		SharedCreditRadius = 150,
	},

	-- Server-side request rate limits: tokens per second and burst capacity, per player per category.
	RateLimits = {
		Combat = { rate = 12, burst = 16 },
		Ability = { rate = 4, burst = 6 },
		Request = { rate = 6, burst = 12 },
		Interact = { rate = 4, burst = 6 },
		Party = { rate = 2, burst = 4 },
	},

	-- Dev helpers (only honoured inside Roblox Studio).
	Dev = {
		AllowStudioCommands = true,
		StudioEventScale = 0.25, -- world event timers run 4x faster in Studio
	},
}

return GameConfig
