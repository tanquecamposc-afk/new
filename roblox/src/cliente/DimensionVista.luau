--[[
	Blockverse para Roblox · El Nether y el End (cliente)
	· Ambiente de cada dimensión como en el juego web: niebla roja (del
	  color de cada bioma del Nether) y sin cielo en el Nether; niebla
	  morada oscura y estrellas en el End.
	· El Ender Dragon: el mismo modelo de cajas de dragon.js (cuerpo,
	  cuello, cabeza con ojos morados, cola y alas que aletean), con
	  destello al recibir daño y brillo al morir.
	· Los cristales del End: núcleo rosa con dos marcos que giran y el haz
	  que cura al dragón.
	· Bed Wars: cada mapa tiene su ambiente y su hora fija (nunca se juega de noche):
	  Jardín soleado, Invierno con bruma fría, Infierno al atardecer rojo y Desierto
	  con calima dorada.
]]
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local Lighting = game:GetService("Lighting")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Comp = ReplicatedStorage:WaitForChild("Blockverse")
local Config = require(Comp:WaitForChild("Config"))
local Generador = require(Comp:WaitForChild("Generador"))
local Dimensiones = require(Comp:WaitForChild("Dimensiones"))
local Arenas = require(Comp:WaitForChild("Arenas"))

local BS = Config.BLOQUE
local jugador = Players.LocalPlayer
local DV = {}

local carpeta = Instance.new("Folder")
carpeta.Name = "DimensionVisible"
carpeta.Parent = workspace

local function hex(n)
	return Color3.fromRGB(n // 65536, (n // 256) % 256, n % 256)
end

------------------------------------------------------------------
-- Ambiente
------------------------------------------------------------------
local original = nil
local actual = "superficie"
local function guardarOriginal()
	local atm = Lighting:FindFirstChildOfClass("Atmosphere")
	local nubes = workspace.Terrain:FindFirstChildOfClass("Clouds")
	original = {
		Ambient = Lighting.Ambient, OutdoorAmbient = Lighting.OutdoorAmbient, Brightness = Lighting.Brightness,
		FogColor = Lighting.FogColor, FogEnd = Lighting.FogEnd, GlobalShadows = Lighting.GlobalShadows,
		atm = atm and { Density = atm.Density, Color = atm.Color, Decay = atm.Decay, Haze = atm.Haze, Glare = atm.Glare } or nil,
		nubes = nubes and nubes.Enabled,
	}
end

local function aplicar(dim, biomaN)
	local atm = Lighting:FindFirstChildOfClass("Atmosphere")
	local nubes = workspace.Terrain:FindFirstChildOfClass("Clouds")
	if dim == "superficie" or dim == "vacio" then
		if original then
			for k, v in original do
				if k ~= "atm" and k ~= "nubes" then
					Lighting[k] = v
				end
			end
			if atm and original.atm then
				for k, v in original.atm do
					atm[k] = v
				end
			end
			if nubes and original.nubes ~= nil then
				nubes.Enabled = original.nubes
			end
		end
		return
	end
	if not original then
		guardarOriginal()
	end
	if nubes then
		nubes.Enabled = false
	end
	-- Mapas de Bed Wars: {color de la bruma, densidad, ambiente, nubes}
	local AMBIENTE_BW = {
		bw_jardin = { Color3.fromRGB(199, 214, 235), 0.28, Color3.fromRGB(140, 140, 150), true },
		bw_invierno = { Color3.fromRGB(205, 225, 245), 0.4, Color3.fromRGB(150, 165, 190), true },
		bw_infierno = { Color3.fromRGB(255, 120, 80), 0.42, Color3.fromRGB(160, 95, 80), false },
		bw_desierto = { Color3.fromRGB(240, 205, 150), 0.38, Color3.fromRGB(165, 145, 120), true },
	}
	local A = AMBIENTE_BW[dim]
	if A then
		if nubes then
			nubes.Enabled = A[4]
		end
		Lighting.Ambient = A[3]:Lerp(Color3.new(0, 0, 0), 0.35)
		Lighting.OutdoorAmbient = A[3]
		Lighting.Brightness = original and original.Brightness or 2
		Lighting.GlobalShadows = original == nil or original.GlobalShadows
		if atm then
			atm.Density = A[2]
			atm.Color = A[1]
			atm.Decay = A[1]:Lerp(Color3.new(0.4, 0.4, 0.45), 0.4)
			atm.Haze = 1.4
			atm.Glare = dim == "bw_desierto" and 0.6 or 0.2
		end
		return
	end
	if dim == "nether" then
		local col = hex(Dimensiones.NIEBLA_NETHER[(biomaN or 0) + 1] or 0x3a100a)
		Lighting.Ambient = Color3.fromRGB(110, 70, 60)
		Lighting.OutdoorAmbient = Color3.fromRGB(110, 70, 60)
		Lighting.Brightness = 1
		Lighting.GlobalShadows = false
		if atm then
			atm.Density = 0.55
			atm.Color = col:Lerp(Color3.new(1, 0.3, 0.2), 0.25)
			atm.Decay = col
			atm.Haze = 2
			atm.Glare = 0
		end
	else
		Lighting.Ambient = Color3.fromRGB(95, 85, 120)
		Lighting.OutdoorAmbient = Color3.fromRGB(95, 85, 120)
		Lighting.Brightness = 0.8
		Lighting.GlobalShadows = false
		if atm then
			atm.Density = 0.4
			atm.Color = Color3.fromRGB(22, 18, 40)
			atm.Decay = Color3.fromRGB(12, 10, 22)
			atm.Haze = 1.2
			atm.Glare = 0
		end
	end
end

-- Dimensión de una posición en studs
function DV.dimensionEn(pos)
	local d = Generador.dimensionBloque(math.floor(pos.Z / BS))
	return d
end

------------------------------------------------------------------
-- Ender Dragon (dragon.js: crearModeloDragon)
------------------------------------------------------------------
local function caja(padre, w, h, d, col, x, y, z)
	local p = Instance.new("Part")
	p.Anchored = true
	p.CanCollide = false
	p.CanQuery = false
	p.CanTouch = false
	p.Material = Enum.Material.SmoothPlastic
	p.Color = hex(col)
	p.Size = Vector3.new(w, h, d) * BS
	p.Parent = padre
	return { p = p, o = Vector3.new(x, y, z) * BS }
end

local dragones = {}
local function nuevoDragon(pieza)
	local m = Instance.new("Model")
	m.Name = "DragonVisible"
	local partes = {}
	local function c(w, h, d, col, x, y, z)
		local q = caja(m, w, h, d, col, x, y, z)
		table.insert(partes, q)
		return q
	end
	c(3, 2.4, 7, 0x1a1a1f, 0, 0, 0)
	for i = 0, 3 do
		c(0.4, 0.7, 0.8, 0x2a2a33, 0, 1.5, 2.5 - i * 1.8)
	end
	for i = 0, 4 do
		c(1.1, 1.1, 1.1, 0x1f1f25, 0, 0.6, 3.9 + i * 1.1)
	end
	local cab = {}
	local function cc(w, h, d, col, x, y, z)
		local q = caja(m, w, h, d, col, x, y + 0.7, z + 9.8)
		table.insert(cab, q)
		return q
	end
	cc(2, 1.6, 2.8, 0x1a1a1f, 0, 0, 0)
	cc(1.6, 0.6, 1.8, 0x222228, 0, -0.7, 0.6)
	local o1 = cc(0.5, 0.18, 0.05, 0xd050ff, -0.55, 0.25, 1.41)
	local o2 = cc(0.5, 0.18, 0.05, 0xd050ff, 0.55, 0.25, 1.41)
	o1.p.Material, o2.p.Material = Enum.Material.Neon, Enum.Material.Neon
	cc(0.3, 0.6, 0.3, 0x444450, -0.6, 1, -0.8)
	cc(0.3, 0.6, 0.3, 0x444450, 0.6, 1, -0.8)
	local cola = {}
	for i = 0, 9 do
		local q = c(1 - i * 0.06, 1 - i * 0.06, 1.1, 0x1f1f25, 0, 0, -4 - i * 1.1)
		q.i = i
		table.insert(cola, q)
	end
	for _, s in { -1, 1 } do
		c(0.6, 1.8, 0.6, 0x1a1a1f, s * 1.1, -1.8, 2)
		c(0.6, 1.8, 0.6, 0x1a1a1f, s * 1.1, -1.8, -2)
	end
	-- Alas: hueso y membrana que giran sobre el hombro
	local alas = {}
	for _, s in { -1, 1 } do
		local hueso = caja(m, 6, 0.25, 0.5, 0x2a2a33, s * 3, 0, 0)
		local mem = caja(m, 6, 0.08, 4.5, 0x333344, s * 3, 0, -2.3)
		table.insert(alas, { s = s, partes = { hueso, mem }, base = Vector3.new(s * 1.5, 0.9, 1) * BS })
	end
	local hl = Instance.new("Highlight")
	hl.Enabled = false
	hl.FillColor = Color3.fromRGB(255, 60, 60)
	hl.FillTransparency = 0.4
	hl.OutlineTransparency = 1
	hl.Parent = m
	m.Parent = carpeta
	local v = { pieza = pieza, m = m, partes = partes, cab = cab, cola = cola, alas = alas, hl = hl, cf = pieza.CFrame, flash = 0, t = 0 }
	v.con = pieza:GetAttributeChangedSignal("golpe"):Connect(function()
		v.flash = 0.3
	end)
	-- Haz de curación
	local a0 = Instance.new("Attachment")
	a0.Parent = workspace.Terrain
	local a1 = Instance.new("Attachment")
	a1.Parent = workspace.Terrain
	local haz = Instance.new("Beam")
	haz.Attachment0, haz.Attachment1 = a0, a1
	haz.Color = ColorSequence.new(Color3.fromRGB(255, 128, 255))
	haz.Width0, haz.Width1 = 0.3, 0.3
	haz.LightEmission = 1
	haz.FaceCamera = true
	haz.Enabled = false
	haz.Parent = workspace.Terrain
	v.haz, v.a0, v.a1 = haz, a0, a1
	dragones[pieza] = v
end

local function quitarDragon(pieza)
	local v = dragones[pieza]
	if v then
		dragones[pieza] = nil
		v.con:Disconnect()
		v.m:Destroy()
		v.haz:Destroy()
		v.a0:Destroy()
		v.a1:Destroy()
	end
end

-- Cristales
local cristales = {}
local function nuevoCristal(pieza)
	local nucleo = Instance.new("Part")
	nucleo.Anchored, nucleo.CanCollide, nucleo.CanQuery, nucleo.CanTouch = true, false, false, false
	nucleo.Size = Vector3.new(0.7, 0.7, 0.7) * BS
	nucleo.Material = Enum.Material.Neon
	nucleo.Color = Color3.fromRGB(255, 128, 208)
	nucleo.Parent = carpeta
	local marcos = {}
	for k, t in { 1.4, 1.12 } do
		local mrc = Instance.new("Part")
		mrc.Anchored, mrc.CanCollide, mrc.CanQuery, mrc.CanTouch = true, false, false, false
		mrc.Size = Vector3.new(t, t, t) * BS
		mrc.Transparency = 1
		local sb = Instance.new("SelectionBox")
		sb.Adornee = mrc
		sb.Color3 = Color3.fromRGB(224, 224, 255)
		sb.LineThickness = 0.05
		sb.Parent = mrc
		mrc.Parent = carpeta
		marcos[k] = mrc
	end
	local luz = Instance.new("PointLight")
	luz.Color = Color3.fromRGB(255, 140, 220)
	luz.Range = 16
	luz.Brightness = 2
	luz.Parent = nucleo
	cristales[pieza] = { nucleo = nucleo, marcos = marcos, edad = math.random() * 5 }
end
local function quitarCristal(pieza)
	local c = cristales[pieza]
	if c then
		cristales[pieza] = nil
		c.nucleo:Destroy()
		for _, m in c.marcos do
			m:Destroy()
		end
	end
end

------------------------------------------------------------------
-- Bucle
------------------------------------------------------------------
function DV.iniciar()
	local criaturas = workspace:WaitForChild("Criaturas")
	local function alAgregar(p)
		if p.Name == "EnderDragon" then
			nuevoDragon(p)
		elseif p.Name == "CristalEnd" then
			nuevoCristal(p)
		end
	end
	for _, p in criaturas:GetChildren() do
		alAgregar(p)
	end
	criaturas.ChildAdded:Connect(alAgregar)
	criaturas.ChildRemoved:Connect(function(p)
		quitarDragon(p)
		quitarCristal(p)
	end)
	local tiempo = 0
	local biomaT = 0
	RunService.RenderStepped:Connect(function(dt)
		tiempo += dt
		-- Ambiente según la dimensión
		local ch = jugador.Character
		local root = ch and ch:FindFirstChild("HumanoidRootPart")
		if root then
			local dim = DV.dimensionEn(root.Position)
			local tema = jugador:GetAttribute("TemaBW")
			if tema and Arenas.TEMAS_BW[tema] then
				dim = "bw_" .. tema
			end
			if dim == "superficie" and not original then
				-- todavía no se cambió nada
			elseif dim ~= actual or dim == "nether" then
				biomaT -= dt
				if dim ~= actual or biomaT <= 0 then
					biomaT = 1
					local bn = 0
					if dim == "nether" and DV.md then
						local p = root.Position / BS
						local b = DV.md:getSiCargado(math.floor(p.X), 0, math.floor(p.Z))
						if b >= 0 then
							bn = math.max(0, DV.md:bioma(math.floor(p.X), math.floor(p.Z)) - 100)
						end
					end
					aplicar(dim, bn)
				end
			end
			actual = dim
			-- En el Nether y el End no hay sol: siempre de noche sin estrellas del Nether
			if dim == "nether" then
				Lighting.ClockTime = 0
			elseif dim == "end" then
				Lighting.ClockTime = 0
			elseif tema and Arenas.TEMAS_BW[tema] then
				-- La hora del mapa (en el web, 0.25 es mediodía)
				Lighting.ClockTime = 6 + Arenas.TEMAS_BW[tema].hora * 24
			end
		end
		-- Dragones
		for pieza, v in dragones do
			if not pieza.Parent then
				quitarDragon(pieza)
				continue
			end
			local a = 1 - math.exp(-dt * 10)
			v.cf = v.cf and v.cf:Lerp(pieza.CFrame, a) or pieza.CFrame
			v.t += dt
			local base = v.cf * CFrame.Angles(0, math.pi, 0)
			local fase = pieza:GetAttribute("fase")
			local aleteo = math.sin(v.t * (fase == "embestir" and 5 or 3))
			for _, q in v.partes do
				q.p.CFrame = base * CFrame.new(q.o)
			end
			for _, q in v.cola do
				local i = q.i
				q.p.CFrame = base * CFrame.new(q.o + Vector3.new(math.sin(v.t * 2 - i * 0.5) * i * 0.15, math.sin(v.t * 1.5 - i * 0.4) * i * 0.08, 0) * BS)
			end
			local cabRot = CFrame.new(Vector3.new(0, 0.7, 9.8) * BS) * CFrame.Angles(math.sin(v.t * 2) * 0.1, 0, 0)
			for _, q in v.cab do
				q.p.CFrame = base * cabRot * CFrame.new(q.o - Vector3.new(0, 0.7, 9.8) * BS)
			end
			for _, al in v.alas do
				local rot = CFrame.new(al.base) * CFrame.Angles(0, 0, -al.s * aleteo * 0.6)
				for _, q in al.partes do
					q.p.CFrame = base * rot * CFrame.new(q.o)
				end
			end
			-- Destello rojo y brillo al morir
			v.flash = math.max(0, v.flash - dt)
			local muerto = pieza:GetAttribute("muerto")
			v.hl.Enabled = v.flash > 0 or muerto == true
			if muerto then
				v.hl.FillColor = Color3.new(1, 0.9, 1)
				v.hl.FillTransparency = 0.3
			end
			-- Haz desde el cristal que lo cura
			local ci = pieza:GetAttribute("Cristal")
			local cp = nil
			if ci then
				for p in cristales do
					if p:GetAttribute("Cristal") == ci then
						cp = p
					end
				end
			end
			if cp then
				v.a0.WorldPosition = cp.Position
				v.a1.WorldPosition = v.cf.Position
				v.haz.Enabled = true
			else
				v.haz.Enabled = false
			end
		end
		-- Cristales
		for pieza, c in cristales do
			if not pieza.Parent then
				quitarCristal(pieza)
				continue
			end
			c.edad += dt
			local pos = pieza.Position + Vector3.new(0, math.sin(c.edad * 2) * 0.3 * BS, 0)
			c.nucleo.CFrame = CFrame.new(pos) * CFrame.Angles(0, c.edad * 2, 0)
			c.marcos[1].CFrame = CFrame.new(pos) * CFrame.Angles(c.edad, c.edad * 1.3, 0)
			c.marcos[2].CFrame = CFrame.new(pos) * CFrame.Angles(-c.edad * 1.2, 0, c.edad)
		end
	end)
end

return DV
