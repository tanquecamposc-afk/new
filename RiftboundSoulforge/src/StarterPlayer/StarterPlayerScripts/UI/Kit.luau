--!strict
-- Reusable UI building blocks. Views compose these; no view builds raw styling by hand.

local TweenService = game:GetService("TweenService")

local Theme = require(script.Parent.Theme)
local C = Theme.Colors

local Kit = {}

function Kit.new(className: string, props: { [string]: any }?, children: { Instance }?): any
	local inst = Instance.new(className)
	if props then
		for key, value in props do
			if key ~= "Parent" then
				(inst :: any)[key] = value
			end
		end
	end
	if children then
		for _, child in children do
			child.Parent = inst
		end
	end
	if props and props.Parent then
		inst.Parent = props.Parent
	end
	return inst
end

function Kit.corner(parent: Instance, radius: number?)
	return Kit.new("UICorner", { CornerRadius = UDim.new(0, radius or 10), Parent = parent })
end

function Kit.stroke(parent: Instance, color: Color3?, thickness: number?, transparency: number?)
	return Kit.new("UIStroke", {
		Color = color or C.Stroke,
		Thickness = thickness or 1,
		Transparency = transparency or 0.2,
		ApplyStrokeMode = Enum.ApplyStrokeMode.Border,
		Parent = parent,
	})
end

function Kit.padding(parent: Instance, px: number)
	return Kit.new("UIPadding", {
		PaddingTop = UDim.new(0, px),
		PaddingBottom = UDim.new(0, px),
		PaddingLeft = UDim.new(0, px),
		PaddingRight = UDim.new(0, px),
		Parent = parent,
	})
end

function Kit.list(parent: Instance, padding: number?, horizontal: boolean?, align: Enum.HorizontalAlignment?)
	return Kit.new("UIListLayout", {
		Padding = UDim.new(0, padding or 6),
		FillDirection = if horizontal then Enum.FillDirection.Horizontal else Enum.FillDirection.Vertical,
		SortOrder = Enum.SortOrder.LayoutOrder,
		HorizontalAlignment = align or Enum.HorizontalAlignment.Left,
		VerticalAlignment = Enum.VerticalAlignment.Top,
		Parent = parent,
	})
end

function Kit.panel(props: { [string]: any }): Frame
	local frame = Kit.new("Frame", {
		BackgroundColor3 = props.color or C.Panel,
		BackgroundTransparency = props.transparency or 0.05,
		BorderSizePixel = 0,
		Size = props.size or UDim2.fromScale(1, 1),
		Position = props.position or UDim2.new(),
		AnchorPoint = props.anchor or Vector2.zero,
		AutomaticSize = props.autoSize or Enum.AutomaticSize.None,
		LayoutOrder = props.order or 0,
		Name = props.name or "Panel",
		Visible = if props.visible == nil then true else props.visible,
		ClipsDescendants = props.clip or false,
		Parent = props.parent,
	})
	Kit.corner(frame, props.radius)
	if props.stroke ~= false then
		Kit.stroke(frame, props.strokeColor)
	end
	if props.pad then
		Kit.padding(frame, props.pad)
	end
	return frame
end

function Kit.text(props: { [string]: any }): TextLabel
	return Kit.new("TextLabel", {
		BackgroundTransparency = 1,
		Text = props.text or "",
		TextColor3 = props.color or C.Text,
		Font = props.font or Theme.Fonts.Body,
		TextSize = props.textSize or 16,
		TextWrapped = if props.wrap == nil then true else props.wrap,
		TextXAlignment = props.alignX or Enum.TextXAlignment.Left,
		TextYAlignment = props.alignY or Enum.TextYAlignment.Center,
		Size = props.size or UDim2.new(1, 0, 0, (props.textSize or 16) + 6),
		Position = props.position or UDim2.new(),
		AnchorPoint = props.anchor or Vector2.zero,
		AutomaticSize = props.autoSize or Enum.AutomaticSize.None,
		RichText = props.rich or false,
		LayoutOrder = props.order or 0,
		Name = props.name or "Text",
		TextScaled = props.scaled or false,
		TextStrokeTransparency = props.strokeT or 1,
		Parent = props.parent,
	})
end

export type Button = { instance: TextButton, setEnabled: (boolean, string?) -> (), setText: (string) -> () }

function Kit.button(props: { [string]: any }): Button
	local base = props.color or C.Accent
	local button: TextButton = Kit.new("TextButton", {
		BackgroundColor3 = base,
		BorderSizePixel = 0,
		AutoButtonColor = false,
		Text = props.text or "Button",
		TextColor3 = props.textColor or Color3.new(1, 1, 1),
		Font = Theme.Fonts.Bold,
		TextSize = props.textSize or 16,
		TextWrapped = true,
		Size = props.size or UDim2.new(0, 160, 0, 38),
		Position = props.position or UDim2.new(),
		AnchorPoint = props.anchor or Vector2.zero,
		LayoutOrder = props.order or 0,
		Name = props.name or "Button",
		Parent = props.parent,
	})
	Kit.corner(button, 8)
	local enabled = true
	local hover = base:Lerp(Color3.new(1, 1, 1), 0.15)
	button.MouseEnter:Connect(function()
		if enabled then
			TweenService:Create(button, TweenInfo.new(0.12), { BackgroundColor3 = hover }):Play()
		end
	end)
	button.MouseLeave:Connect(function()
		if enabled then
			TweenService:Create(button, TweenInfo.new(0.12), { BackgroundColor3 = base }):Play()
		end
	end)
	button.Activated:Connect(function()
		if enabled and props.onClick then
			props.onClick()
		end
	end)
	local api = { instance = button }
	function api.setEnabled(value: boolean, reason: string?)
		enabled = value
		button.BackgroundColor3 = if value then base else C.PanelLight
		button.TextColor3 = if value then (props.textColor or Color3.new(1, 1, 1)) else C.TextMuted
		if reason and not value then
			button.Text = reason
		elseif value then
			button.Text = props.text or button.Text
		end
	end
	function api.setText(text: string)
		props.text = text
		button.Text = text
	end
	return api :: any
end

function Kit.scroll(props: { [string]: any }): ScrollingFrame
	local frame = Kit.new("ScrollingFrame", {
		BackgroundTransparency = 1,
		BorderSizePixel = 0,
		Size = props.size or UDim2.fromScale(1, 1),
		Position = props.position or UDim2.new(),
		CanvasSize = UDim2.new(),
		AutomaticCanvasSize = Enum.AutomaticSize.Y,
		ScrollBarThickness = 6,
		ScrollBarImageColor3 = C.Stroke,
		ScrollingDirection = Enum.ScrollingDirection.Y,
		LayoutOrder = props.order or 0,
		Name = props.name or "Scroll",
		Parent = props.parent,
	})
	Kit.list(frame, props.padding or 8)
	Kit.new("UIPadding", { PaddingRight = UDim.new(0, 8), PaddingBottom = UDim.new(0, 8), Parent = frame })
	return frame
end

-- Progress bar. Returns setter.
function Kit.bar(props: { [string]: any }): { frame: Frame, fill: Frame, label: TextLabel, set: (number, string?) -> () }
	local frame = Kit.new("Frame", {
		BackgroundColor3 = props.back or Color3.fromRGB(10, 10, 16),
		BackgroundTransparency = 0.1,
		BorderSizePixel = 0,
		Size = props.size or UDim2.new(1, 0, 0, 14),
		Position = props.position or UDim2.new(),
		LayoutOrder = props.order or 0,
		Name = props.name or "Bar",
		Parent = props.parent,
	})
	Kit.corner(frame, props.radius or 6)
	local fill = Kit.new("Frame", {
		BackgroundColor3 = props.color or C.Accent,
		BorderSizePixel = 0,
		Size = UDim2.fromScale(0, 1),
		Name = "Fill",
		Parent = frame,
	})
	Kit.corner(fill, props.radius or 6)
	local label = Kit.text({
		parent = frame,
		text = "",
		textSize = props.textSize or 12,
		font = Theme.Fonts.Bold,
		alignX = Enum.TextXAlignment.Center,
		size = UDim2.fromScale(1, 1),
		strokeT = 0.5,
	})
	label.ZIndex = 3
	local api = { frame = frame, fill = fill, label = label }
	function api.set(fraction: number, text: string?)
		fraction = math.clamp(fraction, 0, 1)
		if props.instant then
			fill.Size = UDim2.fromScale(fraction, 1)
		else
			TweenService:Create(fill, TweenInfo.new(0.15), { Size = UDim2.fromScale(fraction, 1) }):Play()
		end
		if text then
			label.Text = text
		end
	end
	return api :: any
end

function Kit.chip(parent: Instance, text: string, color: Color3, order: number?): TextLabel
	local label = Kit.text({
		parent = parent,
		text = text,
		textSize = 13,
		font = Theme.Fonts.Bold,
		color = color,
		alignX = Enum.TextXAlignment.Center,
		size = UDim2.fromOffset(0, 24),
		autoSize = Enum.AutomaticSize.X,
		wrap = false,
		order = order,
	})
	label.BackgroundTransparency = 0.75
	label.BackgroundColor3 = color
	Kit.corner(label, 12)
	Kit.new("UIPadding", { PaddingLeft = UDim.new(0, 10), PaddingRight = UDim.new(0, 10), Parent = label })
	return label
end

-- A card with a title row and a vertical content list (auto height).
function Kit.card(parent: Instance, title: string?, order: number?, accent: Color3?): Frame
	local card = Kit.panel({
		parent = parent,
		color = C.Card,
		size = UDim2.new(1, 0, 0, 0),
		autoSize = Enum.AutomaticSize.Y,
		order = order,
		pad = 12,
		strokeColor = accent,
		name = "Card",
	})
	Kit.list(card, 6)
	if title then
		Kit.text({ parent = card, text = title, font = Theme.Fonts.Bold, textSize = 18, color = accent or C.Text, order = 0 })
	end
	return card
end

-- Requirement line list: each entry { text, met }.
function Kit.requirements(parent: Instance, entries: { { text: string, met: boolean } }, order: number?)
	local holder = Kit.new("Frame", {
		BackgroundTransparency = 1,
		Size = UDim2.new(1, 0, 0, 0),
		AutomaticSize = Enum.AutomaticSize.Y,
		LayoutOrder = order or 0,
		Parent = parent,
	})
	Kit.list(holder, 2)
	for i, entry in entries do
		Kit.text({
			parent = holder,
			text = (if entry.met then "✔ " else "✖ ") .. entry.text,
			color = if entry.met then C.Good else C.Bad,
			textSize = 14,
			order = i,
		})
	end
	return holder
end

function Kit.row(parent: Instance, order: number?, height: number?): Frame
	local row = Kit.new("Frame", {
		BackgroundTransparency = 1,
		Size = UDim2.new(1, 0, 0, height or 40),
		AutomaticSize = if height then Enum.AutomaticSize.None else Enum.AutomaticSize.Y,
		LayoutOrder = order or 0,
		Parent = parent,
	})
	Kit.list(row, 8, true)
	return row
end

function Kit.clear(container: Instance)
	for _, child in container:GetChildren() do
		if not child:IsA("UIListLayout") and not child:IsA("UIPadding") and not child:IsA("UIGridLayout") then
			child:Destroy()
		end
	end
end

return Kit
