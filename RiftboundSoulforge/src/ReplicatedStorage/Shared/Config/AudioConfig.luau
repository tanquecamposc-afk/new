--!strict
-- Centralised audio + animation hooks. No asset ids are shipped: every id is "".
-- To add sound, upload or pick an audio asset you have rights to, then paste
-- "rbxassetid://<id>" below. Empty ids are skipped silently (graceful fallback).

local AudioConfig = {}

AudioConfig.Sounds = {
	LightAttack = { id = "", volume = 0.5 },
	HeavyAttack = { id = "", volume = 0.6 },
	ParrySuccess = { id = "", volume = 0.8 },
	EnemyHit = { id = "", volume = 0.5 },
	BossWarning = { id = "", volume = 0.8 },
	BossPhase = { id = "", volume = 0.9 },
	ItemDiscovery = { id = "", volume = 0.7 },
	CraftSuccess = { id = "", volume = 0.7 },
	FusionActivation = { id = "", volume = 0.8 },
	Awakening = { id = "", volume = 0.9 },
	LevelUp = { id = "", volume = 0.8 },
	Extraction = { id = "", volume = 0.7 },
	QuestComplete = { id = "", volume = 0.7 },
	Mine = { id = "", volume = 0.5 },
	MusicNexus = { id = "", volume = 0.4, music = true },
	MusicEmberfall = { id = "", volume = 0.4, music = true },
	MusicBoss = { id = "", volume = 0.5, music = true },
}

-- Optional animation ids (R15). When "", the procedural fallback animator is used.
AudioConfig.Animations = {
	Light1 = "",
	Light2 = "",
	Light3 = "",
	Light4 = "",
	Light5 = "",
	Heavy = "",
	Block = "",
	Dodge = "",
	Cast = "",
	Awaken = "",
}

return AudioConfig
