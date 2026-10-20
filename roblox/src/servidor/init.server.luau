--[[
	Blockverse para Roblox · Script principal del servidor
	Une todo el juego, con las reglas del juego web:
	· Mundo (igual al web), simulación, criaturas, entidades, cofres y hornos.
	· Jugadores: inventario de 41 casillas, crafteo 2x2 y 3x3, vida,
	  hambre y saturación, experiencia, armadura, aire, fuego, efectos de
	  pociones, muerte (se sueltan los objetos) y reaparición en la cama.
	· Acciones: picar, poner (con orientación de escaleras, antorchas y
	  puertas), usar objetos (comer, arco, cubos, azada, semillas, polvo de
	  hueso, mechero, tijeras, huevos, perlas, pociones, armadura), abrir
	  mesas, hornos y cofres, dormir, abrir puertas y atacar.
	· Día y noche, iluminación y guardado del inventario.
]]
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Lighting = game:GetService("Lighting")
local RunService = game:GetService("RunService")
local DataStoreService = game:GetService("DataStoreService")

------------------------------------------------------------------
-- Comunicación (se crea antes de cargar los módulos que la usan)
------------------------------------------------------------------
local remotos = Instance.new("Folder")
remotos.Name = "Remotos"
local function remoto(clase, nombre)
	local r = Instance.new(clase)
	r.Name = nombre
	r.Parent = remotos
	return r
end
local Accion = remoto("RemoteEvent", "Accion")
local Estado = remoto("RemoteEvent", "Estado")
remoto("RemoteEvent", "Bloques")
local Ediciones = remoto("RemoteFunction", "Ediciones")
remotos.Parent = ReplicatedStorage

local Comp = ReplicatedStorage:WaitForChild("Blockverse")
local Config = require(Comp.Config)
local Registro = require(Comp.Registro)
local Crafteo = require(Comp.Crafteo)
local Rayo = require(Comp.Rayo)
local MundoDatos = require(Comp.MundoDatos)
local Mundo = require(script.Mundo)
local Sim = require(script.Simulacion)
local Entidades = require(script.Entidades)
local Mobs = require(script.Mobs)
local Inv = require(script.Inventario)
local Cont = require(script.Contenedores)
local Modos = require(script.Modos)
local Habitantes = require(script.Habitantes)
local Dimension = require(script.Dimension)
local Redstone = require(script.Redstone)
local Mesas = require(script.Mesas)
local Generador = require(Comp.Generador)

local BS = Config.BLOQUE
local BL, OB = Registro.bloques, Registro.objetos
local B, I = Registro.B, Registro.I
local SOLIDO, OPACO, REEMPL, FORMA = Registro.SOLIDO, Registro.OPACO, Registro.REEMPL, Registro.FORMA
local esAgua, esLava, esLiquido, esPuerta = Registro.esAgua, Registro.esLava, Registro.esLiquido, Registro.esPuerta
local DIRF = Registro.DIRF
local CX, CZ, CY = MundoDatos.CX, MundoDatos.CZ, MundoDatos.CY

------------------------------------------------------------------
-- Iluminación, cielo y ciclo de día y noche
------------------------------------------------------------------
local function iluminacion()
	Lighting.Brightness = 2.6
	Lighting.EnvironmentDiffuseScale = 0.6
	Lighting.EnvironmentSpecularScale = 0.2
	Lighting.GlobalShadows = true
	Lighting.Ambient = Color3.fromRGB(70, 74, 86)
	Lighting.OutdoorAmbient = Color3.fromRGB(150, 150, 160)
	Lighting.ClockTime = 8
	Lighting.GeographicLatitude = 20
	Lighting.ShadowSoftness = 0.3
	for _, c in Lighting:GetChildren() do
		if c:IsA("PostEffect") or c:IsA("Atmosphere") or c:IsA("Sky") then
			c:Destroy()
		end
	end
	local atm = Instance.new("Atmosphere")
	atm.Density = 0.28
	atm.Offset = 0.08
	atm.Color = Color3.fromRGB(190, 214, 245)
	atm.Decay = Color3.fromRGB(120, 140, 170)
	atm.Glare = 0.25
	atm.Haze = 1.1
	atm.Parent = Lighting
	local sky = Instance.new("Sky")
	sky.StarCount = 3000
	sky.SunAngularSize = 12
	sky.MoonAngularSize = 9
	sky.Parent = Lighting
	local bloom = Instance.new("BloomEffect")
	bloom.Intensity = 0.35
	bloom.Size = 22
	bloom.Threshold = 1.8
	bloom.Parent = Lighting
	local rayos = Instance.new("SunRaysEffect")
	rayos.Intensity = 0.05
	rayos.Spread = 0.7
	rayos.Parent = Lighting
	local cc = Instance.new("ColorCorrectionEffect")
	cc.Saturation = 0.15
	cc.Contrast = 0.05
	cc.Parent = Lighting
	local nubes = workspace.Terrain:FindFirstChildOfClass("Clouds") or Instance.new("Clouds")
	nubes.Cover = 0.5
	nubes.Density = 0.75
	nubes.Parent = workspace.Terrain
	workspace.Terrain.WaterColor = Color3.fromRGB(63, 118, 228)
	workspace.Terrain.WaterTransparency = 0.55
	workspace.Terrain.WaterReflectance = 0.35
	workspace.Terrain.WaterWaveSize = 0.05
	workspace.Terrain.WaterWaveSpeed = 6
end
iluminacion()

RunService.Heartbeat:Connect(function(dt)
	Lighting.ClockTime = (Lighting.ClockTime + dt * 24 / Config.DIA_SEGUNDOS) % 24
end)

------------------------------------------------------------------
-- Mundo
------------------------------------------------------------------
local semilla = Random.new():NextInteger(1, 999999)
Mundo.iniciar(semilla)
Cont.md = Mundo.md
workspace:SetAttribute("Semilla", semilla)
print("[Blockverse] Semilla del mundo:", semilla)
Sim.iniciar()
Entidades.iniciar()
Cont.iniciar()
Mobs.iniciar()
Habitantes.iniciar()
Habitantes.alSonido = function(nombre, x, y, z)
	Estado:FireAllClients("sonido", nombre, Vector3.new(x + 0.5, y + 0.5, z + 0.5) * Config.BLOQUE)
end

local NIVEL_MAR = 126
local spawnX, spawnZ = 0, 0
do
	local gen = Mundo.md.gen
	local hecho = false
	for r = 0, 2000, 16 do
		local pasos = math.max(1, r // 8)
		for k = 0, pasos - 1 do
			local a = k / pasos * math.pi * 2
			local x, z = math.floor(math.cos(a) * r), math.floor(math.sin(a) * r)
			local h, bioma = gen:infoColumna(x, z)
			if h > NIVEL_MAR and bioma ~= 0 and bioma ~= 13 and bioma ~= 21 and bioma ~= 22 and bioma ~= 29 and bioma ~= 6 and bioma ~= 20 then
				spawnX, spawnZ = x, z
				hecho = true
				break
			end
		end
		if hecho then
			break
		end
	end
end
workspace:SetAttribute("SpawnX", spawnX)
workspace:SetAttribute("SpawnZ", spawnZ)

------------------------------------------------------------------
-- Estado de los jugadores
------------------------------------------------------------------
local estados = {}
local almacen
pcall(function()
	almacen = DataStoreService:GetDataStore("Blockverse_v2")
end)

local function st(plr)
	return estados[plr]
end

local function xpNecesaria(n)
	return n <= 15 and 2 * n + 7 or n <= 30 and 5 * n - 38 or 9 * n - 158
end

local function supervivencia(s)
	return s.modo ~= "creativo"
end

local function aviso(plr, texto)
	Estado:FireClient(plr, "aviso", texto)
end

local function humanoide(plr)
	local ch = plr.Character
	return ch and ch:FindFirstChildOfClass("Humanoid"), ch and ch:FindFirstChild("HumanoidRootPart")
end

-- Pies del personaje (en bloques)
local function piesDe(plr)
	local h, r = humanoide(plr)
	if not r then
		return nil
	end
	local p = r.Position
	local alto = (h and h.HipHeight or 2) + r.Size.Y / 2
	return Vector3.new(p.X / BS, (p.Y - alto) / BS, p.Z / BS)
end

local function enviarJugador(plr)
	local s = st(plr)
	if not s then
		return
	end
	local h = humanoide(plr)
	Estado:FireClient(plr, "jugador", {
		inv = s.inv, sel = s.sel, cursor = s.cursor or false, hambre = s.hambre, saturacion = s.saturacion,
		xp = s.xp, aire = s.aire, modo = s.modo, efectos = s.efectos, vida = h and h.Health or 20,
	})
	local p = s.inv[s.sel]
	plr:SetAttribute("EnMano", p and p.id or nil)
end

local function enviarUI(plr)
	local s = st(plr)
	if not s then
		return
	end
	local ui = s.ui
	local datos = { tipo = ui and ui.tipo or "inventario", cursor = s.cursor or false, inv = s.inv }
	if not ui or ui.tipo == "inventario" or ui.tipo == "mesa" then
		local w = (ui and ui.tipo == "mesa") and 3 or 2
		datos.rejilla = s.rejilla
		datos.w = w
		local res = Inv.resultado(s.rejilla, w)
		datos.salida = res or false
	elseif ui.tipo == "horno" then
		local hh = Cont.horno(ui.x, ui.y, ui.z)
		datos.horno = { entrada = hh.entrada, combustible = hh.combustible, salida = hh.salida,
			quema = hh.quemaMax > 0 and hh.quema / hh.quemaMax or 0, prog = hh.prog / Crafteo.TIEMPO_FUNDIR, tipo = hh.tipo }
	elseif ui.tipo == "cofre" then
		datos.cofre = Cont.cofre(ui.x, ui.y, ui.z)
	elseif ui.tipo == "extra" then
		datos.extra = Mesas.datos(plr, s)
	end
	Estado:FireClient(plr, "ui", datos)
end

local function dar(plr, pila)
	local s = st(plr)
	if not s then
		return pila.n
	end
	local sobra = Inv.dar(s.inv, pila)
	enviarJugador(plr)
	if s.ui then
		enviarUI(plr)
	end
	return sobra
end

-- Da al jugador o suelta lo que no cabe
local function darOSoltar(plr, pila)
	local sobra = dar(plr, pila)
	if sobra > 0 then
		local p = piesDe(plr)
		if p then
			local resto = Inv.copia(pila)
			resto.n = sobra
			Entidades.soltarItem(resto, p.X, p.Y + 1, p.Z, true)
		end
	end
end

local function ganarXP(plr, v)
	local s = st(plr)
	if not s then
		return
	end
	s.xp.puntos += v
	local subio = false
	while s.xp.puntos >= xpNecesaria(s.xp.nivel) do
		s.xp.puntos -= xpNecesaria(s.xp.nivel)
		s.xp.nivel += 1
		subio = true
	end
	if subio and s.xp.nivel % 5 == 0 then
		Estado:FireClient(plr, "sonido", "nivel")
	end
	enviarJugador(plr)
end

local function gastarEnMano(plr, s, n)
	if not supervivencia(s) then
		return
	end
	local p = s.inv[s.sel]
	if not p then
		return
	end
	local o = OB[p.id]
	if o and o.dur then
		p.dur = (p.dur or o.dur) - (n or 1)
		if p.dur <= 0 then
			s.inv[s.sel] = false
			Estado:FireClient(plr, "sonido", "rompeHerr")
		end
	end
end

local function consumirEnMano(s, n)
	if not supervivencia(s) then
		return
	end
	local p = s.inv[s.sel]
	if p then
		p.n -= n or 1
		if p.n <= 0 then
			s.inv[s.sel] = false
		end
	end
end

------------------------------------------------------------------
-- Daño (fórmulas de danarJugador del juego web)
------------------------------------------------------------------
local function armaduraTotal(s)
	local def, dur = 0, 0
	for i = 37, 40 do
		local p = s.inv[i]
		local o = p and OB[p.id]
		if o and o.armadura then
			def += o.armadura.def or 0
			dur += o.armadura.dureza or 0
		end
	end
	return def, dur
end

local function desgastarArmadura(s, n)
	for i = 37, 40 do
		local p = s.inv[i]
		local o = p and OB[p.id]
		if o and o.armadura and o.dur then
			p.dur = (p.dur or o.dur) - math.max(1, math.floor(n / 4))
			if p.dur <= 0 then
				s.inv[i] = false
			end
		end
	end
end

local function danar(plr, n, tipo, dir)
	local s = st(plr)
	local h, root = humanoide(plr)
	if not s or not h or h.Health <= 0 or n <= 0 then
		return
	end
	if not supervivencia(s) and tipo ~= "vacio" then
		return
	end
	n = Modos.modDano(plr, n, tipo)
	if n <= 0 then
		return
	end
	if s.efectos.resistenciaFuego and (tipo == "fuego" or tipo == "lava") then
		return
	end
	local ahora = os.clock()
	if ahora < s.invuln and tipo ~= "vacio" then
		if n <= s.ultimoDano then
			return
		end
		n -= s.ultimoDano
	end
	local d = n
	if tipo == "mob" or tipo == "flecha" or tipo == "explosion" or tipo == "jugador" then
		local def, dur = armaduraTotal(s)
		d = d * (1 - math.min(20, math.max(def / 5, def - d / (2 + dur / 4))) / 25)
		-- Protección (encantamiento): 4 % menos por nivel, hasta un 80 %
		local prot = 0
		for i = 37, 40 do
			local pz = s.inv[i]
			prot += pz and pz.enc and (pz.enc.proteccion or 0) or 0
		end
		d *= 1 - math.min(20, prot) * 0.04
		desgastarArmadura(s, n)
	end
	if s.efectos.resistencia then
		d *= 0.8
	end
	if ahora >= s.invuln then
		s.ultimoDano = n
	end
	s.invuln = ahora + 0.5
	s.agotamiento += 0.1
	h.Health = math.max(0, h.Health - d)
	s.ultimaCausa = tipo
	Estado:FireClient(plr, "dano", dir and Vector3.new(dir.x * 6 * BS / 3, 4.5 * BS / 3, dir.z * 6 * BS / 3) or nil)
	enviarJugador(plr)
end

------------------------------------------------------------------
-- Entradas y salidas de jugadores
------------------------------------------------------------------
local function nuevoEstado()
	return {
		inv = Inv.nuevo(), sel = 1, cursor = false, rejilla = table.create(9, false), ui = nil,
		hambre = 20, saturacion = 5, agotamiento = 0, xp = { nivel = 0, puntos = 0 }, modo = nil,
		aire = 15, fuego = 0, efectos = {}, invuln = 0, ultimoDano = 0, ultimoAtaque = 0, regenT = 0, hambreT = 0, aireT = 0,
		contactoT = 0, fuegoT = 0, efectoT = 0, cama = nil, golpe = nil, ultimaPos = nil,
	}
end

local function cargar(plr)
	local s = nuevoEstado()
	estados[plr] = s
	if almacen then
		local ok, g = pcall(function()
			return almacen:GetAsync("u_" .. plr.UserId)
		end)
		if ok and type(g) == "table" and type(g.inv) == "table" then
			for i = 1, Inv.TAM do
				local p = g.inv[i]
				if type(p) == "table" and (OB[p.id] or BL[p.id]) and type(p.n) == "number" then
					s.inv[i] = { id = p.id, n = math.clamp(p.n, 1, Registro.maxPila(p.id)), dur = p.dur }
					-- Encantamientos guardados (nombre -> nivel)
					if type(p.enc) == "table" then
						local enc = {}
						for k, v in p.enc do
							if type(k) == "string" and type(v) == "number" then
								enc[k] = math.clamp(math.floor(v), 1, 10)
							end
						end
						if next(enc) then
							s.inv[i].enc = enc
						end
					end
				end
			end
			if type(g.xp) == "table" then
				s.xp = { nivel = tonumber(g.xp.nivel) or 0, puntos = tonumber(g.xp.puntos) or 0 }
			end
			s.hambre = tonumber(g.hambre) or 20
		elseif not ok then
			-- Si el DataStore falla no se guarda nada: así no se pisa la partida guardada con un inventario vacío
			s.sinGuardar = true
			warn("[Blockverse] No se pudo cargar la partida de " .. plr.Name .. ": " .. tostring(g))
		end
	end
end

local function guardar(plr)
	local s = st(plr)
	if not s or not almacen or s.sinGuardar or s.modo == "creativo" or s.ob or Modos.activo(plr) then
		return
	end
	pcall(function()
		almacen:SetAsync("u_" .. plr.UserId, { inv = s.inv, xp = s.xp, hambre = s.hambre })
	end)
end

local function puntoAparicion(plr, s)
	if s and s.cama then
		return s.cama[1], s.cama[3]
	end
	local m = Modos.puntoAparicion(plr)
	if m then
		return m[1], m[3]
	end
	return spawnX + math.random(-3, 3), spawnZ + math.random(-3, 3)
end

local function colocar(plr, char)
	local root = char:WaitForChild("HumanoidRootPart", 10)
	local hum = char:WaitForChild("Humanoid", 10)
	if not root or not hum then
		return
	end
	hum.MaxHealth = 20
	hum.Health = 20
	hum.UseJumpPower = false
	hum.JumpHeight = 1.25 * BS + 0.4 -- un bloque y un poco
	hum.WalkSpeed = 4.3 * BS
	hum.BreakJointsOnDeath = false
	root.Anchored = true
	local s = st(plr)
	local x, z = puntoAparicion(plr, s)
	plr:SetAttribute("EsperaX", x)
	plr:SetAttribute("EsperaZ", z)
	local cx, cz = x // CX, z // CZ
	for dx = -1, 1 do
		for dz = -1, 1 do
			Mundo.asegurarFisica(cx + dx, cz + dz)
			task.wait()
		end
	end
	if not char.Parent then
		return
	end
	local y
	local mm = Modos.puntoAparicion(plr)
	if s and s.cama then
		y = s.cama[2] + 1
	elseif mm then
		y = mm[2]
	else
		y = Mundo.alturaSuelo(x, z) + 1
	end
	char:PivotTo(CFrame.new((x + 0.5) * BS, y * BS + 3.2, (z + 0.5) * BS))
	root.Anchored = false
	plr:SetAttribute("EsperaX", nil)
	plr:SetAttribute("EsperaZ", nil)
	Estado:FireClient(plr, "listo")
	Modos.alAparecer(plr)
	enviarJugador(plr)
end

-- Dinamita encendida: explota a los 4 segundos
local function activarTNT(x, y, z)
	Estado:FireAllClients("tnt", Vector3.new(x + 0.5, y + 0.5, z + 0.5) * BS)
	task.delay(4, function()
		Sim.explosion(x + 0.5, y + 0.5, z + 0.5, 4)
	end)
end

-- Lleva al jugador a (x, y, z) en bloques (pies); prepara las colisiones antes
local function teletransportar(plr, x, y, z, titulo)
	local h, root = humanoide(plr)
	if not root then
		return
	end
	local s = st(plr)
	if s and s.ui then
		s.ui = nil
	end
	root.Anchored = true
	Estado:FireClient(plr, "viaje", titulo)
	local cx, cz = math.floor(x) // CX, math.floor(z) // CZ
	for dx = -1, 1 do
		for dz = -1, 1 do
			Mundo.asegurarFisica(cx + dx, cz + dz)
			task.wait()
		end
	end
	if not root.Parent then
		return
	end
	root.Parent:PivotTo(CFrame.new(x * BS, y * BS + 3.2, z * BS))
	root.AssemblyLinearVelocity = Vector3.zero
	plr:SetAttribute("Dimension", Generador.dimensionBloque(math.floor(z)))
	task.delay(0.4, function()
		if root.Parent then
			root.Anchored = false
		end
	end)
	if titulo then
		Estado:FireClient(plr, "titulo", "", titulo, "#ffffff")
	end
	local _ = h
end

local function alMorir(plr)
	local s = st(plr)
	if not s then
		return
	end
	local p = s.ultimaPos
	local modoInv = Modos.inventarioAlMorir(plr, s)
	if modoInv == "borrar" then
		for i = 1, Inv.TAM do
			s.inv[i] = false
		end
		s.cursor = false
	end
	if p and supervivencia(s) and not modoInv and not Modos.mantenerInventario(plr) then
		for i = 1, Inv.TAM do
			if s.inv[i] then
				Entidades.soltarItem(s.inv[i], p.X, p.Y + 1, p.Z, true)
				s.inv[i] = false
			end
		end
		if s.cursor then
			Entidades.soltarItem(s.cursor, p.X, p.Y + 1, p.Z, true)
			s.cursor = false
		end
		Entidades.soltarXP(math.min(100, s.xp.nivel * 7), p.X, p.Y, p.Z)
		s.xp = { nivel = 0, puntos = 0 }
	end
	local textos = {
		caida = "Caíste desde muy alto.", mob = "Una criatura acabó contigo.", flecha = "Te dispararon una flecha.",
		hambre = "Moriste de hambre.", vacio = "Caíste al vacío.", lava = "Intentaste nadar en lava.", fuego = "Ardiste hasta morir.",
		ahogo = "Te ahogaste.", explosion = "Volaste por los aires.", cactus = "Te pinchaste hasta morir.", veneno = "El veneno pudo contigo.",
		jugador = "Otro jugador acabó contigo.",
	}
	enviarJugador(plr)
	Estado:FireClient(plr, "muerte", (textos[s.ultimaCausa or ""] or "Has muerto.") .. ((supervivencia(s) and not modoInv) and " Tus objetos quedaron donde caíste." or ""))
	s.efectos = {}
	s.fuego = 0
	Modos.alMorir(plr)
end

Players.PlayerAdded:Connect(function(plr)
	cargar(plr)
	plr.CharacterAdded:Connect(function(char)
		local s = st(plr)
		if s then
			s.hambre, s.saturacion, s.agotamiento, s.aire = 20, 5, 0, 15
		end
		task.spawn(colocar, plr, char)
		local hum = char:WaitForChild("Humanoid", 10)
		if hum then
			hum.Died:Connect(function()
				alMorir(plr)
			end)
		end
		task.defer(enviarJugador, plr)
	end)
	task.defer(enviarJugador, plr)
end)

Players.PlayerRemoving:Connect(function(plr)
	-- Si estaba en un modo (Bed Wars, Mazmorras, Leyendas), recupera su inventario antes de guardar
	pcall(Modos.alSalirJugador, plr)
	local s = st(plr)
	if s and s.ui then
		s.ui = nil
	end
	guardar(plr)
	estados[plr] = nil
end)

game:BindToClose(function()
	for _, plr in Players:GetPlayers() do
		guardar(plr)
	end
end)
-- Guardado automático cada 2 minutos (por si el servidor se cierra de golpe)
task.spawn(function()
	while true do
		task.wait(120)
		for _, plr in Players:GetPlayers() do
			task.spawn(guardar, plr)
		end
	end
end)

------------------------------------------------------------------
-- Colisiones alrededor de los jugadores
------------------------------------------------------------------
task.spawn(function()
	local R = Config.RADIO_FISICA
	while true do
		local quiero = {}
		local centros = {}
		for _, plr in Players:GetPlayers() do
			local ex, ez = plr:GetAttribute("EsperaX"), plr:GetAttribute("EsperaZ")
			local cx, cz
			if ex then
				cx, cz = ex // CX, ez // CZ
			else
				local p = piesDe(plr)
				if p then
					cx, cz = math.floor(p.X) // CX, math.floor(p.Z) // CZ
				end
			end
			if cx then
				table.insert(centros, { cx, cz })
			end
		end
		local hecho = false
		for _, c in centros do
			for dx = -R, R do
				for dz = -R, R do
					quiero[MundoDatos.clave(c[1] + dx, c[2] + dz)] = true
				end
			end
		end
		-- El más cercano que falte
		for _, c in centros do
			if hecho then
				break
			end
			for r = 0, R do
				for dx = -r, r do
					for dz = -r, r do
						if not hecho and math.max(math.abs(dx), math.abs(dz)) == r and not Mundo.tieneFisica(c[1] + dx, c[2] + dz) then
							Mundo.asegurarFisica(c[1] + dx, c[2] + dz)
							hecho = true
						end
					end
				end
			end
		end
		for k in Mundo.fisica do
			if not quiero[k] then
				local cx, cz = MundoDatos.desclave(k)
				local lejos = true
				for _, c in centros do
					if math.max(math.abs(cx - c[1]), math.abs(cz - c[2])) <= R + 1 then
						lejos = false
					end
				end
				if lejos then
					Mundo.quitarFisica(cx, cz)
				end
			end
		end
		-- Liberar datos lejanos sin cambios
		for k in Mundo.md.datos do
			local cx, cz = MundoDatos.desclave(k)
			local lejos = true
			for _, c in centros do
				if math.max(math.abs(cx - c[1]), math.abs(cz - c[2])) <= R + 6 then
					lejos = false
				end
			end
			if lejos and not Mundo.fisica[k] then
				Mundo.md:descargar(cx, cz)
			end
		end
		task.wait(hecho and 0 or 0.25)
	end
end)

-- Los clientes piden las ediciones de los chunks que van a dibujar
Ediciones.OnServerInvoke = function(plr, lista)
	local r = {}
	if type(lista) ~= "table" then
		return r
	end
	for i, c in lista do
		if i > 64 then
			break
		end
		if type(c) == "table" and type(c[1]) == "number" and type(c[2]) == "number" then
			local ed = Mundo.ediciones(c[1], c[2])
			if ed and next(ed) then
				local t = {}
				for idx, id in ed do
					t[tostring(idx)] = id
				end
				r[tostring(MundoDatos.clave(c[1], c[2]))] = t
			end
		end
	end
	return r
end

------------------------------------------------------------------
-- Ayudas para las acciones
------------------------------------------------------------------
local function esEntero(v)
	return type(v) == "number" and v == math.floor(v) and math.abs(v) < 1e7
end

local function ojos(plr)
	local ch = plr.Character
	local h = ch and ch:FindFirstChild("Head")
	return h and h.Position
end

local function alAlcance(plr, x, y, z, extra)
	local p = ojos(plr)
	if not p then
		return false
	end
	local c = Vector3.new((x + 0.5) * BS, (y + 0.5) * BS, (z + 0.5) * BS)
	return (c - p).Magnitude <= (Config.ALCANCE + (extra or 2)) * BS
end

-- ¿El bloque (con sus cajas) se mete en algún jugador o criatura?
local function cubreEntidad(id, x, y, z)
	if not SOLIDO[id] then
		return false
	end
	local cajas = (FORMA[id] == 6 and BL[id].cajas) or (FORMA[id] == 1 and { { 0, 0, 0, 1, BL[id].altura or 0.5, 1 } }) or { { 0, 0, 0, 1, 1, 1 } }
	for _, c in cajas do
		local X0, Y0, Z0, X1, Y1, Z1 = x + c[1], y + c[2], z + c[3], x + c[4], y + c[5], z + c[6]
		for _, plr in Players:GetPlayers() do
			local p = piesDe(plr)
			if p and X1 > p.X - 0.3 and X0 < p.X + 0.3 and Y1 > p.Y and Y0 < p.Y + 1.8 and Z1 > p.Z - 0.3 and Z0 < p.Z + 0.3 then
				return true
			end
		end
		for _, m in Mobs.lista do
			if not m.muerto and X1 > m.x - m.ancho and X0 < m.x + m.ancho and Y1 > m.y and Y0 < m.y + m.alto and Z1 > m.z - m.ancho and Z0 < m.z + m.ancho then
				return true
			end
		end
	end
	return false
end

local function facing(dir)
	local dx, dz = dir.X, dir.Z
	if math.abs(dx) > math.abs(dz) then
		return dx > 0 and 1 or 3
	end
	return dz > 0 and 2 or 0
end

-- Soltar lo que da un bloque (con experiencia de las menas)
local function soltarBloque(id, x, y, z, herrId, plr)
	local s = plr and st(plr)
	local lista
	if herrId == I.tijeras and (Registro.esHojas(id) or id == B.hierbaAlta or id == B.helecho or (BL[id] and (BL[id].clave or ""):find("^hojas"))) then
		lista = { { id, 1 } }
	else
		lista = Registro.sueltaDe(id, herrId)
	end
	for _, d in lista do
		if d[2] > 0 and (OB[d[1]] or BL[d[1]]) then
			Entidades.soltarItem(Registro.pila(d[1], d[2]), x + 0.5, y + 0.3, z + 0.5, true)
		end
	end
	local def = BL[id]
	if def and def.xp and Registro.puedeRecoger(id, herrId) and (not s or supervivencia(s)) then
		local v = math.random(def.xp[1] or 0, def.xp[2] or 0)
		if v > 0 then
			Entidades.soltarXP(v, x + 0.5, y + 0.5, z + 0.5)
		end
	end
end

Sim.alRomper = function(id, x, y, z)
	if Cont.esCofre(id) or Cont.esHorno(id) then
		Cont.vaciar(x, y, z)
	end
	soltarBloque(id, x, y, z, nil, nil)
end

------------------------------------------------------------------
-- Explosiones, criaturas y proyectiles
------------------------------------------------------------------
local function danoExplosion(x, y, z, potencia, fuente)
	local alcance = potencia * 2
	local function calc(px, py, pz, alto)
		local cy = py + alto / 2
		local d = math.sqrt((px - x) ^ 2 + (cy - y) ^ 2 + (pz - z) ^ 2)
		if d > alcance then
			return nil
		end
		local imp = 1 - d / alcance
		local dano = math.floor(((imp * imp + imp) / 2) * 7 * alcance + 1)
		local l = d > 0 and d or 1
		return dano, { x = (px - x) / l * imp, y = (cy - y) / l * imp, z = (pz - z) / l * imp }
	end
	for _, plr in Players:GetPlayers() do
		local p = piesDe(plr)
		if p then
			local dano, dir = calc(p.X, p.Y, p.Z, 1.8)
			if dano then
				local lh = math.sqrt(dir.x * dir.x + dir.z * dir.z)
				danar(plr, dano, "explosion", { x = dir.x / (lh > 0 and lh or 1), z = dir.z / (lh > 0 and lh or 1) })
			end
		end
	end
	for _, m in Mobs.lista do
		if m ~= fuente and not m.muerto then
			local dano, dir = calc(m.x, m.y, m.z, m.alto)
			if dano then
				Mobs.herir(m, dano, { x = dir.x, z = dir.z }, "explosion")
				m.vy += dir.y * 6 + 2
			end
		end
	end
	for _, e in Entidades.lista do
		if e.tipo == "item" and not e.muerta and math.abs(e.x - x) + math.abs(e.y - y) + math.abs(e.z - z) < potencia then
			e.muerta = true
			e.pieza:Destroy()
		end
	end
	Estado:FireAllClients("explosion", Vector3.new(x, y, z) * BS, potencia)
end
Sim.alExplotar = danoExplosion
Mobs.alExplotar = function(x, y, z, potencia, fuente)
	Sim.explosion(x, y, z, potencia, { fuente = fuente })
end
Mobs.alDanarJugador = function(plr, dano, tipo, dir)
	danar(plr, dano, tipo, dir)
end
Mobs.esCreativo = function(plr)
	local s = st(plr)
	return s ~= nil and not supervivencia(s)
end

Entidades.alRecoger = function(plr, pila)
	local s = st(plr)
	if not s then
		return pila.n
	end
	local h = humanoide(plr)
	if not h or h.Health <= 0 then
		return pila.n
	end
	local sobra = Inv.dar(s.inv, pila)
	if sobra < pila.n then
		Estado:FireClient(plr, "sonido", "recoger")
		enviarJugador(plr)
		if s.ui then
			enviarUI(plr)
		end
	end
	return sobra
end
Entidades.alXP = function(plr, v)
	ganarXP(plr, v)
	Estado:FireClient(plr, "sonido", "xp")
end

-- Impacto de flechas, bolas de fuego y perlas
Entidades.alImpacto = function(e, modo)
	local opc = e.opc
	if modo == "buscar" then
		-- El dragón y los cristales del End
		if (e.tipo == "flecha" or e.tipo == "tridente") and Dimension.golpeProyectil(e.x, e.y, e.z, opc.dano) then
			return true
		end
		-- Criaturas
		for _, m in Mobs.lista do
			if not m.muerto and m ~= opc.dueno and e.x > m.x - m.ancho - 0.1 and e.x < m.x + m.ancho + 0.1 and e.y > m.y and e.y < m.y + m.alto
				and e.z > m.z - m.ancho - 0.1 and e.z < m.z + m.ancho + 0.1 then
				local v = math.sqrt(e.vx * e.vx + e.vy * e.vy + e.vz * e.vz)
				if e.tipo == "flecha" then
					local dano = opc.dano or math.ceil(v / 30 * 6)
					local l = math.sqrt(e.vx * e.vx + e.vz * e.vz)
					Mobs.herir(m, dano, { x = e.vx / (l > 0 and l or 1) * 0.5, z = e.vz / (l > 0 and l or 1) * 0.5 }, opc.jugador and "flechaJugador" or "flecha", 0, opc.jugador)
				elseif e.tipo == "bolaFuego" then
					Mobs.herir(m, 5, nil, "fuego")
					m.fuego = 5
				elseif e.tipo == "bolaGhast" then
					Sim.explosion(e.x, e.y, e.z, 1, { fuente = opc.dueno })
				elseif e.tipo == "perla" and opc.jugador then
					return true
				end
				return true
			end
		end
		-- Jugadores
		for _, plr in Players:GetPlayers() do
			if plr ~= opc.jugador and not (opc.jugador and Modos.pvp(opc.jugador, plr) == false) then
				local p = piesDe(plr)
				if p and e.x > p.X - 0.4 and e.x < p.X + 0.4 and e.y > p.Y and e.y < p.Y + 1.8 and e.z > p.Z - 0.4 and e.z < p.Z + 0.4 then
					local l = math.sqrt(e.vx * e.vx + e.vz * e.vz)
					local dir = { x = e.vx / (l > 0 and l or 1), z = e.vz / (l > 0 and l or 1) }
					if e.tipo == "flecha" then
						danar(plr, opc.dano or 3, "flecha", dir)
					elseif e.tipo == "bolaFuego" then
						danar(plr, 5, "fuego", dir)
						local s = st(plr)
						if s then
							s.fuego = math.max(s.fuego, 5)
						end
					elseif e.tipo == "bolaGhast" then
						Sim.explosion(e.x, e.y, e.z, 1, { fuente = opc.dueno })
					end
					return true
				end
			end
		end
		return nil
	end
	-- Choca con un bloque
	if e.tipo == "bolaGhast" then
		Sim.explosion(e.x, e.y, e.z, 1, { fuente = opc.dueno })
	elseif e.tipo == "bolaFuego" then
		local x, y, z = math.floor(e.x - e.vx * 0.02), math.floor(e.y - e.vy * 0.02), math.floor(e.z - e.vz * 0.02)
		if Mundo.get(x, y, z) == 0 then
			Mundo.set(x, y, z, B.fuego)
		end
	elseif e.tipo == "perla" and opc.jugador then
		local ch = opc.jugador.Character
		if ch then
			ch:PivotTo(CFrame.new(e.x * BS, (e.y + 1) * BS + 3, e.z * BS))
			danar(opc.jugador, 5, "caida")
		end
	end
	return nil
end

Cont.alCambiarHorno = function(k)
	local h = Cont.hornos[k]
	if h then
		-- Bloque encendido o apagado
		local id = Mundo.get(h.x, h.y, h.z)
		local par = { [17] = 1662, [1608] = 1663, [1609] = 1664 }
		local inv = { [1662] = 17, [1663] = 1608, [1664] = 1609 }
		if h.quema > 0 and par[id] then
			Mundo.set(h.x, h.y, h.z, par[id], { sinAviso = true })
		elseif h.quema <= 0 and inv[id] then
			Mundo.set(h.x, h.y, h.z, inv[id], { sinAviso = true })
		end
	end
	for plr, s in estados do
		if s.ui and s.ui.tipo == "horno" and Cont.clave(s.ui.x, s.ui.y, s.ui.z) == k then
			enviarUI(plr)
		end
	end
end

------------------------------------------------------------------
-- Acciones
------------------------------------------------------------------
local acciones = {}

function acciones.sel(plr, s, i)
	if esEntero(i) and i >= 1 and i <= 9 then
		s.sel = i
		s.comiendoDesde = nil
		s.arcoDesde = nil
		enviarJugador(plr)
	end
end

function acciones.golpe(plr, s, x, y, z)
	if esEntero(x) and esEntero(y) and esEntero(z) then
		s.golpe = { x = x, y = y, z = z, t = os.clock() }
		Modos.golpeBloque(plr, x, y, z)
	end
end

function acciones.romper(plr, s, x, y, z)
	if not (esEntero(x) and esEntero(y) and esEntero(z)) or not alAlcance(plr, x, y, z) then
		return
	end
	local b = Mundo.get(x, y, z)
	local def = BL[b]
	if b == 0 or not def or esLiquido(b) or not Modos.puedeRomper(plr, x, y, z, b) then
		return
	end
	local creativo = not supervivencia(s)
	local mano = s.inv[s.sel]
	local herrId = mano and mano.id or nil
	if creativo then
		if mano and OB[mano.id] and OB[mano.id].herr and OB[mano.id].herr.tipo == "espada" then
			return
		end
	else
		if def.dureza < 0 then
			return
		end
		local t = Registro.tiempoRomper(b, herrId)
		local g = s.golpe
		if t > 0.05 and (not g or g.x ~= x or g.y ~= y or g.z ~= z or os.clock() - g.t < t * 0.6 - 0.25) then
			return
		end
	end
	s.golpe = nil
	-- Puertas: se rompen las dos mitades
	if def.puerta then
		local otro = y + (def.puerta.m == 1 and -1 or 1)
		if BL[Mundo.get(x, otro, z)] and BL[Mundo.get(x, otro, z)].puerta then
			Mundo.set(x, otro, z, 0, { sinAviso = true })
		end
	end
	if Cont.esCofre(b) or Cont.esHorno(b) then
		Cont.vaciar(x, y, z)
		-- A quien lo tuviera abierto se le cierra la pantalla
		for otro, so in estados do
			if so.ui and (so.ui.tipo == "cofre" or so.ui.tipo == "horno") and so.ui.x == x and so.ui.y == y and so.ui.z == z then
				Estado:FireClient(otro, "cerrarUI")
			end
		end
	end
	Mundo.set(x, y, z, 0)
	if not creativo then
		soltarBloque(b, x, y, z, herrId, plr)
		if def.dureza > 0 then
			local h = Registro.herramienta(herrId)
			if h then
				gastarEnMano(plr, s, h.tipo == "espada" and 2 or 1)
			end
		end
		s.agotamiento += 0.005
	end
	Modos.alRomper(plr, x, y, z, b)
	enviarJugador(plr)
end

-- Colocar un bloque (colocarBloque de jugador.js)
local function colocarBloque(plr, s, id, x, y, z, n, dir)
	if y < 0 or y >= CY then
		return false
	end
	local actual = Mundo.get(x, y, z)
	if actual ~= 0 and not REEMPL[actual] then
		return false
	end
	local def = BL[id]
	if not def then
		return false
	end
	local real = id
	if def.orienta == "escalera" then
		real = def.base + facing(dir)
	elseif def.orienta == "pared" or id == B.antorcha then
		if n[2] ~= 0 then
			if id ~= B.antorcha then
				return false
			end
		else
			local f = -1
			for k, d in DIRF do
				if d[1] == -n[1] and d[2] == -n[3] then
					f = k - 1
				end
			end
			if f < 0 then
				return false
			end
			local pared = Mundo.get(x + DIRF[f + 1][1], y, z + DIRF[f + 1][2])
			if not SOLIDO[pared] or FORMA[pared] ~= 0 then
				return false
			end
			real = id == B.antorcha and 165 + f or def.base + f
		end
	end
	-- Pistones: miran hacia donde mira el jugador (como en jugador.js)
	if def.piston then
		local a = { math.abs(dir.X), math.abs(dir.Y), math.abs(dir.Z) }
		local eje = (a[1] >= a[2] and a[1] >= a[3]) and 0 or (a[2] >= a[3] and 1 or 2)
		local comp = ({ dir.X, dir.Y, dir.Z })[eje + 1]
		real = ((def.piston.peg and def.piston.peg ~= 0) and 1242 or 1224) + eje * 2 + (comp > 0 and 0 or 1)
	end
	-- Plantas y cosas que necesitan apoyo
	if real == id and (def.forma == "cruz" or def.forma == "antorcha") and not SOLIDO[Mundo.get(x, y - 1, z)] and id ~= B.nenufar then
		return false
	end
	if cubreEntidad(real, x, y, z) then
		return false
	end
	if not Modos.puedePoner(plr, x, y, z, real) then
		return false
	end
	if actual ~= 0 and not esLiquido(actual) then
		soltarBloque(actual, x, y, z, nil, plr)
	end
	Mundo.set(x, y, z, real)
	Modos.alPoner(plr, x, y, z, real)
	if Redstone.esRiel(real) then
		Redstone.colocarRiel(x, y, z, facing(dir))
	end
	if real == B.calabaza or real == B.linternaCalabaza then
		-- Gólem de hierro o de nieve
		local abajo, abajo2 = Mundo.get(x, y - 1, z), Mundo.get(x, y - 2, z)
		if abajo == B.bloqueNieve and abajo2 == B.bloqueNieve and Mobs.DEF.golemNieve then
			for k = 0, 2 do
				Mundo.set(x, y - k, z, 0)
			end
			Mobs.crear("golemNieve", x + 0.5, y - 2, z + 0.5)
		elseif abajo == B.bloqueHierro and abajo2 == B.bloqueHierro then
			Mundo.set(x, y, z, 0)
			Mundo.set(x, y - 1, z, 0)
			Mundo.set(x, y - 2, z, 0)
			local m = Mobs.crear("golem", x + 0.5, y - 2, z + 0.5)
			if m then
				m.domado = true
			end
		end
	end
	Estado:FireClient(plr, "sonido", "poner", Vector3.new(x + 0.5, y + 0.5, z + 0.5) * BS)
	return true
end

local function colocarPuerta(plr, s, x, y, z, dir)
	local a, b = Mundo.get(x, y, z), Mundo.get(x, y + 1, z)
	if (a ~= 0 and not REEMPL[a]) or (b ~= 0 and not REEMPL[b]) or not SOLIDO[Mundo.get(x, y - 1, z)] then
		return false
	end
	local f = facing(dir)
	local id = 149 + f * 4
	if cubreEntidad(id, x, y, z) or cubreEntidad(id + 1, x, y + 1, z) then
		return false
	end
	Mundo.set(x, y, z, id, { sinAviso = true })
	Mundo.set(x, y + 1, z, id + 1)
	return true
end

local function alternarPuerta(x, y, z)
	local b = Mundo.get(x, y, z)
	local pu = BL[b] and BL[b].puerta
	if not pu then
		return
	end
	local yb = pu.m == 1 and y - 1 or y
	local base = 149 + pu.f * 4 + (1 - pu.ab) * 2
	Mundo.set(x, yb, z, base, { sinAviso = true })
	Mundo.set(x, yb + 1, z, base + 1, { sinAviso = true })
end

local CULTIVOS = {}
for clave, bloque in { semillas = "trigo0", zanahoria = "zanahorias0", patata = "patatas0", semillasRemolacha = "remolachas0" } do
	if I[clave] and B[bloque] then
		CULTIVOS[I[clave]] = B[bloque]
	end
end
if not CULTIVOS[640] and B.zanahorias0 then
	CULTIVOS[640] = B.zanahorias0
end
if not CULTIVOS[641] and B.patatas0 then
	CULTIVOS[641] = B.patatas0
end
if not CULTIVOS[679] and B.remolachas0 then
	CULTIVOS[679] = B.remolachas0
end

local function aplicarEfecto(s, nombre, seg, nivel)
	if nombre == "curacion" then
		return "curar"
	end
	local e = s.efectos[nombre]
	if not e or e.t < seg then
		s.efectos[nombre] = { t = seg, n = nivel or 1 }
	end
end

-- Clic derecho (usarDerecho de jugador.js)
-- obj: {x, y, z, n} del bloque apuntado (o nil); dir: dirección de la mirada; mob: pieza de criatura apuntada
function acciones.derecho(plr, s, obj, dir, mobParte, agachado)
	if typeof(dir) ~= "Vector3" then
		return
	end
	dir = dir.Unit
	local p = s.inv[s.sel]
	local id = p and p.id or 0
	local o = id ~= 0 and OB[id] or nil
	local h = humanoide(plr)
	-- Criaturas: alimentar, esquilar, comerciar
	if typeof(mobParte) == "Instance" then
		local m = Mobs.desdeParte(mobParte)
		local pp = piesDe(plr)
		if m and pp and math.abs(m.x - pp.X) + math.abs(m.z - pp.Z) < 8 and Modos.usarMob(plr, s, m) then
			return
		end
		if m and pp and math.abs(m.x - pp.X) + math.abs(m.z - pp.Z) < 8 and m.tipo == "aldeano" and m.ofertas and #m.ofertas > 0
			and not agachado then
			-- Comerciar
			Mesas.abrir(plr, s, "aldeano", nil, nil, nil, m)
			enviarUI(plr)
			return
		end
		if m and pp and math.abs(m.x - pp.X) + math.abs(m.z - pp.Z) < 8 then
			if m.def.comida == id and m.bebe <= 0 and m.amor <= 0 then
				m.amor = 30
				consumirEnMano(s)
				enviarJugador(plr)
				return
			end
			if id == I.tijeras and m.tipo == "oveja" and not m.esquilada then
				m.esquilada = true
				m.pieza:SetAttribute("esquilada", true)
				Entidades.soltarItem(Registro.pila(B.lana, math.random(1, 3)), m.x, m.y + 1, m.z, true)
				gastarEnMano(plr, s, 1)
				enviarJugador(plr)
				return
			end
			if o and o.huevo then
				-- un huevo usado sobre una criatura crea una cría
				Mobs.crear(o.huevo, m.x, m.y, m.z, { bebe = true })
				consumirEnMano(s)
				enviarJugador(plr)
				return
			end
		end
	end
	-- Objetos especiales de los modos (bola de fuego, huevo puente, artefactos…)
	if Modos.usarObjeto(plr, s, p, dir, obj) then
		return
	end
	local x, y, z, n
	if type(obj) == "table" and esEntero(obj.x) and esEntero(obj.y) and esEntero(obj.z) and type(obj.n) == "table" then
		x, y, z = obj.x, obj.y, obj.z
		n = { math.clamp(tonumber(obj.n[1]) or 0, -1, 1), math.clamp(tonumber(obj.n[2]) or 0, -1, 1), math.clamp(tonumber(obj.n[3]) or 0, -1, 1) }
		if not alAlcance(plr, x, y, z) then
			return
		end
	end
	local b = x and Mundo.get(x, y, z) or 0
	-- Bloques con los que se interactúa
	if x and not agachado then
		local def = BL[b]
		local inter = def and def.inter
		if def and def.redstone and Redstone.usar(x, y, z, b) then
			return
		end
		if esPuerta(b) then
			alternarPuerta(x, y, z)
			Estado:FireClient(plr, "sonido", "puerta")
			return
		end
		if inter == "cama" and Modos.activo(plr) then
			inter = nil
		end
		if inter == "cama" then
			s.cama = { x, y, z }
			if not Mobs.esDeNoche() then
				aviso(plr, "Solo puedes dormir de noche. Punto de reaparición guardado.")
				return
			end
			for _, m in Mobs.lista do
				if not m.muerto and m.def.tipo == "hostil" and math.abs(m.x - x) + math.abs(m.z - z) < 8 then
					aviso(plr, "No puedes descansar ahora, hay monstruos cerca.")
					return
				end
			end
			Estado:FireClient(plr, "dormir")
			task.delay(2.2, function()
				Lighting.ClockTime = 6.2
				aviso(plr, "Buenos días. Punto de reaparición guardado.")
			end)
			return
		end
		if inter == "mesa" then
			s.ui = { tipo = "mesa", x = x, y = y, z = z }
			enviarUI(plr)
			return
		end
		if inter == "horno" then
			local tipo = (b == 1608 or b == 1663) and "ahumador" or (b == 1609 or b == 1664) and "altoHorno" or "horno"
			Cont.horno(x, y, z, tipo)
			s.ui = { tipo = "horno", x = x, y = y, z = z }
			enviarUI(plr)
			return
		end
		if inter == "cofre" then
			Cont.cofre(x, y, z)
			s.ui = { tipo = "cofre", x = x, y = y, z = z }
			enviarUI(plr)
			Estado:FireAllClients("cofreAbierto", Vector3.new(x, y, z), true)
			return
		end
		if inter == "encantar" or inter == "yunque" or inter == "afiladora" or inter == "herreria" or inter == "pociones" then
			Mesas.abrir(plr, s, inter, x, y, z)
			enviarUI(plr)
			return
		end
		if inter then
			return
		end
		if b == B.marcoEnd and id == I.ojoEnder then
			Mundo.set(x, y, z, B.marcoEndOjo)
			consumirEnMano(s)
			enviarJugador(plr)
			if Dimension.comprobarPortalEnd(x, y, z) then
				Estado:FireAllClients("sonido", "portal", Vector3.new(x + 0.5, y + 0.5, z + 0.5) * BS)
				aviso(plr, "El portal del End se ha activado.")
			end
			return
		end
		if b == B.boveda and id == 541 then
			if Habitantes.abrirBoveda(x, y, z) then
				consumirEnMano(s)
				enviarJugador(plr)
			end
			return
		end
		if b == B.tnt and id == I.mechero then
			Mundo.set(x, y, z, 0)
			activarTNT(x, y, z)
			gastarEnMano(plr, s, 1)
			enviarJugador(plr)
			return
		end
	end
	if not o and not (id ~= 0 and BL[id]) then
		return
	end
	o = o or {}
	-- Comer y beber (empieza; el cliente avisa al terminar)
	if (o.comida or o.bebida) and (s.hambre < 20 or o.siempre or o.bebida or not supervivencia(s)) then
		s.comiendoDesde = os.clock()
		s.comiendoId = id
		return
	end
	if id == I.arco then
		local tiene = not supervivencia(s) or Inv.contar(s.inv, I.flecha) > 0
		if tiene then
			s.arcoDesde = os.clock()
		end
		return
	end
	if o.armadura then
		local slot = 37 + o.armadura.pieza
		local prev = s.inv[slot]
		s.inv[slot] = p
		s.inv[s.sel] = prev or false
		Estado:FireClient(plr, "sonido", "armadura")
		enviarJugador(plr)
		return
	end
	if o.huevo and x then
		local tx, ty, tz = x + n[1], y + n[2], z + n[3]
		Mobs.crear(o.huevo, tx + 0.5, ty, tz + 0.5)
		consumirEnMano(s)
		enviarJugador(plr)
		return
	end
	if id == I.perlaEnder then
		local e = ojos(plr)
		if e then
			Entidades.disparar("perla", e.X / BS + dir.X, e.Y / BS + dir.Y, e.Z / BS + dir.Z, dir, 28, { jugador = plr })
			consumirEnMano(s)
			enviarJugador(plr)
		end
		return
	end
	if o.pocion and o.pocion.arrojadiza then
		-- Se rompe delante y afecta a quien esté cerca
		local e = ojos(plr)
		local cx, cy, cz = e.X / BS + dir.X * 3, e.Y / BS + dir.Y * 3, e.Z / BS + dir.Z * 3
		for _, otro in Players:GetPlayers() do
			local pp = piesDe(otro)
			local so = st(otro)
			if pp and so and math.abs(pp.X - cx) + math.abs(pp.Z - cz) < 4 then
				if aplicarEfecto(so, o.pocion.efecto, 30, 1) == "curar" then
					local hh = humanoide(otro)
					if hh then
						hh.Health = math.min(hh.MaxHealth, hh.Health + 4)
					end
				end
				enviarJugador(otro)
			end
		end
		Estado:FireAllClients("pocion", Vector3.new(cx, cy, cz) * BS, o.pocion.color or 0xff00ff)
		consumirEnMano(s)
		enviarJugador(plr)
		return
	end
	-- Cubos
	if id == I.cubo then
		local e = ojos(plr)
		local r = Rayo.lanzar(Mundo.md, e, dir, Config.ALCANCE, { liquidos = true })
		if r and esLiquido(r.b) and (BL[r.b].nivelL or 0) == 0 then
			Mundo.set(r.x, r.y, r.z, 0)
			Estado:FireClient(plr, "sonido", esAgua(r.b) and "agua" or "lava")
			if supervivencia(s) then
				local lleno = Registro.pila(esAgua(r.b) and I.cuboAgua or I.cuboLava, 1)
				if p.n == 1 then
					s.inv[s.sel] = lleno
				else
					p.n -= 1
					darOSoltar(plr, lleno)
				end
			end
			enviarJugador(plr)
		end
		return
	end
	if (id == I.cuboAgua or id == I.cuboLava) and x then
		local tx, ty, tz = x, y, z
		if not REEMPL[b] or esLiquido(b) then
			tx, ty, tz = x + n[1], y + n[2], z + n[3]
		end
		local act = Mundo.get(tx, ty, tz)
		if act ~= 0 and not REEMPL[act] then
			return
		end
		if act ~= 0 and not esLiquido(act) then
			soltarBloque(act, tx, ty, tz, nil, plr)
		end
		if id == I.cuboAgua and Dimension.de(tz) == "nether" then
			-- En el Nether el agua se evapora
			Estado:FireAllClients("particulas", Vector3.new(tx + 0.5, ty + 0.5, tz + 0.5) * BS, 0xdddddd)
		else
			Mundo.set(tx, ty, tz, id == I.cuboAgua and B.agua or B.lava)
		end
		if supervivencia(s) then
			s.inv[s.sel] = Registro.pila(I.cubo, 1)
		end
		enviarJugador(plr)
		return
	end
	if id == I.mechero and x then
		local tx, ty, tz = x + n[1], y + n[2], z + n[3]
		if Mundo.get(tx, ty, tz) ~= 0 then
			return
		end
		-- ¿Enciende un portal del Nether?
		if b == B.obsidiana and Dimension.encender(tx, ty, tz) then
			Estado:FireAllClients("sonido", "portal", Vector3.new(tx + 0.5, ty + 0.5, tz + 0.5) * BS)
			gastarEnMano(plr, s, 1)
			enviarJugador(plr)
			return
		end
		if SOLIDO[Mundo.get(tx, ty - 1, tz)] then
			Mundo.set(tx, ty, tz, B.fuego)
			gastarEnMano(plr, s, 1)
			enviarJugador(plr)
		end
		return
	end
	if id == I.harinaHueso and x then
		local usado = false
		if B.trigo0 and b >= B.trigo0 and b < B.trigo0 + 7 then
			Mundo.set(x, y, z, math.min(B.trigo0 + 7, b + math.random(2, 5)))
			usado = true
		elseif BL[b] and BL[b].cultivo and BL[b + 1] and BL[b + 1].cultivo then
			Mundo.set(x, y, z, b + 1)
			usado = true
		elseif Sim.TIPO_BROTE[b] then
			if math.random() < 0.45 then
				Sim.crecerArbol(x, y, z)
			end
			usado = true
		elseif b == B.cesped and Mundo.get(x, y + 1, z) == 0 then
			for _ = 1, 12 do
				local nx, nz = x + math.random(-3, 3), z + math.random(-3, 3)
				if Mundo.get(nx, y, nz) == B.cesped and Mundo.get(nx, y + 1, nz) == 0 then
					Mundo.set(nx, y + 1, nz, math.random() < 0.85 and B.hierbaAlta or (math.random() < 0.5 and B.florAmarilla or B.florRoja))
				end
			end
			usado = true
		end
		if usado then
			consumirEnMano(s)
			Estado:FireAllClients("particulas", Vector3.new(x + 0.5, y + 1, z + 0.5) * BS, 0x60ff60)
			enviarJugador(plr)
		end
		return
	end
	if o.tipoHerr == "azada" and x then
		if (b == B.cesped or b == B.tierra) and Mundo.get(x, y + 1, z) == 0 then
			Mundo.set(x, y, z, B.cultivo)
			gastarEnMano(plr, s, 1)
			enviarJugador(plr)
		end
		return
	end
	if CULTIVOS[id] and x then
		if b == B.cultivo and Mundo.get(x, y + 1, z) == 0 then
			Mundo.set(x, y + 1, z, CULTIVOS[id])
			consumirEnMano(s)
			enviarJugador(plr)
		end
		return
	end
	if o.coloca == "puerta" and x then
		local tx, ty, tz = x, y, z
		if not REEMPL[b] or esLiquido(b) then
			tx, ty, tz = x + n[1], y + n[2], z + n[3]
		end
		if colocarPuerta(plr, s, tx, ty, tz, dir) then
			consumirEnMano(s)
			enviarJugador(plr)
		end
		return
	end
	if o.coloca == "cable" and x then
		if colocarBloque(plr, s, B.cable0 or 0, x + n[1], y + n[2], z + n[3], n, dir) then
			consumirEnMano(s)
			enviarJugador(plr)
		end
		return
	end
	-- Poner bloques
	if (o.bloque or (BL[id] and not OB[id])) and x then
		local tx, ty, tz = x, y, z
		if not (REEMPL[b] and not esLiquido(b) and b ~= B.fuego) then
			tx, ty, tz = x + n[1], y + n[2], z + n[3]
		end
		if id == B.nenufar then
			local e = ojos(plr)
			local r = Rayo.lanzar(Mundo.md, e, dir, Config.ALCANCE, { liquidos = true })
			if not r or r.b ~= B.agua or Mundo.get(r.x, r.y + 1, r.z) ~= 0 then
				return
			end
			tx, ty, tz = r.x, r.y + 1, r.z
		end
		if colocarBloque(plr, s, id, tx, ty, tz, n, dir) then
			consumirEnMano(s)
			enviarJugador(plr)
		end
	end
end

function acciones.terminarComer(plr, s)
	local p = s.inv[s.sel]
	if not p or not s.comiendoDesde or p.id ~= s.comiendoId or os.clock() - s.comiendoDesde < 1.3 then
		return
	end
	s.comiendoDesde = nil
	local o = OB[p.id]
	if not o then
		return
	end
	local h = humanoide(plr)
	if o.comida then
		s.hambre = math.min(20, s.hambre + o.comida[1])
		s.saturacion = math.min(s.hambre, s.saturacion + (o.comida[2] or 0))
		if o.efecto and math.random() < (o.efecto[3] or 1) then
			aplicarEfecto(s, o.efecto[1], o.efecto[2], 1)
		end
	end
	if o.pocion then
		if aplicarEfecto(s, o.pocion.efecto, 180, 1) == "curar" and h then
			h.Health = math.min(h.MaxHealth, h.Health + 4)
		end
	end
	if supervivencia(s) then
		p.n -= 1
		if p.n <= 0 then
			s.inv[s.sel] = false
		end
		if o.bebida then
			darOSoltar(plr, Registro.pila(I.frascoVacio or 500, 1))
		elseif o.devuelve then
			darOSoltar(plr, Registro.pila(o.devuelve, 1))
		end
	end
	Estado:FireClient(plr, "sonido", o.bebida and "beber" or "comer")
	enviarJugador(plr)
end

function acciones.soltarArco(plr, s, dir)
	if not s.arcoDesde or typeof(dir) ~= "Vector3" then
		return
	end
	local carga = math.min(1, (os.clock() - s.arcoDesde) / 1)
	s.arcoDesde = nil
	if carga < 0.1 then
		return
	end
	local p = s.inv[s.sel]
	if not p or p.id ~= I.arco then
		return
	end
	if supervivencia(s) then
		if not Inv.quitar(s.inv, I.flecha, 1) then
			return
		end
		gastarEnMano(plr, s, 1)
	end
	local e = ojos(plr)
	dir = dir.Unit
	local vel = 10 + carga * 32
	local dano = math.ceil(carga * carga * 6 + 0.5) + (s.efectos.fuerza and 3 or 0)
	-- Poder (encantamiento): +25 % por nivel y un 25 % más
	local poder = p.enc and p.enc.poder or 0
	if poder > 0 then
		dano = math.ceil(dano * (1 + 0.25 * (poder + 1)))
	end
	Entidades.disparar("flecha", e.X / BS + dir.X * 0.5, e.Y / BS + dir.Y * 0.5, e.Z / BS + dir.Z * 0.5, dir, vel,
		{ jugador = plr, dano = dano, recogible = supervivencia(s) })
	Estado:FireClient(plr, "sonido", "arco")
	enviarJugador(plr)
end

-- Ataque a una criatura (carga = 0..1 según el tiempo desde el último golpe)
function acciones.atacar(plr, s, parte, carga, cayendo, corriendo)
	if typeof(parte) ~= "Instance" then
		return
	end
	-- El dragón y los cristales del End
	if parte.Name == "CristalEnd" then
		Dimension.romperCristal(parte:GetAttribute("Cristal"))
		return
	end
	if Dimension.esDragon(parte) then
		local p = s.inv[s.sel]
		local hh = p and OB[p.id] and OB[p.id].herr
		local cad = hh and hh.cad or 4
		local c = math.clamp((os.clock() - s.ultimoAtaque) * cad, 0, 1)
		s.ultimoAtaque = os.clock()
		local dano = (hh and hh.dano or 1) * (0.2 + 0.8 * c * c) + (s.efectos.fuerza and 3 or 0)
		if Dimension.herirDragon(dano, "jugador") then
			Estado:FireClient(plr, "golpeMob", parte.Position, dano, false)
		end
		if hh then
			gastarEnMano(plr, s, 1)
		end
		enviarJugador(plr)
		return
	end
	-- Otros jugadores: solo donde el modo lo permite (Bed Wars, entre equipos distintos)
	local otro = parte.Parent and (Players:GetPlayerFromCharacter(parte.Parent) or (parte.Parent.Parent and Players:GetPlayerFromCharacter(parte.Parent.Parent)))
	if otro then
		local e, po = ojos(plr), piesDe(otro)
		if otro == plr or not e or not po or ((po + Vector3.new(0, 0.9, 0)) * BS - e).Magnitude > (Config.ALCANCE + 1.5) * BS then
			return
		end
		if not Modos.pvp(plr, otro) then
			return
		end
		local p = s.inv[s.sel]
		local hh = p and OB[p.id] and OB[p.id].herr
		local cad = hh and hh.cad or 4
		local carga = math.clamp((os.clock() - s.ultimoAtaque) * cad, 0, 1)
		s.ultimoAtaque = os.clock()
		local dano = (hh and hh.dano or 1) * (0.2 + 0.8 * carga * carga) + (s.efectos.fuerza and 3 or 0)
		local filo = (p and p.enc and p.enc.filo or 0)
		if filo > 0 then
			dano += (0.5 * filo + 0.5) * carga
		end
		dano += Modos.extraDanoPvp(plr) * carga
		if cayendo == true and carga > 0.9 then
			dano *= 1.5
		end
		dano = Modos.golpePvp(plr, otro, dano)
		local pp = piesDe(plr)
		local dx, dz = po.X - pp.X, po.Z - pp.Z
		local l = math.sqrt(dx * dx + dz * dz)
		local emp = ((corriendo == true and carga > 0.9) and 1.6 or 1) * (1 + (p and p.enc and p.enc.retroceso or 0) * 0.6)
		danar(otro, dano, "jugador", { x = dx / (l > 0 and l or 1) * emp, z = dz / (l > 0 and l or 1) * emp })
		Estado:FireClient(plr, "golpeMob", (po + Vector3.new(0, 0.9, 0)) * BS, dano, cayendo == true and carga > 0.9)
		if hh then
			gastarEnMano(plr, s, hh.tipo == "espada" and 1 or 2)
		end
		enviarJugador(plr)
		return
	end
	local m = Mobs.desdeParte(parte)
	local e = ojos(plr)
	if not m or not e then
		return
	end
	local c = Vector3.new(m.x, m.y + m.alto / 2, m.z) * BS
	if (c - e).Magnitude > (Config.ALCANCE + 1.5) * BS then
		return
	end
	local p = s.inv[s.sel]
	local hh = p and OB[p.id] and OB[p.id].herr
	-- La carga la limita el servidor según el tiempo real
	local cad = hh and hh.cad or 4
	local cargaReal = math.clamp((os.clock() - s.ultimoAtaque) * cad, 0, 1)
	carga = math.min(type(carga) == "number" and carga or 1, cargaReal + 0.15)
	s.ultimoAtaque = os.clock()
	local dano = (hh and hh.dano or 1) * (0.2 + 0.8 * carga * carga)
	if s.efectos.fuerza then
		dano += 3
	end
	-- Filo (encantamiento), como en combate38.js
	local filo = p and p.enc and p.enc.filo or 0
	if filo > 0 then
		dano += (0.5 * filo + 0.5) * carga
	end
	local critico = cayendo == true and carga > 0.9
	if critico then
		dano *= 1.5
	end
	local pp = piesDe(plr)
	local dx, dz = m.x - pp.X, m.z - pp.Z
	local l = math.sqrt(dx * dx + dz * dz)
	local emp = ((corriendo == true and carga > 0.9) and 1.6 or 1) * (1 + (p and p.enc and p.enc.retroceso or 0) * 0.6)
	Mobs.herir(m, dano, { x = dx / (l > 0 and l or 1) * emp, z = dz / (l > 0 and l or 1) * emp }, "jugador", 0, plr)
	Estado:FireClient(plr, "golpeMob", c, dano, critico)
	if hh then
		gastarEnMano(plr, s, hh.tipo == "espada" and 1 or 2)
	end
	s.agotamiento += 0.1
	enviarJugador(plr)
end

------------------------------------------------------------------
-- Inventario e interfaz
------------------------------------------------------------------
local function cerrarUI(plr, s)
	Mesas.cerrar(plr, s)
	-- Lo que quedó en la rejilla y el cursor vuelve al inventario
	for k = 1, 9 do
		if s.rejilla[k] then
			darOSoltar(plr, s.rejilla[k])
			s.rejilla[k] = false
		end
	end
	if s.cursor then
		darOSoltar(plr, s.cursor)
		s.cursor = false
	end
	if s.ui and s.ui.tipo == "cofre" then
		Estado:FireAllClients("cofreAbierto", Vector3.new(s.ui.x, s.ui.y, s.ui.z), false)
	end
	s.ui = nil
	enviarJugador(plr)
end

function acciones.encantar(plr, s, i)
	if esEntero(i) then
		Mesas.encantar(plr, s, i)
		enviarJugador(plr)
		enviarUI(plr)
	end
end

-- Tiendas de los modos (Bed Wars): comprar una oferta (veces = mayúsculas + clic) o cambiar de pestaña
function acciones.comprar(plr, s, i, veces)
	if esEntero(i) and s.ui and s.ui.comprar then
		s.ui.comprar(plr, s, i, esEntero(veces) and veces or 1)
		enviarJugador(plr)
		enviarUI(plr)
	end
end

function acciones.pestana(plr, s, i)
	if esEntero(i) and s.ui and s.ui.pestana then
		s.ui.pestana(plr, s, i)
		enviarUI(plr)
	end
end

-- Órdenes de Leyendas (G, R, F, 1-6 o los botones del panel)
function acciones.modoCmd(plr, s, cmd, arg)
	if type(cmd) == "string" then
		Modos.comando(plr, cmd, type(arg) == "number" and arg or nil)
	end
end

function acciones.comerciar(plr, s, i)
	if esEntero(i) then
		Mesas.comerciar(plr, s, i)
		enviarJugador(plr)
		enviarUI(plr)
	end
end

function acciones.abrirInventario(plr, s)
	s.ui = { tipo = "inventario" }
	enviarUI(plr)
end

function acciones.cerrarUI(plr, s)
	cerrarUI(plr, s)
end

-- Mover rápido (mayúsculas + clic)
local function moverRapido(plr, s, zona, i)
	local inv = s.inv
	local ui = s.ui
	if zona == "inv" then
		local p = inv[i]
		if not p then
			return
		end
		inv[i] = false
		local sobra = p.n
		local o = OB[p.id]
		if ui and ui.tipo == "extra" and ui.sub ~= "aldeano" then
			sobra = Mesas.meterRapido(s, p)
		elseif ui and ui.tipo == "cofre" then
			sobra = Inv.meter(Cont.cofre(ui.x, ui.y, ui.z), p, 1, 27)
		elseif ui and ui.tipo == "horno" then
			local h = Cont.horno(ui.x, ui.y, ui.z)
			if Cont.sirve(h, p.id) and (not h.entrada or Inv.iguales(h.entrada, p)) then
				local t = { h.entrada }
				sobra = Inv.meter(t, p, 1, 1)
				h.entrada = t[1]
			elseif Crafteo.COMBUSTIBLE[p.id] and (not h.combustible or Inv.iguales(h.combustible, p)) then
				local t = { h.combustible }
				sobra = Inv.meter(t, p, 1, 1)
				h.combustible = t[1]
			end
		elseif o and o.armadura and not inv[37 + o.armadura.pieza] then
			inv[37 + o.armadura.pieza] = p
			sobra = 0
		elseif i <= 9 then
			sobra = Inv.meter(inv, p, 10, 36)
		elseif i <= 36 then
			sobra = Inv.meter(inv, p, 1, 9)
		else
			sobra = Inv.meter(inv, p, 10, 36)
			if sobra > 0 then
				local q = Inv.copia(p)
				q.n = sobra
				sobra = Inv.meter(inv, q, 1, 9)
			end
		end
		if sobra > 0 then
			local q = Inv.copia(p)
			q.n = sobra
			if inv[i] then
				Inv.dar(inv, q)
			else
				inv[i] = q
			end
		end
	elseif zona == "cofre" and ui and ui.tipo == "cofre" then
		local c = Cont.cofre(ui.x, ui.y, ui.z)
		local p = c[i]
		if p then
			c[i] = false
			local sobra = Inv.meter(inv, p, 10, 36, "inverso")
			if sobra > 0 then
				local q = Inv.copia(p)
				q.n = sobra
				sobra = Inv.meter(inv, q, 1, 9, "inverso")
			end
			if sobra > 0 then
				local q = Inv.copia(p)
				q.n = sobra
				c[i] = q
			end
		end
	elseif zona == "rejilla" then
		local p = s.rejilla[i]
		if p then
			s.rejilla[i] = false
			local sobra = Inv.dar(inv, p)
			if sobra > 0 then
				local q = Inv.copia(p)
				q.n = sobra
				s.rejilla[i] = q
			end
		end
	elseif zona == "horno" and ui and ui.tipo == "horno" then
		local h = Cont.horno(ui.x, ui.y, ui.z)
		local nom = ({ "entrada", "combustible", "salida" })[i]
		if nom and h[nom] then
			local sobra = Inv.dar(inv, h[nom])
			if sobra > 0 then
				h[nom].n = sobra
			else
				h[nom] = false
			end
		end
	end
end

-- Si otros jugadores tienen abierto el mismo cofre u horno, ven el cambio al momento
local function refrescarOtros(plr, s)
	local u = s.ui
	if not u or (u.tipo ~= "cofre" and u.tipo ~= "horno") then
		return
	end
	for otro, so in estados do
		if otro ~= plr and so.ui and so.ui.tipo == u.tipo and so.ui.x == u.x and so.ui.y == u.y and so.ui.z == u.z then
			enviarUI(otro)
		end
	end
end

function acciones.click(plr, s, zona, i, boton)
	if type(zona) ~= "string" or not esEntero(i) or not esEntero(boton) then
		return
	end
	local ui = s.ui or { tipo = "inventario" }
	s.ui = ui
	if boton == 3 then
		if zona == "salida" then
			-- Craftear todo lo que se pueda
			local w = ui.tipo == "mesa" and 3 or 2
			for _ = 1, 64 do
				local res = Inv.resultado(s.rejilla, w)
				if not res then
					break
				end
				local sobra = Inv.dar(s.inv, res)
				if sobra > 0 then
					local q = Inv.copia(res)
					q.n = sobra
					darOSoltar(plr, q)
					Inv.gastarRejilla(s.rejilla, w, s.inv)
					break
				end
				Inv.gastarRejilla(s.rejilla, w, s.inv)
			end
		else
			moverRapido(plr, s, zona, i)
		end
		enviarJugador(plr)
		enviarUI(plr)
		refrescarOtros(plr, s)
		return
	end
	if zona == "mesa" or zona == "mesaSalida" then
		Mesas.clic(plr, s, zona, i, boton)
	elseif zona == "inv" and i >= 1 and i <= Inv.TAM then
		Inv.clic(s, s.inv, i, boton, Inv.acepta)
	elseif zona == "rejilla" then
		local w = ui.tipo == "mesa" and 3 or 2
		if i >= 1 and i <= w * w then
			Inv.clic(s, s.rejilla, i, boton)
		end
	elseif zona == "salida" then
		local w = ui.tipo == "mesa" and 3 or 2
		local res = Inv.resultado(s.rejilla, w)
		if res then
			local c = s.cursor
			if not c then
				s.cursor = res
				Inv.gastarRejilla(s.rejilla, w, s.inv)
			elseif Inv.iguales(c, res) and c.n + res.n <= Registro.maxPila(c.id) then
				c.n += res.n
				Inv.gastarRejilla(s.rejilla, w, s.inv)
			end
		end
	elseif zona == "cofre" and ui.tipo == "cofre" and i >= 1 and i <= 27 then
		Inv.clic(s, Cont.cofre(ui.x, ui.y, ui.z), i, boton)
	elseif zona == "horno" and ui.tipo == "horno" and i >= 1 and i <= 3 then
		local h = Cont.horno(ui.x, ui.y, ui.z)
		local t = { h.entrada, h.combustible, h.salida }
		if i == 3 then
			-- La salida solo se recoge
			if t[3] and (not s.cursor or (Inv.iguales(s.cursor, t[3]) and s.cursor.n + t[3].n <= Registro.maxPila(t[3].id))) then
				if s.cursor then
					s.cursor.n += t[3].n
				else
					s.cursor = t[3]
				end
				h.salida = false
			end
		else
			Inv.clic(s, t, i, boton, function(k, pila)
				if k == 2 then
					return Crafteo.COMBUSTIBLE[pila.id] ~= nil
				end
				return true
			end)
			h.entrada, h.combustible = t[1] or false, t[2] or false
		end
	elseif zona == "borrar" then
		-- Papelera del inventario creativo
		if not supervivencia(s) then
			s.cursor = false
		end
	elseif zona == "fuera" then
		-- Tirar lo del cursor
		if s.cursor then
			local p = piesDe(plr)
			local e = ojos(plr)
			if p and e then
				local look = plr.Character.Head.CFrame.LookVector
				local soltar = s.cursor
				if boton == 2 then
					soltar = Inv.copia(s.cursor)
					soltar.n = 1
					s.cursor.n -= 1
					if s.cursor.n <= 0 then
						s.cursor = false
					end
				else
					s.cursor = false
				end
				Entidades.soltarItem(soltar, e.X / BS, e.Y / BS - 0.3, e.Z / BS, false, look * 5 + Vector3.new(0, 2, 0), 2)
			end
		end
	end
	enviarJugador(plr)
	enviarUI(plr)
	refrescarOtros(plr, s)
end

-- Libro de recetas: rellena la rejilla con los ingredientes de una receta
function acciones.receta(plr, s, k, todas)
	local r = Crafteo.RECETAS[k]
	if not esEntero(k) or not r then
		return
	end
	local ui = s.ui or { tipo = "inventario" }
	local w = ui.tipo == "mesa" and 3 or 2
	if Crafteo.necesitaMesa(r) and w < 3 then
		aviso(plr, "Necesitas una mesa de trabajo")
		return
	end
	-- Devolver lo que hubiera en la rejilla
	for i = 1, 9 do
		if s.rejilla[i] then
			Inv.dar(s.inv, s.rejilla[i])
			s.rejilla[i] = false
		end
	end
	local veces = todas and 64 or 1
	local g = Crafteo.rejillaDe(r, w)
	for _ = 1, veces do
		local ok = true
		local necesita = {}
		for i = 1, w * w do
			if g[i] ~= 0 then
				necesita[g[i]] = (necesita[g[i]] or 0) + 1
			end
		end
		for id, n in necesita do
			-- Acepta maderas equivalentes
			local hay = 0
			for j = 1, 36 do
				local p = s.inv[j]
				if p and Crafteo.equivale(p.id, id) then
					hay += p.n
				end
			end
			if hay < n then
				ok = false
			end
		end
		if not ok then
			break
		end
		for i = 1, w * w do
			if g[i] ~= 0 then
				for j = 36, 1, -1 do
					local p = s.inv[j]
					if p and Crafteo.equivale(p.id, g[i]) and (not s.rejilla[i] or s.rejilla[i].id == p.id) then
						p.n -= 1
						if s.rejilla[i] then
							s.rejilla[i].n += 1
						else
							s.rejilla[i] = { id = p.id, n = 1 }
						end
						if p.n <= 0 then
							s.inv[j] = false
						end
						break
					end
				end
			end
		end
		if s.rejilla[1] and s.rejilla[1].n >= Registro.maxPila(s.rejilla[1].id) then
			break
		end
	end
	enviarJugador(plr)
	enviarUI(plr)
end

-- Modo creativo: coger cualquier objeto
function acciones.creativo(plr, s, id, cantidad)
	if supervivencia(s) or not esEntero(id) or not (OB[id] or BL[id]) then
		return
	end
	local pila = Registro.pila(id, cantidad == "max" and Registro.maxPila(id) or 1)
	s.cursor = pila
	enviarUI(plr)
end

-- Vaciar todo el inventario (creativo, mayúsculas + papelera)
function acciones.vaciarCreativo(plr, s)
	if supervivencia(s) then
		return
	end
	for i = 1, Inv.TAM do
		s.inv[i] = false
	end
	s.cursor = false
	enviarJugador(plr)
	enviarUI(plr)
end

-- Elegir el bloque apuntado (botón central, creativo)
function acciones.elegirBloque(plr, s, id)
	if supervivencia(s) or not esEntero(id) or not OB[id] then
		return
	end
	for i = 1, 9 do
		local p = s.inv[i]
		if p and p.id == id then
			s.sel = i
			enviarJugador(plr)
			return
		end
	end
	s.inv[s.sel] = Registro.pila(id, Registro.maxPila(id))
	enviarJugador(plr)
end

-- Tirar lo que hay en la mano (tecla Q)
function acciones.tirar(plr, s, todo)
	local p = s.inv[s.sel]
	local e = ojos(plr)
	if not p or not e then
		return
	end
	local soltar = Inv.copia(p)
	if todo then
		s.inv[s.sel] = false
	else
		soltar.n = 1
		p.n -= 1
		if p.n <= 0 then
			s.inv[s.sel] = false
		end
	end
	local look = plr.Character.Head.CFrame.LookVector
	Entidades.soltarItem(soltar, e.X / BS, e.Y / BS - 0.3, e.Z / BS, false, look * 5 + Vector3.new(0, 2, 0), 2)
	enviarJugador(plr)
end

function acciones.modo(plr, s, m)
	if m ~= "creativo" and m ~= "supervivencia" then
		return
	end
	if Modos.activo(plr) then
		return
	end
	if s.modo == "supervivencia" and m == "creativo" then
		guardar(plr)
	end
	s.modo = m
	local h = humanoide(plr)
	if h then
		h.Health = h.MaxHealth
	end
	if m == "creativo" then
		s.hambre, s.saturacion = 20, 5
	end
	plr:SetAttribute("Modo", m)
	enviarJugador(plr)
end

-- El cliente avisa de caídas (en bloques), saltos y si corre
function acciones.caida(plr, s, n)
	if not supervivencia(s) or type(n) ~= "number" or n ~= n or n <= 3.5 then
		return
	end
	danar(plr, math.floor(math.min(n, 100) - 3), "caida")
end

function acciones.salto(plr, s)
	if supervivencia(s) then
		s.agotamiento += s.corriendo and 0.2 or 0.05
	end
end

function acciones.correr(plr, s, si)
	s.corriendo = si == true
	local h = humanoide(plr)
	if h then
		local vel = (s.corriendo and not (supervivencia(s) and s.hambre <= 6)) and 5.6 or 4.3
		if s.efectos.rapidez then
			vel *= 1.2
		end
		h.WalkSpeed = vel * BS
	end
end

-- Planear con élitros gasta 1 de durabilidad por segundo
function acciones.planeo(plr, s)
	local p = s.inv[38]
	if supervivencia(s) and p and p.id == I.elitros and p.dur and p.dur > 1 then
		p.dur -= 1
		if p.dur <= 1 then
			aviso(plr, "Tus élitros están rotos.")
		end
		enviarJugador(plr)
	end
end

-- Usar un cohete mientras se planea
function acciones.cohete(plr, s)
	local p = s.inv[s.sel]
	if p and p.id == I.cohete then
		consumirEnMano(s)
		enviarJugador(plr)
	end
end

function acciones.modoJuego(plr, s, nombre)
	Modos.pedir(plr, nombre)
end

Accion.OnServerEvent:Connect(function(plr, tipo, ...)
	local s = st(plr)
	local f = type(tipo) == "string" and acciones[tipo]
	if s and f then
		local ok, err = pcall(f, plr, s, ...)
		if not ok then
			warn("[Blockverse] Error en " .. tipo .. ": " .. tostring(err))
		end
	end
end)

------------------------------------------------------------------
-- Hambre, curación, aire, fuego, contacto con bloques y efectos
------------------------------------------------------------------
RunService.Heartbeat:Connect(function(dt)
	for plr, s in estados do
		local h, root = humanoide(plr)
		if h and root and h.Health > 0 and not root.Anchored then
			local p = piesDe(plr)
			-- Movimiento (para el agotamiento)
			if s.ultimaPos and supervivencia(s) then
				local d = math.sqrt((p.X - s.ultimaPos.X) ^ 2 + (p.Z - s.ultimaPos.Z) ^ 2)
				if d < 3 then
					s.agotamiento += d * (s.corriendo and 0.1 or 0.0)
				end
			end
			s.ultimaPos = p
			-- Vacío
			if p.Y < -16 then
				danar(plr, 4 * dt * 10, "vacio")
				if p.Y < -64 then
					h.Health = 0
				end
			end
			local md = Mundo.md
			local bx, bz = math.floor(p.X), math.floor(p.Z)
			local bPies = md:get(bx, math.floor(p.Y + 0.1), bz)
			local bCuerpo = md:get(bx, math.floor(p.Y + 0.8), bz)
			local bOjos = md:get(bx, math.floor(p.Y + 1.62), bz)
			local enAgua = esAgua(bPies) or esAgua(bCuerpo)
			local enLava = esLava(bPies) or esLava(bCuerpo)
			-- Contacto con bloques peligrosos
			s.contactoT -= dt
			if s.contactoT <= 0 then
				s.contactoT = 0.5
				local cactus, fuego = false, false
				for x = math.floor(p.X - 0.32), math.floor(p.X + 0.32) do
					for y = math.floor(p.Y), math.floor(p.Y + 1.7) do
						for z = math.floor(p.Z - 0.32), math.floor(p.Z + 0.32) do
							local b = md:get(x, y, z)
							if b == B.cactus then
								cactus = true
							end
							if b == B.fuego then
								fuego = true
							end
						end
					end
				end
				if cactus then
					danar(plr, 1, "cactus")
				end
				if fuego then
					danar(plr, 1, "fuego")
					s.fuego = math.max(s.fuego, 8)
				end
				if enLava then
					danar(plr, 4, "lava")
					s.fuego = math.max(s.fuego, 15)
				end
			end
			if enAgua then
				s.fuego = 0
			end
			if s.fuego > 0 and supervivencia(s) then
				s.fuego -= dt
				s.fuegoT -= dt
				if s.fuegoT <= 0 then
					s.fuegoT = 1
					danar(plr, 1, "fuego")
				end
			end
			plr:SetAttribute("Ardiendo", s.fuego > 0)
			-- Aire bajo el agua
			local aireAntes = math.floor(s.aire)
			if esAgua(bOjos) and supervivencia(s) then
				s.aire -= dt
				if s.aire <= 0 then
					s.aire = 0
					s.aireT -= dt
					if s.aireT <= 0 then
						s.aireT = 1
						danar(plr, 2, "ahogo")
					end
				end
			else
				s.aire = math.min(15, s.aire + dt * 6)
			end
			if math.floor(s.aire) ~= aireAntes then
				enviarJugador(plr)
			end
			-- Efectos de pociones y comida
			local cambio = false
			for k, e in s.efectos do
				e.t -= dt
				if e.t <= 0 then
					s.efectos[k] = nil
					cambio = true
				end
			end
			s.efectoT -= dt
			if s.efectoT <= 0 then
				s.efectoT = 0.5
				if s.efectos.regeneracion and h.Health < h.MaxHealth then
					h.Health = math.min(h.MaxHealth, h.Health + (s.efectos.regeneracion.n > 1 and 1 or 0.5))
				end
				if s.efectos.veneno and h.Health > 1 then
					danar(plr, 0.5, "veneno")
				end
				if s.efectos.hambre then
					s.agotamiento += 0.05
				end
			end
			if supervivencia(s) then
				-- Hambre y saturación (igual que el juego web)
				local hambreAntes = s.hambre
				while s.agotamiento >= 4 do
					s.agotamiento -= 4
					if s.saturacion > 0 then
						s.saturacion = math.max(0, s.saturacion - 1)
					elseif s.hambre > 0 then
						s.hambre -= 1
					end
				end
				if s.hambre >= 20 and s.saturacion > 0 and h.Health < h.MaxHealth then
					s.regenT += dt
					if s.regenT >= 0.5 then
						s.regenT = 0
						local sat = math.min(s.saturacion, 6)
						h.Health = math.min(h.MaxHealth, h.Health + sat / 6)
						s.agotamiento += sat
					end
				elseif s.hambre >= 18 and h.Health < h.MaxHealth then
					s.regenT += dt
					if s.regenT >= 4 then
						s.regenT = 0
						h.Health = math.min(h.MaxHealth, h.Health + 1)
						s.agotamiento += 6
					end
				else
					s.regenT = 0
				end
				if s.hambre <= 0 then
					s.hambreT += dt
					if s.hambreT >= 4 then
						s.hambreT = 0
						if h.Health > 1 then
							danar(plr, 1, "hambre")
						end
					end
				else
					s.hambreT = 0
				end
				-- Tiempo que pasa: un poco de agotamiento al moverse
				s.agotamiento += dt * 0.005
				if s.hambre ~= hambreAntes then
					cambio = true
				end
			end
			if cambio then
				enviarJugador(plr)
			end
		end
	end
end)

------------------------------------------------------------------
-- Modos de juego (One Block…)
------------------------------------------------------------------
Mesas.iniciar({
	mobs = Mobs, aviso = aviso, supervivencia = supervivencia, darOSoltar = darOSoltar,
	sonido = function(nombre, x, y, z)
		Estado:FireAllClients("sonido", nombre, Vector3.new(x + 0.5, y + 0.5, z + 0.5) * BS)
	end,
})
Mobs.alCrearAldeano = Mesas.prepararAldeano
Mesas.alCambiar = function(k)
	for plr, so in estados do
		if so.ui and so.ui.tipo == "extra" and so.ui.sub == "pociones" and Cont.clave(so.ui.x, so.ui.y, so.ui.z) == k then
			enviarUI(plr)
		end
	end
end
Redstone.iniciar({
	activarTNT = activarTNT,
	sonido = function(nombre, x, y, z)
		Estado:FireAllClients("sonido", nombre, Vector3.new(x + 0.5, y + 0.5, z + 0.5) * BS)
	end,
	soltarBloque = function(b, x, y, z)
		soltarBloque(b, x, y, z, nil, nil)
	end,
})
Dimension.iniciar({
	teletransportar = teletransportar, Estado = Estado, estados = estados, ganarXP = ganarXP, danar = danar, aviso = aviso,
	explosion = function(x, y, z, p)
		Sim.explosion(x, y, z, p)
	end,
})
Modos.iniciar({
	Mundo = Mundo, Mobs = Mobs, Entidades = Entidades, estados = estados, enviarJugador = enviarJugador, aviso = aviso,
	Estado = Estado, colocar = colocar, Inv = Inv, danar = danar, teletransportar = teletransportar, darOSoltar = darOSoltar,
	enviarUI = enviarUI, ganarXP = ganarXP, activarTNT = activarTNT, guardar = guardar,
})
-- Las explosiones en la arena de Bed Wars solo rompen lo construido
Sim.puedeExplotar = Modos.puedeExplotar
