--[[
	Blockverse para Roblox · Mundo (servidor)
	Guarda los bloques de cada chunk y crea las piezas que se ven.
	· Los datos se generan al acercarse un jugador y se quedan en memoria
	  (así los cambios de los jugadores no se pierden).
	· Las piezas se crean por capas y se reparten en varios fotogramas.
	· El agua es agua de Roblox (Terrain), así se puede nadar.
]]
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Comp = ReplicatedStorage:WaitForChild("Blockverse")
local Config = require(Comp.Config)
local Bloques = require(Comp.Bloques)
local Generador = require(Comp.Generador)
local Mallador = require(Comp.Mallador)

local B, C, ALTO = Config.BLOQUE, Config.CHUNK, Config.ALTO
local DEF = Bloques.porId
local TRANSP = Bloques.TRANSP
local SOLIDO = Bloques.SOLIDO
local ID = Bloques.porClave
local idx = Generador.idx
local hash = Generador.hash

local Mundo = {}
local datos = {} -- clave numérica -> buffer
local vistos = {} -- clave -> chunk dibujado
Mundo.vistos = vistos
local gen

local carpeta = Instance.new("Folder")
carpeta.Name = "Mundo"
carpeta.Parent = workspace
Mundo.carpeta = carpeta

local function clave(cx, cz)
	return (cx + 32768) * 65536 + (cz + 32768)
end
Mundo.clave = clave

function Mundo.iniciar(semilla)
	gen = Generador.new(semilla)
	Mundo.gen = gen
end

function Mundo.datos(cx, cz)
	local k = clave(cx, cz)
	local d = datos[k]
	if not d then
		d = buffer.create(C * C * ALTO)
		gen:llenar(d, cx, cz)
		datos[k] = d
	end
	return d
end

-- Bloque en coordenadas del mundo (con caché del último chunk consultado)
local ucx, ucz, ubuf = math.huge, math.huge, buffer.create(0)
function Mundo.get(x, y, z)
	if y < 0 then
		return ID.lecho
	end
	if y >= ALTO then
		return 0
	end
	local cx, cz = x // C, z // C
	if cx ~= ucx or cz ~= ucz then
		ucx, ucz, ubuf = cx, cz, Mundo.datos(cx, cz)
	end
	return buffer.readu8(ubuf, idx(x - cx * C, y, z - cz * C))
end
local get = Mundo.get

-- Altura del bloque sólido más alto de una columna (sin contar hojas)
function Mundo.alturaSuelo(x, z)
	for y = ALTO - 1, 0, -1 do
		local b = get(x, y, z)
		if b ~= 0 and SOLIDO[b] and b ~= ID.hojas and b ~= ID.hojasAbeto then
			return y
		end
	end
	return 0
end

-- ¿Le da el cielo a esta posición? (para los zombis al sol)
function Mundo.alCielo(x, y, z)
	for yy = y, ALTO - 1 do
		local b = get(x, yy, z)
		if b ~= 0 and not TRANSP[b] then
			return false
		end
	end
	return true
end

------------------------------------------------------------------
-- Piezas
------------------------------------------------------------------
local MATS = {}
local function material(nombre)
	local m = MATS[nombre]
	if m == nil then
		local ok, v = pcall(function()
			return (Enum.Material :: any)[nombre]
		end)
		m = ok and v or Enum.Material.SmoothPlastic
		MATS[nombre] = m
	end
	return m
end
local COLS = {}
local function color(t)
	local c = COLS[t]
	if not c then
		c = Color3.fromRGB(t[1], t[2], t[3])
		COLS[t] = c
	end
	return c
end
Mundo.color = color
Mundo.material = material

local function parte(tam, cf, col, mat, b, padre)
	local p = Instance.new("Part")
	p.Anchored = true
	p.TopSurface = Enum.SurfaceType.Smooth
	p.BottomSurface = Enum.SurfaceType.Smooth
	p.Size = tam
	p.CFrame = cf
	p.Color = col
	p.Material = mat
	p:SetAttribute("b", b)
	p.Parent = padre
	return p
end

local function luz(p, l)
	local L = Instance.new("PointLight")
	L.Brightness = l.brillo
	L.Range = l.rango
	L.Color = color(l.color)
	L.Shadows = true
	L.Parent = p
end

local function construirCapa(r, cx, cz, y)
	local viejas = r.capas[y]
	if viejas then
		for _, p in viejas do
			p:Destroy()
		end
		r.capas[y] = nil
	end
	local cajas, esp = Mallador.capa(get, cx, cz, y)
	if #cajas == 0 and #esp == 0 then
		return
	end
	local lista = {}
	local bx, bz = cx * C, cz * C
	local yc = (y + 0.5) * B
	for _, c in cajas do
		local b, lx, lz, w, l = c[1], c[2], c[3], c[4], c[5]
		local d = DEF[b]
		local an = d.ancho or 1
		local centro = CFrame.new((bx + lx + w / 2) * B, yc, (bz + lz + l / 2) * B)
		local p = parte(Vector3.new(w * B * an, B, l * B * an), centro, color(d.color), material(d.material), b, r.modelo)
		if d.transp then
			p.Transparency = d.transp
			p.CastShadow = false
		end
		if d.luz then
			luz(p, d.luz)
		end
		table.insert(lista, p)
		-- Capa de arriba (césped, nieve, anillos del tronco, tapa de la mesa)
		if d.capa then
			local tapada = false
			if d.capaArriba then
				for dz = 0, l - 1 do
					for dx = 0, w - 1 do
						local a = get(bx + lx + dx, y + 1, bz + lz + dz)
						if not TRANSP[a] then
							tapada = true
							break
						end
					end
					if tapada then
						break
					end
				end
			end
			if not tapada then
				local alto = d.capaArriba and 0.12 or 0.55
				local q = parte(
					Vector3.new(w * B + 0.06, alto, l * B + 0.06),
					centro + Vector3.new(0, B / 2 - alto / 2 + 0.03, 0),
					color(d.capa.color),
					material(d.capa.material),
					b,
					r.modelo
				)
				if d.capaArriba then
					q.Size = Vector3.new(w * B - 0.5, alto, l * B - 0.5)
				end
				table.insert(lista, q)
			end
		end
		-- Vetas de las menas: barras finas que asoman por las caras
		if d.veta then
			local vc = color(d.veta)
			for dz = 0, l - 1 do
				for dx = 0, w - 1 do
					local x, z = bx + lx + dx, bz + lz + dz
					local cb = Vector3.new((x + 0.5) * B, yc, (z + 0.5) * B)
					for eje = 1, 3 do
						local u = (hash(x, y, z, eje * 31) - 0.5) * 1.7
						local v = (hash(x, y, z, eje * 57) - 0.5) * 1.7
						local tam, off
						if eje == 1 then
							tam, off = Vector3.new(B + 0.06, 0.62, 0.62), Vector3.new(0, u, v)
						elseif eje == 2 then
							tam, off = Vector3.new(0.62, B + 0.06, 0.62), Vector3.new(u, 0, v)
						else
							tam, off = Vector3.new(0.62, 0.62, B + 0.06), Vector3.new(u, v, 0)
						end
						local q = parte(tam, CFrame.new(cb + off), vc, Enum.Material.SmoothPlastic, b, r.modelo)
						q.CanCollide = false
						q.CastShadow = false
						table.insert(lista, q)
					end
				end
			end
		end
	end
	-- Antorchas, flores y hierba
	for _, e in esp do
		local b, lx, lz = e[1], e[2], e[3]
		local d = DEF[b]
		local base = Vector3.new((bx + lx + 0.5) * B, y * B, (bz + lz + 0.5) * B)
		if d.forma == "antorcha" then
			local palo = parte(Vector3.new(0.36, 1.6, 0.36), CFrame.new(base + Vector3.new(0, 0.8, 0)), color(d.color), material(d.material), b, r.modelo)
			local cabeza = parte(Vector3.new(0.48, 0.48, 0.48), CFrame.new(base + Vector3.new(0, 1.8, 0)), Color3.fromRGB(255, 200, 90), Enum.Material.Neon, b, r.modelo)
			palo.CanCollide = false
			cabeza.CanCollide = false
			luz(cabeza, d.luz)
			local f = Instance.new("Fire")
			f.Size = 2
			f.Heat = 4
			f.Color = Color3.fromRGB(255, 150, 40)
			f.SecondaryColor = Color3.fromRGB(255, 230, 120)
			f.Parent = cabeza
			table.insert(lista, palo)
			table.insert(lista, cabeza)
		elseif d.forma == "flor" then
			local tallo = parte(Vector3.new(0.2, 1.3, 0.2), CFrame.new(base + Vector3.new(0, 0.65, 0)), Color3.fromRGB(70, 140, 50), Enum.Material.Grass, b, r.modelo)
			local flor = parte(Vector3.new(0.75, 0.45, 0.75), CFrame.new(base + Vector3.new(0, 1.45, 0)) * CFrame.Angles(0, math.rad(45), 0), color(d.color), material(d.material), b, r.modelo)
			tallo.CanCollide = false
			flor.CanCollide = false
			tallo.CastShadow = false
			table.insert(lista, tallo)
			table.insert(lista, flor)
		else -- hierba en cruz
			for k = 0, 1 do
				local h = parte(
					Vector3.new(2.3, 1.7, 0.08),
					CFrame.new(base + Vector3.new(0, 0.85, 0)) * CFrame.Angles(0, math.rad(45 + 90 * k), 0),
					color(d.color),
					material(d.material),
					b,
					r.modelo
				)
				h.CanCollide = false
				h.CastShadow = false
				table.insert(lista, h)
			end
		end
	end
	r.capas[y] = lista
end

-- Agua de Roblox (Terrain) en celdas de 4 studs: cada celda es agua si el
-- bloque que hay en su centro es agua
local function agua(cx, cz, llenar)
	local T = workspace.Terrain
	local NV = C * B // 4
	local vyMax = math.ceil((Config.NIVEL_MAR + 2) * B / 4)
	local x0, z0 = cx * C * B, cz * C * B
	local region = Region3.new(Vector3.new(x0, 0, z0), Vector3.new(x0 + C * B, vyMax * 4, z0 + C * B))
	local mats, occ = table.create(NV), table.create(NV)
	local hay = false
	for ix = 1, NV do
		local mx, ox = table.create(vyMax), table.create(vyMax)
		mats[ix], occ[ix] = mx, ox
		for iy = 1, vyMax do
			local my, oy = table.create(NV), table.create(NV)
			mx[iy], ox[iy] = my, oy
			for iz = 1, NV do
				local m, o = Enum.Material.Air, 0
				if llenar then
					local bx = math.floor((x0 + (ix - 0.5) * 4) / B)
					local by = math.floor(((iy - 0.5) * 4) / B)
					local bz = math.floor((z0 + (iz - 0.5) * 4) / B)
					if get(bx, by, bz) == ID.agua then
						m, o = Enum.Material.Water, 1
						hay = true
					end
				end
				my[iz], oy[iz] = m, o
			end
		end
	end
	if hay or not llenar then
		T:WriteVoxels(region, 4, mats, occ)
	end
end

------------------------------------------------------------------
-- Chunks dibujados
------------------------------------------------------------------
function Mundo.listo(cx, cz)
	local r = vistos[clave(cx, cz)]
	return r ~= nil and r.listo
end

-- Dibuja un chunk entero (repartido en varios fotogramas)
function Mundo.construir(cx, cz)
	local k = clave(cx, cz)
	if vistos[k] then
		return
	end
	for dx = -1, 1 do
		for dz = -1, 1 do
			Mundo.datos(cx + dx, cz + dz)
		end
	end
	local modelo = Instance.new("Folder")
	modelo.Name = cx .. "," .. cz
	local r = { modelo = modelo, capas = {}, listo = false, sucias = {} }
	vistos[k] = r
	-- La parte más alta del chunk (para no recorrer el aire de arriba)
	local d = datos[k]
	local tope = 0
	for i = C * C * ALTO - 1, 0, -1 do
		if buffer.readu8(d, i) ~= 0 then
			tope = i // (C * C) + 1
			break
		end
	end
	local t = os.clock()
	for y = 0, math.min(ALTO - 1, tope) do
		construirCapa(r, cx, cz, y)
		if os.clock() - t > 0.005 then
			task.wait()
			if r.quitado then
				modelo:Destroy()
				return
			end
			t = os.clock()
		end
	end
	agua(cx, cz, true)
	modelo.Parent = carpeta
	r.listo = true
	for y in r.sucias do
		construirCapa(r, cx, cz, y)
	end
	r.sucias = {}
end

function Mundo.quitar(cx, cz)
	local k = clave(cx, cz)
	local r = vistos[k]
	if not r then
		return
	end
	r.quitado = true
	vistos[k] = nil
	r.modelo:Destroy()
	if r.listo then
		agua(cx, cz, false)
	end
end

------------------------------------------------------------------
-- Cambiar un bloque
------------------------------------------------------------------
local function rehacer(cx, cz, y)
	if y < 0 or y >= ALTO then
		return
	end
	local r = vistos[clave(cx, cz)]
	if not r then
		return
	end
	if r.listo then
		construirCapa(r, cx, cz, y)
	else
		r.sucias[y] = true
	end
end

function Mundo.set(x, y, z, b)
	if y < 0 or y >= ALTO then
		return
	end
	local cx, cz = x // C, z // C
	local lx, lz = x - cx * C, z - cz * C
	local viejo = get(x, y, z)
	buffer.writeu8(Mundo.datos(cx, cz), idx(lx, y, lz), b)
	-- Un bloque sólido encima del césped lo convierte en tierra
	if b ~= 0 and SOLIDO[b] and y > 0 then
		local abajo = get(x, y - 1, z)
		if abajo == ID.cesped or abajo == ID.cespedNevado then
			buffer.writeu8(Mundo.datos(cx, cz), idx(lx, y - 1, lz), ID.tierra)
		end
	end
	rehacer(cx, cz, y)
	rehacer(cx, cz, y - 1)
	rehacer(cx, cz, y + 1)
	if lx == 0 then
		rehacer(cx - 1, cz, y)
	elseif lx == C - 1 then
		rehacer(cx + 1, cz, y)
	end
	if lz == 0 then
		rehacer(cx, cz - 1, y)
	elseif lz == C - 1 then
		rehacer(cx, cz + 1, y)
	end
	-- Si cambia el agua, se rehace el agua del chunk
	if viejo == ID.agua or b == ID.agua then
		local r = vistos[clave(cx, cz)]
		if r and r.listo then
			agua(cx, cz, true)
		end
	end
end

-- Al quitar un bloque junto al agua, el agua entra en el hueco
function Mundo.inundar(x, y, z)
	if get(x, y, z) ~= 0 then
		return
	end
	for _, o in { { 1, 0, 0 }, { -1, 0, 0 }, { 0, 0, 1 }, { 0, 0, -1 }, { 0, 1, 0 } } do
		if get(x + o[1], y + o[2], z + o[3]) == ID.agua then
			Mundo.set(x, y, z, ID.agua)
			return
		end
	end
end

-- ¿Hay un bloque de este tipo cerca? (para las recetas que piden mesa u horno)
function Mundo.hayCerca(pos, id, radio)
	local x0, y0, z0 = math.floor(pos.X / B), math.floor(pos.Y / B), math.floor(pos.Z / B)
	for y = y0 - radio, y0 + radio do
		for x = x0 - radio, x0 + radio do
			for z = z0 - radio, z0 + radio do
				if get(x, y, z) == id then
					return true
				end
			end
		end
	end
	return false
end

return Mundo
