--[[
	Blockverse para Roblox · Imágenes (cliente)
	Crea imágenes editables (EditableImage) a partir de los píxeles del
	juego web: atlas de texturas, iconos de objetos, texturas de criaturas
	y grietas al picar. Si Roblox no deja crearlas, devuelve nil y el
	juego usa colores planos.
]]
local AssetService = game:GetService("AssetService")

local Imagenes = {}
Imagenes.disponible = true

-- Crea una EditableImage de w × h con los píxeles RGBA del buffer
function Imagenes.crear(w, h, pixeles)
	if not Imagenes.disponible then
		return nil
	end
	local ok, img = pcall(function()
		return AssetService:CreateEditableImage({ Size = Vector2.new(w, h) })
	end)
	if not ok or not img then
		warn("[Blockverse] No se pudo crear una imagen editable: " .. tostring(img))
		Imagenes.disponible = false
		return nil
	end
	if pixeles then
		local ok2, err = pcall(function()
			img:WritePixelsBuffer(Vector2.zero, Vector2.new(w, h), pixeles)
		end)
		if not ok2 then
			warn("[Blockverse] No se pudieron escribir los píxeles: " .. tostring(err))
		end
	end
	return img
end

function Imagenes.contenido(img)
	local ok, c = pcall(function()
		return Content.fromObject(img)
	end)
	return ok and c or nil
end

-- Pone la imagen en un ImageLabel / ImageButton
function Imagenes.enEtiqueta(etiqueta, img)
	local c = img and Imagenes.contenido(img)
	if not c then
		return false
	end
	local ok = pcall(function()
		etiqueta.ImageContent = c
	end)
	return ok
end

-- Pone la imagen como textura de un MeshPart
function Imagenes.enMalla(parte, img)
	local c = img and Imagenes.contenido(img)
	if not c then
		return false
	end
	local ok = pcall(function()
		parte.TextureContent = c
	end)
	return ok
end

-- Pone la imagen en un Decal
function Imagenes.enCalcomania(decal, img)
	local c = img and Imagenes.contenido(img)
	if not c then
		return false
	end
	local ok = pcall(function()
		decal.TextureContent = c
	end)
	return ok
end

-- Copia un rectángulo RGBA (w × h, en `src` desde `ofs`) a `dst` (ancho dw) en (x, y), ampliado `esc` veces
function Imagenes.pegar(dst, dw, x, y, src, ofs, w, h, esc)
	for sy = 0, h - 1 do
		for sx = 0, w - 1 do
			local v = buffer.readu32(src, ofs + (sy * w + sx) * 4)
			for ey = 0, esc - 1 do
				local fila = ((y + sy * esc + ey) * dw + x + sx * esc) * 4
				for ex = 0, esc - 1 do
					buffer.writeu32(dst, fila + ex * 4, v)
				end
			end
		end
	end
end

return Imagenes
