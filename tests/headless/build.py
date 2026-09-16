#!/usr/bin/env python3
"""Aplana src/ a un proyecto Luau ejecutable por el CLI.

Los modulos de Roblox se requieren por Instance (require(script.Parent.X)), algo
que el CLI no entiende. Este script:
  1. copia cada modulo a un directorio plano,
  2. reescribe los require por instancia a require por ruta relativa,
  3. antepone un preambulo que inyecta los stubs de las APIs de Roblox.

El cuerpo de los modulos no se modifica: las pruebas ejercitan la logica real.
"""
import os
import pathlib
import re
import shutil
import sys

MODULES = {
    "Types": "ReplicatedStorage/Shared/Types.luau",
    "Config": "ReplicatedStorage/Shared/Modules/Config.luau",
    "StatCalculator": "ReplicatedStorage/Shared/Modules/StatCalculator.luau",
    "NetBridge": "ReplicatedStorage/Shared/Network/NetBridge.luau",
    "DataService": "ServerScriptService/Server/Services/DataService.luau",
    "CombatService": "ServerScriptService/Server/Services/CombatService.luau",
    "ShadowServerService": "ServerScriptService/Server/Services/ShadowServerService.luau",
    "DungeonService": "ServerScriptService/Server/Services/DungeonService.luau",
    "EnemyNPC": "ServerScriptService/Server/Components/EnemyNPC.luau",
    "MockProfileStore": "ServerScriptService/Server/Test/MockProfileStore.luau",
    "IntegrationTest": "ServerScriptService/Server/Test/IntegrationTest.luau",
}

PREAMBLE = """--!nocheck
local __h = require("./harness_env")
local game, Vector3, Random, task, Instance, workspace, typeof, script, warn =
\t__h.game, __h.Vector3, __h.Random, __h.task, __h.Instance, __h.workspace, __h.typeof, __h.script, __h.warn
local _ = game, Vector3, Random, task, Instance, workspace, typeof, script, warn
"""

HARNESS_ENV = """--!nocheck
local stub = require("./roblox_stub")
local dummy = {}
setmetatable(dummy, { __index = function() return dummy end })
dummy.FindFirstChild = function() return nil end
dummy.IsA = function() return false end
return {
\tgame = stub.game,
\tVector3 = stub.Vector3,
\tRandom = stub.Random,
\ttask = stub.task,
\tInstance = stub.Instance,
\tworkspace = stub.services.Workspace,
\ttypeof = stub.typeof,
\tscript = dummy,
\twarn = function(...) print("[warn]", ...) end,
\tservices = stub.services,
}
"""

MAIN = """--!nocheck
local IntegrationTest = require("./IntegrationTest")
local report = IntegrationTest.Run()
if report.Failed > 0 then
\terror(`{report.Failed} aserciones fallaron`, 0)
end
print("[Harness] Todas las aserciones pasaron.")
"""

REQUIRE_RE = re.compile(r"require\(([^()]*?)\)")


def rewrite_require(match: "re.Match[str]") -> str:
    last = match.group(1).strip().split(".")[-1].strip()
    if last in MODULES:
        return f'require("./{last}")'
    return match.group(0)


def main() -> int:
    root = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
    out = pathlib.Path(sys.argv[2] if len(sys.argv) > 2 else root / ".headless-build")

    shutil.rmtree(out, ignore_errors=True)
    os.makedirs(out)

    for name, relative in MODULES.items():
        source = (root / "src" / relative).read_text(encoding="utf-8")
        source = REQUIRE_RE.sub(rewrite_require, source)
        source = source.replace("--!strict\n", "", 1)
        (out / f"{name}.luau").write_text(PREAMBLE + source, encoding="utf-8")

    (out / "harness_env.luau").write_text(HARNESS_ENV, encoding="utf-8")
    (out / "main.luau").write_text(MAIN, encoding="utf-8")
    print(f"[build] {len(MODULES)} modulos preparados en {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
