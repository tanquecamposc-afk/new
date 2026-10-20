--[[
	Blockverse para Roblox · Simulación del mundo (servidor)
	Traducción de simulacion.js: líquidos que fluyen (agua y lava,
	obsidiana y roca al juntarse), arena y grava que caen, plantas y
	antorchas que necesitan apoyo, puertas, ticks aleatorios (trigo,
	brotes que crecen, césped que se extiende, cactus y caña), hojas que
	se secan al talar el árbol y explosiones.
]]
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")

local Comp = ReplicatedStorage:WaitForChild("Blockverse")
local Registro = require(Comp.Registro)
local Ruido = require(Comp.Ruido)
local Generador = require(Comp.Generador)
local MundoDatos = require(Comp.MundoDatos)
local Mundo = require(script.Parent.Mundo)

local BL = Registro.bloques
local B = Registro.B
local SOLIDO, OPACO, REEMPL, FORMA = Registro.SOLIDO, Registro.OPACO, Registro.REEMPL, Registro.FORMA
local esAgua, esLava, esLiquido, esHojas, esTronco = Registro.esAgua, Registro.esLava, Registro.esLiquido, Registro.esHojas, Registro.esTronco
local DIRF = Registro.DIRF
local CX, CZ, CY = MundoDatos.CX, MundoDatos.CZ, MundoDatos.CY
local DIR6 = { { 1, 0, 0 }, { -1, 0, 0 }, { 0, 0, 1 }, { 0, 0, -1 }, { 0, 1, 0 }, { 0, -1, 0 } }

local Sim = {}
Sim.alRomper = nil -- function(id, x, y, z): soltar lo que da el bloque (lo pone el script principal)
Sim.alExplotar = nil -- function(x, y, z, potencia, fuente): daño a jugadores y criaturas
Sim.nether = false

local tiempo = 0
local get = function(x, y, z)
	return Mundo.get(x, y, z)
end
local getC = function(x, y, z)
	return Mundo.getSiCargado(x, y, z)
end
local set = function(x, y, z, id, opc)
	return Mundo.set(x, y, z, id, opc)
end

local function nivelLiquido(id)
	return BL[id] and BL[id].nivelL or 0
end

local function romperNatural(x, y, z)
	local id = get(x, y, z)
	if Sim.alRomper then
		Sim.alRomper(id, x, y, z)
	end
	set(x, y, z, 0)
end
Sim.romperNatural = romperNatural

------------------------------------------------------------------
-- Líquidos
------------------------------------------------------------------
local colaAgua, colaLava, enCola = {}, {}, {}
local function claveP(x, y, z)
	return (x + 2 ^ 20) * 2 ^ 21 + (z + 2 ^ 20) * 256 + y
end
local function programarLiquido(x, y, z, agua)
	local k = claveP(x, y, z)
	if enCola[k] then
		return
	end
	enCola[k] = true
	table.insert(agua and colaAgua or colaLava, { x, y, z, k, tiempo + (agua and 0.25 or (Sim.nether and 0.5 or 1.5)) })
end

local function puedeFluir(n, agua)
	return n == 0 or (REEMPL[n] and not esLiquido(n)) or (esLiquido(n) and esAgua(n) ~= agua)
end

local function fluirA(x, y, z, id, agua, vertical)
	local prev = get(x, y, z)
	if esLiquido(prev) and esAgua(prev) ~= agua then
		if agua then
			set(x, y, z, nivelLiquido(prev) == 0 and B.obsidiana or B.roca)
		else
			set(x, y, z, vertical and B.piedra or B.roca)
		end
		return
	end
	if prev ~= 0 and REEMPL[prev] and not esLiquido(prev) and Sim.alRomper then
		Sim.alRomper(prev, x, y, z)
	end
	set(x, y, z, id)
end

local function tickLiquido(x, y, z)
	local id = getC(x, y, z)
	if id < 0 or not esLiquido(id) then
		return
	end
	local agua = esAgua(id)
	local base = agua and B.agua or B.lava
	local nivel = nivelLiquido(id)
	local paso = (agua or Sim.nether) and 1 or 2
	if not agua then
		for _, d in DIR6 do
			if d[2] >= 0 and esAgua(get(x + d[1], y + d[2], z + d[3])) then
				set(x, y, z, nivel == 0 and B.obsidiana or B.roca)
				return
			end
		end
	end
	if nivel > 0 then
		local arriba = get(x, y + 1, z)
		local esperado
		if esLiquido(arriba) and esAgua(arriba) == agua then
			esperado = 1
		else
			local mn, fuentes = 99, 0
			for k = 1, 4 do
				local d = DIR6[k]
				local n = get(x + d[1], y, z + d[3])
				if esLiquido(n) and esAgua(n) == agua then
					local ln = nivelLiquido(n)
					if ln == 0 then
						fuentes += 1
					end
					if ln < mn then
						mn = ln
					end
				end
			end
			esperado = mn == 99 and 99 or mn + paso
			if agua and fuentes >= 2 then
				local ab = get(x, y - 1, z)
				if SOLIDO[ab] or ab == B.agua then
					esperado = 0
				end
			end
		end
		if esperado > 7 then
			set(x, y, z, 0)
			return
		end
		if esperado ~= nivel then
			set(x, y, z, esperado == 0 and base or base + esperado)
			return
		end
	end
	if y > 0 then
		local abajo = get(x, y - 1, z)
		if puedeFluir(abajo, agua) then
			fluirA(x, y - 1, z, base + 1, agua, true)
			return
		end
		if esLiquido(abajo) and esAgua(abajo) == agua then
			if nivelLiquido(abajo) > 1 then
				set(x, y - 1, z, base + 1)
			end
			return
		end
	end
	local sig = nivel + paso
	if sig > 7 then
		return
	end
	for k = 1, 4 do
		local d = DIR6[k]
		local nx, nz = x + d[1], z + d[3]
		local n = get(nx, y, nz)
		if puedeFluir(n, agua) then
			fluirA(nx, y, nz, base + sig, agua, false)
		elseif esLiquido(n) and esAgua(n) == agua and nivelLiquido(n) > sig then
			set(nx, y, nz, base + sig)
		end
	end
end

------------------------------------------------------------------
-- Soporte de plantas y bloques que caen
------------------------------------------------------------------
local SOPORTE = {}
do
	local function enIds(...)
		local t = {}
		for _, k in { ... } do
			if B[k] then
				t[B[k]] = true
			end
		end
		return t
	end
	local tierra = enIds("cesped", "tierra", "cultivo", "cespedNevado")
	local tierras = enIds("cesped", "tierra", "cultivo", "cespedNevado", "senda", "barro", "musgoPalido")
	for _, k in { "hierbaAlta", "florAmarilla", "florRoja", "brote" } do
		if B[k] then
			SOPORTE[B[k]] = function(s)
				return tierra[s] == true
			end
		end
	end
	for e = 0, 7 do
		if B.trigo0 then
			SOPORTE[B.trigo0 + e] = function(s)
				return s == B.cultivo
			end
		end
	end
	for _, k in { "broteRobleOscuro", "girasol", "broteAbedul", "broteAbeto", "broteJungla", "broteAcacia", "helecho", "aciano", "orquidea",
		"margarita", "broteCerezo", "propagulo", "petalos", "brotePalido", "floresOjo", "floresOjoOn", "hojarasca", "floresSilvestres",
		"arbustoLuciernagas", "arbusto", "alfombraMusgo" } do
		if B[k] then
			SOPORTE[B[k]] = function(s)
				return tierras[s] == true
			end
		end
	end
	local function solidoOpaco(s)
		return SOLIDO[s] and OPACO[s]
	end
	for _, k in { "champinonRojo", "champinonMarron", "vetaSculk" } do
		if B[k] then
			SOPORTE[B[k]] = solidoOpaco
		end
	end
	if B.antorcha then
		SOPORTE[B.antorcha] = function(s)
			return SOLIDO[s] and FORMA[s] == 0
		end
	end
	if B.cama then
		SOPORTE[B.cama] = function(s)
			return s ~= 0 and not esLiquido(s)
		end
	end
	if B.arbustoSeco then
		SOPORTE[B.arbustoSeco] = function(s)
			return s == B.arena or s == B.arenaRoja or s == B.tierra or (B.terracota and s >= B.terracota and s <= B.terracota + 6)
		end
	end
	if B.cactus then
		SOPORTE[B.cactus] = function(s)
			return s == B.cactus or s == B.arena or s == B.arenaRoja
		end
	end
	if B.cana then
		SOPORTE[B.cana] = function(s)
			return s == B.cana or s == B.cesped or s == B.tierra or s == B.arena or s == B.arenaRoja
		end
	end
	if B.nenufar then
		SOPORTE[B.nenufar] = function(s)
			return s == B.agua or s == B.hielo
		end
	end
	if B.capaNieve then
		SOPORTE[B.capaNieve] = function(s)
			return SOLIDO[s] and (OPACO[s] or esHojas(s))
		end
	end
	if B.verruga0 then
		for e = 0, 3 do
			SOPORTE[B.verruga0 + e] = function(s)
				return s == B.arenaAlmas
			end
		end
	end
	-- Cualquier otra planta en cruz necesita algo sólido debajo
	for id, d in BL do
		if not SOPORTE[id] and d.forma == "cruz" and not d.liquido and d.clave ~= "fuego" and d.clave ~= "telarana" and d.clave ~= "puertaAnim" then
			SOPORTE[id] = function(s)
				return SOLIDO[s] == true
			end
		end
	end
end

local function caer(x, y, z, id)
	local ab = get(x, y - 1, z)
	if y > 0 and (ab == 0 or (REEMPL[ab] and not SOLIDO[ab])) then
		set(x, y, z, 0)
		local yy = y - 1
		while yy > 0 do
			local b = get(x, yy - 1, z)
			if b ~= 0 and not (REEMPL[b] and not SOLIDO[b]) then
				break
			end
			yy -= 1
		end
		task.delay(0.05 * (y - yy), function()
			local actual = get(x, yy, z)
			if actual ~= 0 and REEMPL[actual] and not esLiquido(actual) and Sim.alRomper then
				Sim.alRomper(actual, x, yy, z)
			end
			set(x, yy, z, id)
		end)
	end
end

-- Al cambiar un bloque se avisa a los vecinos (notificarCambio de simulacion.js)
local function notificar(x, y, z, antes, nuevo)
	for k = 0, 6 do
		local d = k == 0 and { 0, 0, 0 } or DIR6[k]
		local px, py, pz = x + d[1], y + d[2], z + d[3]
		if py >= 0 and py < CY then
			local id = getC(px, py, pz)
			if id > 0 then
				local def = BL[id]
				if esLiquido(id) then
					programarLiquido(px, py, pz, esAgua(id))
				end
				if def and def.gravedad then
					caer(px, py, pz, id)
				end
				local sop = SOPORTE[id]
				local roto = false
				if sop and k ~= 0 and d[2] >= 0 then
					if not sop(get(px, py - 1, pz)) then
						romperNatural(px, py, pz)
						roto = true
					end
				end
				if not roto and def and def.cara ~= nil and k ~= 0 then
					local di = DIRF[def.cara + 1]
					local pared = get(px + di[1], py, pz + di[2])
					if not SOLIDO[pared] or FORMA[pared] ~= 0 then
						romperNatural(px, py, pz)
						roto = true
					end
				end
				if not roto and def and def.puerta and k ~= 0 then
					local pu = def.puerta
					local otro = get(px, py + (pu.m == 1 and -1 or 1), pz)
					local bo = BL[otro]
					if not bo or not bo.puerta or bo.puerta.m == pu.m then
						romperNatural(px, py, pz)
					elseif pu.m ~= 1 and not SOLIDO[get(px, py - 1, pz)] then
						romperNatural(px, py, pz)
					end
				end
			end
		end
	end
	if esTronco(antes) and nuevo == 0 then
		Sim.programarHojas(x, y, z)
	end
end

------------------------------------------------------------------
-- Hojas que se secan
------------------------------------------------------------------
local colaHojas = {}
function Sim.programarHojas(x, y, z)
	for dx = -4, 4 do
		for dy = -4, 4 do
			for dz = -4, 4 do
				if esHojas(getC(x + dx, y + dy, z + dz)) then
					table.insert(colaHojas, { x + dx, y + dy, z + dz, tiempo + 1 + math.random() * 8 })
				end
			end
		end
	end
end

local function procesarHojas()
	for i = #colaHojas, 1, -1 do
		local h = colaHojas[i]
		if h[4] <= tiempo then
			table.remove(colaHojas, i)
			if esHojas(getC(h[1], h[2], h[3])) then
				local tronco = false
				for dx = -4, 4 do
					for dy = -4, 4 do
						for dz = -4, 4 do
							if math.abs(dx) + math.abs(dy) + math.abs(dz) <= 5 and esTronco(getC(h[1] + dx, h[2] + dy, h[3] + dz)) then
								tronco = true
								break
							end
						end
						if tronco then
							break
						end
					end
					if tronco then
						break
					end
				end
				if not tronco then
					romperNatural(h[1], h[2], h[3])
				end
			end
		end
	end
end

------------------------------------------------------------------
-- Árboles que crecen de los brotes
------------------------------------------------------------------
local TIPO_BROTE = { [1466] = "robleOscuro", [88] = "roble", [102] = "abedul", [103] = "abeto", [104] = "jungla", [105] = "acacia", [1297] = "cerezo", [1304] = "mangle", [1339] = "palido" }
Sim.TIPO_BROTE = TIPO_BROTE

function Sim.crecerArbol(x, y, z)
	local id = get(x, y, z)
	local tipo = TIPO_BROTE[id] or "roble"
	for k = 1, 5 do
		if SOLIDO[get(x, y + k, z)] then
			return false
		end
	end
	local r = Ruido.mulberry32(math.floor(math.random() * 1e9))
	set(x, y, z, 0, { sinAviso = true })
	local function poner(px, py, pz, b, soloAire)
		if py < 0 or py >= CY then
			return
		end
		local a = get(px, py, pz)
		if soloAire and a ~= 0 and not REEMPL[a] then
			return
		end
		if not soloAire and a ~= 0 and SOLIDO[a] and not esHojas(a) and a ~= B.tierra and a ~= B.cesped then
			return
		end
		set(px, py, pz, b, { sinAviso = true })
	end
	Generador.ponerArbolTipo(poner, (tipo == "roble" and r() < 0.1) and "robleGrande" or tipo, x, y - 1, z, r)
	if get(x, y - 1, z) == B.cesped then
		set(x, y - 1, z, B.tierra, { sinAviso = true })
	end
	return true
end

------------------------------------------------------------------
-- Ticks aleatorios
------------------------------------------------------------------
local function aguaCerca(x, y, z)
	for dx = -4, 4 do
		for dz = -4, 4 do
			if esAgua(getC(x + dx, y, z + dz)) then
				return true
			end
		end
	end
	return false
end

local function tickBloque(x, y, z, id)
	if B.trigo0 and id >= B.trigo0 and id < B.trigo0 + 7 then
		local suelo = get(x, y - 1, z)
		if Mundo.alCielo(x, y + 1, z) and math.random() < ((suelo == B.cultivo and aguaCerca(x, y - 1, z)) and 0.2 or 0.1) then
			set(x, y, z, id + 1)
		end
	elseif BL[id] and BL[id].cultivo and BL[id + 1] and BL[id + 1].cultivo and BL[id + 1].nombre == BL[id].nombre then
		if math.random() < 0.1 then
			set(x, y, z, id + 1)
		end
	elseif TIPO_BROTE[id] then
		if Mundo.alCielo(x, y + 1, z) and math.random() < 0.12 then
			Sim.crecerArbol(x, y, z)
		end
	elseif id == B.cana or id == B.cactus then
		if get(x, y + 1, z) == 0 and math.random() < 0.1 then
			local h = 1
			while get(x, y - h, z) == id do
				h += 1
			end
			if h < 3 then
				set(x, y + 1, z, id)
			end
		end
	elseif id == B.tierra then
		if not OPACO[get(x, y + 1, z)] and Mundo.alCielo(x, y + 1, z) then
			for _ = 1, 4 do
				if get(x + math.random(-1, 1), y + math.random(-2, 1), z + math.random(-1, 1)) == B.cesped then
					set(x, y, z, B.cesped)
					break
				end
			end
		end
	elseif id == B.cesped or id == B.cultivo then
		if OPACO[get(x, y + 1, z)] then
			set(x, y, z, B.tierra)
		end
	elseif id == B.fuego then
		local eterno = get(x, y - 1, z) == B.netherrack
		if not eterno and math.random() < 0.35 then
			set(x, y, z, 0)
			return
		end
		for _, d in DIR6 do
			local nx, ny, nz = x + d[1], y + d[2], z + d[3]
			local n = get(nx, ny, nz)
			if BL[n] and BL[n].inflamable and math.random() < 0.12 then
				set(nx, ny, nz, math.random() < 0.5 and B.fuego or 0)
			end
		end
	end
end

------------------------------------------------------------------
-- Explosiones (creepers, TNT)
------------------------------------------------------------------
local RAYOS = {}
for i = 0, 15 do
	for j = 0, 15 do
		for k = 0, 15 do
			if not (i > 0 and j > 0 and k > 0 and i < 15 and j < 15 and k < 15) then
				local x, y, z = i / 15 * 2 - 1, j / 15 * 2 - 1, k / 15 * 2 - 1
				local l = math.sqrt(x * x + y * y + z * z)
				table.insert(RAYOS, { x / l, y / l, z / l })
			end
		end
	end
end

-- x, y, z en bloques (decimales); potencia como en el juego web (creeper 3, TNT 4)
function Sim.explosion(x, y, z, potencia, opc)
	opc = opc or {}
	local romper = {}
	if not opc.sinBloques then
		for _, r in RAYOS do
			local I = potencia * (0.7 + math.random() * 0.6)
			local px, py, pz = x, y, z
			while I > 0 do
				local bx, by, bz = math.floor(px), math.floor(py), math.floor(pz)
				local id = getC(bx, by, bz)
				if id < 0 then
					break
				end
				if id ~= 0 then
					local res = BL[id] and BL[id].resistencia or 1
					if res < 0 then
						res = 3600000
					end
					I -= (res + 0.3) * 0.3
					if I > 0 and not esLiquido(id) then
						romper[claveP(bx, by, bz)] = { bx, by, bz, id }
					end
				end
				px += r[1] * 0.3
				py += r[2] * 0.3
				pz += r[3] * 0.3
				I -= 0.225
			end
		end
	end
	for _, c in romper do
		local bx, by, bz, id = c[1], c[2], c[3], c[4]
		if getC(bx, by, bz) == id then
			if id == B.tnt then
				set(bx, by, bz, 0)
				task.delay(0.5 + math.random(), function()
					Sim.explosion(bx + 0.5, by + 0.5, bz + 0.5, 4)
				end)
			else
				if math.random() < 1 / potencia and Sim.alRomper then
					Sim.alRomper(id, bx, by, bz)
				end
				set(bx, by, bz, 0)
			end
		end
	end
	if Sim.alExplotar then
		Sim.alExplotar(x, y, z, potencia, opc.fuente)
	end
end

------------------------------------------------------------------
-- Bucle
------------------------------------------------------------------
function Sim.iniciar()
	Mundo.alCambiar(notificar)
	local acum = 0
	RunService.Heartbeat:Connect(function(dt)
		tiempo += dt
		-- Líquidos
		local n = 0
		for _, cola in { colaAgua, colaLava } do
			local i = 1
			while i <= #cola and cola[i][5] <= tiempo and n < 400 do
				local e = cola[i]
				enCola[e[4]] = nil
				n += 1
				tickLiquido(e[1], e[2], e[3])
				i += 1
			end
			if i > 1 then
				local len = #cola
				table.move(cola, i, len, 1)
				for j = len - i + 2, len do
					cola[j] = nil
				end
			end
		end
		procesarHojas()
		-- Ticks aleatorios en los chunks con física (cerca de los jugadores)
		acum += dt
		while acum >= 0.05 do
			acum -= 0.05
			for k in Mundo.fisica do
				local cx, cz = MundoDatos.desclave(k)
				for s = 0, CY // 16 - 1 do
					local lx, lz, y = math.random(0, 15), math.random(0, 15), s * 16 + math.random(0, 15)
					local x, z = cx * CX + lx, cz * CZ + lz
					local id = getC(x, y, z)
					if id > 0 then
						tickBloque(x, y, z, id)
					end
				end
			end
		end
	end)
end

return Sim
