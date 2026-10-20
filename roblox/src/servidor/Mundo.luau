--!native
--[[
	Blockverse para Roblox · Mundo (servidor)
	· Guarda los bloques (MundoDatos) y los cambios de los jugadores.
	· Crea las colisiones (piezas invisibles fusionadas en cajas grandes)
	  cerca de los jugadores; lo que se ve lo dibuja cada cliente.
	· El agua es agua de Roblox (Terrain), así se puede nadar.
	· Avisa a todos los clientes de cada bloque que cambia.
]]
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")

local Comp = ReplicatedStorage:WaitForChild("Blockverse")
local Config = require(Comp.Config)
local Registro = require(Comp.Registro)
local MundoDatos = require(Comp.MundoDatos)

local BS = Config.BLOQUE
local CX, CZ, CY = MundoDatos.CX, MundoDatos.CZ, MundoDatos.CY
local SEC = 16
local NSEC = CY // SEC
local BL = Registro.bloques
local SOLIDO, FORMA = Registro.SOLIDO, Registro.FORMA
local esAgua = Registro.esAgua

local Mundo = {}
Mundo.fisica = {} -- clave -> {modelo, secciones = {[sy] = {piezas}}}

local carpeta = Instance.new("Folder")
carpeta.Name = "Mundo"
carpeta.Parent = workspace
Mundo.carpeta = carpeta

local remotos = ReplicatedStorage:WaitForChild("Remotos")
local RBloques = remotos:WaitForChild("Bloques")

local cola = {} -- cambios pendientes de enviar
local alCambiar = {} -- funciones (x, y, z, antes, nuevo)

function Mundo.iniciar(semilla, opc)
	Mundo.md = MundoDatos.new(semilla, opc)
	Mundo.semilla = semilla
end

function Mundo.alCambiar(fn)
	table.insert(alCambiar, fn)
end

function Mundo.get(x, y, z)
	return Mundo.md:get(x, y, z)
end

function Mundo.getSiCargado(x, y, z)
	return Mundo.md:getSiCargado(x, y, z)
end

------------------------------------------------------------------
-- Colisiones
------------------------------------------------------------------
local function caja(padre, x0, y0, z0, x1, y1, z1)
	local p = Instance.new("Part")
	p.Name = "C"
	p.Anchored = true
	p.CanCollide = true
	p.CanQuery = true
	p.CanTouch = false
	p.CastShadow = false
	p.Transparency = 1
	p.Size = Vector3.new((x1 - x0) * BS, (y1 - y0) * BS, (z1 - z0) * BS)
	p.CFrame = CFrame.new((x0 + x1) / 2 * BS, (y0 + y1) / 2 * BS, (z0 + z1) / 2 * BS)
	p.Parent = padre
	return p
end

-- Cajas de colisión de un bloque que no es un cubo entero
local function cajasDe(b)
	local def = BL[b]
	local f = FORMA[b]
	if f == 1 then
		return { { 0, 0, 0, 1, def.altura or 0.5, 1 } }
	elseif f == 6 then
		return def.cajas
	elseif f == 7 then
		return { { 0, 0, 0, 1, def.colAlta or 1, 1 } }
	end
	return nil
end

local function construirSeccion(cx, cz, sy, padre)
	local md = Mundo.md
	local d = md:obtener(cx, cz)
	local y0 = sy * SEC
	local lleno = table.create(CX * CZ * SEC, false)
	local piezas = {}
	local bx, bz = cx * CX, cz * CZ
	for ly = 0, SEC - 1 do
		local y = y0 + ly
		for z = 0, CZ - 1 do
			for x = 0, CX - 1 do
				local b = buffer.readu16(d, (x + z * CX + y * CX * CZ) * 2)
				if b ~= 0 and SOLIDO[b] then
					if FORMA[b] == 0 then
						lleno[ly * 256 + z * 16 + x + 1] = true
					else
						local cj = cajasDe(b)
						if cj then
							for _, c in cj do
								table.insert(piezas, caja(padre, bx + x + c[1], y + c[2], bz + z + c[3], bx + x + c[4], y + c[5], bz + z + c[6]))
							end
						end
					end
				end
			end
		end
	end
	-- Cajas voraces en 3D: x, luego z, luego y
	local function libre(x, z, ly)
		return lleno[ly * 256 + z * 16 + x + 1]
	end
	for ly = 0, SEC - 1 do
		for z = 0, CZ - 1 do
			for x = 0, CX - 1 do
				if libre(x, z, ly) then
					local w = 1
					while x + w < CX and libre(x + w, z, ly) do
						w += 1
					end
					local dz = 1
					local sigue = true
					while sigue and z + dz < CZ do
						for k = 0, w - 1 do
							if not libre(x + k, z + dz, ly) then
								sigue = false
								break
							end
						end
						if sigue then
							dz += 1
						end
					end
					local h = 1
					sigue = true
					while sigue and ly + h < SEC do
						for kz = 0, dz - 1 do
							for kx = 0, w - 1 do
								if not libre(x + kx, z + kz, ly + h) then
									sigue = false
									break
								end
							end
							if not sigue then
								break
							end
						end
						if sigue then
							h += 1
						end
					end
					for kh = 0, h - 1 do
						for kz = 0, dz - 1 do
							for kx = 0, w - 1 do
								lleno[(ly + kh) * 256 + (z + kz) * 16 + x + kx + 1] = false
							end
						end
					end
					table.insert(piezas, caja(padre, bx + x, y0 + ly, bz + z, bx + x + w, y0 + ly + h, bz + z + dz))
				end
			end
		end
	end
	return piezas
end

-- Agua de Roblox en celdas de 4 studs: es agua si el bloque del centro de la celda es agua
local function agua(cx, cz, llenar)
	local md = Mundo.md
	local d = md:obtener(cx, cz)
	local ymin, ymax = CY, -1
	if llenar then
		for i = 0, CX * CZ * CY - 1 do
			local b = buffer.readu16(d, i * 2)
			if b >= 53 and b <= 60 then
				local y = i // (CX * CZ)
				if y < ymin then
					ymin = y
				end
				if y > ymax then
					ymax = y
				end
			end
		end
	end
	local f = Mundo.fisica[MundoDatos.clave(cx, cz)]
	if f and f.aguaRango then
		ymin = math.min(ymin, f.aguaRango[1])
		ymax = math.max(ymax, f.aguaRango[2])
	end
	if ymax < 0 then
		return
	end
	local NV = CX * BS // 4
	local vy0 = math.floor(ymin * BS / 4)
	local vy1 = math.ceil((ymax + 1) * BS / 4)
	local x0, z0 = cx * CX * BS, cz * CZ * BS
	local region = Region3.new(Vector3.new(x0, vy0 * 4, z0), Vector3.new(x0 + CX * BS, vy1 * 4, z0 + CZ * BS))
	local mats, occ = table.create(NV), table.create(NV)
	local hay = false
	for ix = 1, NV do
		local mx, ox = {}, {}
		mats[ix], occ[ix] = mx, ox
		for iy = 1, vy1 - vy0 do
			local my, oy = table.create(NV), table.create(NV)
			mx[iy], ox[iy] = my, oy
			for iz = 1, NV do
				local m, o = Enum.Material.Air, 0
				if llenar then
					local bx = math.floor((x0 + (ix - 0.5) * 4) / BS)
					local by = math.floor(((vy0 + iy - 0.5) * 4) / BS)
					local bz = math.floor((z0 + (iz - 0.5) * 4) / BS)
					local b = md:get(bx, by, bz)
					if esAgua(b) then
						m = Enum.Material.Water
						local nivel = (BL[b] and BL[b].nivelL) or 0
						o = nivel == 0 and 1 or math.max(0.2, (8 - nivel) / 8)
						hay = true
					end
				end
				my[iz], oy[iz] = m, o
			end
		end
	end
	workspace.Terrain:WriteVoxels(region, 4, mats, occ)
	if f then
		f.aguaRango = hay and { ymin, ymax } or nil
	end
end

function Mundo.tieneFisica(cx, cz)
	return Mundo.fisica[MundoDatos.clave(cx, cz)] ~= nil
end

function Mundo.asegurarFisica(cx, cz)
	local k = MundoDatos.clave(cx, cz)
	if Mundo.fisica[k] then
		return
	end
	local modelo = Instance.new("Folder")
	modelo.Name = cx .. "," .. cz
	local f = { modelo = modelo, secciones = {} }
	Mundo.fisica[k] = f
	local d = Mundo.md:obtener(cx, cz)
	-- Altura máxima con bloques
	local ymax = 0
	for y = CY - 1, 0, -1 do
		local o = y * CX * CZ * 2
		local hay = false
		for i = 0, CX * CZ - 1 do
			if buffer.readu16(d, o + i * 2) ~= 0 then
				hay = true
				break
			end
		end
		if hay then
			ymax = y
			break
		end
	end
	for sy = 0, NSEC - 1 do
		if sy * SEC <= ymax then
			f.secciones[sy] = construirSeccion(cx, cz, sy, modelo)
		end
	end
	modelo.Parent = carpeta
	agua(cx, cz, true)
	f.lista = true
end

function Mundo.quitarFisica(cx, cz)
	local k = MundoDatos.clave(cx, cz)
	local f = Mundo.fisica[k]
	if not f then
		return
	end
	Mundo.fisica[k] = nil
	f.modelo:Destroy()
	if f.aguaRango then
		f.aguaRango = nil
		local x0, z0 = cx * CX * BS, cz * CZ * BS
		workspace.Terrain:FillBlock(CFrame.new(x0 + CX * BS / 2, CY * BS / 2, z0 + CZ * BS / 2), Vector3.new(CX * BS, CY * BS, CZ * BS), Enum.Material.Air)
	end
end

local seccionesSucias = {} -- clave -> {[sy] = true}
local aguaSucia = {} -- clave -> true
local function rehacer(cx, cz, sy)
	if sy < 0 or sy >= NSEC then
		return
	end
	local k = MundoDatos.clave(cx, cz)
	if not Mundo.fisica[k] then
		return
	end
	seccionesSucias[k] = seccionesSucias[k] or {}
	seccionesSucias[k][sy] = true
end

------------------------------------------------------------------
-- Cambiar bloques
------------------------------------------------------------------
-- opc.sinAviso: no avisa a la simulación (líquidos, soporte…)
function Mundo.set(x, y, z, id, opc)
	if y < 0 or y >= CY then
		return 0
	end
	local antes = Mundo.md:set(x, y, z, id)
	if antes == id then
		return antes
	end
	local cx, cz = x // CX, z // CZ
	local sy = y // SEC
	rehacer(cx, cz, sy)
	if esAgua(antes) or esAgua(id) then
		aguaSucia[MundoDatos.clave(cx, cz)] = true
	end
	table.insert(cola, { x, y, z, id })
	if not (opc and opc.sinAviso) then
		for _, fn in alCambiar do
			fn(x, y, z, antes, id)
		end
	end
	return antes
end

-- Ediciones de un chunk (para los clientes que lo piden)
function Mundo.ediciones(cx, cz)
	return Mundo.md.ediciones[MundoDatos.clave(cx, cz)]
end

RunService.Heartbeat:Connect(function()
	-- Colisiones y agua que cambiaron
	for k, secs in seccionesSucias do
		local f = Mundo.fisica[k]
		if f then
			local cx, cz = MundoDatos.desclave(k)
			for sy in secs do
				local viejas = f.secciones[sy]
				f.secciones[sy] = construirSeccion(cx, cz, sy, f.modelo)
				if viejas then
					for _, p in viejas do
						p:Destroy()
					end
				end
			end
		end
	end
	table.clear(seccionesSucias)
	for k in aguaSucia do
		if Mundo.fisica[k] then
			local cx, cz = MundoDatos.desclave(k)
			agua(cx, cz, true)
		end
	end
	table.clear(aguaSucia)
	-- Enviar los cambios a los jugadores (en lotes)
	if #cola > 0 then
		local lote = cola
		cola = {}
		local plano = table.create(#lote * 4)
		for i, c in lote do
			plano[i * 4 - 3], plano[i * 4 - 2], plano[i * 4 - 1], plano[i * 4] = c[1], c[2], c[3], c[4]
		end
		RBloques:FireAllClients(plano)
	end
end)

------------------------------------------------------------------
-- Consultas
------------------------------------------------------------------
function Mundo.alturaSuelo(x, z)
	return Mundo.md:alturaSuelo(x, z)
end

function Mundo.alCielo(x, y, z)
	return Mundo.md:alCielo(x, y, z)
end

function Mundo.bioma(x, z)
	return Mundo.md:bioma(x, z)
end

-- ¿Hay un bloque de esos ids cerca? (mesas de trabajo, hornos…)
function Mundo.hayCerca(pos, ids, radio)
	local x0, y0, z0 = math.floor(pos.X / BS), math.floor(pos.Y / BS), math.floor(pos.Z / BS)
	for y = y0 - radio, y0 + radio do
		for x = x0 - radio, x0 + radio do
			for z = z0 - radio, z0 + radio do
				local b = Mundo.md:getSiCargado(x, y, z)
				if b > 0 and ids[b] then
					return true
				end
			end
		end
	end
	return false
end

return Mundo
