--[[
	Prueba con varios jugadores a la vez (solo el servidor, en el Roblox de mentira):
	· Supervivencia: los cambios de bloques llegan a todos, un jugador recoge lo que
	  rompe otro, cofre compartido (los dos ven lo mismo), sin golpes entre jugadores,
	  al morir se sueltan los objetos y otro los recoge, y el inventario se guarda al
	  salir y se recupera al volver.
	· Bed Wars con varios jugadores reales: equipos, golpes entre equipos (y no entre
	  compañeros), romper la cama de otro jugador, baja final, espectador, irse a
	  mitad de partida, llegar con la partida empezada, victoria y vuelta al mundo
	  normal con el inventario de antes.
	· Mazmorras y Leyendas a la vez: cada jugador tiene la suya.
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
local aTodos = {} -- tipo -> último mensaje de Estado enviado a todos
F.alMensajeTodos = function(remoto, ...)
	if remoto.Name == "Estado" then
		local tipo = ...
		aTodos[tipo] = { select(2, ...) }
	end
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
-- SUPERVIVENCIA
------------------------------------------------------------------
local ana = entra("Ana", 101)
local beto = entra("Beto", 102)
pasos(30)
enviar(ana, "modo", "supervivencia")
enviar(beto, "modo", "supervivencia")
pasos(5)
ok(datos[ana].jugador and datos[ana].jugador.modo == "supervivencia", "Ana no está en supervivencia")
ok(datos[beto].jugador and datos[beto].jugador.modo == "supervivencia", "Beto no está en supervivencia")
-- Una plataforma de tierra en el cielo, para no depender del terreno de la semilla
local sx, sy, sz = 8, 170, 8
for x = -4, 20 do
	for z = -4, 20 do
		for y = sy - 3, sy do
			Mundo.set(x, y, z, Reg.B.tierra, { sinAviso = true })
		end
		for y = sy + 1, sy + 6 do
			Mundo.set(x, y, z, 0, { sinAviso = true })
		end
	end
end
pasos(5)
-- Ana rompe un bloque: a todos les llega el cambio
mover(ana, sx + 1, sy + 1, sz)
mover(beto, sx + 3, sy + 1, sz)
local antes = Mundo.get(sx, sy, sz)
table.clear(bloquesEnviados)
romper(ana, sx, sy, sz)
ok(Mundo.get(sx, sy, sz) == 0, "Ana no pudo romper el bloque " .. Reg.nombre(antes))
ok(bloquesEnviados[sx .. "," .. sy .. "," .. sz] == 0, "el cambio de bloque no se envió a todos")
-- Beto recoge lo que soltó
mover(beto, sx, sy, sz)
pasos(60)
ok(cuenta(beto, antes) + cuenta(ana, antes) >= 1, "nadie recogió el bloque roto")
print("supervivencia: Ana rompió", Reg.nombre(antes), "· Beto tiene", cuenta(beto, antes), "· Ana", cuenta(ana, antes))

-- Cofre compartido
coger(ana, Reg.B.cofre, 1)
local cx, cy, cz = sx + 4, sy + 1, sz
mover(ana, cx - 2, cy, cz)
enviar(ana, "sel", 1)
enviar(ana, "derecho", { x = cx, y = cy - 1, z = cz, n = { 0, 1, 0 } }, V3(1, -1, 0), nil, false)
pasos(3)
ok(Mundo.get(cx, cy, cz) == Reg.B.cofre, "no se puso el cofre")
coger(ana, Reg.I.diamante, "max")
enviar(ana, "modo", "supervivencia")
pasos(2)
mover(beto, cx + 2, cy, cz)
enviar(ana, "derecho", { x = cx, y = cy, z = cz, n = { 0, 1, 0 } }, V3(1, -1, 0), nil, false)
enviar(beto, "derecho", { x = cx, y = cy, z = cz, n = { 0, 1, 0 } }, V3(-1, -1, 0), nil, false)
pasos(3)
ok(datos[ana].ui and datos[ana].ui.tipo == "cofre", "Ana no abrió el cofre")
ok(datos[beto].ui and datos[beto].ui.tipo == "cofre", "Beto no abrió el cofre")
enviar(ana, "click", "inv", 1, 1)
enviar(ana, "click", "cofre", 1, 1)
pasos(3)
local cofreBeto = datos[beto].ui and datos[beto].ui.cofre
ok(cofreBeto and cofreBeto[1] and cofreBeto[1].id == Reg.I.diamante, "Beto no ve en el cofre lo que puso Ana (no se refresca)")
enviar(beto, "click", "cofre", 1, 1)
enviar(beto, "click", "inv", 2, 1)
pasos(3)
ok(cuenta(beto, Reg.I.diamante) >= 1, "Beto no pudo sacar los diamantes del cofre")
local cofreAna = datos[ana].ui and datos[ana].ui.cofre
ok(not (cofreAna and cofreAna[1]), "Ana sigue viendo los diamantes que se llevó Beto")
-- Si Beto rompe el cofre, a Ana se le cierra la pantalla
datos[ana].ultimo.cerrarUI = nil
romper(beto, cx, cy, cz)
ok(Mundo.get(cx, cy, cz) == 0, "Beto no pudo romper el cofre")
ok(datos[ana].ultimo.cerrarUI ~= nil, "a Ana no se le cerró el cofre que rompió Beto")
enviar(ana, "cerrarUI")
enviar(beto, "cerrarUI")
pasos(2)

-- Sin golpes entre jugadores en supervivencia
local vidaBeto = datos[beto].hum.Health
mover(ana, cx, cy, cz - 2)
mover(beto, cx, cy, cz - 1)
pasos(20)
enviar(ana, "atacar", datos[beto].root, 1, false, false)
pasos(3)
ok(datos[beto].hum.Health == vidaBeto, "en supervivencia un jugador puede herir a otro")

-- Beto muere: suelta los diamantes y Ana los recoge
local diamBeto = cuenta(beto, Reg.I.diamante)
mover(beto, cx + 1, cy, cz + 3)
pasos(2)
datos[beto].hum.Health = 0
pasos(5)
ok(cuenta(beto, Reg.I.diamante) == 0, "Beto conserva los objetos al morir en supervivencia")
local diamAna = cuenta(ana, Reg.I.diamante)
mover(ana, cx + 1, cy, cz + 3)
pasos(90)
ok(cuenta(ana, Reg.I.diamante) >= diamAna + diamBeto, "Ana no recogió lo que soltó Beto")
personaje(beto)
pasos(30)
print("supervivencia: Beto murió y Ana recogió", cuenta(ana, Reg.I.diamante) - diamAna, "diamantes")

-- Enemigos: no persiguen a través de una pared, no se tiran por un borde, se avisan entre ellos
mover(ana, 0, sy + 1, 8)
mover(beto, -3, sy + 1, -3)
for z = -4, 20 do
	for y = sy + 1, sy + 5 do
		Mundo.set(5, y, z, Reg.B.piedra)
	end
end
pasos(3)
local c1 = Mobs.crear("creeper", 12.5, sy + 1, 8.5)
ok(c1 ~= nil, "no se pudo crear un creeper de prueba")
if c1 then
	pasos(60)
	ok(c1.pieza:GetAttribute("persigue") ~= true, "el creeper persigue a Ana a través de una pared")
	for z = -4, 20 do
		for y = sy + 1, sy + 5 do
			Mundo.set(5, y, z, 0)
		end
	end
	pasos(45)
	ok(c1.pieza:GetAttribute("persigue") == true, "el creeper no persigue a Ana cuando la ve")
	Mobs.quitar(c1)
end
-- Borde: Beto al otro lado de un hueco; el creeper se para en el borde
mover(ana, -3, sy + 1, 18)
mover(beto, 27, sy + 1, 8)
local c2 = Mobs.crear("creeper", 17.5, sy + 1, 8.5)
if c2 then
	pasos(150)
	ok(c2.x < 21.2 and c2.y > sy - 1, ("el creeper se tiró por el borde (x=%.1f y=%.1f)"):format(c2.x, c2.y))
	Mobs.quitar(c2)
end
-- Golpear a uno avisa a los de su clase que estén cerca; la vida llega al cliente
local c3 = Mobs.crear("creeper", 2.5, sy + 1, 2.5)
local c4 = Mobs.crear("creeper", 5.5, sy + 1, 3.5)
if c3 and c4 then
	Mobs.herir(c3, 2, nil, "jugador", 0, ana)
	ok(c4.atacante == ana and c4.enfadado > 0, "los enemigos cercanos no acuden al golpear a uno")
	local f = c3.pieza:GetAttribute("vida")
	ok(f and f < 1 and f > 0, "la vida del enemigo no llega al cliente para la barra")
	Mobs.quitar(c3)
	Mobs.quitar(c4)
end
pasos(3)
-- Logros: coger un tronco y acabar con un monstruo; salen en la tabla de jugadores y se guardan
local Clima = srv.Clima._resultado
mover(ana, sx, sy + 1, sz)
pasos(3)
Entidades.soltarItem(Reg.pila(Reg.B.tronco, 1), sx + 0.5, sy + 1.2, sz + 0.5, false)
pasos(45)
local lg = datos[ana].ultimo.logro and datos[ana].ultimo.logro[1]
ok(lg and lg.id == "madera", "no salió el logro «¡A por madera!» al coger un tronco")
local zm = Mobs.crear("zombi", sx + 3.5, sy + 1, sz + 0.5)
if zm then
	Mobs.herir(zm, 100, nil, "jugador", 0, ana)
	pasos(3)
	lg = datos[ana].ultimo.logro and datos[ana].ultimo.logro[1]
	ok(lg and lg.id == "cazador", "no salió el logro al acabar con un monstruo")
end
local ls = ana:FindFirstChild("leaderstats")
ok(ls and ls:FindFirstChild("Logros") and ls:FindFirstChild("Logros").Value >= 2 and ls:FindFirstChild("Nivel") ~= nil, "la tabla de jugadores no muestra los logros (" .. tostring(ls and ls:FindFirstChild("Logros") and ls:FindFirstChild("Logros").Value) .. ")")
pasos(120)
local gl = F.almacenes.Blockverse_v2 and F.almacenes.Blockverse_v2.l_101
ok(gl and table.find(gl, "madera") and table.find(gl, "cazador"), "los logros no se guardaron")
-- Clima: con lluvia de día los zombis no arden; en la tormenta es «de noche» y los rayos dañan
S.Lighting.ClockTime = 12
Clima.poner("lluvia", 600)
pasos(3)
ok(F.workspace:GetAttribute("Clima") == "lluvia", "el clima no llega a los clientes")
local zr = Mobs.crear("zombi", sx + 6.5, sy + 1, sz + 6.5)
if zr then
	zr.control = function(mm)
		mm.mover = false
	end
	pasos(75)
	ok((zr.fuego or 0) <= 0, "un zombi arde al sol aunque llueve")
	Clima.poner("despejado", 600)
	pasos(75)
	ok((zr.fuego or 0) > 0, "sin lluvia, el zombi no arde al sol (la prueba no vale)")
	Mobs.quitar(zr)
end
Clima.poner("tormenta", 600)
ok(Mobs.esDeNoche(), "en la tormenta no se puede dormir ni salen monstruos")
mover(beto, sx + 2, sy + 1, sz + 2)
pasos(3)
local vbr = datos[beto].hum.Health
local pr = datos[beto].root.Position / B
Clima.rayo(math.floor(pr.X), math.floor(pr.Z))
pasos(3)
ok(datos[beto].hum.Health < vbr, "el rayo no hizo daño a Beto")
ok(aTodos.rayo ~= nil, "los clientes no ven el rayo")
datos[beto].hum.Health = 20
Clima.poner("despejado", 600)
pasos(3)
-- Guardar al salir y recuperar al volver
local diamAntes = cuenta(ana, Reg.I.diamante)
-- Ajustes: se guardan (sin valores raros) y vuelven al entrar
enviar(ana, "ajustes", { sensibilidad = 2, fov = 500, numeros = false, truco = "x" })
pasos(160)
local aj = F.almacenes.Blockverse_v2 and F.almacenes.Blockverse_v2.a_101
ok(aj and aj.sensibilidad == 2 and aj.fov == 110 and aj.numeros == false and aj.truco == nil, "los ajustes no se guardan bien")
sale(ana)
local guardado = F.almacenes.Blockverse_v2 and F.almacenes.Blockverse_v2.u_101
ok(guardado ~= nil, "no se guardó el inventario de Ana al salir")
-- Una espada encantada guardada vuelve con su encantamiento
if guardado then
	guardado.inv[30] = { id = Reg.I.espada_diamante, n = 1, dur = 1500, enc = { filo = 3 } }
end
ana = entra("Ana", 101)
enviar(ana, "modo", "supervivencia")
pasos(5)
local lgs = datos[ana].ultimo.logros and datos[ana].ultimo.logros[1]
local madera = false
for _, L in lgs or {} do
	if L.id == "madera" and L.hecho then
		madera = true
	end
end
ok(madera, "al volver, Ana no tiene sus logros")
local ajV = datos[ana].ultimo.ajustes and datos[ana].ultimo.ajustes[1]
ok(ajV and ajV.sensibilidad == 2, "los ajustes guardados no llegan al volver")
local esp = inv(ana)[30]
ok(esp and esp.enc and esp.enc.filo == 3, "la espada encantada pierde el encantamiento al volver")
ok(cuenta(ana, Reg.I.diamante) == diamAntes, "al volver Ana no recupera su inventario (" .. cuenta(ana, Reg.I.diamante) .. " de " .. diamAntes .. ")")

------------------------------------------------------------------
-- BED WARS con varios jugadores
------------------------------------------------------------------
local carla = entra("Carla", 103)
enviar(carla, "modo", "supervivencia")
pasos(3)
local invAnaAntes = cuenta(ana, Reg.I.diamante)
for _, p in { ana, beto, carla } do
	enviar(p, "modoJuego", "bedwars")
end
pasos(30)
local P = BWm._partida()
ok(P and P.fase == "sala", "no se abrió la sala de Bed Wars")
-- Votación de mapa y panel de la sala
local PerfilM = srv.PerfilBW._resultado
local KitsM = srv.KitsBW._resultado
enviar(ana, "modoCmd", "votar", 2)
enviar(beto, "modoCmd", "votar", 2)
enviar(carla, "modoCmd", "votar", 3)
pasos(20)
local pan = datos[ana].ultimo.panel and datos[ana].ultimo.panel[1]
ok(pan and pan.botones and #pan.botones >= 6, "el panel de la sala no tiene votación ni kits")
-- Ana compra el kit Guerrero y un efecto de baja final con monedas
local perfilA = PerfilM.de(ana)
perfilA.monedas = 1000
enviar(ana, "modoCmd", "kits")
pasos(2)
ok(datos[ana].ui and datos[ana].ui.extra and datos[ana].ui.extra.sub == "tienda" and #datos[ana].ui.extra.ofertas == #KitsM.LISTA, "no se abre la tienda de kits")
local iGuerrero
for i, k in KitsM.LISTA do
	if k.id == "guerrero" then
		iGuerrero = i
	end
end
enviar(ana, "comprar", iGuerrero, 1)
if table.find(KitsM.gratisHoy(), "guerrero") then
	-- Si hoy es gratis, el primer clic solo lo prueba y el segundo lo compra
	enviar(ana, "comprar", iGuerrero, 1)
end
pasos(2)
ok(perfilA.kits.guerrero == 1 and perfilA.kit == "guerrero" and perfilA.monedas == 650, "no se compró el kit Guerrero (" .. perfilA.monedas .. ")")
enviar(ana, "pestana", 2)
enviar(ana, "comprar", 2, 1)
pasos(2)
ok(perfilA.efectos.fuegos and perfilA.efecto == "fuegos" and perfilA.monedas == 450, "no se compró el efecto de fuegos artificiales")
enviar(ana, "cerrarUI")
ok(F.almacenes.Blockverse_BW_v1 and F.almacenes.Blockverse_BW_v1.bw_101 and F.almacenes.Blockverse_BW_v1.bw_101.kits.guerrero == 1, "la compra del kit no se guardó")
BWm._empezarYa()
pasos(60)
P = BWm._partida()
ok(P and P.fase == "juego", "no empezó la partida con varios jugadores")
local Ja, Jb, Jc = P.jug[ana], P.jug[beto], P.jug[carla]
ok(Ja and Jb and Jc and Ja.equipo and Jb.equipo and Jc.equipo, "algún jugador no tiene equipo")
ok(Ja.equipo ~= Jb.equipo and Jb.equipo ~= Jc.equipo and Ja.equipo ~= Jc.equipo, "en Solos dos jugadores comparten equipo")
ok(#P.bots == P.n * P.porEquipo - 3, "los bots no llenan los huecos (" .. #P.bots .. ")")
ok(P.tema == "invierno", "no se juega el mapa más votado (" .. tostring(P.tema) .. ")")
ok(Ja.kit == "guerrero" and cuenta(ana, Reg.I.espada_piedra) == 1, "Ana no empezó con la espada del kit Guerrero")
ok(datos[ana].ultimo.kitBW and datos[ana].ultimo.kitBW[1] and datos[ana].ultimo.kitBW[1].id == "guerrero", "el cliente de Ana no sabe su kit")
ok(ana:GetAttribute("EquipoBW") == Ja.equipo and ana:GetAttribute("ColorBW") ~= nil, "Ana no tiene el atributo de equipo (para resaltar compañeros)")
for _, m in P.bots do
	ok(m.bw.kit ~= nil, "un bot no tiene kit")
end
-- Llega alguien con la partida empezada: mira desde la sala
local dani = entra("Dani", 104)
enviar(dani, "modoJuego", "bedwars")
pasos(10)
ok(P.jug[dani] and P.jug[dani].espectador, "quien llega a mitad no queda de espectador")
-- Golpes entre equipos
local Ea, Eb = P.eqs[Ja.equipo].E, P.eqs[Jb.equipo].E
mover(ana, Eb.isla[1], Arenas.BW_Y + 1, Eb.isla[2] + 1)
mover(beto, Eb.isla[1], Arenas.BW_Y + 1, Eb.isla[2])
pasos(20)
local vb = datos[beto].hum.Health
enviar(ana, "atacar", datos[beto].root, 1, false, false)
pasos(2)
ok(datos[beto].hum.Health < vb, "Ana no puede herir a Beto (equipos distintos)")
-- Beto pone un escudo en su cama: mientras dura no se puede romper
local cama = P.camas[Jb.equipo]
mover(beto, cama.x + 1, cama.y, cama.z)
pasos(3)
local pe = { id = Reg.I.escudoCamaBW, n = 1 }
BWm.usarObjeto(beto, { inv = { pe }, sel = 1 }, pe, V3(1, 0, 0), nil)
ok(P.eqs[Jb.equipo].escudoHasta ~= nil and pe.n == 0, "el escudo de cama no se puso")
ok(not BWm.puedeRomper(ana, cama.x, cama.y, cama.z, Mundo.get(cama.x, cama.y, cama.z)), "se puede romper una cama con escudo")
P.eqs[Jb.equipo].escudoHasta = P.t
pasos(3)
ok(P.eqs[Jb.equipo].escudo == nil, "el escudo no se quitó al acabarse")
-- Trampolín: Ana lo pone en su isla y al pisarlo sale disparada
local ix, iz = Ea.isla[1], Ea.isla[2]
local tx, tz
for dx = -3, 3 do
	for dz = 2, 4 do
		if not tx and Reg.SOLIDO[Mundo.get(ix + dx, Arenas.BW_Y, iz + dz)] and Mundo.get(ix + dx, Arenas.BW_Y + 1, iz + dz) == 0 and Mundo.get(ix + dx, Arenas.BW_Y + 2, iz + dz) == 0 then
			tx, tz = ix + dx, iz + dz
		end
	end
end
ok(tx ~= nil, "no hay sitio para el trampolín en la isla")
if tx then
	mover(ana, ix, Arenas.BW_Y + 1, iz)
	pasos(3)
	local pt = { id = Reg.I.trampolinBW, n = 1 }
	BWm.usarObjeto(ana, { inv = { pt }, sel = 1 }, pt, V3(0, 0, 1), { x = tx, y = Arenas.BW_Y, z = tz, n = { 0, 1, 0 } })
	ok(Mundo.get(tx, Arenas.BW_Y + 1, tz) == Reg.B.heno, "el trampolín no se puso")
	datos[ana].ultimo.impulso = nil
	-- (en el Roblox de mentira, «mover» deja los pies un bloque por encima de y)
	mover(ana, tx, Arenas.BW_Y + 1, tz)
	pasos(3)
	ok(datos[ana].ultimo.impulso and datos[ana].ultimo.impulso[1] == "trampolin", "el trampolín no impulsa")
end
-- Momentos de caos: fiebre del oro y cofre del cielo
P.caosAvisado = BWm.CAOS[2]
P.caosT = 0
pasos(3)
ok(P.caos and P.caos.k == "oro" and P.multGen == 2, "no empezó la fiebre del oro")
P.caos.fin = P.t
pasos(3)
ok(P.caos == nil and P.multGen == 1, "la fiebre del oro no se acabó")
P.caosAvisado = BWm.CAOS[4]
P.caosT = 0
pasos(90)
local cc = P.cofreCielo
ok(cc ~= nil and Mundo.get(cc.x, cc.y, cc.z) == Reg.B.cofre, "el cofre del cielo no cayó")
if cc then
	local hay = 0
	for _, pz in Cont.cofres[Cont.clave(cc.x, cc.y, cc.z)] or {} do
		if pz then
			hay += 1
		end
	end
	ok(hay >= 4, "el cofre del cielo está vacío")
end
ok(datos[ana].ultimo.feed ~= nil, "no llega el registro de la partida")
-- Ana rompe la cama de Beto
mover(ana, cama.x + 1, cama.y, cama.z)
pasos(5)
enviar(ana, "golpe", cama.x, cama.y, cama.z)
pasos(10)
enviar(ana, "romper", cama.x, cama.y, cama.z)
pasos(3)
ok(not P.eqs[Jb.equipo].cama and Ja.camas == 1, "Ana no rompió la cama de Beto")
ok(datos[beto].ultimo.titulo and datos[beto].ultimo.titulo[1] == "¡CAMA DESTRUIDA!", "Beto no se enteró de que perdió la cama")
-- Beto muere por Ana: baja final, espectador
mover(beto, Eb.isla[1], Arenas.BW_Y + 1, Eb.isla[2])
pasos(15)
for _ = 1, 30 do
	if datos[beto].hum.Health <= 0 then
		break
	end
	enviar(ana, "atacar", datos[beto].root, 1, false, false)
	pasos(20)
end
pasos(5)
ok(datos[beto].hum.Health <= 0, "Beto no murió con los golpes de Ana")
ok(Jb.espectador and not Jb.vivo, "sin cama, Beto no pasó a espectador")
ok(Ja.finales == 1, "no se contó la baja final de Ana")
ok(datos[beto].ultimo.efectoBaja and datos[beto].ultimo.efectoBaja[1] == "fuegos", "no se ve el efecto de baja final de Ana")
ok(Ja.racha >= 1, "no cuenta la racha de bajas")
personaje(beto)
pasos(40)
local pb = datos[beto].root.Position / B
ok(math.abs(pb.Y - P.arena.sala.y) < 6, "el espectador no reapareció en la sala")
-- Carla se va a mitad de partida
local eqC = Jc.equipo
sale(carla)
ok(P.eqs[eqC].vivos == 0, "al irse Carla su equipo sigue con jugadores")
-- Acabar la partida: los demás equipos (bots) se quedan sin cama ni jugadores
for k, q in P.eqs do
	if k ~= Ja.equipo then
		q.cama = false
		q.vivos = 0
	end
end
for _, m in table.clone(P.bots) do
	if m.bw.equipo ~= Ja.equipo then
		Mobs.matar(m, "vacio")
	end
end
pasos(10)
ok(P.fin, "la partida no terminó al quedar un equipo")
ok(datos[ana].ultimo.titulo and datos[ana].ultimo.titulo[1] == "¡VICTORIA!", "Ana no ve que ganó")
local finA = datos[ana].ultimo.finBW and datos[ana].ultimo.finBW[1]
ok(finA and finA.gano and finA.monedas >= 100 and finA.jugo, "la pantalla final de Ana no muestra la victoria y las monedas")
ok(perfilA.partidas == 1 and perfilA.victorias == 1 and perfilA.finales == 1 and perfilA.xp > 0 and perfilA.monedas >= 550, "el perfil de Ana no se actualizó al ganar")
local finB = datos[beto].ultimo.finBW and datos[beto].ultimo.finBW[1]
ok(finB and not finB.gano, "Beto no ve su derrota")
-- Ana quiere jugar otra vez: al cerrar la partida entra en una nueva
enviar(ana, "modoCmd", "otraVez")
pasos(330)
local P1 = BWm._partida()
ok(P1 ~= P and (P1 == nil or P1.fase == "sala"), "la partida no se cerró al acabar")
ok(BWm.en(ana) and P1 and P1.fase == "sala", "«Jugar otra vez» no metió a Ana en la sala nueva")
ok(F.almacenes.Blockverse_BW_v1.bw_101.victorias == 1, "la victoria no se guardó")
enviar(ana, "modoJuego", "normal")
pasos(20)
ok(BWm._partida() == nil, "la sala no se cerró al irse Ana")
ok(ana:GetAttribute("BedWars") == nil and beto:GetAttribute("BedWars") == nil and dani:GetAttribute("BedWars") == nil, "algún jugador sigue en Bed Wars")
personaje(ana)
pasos(30)
ok(cuenta(ana, Reg.I.diamante) == invAnaAntes, "Ana no recuperó su inventario de supervivencia al salir de Bed Wars")
-- Una partida nueva en la misma arena empieza limpia
enviar(ana, "modoJuego", "bedwars")
pasos(20)
local P2 = BWm._partida()
ok(P2 and P2 ~= P, "no se pudo empezar otra partida")
BWm._empezarYa()
pasos(40)
if P2 and P2.arena == P.arena then
	local c = P2.camas[1]
	ok(Mundo.get(c.x, c.y, c.z) == c.b, "la cama no se repuso en la partida nueva")
end
enviar(ana, "modoJuego", "normal")
pasos(20)
ok(BWm._partida() == nil, "la partida no se cerró al irse su único jugador")

------------------------------------------------------------------
-- MAZMORRAS y LEYENDAS a la vez
------------------------------------------------------------------
enviar(ana, "modoJuego", "mazmorras")
enviar(beto, "modoJuego", "mazmorras")
enviar(dani, "modoJuego", "leyendas")
pasos(60)
local Ra, Rb = MZm._partida(ana), MZm._partida(beto)
ok(Ra and Rb and Ra.arena ~= Rb.arena, "dos jugadores comparten mazmorra")
ok(LYm._partida(dani) ~= nil, "Dani no entró en Leyendas")
if Ra and Rb then
	local sa, sb = Ra.arena.salas[2], Rb.arena.salas[2]
	mover(ana, sa.x, Arenas.MZ_Y + 1, sa.z)
	pasos(5)
	ok(#Ra.enemigos > 0 and #Rb.enemigos == 0, "los enemigos de una mazmorra aparecen en la otra")
end
for _, p in { ana, beto, dani } do
	enviar(p, "modoJuego", "normal")
end
pasos(30)
ok(not MZm._partida(ana) and not MZm._partida(beto) and not LYm._partida(dani), "no se salió de los modos")

for _, e in F.errores do
	print(e)
end
ok(#F.errores == 0, #F.errores .. " errores durante la prueba")
print(fallos == 0 and "MULTIJUGADOR BIEN" or ("FALLOS: " .. fallos))
