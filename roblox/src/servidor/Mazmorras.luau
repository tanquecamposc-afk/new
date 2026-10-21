--[[
	Blockverse para Roblox · MAZMORRAS (modos52.js y modos53.js)
	Cada jugador baja a su propia mazmorra: salas cuadradas, redondas y en
	cruz unidas por pasillos, con tres ambientaciones que se turnan por
	nivel (Catacumbas, Cripta y Fortaleza del Nether). Al entrar en una
	sala aparecen enemigos (y élites desde el nivel 2), las puertas se
	cierran con vallas hasta acabar con ellos y las salas grandes traen una
	segunda oleada. Los cofres dan esmeraldas, mejoras de arma y armadura,
	artefactos, pociones y flechas. Hay 3 vidas por nivel y un jefe al
	final; al vencerlo aparece la plataforma verde al siguiente nivel.
	En Roblox la cámara es la normal (no la cenital del web) y los
	artefactos son objetos de la barra que se usan con clic derecho.
]]
local RunService = game:GetService("RunService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Comp = ReplicatedStorage:WaitForChild("Blockverse")
local Config = require(Comp.Config)
local Registro = require(Comp.Registro)
local Arenas = require(Comp.Arenas)

local BS = Config.BLOQUE
local B, I = Registro.B, Registro.I
local MZ_Y = Arenas.MZ_Y

local MZ = {}
local ctx
local partidas = {} -- plr -> estado de su mazmorra

local function idc(k)
	return B[k] or I[k]
end

local ARTEFACTOS = {
	cuerno = { n = "Cuerno de explosión", cd = 8, id = I.cuernoCabra or I.palo },
	botas = { n = "Botas de velocidad", cd = 10, id = I.azucar or I.pluma },
	fuegos = { n = "Flecha de fuegos artificiales", cd = 9, id = I.cohete },
	totem = { n = "Tótem de regeneración", cd = 18, id = I.totem },
}
local ORDEN_ART = { "cuerno", "botas", "fuegos", "totem" }
local ARMADURAS = { "cuero", "cobre", "hierro", "diamante" }

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

------------------------------------------------------------------
-- Equipo del héroe (el ataque y la defensa se ven en el arma y la armadura)
------------------------------------------------------------------
local function contar(s, id)
	local n = 0
	for i = 1, 41 do
		if s.inv[i] and s.inv[i].id == id then
			n += s.inv[i].n
		end
	end
	return n
end
local function equipar(plr, R)
	local s = ctx.estados[plr]
	if not s then
		return
	end
	local espada = R.atk >= 6 and "espada_netherite" or (R.atk >= 3 and "espada_diamante" or "espada_hierro")
	local p = Registro.pila(idc(espada), 1)
	if R.atk > 0 then
		p.enc = { filo = math.min(5, R.atk) }
	end
	s.inv[1] = p
	local mat = ARMADURAS[math.min(4, R.def + 1)]
	local prot = math.max(0, R.def - 3)
	for i, parte in { "casco", "pechera", "pantalones", "botas" } do
		local id = idc(parte .. "_" .. mat) or idc(parte .. "_cuero")
		local a = Registro.pila(id, 1)
		if prot > 0 then
			a.enc = { proteccion = math.min(4, prot) }
		end
		s.inv[36 + i] = a
	end
	ctx.enviarJugador(plr)
end
local function kitInicial(plr, R)
	local s = ctx.estados[plr]
	for i = 1, 41 do
		s.inv[i] = false
	end
	s.cursor = false
	s.inv[2] = Registro.pila(I.arco, 1)
	s.inv[3] = Registro.pila(I.flecha, R.flechas)
	for i, k in R.artefactos do
		s.inv[3 + i] = Registro.pila(ARTEFACTOS[k].id, 1)
	end
	if R.pociones > 0 then
		s.inv[9] = Registro.pila(503, 1)
		for k = 2, R.pociones do
			ctx.darOSoltar(plr, Registro.pila(503, 1))
		end
	end
	s.sel = 1
	equipar(plr, R)
end

------------------------------------------------------------------
-- Enemigos
------------------------------------------------------------------
local function tipoValido(t, alt)
	return ctx.Mobs.DEF[t] and t or alt
end
local function enemigo(R, tipo, x, z, elite)
	local m = ctx.Mobs.crear(tipo, x + 0.5, MZ_Y + 1.05, z + 0.5)
	if not m then
		return nil
	end
	local k = 1 + (R.nivel - 1) * 0.22
	local d = table.clone(m.def)
	d.quemaSol, d.neutralDia = false, false
	d.sueltaMuestra, d.xp = {}, { 0, 0 }
	m.def = d
	m.vida *= k
	m.vidaMax = m.vida
	m.enfadado = 999
	m.atacante = R.plr
	m.domado = true
	m.mz = true
	if elite then
		m.elite = true
		m.vida *= 2.2
		m.vidaMax = m.vida
		d.dano = (d.dano or 3) * 1.4
		ctx.Mobs.escalar(m, 1.18)
		m.pieza:SetAttribute("Etiqueta", "Élite")
	end
	m.alMorir = function(mm)
		if mm.cobrado then
			return
		end
		mm.cobrado = true
		R.esm += math.random(1, 2)
		ctx.Estado:FireClient(R.plr, "particulas", Vector3.new(mm.x, mm.y + 0.8, mm.z) * BS, 0x44ff66)
	end
	table.insert(R.enemigos, m)
	return m
end

local function sitio(R, s)
	for _ = 1, 20 do
		local a = math.random() * 6.28
		local d = 2 + math.random() * (s.r - 2.5)
		local dx, dz = math.floor(math.cos(a) * d + 0.5), math.floor(math.sin(a) * d + 0.5)
		if ctx.Mundo.get(s.x + dx, MZ_Y + 1, s.z + dz) == 0 and ctx.Mundo.get(s.x + dx, MZ_Y, s.z + dz) ~= 0 then
			return s.x + dx, s.z + dz
		end
	end
	return s.x, s.z
end

local function cerrarPuertas(s, cerrar)
	for _, p in s.puertas do
		local x, z, eje = p[1], p[2], p[3]
		for w = -1, 1 do
			local X, Z = x + (eje == 1 and w or 0), z + (eje == 1 and 0 or w)
			for y = 1, 2 do
				ctx.Mundo.set(X, MZ_Y + y, Z, cerrar and B.valla or 0, { sinAviso = true })
			end
		end
	end
end

local function activarSala(R, s)
	s.activada = true
	local T = R.arena.tema
	local tipos = {}
	for _, t in T.tipos do
		table.insert(tipos, tipoValido(t, "zombi"))
	end
	if s.tipo == "jefe" then
		local j = enemigo(R, tipoValido(T.jefe, "vindicador"), s.x, s.z - 4)
		if j then
			j.vida = 90 + 45 * R.nivel
			j.vidaMax = j.vida
			j.def.dano = 5 + R.nivel
			j.def.vel = (j.def.vel or 2.4) * 1.1
			j.jefe = true
			ctx.Mobs.escalar(j, 1.7)
			j.pieza:SetAttribute("Etiqueta", T.jefeN)
			R.jefe = j
		end
		for k = 1, 2 + R.nivel do
			local x, z = sitio(R, s)
			enemigo(R, tipos[(k - 1) % #tipos + 1], x, z)
		end
		s.oleada = 1
		titulo(R.plr, "¡JEFE!", T.jefeN, "#ff5555")
	elseif s.tipo == "tesoro" then
		for k = 1, 2 + R.nivel // 2 do
			local x, z = sitio(R, s)
			enemigo(R, tipos[(k - 1) % #tipos + 1], x, z, k == 1)
		end
		titulo(R.plr, "", "Sala secreta: ¡hay un tesoro escondido!", "#ffd84a")
	else
		local n = 3 + R.nivel + math.random(0, 1)
		for _ = 1, n do
			local x, z = sitio(R, s)
			local el = R.nivel >= 2 and math.random() < 0.12 + R.nivel * 0.02
			enemigo(R, el and tipoValido(T.elite[math.random(1, #T.elite)], "zombi") or tipos[math.random(1, #tipos)], x, z, el)
		end
		if s.r >= 7 then
			s.oleada = 1
		end
	end
	cerrarPuertas(s, true)
	s.cerrada = true
	ctx.Estado:FireClient(R.plr, "sonido", "puerta")
end

local function oleada(R, s)
	s.oleada = 0
	local T = R.arena.tema
	titulo(R.plr, "", "¡Otra oleada!", "#ff9966")
	for k = 1, 2 + R.nivel do
		local a = math.random() * 6.28
		local d = s.r * 0.6
		local t = tipoValido(T.tipos[(k - 1) % #T.tipos + 1], "zombi")
		enemigo(R, t, math.floor(s.x + math.cos(a) * d + 0.5), math.floor(s.z + math.sin(a) * d + 0.5), k == 1 and R.nivel >= 2)
	end
end

local function abrirCofre(R, s)
	local c = s.cofre
	s.cofre = nil
	ctx.Mundo.set(c[1], c[2], c[3], B.cofreAbierto or 0, { sinAviso = true })
	local premios = {}
	local e = math.random(3, 8) + R.nivel
	R.esm += e
	table.insert(premios, ("+%d esmeraldas"):format(e))
	local t = math.random()
	local jefe = s.tipo == "jefe"
	if t < 0.4 or jefe then
		R.atk += 1
		table.insert(premios, ("Arma mejorada (ataque %d)"):format(R.atk))
	end
	if (t >= 0.4 and t < 0.65) or jefe then
		R.def += 1
		table.insert(premios, ("Armadura mejorada (defensa %d)"):format(R.def))
	end
	if t >= 0.65 and t < 0.85 then
		local faltan = {}
		for _, k in ORDEN_ART do
			if not table.find(R.artefactos, k) then
				table.insert(faltan, k)
			end
		end
		if #faltan > 0 and #R.artefactos < 3 then
			local k = faltan[math.random(1, #faltan)]
			table.insert(R.artefactos, k)
			ctx.darOSoltar(R.plr, Registro.pila(ARTEFACTOS[k].id, 1))
			table.insert(premios, "Artefacto: " .. ARTEFACTOS[k].n)
		else
			ctx.darOSoltar(R.plr, Registro.pila(503, 1))
			table.insert(premios, "Poción de curación")
		end
	end
	if t >= 0.85 then
		ctx.darOSoltar(R.plr, Registro.pila(503, 1))
		table.insert(premios, "Poción de curación")
	end
	ctx.darOSoltar(R.plr, Registro.pila(I.flecha, 8))
	table.insert(premios, "+8 flechas")
	equipar(R.plr, R)
	ctx.Estado:FireClient(R.plr, "particulas", Vector3.new(c[1] + 0.5, c[2] + 1, c[3] + 0.5) * BS, 0xffd84a)
	ctx.Estado:FireClient(R.plr, "sonido", "nivel")
	titulo(R.plr, "¡BOTÍN!", table.concat(premios, " · "), "#ffd84a")
end

------------------------------------------------------------------
-- Partida
------------------------------------------------------------------
local function limpiar(R)
	for _, m in R.enemigos do
		if not m.muerto then
			ctx.Mobs.quitar(m)
		end
	end
	R.enemigos = {}
	if R.arena then
		Arenas.borrar(R.arena.id)
	end
	ctx.Estado:FireClient(R.plr, "jefe", nil)
end

local function empezarNivel(R, nivel)
	if R.arena then
		limpiar(R)
	end
	R.nivel = nivel
	R.vidas = 3
	R.jefe, R.salida, R.sala, R.fin = nil, nil, 1, false
	R.arena = Arenas.nueva("mz", nivel, nivel * 7919 + math.random(1, 1000000))
	local s0 = R.arena.salas[1]
	local plr = R.plr
	kitInicial(plr, R)
	task.spawn(ctx.teletransportar, plr, s0.x + 0.5, MZ_Y + 1, s0.z + 0.5, nil)
	titulo(plr, ("MAZMORRA · NIVEL %d"):format(nivel), nivel == 1 and "¡Adelante, héroe!" or ("%s: más profundo…"):format(R.arena.tema.n), "#ffd84a")
end

function MZ.en(plr)
	return partidas[plr] ~= nil
end

function MZ.unirse(plr)
	local s = ctx.estados[plr]
	if not s or partidas[plr] then
		return
	end
	local R = {
		plr = plr, nivel = 1, vidas = 3, esm = 0, atk = 0, def = 0, flechas = 20, pociones = 1, artefactos = { "cuerno" }, cd = {},
		enemigos = {}, guardado = { inv = s.inv, xp = s.xp, modo = s.modo, cama = s.cama },
	}
	partidas[plr] = R
	s.inv = table.create(41, false)
	s.cama = nil
	s.modo = "supervivencia"
	plr:SetAttribute("Modo", "supervivencia")
	plr:SetAttribute("Mazmorras", true)
	empezarNivel(R, 1)
end

function MZ.salir(plr, fin)
	local R = partidas[plr]
	if not R then
		return
	end
	partidas[plr] = nil
	limpiar(R)
	local s = ctx.estados[plr]
	if s then
		s.inv, s.xp, s.modo, s.cama = R.guardado.inv, R.guardado.xp, R.guardado.modo or "supervivencia", R.guardado.cama
		s.ui = nil
		plr:SetAttribute("Modo", s.modo)
	end
	plr:SetAttribute("Mazmorras", nil)
	ctx.Estado:FireClient(plr, "panel", nil)
	if plr.Parent then
		if fin then
			ctx.Estado:FireClient(plr, "menu", true)
		end
		plr:LoadCharacter()
	end
end

function MZ.puntoAparicion(plr)
	local R = partidas[plr]
	if not R or not R.arena then
		return nil
	end
	local s = R.arena.salas[R.sala] or R.arena.salas[1]
	return { s.x, MZ_Y + 1, s.z }
end

function MZ.alMorir(plr)
	local R = partidas[plr]
	if not R or R.fin then
		return
	end
	R.vidas -= 1
	if R.vidas <= 0 then
		R.fin = true
		titulo(plr, "HAS CAÍDO", ("Llegaste al nivel %d con %d esmeraldas"):format(R.nivel, R.esm), "#ff5555")
		ctx.aviso(plr, ("Mazmorra terminada: nivel %d · %d esmeraldas"):format(R.nivel, R.esm))
		task.delay(6, function()
			if partidas[plr] == R then
				MZ.salir(plr, true)
			end
		end)
		return
	end
	titulo(plr, "", ("Te quedan %d %s"):format(R.vidas, R.vidas == 1 and "vida" or "vidas"), "#ff8888")
end

-- Vida extra (tienda de Robux)
function MZ.puedeVidaExtra(plr)
	local R = partidas[plr]
	return R ~= nil and not R.fin
end
function MZ.vidaExtra(plr)
	local R = partidas[plr]
	if not R or R.fin then
		return false
	end
	R.vidas += 1
	titulo(plr, "", ("♥ ¡Vida extra! Tienes %d"):format(R.vidas), "#ff8888")
	return true
end

-- La defensa reduce el daño
function MZ.modDano(plr, n, tipo)
	local R = partidas[plr]
	if not R or tipo == "vacio" then
		return n
	end
	return n * math.max(0.3, 1 - R.def * 0.08)
end

-- Artefactos (clic derecho con ellos en la mano)
function MZ.usarObjeto(plr, s, p, dir)
	local R = partidas[plr]
	if not R or not p then
		return false
	end
	local clave
	for k, A in ARTEFACTOS do
		if A.id == p.id and table.find(R.artefactos, k) then
			clave = k
		end
	end
	if not clave then
		return false
	end
	local A = ARTEFACTOS[clave]
	local t = os.clock()
	if (R.cd[clave] or 0) > t then
		ctx.aviso(plr, ("%s: listo en %d s"):format(A.n, math.ceil(R.cd[clave] - t)))
		return true
	end
	local pos, h = pies(plr)
	if not pos then
		return true
	end
	if clave == "cuerno" then
		for _, m in R.enemigos do
			if not m.muerto then
				local dx, dz = m.x - pos.X, m.z - pos.Z
				local d = math.sqrt(dx * dx + dz * dz)
				if d < 5 then
					d = d > 0 and d or 1
					m.inv = 0
					ctx.Mobs.herir(m, 4 + R.atk, { x = dx / d * 1.8, z = dz / d * 1.8 }, "jugador", 2, plr)
				end
			end
		end
		ctx.Estado:FireClient(plr, "explosion", pos * BS, 1)
	elseif clave == "botas" then
		s.efectos.rapidez = { t = 5, n = 3 }
		ctx.enviarJugador(plr)
	elseif clave == "fuegos" then
		local obj, dm = nil, 16
		for _, m in R.enemigos do
			if not m.muerto then
				local d = math.sqrt((m.x - pos.X) ^ 2 + (m.z - pos.Z) ^ 2)
				if d < dm then
					obj, dm = m, d
				end
			end
		end
		if not obj then
			ctx.aviso(plr, "No hay enemigos cerca")
			return true
		end
		for _, m in R.enemigos do
			if not m.muerto and math.sqrt((m.x - obj.x) ^ 2 + (m.z - obj.z) ^ 2) < 3.2 then
				m.inv = 0
				ctx.Mobs.herir(m, 9 + R.atk * 2, nil, "jugador", 0, plr)
			end
		end
		ctx.Estado:FireClient(plr, "particulas", Vector3.new(obj.x, obj.y + 1.2, obj.z) * BS, 0xff80d0)
	elseif clave == "totem" then
		h.Health = math.min(h.MaxHealth, h.Health + 8)
		s.efectos.regeneracion = { t = 5, n = 1 }
		ctx.enviarJugador(plr)
	end
	R.cd[clave] = t + A.cd
	return true
end

------------------------------------------------------------------
-- Bucle
------------------------------------------------------------------
local function panel(R)
	local L = {}
	local function linea(t, c)
		table.insert(L, { t = t, c = c or "#ffffff" })
	end
	local s = ctx.estados[R.plr]
	linea("Vidas: " .. string.rep("♥", R.vidas), "#ff6666")
	linea(("Esmeraldas: %d"):format(R.esm), "#55ff55")
	linea(("Ataque %d · Defensa %d"):format(R.atk, R.def))
	linea(("Flechas %d · Pociones %d"):format(s and contar(s, I.flecha) or 0, s and contar(s, 503) or 0))
	local t = os.clock()
	for _, k in R.artefactos do
		local A = ARTEFACTOS[k]
		local cd = (R.cd[k] or 0) - t
		linea(A.n .. (cd > 0 and (" · " .. math.ceil(cd) .. " s") or " · listo"), cd > 0 and "#aaaaaa" or "#ffd84a")
	end
	local vivos = 0
	for _, m in R.enemigos do
		if not m.muerto then
			vivos += 1
		end
	end
	linea(vivos > 0 and ("Enemigos cerca: " .. vivos) or "Explora: cada sala trae enemigos y botín", "#aabbcc")
	linea("Clic dcho. con un artefacto para usarlo", "#aabbcc")
	local botones = nil
	if ctx.robux and ctx.robux("vidaMZ") and not R.fin then
		botones = { { t = "♥ Vida extra", sub = R.vidas <= 1 and "¡Te queda una! · Robux" or "Una vida más · Robux", cmd = "robux", arg = "vidaMZ", activo = true } }
	end
	ctx.Estado:FireClient(R.plr, "panel", { titulo = ("MAZMORRA · NIVEL %d"):format(R.nivel), lineas = L, col = R.arena.tema.col, botones = botones })
end

local function actualizar(R, dt)
	local plr = R.plr
	local s = ctx.estados[plr]
	if s then
		s.hambre, s.saturacion = 20, 5
	end
	local pos, h = pies(plr)
	R.pintarT = (R.pintarT or 0) - dt
	local pintar = R.pintarT <= 0
	if pintar then
		R.pintarT = 0.3
	end
	-- Jefe
	if R.jefe then
		R.jefeT = (R.jefeT or 0) - dt
		if not R.jefe.muerto and R.jefeT <= 0 then
			R.jefeT = 0.25
			ctx.Estado:FireClient(plr, "jefe", { nombre = R.arena.tema.jefeN .. " · Nivel " .. R.nivel, f = R.jefe.vida / R.jefe.vidaMax, col = "#ff5555" })
		end
		if R.jefe.muerto and not R.salida then
			local sa = R.arena.salas[#R.arena.salas]
			R.salida = { sa.x, sa.z }
			for a = -1, 1 do
				for b = -1, 1 do
					ctx.Mundo.set(sa.x + a, MZ_Y, sa.z + b, B.bloqueEsmeralda or B.bloqueOro, { sinAviso = true })
				end
			end
			ctx.Estado:FireClient(plr, "jefe", nil)
			ctx.Estado:FireClient(plr, "sonido", "nivel")
			titulo(plr, "¡JEFE DERROTADO!", "Pisa la plataforma verde para bajar al siguiente nivel", "#7fff7f")
			if ctx.logro then
				ctx.logro(plr, "mazmorra")
			end
			if ctx.progreso then
				ctx.progreso(plr, "jefeMZ", 1)
			end
		end
	end
	if not pos or R.fin then
		if pintar then
			panel(R)
		end
		return
	end
	if pos.Y < MZ_Y - 12 then
		s.ultimaCausa = "vacio"
		h.Health = 0
		return
	end
	-- Salas: se activan al entrar
	for i, sa in R.arena.salas do
		if math.abs(pos.X - sa.x - 0.5) <= sa.r and math.abs(pos.Z - sa.z - 0.5) <= sa.r then
			R.sala = i
			if not sa.activada then
				activarSala(R, sa)
			end
			if sa.cofre and sa.limpia and math.sqrt((pos.X - sa.cofre[1] - 0.5) ^ 2 + (pos.Z - sa.cofre[3] - 0.5) ^ 2) < 1.8 then
				abrirCofre(R, sa)
			end
		end
	end
	-- ¿Sala limpia? Segunda oleada o se abren las puertas
	for _, sa in R.arena.salas do
		if sa.activada and not sa.limpia then
			local quedan = false
			for _, m in R.enemigos do
				if not m.muerto and math.abs(m.x - sa.x) <= sa.r + 2 and math.abs(m.z - sa.z) <= sa.r + 2 then
					quedan = true
					break
				end
			end
			if not quedan then
				if sa.oleada == 1 and sa.tipo ~= "jefe" then
					oleada(R, sa)
				else
					sa.limpia = true
					if ctx.progreso then
						ctx.progreso(plr, "salaMZ", 1)
					end
					if sa.cerrada then
						sa.cerrada = false
						cerrarPuertas(sa, false)
						ctx.Estado:FireClient(plr, "sonido", "puerta")
					end
				end
			end
		end
	end
	for i = #R.enemigos, 1, -1 do
		if R.enemigos[i].muerto then
			table.remove(R.enemigos, i)
		end
	end
	if R.salida then
		R.chispaT = (R.chispaT or 0) - dt
		if R.chispaT <= 0 then
			R.chispaT = 0.5
			ctx.Estado:FireClient(plr, "particulas", Vector3.new(R.salida[1] + 0.5, MZ_Y + 1.2, R.salida[2] + 0.5) * BS, 0x66ff99)
		end
		if math.sqrt((pos.X - R.salida[1] - 0.5) ^ 2 + (pos.Z - R.salida[2] - 0.5) ^ 2) < 1.6 and math.abs(pos.Y - MZ_Y - 1) < 1.5 then
			titulo(plr, "", "¡Nivel superado!", "#7fff7f")
			empezarNivel(R, R.nivel + 1)
			return
		end
	end
	if pintar then
		panel(R)
	end
end

function MZ.iniciar(c)
	ctx = c
	RunService.Heartbeat:Connect(function(dt)
		dt = math.min(dt, 0.1)
		for _, R in partidas do
			local ok, err = pcall(actualizar, R, dt)
			if not ok then
				warn("[Blockverse] Mazmorras: " .. tostring(err))
			end
		end
	end)
end

function MZ._partida(plr)
	return partidas[plr]
end

return MZ
