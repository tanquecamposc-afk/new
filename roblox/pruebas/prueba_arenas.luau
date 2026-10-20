-- Genera las arenas de los modos (Bed Wars, Mazmorras y Leyendas) y comprueba que salen bloques donde toca
local F = require("./roblox_falso")
local FU = require("./fuentes")
local A = require("./arbol")
F.crearJuego()
local comp = A.montar(F, FU)
local env = F.entorno(comp)
local req = env.require
local Generador = req(comp.Generador)
local Arenas = req(comp.Arenas)
local Registro = req(comp.Registro)
local g = Generador.new(12345)
local mal = 0
local function contar(x0, z0, x1, z1)
	local n, t0, ch = 0, os.clock(), 0
	for cx = x0 // 16, x1 // 16 do
		for cz = z0 // 16, z1 // 16 do
			local d = buffer.create(16 * 16 * 192 * 2)
			g:llenar(d, cx, cz)
			ch += 1
			for i = 0, 16 * 16 * 192 - 1 do
				if buffer.readu16(d, i * 2) ~= 0 then
					n += 1
				end
			end
		end
	end
	return n, (os.clock() - t0) / ch * 1000
end
for _, n in { 8, 4 } do
	for _, tema in Arenas.ORDEN_TEMAS_BW do
		local a = Arenas.bw(n, tema)
		local bl, ms = contar(a.ox - 80, a.oz - 80, a.ox + 80, a.oz + 80)
		-- Las camas y los generadores tienen que estar en el terreno
		local d = buffer.create(16 * 16 * 192 * 2)
		local c = a.camas[1]
		g:llenar(d, c.x // 16, c.z // 16)
		local b = buffer.readu16(d, ((c.x % 16) + (c.z % 16) * 16 + c.y * 256) * 2)
		local ok = Registro.bloques[b] and Registro.bloques[b].camaBW ~= nil
		if not ok then mal += 1 end
		print(string.format("Bed Wars %d equipos · %s: %d bloques, %d generadores, %d camas (cama %s), %.0f ms por chunk",
			n, tema, bl, #a.gens, #a.camas, ok and "bien" or "MAL", ms))
	end
end
for nivel = 1, 4 do
	local a = Arenas.nueva("mz", nivel, 1000 + nivel)
	local bl, ms = contar(a.ox - 260, a.oz - 260, a.ox + 260, a.oz + 260)
	local cof = 0
	for _, s in a.salas do
		if s.cofre then cof += 1 end
	end
	if bl < 1000 or #a.salas < 5 then mal += 1 end
	print(string.format("Mazmorra nivel %d (%s): %d salas, %d cofres, %d bloques, %.0f ms por chunk", nivel, a.tema.n, #a.salas, cof, bl, ms))
end
local a = Arenas.nueva("ly", 4242)
local bl, ms = contar(a.ox - 130, a.oz - 130, a.ox + 130, a.oz + 130)
if bl < 50000 or #a.bases ~= 3 then mal += 1 end
print(string.format("Leyendas: aldea en %d,%d,%d, %d portales, %d casas, %d bloques, %.0f ms por chunk", a.aldea.x, a.aldea.y, a.aldea.z, #a.bases, #a.casas, bl, ms))
print(mal == 0 and "ARENAS BIEN" or "ARENAS CON FALLOS")
