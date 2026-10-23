--!strict
-- Routes the single "Request" RemoteFunction to registered handlers with rate limiting,
-- profile checks and error isolation. Handlers: (player, args) -> (ok, message?, data?).

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Net = require(Shared.Net)
local Registry = require(script.Parent.Parent.Registry)

type Handler = (Player, any) -> (boolean, string?, any)

local RequestService = {}
local handlers: { [string]: { category: string, fn: Handler, needsProfile: boolean } } = {}

function RequestService.Init() end

function RequestService.on(kind: string, category: string, fn: Handler, needsProfile: boolean?)
	assert(handlers[kind] == nil, "duplicate request handler " .. kind)
	handlers[kind] = { category = category, fn = fn, needsProfile = needsProfile ~= false }
end

function RequestService.Start()
	local Security = Registry.get("SecurityService")
	local PlayerData = Registry.get("PlayerDataService")
	Net.func("Request").OnServerInvoke = function(player: Player, kind: any, args: any)
		if type(kind) ~= "string" or #kind > 40 then
			Security.flag(player, "bad request kind")
			return false, "Petición no válida."
		end
		local entry = handlers[kind]
		if not entry then
			Security.flag(player, "unknown request " .. kind)
			return false, "Petición desconocida."
		end
		if not Security.allow(player, entry.category) then
			return false, "Más despacio."
		end
		if args ~= nil and type(args) ~= "table" then
			return false, "Argumentos no válidos."
		end
		if entry.needsProfile and not PlayerData.get(player) then
			return false, "Tu perfil aún se está cargando."
		end
		local ok, a, b, c = pcall(entry.fn, player, args or {})
		if not ok then
			warn(string.format("[Request] %s failed for %s: %s", kind, player.Name, tostring(a)))
			return false, "Algo salió mal. Inténtalo de nuevo."
		end
		return a, b, c
	end
end

return RequestService
