--!strict
--[[ Client (init.client.luau): arranque de controladores. ]]

local Controllers = script.Controllers

local ShadowRenderController = require(Controllers.ShadowRenderController)
local CombatController = require(Controllers.CombatController)

for name, controller in { ShadowRender = ShadowRenderController, Combat = CombatController } do
	local ok, err = pcall(controller.Start)
	if not ok then
		warn(`[Client] Start de {name} fallo: {err}`)
	end
end
