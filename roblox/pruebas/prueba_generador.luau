-- Compara el generador Luau con muestras del juego web (semilla 12345)
local F = require("./roblox_falso")
local FU = require("./fuentes")
local A = require("./arbol")
local M = require("./muestras_web")
F.crearJuego()
local comp = A.montar(F, FU)
local env = F.entorno(comp)
local req = env.require
local Generador = req(comp.Generador)
local Codec = req(comp.Codec)
local Registro = req(comp.Registro)
local g = Generador.new(12345)
local mal = 0
for _, c in M.info do
	local h, b = g:infoColumna(c[1], c[2])
	if h ~= c[3] or b ~= c[4] then
		mal += 1
		if mal < 5 then print("infoColumna distinta", c[1], c[2], h, b, "web:", c[3], c[4]) end
	end
end
print("infoColumna: " .. (#M.info - mal) .. "/" .. #M.info .. " iguales")
local totalDif = 0
local t0 = os.clock()
for _, c in M.chunks do
	local web = Codec.leer(c[3], 16 * 16 * 192 * 2)
	local d = buffer.create(16 * 16 * 192 * 2)
	g:llenar(d, c[1], c[2])
	local dif, ej = 0, nil
	for i = 0, 16 * 16 * 192 - 1 do
		local a, b = buffer.readu16(d, i * 2), buffer.readu16(web, i * 2)
		if a ~= b then
			dif += 1
			if not ej then ej = { i % 16, i // 256, (i // 16) % 16, Registro.nombre(a), Registro.nombre(b) } end
		end
	end
	totalDif += dif
	print(string.format("chunk %d,%d: %d bloques distintos%s", c[1], c[2], dif, ej and string.format(" (p.ej. x=%d y=%d z=%d: %s en vez de %s)", ej[1], ej[2], ej[3], tostring(ej[4]), tostring(ej[5])) or ""))
end
print(string.format("tiempo por chunk: %.0f ms", (os.clock() - t0) / #M.chunks * 1000))
print(totalDif == 0 and mal == 0 and "GENERADOR IDENTICO AL WEB" or "HAY DIFERENCIAS")
