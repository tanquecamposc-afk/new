--[[
	Ejecuta el servidor y el cliente de Blockverse dentro del Roblox de mentira:
	un jugador entra, elige supervivencia, pica, fabrica, pone bloques,
	pelea con criaturas, come y pasa la noche. Cualquier error se cuenta.
]]
local F = require("./roblox_falso")
local FU = require("./fuentes")

local fallos = 0
local function ok(c, msg)
	if not c then
		fallos += 1
		print("FALLO: " .. msg)
	end
end

local game = F.crearJuego()
local S = F.servicios
local V3, CF = F.Vector3.new, F.CFrame.new

local function modulo(nombre, fuente, padre)
	local m = F.Instance.new("ModuleScript")
	m.Name = nombre
	m.Source = assert(fuente, "falta " .. nombre)
	m.Parent = padre
	return m
end

-- Árbol del juego, igual que en el .rbxlx
local carpeta = F.Instance.new("Folder")
carpeta.Name = "Blockverse"
carpeta.Parent = S.ReplicatedStorage
for _, n in { "Config", "Bloques", "Generador", "Mallador", "Recetas" } do
	modulo(n, FU["compartido/" .. n], carpeta)
end
local srv = F.Instance.new("Script")
srv.Name = "Servidor"
srv.Source = FU["servidor/init.server"]
srv.Parent = S.ServerScriptService
local mMundo = modulo("Mundo", FU["servidor/Mundo"], srv)
local mMobs = modulo("Mobs", FU["servidor/Mobs"], srv)

local t0 = os.clock()
F.ejecutar(srv)
for _ = 1, 3 do
	F.paso(1 / 30)
end
local Remotos = S.ReplicatedStorage:FindFirstChild("Remotos")
ok(Remotos ~= nil, "no se crearon los remotos")
local Accion, Estado = Remotos.Accion, Remotos.Estado

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
F.alMensajeCliente = function(p, tipo, a, b)
	recibido[tipo] = { a, b }
	Estado.OnClientEvent:Fire(tipo, a, b)
end
F.alMensajeServidor = function(remoto, ...)
	remoto.OnServerEvent:Fire(plr, ...)
end

S.Players.PlayerAdded:Fire(plr)
local char = F.Instance.new("Model")
char.Name = "Prueba"
local root = F.Instance.new("Part")
root.Name = "HumanoidRootPart"
root.CFrame = CF(0, 300, 0)
root.Parent = char
local cabeza = F.Instance.new("Part")
cabeza.Name = "Head"
cabeza.CFrame = CF(0, 301.5, 0)
cabeza.Parent = char
local hum = F.Instance.new("Humanoid")
hum.Parent = char
char.Parent = F.workspace
plr.Character = char
plr.CharacterAdded:Fire(char)

-- El cliente (LocalScript con su Interfaz)
local cli = F.Instance.new("LocalScript")
cli.Name = "Cliente"
cli.Source = FU["cliente/init.client"]
local mInterfaz = modulo("Interfaz", FU["cliente/Interfaz"], cli)
cli.Parent = plr
F.ejecutar(cli)

-- Esperar a que el mundo esté listo
local pasos = 0
while not recibido.listo and pasos < 3000 do
	F.paso(1 / 30)
	pasos += 1
end
ok(recibido.listo ~= nil, "el mundo nunca estuvo listo")
for _, e in F.errores do print(e) end
local Mundo = mMundo._resultado
local Mobs = mMobs._resultado
local Interfaz = mInterfaz._resultado
local nChunks = 0
for _ in Mundo.vistos do
	nChunks += 1
end
local piezas = #Mundo.carpeta:GetDescendants()
print(string.format("mundo listo tras %d pasos · %d chunks dibujados · %d instancias · %.1f s de CPU", pasos, nChunks, piezas, os.clock() - t0))
ok(not root.Anchored, "el jugador sigue anclado")
local B = 3
local p = root.Position
print("jugador en", p)

-- Seguir cargando chunks un rato
for _ = 1, 400 do
	F.paso(1 / 30)
end
nChunks = 0
for _ in Mundo.vistos do
	nChunks += 1
end
print("chunks tras cargar:", nChunks, "· instancias:", #Mundo.carpeta:GetDescendants(), "· escrituras de agua:", F.terreno)

-- Elegir supervivencia desde el menú
Interfaz.alModo("supervivencia")
F.paso(1 / 30)
ok(recibido.modo and recibido.modo[1] == "supervivencia", "no cambió a supervivencia")

local function moverJugador(x, y, z)
	root.CFrame = CF((x + 0.5) * B, y * B + 3, (z + 0.5) * B)
	cabeza.CFrame = CF((x + 0.5) * B, y * B + 4.5, (z + 0.5) * B)
end
local px, pz = math.floor(p.X / B), math.floor(p.Z / B)
local py = Mundo.alturaSuelo(px, pz) + 1
moverJugador(px, py, pz)

local function inv()
	return recibido.inv and recibido.inv[1] or {}
end
local function cuantos(id)
	local t = 0
	for i = 1, 36 do
		local q = inv()[i]
		if q and q.id == id then
			t += q.n
		end
	end
	return t
end
local Bloques = require and nil
Bloques = carpeta.Bloques._resultado
local Recetas = carpeta.Recetas._resultado
local ID = Bloques.porClave

local function romper(x, y, z, herr)
	local b = Mundo.get(x, y, z)
	Accion:FireServer("golpe", x, y, z)
	local t = Bloques.tiempoRomper(b, herr)
	local n = math.ceil(t * 30) + 1
	for _ = 1, n do
		F.paso(1 / 30)
	end
	Accion:FireServer("romper", x, y, z)
	F.paso(1 / 30)
	return Mundo.get(x, y, z) == 0 or Mundo.get(x, y, z) == ID.agua
end

-- Picar la tierra que hay al lado (sin herramienta)
local bx, bz = px + 1, pz
local by = Mundo.alturaSuelo(bx, bz)
local antes = Mundo.get(bx, by, bz)
ok(romper(bx, by, bz, nil), "no se rompió el bloque " .. tostring(antes))
print("roto:", Bloques.nombre(antes), "· inventario:", cuantos(Bloques.porId[antes].suelta))
-- Romper demasiado rápido no debe funcionar
Mundo.set(bx, by, bz, ID.piedra)
Accion:FireServer("golpe", bx, by, bz)
F.paso(1 / 30)
Accion:FireServer("romper", bx, by, bz)
F.paso(1 / 30)
ok(Mundo.get(bx, by, bz) == ID.piedra, "se pudo romper piedra al instante")

-- Troncos → tablones → palos → mesa → pico
for k = 1, 4 do
	Mundo.set(px + 2, py + k - 1, pz, ID.tronco)
end
for k = 4, 1, -1 do
	ok(romper(px + 2, py + k - 1, pz, nil), "no se rompió el tronco " .. k)
end
ok(cuantos(ID.tronco) == 4, "troncos en el inventario: " .. cuantos(ID.tronco))
local function receta(id)
	for i, r in Recetas do
		if r.resultado == id then
			return i
		end
	end
	return nil
end
Accion:FireServer("craftear", receta(ID.tablones), 3)
Accion:FireServer("craftear", receta(ID.palo), 1)
Accion:FireServer("craftear", receta(ID.mesa), 1)
F.paso(1 / 30)
print("tablones:", cuantos(ID.tablones), "· palos:", cuantos(ID.palo), "· mesas:", cuantos(ID.mesa))
ok(cuantos(ID.mesa) == 1 and cuantos(ID.palo) == 4, "recetas a mano")
-- Sin mesa cerca el pico no se puede hacer
Accion:FireServer("craftear", receta(ID.pico_madera), 1)
ok(cuantos(ID.pico_madera) == 0, "pico sin mesa")
-- Poner la mesa (elegir su casilla)
local casillaMesa
for i = 1, 9 do
	local q = inv()[i]
	if q and q.id == ID.mesa then
		casillaMesa = i
	end
end
ok(casillaMesa ~= nil, "la mesa no está en la barra rápida")
Accion:FireServer("sel", casillaMesa)
local mx, mz = px - 2, pz
local my = Mundo.alturaSuelo(mx, mz) + 1
Accion:FireServer("poner", mx, my, mz)
F.paso(1 / 30)
ok(Mundo.get(mx, my, mz) == ID.mesa, "no se puso la mesa (" .. Mundo.get(mx, my, mz) .. ")")
Accion:FireServer("craftear", receta(ID.pico_madera), 1)
F.paso(1 / 30)
ok(cuantos(ID.pico_madera) == 1, "no se fabricó el pico con la mesa cerca")
-- No se puede poner un bloque dentro del jugador
Accion:FireServer("sel", 1)
local q1 = inv()[1]
Accion:FireServer("poner", px, py, pz)
F.paso(1 / 30)
ok(Mundo.get(px, py, pz) ~= (q1 and q1.id), "se puso un bloque dentro del jugador")

-- Piedra con pico: suelta roca y gasta el pico
local slotPico
for i = 1, 9 do
	local q = inv()[i]
	if q and q.id == ID.pico_madera then
		slotPico = i
	end
end
Accion:FireServer("sel", slotPico)
Mundo.set(px + 1, py, pz + 1, ID.piedra)
ok(romper(px + 1, py, pz + 1, ID.pico_madera), "no se rompió la piedra con pico")
ok(cuantos(ID.roca) == 1, "la piedra no dio roca")
ok(inv()[slotPico] and inv()[slotPico].u == Bloques.porId[ID.pico_madera].usos - 1, "el pico no se gastó")

-- Criaturas: un cerdo suelta carne y se puede comer
local cerdo = Mobs.crear("cerdo", px + 1, py - 1, pz + 1)
F.paso(1 / 30)
cerdo.raiz.CFrame = CF((px + 1.5) * B, py * B + 2, (pz + 1.5) * B)
for _ = 1, 12 do
	Accion:FireServer("atacar", cerdo.raiz)
	for _ = 1, 15 do
		F.paso(1 / 30)
	end
end
ok(cerdo.muerto, "el cerdo no murió (vida " .. tostring(cerdo.hum.Health) .. ")")
ok(cuantos(ID.carneCruda) >= 1, "el cerdo no soltó carne")
for _ = 1, 40 do
	F.paso(1 / 30)
end
local slotCarne
for i = 1, 36 do
	local q = inv()[i]
	if q and q.id == ID.carneCruda then
		slotCarne = i
	end
end
if slotCarne and slotCarne > 9 then
	Accion:FireServer("mover", slotCarne, 9)
	slotCarne = 9
end
-- Pasar hambre y comer
for _ = 1, 30 * 85 do
	F.paso(1 / 30)
end
local hambre = recibido.hambre and recibido.hambre[1]
print("hambre tras 85 s:", hambre)
ok(hambre and hambre < 20, "el hambre no baja")
Accion:FireServer("sel", slotCarne)
Accion:FireServer("usar")
F.paso(1 / 30)
ok(recibido.hambre[1] > hambre, "comer no quita el hambre")

-- La noche: aparecen zombis
F.servicios.Lighting.ClockTime = 22
for _ = 1, 30 * 30 do
	F.paso(1 / 30)
	F.servicios.Lighting.ClockTime = 22
end
local zombis = 0
for _, m in Mobs.lista do
	if m.tipo == "zombi" then
		zombis += 1
	end
end
print("zombis de noche:", zombis, "· vida del jugador:", hum.Health)
ok(zombis > 0, "no aparecen zombis de noche")

-- Creativo: romper al instante y paleta
Interfaz.mostrarMenu(true)
Interfaz.alModo("creativo")
F.paso(1 / 30)
ok(recibido.modo[1] == "creativo", "no cambió a creativo")
Mundo.set(px + 3, py, pz, ID.obsidiana)
Accion:FireServer("romper", px + 3, py, pz)
F.paso(1 / 30)
ok(Mundo.get(px + 3, py, pz) == 0, "en creativo no se rompe al instante")
Accion:FireServer("creativo", ID.piedraLuminosa)
F.paso(1 / 30)
ok(inv()[recibido.inv[2] or 1] and inv()[recibido.inv[2] or 1].id == ID.piedraLuminosa, "la paleta creativa no da el bloque")

-- Agua: cavar junto al mar la deja entrar
local ax, az
for x = px - 60, px + 60 do
	for z = pz - 60, pz + 60 do
		if not ax and Mundo.listo(x // 16, z // 16) and Mundo.get(x, 22, z) == ID.agua and Mundo.get(x + 1, 22, z) ~= ID.agua and Mundo.get(x + 1, 22, z) ~= 0 then
			ax, az = x + 1, z
		end
	end
end
if ax then
	moverJugador(ax, 24, az)
	Accion:FireServer("romper", ax, 22, az)
	F.paso(1 / 30)
	ok(Mundo.get(ax, 22, az) == ID.agua, "el agua no entra en el hueco")
else
	print("(no hay costa cerca para probar el agua)")
end

-- Interfaz: abrir y cerrar el inventario con la tecla E
local UIS = F.servicios.UserInputService
UIS.InputBegan:Fire({ UserInputType = F.Enum.UserInputType.Keyboard, KeyCode = F.Enum.KeyCode.E }, false)
F.paso(1 / 30)
ok(Interfaz.abierto(), "la E no abre el inventario")
UIS.InputBegan:Fire({ UserInputType = F.Enum.UserInputType.Keyboard, KeyCode = F.Enum.KeyCode.E }, false)
UIS.InputBegan:Fire({ UserInputType = F.Enum.UserInputType.Keyboard, KeyCode = F.Enum.KeyCode.Three }, false)
F.paso(1 / 30)
ok(not Interfaz.abierto(), "la E no cierra el inventario")
UIS.InputChanged:Fire({ UserInputType = F.Enum.UserInputType.MouseWheel, Position = V3(0, 0, -1) }, false)
F.paso(1 / 30)

-- Quitar chunks al irse lejos
moverJugador(px + 2000, 40, pz)
for _ = 1, 600 do
	F.paso(1 / 30)
end
local quedan = 0
for k, r in Mundo.vistos do
	local cx = tonumber(string.match(r.modelo.Name, "(-?%d+),"))
	if math.abs(cx - (px // 16)) < 10 then
		quedan += 1
	end
end
ok(quedan == 0, "no se quitaron los chunks lejanos (" .. quedan .. ")")

print(string.format("errores en tiempo de ejecución: %d", #F.errores))
for i, e in F.errores do
	if i <= 6 then
		print(e)
	end
end
print(fallos == 0 and #F.errores == 0 and "TODO BIEN" or ("FALLOS: " .. fallos))
