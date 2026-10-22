#!/usr/bin/env python3
"""Cross-module integrity checks that a compiler cannot do:
  1. require(...) paths built from script.Parent / Shared / Config resolve to real modules
  2. Registry.get("Service").fn / aliases call functions the service actually defines
  3. Net.event/func names exist in Net.luau
  4. every Request kind the client sends has a server handler (and vice versa)
  5. every Effect the server broadcasts has a client handler
  6. every CombatFeedback kind sent is handled
Usage: python3 tools/integrity_check.py src
"""
import os, re, sys

root = sys.argv[1]
files = {}
for d, _, fs in os.walk(root):
    for f in fs:
        if f.endswith(".luau"):
            files[os.path.join(d, f)] = open(os.path.join(d, f)).read()

errors = []
SHARED = os.path.join(root, "ReplicatedStorage", "Shared")

def module_path(base_dir, parts):
    path = base_dir
    for p in parts:
        path = os.path.join(path, p)
    for ext in (".luau", ".server.luau", ".client.luau"):
        if os.path.isfile(path + ext):
            return path + ext
    if os.path.isdir(path):
        return path
    return None

def strip_name(fname):
    base = os.path.basename(fname)
    for ext in (".server.luau", ".client.luau", ".luau"):
        if base.endswith(ext):
            return base[: -len(ext)]
    return base

# 1. requires
for path, src in files.items():
    aliases = {"Shared": SHARED}
    if re.search(r"local Config = Shared\.Config", src):
        aliases["Config"] = os.path.join(SHARED, "Config")
    m = re.search(r"local Views = script\.Parent\.Parent\.UI\.Views", src)
    for alias_def in re.finditer(r"local (\w+) = (script(?:\.Parent)*(?:\.\w+)*)\s*$", src, re.M):
        name, chain = alias_def.group(1), alias_def.group(2)
        segs = chain.split(".")[1:]
        here = os.path.dirname(path)
        ok = True
        for s in segs:
            if s == "Parent":
                if segs.index(s) == 0 or True:
                    pass
        # resolve: script = this module; script.Parent = its directory
        cur = os.path.dirname(path)
        for i, s in enumerate(segs):
            if s == "Parent":
                if i == 0:
                    continue
                cur = os.path.dirname(cur)
            else:
                cur = os.path.join(cur, s)
        aliases[name] = cur
    for rm in re.finditer(r"require\(([\w.]+)\)", src):
        expr = rm.group(1)
        segs = expr.split(".")
        if segs[0] == "script":
            cur = os.path.dirname(path)
            rest = segs[1:]
            if not rest or rest[0] != "Parent":
                errors.append(f"{path}: require of child of script not supported: {expr}")
                continue
            rest = rest[1:]
            while rest and rest[0] == "Parent":
                cur = os.path.dirname(cur)
                rest = rest[1:]
            target = module_path(cur, rest)
        elif segs[0] in aliases:
            target = module_path(aliases[segs[0]], segs[1:])
        else:
            continue  # dynamic (e.g. require(module)) — skipped
        if not target or os.path.isdir(target):
            errors.append(f"{path}: require({expr}) does not resolve")

# 2. Registry calls
services_dir = os.path.join(root, "ServerScriptService", "Services")
defined = {}
for f in os.listdir(services_dir):
    name = strip_name(f)
    src = files[os.path.join(services_dir, f)]
    defined[name] = set(re.findall(r"function " + name + r"\.(\w+)", src)) | set(re.findall(r"^" + name + r"\.(\w+)\s*=", src, re.M))
for path, src in files.items():
    for m in re.finditer(r'Registry\.get\("(\w+)"\)\.(\w+)', src):
        svc, fn = m.groups()
        if svc not in defined:
            errors.append(f"{path}: unknown service {svc}")
        elif fn not in defined[svc]:
            errors.append(f"{path}: {svc}.{fn} is not defined")
    for m in re.finditer(r'local (\w+) = Registry\.get\("(\w+)"\)\s*$', src, re.M):
        alias, svc = m.groups()
        for c in re.finditer(r"(?<![.\w])" + alias + r"\.(\w+)", src):
            fn = c.group(1)
            if svc in defined and fn not in defined[svc]:
                errors.append(f"{path}: {svc}.{fn} (via {alias}) is not defined")

# 3. Net names
net = files[os.path.join(SHARED, "Net.luau")]
events = set(re.findall(r'^\t"(\w+)",', net, re.M))
for path, src in files.items():
    for m in re.finditer(r'Net\.(?:event|func)\("(\w+)"\)', src):
        if m.group(1) not in events:
            errors.append(f"{path}: unknown remote {m.group(1)}")
    for m in re.finditer(r'Net\.fireAllExcept\("(\w+)"', src):
        if m.group(1) not in events:
            errors.append(f"{path}: unknown remote {m.group(1)}")

# 4. Request kinds
server_kinds = set()
client_kinds = set()
for path, src in files.items():
    server_kinds |= set(re.findall(r'\.on\("(\w+)",\s*"\w+"', src))
    client_kinds |= set(re.findall(r'ClientState\.request\("(\w+)"', src))
for k in sorted(client_kinds - server_kinds):
    errors.append(f"client sends request '{k}' but no server handler exists")
dev_only = {"DevStartEvent"}
for k in sorted(server_kinds - client_kinds - dev_only):
    print(f"note: server handler '{k}' is not used by the UI")

# 5. Effects
fx_src = files[os.path.join(root, "StarterPlayer", "StarterPlayerScripts", "Controllers", "EffectsController.luau")]
handled = set(re.findall(r"^handlers\.(\w+) =", fx_src, re.M))
for path, src in files.items():
    for m in re.finditer(r'Net\.event\("Effect"\):Fire(?:AllClients|Client)\((?:\w+,\s*)?"(\w+)"', src):
        if m.group(1) not in handled:
            errors.append(f"{path}: effect '{m.group(1)}' has no client handler")
    for m in re.finditer(r'Net\.fireAllExcept\("Effect",\s*\w+,\s*"(\w+)"', src):
        if m.group(1) not in handled:
            errors.append(f"{path}: effect '{m.group(1)}' has no client handler")

# 6. CombatFeedback
cc = files[os.path.join(root, "StarterPlayer", "StarterPlayerScripts", "Controllers", "CombatController.luau")]
fb_handled = set(re.findall(r'kind == "(\w+)"', cc))
for path, src in files.items():
    for m in re.finditer(r'feedback\(\w+,\s*"(\w+)"', src):
        if m.group(1) not in fb_handled:
            errors.append(f"{path}: CombatFeedback '{m.group(1)}' not handled on client")
    for m in re.finditer(r'Net\.event\("CombatFeedback"\):FireClient\(\w+,\s*"(\w+)"', src):
        if m.group(1) not in fb_handled:
            errors.append(f"{path}: CombatFeedback '{m.group(1)}' not handled on client")

for e in sorted(set(errors)):
    print("ERROR", e)
print(f"integrity_check: {len(set(errors))} problems")
sys.exit(1 if errors else 0)
