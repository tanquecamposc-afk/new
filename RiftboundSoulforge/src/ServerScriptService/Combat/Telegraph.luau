--!strict
-- Server-created attack telegraphs. They replicate to every client, which animates the fill
-- (ExpandStart/ExpandEnd attributes) and can recolour them for high-contrast mode.
-- Every telegraph combines colour + shape + a warning glyph + motion (never colour alone).

local Debris = game:GetService("Debris")

local Telegraph = {}

local folder: Folder? = nil
local DANGER = Color3.fromRGB(255, 70, 50)
local SAFE = Color3.fromRGB(90, 255, 150)

local function getFolder(): Folder
	if folder and folder.Parent then
		return folder
	end
	local f = workspace:FindFirstChild("Telegraphs") :: Folder?
	if not f then
		f = Instance.new("Folder")
		f.Name = "Telegraphs"
		f.Parent = workspace
	end
	folder = f
	return f :: Folder
end

local rayParams = RaycastParams.new()
rayParams.FilterType = Enum.RaycastFilterType.Include

local function groundY(position: Vector3): number
	local world = workspace:FindFirstChild("World")
	if world then
		rayParams.FilterDescendantsInstances = { world, workspace.Terrain }
		local result = workspace:Raycast(position + Vector3.new(0, 6, 0), Vector3.new(0, -40, 0), rayParams)
		if result then
			return result.Position.Y
		end
	end
	return position.Y
end
Telegraph.groundY = groundY

local function basePart(name: string, color: Color3, transparency: number): Part
	local part = Instance.new("Part")
	part.Name = name
	part.Anchored = true
	part.CanCollide = false
	part.CanQuery = false
	part.CanTouch = false
	part.CastShadow = false
	part.Material = Enum.Material.Neon
	part.Color = color
	part.Transparency = transparency
	part.TopSurface = Enum.SurfaceType.Smooth
	part.BottomSurface = Enum.SurfaceType.Smooth
	return part
end

local function glyph(parent: Instance, text: string, color: Color3)
	local gui = Instance.new("BillboardGui")
	gui.Name = "Glyph"
	gui.Size = UDim2.fromOffset(46, 46)
	gui.StudsOffset = Vector3.new(0, 3, 0)
	gui.AlwaysOnTop = true
	gui.LightInfluence = 0
	gui.MaxDistance = 140
	local label = Instance.new("TextLabel")
	label.Size = UDim2.fromScale(1, 1)
	label.BackgroundTransparency = 1
	label.Text = text
	label.TextScaled = true
	label.Font = Enum.Font.GothamBlack
	label.TextColor3 = color
	label.TextStrokeTransparency = 0
	label.Parent = gui
	gui.Parent = parent
end

export type Handle = { model: Model, destroy: (Handle) -> () }

local function finish(model: Model, duration: number, kind: string): Handle
	model:SetAttribute("Telegraph", kind)
	model:SetAttribute("Start", workspace:GetServerTimeNow())
	model:SetAttribute("Duration", duration)
	model.Parent = getFolder()
	Debris:AddItem(model, duration + 0.4)
	local handle = { model = model }
	function handle.destroy(h: Handle)
		if h.model.Parent then
			h.model:Destroy()
		end
	end
	return handle :: any
end

local function disc(model: Model, center: Vector3, radius: number, color: Color3, transparency: number, lift: number, name: string): Part
	local part = basePart(name, color, transparency)
	part.Shape = Enum.PartType.Cylinder
	part.Size = Vector3.new(0.2, radius * 2, radius * 2)
	part.CFrame = CFrame.new(center + Vector3.new(0, lift, 0)) * CFrame.Angles(0, 0, math.rad(90))
	part.Parent = model
	return part
end

function Telegraph.circle(center: Vector3, radius: number, duration: number, opts: any?): Handle
	local o = opts or {}
	local y = groundY(center)
	local c = Vector3.new(center.X, y, center.Z)
	local model = Instance.new("Model")
	model.Name = "Circle"
	local color = o.color or DANGER
	disc(model, c, radius, color, 0.72, 0.12, "Area")
	local fill = disc(model, c, radius, color, 0.45, 0.16, "Fill")
	fill:SetAttribute("FullSize", fill.Size)
	fill.Size = Vector3.new(0.2, 0.5, 0.5)
	local anchor = disc(model, c, 0.6, color, 1, 0.2, "Anchor")
	glyph(anchor, o.glyph or "!", color)
	return finish(model, duration, "Circle")
end

function Telegraph.safeZone(center: Vector3, radius: number, duration: number): Handle
	local y = groundY(center)
	local c = Vector3.new(center.X, y, center.Z)
	local model = Instance.new("Model")
	model.Name = "Safe"
	disc(model, c, radius, SAFE, 0.5, 0.2, "Area")
	local anchor = disc(model, c, 0.6, SAFE, 1, 0.22, "Anchor")
	glyph(anchor, "SAFE", SAFE)
	return finish(model, duration, "Safe")
end

function Telegraph.ring(center: Vector3, inner: number, outer: number, duration: number, opts: any?): Handle
	local o = opts or {}
	local y = groundY(center)
	local c = Vector3.new(center.X, y, center.Z)
	local model = Instance.new("Model")
	model.Name = "Ring"
	local color = o.color or DANGER
	disc(model, c, outer, color, 0.55, 0.12, "Area")
	local safe = disc(model, c, inner, Color3.fromRGB(20, 20, 30), 0.15, 0.18, "Hole")
	safe.Material = Enum.Material.SmoothPlastic
	local fill = disc(model, c, outer, color, 0.5, 0.14, "Fill")
	fill:SetAttribute("FullSize", fill.Size)
	fill.Size = Vector3.new(0.2, inner * 2, inner * 2)
	local anchor = disc(model, c + Vector3.new(outer * 0.7, 0, 0), 0.6, color, 1, 0.2, "Anchor")
	glyph(anchor, "◎", color)
	return finish(model, duration, "Ring")
end

function Telegraph.line(origin: Vector3, dir: Vector3, length: number, width: number, duration: number, opts: any?): Handle
	local o = opts or {}
	local flatDir = Vector3.new(dir.X, 0, dir.Z)
	flatDir = if flatDir.Magnitude > 1e-3 then flatDir.Unit else Vector3.new(0, 0, -1)
	local y = groundY(origin)
	local start = Vector3.new(origin.X, y, origin.Z)
	local mid = start + flatDir * (length / 2)
	local cf = CFrame.lookAt(mid, mid + flatDir)
	local model = Instance.new("Model")
	model.Name = "Line"
	local color = o.color or DANGER
	local area = basePart("Area", color, 0.7)
	area.Size = Vector3.new(width, 0.2, length)
	area.CFrame = cf + Vector3.new(0, 0.12, 0)
	area.Parent = model
	local fill = basePart("Fill", color, 0.45)
	fill.Size = Vector3.new(width, 0.2, length)
	fill:SetAttribute("FullSize", fill.Size)
	fill:SetAttribute("Grow", "Forward")
	fill.CFrame = cf + Vector3.new(0, 0.16, 0)
	fill.Parent = model
	-- arrow chevrons show direction (shape cue)
	for i = 1, 3 do
		local chevron = basePart("Chevron", Color3.new(1, 1, 1), 0.35)
		chevron.Size = Vector3.new(width * 0.5, 0.22, 0.6)
		chevron.CFrame = CFrame.lookAt(start + flatDir * (length * i / 4), start + flatDir * (length * i / 4 + 1))
			* CFrame.new(0, 0.2, 0)
		chevron.Parent = model
	end
	local anchor = basePart("Anchor", color, 1)
	anchor.Size = Vector3.new(0.5, 0.5, 0.5)
	anchor.CFrame = CFrame.new(mid + Vector3.new(0, 0.3, 0))
	anchor.Parent = model
	glyph(anchor, o.glyph or "!", color)
	model.PrimaryPart = area
	return finish(model, duration, "Line")
end

function Telegraph.square(center: Vector3, half: number, duration: number, opts: any?): Handle
	local o = opts or {}
	local model = Instance.new("Model")
	model.Name = "Square"
	local color = o.color or DANGER
	local area = basePart("Area", color, 0.55)
	area.Size = Vector3.new(half * 2 - 1, 0.25, half * 2 - 1)
	area.CFrame = CFrame.new(center + Vector3.new(0, 0.15, 0))
	area.Parent = model
	local fill = basePart("Fill", color, 0.4)
	fill.Size = area.Size
	fill:SetAttribute("FullSize", fill.Size)
	fill.Size = Vector3.new(1, 0.25, 1)
	fill.CFrame = CFrame.new(center + Vector3.new(0, 0.2, 0))
	fill.Parent = model
	glyph(area, o.glyph or "⚠", color)
	return finish(model, duration, "Square")
end

return Telegraph
