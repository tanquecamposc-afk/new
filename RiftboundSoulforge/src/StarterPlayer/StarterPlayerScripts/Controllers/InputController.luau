--!strict
-- Cross-platform input. Keyboard/mouse and gamepad via UserInputService (respecting
-- gameProcessed so typing in chat or clicking UI never triggers combat); touch via the
-- on-screen buttons created by the HUD, which call InputController.press().
--
-- Desktop: LMB light (hold to chain) • RMB block/parry • V heavy • Shift dodge • Q/E abilities
--          R fusion • G awaken • H tonic • T lock-on • M menu
-- Gamepad: R2 light • L2 block • R1 heavy • B dodge • X/Y abilities • L1 fusion
--          DPadUp awaken • DPadDown tonic • R3 lock-on • Select menu

local UserInputService = game:GetService("UserInputService")
local RunService = game:GetService("RunService")

local CombatController = require(script.Parent.CombatController)

local InputController = {}

-- Injected by UIController: returns true while a modal window should swallow combat input.
InputController.isBlocked = function(): boolean
	return false
end
InputController.toggleMenu = function() end

local holdingLight = false

local KEYS: { [Enum.KeyCode]: string } = {
	[Enum.KeyCode.V] = "Heavy",
	[Enum.KeyCode.LeftShift] = "Dodge",
	[Enum.KeyCode.Q] = "Q",
	[Enum.KeyCode.E] = "E",
	[Enum.KeyCode.R] = "R",
	[Enum.KeyCode.G] = "Awaken",
	[Enum.KeyCode.H] = "Tonic",
	[Enum.KeyCode.T] = "Lock",
	[Enum.KeyCode.M] = "Menu",
	[Enum.KeyCode.ButtonR2] = "Light",
	[Enum.KeyCode.ButtonL2] = "Block",
	[Enum.KeyCode.ButtonR1] = "Heavy",
	[Enum.KeyCode.ButtonB] = "Dodge",
	[Enum.KeyCode.ButtonX] = "Q",
	[Enum.KeyCode.ButtonY] = "E",
	[Enum.KeyCode.ButtonL1] = "R",
	[Enum.KeyCode.DPadUp] = "Awaken",
	[Enum.KeyCode.DPadDown] = "Tonic",
	[Enum.KeyCode.ButtonR3] = "Lock",
	[Enum.KeyCode.ButtonSelect] = "Menu",
}

-- Single entry point for every input source.
function InputController.press(action: string, began: boolean)
	if action == "Menu" then
		if began then
			InputController.toggleMenu()
		end
		return
	end
	if InputController.isBlocked() then
		if not began and action == "Block" then
			CombatController.block(false)
		end
		holdingLight = false
		return
	end
	if action == "Light" then
		holdingLight = began
		if began then
			CombatController.light()
		end
	elseif action == "Block" then
		CombatController.block(began)
	elseif not began then
		return
	elseif action == "Heavy" then
		CombatController.heavy()
	elseif action == "Dodge" then
		CombatController.dodge()
	elseif action == "Q" or action == "E" or action == "R" then
		CombatController.ability(action)
	elseif action == "Awaken" then
		CombatController.awaken()
	elseif action == "Tonic" then
		CombatController.tonic()
	elseif action == "Lock" then
		CombatController.toggleLock()
	end
end

function InputController.init()
	UserInputService.InputBegan:Connect(function(input, gameProcessed)
		if gameProcessed or UserInputService:GetFocusedTextBox() then
			return
		end
		if input.UserInputType == Enum.UserInputType.MouseButton1 then
			InputController.press("Light", true)
		elseif input.UserInputType == Enum.UserInputType.MouseButton2 then
			InputController.press("Block", true)
		else
			local action = KEYS[input.KeyCode]
			if action then
				InputController.press(action, true)
			end
		end
	end)
	UserInputService.InputEnded:Connect(function(input, _gameProcessed)
		if input.UserInputType == Enum.UserInputType.MouseButton1 then
			InputController.press("Light", false)
		elseif input.UserInputType == Enum.UserInputType.MouseButton2 then
			InputController.press("Block", false)
		else
			local action = KEYS[input.KeyCode]
			if action == "Light" or action == "Block" then
				InputController.press(action, false)
			end
		end
	end)
	UserInputService.WindowFocusReleased:Connect(function()
		holdingLight = false
		CombatController.block(false)
	end)
	-- Holding light attack chains the combo as soon as each strike recovers.
	RunService.Heartbeat:Connect(function()
		if holdingLight and not InputController.isBlocked() then
			CombatController.light()
		end
	end)
end

return InputController
