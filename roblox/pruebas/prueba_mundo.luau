-- Pruebas de la lógica pura (generador, mallador, recetas) con la consola de Luau
local Config = require("./Config")
local Bloques = require("./Bloques")
local Generador = require("./Generador")
local Mallador = require("./Mallador")
local Recetas = require("./Recetas")

local C, ALTO = Config.CHUNK, Config.ALTO
local fallos = 0
local function ok(cond, msg) if not cond then fallos += 1; print("FALLO: " .. msg) end end

local gen = Generador.new(12345)
local chunks = {}
local function datos(cx, cz)
	local k = cx .. "," .. cz
	if not chunks[k] then
		local b = buffer.create(C * C * ALTO)
		gen:llenar(b, cx, cz)
		chunks[k] = b
	end
	return chunks[k]
end
local function get(x, y, z)
	if y < 0 then return Bloques.porClave.lecho end
	if y >= ALTO then return 0 end
	local cx, cz = x // C, z // C
	return buffer.readu8(datos(cx, cz), Generador.idx(x - cx * C, y, z - cz * C))
end

-- 1) Generación: tiempos y contenido
local t0 = os.clock()
for cx = -4, 4 do for cz = -4, 4 do datos(cx, cz) end end
for k = 1, 40 do datos(k * 7 - 140, (k * 13) % 50 - 25) end
local tGen = (os.clock() - t0) / 121
local cuenta = {}
for _, b in chunks do
	for i = 0, C * C * ALTO - 1 do local v = buffer.readu8(b, i); cuenta[v] = (cuenta[v] or 0) + 1 end
end
local nombres = {}
for id, n in cuenta do table.insert(nombres, (Bloques.porId[id] and Bloques.porId[id].clave or "aire") .. "=" .. n) end
table.sort(nombres)
print(string.format("generar: %.2f ms por chunk", tGen * 1000))
print(table.concat(nombres, " "))
for id in cuenta do ok(id == 0 or Bloques.porId[id] ~= nil, "id desconocido " .. id) end
ok((cuenta[Bloques.porClave.tronco] or 0) + (cuenta[Bloques.porClave.troncoAbeto] or 0) > 0, "no hay árboles")
ok((cuenta[Bloques.porClave.menaCarbon] or 0) > 0, "no hay carbón")
ok((cuenta[Bloques.porClave.lecho] or 0) >= 121 * 256, "falta lecho de roca")

-- Biomas en una zona grande
local biomas = {}
for x = -1500, 1500, 25 do for z = -1500, 1500, 25 do local _, b = gen:columna(x, z); biomas[b] = (biomas[b] or 0) + 1 end end
local lb = {} for k, v in biomas do table.insert(lb, k .. "=" .. v) end table.sort(lb)
print("biomas: " .. table.concat(lb, " "))

-- 2) Mallado: piezas por chunk
t0 = os.clock()
local piezas, esp, bloquesVis = 0, 0, 0
for cx = -3, 3 do for cz = -3, 3 do
	for y = 0, ALTO - 1 do
		local cajas, e = Mallador.capa(get, cx, cz, y)
		piezas += #cajas; esp += #e
		for _, c in cajas do bloquesVis += c[4] * c[5]
			-- cada caja solo cubre bloques iguales y visibles
			for dz = 0, c[5] - 1 do for dx = 0, c[4] - 1 do
				local x, z = cx * C + c[2] + dx, cz * C + c[3] + dz
				ok(get(x, y, z) == c[1], "caja con bloque distinto")
				ok(Mallador.visible(get, c[1], x, y, z), "caja con bloque oculto")
			end end
		end
	end
end end
local tMalla = (os.clock() - t0) / 49
print(string.format("mallar: %.2f ms por chunk · %.0f piezas por chunk (%.0f bloques visibles) · %.0f especiales", tMalla * 1000, piezas / 49, bloquesVis / 49, esp / 49))

-- 3) Bloques: tiempos de romper
local ID = Bloques.porClave
ok(Bloques.tiempoRomper(ID.piedra, nil) > Bloques.tiempoRomper(ID.piedra, ID.pico_madera), "el pico no ayuda")
ok(Bloques.tiempoRomper(ID.piedra, ID.pico_diamante) < Bloques.tiempoRomper(ID.piedra, ID.pico_madera), "diamante más lento")
ok(not Bloques.puedeRecoger(ID.menaDiamante, ID.pico_piedra), "diamante con pico de piedra")
ok(Bloques.puedeRecoger(ID.menaDiamante, ID.pico_hierro), "diamante con pico de hierro")
ok(Bloques.tiempoRomper(ID.lecho, ID.pico_diamante) == math.huge, "lecho rompible")
print(string.format("piedra: mano %.2fs · madera %.2fs · diamante %.2fs", Bloques.tiempoRomper(ID.piedra, nil), Bloques.tiempoRomper(ID.piedra, ID.pico_madera), Bloques.tiempoRomper(ID.piedra, ID.pico_diamante)))

-- 4) Recetas
ok(#Recetas > 20, "pocas recetas")
for _, r in Recetas do ok(Bloques.porId[r.resultado] ~= nil, "resultado desconocido") end
print("recetas: " .. #Recetas .. " · bloques: " .. #Bloques.lista .. " · objetos: " .. #Bloques.objetos)

print(fallos == 0 and "TODO BIEN" or ("FALLOS: " .. fallos))
