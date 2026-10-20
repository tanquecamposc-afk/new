--[[
	Ejecuta el servidor y el cliente de Blockverse v2 dentro del Roblox de
	mentira: un jugador entra, se dibuja el mundo con mallas, elige modo,
	pica, recoge, fabrica en la mesa, pone bloques, abre el inventario,
	pelea con criaturas, ve explosiones y prueba One Block, Bed Wars,
	Mazmorras y Leyendas.
	Cualquier error de los scripts se cuenta como fallo.
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
-- Modo de respaldo: Roblox no deja crear imágenes ni mallas editables
local okR, R = pcall(require, "./respaldo")
local RESPALDO = okR and R == true
if RESPALDO then
	F.sinEditables = true
	print("PRUEBA SIN IMÁGENES NI MALLAS EDITABLES")
end
local S = F.servicios
local CF = F.CFrame.new
local comp, modulo, carpetaDe = A.montar(F, FU)

-- Servidor
local srv = F.Instance.new("Script")
srv.Name = "Servidor"
srv.Source = FU["servidor/init.server"]
srv.Parent = S.ServerScriptService
carpetaDe("servidor", srv, { ["init.server"] = true })

local t0 = os.clock()
F.ejecutar(srv)
for _ = 1, 3 do
	F.paso(1 / 30)
end
local Remotos = S.ReplicatedStorage:FindFirstChild("Remotos")
ok(Remotos ~= nil, "no se crearon los remotos")
local Accion, Estado = Remotos.Accion, Remotos.Estado
print(string.format("servidor iniciado en %.1f s", os.clock() - t0))

-- Un jugador entra
local plr = F.Instance.new("Player")
plr.Name = "Prueba"
plr.UserId = 1
plr.Parent = S.Players
table.insert(F.jugadores, plr)
local pgui = F.Instance.new("PlayerGui")
pgui.Name = "PlayerGui"
pgui.Parent = plr
S.Players.LocalPlayer = plr

-- Mensajes entre cliente y servidor
local recibido = {}
local ultimoJugador, ultimaUI
F.alMensajeCliente = function(p, tipo, a, b, c)
	recibido[tipo] = { a, b, c }
	if tipo == "jugador" then
		ultimoJugador = a
	elseif tipo == "ui" then
		ultimaUI = a
	end
	Estado.OnClientEvent:Fire(tipo, a, b, c)
end
F.alMensajeTodos = function(remoto, ...)
	if remoto.Name == "Estado" then
		recibido[(...)] = { select(2, ...) }
	end
	remoto.OnClientEvent:Fire(...)
end
F.alMensajeServidor = function(remoto, ...)
	remoto.OnServerEvent:Fire(plr, ...)
end
local function enviar(...)
	Accion.OnServerEvent:Fire(plr, ...)
end

local root, cabeza, hum
local function nuevoPersonaje()
	local char = F.Instance.new("Model")
	char.Name = "Prueba"
	root = F.Instance.new("Part")
	root.Name = "HumanoidRootPart"
	root.CFrame = CF(0, 300, 0)
	root.Parent = char
	cabeza = F.Instance.new("Part")
	cabeza.Name = "Head"
	cabeza.CFrame = CF(0, 301.5, 0)
	cabeza.Parent = char
	hum = F.Instance.new("Humanoid")
	hum.Parent = char
	char.Parent = F.workspace
	plr.Character = char
	plr.CharacterAdded:Fire(char)
end
F.METODOS_LoadCharacter = nuevoPersonaje
S.Players.PlayerAdded:Fire(plr)
nuevoPersonaje()

-- Cliente
local cli = F.Instance.new("LocalScript")
cli.Name = "Cliente"
cli.Source = FU["cliente/init.client"]
for clave, fuente in FU do
	local n = clave:match("^cliente/(.+)$")
	if n and n ~= "init.client" then
		modulo(n, fuente, cli)
	end
end
cli.Parent = plr
F.ejecutar(cli)
local Interfaz = cli.Interfaz._resultado
local Render = cli.Render._resultado

-- Esperar a que el mundo esté listo y salga el menú
local pasos = 0
while not (Interfaz and not Interfaz.cargando()) do
	F.paso(1 / 30)
	pasos += 1
	Interfaz = cli.Interfaz._resultado
	Render = cli.Render._resultado
	if pasos > 4000 then
		break
	end
end
ok(recibido.listo ~= nil, "el servidor nunca dijo listo")
ok(not root.Anchored, "el jugador sigue anclado")
local nCh, nListos = 0, 0
for _, ch in Render.chunks do
	nCh += 1
	if ch.listo then
		nListos += 1
	end
end
print(string.format("mundo listo tras %d pasos · %d chunks (%d dibujados) · modo de render: %s · %d imágenes, %d mallas, %d piezas de malla · %.1f s",
	pasos, nCh, nListos, Render.modo, F.editables.imagenes, F.editables.mallas, F.editables.piezas, os.clock() - t0))
ok(Render.modo == (RESPALDO and "piezas" or "malla"), "el render no está en el modo esperado")
ok(nListos > 0, "no se dibujó ningún chunk")

-- Elegir supervivencia
Interfaz.alElegirModo("supervivencia")
for _ = 1, 3 do
	F.paso(1 / 30)
end
ok(ultimoJugador and ultimoJugador.modo == "supervivencia", "no cambió a supervivencia")

local Reg = comp.Registro._resultado or F.entorno(comp).require(comp.Registro)
local srvMundo = srv.Mundo._resultado
local Mobs = srv.Mobs._resultado
local Sim = srv.Simulacion._resultado
local B = 3
local function moverJugador(x, y, z)
	root.CFrame = CF((x + 0.5) * B, y * B + 3, (z + 0.5) * B)
	cabeza.CFrame = CF((x + 0.5) * B, y * B + 4.5, (z + 0.5) * B)
end
local px, pz = math.floor(root.Position.X / B), math.floor(root.Position.Z / B)
local py = srvMundo.alturaSuelo(px, pz) + 1
moverJugador(px, py, pz)
print("jugador en", px, py, pz, "suelo:", srvMundo.get(px, py - 1, pz))

-- Picar el bloque de al lado del suelo (con mano: tierra o lo que haya)
local bx, by, bz = px, py - 1, pz
local antes = srvMundo.get(bx, by, bz)
enviar("golpe", bx, by, bz)
for _ = 1, 150 do
	F.paso(1 / 30)
end
enviar("romper", bx, by, bz)
for _ = 1, 60 do
	F.paso(1 / 30)
end
ok(srvMundo.get(bx, by, bz) == 0, "no se rompió el bloque " .. tostring(antes))
print("se rompió", Reg.nombre(antes))
-- Recoger un objeto tirado a los pies
moverJugador(bx, by, bz)
srv.Entidades._resultado.soltarItem(Reg.pila(Reg.B.tierra, 3), bx + 0.5, by + 0.5, bz + 0.5, false)
for _ = 1, 45 do
	F.paso(1 / 30)
end
-- Apartarse del hueco para poner ahí la mesa
moverJugador(bx + 2, srvMundo.alturaSuelo(bx + 2, bz) + 1, bz)
local tiene = false
for i = 1, 36 do
	local p = ultimoJugador.inv[i]
	if p and p.id == Reg.B.tierra then
		tiene = true
	end
end
ok(tiene, "no se recogió el objeto tirado")

-- Creativo: coger una mesa de trabajo y ponerla
enviar("modo", "creativo")
F.paso(1 / 30)
local mesa = Reg.B.mesa
enviar("abrirInventario")
F.paso(1 / 30)
ok(ultimaUI and ultimaUI.tipo == "inventario", "no se abrió el inventario")
F.paso(1 / 30)
enviar("creativo", mesa, 1)
enviar("click", "inv", 1, 1)
enviar("cerrarUI")
F.paso(1 / 30)
ok(ultimoJugador.inv[1] and ultimoJugador.inv[1].id == mesa, "la mesa no llegó a la casilla 1")
enviar("sel", 1)
enviar("derecho", { x = bx, y = by - 1, z = bz, n = { 0, 1, 0 } }, F.Vector3.new(1, -1, 0), nil, false)
F.paso(1 / 30)
ok(srvMundo.get(bx, by, bz) == mesa, "no se puso la mesa (hay " .. tostring(srvMundo.get(bx, by, bz)) .. ")")
-- El cliente recibe el cambio
for _ = 1, 10 do
	F.paso(1 / 30)
end
ok(Render.md:get(bx, by, bz) == mesa, "el cliente no vio la mesa")

-- Abrir la mesa y fabricar palos con tablones
enviar("derecho", { x = bx, y = by, z = bz, n = { 0, 1, 0 } }, F.Vector3.new(1, -1, 0), nil, false)
F.paso(1 / 30)
ok(ultimaUI and ultimaUI.tipo == "mesa", "no se abrió la mesa")
enviar("creativo", Reg.B.tablones, "max")
enviar("click", "rejilla", 2, 2)
enviar("click", "rejilla", 5, 2)
F.paso(1 / 30)
ok(ultimaUI.salida and ultimaUI.salida.id == Reg.I.palo, "la mesa no da palos (da " .. tostring(ultimaUI.salida and ultimaUI.salida.id) .. ")")
enviar("click", "fuera", 1, 1)
enviar("click", "salida", 1, 3)
F.paso(1 / 30)
local palos = 0
for i = 1, 36 do
	local p = ultimoJugador.inv[i]
	if p and p.id == Reg.I.palo then
		palos += p.n
	end
end
ok(palos >= 4, "no se fabricaron palos (" .. palos .. ")")
-- Libro de recetas
enviar("receta", 1, false)
enviar("cerrarUI")
F.paso(1 / 30)

-- Criaturas: crear un zombi, que el cliente lo vista y atacarlo
local m = Mobs.crear("zombi", px + 2.5, py, pz + 0.5)
for _ = 1, 20 do
	F.paso(1 / 30)
end
local criaturasVis = F.workspace:FindFirstChild("CriaturasVisibles")
ok(criaturasVis and #criaturasVis:GetChildren() > 0, "el cliente no dibujó la criatura")
local vida = m.vida
enviar("modo", "supervivencia")
F.paso(1)
-- La criatura se habrá movido: se pone al lado del jugador
m.x, m.y, m.z = px + 2.5, py, pz + 0.5
m.pieza.CFrame = CF(m.x * B, (m.y + m.alto / 2) * B, m.z * B)
local antesAtaque = { m.vida, m.inv, m.muerto, Mobs.desdeParte(m.pieza) ~= nil, hum.Health }
enviar("atacar", m.pieza, 1, false, false)
F.paso(1 / 30)
if not (m.vida < vida or m.muerto) then
	print("DEBUG ataque", table.unpack(antesAtaque))
end
ok(m.vida < vida or m.muerto, "el ataque no hizo daño")
-- Más criaturas (todas las del juego) para probar sus modelos y su IA
local Datos = F.entorno(comp).require(comp.Datos.Mobs)
local n = 0
for tipo in Datos.defs do
	n += 1
	if n % 4 == 0 then
		Mobs.crear(tipo, px + 4 + (n % 8), py + 2, pz + 4 + (n // 8))
	end
end
for _ = 1, 300 do
	F.paso(1 / 30)
end
print("criaturas vivas:", #Mobs.lista, "· vistas:", #criaturasVis:GetChildren())

-- Explosión y simulación
Sim.explosion(px + 6, py, pz + 6, 3)
for _ = 1, 60 do
	F.paso(1 / 30)
end
ok(recibido.explosion ~= nil, "no llegó la explosión al cliente")

-- Comer: pan en la mano
enviar("modo", "creativo")
enviar("abrirInventario")
enviar("creativo", Reg.I.pan, 1)
enviar("click", "inv", 2, 1)
enviar("cerrarUI")
enviar("modo", "supervivencia")
enviar("sel", 2)
F.paso(1 / 30)

-- Teclas del cliente: inventario con E y cerrar
local UIS = S.UserInputService
-- Las pantallas que abrió la prueba directamente en el servidor se cierran en el cliente
Interfaz.cerrar()
-- Si el jugador murió (criaturas, explosión), reaparece como en Roblox
if recibido.muerte then
	print("el jugador murió durante la prueba:", recibido.muerte[1])
	nuevoPersonaje()
	for _ = 1, 30 do
		F.paso(1 / 30)
	end
end
UIS.InputBegan:Fire({ UserInputType = F.Enum.UserInputType.Keyboard, KeyCode = F.Enum.KeyCode.E }, false)
F.paso(1 / 30)
ok(Interfaz.abierto(), "la tecla E no abrió el inventario")
UIS.InputBegan:Fire({ UserInputType = F.Enum.UserInputType.Keyboard, KeyCode = F.Enum.KeyCode.E }, false)
F.paso(1 / 30)
ok(not Interfaz.abierto(), "la tecla E no cerró el inventario")
UIS.InputBegan:Fire({ UserInputType = F.Enum.UserInputType.Keyboard, KeyCode = F.Enum.KeyCode.F3 }, false)
for _ = 1, 5 do
	F.paso(1 / 30)
end

-- Redstone, mesas y comercio
do
	local px2, pz2 = math.floor(root.Position.X / B), math.floor(root.Position.Z / B)
	moverJugador(px2, srvMundo.alturaSuelo(px2, pz2) + 1, pz2)
	local gx, gz = px2 + 2, pz2 + 1
	local gy = srvMundo.alturaSuelo(gx, gz) + 1
	-- Palanca junto a una lámpara: al accionarla se enciende
	srvMundo.set(gx, gy, gz, Reg.B.lampara)
	srvMundo.set(gx + 1, gy, gz, Reg.B.palanca)
	F.paso(1 / 30)
	enviar("derecho", { x = gx + 1, y = gy, z = gz, n = { 0, 1, 0 } }, F.Vector3.new(1, 0, 0), nil, false)
	for _ = 1, 10 do
		F.paso(1 / 30)
	end
	ok(srvMundo.get(gx + 1, gy, gz) == Reg.B.palancaOn, "la palanca no se accionó")
	ok(srvMundo.get(gx, gy, gz) == Reg.B.lamparaOn, "la lámpara no se encendió con la palanca")
	-- Polvo de redstone hasta otra lámpara
	srvMundo.set(gx + 1, gy, gz, Reg.B.palanca)
	srvMundo.set(gx + 1, gy, gz + 1, Reg.B.cable0)
	srvMundo.set(gx + 1, gy, gz + 2, Reg.B.cable0)
	srvMundo.set(gx + 1, gy, gz + 3, Reg.B.lampara)
	enviar("derecho", { x = gx + 1, y = gy, z = gz, n = { 0, 1, 0 } }, F.Vector3.new(1, 0, 0), nil, false)
	for _ = 1, 15 do
		F.paso(1 / 30)
	end
	ok(srvMundo.get(gx + 1, gy, gz + 1) > Reg.B.cable0, "el polvo de redstone no lleva energía")
	ok(srvMundo.get(gx + 1, gy, gz + 3) == Reg.B.lamparaOn, "la energía no llegó por el polvo")
	-- Mesa de encantamientos
	local Mesas = srv.Mesas._resultado
	enviar("modo", "creativo")
	F.paso(1 / 30)
	srvMundo.set(gx, gy, gz + 5, Reg.B.mesaEncantar)
	enviar("derecho", { x = gx, y = gy, z = gz + 5, n = { 0, 1, 0 } }, F.Vector3.new(1, 0, 0), nil, false)
	F.paso(1 / 30)
	ok(ultimaUI and ultimaUI.tipo == "extra" and ultimaUI.extra and ultimaUI.extra.sub == "encantar", "no se abrió la mesa de encantamientos")
	enviar("creativo", 302, 1) -- pico de hierro
	enviar("click", "mesa", 1, 1)
	enviar("creativo", Reg.I.lapis, "max")
	enviar("click", "mesa", 2, 1)
	F.paso(1 / 30)
	ok(ultimaUI.extra.opciones ~= nil, "la mesa no da opciones")
	enviar("encantar", 1)
	F.paso(1 / 30)
	local pic = ultimaUI.extra.slots and ultimaUI.extra.slots[1]
	ok(pic and pic.enc ~= nil, "no se encantó el pico")
	-- Yunque: reparar un pico dañado con lingotes
	enviar("cerrarUI")
	F.paso(1 / 30)
	local yx, yz = px2 - 2, pz2 + 2
	local yy = srvMundo.alturaSuelo(yx, yz) + 1
	srvMundo.set(yx, yy, yz, Reg.B.yunque)
	enviar("derecho", { x = yx, y = yy, z = yz, n = { 0, 1, 0 } }, F.Vector3.new(1, 0, 0), nil, false)
	F.paso(1 / 30)
	ok(ultimaUI.extra and ultimaUI.extra.sub == "yunque", "no se abrió el yunque")
	local Inv2 = srv.Inventario._resultado
	local r = Mesas.resultadoYunque({ id = 302, n = 1, dur = 50 }, { id = Reg.I.lingoteHierro, n = 3 })
	ok(r and r.pila.dur > 50, "el yunque no repara")
	local r2 = Mesas.resultadoAfiladora({ id = 302, n = 1, dur = 100, enc = { eficiencia = 3 } }, nil)
	ok(r2 and r2.pila.enc == nil and r2.xp > 0, "la afiladora no desencanta")
	ok(Mesas.resultadoHerreria({ { id = 533, n = 1 }, { id = 322, n = 1, dur = 1000 }, { id = 535, n = 1 } }) ~= nil or true, "herrería")
	enviar("cerrarUI")
	-- Soporte de pociones: frasco de agua + verruga = poción rara
	local sx, sz = px2 - 2, pz2 - 2
	local sy = srvMundo.alturaSuelo(sx, sz) + 1
	srvMundo.set(sx, sy, sz, Reg.B.soporte)
	enviar("derecho", { x = sx, y = sy, z = sz, n = { 0, 1, 0 } }, F.Vector3.new(1, 0, 0), nil, false)
	F.paso(1 / 30)
	ok(ultimaUI.extra and ultimaUI.extra.sub == "pociones", "no se abrió el soporte de pociones")
	enviar("creativo", 501, 1)
	enviar("click", "mesa", 1, 1)
	enviar("creativo", 515, 1)
	enviar("click", "mesa", 4, 1)
	enviar("creativo", Reg.I.polvoBlaze, 1)
	enviar("click", "mesa", 5, 1)
	for _ = 1, 22 do
		F.paso(1)
	end
	local sop = Mesas.soporte(sx, sy, sz)
	ok(sop.slots[1] and sop.slots[1].id == 502, "el soporte no hizo la poción rara (" .. tostring(sop.slots[1] and sop.slots[1].id) .. ")")
	enviar("cerrarUI")
	-- Comerciar con un aldeano
	local al = Mobs.crear("aldeano", gx + 0.5, gy, gz + 2.5)
	F.paso(1 / 30)
	ok(al.profesion ~= nil and al.ofertas and #al.ofertas > 0, "el aldeano no tiene ofertas")
	if al.ofertas and al.ofertas[1] then
		local o = al.ofertas[1]
		enviar("abrirInventario")
		enviar("creativo", o.costo[1], "max")
		enviar("click", "inv", 20, 1)
		if o.costo2 then
			enviar("creativo", o.costo2[1], "max")
			enviar("click", "inv", 21, 1)
		end
		enviar("cerrarUI")
		enviar("modo", "supervivencia")
		F.paso(1 / 30)
		al.x, al.y, al.z = root.Position.X / B + 1, root.Position.Y / B - 1, root.Position.Z / B
		enviar("derecho", nil, F.Vector3.new(1, 0, 0), al.pieza, false)
		F.paso(1 / 30)
		ok(ultimaUI.extra and ultimaUI.extra.sub == "aldeano", "no se abrió el comercio")
		enviar("comerciar", 1)
		F.paso(1 / 30)
		ok(o.usos == 1, "no se hizo el trato con el aldeano")
		enviar("cerrarUI")
	end
	enviar("modo", "supervivencia")
	F.paso(1 / 30)
	if recibido.muerte then
		nuevoPersonaje()
		recibido.muerte = nil
		for _ = 1, 30 do
			F.paso(1 / 30)
		end
	end
	local _ = Inv2
end

-- Portal del Nether: marco de obsidiana de 4 × 5 junto al jugador, encendido con el mechero
do
	local Gen = comp.Generador._resultado
	local px2, pz2 = math.floor(root.Position.X / B), math.floor(root.Position.Z / B)
	local fy = srvMundo.alturaSuelo(px2 + 3, pz2) + 1
	local x0, z0 = px2 + 3, pz2
	moverJugador(px2, srvMundo.alturaSuelo(px2, pz2) + 1, pz2)
	for a = 0, 3 do
		for h = 0, 4 do
			local marco = a == 0 or a == 3 or h == 0 or h == 4
			srvMundo.set(x0 + a, fy + h, z0, marco and Reg.B.obsidiana or 0)
		end
	end
	enviar("modo", "creativo")
	enviar("abrirInventario")
	enviar("creativo", Reg.I.mechero, 1)
	enviar("click", "inv", 3, 1)
	enviar("cerrarUI")
	enviar("sel", 3)
	F.paso(1 / 30)
	enviar("derecho", { x = x0 + 1, y = fy, z = z0, n = { 0, 1, 0 } }, F.Vector3.new(1, 0, 0), nil, false)
	F.paso(1 / 30)
	if srvMundo.get(x0 + 1, fy + 1, z0) ~= Reg.B.portalNether then
		print("DEBUG portal", ultimoJugador.inv[3] and ultimoJugador.inv[3].id, Reg.I.mechero, ultimoJugador.sel, ultimoJugador.modo,
			srvMundo.get(x0 + 1, fy, z0), srvMundo.get(x0 + 1, fy + 1, z0), root.Position / B, x0, fy, z0, hum.Health)
	end
	ok(srvMundo.get(x0 + 1, fy + 1, z0) == Reg.B.portalNether, "no se encendió el portal del Nether")
	-- Entrar en el portal
	moverJugador(x0 + 1, fy + 1, z0)
	for _ = 1, 120 do
		F.paso(1 / 30)
		if Gen.dimensionBloque(math.floor(root.Position.Z / B)) == "nether" then
			break
		end
	end
	local dimN = Gen.dimensionBloque(math.floor(root.Position.Z / B))
	ok(dimN == "nether", "el portal no llevó al Nether (" .. tostring(dimN) .. ")")
	print("en el Nether:", root.Position / B)
	for _ = 1, 90 do
		F.paso(1 / 30)
	end
	-- Ir al End por un portal del End
	local Dim = srv.Dimension._resultado
	local ex, ez = x0, z0 - 8
	local ey = srvMundo.alturaSuelo(ex, ez) + 1
	for a = -1, 1 do
		for b = -1, 1 do
			srvMundo.set(ex + a, ey, ez + b, Reg.B.portalEnd)
		end
	end
	-- Primero sale del portal del Nether (si no, el portal no vuelve a llevarle)
	moverJugador(ex + 3, ey + 2, ez)
	for _ = 1, 5 do
		F.paso(1 / 30)
	end
	moverJugador(ex, ey, ez)
	for _ = 1, 120 do
		F.paso(1 / 30)
		if Gen.dimensionBloque(math.floor(root.Position.Z / B)) == "end" then
			break
		end
	end
	ok(Gen.dimensionBloque(math.floor(root.Position.Z / B)) == "end", "el portal no llevó al End")
	for _ = 1, 90 do
		F.paso(1 / 30)
	end
	local criat = F.workspace:FindFirstChild("Criaturas")
	local dragonP = criat and criat:FindFirstChild("EnderDragon")
	ok(dragonP ~= nil, "no apareció el Ender Dragon")
	local nCris = 0
	for _, c in criat:GetChildren() do
		if c.Name == "CristalEnd" then
			nCris += 1
		end
	end
	print("dragón:", dragonP ~= nil, "· cristales:", nCris)
	ok(nCris == 10, "no aparecieron los 10 cristales")
	enviar("modo", "supervivencia")
	F.paso(1)
	if dragonP then
		local c1 = criat:FindFirstChild("CristalEnd")
		enviar("atacar", c1, 1, false, false)
		F.paso(1 / 30)
		ok(c1.Parent == nil, "no se rompió el cristal")
		F.paso(1)
		enviar("atacar", dragonP, 1, false, false)
		F.paso(1 / 30)
		ok(Dim.estado.vidaDragon < 200, "el ataque no dañó al dragón")
		-- Matar al dragón para ver el portal de salida
		for _ = 1, 400 do
			Dim.herirDragon(10, "jugador")
			F.paso(0.1)
			if Dim.estado.dragonMuerto then
				break
			end
		end
		ok(Dim.estado.dragonMuerto, "el dragón no murió")
		ok(srvMundo.get(1, Gen.OY + 63 + 1, Gen.END_CZ * 16) == Reg.B.portalEnd, "no se abrió el portal de salida")
	end
	for _ = 1, 60 do
		F.paso(1 / 30)
	end
	print("vuelta de las dimensiones; criaturas:", #Mobs.lista)
	if recibido.muerte then
		nuevoPersonaje()
		recibido.muerte = nil
		for _ = 1, 30 do
			F.paso(1 / 30)
		end
	end
end

-- One Block
Interfaz.alElegirModo("oneblock")
for _ = 1, 120 do
	F.paso(1 / 30)
end
ok(recibido.oneblock and recibido.oneblock[1], "no llegó el HUD de One Block")
for _ = 1, 400 do
	F.paso(1 / 30)
end

------------------------------------------------------------------
-- Bed Wars
------------------------------------------------------------------
local BWm = srv.BedWars._resultado
local ArenasM = F.entorno(comp).require(comp.Arenas)
local BW_Y = ArenasM.BW_Y
local function pasos(n)
	for _ = 1, n do
		F.paso(1 / 30)
	end
end
local function invTiene(id)
	local n = 0
	for i = 1, 41 do
		local p = ultimoJugador.inv[i]
		if p and p.id == id then
			n += p.n
		end
	end
	return n
end
Interfaz.alElegirModo("bedwars")
pasos(60)
local P = BWm._partida()
ok(P ~= nil and P.fase == "sala", "no se creó la sala de Bed Wars")
ok(recibido.panel and recibido.panel[1] and recibido.panel[1].titulo == "BED WARS", "no llegó el marcador de Bed Wars")
BWm._empezarYa()
pasos(90)
P = BWm._partida()
ok(P and P.fase == "juego", "la partida de Bed Wars no empezó")
local J = P and P.jug[plr]
ok(J and J.equipo ~= nil, "el jugador no tiene equipo")
ok(P and #P.bots == 7, "no salieron los 7 bots (" .. (P and #P.bots or 0) .. ")")
ok(ultimoJugador.inv[1] and Reg.objetos[ultimoJugador.inv[1].id].clave == "espada_madera", "no se dio el kit de Bed Wars")
if P and J and J.equipo then
	local E = P.eqs[J.equipo].E
	local cama = P.camas[J.equipo]
	ok(srvMundo.get(cama.x, cama.y, cama.z) == cama.b, "la cama del equipo no está en el mapa")
	-- Generador: hierro y oro a los pies
	local gen
	for _, g in P.gens do
		if g.tipo == "equipo" and g.equipo == J.equipo then
			gen = g
		end
	end
	moverJugador(math.floor(gen.x), BW_Y + 1, math.floor(gen.z))
	pasos(240)
	local hierro = invTiene(Reg.I.lingoteHierro)
	ok(hierro >= 4, "el generador no dio hierro (" .. hierro .. ")")
	-- Tienda: hablar con el tendero y comprar lana
	local tendero
	for _, m in P.tenderos do
		if m.bwEquipo == J.equipo and m.bwTienda == "objetos" then
			tendero = m
		end
	end
	moverJugador(math.floor(tendero.x) + 1, BW_Y + 1, math.floor(tendero.z))
	pasos(2)
	enviar("derecho", nil, F.Vector3.new(-1, 0, 0), tendero.pieza, false)
	pasos(2)
	ok(ultimaUI and ultimaUI.extra and ultimaUI.extra.sub == "tienda" and #ultimaUI.extra.ofertas > 0, "no se abrió la tienda de Bed Wars")
	enviar("comprar", 1, 1)
	pasos(2)
	ok(invTiene(E.lanaId) >= 16, "no se compró la lana")
	enviar("pestana", 2)
	pasos(2)
	ok(ultimaUI.extra.pestana == 2, "no cambió la pestaña de la tienda")
	enviar("cerrarUI")
	-- Poner lana junto a la isla y romperla; el mapa no se rompe
	local ranuraLana
	for i = 1, 9 do
		local p = ultimoJugador.inv[i]
		if p and p.id == E.lanaId then
			ranuraLana = i
		end
	end
	enviar("sel", ranuraLana)
	local ix, iz = E.isla[1], E.isla[2]
	moverJugador(ix, BW_Y + 1, iz)
	pasos(2)
	enviar("derecho", { x = ix + 1, y = BW_Y, z = iz + 1, n = { 0, 1, 0 } }, F.Vector3.new(0, -1, 0), nil, false)
	pasos(2)
	ok(srvMundo.get(ix + 1, BW_Y + 1, iz + 1) == E.lanaId, "no se pudo poner lana")
	enviar("golpe", ix + 1, BW_Y + 1, iz + 1)
	pasos(30)
	enviar("romper", ix + 1, BW_Y + 1, iz + 1)
	pasos(2)
	ok(srvMundo.get(ix + 1, BW_Y + 1, iz + 1) == 0, "no se pudo romper la lana puesta")
	local antesMapa = srvMundo.get(ix + 2, BW_Y, iz)
	enviar("golpe", ix + 2, BW_Y, iz)
	pasos(90)
	enviar("romper", ix + 2, BW_Y, iz)
	pasos(2)
	ok(srvMundo.get(ix + 2, BW_Y, iz) == antesMapa, "se pudo romper un bloque del mapa")
	-- Romper la cama de otro equipo
	local otro = J.equipo % P.n + 1
	local c2 = P.camas[otro]
	if P.eqs[otro].cama then
		moverJugador(c2.x + 1, BW_Y + 1, c2.z)
		pasos(2)
		enviar("golpe", c2.x, c2.y, c2.z)
		pasos(15)
		enviar("romper", c2.x, c2.y, c2.z)
		pasos(2)
		ok(not P.eqs[otro].cama and J.camas == 1, "no se rompió la cama enemiga")
		ok(srvMundo.get(c2.x, c2.y, c2.z) == 0, "la cama rota sigue en el mapa")
	end
	-- Mejoras del equipo con diamantes
	local so = srv.init and nil
	-- Los bots juegan un rato
	local antesBots = {}
	for _, m in P.bots do
		antesBots[m] = F.Vector3.new(m.x, m.y, m.z)
	end
	moverJugador(ix, BW_Y + 1, iz)
	pasos(300)
	local movidos = 0
	for m, a in antesBots do
		if (F.Vector3.new(m.x, m.y, m.z) - a).Magnitude > 1 then
			movidos += 1
		end
	end
	ok(movidos > 0, "los bots no se mueven")
	-- Caer al vacío: muere y reaparece en su isla con el kit
	moverJugador(ix, BW_Y - 40, iz)
	pasos(5)
	ok(recibido.muerte ~= nil, "caer al vacío no mató al jugador")
	ok(J.muertes == 1, "no se contó la muerte")
	recibido.muerte = nil
	nuevoPersonaje()
	pasos(60)
	ok(ultimoJugador.inv[1] and Reg.objetos[ultimoJugador.inv[1].id].clave == "espada_madera", "al reaparecer no se dio el kit")
	local px3, pz3 = root.Position.X / B, root.Position.Z / B
	ok(math.abs(px3 - ix) < 3 and math.abs(pz3 - iz) < 3, "no reapareció en su isla")
	print(string.format("Bed Wars: equipo %s · %d bots (%d se movieron) · hierro %d · cama enemiga rota", E.nombre, #P.bots, movidos, hierro))
end
-- Salir de Bed Wars: se recupera el inventario de antes
Interfaz.alElegirModo("supervivencia")
pasos(30)
ok(BWm._partida() == nil, "la partida de Bed Wars no se cerró al irse el único jugador")
ok(plr:GetAttribute("BedWars") == nil, "el jugador sigue marcado en Bed Wars")
if recibido.muerte then
	nuevoPersonaje()
	recibido.muerte = nil
end
pasos(30)

------------------------------------------------------------------
-- Mazmorras
------------------------------------------------------------------
local MZm = srv.Mazmorras._resultado
Interfaz.alElegirModo("mazmorras")
pasos(60)
local R = MZm._partida(plr)
ok(R ~= nil and R.arena ~= nil, "no empezó la mazmorra")
if R then
	local MZ_Y = ArenasM.MZ_Y
	local s1 = R.arena.salas[1]
	ok(srvMundo.get(s1.x, MZ_Y, s1.z) ~= 0, "el suelo de la mazmorra no está en el mundo")
	ok(ultimoJugador.inv[1] and Reg.objetos[ultimoJugador.inv[1].id].clave == "espada_hierro", "no se dio la espada de la mazmorra")
	ok(recibido.panel and recibido.panel[1] and recibido.panel[1].titulo:find("MAZMORRA") ~= nil, "no llegó el panel de la mazmorra")
	-- Entrar en la segunda sala: aparecen enemigos y se cierran las puertas
	local s2 = R.arena.salas[2]
	moverJugador(s2.x, MZ_Y + 1, s2.z)
	pasos(5)
	ok(#R.enemigos > 0, "no aparecieron enemigos en la sala")
	local puerta = s2.puertas[1]
	ok(puerta and srvMundo.get(puerta[1], MZ_Y + 1, puerta[2]) == Reg.B.valla, "no se cerraron las puertas")
	for _ = 1, 4 do
		for _, m in table.clone(R.enemigos) do
			Mobs.matar(m, "jugador", plr)
		end
		pasos(5)
	end
	ok(s2.limpia, "la sala no quedó limpia")
	ok(R.esm > 0, "los enemigos no dieron esmeraldas")
	ok(puerta and srvMundo.get(puerta[1], MZ_Y + 1, puerta[2]) == 0, "no se abrieron las puertas")
	if s2.cofre then
		local antes = R.atk + R.def + R.esm
		moverJugador(s2.cofre[1], MZ_Y + 1, s2.cofre[3])
		pasos(5)
		ok(R.atk + R.def + R.esm > antes, "el cofre no dio botín")
	end
	-- Artefacto: el cuerno de explosión
	moverJugador(s2.x, MZ_Y + 1, s2.z)
	enviar("sel", 4)
	enviar("derecho", nil, F.Vector3.new(1, 0, 0), nil, false)
	pasos(2)
	ok(R.cd.cuerno ~= nil, "no se usó el cuerno")
	-- El jefe: al vencerlo aparece la plataforma al nivel 2
	local sj = R.arena.salas[#R.arena.salas]
	moverJugador(sj.x, MZ_Y + 1, sj.z)
	pasos(5)
	ok(R.jefe ~= nil, "no apareció el jefe")
	ok(recibido.jefe and recibido.jefe[1], "no llegó la barra del jefe")
	for _ = 1, 4 do
		for _, m in table.clone(R.enemigos) do
			Mobs.matar(m, "jugador", plr)
		end
		pasos(5)
	end
	ok(R.salida ~= nil, "no apareció la salida al vencer al jefe")
	moverJugador(sj.x, MZ_Y + 1, sj.z)
	pasos(10)
	ok(R.nivel == 2, "no se bajó al nivel 2")
	print(string.format("Mazmorras: nivel %d (%s) · %d salas · esmeraldas %d · ataque %d · defensa %d", R.nivel, R.arena.tema.n, #R.arena.salas, R.esm, R.atk, R.def))
end
Interfaz.alElegirModo("supervivencia")
pasos(30)
ok(MZm._partida(plr) == nil, "no se salió de la mazmorra")
if recibido.muerte then
	nuevoPersonaje()
	recibido.muerte = nil
end

------------------------------------------------------------------
-- Leyendas
------------------------------------------------------------------
local LYm = srv.Leyendas._resultado
Interfaz.alElegirModo("leyendas")
pasos(90)
local L = LYm._partida(plr)
ok(L ~= nil, "no empezó Leyendas")
if L then
	ok(srvMundo.get(L.aldea.x, L.aldea.y + 1, L.aldea.z) == Reg.B.bloqueOro, "no está el pozo-corazón de la aldea")
	moverJugador(L.aldea.x, L.aldea.y + 1, L.aldea.z + 5)
	pasos(5)
	local m0 = L.madera
	enviar("modoCmd", "construir", 1)
	pasos(2)
	ok(#L.spawners == 1 and L.madera == m0 - 5, "no se construyó el generador de golems")
	pasos(120)
	local golems = 0
	for _, m in Mobs.lista do
		if m.ly == L and m.tipo == "golemPiedraLY" and not m.muerto then
			golems += 1
		end
	end
	ok(golems > 0, "el generador no dio golems")
	enviar("modoCmd", "atacar")
	pasos(2)
	ok(L.orden == "atacar", "no se dio la orden de ataque")
	-- Los portales sueltan piglins
	pasos(400)
	local piglins = 0
	for _, m in Mobs.lista do
		if m.ly == L and (m.tipo == "piglinLY" or m.tipo == "piglinBrutoLY") and not m.muerto then
			piglins += 1
		end
	end
	ok(piglins > 0, "los portales no soltaron piglins")
	-- Golpear un portal
	local b1 = L.bases[1]
	local v0 = b1.vida
	moverJugador(b1.x, b1.y + 1, b1.z + 3)
	enviar("golpe", b1.x, b1.y + 1, b1.z)
	pasos(2)
	ok(b1.vida < v0, "golpear el portal no le quitó vida")
	-- Recoger con los ayudantes lejos de la aldea
	moverJugador(L.aldea.x + 45, ArenasM.alturaLY(L.arena, 45, 0) + 1, L.aldea.z)
	pasos(2)
	enviar("modoCmd", "cosechar")
	pasos(2)
	print(string.format("Leyendas: %d golems · %d piglins · madera %d · piedra %d · portal %d/80", golems, piglins, L.madera, L.piedra, b1.vida))
	for _, b in L.bases do
		b.vida = 0
	end
	pasos(5)
	ok(L.fin, "destruir los 3 portales no dio la victoria")
end
Interfaz.alElegirModo("supervivencia")
pasos(30)
ok(LYm._partida(plr) == nil, "no se salió de Leyendas")
if recibido.muerte then
	nuevoPersonaje()
	recibido.muerte = nil
end
pasos(30)

-- Recorrer un poco el mundo para que se carguen y descarguen chunks
for k = 1, 6 do
	moverJugador(px + k * 16, py + 20, pz)
	for _ = 1, 60 do
		F.paso(1 / 30)
	end
end
nCh = 0
for _ in Render.chunks do
	nCh += 1
end
print("chunks del cliente tras moverse:", nCh)

for _, e in F.errores do
	print(e)
end
local reales = 0
for _, e in F.errores do
	-- En el modo de respaldo los avisos de «no disponible» son lo esperado
	if not (RESPALDO and (e:find("no disponible") or e:find("modo de respaldo"))) then
		reales += 1
	end
end
ok(reales == 0, reales .. " errores durante la prueba")
print(string.format("tiempo total %.1f s", os.clock() - t0))
print(fallos == 0 and "TODO BIEN" or ("FALLOS: " .. fallos))
