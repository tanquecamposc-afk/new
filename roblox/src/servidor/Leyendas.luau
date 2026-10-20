--[[
	Blockverse para Roblox · LEYENDAS (modos52.js y modos53.js)
	Cada jugador defiende su aldea en una isla propia: plaza con el
	pozo-corazón, casas con aldeanos, caminos con faroles y huertos, y
	tres portales piglin con torres y el terreno corrompido alrededor.
	Los ayudantes recogen madera y piedra (G), con eso construyes
	generadores de golems de piedra o de tablas, torres de flechas y
	muros, reparas la aldea o mejoras a tus golems con el oro (1-6), y
	das órdenes (R: ¡al ataque!, F: seguidme). Los portales sueltan
	piglins y, cada cierto tiempo, llega un asalto. Gana destruyendo los
	tres portales; pierdes si la aldea cae.
]]
local RunService = game:GetService("RunService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Comp = ReplicatedStorage:WaitForChild("Blockverse")
local Config = require(Comp.Config)
local Registro = require(Comp.Registro)
local Arenas = require(Comp.Arenas)

local BS = Config.BLOQUE
local B, I, BL = Registro.B, Registro.I, Registro.bloques

local LY = {}
local ctx
local partidas = {} -- plr -> estado de su partida

local CONSTRUCCIONES = {
	{ n = "Generador de golems de piedra", m = 5, p = 15 },
	{ n = "Generador de golems de tablas", m = 15, p = 5 },
	{ n = "Torre de flechas", m = 10, p = 10 },
	{ n = "Muro", m = 0, p = 6 },
	{ n = "Reparar la aldea", m = 8, p = 8 },
	{ n = "Mejorar golems", m = 0, p = 0, oro = 8 },
}
LY.CONSTRUCCIONES = CONSTRUCCIONES

local function titulo(plr, a, g, col)
	ctx.Estado:FireClient(plr, "titulo", a, g, col)
end
local function pies(plr)
	local ch = plr.Character
	local h = ch and ch:FindFirstChildOfClass("Humanoid")
	local r = ch and ch:FindFirstChild("HumanoidRootPart")
	if h and r and h.Health > 0 then
		local p = r.Position / BS
		return Vector3.new(p.X, p.Y - (h.HipHeight + r.Size.Y / 2) / BS, p.Z), h, r
	end
	return nil
end
local function esPiglin(m)
	return m and not m.muerto and (m.tipo == "piglinLY" or m.tipo == "piglinBrutoLY")
end
local function esGolem(m)
	return m and not m.muerto and (m.tipo == "golemPiedraLY" or m.tipo == "golemTablaLY")
end
local function sueloEn(x, z, y0)
	for y = (y0 or 120), 2, -1 do
		local b = ctx.Mundo.get(x, y, z)
		if b ~= 0 and Registro.SOLIDO[b] and not Registro.esHojas(b) then
			return y
		end
	end
	return Arenas.LY_Y
end

------------------------------------------------------------------
-- Criaturas de Leyendas
------------------------------------------------------------------
local DEFS = {
	golemPiedraLY = { vida = 40, vel = 2.5, dano = 6 },
	golemTablaLY = { vida = 26, vel = 2.6, dano = 3, arquero = true },
	piglinLY = { vida = 18, vel = 2.3, dano = 4 },
	piglinBrutoLY = { vida = 40, vel = 2, dano = 7 },
}

local function golpear(L, m, o, dano, dist)
	if m.cd > 0 then
		return
	end
	m.cd = m.def.arquero and 1.4 or 1
	m.pieza:SetAttribute(m.def.arquero and "dispara" or "ataca", os.clock())
	local dx, dz = (o.x - m.x) / (dist > 0 and dist or 1), (o.z - m.z) / (dist > 0 and dist or 1)
	if o.plr then
		ctx.danar(o.plr, dano, "mob", { x = dx, z = dz })
	elseif o.m then
		o.m.inv = 0
		ctx.Mobs.herir(o.m, dano, { x = dx * 0.6, z = dz * 0.6 }, "golem")
	end
end

local function mover(m, dx, dz, vel)
	if dx ~= 0 or dz ~= 0 then
		m.yawObj = math.atan2(dx, dz)
		m.mover = true
		m.velObj = vel
	else
		m.mover = false
	end
end

local function iaGolem(L)
	return function(m, dt)
		if L.fin then
			m.mover = false
			return
		end
		local obj, dmin = nil, 11
		for _, o in ctx.Mobs.lista do
			if esPiglin(o) then
				local d = math.sqrt((o.x - m.x) ^ 2 + (o.y - m.y) ^ 2 + (o.z - m.z) ^ 2)
				if d < dmin then
					obj, dmin = o, d
				end
			end
		end
		local alcance = m.def.arquero and 9 or 1.8
		if obj then
			local ox, oz = obj.x - m.x, obj.z - m.z
			local d = math.sqrt(ox * ox + oz * oz)
			mover(m, d > alcance * 0.9 and ox or 0, d > alcance * 0.9 and oz or 0, m.def.vel * 1.2)
			m.yawObj = math.atan2(ox, oz)
			if d <= alcance + 0.4 then
				golpear(L, m, { m = obj, x = obj.x, z = obj.z }, m.def.dano, d)
			end
			return
		end
		if L.orden == "atacar" then
			local mejor, dm = nil, math.huge
			for _, b in L.bases do
				if b.vida > 0 then
					local d = math.sqrt((b.x - m.x) ^ 2 + (b.z - m.z) ^ 2)
					if d < dm then
						mejor, dm = b, d
					end
				end
			end
			if mejor then
				local ox, oz = mejor.x - m.x, mejor.z - m.z
				mover(m, dm > 3 and ox or 0, dm > 3 and oz or 0, m.def.vel)
				if dm <= math.max(4, alcance) and m.cd <= 0 then
					m.cd = 1
					m.pieza:SetAttribute("ataca", os.clock())
					mejor.vida -= m.def.arquero and 2 or 4
				end
				return
			end
		end
		local p = pies(L.plr)
		if p then
			local ox, oz = p.X - m.x, p.Z - m.z
			local d = math.sqrt(ox * ox + oz * oz)
			mover(m, d > 4 and ox or 0, d > 4 and oz or 0, m.def.vel * (d > 12 and 1.5 or 1))
		else
			m.mover = false
		end
	end
end

local function iaPiglin(L)
	return function(m, dt)
		if L.fin then
			m.mover = false
			return
		end
		local obj, dmin = nil, 8
		for _, o in ctx.Mobs.lista do
			if esGolem(o) or (o.tipo == "aldeano" and not o.muerto and o.ly == L) then
				local d = math.sqrt((o.x - m.x) ^ 2 + (o.y - m.y) ^ 2 + (o.z - m.z) ^ 2)
				if d < dmin then
					obj, dmin = { m = o, x = o.x, z = o.z }, d
				end
			end
		end
		local p = pies(L.plr)
		if p then
			local d = (p - Vector3.new(m.x, m.y, m.z)).Magnitude
			if d < dmin then
				obj, dmin = { plr = L.plr, x = p.X, z = p.Z }, d
			end
		end
		if obj then
			local ox, oz = obj.x - m.x, obj.z - m.z
			local d = math.sqrt(ox * ox + oz * oz)
			mover(m, d > 1.6 and ox or 0, d > 1.6 and oz or 0, m.def.vel * 1.15)
			m.yawObj = math.atan2(ox, oz)
			if d <= 2 then
				golpear(L, m, obj, m.def.dano, d)
			end
			return
		end
		local a = L.aldea
		local ox, oz = a.x - m.x, a.z - m.z
		local d = math.sqrt(ox * ox + oz * oz)
		mover(m, d > 2.5 and ox or 0, d > 2.5 and oz or 0, m.def.vel)
		if d <= 3.2 and m.cd <= 0 then
			m.cd = 1.2
			m.pieza:SetAttribute("ataca", os.clock())
			a.vida -= m.tipo == "piglinBrutoLY" and 6 or 3
			ctx.Estado:FireClient(L.plr, "particulas", Vector3.new(a.x + 0.5, a.y + 2, a.z + 0.5) * BS, 0xff4444)
		end
	end
end

local function crearCriatura(L, tipo, x, y, z)
	local m = ctx.Mobs.crear(tipo, x, y, z)
	if not m then
		return nil
	end
	local d = table.clone(m.def)
	for k, v in DEFS[tipo] do
		d[k] = v
	end
	d.sueltaMuestra, d.xp = {}, { 0, 0 }
	m.def = d
	m.vida, m.vidaMax = d.vida, d.vida
	m.domado = true
	m.ly = L
	-- Tamaños de las variantes del web
	local escala = ({ golemPiedraLY = 0.62, golemTablaLY = 0.55, piglinBrutoLY = 1.25 })[tipo]
	if escala then
		ctx.Mobs.escalar(m, escala)
	end
	if esGolem(m) then
		if L.mejora > 0 then
			m.vida *= 1.3 ^ L.mejora
			m.vidaMax = m.vida
			d.dano *= 1.25 ^ L.mejora
		end
		m.control = iaGolem(L)
		-- Los golems no se hacen daño entre ellos ni los hiere el jugador
		m.alHerir = function(_, dd, fuente)
			if fuente == "jugador" or fuente == "flechaJugador" or fuente == "golem" then
				return 0
			end
			return dd
		end
	else
		m.enfadado = 999
		m.control = iaPiglin(L)
		m.alMorir = function(mm)
			if not mm.cobrado then
				mm.cobrado = true
				L.oro += 1
			end
		end
	end
	return m
end

------------------------------------------------------------------
-- Ayudantes, construcciones y portales
------------------------------------------------------------------
local PIEDRAS = { piedra = true, roca = true, andesita = true, diorita = true, granito = true }
local function cosechar(L)
	local plr = L.plr
	if L.cdG > 0 then
		titulo(plr, "", ("Los ayudantes vuelven en %d s"):format(math.ceil(L.cdG)), "#aaaaaa")
		return
	end
	L.cdG = 4
	local p = pies(plr)
	if not p then
		return
	end
	local X, Y, Z = math.floor(p.X), math.floor(p.Y), math.floor(p.Z)
	local m, s = 0, 0
	for dx = -10, 10 do
		for dz = -10, 10 do
			for dy = -4, 10 do
				local k = (X + dx) .. "," .. (Y + dy) .. "," .. (Z + dz)
				if not L.cosechado[k] then
					local b = ctx.Mundo.get(X + dx, Y + dy, Z + dz)
					local cl = BL[b] and BL[b].clave or ""
					if m < 14 and cl:sub(1, 6) == "tronco" then
						m += 1
						L.cosechado[k] = true
					elseif s < 14 and PIEDRAS[cl] and ctx.Mundo.get(X + dx, Y + dy + 1, Z + dz) == 0 then
						s += 1
						L.cosechado[k] = true
					end
				end
			end
		end
	end
	L.madera += m
	L.piedra += s
	ctx.Estado:FireClient(plr, "sonido", "recoger")
	ctx.Estado:FireClient(plr, "particulas", p * BS + Vector3.new(0, 2 * BS, 0), 0x9fd8ff)
	titulo(plr, "", (m > 0 or s > 0) and ("Ayudantes: +%d madera · +%d piedra"):format(m, s) or "No queda nada cerca: muévete a otra zona", "#9fd8ff")
end

local function construir(L, k)
	local C = CONSTRUCCIONES[k]
	local plr = L.plr
	if not C then
		return
	end
	if k == 6 then
		if L.oro < 8 then
			titulo(plr, "", "Falta: 8 de oro (vence piglins y portales)", "#ff8888")
			return
		end
		if L.mejora >= 3 then
			titulo(plr, "", "Los golems ya están al máximo", "#aaaaaa")
			return
		end
		L.oro -= 8
		L.mejora += 1
		for _, m in ctx.Mobs.lista do
			if esGolem(m) and m.ly == L then
				m.vidaMax *= 1.3
				m.vida = m.vidaMax
				m.def.dano *= 1.25
			end
		end
		ctx.Estado:FireClient(plr, "sonido", "nivel")
		titulo(plr, "Golems mejorados", ("Nivel %d/3: más vida y daño"):format(L.mejora), "#ffd84a")
		return
	end
	if L.madera < C.m or L.piedra < C.p then
		titulo(plr, "", ("Falta: %d madera y %d piedra"):format(C.m, C.p), "#ff8888")
		return
	end
	local p, _, r = pies(plr)
	if not p then
		return
	end
	local look = r.CFrame.LookVector
	local fx, fz = look.X, look.Z
	local l = math.sqrt(fx * fx + fz * fz)
	fx, fz = fx / (l > 0 and l or 1), fz / (l > 0 and l or 1)
	local Mundo = ctx.Mundo
	if k == 5 then
		local a = L.aldea
		if math.sqrt((p.X - a.x) ^ 2 + (p.Z - a.z) ^ 2) > 12 then
			titulo(plr, "", "Acércate a la aldea para repararla", "#ff8888")
			return
		end
		if a.vida >= 100 then
			return
		end
		a.vida = math.min(100, a.vida + 25)
	else
		local X, Z = math.floor(p.X + fx * 4), math.floor(p.Z + fz * 4)
		local Y = sueloEn(X, Z, math.floor(p.Y) + 6)
		if k == 1 or k == 2 then
			for a = -1, 1 do
				for b = -1, 1 do
					Mundo.set(X + a, Y + 1, Z + b, k == 1 and B.roca or B.tablones)
				end
			end
			Mundo.set(X, Y + 2, Z, k == 1 and B.ladrillosPiedra or B.tronco)
			Mundo.set(X, Y + 3, Z, B.antorcha)
			table.insert(L.spawners, { x = X, y = Y + 3, z = Z, tipo = k == 1 and "golemPiedraLY" or "golemTablaLY", t = 2, hechos = {} })
		elseif k == 3 then
			for y = 1, 4 do
				for a = -1, 1 do
					for b = -1, 1 do
						if y < 4 or math.abs(a) + math.abs(b) == 1 or (a == 0 and b == 0) then
							Mundo.set(X + a, Y + y, Z + b, y == 4 and B.tablones or ((math.abs(a) == 1 and math.abs(b) == 1) and B.tronco or B.roca))
						end
					end
				end
			end
			Mundo.set(X, Y + 5, Z, B.antorcha)
			table.insert(L.torres, { x = X, y = Y + 4, z = Z, cd = 0 })
		elseif k == 4 then
			local px, pz = -fz, fx
			for w = -2, 2 do
				local XX, ZZ = math.floor(p.X + fx * 3 + px * w), math.floor(p.Z + fz * 3 + pz * w)
				local YY = sueloEn(XX, ZZ, math.floor(p.Y) + 6)
				for y = 1, 3 do
					Mundo.set(XX, YY + y, ZZ, B.roca)
				end
			end
		end
		ctx.Estado:FireClient(plr, "particulas", Vector3.new(X + 0.5, Y + 1.5, Z + 0.5) * BS, 0xdddddd)
	end
	L.madera -= C.m
	L.piedra -= C.p
	ctx.Estado:FireClient(plr, "sonido", "poner")
	titulo(plr, "", C.n, "#9fe0a0")
end

local function golpearBase(L, x, y, z)
	local t = os.clock()
	if t - (L.ultimoGolpe or 0) < 0.4 then
		return false
	end
	for _, b in L.bases do
		if b.vida > 0 and math.sqrt((x - b.x) ^ 2 + (z - b.z) ^ 2) < 6.5 then
			L.ultimoGolpe = t
			b.vida -= 4
			ctx.Estado:FireClient(L.plr, "particulas", Vector3.new(b.x + 0.5, b.y + 3, b.z + 0.5) * BS, 0xaa2222)
			ctx.Estado:FireClient(L.plr, "sonido", "golpe")
			return true
		end
	end
	return false
end

------------------------------------------------------------------
-- Partida
------------------------------------------------------------------
local function limpiar(L)
	for _, m in ctx.Mobs.lista do
		if m.ly == L and not m.muerto then
			ctx.Mobs.quitar(m)
		end
	end
	if L.arena then
		Arenas.borrar(L.arena.id)
	end
end

function LY.en(plr)
	return partidas[plr] ~= nil
end

function LY.unirse(plr)
	local s = ctx.estados[plr]
	if not s or partidas[plr] then
		return
	end
	local a = Arenas.nueva("ly", math.random(1, 1000000))
	local L = {
		plr = plr, arena = a, madera = 20, piedra = 20, oro = 0, spawners = {}, torres = {}, orden = "seguir", raidT = 150, cdG = 0,
		cosechado = {}, fin = false, piglinT = 12, mejora = 0,
		aldea = { x = a.aldea.x, y = a.aldea.y, z = a.aldea.z, vida = 100 }, bases = {},
		guardado = { inv = s.inv, xp = s.xp, modo = s.modo, cama = s.cama },
	}
	for _, b in a.bases do
		table.insert(L.bases, { x = b.x, y = b.y, z = b.z, vida = 80, vidaMax = 80 })
	end
	partidas[plr] = L
	s.inv = table.create(41, false)
	s.inv[1] = Registro.pila(B.espada_hierro or I.espada_hierro, 1)
	s.sel = 1
	s.cama = nil
	s.modo = "supervivencia"
	plr:SetAttribute("Modo", "supervivencia")
	plr:SetAttribute("Leyendas", true)
	-- Aldeanos en las casas
	for _, c in a.casas do
		local m = ctx.Mobs.crear("aldeano", c[1], c[2], c[3])
		if m then
			m.domado = true
			m.ly = L
		end
	end
	task.spawn(ctx.teletransportar, plr, L.aldea.x + 0.5, L.aldea.y + 1, L.aldea.z + 5.5, nil)
	titulo(plr, "LEYENDAS", "Protege la aldea y destruye los 3 portales piglin", "#ffd84a")
	ctx.enviarJugador(plr)
end

function LY.salir(plr, fin)
	local L = partidas[plr]
	if not L then
		return
	end
	partidas[plr] = nil
	limpiar(L)
	local s = ctx.estados[plr]
	if s then
		s.inv, s.xp, s.modo, s.cama = L.guardado.inv, L.guardado.xp, L.guardado.modo or "supervivencia", L.guardado.cama
		s.ui = nil
		plr:SetAttribute("Modo", s.modo)
	end
	plr:SetAttribute("Leyendas", nil)
	ctx.Estado:FireClient(plr, "panel", nil)
	if plr.Parent then
		if fin then
			ctx.Estado:FireClient(plr, "menu", true)
		end
		plr:LoadCharacter()
	end
end

function LY.puntoAparicion(plr)
	local L = partidas[plr]
	if not L then
		return nil
	end
	return { L.aldea.x, L.aldea.y + 1, L.aldea.z + 3 }
end

function LY.alMorir(plr)
	local L = partidas[plr]
	if L and not L.fin then
		titulo(plr, "", "Vuelves a la aldea", "#ff8888")
	end
end

-- Órdenes y construcciones (teclas G, R, F y 1-6, o los botones del panel)
function LY.comando(plr, cmd, arg)
	local L = partidas[plr]
	if not L or L.fin then
		return
	end
	if cmd == "cosechar" then
		cosechar(L)
	elseif cmd == "atacar" then
		L.orden = "atacar"
		titulo(plr, "", "¡Golems, al ataque!", "#ff9955")
	elseif cmd == "seguir" then
		L.orden = "seguir"
		titulo(plr, "", "¡Golems, seguidme!", "#99ddff")
	elseif cmd == "construir" and type(arg) == "number" then
		construir(L, math.floor(arg))
	end
end

-- Golpear un bloque junto a un portal le quita vida; el resto del mapa no se rompe
function LY.golpeBloque(plr, x, y, z)
	local L = partidas[plr]
	if L then
		golpearBase(L, x, y, z)
	end
end
function LY.puedeRomper(plr, x, y, z)
	local L = partidas[plr]
	if not L then
		return true
	end
	golpearBase(L, x, y, z)
	return false
end

------------------------------------------------------------------
-- Bucle
------------------------------------------------------------------
local function panel(L)
	local Ls = {}
	local function linea(t, c)
		table.insert(Ls, { t = t, c = c or "#ffffff" })
	end
	local a = L.aldea
	linea(("Aldea: %d%%"):format(math.max(0, a.vida)), a.vida < 35 and "#ff5555" or "#66ff66")
	local p = pies(L.plr)
	local vivas, cerca, dmin = 0, nil, math.huge
	for _, b in L.bases do
		if b.vida > 0 then
			vivas += 1
			if p then
				local d = math.sqrt((p.X - b.x) ^ 2 + (p.Z - b.z) ^ 2)
				if d < dmin then
					cerca, dmin = b, d
				end
			end
		end
	end
	if cerca then
		if dmin < 20 then
			linea(("Portal piglin: %d%%"):format(math.max(0, cerca.vida / cerca.vidaMax * 100)), "#cc44ff")
		else
			linea(("Portal más cercano: %d m"):format(math.floor(dmin)), "#cc88ff")
		end
	end
	linea(("Madera %d · Piedra %d · Oro %d"):format(L.madera, L.piedra, L.oro), "#ffe0a0")
	local golems = 0
	for _, m in ctx.Mobs.lista do
		if esGolem(m) and m.ly == L then
			golems += 1
		end
	end
	linea(("Portales: %d/3 · Golems: %d (%s)"):format(vivas, golems, L.orden == "atacar" and "atacando" or "siguiéndote"))
	linea(("Asalto en %d s"):format(math.ceil(L.raidT)), "#ff9966")
	local botones = {}
	for k, C in CONSTRUCCIONES do
		local coste = C.oro and (C.oro .. " oro") or (((C.m > 0) and (C.m .. " madera ") or "") .. ((C.p > 0) and (C.p .. " piedra") or ""))
		local puede = C.oro and L.oro >= C.oro or (not C.oro and L.madera >= C.m and L.piedra >= C.p)
		table.insert(botones, { t = ("%d · %s (%s)"):format(k, C.n, coste), cmd = "construir", arg = k, activo = puede })
	end
	table.insert(botones, { t = "G · Ayudantes: recoger", cmd = "cosechar", activo = L.cdG <= 0 })
	table.insert(botones, { t = "R · ¡Al ataque!", cmd = "atacar", activo = true })
	table.insert(botones, { t = "F · Seguidme", cmd = "seguir", activo = true })
	ctx.Estado:FireClient(L.plr, "panel", { titulo = "LEYENDAS", lineas = Ls, botones = botones, modo = "leyendas", col = "#ffd84a" })
end

local function actualizar(L, dt)
	local plr = L.plr
	local s = ctx.estados[plr]
	if s then
		s.hambre, s.saturacion = 20, 5
	end
	L.cdG = math.max(0, L.cdG - dt)
	L.pintarT = (L.pintarT or 0) - dt
	local pintar = L.pintarT <= 0
	if pintar then
		L.pintarT = 0.3
	end
	if L.fin then
		return
	end
	-- Generadores de golems
	local golems = 0
	for _, m in ctx.Mobs.lista do
		if esGolem(m) and m.ly == L then
			golems += 1
		end
	end
	for _, sp in L.spawners do
		for i = #sp.hechos, 1, -1 do
			if sp.hechos[i].muerto then
				table.remove(sp.hechos, i)
			end
		end
		sp.t -= dt
		if sp.t <= 0 and #sp.hechos < (sp.tipo == "golemPiedraLY" and 4 or 3) and golems < 14 then
			sp.t = 12
			local m = crearCriatura(L, sp.tipo, sp.x + 0.5, sp.y - 1, sp.z + 1.5)
			if m then
				table.insert(sp.hechos, m)
				golems += 1
			end
		end
	end
	-- Torres de flechas
	for _, t in L.torres do
		t.cd -= dt
		if t.cd <= 0 then
			local o, dm = nil, 15
			for _, m in ctx.Mobs.lista do
				if esPiglin(m) and m.ly == L then
					local d = math.sqrt((m.x - t.x) ^ 2 + (m.z - t.z) ^ 2)
					if d < dm then
						o, dm = m, d
					end
				end
			end
			if o then
				t.cd = 1.4
				ctx.Estado:FireClient(plr, "particulas", Vector3.new(o.x, o.y + 1, o.z) * BS, 0xd8c8a0)
				o.inv = 0
				ctx.Mobs.herir(o, 4, nil, "golem")
			end
		end
	end
	-- Portales piglin: generan piglins; cada cierto tiempo, asaltos
	L.piglinT -= dt
	L.raidT -= dt
	local vivas = {}
	for _, b in L.bases do
		if b.vida > 0 then
			table.insert(vivas, b)
		end
	end
	local nPig = 0
	for _, m in ctx.Mobs.lista do
		if esPiglin(m) and m.ly == L then
			nPig += 1
		end
	end
	if L.piglinT <= 0 then
		L.piglinT = 20
		if nPig < 18 then
			for _, b in vivas do
				for k = 0, 1 do
					crearCriatura(L, math.random() < 0.2 and "piglinBrutoLY" or "piglinLY", b.x + 0.5 + (k == 1 and 2 or -2), b.y + 1.1, b.z + 3.5)
				end
			end
		end
	end
	if L.raidT <= 0 then
		L.raidT = 150
		if #vivas > 0 then
			titulo(plr, "¡ASALTO PIGLIN!", "Defiende la aldea", "#ff5555")
			ctx.Estado:FireClient(plr, "sonido", "nivel")
			for _, b in vivas do
				for k = 0, 3 do
					crearCriatura(L, k == 0 and "piglinBrutoLY" or "piglinLY", b.x + 0.5 + k - 1.5, b.y + 1.1, b.z + 3.5)
				end
			end
		end
	end
	for _, b in L.bases do
		if b.vida <= 0 and not b.rota then
			b.rota = true
			L.oro += 10
			for a = -2, 2 do
				for y = 1, 5 do
					ctx.Mundo.set(b.x + a, b.y + y, b.z, 0, { sinAviso = true })
				end
			end
			ctx.Estado:FireClient(plr, "explosion", Vector3.new(b.x + 0.5, b.y + 2, b.z + 0.5) * BS, 3)
			local quedan = 0
			for _, c in L.bases do
				if c.vida > 0 then
					quedan += 1
				end
			end
			titulo(plr, "¡PORTAL DESTRUIDO!", ("Quedan %d"):format(quedan), "#ffd84a")
		end
	end
	local todas = true
	for _, b in L.bases do
		if b.vida > 0 then
			todas = false
		end
	end
	if todas then
		L.fin = true
		ctx.Estado:FireClient(plr, "sonido", "nivel")
		titulo(plr, "¡VICTORIA!", "Has destruido los tres portales piglin. ¡La aldea está a salvo!", "#ffd84a")
		if ctx.ganarXP then
			ctx.ganarXP(plr, 50)
		end
	elseif L.aldea.vida <= 0 then
		L.fin = true
		local rotas = 0
		for _, b in L.bases do
			if b.vida <= 0 then
				rotas += 1
			end
		end
		titulo(plr, "LA ALDEA HA CAÍDO", ("Destruiste %d de 3 portales"):format(rotas), "#ff5555")
	end
	if L.fin then
		task.delay(8, function()
			if partidas[plr] == L then
				LY.salir(plr, true)
			end
		end)
	end
	if pintar then
		panel(L)
	end
end

function LY.iniciar(c)
	ctx = c
	RunService.Heartbeat:Connect(function(dt)
		dt = math.min(dt, 0.1)
		for _, L in partidas do
			local ok, err = pcall(actualizar, L, dt)
			if not ok then
				warn("[Blockverse] Leyendas: " .. tostring(err))
			end
		end
	end)
end

function LY._partida(plr)
	return partidas[plr]
end

return LY
