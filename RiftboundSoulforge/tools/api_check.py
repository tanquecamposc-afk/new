#!/usr/bin/env python3
"""Static Roblox API cross-check against a Roblox API dump (API-Dump.json).

Checks:
  * every Enum.<Type>.<Item> used in the source exists
  * every Instance.new("Class") / Kit.new("Class", ...) names a creatable class
  * for `local x = Instance.new("Class")`, every `x.Prop = ...` names a real member
    (properties, including inherited ones)
  * for `Kit.new("Class", { Prop = ... })`, every key is a real property

Usage: python3 tools/api_check.py <API-Dump.json> <src dir>
Get the dump: https://raw.githubusercontent.com/MaximumADHD/Roblox-Client-Tracker/roblox/API-Dump.json
"""
import json, os, re, sys

dump = json.load(open(sys.argv[1]))
root = sys.argv[2]
classes = {c["Name"]: c for c in dump["Classes"]}
enums = {e["Name"]: {i["Name"] for i in e["Items"]} for e in dump["Enums"]}

def members(cls):
    out = set()
    while cls and cls in classes:
        c = classes[cls]
        for m in c["Members"]:
            out.add(m["Name"])
        cls = c.get("Superclass")
    return out

def creatable(cls):
    c = classes.get(cls)
    if not c:
        return False
    tags = c.get("Tags") or []
    return "NotCreatable" not in tags and "Service" not in tags

errors = []
for dirpath, _, files in os.walk(root):
    for f in files:
        if not f.endswith(".luau"):
            continue
        path = os.path.join(dirpath, f)
        src = open(path).read()
        for m in re.finditer(r"Enum\.(\w+)\.(\w+)", src):
            t, item = m.group(1), m.group(2)
            if t not in enums:
                errors.append(f"{path}: unknown enum type Enum.{t}")
            elif item not in enums[t] and item not in ("Value", "Name"):
                errors.append(f"{path}: unknown enum item Enum.{t}.{item}")
        for m in re.finditer(r'(?:Instance\.new|Kit\.new)\("(\w+)"', src):
            if not creatable(m.group(1)):
                errors.append(f"{path}: not a creatable class {m.group(1)}")
        # local x = Instance.new("Class") ... x.Prop =
        for m in re.finditer(r'local (\w+)(?:\s*:\s*[\w?]+)?\s*=\s*Instance\.new\("(\w+)"\)', src):
            var, cls = m.group(1), m.group(2)
            known = members(cls)
            rest = src[m.end():]
            redefined = re.search(r"\blocal " + re.escape(var) + r"\b", rest)
            scope = rest[: redefined.start()] if redefined else rest
            for pm in re.finditer(r"\b" + re.escape(var) + r"\.(\w+)\s*=[^=]", scope):
                prop = pm.group(1)
                if prop not in known:
                    errors.append(f"{path}: {cls} has no member '{prop}' (via {var})")
        # Kit.new("Class", { Key = ... })
        for m in re.finditer(r'Kit\.new\("(\w+)",\s*\{', src):
            cls = m.group(1)
            known = members(cls) | {"Parent"}
            depth, i = 1, m.end()
            body_start = i
            while depth and i < len(src):
                if src[i] == "{":
                    depth += 1
                elif src[i] == "}":
                    depth -= 1
                i += 1
            body = src[body_start:i - 1]
            # only top-level keys
            level, keys, token = 0, [], ""
            for km in re.finditer(r"[{}]|\b(\w+)\s*=(?!=)", body):
                if km.group(0) == "{":
                    level += 1
                elif km.group(0) == "}":
                    level -= 1
                elif level == 0:
                    keys.append(km.group(1))
            for k in keys:
                if k not in known:
                    errors.append(f"{path}: {cls} has no property '{k}' (Kit.new)")

for e in sorted(set(errors)):
    print(e)
print(f"api_check: {len(set(errors))} problems")
sys.exit(1 if errors else 0)
