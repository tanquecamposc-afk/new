--[[
	Blockverse para Roblox · Crafteo
	Búsqueda de recetas igual que buscarReceta() de registro.js:
	recetas con forma (y en espejo), recetas sin forma y maderas
	equivalentes (los tablones de cualquier árbol sirven como roble).
]]
local Datos = script.Parent:WaitForChild("Datos")
local RECETAS = require(Datos:WaitForChild("Recetas"))
local Hornos = require(Datos:WaitForChild("Hornos"))
local Registro = require(script.Parent:WaitForChild("Registro"))

local Crafteo = {}
Crafteo.RECETAS = RECETAS
Crafteo.FUNDIR = Hornos.fundir
Crafteo.COMBUSTIBLE = Hornos.combustible
Crafteo.TIEMPO_FUNDIR = Hornos.tiempo or 10

local B = Registro.B
local EQUIV = {}
for clave, a in {
	tablonesAbedul = "tablones", tablonesAbeto = "tablones", tablonesJungla = "tablones", tablonesAcacia = "tablones",
	barril = "cofre", tablonesPalidos = "tablones", troncoPalido = "tronco", cofreCobre = "cofre", tablonesCerezo = "tablones",
	tablonesRobleOscuro = "tablones", troncoRobleOscuro = "tronco", tablonesMangle = "tablones", troncoCerezo = "tronco", troncoMangle = "tronco",
} do
	if B[clave] and B[a] then
		EQUIV[B[clave]] = B[a]
	end
end

-- Las recetas sin forma tienen la lista ordenada
for _, r in RECETAS do
	if r.sin then
		table.sort(r.sin)
	end
end

local function exacta(grid, w)
	local ids = {}
	for i = 1, w * w do
		if grid[i] and grid[i] ~= 0 then
			table.insert(ids, grid[i])
		end
	end
	if #ids == 0 then
		return nil
	end
	table.sort(ids)
	local x0, x1, y0, y1 = w, -1, w, -1
	for y = 0, w - 1 do
		for x = 0, w - 1 do
			local v = grid[y * w + x + 1]
			if v and v ~= 0 then
				x0, x1 = math.min(x0, x), math.max(x1, x)
				y0, y1 = math.min(y0, y), math.max(y1, y)
			end
		end
	end
	local gw, gh = x1 - x0 + 1, y1 - y0 + 1
	for _, r in RECETAS do
		if r.sin then
			if #r.sin == #ids then
				local ok = true
				for i, v in r.sin do
					if v ~= ids[i] then
						ok = false
						break
					end
				end
				if ok then
					return r
				end
			end
		elseif #r.patron == gh and #r.patron[1] == gw then
			for _, espejo in { false, true } do
				local ok = true
				for y = 0, gh - 1 do
					local fila = r.patron[y + 1]
					for x = 0, gw - 1 do
						local ch = string.sub(fila, espejo and (gw - x) or (x + 1), espejo and (gw - x) or (x + 1))
						local quiere = ch == "." and 0 or (r.clave[ch] or -1)
						local hay = grid[(y + y0) * w + x + x0 + 1] or 0
						if hay ~= quiere then
							ok = false
							break
						end
					end
					if not ok then
						break
					end
				end
				if ok then
					return r
				end
			end
		end
	end
	return nil
end

-- grid: lista de w*w ids (0 = vacío). Devuelve la receta o nil.
function Crafteo.buscar(grid, w)
	local r = exacta(grid, w)
	if r then
		return r
	end
	local hayEquiv = false
	for i = 1, w * w do
		if grid[i] and EQUIV[grid[i]] then
			hayEquiv = true
			break
		end
	end
	if not hayEquiv then
		return nil
	end
	local g2 = table.create(w * w, 0)
	for i = 1, w * w do
		local v = grid[i] or 0
		g2[i] = EQUIV[v] or v
	end
	return exacta(g2, w)
end

-- Ingredientes de una receta (para el libro de recetas): {[id] = cantidad}
function Crafteo.ingredientes(r)
	local t = {}
	if r.sin then
		for _, id in r.sin do
			t[id] = (t[id] or 0) + 1
		end
	else
		for _, fila in r.patron do
			for i = 1, #fila do
				local ch = string.sub(fila, i, i)
				if ch ~= "." then
					local id = r.clave[ch]
					if id then
						t[id] = (t[id] or 0) + 1
					end
				end
			end
		end
	end
	return t
end

-- ¿La receta necesita la mesa de trabajo? (si no cabe en 2x2)
function Crafteo.necesitaMesa(r)
	if r.sin then
		return #r.sin > 4
	end
	return #r.patron > 2 or #r.patron[1] > 2
end

-- Rellena una rejilla de w*w con la receta (para el libro de recetas)
function Crafteo.rejillaDe(r, w)
	local g = table.create(w * w, 0)
	if r.sin then
		for i, id in r.sin do
			g[i] = id
		end
	else
		for y, fila in r.patron do
			for x = 1, #fila do
				local ch = string.sub(fila, x, x)
				if ch ~= "." then
					g[(y - 1) * w + x] = r.clave[ch] or 0
				end
			end
		end
	end
	return g
end

-- Equivalencias: ¿este objeto cuenta como `id` en las recetas?
function Crafteo.equivale(objeto, id)
	return objeto == id or EQUIV[objeto] == id
end

return Crafteo
