--[[
	Blockverse para Roblox · Progreso (servidor)
	· Camino de Blockverse: experiencia de todos los modos (misiones, monstruos, partidas,
	  salas, portales, fases…), 50 niveles y una recompensa por nivel que se cobra a mano.
	· Misiones diarias (3) y semanales (3) que cambian solas; al cumplirlas sale un aviso.
	· Ruleta diaria gratis (2 giros con VIP), con las probabilidades a la vista.
	· Colección: títulos (encima de la cabeza y en el chat) y estelas (cola de color al moverse).
	· Personalización: capas, sombreros y mascotas (se desbloquean con el nivel o el VIP).
	· Ranking: los 10 con más experiencia de todo el juego (OrderedDataStore).
	Se guarda en el DataStore con la clave p_<UserId>.
]]
local Players = game:GetService("Players")
local DataStoreService = game:GetService("DataStoreService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Comp = ReplicatedStorage:WaitForChild("Blockverse")
local D = require(Comp.DatosProgreso)
local DE = require(Comp.DatosEstilo)
local Perfil = require(script.Parent.PerfilBW)

local Progreso = {}
Progreso.NIVEL_MAX = D.NIVEL_MAX
Progreso.xpNivel = D.xpNivel
local ctx -- {Estado, almacen, aviso}
local datos = {} -- plr -> datos guardados
local sinGuardar = {}
local ranking = { lista = {}, t = -1e9 }
local nombres = {} -- UserId -> nombre (para el ranking)

-- Experiencia que da cada cosa al hacerla (además de las misiones)
local XP_EVENTO = {
	monstruo = 4, partidaBW = 30, victoriaBW = 60, bajaBW = 8, camaBW = 20, salaMZ = 12, jefeMZ = 60,
	portalLY = 40, victoriaLY = 100, faseOB = 30, comer = 1,
}

local function hoy()
	return os.time() // 86400
end
local function semana()
	return (hoy() + 3) // 7 -- de lunes a domingo
end

-- Las misiones del día o de la semana salen siempre iguales para todos ese día
local function elegir(lista, semilla, n)
	local r = Random.new(semilla)
	local idx = {}
	for i = 1, #lista do
		idx[i] = i
	end
	for i = #idx, 2, -1 do
		local j = r:NextInteger(1, i)
		idx[i], idx[j] = idx[j], idx[i]
	end
	local m = {}
	for k = 1, math.min(n, #idx) do
		table.insert(m, { id = lista[idx[k]].id, prog = 0, cobrada = false })
	end
	return m
end

local function nuevo()
	return {
		nivel = 1, xp = 0, total = 0, reclamados = {}, titulo = "novato", estela = nil,
		dia = { id = -1, m = {} }, sem = { id = -1, m = {} }, ruleta = { dia = -1, usos = 0 },
	}
end

local function de(plr)
	local p = datos[plr]
	if not p then
		p = nuevo()
		datos[plr] = p
	end
	-- Misiones nuevas cada día y cada semana
	if p.dia.id ~= hoy() then
		p.dia = { id = hoy(), m = elegir(D.DIARIAS, hoy() * 7 + 1, 3) }
	end
	if p.sem.id ~= semana() then
		p.sem = { id = semana(), m = elegir(D.SEMANALES, semana() * 13 + 5, 3) }
	end
	return p
end
Progreso.de = de

local function porId(lista)
	local t = {}
	for _, m in lista do
		t[m.id] = m
	end
	return t
end
local DIA_ID, SEM_ID = porId(D.DIARIAS), porId(D.SEMANALES)

function Progreso.esVIP(plr)
	return plr:GetAttribute("VIP") == true
end

------------------------------------------------------------------
-- Guardar
------------------------------------------------------------------
local ordenado
local ultimoRanking = {} -- plr -> os.clock() de la última vez que se escribió en el ranking
-- Roblox limita las escrituras por minuto: el progreso se guarda como mucho cada 30 s
-- y el ranking cada 2 minutos (y siempre al salir)
local function guardarYa(plr, saliendo)
	local p = datos[plr]
	if not p or sinGuardar[plr] or not ctx.almacen or not plr.UserId or plr.UserId <= 0 then
		return
	end
	pcall(function()
		ctx.almacen:SetAsync("p_" .. plr.UserId, p)
	end)
	if ordenado and (saliendo or os.clock() - (ultimoRanking[plr] or -1e9) > 120) then
		ultimoRanking[plr] = os.clock()
		pcall(function()
			ordenado:SetAsync(tostring(plr.UserId), p.total)
		end)
	end
end
local pendienteGuardar = {}
local function guardar(plr)
	if pendienteGuardar[plr] then
		return
	end
	pendienteGuardar[plr] = true
	task.delay(30, function()
		pendienteGuardar[plr] = nil
		if datos[plr] then
			guardarYa(plr)
		end
	end)
end

function Progreso.cargar(plr)
	local p = nuevo()
	if ctx.almacen and plr.UserId and plr.UserId > 0 then
		local ok, g = pcall(function()
			return ctx.almacen:GetAsync("p_" .. plr.UserId)
		end)
		if ok and type(g) == "table" then
			for k, v in g do
				if p[k] ~= nil or k == "estela" or DE.TIPOS[k] then
					p[k] = v
				end
			end
			p.nivel = math.clamp(tonumber(p.nivel) or 1, 1, D.NIVEL_MAX)
			p.xp = math.max(0, tonumber(p.xp) or 0)
			p.total = math.max(0, tonumber(p.total) or 0)
			if type(p.reclamados) ~= "table" then
				p.reclamados = {}
			end
		elseif not ok then
			sinGuardar[plr] = true
		end
	end
	datos[plr] = p
	nombres[plr.UserId] = plr.Name
	de(plr)
	Progreso.aplicar(plr)
end

------------------------------------------------------------------
-- Lo desbloqueado y lo equipado
------------------------------------------------------------------
-- La claves de reclamados se guardan como texto (el DataStore no admite huecos en las listas)
local function reclamado(p, n)
	return p.reclamados[tostring(n)] == true
end

function Progreso.tieneTitulo(plr, id)
	local t = D.TITULO_ID[id]
	local p = de(plr)
	return t ~= nil and (t.nivel <= 1 or reclamado(p, t.nivel))
end
function Progreso.tieneEstela(plr, id)
	local e = D.ESTELA_ID[id]
	return e ~= nil and reclamado(de(plr), e.nivel)
end
-- Capas, sombreros y mascotas: con llegar al nivel del Camino (o tener VIP) basta
function Progreso.tieneCosmetico(plr, tipo, id)
	local T = DE.TIPOS[tipo]
	return T ~= nil and type(id) == "string" and DE.puede(T.id[id], de(plr).nivel, Progreso.esVIP(plr))
end

local function secuenciaEstela(e)
	if e.arcoiris then
		local c = {}
		for i, h in { 0, 0.15, 0.33, 0.5, 0.66, 0.83 } do
			table.insert(c, ColorSequenceKeypoint.new((i - 1) / 5, Color3.fromHSV(h, 0.8, 1)))
		end
		return ColorSequence.new(c)
	end
	return ColorSequence.new(Color3.fromHex(e.c1), Color3.fromHex(e.c2))
end

-- Título encima de la cabeza y estela en el personaje
function Progreso.aplicar(plr)
	local p = datos[plr]
	if not p then
		return
	end
	local t = D.TITULO_ID[p.titulo] or D.TITULOS[1]
	plr:SetAttribute("Titulo", t.n)
	plr:SetAttribute("TituloCol", t.col)
	plr:SetAttribute("NivelCamino", p.nivel)
	-- Los cosméticos los dibuja cada cliente (Cosmeticos.luau) con estos atributos
	for tipo, atr in { capa = "Capa", sombrero = "Sombrero", mascota = "Mascota" } do
		local id = p[tipo]
		plr:SetAttribute(atr, (id and Progreso.tieneCosmetico(plr, tipo, id)) and id or nil)
	end
	local ch = plr.Character
	if not ch then
		return
	end
	local cab = ch:FindFirstChild("Head")
	if cab then
		local g = cab:FindFirstChild("TituloJugador")
		if not g then
			g = Instance.new("BillboardGui")
			g.Name = "TituloJugador"
			g.Size = UDim2.fromOffset(180, 20)
			g.StudsOffset = Vector3.new(0, 2.6, 0)
			g.MaxDistance = 80
			g.LightInfluence = 0
			local l = Instance.new("TextLabel")
			l.Name = "Texto"
			l.BackgroundTransparency = 1
			l.Size = UDim2.fromScale(1, 1)
			l.Font = require(Comp:WaitForChild("Fuentes")).CABECERA
			l.TextScaled = true
			l.TextStrokeTransparency = 0.3
			l.Parent = g
			g.Parent = cab
		end
		local l = g:FindFirstChild("Texto")
		if l then
			l.Text = ("%s · Nv %d"):format(t.n, p.nivel)
			l.TextColor3 = Color3.fromHex(t.col)
		end
		-- En Bed Wars ya está el cartel del equipo
		g.Enabled = not plr:GetAttribute("BedWars")
	end
	local raiz = ch:FindFirstChild("HumanoidRootPart")
	if raiz then
		local tr = raiz:FindFirstChild("EstelaBlockverse")
		local e = p.estela and D.ESTELA_ID[p.estela]
		if not e or not Progreso.tieneEstela(plr, e.id) then
			if tr then
				tr:Destroy()
			end
		else
			if not tr then
				local a0 = Instance.new("Attachment")
				a0.Name = "EstelaA"
				a0.Position = Vector3.new(0, 0.9, 0)
				a0.Parent = raiz
				local a1 = Instance.new("Attachment")
				a1.Name = "EstelaB"
				a1.Position = Vector3.new(0, -0.9, 0)
				a1.Parent = raiz
				tr = Instance.new("Trail")
				tr.Name = "EstelaBlockverse"
				tr.Attachment0 = a0
				tr.Attachment1 = a1
				tr.Lifetime = 0.45
				tr.LightEmission = 0.6
				tr.FaceCamera = true
				tr.Transparency = NumberSequence.new(0.15, 1)
				tr.Parent = raiz
			end
			pcall(function()
				tr.Color = secuenciaEstela(e)
			end)
		end
	end
end

------------------------------------------------------------------
-- Experiencia, misiones y avisos
------------------------------------------------------------------
local function pendientes(plr)
	local p = de(plr)
	local n = 0
	for k = 1, p.nivel do
		if not reclamado(p, k) and k > 1 then
			n += 1
		end
	end
	for _, lista in { p.dia.m, p.sem.m } do
		for _, m in lista do
			local def = DIA_ID[m.id] or SEM_ID[m.id]
			if def and m.prog >= def.meta and not m.cobrada then
				n += 1
			end
		end
	end
	if Progreso.giros(plr) > 0 then
		n += 1
	end
	return n
end
Progreso.pendientes = pendientes

local function avisarPendientes(plr)
	ctx.Estado:FireClient(plr, "progresoPendientes", pendientes(plr))
end

function Progreso.ganarXP(plr, n)
	local p = de(plr)
	if n <= 0 then
		return
	end
	n = math.floor(n * (Progreso.esVIP(plr) and 1.25 or 1) + 0.5)
	p.total += n
	if p.nivel >= D.NIVEL_MAX then
		return
	end
	p.xp += n
	local subio = false
	while p.nivel < D.NIVEL_MAX and p.xp >= D.xpNivel(p.nivel) do
		p.xp -= D.xpNivel(p.nivel)
		p.nivel += 1
		subio = true
	end
	if p.nivel >= D.NIVEL_MAX then
		p.xp = 0
	end
	if subio then
		local r = D.RECOMPENSAS[p.nivel]
		ctx.Estado:FireClient(plr, "progresoAviso", { tipo = "nivel", nivel = p.nivel, texto = r and r.texto or "" })
		Progreso.aplicar(plr)
		avisarPendientes(plr)
	end
	guardar(plr)
end

-- Algo que cuenta para las misiones (romper, monstruo, partidaBW…)
function Progreso.evento(plr, ev, n)
	if not plr or not plr.Parent or not datos[plr] then
		return
	end
	n = n or 1
	local p = de(plr)
	for _, par in { { p.dia.m, DIA_ID }, { p.sem.m, SEM_ID } } do
		for _, m in par[1] do
			local def = par[2][m.id]
			if def and def.ev == ev and m.prog < def.meta then
				m.prog = math.min(def.meta, m.prog + n)
				if m.prog >= def.meta then
					ctx.Estado:FireClient(plr, "progresoAviso", { tipo = "mision", texto = def.t, xp = def.xp })
					avisarPendientes(plr)
				end
				guardar(plr)
			end
		end
	end
	if XP_EVENTO[ev] then
		Progreso.ganarXP(plr, XP_EVENTO[ev] * n)
	end
end

------------------------------------------------------------------
-- Acciones del jugador
------------------------------------------------------------------
function Progreso.cobrarMision(plr, cual, i)
	local p = de(plr)
	local lista = cual == "sem" and p.sem.m or p.dia.m
	local m = type(i) == "number" and lista[i]
	local def = m and (cual == "sem" and SEM_ID[m.id] or DIA_ID[m.id])
	if not def or m.cobrada or m.prog < def.meta then
		return false
	end
	m.cobrada = true
	Progreso.ganarXP(plr, def.xp)
	guardar(plr)
	return true
end

local function darRecompensa(plr, r)
	if r.tipo == "monedas" then
		Perfil.de(plr).monedas += r.valor
		Perfil.guardar(plr)
	elseif r.tipo == "xp" then
		Progreso.ganarXP(plr, r.valor)
	end
end

function Progreso.reclamar(plr, n)
	local p = de(plr)
	if type(n) ~= "number" or n < 2 or n > p.nivel or reclamado(p, n) then
		return false
	end
	local r = D.RECOMPENSAS[n]
	p.reclamados[tostring(n)] = true
	darRecompensa(plr, r)
	-- Lo nuevo se equipa solo si aún llevabas lo de serie
	if r.tipo == "titulo" and p.titulo == "novato" then
		p.titulo = r.valor
	elseif r.tipo == "estela" and not p.estela then
		p.estela = r.valor
	end
	Progreso.aplicar(plr)
	guardar(plr)
	return true
end

function Progreso.reclamarTodo(plr)
	local p = de(plr)
	local n = 0
	for k = 2, p.nivel do
		if Progreso.reclamar(plr, k) then
			n += 1
		end
	end
	return n
end

function Progreso.equipar(plr, tipo, id)
	local p = de(plr)
	if tipo == "titulo" and type(id) == "string" and Progreso.tieneTitulo(plr, id) then
		p.titulo = id
	elseif tipo == "estela" and (id == nil or id == "") then
		p.estela = nil
	elseif tipo == "estela" and type(id) == "string" and Progreso.tieneEstela(plr, id) then
		p.estela = id
	elseif DE.TIPOS[tipo] and (id == nil or id == "") then
		p[tipo] = nil
	elseif DE.TIPOS[tipo] and Progreso.tieneCosmetico(plr, tipo, id) then
		p[tipo] = id
	else
		return false
	end
	Progreso.aplicar(plr)
	guardar(plr)
	return true
end

-- Giros de ruleta que quedan hoy (1, o 2 con VIP)
function Progreso.giros(plr)
	local p = de(plr)
	local maxG = Progreso.esVIP(plr) and 2 or 1
	if p.ruleta.dia ~= hoy() then
		return maxG
	end
	return math.max(0, maxG - (p.ruleta.usos or 0))
end

function Progreso.girar(plr)
	if Progreso.giros(plr) <= 0 then
		return nil
	end
	local p = de(plr)
	if p.ruleta.dia ~= hoy() then
		p.ruleta = { dia = hoy(), usos = 0 }
	end
	p.ruleta.usos += 1
	local total = 0
	for _, r in D.RULETA do
		total += r.p
	end
	local x = math.random() * total
	local elegido = #D.RULETA
	for i, r in D.RULETA do
		x -= r.p
		if x <= 0 then
			elegido = i
			break
		end
	end
	darRecompensa(plr, D.RULETA[elegido])
	guardar(plr)
	return elegido
end

------------------------------------------------------------------
-- Ranking
------------------------------------------------------------------
local function actualizarRanking()
	if not ordenado or os.clock() - ranking.t < 120 then
		return
	end
	ranking.t = os.clock()
	task.spawn(function()
		local ok, pagina = pcall(function()
			return ordenado:GetSortedAsync(false, 10):GetCurrentPage()
		end)
		if not ok or type(pagina) ~= "table" then
			return
		end
		local lista = {}
		for _, e in pagina do
			local id = tonumber(e.key)
			if id and not nombres[id] then
				local okN, n = pcall(function()
					return Players:GetNameFromUserIdAsync(id)
				end)
				nombres[id] = okN and n or ("Jugador " .. tostring(id))
			end
			table.insert(lista, { nombre = nombres[id] or "?", total = e.value, id = id })
		end
		ranking.lista = lista
	end)
end

local function nivelDeTotal(total)
	local n, resto = 1, total
	while n < D.NIVEL_MAX and resto >= D.xpNivel(n) do
		resto -= D.xpNivel(n)
		n += 1
	end
	return n
end

------------------------------------------------------------------
-- Todo lo que necesita la ventana
------------------------------------------------------------------
function Progreso.datos(plr)
	local p = de(plr)
	actualizarRanking()
	local function misiones(lista, defs)
		local t = {}
		for i, m in lista do
			local d = defs[m.id]
			if d then
				table.insert(t, { i = i, t = d.t, prog = m.prog, meta = d.meta, xp = d.xp, cobrada = m.cobrada })
			end
		end
		return t
	end
	local camino = {}
	for n = 1, D.NIVEL_MAX do
		local r = D.RECOMPENSAS[n]
		camino[n] = { texto = r.texto, tipo = r.tipo, valor = r.valor, grande = r.grande, cobrado = n == 1 or reclamado(p, n) }
	end
	local titulos, estelas = {}, {}
	for _, t in D.TITULOS do
		table.insert(titulos, { id = t.id, n = t.n, col = t.col, nivel = t.nivel, tiene = Progreso.tieneTitulo(plr, t.id), puesto = p.titulo == t.id })
	end
	for _, e in D.ESTELAS do
		table.insert(estelas, { id = e.id, n = e.n, c1 = e.c1, c2 = e.c2, nivel = e.nivel, tiene = Progreso.tieneEstela(plr, e.id), puesto = p.estela == e.id })
	end
	-- El ranking: los 10 primeros y tú (con los que están en el servidor por si aún no se ha leído)
	local top = {}
	for i, r in ranking.lista do
		table.insert(top, { pos = i, nombre = r.nombre, total = r.total, nivel = nivelDeTotal(r.total), yo = r.id == plr.UserId })
	end
	if #top == 0 then
		local aqui = {}
		for o, po in datos do
			table.insert(aqui, { nombre = o.Name, total = po.total, yo = o == plr })
		end
		table.sort(aqui, function(a, b)
			return a.total > b.total
		end)
		for i, r in aqui do
			if i <= 10 then
				table.insert(top, { pos = i, nombre = r.nombre, total = r.total, nivel = nivelDeTotal(r.total), yo = r.yo })
			end
		end
	end
	local ahora = os.time()
	return {
		nivel = p.nivel, xp = p.xp, xpNec = D.xpNivel(p.nivel), total = p.total, max = D.NIVEL_MAX, camino = camino,
		diarias = misiones(p.dia.m, DIA_ID), semanales = misiones(p.sem.m, SEM_ID),
		finDia = 86400 - ahora % 86400, finSemana = (7 - ((hoy() + 3) % 7)) * 86400 - ahora % 86400,
		giros = Progreso.giros(plr), vip = Progreso.esVIP(plr), ruleta = D.RULETA,
		titulos = titulos, estelas = estelas, ranking = top, pendientes = pendientes(plr),
		estilo = { capa = p.capa, sombrero = p.sombrero, mascota = p.mascota },
	}
end

function Progreso.enviar(plr, extra)
	ctx.Estado:FireClient(plr, "progreso", Progreso.datos(plr), extra)
end

-- Órdenes de la ventana
function Progreso.comando(plr, cmd, a, b)
	if not datos[plr] then
		return
	end
	local extra = nil
	if cmd == "reclamar" then
		if Progreso.reclamar(plr, a) then
			extra = { reclamado = a }
			ctx.Estado:FireClient(plr, "sonido", "nivel")
		end
	elseif cmd == "reclamarTodo" then
		local n = Progreso.reclamarTodo(plr)
		if n > 0 then
			extra = { reclamadoTodo = n }
			ctx.Estado:FireClient(plr, "sonido", "nivel")
		end
	elseif cmd == "cobrar" then
		if Progreso.cobrarMision(plr, a, b) then
			ctx.Estado:FireClient(plr, "sonido", "xp")
		end
	elseif cmd == "equipar" then
		Progreso.equipar(plr, a, b)
	elseif cmd == "girar" then
		local i = Progreso.girar(plr)
		if i then
			extra = { ruleta = i }
		end
	end
	Progreso.enviar(plr, extra)
	avisarPendientes(plr)
	ctx.Estado:FireClient(plr, "perfil", ctx.perfilMenu(plr))
end

function Progreso.iniciar(c)
	ctx = c
	pcall(function()
		ordenado = DataStoreService:GetOrderedDataStore("Blockverse_Ranking")
	end)
	local function alEntrar(plr)
		plr.CharacterAdded:Connect(function(ch)
			ch:WaitForChild("HumanoidRootPart", 10)
			ch:WaitForChild("Head", 10)
			Progreso.aplicar(plr)
		end)
		plr:GetAttributeChangedSignal("BedWars"):Connect(function()
			Progreso.aplicar(plr)
		end)
		-- Al comprar (o perder) el VIP se ponen o se quitan sus cosméticos
		plr:GetAttributeChangedSignal("VIP"):Connect(function()
			if datos[plr] then
				Progreso.aplicar(plr)
			end
		end)
		Progreso.cargar(plr)
		avisarPendientes(plr)
	end
	Players.PlayerAdded:Connect(alEntrar)
	-- Los que ya estaban (en Studio a veces el jugador entra antes que este script)
	for _, plr in Players:GetPlayers() do
		task.spawn(alEntrar, plr)
	end
	Players.PlayerRemoving:Connect(function(plr)
		guardarYa(plr, true)
		datos[plr] = nil
		sinGuardar[plr] = nil
		ultimoRanking[plr] = nil
	end)
	game:BindToClose(function()
		for plr in datos do
			guardarYa(plr, true)
		end
	end)
end

return Progreso
