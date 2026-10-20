--[[
	Blockverse para Roblox · BED WARS (bedwars.js, bedwars2.js y tiendaBW37.js)
	Una partida para todo el servidor: sala de espera de cristal con cuenta
	atrás, 8 equipos (o 4 si hay más de 8 jugadores) en islas flotantes,
	cuatro mapas (Jardín, Invierno, Infierno y Desierto), camas de dos
	bloques, generadores de hierro, oro, diamante y esmeralda con sus
	niveles, tienda de objetos y de mejoras del equipo, trampas, objetos
	especiales (bola de fuego, huevo puente, torre compacta, defensor,
	chinche y leche mágica), eventos de la partida y bots que recogen,
	compran, tienden puentes, protegen su cama, rompen las ajenas y pelean.
	Mientras tu cama siga en pie reapareces a los 5 segundos.
]]
local RunService = game:GetService("RunService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Comp = ReplicatedStorage:WaitForChild("Blockverse")
local Config = require(Comp.Config)
local Registro = require(Comp.Registro)
local Arenas = require(Comp.Arenas)
local Cont = require(script.Parent.Contenedores)

local BS = Config.BLOQUE
local B, I, OB, BL = Registro.B, Registro.I, Registro.objetos, Registro.bloques
local BW_Y = Arenas.BW_Y
local BW_VACIO = BW_Y - 32

local BW = {}
local ctx
local P = nil -- la partida en curso

BW.EVENTOS = { { 300, "Diamante II" }, { 600, "Esmeralda II" }, { 900, "Diamante III" }, { 1200, "Esmeralda III" }, { 1500, "Camas destruidas" }, { 1800, "Fin de la partida" } }
local NOMBRES_BOT = { "xXProGamerXx", "NoobMaster69", "Pepito_PvP", "ElRusherYT", "Camila_BW", "DarkSoul", "MrClutch", "Tryhard77", "LaBestia", "SrPuentes",
	"NinjaKid", "ChoriPan", "ZeroLag", "Bedbreaker", "Kiwi_Craft", "Zorrito", "ElPanaMiguel", "Luna_Pixel", "Toby2010", "CapitanCama", "Wachin_PE",
	"MegaBuilder", "FrostByte", "Rayo_Mc" }
local FRASES = {
	mata = { "gg", "ez", "jajaja", "¡a casa!", "sin cama no hay paraíso", "otra más 😎", "muy fácil", "¿lag?" },
	muere = { "lag", "noooo", "bruh", "me lagueé", "ya verás", "gg" },
	cama = { "¡cama rota! 😈", "adiós camita", "esa cama era mía", "siguiente…" },
}
local LOBBY = 15 -- segundos de cuenta atrás en la sala de espera

local function idc(k)
	return B[k] or I[k]
end
local function pilaDe(id, n, enc)
	local p = Registro.pila(id, n)
	if enc then
		p.enc = table.clone(enc)
	end
	return p
end
local function fmt(s)
	s = math.max(0, s)
	return string.format("%d:%02d", s // 60, math.floor(s % 60))
end
local function ahora()
	return os.clock()
end

------------------------------------------------------------------
-- Mensajes a los jugadores de la partida
------------------------------------------------------------------
local function chat(texto)
	if not P then
		return
	end
	for plr in P.jug do
		ctx.aviso(plr, texto)
	end
end
local function tituloA(plr, a, g, col)
	ctx.Estado:FireClient(plr, "titulo", a, g, col)
end
local function tituloTodos(a, g, col)
	if not P then
		return
	end
	for plr in P.jug do
		tituloA(plr, a, g, col)
	end
end
local function sonidoTodos(nombre)
	if not P then
		return
	end
	for plr in P.jug do
		ctx.Estado:FireClient(plr, "sonido", nombre)
	end
end
local function hablaBot(m, tipo, prob)
	if not m or not m.bw or math.random() > (prob or 0.4) then
		return
	end
	local l = FRASES[tipo]
	local E = P.eqs[m.bw.equipo].E
	task.delay(0.4 + math.random() * 1.5, function()
		if P and not P.fin then
			chat(("[%s] %s: %s"):format(E.letra, m.bw.nombre, l[math.random(1, #l)]))
		end
	end)
end

-- Cartel con texto encima de una pieza (nombres de los bots, TIENDA, MEJORAS…)
local function cartel(pieza, texto, col, alto)
	local g = pieza:FindFirstChild("CartelBW")
	if not g then
		g = Instance.new("BillboardGui")
		g.Name = "CartelBW"
		g.Size = UDim2.fromOffset(200, 26)
		g.AlwaysOnTop = false
		g.MaxDistance = 60 * BS
		g.LightInfluence = 0
		g.Parent = pieza
		local t = Instance.new("TextLabel")
		t.Name = "Texto"
		t.BackgroundTransparency = 0.55
		t.BackgroundColor3 = Color3.new(0, 0, 0)
		t.BorderSizePixel = 0
		t.Size = UDim2.fromScale(1, 1)
		t.Font = Enum.Font.Code
		t.TextScaled = true
		t.TextStrokeTransparency = 0.4
		t.Parent = g
	end
	g.StudsOffset = Vector3.new(0, (alto or 1.2) * BS, 0)
	local t = g:FindFirstChild("Texto")
	if t then
		t.Text = texto
		local ok, c = pcall(Color3.fromHex, col or "#ffffff")
		t.TextColor3 = ok and c or Color3.new(1, 1, 1)
	end
	return g
end

------------------------------------------------------------------
-- Tienda (TIENDA_BW con la compra rápida y las tijeras)
------------------------------------------------------------------
local MH, MO, MD, ME = "lingoteHierro", "lingoteOro", "diamante", "esmeralda"
local NOMBRE_MONEDA = { lingoteHierro = "hierro", lingoteOro = "oro", diamante = "diamantes", esmeralda = "esmeraldas" }
local ARMADURA_BW = { "cuero", "cobre", "hierro", "diamante" }
local PICO_BW = { "pico_madera", "pico_hierro", "pico_oro", "pico_diamante" }
local HACHA_BW = { "hacha_madera", "hacha_piedra", "hacha_hierro", "hacha_diamante" }
local DANO_ESPADA = { 4, 5, 6, 7 }

local function lanaDe(J)
	return P.eqs[J.equipo].E.lanaId
end
local function precioHerr(n)
	return ({ { MH, 10 }, { MH, 10 }, { MO, 3 }, { MO, 6 } })[math.min(4, n + 1)]
end
local TIENDA = {
	{ "Bloques", function(J) return lanaDe(J) end, {
		{ n = "Lana", id = function(J) return lanaDe(J) end, c = 16, p = { MH, 4 }, d = "Bloque básico para hacer puentes. Del color de tu equipo." },
		{ n = "Terracota endurecida", id = function(J) return P.eqs[J.equipo].E.terracotaId end, c = 16, p = { MH, 12 }, d = "Más resistente que la lana. Buena para proteger la cama." },
		{ n = "Vidrio a prueba de explosiones", id = function(J) return P.eqs[J.equipo].E.vidrioId end, c = 4, p = { MH, 12 }, d = "Las explosiones no lo rompen." },
		{ n = "Piedra del End", id = B.piedraEnd, c = 12, p = { MH, 24 }, d = "Sólida y resistente a las explosiones." },
		{ n = "Escalera de mano", id = B.escaleraMano, c = 8, p = { MH, 4 }, d = "Para trepar o tapar la cama." },
		{ n = "Tablones de roble", id = B.tablones, c = 16, p = { MO, 4 }, d = "Aguantan las explosiones; se rompen rápido con hacha." },
		{ n = "Obsidiana", id = B.obsidiana, c = 4, p = { ME, 4 }, d = "Lo más resistente para proteger la cama." },
	} },
	{ "Combate", idc("espada_oro"), {
		{ n = "Espada de piedra", id = idc("espada_piedra"), c = 1, p = { MH, 10 }, espada = 1, d = "Sustituye a tu espada de madera." },
		{ n = "Espada de hierro", id = idc("espada_hierro"), c = 1, p = { MO, 7 }, espada = 2, d = "Sustituye a tu espada de madera." },
		{ n = "Espada de diamante", id = idc("espada_diamante"), c = 1, p = { ME, 4 }, espada = 3, d = "La mejor espada." },
		{ n = "Palo de empuje (Empuje I)", id = I.palo, c = 1, p = { MO, 5 }, enc = { retroceso = 1 }, d = "Manda a los enemigos al vacío." },
	} },
	{ "Armadura", idc("botas_cobre"), {
		{ n = "Armadura de cota (permanente)", id = idc("botas_cobre"), c = 1, p = { MH, 24 }, armadura = 1, d = "Pantalones y botas. No la pierdes al morir." },
		{ n = "Armadura de hierro (permanente)", id = idc("botas_hierro"), c = 1, p = { MO, 12 }, armadura = 2, d = "Pantalones y botas. No la pierdes al morir." },
		{ n = "Armadura de diamante (permanente)", id = idc("botas_diamante"), c = 1, p = { ME, 6 }, armadura = 3, d = "Pantalones y botas. No la pierdes al morir." },
	} },
	{ "Herramientas", idc("pico_piedra"), {
		{ n = "Pico (mejora)", id = function(J) return idc(PICO_BW[math.min(4, J.pico + 1)]) end, c = 1, p = function(J) return precioHerr(J.pico) end, pico = true,
			d = "Cada compra lo mejora un nivel. Al morir baja uno." },
		{ n = "Hacha (mejora)", id = function(J) return idc(HACHA_BW[math.min(4, J.hacha + 1)]) end, c = 1, p = function(J) return precioHerr(J.hacha) end, hacha = true,
			d = "Cada compra la mejora un nivel. Al morir baja uno." },
		{ n = "Tijeras (permanentes)", id = I.tijeras, c = 1, p = { MH, 20 }, tijeras = true, d = "Cortan la lana al instante. No las pierdes al morir." },
	} },
	{ "Arcos", I.arco, {
		{ n = "Flechas", id = I.flecha, c = 8, p = { MO, 2 }, d = "Munición para el arco." },
		{ n = "Arco", id = I.arco, c = 1, p = { MO, 12 }, d = "Ataca de lejos." },
		{ n = "Arco (Poder I)", id = I.arco, c = 1, p = { MO, 20 }, enc = { poder = 1 }, d = "Más daño a distancia." },
		{ n = "Arco (Poder I, Impacto I)", id = I.arco, c = 1, p = { ME, 6 }, enc = { poder = 1, impacto = 1 }, d = "Más daño y empuja al enemigo." },
	} },
	{ "Pociones", 505, {
		{ n = "Rapidez II (45 s, al momento)", id = 505, c = 0, p = { ME, 1 }, efecto = { "rapidez", 45, 2 }, d = "Corres mucho más rápido." },
		{ n = "Supersalto V (45 s, al momento)", id = 501, c = 0, p = { ME, 1 }, efecto = { "salto", 45, 5 }, d = "Saltas muy alto." },
		{ n = "Invisibilidad (30 s, al momento)", id = 500, c = 0, p = { ME, 2 }, efecto = { "invisibilidad", 30, 1 }, d = "Los enemigos no te ven (salvo la armadura)." },
	} },
	{ "Utilidad", B.tnt, {
		{ n = "Manzana dorada", id = I.manzanaDorada, c = 1, p = { MO, 3 }, d = "Cura y da absorción." },
		{ n = "Bola de fuego", id = 714, c = 1, p = { MH, 40 }, d = "Clic derecho para lanzarla: explota al chocar." },
		{ n = "Dinamita (se enciende sola)", id = B.tnt, c = 1, p = { MO, 4 }, d = "Se enciende al colocarla." },
		{ n = "Perla de ender", id = I.perlaEnder, c = 1, p = { ME, 4 }, d = "Lánzala para teletransportarte." },
		{ n = "Cubo de agua", id = I.cuboAgua, c = 1, p = { MO, 3 }, d = "Frena las caídas y empuja a los enemigos." },
		{ n = "Huevo puente", id = 715, c = 1, p = { ME, 1 }, d = "Deja un puente de lana por donde vuela." },
		{ n = "Esponja", id = B.esponja, c = 4, p = { MO, 3 }, d = "Absorbe el agua." },
		{ n = "Torre compacta", id = 716, c = 1, p = { MH, 24 }, d = "Construye al instante una torre con escalera." },
		{ n = "Chinche (lepisma aliada)", id = 719, c = 1, p = { MH, 24 }, d = "Invoca una lepisma que ataca a los enemigos." },
		{ n = "Defensor de los sueños (gólem)", id = 717, c = 1, p = { MH, 120 }, d = "Invoca un gólem de hierro que defiende tu base." },
		{ n = "Leche mágica (sin trampas 30 s)", id = 718, c = 1, p = { MO, 4 }, d = "Durante 30 s no activas las trampas enemigas." },
	} },
}
do
	local rapida = {}
	for _, nombre in { "Lana", "Espada de piedra", "Armadura de cota (permanente)", "Pico (mejora)", "Tablones de roble", "Piedra del End", "Manzana dorada",
		"Bola de fuego", "Dinamita (se enciende sola)", "Flechas", "Arco", "Torre compacta", "Perla de ender", "Espada de hierro",
		"Armadura de hierro (permanente)", "Huevo puente" } do
		for _, t in TIENDA do
			for _, o in t[3] do
				if o.n == nombre then
					table.insert(rapida, o)
				end
			end
		end
	end
	table.insert(TIENDA, 1, { "Compra rápida", I.esmeralda, rapida })
end
BW.TIENDA = TIENDA

local MEJORAS = {
	{ k = "filo", n = "Espadas afiladas", d = "Filo I en todas las espadas del equipo", precios = { 4 }, icono = idc("espada_diamante") },
	{ k = "prot", n = "Armadura reforzada", d = "Protección para todo el equipo (I-IV)", precios = { 2, 4, 8, 16 }, icono = idc("pechera_hierro") or idc("botas_hierro") },
	{ k = "prisa", n = "Minero frenético", d = "Prisa minera permanente (I-II)", precios = { 2, 4 }, icono = idc("pico_oro") },
	{ k = "forja", n = "Forja", d = "+50 %, +100 %, esmeraldas en tu isla y +200 %", precios = { 2, 4, 6, 8 }, icono = B.horno },
	{ k = "curacion", n = "Fuente de curación", d = "Regeneración cerca de tu isla", precios = { 1 }, icono = B.faro or I.manzanaDorada },
}
local TRAMPAS = {
	{ k = "trampa", n = "¡Es una trampa!", d = "Ceguera y lentitud al intruso", icono = B.telarana },
	{ k = "contra", n = "Contraofensiva", d = "Rapidez y supersalto a tu equipo", icono = I.pluma or I.palo },
	{ k = "alarma", n = "Alarma", d = "Revela a los invisibles", icono = B.antorcha },
	{ k = "fatiga", n = "Fatiga minera", d = "Fatiga minera al intruso", icono = idc("pico_hierro") },
}
local ROMANO = { "I", "II", "III", "IV" }

------------------------------------------------------------------
-- Inventario de los jugadores en la partida
------------------------------------------------------------------
local function contarInv(s, id)
	local n = 0
	for i = 1, 41 do
		local p = s.inv[i]
		if p and p.id == id then
			n += p.n
		end
	end
	return n
end
local function quitarInv(s, id, n)
	for i = 1, 41 do
		local p = s.inv[i]
		if n <= 0 then
			break
		end
		if p and p.id == id then
			local q = math.min(n, p.n)
			p.n -= q
			n -= q
			if p.n <= 0 then
				s.inv[i] = false
			end
		end
	end
end
local function pagar(s, moneda, n)
	local id = I[moneda]
	if contarInv(s, id) < n then
		return false
	end
	quitarInv(s, id, n)
	return true
end
local function claveObj(p)
	local o = p and OB[p.id]
	return o and o.clave or ""
end
local function aplicarFilo(s)
	for i = 1, 41 do
		local p = s.inv[i]
		if p and claveObj(p):sub(1, 7) == "espada_" then
			p.enc = p.enc or {}
			p.enc.filo = math.max(p.enc.filo or 0, 1)
		end
	end
end
local function aplicarProt(s, n)
	if n <= 0 then
		return
	end
	for i = 37, 40 do
		local p = s.inv[i]
		if p then
			p.enc = p.enc or {}
			p.enc.proteccion = n
		end
	end
end
local function kit(plr)
	local s = ctx.estados[plr]
	local J = P and P.jug[plr]
	if not s or not J then
		return
	end
	for i = 1, 41 do
		s.inv[i] = false
	end
	s.cursor = false
	s.inv[1] = pilaDe(idc("espada_madera"), 1)
	if J.pico > 0 then
		s.inv[2] = pilaDe(idc(PICO_BW[J.pico]), 1, { eficiencia = math.min(3, J.pico) })
	end
	if J.hacha > 0 then
		s.inv[3] = pilaDe(idc(HACHA_BW[J.hacha]), 1, { eficiencia = J.hacha })
	end
	if J.tijeras and I.tijeras then
		s.inv[4] = pilaDe(I.tijeras, 1)
	end
	local mat = ARMADURA_BW[J.armadura + 1]
	s.inv[37] = pilaDe(idc("casco_cuero"), 1, { ligamiento = 1 })
	s.inv[38] = pilaDe(idc("pechera_cuero"), 1, { ligamiento = 1 })
	s.inv[39] = pilaDe(idc("pantalones_" .. mat), 1, { ligamiento = 1 })
	s.inv[40] = pilaDe(idc("botas_" .. mat), 1, { ligamiento = 1 })
	local eq = P.eqs[J.equipo]
	aplicarProt(s, eq.mejoras.prot)
	if eq.mejoras.filo > 0 then
		aplicarFilo(s)
	end
	s.sel = 1
	s.hambre, s.saturacion = 20, 5
	ctx.enviarJugador(plr)
end

local function comprar(plr, s, o)
	local J = P and P.jug[plr]
	if not J or J.espectador or P.fase ~= "juego" then
		return
	end
	local precio = type(o.p) == "function" and o.p(J) or o.p
	if o.armadura and J.armadura >= o.armadura then
		ctx.aviso(plr, "Ya tienes esa armadura o una mejor")
		return
	end
	if (o.pico and J.pico >= 4) or (o.hacha and J.hacha >= 4) then
		ctx.aviso(plr, "Ya tienes la mejor")
		return
	end
	if o.tijeras and J.tijeras then
		ctx.aviso(plr, "Ya tienes las tijeras")
		return
	end
	if not pagar(s, precio[1], precio[2]) then
		ctx.Estado:FireClient(plr, "sonido", "rompeHerr")
		ctx.aviso(plr, ("Te faltan %d de %s"):format(precio[2] - contarInv(s, I[precio[1]]), NOMBRE_MONEDA[precio[1]]))
		return
	end
	ctx.Estado:FireClient(plr, "sonido", "xp")
	if o.armadura then
		J.armadura = o.armadura
		local mat = ARMADURA_BW[o.armadura + 1]
		s.inv[39] = pilaDe(idc("pantalones_" .. mat), 1, { ligamiento = 1 })
		s.inv[40] = pilaDe(idc("botas_" .. mat), 1, { ligamiento = 1 })
		aplicarProt(s, P.eqs[J.equipo].mejoras.prot)
	elseif o.pico or o.hacha then
		local k = o.pico and "pico" or "hacha"
		local T = o.pico and PICO_BW or HACHA_BW
		for i = 1, 41 do
			local c = claveObj(s.inv[i])
			if table.find(T, c) then
				s.inv[i] = false
			end
		end
		J[k] += 1
		ctx.darOSoltar(plr, pilaDe(idc(T[J[k]]), 1, { eficiencia = k == "pico" and math.min(3, J.pico) or J.hacha }))
	elseif o.tijeras then
		J.tijeras = true
		ctx.darOSoltar(plr, pilaDe(I.tijeras, 1))
	elseif o.efecto then
		local e = o.efecto
		s.efectos[e[1]] = { t = e[2], n = e[3] }
		if e[1] == "invisibilidad" then
			BW.invisible(plr, e[2])
		end
	else
		if o.espada then
			for i = 1, 41 do
				if claveObj(s.inv[i]) == "espada_madera" then
					s.inv[i] = false
					break
				end
			end
		end
		local id = type(o.id) == "function" and o.id(J) or o.id
		ctx.darOSoltar(plr, pilaDe(id, o.c, o.enc))
		if o.espada and P.eqs[J.equipo].mejoras.filo > 0 then
			aplicarFilo(s)
		end
	end
	ctx.aviso(plr, "Has comprado: " .. o.n)
end

-- Datos de la pantalla de la tienda (UI "extra", sub "tienda")
local function monedas(s)
	return { { I.lingoteHierro, contarInv(s, I.lingoteHierro) }, { I.lingoteOro, contarInv(s, I.lingoteOro) },
		{ I.diamante, contarInv(s, I.diamante) }, { I.esmeralda, contarInv(s, I.esmeralda) } }
end
local function datosTienda(plr, s)
	local J = P and P.jug[plr]
	local d = { sub = "tienda", nombre = "TIENDA DE OBJETOS", pestanas = {}, ofertas = {}, monedas = monedas(s) }
	if not J then
		return d
	end
	local tab = s.ui.tab or 1
	d.pestana = tab
	for _, t in TIENDA do
		local ic = type(t[2]) == "function" and t[2](J) or t[2]
		table.insert(d.pestanas, { nombre = t[1], icono = ic })
	end
	for _, o in TIENDA[tab][3] do
		local precio = type(o.p) == "function" and o.p(J) or o.p
		local id = type(o.id) == "function" and o.id(J) or o.id
		local tiene = (o.armadura and J.armadura >= o.armadura) or (o.pico and J.pico >= 4) or (o.hacha and J.hacha >= 4) or (o.tijeras and J.tijeras)
		local nombre = o.n
		if o.pico or o.hacha then
			local nv = o.pico and J.pico or J.hacha
			nombre ..= nv > 0 and (" · nivel " .. nv) or ""
		end
		table.insert(d.ofertas, { id = id, n = math.max(1, o.c), nombre = nombre, precio = { I[precio[1]], precio[2] },
			puede = contarInv(s, I[precio[1]]) >= precio[2], tiene = tiene and true or false, desc = o.d })
	end
	d.pie = "Clic: comprar · Mayús + clic: comprar varias veces"
	return d
end
local function datosMejoras(plr, s)
	local J = P and P.jug[plr]
	local d = { sub = "tienda", nombre = "MEJORAS DEL EQUIPO", ofertas = {}, monedas = monedas(s) }
	if not J then
		return d
	end
	local eq = P.eqs[J.equipo]
	local dia = contarInv(s, I.diamante)
	for _, M in MEJORAS do
		local nv = eq.mejoras[M.k]
		local max = nv >= #M.precios
		local coste = max and 0 or M.precios[nv + 1]
		table.insert(d.ofertas, { id = M.icono, n = 1, nombre = M.n .. (#M.precios > 1 and (" " .. ROMANO[math.min(nv + 1, #M.precios)]) or ""),
			precio = { I.diamante, coste }, puede = not max and dia >= coste, tiene = max, desc = M.d })
	end
	local coste = 2 ^ #eq.trampas
	for _, T in TRAMPAS do
		table.insert(d.ofertas, { id = T.icono, n = 1, nombre = "Trampa: " .. T.n, precio = { I.diamante, coste }, puede = #eq.trampas < 3 and dia >= coste,
			tiene = #eq.trampas >= 3, desc = T.d })
	end
	d.pie = ("Trampas en cola: %d/3 · la siguiente cuesta %d diamante(s)"):format(#eq.trampas, coste)
	return d
end
local function comprarMejora(plr, s, i)
	local J = P and P.jug[plr]
	if not J or J.espectador then
		return
	end
	local eq = P.eqs[J.equipo]
	if i <= #MEJORAS then
		local M = MEJORAS[i]
		local nv = eq.mejoras[M.k]
		if nv >= #M.precios then
			return
		end
		if not pagar(s, MD, M.precios[nv + 1]) then
			ctx.Estado:FireClient(plr, "sonido", "rompeHerr")
			ctx.aviso(plr, "Te faltan diamantes")
			return
		end
		eq.mejoras[M.k] += 1
		ctx.Estado:FireClient(plr, "sonido", "xp")
		-- Las mejoras son para todo el equipo
		for o, Jo in P.jug do
			if Jo.equipo == J.equipo then
				ctx.aviso(o, plr.Name .. " ha comprado: " .. M.n)
				local so = ctx.estados[o]
				if so then
					if M.k == "filo" then
						aplicarFilo(so)
					elseif M.k == "prot" then
						aplicarProt(so, eq.mejoras.prot)
					end
					ctx.enviarJugador(o)
				end
			end
		end
	else
		local T = TRAMPAS[i - #MEJORAS]
		if not T or #eq.trampas >= 3 then
			return
		end
		if not pagar(s, MD, 2 ^ #eq.trampas) then
			ctx.Estado:FireClient(plr, "sonido", "rompeHerr")
			return
		end
		table.insert(eq.trampas, T.k)
		ctx.Estado:FireClient(plr, "sonido", "xp")
		ctx.aviso(plr, "Trampa preparada: " .. T.n)
	end
end

local function abrirTienda(plr, s, tipo)
	if tipo == "mejoras" then
		s.ui = { tipo = "extra", sub = "tienda", datos = datosMejoras, comprar = comprarMejora }
	else
		s.ui = {
			tipo = "extra", sub = "tienda", tab = 1, datos = datosTienda,
			comprar = function(p, so, i, veces)
				local o = TIENDA[so.ui.tab or 1][3][i]
				if o then
					for _ = 1, math.clamp(veces or 1, 1, 16) do
						comprar(p, so, o)
					end
				end
			end,
			pestana = function(_, so, i)
				if TIENDA[i] then
					so.ui.tab = i
				end
			end,
		}
	end
	ctx.enviarUI(plr)
end

------------------------------------------------------------------
-- Partida: arena, equipos y bots
------------------------------------------------------------------
local function clave(x, y, z)
	return x .. "," .. y .. "," .. z
end
local function enArena(x, y, z)
	if not P then
		return false
	end
	local c = P.arena.centro
	return math.abs(x - c.x) < 100 and math.abs(z - c.z) < 100 and y > BW_Y - 45 and y < BW_Y + 60
end
BW.enArena = enArena
local function ponBloque(x, y, z, b)
	ctx.Mundo.set(x, y, z, b)
	if b ~= 0 then
		P.colocados[clave(x, y, z)] = true
	else
		P.colocados[clave(x, y, z)] = nil
	end
end

local function esCama(b)
	return b == B.cama or (BL[b] and BL[b].camaBW ~= nil)
end
local function camaEn(x, y, z)
	for k, c in P.camas do
		if c.y == y and ((c.x == x and c.z == z) or (c.x2 == x and c.z2 == z)) then
			return k, c
		end
	end
	return nil
end
local function quitarCama(c)
	for _, p in { { c.x, c.z }, { c.x2, c.z2 } } do
		if esCama(ctx.Mundo.get(p[1], c.y, p[2])) then
			ctx.Mundo.set(p[1], c.y, p[2], 0, { sinAviso = true })
		end
	end
end

local comprobarFin
local function romperCama(k, quien)
	local eq = P.eqs[k]
	if not eq.cama then
		return
	end
	eq.cama = false
	quitarCama(P.camas[k])
	local E = eq.E
	chat(("CAMA DESTRUIDA > ¡La cama del equipo %s ha sido destruida por %s!"):format(E.nombre, quien))
	sonidoTodos("explosion")
	for plr, J in P.jug do
		if J.equipo == k then
			tituloA(plr, "¡CAMA DESTRUIDA!", "Ya no reaparecerás", "#ff5555")
		else
			tituloA(plr, "", "Cama " .. E.nombre .. " destruida", E.col)
		end
	end
	comprobarFin()
end

local function crearBot(k, slot, datos)
	local eq = P.eqs[k]
	local E = eq.E
	local m = ctx.Mobs.crear("botBW", E.isla[1] + 0.5 + (slot - 2) * 1.2, BW_Y + 1.01, E.isla[2] + 0.5)
	if not m then
		return nil
	end
	m.domado = true
	local nivel = ({ facil = 0.7, normal = 1, dificil = 1.3 })[P.dificultad] or 1
	local nombre = P.nombresBots[k .. ":" .. slot]
	if not nombre then
		repeat
			nombre = NOMBRES_BOT[math.random(1, #NOMBRES_BOT)]
		until not P.nombresUsados[nombre] or (P.nombresUsados.n or 0) >= #NOMBRES_BOT
		P.nombresUsados[nombre] = true
		P.nombresUsados.n = (P.nombresUsados.n or 0) + 1
		P.nombresBots[k .. ":" .. slot] = nombre
	end
	m.bw = { equipo = k, slot = slot, nivel = nivel, rol = slot % 2 == 1 and "atacante" or "defensor", estado = "recolectar", t = 20 + math.random() * 25,
		res = { h = 0, o = 0, d = 0, e = 0 }, espada = 0, armadura = 0, lana = 16, objetivo = nil, minarT = 0, golpeT = 0, nombre = nombre }
	if datos then
		for kk, v in datos do
			m.bw[kk] = v
		end
	end
	m.pieza:SetAttribute("Etiqueta", ("[%s] %s"):format(E.letra, nombre))
	cartel(m.pieza, ("[%s] %s"):format(E.letra, nombre), E.col, 1.3)
	m.control = BW.iaBot
	m.alHerir = BW.herirBot
	m.alMorir = BW.muerteBot
	table.insert(P.bots, m)
	return m
end

-- Los bots de cada equipo cubren su cama con lana y terracota al empezar
local function defensasIniciales()
	for k, eq in P.eqs do
		local hay = false
		for _, m in P.bots do
			if m.bw.equipo == k then
				hay = true
			end
		end
		if hay then
			local c = P.camas[k]
			local L, TC = eq.E.lanaId, eq.E.terracotaId
			local t = 1 + math.random() * 2
			local x0, x1 = math.min(c.x, c.x2), math.max(c.x, c.x2)
			local z0, z1 = math.min(c.z, c.z2), math.max(c.z, c.z2)
			local usados = {}
			for _, capa in { { 1, L }, { 2, TC } } do
				local r, blq = capa[1], capa[2]
				for dx = -r, r do
					for dz = -r, r do
						for dy = 0, r do
							for _, celda in { { c.x, c.z }, { c.x2, c.z2 } } do
								local x, z, y = celda[1] + dx, celda[2] + dz, c.y + dy
								local dist = math.max(math.max(x0 - x, x - x1, 0), math.max(z0 - z, z - z1, 0)) + dy
								local dentro = x >= x0 and x <= x1 and z >= z0 and z <= z1 and dy == 0
								if dist == r and not dentro and not usados[clave(x, y, z)] then
									usados[clave(x, y, z)] = true
									t += 0.06
									table.insert(P.cola, { x = x, y = y, z = z, b = blq, t = t })
								end
							end
						end
					end
				end
			end
		end
	end
end

-- Rehace la arena de la partida anterior (bloques puestos, camas, cofres y objetos sueltos)
local function limpiarArena(a, colocados)
	for k in colocados do
		local p = string.split(k, ",")
		local x, y, z = tonumber(p[1]), tonumber(p[2]), tonumber(p[3])
		ctx.Mundo.set(x, y, z, Arenas.bloqueOriginal(a, x, y, z), { sinAviso = true })
	end
	for _, c in a.camas do
		ctx.Mundo.set(c.x, c.y, c.z, c.b, { sinAviso = true })
		ctx.Mundo.set(c.x2, c.y, c.z2, c.b2, { sinAviso = true })
	end
	for _, c in a.cofres do
		Cont.cofres[Cont.clave(c[1], c[2], c[3])] = nil
		ctx.Mundo.set(c[1], c[2], c[3], B.cofre, { sinAviso = true })
	end
	for _, e in ctx.Entidades.lista do
		if not e.muerta and math.abs(e.x - a.centro.x) < 110 and math.abs(e.z - a.centro.z) < 110 and e.y > BW_Y - 60 then
			e.muerta = true
			if e.pieza then
				e.pieza:Destroy()
			end
		end
	end
end

local function nuevoJugador(plr, s)
	return {
		equipo = nil, vivo = true, espectador = false, armadura = 0, pico = 0, hacha = 0, tijeras = false,
		bajas = 0, finales = 0, camas = 0, muertes = 0, ultimoGolpe = nil,
		guardado = { inv = s.inv, xp = s.xp, modo = s.modo, cama = s.cama },
	}
end

local function quitarMobs()
	for _, m in P.bots do
		if not m.muerto then
			ctx.Mobs.quitar(m)
		end
	end
	for _, m in P.tenderos do
		ctx.Mobs.quitar(m)
	end
	for _, m in P.aliados do
		if not m.muerto then
			ctx.Mobs.quitar(m)
		end
	end
	for _, g in P.gens do
		if g.pieza then
			g.pieza:Destroy()
		end
	end
	for _, h in P.huevos do
		if h.pieza then
			h.pieza:Destroy()
		end
	end
end

local function crearPartida(dificultad)
	local tema = Arenas.ORDEN_TEMAS_BW[math.random(1, 4)]
	local anterior = BW.anterior
	P = {
		fase = "sala", lobby = LOBBY, t = 0, ev = 1, fin = false, tema = tema, n = 8, porEquipo = 1, dificultad = dificultad or "normal",
		arena = Arenas.bw(8, tema), jug = {}, eqs = {}, camas = {}, bots = {}, tenderos = {}, aliados = {}, gens = {}, colocados = {},
		cola = {}, huevos = {}, nombresBots = {}, nombresUsados = {}, avisoT = 0, mensajeT = 0,
	}
	if anterior then
		limpiarArena(anterior.arena, anterior.colocados)
		BW.anterior = nil
	end
	-- Los generadores de en medio llevan un bloque y un cartel con el nivel y la cuenta atrás
	return P
end

local function empezar()
	local reales = {}
	for plr, J in P.jug do
		if not J.espectador then
			table.insert(reales, plr)
		end
	end
	local n = #reales
	if n > 8 then
		P.n = 4
		P.porEquipo = math.min(4, math.ceil(n / 4))
	end
	if P.n ~= 8 then
		P.arena = Arenas.bw(P.n, P.tema)
	end
	local a = P.arena
	limpiarArena(a, {})
	for k, E in a.equiposInfo do
		P.eqs[k] = { k = k, E = E, cama = true, vivos = P.porEquipo, mejoras = { filo = 0, prot = 0, prisa = 0, forja = 0, curacion = 0 }, trampas = {}, trampaT = 0, cur = 0 }
		P.camas[k] = a.camas[k]
	end
	for _, g in a.gens do
		local c = table.clone(g)
		c.equipo = g.equipo and g.equipo + 1 or nil
		c.t, c.tH, c.tO, c.tE = 0, 0, 0, 0
		table.insert(P.gens, c)
		if c.tipo ~= "equipo" then
			local p = Instance.new("Part")
			p.Name = "GeneradorBW"
			p.Anchored = true
			p.CanCollide = false
			p.CanQuery = false
			p.Size = Vector3.new(0.62, 0.62, 0.62) * BS
			p.Material = Enum.Material.Neon
			p.Color = c.tipo == "diamante" and Color3.fromRGB(110, 230, 230) or Color3.fromRGB(70, 220, 110)
			p.CFrame = CFrame.new(c.x * BS, (c.y + 1.9) * BS, c.z * BS)
			p.Parent = workspace
			c.pieza = p
			cartel(p, "", c.tipo == "diamante" and "#77ffff" or "#55ff55", 1.2)
		end
	end
	-- Equipos: los jugadores se reparten y los huecos los ocupan bots
	for i = #reales, 2, -1 do
		local j = math.random(1, i)
		reales[i], reales[j] = reales[j], reales[i]
	end
	local ocupados = {}
	for i, plr in reales do
		local k = (i - 1) % P.n + 1
		P.jug[plr].equipo = k
		ocupados[k] = (ocupados[k] or 0) + 1
	end
	for k = 1, P.n do
		for slot = (ocupados[k] or 0) + 1, P.porEquipo do
			crearBot(k, slot)
		end
	end
	-- Tenderos
	for _, t in a.tiendas do
		local m = ctx.Mobs.crear("tenderoBW", t.x, BW_Y + 1, t.z)
		if m then
			m.domado = true
			m.bwTienda = t.tipo
			m.bwEquipo = t.equipo + 1
			local cx, cz = P.eqs[t.equipo + 1].E.isla[1], P.eqs[t.equipo + 1].E.isla[2]
			m.control = function(mm)
				mm.mover = false
				mm.vx, mm.vz = 0, 0
				mm.yawObj = math.atan2(cx - mm.x, cz - mm.z)
			end
			cartel(m.pieza, t.tipo == "mejoras" and "MEJORAS" or "TIENDA", t.tipo == "mejoras" and "#88ccff" or "#ffdd55", 1.4)
			table.insert(P.tenderos, m)
		end
	end
	P.fase = "juego"
	P.t = 0
	-- A cada uno a su isla
	for plr, J in P.jug do
		local s = ctx.estados[plr]
		if J.equipo and s then
			local E = P.eqs[J.equipo].E
			s.modo = "supervivencia"
			plr:SetAttribute("Modo", "supervivencia")
			kit(plr)
			task.spawn(ctx.teletransportar, plr, E.isla[1] + 0.5, BW_Y + 1, E.isla[2] + 0.5)
			tituloA(plr, "¡A JUGAR!", "Eres del equipo " .. E.nombre .. ": protege tu cama", E.col)
		else
			J.espectador = true
			J.vivo = false
			tituloA(plr, "BED WARS", "Partida en curso: miras desde la sala", "#aaaaaa")
		end
	end
	chat("▶ ¡La partida ha empezado! Compra con hierro y oro en la TIENDA; los diamantes son para las MEJORAS.")
	chat(("Mapa: %s · %d equipos · %s"):format(Arenas.TEMAS_BW[P.tema].nombre, P.n, P.porEquipo > 1 and (P.porEquipo .. " por equipo") or "Solos"))
	sonidoTodos("nivel")
	defensasIniciales()
end

------------------------------------------------------------------
-- Generadores
------------------------------------------------------------------
local function nivelGen()
	return P.t >= 900 and 2 or (P.t >= 300 and 1 or 0), P.t >= 1200 and 2 or (P.t >= 600 and 1 or 0)
end
local function contarCerca(g, id)
	local n = 0
	for _, e in ctx.Entidades.lista do
		if e.tipo == "item" and not e.muerta and e.pila.id == id and math.abs(e.x - g.x) < 2.2 and math.abs(e.z - g.z) < 2.2 then
			n += e.pila.n
		end
	end
	return n
end
local function soltarGen(g, id, max)
	if contarCerca(g, id) >= max then
		return
	end
	ctx.Entidades.soltarItem(Registro.pila(id, 1), g.x, g.y, g.z, false, Vector3.new(0, 0, 0), 0)
end
local MULT_FORJA = { 1, 1.5, 2, 2, 3 }
local function actualizarGens(dt)
	local nd, ne = nivelGen()
	for _, g in P.gens do
		if g.tipo == "equipo" then
			local eq = P.eqs[g.equipo]
			if eq.cama or eq.vivos > 0 then
				local f = eq.mejoras.forja
				local mult = MULT_FORJA[f + 1]
				g.tH += dt * mult
				g.tO += dt * mult
				if g.tH >= 1.1 then
					g.tH = 0
					soltarGen(g, I.lingoteHierro, 48)
				end
				if g.tO >= 6 then
					g.tO = 0
					soltarGen(g, I.lingoteOro, 12)
				end
				if f >= 3 then
					g.tE += dt
					if g.tE >= 40 then
						g.tE = 0
						soltarGen(g, I.esmeralda, 2)
					end
				end
			end
		else
			local dia = g.tipo == "diamante"
			local intervalo = dia and ({ 30, 23, 15 })[nd + 1] or ({ 65, 50, 35 })[ne + 1]
			g.t += dt
			if g.t >= intervalo then
				g.t = 0
				soltarGen(g, dia and I.diamante or I.esmeralda, dia and 4 or 2)
			end
			g.c = (g.c or 0) - dt
			if g.pieza and g.c <= 0 then
				g.c = 0.5
				cartel(g.pieza, ("%s %s · %ds"):format(dia and "Diamante" or "Esmeralda", ROMANO[(dia and nd or ne) + 1], math.ceil(intervalo - g.t)),
					dia and "#77ffff" or "#55ff55", 1.2)
				g.pieza.CFrame = CFrame.new(g.x * BS, (g.y + 1.9 + math.sin(P.t * 2 + g.x) * 0.12) * BS, g.z * BS) * CFrame.Angles(0, P.t * 1.8, 0)
			end
		end
	end
	-- Los bots cobran de su generador sin quitar lingotes a nadie y recogen diamantes y esmeraldas del suelo
	for _, m in P.bots do
		if not m.muerto then
			local b = m.bw
			local mult = MULT_FORJA[P.eqs[b.equipo].mejoras.forja + 1]
			for _, g in P.gens do
				if g.tipo == "equipo" and g.equipo == b.equipo and math.sqrt((m.x - g.x) ^ 2 + (m.z - g.z) ^ 2) < 5 then
					b.ingT = (b.ingT or 0) + dt * mult
					if b.ingT >= 1.6 then
						b.ingT = 0
						b.res.h += 1
						if math.random() < 0.18 then
							b.res.o += 1
						end
					end
				end
			end
			for _, e in ctx.Entidades.lista do
				if e.tipo == "item" and not e.muerta and (e.pila.id == I.diamante or e.pila.id == I.esmeralda)
					and math.abs(e.x - m.x) < 1.5 and math.abs(e.z - m.z) < 1.5 and math.abs(e.y - m.y) < 2 then
					if e.pila.id == I.diamante then
						b.res.d += e.pila.n
					else
						b.res.e += e.pila.n
					end
					e.muerta = true
					if e.pieza then
						e.pieza:Destroy()
					end
				end
			end
		end
	end
end

------------------------------------------------------------------
-- Bots (IA_EXTRA.botBW)
------------------------------------------------------------------
local function jugadorVivo(plr)
	local ch = plr.Character
	local h = ch and ch:FindFirstChildOfClass("Humanoid")
	local r = ch and ch:FindFirstChild("HumanoidRootPart")
	if h and r and h.Health > 0 then
		local p = r.Position / BS
		return Vector3.new(p.X, p.Y - (h.HipHeight + r.Size.Y / 2) / BS, p.Z)
	end
	return nil
end
local function enemigosDe(m)
	local res = {}
	local b = m.bw
	for plr, J in P.jug do
		if J.vivo and not J.espectador and J.equipo and J.equipo ~= b.equipo then
			local s = ctx.estados[plr]
			local invisible = s and s.efectos.invisibilidad and not table.find(P.eqs[b.equipo].trampas, "alarma")
			local pos = not invisible and jugadorVivo(plr)
			if pos then
				table.insert(res, { plr = plr, x = pos.X, y = pos.Y, z = pos.Z })
			end
		end
	end
	for _, o in P.bots do
		if o ~= m and not o.muerto and o.bw.equipo ~= b.equipo then
			table.insert(res, { m = o, x = o.x, y = o.y, z = o.z })
		end
	end
	return res
end

local function moverBot(m, tx, tz, vel, puente)
	local dx, dz = tx - m.x, tz - m.z
	local d = math.sqrt(dx * dx + dz * dz)
	if d < 0.3 then
		m.mover = false
		return d
	end
	local ux, uz = dx / d, dz / d
	m.yawObj = math.atan2(ux, uz)
	-- Tender puente: si no hay suelo delante, pone lana de su equipo
	local nx, nz, ny = math.floor(m.x + ux * 0.8), math.floor(m.z + uz * 0.8), math.floor(m.y - 0.5)
	local Mundo = ctx.Mundo
	if m.suelo and Mundo.get(nx, ny, nz) == 0 and Mundo.get(math.floor(m.x + ux * 0.4), ny, math.floor(m.z + uz * 0.4)) == 0 then
		if not puente or m.bw.lana <= 0 then
			m.mover = false
			if m.bw.lana <= 0 and m.bw.estado == "atacar" then
				m.bw.estado = "recolectar"
				m.bw.t = 15
			end
			return d
		end
		m.bw.colocarT = (m.bw.colocarT or 0) - 1 / 60
		if m.bw.colocarT <= 0 then
			m.bw.colocarT = 0.18 / m.bw.nivel
			ponBloque(nx, ny, nz, P.eqs[m.bw.equipo].E.lanaId)
			m.bw.lana -= 1
		end
		m.mover = true
		m.velObj = vel * 0.35
		return d
	end
	m.mover = true
	m.velObj = vel
	return d
end

local function comprasBot(m)
	local b, eq = m.bw, P.eqs[m.bw.equipo]
	local r = b.res
	while b.lana < 64 and r.h >= 4 do
		r.h -= 4
		b.lana += 16
	end
	if b.espada < 1 and r.h >= 10 then
		r.h -= 10
		b.espada = 1
	end
	if b.armadura < 1 and r.h >= 24 then
		r.h -= 24
		b.armadura = 1
	end
	if b.espada < 2 and r.o >= 7 then
		r.o -= 7
		b.espada = 2
	end
	if b.armadura < 2 and r.o >= 12 then
		r.o -= 12
		b.armadura = 2
	end
	if r.d >= 2 and eq.mejoras.prot < 2 then
		r.d -= 2 * (eq.mejoras.prot + 1)
		eq.mejoras.prot += 1
	elseif r.d >= 4 and eq.mejoras.filo == 0 then
		r.d -= 4
		eq.mejoras.filo = 1
	elseif r.d >= 1 and #eq.trampas < 1 then
		r.d -= 1
		table.insert(eq.trampas, "trampa")
	end
	if b.espada < 3 and r.e >= 4 then
		r.e -= 4
		b.espada = 3
	end
	if b.armadura < 3 and r.e >= 6 then
		r.e -= 6
		b.armadura = 3
	end
end

function BW.iaBot(m, dt)
	if not P or P.fase ~= "juego" or P.fin then
		m.mover = false
		return
	end
	local b = m.bw
	local eq = P.eqs[b.equipo]
	local E = eq.E
	if m.y < BW_VACIO then
		BW.muerteBot(m, "vacio")
		ctx.Mobs.quitar(m)
		return
	end
	b.t -= dt
	b.golpeT -= dt
	local vel = m.def.vel or 4.3
	local casa = { x = E.isla[1] + 0.5, z = E.isla[2] + 0.5 }
	if math.sqrt((m.x - casa.x) ^ 2 + (m.z - casa.z) ^ 2) < 7 then
		comprasBot(m)
	end
	-- ¿Hay enemigos cerca? A pelear
	local obj, dmin = nil, b.rol == "defensor" and 11 or 8
	local enemigos = enemigosDe(m)
	for _, e in enemigos do
		local d = math.sqrt((e.x - m.x) ^ 2 + (e.z - m.z) ^ 2)
		if d < dmin and math.abs(e.y - m.y) < 4 then
			dmin, obj = d, e
		end
	end
	-- Defender la cama si un enemigo se acerca a ella
	local cama = P.camas[b.equipo]
	if not obj and eq.cama then
		for _, e in enemigos do
			if math.sqrt((e.x - cama.x) ^ 2 + (e.z - cama.z) ^ 2) < 9 then
				obj = e
				break
			end
		end
	end
	if obj then
		local d = moverBot(m, obj.x, obj.z, vel * b.nivel, true)
		if d < 2.6 and b.golpeT <= 0 and math.abs(obj.y - m.y) < 2 then
			b.golpeT = (0.75 + math.random() * 0.4) / b.nivel
			m.golpeT = 0.35
			m.pieza:SetAttribute("ataca", os.clock())
			local dano = DANO_ESPADA[b.espada + 1] + (eq.mejoras.filo > 0 and 1.25 or 0)
			local dx, dz = obj.x - m.x, obj.z - m.z
			local l = math.sqrt(dx * dx + dz * dz)
			l = l > 0 and l or 1
			if obj.plr then
				local J = P.jug[obj.plr]
				if J then
					J.ultimoGolpe = { m = m, t = ahora() }
				end
				-- Los golpes de los bots empujan más (el clásico «combo» hacia el vacío)
				ctx.danar(obj.plr, dano, "mob", { x = dx / l * 1.4, z = dz / l * 1.4 })
			elseif obj.m then
				obj.m.bw.ultimoGolpe = { m = m, t = ahora() }
				ctx.Mobs.herir(obj.m, dano, { x = dx / l, z = dz / l }, "botBW")
			end
		end
		return
	end
	-- Máquina de estados: recolectar en el generador, atacar una cama enemiga o patrullar
	local gen
	for _, g in P.gens do
		if g.tipo == "equipo" and g.equipo == b.equipo then
			gen = g
		end
	end
	if b.estado == "recolectar" then
		moverBot(m, gen.x + (b.slot % 2 == 1 and 0.6 or -0.6), gen.z, vel * 0.8, false)
		if b.t <= 0 then
			b.t = 60 + math.random() * 40
			b.estado = (b.rol == "atacante" or math.random() < 0.35) and "atacar" or "patrulla"
			local vivos = {}
			for k, q in P.eqs do
				if k ~= b.equipo and (q.cama or q.vivos > 0) then
					table.insert(vivos, k)
				end
			end
			b.objetivo = #vivos > 0 and vivos[math.random(1, #vivos)] or nil
		end
	elseif b.estado == "patrulla" then
		local a = P.t * 0.4 + b.slot
		moverBot(m, cama.x + 0.5 + math.cos(a) * 2.5, cama.z + 0.5 + math.sin(a) * 2.5, vel * 0.6, false)
		if b.t <= 0 then
			b.estado = "recolectar"
			b.t = 15 + math.random() * 15
		end
	elseif b.estado == "atacar" then
		local oq = b.objetivo and P.eqs[b.objetivo]
		if not oq or (not oq.cama and oq.vivos <= 0) then
			b.estado = "recolectar"
			b.t = 10
			return
		end
		local c = P.camas[b.objetivo]
		local dx, dz
		if oq.cama then
			dx, dz = c.x + 0.5, c.z + 0.5
		else
			dx, dz = oq.E.isla[1] + 0.5, oq.E.isla[2] + 0.5
		end
		local d = moverBot(m, dx, dz, vel * b.nivel, true)
		-- Bola de fuego contra una cama protegida
		b.fuegoT = (b.fuegoT or (8 + math.random() * 12)) - dt
		if oq.cama and b.fuegoT <= 0 and d < 26 and d > 6 and b.res.h >= 40 then
			b.fuegoT = 18 + math.random() * 10
			b.res.h -= 40
			local o = Vector3.new(m.x, m.y + 1.5, m.z)
			local dir = (Vector3.new(c.x + 0.5, c.y + 0.5, c.z + 0.5) - o).Unit
			ctx.Entidades.disparar("bolaGhast", o.X + dir.X * 0.8, o.Y + dir.Y * 0.8, o.Z + dir.Z * 0.8, dir, 13, { dueno = m })
		end
		if oq.cama and d < 1.8 then
			-- Romper lo que proteja la cama y luego la cama
			b.minarT += dt
			if b.minarT > 1.6 / b.nivel then
				b.minarT = 0
				local roto = false
				for _, o in { { 0, 1, 0 }, { 1, 0, 0 }, { -1, 0, 0 }, { 0, 0, 1 }, { 0, 0, -1 } } do
					local x, y, z = c.x + o[1], c.y + o[2], c.z + o[3]
					if P.colocados[clave(x, y, z)] and ctx.Mundo.get(x, y, z) ~= 0 then
						ponBloque(x, y, z, 0)
						roto = true
						break
					end
				end
				if not roto and esCama(ctx.Mundo.get(c.x, c.y, c.z)) then
					romperCama(b.objetivo, b.nombre)
					hablaBot(m, "cama", 0.7)
					b.estado = "recolectar"
					b.t = 20
				end
			end
		end
		if b.t <= 0 then
			b.estado = "recolectar"
			b.t = 20
		end
	end
end

-- Golpes a los bots: sin fuego amigo, filo del equipo y armadura del bot
function BW.herirBot(m, d, fuente, plr)
	if not P then
		return d
	end
	local b = m.bw
	if (fuente == "jugador" or fuente == "flechaJugador") and plr then
		local J = P.jug[plr]
		if not J or not J.equipo or J.equipo == b.equipo or J.espectador then
			return 0
		end
		b.ultimoGolpe = { plr = plr, t = ahora() }
		if fuente == "jugador" and P.eqs[J.equipo].mejoras.filo > 0 then
			d += 1.25
		end
	end
	if fuente == "aliadoBW" and m.ultimoAliado then
		b.ultimoGolpe = { plr = m.ultimoAliado, t = ahora() }
	end
	return d * (1 - ({ 0, 0.12, 0.2, 0.3 })[b.armadura + 1] - 0.1 * P.eqs[b.equipo].mejoras.prot)
end

function BW.muerteBot(m, causa)
	if not P or m.bwMuerto then
		return
	end
	m.bwMuerto = true
	local b = m.bw
	local eq = P.eqs[b.equipo]
	local final = not eq.cama
	local reciente = b.ultimoGolpe and ahora() - b.ultimoGolpe.t < 12
	local porJugador = reciente and b.ultimoGolpe.plr
	local asesino = reciente and b.ultimoGolpe.m and not b.ultimoGolpe.m.muerto and b.ultimoGolpe.m or nil
	if porJugador then
		local J = P.jug[porJugador]
		if J then
			if final then
				J.finales += 1
			else
				J.bajas += 1
			end
			for _, par in { { "h", I.lingoteHierro }, { "o", I.lingoteOro }, { "d", I.diamante }, { "e", I.esmeralda } } do
				if b.res[par[1]] > 0 then
					ctx.darOSoltar(porJugador, Registro.pila(par[2], math.min(64, b.res[par[1]])))
				end
			end
			ctx.Estado:FireClient(porJugador, "sonido", "xp")
			tituloA(porJugador, "", final and "¡BAJA FINAL!" or "+1 baja", final and "#55ffff" or "#ffffff")
			ctx.enviarJugador(porJugador)
		end
	elseif asesino then
		asesino.bw.res.h += b.res.h
		asesino.bw.res.o += b.res.o
		hablaBot(asesino, "mata", 0.5)
	end
	local por = causa == "vacio" and "cayó al vacío" or (porJugador and ("fue eliminado por " .. porJugador.Name) or (asesino and ("fue eliminado por " .. asesino.bw.nombre) or "murió"))
	chat(b.nombre .. " " .. por .. (final and ". ¡ELIMINACIÓN FINAL!" or ""))
	hablaBot(m, "muere", 0.25)
	local i = table.find(P.bots, m)
	if i then
		table.remove(P.bots, i)
	end
	if final then
		eq.vivos = math.max(0, eq.vivos - 1)
		comprobarFin()
		return
	end
	local datos = { espada = math.max(0, b.espada - 1), armadura = b.armadura, rol = b.rol, estado = "recolectar", t = 8 + math.random() * 10 }
	local partida = P
	task.delay(5, function()
		if P == partida and not P.fin and P.fase == "juego" then
			crearBot(b.equipo, b.slot, datos)
		end
	end)
end

------------------------------------------------------------------
-- Aliados (chinches y defensores) y objetos especiales
------------------------------------------------------------------
local function invocarAliado(plr, tipo, x, y, z, seg, nombre)
	local J = P.jug[plr]
	if not ctx.Mobs.DEF[tipo] then
		return nil
	end
	local m = ctx.Mobs.crear(tipo, x, y + 0.2, z)
	if not m then
		return nil
	end
	m.domado = true
	m.bwAliado = J.equipo
	m.bwDueno = plr
	m.bwVida = seg
	if tipo == "golem" then
		m.vida, m.vidaMax = 100, 100
	end
	local E = P.eqs[J.equipo].E
	cartel(m.pieza, ("%s (%s)"):format(nombre, E.nombre), E.col, (m.alto or 1) * 0.5 + 0.6)
	m.alHerir = function(mm, d, fuente, quien)
		if quien and P and P.jug[quien] and P.jug[quien].equipo == mm.bwAliado then
			return 0
		end
		return d
	end
	m.control = function(mm, dt)
		mm.bwVida -= dt
		if not P or P.fin or mm.bwVida <= 0 then
			ctx.Mobs.quitar(mm)
			return
		end
		local o, dm = nil, 14
		for _, b in P.bots do
			if not b.muerto and b.bw.equipo ~= mm.bwAliado then
				local d = math.sqrt((b.x - mm.x) ^ 2 + (b.y - mm.y) ^ 2 + (b.z - mm.z) ^ 2)
				if d < dm then
					o, dm = { m = b, x = b.x, z = b.z }, d
				end
			end
		end
		for q, Jq in P.jug do
			if Jq.vivo and not Jq.espectador and Jq.equipo ~= mm.bwAliado then
				local p = jugadorVivo(q)
				if p then
					local d = (p - Vector3.new(mm.x, mm.y, mm.z)).Magnitude
					if d < dm then
						o, dm = { plr = q, x = p.X, z = p.Z }, d
					end
				end
			end
		end
		if not o then
			mm.mover = false
			return
		end
		local dx, dz = o.x - mm.x, o.z - mm.z
		local l = math.sqrt(dx * dx + dz * dz)
		l = l > 0 and l or 1
		mm.yawObj = math.atan2(dx, dz)
		mm.mover = l > 1
		mm.velObj = mm.tipo == "golem" and 3 or 4.5
		mm.cdA = (mm.cdA or 0) - dt
		if l < (mm.tipo == "golem" and 2.4 or 1.4) and mm.cdA <= 0 then
			mm.cdA = mm.tipo == "golem" and 1.2 or 0.8
			mm.pieza:SetAttribute("ataca", os.clock())
			if o.m then
				o.m.ultimoAliado = mm.bwDueno
				ctx.Mobs.herir(o.m, mm.tipo == "golem" and 7 or 2, { x = dx / l, z = dz / l }, "aliadoBW")
				if mm.tipo == "golem" then
					o.m.vy = 8
				end
			else
				ctx.danar(o.plr, mm.tipo == "golem" and 7 or 2, "mob", { x = dx / l, z = dz / l })
			end
		end
	end
	table.insert(P.aliados, m)
	return m
end

-- Torre compacta: anillo de lana de 9 bloques de alto con escalera y almenas
local function construirTorre(plr, dir)
	local pos = jugadorVivo(plr)
	if not pos then
		return
	end
	local fx = math.abs(dir.X) > math.abs(dir.Z) and (dir.X > 0 and 1 or -1) or 0
	local fz = fx ~= 0 and 0 or (dir.Z >= 0 and 1 or -1)
	local cx, cz, y0 = math.floor(pos.X) + fx * 2, math.floor(pos.Z) + fz * 2, math.floor(pos.Y + 0.05)
	local L = lanaDe(P.jug[plr])
	local t = 0
	for h = 0, 8 do
		for a = -1, 1 do
			for b = -1, 1 do
				if a ~= 0 or b ~= 0 then
					if not (a == -fx and b == -fz and h < 2) then -- entrada
						t += 0.012
						table.insert(P.cola, { x = cx + a, y = y0 + h, z = cz + b, b = L, t = t })
					end
				end
			end
		end
		t += 0.012
		table.insert(P.cola, { x = cx, y = y0 + h, z = cz, b = B.escaleraMano, t = t })
	end
	for a = -2, 2 do
		for b = -2, 2 do
			if math.max(math.abs(a), math.abs(b)) == 2 then
				t += 0.008
				table.insert(P.cola, { x = cx + a, y = y0 + 8, z = cz + b, b = L, t = t })
				if (a + b) % 2 == 0 then
					t += 0.01
					table.insert(P.cola, { x = cx + a, y = y0 + 9, z = cz + b, b = L, t = t })
				end
			end
		end
	end
end

local function lanzarHuevo(plr, dir)
	local pos = jugadorVivo(plr)
	if not pos then
		return
	end
	local d = Vector3.new(dir.X, math.clamp(dir.Y, -0.15, 0.15), dir.Z).Unit
	local p = Instance.new("Part")
	p.Name = "HuevoPuente"
	p.Shape = Enum.PartType.Ball
	p.Anchored = true
	p.CanCollide = false
	p.CanQuery = false
	p.Size = Vector3.new(0.3, 0.38, 0.3) * BS
	p.Color = Color3.fromRGB(240, 235, 220)
	local o = pos + Vector3.new(0, 1.5, 0) + d * 0.6
	p.Position = o * BS
	p.Parent = workspace
	table.insert(P.huevos, { pos = o, vel = d * 16, edad = 0, lana = lanaDe(P.jug[plr]), pieza = p })
end

-- Clic derecho con un objeto de Bed Wars en la mano
function BW.usarObjeto(plr, s, p, dir)
	local J = P and P.jug[plr]
	if not J or not p then
		return false
	end
	if J.espectador or P.fase ~= "juego" then
		return true
	end
	local id = p.id
	local pos = jugadorVivo(plr)
	if not pos then
		return true
	end
	local function gastar()
		p.n -= 1
		if p.n <= 0 then
			s.inv[s.sel] = false
		end
		ctx.enviarJugador(plr)
	end
	if id == 714 then
		local o = pos + Vector3.new(0, 1.6, 0) + dir * 0.8
		ctx.Entidades.disparar("bolaGhast", o.X, o.Y, o.Z, dir, 14, { jugador = plr, dueno = plr })
		ctx.Estado:FireClient(plr, "sonido", "arco")
		gastar()
		return true
	elseif id == 715 then
		lanzarHuevo(plr, dir)
		gastar()
		return true
	elseif id == 716 then
		construirTorre(plr, dir)
		gastar()
		return true
	elseif id == 717 then
		invocarAliado(plr, "golem", pos.X + dir.X * 2, pos.Y, pos.Z + dir.Z * 2, 240, "Defensor de los sueños")
		gastar()
		return true
	elseif id == 718 then
		J.leche = P.t + 30
		ctx.aviso(plr, "Leche mágica: las trampas no te afectan durante 30 s")
		ctx.Estado:FireClient(plr, "sonido", "beber")
		gastar()
		return true
	elseif id == 719 then
		invocarAliado(plr, ctx.Mobs.DEF.lepisma and "lepisma" or "arana", pos.X + dir.X * 3, pos.Y, pos.Z + dir.Z * 3, 15, "Chinche")
		gastar()
		return true
	end
	return false
end

-- Invisibilidad: el personaje se vuelve transparente durante un rato
function BW.invisible(plr, seg)
	local ch = plr.Character
	if not ch then
		return
	end
	local antes = {}
	for _, o in ch:GetDescendants() do
		if (o:IsA("BasePart") or o:IsA("Decal")) and o.Name ~= "HumanoidRootPart" then
			antes[o] = o.Transparency
			o.Transparency = 1
		end
	end
	task.delay(seg, function()
		for o, t in antes do
			if o.Parent then
				o.Transparency = t
			end
		end
	end)
end

------------------------------------------------------------------
-- Trampas y fuente de curación
------------------------------------------------------------------
local function actualizarTrampas(dt)
	for k, eq in P.eqs do
		eq.trampaT = math.max(0, eq.trampaT - dt)
		local cx, cz = eq.E.isla[1], eq.E.isla[2]
		if #eq.trampas > 0 and eq.trampaT <= 0 then
			local intruso
			for plr, J in P.jug do
				if J.vivo and not J.espectador and J.equipo and J.equipo ~= k and not (J.leche and P.t < J.leche) then
					local p = jugadorVivo(plr)
					if p and math.sqrt((p.X - cx) ^ 2 + (p.Z - cz) ^ 2) < 10 and math.abs(p.Y - BW_Y) < 8 then
						intruso = { plr = plr }
						break
					end
				end
			end
			if not intruso then
				for _, o in P.bots do
					if o.bw.equipo ~= k and math.sqrt((o.x - cx) ^ 2 + (o.z - cz) ^ 2) < 10 then
						intruso = { m = o }
						break
					end
				end
			end
			if intruso then
				local t = table.remove(eq.trampas, 1)
				eq.trampaT = 30
				if intruso.plr then
					local s = ctx.estados[intruso.plr]
					if s then
						if t == "trampa" then
							s.efectos.lentitud = { t = 8, n = 1 }
							s.efectos.oscuridad = { t = 8, n = 1 }
						elseif t == "fatiga" then
							s.efectos.fatigaMinera = { t = 10, n = 1 }
						elseif t == "alarma" then
							s.efectos.invisibilidad = nil
						end
						tituloA(intruso.plr, "", "¡Has activado una trampa!", "#ff5555")
						ctx.enviarJugador(intruso.plr)
					end
				else
					intruso.m.vx *= 0.2
					intruso.m.vz *= 0.2
				end
				for plr, J in P.jug do
					if J.equipo == k then
						tituloA(plr, "", "¡Trampa activada en tu isla!", "#ffff55")
						if t == "contra" then
							local s = ctx.estados[plr]
							if s then
								s.efectos.rapidez = { t = 15, n = 1 }
								s.efectos.salto = { t = 15, n = 2 }
								ctx.enviarJugador(plr)
							end
						end
					end
				end
			end
		end
		-- Fuente de curación y minero frenético
		eq.cur += dt
		local curar = eq.cur > 2.5
		if curar then
			eq.cur = 0
		end
		for plr, J in P.jug do
			if J.equipo == k and J.vivo and not J.espectador then
				local s = ctx.estados[plr]
				if s and eq.mejoras.prisa > 0 then
					s.efectos.prisa = { t = 2, n = eq.mejoras.prisa }
				end
				if curar and eq.mejoras.curacion > 0 then
					local p = jugadorVivo(plr)
					local h = plr.Character and plr.Character:FindFirstChildOfClass("Humanoid")
					if p and h and math.sqrt((p.X - cx) ^ 2 + (p.Z - cz) ^ 2) < 9 and h.Health < h.MaxHealth then
						h.Health = math.min(h.MaxHealth, h.Health + 1)
					end
				end
			end
		end
	end
end

------------------------------------------------------------------
-- Fin de la partida
------------------------------------------------------------------
local terminar
function comprobarFin()
	if not P or P.fin or P.fase ~= "juego" then
		return
	end
	-- Equipos eliminados
	local vivos = {}
	for k, q in P.eqs do
		if q.cama or q.vivos > 0 then
			table.insert(vivos, k)
		elseif not q.eliminado then
			q.eliminado = true
			chat(("EQUIPO ELIMINADO > ¡El equipo %s ha sido eliminado!"):format(q.E.nombre))
		end
	end
	if #vivos <= 1 then
		terminar(vivos[1])
	end
end

function terminar(ganador)
	if P.fin then
		return
	end
	P.fin = true
	P.fase = "fin"
	local E = ganador and P.eqs[ganador].E
	sonidoTodos("nivel")
	for plr, J in P.jug do
		local gano = ganador ~= nil and J.equipo == ganador
		tituloA(plr, gano and "¡VICTORIA!" or "FIN DE LA PARTIDA", E and ("Gana el equipo " .. E.nombre) or "Empate", gano and "#ffff55" or "#ff5555")
		ctx.aviso(plr, ("Bajas: %d · Bajas finales: %d · Camas rotas: %d · Muertes: %d · Tiempo: %s"):format(J.bajas, J.finales, J.camas, J.muertes, fmt(P.t)))
		local xp = 10 + J.bajas * 5 + J.finales * 10 + J.camas * 20 + (gano and 50 or 0)
		ctx.aviso(plr, ("Recompensa: +%d de experiencia"):format(xp))
		J.premioXP = xp
	end
	local partida = P
	task.delay(10, function()
		if P ~= partida then
			return
		end
		for plr in table.clone(P.jug) do
			BW.salir(plr, true)
		end
		quitarMobs()
		BW.anterior = { arena = P.arena, colocados = P.colocados }
		P = nil
	end)
end

------------------------------------------------------------------
-- API para Modos
------------------------------------------------------------------
function BW.unirse(plr)
	local s = ctx.estados[plr]
	if not s then
		return
	end
	if not P then
		crearPartida()
	end
	if P.jug[plr] then
		return
	end
	local J = nuevoJugador(plr, s)
	P.jug[plr] = J
	s.inv = table.create(41, false)
	s.xp = { nivel = 0, puntos = 0 }
	s.cama = nil
	s.modo = "supervivencia"
	s.bw = true
	plr:SetAttribute("Modo", "supervivencia")
	plr:SetAttribute("BedWars", true)
	if P.fase ~= "sala" then
		J.espectador = true
		J.vivo = false
		ctx.aviso(plr, "Hay una partida en curso: la verás desde la sala y entrarás en la siguiente.")
	end
	local sala = P.arena.sala
	task.spawn(ctx.teletransportar, plr, sala.x, sala.y, sala.z, "Bed Wars")
	tituloA(plr, "BED WARS", P.fase == "sala" and "Esperando jugadores…" or "Partida en curso", "#ff5555")
	ctx.enviarJugador(plr)
end

-- Sale de la partida (al acabar, al elegir otro modo o al irse del juego)
function BW.salir(plr, fin)
	if not P or not P.jug[plr] then
		return
	end
	local J = P.jug[plr]
	P.jug[plr] = nil
	if J.equipo and J.vivo and not J.espectador and P.fase == "juego" then
		local eq = P.eqs[J.equipo]
		eq.vivos = math.max(0, eq.vivos - 1)
	end
	local s = ctx.estados[plr]
	if s then
		s.inv = J.guardado.inv
		s.xp = J.guardado.xp
		s.modo = J.guardado.modo or "supervivencia"
		s.cama = J.guardado.cama
		s.bw = nil
		s.ui = nil
		plr:SetAttribute("Modo", s.modo)
	end
	plr:SetAttribute("BedWars", nil)
	ctx.Estado:FireClient(plr, "panel", nil)
	if J.premioXP and ctx.ganarXP then
		ctx.ganarXP(plr, J.premioXP)
	end
	if plr.Parent then
		if fin then
			ctx.Estado:FireClient(plr, "menu", true)
		end
		plr:LoadCharacter()
	elseif ctx.guardar then
		ctx.guardar(plr)
	end
	if not fin and P.fase == "juego" then
		comprobarFin()
	end
	-- Si no queda nadie, la partida se acaba
	if next(P.jug) == nil and not P.fin then
		quitarMobs()
		BW.anterior = { arena = P.arena, colocados = P.colocados }
		P = nil
	end
end

function BW.en(plr)
	return P ~= nil and P.jug[plr] ~= nil
end

function BW.puntoAparicion(plr)
	local J = P and P.jug[plr]
	if not J then
		return nil
	end
	if P.fase == "juego" and J.vivo and not J.espectador and J.equipo then
		local E = P.eqs[J.equipo].E
		return { E.isla[1], BW_Y + 1, E.isla[2] }
	end
	local s = P.arena.sala
	return { math.floor(s.x), s.y, math.floor(s.z) }
end

function BW.alAparecer(plr)
	local J = P and P.jug[plr]
	if J and P.fase == "juego" and J.vivo and not J.espectador then
		-- Al reaparecer, el pico y el hacha bajan un nivel
		if J.reaparece then
			J.pico = math.max(J.pico > 0 and 1 or 0, J.pico - 1)
			J.hacha = math.max(J.hacha > 0 and 1 or 0, J.hacha - 1)
			J.reaparece = false
			tituloA(plr, "", "¡Has reaparecido!", "#55ff55")
		end
		kit(plr)
	end
end

-- Al morir: los recursos van para quien te mató y el inventario se vacía
function BW.inventarioAlMorir(plr, s)
	local J = P and P.jug[plr]
	if not J then
		return nil
	end
	local g = J.ultimoGolpe
	if g and ahora() - g.t < 12 then
		if g.m and not g.m.muerto and g.m.bw then
			local r = g.m.bw.res
			r.h += contarInv(s, I.lingoteHierro)
			r.o += contarInv(s, I.lingoteOro)
			r.d += contarInv(s, I.diamante)
			r.e += contarInv(s, I.esmeralda)
		elseif g.plr and g.plr.Parent then
			for _, id in { I.lingoteHierro, I.lingoteOro, I.diamante, I.esmeralda } do
				local n = contarInv(s, id)
				if n > 0 then
					ctx.darOSoltar(g.plr, Registro.pila(id, math.min(64, n)))
				end
			end
			ctx.enviarJugador(g.plr)
		end
	end
	return "borrar"
end

function BW.alMorir(plr)
	local J = P and P.jug[plr]
	if not J or P.fase ~= "juego" or J.espectador then
		return
	end
	local s = ctx.estados[plr]
	local eq = P.eqs[J.equipo]
	J.muertes += 1
	local g = J.ultimoGolpe and ahora() - J.ultimoGolpe.t < 12 and J.ultimoGolpe or nil
	local final = not eq.cama
	local por
	if g and g.m and g.m.bw then
		por = g.m.bw.nombre .. " eliminó a " .. plr.Name
		hablaBot(g.m, "mata", 0.5)
	elseif g and g.plr then
		por = g.plr.Name .. " eliminó a " .. plr.Name
		local Jk = P.jug[g.plr]
		if Jk then
			if final then
				Jk.finales += 1
			else
				Jk.bajas += 1
			end
			tituloA(g.plr, "", final and "¡BAJA FINAL!" or "+1 baja", final and "#55ffff" or "#ffffff")
		end
	elseif s and s.ultimaCausa == "vacio" then
		por = plr.Name .. " cayó al vacío"
	else
		por = plr.Name .. " murió"
	end
	chat(por .. (final and ". ¡ELIMINACIÓN FINAL!" or ""))
	J.ultimoGolpe = nil
	if final then
		J.vivo = false
		J.espectador = true
		eq.vivos = math.max(0, eq.vivos - 1)
		tituloA(plr, "ELIMINADO", "Ahora eres espectador", "#aaaaaa")
		comprobarFin()
	else
		J.reaparece = true
		tituloA(plr, "¡HAS MUERTO!", "Reapareces en 5 s", "#ff5555")
	end
end

-- Daño que recibe un jugador de la partida (nada en la sala; la armadura reforzada lo reduce)
function BW.modDano(plr, n, tipo)
	local J = P and P.jug[plr]
	if not J then
		return n
	end
	if P.fase ~= "juego" or J.espectador then
		return tipo == "vacio" and n or 0
	end
	local prot = P.eqs[J.equipo].mejoras.prot
	if prot > 0 then
		n *= 1 - 0.12 * prot
	end
	return n
end

-- ¿Puede «a» herir al jugador «b»? (nil = el modo no opina)
function BW.pvp(a, b)
	local Ja, Jb = P and P.jug[a], P and P.jug[b]
	if not Ja and not Jb then
		return nil
	end
	if not Ja or not Jb or P.fase ~= "juego" or Ja.espectador or Jb.espectador or Ja.equipo == Jb.equipo then
		return false
	end
	Jb.ultimoGolpe = { plr = a, t = ahora() }
	return true
end

function BW.extraDanoPvp(a)
	local J = P and P.jug[a]
	return J and J.equipo and P.eqs[J.equipo].mejoras.filo > 0 and 1.25 or 0
end

function BW.puedeRomper(plr, x, y, z, b)
	local J = P and P.jug[plr]
	if not J then
		return enArena(x, y, z) and P.colocados[clave(x, y, z)] == true or not enArena(x, y, z)
	end
	if J.espectador or P.fase ~= "juego" then
		return false
	end
	if esCama(b) then
		local k = camaEn(x, y, z)
		if k then
			if k == J.equipo then
				ctx.aviso(plr, "¡No puedes romper tu propia cama!")
				return false
			end
			J.camas += 1
			romperCama(k, plr.Name)
			return false
		end
	end
	if not P.colocados[clave(x, y, z)] then
		if ahora() - (J.avisoMapa or 0) > 2 then
			J.avisoMapa = ahora()
			ctx.aviso(plr, "Solo puedes romper bloques puestos por los jugadores")
		end
		return false
	end
	return true
end

function BW.alRomper(plr, x, y, z)
	if P then
		P.colocados[clave(x, y, z)] = nil
	end
end

function BW.puedePoner(plr, x, y, z, id)
	local J = P and P.jug[plr]
	if not J then
		return not enArena(x, y, z)
	end
	if J.espectador or P.fase ~= "juego" then
		return false
	end
	if y > BW_Y + 22 or y < BW_Y - 14 then
		ctx.aviso(plr, "Límite de construcción")
		return false
	end
	for _, g in P.gens do
		if math.abs(x + 0.5 - g.x) < 1.6 and math.abs(z + 0.5 - g.z) < 1.6 and y <= BW_Y + 2 then
			ctx.aviso(plr, "No puedes construir sobre un generador")
			return false
		end
	end
	return true
end

function BW.alPoner(plr, x, y, z, id)
	if not P or not P.jug[plr] then
		return
	end
	P.colocados[clave(x, y, z)] = true
	-- La dinamita se enciende sola
	if id == B.tnt then
		ctx.Mundo.set(x, y, z, 0, { sinAviso = true })
		P.colocados[clave(x, y, z)] = nil
		ctx.activarTNT(x, y, z)
	end
end

-- Las explosiones solo rompen lo construido (y nunca el vidrio a prueba de explosiones ni la obsidiana)
function BW.puedeExplotar(x, y, z, id)
	if not P or not enArena(x, y, z) then
		return true
	end
	local k = clave(x, y, z)
	if not P.colocados[k] or id == B.obsidiana or (BL[id] and BL[id].clave:sub(1, 7) == "vidrio_") then
		return false
	end
	P.colocados[k] = nil
	return true
end

function BW.usarMob(plr, s, m)
	local J = P and P.jug[plr]
	if not J or not m.bwTienda then
		return false
	end
	if J.espectador or P.fase ~= "juego" then
		return true
	end
	if m.bwTienda == "mejoras" and m.bwEquipo ~= J.equipo then
		ctx.aviso(plr, "Solo puedes usar las mejoras de tu equipo")
		return true
	end
	abrirTienda(plr, s, m.bwTienda)
	return true
end

------------------------------------------------------------------
-- Bucle
------------------------------------------------------------------
local function panel(plr, J)
	local L = {}
	local function linea(t, c)
		table.insert(L, { t = t, c = c })
	end
	if P.fase == "sala" then
		local n = 0
		for _ in P.jug do
			n += 1
		end
		linea(("Empieza en %d"):format(math.ceil(P.lobby)), "#55ff55")
		linea("Mapa: " .. Arenas.TEMAS_BW[P.tema].nombre, "#55ff55")
		linea(("Jugadores: %d (el resto, bots)"):format(n), "#ffffff")
	else
		local ev = BW.EVENTOS[P.ev]
		if ev then
			linea(("%s en %s"):format(ev[2], fmt(ev[1] - P.t)), "#ffffff")
		end
		linea("", "#ffffff")
		for k, q in P.eqs do
			local est
			if q.cama then
				est = "✔"
			elseif q.vivos > 0 then
				est = tostring(q.vivos)
			else
				est = "✘"
			end
			linea(("%s %s: %s%s"):format(q.E.letra, q.E.nombre, est, J.equipo == k and "  TÚ" or ""), q.E.col)
		end
		linea("", "#ffffff")
		linea(("Bajas: %d"):format(J.bajas), "#ffffff")
		linea(("Bajas finales: %d"):format(J.finales), "#ffffff")
		linea(("Camas rotas: %d"):format(J.camas), "#ffffff")
	end
	ctx.Estado:FireClient(plr, "panel", { titulo = "BED WARS", lineas = L })
end

local function actualizar(dt)
	if not P then
		return
	end
	-- Hambre fija y caída al vacío
	for plr, J in P.jug do
		local s = ctx.estados[plr]
		if s then
			s.hambre, s.saturacion = 20, 5
		end
		local ch = plr.Character
		local h = ch and ch:FindFirstChildOfClass("Humanoid")
		local r = ch and ch:FindFirstChild("HumanoidRootPart")
		if h and r and h.Health > 0 and not r.Anchored then
			local y = (r.Position.Y - h.HipHeight - r.Size.Y / 2) / BS
			if P.fase == "juego" and J.vivo and not J.espectador then
				if y < BW_VACIO then
					if s then
						s.ultimaCausa = "vacio"
					end
					h.Health = 0
				end
			elseif y < P.arena.sala.y - 3 then
				local sala = P.arena.sala
				r.CFrame = CFrame.new(sala.x * BS, (sala.y + 1.5) * BS, sala.z * BS)
				r.AssemblyLinearVelocity = Vector3.zero
			end
		end
	end
	P.avisoT -= dt
	local pintar = P.avisoT <= 0
	if pintar then
		P.avisoT = 0.5
	end
	if P.fase == "sala" then
		local antes = math.ceil(P.lobby)
		P.lobby -= dt
		local ahoraS = math.ceil(P.lobby)
		if ahoraS ~= antes and ahoraS > 0 and ahoraS <= 5 then
			tituloTodos("BED WARS", "Empieza en " .. ahoraS, ahoraS <= 3 and "#ff5555" or "#ffff55")
		end
		if P.lobby <= 0 then
			empezar()
		end
	elseif P.fase == "juego" then
		P.t += dt
		local ev = BW.EVENTOS[P.ev]
		if ev and P.t >= ev[1] then
			P.ev += 1
			sonidoTodos("nivel")
			tituloTodos("", ev[2], "#ffff55")
			chat("» " .. ev[2])
			if ev[2] == "Camas destruidas" then
				for k, q in P.eqs do
					if q.cama then
						romperCama(k, "el tiempo")
					end
				end
			elseif ev[2] == "Fin de la partida" then
				local v = {}
				for k, q in P.eqs do
					if q.vivos > 0 then
						table.insert(v, k)
					end
				end
				terminar(#v == 1 and v[1] or nil)
				return
			end
		end
		if P.fin then
			return
		end
		actualizarGens(dt)
		actualizarTrampas(dt)
		-- Bloques que se colocan poco a poco (defensas de los bots y torres compactas)
		for i = #P.cola, 1, -1 do
			local q = P.cola[i]
			q.t -= dt
			if q.t <= 0 then
				table.remove(P.cola, i)
				if ctx.Mundo.get(q.x, q.y, q.z) == 0 then
					ponBloque(q.x, q.y, q.z, q.b)
				end
			end
		end
		-- Huevos puente
		for i = #P.huevos, 1, -1 do
			local e = P.huevos[i]
			e.edad += dt
			e.pos += e.vel * dt
			e.vel -= Vector3.new(0, 1.2 * dt, 0)
			e.pieza.Position = e.pos * BS
			local x, y, z = math.floor(e.pos.X), math.floor(e.pos.Y) - 2, math.floor(e.pos.Z)
			if e.edad > 0.12 then
				for _, o in { { 0, 0 }, { 1, 0 }, { 0, 1 } } do
					if ctx.Mundo.get(x + o[1], y, z + o[2]) == 0 then
						ponBloque(x + o[1], y, z + o[2], e.lana)
					end
				end
			end
			if e.edad > 1.9 or Registro.SOLIDO[ctx.Mundo.get(x, math.floor(e.pos.Y), z)] then
				e.pieza:Destroy()
				table.remove(P.huevos, i)
			end
		end
		-- Aliados que caducan
		for i = #P.aliados, 1, -1 do
			if P.aliados[i].muerto then
				table.remove(P.aliados, i)
			end
		end
	end
	if pintar and P then
		for plr, J in P.jug do
			panel(plr, J)
		end
	end
end

function BW.iniciar(c)
	ctx = c
	RunService.Heartbeat:Connect(function(dt)
		local ok, err = pcall(actualizar, math.min(dt, 0.1))
		if not ok then
			warn("[Blockverse] Bed Wars: " .. tostring(err))
		end
	end)
end

-- Para las pruebas
function BW._partida()
	return P
end
function BW._empezarYa()
	if P and P.fase == "sala" then
		P.lobby = 0
	end
end

return BW
