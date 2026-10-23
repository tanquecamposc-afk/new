--!strict
-- Visual language: dark neutral panels, strong text contrast, restrained essence accents.

local Theme = {}

Theme.Colors = {
	Background = Color3.fromRGB(14, 15, 22),
	Panel = Color3.fromRGB(22, 24, 34),
	PanelLight = Color3.fromRGB(32, 35, 50),
	Card = Color3.fromRGB(28, 31, 44),
	Stroke = Color3.fromRGB(64, 68, 92),
	Text = Color3.fromRGB(238, 240, 248),
	TextDim = Color3.fromRGB(160, 165, 188),
	TextMuted = Color3.fromRGB(110, 114, 136),
	Accent = Color3.fromRGB(170, 120, 255),
	Gold = Color3.fromRGB(255, 205, 110),
	Good = Color3.fromRGB(110, 230, 150),
	Bad = Color3.fromRGB(255, 100, 100),
	Warn = Color3.fromRGB(255, 180, 80),
	Health = Color3.fromRGB(230, 72, 88),
	Stamina = Color3.fromRGB(110, 210, 140),
	Resonance = Color3.fromRGB(190, 130, 255),
	Ember = Color3.fromRGB(255, 106, 61),
	Storm = Color3.fromRGB(79, 195, 255),
	Gravity = Color3.fromRGB(162, 123, 255),
}

Theme.Fonts = {
	Title = Enum.Font.GothamBlack,
	Display = Enum.Font.LuckiestGuy, -- punchy combat numbers / combo ranks
	Fantasy = Enum.Font.Fondamento, -- world signs, lore and headings
	Bold = Enum.Font.GothamBold,
	Medium = Enum.Font.GothamMedium,
	Body = Enum.Font.Gotham,
}

Theme.Radius = UDim.new(0, 10)

function Theme.essenceColor(id: string?): Color3
	if id == "Ember" then
		return Theme.Colors.Ember
	elseif id == "Storm" then
		return Theme.Colors.Storm
	elseif id == "Gravity" then
		return Theme.Colors.Gravity
	end
	return Theme.Colors.TextDim
end

return Theme
