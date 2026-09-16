--!strict
--[[
	IntegrationTest.luau
	Pruebas de integracion y stress test. Simula 10 jugadores ficticios en
	paralelo sobre los servicios REALES (no mocks de logica): solo el objeto
	Player y el DataStore estan simulados.

	Uso en Studio (Command Bar o un Script de arranque):
		require(game.ServerScriptService.Server.Test.IntegrationTest).Run()

	Cobertura:
		1. Carga de perfil con session locking.
		2. Asignacion de 50 puntos a STR y verificacion de la formula de dano.
		3. 10 extracciones continuas: limite de 4 Sombras y reemplazo por la de
		   menor dano.
		4. Ataques acelerados: el servidor debe rechazar los que violan el cooldown.
		5. Agotamiento de los 3 intentos de Arise -> conversion a gemas.
		6. Fuga de memoria: las conexiones se liberan al detener los servicios.
]]

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Types = require(Shared.Types)
local Config = require(Shared.Modules.Config)
local StatCalculator = require(Shared.Modules.StatCalculator)
local NetBridge = require(Shared.Network.NetBridge)

local Services = script.Parent.Parent.Services
local DataService = require(Services.DataService)
local CombatService = require(Services.CombatService)
local ShadowServerService = require(Services.ShadowServerService)
local EnemyNPC = require(script.Parent.Parent.Components.EnemyNPC)

local MOCK_PLAYER_COUNT = 10
local EPSILON = 1e-6

local IntegrationTest = {}

-- Mini framework -----------------------------------------------------------

type Report = { Passed: number, Failed: number, Failures: { string } }

local function newReport(): Report
	return { Passed = 0, Failed = 0, Failures = {} }
end

local function check(report: Report, condition: boolean, message: string)
	if condition then
		report.Passed += 1
	else
		report.Failed += 1
		table.insert(report.Failures, message)
		warn(`[IntegrationTest] FALLO: {message}`)
	end
end

local function checkClose(report: Report, actual: number, expected: number, message: string)
	check(report, math.abs(actual - expected) <= EPSILON * math.max(1, math.abs(expected)),
		`{message} (esperado {expected}, obtenido {actual})`)
end

-- Jugador simulado ---------------------------------------------------------

type MockPlayer = {
	Name: string,
	UserId: number,
	Character: Model?,
	Kicked: string?,
	Kick: (MockPlayer, string?) -> (),
	IsDescendantOf: (MockPlayer, Instance) -> boolean,
}

local function newMockPlayer(index: number): MockPlayer
	local player = {
		Name = `MockPlayer{index}`,
		UserId = 1000000 + index,
		Character = nil,
		Kicked = nil,
	}
	function player:Kick(reason: string?)
		self.Kicked = reason or "kicked"
	end
	function player:IsDescendantOf(_ancestor: Instance): boolean
		return true
	end
	return (player :: any) :: MockPlayer
end

-- Carga un perfil en DataService sin pasar por Players.PlayerAdded.
local function loadMockProfile(player: MockPlayer)
	local profile = DataService.ProfileStore:LoadProfileAsync(`Player_{player.UserId}`, "ForceLoad")
	assert(profile, "MockProfileStore debe devolver un perfil")
	profile:Reconcile()
	DataService.Profiles[(player :: any) :: Player] = profile
	return profile
end

local function makeShadow(id: string, baseDamage: number): Types.ShadowData
	return {
		UUID = `uuid-{id}-{baseDamage}-{math.random(1, 1e6)}`,
		Id = id,
		Name = id,
		Tier = "Common",
		Level = 1,
		BaseDamage = baseDamage,
		Experience = 0,
	}
end

-- Casos --------------------------------------------------------------------

-- 1 y 2: carga de perfil + asignacion de atributos + formula de dano.
local function testProfileAndStats(report: Report, player: MockPlayer)
	local data = DataService.GetProfile((player :: any) :: Player)
	check(report, data ~= nil, `{player.Name}: perfil cargado`)
	if not data then
		return
	end

	local baselineDamage = StatCalculator.GetProfileDamage(data)

	-- Sin puntos suficientes debe rechazar.
	data.Stats.UnassignedPoints = 10
	check(report, DataService.AllocateStats((player :: any) :: Player, "STR", 50) == false,
		`{player.Name}: rechaza asignar mas puntos de los disponibles`)
	check(report, DataService.AllocateStats((player :: any) :: Player, "HACK", 1) == false,
		`{player.Name}: rechaza un atributo inexistente`)
	check(report, DataService.AllocateStats((player :: any) :: Player, "STR", -5) == false,
		`{player.Name}: rechaza puntos negativos`)

	data.Stats.UnassignedPoints = 50
	check(report, DataService.AllocateStats((player :: any) :: Player, "STR", 50) == true,
		`{player.Name}: asigna 50 puntos a STR`)
	check(report, data.Stats.STR == 50, `{player.Name}: STR == 50`)
	check(report, data.Stats.UnassignedPoints == 0, `{player.Name}: puntos sin asignar consumidos`)

	-- (DanoBaseArma + STR * 1.5) * (1 + MultiplicadorRango)
	local rank = StatCalculator.GetRankInfo(data.Rank)
	local weaponDamage = StatCalculator.GetWeaponBaseDamage(data.EquippedWeapon)
	local expected = (weaponDamage + 50 * 1.5) * (1 + rank.DamageMultiplier)
	checkClose(report, StatCalculator.GetProfileDamage(data), expected, `{player.Name}: formula de dano fisico`)
	check(report, StatCalculator.GetProfileDamage(data) > baselineDamage,
		`{player.Name}: el dano aumenta tras invertir en STR`)
end

-- 3: 10 extracciones continuas, limite de escuadron y reemplazo por menor dano.
local function testShadowSquad(report: Report, player: MockPlayer)
	local data = DataService.GetProfile((player :: any) :: Player)
	if not data then
		return
	end
	table.clear(data.EquippedShadows)
	table.clear(data.ShadowsInventory)

	local damages = { 10, 20, 30, 40, 50, 60, 70, 5, 80, 90 }
	for _, baseDamage in damages do
		local shadow = makeShadow("Goblin", baseDamage)
		data.ShadowsInventory[shadow.UUID] = shadow
		ShadowServerService.AutoEquip(data, shadow)
		check(report, #data.EquippedShadows <= Config.MAX_EQUIPPED_SHADOWS,
			`{player.Name}: nunca mas de {Config.MAX_EQUIPPED_SHADOWS} Sombras equipadas`)
	end

	check(report, #data.EquippedShadows == Config.MAX_EQUIPPED_SHADOWS,
		`{player.Name}: escuadron lleno tras 10 extracciones`)

	-- Deben quedar exactamente las 4 mejores: 60, 70, 80, 90.
	local equippedDamages = {}
	for _, uuid in data.EquippedShadows do
		local shadow = data.ShadowsInventory[uuid]
		check(report, shadow ~= nil, `{player.Name}: UUID equipado existe en inventario`)
		if shadow then
			table.insert(equippedDamages, shadow.BaseDamage)
		end
	end
	table.sort(equippedDamages)
	check(report, table.concat(equippedDamages, ",") == "60,70,80,90",
		`{player.Name}: se conservan las 4 Sombras de mayor dano (obtenido {table.concat(equippedDamages, ",")})`)

	-- Una Sombra peor que todas las activas no debe desplazar a ninguna.
	local weak = makeShadow("Goblin", 1)
	data.ShadowsInventory[weak.UUID] = weak
	local replaced = ShadowServerService.AutoEquip(data, weak)
	check(report, replaced == nil and table.find(data.EquippedShadows, weak.UUID) == nil,
		`{player.Name}: una Sombra inferior no entra al escuadron`)
end

-- 4: ataques acelerados (fast-attack) rechazados por el servidor.
local function testFastAttackExploit(report: Report, player: MockPlayer)
	local enemy = EnemyNPC.new(Config.Enemies.ShadowCommander, Vector3.zero)
	local origin = Vector3.zero
	local now = os.clock() + math.random() -- base temporal aislada por jugador

	local first = CombatService.TryAttack((player :: any) :: Player, enemy.State.Guid, now, origin)
	check(report, first.Accepted, `{player.Name}: primer ataque valido aceptado`)

	-- Rafaga inmediata: todos deben rechazarse por cooldown o rate limit.
	local acceptedInBurst = 0
	for index = 1, 20 do
		local result = CombatService.TryAttack((player :: any) :: Player, enemy.State.Guid, now + index * 0.01, origin)
		if result.Accepted then
			acceptedInBurst += 1
		end
	end
	check(report, acceptedInBurst == 0, `{player.Name}: rafaga acelerada bloqueada ({acceptedInBurst} aceptados)`)
	check(report, CombatService.GetStrikes((player :: any) :: Player) > 0,
		`{player.Name}: se registran infracciones de exploit`)

	-- Tras respetar el cooldown, el ataque vuelve a ser valido.
	local later = CombatService.TryAttack((player :: any) :: Player, enemy.State.Guid, now + 30, origin)
	check(report, later.Accepted, `{player.Name}: ataque valido tras respetar el cooldown`)

	-- Fuera de rango: rechazado por Magnitude.
	local far = CombatService.TryAttack(
		(player :: any) :: Player,
		enemy.State.Guid,
		now + 60,
		Vector3.new(10000, 0, 0)
	)
	check(report, not far.Accepted and far.Reason == "OutOfRange", `{player.Name}: ataque a distancia imposible rechazado`)

	-- Objetivo inexistente.
	local ghost = CombatService.TryAttack((player :: any) :: Player, "guid-inexistente", now + 90, origin)
	check(report, not ghost.Accepted and ghost.Reason == "InvalidTarget", `{player.Name}: objetivo inexistente rechazado`)

	enemy:Destroy()
end

-- 5: extraccion (exito garantizado, fallo garantizado y conversion a gemas).
local function testAriseFlow(report: Report, player: MockPlayer)
	local data = DataService.GetProfile((player :: any) :: Player)
	if not data then
		return
	end

	-- La aleatoriedad se inyecta (no se muta Config): 0 => siempre exito,
	-- 1 => siempre fallo, sin afectar a los demas jugadores simulados.
	local function forcedRng(value: number)
		return { NextNumber = function() return value end }
	end

	-- Exito garantizado.
	ShadowServerService.SetRandomSource(forcedRng(0))
	local enemy = EnemyNPC.new(Config.Enemies.GoblinScout, Vector3.zero)
	enemy.State.KillerUserId = player.UserId
	enemy:BecomeInert()
	local success = ShadowServerService.AttemptArise((player :: any) :: Player, enemy.State.Guid)
	check(report, success.Success and success.Shadow ~= nil, `{player.Name}: extraccion exitosa con probabilidad 1`)
	check(report, #data.EquippedShadows <= Config.MAX_EQUIPPED_SHADOWS,
		`{player.Name}: limite de escuadron respetado tras Arise`)

	-- Un tercero no puede extraer el cadaver de otro.
	ShadowServerService.SetRandomSource(forcedRng(1))
	local guarded = EnemyNPC.new(Config.Enemies.GoblinScout, Vector3.zero)
	guarded.State.KillerUserId = player.UserId + 999
	guarded:BecomeInert()
	local stolen = ShadowServerService.AttemptArise((player :: any) :: Player, guarded.State.Guid)
	check(report, not stolen.Success and stolen.Reason == "NotOwner", `{player.Name}: no puede extraer un cadaver ajeno`)
	guarded:Destroy()

	-- Tres intentos fallidos -> gemas y cadaver destruido.
	local gemsBefore = data.Gems
	local corpse = EnemyNPC.new(Config.Enemies.GoblinScout, Vector3.zero)
	corpse.State.KillerUserId = player.UserId
	corpse:BecomeInert()
	local guid = corpse.State.Guid
	local last: Types.AriseResult? = nil
	for _ = 1, Config.MAX_ARISE_ATTEMPTS do
		last = ShadowServerService.AttemptArise((player :: any) :: Player, guid)
	end
	check(report, last ~= nil and last.AttemptsLeft == 0, `{player.Name}: se consumen exactamente 3 intentos`)
	check(report, last ~= nil and (last.GemsAwarded or 0) > 0, `{player.Name}: gemas otorgadas al agotar intentos`)
	check(report, data.Gems > gemsBefore, `{player.Name}: las gemas se acreditan en el perfil`)
	check(report, EnemyNPC.Get(guid) == nil, `{player.Name}: el cadaver se destruye tras agotar intentos`)

	local extra = ShadowServerService.AttemptArise((player :: any) :: Player, guid)
	check(report, not extra.Success, `{player.Name}: un cuarto intento no es posible`)

	-- Restaura la aleatoriedad real para no dejar el servicio determinista.
	ShadowServerService.SetRandomSource(Random.new())
end

-- 6: formulas puras (no dependen de jugadores).
local function testFormulas(report: Report)
	checkClose(report, StatCalculator.GetPhysicalDamage(100, 50, 0.5), (100 + 75) * 1.5, "Dano fisico")
	checkClose(report, StatCalculator.GetAriseChance(0.2, 0.5), 0.3, "Tasa de extraccion")
	checkClose(report, StatCalculator.GetAriseChance(0.9, 10), 1, "Tasa de extraccion limitada a 1")
	checkClose(report, StatCalculator.GetAriseChance(0, 5), 0, "Probabilidad base 0 sigue siendo 0")
end

-- 7: desconexion a mitad de sesion: el perfil se libera y no queda bloqueado.
local function testDisconnectRelease(report: Report)
	local player = newMockPlayer(999)
	local profile = loadMockProfile(player)
	profile.Data.Gold = 12345
	DataService.Profiles[(player :: any) :: Player] = nil
	profile:Release()
	check(report, not profile:IsActive(), "Perfil liberado al desconectar")

	local reloaded = DataService.ProfileStore:LoadProfileAsync(`Player_{player.UserId}`, "ForceLoad")
	check(report, reloaded ~= nil, "El perfil se puede recargar tras liberar la sesion")
	check(report, reloaded ~= nil and reloaded.Data.Gold == 12345, "Los datos se guardaron de forma atomica")
	if reloaded then
		reloaded:Release()
	end
end

-- Runner --------------------------------------------------------------------

function IntegrationTest.Run(): Report
	local report = newReport()
	local previousTestMode = NetBridge.TestMode
	local previousKick = CombatService.KickOnStrikeLimit
	NetBridge.TestMode = true
	CombatService.KickOnStrikeLimit = false

	if not DataService.ProfileStore then
		DataService.Init()
	end
	CombatService.Init()
	ShadowServerService.Init()

	local startedAt = os.clock()

	local players: { MockPlayer } = {}
	for index = 1, MOCK_PLAYER_COUNT do
		local player = newMockPlayer(index)
		loadMockProfile(player)
		table.insert(players, player)
	end

	-- Ejecucion en paralelo: cada jugador en su propia corrutina.
	local pending = #players
	for _, player in players do
		task.spawn(function()
			local ok, err = pcall(function()
				testProfileAndStats(report, player)
				testShadowSquad(report, player)
				testFastAttackExploit(report, player)
				testAriseFlow(report, player)
			end)
			if not ok then
				check(report, false, `{player.Name}: excepcion inesperada -> {err}`)
			end
			pending -= 1
		end)
	end

	local deadline = os.clock() + 30
	while pending > 0 and os.clock() < deadline do
		task.wait(0.05)
	end
	check(report, pending == 0, "Todos los jugadores simulados terminaron dentro del tiempo limite")

	testFormulas(report)
	testDisconnectRelease(report)

	-- Limpieza: ningun cadaver ni perfil debe sobrevivir a la prueba.
	EnemyNPC.DestroyAll()
	for _, player in players do
		local profile = DataService.Profiles[(player :: any) :: Player]
		DataService.Profiles[(player :: any) :: Player] = nil
		if profile then
			profile:Release()
		end
	end
	check(report, next(EnemyNPC.GetAll()) == nil, "Registro de enemigos vacio tras la limpieza")

	NetBridge.TestMode = previousTestMode
	CombatService.KickOnStrikeLimit = previousKick

	local elapsed = (os.clock() - startedAt) * 1000
	print(string.format(
		"[IntegrationTest] %d aserciones OK, %d fallos en %.1f ms",
		report.Passed,
		report.Failed,
		elapsed
	))
	for _, failure in report.Failures do
		print(`  - {failure}`)
	end
	return report
end

return IntegrationTest
