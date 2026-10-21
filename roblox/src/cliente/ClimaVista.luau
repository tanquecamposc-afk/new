--[[
	Blockverse para Roblox · Clima (cliente)
	· Lluvia: gotas que caen alrededor de la cámara y salpican al llegar al suelo
	  (no pasan los techos). En los biomas fríos nieva y en los secos (desierto,
	  sabana, badlands) no cae nada.
	· El cielo se nubla y oscurece poco a poco; en la tormenta, más.
	· Rayos: un relámpago en zigzag, un destello en todo el cielo y el trueno, que
	  llega más tarde cuanto más lejos cae.
	Solo en el mundo normal (no en el Nether, el End ni las arenas de los modos).
]]
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local Lighting = game:GetService("Lighting")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Comp = ReplicatedStorage:WaitForChild("Blockverse")
local Config = require(Comp:WaitForChild("Config"))
local Registro = require(Comp:WaitForChild("Registro"))
local Generador = require(Comp:WaitForChild("Generador"))
local Biomas = require(Comp:WaitForChild("Datos"):WaitForChild("Biomas"))

local BS = Config.BLOQUE
local SOLIDO = Registro.SOLIDO
local esLiquido = Registro.esLiquido
local jugador = Players.LocalPlayer

local ClimaVista = {}
ClimaVista.alSonido = function(nombre, pos, tono) end
ClimaVista.alParticulas = function(pos, color, n) end

local K = Biomas.claves
local FRIO = { [K.nevado] = true, [K.taigaNevada] = true, [K.picosNevados] = true, [K.oceanoHelado] = true, [K.espigasHielo] = true }
local SECO = { [K.desierto] = true, [K.sabana] = true, [K.badlands] = true, [K.badlandsErosionados] = true }

local GOTAS = 220
local AREA = 11 -- bloques alrededor de la cámara

local carpeta = Instance.new("Folder")
carpeta.Name = "Clima"
local gotas = {}
local intensidad, nubes = 0, 0
local md

-- Altura (en bloques) a la que se para una gota en la columna x, z: el primer bloque
-- sólido o líquido por debajo de `desde` (se guarda un rato para no recalcular)
local techos, techosT = {}, 0
local function techo(x, z, desde)
	local k = x * 65536 + z
	local v = techos[k]
	if v then
		return v
	end
	v = desde - 40
	for y = desde, desde - 40, -1 do
		local b = md:getSiCargado(x, y, z)
		if b < 0 then
			v = desde - 40
			break
		end
		if b ~= 0 and (SOLIDO[b] or esLiquido(b) or Registro.OPACO[b]) then
			v = y + 1
			break
		end
	end
	techos[k] = v
	return v
end

local function nuevaGota()
	local p = Instance.new("Part")
	p.Anchored = true
	p.CanCollide = false
	p.CanQuery = false
	p.CanTouch = false
	p.CastShadow = false
	p.Material = Enum.Material.SmoothPlastic
	p.Transparency = 1
	p.Size = Vector3.new(0.07, 1.1, 0.07)
	p.Parent = carpeta
	return { p = p, activa = false }
end

local function colocarGota(g, cam, nieve, alturaCam)
	local x = math.floor(cam.X / BS + (math.random() * 2 - 1) * AREA)
	local z = math.floor(cam.Z / BS + (math.random() * 2 - 1) * AREA)
	local arriba = alturaCam + 14
	local suelo = techo(x, z, arriba)
	if suelo >= arriba then
		g.activa = false
		g.p.Transparency = 1
		return
	end
	g.activa = true
	g.x, g.z = (x + math.random()) * BS, (z + math.random()) * BS
	g.y = (suelo + math.random() * (arriba - suelo)) * BS
	g.suelo = suelo * BS
	g.nieve = nieve
	g.fase = math.random() * 6.28
	if nieve then
		g.p.Size = Vector3.new(0.2, 0.2, 0.2)
		g.p.Color = Color3.fromRGB(250, 250, 255)
		g.p.Transparency = 0.1
		g.v = 5 + math.random() * 3
	else
		g.p.Size = Vector3.new(0.07, 1.1, 0.07)
		g.p.Color = Color3.fromRGB(165, 190, 235)
		g.p.Transparency = 0.35
		g.v = 55 + math.random() * 15
	end
end

------------------------------------------------------------------
-- Cielo: se guarda cómo es despejado y se mezcla con el de lluvia
------------------------------------------------------------------
local base
local destello -- ColorCorrection para los relámpagos
local function guardarBase()
	local atm = Lighting:FindFirstChildOfClass("Atmosphere")
	local nb = workspace.Terrain:FindFirstChildOfClass("Clouds")
	base = {
		brillo = Lighting.Brightness, exterior = Lighting.OutdoorAmbient,
		densidad = atm and atm.Density, colorAtm = atm and atm.Color, bruma = atm and atm.Haze,
		cubierta = nb and nb.Cover, densidadNubes = nb and nb.Density, colorNubes = nb and nb.Color,
	}
end

local function aplicarCielo(f, tormenta)
	if not base then
		return
	end
	local atm = Lighting:FindFirstChildOfClass("Atmosphere")
	local nb = workspace.Terrain:FindFirstChildOfClass("Clouds")
	local oscuro = tormenta and 0.55 or 0.35
	-- (cada propiedad solo si existe: así no falla si Roblox o las pruebas no la tienen)
	if base.brillo then
		Lighting.Brightness = base.brillo * (1 - oscuro * f)
	end
	if base.exterior then
		Lighting.OutdoorAmbient = base.exterior:Lerp(Color3.fromRGB(105, 108, 118), f * 0.7)
	end
	if atm then
		if base.densidad then
			atm.Density = base.densidad + 0.22 * f
		end
		if base.colorAtm then
			atm.Color = base.colorAtm:Lerp(Color3.fromRGB(150, 156, 168), f)
		end
		if base.bruma then
			atm.Haze = base.bruma + 1.4 * f
		end
	end
	if nb then
		if base.cubierta then
			nb.Cover = base.cubierta + (0.93 - base.cubierta) * f
		end
		if base.densidadNubes then
			nb.Density = base.densidadNubes + (1 - base.densidadNubes) * f
		end
		if base.colorNubes then
			nb.Color = base.colorNubes:Lerp(tormenta and Color3.fromRGB(80, 84, 92) or Color3.fromRGB(150, 154, 162), f)
		end
	end
end

------------------------------------------------------------------
-- Rayos
------------------------------------------------------------------
function ClimaVista.rayo(pos)
	local cam = workspace.CurrentCamera
	-- Solo lo ve quien está en el mundo normal
	if not cam or jugador:GetAttribute("TemaBW") or Generador.dimensionBloque(math.floor(cam.CFrame.Position.Z / BS)) ~= "superficie" then
		return
	end
	-- Zigzag de piezas brillantes desde el cielo
	local partes = {}
	local p = pos + Vector3.new(0, 70 * BS, 0)
	for _ = 1, 9 do
		local siguiente = p:Lerp(pos, 1 / 2.2) + Vector3.new((math.random() - 0.5) * 6 * BS, 0, (math.random() - 0.5) * 6 * BS)
		if (siguiente - pos).Magnitude < 3 * BS then
			siguiente = pos
		end
		local d = siguiente - p
		local seg = Instance.new("Part")
		seg.Anchored = true
		seg.CanCollide = false
		seg.CanQuery = false
		seg.CanTouch = false
		seg.CastShadow = false
		seg.Material = Enum.Material.Neon
		seg.Color = Color3.fromRGB(215, 225, 255)
		seg.Size = Vector3.new(0.35 * BS, 0.35 * BS, math.max(0.1, d.Magnitude))
		seg.CFrame = CFrame.lookAt(p + d / 2, siguiente)
		seg.Parent = carpeta
		table.insert(partes, seg)
		p = siguiente
		if p == pos then
			break
		end
	end
	local luz = Instance.new("PointLight")
	luz.Range = 40 * BS
	luz.Brightness = 8
	luz.Color = Color3.fromRGB(200, 215, 255)
	luz.Parent = partes[#partes]
	ClimaVista.alParticulas(pos, Color3.fromRGB(230, 235, 255), 20)
	-- Destello en todo el cielo
	if destello then
		task.spawn(function()
			for _, b in { 0.45, 0.1, 0.35, 0 } do
				destello.Brightness = b
				task.wait(0.07)
			end
		end)
	end
	task.delay(0.35, function()
		for _, s in partes do
			s:Destroy()
		end
	end)
	-- El trueno llega con retraso según la distancia
	local dist = (cam.CFrame.Position - pos).Magnitude / BS
	task.delay(math.min(3, dist / 60), function()
		ClimaVista.alSonido("explosion", nil, 0.35)
		task.wait(0.4)
		ClimaVista.alSonido("explosion", nil, 0.25)
	end)
end

------------------------------------------------------------------
-- Bucle
------------------------------------------------------------------
function ClimaVista.iniciar(mundoDatos)
	md = mundoDatos
	carpeta.Parent = workspace
	guardarBase()
	destello = Instance.new("ColorCorrectionEffect")
	destello.Name = "Relampago"
	destello.Brightness = 0
	destello.Parent = Lighting
	for _ = 1, GOTAS do
		table.insert(gotas, nuevaGota())
	end
	local tiempo = 0
	local escrito = false
	RunService.RenderStepped:Connect(function(dt)
		tiempo += dt
		local cam = workspace.CurrentCamera
		if not cam then
			return
		end
		local cpos = cam.CFrame.Position
		-- Solo en el mundo normal y fuera de las arenas de los modos
		local enMundo = Generador.dimensionBloque(math.floor(cpos.Z / BS)) == "superficie" and not jugador:GetAttribute("TemaBW")
		local clima = workspace:GetAttribute("Clima") or "despejado"
		local objetivo = (clima ~= "despejado" and enMundo) and 1 or 0
		-- Cambia poco a poco (unos 8 s)
		intensidad += math.clamp(objetivo - intensidad, -dt / 8, dt / 8)
		nubes = intensidad
		if enMundo and (nubes > 0.001 or escrito) then
			aplicarCielo(nubes, clima == "tormenta")
			escrito = nubes > 0.001
		end
		-- ¿Llueve, nieva o nada aquí?
		local bx, bz = math.floor(cpos.X / BS), math.floor(cpos.Z / BS)
		local bio = ClimaVista.biomaForzado or (md and md:bioma(bx, bz))
		local seco = bio and SECO[bio]
		local nieve = bio and FRIO[bio]
		techosT -= dt
		if techosT <= 0 then
			techosT = 1.5
			table.clear(techos)
		end
		local activas = (seco or not enMundo) and 0 or math.floor(GOTAS * intensidad * (clima == "tormenta" and 1 or 0.75))
		local alturaCam = math.floor(cpos.Y / BS)
		for i, g in gotas do
			if i > activas then
				if g.activa then
					g.activa = false
					g.p.Transparency = 1
				end
			else
				if not g.activa or g.nieve ~= (nieve == true) or math.abs(g.x / BS - cpos.X / BS) > AREA + 2 or math.abs(g.z / BS - cpos.Z / BS) > AREA + 2 then
					colocarGota(g, cpos, nieve == true, alturaCam)
				end
				if g.activa then
					g.y -= g.v * dt
					if g.y <= g.suelo then
						-- Salpica al llegar (no todas, para no llenar de partículas)
						if not g.nieve and math.random() < 0.08 then
							ClimaVista.alParticulas(Vector3.new(g.x, g.suelo + 0.1, g.z), Color3.fromRGB(170, 195, 240), 2)
						end
						colocarGota(g, cpos, nieve == true, alturaCam)
					end
					if g.activa then
						local x = g.x
						if g.nieve then
							x += math.sin(tiempo * 1.3 + g.fase) * 0.4
						end
						g.p.CFrame = CFrame.new(x, g.y, g.z)
					end
				end
			end
		end
	end)
end

return ClimaVista
