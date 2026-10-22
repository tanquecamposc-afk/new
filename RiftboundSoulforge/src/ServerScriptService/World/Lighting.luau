--!strict
-- Base lighting + post-processing. The client ZoneController tweens these per region.

local Lighting = game:GetService("Lighting")

local LightingSetup = {}

local function ensure(className: string, name: string): Instance
	local existing = Lighting:FindFirstChild(name)
	if existing and existing.ClassName == className then
		return existing
	end
	local inst = Instance.new(className)
	inst.Name = name
	inst.Parent = Lighting
	return inst
end

function LightingSetup.apply()
	Lighting.Ambient = Color3.fromRGB(70, 60, 90)
	Lighting.OutdoorAmbient = Color3.fromRGB(120, 105, 140)
	Lighting.Brightness = 2.2
	Lighting.ClockTime = 17.4
	Lighting.GeographicLatitude = 30
	Lighting.EnvironmentDiffuseScale = 0.6
	Lighting.EnvironmentSpecularScale = 0.6
	Lighting.ExposureCompensation = 0.1

	local atmosphere = ensure("Atmosphere", "RiftAtmosphere") :: Atmosphere
	atmosphere.Density = 0.3
	atmosphere.Offset = 0.15
	atmosphere.Color = Color3.fromRGB(150, 130, 190)
	atmosphere.Decay = Color3.fromRGB(110, 80, 140)
	atmosphere.Glare = 0.4
	atmosphere.Haze = 1.4

	local bloom = ensure("BloomEffect", "RiftBloom") :: BloomEffect
	bloom.Intensity = 0.7
	bloom.Size = 28
	bloom.Threshold = 1.6

	local color = ensure("ColorCorrectionEffect", "RiftGrade") :: ColorCorrectionEffect
	color.Contrast = 0.08
	color.Saturation = 0.12
	color.Brightness = 0.02
	color.TintColor = Color3.fromRGB(240, 235, 255)

	local rays = ensure("SunRaysEffect", "RiftRays") :: SunRaysEffect
	rays.Intensity = 0.06
	rays.Spread = 0.6
end

return LightingSetup
