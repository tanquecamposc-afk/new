--[[
	Blockverse para Roblox · Entidades (cliente)
	Dibuja lo que hay en workspace.Entidades como en el juego web:
	· Objetos tirados: su modelo 3D (cubito con texturas o el objeto con volumen)
	  girando y flotando, dos si es un montón; sin mallas, su icono.
	· Orbes de experiencia: bolitas verdes y amarillas que brillan.
	· Flechas con plumas y bolas de fuego encendidas.
	Todo sigue con suavidad a la pieza del servidor.
]]
local RunService = game:GetService("RunService")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Comp = ReplicatedStorage:WaitForChild("Blockverse")
local Config = require(Comp:WaitForChild("Config"))
local Registro = require(Comp:WaitForChild("Registro"))
local Iconos = require(script.Parent:WaitForChild("Iconos"))
local Modelos3D = require(script.Parent:WaitForChild("Modelos3D"))

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
	local v = { p = p, pos = nil, fase = math.random() * 6.28, nacer = 0 }
	if p.Name == "Item" then
		local ancla = pieza(Vector3.new(0.1, 0.1, 0.1), Color3.new(1, 1, 1))
		ancla.Transparency = 1
		ancla.Parent = carpeta
		local bb, img = cartel(ancla, 0.9 * BS / 3 * 1.4)
		v.ancla, v.bb, v.img, v.bbTam = ancla, bb, img, 0.9 * BS / 3 * 1.4
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
		v.con = { p:GetAttributeChangedSignal("n"):Connect(actualizar), p:GetAttributeChangedSignal("id"):Connect(function()
			actualizar()
			v.modeloId = nil
		end) }
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

-- Objetos y orbes recogidos: vuelan hasta quien los coge, encogiéndose (como en Minecraft)
local volando = {} -- {v, desde, hacia (Player), t}
local function quienRecoge(p)
	local id = p:GetAttribute("Recoge")
	return id and Players:GetPlayerByUserId(id) or nil
end

local function quitar(p)
	local v = vistas[p]
	if not v then
		return
	end
	vistas[p] = nil
	if (v.tipo == "item" or v.tipo == "orbe") and v.pos and not v.lejos then
		local plr = quienRecoge(p)
		if plr then
			if v.con then
				for _, c in v.con do
					c:Disconnect()
				end
				v.con = nil
			end
			table.insert(volando, { v = v, desde = v.pos, hacia = plr, t = 0 })
			return
		end
	end
	if v.con then
		for _, c in v.con do
			c:Disconnect()
		end
	end
	if v.ancla then
		v.ancla:Destroy()
	end
	v.pedido = (v.pedido or 0) + 1
	Modelos3D.quitar(v.modelo)
	Modelos3D.quitar(v.modelo2)
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
				-- Al caer da un saltito (crece de pequeño) y luego flota subiendo y bajando
				v.nacer = math.min(1, v.nacer + dt / 0.3)
				local salto = math.sin(v.nacer * math.pi) * 0.25 * (1 - v.nacer)
				local alto = v.pos + Vector3.new(0, (0.25 + salto + math.sin(tiempo * 2.5 + v.fase) * 0.08) * BS, 0)
				v.ancla.Position = alto
				-- Modelo 3D: se pide una vez por objeto (la primera vez de cada uno tarda un poco)
				local id = p:GetAttribute("id")
				if v.modeloId ~= id and Modelos3D.disponible() then
					v.modeloId = id
					v.pedido = (v.pedido or 0) + 1
					local yo = v.pedido
					Modelos3D.quitar(v.modelo)
					Modelos3D.quitar(v.modelo2)
					v.modelo, v.modelo2 = nil, nil
					task.spawn(function()
						local esc = Registro.bloques[id] and 0.25 or 0.45
						local m = Modelos3D.crear(id, esc)
						local m2 = m and Modelos3D.crear(id, esc)
						if m and v.pedido == yo and vistas[p] then
							v.modelo, v.modelo2 = m, m2
							m.m.Parent = carpeta
							m2.m.Parent = carpeta
							v.bb.Enabled = false
						else
							Modelos3D.quitar(m)
							Modelos3D.quitar(m2)
						end
					end)
				end
				if v.modelo then
					local giro = CFrame.new(alto) * CFrame.Angles(0, tiempo * 1.6 + v.fase, 0)
					Modelos3D.colocar(v.modelo, giro)
					local varios = (p:GetAttribute("n") or 1) > 1
					Modelos3D.colocar(v.modelo2, varios and giro * CFrame.new(0.12 * BS, 0.08 * BS, 0.1 * BS) or CFrame.new(0, -1e4, 0))
				end
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
		-- Lo recogido vuela hacia el jugador y se encoge
		local i = 1
		while i <= #volando do
			local f = volando[i]
			f.t += dt / 0.18
			local r = f.hacia.Character and f.hacia.Character:FindFirstChild("HumanoidRootPart")
			if f.t >= 1 or not r then
				local v = f.v
				if v.ancla then
					v.ancla:Destroy()
				end
				Modelos3D.quitar(v.modelo)
				Modelos3D.quitar(v.modelo2)
				if v.vis then
					v.vis:Destroy()
				end
				volando[i] = volando[#volando]
				volando[#volando] = nil
			else
				local e = f.t * f.t
				local pos = f.desde:Lerp(r.Position + Vector3.new(0, 0.2 * BS, 0), e)
				local esc = 1 - e * 0.7
				local v = f.v
				if v.modelo then
					Modelos3D.colocar(v.modelo, CFrame.new(pos) * CFrame.Angles(0, tiempo * 8, 0))
					Modelos3D.colocar(v.modelo2, CFrame.new(0, -1e4, 0))
				elseif v.ancla then
					v.ancla.Position = pos
					v.bb.Size = UDim2.fromScale(esc * (v.bbTam or 1), esc * (v.bbTam or 1))
				end
				if v.vis then
					v.vis.Position = pos
					v.vis.Size = v.vis.Size * (1 - dt * 3)
				end
				i += 1
			end
		end
	end)
end

return EntidadesVista
