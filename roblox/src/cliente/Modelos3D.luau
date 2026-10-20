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
					local x0, x1 = (x - w / 2) * s, (x + 1 - w / 2) * s
					local y1, y0 = (h / 2 - y) * s, (h / 2 - y - 1) * s
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
	parte.Size = Vector3.new(w * s, h * s, s)
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

function Modelos.disponible()
	return Render.modo == "malla" and Imagenes.disponible
end

------------------------------------------------------------------
-- La mano en primera persona
------------------------------------------------------------------
-- opc = {enMano = fn() -> id, visible = fn() -> bool, balanceo = fn() -> 0..1, conBalanceo = fn() -> bool}
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
	local function colorPiel()
		local ch = jugador.Character
		local bc = ch and ch:FindFirstChildOfClass("BodyColors")
		if bc then
			brazo.Color = bc.RightArmColor3
			manga.Color = bc.TorsoColor3
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
					local inst = Modelos.crear(id, BL[id] and 0.3 or 0.52)
					if inst and yo == pedido then
						sostenido = inst
						inst.m.Parent = carpeta
					elseif inst then
						Modelos.quitar(inst)
					end
				end)
			end
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
		local b = opc.balanceo()
		local golpe = math.sin(b * math.pi)
		local golpe2 = math.sin(math.sqrt(b) * math.pi)
		-- Al andar se mueve un poco
		local ch = jugador.Character
		local hum = ch and ch:FindFirstChildOfClass("Humanoid")
		local andar = hum and hum.MoveDirection.Magnitude > 0.1 and opc.conBalanceo()
		if andar then
			t += dt
		end
		local bx = andar and math.sin(t * 9) * 0.06 or 0
		local by = andar and -math.abs(math.cos(t * 9)) * 0.06 or 0
		local baja = cambioT / 0.25 * 0.9
		local base = cam.CFrame
			* CFrame.new(1.2 + bx - golpe2 * 0.3, -1.15 + by - baja + golpe2 * 0.25 - golpe * 0.2, -1.9 - golpe * 0.35)
			* CFrame.Angles(math.rad(14) - golpe * 0.9, math.rad(-10) + golpe2 * 0.35, math.rad(-6))
		brazo.CFrame = base * CFrame.new(0, 0, 0.55)
		manga.CFrame = base * CFrame.new(0, 0, 1.05)
		if sostenido then
			local giro
			if sostenido.tipo == "bloque" then
				giro = CFrame.new(-0.05, 0.4, -0.55) * CFrame.Angles(0, math.rad(45), 0)
			else
				-- El objeto plano visto de lado, con la punta hacia arriba y hacia delante
				giro = CFrame.new(-0.1, 0.55, -0.45) * CFrame.Angles(0, math.rad(-80), 0) * CFrame.Angles(0, 0, math.rad(-20))
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
	RunService.RenderStepped:Connect(function()
		for _, plr in Players:GetPlayers() do
			local d = porJugador[plr]
			if not d then
				d = { pedido = 0 }
				porJugador[plr] = d
			end
			local ch = plr.Character
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
							inst.m.Parent = carpeta
						elseif inst then
							Modelos.quitar(inst)
						end
					end)
				end
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
