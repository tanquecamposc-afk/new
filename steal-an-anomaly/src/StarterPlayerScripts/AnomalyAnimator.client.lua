-- Anima en el cliente todas las anomalías (etiqueta "Anomaly") leyendo los
-- atributos A_* que pone AnomalyBuilder. Solo anima las cercanas a la cámara.
local CollectionService = game:GetService("CollectionService")
local RunService = game:GetService("RunService")

local camera = workspace.CurrentCamera
local tracked = {}
local clock = 0

local MAX_DIST = 170

local function addPart(entry, p)
	if not p:IsA("BasePart") then
		return
	end
	local weld = p:FindFirstChild("W") or p:WaitForChild("W", 2)
	local base = p:GetAttribute("BaseC0")
	if not weld or not base then
		return
	end
	table.insert(entry.Parts, {
		Part = p,
		Weld = weld,
		Base = base,
		Type = p:GetAttribute("A_Type"),
		Speed = p:GetAttribute("A_Speed") or 1,
		Amp = p:GetAttribute("A_Amp") or 0.2,
		Phase = p:GetAttribute("A_Phase") or 0,
		Bias = p:GetAttribute("A_Bias") or 0,
		Pivot = p:GetAttribute("A_Pivot") or Vector3.zero,
		Axis = (p:GetAttribute("A_Axis") or Vector3.yAxis).Unit,
		BaseSize = p:GetAttribute("BaseSize") or p.Size,
		BaseT = p:GetAttribute("BaseT") or p.Transparency,
		Role = p:GetAttribute("Role"),
	})
end

local function track(model)
	if tracked[model] then
		return
	end
	local entry = { Model = model, Parts = {}, Phase = math.random() * 10 }
	tracked[model] = entry
	task.spawn(function()
		for _, d in ipairs(model:GetChildren()) do
			addPart(entry, d)
		end
	end)
	entry.Conn = model.ChildAdded:Connect(function(d)
		addPart(entry, d)
	end)
end

local function untrack(model)
	local entry = tracked[model]
	if entry then
		if entry.Conn then
			entry.Conn:Disconnect()
		end
		tracked[model] = nil
	end
end

CollectionService:GetInstanceAddedSignal("Anomaly"):Connect(track)
CollectionService:GetInstanceRemovedSignal("Anomaly"):Connect(untrack)
for _, m in ipairs(CollectionService:GetTagged("Anomaly")) do
	track(m)
end

local function animateModel(entry, dt)
	local model = entry.Model
	local inv = model:GetAttribute("Inverted") and -1 or 1
	local t = clock + entry.Phase
	local bobAmp = model:GetAttribute("BobAmp") or 0.2
	local bobSpeed = model:GetAttribute("BobSpeed") or 2
	local bob = math.sin(t * bobSpeed) * bobAmp * inv
	local global = CFrame.identity
	if model:GetAttribute("Walking") then
		bob += math.abs(math.sin(t * 7)) * 0.35
		global = CFrame.Angles(0, 0, math.sin(t * 7) * 0.07)
	end
	global = CFrame.new(0, bob, 0) * global
	if model:GetAttribute("Glitch") and math.random() < 0.08 then
		global = CFrame.new((math.random() - 0.5) * 0.5, 0, (math.random() - 0.5) * 0.5) * global
	end
	local rainbow = model:GetAttribute("Rainbow")
	local hue = (clock * 0.25 + entry.Phase) % 1

	-- Pista de Imitador: parpadeos sueltos
	if model:GetAttribute("TellFlicker") then
		if entry.FlickPart and clock > entry.FlickUntil then
			entry.FlickPart.Part.Transparency = entry.FlickPart.BaseT
			entry.FlickPart = nil
		elseif not entry.FlickPart and math.random() < dt * 0.9 and #entry.Parts > 0 then
			entry.FlickPart = entry.Parts[math.random(1, #entry.Parts)]
			entry.FlickUntil = clock + 0.09
			entry.FlickPart.Part.Transparency = 1
		end
	end

	for _, p in ipairs(entry.Parts) do
		local c0 = p.Base
		local ty = p.Type
		if ty == "rot" then
			c0 = CFrame.new(p.Pivot) * CFrame.fromAxisAngle(p.Axis, clock * p.Speed * inv) * CFrame.new(-p.Pivot) * p.Base
		elseif ty == "swing" then
			local a = p.Bias + math.sin(t * p.Speed * inv + p.Phase) * p.Amp
			c0 = CFrame.new(p.Pivot) * CFrame.fromAxisAngle(p.Axis, a) * CFrame.new(-p.Pivot) * p.Base
		elseif ty == "wiggle" then
			c0 = p.Base * CFrame.Angles(math.sin(t * p.Speed + p.Phase) * p.Amp, 0, math.cos(t * p.Speed * 0.8 + p.Phase) * p.Amp * 0.6)
		elseif ty == "pulse" then
			p.Part.Size = p.BaseSize * (1 + math.sin(t * p.Speed + p.Phase) * p.Amp)
		elseif ty == "flicker" then
			if p.Part.Transparency ~= p.BaseT then
				if math.random() < dt * 12 then
					p.Part.Transparency = p.BaseT
				end
			elseif math.random() < dt * p.Speed then
				p.Part.Transparency = math.min(1, p.BaseT + 0.85)
			end
		end
		if p.Weld.Parent then
			p.Weld.C0 = global * c0
		end
		if rainbow and (p.Role == "P" or p.Role == "S") then
			p.Part.Color = Color3.fromHSV((hue + (p.Role == "S" and 0.15 or 0)) % 1, 0.55, 1)
		end
	end
end

-- Anillo giratorio de la Grieta (solo visual, local)
local riftParts = {}
local riftCenter
task.spawn(function()
	local map = workspace:WaitForChild("Map", 30)
	local rift = map and map:WaitForChild("Rift", 10)
	local ring = rift and rift:WaitForChild("Ring", 10)
	local core = rift and rift:FindFirstChild("RiftCore")
	if ring and core then
		riftCenter = core.CFrame
		for _, p in ipairs(ring:GetChildren()) do
			if p:IsA("BasePart") then
				table.insert(riftParts, { Part = p, Rel = riftCenter:ToObjectSpace(p.CFrame) })
			end
		end
	end
end)

RunService.RenderStepped:Connect(function(dt)
	clock += dt
	local camPos = camera.CFrame.Position
	for model, entry in pairs(tracked) do
		if not model.Parent then
			untrack(model)
		else
			local root = model.PrimaryPart
			if root and (root.Position - camPos).Magnitude < MAX_DIST then
				animateModel(entry, dt)
			end
		end
	end
	if riftCenter then
		local spin = CFrame.Angles(clock * 0.6, 0, 0)
		for _, r in ipairs(riftParts) do
			r.Part.CFrame = riftCenter * spin * r.Rel
		end
	end
end)
