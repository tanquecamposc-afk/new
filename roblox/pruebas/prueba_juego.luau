--[[
	Ejecuta el servidor y el cliente de Blockverse v2 dentro del Roblox de
	mentira: un jugador entra, se dibuja el mundo con mallas, elige modo,
	pica, recoge, fabrica en la mesa, pone bloques, abre el inventario,
	pelea con criaturas, ve explosiones y prueba One Block.
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

-- One Block
Interfaz.alElegirModo("oneblock")
for _ = 1, 120 do
	F.paso(1 / 30)
end
ok(recibido.oneblock and recibido.oneblock[1], "no llegó el HUD de One Block")
for _ = 1, 400 do
	F.paso(1 / 30)
end

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
