--[[
	Blockverse para Roblox · Kits de Bed Wars (kits46.js del juego web y kits nuevos)
	Cada kit tiene rareza, precio en monedas y tres niveles que mejoran sus números.
	Cada día hay tres kits gratis para probar. Los legendarios tienen una habilidad
	que se usa con la tecla G (o el botón táctil).
	Kits nuevos de la versión de Roblox: Ingeniero (torretas de nieve), Imán (atrae
	los minerales del suelo) y Fantasma (se vuelve invisible y corre).
]]
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Comp = ReplicatedStorage:WaitForChild("Blockverse")
local Config = require(Comp.Config)
local Registro = require(Comp.Registro)

local BS = Config.BLOQUE
local B, I = Registro.B, Registro.I
local function idc(k)
	return B[k] or I[k]
end

local Kits = {}
local ctx -- lo pone BedWars: estados, danar, Mobs, Entidades, Estado, aviso, darOSoltar, enviarJugador, pies, enemigosCerca, invisible

Kits.RAREZAS = { comun = { "Común", "#9aa4b4" }, raro = { "Raro", "#4aa3ff" }, epico = { "Épico", "#b46bff" }, legendario = { "Legendario", "#ffb300" } }
local ROM = { "I", "II", "III" }

local LISTA = {
	{ id = "ninguno", n = "Sin kit", p = 0, r = "comun", ico = "espada_madera", niv = {}, d = function() return "Empiezas solo con la espada de madera." end },
	{ id = "constructor", n = "Constructor", p = 150, r = "comun", ico = "lana_naranja", niv = { lana = { 24, 32, 48 }, cada = { 10, 8, 6 } },
		d = function(v) return ("Apareces con %d de lana y recibes 2 más cada %d s (hasta 64)."):format(v.lana, v.cada) end },
	{ id = "saltarin", n = "Saltarín", p = 150, r = "comun", ico = "pluma", niv = { extra = { 1, 1, 2 }, fuerza = { 9, 10, 10 } },
		d = function(v) return (v.extra > 1 and "Triple" or "Doble") .. " salto: pulsa Espacio otra vez en el aire." end },
	{ id = "velocista", n = "Velocista", p = 200, r = "comun", ico = "azucar", niv = { rapidez = { 1, 1, 2 }, salto = { 0, 1, 1 } },
		d = function(v) return ("Rapidez %s%s durante toda la partida."):format(ROM[v.rapidez], v.salto > 0 and " y Supersalto" or "") end },
	{ id = "minero", n = "Minero", p = 200, r = "comun", ico = "pico_madera", niv = { prisa = { 1, 2, 2 }, pico = { 1, 1, 2 } },
		d = function(v) return ("Pico de %s gratis y Prisa %s: rompes bloques más rápido."):format(v.pico > 1 and "hierro" or "madera", ROM[v.prisa]) end },
	{ id = "arquero", n = "Arquero", p = 300, r = "raro", ico = "arco", niv = { flechas = { 8, 12, 16 }, cada = { 8, 6, 4 }, poder = { 1, 1, 2 } },
		d = function(v) return ("Arco con Poder %s y %d flechas. Recuperas 1 flecha cada %d s (hasta 24)."):format(ROM[v.poder], v.flechas, v.cada) end },
	{ id = "medico", n = "Médico", p = 350, r = "raro", ico = "manzanaDorada", niv = { cada = { 3, 2.5, 2 } },
		d = function(v) return ("Te curas medio corazón cada %g s y curas también a tus compañeros cercanos."):format(v.cada) end },
	{ id = "guerrero", n = "Guerrero", p = 350, r = "raro", ico = "espada_piedra", niv = { espada = { 1, 1, 2 }, filo = { 0, 1, 1 } },
		d = function(v) return ("Empiezas con espada de %s%s."):format(v.espada > 1 and "hierro" or "piedra", v.filo > 0 and " con Filo I" or "") end },
	{ id = "tanque", n = "Tanque", p = 400, r = "raro", ico = "escudo", niv = { red = { 15, 20, 25 } },
		d = function(v) return ("Pantalones y botas de cota desde el inicio y recibes un %d %% menos de daño."):format(v.red) end },
	{ id = "cazarrecompensas", n = "Cazarrecompensas", p = 400, r = "raro", ico = "esmeralda", niv = { hierro = { 8, 12, 16 }, oro = { 3, 4, 6 } },
		d = function(v) return ("Cada baja te paga %d de hierro y %d de oro."):format(v.hierro, v.oro) end },
	{ id = "iman", n = "Imán", p = 300, r = "raro", ico = "lingoteHierro", niv = { radio = { 5, 6, 8 }, extra = { 10, 15, 20 } }, nuevo = true,
		d = function(v) return ("Los minerales del suelo vuelan hacia ti desde %d bloques y tu generador da un %d %% más de hierro."):format(v.radio, v.extra) end },
	{ id = "barbaro", n = "Bárbaro", p = 600, r = "epico", ico = "hacha_hierro", niv = { u1 = { 3, 2, 2 }, u2 = { 6, 5, 4 }, u3 = { 10, 8, 6 } },
		d = function(v) return ("Furia: con %d bajas tu espada sube a piedra, con %d a hierro y con %d a diamante."):format(v.u1, v.u2, v.u3) end },
	{ id = "segador", n = "Segador", p = 600, r = "epico", ico = "azada_diamante", niv = { cura = { 6, 8, 10 }, seg = { 3, 4, 5 } },
		d = function(v) return ("Al eliminar a alguien te curas %g corazones y corres más rápido %d s."):format(v.cura / 2, v.seg) end },
	{ id = "escarcha", n = "Escarcha", p = 650, r = "epico", ico = "hieloAzul", niv = { seg = { 2, 2.5, 3 } },
		d = function(v) return ("Tus golpes congelan: el enemigo va más lento durante %g s."):format(v.seg) end },
	{ id = "piro", n = "Piro", p = 650, r = "epico", ico = "mechero", niv = { seg = { 3, 4, 5 } },
		d = function(v) return ("Tus golpes prenden fuego al enemigo durante %d s."):format(v.seg) end },
	{ id = "planeador", n = "Planeador", p = 550, r = "epico", ico = "elitros", niv = { caida = { 2.4, 2, 1.6 } },
		d = function(v) return ("Mantén Espacio en el aire para planear (caes como mucho a %g bloques/s). ¡Te salva del vacío!"):format(v.caida) end },
	{ id = "vampiro", n = "Vampiro", p = 700, r = "epico", ico = "frasco", niv = { robo = { 25, 30, 35 } },
		d = function(v) return ("Recuperas vida: un %d %% del daño que haces."):format(v.robo) end },
	{ id = "ingeniero", n = "Ingeniero", p = 650, r = "epico", ico = "linternaCalabaza", niv = { cada = { 45, 38, 30 }, dura = { 45, 60, 75 } }, nuevo = true,
		d = function(v) return ("Recibes una torreta de nieve cada %d s (hasta 2). Empuja a los enemigos durante %d s."):format(v.cada, v.dura) end },
	{ id = "ejecutor", n = "Ejecutor", p = 900, r = "legendario", ico = "hacha_diamante", niv = { umbral = { 30, 35, 40 } },
		d = function(v) return ("Tus golpes hacen el triple de daño a enemigos con menos del %d %% de vida."):format(v.umbral) end },
	{ id = "ninja", n = "Ninja", p = 900, r = "legendario", ico = "perlaEnder", niv = { cd = { 6, 5, 4 } }, act = true,
		d = function(v) return ("Habilidad (G): embestida rápida hacia delante, sin recibir daño mientras dura. Recarga %d s."):format(v.cd) end },
	{ id = "martillo", n = "Martillo", p = 1000, r = "legendario", ico = "maza", niv = { cd = { 12, 10, 8 }, dano = { 5, 6, 7 } }, act = true,
		d = function(v) return ("Habilidad (G): saltas muy alto y al caer golpeas a los enemigos cercanos (%g corazones). Recarga %d s."):format(v.dano / 2, v.cd) end },
	{ id = "fantasma", n = "Fantasma", p = 1000, r = "legendario", ico = "huevoDragon", niv = { seg = { 5, 6, 7 }, cd = { 20, 17, 14 } }, act = true, nuevo = true,
		d = function(v) return ("Habilidad (G): te vuelves invisible y corres más durante %d s; los bots te pierden de vista. Recarga %d s."):format(v.seg, v.cd) end },
}
Kits.LISTA = LISTA
local POR_ID = {}
for _, k in LISTA do
	POR_ID[k.id] = k
	k.icono = idc(k.ico) or I.esmeralda
end
Kits.POR_ID = POR_ID
Kits.KITS_BOT = { "tanque", "piro", "escarcha", "vampiro" }

function Kits.valores(id, nivel)
	local k = POR_ID[id] or POR_ID.ninguno
	local v = {}
	for c, t in k.niv do
		v[c] = t[math.min(#t, nivel or 1)]
	end
	return v
end
function Kits.descripcion(id, nivel)
	local k = POR_ID[id] or POR_ID.ninguno
	return k.d(Kits.valores(id, nivel))
end
function Kits.costeMejora(id, nivel)
	local k = POR_ID[id]
	if not k or nivel >= 3 or k.p == 0 then
		return 0
	end
	return math.max(60, math.floor(k.p * (nivel == 1 and 0.6 or 1) / 10 + 0.5) * 10)
end
-- Tres kits gratis cada día (los mismos para todos)
function Kits.gratisHoy()
	local dia = os.time() // 86400
	local r = Random.new(dia * 9301 + 49297)
	local pool = {}
	for _, k in LISTA do
		if k.p > 0 then
			table.insert(pool, k.id)
		end
	end
	for i = #pool, 2, -1 do
		local j = r:NextInteger(1, i)
		pool[i], pool[j] = pool[j], pool[i]
	end
	return { pool[1], pool[2], pool[3] }
end
function Kits.disponible(perfil, id)
	return id == "ninguno" or (perfil.kits[id] ~= nil) or table.find(Kits.gratisHoy(), id) ~= nil
end
function Kits.nivelDe(perfil, id)
	return perfil.kits[id] or 1
end

------------------------------------------------------------------
-- Efectos de los kits durante la partida
------------------------------------------------------------------
-- J.kit = id, J.kitV = valores, J.kitT = temporizadores
local function efecto(s, nombre, t, n)
	local e = s.efectos[nombre]
	if not e or e.t < t or (e.n or 1) < n then
		s.efectos[nombre] = { t = t, n = n }
	end
end

-- Al recibir el equipo inicial (empezar y reaparecer)
function Kits.alEquipar(plr, s, J)
	local id, v = J.kit, J.kitV
	if id == "constructor" then
		ctx.darOSoltar(plr, Registro.pila(J.lana, v.lana))
	elseif id == "minero" then
		if (J.pico or 0) < v.pico then
			J.pico = v.pico
		end
	elseif id == "arquero" then
		local arco = Registro.pila(I.arco, 1)
		arco.enc = { poder = v.poder }
		ctx.darOSoltar(plr, arco)
		ctx.darOSoltar(plr, Registro.pila(I.flecha, v.flechas))
	elseif id == "guerrero" then
		for i = 1, 41 do
			local p = s.inv[i]
			if p and Registro.objetos[p.id] and Registro.objetos[p.id].clave == "espada_madera" then
				s.inv[i] = Registro.pila(idc(v.espada > 1 and "espada_hierro" or "espada_piedra"), 1)
				if v.filo > 0 then
					s.inv[i].enc = { filo = 1 }
				end
			end
		end
	elseif id == "tanque" then
		if (J.armadura or 0) < 1 then
			s.inv[39] = Registro.pila(idc("pantalones_cobre"), 1)
			s.inv[40] = Registro.pila(idc("botas_cobre"), 1)
			s.inv[39].enc = { ligamiento = 1 }
			s.inv[40].enc = { ligamiento = 1 }
		end
	elseif id == "barbaro" then
		local nv = J.furia or 0
		if nv > 0 then
			for i = 1, 41 do
				local p = s.inv[i]
				if p and Registro.objetos[p.id] and Registro.objetos[p.id].clave == "espada_madera" then
					s.inv[i] = Registro.pila(idc(({ "espada_piedra", "espada_hierro", "espada_diamante" })[nv]), 1)
				end
			end
		end
	end
end

-- Cada fotograma de la partida (solo jugadores vivos)
function Kits.tick(plr, s, J, dt)
	local id, v = J.kit, J.kitV
	if not id or id == "ninguno" then
		return
	end
	J.kitT = J.kitT or {}
	local T = J.kitT
	local function cada(clave, seg)
		T[clave] = (T[clave] or 0) + dt
		if T[clave] >= seg then
			T[clave] = 0
			return true
		end
		return false
	end
	if id == "constructor" and cada("lana", v.cada) then
		local n = 0
		for i = 1, 41 do
			if s.inv[i] and s.inv[i].id == J.lana then
				n += s.inv[i].n
			end
		end
		if n < 64 then
			ctx.darOSoltar(plr, Registro.pila(J.lana, 2))
			ctx.enviarJugador(plr)
		end
	elseif id == "velocista" then
		efecto(s, "rapidez", 2, v.rapidez)
		if v.salto > 0 then
			efecto(s, "salto", 2, v.salto)
		end
	elseif id == "minero" then
		efecto(s, "prisa", 2, v.prisa)
	elseif id == "arquero" and cada("flecha", v.cada) then
		local n = 0
		for i = 1, 41 do
			if s.inv[i] and s.inv[i].id == I.flecha then
				n += s.inv[i].n
			end
		end
		if n < 24 then
			ctx.darOSoltar(plr, Registro.pila(I.flecha, 1))
			ctx.enviarJugador(plr)
		end
	elseif id == "medico" and cada("cura", v.cada) then
		local yo = ctx.pies(plr)
		for _, otro in Players:GetPlayers() do
			local Jo = ctx.jugador(otro)
			if Jo and Jo.equipo == J.equipo and Jo.vivo and not Jo.espectador then
				local p = ctx.pies(otro)
				local h = otro.Character and otro.Character:FindFirstChildOfClass("Humanoid")
				if p and h and yo and (p - yo).Magnitude < 6 and h.Health > 0 then
					h.Health = math.min(h.MaxHealth, h.Health + 1)
				end
			end
		end
	elseif id == "iman" then
		-- Los minerales del suelo vuelan hacia el jugador
		local yo = ctx.pies(plr)
		if yo then
			for _, e in ctx.Entidades.lista do
				if e.tipo == "item" and not e.muerta and (e.pila.id == I.lingoteHierro or e.pila.id == I.lingoteOro or e.pila.id == I.diamante or e.pila.id == I.esmeralda) then
					local d = Vector3.new(yo.X - e.x, yo.Y + 0.5 - e.y, yo.Z - e.z)
					local l = d.Magnitude
					if l < v.radio and l > 0.8 then
						e.vx, e.vz = d.X / l * 6, d.Z / l * 6
						e.vy = math.max(e.vy, d.Y / l * 6)
					end
				end
			end
		end
	elseif id == "ingeniero" and cada("torreta", v.cada) then
		local n = 0
		for i = 1, 41 do
			if s.inv[i] and s.inv[i].id == I.torretaBW then
				n += s.inv[i].n
			end
		end
		if n < 2 then
			ctx.darOSoltar(plr, Registro.pila(I.torretaBW, 1))
			ctx.enviarJugador(plr)
			ctx.aviso(plr, "Ingeniero: tienes una torreta de nieve nueva (clic derecho para ponerla)")
		end
	end
end

-- Daño que recibe un jugador con kit
function Kits.modDanoRecibido(J, n)
	if J.kit == "tanque" then
		return n * (1 - J.kitV.red / 100)
	end
	return n
end

-- Golpe de un jugador con kit a un enemigo (jugador o bot). Devuelve el daño final.
-- obj = {plr = …} o {m = …}; vida y vidaMax del objetivo
function Kits.alGolpear(plr, J, obj, dano, vida, vidaMax)
	local id, v = J.kit, J.kitV
	if id == "ejecutor" and vidaMax and vidaMax > 0 and vida / vidaMax < v.umbral / 100 then
		dano *= 3
		ctx.Estado:FireClient(plr, "titulo", "", "¡Ejecución!", "#ffb300")
	elseif id == "piro" then
		if obj.plr then
			local so = ctx.estados[obj.plr]
			if so then
				so.fuego = math.max(so.fuego or 0, v.seg)
			end
		elseif obj.m then
			obj.m.fuego = math.max(obj.m.fuego or 0, v.seg)
		end
	elseif id == "escarcha" then
		if obj.plr then
			local so = ctx.estados[obj.plr]
			if so then
				efecto(so, "lentitud", v.seg, 3)
				ctx.enviarJugador(obj.plr)
			end
		elseif obj.m then
			obj.m.congelado = os.clock() + v.seg
		end
	elseif id == "vampiro" then
		local h = plr.Character and plr.Character:FindFirstChildOfClass("Humanoid")
		if h and h.Health > 0 then
			h.Health = math.min(h.MaxHealth, h.Health + dano * v.robo / 100)
		end
	end
	return dano
end

-- Al eliminar a alguien
function Kits.alMatar(plr, s, J, final)
	local id, v = J.kit, J.kitV
	if id == "cazarrecompensas" then
		ctx.darOSoltar(plr, Registro.pila(I.lingoteHierro, v.hierro))
		ctx.darOSoltar(plr, Registro.pila(I.lingoteOro, v.oro))
		ctx.enviarJugador(plr)
	elseif id == "segador" then
		local h = plr.Character and plr.Character:FindFirstChildOfClass("Humanoid")
		if h then
			h.Health = math.min(h.MaxHealth, h.Health + v.cura)
		end
		efecto(s, "rapidez", v.seg, 2)
		ctx.enviarJugador(plr)
	elseif id == "barbaro" then
		local bajas = (J.bajas or 0) + (J.finales or 0)
		local nv = bajas >= v.u3 and 3 or (bajas >= v.u2 and 2 or (bajas >= v.u1 and 1 or 0))
		if nv > (J.furia or 0) then
			J.furia = nv
			local nueva = ({ "espada_piedra", "espada_hierro", "espada_diamante" })[nv]
			for i = 1, 41 do
				local p = s.inv[i]
				local o = p and Registro.objetos[p.id]
				if o and o.clave and o.clave:sub(1, 7) == "espada_" then
					s.inv[i] = Registro.pila(idc(nueva), 1)
					s.inv[i].enc = p.enc
					break
				end
			end
			ctx.Estado:FireClient(plr, "titulo", "", "¡Furia! Espada mejorada", "#ff5555")
			ctx.enviarJugador(plr)
		end
	end
end

-- Habilidad activa (tecla G). Devuelve un mensaje de recarga si no se puede usar.
function Kits.habilidad(plr, s, J)
	local id, v = J.kit, J.kitV
	local k = POR_ID[id]
	if not k or not k.act then
		return "Tu kit no tiene habilidad"
	end
	local ahora = os.clock()
	if (J.habilidadT or 0) > ahora then
		return ("Habilidad lista en %d s"):format(math.ceil(J.habilidadT - ahora))
	end
	J.habilidadT = ahora + v.cd
	ctx.Estado:FireClient(plr, "habilidad", id, v.cd)
	if id == "ninja" then
		-- El cliente da el impulso; mientras dura no recibe daño
		s.invuln = os.clock() + 0.6
		s.ultimoDano = math.huge
		ctx.Estado:FireClient(plr, "impulso", "embestida", 26)
	elseif id == "martillo" then
		ctx.Estado:FireClient(plr, "impulso", "salto", 15)
		task.delay(0.9, function()
			local yo = ctx.pies(plr)
			if not yo then
				return
			end
			for _, e in ctx.enemigosCerca(plr, J, yo, 4.5) do
				local dir = { x = (e.x - yo.X), z = (e.z - yo.Z) }
				local l = math.max(0.1, math.sqrt(dir.x * dir.x + dir.z * dir.z))
				dir.x, dir.z = dir.x / l * 1.6, dir.z / l * 1.6
				if e.plr then
					ctx.danar(e.plr, v.dano, "jugador", dir)
				elseif e.m then
					ctx.Mobs.herir(e.m, v.dano, dir, "jugador", 1, plr)
				end
			end
			ctx.Estado:FireAllClients("explosion", yo * BS, 1.5)
		end)
	elseif id == "fantasma" then
		efecto(s, "invisibilidad", v.seg, 1)
		efecto(s, "rapidez", v.seg, 2)
		ctx.invisible(plr, v.seg)
		ctx.enviarJugador(plr)
	end
	return nil
end

function Kits.iniciar(c)
	ctx = c
end

return Kits
