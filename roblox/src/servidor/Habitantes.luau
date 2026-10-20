--[[
	Blockverse para Roblox · Habitantes de las estructuras (servidor)
	Como en el juego web:
	· Generadores de criaturas de las mazmorras y la fortaleza (zombi 50 %,
	  esqueleto 25 %, araña 25 %; blazes en el Nether).
	· Generadores de pruebas de las cámaras de prueba: oleadas de criaturas
	  y premio (llave de prueba, esmeraldas…), y bóvedas que se abren con la llave.
	· Vindicadores y evocadores en las mansiones, saqueadores en los
	  puestos, brujas en las cabañas y guardianes en los monumentos.
]]
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Comp = ReplicatedStorage:WaitForChild("Blockverse")
local Config = require(Comp.Config)
local Registro = require(Comp.Registro)
local Ruido = require(Comp.Ruido)
local Estructuras = require(Comp.Estructuras)
local MundoDatos = require(Comp.MundoDatos)
local Mundo = require(script.Parent.Mundo)
local Mobs = require(script.Parent.Mobs)
local Entidades = require(script.Parent.Entidades)

local BS = Config.BLOQUE
local B, I = Registro.B, Registro.I
local CX, CZ = MundoDatos.CX, MundoDatos.CZ
local floor = math.floor

local H = {}
H.alSonido = nil -- function(nombre, x, y, z)

local function azar(a, b)
	return math.random(a, b)
end

local function posiciones()
	local t = {}
	for _, plr in Players:GetPlayers() do
		local ch = plr.Character
		local r = ch and ch:FindFirstChild("HumanoidRootPart")
		local h = ch and ch:FindFirstChildOfClass("Humanoid")
		if r and h and h.Health > 0 then
			table.insert(t, { plr = plr, x = r.Position.X / BS, y = r.Position.Y / BS - 1, z = r.Position.Z / BS })
		end
	end
	return t
end

local function cerca(m, x, y, z, d)
	return math.sqrt((m.x - x) ^ 2 + (m.y - y) ^ 2 + (m.z - z) ^ 2) < d
end

------------------------------------------------------------------
-- Generadores de criaturas y de pruebas
------------------------------------------------------------------
local temporizadores = {}
local pruebas = {}
local TIPOS_PRUEBA = { "zombi", "esqueleto", "arana", "slime", "breeze" }

local function tipoPrueba(x, y, z, s)
	for _, c in Estructuras.camarasPruebaCerca(s, x, z, x, z) do
		if math.abs(x - c.x) < 3 and math.abs(z - c.z) < 3 then
			return "breeze"
		end
	end
	return TIPOS_PRUEBA[floor(Ruido.hash3(x, y, z, s + 9304) * #TIPOS_PRUEBA) + 1]
end

local function generadorNormal(g, j, dt, s)
	local x, y, z = g[1], g[2], g[3]
	if math.sqrt((x + 0.5 - j.x) ^ 2 + (y - j.y) ^ 2 + (z + 0.5 - j.z) ^ 2) > 16 then
		return
	end
	local k = x .. "," .. y .. "," .. z
	local t = temporizadores[k] or (5 + math.random() * 10)
	t -= dt
	if t <= 0 then
		t = 10 + math.random() * 30
		local hg = Ruido.hash3(x, y, z, s)
		local tipo = (H.dimension and H.dimension(x, z) == "nether") and "blaze" or (hg < 0.5 and "zombi" or hg < 0.75 and "esqueleto" or "arana")
		if Mobs.contar(function(m)
			return m.tipo == tipo and cerca(m, x, y, z, 9)
		end) < 6 then
			for _ = 1, azar(1, 4) do
				local ox, oz = x + azar(-3, 3), z + azar(-3, 3)
				local oy = Mobs.buscarSuelo(ox, y + 2, oz, 5, 2)
				if oy > 0 then
					Mobs.crear(tipo, ox + 0.5, oy + (tipo == "blaze" and 0.5 or 0), oz + 0.5, { generador = k })
				end
			end
		end
	end
	temporizadores[k] = t
end

local function generadorPruebas(g, id, j, s)
	local x, y, z = g[1], g[2], g[3]
	local k = x .. "," .. y .. "," .. z
	local e = pruebas[k]
	if not e then
		local off = id == B.generadorPruebasOff
		e = { fase = off and "enfriando" or "espera", t = off and 120 or 0, tipo = tipoPrueba(x, y, z, s), creados = 0, vivos = {} }
		pruebas[k] = e
	end
	local d = math.sqrt((x + 0.5 - j.x) ^ 2 + (y - j.y) ^ 2 + (z + 0.5 - j.z) ^ 2)
	if e.fase == "espera" then
		if d < 14 and j.plr:GetAttribute("Modo") ~= "creativo" then
			e.fase = "activo"
			e.total = 6 + azar(0, 2)
			e.creados, e.vivos, e.t = 0, {}, 0
			if H.alSonido then
				H.alSonido("nivel", x, y, z)
			end
		end
	elseif e.fase == "activo" then
		local vivos = {}
		for _, m in e.vivos do
			if not m.muerto then
				table.insert(vivos, m)
			end
		end
		e.vivos = vivos
		e.t -= 0.5
		if e.creados < e.total and #e.vivos < 2 and e.t <= 0 then
			e.t = 1.5
			for _ = 1, 8 do
				local ox, oz = x + azar(-4, 4), z + azar(-4, 4)
				local oy = Mobs.buscarSuelo(ox, y + 3, oz, 6, 2)
				if oy > 0 then
					local m = Mobs.crear(e.tipo, ox + 0.5, oy, oz + 0.5, { tam = 1 })
					if m then
						m.enfadado = 60
						table.insert(e.vivos, m)
					end
					e.creados += 1
					break
				end
			end
		end
		if e.creados >= e.total and #e.vivos == 0 then
			e.fase = "enfriando"
			e.t = 1800
			Mundo.set(x, y, z, B.generadorPruebasOff)
			for _, q in { { 541, 1 }, { I.esmeralda, azar(1, 4) }, { I.flecha, azar(3, 8) }, { I.pan, azar(1, 3) }, { 538, azar(1, 3) } } do
				if (q[1] == 541 or math.random() < 0.5) and Registro.objetos[q[1]] then
					Entidades.soltarItem(Registro.pila(q[1], q[2]), x + 0.5, y + 1.2, z + 0.5, true)
				end
			end
			Entidades.soltarXP(azar(8, 14), x + 0.5, y + 1, z + 0.5)
		end
		if d > 40 then
			for _, m in e.vivos do
				Mobs.quitar(m)
			end
			e.fase, e.vivos = "espera", {}
		end
	elseif e.fase == "enfriando" then
		e.t -= 0.5
		if e.t <= 0 then
			e.fase = "espera"
			Mundo.set(x, y, z, B.generadorPruebas)
		end
	end
end

-- Bóvedas: se abren una vez con una llave de prueba (541)
local BOTIN_BOVEDA = { { "esmeralda", 4, 20 }, { "diamante", 1, 6 }, { 538, 4, 14 }, { "flecha", 8, 10 }, { "manzanaDorada", 1, 6 },
	{ "nucleoPesado", 1, 4 }, { "perlaEnder", 2, 6 }, { 344, 1, 3 }, { 413, 1, 3 }, { "lingoteHierro", 4, 10 } }
function H.abrirBoveda(x, y, z)
	if Mundo.get(x, y, z) ~= B.boveda then
		return false
	end
	Mundo.set(x, y, z, Registro.B.bovedaAbierta or 0)
	for _ = 1, azar(2, 4) do
		local q = BOTIN_BOVEDA[azar(1, #BOTIN_BOVEDA)]
		local id = type(q[1]) == "number" and q[1] or (I[q[1]] or B[q[1]])
		if id and (Registro.objetos[id] or Registro.bloques[id]) then
			Entidades.soltarItem(Registro.pila(id, azar(q[2], math.max(q[2], q[3]))), x + 0.5, y + 1.2, z + 0.5, true)
		end
	end
	return true
end

------------------------------------------------------------------
-- Habitantes de mansiones, puestos, cabañas y monumentos
------------------------------------------------------------------
local function aparicionEstructuras(j, s)
	local md = Mundo.md
	local gen = md.gen
	local x, z = floor(j.x + (math.random() - 0.5) * 60), floor(j.z + (math.random() - 0.5) * 60)
	-- Mansiones
	for _, M in Estructuras.mansionesCerca(gen, x, z) do
		if x >= M.x + 1 and x <= M.x + 30 and z >= M.z + 1 and z <= M.z + 22 then
			local y = M.y + floor(math.random() * 3) * 6 + 1
			if md:getSiCargado(x, y, z) == 0 and md:getSiCargado(x, y + 1, z) == 0 then
				local cx, cz = M.x + 16, M.z + 12
				local nv = Mobs.contar(function(m)
					return m.tipo == "vindicador" and math.abs(m.x - cx) + math.abs(m.z - cz) < 40
				end)
				local ne = Mobs.contar(function(m)
					return m.tipo == "evocador" and math.abs(m.x - cx) + math.abs(m.z - cz) < 40
				end)
				if ne < 2 and math.random() < 0.3 then
					Mobs.crear("evocador", x + 0.5, y, z + 0.5)
				elseif nv < 6 then
					Mobs.crear("vindicador", x + 0.5, y, z + 0.5)
				end
				return
			end
		end
	end
	-- Puestos de saqueadores
	local pcx, pcz = floor(j.x / CX), floor(j.z / CZ)
	for a = -3, 3 do
		for b = -3, 3 do
			if Estructuras.esPuestoAvanzada(s, pcx + a, pcz + b) then
				local px, pz = (pcx + a) * CX + 8, (pcz + b) * CZ + 8
				local h, bio = gen:infoColumna(px, pz)
				local BI = gen.BIOMA
				if (bio == BI.llanura or bio == BI.sabana or bio == BI.taiga or bio == BI.desierto) and math.random() < 0.12
					and Mobs.contar(function(m)
						return m.tipo == "saqueador" and math.abs(m.x - px) + math.abs(m.z - pz) < 50
					end) < 5 then
					local ox, oz = px + azar(-12, 12), pz + azar(-12, 12)
					local oy = Mobs.buscarSuelo(ox, h + 20, oz, 30, 2)
					if oy > 0 then
						Mobs.crear("saqueador", ox + 0.5, oy, oz + 0.5)
						return
					end
				end
			end
		end
	end
	-- Guardianes en los monumentos
	for _, M in Estructuras.monumentosCerca(gen, j.x - 60, j.z - 60, j.x + 60, j.z + 60) do
		if math.sqrt((M.x - j.x) ^ 2 + (M.z - j.z) ^ 2) > 70 then
			continue
		end
		local clave = M.x .. "," .. M.z
		local n = Mobs.contar(function(m)
			return m.tipo == "guardianAnciano" and m.monumento == clave
		end)
		local muertos = (H.ancianosMuertos[clave] or 0)
		if n < 3 - muertos and math.random() < 0.3 then
			local p = ({ { 0, M.H - 3, 0 }, { -15, 4, 0 }, { 15, 4, 0 } })[n % 3 + 1]
			local m = Mobs.crear("guardianAnciano", M.x + p[1] + 0.5, M.F + p[2], M.z + p[3] + 0.5)
			if m then
				m.monumento = clave
			end
			return
		end
		if Mobs.contar(function(m)
			return m.tipo == "guardian"
		end) < 7 and math.random() < 0.5 then
			local gx, gz, gy = M.x + azar(-18, 18), M.z + azar(-18, 18), M.F + azar(1, 10)
			if Registro.esAgua(md:getSiCargado(gx, gy, gz)) then
				Mobs.crear("guardian", gx + 0.5, gy, gz + 0.5)
				return
			end
		end
	end
end
H.ancianosMuertos = {}

function H.iniciar()
	local md = Mundo.md
	md.buscarGeneradores = { B.generador, B.generadorPruebas, B.generadorPruebasOff }
	local acum, acumE = 0, 0
	RunService.Heartbeat:Connect(function(dt)
		acum += dt
		acumE += dt
		if acum < 0.5 then
			return
		end
		local paso = acum
		acum = 0
		local s = md.semilla
		local js = posiciones()
		for _, j in js do
			local pcx, pcz = floor(j.x / CX), floor(j.z / CZ)
			for a = -2, 2 do
				for b = -2, 2 do
					local lista = md.generadores and md.generadores[MundoDatos.clave(pcx + a, pcz + b)]
					if lista then
						for _, g in lista do
							local id = md:getSiCargado(g[1], g[2], g[3])
							if id == B.generador and math.abs(a) <= 1 and math.abs(b) <= 1 then
								pcall(generadorNormal, g, j, paso, s)
							elseif id == B.generadorPruebas or id == B.generadorPruebasOff then
								pcall(generadorPruebas, g, id, j, s)
							end
						end
					end
				end
			end
		end
		if acumE >= 2 then
			acumE = 0
			for _, j in js do
				if not H.dimension or H.dimension(j.x, j.z) == "superficie" then
					pcall(aparicionEstructuras, j, s)
				end
			end
		end
	end)
	-- Guardianes ancianos que mueren no vuelven a aparecer
	Mobs.alMorirExtra = function(m)
		if m.tipo == "guardianAnciano" and m.monumento then
			H.ancianosMuertos[m.monumento] = (H.ancianosMuertos[m.monumento] or 0) + 1
		end
	end
end

return H
