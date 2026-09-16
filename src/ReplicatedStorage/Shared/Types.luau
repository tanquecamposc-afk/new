--!strict
--[[
	Types.luau
	Contrato universal de datos entre cliente y servidor.
	Ningun modulo debe declarar estructuras de perfil por su cuenta: todo se
	importa desde aqui para que el analizador estatico detecte desincronizaciones.
]]

export type StatName = "STR" | "INT" | "SDW" | "VIT" | "AGI" | "MNA"

export type StatBlock = {
	STR: number,
	INT: number,
	SDW: number,
	VIT: number,
	AGI: number,
	MNA: number,
	UnassignedPoints: number,
}

export type ShadowTier = "Common" | "Rare" | "Epic" | "Legendary" | "Mythic" | "Monarch"

export type ShadowData = {
	UUID: string,
	Id: string,
	Name: string,
	Tier: ShadowTier,
	Level: number,
	BaseDamage: number,
	Experience: number,
}

export type PlayerProfile = {
	Level: number,
	Experience: number,
	Rank: string,
	Gold: number,
	Gems: number,
	Tickets: number,
	Stats: StatBlock,
	EquippedWeapon: string,
	EquippedTitle: string,
	IsAwakened: boolean,
	ShadowsInventory: { [string]: ShadowData },
	EquippedShadows: { string }, -- Lista de UUIDs (maximo 4)
	UnlockedIslands: { string },
}

-- Definicion estatica (no persistida) de una unidad extraible.
export type ShadowDefinition = {
	Id: string,
	Name: string,
	Tier: ShadowTier,
	BaseDamage: number,
	BaseAriseChance: number, -- 0..1
	GemValue: number,
}

-- Definicion estatica de un enemigo del mundo.
export type EnemyDefinition = {
	Id: string,
	Name: string,
	Level: number,
	MaxHealth: number,
	Damage: number,
	ShadowId: string,
	ExperienceReward: number,
	GoldReward: number,
}

-- Estado autoritativo de un enemigo vivo o inerte en el servidor.
export type EnemyState = {
	Guid: string,
	Definition: EnemyDefinition,
	Health: number,
	Position: Vector3,
	KillerUserId: number?,
	AriseAttempts: number,
	Inert: boolean,
	InertAt: number?,
}

-- Maquina de estados finitos de una Sombra simulada.
export type ShadowFsmState = "Idle" | "Follow" | "Chase" | "Attack" | "Return"

export type ShadowRuntime = {
	UUID: string,
	Id: string,
	OwnerUserId: number,
	SlotIndex: number,
	State: ShadowFsmState,
	Position: Vector3,
	TargetGuid: string?,
	LastAttackAt: number,
	Damage: number,
}

-- Paquete comprimido que viaja por UnreliableRemoteEvent.
export type ShadowSnapshot = {
	uuid: string,
	id: string,
	slot: number,
	px: number,
	py: number,
	pz: number,
	st: number, -- ShadowFsmState codificado como entero
}

export type ArisePayload = {
	Guid: string,
}

export type AriseResult = {
	Success: boolean,
	AttemptsLeft: number,
	Chance: number,
	Shadow: ShadowData?,
	ReplacedUUID: string?,
	GemsAwarded: number?,
	Reason: string?,
}

return nil
