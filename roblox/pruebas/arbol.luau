-- Monta en el Roblox de mentira el mismo árbol de instancias que tendrá el lugar
local A = {}
function A.montar(F, FU)
	local S = F.servicios
	local function modulo(nombre, fuente, padre)
		local m = F.Instance.new("ModuleScript")
		m.Name = nombre
		m.Source = assert(fuente, "falta " .. nombre)
		m.Parent = padre
		return m
	end
	local function carpetaDe(prefijo, padre, excluir)
		for clave, fuente in FU do
			local resto = clave:sub(#prefijo + 2)
			if clave:sub(1, #prefijo + 1) == prefijo .. "/" and not resto:find("/") and not (excluir and excluir[resto]) then
				modulo(resto, fuente, padre)
			end
		end
	end
	local comp = F.Instance.new("Folder")
	comp.Name = "Blockverse"
	comp.Parent = S.ReplicatedStorage
	carpetaDe("compartido", comp)
	local datos = F.Instance.new("Folder")
	datos.Name = "Datos"
	datos.Parent = comp
	carpetaDe("compartido/Datos", datos)
	return comp, modulo, carpetaDe
end
return A
