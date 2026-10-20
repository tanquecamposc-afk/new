--!native
--!optimize 2
--[[
	Blockverse para Roblox · Render del mundo (cliente)
	Dibuja los chunks como en el juego web (malla.js):
	· Una malla por sección de 16 capas con las texturas pixeladas del
	  juego web (EditableMesh + EditableImage).
	· Oclusión ambiental en las esquinas, luz suave del cielo y de los
	  bloques, sombra por cara y tinte del césped y las hojas según el bioma.
	· Formas: cubos, losas, plantas en cruz, antorchas, cajas (escaleras,
	  puertas, cofres, camas…), vallas y muros que se conectan, raíles,
	  redstone, lava y portales. El agua es agua de Roblox.
	· Si Roblox no deja crear mallas editables, se dibuja con piezas de
	  colores (modo de respaldo).
	El trabajo se reparte en varios fotogramas, primero lo más cercano.
]]
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local AssetService = game:GetService("AssetService")
local RunService = game:GetService("RunService")

local Comp = ReplicatedStorage:WaitForChild("Blockverse")
local Config = require(Comp:WaitForChild("Config"))
local Registro = require(Comp:WaitForChild("Registro"))
local MundoDatos = require(Comp:WaitForChild("MundoDatos"))
local Codec = require(Comp:WaitForChild("Codec"))
local Generador = require(Comp:WaitForChild("Generador"))
local Texturas = require(Comp:WaitForChild("Datos"):WaitForChild("Texturas"))
local Biomas = require(Comp.Datos:WaitForChild("Biomas"))
local Luz = require(script.Parent:WaitForChild("Luz"))
local Imagenes = require(script.Parent:WaitForChild("Imagenes"))

local BS = Config.BLOQUE
local CX, CZ, CY = MundoDatos.CX, MundoDatos.CZ, MundoDatos.CY
local SEC = 16
local NSEC = CY // SEC
local BL = Registro.bloques
local B = Registro.B
local OPACO, SOLIDO, TRANS, FORMA, TINTE, OCLUYE = Registro.OPACO, Registro.SOLIDO, Registro.TRANS, Registro.FORMA, Registro.TINTE, Registro.OCLUYE
local esAgua, esLava, esLiquido = Registro.esAgua, Registro.esLava, Registro.esLiquido
local DIRF = Registro.DIRF
local floor, max, min = math.floor, math.max, math.min

local Render = {}
Render.modo = "malla" -- "malla" (texturas) o "piezas" (respaldo)
Render.chunks = {}

local carpeta = Instance.new("Folder")
carpeta.Name = "MundoVisible"
carpeta.Parent = workspace

------------------------------------------------------------------
-- Atlas de texturas
------------------------------------------------------------------
local TAM_ATLAS = 1024
local CELDA, POR_FILA = Texturas.CELDA, Texturas.POR_FILA
local tilesPx -- buffer con los tiles 16x16 RGBA en orden
local atlas = {} -- índice -> EditableImage
local UVT = {} -- tile web -> {atlas, u0, u1, vArriba, vAbajo, gris, alfa}
local COLOR_TILE = {} -- tile web -> Color3 medio (para el modo de respaldo)

local function prepararTiles()
	tilesPx = Codec.leer(Texturas.datos, Texturas.NUM_TILES * 16 * 16 * 4)
	for t, m in Texturas.tiles do
		local cxl, cyl = m.c % POR_FILA, m.c // POR_FILA
		local px0, py0 = cxl * CELDA + 2, cyl * CELDA + 2
		local e = 0.5 / TAM_ATLAS
		UVT[t] = {
			a = m.a,
			u0 = px0 / TAM_ATLAS + e,
			u1 = (px0 + 64) / TAM_ATLAS - e,
			va = py0 / TAM_ATLAS + e,
			vb = (py0 + 64) / TAM_ATLAS - e,
			gris = m.g == true,
			alfa = m.al == true,
		}
		-- Color medio del tile
		local r, g, b, n = 0, 0, 0, 0
		local o = m.o * 1024
		for i = 0, 255 do
			local a = buffer.readu8(tilesPx, o + i * 4 + 3)
			if a > 0 then
				r += buffer.readu8(tilesPx, o + i * 4)
				g += buffer.readu8(tilesPx, o + i * 4 + 1)
				b += buffer.readu8(tilesPx, o + i * 4 + 2)
				n += 1
			end
		end
		n = math.max(n, 1)
		COLOR_TILE[t] = Color3.fromRGB(r / n, g / n, b / n)
	end
end

local function crearAtlas()
	for a = 1, Texturas.NUM_ATLAS do
		local px = buffer.create(TAM_ATLAS * TAM_ATLAS * 4)
		for _, m in Texturas.tiles do
			if m.a == a then
				local cxl, cyl = m.c % POR_FILA, m.c // POR_FILA
				local x0, y0 = cxl * CELDA, cyl * CELDA
				local o = m.o * 1024
				-- Tile ampliado x4 con 2 píxeles de margen (repite el borde)
				for y = -2, 65 do
					local sy = math.clamp(y // 4, 0, 15)
					local fila = ((y0 + 2 + y) * TAM_ATLAS + x0) * 4
					for x = -2, 65 do
						local sx = math.clamp(x // 4, 0, 15)
						buffer.writeu32(px, fila + (x + 2) * 4, buffer.readu32(tilesPx, o + (sy * 16 + sx) * 4))
					end
				end
			end
		end
		atlas[a] = Imagenes.crear(TAM_ATLAS, TAM_ATLAS, px)
		if not atlas[a] then
			return false
		end
		task.wait()
	end
	return true
end
Render.UVT = UVT
Render.COLOR_TILE = COLOR_TILE
function Render.tilesPixeles()
	return tilesPx
end

------------------------------------------------------------------
-- Caras (igual que CARAS de malla.js)
------------------------------------------------------------------
local CARAS = {
	{ dir = { -1, 0, 0 }, sombra = 0.8, c = { { 0, 1, 0, 0, 1 }, { 0, 0, 0, 0, 0 }, { 0, 1, 1, 1, 1 }, { 0, 0, 1, 1, 0 } } },
	{ dir = { 1, 0, 0 }, sombra = 0.8, c = { { 1, 1, 1, 0, 1 }, { 1, 0, 1, 0, 0 }, { 1, 1, 0, 1, 1 }, { 1, 0, 0, 1, 0 } } },
	{ dir = { 0, -1, 0 }, sombra = 0.5, c = { { 1, 0, 1, 1, 0 }, { 0, 0, 1, 0, 0 }, { 1, 0, 0, 1, 1 }, { 0, 0, 0, 0, 1 } } },
	{ dir = { 0, 1, 0 }, sombra = 1, c = { { 0, 1, 1, 1, 1 }, { 1, 1, 1, 0, 1 }, { 0, 1, 0, 1, 0 }, { 1, 1, 0, 0, 0 } } },
	{ dir = { 0, 0, -1 }, sombra = 0.68, c = { { 1, 0, 0, 0, 0 }, { 0, 0, 0, 1, 0 }, { 1, 1, 0, 0, 1 }, { 0, 1, 0, 1, 1 } } },
	{ dir = { 0, 0, 1 }, sombra = 0.68, c = { { 0, 0, 1, 0, 0 }, { 1, 0, 1, 1, 0 }, { 0, 1, 1, 0, 1 }, { 1, 1, 1, 1, 1 } } },
}
for k, f in CARAS do
	f.k = k
	local d = f.dir
	local ej = d[1] ~= 0 and { 2, 3 } or d[2] ~= 0 and { 1, 3 } or { 1, 2 }
	f.normal = Vector3.new(d[1], d[2], d[3])
	f.vert = {}
	for _, c in f.c do
		local da, db = c[ej[1]] * 2 - 1, c[ej[2]] * 2 - 1
		local oa = { d[1], d[2], d[3] }
		local ob = { d[1], d[2], d[3] }
		oa[ej[1]] += da
		ob[ej[2]] += db
		local oc = { oa[1], oa[2], oa[3] }
		oc[ej[2]] += db
		table.insert(f.vert, { c = c, oa = oa, ob = ob, oc = oc })
	end
end
local UV_CARA = {
	function(x, y, z) return z, y end,
	function(x, y, z) return 1 - z, y end,
	function(x, y, z) return x, 1 - z end,
	function(x, y, z) return 1 - x, z end,
	function(x, y, z) return 1 - x, y end,
	function(x, y, z) return x, y end,
}
local NIVEL_AO = { [0] = 0.5, [1] = 0.68, [2] = 0.84, [3] = 1 }

-- Curva de brillo del juego web (luz 0-15 -> 0-1)
local CURVA = {}
for l = 0, 15 do
	CURVA[l] = l <= 0 and 0 or 0.8 ^ (15 - l)
end
-- Luz mínima de cada dimensión (dim.amb del juego web: el Nether y el End no están a oscuras)
local AMB = 0.03
local AMB_DIM = { superficie = 0.03, vacio = 0.03, nether = 0.28, ["end"] = 0.48 }
local function brillo(cielo, bloque)
	local v = math.max(CURVA[math.clamp(floor(cielo + 0.5), 0, 15)], CURVA[math.clamp(floor(bloque + 0.5), 0, 15)], AMB)
	return v ^ 0.72
end

------------------------------------------------------------------
-- Acceso a bloques y luz alrededor del chunk (con los vecinos)
------------------------------------------------------------------
local Vecinos = {}
Vecinos.__index = Vecinos

local function prepararVecinos(md, cx, cz, luz)
	local v = setmetatable({ d = {}, luz = luz, bio = {} }, Vecinos)
	for dcx = -1, 1 do
		for dcz = -1, 1 do
			v.d[(dcz + 1) * 3 + dcx + 2] = md:obtener(cx + dcx, cz + dcz)
			v.bio[(dcz + 1) * 3 + dcx + 2] = md.biomas[MundoDatos.clave(cx + dcx, cz + dcz)]
		end
	end
	return v
end

local function getV(v, lx, y, lz)
	if y < 0 then
		return B.lecho
	end
	if y >= CY then
		return 0
	end
	local dcx = lx < 0 and -1 or lx >= CX and 1 or 0
	local dcz = lz < 0 and -1 or lz >= CZ and 1 or 0
	local d = v.d[(dcz + 1) * 3 + dcx + 2]
	return buffer.readu16(d, ((lx - dcx * CX) + (lz - dcz * CZ) * CX + y * CX * CZ) * 2)
end

local function luzV(v, lx, y, lz)
	if y >= CY then
		return 240
	end
	if y < 0 then
		return 0
	end
	return buffer.readu8(v.luz, y * Luz.BCOL + (lz + 1) * Luz.BW + lx + 1)
end

local function biomaV(v, lx, lz)
	local dcx = lx < 0 and -1 or lx >= CX and 1 or 0
	local dcz = lz < 0 and -1 or lz >= CZ and 1 or 0
	local b = v.bio[(dcz + 1) * 3 + dcx + 2]
	if not b then
		return 2
	end
	return buffer.readu8(b, (lx - dcx * CX) + (lz - dcz * CZ) * CX)
end

local BLANCO = { 1, 1, 1 }
local function tinte(v, b, lx, lz, gris)
	if not gris then
		return BLANCO
	end
	local t = TINTE[b]
	if not t then
		return BLANCO
	end
	if t == "abedul" then
		return Biomas.abedul
	elseif t == "abeto" then
		return Biomas.abeto
	end
	local col = Biomas.colores[biomaV(v, math.clamp(lx, 0, 15), math.clamp(lz, 0, 15)) + 1]
	if not col then
		return BLANCO
	end
	if t == "pasto" then
		return col[1]
	elseif t == "follaje" then
		return col[2]
	end
	return col[3]
end

------------------------------------------------------------------
-- Construcción de la geometría de una sección
------------------------------------------------------------------
local function nuevaLista()
	return { p = {}, uv = {}, col = {}, n = {}, flip = {}, cuantos = 0 }
end

-- Añade un cuadrilátero (4 vértices en orden 0,1,2,3 como en malla.js)
local function quad(L, p, uv, col, normal, flip)
	local base = #L.p
	for k = 1, 4 do
		L.p[base + k] = p[k]
		L.uv[base + k] = uv[k]
		L.col[base + k] = col[k]
	end
	L.cuantos += 1
	L.n[L.cuantos] = normal
	L.flip[L.cuantos] = flip or false
end

local function listaPara(listas, t)
	local u = UVT[t]
	if not u then
		return nil, nil
	end
	local k = u.a
	local L = listas[k]
	if not L then
		L = nuevaLista()
		listas[k] = L
	end
	return L, u
end

local function cajaUV(u, uu, vv)
	return Vector2.new(u.u0 + (u.u1 - u.u0) * uu, u.vb - (u.vb - u.va) * vv)
end

local function colorDe(br, t)
	return Color3.new(math.min(1, br * t[1]), math.min(1, br * t[2]), math.min(1, br * t[3]))
end

-- Caja genérica (cajas, vallas, antorchas…) con coordenadas dentro del bloque
local function caja(listas, v, b, def, lx, y, lz, cj, ox, oy, oz)
	local bx0, by0, bz0, bx1, by1, bz1 = cj[1], cj[2], cj[3], cj[4], cj[5], cj[6]
	local L0 = luzV(v, lx, y, lz)
	for _, f in CARAS do
		local k = f.k
		local enBorde = (k == 1 and bx0 == 0) or (k == 2 and bx1 == 1) or (k == 3 and by0 == 0) or (k == 4 and by1 == 1) or (k == 5 and bz0 == 0) or (k == 6 and bz1 == 1)
		local d = f.dir
		local n = getV(v, lx + d[1], y + d[2], lz + d[3])
		if not (enBorde and OPACO[n]) then
			local t = def.tex[k]
			local L, u = listaPara(listas, t)
			if L then
				local l = L0
				if enBorde then
					local ln = luzV(v, lx + d[1], y + d[2], lz + d[3])
					l = math.max(ln // 16, L0 // 16) * 16 + math.max(ln % 16, L0 % 16)
				end
				local br = brillo(l // 16, l % 16) * f.sombra
				local tt = tinte(v, b, lx, lz, u.gris)
				local col = colorDe(br, tt)
				local p, uv, cc = {}, {}, {}
				for i, c in f.c do
					local px = c[1] == 1 and bx1 or bx0
					local py = c[2] == 1 and by1 or by0
					local pz = c[3] == 1 and bz1 or bz0
					p[i] = Vector3.new((ox + px) * BS, (oy + py) * BS, (oz + pz) * BS)
					local uu, vv = UV_CARA[k](px, py, pz)
					uv[i] = cajaUV(u, math.clamp(uu, 0.01, 0.99), math.clamp(vv, 0.01, 0.99))
					cc[i] = col
				end
				quad(L, p, uv, cc, f.normal)
			end
		end
	end
end

local function cajasConecta(v, b, def, lx, y, lz)
	local valla = def.conecta == "valla"
	local function con(k)
		local o = ({ { 0, -1 }, { 1, 0 }, { 0, 1 }, { -1, 0 } })[k]
		local n = getV(v, lx + o[1], y, lz + o[2])
		return n == b or OPACO[n] or (valla and n == B.valla) or (not valla and (n == B.panel or n == B.vidrio))
	end
	local c = {}
	if valla then
		table.insert(c, { 6 / 16, 0, 6 / 16, 10 / 16, 1, 10 / 16 })
		local A = { { 7 / 16, 0, 9 / 16, 6 / 16 }, { 10 / 16, 7 / 16, 1, 9 / 16 }, { 7 / 16, 10 / 16, 9 / 16, 1 }, { 0, 7 / 16, 6 / 16, 9 / 16 } }
		for k = 1, 4 do
			if con(k) then
				local a = A[k]
				table.insert(c, { a[1], 6 / 16, a[2], a[3], 9 / 16, a[4] })
				table.insert(c, { a[1], 12 / 16, a[2], a[3], 15 / 16, a[4] })
			end
		end
	else
		table.insert(c, { 7 / 16, 0, 7 / 16, 9 / 16, 1, 9 / 16 })
		local A = { { 7 / 16, 0, 9 / 16, 7 / 16 }, { 9 / 16, 7 / 16, 1, 9 / 16 }, { 7 / 16, 9 / 16, 9 / 16, 1 }, { 0, 7 / 16, 7 / 16, 9 / 16 } }
		local n = 0
		for k = 1, 4 do
			if con(k) then
				local a = A[k]
				table.insert(c, { a[1], 0, a[2], a[3], 1, a[4] })
				n += 1
			end
		end
		if n == 0 then
			table.insert(c, { 0, 0, 7 / 16, 1, 1, 9 / 16 })
		end
	end
	return c
end

local function alturaLiquido(id, arriba)
	if esLiquido(arriba) and (esAgua(arriba) == esAgua(id)) then
		return 1
	end
	local l = (BL[id] and BL[id].nivelL) or 0
	return l == 0 and 14 / 16 or math.max(1.5 / 16, (8 - l) / 8 * 14 / 16)
end

-- Geometría de la sección `sy` del chunk. Devuelve listas por atlas.
local function geometriaSeccion(v, cx, cz, sy, ceder)
	local listas = {}
	local y0 = sy * SEC
	for y = y0, y0 + SEC - 1 do
		local oy = y - y0
		for lz = 0, CZ - 1 do
			for lx = 0, CX - 1 do
				local b = getV(v, lx, y, lz)
				if b ~= 0 then
					local def = BL[b]
					local forma = FORMA[b]
					if def and not esAgua(b) then
						if forma <= 1 then
							local alto = forma == 1 and (def.altura or 0.5) or 1
							for _, f in CARAS do
								local d = f.dir
								if not (y == 0 and d[2] < 0) then
									local nx, ny, nz = lx + d[1], y + d[2], lz + d[3]
									local n = getV(v, nx, ny, nz)
									local dibujar = true
									if not (forma == 1 and d[2] > 0) then
										if OPACO[n] then
											dibujar = false
										elseif n == b and (TRANS[b] or forma == 1) then
											dibujar = false
										end
									end
									if dibujar then
										local t = def.tex[f.k]
										local L, u = listaPara(listas, t)
										if L then
											local base = OPACO[n] and luzV(v, lx, y, lz) or luzV(v, nx, ny, nz)
											local p, uv, cc = {}, {}, {}
											local ao = {}
											local tt = tinte(v, b, lx, lz, u.gris)
											for k, vt in f.vert do
												local c = vt.c
												p[k] = Vector3.new((lx + c[1]) * BS, (oy + c[2] * alto) * BS, (lz + c[3]) * BS)
												local cu, cv = c[4], c[5]
												local vv
												if d[2] == 0 and forma == 1 then
													vv = cv == 1 and alto or 0
												else
													vv = cv
												end
												uv[k] = cajaUV(u, cu, vv)
												local oa, ob, oc = vt.oa, vt.ob, vt.oc
												local ba = getV(v, lx + oa[1], y + oa[2], lz + oa[3])
												local bb = getV(v, lx + ob[1], y + ob[2], lz + ob[3])
												local bc = getV(v, lx + oc[1], y + oc[2], lz + oc[3])
												local s1, s2, s3 = OCLUYE[ba] and 1 or 0, OCLUYE[bb] and 1 or 0, OCLUYE[bc] and 1 or 0
												local a = (s1 == 1 and s2 == 1) and 0 or 3 - (s1 + s2 + s3)
												ao[k] = a
												local ss, sb, cnt = base // 16, base % 16, 1
												if not OPACO[ba] then
													local l = luzV(v, lx + oa[1], y + oa[2], lz + oa[3])
													ss += l // 16
													sb += l % 16
													cnt += 1
												end
												if not OPACO[bb] then
													local l = luzV(v, lx + ob[1], y + ob[2], lz + ob[3])
													ss += l // 16
													sb += l % 16
													cnt += 1
												end
												if not OPACO[bc] and not (s1 == 1 and s2 == 1) then
													local l = luzV(v, lx + oc[1], y + oc[2], lz + oc[3])
													ss += l // 16
													sb += l % 16
													cnt += 1
												end
												local br = brillo(ss / cnt, sb / cnt) * f.sombra * NIVEL_AO[a]
												cc[k] = colorDe(br, tt)
											end
											quad(L, p, uv, cc, f.normal, ao[1] + ao[4] > ao[2] + ao[3])
										end
									end
								end
							end
						elseif forma == 2 then -- plantas en cruz
							local t = def.tex[1]
							local L, u = listaPara(listas, t)
							if L then
								local l = luzV(v, lx, y, lz)
								local col = colorDe(brillo(l // 16, l % 16) * 0.95, tinte(v, b, lx, lz, u.gris))
								local a, c = 0.15, 0.85
								for _, par in { { a, a, c, c }, { a, c, c, a } } do
									local ax, az, bx, bz = par[1], par[2], par[3], par[4]
									local P = {
										Vector3.new((lx + ax) * BS, (oy + 1) * BS, (lz + az) * BS),
										Vector3.new((lx + ax) * BS, oy * BS, (lz + az) * BS),
										Vector3.new((lx + bx) * BS, (oy + 1) * BS, (lz + bz) * BS),
										Vector3.new((lx + bx) * BS, oy * BS, (lz + bz) * BS),
									}
									local U = { cajaUV(u, 0, 1), cajaUV(u, 0, 0), cajaUV(u, 1, 1), cajaUV(u, 1, 0) }
									local C = { col, col, col, col }
									local nrm = Vector3.new(bz - az, 0, ax - bx).Unit
									quad(L, P, U, C, nrm)
									quad(L, { P[3], P[4], P[1], P[2] }, { U[3], U[4], U[1], U[2] }, C, -nrm)
								end
							end
						elseif forma == 3 then -- antorcha
							local t = def.tex[1]
							local L, u = listaPara(listas, t)
							if L then
								local l = luzV(v, lx, y, lz)
								local col = colorDe(brillo(l // 16, l % 16), BLANCO)
								local a0, a1, yt = 7 / 16, 9 / 16, 10 / 16
								local ddx, ddz = 0, 0
								if def.cara ~= nil then
									ddx, ddz = DIRF[def.cara + 1][1], DIRF[def.cara + 1][2]
								end
								local function tr(px, py, pz)
									if def.cara ~= nil then
										return Vector3.new((lx + px + ddx * 0.42 - ddx * py * 0.45) * BS, (oy + py + 0.22) * BS, (lz + pz + ddz * 0.42 - ddz * py * 0.45) * BS)
									end
									return Vector3.new((lx + px) * BS, (oy + py) * BS, (lz + pz) * BS)
								end
								local U = { cajaUV(u, 7 / 16, 13 / 16), cajaUV(u, 7 / 16, 0), cajaUV(u, 9 / 16, 13 / 16), cajaUV(u, 9 / 16, 0) }
								local C = { col, col, col, col }
								quad(L, { tr(a0, yt, a0), tr(a0, 0, a0), tr(a0, yt, a1), tr(a0, 0, a1) }, U, C, Vector3.new(-1, 0, 0))
								quad(L, { tr(a1, yt, a1), tr(a1, 0, a1), tr(a1, yt, a0), tr(a1, 0, a0) }, U, C, Vector3.new(1, 0, 0))
								quad(L, { tr(a1, yt, a0), tr(a1, 0, a0), tr(a0, yt, a0), tr(a0, 0, a0) }, U, C, Vector3.new(0, 0, -1))
								quad(L, { tr(a0, yt, a1), tr(a0, 0, a1), tr(a1, yt, a1), tr(a1, 0, a1) }, U, C, Vector3.new(0, 0, 1))
								local U2 = { cajaUV(u, 7 / 16, 11 / 16), cajaUV(u, 9 / 16, 11 / 16), cajaUV(u, 7 / 16, 13 / 16), cajaUV(u, 9 / 16, 13 / 16) }
								quad(L, { tr(a0, yt, a1), tr(a1, yt, a1), tr(a0, yt, a0), tr(a1, yt, a0) }, U2, C, Vector3.new(0, 1, 0))
							end
						elseif forma == 4 or forma == 5 then -- lava (el agua es de Roblox) y portales
							local liquido = forma == 4
							local alto = liquido and alturaLiquido(b, getV(v, lx, y + 1, lz)) or 1
							local t = def.tex[1]
							local L, u = listaPara(listas, t)
							if L then
								local lp = luzV(v, lx, y, lz)
								for _, f in CARAS do
									local d = f.dir
									local n = getV(v, lx + d[1], y + d[2], lz + d[3])
									local saltar = OPACO[n] or (liquido and esLiquido(n) and esAgua(n) == esAgua(b)) or (not liquido and n == b) or (liquido and d[2] < 0 and SOLIDO[n])
									if not saltar then
										local ln = luzV(v, lx + d[1], y + d[2], lz + d[3])
										local br = liquido and 1 or brillo(math.max(ln // 16, lp // 16), math.max(ln % 16, lp % 16)) * f.sombra
										local col = colorDe(br, BLANCO)
										local P, U, C = {}, {}, {}
										for i, c in f.c do
											P[i] = Vector3.new((lx + c[1]) * BS, (oy + c[2] * alto) * BS, (lz + c[3]) * BS)
											U[i] = cajaUV(u, c[4], c[5])
											C[i] = col
										end
										quad(L, P, U, C, f.normal)
									end
								end
							end
						elseif forma == 6 then
							for _, cj in def.cajas or {} do
								caja(listas, v, b, def, lx, y, lz, cj, lx, oy, lz)
							end
						elseif forma == 7 then
							for _, cj in cajasConecta(v, b, def, lx, y, lz) do
								caja(listas, v, b, def, lx, y, lz, cj, lx, oy, lz)
							end
						elseif forma == 8 or forma == 9 then -- polvo de redstone y raíles: plano en el suelo
							local t = def.tex[1]
							local L, u = listaPara(listas, t)
							if L then
								local l = luzV(v, lx, y, lz)
								local col = colorDe(brillo(l // 16, l % 16), forma == 8 and { 0.9, 0.12, 0.08 } or BLANCO)
								local h = oy + 0.03
								local P = {
									Vector3.new(lx * BS, h * BS, (lz + 1) * BS),
									Vector3.new((lx + 1) * BS, h * BS, (lz + 1) * BS),
									Vector3.new(lx * BS, h * BS, lz * BS),
									Vector3.new((lx + 1) * BS, h * BS, lz * BS),
								}
								local U = { cajaUV(u, 0, 0), cajaUV(u, 1, 0), cajaUV(u, 0, 1), cajaUV(u, 1, 1) }
								quad(L, P, U, { col, col, col, col }, Vector3.new(0, 1, 0))
							end
						end
					end
				end
			end
		end
		if ceder then
			ceder()
		end
	end
	return listas
end
Render.geometriaSeccion = geometriaSeccion
Render.prepararVecinos = prepararVecinos

------------------------------------------------------------------
-- Mallas de Roblox (EditableMesh)
------------------------------------------------------------------
local function crearMalla(L, img, origen, ceder)
	local em
	local ok, err = pcall(function()
		em = AssetService:CreateEditableMesh()
	end)
	if not ok or not em then
		warn("[Blockverse] No se pudo crear una malla editable: " .. tostring(err))
		return nil
	end
	local cacheUV, cacheCol, cacheN = {}, {}, {}
	local mn = Vector3.new(math.huge, math.huge, math.huge)
	local mx = -mn
	for _, p in L.p do
		mn = mn:Min(p)
		mx = mx:Max(p)
	end
	local centro = (mn + mx) / 2
	local ok2, err2 = pcall(function()
		for q = 1, L.cuantos do
			local base = (q - 1) * 4
			local ids, uvs, cols = table.create(4), table.create(4), table.create(4)
			for k = 1, 4 do
				ids[k] = em:AddVertex(L.p[base + k] - centro)
				local uv = L.uv[base + k]
				local ku = uv.X * 4096 + uv.Y
				local iu = cacheUV[ku]
				if not iu then
					iu = em:AddUV(uv)
					cacheUV[ku] = iu
				end
				uvs[k] = iu
				local c = L.col[base + k]
				local kc = floor(c.R * 255) * 65536 + floor(c.G * 255) * 256 + floor(c.B * 255)
				local ic = cacheCol[kc]
				if not ic then
					ic = em:AddColor(c, 1)
					cacheCol[kc] = ic
				end
				cols[k] = ic
			end
			local n = L.n[q]
			local kn = n.X * 9 + n.Y * 3 + n.Z
			local inn = cacheN[kn]
			if not inn then
				inn = em:AddNormal(n)
				cacheN[kn] = inn
			end
			-- Triángulos como en malla.js: (0,1,2)(2,1,3) o, si la oclusión lo pide, (0,1,3)(0,3,2)
			local tri
			if L.flip[q] then
				tri = { { 1, 2, 4 }, { 1, 4, 3 } }
			else
				tri = { { 1, 2, 3 }, { 3, 2, 4 } }
			end
			for _, t in tri do
				local f = em:AddTriangle(ids[t[1]], ids[t[2]], ids[t[3]])
				em:SetFaceUVs(f, { uvs[t[1]], uvs[t[2]], uvs[t[3]] })
				em:SetFaceColors(f, { cols[t[1]], cols[t[2]], cols[t[3]] })
				em:SetFaceNormals(f, { inn, inn, inn })
			end
			if ceder and q % 200 == 0 then
				ceder()
			end
		end
	end)
	if not ok2 then
		warn("[Blockverse] Error al llenar la malla: " .. tostring(err2))
		em:Destroy()
		return nil
	end
	local parte
	-- Esta llamada hace esperar al hilo: mientras tanto el bucle no lo reanuda
	Render._esperandoMotor = true
	local ok3, err3 = pcall(function()
		parte = AssetService:CreateMeshPartAsync(Content.fromObject(em), { CollisionFidelity = Enum.CollisionFidelity.Box })
	end)
	Render._esperandoMotor = false
	if not ok3 or not parte then
		warn("[Blockverse] No se pudo crear la pieza de malla: " .. tostring(err3))
		em:Destroy()
		return nil
	end
	parte.Anchored = true
	parte.CanCollide = false
	parte.CanQuery = false
	parte.CanTouch = false
	parte.CastShadow = true
	parte.Material = Enum.Material.SmoothPlastic
	parte.Color = Color3.new(1, 1, 1)
	parte.Size = mx - mn
	parte.CFrame = CFrame.new(origen + centro)
	Imagenes.enMalla(parte, img)
	parte:SetAttribute("Malla", true)
	return parte, em
end

------------------------------------------------------------------
-- Modo de respaldo: piezas de colores
------------------------------------------------------------------
local function piezasSeccion(v, cx, cz, sy, origen, padre)
	local partes = {}
	local y0 = sy * SEC
	for y = y0, y0 + SEC - 1 do
		for lz = 0, CZ - 1 do
			local lx = 0
			while lx < CX do
				local b = getV(v, lx, y, lz)
				local def = b ~= 0 and BL[b]
				local visible = false
				if def and not esAgua(b) and FORMA[b] <= 1 then
					for _, f in CARAS do
						local d = f.dir
						if not OPACO[getV(v, lx + d[1], y + d[2], lz + d[3])] then
							visible = true
							break
						end
					end
				end
				if visible then
					local ancho = 1
					while lx + ancho < CX and getV(v, lx + ancho, y, lz) == b do
						ancho += 1
					end
					local p = Instance.new("Part")
					p.Anchored = true
					p.CanCollide = false
					p.CanQuery = false
					p.CanTouch = false
					p.TopSurface = Enum.SurfaceType.Smooth
					p.BottomSurface = Enum.SurfaceType.Smooth
					p.Size = Vector3.new(ancho * BS, BS, BS)
					p.CFrame = CFrame.new(origen + Vector3.new((lx + ancho / 2) * BS, (y - y0 + 0.5) * BS, (lz + 0.5) * BS))
					local t = def.tex[4]
					local col = COLOR_TILE[t] or Color3.new(0.5, 0.5, 0.5)
					local tt = tinte(v, b, lx, lz, UVT[t] and UVT[t].gris)
					p.Color = Color3.new(col.R * tt[1], col.G * tt[2], col.B * tt[3])
					p.Material = Enum.Material.SmoothPlastic
					if TRANS[b] then
						p.Transparency = 0.4
					end
					p.Parent = padre
					table.insert(partes, p)
					lx += ancho
				else
					lx += 1
				end
			end
		end
	end
	return partes
end

------------------------------------------------------------------
-- Gestión de chunks
------------------------------------------------------------------
local md -- MundoDatos del cliente
local pedirEdiciones -- function(lista de {cx, cz}) -> tabla
local listasEdiciones = {} -- clave -> true cuando ya llegaron las ediciones
local pidiendo = {}
local trabajo -- corrutina de trabajo
local inicio = 0
local PRESUPUESTO = 0.006

local function ceder()
	if os.clock() - inicio > PRESUPUESTO then
		coroutine.yield()
	end
end

local function quitarSeccion(sec)
	if not sec then
		return
	end
	for _, p in sec.partes do
		p:Destroy()
	end
	for _, em in sec.mallas do
		pcall(function()
			em:Destroy()
		end)
	end
end

local function construirSeccion(ch, v, sy)
	AMB = AMB_DIM[Generador.dimensionDe(ch.cz)] or 0.03
	local origen = Vector3.new(ch.cx * CX * BS, sy * SEC * BS, ch.cz * CZ * BS)
	local nueva = { partes = {}, mallas = {} }
	if Render.modo == "malla" then
		local listas = geometriaSeccion(v, ch.cx, ch.cz, sy, ceder)
		for a, L in listas do
			if L.cuantos > 0 then
				local parte, em = crearMalla(L, atlas[a], origen, ceder)
				if parte then
					if Texturas.ALFA_DESDE and a >= Texturas.ALFA_DESDE then
						parte.CastShadow = false
					end
					parte.Parent = ch.modelo
					table.insert(nueva.partes, parte)
					table.insert(nueva.mallas, em)
				else
					-- Si falla, se pasa al modo de respaldo
					Render.modo = "piezas"
					warn("[Blockverse] Usando el modo de respaldo (piezas de colores)")
					break
				end
			end
		end
	end
	if Render.modo == "piezas" then
		for _, p in nueva.partes do
			p:Destroy()
		end
		nueva.partes = piezasSeccion(v, ch.cx, ch.cz, sy, origen, ch.modelo)
	end
	quitarSeccion(ch.secciones[sy])
	ch.secciones[sy] = nueva
end

local function datosListos(cx, cz)
	return listasEdiciones[MundoDatos.clave(cx, cz)] == true
end

local function necesitaEdiciones(cx, cz, lista)
	local k = MundoDatos.clave(cx, cz)
	if not listasEdiciones[k] and not pidiendo[k] then
		table.insert(lista, { cx, cz })
	end
end

-- Construye (o rehace) un chunk entero: datos, luz y secciones
local function construirChunk(ch)
	for dcx = -1, 1 do
		for dcz = -1, 1 do
			md:obtener(ch.cx + dcx, ch.cz + dcz, ceder)
		end
	end
	ch.luz = Luz.calcular(md, ch.cx, ch.cz, Generador.conCielo(ch.cz), ceder)
	local v = prepararVecinos(md, ch.cx, ch.cz, ch.luz)
	local ym = Luz.ymaxDe(md:obtener(ch.cx, ch.cz))
	for sy = 0, NSEC - 1 do
		if sy * SEC <= ym + 1 then
			construirSeccion(ch, v, sy)
		else
			quitarSeccion(ch.secciones[sy])
			ch.secciones[sy] = nil
		end
		ceder()
	end
	ch.listo = true
	ch.sucio = false
	ch.seccionesSucias = {}
end

-- Rehace solo algunas secciones (después de cambiar un bloque)
local function rehacerSecciones(ch)
	local sucias = ch.seccionesSucias
	ch.seccionesSucias = {}
	ch.luz = Luz.calcular(md, ch.cx, ch.cz, Generador.conCielo(ch.cz), ceder)
	local v = prepararVecinos(md, ch.cx, ch.cz, ch.luz)
	for sy in sucias do
		if sy >= 0 and sy < NSEC then
			construirSeccion(ch, v, sy)
		end
	end
end

local function quitarChunk(k)
	local ch = Render.chunks[k]
	if not ch then
		return
	end
	for _, sec in ch.secciones do
		quitarSeccion(sec)
	end
	ch.modelo:Destroy()
	Render.chunks[k] = nil
end

local function centroCamara()
	local p
	if Render.foco then
		p = Render.foco()
	else
		local cam = workspace.CurrentCamera
		p = cam and cam.Focus.Position or Vector3.zero
	end
	return floor(p.X / BS / CX), floor(p.Z / BS / CZ)
end

local function bucleTrabajo()
	while true do
		local R = Config.RADIO
		local pcx, pcz = centroCamara()
		-- Pedir ediciones de los chunks que hacen falta (los visibles y un anillo más)
		local pedir = {}
		for dx = -R - 1, R + 1 do
			for dz = -R - 1, R + 1 do
				if dx * dx + dz * dz <= (R + 1.5) ^ 2 then
					necesitaEdiciones(pcx + dx, pcz + dz, pedir)
				end
			end
		end
		if #pedir > 0 then
			table.sort(pedir, function(a, b)
				return (a[1] - pcx) ^ 2 + (a[2] - pcz) ^ 2 < (b[1] - pcx) ^ 2 + (b[2] - pcz) ^ 2
			end)
			local lote = {}
			for i = 1, math.min(24, #pedir) do
				lote[i] = pedir[i]
				pidiendo[MundoDatos.clave(pedir[i][1], pedir[i][2])] = true
			end
			task.spawn(function()
				local ok, res = pcall(pedirEdiciones, lote)
				for _, c in lote do
					local k = MundoDatos.clave(c[1], c[2])
					pidiendo[k] = nil
					if ok then
						local ed = res and res[tostring(k)]
						if ed then
							Render.aplicarEdiciones(c[1], c[2], ed)
						end
						listasEdiciones[k] = true
					end
				end
			end)
		end
		-- Primero: secciones sucias (cambios de bloques)
		local hecho = false
		for _, ch in Render.chunks do
			if ch.listo and next(ch.seccionesSucias) then
				rehacerSecciones(ch)
				hecho = true
				break
			end
		end
		-- Luego: el chunk visible más cercano sin dibujar
		if not hecho then
			local mejor, md2 = nil, math.huge
			for dx = -R, R do
				for dz = -R, R do
					local d = dx * dx + dz * dz
					if d <= R * R + 1 and d < md2 then
						local cx, cz = pcx + dx, pcz + dz
						local k = MundoDatos.clave(cx, cz)
						local ch = Render.chunks[k]
						if not (ch and ch.listo) then
							local ok = true
							for ax = -1, 1 do
								for az = -1, 1 do
									if not datosListos(cx + ax, cz + az) then
										ok = false
									end
								end
							end
							if ok then
								mejor, md2 = { cx, cz }, d
							end
						end
					end
				end
			end
			if mejor then
				local k = MundoDatos.clave(mejor[1], mejor[2])
				local ch = Render.chunks[k]
				if not ch then
					local modelo = Instance.new("Folder")
					modelo.Name = mejor[1] .. "," .. mejor[2]
					modelo.Parent = carpeta
					ch = { cx = mejor[1], cz = mejor[2], modelo = modelo, secciones = {}, seccionesSucias = {}, listo = false }
					Render.chunks[k] = ch
				end
				construirChunk(ch)
				hecho = true
			end
		end
		-- Quitar lo lejano (mallas y datos)
		for k, ch in Render.chunks do
			if math.max(math.abs(ch.cx - pcx), math.abs(ch.cz - pcz)) > R + 2 then
				quitarChunk(k)
			end
		end
		for k in md.datos do
			local cx, cz = MundoDatos.desclave(k)
			if math.max(math.abs(cx - pcx), math.abs(cz - pcz)) > R + 4 then
				md:descargar(cx, cz)
			end
		end
		if not hecho then
			coroutine.yield()
		else
			ceder()
		end
	end
end

------------------------------------------------------------------
-- Cambios de bloques que llegan del servidor
------------------------------------------------------------------
local function marcar(cx, cz, sy)
	local ch = Render.chunks[MundoDatos.clave(cx, cz)]
	if ch and ch.listo then
		ch.seccionesSucias[sy] = true
	end
end

function Render.cambiarBloque(x, y, z, id)
	md:set(x, y, z, id)
	local cx, cz = x // CX, z // CZ
	if md._ymax then
		md._ymax[MundoDatos.clave(cx, cz)] = nil
	end
	local lx, lz = x - cx * CX, z - cz * CZ
	local sy = y // SEC
	-- La luz puede cambiar en toda la columna: se rehacen las secciones de abajo también
	for s = 0, sy + 1 do
		marcar(cx, cz, s)
	end
	if y % SEC == 0 then
		marcar(cx, cz, sy - 1)
	end
	-- Vecinos (bordes y luz que entra)
	for dx = -1, 1 do
		for dz = -1, 1 do
			if (dx ~= 0 or dz ~= 0) then
				local cerca = (dx == -1 and lx < 8) or (dx == 1 and lx > 7) or dx == 0
				local cerca2 = (dz == -1 and lz < 8) or (dz == 1 and lz > 7) or dz == 0
				if cerca and cerca2 then
					for s = math.max(0, sy - 1), math.min(NSEC - 1, sy + 1) do
						marcar(cx + dx, cz + dz, s)
					end
				end
			end
		end
	end
end

function Render.aplicarEdiciones(cx, cz, ed)
	local lista = {}
	for i, id in ed do
		lista[tonumber(i)] = id
	end
	md:aplicarEdiciones(cx, cz, lista)
end

------------------------------------------------------------------
-- Inicio
------------------------------------------------------------------
function Render.iniciar(mundoDatos, funcionPedirEdiciones)
	md = mundoDatos
	Render.md = md
	pedirEdiciones = funcionPedirEdiciones
	prepararTiles()
	if not crearAtlas() then
		Render.modo = "piezas"
		warn("[Blockverse] Sin imágenes editables: se usará el modo de respaldo")
	end
	trabajo = coroutine.create(bucleTrabajo)
	RunService.Heartbeat:Connect(function()
		if coroutine.status(trabajo) ~= "suspended" or Render._esperandoMotor then
			return
		end
		inicio = os.clock()
		local ok, err = coroutine.resume(trabajo)
		if not ok then
			warn("[Blockverse] Error en el render: " .. tostring(err))
			trabajo = coroutine.create(bucleTrabajo)
		end
	end)
end

-- ¿Ya está dibujado el chunk de esta posición (en studs)?
function Render.listoEn(pos)
	local cx, cz = floor(pos.X / BS / CX), floor(pos.Z / BS / CZ)
	local ch = Render.chunks[MundoDatos.clave(cx, cz)]
	return ch ~= nil and ch.listo
end

function Render.atlas(a)
	return atlas[a]
end

return Render
