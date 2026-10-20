-- Vuelca las piezas de los chunks cercanos al punto de aparición (para dibujar una vista previa)
local F = require("./roblox_falso")
local FU = require("./fuentes")
F.crearJuego()
local S = F.servicios
local function modulo(n, src, padre) local m = F.Instance.new("ModuleScript"); m.Name = n; m.Source = src; m.Parent = padre; return m end
local carpeta = F.Instance.new("Folder"); carpeta.Name = "Blockverse"; carpeta.Parent = S.ReplicatedStorage
for _, n in { "Config", "Bloques", "Generador", "Mallador", "Recetas" } do modulo(n, FU["compartido/" .. n], carpeta) end
local srv = F.Instance.new("Script"); srv.Name = "Servidor"; srv.Source = FU["servidor/init.server"]; srv.Parent = S.ServerScriptService
local mMundo = modulo("Mundo", FU["servidor/Mundo"], srv); modulo("Mobs", FU["servidor/Mobs"], srv)
F.ejecutar(srv)
for _ = 1, 120 do F.paso(1 / 30) end
local Mundo = mMundo._resultado
for _, r in Mundo.vistos do
	for _, p in r.modelo:GetDescendants() do
		if p._p.ClassName == "Part" and p._p.CFrame then
			local c, s, col = p._p.CFrame.Position, p._p.Size, p._p.Color
			print(string.format("P %.2f %.2f %.2f %.2f %.2f %.2f %d %d %d %.2f", c.X, c.Y, c.Z, s.X, s.Y, s.Z, col.R * 255, col.G * 255, col.B * 255, p._p.Transparency or 0))
		end
	end
end
