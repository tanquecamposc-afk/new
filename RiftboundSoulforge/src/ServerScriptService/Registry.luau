--!strict
-- Service locator. Services never require each other directly (avoids circular requires);
-- they fetch peers lazily through Registry.get after Main has registered everyone.

local Registry = {}
local services: { [string]: any } = {}

function Registry.register(name: string, service: any)
	assert(services[name] == nil, "service registered twice: " .. name)
	services[name] = service
end

function Registry.get(name: string): any
	local service = services[name]
	if not service then
		error("service not registered: " .. name, 2)
	end
	return service
end

return Registry
