--[[
	Blockverse para Roblox · Modelos 3D de los objetos (cliente)
	· Los bloques son cubos (o losas, o sus cajas) con las mismas texturas del mundo.
	· Los demás objetos (espadas, picos, comida, flores…) se hacen con los píxeles de
	  su icono con un píxel de grosor, como en Minecraft.
	· La mano en primera persona: el brazo con el objeto en 3D, que se balancea al
	  golpear y al usar, se mueve al andar y baja y sube al cambiar de objeto.
	· El objeto que lleva cada jugador en la mano se ve en su personaje.
	Si Roblox no deja crear mallas editables, no se hace nada y el juego usa los iconos.
]]
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local AssetService = game:GetService("AssetService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Comp = ReplicatedStorage:WaitForChild("Blockverse")
local Config = require(Comp:WaitForChild("Config"))
local Registro = require(Comp:WaitForChild("Registro"))
local Imagenes = require(script.Parent:WaitForChild("Imagenes"))
local Iconos = require(script.Parent:WaitForChild("Iconos"))
local Render = require(script.Parent:WaitForChild("Render"))

local BS = Config.BLOQUE
local BL = Registro.bloques
local jugador = Players.LocalPlayer

local Modelos = {}

------------------------------------------------------------------
-- Objetos con volumen a partir de los píxeles del icono
------------------------------------------------------------------
local function mallaExtruida(id)
	local px, ofs, w, h = Iconos.pixeles(id)
	-- Los iconos de 48 px son cubos dibujados en perspectiva: esos no sirven
	if not px or w > 32 or h > 32 then
		return nil
	end
	local buf = buffer.create(w * h * 4)
	buffer.copy(buf, 0, px, ofs, w * h * 4)
	local img = Imagenes.crear(w, h, buf)
	if not img then
		return nil
	end
	local ok, em = pcall(function()
		return AssetService:CreateEditableMesh()
	end)
	if not ok or not em then
		return nil
	end
	local function opaco(x, y)
		if x < 0 or y < 0 or x >= w or y >= h then
			return false
		end
		return buffer.readu8(buf, (y * w + x) * 4 + 3) > 100
	end
	local s = BS / 16 -- un píxel del icono = 1/16 de bloque
	-- Roblox estira la malla al tamaño de la pieza: se centra en los píxeles que se ven
	local minX, minY, maxX, maxY = w, h, -1, -1
	for y = 0, h - 1 do
		for x = 0, w - 1 do
			if buffer.readu8(buf, (y * w + x) * 4 + 3) > 100 then
				minX, minY = math.min(minX, x), math.min(minY, y)
				maxX, maxY = math.max(maxX, x), math.max(maxY, y)
			end
		end
	end
	if maxX < 0 then
		return nil
	end
	local cxp, cyp = (minX + maxX + 1) / 2, (minY + maxY + 1) / 2
	local normales, colores = {}, {}
	local function normalId(n)
		local k = n.X * 9 + n.Y * 3 + n.Z
		if not normales[k] then
			normales[k] = em:AddNormal(n)
		end
		return normales[k]
	end
	-- Las caras de lado un poco más oscuras, como la luz del mundo
	local function colorId(luz)
		if not colores[luz] then
			colores[luz] = em:AddColor(Color3.new(luz, luz, luz), 1)
		end
		return colores[luz]
	end
	-- Cuadrilátero con las esquinas en orden; se gira para que mire hacia `n`
	local function cara(p1, p2, p3, p4, n, uv, luz)
		local a, b, c, d = em:AddVertex(p1), em:AddVertex(p2), em:AddVertex(p3), em:AddVertex(p4)
		local t1, t2
		if (p2 - p1):Cross(p3 - p1):Dot(n) > 0 then
			t1, t2 = { a, b, c }, { a, c, d }
		else
			t1, t2 = { a, c, b }, { a, d, c }
		end
		local ni, ci = normalId(n), colorId(luz)
		for _, tri in { t1, t2 } do
			local f = em:AddTriangle(tri[1], tri[2], tri[3])
			em:SetFaceUVs(f, { uv, uv, uv })
			em:SetFaceNormals(f, { ni, ni, ni })
			em:SetFaceColors(f, { ci, ci, ci })
		end
	end
	local V = Vector3.new
	local z0, z1 = -s / 2, s / 2
	local hay = false
	local ok2 = pcall(function()
		for y = 0, h - 1 do
			for x = 0, w - 1 do
				if opaco(x, y) then
					hay = true
					local uv = em:AddUV(Vector2.new((x + 0.5) / w, (y + 0.5) / h))
					local x0, x1 = (x - cxp) * s, (x + 1 - cxp) * s
					local y1, y0 = (cyp - y) * s, (cyp - y - 1) * s
					cara(V(x0, y0, z1), V(x1, y0, z1), V(x1, y1, z1), V(x0, y1, z1), V(0, 0, 1), uv, 1)
					cara(V(x0, y0, z0), V(x1, y0, z0), V(x1, y1, z0), V(x0, y1, z0), V(0, 0, -1), uv, 0.85)
					if not opaco(x - 1, y) then
						cara(V(x0, y0, z0), V(x0, y0, z1), V(x0, y1, z1), V(x0, y1, z0), V(-1, 0, 0), uv, 0.75)
					end
					if not opaco(x + 1, y) then
						cara(V(x1, y0, z0), V(x1, y0, z1), V(x1, y1, z1), V(x1, y1, z0), V(1, 0, 0), uv, 0.75)
					end
					if not opaco(x, y - 1) then
						cara(V(x0, y1, z0), V(x1, y1, z0), V(x1, y1, z1), V(x0, y1, z1), V(0, 1, 0), uv, 0.95)
					end
					if not opaco(x, y + 1) then
						cara(V(x0, y0, z0), V(x1, y0, z0), V(x1, y0, z1), V(x0, y0, z1), V(0, -1, 0), uv, 0.6)
					end
				end
			end
		end
	end)
	if not ok2 or not hay then
		em:Destroy()
		return nil
	end
	local parte
	local ok3 = pcall(function()
		parte = AssetService:CreateMeshPartAsync(Content.fromObject(em), { CollisionFidelity = Enum.CollisionFidelity.Box })
	end)
	if not ok3 or not parte then
		em:Destroy()
		return nil
	end
	parte.Anchored = true
	parte.CanCollide = false
	parte.CanQuery = false
	parte.CanTouch = false
	parte.CastShadow = false
	parte.Material = Enum.Material.SmoothPlastic
	parte.Color = Color3.new(1, 1, 1)
	parte.Size = Vector3.new((maxX - minX + 1) * s, (maxY - minY + 1) * s, s)
	parte.CFrame = CFrame.new()
	Imagenes.enMalla(parte, img)
	local m = Instance.new("Model")
	m.Name = "Objeto" .. id
	parte.Parent = m
	m.WorldPivot = CFrame.new()
	return m
end

------------------------------------------------------------------
-- Crear y colocar
------------------------------------------------------------------
local plantillas = {} -- id -> Model | false
local haciendo = {}

-- Devuelve {m = Model, tipo = "bloque" | "objeto", partes = {{parte, desplazamiento}}} o nil.
-- La primera vez de cada objeto espera a que Roblox cree la malla.
function Modelos.crear(id, escala)
	if not id or id == 0 or not Modelos.disponible() then
		return nil
	end
	while haciendo[id] do
		task.wait()
	end
	local p = plantillas[id]
	if p == nil then
		haciendo[id] = true
		local ok, m = pcall(function()
			local bloque = BL[id] and Render.modeloBloque(id)
			if bloque then
				bloque:SetAttribute("tipo", "bloque")
				return bloque
			end
			local o = mallaExtruida(id)
			if o then
				o:SetAttribute("tipo", "objeto")
			end
			return o
		end)
		p = ok and m or false
		plantillas[id] = p
		haciendo[id] = nil
	end
	if not p then
		return nil
	end
	local m = p:Clone()
	local inst = { m = m, tipo = p:GetAttribute("tipo"), partes = {} }
	escala = escala or 1
	for _, parte in m:GetChildren() do
		if parte:IsA("BasePart") then
			local cf = parte.CFrame
			parte.Size *= escala
			table.insert(inst.partes, { parte, CFrame.new(cf.Position * escala) * cf.Rotation })
		end
	end
	return inst
end

function Modelos.colocar(inst, cf)
	if not inst then
		return
	end
	for _, pd in inst.partes do
		pd[1].CFrame = cf * pd[2]
	end
end

function Modelos.quitar(inst)
	if inst then
		inst.m:Destroy()
	end
end

-- Brillo de encantamiento: una capa morada un poco más grande con el material ForceField,
-- que en Roblox tiene un reflejo que se mueve solo (como el brillo de Minecraft)
function Modelos.brillo(inst, si)
	if not inst or (si == true) == (inst.brillo ~= nil) then
		return
	end
	if si then
		inst.brillo = {}
		for _, pd in table.clone(inst.partes) do
			local c = pd[1]:Clone()
			c.Name = "Brillo"
			c.Material = Enum.Material.ForceField
			c.Color = Color3.fromRGB(170, 90, 255)
			c.Size = pd[1].Size * 1.04
			c.CastShadow = false
			for _, h in c:GetChildren() do
				if not h:IsA("SpecialMesh") then
					h:Destroy()
				end
			end
			c.Parent = inst.m
			local e = { c, pd[2] }
			table.insert(inst.partes, e)
			table.insert(inst.brillo, e)
		end
	else
		for _, e in inst.brillo do
			e[1]:Destroy()
			local i = table.find(inst.partes, e)
			if i then
				table.remove(inst.partes, i)
			end
		end
		inst.brillo = nil
	end
end

-- Que el modelo proyecte sombra (los objetos tirados sí; la mano en primera persona no)
function Modelos.sombra(inst, si)
	if inst then
		for _, pd in inst.partes do
			if pd[1].Name ~= "Brillo" then
				pd[1].CastShadow = si
			end
		end
	end
end

function Modelos.disponible()
	return Render.modo == "malla" and Imagenes.disponible
end

------------------------------------------------------------------
-- La mano en primera persona
------------------------------------------------------------------
-- opc = {enMano = fn() -> id, visible = fn() -> bool, balanceo = fn() -> 0..1, conBalanceo = fn() -> bool,
--        pose = fn() -> {comer = 0..1?, arco = 0..1?, escudo = bool, corriendo = bool, aterriza = 0..1}}
function Modelos.iniciarMano(opc)
	local carpeta = Instance.new("Folder")
	carpeta.Name = "ManoPrimeraPersona"
	local brazo = Instance.new("Part")
	brazo.Name = "Brazo"
	brazo.Anchored = true
	brazo.CanCollide = false
	brazo.CanQuery = false
	brazo.CanTouch = false
	brazo.CastShadow = false
	brazo.Material = Enum.Material.SmoothPlastic
	brazo.Size = Vector3.new(0.42, 0.42, 1.5)
	brazo.Color = Color3.fromRGB(234, 184, 146)
	brazo.Parent = carpeta
	local manga = brazo:Clone()
	manga.Name = "Manga"
	manga.Size = Vector3.new(0.46, 0.46, 0.7)
	manga.Color = Color3.fromRGB(0, 160, 170)
	manga.Parent = carpeta
	local actual, sostenido = nil, nil
	local pedido = 0
	local cambioT, t = 0, 0
	-- Estado suavizado de cada postura (0 = nada, 1 = del todo)
	local inX, inY = 0, 0 -- inercia al girar la cámara
	local ultimoLook = nil
	local pComer, pArco, pEscudo, pCorrer, tiempo = 0, 0, 0, 0, 0
	local function colorPiel()
		local ch = jugador.Character
		local bc = ch and ch:FindFirstChildOfClass("BodyColors")
		if bc then
			brazo.Color = bc.RightArmColor3
		end
	end
	jugador.CharacterAdded:Connect(function()
		task.wait(1)
		colorPiel()
	end)
	colorPiel()
	RunService:BindToRenderStep("ManoBlockverse", Enum.RenderPriority.Camera.Value + 2, function(dt)
		local cam = workspace.CurrentCamera
		if not cam then
			return
		end
		if carpeta.Parent ~= cam then
			carpeta.Parent = cam
		end
		local visible = opc.visible()
		local id = visible and opc.enMano() or nil
		-- Cambio de objeto: baja la mano y sube con el nuevo
		if id ~= actual then
			actual = id
			cambioT = 0.25
			pedido += 1
			local yo = pedido
			if sostenido then
				Modelos.quitar(sostenido)
				sostenido = nil
			end
			if id then
				task.spawn(function()
					local inst = Modelos.crear(id, BL[id] and 0.24 or 0.36)
					if inst and yo == pedido then
						sostenido = inst
						Modelos.brillo(inst, opc.encantado and opc.encantado() or false)
						inst.m.Parent = carpeta
					elseif inst then
						Modelos.quitar(inst)
					end
				end)
			end
		end
		-- Si cambia el encantamiento de lo que llevas (yunque, mesa…), cambia el brillo
		if sostenido and opc.encantado then
			Modelos.brillo(sostenido, opc.encantado())
		end
		if not visible then
			brazo.Transparency, manga.Transparency = 1, 1
			if sostenido then
				Modelos.colocar(sostenido, CFrame.new(0, -1e4, 0))
			end
			return
		end
		brazo.Transparency, manga.Transparency = 0, 0
		cambioT = math.max(0, cambioT - dt)
		tiempo += dt
		local pose = opc.pose and opc.pose() or {}
		local function hacia(v, obj, vel)
			return v + (obj - v) * math.min(1, dt * vel)
		end
		pComer = hacia(pComer, pose.comer and 1 or 0, 12)
		pArco = hacia(pArco, pose.arco and 1 or 0, 12)
		pEscudo = hacia(pEscudo, pose.escudo and 1 or 0, 14)
		pCorrer = hacia(pCorrer, pose.corriendo and 1 or 0, 6)
		-- Inercia: al girar la cámara la mano se queda un poco atrás y vuelve sola
		local look = cam.CFrame.LookVector
		if ultimoLook then
			-- Dónde queda la mirada de antes respecto a la de ahora (derecha y arriba)
			local dx, dy = ultimoLook:Dot(cam.CFrame.RightVector), ultimoLook:Dot(cam.CFrame.UpVector)
			inX = hacia(inX, math.clamp(dx * 3, -0.22, 0.22), 10)
			inY = hacia(inY, math.clamp(dy * 3, -0.18, 0.18), 10)
		end
		ultimoLook = look
		local b = opc.balanceo()
		-- Mientras come, tensa el arco o se cubre no da golpes
		local quieto = math.max(pComer, pArco, pEscudo)
		local golpe = math.sin(b * math.pi) * (1 - quieto)
		local golpe2 = math.sin(math.sqrt(b) * math.pi) * (1 - quieto)
		-- Al andar se mueve un poco (más al correr)
		local ch = jugador.Character
		local hum = ch and ch:FindFirstChildOfClass("Humanoid")
		local andar = hum and hum.MoveDirection.Magnitude > 0.1 and opc.conBalanceo()
		if andar then
			t += dt * (1 + pCorrer * 0.35)
		end
		local amp = 0.06 * (1 + pCorrer * 0.8)
		local bx = andar and math.sin(t * 9) * amp or 0
		local by = andar and -math.abs(math.cos(t * 9)) * amp or 0
		local baja = cambioT / 0.25 * 0.9
		-- Aterrizar: la mano baja de golpe y vuelve
		local at = pose.aterriza or 0
		by -= at * 0.22
		local base = cam.CFrame
			* CFrame.new(inX, inY, 0)
			* CFrame.new(1.2 + bx - golpe2 * 0.3, -1.15 + by - baja + golpe2 * 0.25 - golpe * 0.2 - pCorrer * 0.08, -1.9 - golpe * 0.35)
			* CFrame.Angles(math.rad(14) - golpe * 0.9 - pCorrer * 0.12, math.rad(-10) + golpe2 * 0.35 + inX * 0.6, math.rad(-6) - pCorrer * 0.1)
		-- Comer: el objeto se acerca a la boca y sube y baja deprisa
		if pComer > 0.01 then
			local mord = math.abs(math.sin(tiempo * 22)) * 0.07 * pComer
			base = base:Lerp(cam.CFrame * CFrame.new(0.55, -0.75 + mord, -1.3) * CFrame.Angles(math.rad(25), math.rad(-35), math.rad(-15)), pComer)
		end
		-- Arco: se lleva al centro y tiembla un poco cuando está tenso del todo
		if pArco > 0.01 then
			local tenso = pose.arco or 0
			local tiembla = tenso >= 1 and math.sin(tiempo * 40) * 0.008 or 0
			base = base:Lerp(cam.CFrame * CFrame.new(0.55 + tiembla, -0.8, -1.5 + tenso * 0.15) * CFrame.Angles(math.rad(8), math.rad(-25), math.rad(-25)), pArco)
		end
		-- Escudo: se levanta delante, un poco a la izquierda
		if pEscudo > 0.01 then
			base = base:Lerp(cam.CFrame * CFrame.new(0.6, -0.75, -1.35) * CFrame.Angles(math.rad(10), math.rad(30), 0), pEscudo)
		end
		brazo.CFrame = base * CFrame.new(0, 0, 0.55)
		-- La manga asoma por abajo de la pantalla, como el brazo de Steve
		manga.CFrame = base * CFrame.new(0, 0, 0.6)
		if sostenido then
			local giro
			if sostenido.tipo == "bloque" then
				giro = CFrame.new(-0.05, 0.4, -0.55) * CFrame.Angles(0, math.rad(45), 0)
			else
				-- El objeto plano visto de lado, con la punta hacia arriba y hacia delante
				giro = CFrame.new(-0.2, 0.55, -0.55) * CFrame.Angles(math.rad(-15), math.rad(-35), 0) * CFrame.Angles(0, 0, math.rad(40))
				-- El arco se pone vertical y el escudo de frente
				if pArco > 0.01 then
					giro = giro:Lerp(CFrame.new(-0.25, 0.5, -0.6) * CFrame.Angles(0, math.rad(-80), 0) * CFrame.Angles(0, 0, math.rad(-20)), pArco)
				end
				if pEscudo > 0.01 then
					giro = giro:Lerp(CFrame.new(-0.3, 0.45, -0.45) * CFrame.Angles(0, math.rad(-70), 0), pEscudo)
				end
			end
			Modelos.colocar(sostenido, base * giro)
		end
	end)
end

------------------------------------------------------------------
-- El objeto en la mano de cada personaje (lo que lleva en la barra)
------------------------------------------------------------------
-- esTercera = fn() -> bool (el propio jugador solo se ve en tercera persona)
function Modelos.iniciarPersonajes(esTercera)
	local carpeta = Instance.new("Folder")
	carpeta.Name = "ObjetosEnLaMano"
	carpeta.Parent = workspace
	local porJugador = {} -- plr -> {id, inst, pedido}
	RunService.RenderStepped:Connect(function(dt)
		for _, plr in Players:GetPlayers() do
			local d = porJugador[plr]
			if not d then
				d = { pedido = 0, golpeT = 0, escudo = 0 }
				porJugador[plr] = d
			end
			local ch = plr.Character
			-- Brazo derecho: golpe al pegar, picar o poner, y el escudo levantado (se suma a la animación de Roblox)
			local hombro = ch and ((ch:FindFirstChild("RightUpperArm") and ch.RightUpperArm:FindFirstChild("RightShoulder"))
				or (ch:FindFirstChild("Torso") and ch.Torso:FindFirstChild("Right Shoulder")))
			local g = plr:GetAttribute("Golpe")
			if g ~= d.ultimoGolpe then
				if d.ultimoGolpe ~= nil then
					d.golpeT = 0.3
				end
				d.ultimoGolpe = g
			end
			d.golpeT = math.max(0, d.golpeT - dt)
			d.escudo += ((plr:GetAttribute("Cubriendo") and 1 or 0) - d.escudo) * math.min(1, dt * 12)
			if hombro and hombro:IsA("Motor6D") and (d.golpeT > 0 or d.escudo > 0.01) then
				local a = math.sin((1 - d.golpeT / 0.3) * math.pi) * (d.golpeT > 0 and 1 or 0)
				local r6 = hombro.Name == "Right Shoulder"
				local extra = r6 and CFrame.Angles(0.15 * a, 0, a * 1.7 + d.escudo * 1.2)
					or CFrame.Angles(a * 1.7 + d.escudo * 1.2, -0.25 * a + d.escudo * 0.5, 0)
				hombro.Transform = hombro.Transform * extra
			end
			local mano = ch and (ch:FindFirstChild("RightHand") or ch:FindFirstChild("Right Arm"))
			local hum = ch and ch:FindFirstChildOfClass("Humanoid")
			local id = plr:GetAttribute("EnMano")
			if not mano or not hum or hum.Health <= 0 or (plr == jugador and not esTercera()) or (ch and ch:GetAttribute("Invisible")) then
				id = nil
			end
			if id ~= d.id then
				d.id = id
				d.pedido += 1
				local yo = d.pedido
				if d.inst then
					Modelos.quitar(d.inst)
					d.inst = nil
				end
				if id then
					task.spawn(function()
						local inst = Modelos.crear(id, BL[id] and 0.28 or 0.5)
						if inst and d.pedido == yo then
							d.inst = inst
							Modelos.sombra(inst, true)
							inst.m.Parent = carpeta
						elseif inst then
							Modelos.quitar(inst)
						end
					end)
				end
			end
			if d.inst then
				Modelos.brillo(d.inst, plr:GetAttribute("EnManoEnc") == true)
			end
			if d.inst and mano then
				-- R15 (RightHand) o R6 (Right Arm): el objeto en el puño, hacia delante
				local agarre = mano.Name == "RightHand" and CFrame.new(0, -0.15, -0.35) or CFrame.new(0, -1, -0.35)
				local giro = d.inst.tipo == "bloque" and CFrame.Angles(0, math.rad(45), 0)
					or (CFrame.Angles(0, math.rad(90), 0) * CFrame.Angles(0, 0, math.rad(-45)) * CFrame.new(0.35, 0.35, 0))
				Modelos.colocar(d.inst, mano.CFrame * agarre * giro)
			end
		end
		for plr, d in porJugador do
			if not plr.Parent then
				Modelos.quitar(d.inst)
				porJugador[plr] = nil
			end
		end
	end)
end

return Modelos
