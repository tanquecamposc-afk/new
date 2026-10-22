--!strict
local UserInputService = game:GetService("UserInputService")
local Kit = require(script.Parent.Parent.Kit)
local Theme = require(script.Parent.Parent.Theme)
local ViewUtil = require(script.Parent.Parent.ViewUtil)

local C = Theme.Colors
local View = {}

local SECTIONS = {
	{ "Getting started", {
		"1. Follow the golden beam: it points to your current main contract.",
		"2. Training Arena (east): strike the dummies, then parry and dodge the Sparring Golem.",
		"3. Rift Portal (south): enter Emberfall Frontier. Mine ore, hunt, explore.",
		"4. Bank your Satchel at an Extraction Beacon, then upgrade at the Forge.",
	} },
	{ "Keyboard & mouse", {
		"LMB light combo (hold to chain) • V heavy • RMB block (tap right before a hit = Perfect Parry)",
		"Shift dodge (invulnerable briefly) • Q / E essence abilities • R fusion technique",
		"G Awaken when Resonance is full (G again = signature) • H Ember Tonic • T lock-on • M menu • F interact",
	} },
	{ "Gamepad", { "R2 light • R1 heavy • L2 block • B dodge • X / Y abilities • L1 fusion • D-Pad Up awaken • D-Pad Down tonic • R3 lock-on • Select menu" } },
	{ "Touch", { "On-screen buttons on the right: ATTACK, HEAVY, BLOCK (hold), DODGE, Q, E, R, AWAKEN, LOCK, TONIC. Tap prompts to interact." } },
	{ "Reading attacks", {
		"Red areas fill up before they hit. '!' = can be parried. '⚠' = dodge or leave. '◎' ring = stand in the centre or outside.",
		"'OPEN! STRIKE' above an enemy = punish window. Guardians block light hits from the front: use heavy attacks.",
	} },
	{ "Resonance & Awakening", { "Resonance builds from hits, combos, perfect parries, dodging telegraphs and interrupting. Full = press G. After an awakening you burn out for 10s. The Warden's Suppression Pulse ends awakenings." } },
	{ "Fusion", { "Find the right knowledge, research the union at the Fusion Chamber, then attune it in combat by chaining one essence into the other on the same enemy." } },
	{ "Co-op", { "Different players chaining complementary essences on the same enemies trigger Cooperative Resonance. Against the Warden, a perfect parry followed by a teammate's strike on its back opens a Breach." } },
	{ "Risk", { "Depth 1/2/3 loses 25/50/75% of your Satchel on death. Mastery, XP, unlocks, achievements and purchases are never lost." } },
}

function View.mount(container: Instance, _ctx: any)
	return ViewUtil.simple(container, function(body, _profile)
		for i, section in SECTIONS do
			local card = Kit.card(body, section[1], i)
			for j, line in section[2] do
				ViewUtil.para(card, line, C.TextDim, j, 14)
			end
		end
		if UserInputService.TouchEnabled then
			ViewUtil.para(body, "Touch device detected: touch controls are enabled.", C.Good, 99)
		end
	end, {})
end

return View
