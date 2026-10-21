--[[
	Blockverse para Roblox · Logros (como los avances de Minecraft)
	· 18 logros: los primeros sirven de guía para quien empieza (madera, mesa, pico,
	  piedra, horno, hierro…) y los demás son retos (diamantes, el Nether, el dragón,
	  ganar en Bed Wars, superar una mazmorra, salvar la aldea de Leyendas…).
	· Los de «consigue X» se miran en el inventario; los demás los avisa cada parte
	  del juego con Logros.conseguir(plr, id).
	· Se guardan en el DataStore (clave l_<UserId>) y salen en la tabla de jugadores
	  de Roblox (leaderstats), junto al nivel de Bed Wars.
	· En creativo no cuentan (ahí se tiene todo sin esfuerzo).
]]
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Comp = ReplicatedStorage:WaitForChild("Blockverse")
local Registro = require(Comp.Registro)

local B, I = Registro.B, Registro.I
local function idc(k)
	return B[k] or I[k]
end

local Logros = {}
local ctx -- {estados, Estado, almacen}

-- tiene = lista de objetos que lo consiguen al tenerlos; guia = pista para el siguiente paso
local LISTA = {
	{ id = "madera", n = "¡A por madera!", d = "Consigue un tronco", ico = "tronco", guia = "Pica un árbol (mantén el clic izquierdo) para conseguir un tronco",
		tiene = { "tronco", "troncoAbedul", "troncoAbeto", "troncoAcacia", "troncoCerezo", "troncoJungla", "troncoMangle", "troncoPalido", "troncoRobleOscuro" } },
	{ id = "mesa", n = "Manos a la obra", d = "Fabrica una mesa de trabajo", ico = "mesa", guia = "Abre el inventario (E), haz tablones y con 4 tablones una mesa de trabajo", tiene = { "mesa" } },
	{ id = "pico", n = "Hora de picar", d = "Fabrica un pico", ico = "pico_madera", guia = "Pon la mesa, ábrela y fabrica un pico con tablones y palos",
		tiene = { "pico_madera", "pico_piedra", "pico_cobre", "pico_hierro", "pico_oro", "pico_diamante", "pico_netherite" } },
	{ id = "piedra", n = "Edad de piedra", d = "Consigue roca con el pico", ico = "roca", guia = "Pica piedra con el pico para conseguir roca", tiene = { "roca" } },
	{ id = "horno", n = "Que arda", d = "Fabrica un horno", ico = "horno", guia = "Con 8 rocas en la mesa de trabajo fabrica un horno", tiene = { "horno" } },
	{ id = "hierro", n = "Edad de hierro", d = "Funde un lingote de hierro", ico = "lingoteHierro", guia = "Busca hierro en las cuevas y fúndelo en el horno con carbón", tiene = { "lingoteHierro" } },
	{ id = "cama", n = "Dulces sueños", d = "Duerme en una cama", ico = "cama", guia = "Fabrica una cama con lana y tablones y duerme de noche" },
	{ id = "cazador", n = "Cazador de monstruos", d = "Elimina a un monstruo", ico = "espada_piedra", guia = "Por la noche salen monstruos: elimina uno" },
	{ id = "pan", n = "Panadero", d = "Consigue pan", ico = "pan", tiene = { "pan" } },
	{ id = "diamantes", n = "¡Diamantes!", d = "Consigue un diamante", ico = "diamante", tiene = { "diamante" } },
	{ id = "encantar", n = "Encantador", d = "Encanta un objeto", ico = "libro" },
	{ id = "obsidiana", n = "Más duro que la piedra", d = "Consigue obsidiana", ico = "obsidiana", tiene = { "obsidiana" } },
	{ id = "nether", n = "Un viaje infernal", d = "Entra en el Nether", ico = "netherrack" },
	{ id = "fin", n = "¿El fin?", d = "Entra en el End", ico = "piedraEnd" },
	{ id = "dragon", n = "Libera el End", d = "Derrota al Ender Dragon", ico = "huevoDragon" },
	{ id = "bedwars", n = "Campeón de Bed Wars", d = "Gana una partida de Bed Wars", ico = "cama" },
	{ id = "mazmorra", n = "Explorador de mazmorras", d = "Derrota al jefe de una mazmorra", ico = "espada_diamante" },
	{ id = "leyendas", n = "Héroe de la aldea", d = "Destruye los tres portales en Leyendas", ico = "escudo" },
}
Logros.LISTA = LISTA
local POR_ID = {}
local POR_OBJETO = {} -- id del objeto -> lista de logros
for i, L in LISTA do
	L.orden = i
	L.icono = idc(L.ico) or I.esmeralda
	POR_ID[L.id] = L
	for _, k in L.tiene or {} do
		local id = idc(k)
		if id then
			POR_OBJETO[id] = POR_OBJETO[id] or {}
			table.insert(POR_OBJETO[id], L)
		end
	end
end
Logros.POR_ID = POR_ID

local datos = {} -- plr -> {conseguidos = {id = true}, sinGuardar}

-- Lo que el cliente necesita para la pantalla de logros y la guía
local function resumen(plr)
	local d = datos[plr]
	local lista = {}
	for _, L in LISTA do
		table.insert(lista, { id = L.id, n = L.n, d = L.d, icono = L.icono, hecho = d and d.conseguidos[L.id] == true or false, guia = L.guia })
	end
	return lista
end

local function tabla(plr)
	local ls = plr:FindFirstChild("leaderstats")
	if not ls then
		ls = Instance.new("Folder")
		ls.Name = "leaderstats"
		ls.Parent = plr
	end
	local function valor(nombre)
		local v = ls:FindFirstChild(nombre)
		if not v then
			v = Instance.new("IntValue")
			v.Name = nombre
			v.Parent = ls
		end
		return v
	end
	return valor("Nivel"), valor("Logros")
end

-- Actualiza la tabla de jugadores (nivel de Bed Wars con estrellas y logros)
function Logros.actualizarTabla(plr, nivelBW)
	local vNivel, vLogros = tabla(plr)
	if nivelBW then
		vNivel.Value = nivelBW
	end
	local n = 0
	for _ in (datos[plr] and datos[plr].conseguidos or {}) do
		n += 1
	end
	vLogros.Value = n
end

local function guardar(plr)
	local d = datos[plr]
	if not d or d.sinGuardar or not ctx.almacen or not plr.UserId or plr.UserId <= 0 then
		return
	end
	local lista = {}
	for id in d.conseguidos do
		table.insert(lista, id)
	end
	pcall(function()
		ctx.almacen:SetAsync("l_" .. plr.UserId, lista)
	end)
end

function Logros.cargar(plr)
	local d = { conseguidos = {} }
	datos[plr] = d
	if ctx.almacen and plr.UserId and plr.UserId > 0 then
		local ok, g = pcall(function()
			return ctx.almacen:GetAsync("l_" .. plr.UserId)
		end)
		if ok and type(g) == "table" then
			for _, id in g do
				if type(id) == "string" and POR_ID[id] then
					d.conseguidos[id] = true
				end
			end
		elseif not ok then
			d.sinGuardar = true
		end
	end
	Logros.actualizarTabla(plr)
	if plr.Parent then
		ctx.Estado:FireClient(plr, "logros", resumen(plr))
	end
end

function Logros.enviar(plr)
	if datos[plr] then
		ctx.Estado:FireClient(plr, "logros", resumen(plr))
	end
end

function Logros.tiene(plr, id)
	local d = datos[plr]
	return d ~= nil and d.conseguidos[id] == true
end

function Logros.conseguir(plr, id)
	local d = datos[plr]
	local L = POR_ID[id]
	if not d or not L or d.conseguidos[id] then
		return
	end
	local s = ctx.estados[plr]
	if s and s.modo == "creativo" then
		return
	end
	d.conseguidos[id] = true
	ctx.Estado:FireClient(plr, "logro", { id = id, n = L.n, d = L.d, icono = L.icono })
	ctx.Estado:FireClient(plr, "logros", resumen(plr))
	Logros.actualizarTabla(plr)
	-- Se guarda un poco después (por si llegan varios seguidos)
	d.guardarN = (d.guardarN or 0) + 1
	local yo = d.guardarN
	task.delay(3, function()
		if d.guardarN == yo and datos[plr] == d then
			guardar(plr)
		end
	end)
end

-- Mira el inventario: «consigue X» y objetos encantados
function Logros.revisarInventario(plr, s)
	local d = datos[plr]
	if not d or s.modo == "creativo" then
		return
	end
	for i = 1, #s.inv do
		local p = s.inv[i]
		if p then
			local ls = POR_OBJETO[p.id]
			if ls then
				for _, L in ls do
					if not d.conseguidos[L.id] then
						Logros.conseguir(plr, L.id)
					end
				end
			end
			if p.enc and next(p.enc) and not d.conseguidos.encantar and p.id ~= I.libroEncantado then
				Logros.conseguir(plr, "encantar")
			end
		end
	end
end

function Logros.olvidar(plr)
	guardar(plr)
	datos[plr] = nil
end

function Logros.iniciar(c)
	ctx = c
	game:BindToClose(function()
		for plr in datos do
			guardar(plr)
		end
	end)
	local _ = Players
end

return Logros
