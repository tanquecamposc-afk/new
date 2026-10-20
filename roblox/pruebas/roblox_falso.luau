--[[
	Un «Roblox de mentira» muy simple para ejecutar los scripts de Blockverse
	con la consola de Luau y encontrar errores sin abrir Roblox Studio.
	No dibuja nada: solo imita las instancias, señales, tipos y tareas.
]]
local F = {}

------------------------------------------------------------------
-- Tipos de datos
------------------------------------------------------------------
local V3 = {}
V3.__index = V3
local function v3(x, y, z)
	return setmetatable({ X = x or 0, Y = y or 0, Z = z or 0 }, V3)
end
V3.__add = function(a, b) return v3(a.X + b.X, a.Y + b.Y, a.Z + b.Z) end
V3.__sub = function(a, b) return v3(a.X - b.X, a.Y - b.Y, a.Z - b.Z) end
V3.__unm = function(a) return v3(-a.X, -a.Y, -a.Z) end
V3.__mul = function(a, b)
	if type(a) == "number" then return v3(b.X * a, b.Y * a, b.Z * a) end
	if type(b) == "number" then return v3(a.X * b, a.Y * b, a.Z * b) end
	return v3(a.X * b.X, a.Y * b.Y, a.Z * b.Z)
end
V3.__div = function(a, b)
	if type(b) == "number" then return v3(a.X / b, a.Y / b, a.Z / b) end
	return v3(a.X / b.X, a.Y / b.Y, a.Z / b.Z)
end
V3.__eq = function(a, b) return a.X == b.X and a.Y == b.Y and a.Z == b.Z end
V3.__tostring = function(a) return string.format("(%g, %g, %g)", a.X, a.Y, a.Z) end
V3.__index = function(t, k)
	if k == "Magnitude" then return math.sqrt(t.X * t.X + t.Y * t.Y + t.Z * t.Z) end
	if k == "Unit" then local m = math.sqrt(t.X * t.X + t.Y * t.Y + t.Z * t.Z); return m > 0 and v3(t.X / m, t.Y / m, t.Z / m) or v3() end
	if k == "Dot" then return function(a, b) return a.X * b.X + a.Y * b.Y + a.Z * b.Z end end
	return rawget(V3, k)
end
F.Vector3 = { new = v3, zero = v3(), one = v3(1, 1, 1) }

local CF = {}
local function cf(p)
	return setmetatable({ Position = p or v3(), _cf = true }, CF)
end
CF.__index = function(t, k)
	if k == "X" then return t.Position.X elseif k == "Y" then return t.Position.Y elseif k == "Z" then return t.Position.Z end
	if k == "LookVector" then return v3(0, 0, -1) end
	return nil
end
CF.__mul = function(a, b)
	if getmetatable(b) == CF then return cf(a.Position + b.Position) end
	return a.Position + b
end
CF.__add = function(a, b) return cf(a.Position + b) end
CF.__sub = function(a, b) return cf(a.Position - b) end
F.CFrame = {
	new = function(x, y, z)
		if type(x) == "table" then return cf(x) end
		return cf(v3(x, y, z))
	end,
	Angles = function() return cf(v3()) end,
	lookAt = function(p) return cf(p) end,
	fromEulerAnglesXYZ = function() return cf(v3()) end,
}

local function color(r, g, b) return { R = r, G = g, B = b, _color = true } end
F.Color3 = {
	new = function(r, g, b) return color(r or 0, g or 0, b or 0) end,
	fromRGB = function(r, g, b) assert(type(r) == "number" and type(g) == "number" and type(b) == "number", "Color3.fromRGB sin números"); return color(r / 255, g / 255, b / 255) end,
	fromHSV = function(h, s, v) return color(v, v, v) end,
}
local function udim2(a, b, c, d) return { a, b, c, d, _udim2 = true } end
F.UDim2 = {
	new = udim2,
	fromScale = function(x, y) return udim2(x, 0, y, 0) end,
	fromOffset = function(x, y) return udim2(0, x, 0, y) end,
}
F.UDim = { new = function(a, b) return { a, b } end }
F.Vector2 = { new = function(x, y) return { X = x, Y = y } end }
F.ColorSequence = { new = function(...) return { ... } end }
F.TweenInfo = { new = function(...) return { ... } end }
F.Region3 = {
	new = function(a, b)
		return { a = a, b = b, ExpandToGrid = function(self, n) return self end }
	end,
}

------------------------------------------------------------------
-- Enum: cualquier nombre vale y siempre devuelve el mismo objeto
------------------------------------------------------------------
local function grupoEnum(nombre)
	local items = {}
	local n = 0
	return setmetatable({}, {
		__index = function(_, k)
			if not items[k] then
				n += 1
				local valor = n
				if nombre == "KeyCode" then
					local orden = { "Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine" }
					for i, o in orden do
						if o == k then valor = 47 + i end
					end
				end
				items[k] = setmetatable({ Name = k, Value = valor, EnumType = nombre }, { __tostring = function() return "Enum." .. nombre .. "." .. k end })
			end
			return items[k]
		end,
	})
end
local enums = {}
F.Enum = setmetatable({}, { __index = function(_, k)
	if not enums[k] then enums[k] = grupoEnum(k) end
	return enums[k]
end })

------------------------------------------------------------------
-- Señales y tareas
------------------------------------------------------------------
local function senal()
	local s = { conexiones = {} }
	function s:Connect(fn)
		local c = { fn = fn, activa = true }
		table.insert(self.conexiones, c)
		return { Disconnect = function() c.activa = false end }
	end
	s.Once = s.Connect
	function s:Fire(...)
		for _, c in table.clone(self.conexiones) do
			if c.activa then F.task.spawn(c.fn, ...) end
		end
	end
	function s:Wait() return coroutine.yield() end
	return s
end
F.senal = senal

local reloj = 0
F.errores = {}
local esperando = {} -- { co, despierta }
local function reanudar(co, ...)
	local ok, err = coroutine.resume(co, ...)
	if not ok then
		table.insert(F.errores, tostring(err) .. "\n" .. debug.traceback(co))
		print("ERROR: " .. tostring(err))
	elseif coroutine.status(co) == "suspended" then
		-- Si se suspendió por task.wait ya está en la lista
	end
end
F.task = {
	spawn = function(fn, ...)
		local co = type(fn) == "thread" and fn or coroutine.create(fn)
		reanudar(co, ...)
		return co
	end,
	defer = function(fn, ...)
		local co = coroutine.create(fn)
		local args = table.pack(...)
		table.insert(esperando, { co = co, despierta = reloj, args = args })
		return co
	end,
	delay = function(t, fn, ...)
		local co = coroutine.create(fn)
		local args = table.pack(...)
		table.insert(esperando, { co = co, despierta = reloj + (t or 0), args = args })
		return co
	end,
	wait = function(t)
		local co = coroutine.running()
		table.insert(esperando, { co = co, despierta = reloj + (t or 0) })
		return coroutine.yield()
	end,
}
F.relojFalso = function() return reloj end
-- Avanza el tiempo: despierta tareas y lanza Heartbeat/RenderStepped
function F.paso(dt)
	reloj += dt
	local listas = esperando
	esperando = {}
	for _, e in listas do
		if e.despierta <= reloj then
			if e.args then reanudar(e.co, table.unpack(e.args, 1, e.args.n)) else reanudar(e.co, dt) end
		else
			table.insert(esperando, e)
		end
	end
	if F.RunService then
		F.RunService.Heartbeat:Fire(dt)
		F.RunService.RenderStepped:Fire(dt)
	end
end

------------------------------------------------------------------
-- Instancias
------------------------------------------------------------------
local EVENTOS = {
	Died = true, HealthChanged = true, OnServerEvent = true, OnClientEvent = true, PlayerAdded = true, PlayerRemoving = true,
	CharacterAdded = true, Heartbeat = true, RenderStepped = true, Stepped = true, ChildAdded = true, ChildRemoved = true,
	InputBegan = true, InputEnded = true, InputChanged = true, MouseButton1Click = true, MouseButton1Down = true,
	MouseButton1Up = true, MouseLeave = true, MouseEnter = true, Activated = true, Touched = true, StateChanged = true,
	TouchTap = true, Completed = true,
}
local DEFECTO = {
	Health = 100, MaxHealth = 100, Anchored = false, CanCollide = true, Transparency = 0, Massless = false,
	HipHeight = 0, WalkSpeed = 16, Visible = true, Jump = false, Modal = false,
}
local Inst = {}
local esInstancia = {}
F.esInstancia = esInstancia
local METODOS = {}

local function nuevaInstancia(clase)
	local o = { _p = { ClassName = clase, Name = clase }, _hijos = {}, _ev = {}, _attr = {} }
	esInstancia[o] = true
	return setmetatable(o, Inst)
end
Inst.__index = function(o, k)
	local v = o._p[k]
	if v ~= nil then return v end
	if METODOS[k] then return METODOS[k] end
	if EVENTOS[k] then
		o._ev[k] = o._ev[k] or senal()
		return o._ev[k]
	end
	if k == "Position" and o._p.CFrame then return o._p.CFrame.Position end
	if k == "MoveDirection" or k == "AssemblyLinearVelocity" or k == "Size" then return v3() end
	if k == "FloorMaterial" then return F.Enum.Material.Plastic end
	if k == "ViewportSize" then return { X = 1280, Y = 720 } end
	if DEFECTO[k] ~= nil then return DEFECTO[k] end
	-- Hijo con ese nombre (como en Roblox: script.Parent.Mundo)
	for _, h in o._hijos do
		if h._p.Name == k then return h end
	end
	return nil
end
Inst.__newindex = function(o, k, v)
	if k == "Parent" then
		local viejo = o._p.Parent
		if viejo then
			local i = table.find(viejo._hijos, o)
			if i then table.remove(viejo._hijos, i) end
		end
		o._p.Parent = v
		if v then
			assert(esInstancia[v], "Parent debe ser una instancia")
			table.insert(v._hijos, o)
			if v._ev.ChildAdded then v._ev.ChildAdded:Fire(o) end
		end
		return
	end
	if k == "CFrame" then assert(type(v) == "table" and v._cf, "CFrame inválido en " .. o._p.ClassName) end
	if (k == "Color" and o._p.ClassName ~= "UIGradient") or k == "Color3" or k == "BackgroundColor3" or k == "TextColor3" then assert(type(v) == "table" and v._color, k .. " inválido") end
	if k == "Size" and (o._p.ClassName == "Part") then assert(getmetatable(v) == V3, "Size de Part debe ser Vector3") end
	if k == "Health" and type(v) == "number" then
		local antes = o._p.Health or 100
		o._p.Health = v
		if o._ev.HealthChanged then o._ev.HealthChanged:Fire(v) end
		if v <= 0 and antes > 0 and o._ev.Died then o._ev.Died:Fire() end
		return
	end
	o._p[k] = v
	if k == "CFrame" then o._p.Position = nil end
end
Inst.__tostring = function(o) return o._p.Name end

function METODOS:Destroy()
	self.Parent = nil
	self._destruida = true
end
function METODOS:GetChildren() return table.clone(self._hijos) end
function METODOS:GetDescendants()
	local t = {}
	local function rec(o) for _, h in o._hijos do table.insert(t, h); rec(h) end end
	rec(self)
	return t
end
function METODOS:ClearAllChildren() for _, h in table.clone(self._hijos) do h:Destroy() end end
function METODOS:FindFirstChild(n)
	for _, h in self._hijos do if h._p.Name == n then return h end end
	return nil
end
function METODOS:WaitForChild(n)
	local h = self:FindFirstChild(n)
	assert(h, "WaitForChild se quedaría esperando: " .. tostring(n) .. " en " .. self._p.Name)
	return h
end
function METODOS:FindFirstChildOfClass(c)
	for _, h in self._hijos do if h._p.ClassName == c then return h end end
	return nil
end
function METODOS:FindFirstAncestorOfClass(c)
	local p = self._p.Parent
	while p do if p._p.ClassName == c then return p end p = p._p.Parent end
	return nil
end
function METODOS:IsA(c)
	local cl = self._p.ClassName
	if cl == c then return true end
	if c == "PostEffect" then return cl:sub(-6) == "Effect" end
	if c == "BasePart" then return cl == "Part" end
	if c == "GuiObject" then return cl:find("Frame") ~= nil or cl:find("Label") ~= nil or cl:find("Button") ~= nil end
	return false
end
function METODOS:IsDescendantOf(o)
	local p = self._p.Parent
	while p do if p == o then return true end p = p._p.Parent end
	return false
end
function METODOS:SetAttribute(k, v) self._attr[k] = v end
function METODOS:GetAttribute(k) return self._attr[k] end
function METODOS:GetPropertyChangedSignal() return senal() end
function METODOS:SetNetworkOwner() end
function METODOS:PivotTo(c)
	local r = self:FindFirstChild("HumanoidRootPart") or self._p.PrimaryPart
	if r then r.CFrame = c end
end
function METODOS:TakeDamage(n) self.Health = (self._p.Health or 100) - n end
function METODOS:MoveTo(p) self._p.MoveToObjetivo = p end
function METODOS:GetState() return F.Enum.HumanoidStateType.Running end
function METODOS:ChangeState() end
function METODOS:Play() end
function METODOS:Stop() end
function METODOS:ApplyImpulse() end
function METODOS:FireClient(plr, ...) table.insert(F.mensajesCliente, { plr, ... }); if F.alMensajeCliente then F.alMensajeCliente(plr, ...) end end
function METODOS:FireAllClients(...) end
function METODOS:FireServer(...) table.insert(F.mensajesServidor, { ... }); if F.alMensajeServidor then F.alMensajeServidor(self, ...) end end
function METODOS:FillBlock() F.terreno += 1 end
function METODOS:WriteVoxels(region, res, mats, occ)
	assert(res == 4 and #mats > 0 and #occ > 0, "WriteVoxels con datos vacíos")
	F.terreno += 1
end
function METODOS:ReadVoxels() return { { { F.Enum.Material.Air } } }, { { { 0 } } } end
function METODOS:Raycast() return nil end
function METODOS:ViewportPointToRay() return { Origin = v3(0, 80, 0), Direction = v3(0, -1, 0) } end
function METODOS:GetPlayers() return table.clone(F.jugadores) end
function METODOS:GetService(n) return F.servicios[n] or error("Servicio desconocido: " .. n) end
function METODOS:GetDataStore() error("Hay que publicar el lugar para usar DataStore") end
function METODOS:BindToClose() end
function METODOS:SetCoreGuiEnabled() end
function METODOS:AddItem() end
function METODOS:Create() return { Play = function() end } end
function METODOS:IsKeyDown() return false end
function METODOS:GetMouseLocation() return { X = 0, Y = 0 } end
function METODOS:Clone() return nuevaInstancia(self._p.ClassName) end
function METODOS:GetPivot() return self._p.CFrame or F.CFrame.new(0, 0, 0) end

F.Instance = {
	new = function(clase, padre)
		local o = nuevaInstancia(clase)
		if clase == "Humanoid" then o._p.Health = 100 end
		if padre then o.Parent = padre end
		return o
	end,
}
F.mensajesCliente = {}
F.mensajesServidor = {}
F.terreno = 0
F.jugadores = {}

------------------------------------------------------------------
-- El «juego»
------------------------------------------------------------------
function F.crearJuego()
	local game = nuevaInstancia("DataModel")
	F.game = game
	F.servicios = {}
	for _, n in { "Workspace", "ReplicatedStorage", "ServerScriptService", "Players", "Lighting", "RunService", "DataStoreService",
		"StarterGui", "SoundService", "Debris", "TweenService", "UserInputService", "StarterPlayer" } do
		local s = nuevaInstancia(n)
		s._p.Name = n
		s.Parent = game
		F.servicios[n] = s
	end
	F.workspace = F.servicios.Workspace
	local t = nuevaInstancia("Terrain")
	t._p.Name = "Terrain"
	t.Parent = F.workspace
	local cam = nuevaInstancia("Camera")
	cam._p.Name = "Camera"
	cam._p.CFrame = F.CFrame.new(0, 80, 0)
	cam.Parent = F.workspace
	F.workspace._p.CurrentCamera = cam
	F.servicios.Lighting._p.ClockTime = 8
	F.RunService = F.servicios.RunService
	F.servicios.UserInputService._p.TouchEnabled = false
	F.servicios.UserInputService._p.KeyboardEnabled = true
	return game
end

-- Entorno global para ejecutar un script de Roblox
function F.entorno(scriptInst)
	local env = setmetatable({}, { __index = _G })
	env.game = F.game
	env.workspace = F.workspace
	env.script = scriptInst
	env.Instance = F.Instance
	env.Vector3 = F.Vector3
	env.CFrame = F.CFrame
	env.Color3 = F.Color3
	env.UDim2 = F.UDim2
	env.UDim = F.UDim
	env.Vector2 = F.Vector2
	env.Enum = F.Enum
	env.Region3 = F.Region3
	env.ColorSequence = F.ColorSequence
	env.TweenInfo = F.TweenInfo
	env.RaycastParams = { new = function() return {} end }
	env.Random = { new = function() return { NextInteger = function(_, a, b) return math.random(a, b) end, NextNumber = function() return math.random() end } end }
	env.task = F.task
	env.warn = function(...) print("WARN", ...); table.insert(F.errores, table.concat({ ... }, " ")) end
	env.typeof = function(v)
		if esInstancia[v] then return "Instance" end
		if type(v) == "table" and getmetatable(v) == V3 then return "Vector3" end
		return type(v)
	end
	env.os = setmetatable({ clock = function() return reloj end }, { __index = os })
	env.require = function(m)
		assert(esInstancia[m], "require necesita un ModuleScript")
		if m._resultado == nil then
			local f = assert(loadstring(m._p.Source, "=" .. m._p.Name))
			setfenv(f, F.entorno(m))
			m._resultado = f()
		end
		return m._resultado
	end
	return env
end

-- Crea un script con el código dado y lo ejecuta en una tarea
function F.ejecutar(scriptInst)
	local f, err = loadstring(scriptInst._p.Source, "=" .. scriptInst._p.Name)
	assert(f, err)
	setfenv(f, F.entorno(scriptInst))
	F.task.spawn(f)
end

return F
