--[[
	Blockverse para Roblox · Script principal del servidor
	· Genera el mundo alrededor de los jugadores.
	· Inventario, romper y poner bloques, recetas, comida y hambre.
	· Daño por caída, día y noche, iluminación y guardado del inventario.
]]
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Lighting = game:GetService("Lighting")
local RunService = game:GetService("RunService")
local DataStoreService = game:GetService("DataStoreService")

local Comp = ReplicatedStorage:WaitForChild("Blockverse")
local Config = require(Comp.Config)
local Bloques = require(Comp.Bloques)
local Recetas = require(Comp.Recetas)
local Mundo = require(script.Mundo)
local Mobs = require(script.Mobs)

local B, C = Config.BLOQUE, Config.CHUNK
local DEF = Bloques.porId
local ID = Bloques.porClave
local SOLIDO = Bloques.SOLIDO

------------------------------------------------------------------
-- Comunicación con los jugadores
------------------------------------------------------------------
local remotos = Instance.new("Folder")
remotos.Name = "Remotos"
local Accion = Instance.new("RemoteEvent")
Accion.Name = "Accion"
Accion.Parent = remotos
local Estado = Instance.new("RemoteEvent")
Estado.Name = "Estado"
Estado.Parent = remotos
remotos.Parent = ReplicatedStorage

------------------------------------------------------------------
-- Iluminación, cielo y ciclo de día y noche
------------------------------------------------------------------
local function iluminacion()
	Lighting.Brightness = 2.4
	Lighting.EnvironmentDiffuseScale = 1
	Lighting.EnvironmentSpecularScale = 0.5
	Lighting.GlobalShadows = true
	Lighting.Ambient = Color3.fromRGB(38, 40, 50)
	Lighting.OutdoorAmbient = Color3.fromRGB(128, 128, 140)
	Lighting.ClockTime = 8
	Lighting.GeographicLatitude = 25
	Lighting.ShadowSoftness = 0.25
	for _, c in Lighting:GetChildren() do
		if c:IsA("PostEffect") or c:IsA("Atmosphere") or c:IsA("Sky") then
			c:Destroy()
		end
	end
	local atm = Instance.new("Atmosphere")
	atm.Density = 0.32
	atm.Offset = 0.12
	atm.Color = Color3.fromRGB(199, 214, 235)
	atm.Decay = Color3.fromRGB(110, 120, 140)
	atm.Glare = 0.35
	atm.Haze = 1.3
	atm.Parent = Lighting
	local sky = Instance.new("Sky")
	sky.StarCount = 3000
	sky.SunAngularSize = 14
	sky.MoonAngularSize = 9
	sky.Parent = Lighting
	local bloom = Instance.new("BloomEffect")
	bloom.Intensity = 0.55
	bloom.Size = 26
	bloom.Threshold = 1.5
	bloom.Parent = Lighting
	local rayos = Instance.new("SunRaysEffect")
	rayos.Intensity = 0.06
	rayos.Spread = 0.8
	rayos.Parent = Lighting
	local cc = Instance.new("ColorCorrectionEffect")
	cc.Saturation = 0.12
	cc.Contrast = 0.06
	cc.Parent = Lighting
	local nubes = workspace.Terrain:FindFirstChildOfClass("Clouds") or Instance.new("Clouds")
	nubes.Cover = 0.55
	nubes.Density = 0.7
	nubes.Parent = workspace.Terrain
	workspace.Terrain.WaterColor = Color3.fromRGB(40, 100, 190)
	workspace.Terrain.WaterTransparency = 0.6
	workspace.Terrain.WaterReflectance = 0.4
	workspace.Terrain.WaterWaveSize = 0.08
end
iluminacion()

RunService.Heartbeat:Connect(function(dt)
	Lighting.ClockTime = (Lighting.ClockTime + dt * 24 / Config.DIA_SEGUNDOS) % 24
end)

------------------------------------------------------------------
-- Mundo y punto de aparición
------------------------------------------------------------------
local semilla = Random.new():NextInteger(1, 999999)
Mundo.iniciar(semilla)
print("[Blockverse] Semilla del mundo:", semilla)

local spawnX, spawnZ = 0, 0
do
	-- Busca tierra firme cerca del centro (en espiral)
	local hecho = false
	for r = 0, 600, 8 do
		local pasos = math.max(1, r // 4)
		for k = 0, pasos - 1 do
			local a = k / pasos * math.pi * 2
			local x, z = math.floor(math.cos(a) * r), math.floor(math.sin(a) * r)
			local h, bioma = Mundo.gen:columna(x, z)
			if h > Config.NIVEL_MAR + 1 and bioma ~= "montana" and bioma ~= "desierto" then
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

------------------------------------------------------------------
-- Estado de cada jugador
------------------------------------------------------------------
local estados = {}
local almacen
pcall(function()
	almacen = DataStoreService:GetDataStore("Blockverse_v1")
end)

local function nuevoInv()
	local inv = table.create(36, false)
	return inv
end

local function st(plr)
	return estados[plr]
end

local function enviarInv(plr)
	local s = st(plr)
	if s then
		Estado:FireClient(plr, "inv", s.inv, s.sel)
	end
end

local function aviso(plr, texto)
	Estado:FireClient(plr, "aviso", texto)
end

-- Añade objetos al inventario. Devuelve lo que no cupo.
local function dar(plr, id, n)
	local s = st(plr)
	if not s or n <= 0 then
		return n
	end
	local inv = s.inv
	local max = Bloques.maxPila(id)
	local d = DEF[id]
	for i = 1, 36 do
		local p = inv[i]
		if p and p.id == id and p.n < max then
			local k = math.min(max - p.n, n)
			p.n += k
			n -= k
			if n <= 0 then
				break
			end
		end
	end
	for i = 1, 36 do
		if n <= 0 then
			break
		end
		if not inv[i] then
			local k = math.min(max, n)
			inv[i] = { id = id, n = k, u = d and d.usos or nil }
			n -= k
		end
	end
	enviarInv(plr)
	return n
end

local function contar(s, id)
	local t = 0
	for i = 1, 36 do
		local p = s.inv[i]
		if p and p.id == id then
			t += p.n
		end
	end
	return t
end

local function quitar(s, id, n)
	for i = 36, 1, -1 do
		local p = s.inv[i]
		if p and p.id == id then
			local k = math.min(p.n, n)
			p.n -= k
			n -= k
			if p.n <= 0 then
				s.inv[i] = false
			end
			if n <= 0 then
				return
			end
		end
	end
end

local function cargar(plr)
	local s = { inv = nuevoInv(), sel = 1, hambre = 20, hambreT = 0, danoT = 0, curaT = 0, modo = nil, cdAtaque = 0 }
	estados[plr] = s
	if almacen then
		local ok, guardado = pcall(function()
			return almacen:GetAsync("u_" .. plr.UserId)
		end)
		if ok and type(guardado) == "table" and type(guardado.inv) == "table" then
			for i = 1, 36 do
				local p = guardado.inv[i]
				if type(p) == "table" and DEF[p.id] and type(p.n) == "number" then
					s.inv[i] = { id = p.id, n = math.clamp(p.n, 1, Bloques.maxPila(p.id)), u = p.u }
				end
			end
			s.hambre = tonumber(guardado.hambre) or 20
		end
	end
end

local function guardar(plr)
	local s = st(plr)
	if not s or not almacen or s.modo ~= "supervivencia" then
		return
	end
	pcall(function()
		almacen:SetAsync("u_" .. plr.UserId, { inv = s.inv, hambre = s.hambre })
	end)
end

------------------------------------------------------------------
-- Aparecer en el mundo
------------------------------------------------------------------
local function puntoAparicion()
	return spawnX + math.random(-2, 2), spawnZ + math.random(-2, 2)
end

local function colocar(plr, char)
	local root = char:WaitForChild("HumanoidRootPart", 10)
	local hum = char:WaitForChild("Humanoid", 10)
	if not root or not hum then
		return
	end
	hum.MaxHealth = 20
	hum.Health = 20
	-- Salto de un bloque y medio y paso parecido al original
	hum.UseJumpPower = false
	hum.JumpHeight = 4.6
	hum.WalkSpeed = 14
	root.Anchored = true
	local x, z = puntoAparicion()
	plr:SetAttribute("EsperaX", x)
	plr:SetAttribute("EsperaZ", z)
	local cx, cz = x // C, z // C
	while not Mundo.listo(cx, cz) do
		task.wait(0.2)
		if not char.Parent then
			return
		end
	end
	local y = Mundo.alturaSuelo(x, z)
	char:PivotTo(CFrame.new((x + 0.5) * B, (y + 1) * B + 3.2, (z + 0.5) * B))
	root.Anchored = false
	plr:SetAttribute("EsperaX", nil)
	plr:SetAttribute("EsperaZ", nil)
	Estado:FireClient(plr, "listo")
end

Players.PlayerAdded:Connect(function(plr)
	cargar(plr)
	plr.CharacterAdded:Connect(function(char)
		local s = st(plr)
		if s and s.muerto then
			s.muerto = false
			s.hambre = 20
			Estado:FireClient(plr, "hambre", 20)
		end
		task.spawn(colocar, plr, char)
		local hum = char:WaitForChild("Humanoid", 10)
		if hum then
			hum.Died:Connect(function()
				local s2 = st(plr)
				if s2 then
					s2.muerto = true
				end
			end)
		end
	end)
	task.defer(function()
		enviarInv(plr)
		local s = st(plr)
		if s then
			Estado:FireClient(plr, "hambre", s.hambre)
		end
	end)
end)

Players.PlayerRemoving:Connect(function(plr)
	guardar(plr)
	estados[plr] = nil
end)

game:BindToClose(function()
	for _, plr in Players:GetPlayers() do
		guardar(plr)
	end
end)

------------------------------------------------------------------
-- Cargar chunks alrededor de los jugadores
------------------------------------------------------------------
local function posicionBloques(plr)
	local ex, ez = plr:GetAttribute("EsperaX"), plr:GetAttribute("EsperaZ")
	if ex then
		return ex, ez
	end
	local ch = plr.Character
	local r = ch and ch:FindFirstChild("HumanoidRootPart")
	if r then
		return math.floor(r.Position.X / B), math.floor(r.Position.Z / B)
	end
	return spawnX, spawnZ
end

task.spawn(function()
	local R = Config.RADIO
	while true do
		local quiero = {}
		local centros = {}
		for _, plr in Players:GetPlayers() do
			local x, z = posicionBloques(plr)
			table.insert(centros, { x // C, z // C })
		end
		if #centros == 0 then
			table.insert(centros, { spawnX // C, spawnZ // C })
		end
		local mejor, mejorD = nil, math.huge
		for _, c in centros do
			for dx = -R, R do
				for dz = -R, R do
					local d = dx * dx + dz * dz
					if d <= R * R + 1 then
						local cx, cz = c[1] + dx, c[2] + dz
						quiero[Mundo.clave(cx, cz)] = true
						if not Mundo.vistos[Mundo.clave(cx, cz)] and d < mejorD then
							mejor, mejorD = { cx, cz }, d
						end
					end
				end
			end
		end
		-- Quitar los chunks que ya nadie tiene cerca
		for k, r in Mundo.vistos do
			if not quiero[k] then
				local nombre = r.modelo.Name
				local cx, cz = string.match(nombre, "(-?%d+),(-?%d+)")
				cx, cz = tonumber(cx), tonumber(cz)
				local lejos = true
				for _, c in centros do
					if math.max(math.abs(cx - c[1]), math.abs(cz - c[2])) <= R + 2 then
						lejos = false
					end
				end
				if lejos then
					Mundo.quitar(cx, cz)
				end
			end
		end
		if mejor then
			Mundo.construir(mejor[1], mejor[2])
			task.wait()
		else
			task.wait(0.3)
		end
	end
end)

------------------------------------------------------------------
-- Acciones de los jugadores
------------------------------------------------------------------
local function cabeza(plr)
	local ch = plr.Character
	local h = ch and ch:FindFirstChild("Head")
	return h and h.Position
end

local function alAlcance(plr, x, y, z)
	local p = cabeza(plr)
	if not p then
		return false
	end
	local centro = Vector3.new((x + 0.5) * B, (y + 0.5) * B, (z + 0.5) * B)
	return (centro - p).Magnitude <= (Config.ALCANCE + 1.5) * B
end

local function esEntero(v)
	return type(v) == "number" and v == math.floor(v) and math.abs(v) < 1e6
end

-- ¿El bloque (x,y,z) se mete dentro de algún personaje?
local function chocaConPersonaje(x, y, z)
	local min = Vector3.new(x * B, y * B, z * B)
	local max = min + Vector3.new(B, B, B)
	for _, plr in Players:GetPlayers() do
		local ch = plr.Character
		local r = ch and ch:FindFirstChild("HumanoidRootPart")
		if r then
			local p = r.Position
			local a = p - Vector3.new(1, 3, 1)
			local b = p + Vector3.new(1, 2.6, 1)
			if a.X < max.X and b.X > min.X and a.Y < max.Y and b.Y > min.Y and a.Z < max.Z and b.Z > min.Z then
				return true
			end
		end
	end
	for _, m in Mobs.lista do
		local p = m.raiz.Position
		local s = m.raiz.Size / 2
		if p.X - s.X < max.X and p.X + s.X > min.X and p.Y - s.Y - m.hum.HipHeight < max.Y and p.Y + s.Y > min.Y and p.Z - s.Z < max.Z and p.Z + s.Z > min.Z then
			return true
		end
	end
	return false
end

local function gastarHerramienta(plr, s)
	local mano = s.inv[s.sel]
	if mano and mano.u then
		mano.u -= 1
		if mano.u <= 0 then
			aviso(plr, "¡Se rompió: " .. Bloques.nombre(mano.id) .. "!")
			s.inv[s.sel] = false
		end
	end
end

local acciones = {}

function acciones.golpe(plr, s, x, y, z)
	if esEntero(x) and esEntero(y) and esEntero(z) then
		s.golpe = { x = x, y = y, z = z, t = os.clock() }
	end
end

function acciones.romper(plr, s, x, y, z)
	if not (esEntero(x) and esEntero(y) and esEntero(z)) or not alAlcance(plr, x, y, z) then
		return
	end
	local b = Mundo.get(x, y, z)
	local d = DEF[b]
	if b == 0 or not d or d.dureza < 0 then
		return
	end
	local creativo = s.modo == "creativo"
	local mano = s.inv[s.sel]
	local herrId = mano and mano.id or nil
	if not creativo then
		local t = Bloques.tiempoRomper(b, herrId)
		local g = s.golpe
		if not g or g.x ~= x or g.y ~= y or g.z ~= z or os.clock() - g.t < t * 0.7 - 0.2 then
			return
		end
	end
	s.golpe = nil
	Mundo.set(x, y, z, 0)
	if not creativo then
		if d.suelta ~= 0 and Bloques.puedeRecoger(b, herrId) then
			dar(plr, d.suelta, 1)
		end
		if d.extra and math.random() < d.extra.prob then
			dar(plr, d.extra.id, 1)
		end
		if d.dureza > 0 and herrId and DEF[herrId].herr then
			gastarHerramienta(plr, s)
		end
	end
	-- Lo que estaba apoyado encima (antorchas, flores, hierba, cactus) se cae
	local yy = y + 1
	while true do
		local a = Mundo.get(x, yy, z)
		local da = DEF[a]
		if a == 0 or not da or not (da.forma == "antorcha" or da.forma == "flor" or da.forma == "cruz" or a == ID.cactus) then
			break
		end
		Mundo.set(x, yy, z, 0)
		if not creativo and da.suelta ~= 0 then
			dar(plr, da.suelta, 1)
		end
		yy += 1
	end
	Mundo.inundar(x, y, z)
	enviarInv(plr)
end

function acciones.poner(plr, s, x, y, z)
	if not (esEntero(x) and esEntero(y) and esEntero(z)) or y < 0 or y >= Config.ALTO or not alAlcance(plr, x, y, z) then
		return
	end
	local mano = s.inv[s.sel]
	local d = mano and DEF[mano.id]
	if not d or not d.esBloque or d.forma == "agua" then
		return
	end
	local actual = Mundo.get(x, y, z)
	if actual ~= 0 and actual ~= ID.agua and actual ~= ID.hierba then
		return
	end
	-- Tiene que tocar otro bloque
	local apoyo = false
	for _, o in { { 1, 0, 0 }, { -1, 0, 0 }, { 0, 1, 0 }, { 0, -1, 0 }, { 0, 0, 1 }, { 0, 0, -1 } } do
		local n = Mundo.get(x + o[1], y + o[2], z + o[3])
		if n ~= 0 and n ~= ID.agua then
			apoyo = true
			break
		end
	end
	if not apoyo then
		return
	end
	if d.forma ~= "cubo" and not SOLIDO[Mundo.get(x, y - 1, z)] then
		return
	end
	if SOLIDO[mano.id] and chocaConPersonaje(x, y, z) then
		return
	end
	Mundo.set(x, y, z, mano.id)
	if s.modo ~= "creativo" then
		mano.n -= 1
		if mano.n <= 0 then
			s.inv[s.sel] = false
		end
	end
	enviarInv(plr)
end

function acciones.sel(plr, s, i)
	if esEntero(i) and i >= 1 and i <= 9 then
		s.sel = i
	end
end

function acciones.mover(plr, s, a, b)
	if not (esEntero(a) and esEntero(b)) or a < 1 or a > 36 or b < 1 or b > 36 or a == b then
		return
	end
	local pa, pb = s.inv[a], s.inv[b]
	if pa and pb and pa.id == pb.id and not pa.u then
		local max = Bloques.maxPila(pa.id)
		local k = math.min(max - pb.n, pa.n)
		pb.n += k
		pa.n -= k
		if pa.n <= 0 then
			s.inv[a] = false
		end
	else
		s.inv[a], s.inv[b] = pb, pa
	end
	enviarInv(plr)
end

function acciones.tirar(plr, s, a)
	if esEntero(a) and a >= 1 and a <= 36 then
		s.inv[a] = false
		enviarInv(plr)
	end
end

local function cerca(plr)
	local ch = plr.Character
	local r = ch and ch:FindFirstChild("HumanoidRootPart")
	if not r then
		return { mesa = false, horno = false }
	end
	return { mesa = Mundo.hayCerca(r.Position, ID.mesa, 5), horno = Mundo.hayCerca(r.Position, ID.horno, 5) }
end

function acciones.abrirInv(plr, s)
	Estado:FireClient(plr, "cerca", cerca(plr))
end

function acciones.craftear(plr, s, i, veces)
	local r = esEntero(i) and Recetas[i]
	if not r then
		return
	end
	veces = (esEntero(veces) and math.clamp(veces, 1, 64)) or 1
	if r.donde then
		local c = cerca(plr)
		if not c[r.donde] then
			aviso(plr, r.donde == "mesa" and "Necesitas una mesa de trabajo cerca" or "Necesitas un horno cerca")
			return
		end
	end
	local hechos = 0
	for _ = 1, veces do
		for id, n in r.ingredientes do
			if contar(s, id) < n then
				if hechos == 0 then
					aviso(plr, "Te faltan materiales")
				end
				enviarInv(plr)
				return
			end
		end
		for id, n in r.ingredientes do
			quitar(s, id, n)
		end
		local sobra = dar(plr, r.resultado, r.n)
		hechos += 1
		if sobra > 0 then
			aviso(plr, "Inventario lleno")
			break
		end
	end
	enviarInv(plr)
end

function acciones.usar(plr, s)
	local mano = s.inv[s.sel]
	local d = mano and DEF[mano.id]
	if d and d.comida and s.hambre < 20 then
		s.hambre = math.min(20, s.hambre + d.comida)
		mano.n -= 1
		if mano.n <= 0 then
			s.inv[s.sel] = false
		end
		Estado:FireClient(plr, "hambre", s.hambre)
		enviarInv(plr)
	end
end

function acciones.atacar(plr, s, parte)
	if typeof(parte) ~= "Instance" or os.clock() < s.cdAtaque then
		return
	end
	local m = Mobs.desdeParte(parte)
	local p = cabeza(plr)
	if not m or not p or (m.raiz.Position - p).Magnitude > 5.5 * B then
		return
	end
	s.cdAtaque = os.clock() + 0.4
	local mano = s.inv[s.sel]
	local d = mano and DEF[mano.id]
	local dano = (d and d.dano) or 1
	Mobs.golpear(m, plr, dano)
	if d and d.herr == "espada" then
		gastarHerramienta(plr, s)
		enviarInv(plr)
	end
end

-- El cliente avisa al caer desde alto (en bloques)
function acciones.caida(plr, s, n)
	if s.modo ~= "supervivencia" or type(n) ~= "number" or n ~= n or n <= 3.5 then
		return
	end
	local h = plr.Character and plr.Character:FindFirstChildOfClass("Humanoid")
	if h then
		h:TakeDamage(math.floor(math.min(n, 60) - 3))
		aviso(plr, "¡Ay! Caída de " .. math.floor(n) .. " bloques")
	end
end

function acciones.modo(plr, s, m)
	if m ~= "creativo" and m ~= "supervivencia" then
		return
	end
	if s.modo == m then
		return
	end
	if s.modo == "supervivencia" then
		guardar(plr)
	end
	s.modo = m
	if m == "creativo" then
		s.invSuperv = s.inv
		s.inv = nuevoInv()
		for i, id in { ID.cesped, ID.piedra, ID.tablones, ID.tronco, ID.vidrio, ID.ladrillos, ID.antorcha, ID.piedraLuminosa, ID.lana } do
			s.inv[i] = { id = id, n = 64 }
		end
		s.hambre = 20
		Estado:FireClient(plr, "hambre", 20)
	elseif s.invSuperv then
		s.inv = s.invSuperv
		s.invSuperv = nil
	end
	local h = plr.Character and plr.Character:FindFirstChildOfClass("Humanoid")
	if h then
		h.Health = h.MaxHealth
	end
	Estado:FireClient(plr, "modo", m)
	enviarInv(plr)
end

function acciones.creativo(plr, s, id)
	if s.modo ~= "creativo" or not esEntero(id) or not DEF[id] then
		return
	end
	s.inv[s.sel] = { id = id, n = Bloques.maxPila(id), u = DEF[id].usos }
	enviarInv(plr)
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
-- Criaturas
------------------------------------------------------------------
Mobs.alSoltar = function(plr, id, n)
	if estados[plr] and estados[plr].modo == "supervivencia" then
		dar(plr, id, n)
		aviso(plr, "+" .. n .. " " .. Bloques.nombre(id))
	end
end
Mobs.alEmpujar = function(plr, v)
	local s = st(plr)
	if s and s.modo == "supervivencia" then
		Estado:FireClient(plr, "empuje", v)
	end
end
Mobs.iniciar()

------------------------------------------------------------------
-- Hambre, curación y vacío
------------------------------------------------------------------
task.spawn(function()
	while true do
		task.wait(1)
		for plr, s in estados do
			local ch = plr.Character
			local h = ch and ch:FindFirstChildOfClass("Humanoid")
			if h and h.Health > 0 and s.modo == "supervivencia" then
				s.hambreT += 1
				if s.hambreT >= Config.HAMBRE_CADA and s.hambre > 0 then
					s.hambreT = 0
					s.hambre -= 1
					Estado:FireClient(plr, "hambre", s.hambre)
				end
				if s.hambre <= 0 then
					s.danoT += 1
					if s.danoT >= 4 then
						s.danoT = 0
						if h.Health > 1 then
							h:TakeDamage(1)
						end
					end
				elseif s.hambre >= 18 and h.Health < h.MaxHealth then
					s.curaT += 1
					if s.curaT >= 3 then
						s.curaT = 0
						h.Health = math.min(h.MaxHealth, h.Health + 1)
						s.hambreT += 6
					end
				end
			end
		end
	end
end)

RunService.Heartbeat:Connect(function()
	for plr, s in estados do
		local ch = plr.Character
		local r = ch and ch:FindFirstChild("HumanoidRootPart")
		local h = ch and ch:FindFirstChildOfClass("Humanoid")
		if r and h and h.Health > 0 and not r.Anchored and r.Position.Y < -40 then
			local x, z = puntoAparicion()
			ch:PivotTo(CFrame.new((x + 0.5) * B, (Mundo.alturaSuelo(x, z) + 1) * B + 3.2, (z + 0.5) * B))
			if s.modo == "supervivencia" then
				h:TakeDamage(6)
			end
		end
	end
end)
