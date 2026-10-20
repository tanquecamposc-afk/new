--[[
	Blockverse para Roblox · Perfil de Bed Wars de cada jugador (se guarda en DataStore)
	· Monedas, experiencia con nivel y estrellas [N★], estadísticas, racha de victorias.
	· Kits comprados con su nivel, kit equipado y efecto de baja final equipado.
	· Misiones diarias: tres al día, iguales para todo el servidor, con su recompensa.
	Si el DataStore no está disponible (Studio sin acceso), todo funciona igual en memoria.
]]
local DataStoreService = game:GetService("DataStoreService")

local Perfil = {}
local almacen
pcall(function()
	almacen = DataStoreService:GetDataStore("Blockverse_BW_v1")
end)
local perfiles = {} -- plr -> perfil
local sinGuardar = {} -- plr -> true si la carga falló (no se pisa lo guardado)

local function nuevo()
	return {
		monedas = 0, xp = 0, partidas = 0, victorias = 0, bajas = 0, finales = 0, camas = 0, muertes = 0, racha = 0, mejorRacha = 0,
		kits = { ninguno = 1 }, kit = "ninguno", efectos = { ninguno = true }, efecto = "ninguno", misiones = nil,
	}
end

-- Niveles: 500 de experiencia por nivel; el color de las estrellas cambia con el nivel
function Perfil.nivel(xp)
	return 1 + (xp or 0) // 500
end
function Perfil.colorNivel(n)
	return n >= 100 and "#ff55ff" or (n >= 50 and "#55ffff" or (n >= 20 and "#ffaa00" or (n >= 10 and "#ffff55" or "#aaaaaa")))
end
function Perfil.etiqueta(p)
	return ("[%d★]"):format(Perfil.nivel(p and p.xp or 0))
end

------------------------------------------------------------------
-- Misiones diarias
------------------------------------------------------------------
local MISIONES = {
	{ k = "camas", n = "Rompe %d camas", meta = { 1, 2 }, premio = 60 },
	{ k = "bajas", n = "Consigue %d bajas", meta = { 5, 10 }, premio = 50 },
	{ k = "finales", n = "Consigue %d bajas finales", meta = { 2, 4 }, premio = 70 },
	{ k = "victorias", n = "Gana %d partidas", meta = { 1, 2 }, premio = 120 },
	{ k = "partidas", n = "Juega %d partidas", meta = { 2, 3 }, premio = 40 },
	{ k = "compras", n = "Compra %d veces en la tienda", meta = { 15, 30 }, premio = 40 },
	{ k = "cofres", n = "Abre %d cofres del cielo", meta = { 1, 2 }, premio = 80 },
	{ k = "mejoras", n = "Compra %d mejoras o trampas para tu equipo", meta = { 2, 4 }, premio = 50 },
}
Perfil.MISIONES = MISIONES

local function dia()
	return os.time() // 86400
end
-- Las tres misiones del día (las mismas para todos)
function Perfil.misionesDelDia(d)
	d = d or dia()
	local r = Random.new(d * 7919 + 13)
	local idx = {}
	for i = 1, #MISIONES do
		idx[i] = i
	end
	for i = #idx, 2, -1 do
		local j = r:NextInteger(1, i)
		idx[i], idx[j] = idx[j], idx[i]
	end
	local res = {}
	for k = 1, 3 do
		local M = MISIONES[idx[k]]
		local m = M.meta[r:NextInteger(1, #M.meta)]
		table.insert(res, { k = M.k, texto = M.n:format(m), meta = m, premio = M.premio + (m > M.meta[1] and 30 or 0), progreso = 0, hecha = false })
	end
	return res
end

local function asegurarMisiones(p)
	local d = dia()
	if not p.misiones or p.misiones.dia ~= d then
		p.misiones = { dia = d, lista = Perfil.misionesDelDia(d) }
	end
	return p.misiones.lista
end
Perfil.misiones = function(plr)
	local p = Perfil.de(plr)
	return asegurarMisiones(p)
end

-- Suma progreso a las misiones; devuelve las que se acaban de completar (ya cobradas)
function Perfil.progreso(plr, clave, n)
	local p = Perfil.de(plr)
	local hechas = {}
	for _, m in asegurarMisiones(p) do
		if m.k == clave and not m.hecha then
			m.progreso = math.min(m.meta, m.progreso + (n or 1))
			if m.progreso >= m.meta then
				m.hecha = true
				p.monedas += m.premio
				table.insert(hechas, m)
			end
		end
	end
	return hechas
end

------------------------------------------------------------------
-- Cargar y guardar
------------------------------------------------------------------
local function limpiar(g)
	local p = nuevo()
	if type(g) ~= "table" then
		return p
	end
	for _, k in { "monedas", "xp", "partidas", "victorias", "bajas", "finales", "camas", "muertes", "racha", "mejorRacha" } do
		p[k] = math.max(0, math.floor(tonumber(g[k]) or 0))
	end
	if type(g.kits) == "table" then
		for k, v in g.kits do
			if type(k) == "string" and type(v) == "number" then
				p.kits[k] = math.clamp(math.floor(v), 1, 3)
			end
		end
	end
	if type(g.kit) == "string" then
		p.kit = g.kit
	end
	if type(g.efectos) == "table" then
		for k, v in g.efectos do
			if type(k) == "string" and v == true then
				p.efectos[k] = true
			end
		end
	end
	if type(g.efecto) == "string" then
		p.efecto = g.efecto
	end
	if type(g.misiones) == "table" and type(g.misiones.lista) == "table" and tonumber(g.misiones.dia) then
		p.misiones = { dia = tonumber(g.misiones.dia), lista = {} }
		for _, m in g.misiones.lista do
			if type(m) == "table" and type(m.k) == "string" then
				table.insert(p.misiones.lista, { k = m.k, texto = tostring(m.texto or ""), meta = tonumber(m.meta) or 1, premio = tonumber(m.premio) or 0,
					progreso = tonumber(m.progreso) or 0, hecha = m.hecha == true })
			end
		end
	end
	return p
end

function Perfil.de(plr)
	local p = perfiles[plr]
	if not p then
		p = nuevo()
		if almacen and plr.UserId and plr.UserId > 0 then
			local ok, g = pcall(function()
				return almacen:GetAsync("bw_" .. plr.UserId)
			end)
			if ok then
				p = limpiar(g)
			else
				sinGuardar[plr] = true
				warn("[Blockverse] No se pudo cargar el perfil de Bed Wars de " .. plr.Name .. ": " .. tostring(g))
			end
		end
		perfiles[plr] = p
	end
	return p
end

local function guardarYa(plr)
	local p = perfiles[plr]
	if not p or not almacen or sinGuardar[plr] or not plr.UserId or plr.UserId <= 0 then
		return
	end
	local ok, err = pcall(function()
		almacen:SetAsync("bw_" .. plr.UserId, p)
	end)
	if not ok then
		warn("[Blockverse] No se pudo guardar el perfil de Bed Wars: " .. tostring(err))
	end
end

-- Guarda sin parar a quien lo llama (el DataStore tarda)
function Perfil.guardar(plr)
	task.spawn(guardarYa, plr)
end

function Perfil.olvidar(plr)
	guardarYa(plr)
	perfiles[plr] = nil
	sinGuardar[plr] = nil
end

-- Al cerrar el servidor se guardan todos
pcall(function()
	game:BindToClose(function()
		for plr in perfiles do
			guardarYa(plr)
		end
	end)
end)

return Perfil
