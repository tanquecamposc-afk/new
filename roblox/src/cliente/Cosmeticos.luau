--[[
	Blockverse para Roblox · Capas, sombreros y mascotas (cliente)
	El servidor pone en cada jugador los atributos Capa, Sombrero y Mascota (si los tiene
	desbloqueados) y cada cliente los dibuja con cajas, como el resto de modelos:
	· La capa cuelga de los hombros y se levanta al correr y al caer, con un vaivén suave.
	· El sombrero va en la cabeza (la aureola gira).
	· La mascota flota al lado del jugador, le sigue con suavidad, aletea y mira hacia donde va.
	El tuyo no se ve en primera persona (salvo la mascota) y nada se ve si eres invisible.
	También dibuja las vistas de frente para la ventana de Personalizar.
]]
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Comp = ReplicatedStorage:WaitForChild("Blockverse")
local DE = require(Comp:WaitForChild("DatosEstilo"))

local jugador = Players.LocalPlayer
local Cos = {}
Cos.esTercera = function()
	return false
end

local carpeta = Instance.new("Folder")
carpeta.Name = "Cosmeticos"

local function caja(tam, col, neon, trans)
	local p = Instance.new("Part")
	p.Anchored = true
	p.CanCollide = false
	p.CanQuery = false
	p.CanTouch = false
	p.CastShadow = not neon
	p.Size = tam
	p.Color = type(col) == "string" and Color3.fromHex(col) or col
	p.Material = neon and Enum.Material.Neon or Enum.Material.SmoothPlastic
	p.Transparency = trans or 0
	p.Parent = carpeta
	return p
end

local function quitar(m)
	if m then
		for _, x in m.partes do
			x.p:Destroy()
		end
	end
end

------------------------------------------------------------------
-- Rectángulos de una capa (en fracciones: x de izquierda a derecha vista desde atrás, y de arriba abajo)
------------------------------------------------------------------
function Cos.rectangulosCapa(c)
	local r = {}
	if c.tablero then
		local nx, ny, col2 = c.tablero[1], c.tablero[2], c.tablero[3]
		for i = 0, nx - 1 do
			for j = 0, ny - 1 do
				if (i + j) % 2 == 1 then
					table.insert(r, { i / nx, j / ny, (i + 1) / nx, (j + 1) / ny, col2 })
				end
			end
		end
	end
	if c.arcoiris then
		for i = 0, 5 do
			table.insert(r, { 0, i / 6, 1, (i + 1) / 6, Color3.fromHSV(i / 6 * 0.83, 0.75, 1) })
		end
	end
	for _, d in c.deco or {} do
		table.insert(r, d)
	end
	if c.estrellas then
		local rnd = Random.new(7)
		for _ = 1, 14 do
			local x, y = rnd:NextNumber(0.05, 0.9), rnd:NextNumber(0.05, 0.9)
			table.insert(r, { x, y, x + 0.05, y + 0.035, "#ffffff", true })
		end
	end
	return r
end

------------------------------------------------------------------
-- Construir cada cosa (lista de piezas con su sitio relativo)
------------------------------------------------------------------
local ANCHO_CAPA, ALTO_CAPA = 2, 3.1
local function crearCapa(id)
	local c = DE.CAPA_ID[id]
	if not c then
		return nil
	end
	local m = { id = id, partes = {}, angulo = 0.15 }
	local base = caja(Vector3.new(ANCHO_CAPA, ALTO_CAPA, 0.1), c.base)
	table.insert(m.partes, { p = base, cf = CFrame.new(0, -ALTO_CAPA / 2, 0) })
	for _, d in Cos.rectangulosCapa(c) do
		local w, h = ANCHO_CAPA * (d[3] - d[1]), ALTO_CAPA * (d[4] - d[2])
		local p = caja(Vector3.new(w, h, 0.02), d[5], d[6] == true)
		local x = -ANCHO_CAPA / 2 + ANCHO_CAPA * (d[1] + d[3]) / 2
		local y = -ALTO_CAPA * (d[2] + d[4]) / 2
		table.insert(m.partes, { p = p, cf = CFrame.new(x, y, 0.06) })
	end
	return m
end

local function crearSombrero(id, u)
	local s = DE.SOMBRERO_ID[id]
	if not s then
		return nil
	end
	local m = { id = id, partes = {}, gira = s.gira, u = u }
	for _, b in s.cajas do
		local p = caja(Vector3.new(b[1][1], b[1][2], b[1][3]) * u, b[3], b[4] == true)
		table.insert(m.partes, { p = p, cf = CFrame.new(b[2][1] * u, b[2][2] * u, b[2][3] * u) })
	end
	return m
end

local function crearMascota(id)
	local d = DE.MASCOTA_ID[id]
	if not d then
		return nil
	end
	local m = { id = id, partes = {}, def = d, t = math.random() * 10 }
	for _, b in d.cajas do
		local p = caja(Vector3.new(b[1][1], b[1][2], b[1][3]), b[3], b[4] == true, b.trans)
		table.insert(m.partes, { p = p, cf = CFrame.new(b[2][1], b[2][2], b[2][3]), ala = b.ala, rota = b.rota })
		m.tieneRota = m.tieneRota or b.rota == true
	end
	if d.luz then
		local l = Instance.new("PointLight")
		l.Color = Color3.fromHex(d.luz)
		l.Range = 8
		l.Brightness = 1.2
		l.Parent = m.partes[1].p
	end
	return m
end

local function ocultar(m, si)
	if m and m.oculto ~= si then
		m.oculto = si
		for _, x in m.partes do
			x.p.LocalTransparencyModifier = si and 1 or 0
		end
	end
end

local function colocar(m, base)
	for _, x in m.partes do
		x.p.CFrame = base * x.cf
	end
end

------------------------------------------------------------------
-- Cada fotograma
------------------------------------------------------------------
local porJugador = {} -- plr -> {capa, sombrero, mascota}

local function actualizar(plr, d, dt)
	local ch = plr.Character
	local raiz = ch and ch:FindFirstChild("HumanoidRootPart")
	local hum = ch and ch:FindFirstChildOfClass("Humanoid")
	local vivo = raiz and hum and hum.Health > 0 and not ch:GetAttribute("Invisible")
	local cam = workspace.CurrentCamera
	local lejos = not raiz or not cam or (raiz.Position - cam.CFrame.Position).Magnitude > 220
	local yo = plr == jugador
	-- ¿Ha cambiado lo que lleva?
	for _, k in { { "capa", "Capa" }, { "sombrero", "Sombrero" }, { "mascota", "Mascota" } } do
		local id = plr:GetAttribute(k[2])
		local m = d[k[1]]
		local cab = ch and ch:FindFirstChild("Head")
		local u = cab and math.min(cab.Size.X, cab.Size.Y, cab.Size.Z) * 1.05 or 1.2
		if (m and m.id) ~= id or (k[1] == "sombrero" and m and math.abs(m.u - u) > 0.01) then
			quitar(m)
			d[k[1]] = nil
			if id then
				if k[1] == "capa" then
					d.capa = crearCapa(id)
				elseif k[1] == "sombrero" then
					d.sombrero = crearSombrero(id, u)
				else
					d.mascota = crearMascota(id)
				end
			end
		end
	end
	local t = os.clock()
	-- Capa: cuelga de la espalda y se levanta con la velocidad
	if d.capa then
		local torso = ch and (ch:FindFirstChild("UpperTorso") or ch:FindFirstChild("Torso"))
		local ver = vivo and torso and not lejos and (not yo or Cos.esTercera())
		ocultar(d.capa, not ver)
		if ver then
			local v = raiz.AssemblyLinearVelocity
			local atras = torso.CFrame.LookVector
			local avance = math.max(0, v:Dot(atras))
			local caer = math.clamp(-v.Y, 0, 40)
			local objetivo = math.rad(6) + math.rad(math.clamp(avance * 2.4 + caer * 1.2, 0, 70))
			objetivo += math.sin(t * 7) * math.rad(2.5) * math.clamp(avance / 8, 0, 1)
			d.capa.angulo += (objetivo - d.capa.angulo) * math.min(1, dt * 8)
			local s = torso.Size
			local hombros = torso.CFrame * CFrame.new(0, s.Y / 2 - 0.05, s.Z / 2 + 0.08)
			colocar(d.capa, hombros * CFrame.Angles(-d.capa.angulo, 0, 0))
		end
	end
	-- Sombrero
	if d.sombrero then
		local cab = ch and ch:FindFirstChild("Head")
		local ver = vivo and cab and not lejos and (not yo or Cos.esTercera())
		ocultar(d.sombrero, not ver)
		if ver then
			local base = cab.CFrame * CFrame.new(0, d.sombrero.u / 2, 0)
			if d.sombrero.gira then
				base *= CFrame.new(0, math.sin(t * 2) * 0.05, 0) * CFrame.Angles(0, t * 1.5, 0)
			end
			colocar(d.sombrero, base)
		end
	end
	-- Mascota: flota detrás, a la derecha, y te sigue
	local m = d.mascota
	if m then
		ocultar(m, not vivo or lejos)
		if vivo and not lejos then
			m.t += dt
			local destino = (raiz.CFrame * CFrame.new(2.4, 1.3, 2.2)).Position
			if not m.pos or (m.pos - destino).Magnitude > 40 then
				m.pos = destino
				m.giro = 0
			end
			local antes = m.pos
			m.pos = m.pos:Lerp(destino, 1 - math.exp(-dt * 5))
			local mov = m.pos - antes
			local mira
			if Vector3.new(mov.X, 0, mov.Z).Magnitude > 0.02 then
				mira = math.atan2(-mov.X, -mov.Z)
			else
				local lv = raiz.CFrame.LookVector
				mira = math.atan2(-lv.X, -lv.Z)
			end
			local dif = (mira - (m.giro or 0) + math.pi) % (2 * math.pi) - math.pi
			m.giro = (m.giro or 0) + dif * math.min(1, dt * 6)
			local bote = m.def.salta and math.abs(math.sin(m.t * 3.5)) * 0.6 or math.sin(m.t * 2.4) * 0.25
			local giro = m.giro
			if m.def.gira and not m.tieneRota then
				giro += m.t * 1.6
			end
			local base = CFrame.new(m.pos + Vector3.new(0, bote, 0)) * CFrame.Angles(0, giro, 0)
			local aleteo = math.sin(m.t * 16) * 0.6
			for _, x in m.partes do
				local cf = x.cf
				if x.ala then
					-- Gira por la bisagra (a medio camino del cuerpo)
					local px = cf.Position.X * 0.5
					cf = CFrame.new(px, cf.Position.Y, cf.Position.Z) * CFrame.Angles(0, 0, x.ala * aleteo) * CFrame.new(px, 0, 0)
				elseif x.rota then
					cf = CFrame.Angles(0, m.t * 2.5, 0) * cf
				end
				x.p.CFrame = base * cf
			end
		end
	end
end

function Cos.iniciar()
	carpeta.Parent = workspace
	RunService.RenderStepped:Connect(function(dt)
		for _, plr in Players:GetPlayers() do
			local d = porJugador[plr]
			if not d then
				d = {}
				porJugador[plr] = d
			end
			actualizar(plr, d, dt)
		end
		for plr, d in porJugador do
			if not plr.Parent then
				quitar(d.capa)
				quitar(d.sombrero)
				quitar(d.mascota)
				porJugador[plr] = nil
			end
		end
	end)
end

------------------------------------------------------------------
-- Vista de frente (para las tarjetas de la ventana): cajas como marcos 2D
------------------------------------------------------------------
-- cajas: lista {tam, pos, color, neón}; escala: píxeles por unidad; z: capa de la interfaz
function Cos.dibujarFrente(padre, cajas, escala, z)
	local orden = {}
	for _, b in cajas do
		table.insert(orden, b)
	end
	-- Lo de atrás primero (delante es -Z)
	table.sort(orden, function(a, b)
		return a[2][3] > b[2][3]
	end)
	for _, b in orden do
		local f = Instance.new("Frame")
		f.BorderSizePixel = 0
		f.AnchorPoint = Vector2.new(0.5, 0.5)
		f.BackgroundColor3 = Color3.fromHex(b[3])
		f.BackgroundTransparency = b.trans or 0
		f.Size = UDim2.fromOffset(math.max(2, b[1][1] * escala), math.max(2, b[1][2] * escala))
		f.Position = UDim2.new(0.5, b[2][1] * escala, 0.5, -b[2][2] * escala)
		f.ZIndex = z
		f.Parent = padre
	end
end

return Cos
