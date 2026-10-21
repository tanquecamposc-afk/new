--[[
	Blockverse para Roblox · Tienda con Robux (servidor)
	· Pases (VIP, Monedas x2, Todos los efectos): se miran al entrar y al comprarlos.
	· Productos (monedas y cosas de cada modo): se entregan en ProcessReceipt, que Roblox
	  repite hasta que contestamos «entregado». Cada compra se apunta en el DataStore
	  (clave r_<PurchaseId>) para no darla nunca dos veces, y si no se puede guardar el
	  perfil se contesta «aún no» para que Roblox lo vuelva a intentar más tarde.
	· Si una compra de un modo ya no se puede usar (por ejemplo, saliste de la mazmorra),
	  se devuelve en monedas y se avisa.
	· En Roblox Studio, lo que aún no tiene ID se da gratis al pulsarlo, para probarlo.
]]
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local MarketplaceService = game:GetService("MarketplaceService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Comp = ReplicatedStorage:WaitForChild("Blockverse")
local Registro = require(Comp.Registro)
local Prod = require(Comp.ProductosRobux)
local Perfil = require(script.Parent.PerfilBW)

local I, B = Registro.I, Registro.B
local Tienda = {}
local ctx -- {Estado, estados, almacen, darOSoltar, supervivencia, aviso, titulo, BW, MZ, LY, Modos}

local POR_PRODUCTO, POR_PASE = {}, {}
for _, x in Prod.PRODUCTOS do
	if x.id and x.id > 0 then
		POR_PRODUCTO[x.id] = x
	end
end
for _, x in Prod.PASES do
	if x.id and x.id > 0 then
		POR_PASE[x.id] = x
	end
end

local function esStudio()
	local ok, si = pcall(function()
		return RunService:IsStudio()
	end)
	return ok and si == true
end

-- ¿Sale en la tienda? (con ID, o en Studio para probarlo)
function Tienda.disponible(clave)
	local x = Prod.POR_CLAVE[clave]
	return x ~= nil and ((x.id or 0) > 0 or esStudio())
end

------------------------------------------------------------------
-- Pases
------------------------------------------------------------------
local pases = {} -- plr -> {clave = true}

function Tienda.tienePase(plr, clave)
	return pases[plr] ~= nil and pases[plr][clave] == true
end

-- Lo que da cada pase mientras se tiene
local function aplicarPases(plr)
	local t = pases[plr] or {}
	plr:SetAttribute("VIP", t.vip == true)
	if t.efectos and ctx.BW and ctx.BW.EFECTOS then
		local perfil = Perfil.de(plr)
		local cambio = false
		for _, e in ctx.BW.EFECTOS do
			if not perfil.efectos[e.id] then
				perfil.efectos[e.id] = true
				cambio = true
			end
		end
		if cambio then
			Perfil.guardar(plr)
		end
	end
end

local function darPase(plr, x, nuevo)
	pases[plr] = pases[plr] or {}
	pases[plr][x.clave] = true
	aplicarPases(plr)
	if nuevo then
		ctx.Estado:FireClient(plr, "compraHecha", { nombre = x.nombre, clave = x.clave, color = x.color })
		ctx.Estado:FireClient(plr, "perfil", ctx.Modos.perfilMenu(plr))
	end
end

local function mirarPases(plr)
	for _, x in Prod.PASES do
		if (x.id or 0) > 0 then
			local ok, tiene = pcall(function()
				return MarketplaceService:UserOwnsGamePassAsync(plr.UserId, x.id)
			end)
			if ok and tiene then
				darPase(plr, x, false)
			end
		end
	end
end

-- Multiplicador de monedas de Bed Wars: VIP +50 %, Monedas x2 el doble (juntos x2,5)
function Tienda.multMonedas(plr)
	local m = 1
	if Tienda.tienePase(plr, "vip") then
		m += 0.5
	end
	if Tienda.tienePase(plr, "monedasX2") then
		m += 1
	end
	return m
end

------------------------------------------------------------------
-- Productos: lo que da cada uno. Devuelve true si se entregó (o se devolvió en monedas)
------------------------------------------------------------------
local function darMonedas(plr, n)
	local perfil = Perfil.de(plr)
	perfil.monedas += n
	return true
end

-- ¿Se puede usar ahora mismo? (para no cobrar algo que no sirve)
function Tienda.sePuedeUsar(plr, x)
	if x.modo == "mazmorras" then
		return ctx.MZ.puedeVidaExtra(plr), "Solo dentro de una mazmorra"
	elseif x.modo == "leyendas" then
		return ctx.LY.puedeRecursos(plr), "Solo dentro de Leyendas"
	elseif x.modo == "supervivencia" then
		local s = ctx.estados[plr]
		local ok = s ~= nil and ctx.supervivencia(s) and (s.ob ~= nil or not ctx.Modos.activo(plr))
		return ok, "Solo en Supervivencia o One Block"
	end
	return true, nil
end

local KIT_AVENTURERO = {
	{ I.pico_hierro, 1 }, { I.espada_hierro, 1 }, { I.hacha_hierro, 1 }, { I.pan, 16 }, { B.antorcha, 32 }, { B.cama, 1 },
}

local function entregar(plr, x)
	if x.monedas and x.grupo == "monedas" then
		darMonedas(plr, x.monedas)
		return true, ("+%d monedas"):format(x.monedas)
	end
	local puede = Tienda.sePuedeUsar(plr, x)
	if puede then
		if x.clave == "vidaMZ" and ctx.MZ.vidaExtra(plr) then
			return true, "¡Una vida más!"
		elseif x.clave == "recursosLY" and ctx.LY.recursos(plr, 40, 40, 10) then
			return true, "+40 madera, +40 piedra y +10 oro"
		elseif x.clave == "kitAventurero" then
			for _, it in KIT_AVENTURERO do
				if it[1] then
					ctx.darOSoltar(plr, Registro.pila(it[1], it[2]))
				end
			end
			return true, "Kit de aventurero en tu inventario"
		end
	end
	-- Ya no se puede usar: se devuelve en monedas, para que nadie pierda lo que pagó
	darMonedas(plr, x.monedas or 100)
	return true, ("Ya no se podía usar: te damos %d monedas a cambio"):format(x.monedas or 100)
end

local procesadas = {} -- PurchaseId -> true cuando ya está entregada y apuntada (en este servidor)
local entregadas = {} -- PurchaseId -> texto, si ya se dio pero aún no se pudo guardar o apuntar

local function procesar(info)
	local plr = Players:GetPlayerByUserId(info.PlayerId)
	local x = POR_PRODUCTO[info.ProductId]
	if not plr or not x then
		return Enum.ProductPurchaseDecision.NotYetGranted
	end
	local id = info.PurchaseId
	if procesadas[id] then
		return Enum.ProductPurchaseDecision.PurchaseGranted
	end
	local almacen = ctx.almacen
	local clave = "r_" .. tostring(id)
	-- ¿Ya se entregó y apuntó en otra sesión?
	if almacen and not entregadas[id] then
		local ok, ya = pcall(function()
			return almacen:GetAsync(clave)
		end)
		if not ok then
			return Enum.ProductPurchaseDecision.NotYetGranted
		end
		if ya then
			procesadas[id] = true
			return Enum.ProductPurchaseDecision.PurchaseGranted
		end
	end
	-- Si el perfil no se pudo cargar bien no se guardaría: mejor esperar a otra vez
	if not Perfil.sePuedeGuardar(plr) then
		return Enum.ProductPurchaseDecision.NotYetGranted
	end
	-- Se entrega una sola vez por compra (aunque Roblox lo reintente si algo falla después)
	if not entregadas[id] then
		local okE, hecho, texto = pcall(entregar, plr, x)
		if not okE or not hecho then
			warn("[Blockverse] No se pudo entregar " .. x.clave .. ": " .. tostring(hecho))
			return Enum.ProductPurchaseDecision.NotYetGranted
		end
		entregadas[id] = texto or ""
	end
	-- Primero se guarda lo entregado y luego se apunta la compra
	if almacen and not Perfil.guardarAhora(plr) then
		return Enum.ProductPurchaseDecision.NotYetGranted
	end
	if almacen then
		local okG = pcall(function()
			almacen:SetAsync(clave, true)
		end)
		if not okG then
			return Enum.ProductPurchaseDecision.NotYetGranted
		end
	end
	procesadas[id] = true
	local texto = entregadas[id]
	entregadas[id] = nil
	ctx.Estado:FireClient(plr, "compraHecha", { nombre = x.nombre, clave = x.clave, texto = texto })
	ctx.Estado:FireClient(plr, "perfil", ctx.Modos.perfilMenu(plr))
	ctx.enviarJugador(plr)
	return Enum.ProductPurchaseDecision.PurchaseGranted
end
Tienda._procesar = procesar

------------------------------------------------------------------
-- Lo que ve el cliente
------------------------------------------------------------------
local precios = {} -- id -> precio real en Robux (se pregunta una vez)
local function precioDe(x)
	if (x.id or 0) <= 0 then
		return x.precio
	end
	if precios[x.id] == nil then
		precios[x.id] = false
		task.spawn(function()
			local ok, info = pcall(function()
				return MarketplaceService:GetProductInfo(x.id, x.tipo == "pase" and Enum.InfoType.GamePass or Enum.InfoType.Product)
			end)
			if ok and info and info.PriceInRobux then
				precios[x.id] = info.PriceInRobux
			end
		end)
	end
	return precios[x.id] or x.precio
end

local function idc(k)
	return B[k] or I[k]
end

function Tienda.datos(plr)
	local studio = esStudio()
	local lista = {}
	local function meter(x)
		if (x.id or 0) <= 0 and not studio then
			return
		end
		local puede, motivo = true, nil
		if x.tipo == "producto" then
			puede, motivo = Tienda.sePuedeUsar(plr, x)
		end
		table.insert(lista, {
			clave = x.clave, tipo = x.tipo, nombre = x.nombre, desc = x.desc, ventajas = x.ventajas, icono = idc(x.icono), color = x.color,
			etiqueta = x.etiqueta, extra = x.extra, grupo = x.grupo or "pases", modo = x.modo, donde = x.donde, monedas = x.monedas,
			precio = precioDe(x), tiene = x.tipo == "pase" and Tienda.tienePase(plr, x.clave) or nil, puede = puede, motivo = motivo,
			sinConfigurar = (x.id or 0) <= 0,
		})
	end
	for _, x in Prod.PASES do
		meter(x)
	end
	for _, x in Prod.PRODUCTOS do
		meter(x)
	end
	return { lista = lista, monedas = Perfil.de(plr).monedas, studio = studio, mult = Tienda.multMonedas(plr) }
end

function Tienda.enviar(plr, pestana)
	ctx.Estado:FireClient(plr, "tiendaRobux", Tienda.datos(plr), pestana)
end

-- El jugador pulsa «Comprar»
function Tienda.pedir(plr, clave)
	local x = type(clave) == "string" and Prod.POR_CLAVE[clave]
	if not x then
		return
	end
	if x.tipo == "pase" and Tienda.tienePase(plr, x.clave) then
		return
	end
	if x.tipo == "producto" then
		local puede, motivo = Tienda.sePuedeUsar(plr, x)
		if not puede then
			ctx.aviso(plr, (motivo or "Ahora no se puede usar") .. ": así no lo pagas para nada")
			return
		end
	end
	if (x.id or 0) <= 0 then
		-- Sin ID: solo en Studio, gratis, para probar cómo queda
		if esStudio() then
			ctx.aviso(plr, "Prueba en Studio: no se cobra (pon el ID en ProductosRobux para venderlo)")
			if x.tipo == "pase" then
				darPase(plr, x, true)
			else
				local _, texto = entregar(plr, x)
				Perfil.guardar(plr)
				ctx.Estado:FireClient(plr, "compraHecha", { nombre = x.nombre, clave = x.clave, texto = texto })
				ctx.Estado:FireClient(plr, "perfil", ctx.Modos.perfilMenu(plr))
				ctx.enviarJugador(plr)
			end
			Tienda.enviar(plr)
		end
		return
	end
	pcall(function()
		if x.tipo == "pase" then
			MarketplaceService:PromptGamePassPurchase(plr, x.id)
		else
			MarketplaceService:PromptProductPurchase(plr, x.id)
		end
	end)
end

function Tienda.iniciar(c)
	ctx = c
	Perfil.multMonedas = Tienda.multMonedas
	Perfil.multDiaria = function(plr)
		return Tienda.tienePase(plr, "vip") and 2 or 1
	end
	MarketplaceService.ProcessReceipt = procesar
	MarketplaceService.PromptGamePassPurchaseFinished:Connect(function(plr, id, comprado)
		local x = POR_PASE[id]
		if comprado and x and plr.Parent then
			darPase(plr, x, true)
			Tienda.enviar(plr)
		end
	end)
	Players.PlayerAdded:Connect(function(plr)
		task.spawn(mirarPases, plr)
	end)
	for _, plr in Players:GetPlayers() do
		task.spawn(mirarPases, plr)
	end
	Players.PlayerRemoving:Connect(function(plr)
		pases[plr] = nil
	end)
end

return Tienda
