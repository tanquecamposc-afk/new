--[[
	Capturas: ejecuta el servidor y el cliente en el Roblox de mentira, entra en
	Bed Wars, Mazmorras y Leyendas y vuelca lo que dibuja el cliente (mallas con
	textura, piezas, carteles y la interfaz) para dibujarlo con
	herramientas/vista/render.py y gui.py. Se usa con pruebas/capturar.sh.
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
F.grabar = true
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


------------------------------------------------------------------
-- Capturas: se vuelca lo que dibujaría el cliente
------------------------------------------------------------------
local Reg = F.entorno(comp).require(comp.Registro)
local Arenas = F.entorno(comp).require(comp.Arenas)
local srvMundo = srv.Mundo._resultado
local Mobs = srv.Mobs._resultado
-- Cielo despejado toda la prueba: en una tormenta salen monstruos de día y atacarían al jugador quieto
srv.Clima._resultado.poner("despejado", 1e6)
local B = 3
local function pasos(n)
	for _ = 1, n do
		F.paso(1 / 30)
	end
end
local function moverJugador(x, y, z)
	root.CFrame = CF((x + 0.5) * B, y * B + 3, (z + 0.5) * B)
	cabeza.CFrame = CF((x + 0.5) * B, y * B + 4.5, (z + 0.5) * B)
end
local function esperarDibujo(x, y, z, max)
	for _ = 1, max or 600 do
		F.paso(1 / 30)
		if Render.listoEn(F.Vector3.new(x * B, y * B, z * B)) then
			break
		end
	end
	pasos(30)
end
local imgsHechas = {}
local function hex(buf)
	local n = buffer.len(buf)
	local t = table.create(n // 4096 + 1)
	local trozo = table.create(4096)
	for i = 0, n - 1 do
		trozo[#trozo + 1] = string.format("%02x", buffer.readu8(buf, i))
		if #trozo == 4096 then
			t[#t + 1] = table.concat(trozo)
			table.clear(trozo)
		end
	end
	t[#t + 1] = table.concat(trozo)
	return table.concat(t)
end
local idImg, nImg = {}, 0
local function imagen(img)
	if not img or not img._p._pix then
		return 0
	end
	local id = idImg[img]
	if not id then
		nImg += 1
		id = nImg
		idImg[img] = id
		print(string.format("IMG %d %d %d %s", id, img._p._tam.X, img._p._tam.Y, hex(img._p._pix)))
	end
	return id
end
local function n3(v)
	return string.format("%.3f %.3f %.3f", v.X, v.Y, v.Z)
end
-- centro y radio en bloques
local function volcar(nombre, cx, cy, cz, radio, cam, mira, fov)
	F.workspace.CurrentCamera.CFrame = F.CFrame.lookAt(cam * B, mira * B)
	pasos(3)
	F.workspace.CurrentCamera.CFrame = F.CFrame.lookAt(cam * B, mira * B)
	print(string.format("ESCENA %s %s %s %g", nombre, n3(cam * B), n3(mira * B), fov or 70))
	local c = F.Vector3.new(cx, cy, cz) * B
	local R = radio * B
	local nt, nb = 0, 0
	for _, o in F.workspace:GetDescendants() do
		local cn = o._p.ClassName
		if (cn == "MeshPart" or cn == "Part") and o._p.CFrame then
			local cf = o._p.CFrame
			local p = cf.Position
			if math.abs(p.X - c.X) < R and math.abs(p.Z - c.Z) < R and math.abs(p.Y - c.Y) < R and (o._p.Transparency or 0) < 0.99 then
				-- ¿está dentro de algo oculto o invisible?
				local visible = true
				local a = o.Parent
				while a do
					if a._p.ClassName == "Model" and a._p.Name == "Plantillas" then
						visible = false
					end
					a = a.Parent
				end
				local em = o._p._em
				if visible and em and em._p._t then
					local tex = o._p.TextureContent
					local ii = tex and imagen(tex.objeto) or 0
					-- escala: Roblox estira la malla al tamaño de la pieza
					local mn, mx = F.Vector3.new(math.huge, math.huge, math.huge), F.Vector3.new(-math.huge, -math.huge, -math.huge)
					for _, v in em._p._v do
						mn = mn:Min(v)
						mx = mx:Max(v)
					end
					local ext = mx - mn
					local sz = o._p.Size or ext
					local esc = F.Vector3.new(ext.X > 1e-4 and sz.X / ext.X or 1, ext.Y > 1e-4 and sz.Y / ext.Y or 1, ext.Z > 1e-4 and sz.Z / ext.Z or 1)
					local mid = (mn + mx) / 2
					local pc = o._p.Color or F.Color3.new(1, 1, 1)
					local partes = {}
					for f, t in em._p._t do
						local uvs = em._p._fuv and em._p._fuv[f]
						local cols = em._p._fc and em._p._fc[f]
						local l = { "T", ii }
						for k = 1, 3 do
							local v = em._p._v[t[k]]
							local w = cf * ((v - mid) * esc)
							local uv = uvs and em._p._uv[uvs[k]] or { X = 0, Y = 0 }
							local col = cols and em._p._c[cols[k]] or { R = 1, G = 1, B = 1 }
							table.insert(l, string.format("%.3f %.3f %.3f %.4f %.4f %.3f %.3f %.3f", w.X, w.Y, w.Z, uv.X, uv.Y, col.R * pc.R, col.G * pc.G, col.B * pc.B))
						end
						partes[#partes + 1] = table.concat(l, " ")
						nt += 1
					end
					print(table.concat(partes, "\n"))
				elseif visible and not em and cn == "Part" then
					local r = cf._r
					local col = o._p.Color or F.Color3.new(0.6, 0.6, 0.6)
					local s = o._p.Size or F.Vector3.new(1, 1, 1)
					print(string.format("B %s %g %g %g %g %g %g %g %g %g %s %.3f %.3f %.3f %.2f %s", n3(p), r[1], r[2], r[3], r[4], r[5], r[6], r[7], r[8], r[9], n3(s),
						col.R, col.G, col.B, o._p.Transparency or 0, tostring(o._p.Shape == F.Enum.PartType.Ball)))
					nb += 1
				end
			end
		elseif cn == "BillboardGui" and o._p.Enabled ~= false and ((o._p.Adornee and o._p.Adornee._p.CFrame) or (o.Parent and o.Parent._p.CFrame)) then
			local base = (o._p.Adornee and o._p.Adornee._p.CFrame) or o.Parent._p.CFrame
			local p = base.Position + (o._p.StudsOffset or F.Vector3.new())
			if math.abs(p.X - c.X) < R and math.abs(p.Z - c.Z) < R then
				for _, h in o:GetDescendants() do
					if h._p.ClassName == "TextLabel" and h._p.Text and h._p.Text ~= "" then
						local tc = h._p.TextColor3 or F.Color3.new(1, 1, 1)
						print(string.format("L %s %.3f %.3f %.3f %s", n3(p), tc.R, tc.G, tc.B, (h._p.Text:gsub("\n", " "))))
					end
				end
			end
		end
	end

	print(string.format("FIN %s %d %d", nombre, nt, nb))
end


-- Interfaz: se vuelca el árbol de la pantalla con sus propiedades
local PROPS = { "Name", "Position", "Size", "AnchorPoint", "Visible", "BackgroundColor3", "BackgroundTransparency", "Text", "TextColor3", "TextSize",
	"TextXAlignment", "TextYAlignment", "TextWrapped", "TextScaled", "TextTransparency", "TextStrokeTransparency", "ZIndex", "LayoutOrder", "AutomaticSize",
	"ImageTransparency", "ImageRectOffset", "ImageRectSize", "ImageColor3", "FillDirection", "Padding", "HorizontalAlignment", "VerticalAlignment",
	"SortOrder", "CellSize", "CellPadding", "PaddingLeft", "PaddingRight", "PaddingTop", "PaddingBottom", "Color", "Thickness", "CornerRadius", "Scale",
	"ClipsDescendants", "Enabled", "Rotation", "Font", "Transparency", "CanvasSize", "ApplyStrokeMode", "TextStrokeColor3" }
local function js(v)
	local t = type(v)
	if t == "number" then
		return v ~= v and "0" or string.format("%.4f", v)
	elseif t == "boolean" then
		return tostring(v)
	elseif t == "string" then
		return '"' .. v:gsub('\\', '\\\\'):gsub('"', '\\"'):gsub("\n", "\\n"):gsub("\t", " ") .. '"'
	elseif t == "table" then
		if v._udim2 then
			return string.format("[%s,%s,%s,%s]", js(v[1]), js(v[2]), js(v[3]), js(v[4]))
		elseif v._color then
			return string.format("{\"c\":[%s,%s,%s]}", js(v.R), js(v.G), js(v.B))
		elseif v.objeto then
			return string.format("{\"img\":%d}", imagen(v.objeto))
		elseif v.X ~= nil and v.Y ~= nil then
			return string.format("{\"v\":[%s,%s]}", js(v.X), js(v.Y))
		elseif v.Name and v.EnumType then
			return '"' .. v.Name .. '"'
		elseif #v == 2 then
			return string.format("{\"u\":[%s,%s]}", js(v[1]), js(v[2]))
		end
	end
	return "null"
end
local function volcarGui(nombre)
	local pg = plr:FindFirstChild("PlayerGui")
	print("GUI " .. nombre)
	local ids, n = {}, 0
	local function rec(o, padre)
		n += 1
		local yo = n
		ids[o] = yo
		local campos = { string.format('"id":%d,"padre":%d,"clase":"%s"', yo, padre, o._p.ClassName) }
		for _, k in PROPS do
			local v = rawget(o._p, k)
			if v ~= nil then
				table.insert(campos, '"' .. k .. '":' .. js(v))
			end
		end
		if o._p.ImageContent then
			table.insert(campos, '"img":' .. imagen(o._p.ImageContent.objeto))
		end
		print("G {" .. table.concat(campos, ",") .. "}")
		for _, h in o:GetChildren() do
			rec(h, yo)
		end
	end
	for _, sg in pg:GetChildren() do
		rec(sg, 0)
	end
	print("FINGUI " .. nombre)
end

-- El menú de inicio
volcarGui("menu")
Interfaz.abrirAjustes()
pasos(2)
volcarGui("menu_ajustes")
Interfaz.menu(false)
Interfaz.menu(true)
Interfaz.abrirLogros()
pasos(2)
volcarGui("menu_logros")
-- Tienda con Robux (como en Studio: así salen los productos aunque aún no tengan ID)
do
	F.studio = true
	local TiendaV = cli.TiendaVista._resultado
	TiendaV.abrir("destacado")
	pasos(3)
	volcarGui("menu_tienda")
	TiendaV.abrir("pases")
	pasos(3)
	volcarGui("menu_tienda_pases")
	TiendaV.abrir("monedas")
	pasos(3)
	volcarGui("menu_tienda_monedas")
	TiendaV.abrir("modos")
	pasos(3)
	volcarGui("menu_tienda_modos")
	TiendaV.cerrar()
	TiendaV.gracias({ nombre = "VIP", texto = "¡Ya eres VIP!" })
	pasos(2)
	volcarGui("menu_gracias")
	TiendaV.ocultarGracias()
	F.studio = false
end
-- Progreso: con algo de experiencia y una misión hecha, para que se vea vivo
do
	local Pr = srv.Progreso._resultado
	local PV = cli.ProgresoVista._resultado
	Pr.ganarXP(plr, 2600)
	for _ = 1, 10 do
		Pr.evento(plr, "monstruo", 1)
		Pr.evento(plr, "comer", 1)
		Pr.evento(plr, "romper", 12)
		Pr.evento(plr, "colocar", 6)
	end
	Pr.reclamar(plr, 2)
	Pr.reclamar(plr, 3)
	Pr.reclamar(plr, 5)
	Pr.equipar(plr, "titulo", "aventurero")
	Pr.equipar(plr, "estela", "chispas")
	pasos(2)
	for _, t in { "camino", "misiones", "ruleta", "coleccion", "ranking" } do
		PV.abrir(t)
		pasos(3)
		PV.ocultarAvisos()
		volcarGui("menu_progreso_" .. t)
	end
	PV.cerrar()
end
Interfaz.menu(false)
Interfaz.menu(true)
pasos(2)
-- Elegir supervivencia primero (como hace el jugador)
Interfaz.alElegirModo("supervivencia")
pasos(5)
-- El mundo normal alrededor del jugador
do
	local rp = root.Position / B
	volcar("sup_mundo", rp.X, rp.Y, rp.Z, 60, F.Vector3.new(rp.X - 14, rp.Y + 9, rp.Z - 14), F.Vector3.new(rp.X + 12, rp.Y - 3, rp.Z + 12), 70)
	volcarGui("sup_hud")
	-- Más pantallas para revisarlas: inventario, aviso de logro, muerte y carga
	enviar("abrirInventario")
	pasos(5)
	volcarGui("sup_inventario")
	enviar("cerrarUI")
	Interfaz.cerrar()
	pasos(3)
	Interfaz.logro({ id = "madera", n = "¡A por madera!", d = "Consigue un tronco", icono = Reg.B.tronco })
	pasos(5)
	volcarGui("sup_logro")
	Interfaz.muerte({ texto = "Te mató un Zombi.", causa = "mob", quien = "un Zombi", vivo = 754, pos = { 128, 71, -42 }, soltados = 14, nivel = 6 })
	pasos(2)
	volcarGui("sup_muerte")
	Interfaz.muerte(nil)
	Interfaz.carga(0.6, "Generando el mundo…")
	pasos(2)
	volcarGui("sup_carga")
	Interfaz.carga(nil)
	pasos(2)
	-- Lluvia (el cielo se nubla poco a poco)
	-- (en un bioma de llanura: en el desierto no llueve)
	cli.ClimaVista._resultado.biomaForzado = 2
	srv.Clima._resultado.poner("lluvia", 600)
	pasos(330)
	local ojo = root.Position / B + F.Vector3.new(0, 1.6, 0)
	volcar("sup_lluvia", ojo.X, ojo.Y, ojo.Z, 16, ojo, ojo + F.Vector3.new(8, -1.5, 3), 70)
	srv.Clima._resultado.poner("despejado", 600)
	cli.ClimaVista._resultado.biomaForzado = nil
	pasos(10)
end
-- Modelos 3D: una espada en la mano y una espada y un bloque tirados delante
do
	enviar("modo", "creativo")
	pasos(3)
	enviar("abrirInventario")
	for i, o in { { Reg.I.espada_diamante, 1 }, { Reg.B.ladrillos or Reg.B.piedra, "max" }, { Reg.I.espada_diamante, 1 } } do
		enviar("creativo", o[1], o[2])
		enviar("click", "inv", i, 1)
	end
	enviar("cerrarUI")
	Interfaz.cerrar()
	pasos(5)
	for _, i in { 2, 3 } do
		Interfaz.alSeleccionar(i)
		pasos(2)
		enviar("tirar", false)
		pasos(2)
	end
	Interfaz.alSeleccionar(1)
	pasos(90)
	-- La mano: desde los ojos, mirando al frente
	local rp = root.Position / B
	local ojo = rp + F.Vector3.new(0, 1.6, 0)
	volcar("mano3d", ojo.X, ojo.Y, ojo.Z, 3, ojo, ojo + F.Vector3.new(4, -0.6, 0), 70)
	Interfaz.alSeleccionar(2)
	pasos(40)
	volcar("mano3d_bloque", ojo.X, ojo.Y, ojo.Z, 3, ojo, ojo + F.Vector3.new(4, -0.6, 0), 70)
	Interfaz.alSeleccionar(1)
	pasos(10)
	-- Los objetos tirados, de cerca
	local e1
	for _, e in F.workspace.Entidades:GetChildren() do
		if e.Name == "Item" then
			e1 = e1 or e
		end
	end
	if e1 then
		local q = e1.Position / B
		print(("objeto tirado en %.1f %.1f %.1f"):format(q.X, q.Y, q.Z))
		volcar("suelo3d", q.X, q.Y, q.Z, 4, q + F.Vector3.new(1.4, 1.1, 1.4), q + F.Vector3.new(0, 0.2, 0), 70)
	end
	enviar("modo", "supervivencia")
	pasos(3)
end

-- BED WARS
local BWm = srv.BedWars._resultado
Interfaz.alElegirModo("bedwars")
pasos(60)
local P = BWm._partida()
local sala = P.arena.sala
esperarDibujo(sala.x, sala.y, sala.z)
volcar("bw_sala", sala.x, sala.y, sala.z, 40, F.Vector3.new(sala.x + 5.4, sala.y + 3.2, sala.z + 5.4), F.Vector3.new(sala.x - 30, sala.y - 30, sala.z - 30), 70)
-- Panel de la sala (votación, kits, misiones) y tienda de kits
enviar("modoCmd", "votar", 2)
pasos(20)
volcarGui("bw_salaUI")
enviar("modoCmd", "kits")
pasos(5)
volcarGui("bw_kitsUI")
enviar("cerrarUI")
Interfaz.cerrar()
pasos(3)
BWm._empezarYa()
pasos(90)
local J = P.jug[plr]
local E = P.eqs[J.equipo].E
local ix, iz = E.isla[1], E.isla[2]
moverJugador(ix, Arenas.BW_Y + 1, iz)
esperarDibujo(ix, Arenas.BW_Y, iz)
pasos(400)
-- Isla del jugador vista desde detrás, mirando al centro
local cx, cz = P.arena.centro.x, P.arena.centro.z
local dx, dz = cx - ix, cz - iz
local l = math.sqrt(dx * dx + dz * dz)
dx, dz = dx / l, dz / l
local Y = Arenas.BW_Y
volcar("bw_isla", ix, Y, iz, 70, F.Vector3.new(ix - dx * 16, Y + 9, iz - dz * 16), F.Vector3.new(ix + dx * 10, Y, iz + dz * 10), 70)
volcar("bw_centro", ix, Y, iz, 90, F.Vector3.new(ix + dx * 8, Y + 12, iz + dz * 8), F.Vector3.new(cx, Y, cz), 70)
-- Tienda abierta (se dibuja la interfaz aparte)
local tendero
for _, m in P.tenderos do
	if m.bwEquipo == J.equipo and m.bwTienda == "objetos" then
		tendero = m
	end
end
volcar("bw_tienda", ix, Y, iz, 30, F.Vector3.new(tendero.x + 3.5, Y + 2.6, tendero.z + 3.5), F.Vector3.new(tendero.x, Y + 1.4, tendero.z), 60)
volcarGui("bw_hud")
moverJugador(math.floor(tendero.x) + 1, Y + 1, math.floor(tendero.z))
pasos(2)
enviar("derecho", nil, F.Vector3.new(-1, 0, 0), tendero.pieza, false)
pasos(5)
volcarGui("bw_tiendaUI")
enviar("pestana", 3)
pasos(5)
volcarGui("bw_tiendaUI3")
enviar("cerrarUI")
Interfaz.cerrar()
pasos(3)
-- Pantalla final: los demás equipos se quedan sin cama ni jugadores
for k, q in P.eqs do
	if k ~= J.equipo then
		q.cama = false
		q.vivos = 0
	end
end
for _, m in table.clone(P.bots) do
	if m.bw.equipo ~= J.equipo then
		srv.Mobs._resultado.matar(m, "vacio")
	end
end
pasos(10)
volcarGui("bw_finUI")

-- MAZMORRAS
local MZm = srv.Mazmorras._resultado
Interfaz.alElegirModo("mazmorras")
pasos(60)
local R = MZm._partida(plr)
local MZ_Y = Arenas.MZ_Y
local s1 = R.arena.salas[1]
esperarDibujo(s1.x, MZ_Y, s1.z)
local s2 = R.arena.salas[2]
moverJugador(s2.x, MZ_Y + 1, s2.z)
esperarDibujo(s2.x, MZ_Y, s2.z)
pasos(20)
local ddx, ddz = s2.x - s1.x, s2.z - s1.z
local dl = math.max(1, math.sqrt(ddx * ddx + ddz * ddz))
ddx, ddz = ddx / dl, ddz / dl
volcar("mz_sala", s2.x, MZ_Y, s2.z, 40, F.Vector3.new(s2.x - ddx * 9 + 0.5, MZ_Y + 7, s2.z - ddz * 9 + 0.5), F.Vector3.new(s2.x + 0.5, MZ_Y + 1, s2.z + 0.5), 70)
volcarGui("mz_hud")
local sj = R.arena.salas[#R.arena.salas]
moverJugador(sj.x + 4, MZ_Y + 1, sj.z)
esperarDibujo(sj.x, MZ_Y, sj.z)
pasos(20)
volcar("mz_jefe", sj.x, MZ_Y, sj.z, 40, F.Vector3.new(sj.x + 6.5, MZ_Y + 5, sj.z + 6.5), F.Vector3.new(sj.x + 0.5, MZ_Y + 1, sj.z - 3), 75)
volcarGui("mz_jefeUI")

-- LEYENDAS
local LYm = srv.Leyendas._resultado
Interfaz.alElegirModo("leyendas")
pasos(90)
local L = LYm._partida(plr)
local a = L.aldea
esperarDibujo(a.x, a.y, a.z)
pasos(30)
volcar("ly_aldea", a.x, a.y, a.z, 60, F.Vector3.new(a.x + 14, a.y + 10, a.z + 18), F.Vector3.new(a.x, a.y + 1, a.z), 70)
volcarGui("ly_hud")
local b1 = L.bases[1]
moverJugador(b1.x, b1.y + 1, b1.z + 9)
esperarDibujo(b1.x, b1.y, b1.z)
pasos(250)
volcar("ly_portal", b1.x, b1.y, b1.z, 50, F.Vector3.new(b1.x + 10, b1.y + 8, b1.z + 14), F.Vector3.new(b1.x, b1.y + 2, b1.z), 70)


------------------------------------------------------------------
print("LISTO")
