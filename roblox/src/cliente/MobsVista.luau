--[[
	Blockverse para Roblox · Criaturas (cliente)
	Viste las piezas invisibles de workspace.Criaturas con los modelos del
	juego web: la misma geometría y las mismas texturas pintadas (exportadas
	de modeloMob), con la animación de mobs.js:
	· Patas y brazos que se balancean al andar, brazos al frente de los
	  zombis, golpe al atacar y cabeza que mira al jugador.
	· Destello rojo al recibir daño, parpadeo blanco del creeper al ir a
	  explotar (y se hincha), slimes que se aplastan al saltar, criaturas
	  en llamas, caída de lado al morir y crías a la mitad de tamaño.
	Si no se pueden crear mallas editables, se usa una caja del color medio.
]]
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local AssetService = game:GetService("AssetService")
local RunService = game:GetService("RunService")
local Players = game:GetService("Players")

local Comp = ReplicatedStorage:WaitForChild("Blockverse")
local Config = require(Comp:WaitForChild("Config"))
local Codec = require(Comp:WaitForChild("Codec"))
local Imagenes = require(script.Parent:WaitForChild("Imagenes"))

local BS = Config.BLOQUE
local Datos -- Datos.Mobs (se carga al empezar)
local geo -- buffer con la geometría
local texPx -- buffer con las texturas

local MobsVista = {}
MobsVista.disponible = true

local carpeta = Instance.new("Folder")
carpeta.Name = "CriaturasVisibles"
carpeta.Parent = workspace

------------------------------------------------------------------
-- Texturas (una imagen editable por textura, ampliada para que se vea nítida)
------------------------------------------------------------------
local imagenes = {}
local coloresTex = {}
local function imagenTex(t)
	if imagenes[t] ~= nil then
		return imagenes[t] or nil
	end
	imagenes[t] = false
	local e = Datos.texturas[t]
	if not e then
		return nil
	end
	local ofs, w, h = e[1], e[2], e[3]
	local esc = math.clamp(128 // math.max(w, h), 1, 8)
	local W, H = w * esc, h * esc
	local buf = buffer.create(W * H * 4)
	Imagenes.pegar(buf, W, 0, 0, texPx, ofs, w, h, esc)
	local img = Imagenes.crear(W, H, buf)
	imagenes[t] = img or false
	return img
end

local function colorTex(t)
	if coloresTex[t] then
		return coloresTex[t]
	end
	local e = Datos.texturas[t]
	local r, g, b, n = 0, 0, 0, 0
	if e then
		for i = 0, e[2] * e[3] - 1 do
			local o = e[1] + i * 4
			if buffer.readu8(texPx, o + 3) > 128 then
				r += buffer.readu8(texPx, o)
				g += buffer.readu8(texPx, o + 1)
				b += buffer.readu8(texPx, o + 2)
				n += 1
			end
		end
	end
	n = math.max(n, 1)
	local c = Color3.fromRGB(r / n, g / n, b / n)
	coloresTex[t] = c
	return c
end

local function colorHex(n)
	return Color3.fromRGB(n // 65536, (n // 256) % 256, n % 256)
end

------------------------------------------------------------------
-- Plantillas: una pieza de malla por cada malla de cada grupo
------------------------------------------------------------------
-- Matriz de THREE (por columnas) -> CFrame sin escala y escala por eje
local function matriz(m)
	local sx = Vector3.new(m[1], m[2], m[3]).Magnitude
	local sy = Vector3.new(m[5], m[6], m[7]).Magnitude
	local sz = Vector3.new(m[9], m[10], m[11]).Magnitude
	sx, sy, sz = sx > 0 and sx or 1, sy > 0 and sy or 1, sz > 0 and sz or 1
	local cf = CFrame.new(m[13] * BS, m[14] * BS, m[15] * BS,
		m[1] / sx, m[5] / sy, m[9] / sz,
		m[2] / sx, m[6] / sy, m[10] / sz,
		m[3] / sx, m[7] / sy, m[11] / sz)
	return cf, Vector3.new(sx, sy, sz)
end

local function crearMalla(o, escala, conUV)
	local nv = buffer.readu16(geo, o)
	local ni = buffer.readu16(geo, o + 2)
	local pP = o + 4
	local pU = pP + nv * 12
	local pI = pU + (conUV and nv * 8 or 0)
	local pos = table.create(nv)
	local mn = Vector3.new(math.huge, math.huge, math.huge)
	local mx = -mn
	for i = 0, nv - 1 do
		local v = Vector3.new(buffer.readf32(geo, pP + i * 12), buffer.readf32(geo, pP + i * 12 + 4), buffer.readf32(geo, pP + i * 12 + 8)) * escala * BS
		pos[i + 1] = v
		mn = mn:Min(v)
		mx = mx:Max(v)
	end
	local centro = (mn + mx) / 2
	local em
	local ok, err = pcall(function()
		em = AssetService:CreateEditableMesh()
		local ids = table.create(nv)
		local uvs = table.create(nv)
		for i = 1, nv do
			ids[i] = em:AddVertex(pos[i] - centro)
			if conUV then
				local u = buffer.readf32(geo, pU + (i - 1) * 8)
				local v = buffer.readf32(geo, pU + (i - 1) * 8 + 4)
				uvs[i] = em:AddUV(Vector2.new(u, 1 - v))
			end
		end
		for k = 0, ni - 3, 3 do
			local a = buffer.readu16(geo, pI + k * 2) + 1
			local b = buffer.readu16(geo, pI + k * 2 + 2) + 1
			local c = buffer.readu16(geo, pI + k * 2 + 4) + 1
			local f = em:AddTriangle(ids[a], ids[b], ids[c])
			if conUV then
				em:SetFaceUVs(f, { uvs[a], uvs[b], uvs[c] })
			end
		end
	end)
	if not ok then
		warn("[Blockverse] Malla de criatura: " .. tostring(err))
		return nil
	end
	local parte
	local ok2, err2 = pcall(function()
		parte = AssetService:CreateMeshPartAsync(Content.fromObject(em), { CollisionFidelity = Enum.CollisionFidelity.Box })
	end)
	if not ok2 or not parte then
		warn("[Blockverse] Pieza de criatura: " .. tostring(err2))
		return nil
	end
	local tam = mx - mn
	parte.Size = Vector3.new(math.max(tam.X, 0.01), math.max(tam.Y, 0.01), math.max(tam.Z, 0.01))
	return parte, centro
end

local plantillas = {} -- tipo -> {grupos = {{tipo, i, s, cf, piezas = {{parte, centro}}}}} o false
local creando = {}

local function plantilla(tipo)
	if plantillas[tipo] ~= nil then
		return plantillas[tipo] or nil
	end
	if creando[tipo] then
		return nil
	end
	creando[tipo] = true
	local modelo = Datos.modelos[tipo]
	if not modelo then
		plantillas[tipo] = false
		return nil
	end
	local res = { grupos = {} }
	local fallo = false
	for _, g in modelo do
		local cf, esc = matriz(g.m)
		local G = { tipo = g.tipo, i = g.i, s = g.s, cf = cf, piezas = {} }
		for _, ml in g.mallas do
			local parte, centro
			if MobsVista.disponible then
				parte, centro = crearMalla(ml.o, esc, ml.t ~= nil)
				if not parte then
					MobsVista.disponible = false
				end
			end
			if parte then
				parte.Anchored = true
				parte.CanCollide = false
				parte.CanQuery = false
				parte.CanTouch = false
				parte.CastShadow = true
				parte.Material = Enum.Material.SmoothPlastic
				if ml.t then
					parte.Color = Color3.new(1, 1, 1)
					local img = imagenTex(ml.t)
					if not Imagenes.enMalla(parte, img) then
						parte.Color = colorTex(ml.t)
					end
				else
					parte.Color = colorHex(ml.col or 0xffffff)
				end
				if ml.emis and ml.emis > 0 then
					parte.Material = Enum.Material.Neon
					parte.Color = colorHex(ml.emis)
				end
				if ml.op then
					parte.Transparency = 1 - ml.op
				end
				table.insert(G.piezas, { parte = parte, centro = centro })
			else
				fallo = true
			end
		end
		table.insert(res.grupos, G)
	end
	creando[tipo] = nil
	if fallo and #res.grupos > 0 and #res.grupos[1].piezas == 0 then
		plantillas[tipo] = false
		return nil
	end
	plantillas[tipo] = res
	return res
end

------------------------------------------------------------------
-- Una criatura visible por cada pieza del servidor
------------------------------------------------------------------
local vistas = {} -- pieza -> vista

local function cajaRespaldo(pieza)
	local c = Instance.new("Part")
	c.Anchored = true
	c.CanCollide = false
	c.CanQuery = false
	c.CanTouch = false
	c.Size = pieza.Size
	c.Material = Enum.Material.SmoothPlastic
	local tipo = pieza:GetAttribute("Mob")
	local modelo = Datos.modelos[tipo]
	local col = Color3.fromRGB(120, 160, 90)
	if modelo and modelo[1] and modelo[1].mallas[1] then
		local ml = modelo[1].mallas[1]
		col = ml.t and colorTex(ml.t) or colorHex(ml.col or 0xffffff)
	end
	for _, g in modelo or {} do
		if g.tipo == "cuerpo" and g.mallas[1] then
			local ml = g.mallas[1]
			col = ml.t and colorTex(ml.t) or colorHex(ml.col or 0xffffff)
		end
	end
	c.Color = col
	return c
end

local function nuevaVista(pieza)
	local tipo = pieza:GetAttribute("Mob")
	local def = Datos.defs[tipo]
	if not tipo or not def then
		return
	end
	local v = {
		pieza = pieza, tipo = tipo, def = def, fase = 0, golpeT = 0, flash = 0, muerteT = 0,
		cf = pieza.CFrame, pos = pieza.Position, cabY = 0, cabX = 0, salto = 0, anterior = pieza.Position,
	}
	local modelo = Instance.new("Model")
	modelo.Name = tipo
	v.modelo = modelo
	local P = plantilla(tipo)
	if P then
		v.grupos = {}
		for _, G in P.grupos do
			local gv = { tipo = G.tipo, i = G.i, s = G.s, cf = G.cf, piezas = {} }
			for _, pz in G.piezas do
				local c = pz.parte:Clone()
				c.Parent = modelo
				table.insert(gv.piezas, { parte = c, centro = pz.centro, tam = pz.parte.Size })
			end
			table.insert(v.grupos, gv)
		end
	else
		v.caja = cajaRespaldo(pieza)
		v.caja.Parent = modelo
	end
	local hl = Instance.new("Highlight")
	hl.Enabled = false
	hl.FillColor = Color3.fromRGB(255, 40, 40)
	hl.FillTransparency = 0.45
	hl.OutlineTransparency = 1
	hl.DepthMode = Enum.HighlightDepthMode.Occluded
	hl.Parent = modelo
	v.resalte = hl
	modelo.Parent = carpeta
	v.conexiones = {
		pieza:GetAttributeChangedSignal("golpe"):Connect(function()
			v.flash = 0.35
		end),
		pieza:GetAttributeChangedSignal("ataca"):Connect(function()
			v.golpeT = 0.35
		end),
		pieza:GetAttributeChangedSignal("dispara"):Connect(function()
			v.golpeT = 0.35
		end),
		pieza:GetAttributeChangedSignal("salto"):Connect(function()
			v.salto = 0.4
		end),
		pieza:GetAttributeChangedSignal("tele"):Connect(function()
			if MobsVista.alParticulas then
				MobsVista.alParticulas(v.pos, Color3.fromRGB(180, 60, 220), 14)
			end
		end),
	}
	if def.tipo == "hostil" or tipo == "golem" then
		v.sonidoT = 4 + math.random() * 8
	end
	vistas[pieza] = v
	return v
end

local function quitarVista(pieza)
	local v = vistas[pieza]
	if not v then
		return
	end
	vistas[pieza] = nil
	for _, c in v.conexiones do
		c:Disconnect()
	end
	v.modelo:Destroy()
end

------------------------------------------------------------------
-- Animación (como actualizarMob de mobs.js)
------------------------------------------------------------------
local jugador = Players.LocalPlayer
local tiempo = 0

local function animar(v, dt)
	local pieza = v.pieza
	local muerto = pieza:GetAttribute("muerto") == true
	-- Seguir a la pieza del servidor con suavidad
	local a = 1 - math.exp(-dt * 14)
	v.pos = v.pos:Lerp(pieza.Position, a)
	local rotObj = pieza.CFrame.Rotation
	v.rot = v.rot and v.rot:Lerp(rotObj, a) or rotObj
	local vel = (v.pos - v.anterior) / math.max(dt, 1e-3) / BS
	v.anterior = v.pos
	local sp = math.min(Vector3.new(vel.X, 0, vel.Z).Magnitude, 6)
	v.fase += sp * dt * 3.2
	local amp = math.sin(v.fase) * math.min(1, sp) * 0.7
	v.golpeT = math.max(0, v.golpeT - dt)
	local golpe = math.sin(math.min(1, v.golpeT / 0.35) * math.pi) * 0.9
	local tipo = v.tipo
	local persigue = pieza:GetAttribute("persigue") == true
	local brazosArriba = tipo == "zombi" or tipo == "ahogado" or tipo == "husk" or tipo == "zombiAldeano"
		or (tipo == "esqueleto" and persigue) or ((tipo == "piglin" or tipo == "enderman") and persigue)
	-- Escala: crías, slimes de varios tamaños
	local altoDef = (v.def.alto or 1) * BS
	local esc = math.max(0.2, pieza.Size.Y / math.max(altoDef, 0.01))
	if pieza:GetAttribute("bebe") then
		esc = 0.5
	end
	if pieza:GetAttribute("tam") then
		esc = pieza.Size.Y / math.max(altoDef, 0.01)
	end
	local sx, sy = 1, 1
	local mecha = pieza:GetAttribute("mecha") or 0
	if tipo == "creeper" and mecha > 0 then
		sx, sy = 1 + mecha * 0.12, 1 + mecha * 0.05
	end
	if v.salto > 0 then
		v.salto -= dt
		local sq = 1 + math.sin(v.salto / 0.4 * math.pi) * 0.15
		sx, sy = 2 - sq, sq
	end
	-- Cabeza mirando al jugador
	local ry, rx = 0, 0
	local ch = jugador.Character
	local cab = ch and ch:FindFirstChild("Head")
	if cab and not muerto then
		local d = (cab.Position - v.pos) / BS
		local dist = Vector3.new(d.X, 0, d.Z).Magnitude
		if dist < 10 then
			-- Ángulos medidos como en el juego web: atan2(x, z) desde donde mira la criatura
			local look = v.rot.LookVector
			local yaw = math.atan2(look.X, look.Z)
			local rel = ((math.atan2(d.X, d.Z) - yaw + math.pi * 3) % (math.pi * 2)) - math.pi
			ry = math.clamp(rel, -1.1, 1.1)
			rx = math.clamp(-math.atan2(d.Y - (v.def.alto or 1) * 0.4, dist), -0.6, 0.6)
		end
	end
	v.cabY += (ry - v.cabY) * math.min(1, dt * 6)
	v.cabX += (rx - v.cabX) * math.min(1, dt * 6)
	-- Base del modelo: los pies, girado como en el juego web (el modelo mira a +z)
	local alto = pieza.Size.Y
	local base = CFrame.new(v.pos - Vector3.new(0, alto / 2, 0)) * v.rot * CFrame.Angles(0, math.pi, 0)
	if tipo == "ghast" or tipo == "blaze" then
		base *= CFrame.new(0, math.sin(tiempo * 2) * 0.1 * BS, 0)
	end
	if muerto then
		v.muerteT = math.min(1, v.muerteT + dt * 2.5)
		base *= CFrame.Angles(0, 0, v.muerteT * math.pi / 2)
	end
	if v.grupos then
		for _, g in v.grupos do
			local rot = CFrame.identity
			if g.tipo == "pierna" then
				if tipo == "ghast" then
					rot = CFrame.Angles(math.sin(tiempo * 2 + g.s) * 0.2, 0, 0)
				else
					rot = CFrame.Angles(amp * g.s, 0, 0)
				end
			elseif g.tipo == "brazo" then
				if tipo == "gallina" then
					rot = CFrame.Angles(0, 0, g.s * (sp > 0.1 and 0 or math.sin(tiempo * 30) * 0.6))
				else
					rot = CFrame.Angles((brazosArriba and -math.pi / 2 or 0) + amp * 0.3 * g.s - golpe, 0, 0)
				end
			elseif g.tipo == "cabeza" and tipo ~= "ghast" and tipo ~= "blaze" then
				rot = CFrame.Angles(v.cabX, v.cabY, 0)
			end
			local gcf = g.cf
			local gpos = gcf.Position
			local escalado = CFrame.new(gpos.X * esc * sx, gpos.Y * esc * sy, gpos.Z * esc * sx) * gcf.Rotation
			local cfG = base * escalado * rot
			for _, pz in g.piezas do
				local c = pz.centro
				pz.parte.CFrame = cfG * CFrame.new(c.X * esc * sx, c.Y * esc * sy, c.Z * esc * sx)
				local t = pz.tam
				local nuevo = Vector3.new(t.X * esc * sx, t.Y * esc * sy, t.Z * esc * sx)
				if (pz.ultimoTam or Vector3.zero) ~= nuevo then
					pz.ultimoTam = nuevo
					pz.parte.Size = nuevo
				end
			end
		end
	elseif v.caja then
		v.caja.Size = pieza.Size
		v.caja.CFrame = base * CFrame.new(0, alto / 2, 0)
	end
	-- Destello rojo al recibir daño y blanco del creeper
	v.flash = math.max(0, v.flash - dt)
	local blanco = mecha > 0 and math.floor(mecha * 6) % 2 == 0
	if v.flash > 0 or muerto then
		v.resalte.FillColor = Color3.fromRGB(255, 40, 40)
		v.resalte.Enabled = true
	elseif blanco then
		v.resalte.FillColor = Color3.new(1, 1, 1)
		v.resalte.Enabled = true
	else
		v.resalte.Enabled = false
	end
	-- Fuego
	if pieza:GetAttribute("fuego") and MobsVista.alParticulas and math.random() < dt * 12 then
		MobsVista.alParticulas(v.pos + Vector3.new(0, (math.random() - 0.5) * alto, 0), Color3.fromRGB(255, 128, 32), 1)
	end
	-- Sonidos de ambiente
	if v.sonidoT and MobsVista.alSonido then
		v.sonidoT -= dt
		if v.sonidoT <= 0 then
			v.sonidoT = 6 + math.random() * 12
			MobsVista.alSonido(v.def.sonido or tipo, v.pos)
		end
	end
end

function MobsVista.iniciar()
	Datos = require(Comp.Datos:WaitForChild("Mobs"))
	geo = Codec.leer(Datos.datosGeo, Datos.tamGeo)
	texPx = Codec.leer(Datos.datosTex, Datos.tamTex)
	local criaturas = workspace:WaitForChild("Criaturas")
	local pendientes = {}
	local function alAgregar(p)
		if p:IsA("BasePart") then
			table.insert(pendientes, p)
		end
	end
	for _, p in criaturas:GetChildren() do
		alAgregar(p)
	end
	criaturas.ChildAdded:Connect(alAgregar)
	criaturas.ChildRemoved:Connect(quitarVista)
	-- Las plantillas se crean fuera del bucle de fotogramas (CreateMeshPartAsync espera)
	task.spawn(function()
		while true do
			local p = table.remove(pendientes, 1)
			if p then
				if p.Parent and not vistas[p] then
					local ok, err = pcall(nuevaVista, p)
					if not ok then
						warn("[Blockverse] Vista de criatura: " .. tostring(err))
					end
				end
			else
				task.wait(0.1)
			end
		end
	end)
	RunService.RenderStepped:Connect(function(dt)
		tiempo += dt
		local cam = workspace.CurrentCamera
		local cpos = cam and cam.CFrame.Position or Vector3.zero
		for pieza, v in vistas do
			if not pieza.Parent then
				quitarVista(pieza)
			elseif (pieza.Position - cpos).Magnitude < 260 then
				animar(v, dt)
				v.lejos = false
			elseif not v.lejos then
				v.lejos = true
				v.modelo:PivotTo(CFrame.new(0, -1000, 0))
			end
		end
	end)
end

-- Pieza del servidor a partir de una pieza visible (para apuntar a criaturas)
function MobsVista.lista()
	return vistas
end

return MobsVista
