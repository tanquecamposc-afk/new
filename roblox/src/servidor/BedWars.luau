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
	Novedades de la versión de Roblox:
	· Kits con niveles (KitsBW) y progreso guardado (PerfilBW): monedas, nivel con
	  estrellas, estadísticas, misiones diarias y efectos de baja final.
	· Votación de mapa en la sala, etiquetas de equipo encima de los jugadores y
	  compañeros resaltados, registro de bajas y pantalla final con recompensas.
	· Momentos de caos: lluvia de meteoritos, fiebre del oro, gravedad baja y el
	  cofre del cielo, que cae en el centro con botín raro.
	· Rachas de bajas (En racha, Imparable, Leyenda) y «cortarrachas».
	· Objetos nuevos: globo salvavidas, escudo de cama, trampolín, mina terrestre y
	  torreta de nieve. En la muerte súbita, además, el vacío sube.
]]
local RunService = game:GetService("RunService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Comp = ReplicatedStorage:WaitForChild("Blockverse")
local Config = require(Comp.Config)
local Registro = require(Comp.Registro)
local Arenas = require(Comp.Arenas)
local Cont = require(script.Parent.Contenedores)
local Perfil = require(script.Parent.PerfilBW)
local Kits = require(script.Parent.KitsBW)

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
-- Registro de la partida (arriba a la derecha en el cliente): bajas, camas, eventos…
local function chat(texto, col)
	if not P then
		return
	end
	for plr in P.jug do
		ctx.Estado:FireClient(plr, "feed", { t = texto, c = col or "#ffffff" })
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
	{ "Novedades", 900, {
		{ n = "Globo salvavidas", id = 900, c = 1, p = { ME, 1 }, d = "Si caes al vacío, se infla solo y te devuelve a tu isla." },
		{ n = "Escudo de cama (45 s)", id = 901, c = 1, p = { ME, 2 }, d = "Úsalo junto a tu cama: nadie puede romperla durante 45 s." },
		{ n = "Trampolín", id = 902, c = 1, p = { MH, 12 }, d = "Ponlo en el suelo: al pisarlo sales disparado hacia arriba." },
		{ n = "Mina terrestre", id = 903, c = 1, p = { MO, 4 }, d = "Explota cuando un enemigo la pisa." },
		{ n = "Torreta de nieve (60 s)", id = 904, c = 1, p = { ME, 1 }, d = "Una torreta que empuja a los enemigos que se acercan." },
	} },
}
do
	local rapida = {}
	for _, nombre in { "Lana", "Espada de piedra", "Armadura de cota (permanente)", "Pico (mejora)", "Tablones de roble", "Piedra del End", "Manzana dorada",
		"Bola de fuego", "Dinamita (se enciende sola)", "Flechas", "Arco", "Torre compacta", "Perla de ender", "Espada de hierro",
		"Armadura de hierro (permanente)", "Huevo puente", "Globo salvavidas" } do
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
	J.lana = lanaDe(J)
	Kits.alEquipar(plr, s, J)
	if J.pico > 0 and not s.inv[2] then
		s.inv[2] = pilaDe(idc(PICO_BW[J.pico]), 1, { eficiencia = math.min(3, J.pico) })
	end
	aplicarProt(s, eq.mejoras.prot)
	if eq.mejoras.filo > 0 then
		aplicarFilo(s)
	end
	s.sel = 1
	s.hambre, s.saturacion = 20, 5
	BW.etiquetaJugador(plr, J)
	ctx.enviarJugador(plr)
end

-- Etiqueta encima de la cabeza con el equipo, el nombre y el nivel; el cliente resalta a los compañeros
function BW.etiquetaJugador(plr, J)
	local ch = plr.Character
	local cab = ch and ch:FindFirstChild("Head")
	plr:SetAttribute("EquipoBW", J.equipo)
	plr:SetAttribute("ColorBW", J.equipo and P.eqs[J.equipo].E.col or nil)
	if not cab or not J.equipo then
		return
	end
	-- Sin el nombre de Roblox encima de la cabeza: ya está la etiqueta del equipo
	local hum = ch:FindFirstChildOfClass("Humanoid")
	if hum then
		hum.DisplayDistanceType = Enum.HumanoidDisplayDistanceType.None
	end
	local E = P.eqs[J.equipo].E
	local g = cartel(cab, ("[%s] %s%s %s"):format(E.letra, plr:GetAttribute("VIP") and "★" or "", plr.Name, Perfil.etiqueta(J.perfil)), E.col, 0.9)
	g.Size = UDim2.fromOffset(220, 22)
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
	J.compras = (J.compras or 0) + 1
	BW.misiones(plr, "compras", 1)
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
			precioTxt = precio[2] .. " " .. NOMBRE_MONEDA[precio[1]],
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
			precio = { I.diamante, coste }, precioTxt = coste .. (coste == 1 and " diamante" or " diamantes"), puede = not max and dia >= coste, tiene = max, desc = M.d })
	end
	local coste = 2 ^ #eq.trampas
	for _, T in TRAMPAS do
		table.insert(d.ofertas, { id = T.icono, n = 1, nombre = "Trampa: " .. T.n, precio = { I.diamante, coste },
			precioTxt = #eq.trampas >= 3 and "Cola llena" or (coste .. (coste == 1 and " diamante" or " diamantes")), puede = #eq.trampas < 3 and dia >= coste,
			tiene = false, desc = T.d })
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
		BW.misiones(plr, "mejoras", 1)
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
		BW.misiones(plr, "mejoras", 1)
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
	chat(("CAMA DESTRUIDA > ¡La cama del equipo %s ha sido destruida por %s!"):format(E.nombre, quien), E.col)
	if eq.escudo then
		eq.escudo:Destroy()
		eq.escudo = nil
	end
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
		res = { h = 0, o = 0, d = 0, e = 0 }, espada = 0, armadura = 0, lana = 16, objetivo = nil, minarT = 0, golpeT = 0, nombre = nombre,
		kit = Kits.KITS_BOT[math.random(1, #Kits.KITS_BOT)] }
	if datos then
		for kk, v in datos do
			m.bw[kk] = v
		end
	end
	local kitBot = Kits.POR_ID[m.bw.kit]
	m.pieza:SetAttribute("Etiqueta", ("[%s] %s"):format(E.letra, nombre))
	cartel(m.pieza, ("[%s] %s · %s"):format(E.letra, nombre, kitBot and kitBot.n or ""), E.col, 1.3)
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
	local perfil = Perfil.de(plr)
	local kitId = Kits.disponible(perfil, perfil.kit) and perfil.kit or "ninguno"
	return {
		equipo = nil, vivo = true, espectador = false, armadura = 0, pico = 0, hacha = 0, tijeras = false,
		bajas = 0, finales = 0, camas = 0, muertes = 0, ultimoGolpe = nil, racha = 0, mejorRacha = 0, compras = 0,
		perfil = perfil, kit = kitId, kitV = Kits.valores(kitId, Kits.nivelDe(perfil, kitId)),
		guardado = { inv = s.inv, xp = s.xp, modo = s.modo, cama = s.cama },
	}
end

-- Una baja hecha por un jugador: estadísticas, rachas, kit, misiones y efecto de baja final
local RACHAS = { [3] = { "¡EN RACHA!", "#ffaa00", "rapidez" }, [5] = { "¡IMPARABLE!", "#ff5555", "resistencia" }, [7] = { "¡LEYENDA!", "#ff55ff", "fuerza" } }
function BW.registrarBaja(plr, final, pos, victima)
	local J = P and P.jug[plr]
	if not J then
		return
	end
	local s = ctx.estados[plr]
	if final then
		J.finales += 1
		BW.misiones(plr, "finales", 1)
	else
		J.bajas += 1
	end
	BW.misiones(plr, "bajas", 1)
	J.racha += 1
	J.mejorRacha = math.max(J.mejorRacha, J.racha)
	tituloA(plr, "", final and "¡BAJA FINAL!" or "+1 baja", final and "#55ffff" or "#ffffff")
	ctx.Estado:FireClient(plr, "sonido", "xp")
	local R = RACHAS[J.racha]
	if R and s then
		s.efectos[R[3]] = { t = 12, n = 1 }
		tituloA(plr, R[1], ("%d bajas seguidas"):format(J.racha), R[2])
		local E = P.eqs[J.equipo].E
		chat(("%s %s está %s (%d seguidas)"):format(E.letra, plr.Name, R[1]:lower():gsub("¡", ""):gsub("!", ""), J.racha), R[2])
	end
	if s then
		Kits.alMatar(plr, s, J, final)
	end
	-- Efecto de baja final (cosmético comprado con monedas)
	if final and pos then
		local ef = J.perfil.efecto
		if ef and ef ~= "ninguno" then
			for o in P.jug do
				ctx.Estado:FireClient(o, "efectoBaja", ef, pos * BS)
			end
		end
	end
	ctx.enviarJugador(plr)
	local _ = victima
end

-- Al morir un jugador con racha: el que lo mata es un «cortarrachas»
local function cortarRacha(Jv, asesino)
	if Jv.racha >= 3 and asesino and P.jug[asesino] then
		Perfil.de(asesino).monedas += 25
		tituloA(asesino, "¡CORTARRACHAS!", "+25 monedas", "#ffd84a")
	end
	Jv.racha = 0
end

-- Misiones diarias: avisa al completar una
function BW.misiones(plr, clave, n)
	if not plr or not plr.Parent then
		return
	end
	for _, m in Perfil.progreso(plr, clave, n) do
		tituloA(plr, "¡Misión completada!", ("%s · +%d monedas"):format(m.texto, m.premio), "#ffd84a")
		ctx.Estado:FireClient(plr, "sonido", "nivel")
	end
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
		votos = {}, minas = {}, multGen = 1, caosT = 180, caos = nil, vacio = BW_VACIO, cofreCielo = nil,
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
	-- El mapa más votado (si nadie vota, el de la sala)
	local cuenta, mejor, max = {}, P.tema, 0
	for _, t in P.votos do
		cuenta[t] = (cuenta[t] or 0) + 1
		if cuenta[t] > max then
			mejor, max = t, cuenta[t]
		end
	end
	P.tema = mejor
	P.arena = Arenas.bw(P.n, P.tema)
	for plr in P.jug do
		plr:SetAttribute("TemaBW", P.tema)
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
			ctx.Estado:FireClient(plr, "kitBW", { id = J.kit, v = J.kitV, act = Kits.POR_ID[J.kit] and Kits.POR_ID[J.kit].act or false })
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
				local mult = MULT_FORJA[f + 1] * P.multGen
				-- Kit Imán: el generador de su equipo da más hierro
				local iman = 0
				for _, Jo in P.jug do
					if Jo.equipo == g.equipo and Jo.kit == "iman" and Jo.vivo and not Jo.espectador then
						iman = math.max(iman, Jo.kitV.extra or 0)
					end
				end
				g.tH += dt * mult * (1 + iman / 100)
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
			g.t += dt * P.multGen
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
	-- Atascado contra algo (un árbol, una tienda, un muro): lo rodea por un lado un momento
	local b = m.bw
	local dt = b.dt or 1 / 60
	b.atascoT = (b.atascoT or 0) + dt
	if b.atascoT >= 0.8 then
		local mov = b.atascoPos and math.sqrt((m.x - b.atascoPos[1]) ^ 2 + (m.z - b.atascoPos[2]) ^ 2) or 1
		if mov < 0.35 and not b.rodeo then
			b.rodeo = { lado = math.random() < 0.5 and -1 or 1, t = 1.2 + math.random() * 0.8 }
		end
		b.atascoT = 0
		b.atascoPos = { m.x, m.z }
	end
	if b.rodeo then
		b.rodeo.t -= dt
		local a = math.rad(80) * b.rodeo.lado
		ux, uz = ux * math.cos(a) - uz * math.sin(a), ux * math.sin(a) + uz * math.cos(a)
		if b.rodeo.t <= 0 then
			b.rodeo = nil
		end
	end
	m.yawObj = math.atan2(ux, uz)
	-- Tender puente: si delante no hay suelo (un escalón de bajada no cuenta), pone lana de su equipo
	local nx, nz, ny = math.floor(m.x + ux * 0.8), math.floor(m.z + uz * 0.8), math.floor(m.y - 0.5)
	local Mundo = ctx.Mundo
	local function hueco(x, z)
		for dy = 0, 3 do
			if Registro.SOLIDO[Mundo.get(x, ny - dy, z)] then
				return false
			end
		end
		return true
	end
	if m.suelo and hueco(nx, nz) and hueco(math.floor(m.x + ux * 0.4), math.floor(m.z + uz * 0.4)) then
		if not puente or m.bw.lana <= 0 then
			m.mover = false
			if m.bw.lana <= 0 and m.bw.estado == "atacar" then
				m.bw.estado = "recolectar"
				m.bw.t = 15
			end
			-- Sin lana y lejos de casa: saca la de reserva para poder volver (si no, se quedaría ahí para siempre)
			b.bordeT = (b.bordeT or 0) + dt
			if b.bordeT > 4 and b.lana <= 0 then
				b.lana = 16
				b.bordeT = 0
			end
			return d
		end
		b.bordeT = 0
		m.bw.colocarT = (m.bw.colocarT or 0) - dt
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
	b.dt = dt
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
	if m.congelado and os.clock() < m.congelado then
		vel *= 0.5
	end
	local casa = { x = E.isla[1] + 0.5, z = E.isla[2] + 0.5 }
	if math.sqrt((m.x - casa.x) ^ 2 + (m.z - casa.z) ^ 2) < 7 then
		comprasBot(m)
	end
	-- ¿Hay enemigos cerca? A pelear (si ya está junto a la cama que va a romper, solo se defiende de los que tiene encima)
	local obj, dmin = nil, b.rol == "defensor" and 11 or 8
	local camaObj = b.estado == "atacar" and b.objetivo and P.eqs[b.objetivo] and P.eqs[b.objetivo].cama and P.camas[b.objetivo]
	if camaObj and math.sqrt((camaObj.x + 0.5 - m.x) ^ 2 + (camaObj.z + 0.5 - m.z) ^ 2) < 6 then
		dmin = 2
	end
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
				local so = ctx.estados[obj.plr]
				if so and b.kit == "piro" then
					so.fuego = math.max(so.fuego or 0, 3)
				elseif so and b.kit == "escarcha" then
					so.efectos.lentitud = { t = 2, n = 3 }
					ctx.enviarJugador(obj.plr)
				end
				if b.kit == "vampiro" then
					m.vida = math.min(m.vidaMax, m.vida + dano * 0.25)
				end
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
		moverBot(m, gen.x + (b.slot % 2 == 1 and 0.6 or -0.6), gen.z, vel * 0.8, b.lana > 0)
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
				local protegida = oq.escudoHasta and P.t < oq.escudoHasta
				if not roto and not protegida and esCama(ctx.Mundo.get(c.x, c.y, c.z)) then
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
		if fuente == "jugador" then
			d = Kits.alGolpear(plr, J, { m = m }, d, m.vida, m.vidaMax)
		end
	end
	if b.kit == "tanque" then
		d *= 0.8
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
			for _, par in { { "h", I.lingoteHierro }, { "o", I.lingoteOro }, { "d", I.diamante }, { "e", I.esmeralda } } do
				if b.res[par[1]] > 0 then
					ctx.darOSoltar(porJugador, Registro.pila(par[2], math.min(64, b.res[par[1]])))
				end
			end
			BW.registrarBaja(porJugador, final, Vector3.new(m.x, m.y, m.z), nil)
		end
	elseif asesino then
		asesino.bw.res.h += b.res.h
		asesino.bw.res.o += b.res.o
		hablaBot(asesino, "mata", 0.5)
	end
	local por = causa == "vacio" and "cayó al vacío" or (porJugador and ("fue eliminado por " .. porJugador.Name) or (asesino and ("fue eliminado por " .. asesino.bw.nombre) or "murió"))
	chat(b.nombre .. " " .. por .. (final and ". ¡ELIMINACIÓN FINAL!" or ""), final and "#55ffff" or "#cccccc")
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
	local datos = { espada = math.max(0, b.espada - 1), armadura = b.armadura, rol = b.rol, estado = "recolectar", t = 8 + math.random() * 10, kit = b.kit }
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
-- Torreta de nieve: un gólem de nieve quieto que empuja a los enemigos cercanos
local function ponerTorreta(plr, x, y, z, seg)
	local J = P.jug[plr]
	local m = ctx.Mobs.crear(ctx.Mobs.DEF.golemNieve and "golemNieve" or "golem", x + 0.5, y, z + 0.5)
	if not m then
		return
	end
	m.domado = true
	m.bwAliado = J.equipo
	m.bwVida = seg
	local E = P.eqs[J.equipo].E
	cartel(m.pieza, ("Torreta (%s)"):format(E.nombre), E.col, 1.4)
	m.alHerir = function(mm, d, fuente, quien)
		if quien and P and P.jug[quien] and P.jug[quien].equipo == mm.bwAliado then
			return 0
		end
		return d
	end
	m.control = function(mm, dt)
		mm.mover = false
		mm.vx, mm.vz = 0, 0
		mm.bwVida -= dt
		if not P or P.fin or mm.bwVida <= 0 then
			ctx.Mobs.quitar(mm)
			return
		end
		mm.cdT = (mm.cdT or 0) - dt
		if mm.cdT > 0 then
			return
		end
		local yo = Vector3.new(mm.x, mm.y, mm.z)
		for _, e in BW.enemigosCerca(nil, { equipo = mm.bwAliado }, yo, 8) do
			mm.cdT = 1.5
			mm.yawObj = math.atan2(e.x - mm.x, e.z - mm.z)
			mm.pieza:SetAttribute("dispara", os.clock())
			local dx, dz = e.x - mm.x, e.z - mm.z
			local l = math.max(0.1, math.sqrt(dx * dx + dz * dz))
			local dir = { x = dx / l * 2.2, z = dz / l * 2.2 }
			if e.plr then
				ctx.danar(e.plr, 1, "mob", dir)
			elseif e.m then
				ctx.Mobs.herir(e.m, 1, dir, "aliadoBW")
			end
			for o in P.jug do
				ctx.Estado:FireClient(o, "particulas", Vector3.new(e.x, e.y + 1, e.z) * BS, 0xf0f8ff)
			end
			break
		end
	end
	table.insert(P.aliados, m)
end

-- Enemigos de un equipo cerca de un punto (jugadores y bots): {plr|m, x, y, z}
function BW.enemigosCerca(plr, J, pos, radio)
	local res = {}
	if not P then
		return res
	end
	for o, Jo in P.jug do
		if o ~= plr and Jo.vivo and not Jo.espectador and Jo.equipo and Jo.equipo ~= J.equipo then
			local p = jugadorVivo(o)
			if p and (p - pos).Magnitude < radio then
				table.insert(res, { plr = o, x = p.X, y = p.Y, z = p.Z })
			end
		end
	end
	for _, m in P.bots do
		if not m.muerto and m.bw.equipo ~= J.equipo and (Vector3.new(m.x, m.y, m.z) - pos).Magnitude < radio then
			table.insert(res, { m = m, x = m.x, y = m.y, z = m.z })
		end
	end
	return res
end

-- Bloque donde se pondría algo (el apuntado + la cara), si está libre
local function sitioApuntado(obj)
	if type(obj) ~= "table" or type(obj.n) ~= "table" then
		return nil
	end
	local x, y, z = tonumber(obj.x), tonumber(obj.y), tonumber(obj.z)
	if not (x and y and z) or x % 1 ~= 0 or y % 1 ~= 0 or z % 1 ~= 0 then
		return nil
	end
	local n = { math.clamp(tonumber(obj.n[1]) or 0, -1, 1), math.clamp(tonumber(obj.n[2]) or 0, -1, 1), math.clamp(tonumber(obj.n[3]) or 0, -1, 1) }
	local px, py, pz = x + n[1], y + n[2], z + n[3]
	if ctx.Mundo.get(px, py, pz) ~= 0 or not Registro.SOLIDO[ctx.Mundo.get(px, py - 1, pz)] then
		return nil
	end
	return px, py, pz
end

function BW.usarObjeto(plr, s, p, dir, obj)
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
	elseif id == I.escudoCamaBW then
		local eq = P.eqs[J.equipo]
		local c = P.camas[J.equipo]
		if not eq.cama then
			ctx.aviso(plr, "Ya no tienes cama que proteger")
		elseif (Vector3.new(c.x + 0.5, c.y, c.z + 0.5) - pos).Magnitude > 7 then
			ctx.aviso(plr, "Acércate a tu cama para ponerle el escudo")
		else
			eq.escudoHasta = P.t + 45
			if eq.escudo then
				eq.escudo:Destroy()
			end
			local b = Instance.new("Part")
			b.Name = "EscudoCamaBW"
			b.Shape = Enum.PartType.Ball
			b.Anchored = true
			b.CanCollide = false
			b.CanQuery = false
			b.Material = Enum.Material.ForceField
			b.Color = Color3.fromHex(eq.E.col)
			b.Transparency = 0.3
			b.Size = Vector3.new(4.5, 4.5, 4.5) * BS
			b.Position = Vector3.new((c.x + c.x2) / 2 + 0.5, c.y + 0.5, (c.z + c.z2) / 2 + 0.5) * BS
			b.Parent = workspace
			eq.escudo = b
			chat(("%s ha puesto un escudo en la cama del equipo %s (45 s)"):format(plr.Name, eq.E.nombre), eq.E.col)
			ctx.Estado:FireClient(plr, "sonido", "nivel")
			gastar()
		end
		return true
	elseif id == I.trampolinBW or id == I.minaBW or id == I.torretaBW then
		local x, y, z = sitioApuntado(obj)
		if not x then
			ctx.aviso(plr, "Apunta al suelo para ponerlo")
			return true
		end
		if not BW.puedePoner(plr, x, y, z, B.heno) then
			return true
		end
		if id == I.trampolinBW then
			ponBloque(x, y, z, B.heno)
			P.trampolines = P.trampolines or {}
			P.trampolines[clave(x, y, z)] = true
		elseif id == I.minaBW then
			ponBloque(x, y, z, B.placa)
			table.insert(P.minas, { x = x, y = y, z = z, equipo = J.equipo, dueno = plr })
		else
			ponerTorreta(plr, x, y, z, J.kit == "ingeniero" and J.kitV.dura or 60)
		end
		ctx.Estado:FireClient(plr, "sonido", "poner")
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
	-- Si ya era invisible solo se alarga: lo de antes se guarda una sola vez
	local hasta = os.clock() + seg
	ch:SetAttribute("InvisibleHasta", math.max(ch:GetAttribute("InvisibleHasta") or 0, hasta))
	if ch:GetAttribute("Invisible") then
		return
	end
	ch:SetAttribute("Invisible", true)
	local antes = {}
	for _, o in ch:GetDescendants() do
		if (o:IsA("BasePart") or o:IsA("Decal")) and o.Name ~= "HumanoidRootPart" then
			antes[o] = o.Transparency
			o.Transparency = 1
		elseif o:IsA("BillboardGui") then
			-- La etiqueta con el nombre también se esconde
			antes[o] = o.Enabled
			o.Enabled = false
		end
	end
	task.spawn(function()
		while ch.Parent and os.clock() < (ch:GetAttribute("InvisibleHasta") or 0) do
			task.wait(0.2)
		end
		for o, v in antes do
			if o.Parent then
				if o:IsA("BillboardGui") then
					o.Enabled = v
				else
					o.Transparency = v
				end
			end
		end
		ch:SetAttribute("Invisible", nil)
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
	-- MVP: el que más ha aportado (bajas finales y camas pesan más)
	local mvp, mvpP = nil, 0
	for plr, J in P.jug do
		local pts = J.bajas + J.finales * 2 + J.camas * 3
		if J.equipo and not J.espectador and pts > mvpP then
			mvp, mvpP = plr, pts
		end
	end
	for plr, J in P.jug do
		local gano = ganador ~= nil and J.equipo == ganador
		local jugo = J.equipo ~= nil and not J.espectador
		tituloA(plr, gano and "¡VICTORIA!" or "FIN DE LA PARTIDA", E and ("Gana el equipo " .. E.nombre) or "Empate", gano and "#ffff55" or "#ff5555")
		local xp = 10 + J.bajas * 5 + J.finales * 10 + J.camas * 20 + (gano and 50 or 0)
		J.premioXP = xp
		local perfil = J.perfil
		local nivelAntes = Perfil.nivel(perfil.xp)
		local mon = 0
		local hechas = {}
		if jugo then
			mon = 10 + J.bajas * 5 + J.finales * 10 + J.camas * 25 + (gano and 100 or 0) + (plr == mvp and 25 or 0)
			-- Pases de la tienda (VIP, Monedas x2)
			mon = math.floor(mon * Perfil.multMonedas(plr))
			perfil.monedas += mon
			perfil.xp += xp
			perfil.partidas += 1
			perfil.bajas += J.bajas
			perfil.finales += J.finales
			perfil.camas += J.camas
			perfil.muertes += J.muertes
			if gano then
				perfil.victorias += 1
				perfil.racha += 1
				perfil.mejorRacha = math.max(perfil.mejorRacha, perfil.racha)
			else
				perfil.racha = 0
			end
			for _, m in Perfil.progreso(plr, "partidas", 1) do
				table.insert(hechas, m.texto .. " (+" .. m.premio .. ")")
			end
			if gano then
				for _, m in Perfil.progreso(plr, "victorias", 1) do
					table.insert(hechas, m.texto .. " (+" .. m.premio .. ")")
				end
			end
			Perfil.guardar(plr)
			if gano and ctx.logro then
				ctx.logro(plr, "bedwars")
			end
		end
		local nivel = Perfil.nivel(perfil.xp)
		if ctx.tablaNivel then
			ctx.tablaNivel(plr, nivel)
		end
		ctx.Estado:FireClient(plr, "finBW", {
			gano = gano, jugo = jugo, ganador = E and E.nombre or nil, colGanador = E and E.col or "#aaaaaa",
			bajas = J.bajas, finales = J.finales, camas = J.camas, muertes = J.muertes, tiempo = fmt(P.t), mejorRacha = J.mejorRacha,
			mvp = mvp and mvp.Name or nil, soyMvp = plr == mvp, monedas = mon, totalMonedas = perfil.monedas, xp = xp,
			nivel = nivel, subeNivel = nivel > nivelAntes, progresoNivel = (perfil.xp % 500) / 500, misiones = hechas, racha = perfil.racha,
		})
		if jugo then
			ctx.aviso(plr, ("Recompensa: +%d monedas · +%d de experiencia"):format(mon, xp))
		end
	end
	if mvp then
		chat(("MVP de la partida: %s (%d puntos)"):format(mvp.Name, mvpP), "#ffd84a")
	end
	local partida = P
	task.delay(10, function()
		if P ~= partida then
			return
		end
		local otraVez = {}
		for plr, J in table.clone(P.jug) do
			if J.otraVez then
				table.insert(otraVez, plr)
			end
			BW.salir(plr, true)
		end
		if P then
			quitarMobs()
			BW.anterior = { arena = P.arena, colocados = P.colocados }
			P = nil
		end
		for _, plr in otraVez do
			if plr.Parent and not BW.en(plr) then
				BW.unirse(plr)
			end
		end
	end)
end

------------------------------------------------------------------
-- Kits y efectos de baja final: se compran con monedas (las del perfil guardado)
------------------------------------------------------------------
local EFECTOS = {
	{ id = "ninguno", n = "Sin efecto", p = 0, ico = "espada_madera", d = "No pasa nada especial al eliminar a alguien." },
	{ id = "fuegos", n = "Fuegos artificiales", p = 200, ico = "cohete", d = "Estallan fuegos artificiales de colores donde cae tu víctima." },
	{ id = "corazones", n = "Corazones", p = 250, ico = "corazonMar", d = "Una lluvia de corazones rosas: eliminar con cariño." },
	{ id = "rayo", n = "Rayo", p = 300, ico = "tridente", d = "Cae un rayo del cielo sobre tu víctima." },
	{ id = "fantasma", n = "Alma en pena", p = 350, ico = "pluma", d = "El alma de tu víctima sube flotando al cielo." },
	{ id = "confeti", n = "Confeti", p = 400, ico = "polvora", d = "¡Fiesta! Una explosión de confeti y un sonido de victoria." },
}
BW.EFECTOS = EFECTOS
BW.EFECTOS_N = {}
for _, e in EFECTOS do
	BW.EFECTOS_N[e.id] = e.n
	e.icono = idc(e.ico) or I.esmeralda
end
local ROM_KIT = { "I", "II", "III" }

-- Datos para la ventana de kits: cada tarjeta lleva su rareza, nivel, estado y lo que hace el botón
local function datosKits(plr, s)
	local perfil = Perfil.de(plr)
	local tab = s.ui.tab or 1
	local d = { sub = "kits", nombre = tab == 1 and "KITS" or "EFECTOS DE BAJA FINAL", pestana = tab, ofertas = {},
		pestanas = { { nombre = "Kits", icono = idc("espada_hierro") }, { nombre = "Efectos", icono = idc("cohete") } },
		monedas = { { idc("pepitaOro") or I.lingoteOro, perfil.monedas } } }
	if tab == 1 then
		local gratis = Kits.gratisHoy()
		for _, k in Kits.LISTA do
			local nv = perfil.kits[k.id]
			local equipado = perfil.kit == k.id
			local esGratis = table.find(gratis, k.id) ~= nil
			local R = Kits.RAREZAS[k.r]
			-- estado: equipado | tuyo | gratis | probando | comprar;  accion: lo que pasa al pulsar el botón
			local estado, accion, precio, puede = "comprar", nil, nil, true
			if nv then
				estado = equipado and "equipado" or "tuyo"
				if not equipado then
					accion = "Equipar"
				elseif nv < 3 and k.p > 0 then
					precio = Kits.costeMejora(k.id, nv)
					accion = "Mejorar a " .. ROM_KIT[nv + 1]
					puede = perfil.monedas >= precio
				end
			elseif esGratis and not equipado then
				estado, accion = "gratis", "Probar gratis"
			else
				estado = equipado and "probando" or "comprar"
				accion, precio = "Comprar", k.p
				puede = perfil.monedas >= k.p
			end
			local siguiente = nv and nv < 3 and k.p > 0 and Kits.descripcion(k.id, nv + 1) or nil
			table.insert(d.ofertas, {
				id = k.icono, nombre = k.n, rareza = R[1], col = R[2], nivel = (k.p > 0 and nv) or 0, maxNivel = k.p > 0 and 3 or 0,
				estado = estado, accion = accion, precio = precio, puede = puede, habilidad = k.act == true, nuevo = k.nuevo == true,
				desc = Kits.descripcion(k.id, nv or 1), siguiente = siguiente,
			})
		end
		d.pie = "Kits gratis hoy: " .. table.concat((function()
			local t = {}
			for _, id in gratis do
				table.insert(t, Kits.POR_ID[id].n)
			end
			return t
		end)(), ", ")
	else
		for _, e in EFECTOS do
			local tiene = perfil.efectos[e.id] == true
			local equipado = perfil.efecto == e.id
			table.insert(d.ofertas, {
				id = e.icono, nombre = e.n, rareza = e.p == 0 and "Básico" or "Efecto", col = e.p == 0 and "#9aa4b4" or "#ff7ad9", nivel = 0, maxNivel = 0,
				estado = equipado and "equipado" or (tiene and "tuyo" or "comprar"), accion = (not equipado) and (tiene and "Equipar" or "Comprar") or nil,
				precio = (not tiene) and e.p or nil, puede = tiene or perfil.monedas >= e.p, desc = e.d,
			})
		end
		d.pie = "Se ven cuando consigues una baja final"
	end
	return d
end

-- El kit nuevo se usa en la sala (si la partida ya empezó, en la siguiente)
local function equiparKit(plr, id)
	local perfil = Perfil.de(plr)
	perfil.kit = id
	local J = P and P.jug[plr]
	if J and P.fase == "sala" then
		J.kit = id
		J.kitV = Kits.valores(id, Kits.nivelDe(perfil, id))
	elseif J then
		ctx.aviso(plr, "Tendrás el kit nuevo en la próxima partida")
	end
end

local function comprarKit(plr, s, i)
	local perfil = Perfil.de(plr)
	local tab = s.ui.tab or 1
	local function falta()
		ctx.Estado:FireClient(plr, "sonido", "rompeHerr")
		ctx.aviso(plr, "Te faltan monedas: juega partidas y completa misiones para ganar más")
	end
	if tab == 1 then
		local k = Kits.LISTA[i]
		if not k then
			return
		end
		local nv = perfil.kits[k.id]
		local equipado = perfil.kit == k.id
		if nv then
			if not equipado then
				equiparKit(plr, k.id)
				ctx.aviso(plr, "Kit equipado: " .. k.n)
			elseif nv < 3 and k.p > 0 then
				local c = Kits.costeMejora(k.id, nv)
				if perfil.monedas < c then
					falta()
					return
				end
				perfil.monedas -= c
				perfil.kits[k.id] = nv + 1
				equiparKit(plr, k.id)
				tituloA(plr, "", ("%s mejorado a nivel %s"):format(k.n, ROM_KIT[nv + 1]), "#ffd84a")
			end
		elseif table.find(Kits.gratisHoy(), k.id) and not equipado then
			equiparKit(plr, k.id)
			ctx.aviso(plr, "Pruebas gratis el kit " .. k.n .. " (solo hoy). Clic otra vez para comprarlo.")
		else
			if perfil.monedas < k.p then
				falta()
				return
			end
			perfil.monedas -= k.p
			perfil.kits[k.id] = 1
			equiparKit(plr, k.id)
			tituloA(plr, "¡KIT NUEVO!", k.n, Kits.RAREZAS[k.r][2])
		end
	else
		local e = EFECTOS[i]
		if not e then
			return
		end
		if not perfil.efectos[e.id] then
			if perfil.monedas < e.p then
				falta()
				return
			end
			perfil.monedas -= e.p
			perfil.efectos[e.id] = true
		end
		perfil.efecto = e.id
		ctx.aviso(plr, "Efecto de baja final: " .. e.n)
	end
	ctx.Estado:FireClient(plr, "sonido", "xp")
	Perfil.guardar(plr)
end

local function abrirKits(plr, s, tab)
	s.ui = {
		tipo = "extra", sub = "kits", tab = tab or 1, datos = datosKits, comprar = comprarKit,
		pestana = function(_, so, i)
			if i == 1 or i == 2 then
				so.ui.tab = i
			end
		end,
	}
	ctx.enviarUI(plr)
end

-- Espectadores: la cámara sigue a un jugador vivo (o a un bot)
local function espectar(plr, J)
	local lista = {}
	for o, Jo in P.jug do
		if o ~= plr and Jo.vivo and not Jo.espectador and o.Character then
			table.insert(lista, o)
		end
	end
	if #lista == 0 then
		ctx.Estado:FireClient(plr, "espectar", nil)
		ctx.aviso(plr, "No hay nadie a quien mirar")
		return
	end
	table.sort(lista, function(a, b)
		return a.Name < b.Name
	end)
	local i = table.find(lista, J.mirando) or 0
	J.mirando = lista[i % #lista + 1]
	ctx.Estado:FireClient(plr, "espectar", J.mirando.Character)
	ctx.aviso(plr, "Miras a " .. J.mirando.Name)
end

function BW.comando(plr, cmd, arg)
	local J = P and P.jug[plr]
	local s = ctx.estados[plr]
	if not J or not s then
		return
	end
	if cmd == "votar" and P.fase == "sala" and type(arg) == "number" then
		local t = Arenas.ORDEN_TEMAS_BW[math.floor(arg)]
		if t then
			P.votos[plr] = t
			ctx.aviso(plr, "Has votado por " .. Arenas.TEMAS_BW[t].nombre)
		end
	elseif cmd == "kits" then
		abrirKits(plr, s, 1)
	elseif cmd == "efectos" then
		abrirKits(plr, s, 2)
	elseif cmd == "habilidad" then
		if P.fase == "juego" and J.vivo and not J.espectador and jugadorVivo(plr) then
			local msg = Kits.habilidad(plr, s, J)
			if msg then
				ctx.aviso(plr, msg)
			end
		end
	elseif cmd == "espectar" then
		if J.espectador or not J.vivo or P.fase ~= "juego" then
			espectar(plr, J)
		end
	elseif cmd == "otraVez" and P.fin then
		-- Al cerrar la partida vuelve a entrar en la siguiente
		J.otraVez = true
	elseif cmd == "dejarEspectar" then
		J.mirando = nil
		ctx.Estado:FireClient(plr, "espectar", nil)
	end
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
	plr:SetAttribute("TemaBW", P.tema)
	if P.fase ~= "sala" then
		J.espectador = true
		J.vivo = false
		ctx.aviso(plr, "Hay una partida en curso: la verás desde la sala y entrarás en la siguiente.")
	end
	local sala = P.arena.sala
	task.spawn(ctx.teletransportar, plr, sala.x, sala.y, sala.z, "Bed Wars")
	tituloA(plr, "BED WARS", P.fase == "sala" and "Esperando jugadores…" or "Partida en curso", "#ff5555")
	if P.fase == "sala" then
		ctx.aviso(plr, "Vota el mapa y elige tu kit en el panel de la derecha")
	end
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
	plr:SetAttribute("EquipoBW", nil)
	plr:SetAttribute("ColorBW", nil)
	plr:SetAttribute("EspectadorBW", nil)
	plr:SetAttribute("TemaBW", nil)
	ctx.Estado:FireClient(plr, "panel", nil)
	ctx.Estado:FireClient(plr, "kitBW", nil)
	ctx.Estado:FireClient(plr, "espectar", nil)
	ctx.Estado:FireClient(plr, "feed", nil)
	if not fin then
		ctx.Estado:FireClient(plr, "finBW", nil)
	end
	Perfil.guardar(plr)
	if J.premioXP and ctx.ganarXP then
		ctx.ganarXP(plr, J.premioXP)
	end
	if plr.Parent then
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

-- Nivel de Bed Wars (estrellas) para la tabla de jugadores
function BW.nivelJugador(plr)
	return Perfil.nivel(Perfil.de(plr).xp)
end

-- Lo que enseña la tarjeta del jugador en el menú
function BW.perfilMenu(plr)
	local p = Perfil.de(plr)
	local disponible, racha, premio = Perfil.diaria(plr)
	return {
		nivel = Perfil.nivel(p.xp), xp = p.xp % 500, monedas = p.monedas, victorias = p.victorias, partidas = p.partidas,
		diaria = disponible, racha = racha, premio = premio, colorNivel = Perfil.colorNivel(Perfil.nivel(p.xp)),
		vip = plr:GetAttribute("VIP") == true, mult = Perfil.multMonedas(plr),
	}
end
function BW.reclamarDiaria(plr)
	return Perfil.reclamarDiaria(plr)
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
		local pos = jugadorVivo(plr) or (s and s.ultimaPos and s.ultimaPos / BS)
		BW.registrarBaja(g.plr, final, pos, plr)
	elseif s and s.ultimaCausa == "vacio" then
		por = plr.Name .. " cayó al vacío"
	else
		por = plr.Name .. " murió"
	end
	chat(por .. (final and ". ¡ELIMINACIÓN FINAL!" or ""), final and "#55ffff" or "#ffffff")
	cortarRacha(J, g and g.plr)
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
	return Kits.modDanoRecibido(J, n)
end

-- Golpe entre jugadores: efectos de los kits (devuelve el daño final)
function BW.golpePvp(a, b, dano)
	local Ja = P and P.jug[a]
	if not Ja then
		return dano
	end
	local h = b.Character and b.Character:FindFirstChildOfClass("Humanoid")
	return Kits.alGolpear(a, Ja, { plr = b }, dano, h and h.Health or 20, h and h.MaxHealth or 20)
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
			if P.eqs[k].escudoHasta and P.t < P.eqs[k].escudoHasta then
				ctx.aviso(plr, "¡Esa cama tiene un escudo! Espera a que se acabe")
				return false
			end
			J.camas += 1
			romperCama(k, plr.Name)
			BW.misiones(plr, "camas", 1)
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
------------------------------------------------------------------
-- Momentos de caos (cada 2,5-3,5 minutos)
------------------------------------------------------------------
local CAOS = {
	{ k = "meteoritos", n = "Lluvia de meteoritos", d = "¡Cuidado con lo que cae del cielo!", seg = 25, col = "#ff7733" },
	{ k = "oro", n = "Fiebre del oro", d = "Los generadores van al doble de rápido", seg = 45, col = "#ffd84a" },
	{ k = "gravedad", n = "Gravedad baja", d = "Todos saltan mucho más alto", seg = 30, col = "#88ddff" },
	{ k = "cofre", n = "Cofre del cielo", d = "Ha caído un cofre con botín raro en el centro", seg = 0, col = "#ff77dd" },
}
BW.CAOS = CAOS

local function botinCofreCielo()
	local c = table.create(27, false)
	local opciones = {
		{ I.diamante, 4 }, { I.esmeralda, 3 }, { idc("espada_diamante"), 1 }, { I.manzanaDorada, 2 }, { I.perlaEnder, 2 },
		{ 714, 3 }, { I.globoBW, 1 }, { I.escudoCamaBW, 1 }, { I.torretaBW, 1 }, { 716, 1 }, { B.obsidiana, 8 },
	}
	for i = #opciones, 2, -1 do
		local j = math.random(1, i)
		opciones[i], opciones[j] = opciones[j], opciones[i]
	end
	for k = 1, 6 do
		local o = opciones[k]
		if o[1] then
			c[k * 4 - 2] = Registro.pila(o[1], o[2])
		end
	end
	return c
end

local function empezarCaos(C)
	P.caos = { k = C.k, fin = P.t + C.seg, C = C }
	sonidoTodos("nivel")
	tituloTodos(C.n:upper(), C.d, C.col)
	chat("☄ " .. C.n .. ": " .. C.d, C.col)
	if C.k == "oro" then
		P.multGen = 2
	elseif C.k == "cofre" then
		-- Cae un cofre en lo alto del centro (con un bloque de luz que baja del cielo)
		local cx, cz = P.arena.centro.x + 3, P.arena.centro.z
		local y = BW_Y + 4
		local caja = Instance.new("Part")
		caja.Name = "CofreCieloBW"
		caja.Anchored = true
		caja.CanCollide = false
		caja.CanQuery = false
		caja.Material = Enum.Material.Neon
		caja.Color = Color3.fromRGB(255, 120, 220)
		caja.Size = Vector3.new(1, 1, 1) * BS
		caja.Position = Vector3.new(cx + 0.5, y + 40, cz + 0.5) * BS
		caja.Parent = workspace
		local partida = P
		task.spawn(function()
			for k = 1, 40 do
				caja.Position = Vector3.new(cx + 0.5, y + 40 - k, cz + 0.5) * BS
				task.wait(0.05)
			end
			caja:Destroy()
			if P ~= partida or P.fin then
				return
			end
			ctx.Mundo.set(cx, y, cz, B.cofre)
			P.colocados[clave(cx, y, cz)] = true
			Cont.cofres[Cont.clave(cx, y, cz)] = botinCofreCielo()
			P.cofreCielo = { x = cx, y = y, z = cz, abierto = false }
			for o in P.jug do
				ctx.Estado:FireClient(o, "explosion", Vector3.new(cx + 0.5, y + 0.5, cz + 0.5) * BS, 0.5)
			end
		end)
	end
end

local function terminarCaos()
	local c = P.caos
	P.caos = nil
	if c.k == "oro" then
		P.multGen = 1
	end
end

local function actualizarCaos(dt)
	-- Aviso 10 s antes y comienzo
	P.caosT -= dt
	if not P.caos and P.caosT <= 10 and not P.caosAvisado then
		P.caosAvisado = CAOS[math.random(1, #CAOS)]
		chat(("En 10 s: %s"):format(P.caosAvisado.n), P.caosAvisado.col)
	end
	if not P.caos and P.caosT <= 0 and P.caosAvisado then
		empezarCaos(P.caosAvisado)
		P.caosAvisado = nil
		P.caosT = 150 + math.random() * 60
	end
	local c = P.caos
	if c then
		if c.k == "meteoritos" then
			P.meteoT = (P.meteoT or 0) - dt
			if P.meteoT <= 0 then
				P.meteoT = 1.2
				-- Sobre una isla de un equipo vivo o sobre el centro
				local destinos = { P.arena.centro }
				for _, q in P.eqs do
					if q.cama or q.vivos > 0 then
						table.insert(destinos, { x = q.E.isla[1], z = q.E.isla[2] })
					end
				end
				local d = destinos[math.random(1, #destinos)]
				local x, z = d.x + (math.random() - 0.5) * 14, d.z + (math.random() - 0.5) * 14
				ctx.Entidades.disparar("bolaGhast", x, BW_Y + 38, z, Vector3.new((math.random() - 0.5) * 0.2, -1, (math.random() - 0.5) * 0.2).Unit, 16, {})
			end
		elseif c.k == "gravedad" then
			for plr, J in P.jug do
				local so = ctx.estados[plr]
				if so and J.vivo and not J.espectador then
					so.efectos.salto = { t = 2, n = 4 }
				end
			end
		end
		if c.fin and P.t >= c.fin and c.k ~= "cofre" then
			terminarCaos()
			chat("Se acabó: " .. c.C.n, "#aaaaaa")
		elseif c.k == "cofre" then
			-- El primero que lo abre se lleva la misión
			local cc = P.cofreCielo
			if cc and not cc.abierto then
				for plr, J in P.jug do
					local so = ctx.estados[plr]
					if so and so.ui and so.ui.tipo == "cofre" and so.ui.x == cc.x and so.ui.y == cc.y and so.ui.z == cc.z then
						cc.abierto = true
						chat(("%s ha abierto el cofre del cielo"):format(plr.Name), J.equipo and P.eqs[J.equipo].E.col or "#ff77dd")
						BW.misiones(plr, "cofres", 1)
						terminarCaos()
						break
					end
				end
			end
			if P.caos and P.t > (c.inicio or P.t) + 120 then
				terminarCaos()
			end
			c.inicio = c.inicio or P.t
		end
	end
end

-- Objetos y kits que funcionan solos: globo salvavidas, trampolines, minas, escudos y kits
local function actualizarObjetos(dt)
	for plr, J in P.jug do
		local s = ctx.estados[plr]
		local pos, h, r
		if J.vivo and not J.espectador and s then
			pos = jugadorVivo(plr)
			h = plr.Character and plr.Character:FindFirstChildOfClass("Humanoid")
			r = plr.Character and plr.Character:FindFirstChild("HumanoidRootPart")
		end
		if pos and h and r and not r.Anchored then
			Kits.tick(plr, s, J, dt)
			-- Globo salvavidas: al caer por debajo de las islas te lleva a casa
			if pos.Y < BW_Y - 10 and contarInv(s, I.globoBW) > 0 and not J.globoT then
				quitarInv(s, I.globoBW, 1)
				J.globoT = true
				local E = P.eqs[J.equipo].E
				tituloA(plr, "", "¡Globo salvavidas!", "#88ddff")
				chat(("%s se ha salvado con un globo"):format(plr.Name), E.col)
				task.spawn(function()
					ctx.teletransportar(plr, E.isla[1] + 0.5, BW_Y + 1, E.isla[2] + 0.5)
					J.globoT = nil
				end)
				ctx.enviarJugador(plr)
			end
			-- Trampolín bajo los pies
			local bx, by, bz = math.floor(pos.X), math.floor(pos.Y - 0.1), math.floor(pos.Z)
			if P.trampolines and P.trampolines[clave(bx, by, bz)] and (J.trampT or 0) < os.clock() then
				if ctx.Mundo.get(bx, by, bz) == B.heno then
					J.trampT = os.clock() + 0.8
					ctx.Estado:FireClient(plr, "impulso", "trampolin", 22)
				else
					P.trampolines[clave(bx, by, bz)] = nil
				end
			end
		end
	end
	-- Minas: explotan si las pisa un enemigo
	for i = #P.minas, 1, -1 do
		local mi = P.minas[i]
		if ctx.Mundo.get(mi.x, mi.y, mi.z) ~= B.placa then
			table.remove(P.minas, i)
		else
			local enemigos = BW.enemigosCerca(nil, { equipo = mi.equipo }, Vector3.new(mi.x + 0.5, mi.y, mi.z + 0.5), 1.1)
			if #enemigos > 0 then
				table.remove(P.minas, i)
				ponBloque(mi.x, mi.y, mi.z, 0)
				for _, e in enemigos do
					if e.plr then
						local Je = P.jug[e.plr]
						if Je then
							Je.ultimoGolpe = { plr = mi.dueno, t = ahora() }
						end
						ctx.danar(e.plr, 6, "explosion", { x = 0, z = 0 })
						ctx.Estado:FireClient(e.plr, "impulso", "salto", 14)
					elseif e.m then
						e.m.bw.ultimoGolpe = { plr = mi.dueno, t = ahora() }
						ctx.Mobs.herir(e.m, 6, { x = 0, z = 0 }, "explosion")
						e.m.vy = 12
					end
				end
				for o in P.jug do
					ctx.Estado:FireClient(o, "explosion", Vector3.new(mi.x + 0.5, mi.y + 0.5, mi.z + 0.5) * BS, 1.5)
				end
			end
		end
	end
	-- Escudos de cama que se acaban
	for _, q in P.eqs do
		if q.escudo and (not q.escudoHasta or P.t >= q.escudoHasta) then
			q.escudo:Destroy()
			q.escudo = nil
			chat(("El escudo de la cama del equipo %s se ha acabado"):format(q.E.nombre), q.E.col)
		end
	end
	-- Muerte súbita: el vacío sube poco a poco
	if P.ev > 5 then
		P.vacio = math.min(BW_Y - 4, P.vacio + dt * 0.12)
	end
end

local function panel(plr, J)
	local L, Bt = {}, {}
	local function linea(t, c)
		table.insert(L, { t = t, c = c or "#ffffff" })
	end
	local perfil = J.perfil
	local nivel = Perfil.nivel(perfil.xp)
	local kitD = Kits.POR_ID[J.kit] or Kits.POR_ID.ninguno
	if P.fase == "sala" then
		local n = 0
		for _ in P.jug do
			n += 1
		end
		linea(("Empieza en %d"):format(math.ceil(P.lobby)), "#55ff55")
		linea(("Jugadores: %d (el resto, bots)"):format(n))
		linea(("Nivel %d★ · %d/500 xp"):format(nivel, perfil.xp % 500), Perfil.colorNivel(nivel))
		local mult = Perfil.multMonedas(plr)
		linea(("Monedas: %d%s"):format(perfil.monedas, mult > 1 and (" · ganas x%s"):format(tostring(mult)) or ""), "#ffd84a")
		linea(("Victorias: %d · Racha: %d"):format(perfil.victorias, perfil.racha), "#aaaaaa")
		linea("")
		linea("Misiones de hoy:", "#ffd84a")
		for _, m in Perfil.misiones(plr) do
			linea(m.hecha and ("✔ " .. m.texto) or ("· %s (%d/%d) +%d"):format(m.texto, m.progreso, m.meta, m.premio), m.hecha and "#55ff55" or "#dddddd")
		end
		-- Votación de mapa
		local cuenta = {}
		for _, t in P.votos do
			cuenta[t] = (cuenta[t] or 0) + 1
		end
		for i, t in Arenas.ORDEN_TEMAS_BW do
			local c = cuenta[t] or 0
			table.insert(Bt, { t = Arenas.TEMAS_BW[t].nombre, sub = ("%d %s"):format(c, c == 1 and "voto" or "votos"), cmd = "votar", arg = i, activo = P.votos[plr] == t })
		end
		table.insert(Bt, { t = "Kits", sub = ("%s · %s"):format(kitD.n, Kits.RAREZAS[kitD.r][1]), cmd = "kits" })
		table.insert(Bt, { t = "Efectos", sub = (BW.EFECTOS_N[perfil.efecto] or "Sin efecto"), cmd = "efectos" })
		if ctx.robux and ctx.robux("monedas1200") then
			table.insert(Bt, { t = "★ Tienda", sub = mult > 1 and "Pases y monedas" or "VIP: +50 % de monedas", cmd = "tienda", arg = "destacado", activo = true })
		end
	else
		local ev = BW.EVENTOS[P.ev]
		if ev then
			linea(("%s en %s"):format(ev[2], fmt(ev[1] - P.t)))
		end
		if P.caos then
			linea("☄ " .. P.caos.C.n .. (P.caos.k ~= "cofre" and (" · " .. fmt(math.max(0, P.caos.fin - P.t))) or ""), P.caos.C.col)
		elseif P.caosAvisado then
			linea(("☄ %s en %d s"):format(P.caosAvisado.n, math.ceil(math.max(0, P.caosT))), P.caosAvisado.C and P.caosAvisado.C.col or P.caosAvisado.col)
		end
		linea("")
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
		linea("")
		linea(("Bajas: %d · Finales: %d"):format(J.bajas, J.finales))
		linea(("Camas rotas: %d"):format(J.camas))
		if J.racha >= 2 then
			linea(("Racha: %d seguidas"):format(J.racha), "#ffaa00")
		end
		if J.kit ~= "ninguno" then
			linea("Kit: " .. kitD.n, Kits.RAREZAS[kitD.r][2])
		end
		if kitD.act and J.vivo and not J.espectador then
			local falta = (J.habilidadT or 0) - os.clock()
			table.insert(Bt, { t = "Habilidad (G)", sub = falta > 0 and ("Lista en %d s"):format(math.ceil(falta)) or "¡Lista!", cmd = "habilidad", activo = falta <= 0 })
		end
		if J.espectador or not J.vivo then
			table.insert(Bt, { t = "Mirar a otro", sub = J.mirando and J.mirando.Parent and ("Miras a " .. J.mirando.Name) or "Cámara de espectador", cmd = "espectar" })
		end
	end
	ctx.Estado:FireClient(plr, "panel", { titulo = "BED WARS", lineas = L, botones = Bt })
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
				if y < P.vacio and not J.globoT then
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
				chat("MUERTE SÚBITA > ¡El vacío empieza a subir!", "#ff5555")
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
		actualizarCaos(dt)
		actualizarObjetos(dt)
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
	Kits.iniciar({
		estados = c.estados, danar = c.danar, Mobs = c.Mobs, Entidades = c.Entidades, Estado = c.Estado, aviso = c.aviso,
		darOSoltar = c.darOSoltar, enviarJugador = c.enviarJugador, pies = jugadorVivo,
		jugador = function(p)
			return P and P.jug[p]
		end,
		enemigosCerca = BW.enemigosCerca, invisible = BW.invisible,
	})
	-- Después de que Modos lo saque de la partida, se guarda el perfil y se olvida
	game:GetService("Players").PlayerRemoving:Connect(function(plr)
		task.defer(Perfil.olvidar, plr)
	end)
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
