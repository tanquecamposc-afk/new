--[[
	Blockverse para Roblox · Sombras redondas (como las de Minecraft)
	Debajo de cada criatura y cada objeto tirado sale una sombra suave en el suelo: se ve
	también de noche y en las cuevas (donde no hay sombras del sol) y ayuda a saber a qué
	altura está algo cuando salta o cae. Se hace con dos discos: uno grande y claro y otro
	pequeño y más oscuro en el centro; cuanto más lejos del suelo, más clara.
]]
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Comp = ReplicatedStorage:WaitForChild("Blockverse")
local Config = require(Comp:WaitForChild("Config"))
local Registro = require(Comp:WaitForChild("Registro"))

local BS = Config.BLOQUE
local SOLIDO = Registro.SOLIDO
local Sombras = {}
Sombras.md = nil -- datos del mundo del cliente (se ponen al cargarlo)
Sombras.activo = true -- se apagan con la calidad gráfica baja

local carpeta = Instance.new("Folder")
carpeta.Name = "Sombras"

local function disco()
	local p = Instance.new("Part")
	p.Anchored = true
	p.CanCollide = false
	p.CanQuery = false
	p.CanTouch = false
	p.CastShadow = false
	p.Shape = Enum.PartType.Cylinder
	p.Material = Enum.Material.SmoothPlastic
	p.Color = Color3.new(0, 0, 0)
	p.Transparency = 1
	p.Size = Vector3.new(0.02, 1, 1)
	p.Parent = carpeta
	return p
end

function Sombras.nueva()
	if not carpeta.Parent then
		carpeta.Parent = workspace
	end
	return { fuera = disco(), dentro = disco() }
end

-- Altura (en bloques) del suelo bajo (x, y, z), mirando hasta 6 bloques hacia abajo
local function suelo(bx, by, bz)
	local md = Sombras.md
	if not md then
		return nil
	end
	for y = by, by - 6, -1 do
		local b = md:getSiCargado(bx, y, bz)
		if b < 0 then
			return nil
		end
		if b ~= 0 and SOLIDO[b] then
			return y + 1
		end
	end
	return nil
end

-- pos: centro de los pies (en studs); ancho: tamaño de la sombra (en studs)
function Sombras.poner(s, pos, ancho)
	local bx, by, bz = math.floor(pos.X / BS), math.floor(pos.Y / BS + 0.05), math.floor(pos.Z / BS)
	local gy = Sombras.activo and suelo(bx, by, bz)
	if not gy then
		s.fuera.Transparency, s.dentro.Transparency = 1, 1
		return
	end
	local alto = math.max(0, pos.Y / BS - gy)
	local f = math.clamp(1 - alto / 5, 0, 1) -- se aclara al alejarse del suelo
	if f <= 0 then
		s.fuera.Transparency, s.dentro.Transparency = 1, 1
		return
	end
	local w = ancho * (0.85 + 0.15 * f)
	local cf = CFrame.new(pos.X, gy * BS + 0.02, pos.Z) * CFrame.Angles(0, 0, math.pi / 2)
	s.fuera.Size = Vector3.new(0.02, w, w)
	s.fuera.CFrame = cf
	s.fuera.Transparency = 1 - 0.28 * f
	s.dentro.Size = Vector3.new(0.02, w * 0.6, w * 0.6)
	s.dentro.CFrame = cf * CFrame.new(0.01, 0, 0)
	s.dentro.Transparency = 1 - 0.22 * f
end

function Sombras.ocultar(s)
	if s then
		s.fuera.Transparency, s.dentro.Transparency = 1, 1
	end
end

function Sombras.quitar(s)
	if s then
		s.fuera:Destroy()
		s.dentro:Destroy()
	end
end

return Sombras
