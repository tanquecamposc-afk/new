--[[
	Blockverse para Roblox · Iconos (cliente)
	· Los 778 iconos del juego web (cubos isométricos de 48 px para los
	  bloques y dibujos de 16 px para los objetos) en dos hojas de 1024 px.
	· Los iconos del HUD (corazones, comida, armadura y burbujas) con el
	  mismo pixel art que el juego web.
	· Las grietas al picar (las mismas 10 fases que texGrietas).
	Si Roblox no deja crear imágenes editables, se usa un cuadro de color
	con las iniciales del objeto.
]]
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Comp = ReplicatedStorage:WaitForChild("Blockverse")
local Codec = require(Comp:WaitForChild("Codec"))
local Ruido = require(Comp:WaitForChild("Ruido"))
local Registro = require(Comp:WaitForChild("Registro"))
local Imagenes = require(script.Parent:WaitForChild("Imagenes"))

local Iconos = {}

local CEL = 48
local HOJA = 1024
local POR_FILA = HOJA // CEL -- 21
local POR_HOJA = POR_FILA * POR_FILA

local hojas = {} -- índice -> EditableImage
local pxIconos, indiceIconos -- píxeles originales (para los modelos 3D de los objetos)
local sitio = {} -- id -> {hoja, x, y}
local colorMedio = {} -- id -> Color3
local listo = false

-- Prepara las hojas de iconos (se llama una vez al empezar)
function Iconos.preparar()
	if listo then
		return
	end
	listo = true
	local Datos = require(Comp.Datos:WaitForChild("Iconos"))
	local px = Codec.leer(Datos.datos, Datos.tam)
	pxIconos, indiceIconos = px, Datos.indice
	local ids = {}
	for id in Datos.indice do
		table.insert(ids, id)
	end
	table.sort(ids)
	local buffers = {}
	for k, id in ids do
		local h = (k - 1) // POR_HOJA + 1
		local c = (k - 1) % POR_HOJA
		local x, y = (c % POR_FILA) * CEL, (c // POR_FILA) * CEL
		local e = Datos.indice[id]
		local ofs, w, hh = e[1], e[2], e[3]
		buffers[h] = buffers[h] or buffer.create(HOJA * HOJA * 4)
		local esc = CEL // math.max(w, hh)
		local ox, oy = x + (CEL - w * esc) // 2, y + (CEL - hh * esc) // 2
		Imagenes.pegar(buffers[h], HOJA, ox, oy, px, ofs, w, hh, esc)
		sitio[id] = { h, x, y }
		-- Color medio (para el modo de respaldo y las partículas)
		local r, g, b, n = 0, 0, 0, 0
		for i = 0, w * hh - 1, 3 do
			local o = ofs + i * 4
			if buffer.readu8(px, o + 3) > 128 then
				r += buffer.readu8(px, o)
				g += buffer.readu8(px, o + 1)
				b += buffer.readu8(px, o + 2)
				n += 1
			end
		end
		n = math.max(n, 1)
		colorMedio[id] = Color3.fromRGB(r / n, g / n, b / n)
	end
	-- Objetos propios de Roblox (Bed Wars): usan el icono de otro objeto
	for id, o in Registro.objetos do
		if o.icono and sitio[o.icono] and not sitio[id] then
			sitio[id] = sitio[o.icono]
			colorMedio[id] = colorMedio[o.icono]
		end
	end
	for h, buf in buffers do
		hojas[h] = Imagenes.crear(HOJA, HOJA, buf)
		task.wait()
	end
end

-- Píxeles RGBA del icono de `id`: buffer, desplazamiento, ancho y alto (o nil)
function Iconos.pixeles(id)
	if not indiceIconos then
		return nil
	end
	local e = indiceIconos[id]
	if not e then
		local o = Registro.objetos[id]
		e = o and o.icono and indiceIconos[o.icono]
	end
	if not e then
		return nil
	end
	return pxIconos, e[1], e[2], e[3]
end

function Iconos.color(id)
	return colorMedio[id] or Color3.fromRGB(150, 150, 150)
end

-- Pone el icono del objeto `id` en un ImageLabel (nil o 0 lo vacía)
function Iconos.poner(etiqueta, id)
	local s = id and sitio[id]
	local ini = etiqueta:FindFirstChild("Iniciales")
	if not s then
		etiqueta.ImageTransparency = 1
		if ini then
			ini.Visible = false
		end
		etiqueta.BackgroundTransparency = 1
		return
	end
	local img = hojas[s[1]]
	if img and Imagenes.enEtiqueta(etiqueta, img) then
		etiqueta.ImageRectOffset = Vector2.new(s[2], s[3])
		etiqueta.ImageRectSize = Vector2.new(CEL, CEL)
		etiqueta.ImageTransparency = 0
		etiqueta.BackgroundTransparency = 1
		if ini then
			ini.Visible = false
		end
		return
	end
	-- Respaldo: cuadro de color con las iniciales
	etiqueta.ImageTransparency = 1
	etiqueta.BackgroundTransparency = 0
	etiqueta.BackgroundColor3 = Iconos.color(id)
	if not ini then
		ini = Instance.new("TextLabel")
		ini.Name = "Iniciales"
		ini.BackgroundTransparency = 1
		ini.Size = UDim2.fromScale(1, 1)
		ini.Font = require(Comp:WaitForChild("Fuentes")).CABECERA
		ini.TextScaled = true
		ini.TextColor3 = Color3.new(1, 1, 1)
		ini.TextStrokeTransparency = 0.3
		ini.Parent = etiqueta
	end
	ini.Visible = true
	ini.Text = string.sub(Registro.nombre(id), 1, 2)
end

------------------------------------------------------------------
-- Iconos del HUD (igual que iconoEstado / tresIconos del juego web)
------------------------------------------------------------------
local P_CORAZON = { ".kk...kk.", "krrk.krrk", "krwrkrrrk", "krrrrrrrk", "krrrrrrrk", ".krrrrrk.", "..krrrk..", "...krk...", "....k...." }
local P_COMIDA = { "....kkk..", "...kbbbk.", "..kbbbbbk", "..kbbbbbk", "..kbbbbk.", ".kkkkkk..", "kwk......", "kwk......", ".k......." }
local P_ARMADURA = { "kk.....kk", "kbbk.kbbk", "kbbbkbbbk", ".kbbbbbk.", ".kbbbbbk.", ".kbwbbbk.", ".kbbbbbk.", ".kbbbbbk.", "..kkkkk.." }
local P_BURBUJA = { ".........", "..kkkk...", ".kwwbbk..", ".kwbbbk..", ".kbbbbk..", ".kbbbbk..", "..kkkk...", ".........", "........." }

local function hex(s)
	local n = tonumber(string.sub(s, 2), 16)
	return { n // 65536, (n // 256) % 256, n % 256 }
end

-- Hoja del HUD: 9 px por icono ampliado x4 (36 px), una fila por tipo
local ESC_HUD = 4
local LADO = 9 * ESC_HUD
local hudImg
local hudSitio = {}
local HUD_TIPOS = {
	{ "vida", P_CORAZON, "#e0202c", "#ffc8c8" },
	{ "veneno", P_CORAZON, "#8a9a2a", "#d8e8a0" },
	{ "wither", P_CORAZON, "#2a2a2a", "#6a6a6a" },
	{ "comida", P_COMIDA, "#b8703a", "#f0f0e8" },
	{ "hambre", P_COMIDA, "#6a8a3a", "#d0e0a0" },
	{ "armadura", P_ARMADURA, "#c8c8d0", "#ffffff" },
}

local function prepararHud()
	local W = LADO * 3
	local H = LADO * (#HUD_TIPOS + 1)
	local buf = buffer.create(W * H * 4)
	local function punto(x, y, c)
		for ey = 0, ESC_HUD - 1 do
			for ex = 0, ESC_HUD - 1 do
				local o = ((y * ESC_HUD + ey) * W + x * ESC_HUD + ex) * 4
				buffer.writeu8(buf, o, c[1])
				buffer.writeu8(buf, o + 1, c[2])
				buffer.writeu8(buf, o + 2, c[3])
				buffer.writeu8(buf, o + 3, 255)
			end
		end
	end
	local vacio, borde = hex("#3a3434"), hex("#141010")
	for fila, t in HUD_TIPOS do
		local nombre, p, lleno, brillo = t[1], t[2], hex(t[3]), hex(t[4])
		for m, modo in { "lleno", "medio", "vacio" } do
			local ox, oy = (m - 1) * 9, (fila - 1) * 9
			for y, linea in p do
				for i = 1, #linea do
					local ch = string.sub(linea, i, i)
					if ch ~= "." then
						local c
						if ch == "k" then
							c = borde
						else
							local on = modo == "lleno" or (modo == "medio" and i - 1 <= 4)
							c = on and (ch == "w" and brillo or lleno) or vacio
						end
						punto(ox + i - 1, oy + y - 1, c)
					end
				end
			end
			hudSitio[nombre .. "_" .. modo] = Vector2.new(ox * ESC_HUD, oy * ESC_HUD)
		end
	end
	-- Burbuja
	local oy = #HUD_TIPOS * 9
	for y, linea in P_BURBUJA do
		for i = 1, #linea do
			local ch = string.sub(linea, i, i)
			if ch ~= "." then
				punto(i - 1, oy + y - 1, ch == "k" and hex("#1c3a6a") or ch == "w" and { 255, 255, 255 } or hex("#6ab0ff"))
			end
		end
	end
	hudSitio.burbuja = Vector2.new(0, oy * ESC_HUD)
	hudImg = Imagenes.crear(W, H, buf)
end

-- Pone un icono del HUD (p. ej. "vida_lleno") en un ImageLabel; devuelve false si no hay imágenes
function Iconos.hud(etiqueta, nombre)
	if hudImg == nil and Imagenes.disponible then
		prepararHud()
	end
	local s = hudSitio[nombre]
	if not hudImg or not s then
		return false
	end
	if etiqueta:GetAttribute("hud") ~= nombre then
		etiqueta:SetAttribute("hud", nombre)
		Imagenes.enEtiqueta(etiqueta, hudImg)
		etiqueta.ImageRectOffset = s
		etiqueta.ImageRectSize = Vector2.new(LADO, LADO)
	end
	return true
end

------------------------------------------------------------------
-- Grietas al picar (texGrietas del juego web: 10 fases de 16 px)
------------------------------------------------------------------
local grietas
function Iconos.grietas()
	if grietas ~= nil then
		return grietas or nil
	end
	grietas = false
	local r = Ruido.mulberry32(7)
	local segs = {}
	for _ = 1, 5 do
		local x, y = 7 + r() * 2, 7 + r() * 2
		for _ = 1, 8 do
			local a = r() * math.pi * 2
			local nx, ny = math.clamp(x + math.cos(a) * 2.4, 0, 15), math.clamp(y + math.sin(a) * 2.4, 0, 15)
			table.insert(segs, { x, y, nx, ny })
			x, y = nx, ny
		end
	end
	local ESC = 4
	local lista = {}
	for e = 0, 9 do
		local buf = buffer.create(64 * 64 * 4)
		local n = math.ceil(#segs * (e + 1) / 10)
		for i = 1, n do
			local x0, y0, x1, y1 = segs[i][1], segs[i][2], segs[i][3], segs[i][4]
			local m = math.max(math.abs(x1 - x0), math.abs(y1 - y0), 1)
			for t = 0, math.floor(m) do
				local px = math.clamp(math.floor(x0 + (x1 - x0) * t / m + 0.5), 0, 15)
				local py = math.clamp(math.floor(y0 + (y1 - y0) * t / m + 0.5), 0, 15)
				for ey = 0, ESC - 1 do
					for ex = 0, ESC - 1 do
						buffer.writeu32(buf, ((py * ESC + ey) * 64 + px * ESC + ex) * 4, 0xBF000000)
					end
				end
			end
		end
		local img = Imagenes.crear(64, 64, buf)
		if not img then
			return nil
		end
		lista[e + 1] = img
	end
	grietas = lista
	return lista
end

return Iconos
