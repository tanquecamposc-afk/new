--[[
	Blockverse para Roblox · Entidades (cliente)
	Dibuja lo que hay en workspace.Entidades como en el juego web:
	· Objetos tirados: su icono girando y flotando (dos si es un montón).
	· Orbes de experiencia: bolitas verdes y amarillas que brillan.
	· Flechas con plumas y bolas de fuego encendidas.
	Todo sigue con suavidad a la pieza del servidor.
]]
local RunService = game:GetService("RunService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Comp = ReplicatedStorage:WaitForChild("Blockverse")
local Config = require(Comp:WaitForChild("Config"))
local Iconos = require(script.Parent:WaitForChild("Iconos"))

local BS = Config.BLOQUE
local EntidadesVista = {}

local carpeta = Instance.new("Folder")
carpeta.Name = "EntidadesVisibles"
carpeta.Parent = workspace

local vistas = {}
local tiempo = 0

local function pieza(tam, color, material)
	local p = Instance.new("Part")
	p.Anchored = true
	p.CanCollide = false
	p.CanQuery = false
	p.CanTouch = false
	p.CastShadow = false
	p.Size = tam
	p.Color = color
	p.Material = material or Enum.Material.SmoothPlastic
	return p
end

local function cartel(padre, tam)
	local bb = Instance.new("BillboardGui")
	bb.Size = UDim2.fromScale(tam, tam)
	bb.LightInfluence = 1
	bb.AlwaysOnTop = false
	bb.ResetOnSpawn = false
	bb.Adornee = padre
	local img = Instance.new("ImageLabel")
	img.Name = "Icono"
	img.BackgroundTransparency = 1
	img.Size = UDim2.fromScale(1, 1)
	img.ResampleMode = Enum.ResamplerMode.Pixelated
	img.Parent = bb
	bb.Parent = padre
	return bb, img
end

local function nueva(p)
	local v = { p = p, pos = nil, fase = math.random() * 6.28 }
	if p.Name == "Item" then
		local ancla = pieza(Vector3.new(0.1, 0.1, 0.1), Color3.new(1, 1, 1))
		ancla.Transparency = 1
		ancla.Parent = carpeta
		local bb, img = cartel(ancla, 0.9 * BS / 3 * 1.4)
		v.ancla, v.bb, v.img = ancla, bb, img
		local function actualizar()
			Iconos.poner(img, p:GetAttribute("id"))
			local n = p:GetAttribute("n") or 1
			if n > 1 and not v.img2 then
				local i2 = img:Clone()
				i2.Position = UDim2.fromScale(0.12, -0.1)
				i2.ZIndex = 0
				i2.Parent = bb
				v.img2 = i2
			elseif n <= 1 and v.img2 then
				v.img2:Destroy()
				v.img2 = nil
			end
			if v.img2 then
				Iconos.poner(v.img2, p:GetAttribute("id"))
			end
		end
		actualizar()
		v.con = { p:GetAttributeChangedSignal("n"):Connect(actualizar), p:GetAttributeChangedSignal("id"):Connect(actualizar) }
		v.tipo = "item"
	elseif p.Name == "Orbe" then
		local valor = p:GetAttribute("valor") or 1
		local t = (0.18 + math.min(valor, 17) / 17 * 0.14) * BS
		local o = pieza(Vector3.new(t, t, t), Color3.fromRGB(170, 255, 60), Enum.Material.Neon)
		o.Shape = Enum.PartType.Ball
		o.Transparency = 0.1
		local luz = Instance.new("PointLight")
		luz.Color = Color3.fromRGB(180, 255, 80)
		luz.Range = 4
		luz.Brightness = 0.6
		luz.Parent = o
		o.Parent = carpeta
		v.vis = o
		v.tipo = "orbe"
	elseif p.Name == "Flecha" then
		local m = Instance.new("Model")
		local asta = pieza(Vector3.new(0.06, 0.06, 0.9) * BS / 3 * 2, Color3.fromRGB(120, 90, 55), Enum.Material.Wood)
		asta.Parent = m
		local punta = pieza(Vector3.new(0.1, 0.1, 0.12) * BS / 3 * 2, Color3.fromRGB(190, 190, 195), Enum.Material.Metal)
		punta.Parent = m
		local pluma = pieza(Vector3.new(0.02, 0.16, 0.22) * BS / 3 * 2, Color3.fromRGB(235, 235, 235))
		pluma.Parent = m
		m.Parent = carpeta
		v.asta, v.punta, v.pluma, v.vis = asta, punta, pluma, m
		v.tipo = "flecha"
	elseif p.Name == "Bola" then
		local azul = p:GetAttribute("tipo") == "bolaWither"
		local o = pieza(Vector3.new(0.5, 0.5, 0.5) * BS / 3 * 2, azul and Color3.fromRGB(60, 60, 70) or Color3.fromRGB(255, 120, 20), Enum.Material.Neon)
		o.Shape = Enum.PartType.Ball
		local luz = Instance.new("PointLight")
		luz.Color = Color3.fromRGB(255, 150, 60)
		luz.Range = 14
		luz.Brightness = 2
		luz.Parent = o
		local fuego = Instance.new("Fire")
		fuego.Size = 2
		fuego.Heat = 4
		fuego.Parent = o
		o.Parent = carpeta
		v.vis = o
		v.tipo = "bola"
	else
		return
	end
	vistas[p] = v
end

local function quitar(p)
	local v = vistas[p]
	if not v then
		return
	end
	vistas[p] = nil
	if v.con then
		for _, c in v.con do
			c:Disconnect()
		end
	end
	if v.ancla then
		v.ancla:Destroy()
	end
	if v.vis then
		v.vis:Destroy()
	end
end

function EntidadesVista.iniciar()
	local ent = workspace:WaitForChild("Entidades")
	for _, p in ent:GetChildren() do
		nueva(p)
	end
	ent.ChildAdded:Connect(nueva)
	ent.ChildRemoved:Connect(quitar)
	RunService.RenderStepped:Connect(function(dt)
		tiempo += dt
		local a = 1 - math.exp(-dt * 16)
		for p, v in vistas do
			if not p.Parent then
				quitar(p)
				continue
			end
			v.pos = v.pos and v.pos:Lerp(p.Position, a) or p.Position
			if v.tipo == "item" then
				v.ancla.Position = v.pos + Vector3.new(0, (0.25 + math.sin(tiempo * 2.5 + v.fase) * 0.08) * BS, 0)
			elseif v.tipo == "orbe" then
				local c = 0.5 + math.sin(tiempo * 6 + v.fase) * 0.5
				v.vis.Color = Color3.fromRGB(150 + c * 105, 255, 40 + c * 40)
				v.vis.Position = v.pos + Vector3.new(0, 0.12 * BS, 0)
			elseif v.tipo == "flecha" then
				local cf = CFrame.new(v.pos) * p.CFrame.Rotation
				local largo = v.asta.Size.Z
				v.asta.CFrame = cf
				v.punta.CFrame = cf * CFrame.new(0, 0, -largo / 2)
				v.pluma.CFrame = cf * CFrame.new(0, 0, largo / 2 - v.pluma.Size.Z / 2)
			elseif v.tipo == "bola" then
				v.vis.CFrame = CFrame.new(v.pos) * CFrame.Angles(tiempo * 5, tiempo * 3, 0)
			end
		end
	end)
end

return EntidadesVista
