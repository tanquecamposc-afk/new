--[[
	Blockverse para Roblox · Modos de juego (servidor)
	ONE BLOCK (como oneblock.js del juego web): cada jugador tiene su
	propia isla de un solo bloque en una zona vacía del mundo. Al romperlo
	aparece otro según la fase (16 fases, de Llanuras al End e Infinito),
	con bloques raros, cofres con botín, cofres raros, hitos cada 100
	bloques y criaturas de cada fase. Caer al vacío mata al instante.
]]
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Comp = ReplicatedStorage:WaitForChild("Blockverse")
local Config = require(Comp.Config)
local Registro = require(Comp.Registro)
local Generador = require(Comp.Generador)
local Botin = require(Comp.Botin)
local Cont = require(script.Parent.Contenedores)

local BS = Config.BLOQUE
local B, I = Registro.B, Registro.I

local Modos = {}
local ctx
local islas = {} -- clave "x,y,z" -> estado de One Block
local siguienteIsla = 0

local FASES = {
	{ nombre = "Llanuras", n = 0, col = "#6fc04a", botin = "aldea", mobs = { "cerdo", "vaca", "oveja", "gallina", "conejo" },
		bloques = { { "cesped", 30 }, { "tierra", 20 }, { "tronco", 18 }, { "hojas", 8 }, { "piedra", 8 }, { "arena", 5 }, { "arcilla", 3 }, { "calabaza", 2 }, { "sandia", 2 } },
		raros = { { "heno", 1 }, { "bloqueCarbon", 1 } }, extra = { { "cuboAgua", 1 }, { 88, 2 }, { "semillas", 4 }, { "harinaHueso", 3 } } },
	{ nombre = "Subterráneo", n = 80, col = "#8a8a8a", botin = "mina", mobs = { "zombi", "esqueleto", "arana", "murcielago" },
		bloques = { { "piedra", 30 }, { "roca", 14 }, { "grava", 8 }, { "andesita", 6 }, { "granito", 6 }, { "diorita", 6 }, { "menaCarbon", 12 }, { "menaHierro", 9 }, { "menaCobre", 6 }, { "menaOro", 2 }, { "tierra", 4 } },
		raros = { { "bloqueHierro", 1 }, { "cofreCobre", 1 } }, extra = { { "cuboLava", 1 }, { "antorcha", 8 } } },
	{ nombre = "Tundra helada", n = 180, col = "#bfe4ff", botin = "iglu", mobs = { "oveja", "zorro", "lobo", "conejo", "osoPolar" },
		bloques = { { "bloqueNieve", 18 }, { "hielo", 14 }, { "hieloCompacto", 12 }, { "cespedNevado", 14 }, { "troncoAbeto", 16 }, { "hojasAbeto", 6 }, { "piedra", 10 }, { "menaLapis", 4 } },
		raros = { { "bloqueLapis", 1 } }, extra = { { 103, 2 }, { "pan", 4 }, { "hueso", 6 } } },
	{ nombre = "Bosque de cerezos", n = 280, col = "#f4a6c8", botin = "aldea", mobs = { "conejo", "oveja", "cerdo", "lobo" },
		bloques = { { "troncoCerezo", 22 }, { "hojasCerezo", 12 }, { "cesped", 18 }, { "tierra", 10 }, { "troncoAbedul", 10 }, { "hojasAbedul", 5 }, { "petalos", 4 }, { "tablonesCerezo", 4 }, { "arcilla", 4 } },
		raros = { { "bloqueEsmeralda", 1 } }, extra = { { "broteCerezo", 2 }, { "manzana", 4 }, { "harinaHueso", 6 } } },
	{ nombre = "Jungla", n = 380, col = "#2fa82a", botin = "templo", mobs = { "gallina", "creeper", "arana", "gato" },
		bloques = { { "troncoJungla", 22 }, { "hojasJungla", 12 }, { "cesped", 16 }, { "tierra", 10 }, { "sandia", 6 }, { "troncoRobleOscuro", 10 }, { "troncoAcacia", 8 }, { "musgoPalido", 2 } },
		raros = { { "bloqueOro", 1 } }, extra = { { 104, 2 }, { 1466, 2 }, { 1297, 1 } } },
	{ nombre = "Pantano", n = 480, col = "#5a7a3a", botin = "bruja", mobs = { "rana", "slime", "bruja", "ahogado" },
		bloques = { { "barro", 20 }, { "troncoMangle", 16 }, { "raicesMangle", 10 }, { "hojasMangle", 8 }, { "arcilla", 12 }, { "cesped", 10 }, { "tierra", 10 }, { "ladrillosBarro", 4 }, { "setaMarronGigante", 3 } },
		raros = { { "bloqueResina", 1 } }, extra = { { "propagulo", 2 }, { "bolaSlime", 4 }, { "cuboAgua", 1 } } },
	{ nombre = "Océano", n = 580, col = "#3a8ad8", botin = "naufragio", mobs = { "ahogado", "calamar", "guardian" },
		bloques = { { "arena", 24 }, { "arcilla", 14 }, { "grava", 12 }, { "prismarina", 14 }, { "ladrillosPrismarina", 6 }, { "prismarinaOscura", 4 }, { "farolMarino", 3 }, { "esponja", 2 } },
		raros = { { "esponjaMojada", 1 }, { "farolMarino", 1 } }, extra = { { "cuboAgua", 1 }, { "esmeralda", 3 }, { 613, 1 } } },
	{ nombre = "Pradera de setas", n = 680, col = "#b07ab0", botin = "aldea", mobs = { "vaca", "conejo" },
		bloques = { { "setaRojaGigante", 18 }, { "setaMarronGigante", 18 }, { "talloSeta", 12 }, { "tierra", 22 }, { "cesped", 10 } },
		raros = { { "luzHongo", 2 } }, extra = { { "champinonRojo", 3 }, { "champinonMarron", 3 }, { 252, 4 } } },
	{ nombre = "Desierto", n = 760, col = "#e0c870", botin = "piramide", mobs = { "camello", "zombi", "esqueleto", "conejo" },
		bloques = { { "arena", 24 }, { "arenisca", 18 }, { "arenaRoja", 14 }, { "terracota", 14 }, { "grava", 6 }, { "menaOro", 4 }, { "arcilla", 4 }, { "arenaSospechosa", 3 } },
		raros = { { "bloqueOro", 1 }, { "tnt", 1 } }, extra = { { "cactus", 2 }, { "cana", 3 }, { 528, 1 } } },
	{ nombre = "Montañas", n = 860, col = "#9aa4b0", botin = "mina", mobs = { "cabra", "oveja", "lobo" },
		bloques = { { "piedra", 26 }, { "granito", 10 }, { "andesita", 10 }, { "bloqueNieve", 10 }, { "hieloCompacto", 8 }, { "menaEsmeralda", 6 }, { "menaHierro", 10 }, { "menaCobre", 8 }, { "toba", 6 }, { "cespedNevado", 6 } },
		raros = { { "bloqueEsmeralda", 1 }, { "bloqueHierro", 1 } }, extra = { { "esmeralda", 6 }, { "antorcha", 8 } } },
	{ nombre = "Cavernas profundas", n = 960, col = "#4a4a58", botin = "mazmorra", mobs = { "creeper", "esqueleto", "enderman", "slime", "murcielago" },
		bloques = { { "pizarra", 28 }, { "pHierro", 10 }, { "pOro", 6 }, { "pRedstone", 8 }, { "pDiamante", 3 }, { "menaLapis", 5 }, { "obsidiana", 6 }, { "toba", 8 }, { "menaEsmeralda", 2 } },
		raros = { { "bloqueDiamante", 1 }, { "bloqueRedstone", 2 } }, extra = { { "diamante", 2 }, { "cuboAgua", 1 } } },
	{ nombre = "Mazmorra", n = 1080, col = "#6a6a5a", botin = "mazmorra", mobs = { "zombi", "esqueleto", "arana", "vindicador" },
		bloques = { { "roca", 24 }, { "rocaMusgo", 18 }, { "ladrillosPiedra", 10 }, { "ladrillosMusgo", 10 }, { "ladrillosAgrietados", 8 }, { "bloqueHueso", 5 }, { "menaHierro", 6 }, { "menaOro", 3 }, { "telarana", 3 } },
		raros = { { "bloqueOro", 1 }, { "bloqueDiamante", 1 } }, extra = { { "manzanaDorada", 1 }, { 598, 1 }, { 546, 1 } } },
	{ nombre = "Nether", n = 1200, col = "#b03a2a", botin = "fortalezaNether", mobs = { "piglin", "cuboMagma", "blaze", "hoglin" },
		bloques = { { "netherrack", 30 }, { "arenaAlmas", 12 }, { "sueloAlmas", 8 }, { "basalto", 10 }, { "piedraNegra", 10 }, { "menaCuarzo", 10 }, { "menaOroNether", 8 }, { "piedraLuminosa", 6 }, { "bloqueMagma", 5 }, { "nilioCarmesi", 5 }, { "talloCarmesi", 6 }, { "restosAncestrales", 1 } },
		raros = { { "restosAncestrales", 1 }, { "bloqueCuarzo", 2 } }, extra = { { "obsidiana", 10 }, { "mechero", 1 } } },
	{ nombre = "Ciudad antigua", n = 1400, col = "#0f5a60", botin = "ciudadAntigua", mobs = { "esqueleto", "zombi" },
		bloques = { { "sculk", 26 }, { "pizarra", 20 }, { "sensorSculk", 8 }, { "catalizador", 3 }, { "pDiamante", 4 }, { "toba", 6 }, { "piedraNegra", 6 } },
		raros = { { "chillador", 1 } }, extra = { { "perlaEnder", 4 }, { "polvoBlaze", 4 } } },
	{ nombre = "El End", n = 1560, col = "#c8b8f0", botin = "ciudadEnd", mobs = { "enderman", "shulker" },
		bloques = { { "piedraEnd", 40 }, { "purpur", 14 }, { "ladrillosEnd", 12 }, { "obsidiana", 10 } },
		raros = { { "plantaCoro", 1 } }, extra = { { "ojoEnder", 4 }, { "perlaEnder", 2 } } },
	{ nombre = "Infinito", n = 1760, col = "#ffd84a", botin = "fortaleza", mobs = { "cerdo", "vaca", "zombi", "creeper", "enderman", "lobo", "zorro", "cabra" },
		bloques = nil, extra = { { "diamante", 3 }, { "manzanaDorada", 1 } } },
}
local function id(k)
	if type(k) == "number" then
		return (Registro.bloques[k] or Registro.objetos[k]) and k or nil
	end
	return B[k] or I[k]
end
for _, F in FASES do
	F.ids, F.total, F.idsRaros = {}, 0, {}
	for _, e in F.bloques or {} do
		local b = B[e[1]]
		if b then
			table.insert(F.ids, { b, e[2] })
			F.total += e[2]
		end
	end
	for _, e in F.raros or {} do
		local b = B[e[1]]
		if b then
			table.insert(F.idsRaros, { b, e[2] })
		end
	end
end
do
	local ultima = FASES[#FASES]
	for k = 1, #FASES - 1 do
		for _, e in FASES[k].ids do
			table.insert(ultima.ids, e)
			ultima.total += e[2]
		end
		for _, e in FASES[k].idsRaros do
			table.insert(ultima.idsRaros, e)
		end
	end
end
Modos.FASES = FASES

local function faseDe(n)
	local f = 1
	for i, F in FASES do
		if n >= F.n then
			f = i
		end
	end
	return f
end

local function clave(x, y, z)
	return x .. "," .. y .. "," .. z
end

local function enviarHud(plr, ob)
	local F = FASES[ob.fase]
	local sig = FASES[ob.fase + 1]
	ctx.Estado:FireClient(plr, "oneblock", { fase = ob.fase, nombre = F.nombre, col = F.col, n = ob.n, desde = F.n, hasta = sig and sig.n or nil, siguiente = sig and sig.nombre or nil })
end

local function elegirBloque(F)
	local r = math.random() * F.total
	for _, e in F.ids do
		r -= e[2]
		if r <= 0 then
			return e[1]
		end
	end
	return F.ids[1][1]
end

local function regenerar(ob)
	ob.n += 1
	local f = faseDe(ob.n)
	local F = FASES[f]
	local plr = ob.dueno
	if f ~= ob.fase then
		ob.fase = f
		if plr then
			ctx.Estado:FireClient(plr, "titulo", "Fase " .. f, F.nombre, F.col)
			ctx.Estado:FireClient(plr, "sonido", "nivel")
		end
	end
	local x, y, z = ob.x, ob.y, ob.z
	local raro = ob.n > 20 and math.random() < 0.006
	local cofre = raro or ob.n == F.n + 10 or (ob.n > 5 and math.random() < 0.025)
	local Mundo = ctx.Mundo
	if cofre then
		Cont.cofres[Cont.clave(x, y, z)] = nil
		Mundo.set(x, y, z, B.cofre, { sinAviso = true })
		local Fs = raro and FASES[math.min(#FASES, f + 1)] or F
		local c = Botin.generar(Fs.botin)
		Cont.cofres[Cont.clave(x, y, z)] = c
		local function meter(it, n)
			if not it then
				return
			end
			for k = 1, 27 do
				if not c[k] then
					c[k] = Registro.pila(it, n)
					return
				end
			end
		end
		if raro then
			meter(I.diamante, math.random(2, 4))
			meter(I.manzanaDorada, 1)
			meter(I.esmeralda, math.random(3, 8))
			if plr then
				ctx.Estado:FireClient(plr, "titulo", "", "¡Cofre raro!", "#ffd84a")
			end
		elseif ob.n == F.n + 10 then
			for _, e in F.extra or {} do
				meter(id(e[1]), e[2])
			end
		end
	elseif #F.idsRaros > 0 and math.random() < 0.012 then
		Mundo.set(x, y, z, F.idsRaros[math.random(1, #F.idsRaros)][1], { sinAviso = true })
	else
		Mundo.set(x, y, z, elegirBloque(F), { sinAviso = true })
	end
	-- Hitos cada 100 bloques
	if ob.n % 100 == 0 then
		if plr then
			ctx.Estado:FireClient(plr, "titulo", "¡" .. ob.n .. " bloques!", "Hito alcanzado", "#7fe03a")
		end
		ctx.Entidades.soltarXP(10 + ob.n // 50, x + 0.5, y + 1.5, z + 0.5)
		local premios = { { I.diamante, 1 }, { I.esmeralda, 4 }, { I.lingoteHierro, 6 }, { I.lingoteOro, 4 }, { I.manzanaDorada, 1 }, { I.pan, 8 }, { B.antorcha, 16 }, { I.flecha, 16 } }
		local p = premios[math.random(1, #premios)]
		if p[1] then
			ctx.Entidades.soltarItem(Registro.pila(p[1], p[2]), x + 0.5, y + 1.5, z + 0.5, true)
		end
	end
	-- Los objetos que había en el hueco suben encima del bloque nuevo
	for _, e in ctx.Entidades.lista do
		if e.tipo == "item" and not e.muerta and math.abs(e.x - x - 0.5) < 1 and math.abs(e.z - z - 0.5) < 1 and e.y > y - 1.5 and e.y < y + 1.05 then
			e.y = y + 1.1
			e.vy = 0
		end
	end
	-- Criaturas de la fase
	if not cofre and ob.n > 8 and math.random() < 0.045 then
		local lista = {}
		for _, t in F.mobs do
			if ctx.Mobs.DEF[t] then
				table.insert(lista, t)
			end
		end
		if #lista > 0 and #ctx.Mobs.lista < 40 then
			local t = lista[math.random(1, #lista)]
			ctx.Mobs.crear(t, x + 0.5, y + 1.05, z + 0.5, { tam = (t == "slime" or t == "cuboMagma") and 0 or nil })
		end
	end
	if plr then
		enviarHud(plr, ob)
	end
end

local function crearIsla(plr)
	local s = ctx.estados[plr]
	siguienteIsla += 1
	local x = siguienteIsla * 96
	local z = (Generador.ZONA_VACIA_CZ - 10) * 16
	local y = 136
	local ob = { n = 0, fase = 1, x = x, y = y, z = z, dueno = plr }
	islas[clave(x, y, z)] = ob
	ctx.Mundo.set(x, y, z, B.cesped, { sinAviso = true })
	ctx.Mundo.set(x, y - 1, z, B.lecho, { sinAviso = true })
	s.ob = ob
	return ob
end

------------------------------------------------------------------
-- API para el script principal
------------------------------------------------------------------
function Modos.activo()
	return false
end

function Modos.puntoAparicion(plr)
	local s = plr and ctx and ctx.estados[plr]
	if s and s.ob then
		return { s.ob.x, s.ob.y + 1, s.ob.z }
	end
	return nil
end

function Modos.mantenerInventario(plr)
	return false
end

function Modos.alMorir(plr) end

function Modos.puedeRomper(plr, x, y, z, b)
	-- La roca madre bajo el bloque mágico no se puede romper (como en el original)
	return true
end

function Modos.puedePoner(plr, x, y, z, id)
	return true
end

function Modos.alRomper(plr, x, y, z, b)
	local ob = islas[clave(x, y, z)]
	if ob then
		regenerar(ob)
	end
end

function Modos.pedir(plr, nombre)
	local s = ctx.estados[plr]
	if not s then
		return
	end
	if nombre == "oneblock" then
		if not s.ob then
			crearIsla(plr)
		end
		s.modo = "supervivencia"
		s.cama = nil
		plr:SetAttribute("Modo", "supervivencia")
		plr:SetAttribute("OneBlock", true)
		enviarHud(plr, s.ob)
		ctx.Estado:FireClient(plr, "titulo", "ONE BLOCK", "Rompe el bloque", "#ffe060")
		plr:LoadCharacter()
	elseif nombre == "normal" then
		s.ob = nil
		plr:SetAttribute("OneBlock", nil)
		ctx.Estado:FireClient(plr, "oneblock", nil)
		plr:LoadCharacter()
	end
end

function Modos.iniciar(c)
	ctx = c
	-- Caer al vacío en One Block mata al instante; el jugador no se queda metido en el bloque
	RunService.Heartbeat:Connect(function()
		for _, plr in Players:GetPlayers() do
			local s = ctx.estados[plr]
			local ob = s and s.ob
			local ch = plr.Character
			local h = ch and ch:FindFirstChildOfClass("Humanoid")
			local r = ch and ch:FindFirstChild("HumanoidRootPart")
			if ob and h and r and h.Health > 0 and not r.Anchored then
				local pieY = (r.Position.Y - h.HipHeight - r.Size.Y / 2) / BS
				if pieY < ob.y - 8 then
					local x, z = math.floor(r.Position.X / BS), math.floor(r.Position.Z / BS)
					local algo = false
					for yy = math.floor(pieY), math.max(0, math.floor(pieY) - 64), -1 do
						if Registro.SOLIDO[ctx.Mundo.get(x, yy, z)] then
							algo = true
							break
						end
					end
					if not algo then
						s.ultimaCausa = "vacio"
						h.Health = 0
					end
				end
				-- El bloque mágico nunca queda vacío
				local b = ctx.Mundo.get(ob.x, ob.y, ob.z)
				if b == 0 or Registro.esLiquido(b) then
					regenerar(ob)
				end
			end
		end
	end)
end

return Modos
