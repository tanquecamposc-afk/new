--!strict
-- Planar shape tests (ignoring height, with a vertical tolerance) used for BOTH player attacks
-- and enemy attacks, so what is telegraphed is exactly what can hit.

local Hitbox = {}

local VERTICAL_TOLERANCE = 10

local function flat(v: Vector3): Vector3
	return Vector3.new(v.X, 0, v.Z)
end

function Hitbox.inCircle(position: Vector3, center: Vector3, radius: number, padding: number?): boolean
	if math.abs(position.Y - center.Y) > VERTICAL_TOLERANCE + (padding or 0) then
		return false
	end
	return (flat(position) - flat(center)).Magnitude <= radius + (padding or 0)
end

function Hitbox.inRing(position: Vector3, center: Vector3, inner: number, outer: number, padding: number?): boolean
	if math.abs(position.Y - center.Y) > VERTICAL_TOLERANCE then
		return false
	end
	local d = (flat(position) - flat(center)).Magnitude
	local p = padding or 0
	return d <= outer + p and d >= inner - p
end

-- Rectangle starting at origin, extending `length` along dir, `width` wide.
function Hitbox.inLine(position: Vector3, origin: Vector3, dir: Vector3, length: number, width: number, padding: number?): boolean
	if math.abs(position.Y - origin.Y) > VERTICAL_TOLERANCE then
		return false
	end
	local p = padding or 0
	local forward = flat(dir)
	if forward.Magnitude < 1e-3 then
		return false
	end
	forward = forward.Unit
	local right = Vector3.new(-forward.Z, 0, forward.X)
	local rel = flat(position) - flat(origin)
	local along = rel:Dot(forward)
	local side = math.abs(rel:Dot(right))
	return along >= -p and along <= length + p and side <= width / 2 + p
end

-- Axis-aligned square tile (used by the Warden's final phase).
function Hitbox.inSquare(position: Vector3, center: Vector3, half: number): boolean
	return math.abs(position.X - center.X) <= half and math.abs(position.Z - center.Z) <= half
		and math.abs(position.Y - center.Y) <= VERTICAL_TOLERANCE
end

return Hitbox
