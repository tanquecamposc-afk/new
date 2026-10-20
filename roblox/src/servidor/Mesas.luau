--[[
	Blockverse para Roblox · Mesas y comercio (servidor)
	Las mesas que faltaban, con las fórmulas del juego web:
	· Mesa de encantamientos (encantamientos.js): tres opciones según las
	  librerías alrededor, gasta 1-3 niveles y lapislázuli; un libro pasa
	  a libro encantado.
	· Yunque: reparar con el material, juntar dos objetos iguales y
	  pasar encantamientos de libros u objetos, con penalización por uso.
	· Afiladora: quita los encantamientos (no las maldiciones) y devuelve
	  experiencia, o une dos objetos iguales sumando su durabilidad.
	· Mesa de herrería: plantilla + objeto de diamante + lingote de
	  netherite.
	· Soporte para pociones: agua + verruga = poción rara, y de ahí las
	  pociones (azúcar, rodaja reluciente, polvo de blaze, lágrima de
	  ghast, crema de magma) y con pólvora las arrojadizas. Gasta polvo de
	  blaze (20 usos) y tarda 20 s.
	· Aldeanos (aldeanos.js): 13 profesiones con ofertas por nivel
	  (novato → maestro) que suben al comerciar, y bibliotecarios con
	  libros encantados. Se reabastecen cada cierto tiempo.
]]
local RunService = game:GetService("RunService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Comp = ReplicatedStorage:WaitForChild("Blockverse")
local Registro = require(Comp.Registro)
local Enc = require(Comp.Encantamientos)
local Mundo = require(script.Parent.Mundo)
local Inv = require(script.Parent.Inventario)
local Entidades = require(script.Parent.Entidades)

local OB, BL = Registro.objetos, Registro.bloques
local B, I = Registro.B, Registro.I
local floor, min, max = math.floor, math.min, math.max

local Mesas = {}
local ctx -- {enviarUI, enviarJugador, sonido, aviso, supervivencia, darOSoltar}

local function copia(p)
	if not p then
		return false
	end
	local q = { id = p.id, n = p.n, dur = p.dur, rep = p.rep }
	if p.enc then
		q.enc = table.clone(p.enc)
	end
	return q
end
local function contar(t)
	local n = 0
	for _ in t do
		n += 1
	end
	return n
end

------------------------------------------------------------------
-- Encantamientos
------------------------------------------------------------------
local function contarLibrerias(x, y, z)
	local n = 0
	for dx = -2, 2 do
		for dz = -2, 2 do
			if max(math.abs(dx), math.abs(dz)) ~= 2 then
				continue
			end
			for dy = 0, 1 do
				local mx, mz = math.sign(dx), math.sign(dz)
				if Mundo.get(x + dx, y + dy, z + dz) == B.estanteria
					and Mundo.get(x + (math.abs(dx) == 2 and mx or 0), y + dy, z + (math.abs(dz) == 2 and mz or 0)) == 0 then
					n += 1
				end
			end
		end
	end
	return min(15, n)
end

------------------------------------------------------------------
-- Yunque y afiladora
------------------------------------------------------------------
local MAT_REPARA_HERR = { "tablones", "roca", "lingoteHierro", "lingoteOro", "diamante", 535, "lingoteCobre" }
local MAT_REPARA_ARM = { "cuero", "lingoteOro", "lingoteHierro", "diamante", 535, "lingoteCobre" }
local function idDe(k)
	if type(k) == "number" then
		return k
	end
	return I[k] or B[k] or 0
end
local function materialReparacion(id)
	if id == 597 then
		return B.tablones
	end
	if id == 611 or id == 612 or id == 613 then
		return 0
	end
	local o = OB[id]
	if not o then
		return 0
	end
	if o.elitros then
		return I.cuero
	end
	if id == 540 then
		return 539
	end
	if o.herr then
		return idDe(MAT_REPARA_HERR[(o.herr.mat or 0) + 1])
	end
	if o.armadura then
		return idDe(MAT_REPARA_ARM[(o.armadura.mat or 0) + 1])
	end
	return 0
end

function Mesas.resultadoYunque(a, b)
	if not a or not b then
		return nil
	end
	local it = OB[a.id]
	if not it or (not it.dur and a.id ~= 546) then
		return nil
	end
	local out = copia(a)
	local penal = (bit32.lshift(1, a.rep or 0) - 1) + (bit32.lshift(1, b.rep or 0) - 1)
	local coste, cambia, usa = 0, false, 1
	if it.dur and b.id == materialReparacion(a.id) then
		if a.dur >= it.dur then
			return nil
		end
		local q = max(1, floor(it.dur / 4))
		usa = min(b.n, math.ceil((it.dur - a.dur) / q))
		out.dur = min(it.dur, a.dur + q * usa)
		coste = usa
		cambia = true
	else
		if b.id ~= a.id and b.id ~= 546 then
			return nil
		end
		if it.dur and b.id == a.id and a.dur < it.dur then
			out.dur = min(it.dur, a.dur + (b.dur or 0) + floor(it.dur * 0.12))
			coste += 2
			cambia = true
		end
		if b.enc then
			out.enc = out.enc or {}
			local libro = b.id == 546
			for k, l in b.enc do
				local vale = a.id == 546 or Enc.admite(k, a.id)
				local choca = false
				for o in out.enc do
					if o ~= k and Enc.conflicto(o, k) then
						choca = true
					end
				end
				if not vale or choca then
					coste += 1
					continue
				end
				local act = out.enc[k] or 0
				local d = Enc.POR_CLAVE[k]
				local nv = act == l and min(d.max, act + 1) or max(act, l)
				if nv ~= act then
					out.enc[k] = nv
					cambia = true
				end
				coste += nv * max(1, libro and Enc.multRareza(k) / 2 or Enc.multRareza(k))
			end
			if contar(out.enc) == 0 then
				out.enc = nil
			end
		end
	end
	if not cambia then
		return nil
	end
	out.rep = max(a.rep or 0, b.rep or 0) + 1
	return { pila = out, coste = coste + penal, usa = usa }
end

local function soloMaldiciones(enc)
	if not enc then
		return nil
	end
	local o = {}
	for k, l in enc do
		if Enc.POR_CLAVE[k] and Enc.POR_CLAVE[k].maldicion then
			o[k] = l
		end
	end
	return contar(o) > 0 and o or nil
end
local function xpDeEncantos(enc)
	local s = 0
	for k, l in enc or {} do
		if not (Enc.POR_CLAVE[k] and Enc.POR_CLAVE[k].maldicion) then
			s += Enc.costeMin(k, l)
		end
	end
	return s
end
function Mesas.resultadoAfiladora(a, b)
	if a and b then
		local it = OB[a.id]
		if a.id ~= b.id or not it or not it.dur or a.id == 546 then
			return nil
		end
		local dur = min(it.dur, (a.dur or it.dur) + (b.dur or it.dur) + floor(it.dur * 0.05))
		local enc = {}
		for k, l in soloMaldiciones(b.enc) or {} do
			enc[k] = l
		end
		for k, l in soloMaldiciones(a.enc) or {} do
			enc[k] = l
		end
		return { pila = { id = a.id, n = 1, dur = dur, enc = contar(enc) > 0 and enc or nil }, xp = xpDeEncantos(a.enc) + xpDeEncantos(b.enc) }
	end
	local p = a or b
	if not p or not p.enc then
		return nil
	end
	local quedan = soloMaldiciones(p.enc)
	if quedan and contar(quedan) == contar(p.enc) then
		return nil
	end
	local out = copia(p)
	out.enc = quedan
	out.rep = nil
	if p.id == 546 and not quedan then
		out.id = 248
		out.enc = nil
	end
	return { pila = out, xp = xpDeEncantos(p.enc) }
end

------------------------------------------------------------------
-- Herrería
------------------------------------------------------------------
local function mejoraNetherite(id)
	local o = OB[id]
	if not o then
		return 0
	end
	if o.herr and o.herr.mat == 4 then
		return id + 1
	end
	if o.armadura and o.armadura.mat == 3 and not o.elitros then
		return id + 1
	end
	return 0
end
function Mesas.resultadoHerreria(sl)
	local p, o, m = sl[1], sl[2], sl[3]
	if not p or not o or not m or p.id ~= 533 or m.id ~= 535 then
		return nil
	end
	local n = mejoraNetherite(o.id)
	if n == 0 or not OB[n] then
		return nil
	end
	local dano = (OB[o.id].dur or 0) - (o.dur or 0)
	return { id = n, n = 1, dur = max(1, (OB[n].dur or 1) - dano), enc = o.enc and table.clone(o.enc) or nil }
end

------------------------------------------------------------------
-- Soporte para pociones
------------------------------------------------------------------
local TIEMPO_FERMENTAR = 20
local function resultadoFermentar(base, ing)
	if base == 501 and ing == 515 then
		return 502
	end
	if base == 502 then
		local t = ({ [516] = 505, [517] = 503, [I.polvoBlaze or -1] = 504, [I.lagrimaGhast or -1] = 506, [518] = 507 })[ing]
		if t then
			return t
		end
	end
	if base >= 503 and base <= 507 and ing == I.polvora then
		return base + 7
	end
	return 0
end
local function esFrasco(id)
	return id == 500 or id == 501 or id == 502 or (OB[id] ~= nil and OB[id].pocion ~= nil)
end
Mesas.soportes = {} -- clave -> {slots = {5}, comb, prog}
local function clave(x, y, z)
	return x .. "," .. y .. "," .. z
end
function Mesas.soporte(x, y, z)
	local k = clave(x, y, z)
	local s = Mesas.soportes[k]
	if not s then
		s = { slots = table.create(5, false), comb = 0, prog = 0, x = x, y = y, z = z }
		Mesas.soportes[k] = s
	end
	return s
end
local function puedeFermentar(sl)
	local ing = sl[4]
	if not ing then
		return false
	end
	for i = 1, 3 do
		if sl[i] and resultadoFermentar(sl[i].id, ing.id) ~= 0 then
			return true
		end
	end
	return false
end
local function tickSoportes(dt)
	for k, e in Mesas.soportes do
		local sl = e.slots
		if Mundo.get(e.x, e.y, e.z) ~= B.soporte then
			for _, p in sl do
				if p then
					Entidades.soltarItem(p, e.x + 0.5, e.y + 0.5, e.z + 0.5, true)
				end
			end
			Mesas.soportes[k] = nil
			continue
		end
		if not puedeFermentar(sl) then
			if e.prog ~= 0 then
				e.prog = 0
				Mesas.alCambiar(k)
			end
			continue
		end
		if e.comb <= 0 then
			local f = sl[5]
			if f and f.id == I.polvoBlaze then
				e.comb = 20
				f.n -= 1
				if f.n <= 0 then
					sl[5] = false
				end
			else
				e.prog = 0
				continue
			end
		end
		e.prog += dt
		if e.prog >= TIEMPO_FERMENTAR then
			e.prog = 0
			e.comb -= 1
			local ing = sl[4]
			for i = 1, 3 do
				if sl[i] then
					local r = resultadoFermentar(sl[i].id, ing.id)
					if r ~= 0 then
						sl[i] = Registro.pila(r, 1)
					end
				end
			end
			ing.n -= 1
			if ing.n <= 0 then
				sl[4] = false
			end
			if ctx.sonido then
				ctx.sonido("beber", e.x, e.y, e.z)
			end
		end
		Mesas.alCambiar(k)
	end
end
Mesas.alCambiar = function(_) end

------------------------------------------------------------------
-- Aldeanos (aldeanos.js)
------------------------------------------------------------------
local ESM = I.esmeralda
local OFERTAS_NIVEL = {
	granjero = { { { "trigo", 20, ESM, 1 }, { "patata", 26, ESM, 1 }, { "zanahoria", 22, ESM, 1 }, { "remolacha", 15, ESM, 1 }, { ESM, 1, "pan", 6 } },
		{ { "calabaza", 6, ESM, 1 }, { ESM, 1, "pastelCalabaza", 4 }, { ESM, 1, "manzana", 4 } }, { { "sandia", 4, ESM, 1 }, { ESM, 3, "galleta", 18 } },
		{ { ESM, 1, "pastelCalabaza", 1 }, { ESM, 1, "estofado", 1 } }, { { ESM, 3, "zanahoriaDorada", 3 }, { ESM, 4, "melonBrillante", 3 } } },
	bibliotecario = { { { "papel", 24, ESM, 1 }, { ESM, 9, "estanteria", 1 } }, { { "libro", 4, ESM, 1 }, { ESM, 1, "farol", 1 } }, { { "bolsaTinta", 5, ESM, 1 }, { ESM, 1, "vidrio", 4 } },
		{ { ESM, 5, "reloj", 1 }, { ESM, 4, "brujula", 1 } }, { { ESM, 20, "etiqueta", 1 } } },
	herrero = { { { "carbon", 15, ESM, 1 }, { ESM, 5, "hacha_hierro", 1 } }, { { "lingoteHierro", 4, ESM, 1 }, { ESM, 1, "espada_hierro", 1 } }, { { "pedernal", 24, ESM, 1 }, { ESM, 7, "hacha_diamante", 1 } },
		{ { "diamante", 1, ESM, 1 }, { ESM, 13, "espada_diamante", 1 } }, { { ESM, 17, "hacha_diamante", 1 } } },
	clerigo = { { { "carnePodrida", 32, ESM, 1 }, { ESM, 1, "redstone", 2 } }, { { "lingoteOro", 3, ESM, 1 }, { ESM, 1, "lapis", 1 } }, { { "pataConejo", 2, ESM, 1 }, { ESM, 4, "piedraLuminosa", 1 } },
		{ { "escamaTortuga", 4, ESM, 1 }, { ESM, 5, "perlaEnder", 1 } }, { { "verrugaNether", 22, ESM, 1 }, { ESM, 3, "botellaXP", 1 } } },
	pescador = { { { "cuerda", 20, ESM, 1 }, { "carbon", 10, ESM, 1 }, { ESM, 1, "bacalaoCocinado", 6 } }, { { "bacalaoCrudo", 15, ESM, 1 }, { ESM, 1, "salmonCocinado", 6 } },
		{ { "salmonCrudo", 13, ESM, 1 }, { ESM, 3, "canaPescar", 1 } }, { { "pezTropical", 6, ESM, 1 } }, { { "pezGlobo", 4, ESM, 1 }, { ESM, 1, "barco", 1 } } },
	carnicero = { { { "polloCrudo", 14, ESM, 1 }, { "cerdoCrudo", 7, ESM, 1 }, { "conejoCrudo", 4, ESM, 1 } }, { { "carbon", 15, ESM, 1 }, { ESM, 1, "cerdoAsado", 5 }, { ESM, 1, "polloAsado", 8 } },
		{ { "corderoCrudo", 7, ESM, 1 }, { "resCruda", 10, ESM, 1 } }, { { "bayasDulces", 10, ESM, 1 } }, { { ESM, 1, "estofadoConejo", 1 } } },
	cartografo = { { { "papel", 24, ESM, 1 }, { ESM, 7, "mapa", 1 } }, { { "panel", 11, ESM, 1 }, { ESM, 4, "brujula", 1 } }, { { "brujula", 1, ESM, 1 }, { ESM, 10, "mapa", 1 } },
		{ { ESM, 2, "mesaCartografia", 1 } }, { { ESM, 8, "etiqueta", 1 } } },
	flechero = { { { "palo", 32, ESM, 1 }, { ESM, 1, "flecha", 16 } }, { { "pedernal", 26, ESM, 1 }, { ESM, 2, "arco", 1 } }, { { "cuerda", 14, ESM, 1 }, { ESM, 3, "ballesta", 1 } },
		{ { "pluma", 24, ESM, 1 }, { ESM, 2, "flechaEspectral", 5 } }, { { ESM, 2, "mesaFlechas", 1 } } },
	armero = { { { "carbon", 15, ESM, 1 }, { ESM, 5, "casco_hierro", 1 }, { ESM, 9, "pechera_hierro", 1 } }, { { "lingoteHierro", 4, ESM, 1 }, { ESM, 7, "pantalones_hierro", 1 }, { ESM, 4, "botas_hierro", 1 } },
		{ { "cubo", 1, ESM, 1 }, { ESM, 5, "escudo", 1 } }, { { "diamante", 1, ESM, 1 }, { ESM, 13, "casco_diamante", 1 } }, { { ESM, 21, "pechera_diamante", 1 } } },
	pastor = { { { "lana", 18, ESM, 1 }, { ESM, 2, "lana", 1 } }, { { "tinte_negro", 12, ESM, 1 }, { "tinte_blanco", 12, ESM, 1 } }, { { ESM, 3, "cama", 1 }, { ESM, 1, "alfombra_blanco", 4 } },
		{ { "tinte_amarillo", 12, ESM, 1 }, { ESM, 2, "telar", 1 } }, { { ESM, 3, "cama", 1 } } },
	albanil = { { { "bolaArcilla", 10, ESM, 1 }, { ESM, 1, "ladrillo", 10 } }, { { "piedra", 20, ESM, 1 }, { ESM, 1, "piedraCincelada", 4 } }, { { "granito", 16, ESM, 1 }, { "diorita", 16, ESM, 1 }, { "andesita", 16, ESM, 1 } },
		{ { ESM, 1, "terracota_rojo", 1 }, { ESM, 1, "esmaltada_azul", 1 } }, { { "cuarzo", 12, ESM, 1 }, { ESM, 1, "bloqueCuarzo", 1 } } },
	curtidor = { { { "cuero", 6, ESM, 1 }, { ESM, 3, "pantalones_cuero", 1 }, { ESM, 7, "pechera_cuero", 1 } }, { { "pedernal", 26, ESM, 1 }, { ESM, 5, "casco_cuero", 1 }, { ESM, 4, "botas_cuero", 1 } },
		{ { "pielConejo", 9, ESM, 1 }, { ESM, 7, "pechera_cuero", 1 } }, { { "escamaTortuga", 4, ESM, 1 }, { ESM, 6, "silla", 1 } }, { { ESM, 5, "silla", 1 } } },
	herramientero = { { { "carbon", 15, ESM, 1 }, { ESM, 1, "hacha_piedra", 1 }, { ESM, 1, "pala_piedra", 1 }, { ESM, 1, "pico_piedra", 1 } }, { { "lingoteHierro", 4, ESM, 1 }, { ESM, 1, "campana", 1 } },
		{ { "pedernal", 30, ESM, 1 }, { ESM, 1, "pico_hierro", 1 } }, { { "diamante", 1, ESM, 1 }, { ESM, 12, "hacha_diamante", 1 } }, { { ESM, 13, "pico_diamante", 1 } } },
}
Mesas.PROFESIONES = { "granjero", "bibliotecario", "herrero", "clerigo", "pescador", "carnicero", "cartografo", "flechero", "armero", "pastor", "albanil", "curtidor", "herramientero" }
Mesas.NOMBRE_PROFESION = {
	granjero = "Granjero", bibliotecario = "Bibliotecario", herrero = "Herrero", clerigo = "Clérigo", pescador = "Pescador", carnicero = "Carnicero",
	cartografo = "Cartógrafo", flechero = "Flechero", armero = "Armero", pastor = "Pastor", albanil = "Albañil", curtidor = "Curtidor", herramientero = "Herramientero",
}
local XP_NIVEL = { 0, 10, 70, 150, 250 }
Mesas.NOMBRE_NIVEL = { "Novato", "Aprendiz", "Oficial", "Experto", "Maestro" }
local XP_OFERTA = { 2, 10, 20, 30, 30 }

local function K(k)
	if type(k) == "number" then
		return k
	end
	return I[k] or B[k]
end
local function ofertaDe(o, nivel)
	local ia, ib = K(o[1]), K(o[3])
	if not ia or not ib or not OB[ia] or not OB[ib] then
		return nil
	end
	return { costo = { ia, o[2] }, da = { ib, o[4] }, usos = 0, max = ib == ESM and 16 or 12, xp = XP_OFERTA[nivel] }
end
local function ofertasNivel(pr, nivel, n)
	local pool = {}
	for _, o in (OFERTAS_NIVEL[pr] and OFERTAS_NIVEL[pr][nivel]) or {} do
		local of = ofertaDe(o, nivel)
		if of then
			table.insert(pool, of)
		end
	end
	local res = {}
	while #pool > 0 and #res < (n or 2) do
		table.insert(res, table.remove(pool, math.random(1, #pool)))
	end
	return res
end
-- Libros encantados de los bibliotecarios (encantamientos.js)
local function librosBibliotecario()
	local ks = {}
	for _, d in Enc.LISTA do
		if d.k ~= "velocidadAlmas" and d.k ~= "sigilo" and d.k ~= "rafaga" then
			table.insert(ks, d)
		end
	end
	local lista = {}
	for _ = 1, 1 + (math.random() < 0.5 and 1 or 0) do
		local d = ks[math.random(1, #ks)]
		local l = math.random(1, d.max)
		local precio = 2 + floor(math.random() * (5 + l * 10)) + 3 * l
		if d.tesoro then
			precio *= 2
		end
		table.insert(lista, { costo = { ESM, min(64, precio) }, costo2 = { I.libro, 1 }, da = { 546, 1 }, enc = { [d.k] = l }, usos = 0, max = 12, xp = 2 })
	end
	return lista
end

-- Da profesión y ofertas a un aldeano nuevo
function Mesas.prepararAldeano(m, opc)
	if m.bebe and m.bebe > 0 then
		m.profesion = "ninio"
		return
	end
	m.profesion = (opc and opc.profesion) or Mesas.PROFESIONES[math.random(1, #Mesas.PROFESIONES)]
	m.ofertas = ofertasNivel(m.profesion, 1, 2)
	if m.profesion == "bibliotecario" then
		for _, o in librosBibliotecario() do
			table.insert(m.ofertas, o)
		end
	end
	m.nivelA, m.xpA = 1, 0
	if m.pieza then
		m.pieza:SetAttribute("profesion", m.profesion)
	end
end

------------------------------------------------------------------
-- Abrir, datos para la interfaz y acciones
------------------------------------------------------------------
local NOMBRES = {
	encantar = "Encantar", yunque = "Reparar y renombrar", afiladora = "Reparar y desencantar", herreria = "Mesa de herrería",
	pociones = "Soporte para pociones", aldeano = "Aldeano",
}
local HUECOS = { encantar = 2, yunque = 2, afiladora = 2, herreria = 3, pociones = 5 }

function Mesas.abrir(plr, s, tipo, x, y, z, mob)
	if s.ui and s.ui.slots then
		Mesas.cerrar(plr, s)
	end
	s.ui = { tipo = "extra", sub = tipo, x = x, y = y, z = z, mob = mob }
	if tipo ~= "pociones" and tipo ~= "aldeano" then
		s.ui.slots = table.create(HUECOS[tipo], false)
	end
	s.semillaEnc = s.semillaEnc or math.random(0, 999999999)
end

-- Lo que quede en las casillas de la mesa vuelve al jugador
function Mesas.cerrar(plr, s)
	if s.ui and s.ui.slots then
		for i, p in s.ui.slots do
			if p then
				ctx.darOSoltar(plr, p)
				s.ui.slots[i] = false
			end
		end
	end
end

local function slotsDe(s)
	local u = s.ui
	if u.sub == "pociones" then
		return Mesas.soporte(u.x, u.y, u.z).slots
	end
	return u.slots
end

local function nombreEnc(enc)
	local t = {}
	for k, l in enc or {} do
		table.insert(t, Enc.nombre(k, l))
	end
	return table.concat(t, ", ")
end

function Mesas.datos(plr, s)
	local u = s.ui
	-- Pantallas de los modos de juego (tiendas de Bed Wars…) traen su propia función
	if u.datos then
		return u.datos(plr, s)
	end
	local d = { sub = u.sub, nombre = NOMBRES[u.sub] }
	if u.sub == "aldeano" then
		local m = u.mob
		if not m or m.muerto then
			return d
		end
		d.nombre = (Mesas.NOMBRE_PROFESION[m.profesion] or "Aldeano") .. " · " .. (Mesas.NOMBRE_NIVEL[m.nivelA or 1] or "")
		local niv = m.nivelA or 1
		d.nivel = niv
		d.xpNivel = niv >= 5 and 1 or ((m.xpA or 0) - XP_NIVEL[niv]) / (XP_NIVEL[niv + 1] - XP_NIVEL[niv])
		d.ofertas = {}
		for _, o in m.ofertas or {} do
			table.insert(d.ofertas, { costo = o.costo, costo2 = o.costo2, da = o.da, agotada = o.usos >= o.max, nombre = o.enc and nombreEnc(o.enc) or nil })
		end
		return d
	end
	local sl = slotsDe(s)
	d.slots = sl
	if u.sub == "encantar" then
		local p = sl[1]
		if p then
			local libs = contarLibrerias(u.x, u.y, u.z)
			d.opciones = {}
			for i, o in Enc.opciones(p.id, libs, s.semillaEnc) do
				if o then
					local pista = o.pista and Enc.nombre(o.pista.k, o.pista.l) .. " . . . ?" or "—"
					d.opciones[i] = { coste = o.coste, lapis = o.lapis, pista = pista }
				else
					d.opciones[i] = false
				end
			end
			d.librerias = libs
		end
	elseif u.sub == "yunque" then
		local r = Mesas.resultadoYunque(sl[1] or nil, sl[2] or nil)
		d.salida = r and r.pila or false
		d.coste = r and r.coste or nil
	elseif u.sub == "afiladora" then
		local r = Mesas.resultadoAfiladora(sl[1] or nil, sl[2] or nil)
		d.salida = r and r.pila or false
	elseif u.sub == "herreria" then
		d.salida = Mesas.resultadoHerreria(sl) or false
	elseif u.sub == "pociones" then
		local e = Mesas.soporte(u.x, u.y, u.z)
		d.prog = e.prog / TIEMPO_FERMENTAR
		d.comb = e.comb / 20
	end
	return d
end

-- ¿Qué acepta cada casilla?
local function acepta(sub, i, p)
	if not p then
		return true
	end
	if sub == "encantar" then
		if i == 2 then
			return p.id == I.lapis
		end
		return Enc.encantabilidad(p.id) > 0 and not p.enc
	elseif sub == "pociones" then
		if i <= 3 then
			return esFrasco(p.id)
		elseif i == 4 then
			return not esFrasco(p.id)
		end
		return p.id == I.polvoBlaze
	elseif sub == "herreria" then
		if i == 1 then
			return p.id == 533
		elseif i == 2 then
			return mejoraNetherite(p.id) ~= 0
		end
		return p.id == 535
	elseif sub == "afiladora" then
		local o = OB[p.id]
		return (o and o.dur ~= nil) or p.id == 546 or p.enc ~= nil
	end
	return true
end

-- Mayúsculas + clic desde el inventario: a la primera casilla que lo acepte
function Mesas.meterRapido(s, p)
	local u = s.ui
	local sl = slotsDe(s)
	for i = 1, #sl do
		if acepta(u.sub, i, p) then
			local t = { sl[i] }
			local sobra = Inv.meter(t, p, 1, 1)
			sl[i] = t[1] or false
			if sobra < p.n then
				return sobra
			end
		end
	end
	return p.n
end

-- Clic en una casilla de la mesa (zona "mesa") o en la salida (zona "mesaSalida")
function Mesas.clic(plr, s, zona, i, boton)
	local u = s.ui
	if not u or u.tipo ~= "extra" or u.sub == "aldeano" then
		return
	end
	local sl = slotsDe(s)
	if zona == "mesa" then
		if i < 1 or i > #sl then
			return
		end
		if boton == 3 then
			if sl[i] then
				local sobra = Inv.dar(s.inv, sl[i])
				if sobra > 0 then
					sl[i].n = sobra
				else
					sl[i] = false
				end
			end
			return
		end
		-- Las mesas de un solo objeto (encantar, yunque…) aceptan pilas de 1 en la primera casilla
		Inv.clic(s, sl, i, boton, function(k, pila)
			return acepta(u.sub, k, pila)
		end)
		if u.sub == "encantar" and sl[1] and sl[1].n > 1 then
			local resto = copia(sl[1])
			resto.n -= 1
			sl[1].n = 1
			if s.cursor then
				ctx.darOSoltar(plr, resto)
			else
				s.cursor = resto
			end
		end
		return
	end
	if zona ~= "mesaSalida" then
		return
	end
	local surv = ctx.supervivencia(s)
	local function tomar(pila)
		if s.cursor then
			if Inv.iguales(s.cursor, pila) and s.cursor.n + pila.n <= Registro.maxPila(pila.id) then
				s.cursor.n += pila.n
				return true
			end
			return false
		end
		if boton == 3 then
			local sobra = Inv.dar(s.inv, pila)
			if sobra > 0 then
				local q = copia(pila)
				q.n = sobra
				ctx.darOSoltar(plr, q)
			end
		else
			s.cursor = pila
		end
		return true
	end
	if u.sub == "yunque" then
		local r = Mesas.resultadoYunque(sl[1] or nil, sl[2] or nil)
		if not r then
			return
		end
		if surv and s.xp.nivel < r.coste then
			ctx.aviso(plr, "Necesitas " .. r.coste .. " niveles de experiencia.")
			return
		end
		if not tomar(r.pila) then
			return
		end
		if surv then
			s.xp.nivel = max(0, s.xp.nivel - r.coste)
			s.xp.puntos = 0
		end
		sl[1] = false
		if r.usa and sl[2] and sl[2].id == materialReparacion(r.pila.id) then
			sl[2].n -= r.usa
			if sl[2].n <= 0 then
				sl[2] = false
			end
		else
			sl[2] = false
		end
		if ctx.sonido then
			ctx.sonido("armadura", u.x, u.y, u.z)
		end
	elseif u.sub == "afiladora" then
		local r = Mesas.resultadoAfiladora(sl[1] or nil, sl[2] or nil)
		if not r or not tomar(r.pila) then
			return
		end
		sl[1], sl[2] = false, false
		if r.xp > 0 then
			local v = math.ceil(r.xp / 2)
			Entidades.soltarXP(v + floor(math.random() * v), u.x + 0.5, u.y + 1, u.z + 0.5)
		end
	elseif u.sub == "herreria" then
		local r = Mesas.resultadoHerreria(sl)
		if not r or not tomar(r) then
			return
		end
		sl[1].n -= 1
		if sl[1].n <= 0 then
			sl[1] = false
		end
		sl[3].n -= 1
		if sl[3].n <= 0 then
			sl[3] = false
		end
		sl[2] = false
		if ctx.sonido then
			ctx.sonido("armadura", u.x, u.y, u.z)
		end
	end
end

-- Elegir una de las tres opciones de la mesa de encantamientos
function Mesas.encantar(plr, s, i)
	local u = s.ui
	if not u or u.sub ~= "encantar" then
		return
	end
	local sl = u.slots
	local p = sl[1]
	if not p then
		return
	end
	local ops = Enc.opciones(p.id, contarLibrerias(u.x, u.y, u.z), s.semillaEnc)
	local o = ops[i]
	if not o or contar(o.enc) == 0 then
		return
	end
	local surv = ctx.supervivencia(s)
	local lapis = sl[2] and sl[2].n or 0
	if surv and (s.xp.nivel < o.coste or lapis < o.lapis) then
		return
	end
	p.enc = o.enc
	if p.id == 248 then
		p.id = 546
	end
	if surv then
		sl[2].n -= o.lapis
		if sl[2].n <= 0 then
			sl[2] = false
		end
		s.xp.nivel = max(0, s.xp.nivel - o.niveles)
		s.xp.puntos = 0
	end
	s.semillaEnc = math.random(0, 999999999)
	if ctx.sonido then
		ctx.sonido("nivel", u.x, u.y, u.z)
	end
end

-- Comerciar con un aldeano (oferta i)
function Mesas.comerciar(plr, s, i)
	local u = s.ui
	if not u or u.sub ~= "aldeano" then
		return
	end
	local m = u.mob
	local o = m and not m.muerto and m.ofertas and m.ofertas[i]
	if not o or o.usos >= o.max then
		return
	end
	if Inv.contar(s.inv, o.costo[1]) < o.costo[2] or (o.costo2 and Inv.contar(s.inv, o.costo2[1]) < o.costo2[2]) then
		if ctx.sonido then
			ctx.sonido("puerta", m.x, m.y, m.z)
		end
		return
	end
	Inv.quitar(s.inv, o.costo[1], o.costo[2])
	if o.costo2 then
		Inv.quitar(s.inv, o.costo2[1], o.costo2[2])
	end
	local n = o.da[2]
	while n > 0 do
		local k = min(n, Registro.maxPila(o.da[1]))
		n -= k
		local p = Registro.pila(o.da[1], k)
		if o.enc then
			p.enc = table.clone(o.enc)
		end
		ctx.darOSoltar(plr, p)
	end
	o.usos += 1
	Entidades.soltarXP(math.random(1, 3), m.x, m.y + 1, m.z)
	m.xpA = (m.xpA or 0) + (o.xp or 2)
	while (m.nivelA or 1) < 5 and m.xpA >= XP_NIVEL[(m.nivelA or 1) + 1] do
		m.nivelA = (m.nivelA or 1) + 1
		for _, of in ofertasNivel(m.profesion, m.nivelA, 2) do
			table.insert(m.ofertas, of)
		end
		ctx.aviso(plr, (Mesas.NOMBRE_PROFESION[m.profesion] or "Aldeano") .. " sube a " .. Mesas.NOMBRE_NIVEL[m.nivelA])
	end
	if ctx.sonido then
		ctx.sonido("recoger", m.x, m.y, m.z)
	end
end

function Mesas.iniciar(c)
	ctx = c
	local acum, reab = 0, 0
	RunService.Heartbeat:Connect(function(dt)
		acum += dt
		reab += dt
		if acum >= 0.25 then
			pcall(tickSoportes, acum)
			acum = 0
		end
		-- Los aldeanos se reabastecen dos veces cada día (cada 10 minutos)
		if reab >= 600 and c.mobs then
			reab = 0
			for _, m in c.mobs.lista do
				if m.tipo == "aldeano" and m.ofertas then
					for _, o in m.ofertas do
						o.usos = 0
					end
				end
			end
		end
	end)
end

return Mesas
