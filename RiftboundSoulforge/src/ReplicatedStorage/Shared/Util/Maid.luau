--!strict
-- Tracks connections, instances, threads and callbacks so they can be cleaned up together.

local Maid = {}
Maid.__index = Maid

function Maid.new()
	return setmetatable({ _tasks = {} :: { any } }, Maid)
end

function Maid:Give<T>(task: T): T
	table.insert(self._tasks, task)
	return task
end

function Maid:Clean()
	local tasks = self._tasks
	self._tasks = {}
	for i = #tasks, 1, -1 do
		local task_ = tasks[i]
		local kind = typeof(task_)
		if kind == "RBXScriptConnection" or (kind == "table" and type(task_.Disconnect) == "function") then
			task_:Disconnect()
		elseif kind == "Instance" or (kind == "table" and type(task_.Destroy) == "function") then
			task_:Destroy()
		elseif kind == "thread" then
			pcall(task.cancel, task_)
		elseif kind == "function" then
			pcall(task_)
		end
	end
end

Maid.Destroy = Maid.Clean

return Maid
