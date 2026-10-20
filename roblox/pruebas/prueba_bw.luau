--[[
	Prueba larga de Bed Wars (solo el servidor, en el Roblox de mentira): cuatro jugadores
	con kits distintos y bots juegan una partida entera. Pasan momentos de caos, se usan
	minas, torretas, trampolines y habilidades, se rompen las camas por tiempo, sube el
	vacío y la partida termina. No debe salir ningún error: «BED WARS LARGA BIEN».
]]
local F = require("./roblox_falso")
local FU = require("./fuentes")
local A = require("./arbol")

local fallos = 0
local function ok(c, msg)
	if not c then
		fallos += 1
		print("FALLO: " .. msg)
	end
end

F.crearJuego()
F.conDataStore = true
local S = F.servicios
local CF = F.CFrame.new
local V3 = F.Vector3.new
local comp, modulo, carpetaDe = A.montar(F, FU)

local srv = F.Instance.new("Script")
srv.Name = "Servidor"
srv.Source = FU["servidor/init.server"]
srv.Parent = S.ServerScriptService
carpetaDe("servidor", srv, { ["init.server"] = true })
F.ejecutar(srv)
for _ = 1, 3 do
	F.paso(1 / 30)
end
local Remotos = S.ReplicatedStorage:FindFirstChild("Remotos")
local Accion = Remotos.Accion
local req = F.entorno(comp).require
local Reg = req(comp.Registro)
local Arenas = req(comp.Arenas)
local Mundo = srv.Mundo._resultado
local Mobs = srv.Mobs._resultado
local Entidades = srv.Entidades._resultado
local Cont = srv.Contenedores._resultado
local BWm = srv.BedWars._resultado
local MZm = srv.Mazmorras._resultado
local LYm = srv.Leyendas._resultado
local B = 3
local function pasos(n)
	for _ = 1, n do
		F.paso(1 / 30)
	end
end

------------------------------------------------------------------
-- Jugadores de mentira
------------------------------------------------------------------
local datos = {} -- plr -> {ultimo = {[tipo] = {a, b, c}}, jugador, ui, root, cabeza, hum}
F.alMensajeCliente = function(p, tipo, a, b, c)
	local d = datos[p]
	if d then
		d.ultimo[tipo] = { a, b, c }
		if tipo == "jugador" then
			d.jugador = a
		elseif tipo == "ui" then
			d.ui = a
		end
	end
end
local bloquesEnviados = {}
F.alMensajeTodos = function(remoto, ...)
	if remoto.Name == "Bloques" then
		local plano = ...
		for i = 1, #plano, 4 do
			bloquesEnviados[plano[i] .. "," .. plano[i + 1] .. "," .. plano[i + 2]] = plano[i + 3]
		end
	end
end
local function personaje(plr)
	local d = datos[plr]
	local char = F.Instance.new("Model")
	char.Name = plr.Name
	local root = F.Instance.new("Part")
	root.Name = "HumanoidRootPart"
	root.CFrame = CF(0, 300, 0)
	root.Parent = char
	local cab = F.Instance.new("Part")
	cab.Name = "Head"
	cab.CFrame = CF(0, 301.5, 0)
	cab.Parent = char
	local hum = F.Instance.new("Humanoid")
	hum.Parent = char
	char.Parent = F.workspace
	plr.Character = char
	d.root, d.cabeza, d.hum = root, cab, hum
	plr.CharacterAdded:Fire(char)
end
F.METODOS_LoadCharacter = function(plr)
	if plr and datos[plr] then
		personaje(plr)
	end
end
local siguienteId = 0
local function entra(nombre, id)
	siguienteId += 1
	local plr = F.Instance.new("Player")
	plr.Name = nombre
	plr.UserId = id or (1000 + siguienteId)
	plr.Parent = S.Players
	table.insert(F.jugadores, plr)
	datos[plr] = { ultimo = {} }
	S.Players.PlayerAdded:Fire(plr)
	personaje(plr)
	pasos(20)
	return plr
end
local function sale(plr)
	S.Players.PlayerRemoving:Fire(plr)
	local i = table.find(F.jugadores, plr)
	if i then
		table.remove(F.jugadores, i)
	end
	plr.Parent = nil
	if plr.Character then
		plr.Character.Parent = nil
	end
	pasos(5)
end
local function enviar(plr, ...)
	Accion.OnServerEvent:Fire(plr, ...)
end
local function mover(plr, x, y, z)
	local d = datos[plr]
	d.root.CFrame = CF((x + 0.5) * B, y * B + 3, (z + 0.5) * B)
	d.cabeza.CFrame = CF((x + 0.5) * B, y * B + 4.5, (z + 0.5) * B)
end
local function inv(plr)
	return datos[plr].jugador and datos[plr].jugador.inv or {}
end
local function cuenta(plr, id)
	local n = 0
	for i = 1, 41 do
		local p = inv(plr)[i]
		if p and p.id == id then
			n += p.n
		end
	end
	return n
end
local function romper(plr, x, y, z)
	enviar(plr, "golpe", x, y, z)
	pasos(150)
	enviar(plr, "romper", x, y, z)
	pasos(3)
end
-- Coge un objeto en creativo y lo pone en la ranura 1
local function coger(plr, id, cantidad)
	enviar(plr, "modo", "creativo")
	pasos(1)
	enviar(plr, "abrirInventario")
	enviar(plr, "creativo", id, cantidad or "max")
	enviar(plr, "click", "inv", 1, 1)
	enviar(plr, "cerrarUI")
	pasos(2)
end

------------------------------------------------------------------
-- Partida larga
------------------------------------------------------------------
local KitsM = srv.KitsBW._resultado
local jug = {}
for i, n in { "Ana", "Beto", "Carla", "Dani" } do
	local p = entra(n, 200 + i)
	enviar(p, "modo", "supervivencia")
	table.insert(jug, p)
end
pasos(5)
for _, p in jug do
	enviar(p, "modoJuego", "bedwars")
end
pasos(20)
BWm._empezarYa()
pasos(40)
local P = BWm._partida()
ok(P and P.fase == "juego", "no empezó la partida")
-- Kits distintos (también los que tienen efecto continuo)
local kits = { "ingeniero", "iman", "medico", "martillo" }
for i, p in jug do
	local J = P.jug[p]
	J.kit = kits[i]
	J.kitV = KitsM.valores(kits[i], 3)
end
-- Cada uno en su isla
for _, p in jug do
	local E = P.eqs[P.jug[p].equipo].E
	mover(p, E.isla[1], Arenas.BW_Y + 1, E.isla[2])
end
pasos(10)
-- Objetos nuevos: mina y torreta delante de la isla de Ana
local Ja = P.jug[jug[1]]
local Ea = P.eqs[Ja.equipo].E
local function sitio(dx, dz)
	local x, z = Ea.isla[1] + dx, Ea.isla[2] + dz
	if Reg.SOLIDO[Mundo.get(x, Arenas.BW_Y, z)] and Mundo.get(x, Arenas.BW_Y + 1, z) == 0 then
		return { x = x, y = Arenas.BW_Y, z = z, n = { 0, 1, 0 } }
	end
	return nil
end
for _, o in { { Reg.I.minaBW, 2, 0 }, { Reg.I.torretaBW, -2, 0 }, { Reg.I.trampolinBW, 0, -2 } } do
	local obj = sitio(o[2], o[3])
	if obj then
		local pz = { id = o[1], n = 1 }
		BWm.usarObjeto(jug[1], { inv = { pz }, sel = 1 }, pz, V3(1, 0, 0), obj)
		ok(pz.n == 0, "no se pudo poner el objeto " .. o[1])
	end
end
-- Habilidad del Martillo y espectar (sin estar muerto no hace nada)
enviar(jug[4], "modoCmd", "habilidad")
pasos(40)
ok(P.jug[jug[4]].habilidadT ~= nil, "la habilidad del Martillo no se usó")
-- Invisibilidad (kit Fantasma, poción): usarla dos veces seguidas no la deja para siempre
BWm.invisible(jug[2], 1)
BWm.invisible(jug[2], 2)
pasos(15)
ok(datos[jug[2]].cabeza.Transparency == 1, "la invisibilidad no esconde la cabeza")
for _ = 1, 30 do
	F.paso(0.1)
end
ok(datos[jug[2]].cabeza.Transparency == 0, "tras la invisibilidad el jugador sigue invisible")
-- 7 minutos de partida con dos momentos de caos como mínimo
local caos = {}
P.caosT = 30
local function correr(seg)
	for _ = 1, seg * 10 do
		F.paso(0.1)
		if not BWm._partida() or BWm._partida().fin then
			return
		end
		local c = P.caos
		if c and not caos[#caos] or (c and caos[#caos] ~= c) then
			table.insert(caos, c)
		end
		-- Los jugadores vuelven a su isla si se los llevan los golpes
		for _, p in jug do
			local J = P.jug[p]
			if J and J.vivo and not J.espectador and datos[p].hum.Health > 0 then
				local E = P.eqs[J.equipo].E
				local pos = datos[p].root.Position / B
				if pos.Y < Arenas.BW_Y - 5 then
					mover(p, E.isla[1], Arenas.BW_Y + 1, E.isla[2])
				end
			elseif datos[p].hum.Health <= 0 then
				personaje(p)
			end
		end
	end
end
correr(420)
print(("caos: %d momentos · bots vivos: %d · equipos con cama: %d"):format(#caos, (function()
	local n = 0
	for _, m in P.bots do
		if not m.muerto then
			n += 1
		end
	end
	return n
end)(), (function()
	local n = 0
	for _, q in P.eqs do
		if q.cama then
			n += 1
		end
	end
	return n
end)()))
-- Los bots salen de su isla tendiendo puentes (no se quedan atascados en casa)
do
	local col, lejos = 0, 0
	for _ in P.colocados do
		col += 1
	end
	for _, m in P.bots do
		local E = P.eqs[m.bw.equipo].E
		lejos = math.max(lejos, math.sqrt((m.x - E.isla[1]) ^ 2 + (m.z - E.isla[2]) ^ 2))
	end
	print(("bloques puestos: %d · bot más lejos de su isla: %.0f bloques"):format(col, lejos))
	ok(col > 150, "los bots casi no ponen bloques (" .. col .. ")")
end
ok(#caos >= 2, "solo hubo " .. #caos .. " momentos de caos en 7 minutos")
-- Muerte súbita: se rompen las camas y el vacío sube
if BWm._partida() == P and not P.fin then
	P.t = 1495
	correr(40)
	if not P.fin then
		for _, q in P.eqs do
			ok(not q.cama, "quedan camas tras «Camas destruidas»")
		end
		ok(P.vacio > Arenas.BW_Y - 32, "el vacío no sube en la muerte súbita")
		-- Un espectador puede mirar a otro
		for _, p in jug do
			local J = P.jug[p]
			if J and (J.espectador or not J.vivo) then
				enviar(p, "modoCmd", "espectar")
			end
		end
		P.t = 1795
		correr(20)
	end
end
ok(P.fin, "la partida no terminó")
for _, p in jug do
	local f = datos[p].ultimo.finBW and datos[p].ultimo.finBW[1]
	ok(f ~= nil, p.Name .. " no vio la pantalla final")
end
-- A los 10 s se cierra la partida y todos vuelven al mundo normal
for _ = 1, 130 do
	F.paso(0.1)
end
ok(BWm._partida() == nil, "la partida no se cerró")
for _, p in jug do
	ok(p:GetAttribute("BedWars") == nil, p.Name .. " sigue en Bed Wars")
end

for _, e in F.errores do
	print(e)
end
ok(#F.errores == 0, #F.errores .. " errores durante la prueba")
print(fallos == 0 and "BED WARS LARGA BIEN" or ("FALLOS: " .. fallos))
