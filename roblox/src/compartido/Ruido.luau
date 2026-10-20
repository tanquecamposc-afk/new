--!native
--!optimize 2
--[[
	Blockverse para Roblox · Ruido
	Copia exacta de las funciones de base.js del juego web (hash2, hash3,
	mulberry32, valueNoise, valueNoise3, fbm) para que el mismo número de
	semilla dé el mismo mundo. JavaScript trabaja con enteros de 32 bits:
	aquí se imitan con bit32 y números sin signo.
]]
local Ruido = {}

local M32 = 4294967296
local bxor, bor, rshift = bit32.bxor, bit32.bor, bit32.rshift

-- Math.imul: multiplicación de 32 bits (resultado sin signo).
-- Se parte `a` en dos mitades de 16 bits para no perder precisión.
local function imul(a: number, b: number): number
	a %= M32
	b %= M32
	return ((((a // 65536) * b) % 65536) * 65536 + (a % 65536) * b) % M32
end
Ruido.imul = imul

-- Math.round de JavaScript (los .5 suben siempre)
function Ruido.redondear(v: number): number
	return math.floor(v + 0.5)
end

function Ruido.hash2(x: number, z: number, s: number): number
	local h = (imul(x, 374761393) + imul(z, 668265263) + imul(s, 1442695041)) % M32
	h = imul(bxor(h, rshift(h, 13)), 1274126177)
	h = bxor(h, rshift(h, 16))
	return h / M32
end
local hash2 = Ruido.hash2

function Ruido.hash3(x: number, y: number, z: number, s: number): number
	local h = (imul(x, 374761393) + imul(y, 668265263) + imul(z, 1274126177) + imul(s, 1442695041)) % M32
	h = imul(bxor(h, rshift(h, 13)), 1103515245)
	h = bxor(h, rshift(h, 16))
	h = imul(bxor(h, rshift(h, 15)), 2246822519)
	h = bxor(h, rshift(h, 13))
	return h / M32
end
local hash3 = Ruido.hash3

function Ruido.mulberry32(a: number): () -> number
	a %= M32
	return function()
		a = (a + 0x6D2B79F5) % M32
		local t = imul(bxor(a, rshift(a, 15)), bor(1, a))
		t = bxor((t + imul(bxor(t, rshift(t, 7)), bor(61, t))) % M32, t)
		return bxor(t, rshift(t, 14)) / M32
	end
end

local function smooth(t: number): number
	return t * t * (3 - 2 * t)
end
Ruido.smooth = smooth

function Ruido.clamp(v: number, a: number, b: number): number
	return math.max(a, math.min(b, v))
end

function Ruido.lerp(a: number, b: number, t: number): number
	return a + (b - a) * t
end

function Ruido.valueNoise(x: number, z: number, s: number): number
	local x0, z0 = math.floor(x), math.floor(z)
	local fx, fz = smooth(x - x0), smooth(z - z0)
	local a, b = hash2(x0, z0, s), hash2(x0 + 1, z0, s)
	local c, d = hash2(x0, z0 + 1, s), hash2(x0 + 1, z0 + 1, s)
	local ab = a + (b - a) * fx
	return ab + ((c + (d - c) * fx) - ab) * fz
end
local valueNoise = Ruido.valueNoise

function Ruido.valueNoise3(x: number, y: number, z: number, s: number): number
	local x0, y0, z0 = math.floor(x), math.floor(y), math.floor(z)
	local fx, fy, fz = smooth(x - x0), smooth(y - y0), smooth(z - z0)
	local function L(a, b, t)
		return a + (b - a) * t
	end
	local c000, c100 = hash3(x0, y0, z0, s), hash3(x0 + 1, y0, z0, s)
	local c010, c110 = hash3(x0, y0 + 1, z0, s), hash3(x0 + 1, y0 + 1, z0, s)
	local c001, c101 = hash3(x0, y0, z0 + 1, s), hash3(x0 + 1, y0, z0 + 1, s)
	local c011, c111 = hash3(x0, y0 + 1, z0 + 1, s), hash3(x0 + 1, y0 + 1, z0 + 1, s)
	return L(L(L(c000, c100, fx), L(c010, c110, fx), fy), L(L(c001, c101, fx), L(c011, c111, fx), fy), fz)
end

function Ruido.fbm(x: number, z: number, s: number, oct: number): number
	local v, amp, tot, f = 0, 1, 0, 1
	for i = 0, oct - 1 do
		v += valueNoise(x * f, z * f, s + i * 101) * amp
		tot += amp
		amp *= 0.5
		f *= 2
	end
	return v / tot
end

return Ruido
