--[[
	Blockverse para Roblox · Clima (servidor)
	· Cielo despejado, lluvia o tormenta, que cambian solos cada pocos minutos.
	  El estado va en el atributo «Clima» de workspace y cada cliente lo dibuja
	  (lluvia, nieve en los biomas fríos, nada en el desierto).
	· Con lluvia los zombis y esqueletos no arden al sol; en la tormenta está tan
	  oscuro que salen monstruos y se puede dormir (como en Minecraft).
	· En la tormenta caen rayos cerca de los jugadores del mundo normal: si dan a
	  alguien (jugador o criatura) le hacen daño y lo prenden.
	· Dormir en una cama despeja el cielo.
]]
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Comp = ReplicatedStorage:WaitForChild("Blockverse")
local Config = require(Comp.Config)
local Generador = require(Comp.Generador)

local BS = Config.BLOQUE
local Clima = {}
local ctx -- {Estado, Mundo, Mobs, estados, danar, activo(plr)}

local estado = "despejado"
local restante = 300 + math.random() * 300
local rayoT = 6

local function poner(e, seg)
	estado = e
	if e == "despejado" then
		restante = seg or (360 + math.random() * 480)
	elseif e == "lluvia" then
		restante = seg or (180 + math.random() * 180)
	else
		restante = seg or (120 + math.random() * 120)
	end
	workspace:SetAttribute("Clima", e)
end

function Clima.estado()
	return estado
end
function Clima.lloviendo()
	return estado ~= "despejado"
end
function Clima.tormenta()
	return estado == "tormenta"
end
-- Para las pruebas y para dormir
function Clima.poner(e, seg)
	poner(e, seg)
end
function Clima.despejar()
	poner("despejado")
end

-- Un rayo en (x, z): busca el suelo, avisa a los clientes y daña lo que haya al lado
local function rayo(x, z)
	local y = ctx.Mundo.alturaSuelo(x, z) + 1
	local pos = Vector3.new(x + 0.5, y, z + 0.5)
	ctx.Estado:FireAllClients("rayo", pos * BS)
	for _, plr in Players:GetPlayers() do
		local ch = plr.Character
		local r = ch and ch:FindFirstChild("HumanoidRootPart")
		if r and (r.Position / BS - pos).Magnitude < 2.5 then
			ctx.danar(plr, 5, "rayo")
			local s = ctx.estados[plr]
			if s then
				s.fuego = math.max(s.fuego or 0, 4)
			end
		end
	end
	for _, m in ctx.Mobs.lista do
		if not m.muerto and math.abs(m.x - pos.X) < 2.5 and math.abs(m.z - pos.Z) < 2.5 and math.abs(m.y - pos.Y) < 3 then
			m.fuego = math.max(m.fuego or 0, 4)
			ctx.Mobs.herir(m, 5, nil, "fuego")
		end
	end
	return pos
end
Clima.rayo = rayo

function Clima.iniciar(c)
	ctx = c
	workspace:SetAttribute("Clima", estado)
	RunService.Heartbeat:Connect(function(dt)
		restante -= dt
		if restante <= 0 then
			if estado == "despejado" then
				poner(math.random() < 0.25 and "tormenta" or "lluvia")
			else
				poner("despejado")
			end
		end
		if estado ~= "tormenta" then
			return
		end
		-- Rayos cerca de un jugador del mundo normal (no en los modos de juego)
		rayoT -= dt
		if rayoT > 0 then
			return
		end
		rayoT = 5 + math.random() * 10
		local candidatos = {}
		for _, plr in Players:GetPlayers() do
			local r = plr.Character and plr.Character:FindFirstChild("HumanoidRootPart")
			if r and not ctx.activo(plr) and Generador.dimensionBloque(math.floor(r.Position.Z / BS)) == "superficie" then
				table.insert(candidatos, r.Position / BS)
			end
		end
		if #candidatos == 0 then
			return
		end
		local p = candidatos[math.random(1, #candidatos)]
		local a = math.random() * math.pi * 2
		local d = 8 + math.random() * 22
		pcall(rayo, math.floor(p.X + math.cos(a) * d), math.floor(p.Z + math.sin(a) * d))
	end)
end

return Clima
