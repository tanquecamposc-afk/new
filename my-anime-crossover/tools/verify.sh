#!/usr/bin/env bash
# Verificación sin abrir Unity:
#   1. compila AnimeCrossover.Runtime y las pruebas contra los ensamblados de
#      referencia reales de Unity (NuGet: UnityEngine.Modules) con Roslyn (C# 9, como Unity 2022.3);
#   2. ejecuta con NUnitLite las pruebas que no necesitan el motor.
# Las pruebas que crean GameObjects (HealthTests) se ejecutan en el Test Runner de Unity.
# Requisitos: mono (apt install mono-devel), curl, unzip.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CACHE="${XDG_CACHE_HOME:-$HOME/.cache}/anime-crossover-verify"
OUT="$CACHE/out"
mkdir -p "$CACHE" "$OUT"

fetch() { # id version
  local id="$1" v="$2" dir="$CACHE/$1"
  [ -d "$dir" ] && return
  curl -fsSL -o "$CACHE/$id.nupkg" "https://api.nuget.org/v3-flatcontainer/$id/$v/$id.$v.nupkg"
  mkdir -p "$dir" && (cd "$dir" && unzip -oq "../$id.nupkg")
}
fetch microsoft.net.compilers 4.2.0
fetch unityengine.modules 2021.3.33
fetch nunit 3.14.0
fetch nunitlite 3.14.0

CSC="mono $CACHE/microsoft.net.compilers/tools/csc.exe"
MONO_API="$(dirname "$(dirname "$(command -v mono)")")/lib/mono/4.7.2-api"
UNITY="$CACHE/unityengine.modules/lib/netstandard2.0"
UNITY45="$CACHE/unityengine.modules/lib/net45"
REFS=("-r:$MONO_API/mscorlib.dll" "-r:$MONO_API/System.dll" "-r:$MONO_API/System.Core.dll" "-r:$MONO_API/Facades/netstandard.dll"
      "-r:$UNITY/UnityEngine.CoreModule.dll" "-r:$UNITY/UnityEngine.PhysicsModule.dll" "-r:$UNITY/UnityEngine.AnimationModule.dll")
COMMON=(-nologo -langversion:9.0 -nostdlib -define:UNITY_EDITOR "${REFS[@]}")
BASE=("${COMMON[@]}" -warnaserror+ -warn:4)   # el código del proyecto no puede tener ni un aviso

echo "== Stub del Input System"
$CSC "${COMMON[@]}" -nowarn:CS0067 -target:library -out:"$OUT/Unity.InputSystem.dll" "$ROOT/tools/stubs/InputSystemStub.cs"

echo "== AnimeCrossover.Runtime"
mapfile -t RUNTIME < <(find "$ROOT/Assets/Scripts" -name '*.cs' | sort)
$CSC "${BASE[@]}" -target:library -out:"$OUT/AnimeCrossover.Runtime.dll" "-r:$OUT/Unity.InputSystem.dll" "${RUNTIME[@]}"

echo "== AnimeCrossover.Tests.EditMode"
mapfile -t TESTS < <(find "$ROOT/Assets/Tests" -name '*.cs' | sort)
$CSC "${BASE[@]}" -target:library -out:"$OUT/AnimeCrossover.Tests.dll" "-r:$OUT/AnimeCrossover.Runtime.dll" \
  "-r:$CACHE/nunit/lib/netstandard2.0/nunit.framework.dll" "${TESTS[@]}"

echo "== Pruebas sin motor (NUnitLite)"
S="$ROOT/Assets/Scripts"; T="$ROOT/Assets/Tests/EditMode"
cat > "$OUT/Program.cs" <<'CS'
public static class Program { public static int Main(string[] a) => new NUnitLite.AutoRun(typeof(Program).Assembly).Execute(a); }
CS
$CSC -nologo -langversion:9.0 -out:"$OUT/PureTests.exe" "-r:$UNITY45/UnityEngine.CoreModule.dll" \
  "-r:$CACHE/nunit/lib/net45/nunit.framework.dll" "-r:$CACHE/nunitlite/lib/net45/nunitlite.dll" "$OUT/Program.cs" \
  "$S/Core/HitboxData.cs" "$S/Core/DamageInfo.cs" "$S/Core/StateMachine/StateMachine.cs" \
  "$S/Combat/AttackTimeline.cs" "$S/Combat/HealthModel.cs" "$S/Combat/ComboSequencer.cs" \
  "$T/AttackTimelineTests.cs" "$T/StateMachineTests.cs" "$T/HealthModelTests.cs" "$T/ComboSequencerTests.cs"
cp "$UNITY45/UnityEngine.CoreModule.dll" "$CACHE/nunit/lib/net45/nunit.framework.dll" "$CACHE/nunitlite/lib/net45/nunitlite.dll" "$OUT/"
(cd "$OUT" && mono PureTests.exe --noresult --noheader)
echo "== Todo en verde"
