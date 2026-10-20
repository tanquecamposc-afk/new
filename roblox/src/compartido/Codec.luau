--[[
	Blockverse para Roblox · Codec
	Lee los datos que vienen del juego web (texturas, iconos, modelos):
	base64 + compresión LZ sencilla (ver herramientas/codec.py).
]]
local Codec = {}

local ALFABETO = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
local VALOR = table.create(256, 0)
for i = 1, 64 do
	VALOR[string.byte(ALFABETO, i) + 1] = i - 1
end

-- base64 (texto) -> buffer
function Codec.base64(texto: string): buffer
	local src = buffer.fromstring(texto)
	local n = buffer.len(src)
	while n > 0 and buffer.readu8(src, n - 1) == 61 do -- '='
		n -= 1
	end
	local tam = (n * 3) // 4
	local out = buffer.create(tam)
	local o = 0
	local i = 0
	while i + 4 <= n do
		local a = VALOR[buffer.readu8(src, i) + 1]
		local b = VALOR[buffer.readu8(src, i + 1) + 1]
		local c = VALOR[buffer.readu8(src, i + 2) + 1]
		local d = VALOR[buffer.readu8(src, i + 3) + 1]
		local v = ((a * 64 + b) * 64 + c) * 64 + d
		buffer.writeu8(out, o, v // 65536)
		buffer.writeu8(out, o + 1, (v // 256) % 256)
		buffer.writeu8(out, o + 2, v % 256)
		o += 3
		i += 4
	end
	local resto = n - i
	if resto == 2 then
		local a = VALOR[buffer.readu8(src, i) + 1]
		local b = VALOR[buffer.readu8(src, i + 1) + 1]
		buffer.writeu8(out, o, (a * 4) + b // 16)
	elseif resto == 3 then
		local a = VALOR[buffer.readu8(src, i) + 1]
		local b = VALOR[buffer.readu8(src, i + 1) + 1]
		local c = VALOR[buffer.readu8(src, i + 2) + 1]
		local v = (a * 64 + b) * 64 + c
		buffer.writeu8(out, o, v // 1024)
		buffer.writeu8(out, o + 1, (v // 4) % 256)
	end
	return out
end

-- LZ -> buffer de `tam` bytes
function Codec.lz(src: buffer, tam: number): buffer
	local out = buffer.create(tam)
	local n = buffer.len(src)
	local i, o = 0, 0
	while i < n do
		local t = buffer.readu8(src, i)
		i += 1
		if t < 128 then
			local l = t + 1
			buffer.copy(out, o, src, i, l)
			i += l
			o += l
		else
			local l = t - 125
			local d = buffer.readu16(src, i)
			i += 2
			if d >= l then
				buffer.copy(out, o, out, o - d, l)
			else
				for k = 0, l - 1 do
					buffer.writeu8(out, o + k, buffer.readu8(out, o - d + k))
				end
			end
			o += l
		end
	end
	return out
end

-- Texto base64 (o lista de trozos) comprimido -> buffer
function Codec.leer(texto: string | { string }, tam: number): buffer
	if type(texto) == "table" then
		texto = table.concat(texto)
	end
	return Codec.lz(Codec.base64(texto :: string), tam)
end

return Codec
