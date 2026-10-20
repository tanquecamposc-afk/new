--[[
	Blockverse para Roblox · Botín de cofres
	Las mismas tablas que generarBotin() de mundo.js.
]]
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Comp = ReplicatedStorage:WaitForChild("Blockverse")
local Registro = require(Comp.Registro)

local B, I = Registro.B, Registro.I
local function i(clave, otro)
	return I[clave] or B[clave] or otro
end

local TABLAS = {
	mazmorra = { { i("pan"), 1, 3, 15 }, { i("lingoteHierro"), 1, 4, 10 }, { i("lingoteOro"), 1, 4, 5 }, { i("carnePodrida"), 1, 8, 10 }, { i("hueso"), 1, 8, 10 },
		{ i("polvora"), 1, 8, 10 }, { i("cuerda"), 1, 8, 10 }, { i("trigo"), 1, 4, 10 }, { i("cubo"), 1, 1, 5 }, { i("manzanaDorada"), 1, 1, 2 },
		{ i("redstone"), 1, 4, 5 }, { i("diamante"), 1, 2, 2 }, { i("semillas"), 2, 4, 8 } },
	fortaleza = { { i("perlaEnder"), 1, 2, 10 }, { i("pan"), 1, 3, 15 }, { i("manzana"), 1, 3, 15 }, { i("lingoteHierro"), 1, 5, 10 }, { i("lingoteOro"), 1, 3, 5 },
		{ i("redstone"), 4, 9, 5 }, { i("diamante"), 1, 3, 3 }, { 412, 1, 1, 2 }, { 302, 1, 1, 3 }, { 332, 1, 1, 3 }, { i("libro"), 1, 3, 5 } },
	aldea = { { i("pan"), 1, 4, 15 }, { i("manzana"), 1, 5, 15 }, { i("trigo"), 2, 7, 10 }, { i("semillas"), 2, 5, 10 }, { i("esmeralda"), 1, 4, 6 },
		{ i("lingoteHierro"), 1, 3, 5 }, { B.antorcha, 1, 8, 8 }, { i("cuero"), 1, 3, 6 } },
	mina = { { i("pan"), 1, 3, 15 }, { i("lingoteHierro"), 1, 5, 10 }, { i("lingoteOro"), 1, 3, 5 }, { i("redstone"), 4, 9, 5 }, { i("lapis"), 4, 9, 5 },
		{ i("diamante"), 1, 2, 3 }, { i("carbon"), 3, 8, 10 }, { i("semillas"), 2, 4, 10 }, { B.riel, 4, 8, 8 }, { i("manzanaDorada"), 1, 1, 2 } },
	iglu = { { i("manzana"), 1, 3, 15 }, { i("carbon"), 1, 4, 15 }, { i("pepitaOro"), 1, 3, 10 }, { i("trigo"), 2, 3, 10 }, { B.piedra, 1, 1, 5 }, { i("manzanaDorada"), 1, 1, 1 } },
	templo = { { i("hueso"), 4, 6, 20 }, { i("carnePodrida"), 3, 7, 16 }, { i("lingoteHierro"), 1, 5, 15 }, { i("lingoteOro"), 2, 7, 15 }, { i("esmeralda"), 1, 3, 10 },
		{ i("diamante"), 1, 3, 3 }, { i("flecha"), 4, 12, 8 } },
	bruja = { { i("ojoArana"), 1, 3, 15 }, { i("polvoLuminoso"), 1, 4, 10 }, { i("azucar", 516), 1, 4, 10 }, { i("redstone"), 1, 4, 10 }, { i("frasco", 500), 1, 3, 10 } },
	naufragio = { { i("esmeralda"), 1, 5, 15 }, { i("lingoteHierro"), 1, 5, 15 }, { i("lingoteOro"), 1, 5, 10 }, { i("pan"), 1, 3, 10 }, { i("papel"), 1, 5, 10 },
		{ i("carbon"), 2, 8, 10 }, { i("diamante"), 1, 1, 2 } },
	piramide = { { i("hueso"), 4, 6, 25 }, { i("carnePodrida"), 3, 7, 16 }, { i("polvora"), 1, 8, 10 }, { B.arena, 1, 8, 10 }, { i("cuerda"), 1, 8, 10 },
		{ i("lingoteHierro"), 1, 5, 15 }, { i("lingoteOro"), 2, 7, 15 }, { i("esmeralda"), 1, 3, 15 }, { i("diamante"), 1, 3, 5 }, { i("manzanaDorada"), 1, 1, 6 },
		{ 304, 1, 1, 2 }, { 403, 1, 1, 2 } },
	fortalezaNether = { { i("diamante"), 1, 3, 5 }, { i("lingoteHierro"), 1, 5, 5 }, { i("lingoteOro"), 1, 3, 15 }, { 333, 1, 1, 5 }, { 411, 1, 1, 5 },
		{ i("mechero"), 1, 1, 5 }, { B.obsidiana, 2, 4, 2 }, { i("polvoBlaze"), 1, 3, 6 }, { i("cuerda"), 2, 6, 6 } },
	ciudadAntigua = { { i("manzanaDorada"), 1, 2, 6 }, { i("hueso"), 1, 15, 20 }, { i("harinaHueso"), 1, 15, 10 }, { i("carbon"), 6, 15, 10 },
		{ B.farolAlmas, 1, 4, 8 }, { 423, 1, 1, 3 }, { 344, 1, 1, 4 }, { i("perlaEnder"), 1, 3, 6 }, { i("lingoteHierro"), 1, 4, 6 } },
	ciudadEnd = { { i("diamante"), 2, 7, 5 }, { i("lingoteHierro"), 4, 8, 10 }, { i("lingoteOro"), 2, 7, 15 }, { i("esmeralda"), 2, 6, 2 }, { 344, 1, 1, 3 },
		{ 423, 1, 1, 3 }, { 314, 1, 1, 3 }, { 304, 1, 1, 3 }, { 433, 1, 1, 3 }, { i("perlaEnder"), 1, 2, 4 } },
}

local Botin = {}

-- Devuelve 27 casillas con botín del tipo pedido
function Botin.generar(tipo)
	local tabla = TABLAS[tipo] or { { i("pan"), 1, 2, 1 } }
	local validas = {}
	local total = 0
	for _, t in tabla do
		if t[1] and (Registro.objetos[t[1]] or Registro.bloques[t[1]]) and t[4] > 0 then
			table.insert(validas, t)
			total += t[4]
		end
	end
	local cofre = table.create(27, false)
	if total == 0 then
		return cofre
	end
	for _ = 1, 4 + math.random(0, 4) do
		local r = math.random() * total
		local t = validas[1]
		for _, e in validas do
			r -= e[4]
			if r <= 0 then
				t = e
				break
			end
		end
		local p = Registro.pila(t[1], math.random(t[2], t[3]))
		cofre[math.random(1, 27)] = p
	end
	return cofre
end

return Botin
