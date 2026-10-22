--!strict
-- Minimal synchronous signal used for in-process events (no Instances, no yielding).

export type Connection = { Disconnect: (self: Connection) -> (), Connected: boolean }

local Signal = {}
Signal.__index = Signal

function Signal.new()
	return setmetatable({ _handlers = {} :: { [any]: (...any) -> () } }, Signal)
end

function Signal:Connect(fn: (...any) -> ())
	local key = {}
	self._handlers[key] = fn
	local connection = { Connected = true }
	local handlers = self._handlers
	function connection.Disconnect(conn)
		conn.Connected = false
		handlers[key] = nil
	end
	return connection
end

function Signal:Fire(...: any)
	for _, fn in self._handlers do
		local ok, err = pcall(fn, ...)
		if not ok then
			warn("[Signal] handler error: " .. tostring(err))
		end
	end
end

function Signal:DisconnectAll()
	table.clear(self._handlers)
end

return Signal
