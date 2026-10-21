--[[
	Blockverse para Roblox · Las letras del juego (una sola lista para todo)
	· TITULO: Luckiest Guy, gruesa y alegre, para lo grande (BLOCKVERSE, ¡VICTORIA!, ¡Has muerto!).
	· CABECERA: Fredoka, redondeada, para títulos de ventanas, botones y nombres.
	· TEXTO: Builder Sans en negrita (la de Roblox), clara para leer frases y descripciones.
	· NUMERO: Arcade, de píxeles, para cantidades, niveles y marcadores (aire de Minecraft).
	Si alguna fuente no existiera en esta versión de Roblox, se usa Gotham, que siempre está.
]]
local function fuente(nombre, respaldo)
	local ok, f = pcall(function()
		return Enum.Font[nombre]
	end)
	if ok and f then
		return f
	end
	return Enum.Font[respaldo]
end

local F = {
	TITULO = fuente("LuckiestGuy", "GothamBlack"),
	CABECERA = fuente("FredokaOne", "GothamBlack"),
	TEXTO = fuente("BuilderSansBold", "GothamBold"),
	TEXTO_FUERTE = fuente("BuilderSansExtraBold", "GothamBlack"),
	NUMERO = fuente("Arcade", "Code"),
}

-- Contorno grueso y limpio para un texto (mejor que TextStroke, que es de 1 píxel)
function F.contorno(etiqueta, color, grosor, transparencia)
	local s = Instance.new("UIStroke")
	s.Color = color or Color3.new(0, 0, 0)
	s.Thickness = grosor or 2
	s.Transparency = transparencia or 0
	s.LineJoinMode = Enum.LineJoinMode.Round
	s.Parent = etiqueta
	etiqueta.TextStrokeTransparency = 1
	return s
end

return F
