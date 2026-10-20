-- Compara chunks completos (con estructuras) con los del juego web (semilla 12345)
local F = require("./roblox_falso")
local FU = require("./fuentes")
local A = require("./arbol")
local M = require("./muestras_estructuras")
F.crearJuego()
local comp = A.montar(F, FU)
local req = F.entorno(comp).require
local Generador = req(comp.Generador)
local Codec = req(comp.Codec)
local Registro = req(comp.Registro)
local soloDim = nil
local okR, R = pcall(require, "./dimension")
if okR then soloDim = R end
local g = Generador.new(12345)
local TAM = 16 * 16 * 192 * 2
local total, malos = 0, 0
local t0 = os.clock()
local porMotivo = {}
local cofresGen = {}
local Botin = req(comp.Botin)
for _, c in ipairs(M) do
	if soloDim and c.dim ~= soloDim then continue end
	if c.dim ~= "superficie" and not (g.llenarDim) then continue end
	local web = Codec.leer(c.datos, TAM)
	local d = buffer.create(TAM)
	local ok, err = pcall(function()
		if c.dim == "superficie" then
			local _, cf = g:llenar(d, c.cx, c.cz)
			for _, q in cf or {} do
				cofresGen["superficie:" .. q[1] .. "," .. q[2] .. "," .. q[3]] = q[4]
			end
		else
			g:llenarDim(c.dim, d, c.cx, c.cz)
		end
	end)
	total += 1
	if not ok then
		malos += 1
		print(string.format("ERROR %s %s %d,%d: %s", c.dim, c.motivo, c.cx, c.cz, tostring(err)))
		continue
	end
	local dif, ej = 0, nil
	for i = 0, 16 * 16 * 192 - 1 do
		local a, b = buffer.readu16(d, i * 2), buffer.readu16(web, i * 2)
		if a ~= b then
			dif += 1
			if not ej then ej = { i % 16, i // 256, (i // 16) % 16, Registro.nombre(a) .. "(" .. a .. ")", Registro.nombre(b) .. "(" .. b .. ")" } end
		end
	end
	if dif > 0 then
		malos += 1
		print(string.format("%s %-16s %4d,%4d: %5d distintos (p.ej. x=%d y=%d z=%d: %s en vez de %s)", c.dim, c.motivo, c.cx, c.cz, dif, ej[1], ej[2], ej[3], ej[4], ej[5]))
	end
end
-- Botín de los cofres
local nc, mc = 0, 0
for _, q in M.cofres do
	local k = q.dim .. ":" .. q.x .. "," .. q.y .. "," .. q.z
	local tipo = cofresGen[k]
	if not tipo then
		continue
	end
	nc += 1
	local mio = Botin.generar(tipo, q.x, q.y, q.z, 12345)
	local igual = true
	for i = 1, 27 do
		local a, b = mio[i], q.c[i]
		if (a and not b) or (b and not a) or (a and b and (a.id ~= b[1] or a.n ~= b[2])) then
			igual = false
		end
	end
	if not igual then
		mc += 1
		if mc <= 3 then
			local t1, t2 = {}, {}
			for i = 1, 27 do
				table.insert(t1, mio[i] and (mio[i].id .. "x" .. mio[i].n) or "-")
				table.insert(t2, q.c[i] and (q.c[i][1] .. "x" .. q.c[i][2]) or "-")
			end
			print("cofre distinto", tipo, k, "\n  luau:", table.concat(t1, " "), "\n  web: ", table.concat(t2, " "))
		end
	end
end
print(string.format("%d cofres comparados, %d distintos", nc, mc))
if mc > 0 then malos += 1 end
print(string.format("%d chunks comparados, %d con diferencias, %.0f ms por chunk", total, malos, (os.clock() - t0) / math.max(total, 1) * 1000))
print(malos == 0 and "ESTRUCTURAS IDENTICAS AL WEB" or "HAY DIFERENCIAS")
