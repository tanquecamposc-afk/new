#!/usr/bin/env python3
"""Genera StealAnAnomaly.rbxlx: mapa completo + todos los scripts de src/.

Uso:  python3 build_rbxlx.py
"""
import math
import os
import random
from xml.sax.saxutils import escape

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, "src")
OUT = os.path.join(ROOT, "StealAnAnomaly.rbxlx")

MATERIALS = {
    "Plastic": 256, "SmoothPlastic": 272, "Neon": 288, "Wood": 512, "WoodPlanks": 528,
    "Marble": 784, "Slate": 800, "Concrete": 816, "Granite": 832, "Brick": 848,
    "Pebble": 864, "Cobblestone": 880, "CorrodedMetal": 1040, "DiamondPlate": 1056,
    "Foil": 1072, "Metal": 1088, "Grass": 1280, "Sand": 1296, "Glass": 1568,
}
SHAPES = {"Ball": 0, "Block": 1, "Cylinder": 2}

_ref = [0]


def next_ref():
    _ref[0] += 1
    return "RBX%08X" % _ref[0]


# ---------------------------------------------------------------- matemáticas
def matmul(a, b):
    return [[sum(a[i][k] * b[k][j] for k in range(3)) for j in range(3)] for i in range(3)]


def matvec(a, v):
    return [sum(a[i][k] * v[k] for k in range(3)) for i in range(3)]


def angles(rx=0.0, ry=0.0, rz=0.0):
    cx, sx = math.cos(rx), math.sin(rx)
    cy, sy = math.cos(ry), math.sin(ry)
    cz, sz = math.cos(rz), math.sin(rz)
    mx = [[1, 0, 0], [0, cx, -sx], [0, sx, cx]]
    my = [[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]]
    mz = [[cz, -sz, 0], [sz, cz, 0], [0, 0, 1]]
    return matmul(matmul(mx, my), mz)


IDENT = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]


class CF:
    def __init__(self, x=0.0, y=0.0, z=0.0, rot=None):
        self.p = [x, y, z]
        self.r = rot or IDENT

    def __mul__(self, o):
        p = matvec(self.r, o.p)
        return CF(self.p[0] + p[0], self.p[1] + p[1], self.p[2] + p[2], matmul(self.r, o.r))


def A(rx=0.0, ry=0.0, rz=0.0):
    return CF(0, 0, 0, angles(rx, ry, rz))


UP = A(0, 0, math.pi / 2)      # cilindro vertical
FACE = A(0, math.pi / 2, 0)    # cilindro como disco hacia -Z


# ---------------------------------------------------------------- XML
def fnum(v):
    s = ("%.4f" % v).rstrip("0").rstrip(".")
    return "0" if s in ("-0", "") else s


class Item:
    def __init__(self, cls, name, parent=None):
        self.cls = cls
        self.ref = next_ref()
        self.props = [("string", "Name", name)]
        self.children = []
        if parent is not None:
            parent.children.append(self)

    def prop(self, typ, name, value):
        self.props.append((typ, name, value))
        return self

    def xml(self, out, ind=1):
        pad = "\t" * ind
        out.append('%s<Item class="%s" referent="%s">' % (pad, self.cls, self.ref))
        out.append("%s\t<Properties>" % pad)
        for typ, name, value in self.props:
            out.append(pad + "\t\t" + prop_xml(typ, name, value))
        out.append("%s\t</Properties>" % pad)
        for c in self.children:
            c.xml(out, ind + 1)
        out.append("%s</Item>" % pad)


def prop_xml(typ, name, v):
    if typ == "string":
        return '<string name="%s">%s</string>' % (name, escape(v))
    if typ == "bool":
        return '<bool name="%s">%s</bool>' % (name, "true" if v else "false")
    if typ in ("float", "int", "token", "double"):
        return '<%s name="%s">%s</%s>' % (typ, name, fnum(v) if typ != "token" and typ != "int" else int(v), typ)
    if typ == "Color3uint8":
        r, g, b = v
        return '<Color3uint8 name="%s">%d</Color3uint8>' % (name, 0xFF000000 | (r << 16) | (g << 8) | b)
    if typ == "Vector3":
        return '<Vector3 name="%s"><X>%s</X><Y>%s</Y><Z>%s</Z></Vector3>' % (name, fnum(v[0]), fnum(v[1]), fnum(v[2]))
    if typ == "CFrame":
        p, r = v.p, v.r
        return ('<CoordinateFrame name="%s"><X>%s</X><Y>%s</Y><Z>%s</Z>'
                '<R00>%s</R00><R01>%s</R01><R02>%s</R02>'
                '<R10>%s</R10><R11>%s</R11><R12>%s</R12>'
                '<R20>%s</R20><R21>%s</R21><R22>%s</R22></CoordinateFrame>') % (
            name, fnum(p[0]), fnum(p[1]), fnum(p[2]),
            fnum(r[0][0]), fnum(r[0][1]), fnum(r[0][2]),
            fnum(r[1][0]), fnum(r[1][1]), fnum(r[1][2]),
            fnum(r[2][0]), fnum(r[2][1]), fnum(r[2][2]))
    if typ == "Source":
        assert "]]>" not in v
        return '<ProtectedString name="Source"><![CDATA[%s]]></ProtectedString>' % v
    raise ValueError(typ)


def part(parent, name, size, cf, color, material="SmoothPlastic", shape="Block",
         transparency=0.0, collide=True, query=True, touch=True, shadow=True, cls="Part"):
    it = Item(cls, name, parent)
    it.prop("bool", "Anchored", True)
    it.prop("bool", "CanCollide", collide)
    it.prop("bool", "CanQuery", query)
    it.prop("bool", "CanTouch", touch)
    it.prop("bool", "CastShadow", shadow)
    it.prop("CFrame", "CFrame", cf)
    it.prop("Color3uint8", "Color3uint8", color)
    it.prop("token", "Material", MATERIALS[material])
    it.prop("float", "Transparency", transparency)
    it.prop("Vector3", "size", size)
    it.prop("token", "shape", SHAPES[shape])
    it.prop("token", "TopSurface", 0)
    it.prop("token", "BottomSurface", 0)
    return it


def invisible(parent, name, size, cf):
    return part(parent, name, size, cf, (255, 255, 255), transparency=1, collide=False,
                query=False, touch=False, shadow=False)


def model(parent, name):
    return Item("Model", name, parent)


def folder(parent, name):
    return Item("Folder", name, parent)


def darken(c, k):
    return tuple(int(x * k) for x in c)


# ---------------------------------------------------------------- mapa
def build_map(ws):
    rng = random.Random(1337)
    m = model(ws, "Map")

    part(m, "Ground", (640, 2, 360), CF(0, -1, 0), (44, 52, 46), "Grass")
    part(m, "Plaza", (490, 0.2, 76), CF(0, 0.1, 0), (68, 62, 80), "Concrete")
    for z in (-38.5, 38.5):
        part(m, "PlazaEdge", (490, 0.3, 1), CF(0, 0.15, z), (120, 70, 200), "Neon", shadow=False)

    # Cinta transportadora
    part(m, "Conveyor", (468, 1, 16), CF(0, 0.5, 0), (42, 40, 56), "DiamondPlate")
    for z in (-8.3, 8.3):
        part(m, "Rail", (468, 0.6, 0.6), CF(0, 1.3, z), (170, 90, 255), "Neon", shadow=False)
        part(m, "RailBase", (468, 1.4, 1.2), CF(0, 0.7, z * 1.04), (30, 28, 40), "Metal")
    for x in range(-224, 225, 16):
        for s in (-1, 1):
            part(m, "Chevron", (3.2, 0.12, 0.5), CF(x - 1.2, 1.03, s * 1.1) * A(0, s * math.radians(35), 0),
                 (120, 60, 200), "Neon", transparency=0.35, collide=False, query=False, shadow=False)

    invisible(m, "PathStart", (1, 1, 1), CF(-236, 1, 0))
    invisible(m, "PathEnd", (1, 1, 1), CF(236, 1, 0))

    # La Grieta
    rift = model(m, "Rift")
    rx = -248
    part(rift, "RiftCore", (1.2, 24, 24), CF(rx, 15, 0), (60, 10, 110), "Neon", "Cylinder", collide=False)
    part(rift, "RiftMid", (1.0, 17, 17), CF(rx + 0.4, 15, 0), (170, 70, 255), "Neon", "Cylinder", collide=False, transparency=0.15)
    part(rift, "RiftEye", (0.8, 8, 8), CF(rx + 0.8, 15, 0), (235, 210, 255), "Neon", "Cylinder", collide=False)
    ring = model(rift, "Ring")
    n = 32
    for i in range(n):
        a = i / n * math.tau
        part(ring, "Shard", (2.2, 3.4, 1.6), CF(rx, 15 + math.sin(a) * 13.5, math.cos(a) * 13.5) * A(-a, 0, 0),
             (190, 90, 255) if i % 2 == 0 else (60, 255, 220), "Neon", collide=False, shadow=False)
    for z in (-19, 19):
        part(rift, "Pillar", (7, 34, 7), CF(rx, 17, z), (40, 36, 52), "Slate")
        part(rift, "Rune", (7.4, 26, 0.6), CF(rx, 17, z - math.copysign(3.6, z)), (170, 70, 255), "Neon", shadow=False)
    part(rift, "Arch", (8, 6, 46), CF(rx, 35, 0), (40, 36, 52), "Slate")
    part(rift, "RiftSign", (0.6, 4, 26), CF(rx + 4.3, 35, 0), (20, 14, 30), "SmoothPlastic")
    part(rift, "Platform", (22, 1.2, 46), CF(rx + 2, 0.6, 0), (50, 46, 62), "Slate")
    for i, (w, h) in enumerate([(26, 0.6), (30, 0.3)]):
        part(rift, "Step", (w, h, 50 + i * 4), CF(rx + 2, h / 2, 0), (60, 55, 72), "Slate")

    # El Vacío (salida)
    void = model(m, "VoidExit")
    vx = 248
    part(void, "VoidCore", (1.2, 18, 18), CF(vx, 11, 0), (25, 0, 12), "Neon", "Cylinder", collide=False)
    for i in range(24):
        a = i / 24 * math.tau
        part(void, "Shard", (1.6, 2.4, 1.2), CF(vx, 11 + math.sin(a) * 10, math.cos(a) * 10) * A(-a, 0, 0),
             (255, 50, 70), "Neon", collide=False, shadow=False)
    for z in (-14, 14):
        part(void, "Pillar", (5, 24, 5), CF(vx, 12, z), (40, 36, 52), "Slate")
    part(void, "Arch", (6, 4, 34), CF(vx, 25, 0), (40, 36, 52), "Slate")
    part(void, "VoidSign", (0.6, 3.4, 20), CF(vx - 3.3, 25, 0), (20, 14, 30), "SmoothPlastic")

    # Farolas
    lamps = model(m, "Lamps")
    for x in range(-200, 201, 40):
        for z in (-13, 13):
            s = 1 if z > 0 else -1
            part(lamps, "LampBase", (1.8, 0.8, 1.8), CF(x, 0.6, z), (35, 33, 45), "Metal")
            part(lamps, "LampPole", (11, 0.6, 0.6), CF(x, 6, z) * UP, (35, 33, 45), "Metal", "Cylinder")
            part(lamps, "LampArm", (0.4, 0.4, 3.4), CF(x, 11.3, z - s * 1.5), (35, 33, 45), "Metal")
            part(lamps, "LampShade", (2, 0.5, 2), CF(x, 11.4, z - s * 3), (35, 33, 45), "Metal")
            part(lamps, "LampBulb", (1.3, 1.3, 1.3), CF(x, 10.7, z - s * 3), (255, 205, 140), "Neon", "Ball",
                 collide=False, shadow=False)

    # Torres con pantalla del temporizador
    for zc, yaw in ((52, 0.0), (-52, math.pi)):
        t = model(m, "MonitorTower")
        base = CF(0, 0, zc, angles(0, yaw, 0))
        for x in (-6, 6):
            part(t, "Leg", (1.6, 26, 1.6), base * CF(x, 13, 1), (35, 33, 45), "Metal")
        part(t, "Frame", (17, 11, 1.4), base * CF(0, 24, 0), (30, 28, 40), "Metal")
        part(t, "TimerScreen", (15.6, 9.6, 0.3), base * CF(0, 24, -0.8), (15, 10, 25), "SmoothPlastic", shadow=False)
        part(t, "FrameGlow", (17.4, 0.4, 1.6), base * CF(0, 29.6, 0), (255, 60, 90), "Neon", shadow=False)

    # Valla perimetral
    fence = model(m, "Fence")
    for z in (-168, 168):
        part(fence, "Wall", (620, 14, 2), CF(0, 7, z), (36, 34, 46), "Metal")
        part(fence, "WallGlow", (620, 0.5, 2.4), CF(0, 14.2, z), (255, 50, 70), "Neon", shadow=False)
    for x in (-308, 308):
        part(fence, "Wall", (2, 14, 336), CF(x, 7, 0), (36, 34, 46), "Metal")
        part(fence, "WallGlow", (2.4, 0.5, 336), CF(x, 14.2, 0), (255, 50, 70), "Neon", shadow=False)

    # Árboles muertos y rocas
    deco = model(m, "Decoration")
    spots = []
    while len(spots) < 70:
        x = rng.uniform(-300, 300)
        z = rng.uniform(-162, 162)
        if abs(z) < 108 and abs(x) < 268:
            continue
        if abs(x) > 230 and abs(z) < 40:
            continue
        spots.append((x, z))
    for i, (x, z) in enumerate(spots):
        if i % 4 == 3:
            r = rng.uniform(4, 8)
            part(deco, "Rock", (r, r, r), CF(x, r * 0.25, z), (70, 66, 78), "Slate", "Ball")
            continue
        h = rng.uniform(10, 18)
        part(deco, "Trunk", (h, 1.6, 1.6), CF(x, h / 2, z) * UP, (48, 38, 36), "Wood", "Cylinder")
        for _ in range(3):
            ay = rng.uniform(0, math.tau)
            tilt = rng.uniform(0.5, 1.0)
            ln = rng.uniform(3.5, 6)
            part(deco, "Branch", (0.55, ln, 0.55),
                 CF(x, h * rng.uniform(0.65, 0.95), z) * A(0, ay, 0) * A(0, 0, tilt) * CF(0, ln / 2, 0),
                 (48, 38, 36), "Wood")

    # Cajas de contención junto a la plaza
    for x in (-110, 0, 110):
        for z in (-30, 30):
            part(deco, "Crate", (5, 5, 5), CF(x + 2, 2.6, z) * A(0, rng.uniform(-0.4, 0.4), 0), (90, 80, 60), "WoodPlanks")
            part(deco, "CrateStripe", (5.1, 0.6, 5.1), CF(x + 2, 3.6, z), (255, 200, 40), "SmoothPlastic", collide=False)

    return m


BASE_COLORS = [
    (255, 80, 120), (80, 170, 255), (120, 255, 140), (255, 200, 60),
    (200, 110, 255), (255, 140, 60), (60, 230, 220), (255, 110, 220),
]


def build_base(parent, index, cx, cz, yaw):
    color = BASE_COLORS[index - 1]
    b = model(parent, "Base%d" % index)
    O = CF(cx, 0, cz, angles(0, yaw, 0))

    def P(name, size, local, col, mat="SmoothPlastic", shape="Block", **kw):
        return part(b, name, size, O * local, col, mat, shape, **kw)

    wall = (55, 52, 66)
    P("Floor", (80, 1, 60), CF(0, 0.5, 0), (60, 56, 72), "Concrete")
    P("Carpet", (66, 0.1, 30), CF(0, 1.05, 11), darken(color, 0.35), "SmoothPlastic")
    for z in (-29.7, 29.7):
        P("Trim", (80, 0.15, 0.6), CF(0, 1.05, z), color, "Neon", collide=False, shadow=False)
    for x in (-39.7, 39.7):
        P("Trim", (0.6, 0.15, 60), CF(x, 1.05, 0), color, "Neon", collide=False, shadow=False)

    P("WallBack", (80, 14, 2), CF(0, 8, 29), wall, "Metal")
    for x in (-39, 39):
        P("WallSide", (2, 14, 60), CF(x, 8, 0), wall, "Metal")
    for x in (-26, 26):
        P("WallFront", (28, 14, 2), CF(x, 8, -29), wall, "Metal")
    P("Lintel", (24, 4, 2), CF(0, 13, -29), wall, "Metal")
    P("WallGlow", (80, 0.5, 2.4), CF(0, 15.25, 29), color, "Neon", shadow=False)
    for x in (-39, 39):
        P("WallGlow", (2.4, 0.5, 60), CF(x, 15.25, 0), color, "Neon", shadow=False)
    for x in (-26, 26):
        P("WallGlow", (28, 0.5, 2.4), CF(x, 15.25, -29), color, "Neon", shadow=False)
    P("WallGlow", (24, 0.5, 2.4), CF(0, 15.25, -29), color, "Neon", shadow=False)
    for x in (-12.6, 12.6):
        P("DoorFrame", (1.4, 11, 2.8), CF(x, 6.5, -29), (255, 200, 40), "SmoothPlastic")
    P("Sign", (22, 3.4, 0.4), CF(0, 13, -30.2), (20, 15, 30), "SmoothPlastic")

    laser = model(b, "Laser")
    for i in range(5):
        part(laser, "LaserBar", (24, 0.35, 0.35), O * CF(0, 2 + i * 2, -29), (255, 40, 60), "Neon",
             transparency=1, collide=False, query=False, shadow=False)

    P("LockPedestal", (3, 2.4, 3), CF(-30, 2.2, -22), (40, 38, 52), "Metal")
    P("LockButton", (2.4, 0.6, 2.4), CF(-30, 3.7, -22), (60, 255, 130), "Neon")
    P("CollectorFrame", (10.4, 0.3, 10.4), CF(28, 1.1, -20), (40, 38, 52), "Metal")
    P("Collector", (9, 0.4, 9), CF(28, 1.3, -20), (60, 255, 130), "Neon")
    P("SpawnPad", (8, 0.3, 8), CF(0, 1.15, -16), color, "SmoothPlastic")

    part(b, "Zone", (80, 30, 60), O * CF(0, 15, 0), (255, 255, 255), transparency=1, collide=False,
         query=False, touch=False, shadow=False)
    part(b, "DoorPoint", (1, 1, 1), O * CF(0, 1, -36), (255, 255, 255), transparency=1, collide=False,
         query=False, touch=False, shadow=False)

    pods = folder(b, "Pods")
    positions = [(x, 4) for x in (-28, -14, 0, 14, 28)] + [(x, 18) for x in (-28, -14, 0, 14, 28)]
    for i, (x, z) in enumerate(positions, start=1):
        pm = model(pods, "Pod%d" % i)
        part(pm, "Base", (1, 9, 9), O * CF(x, 1.5, z) * UP, (70, 70, 86), "Metal", "Cylinder")
        part(pm, "Ring", (0.3, 9.4, 9.4), O * CF(x, 2.1, z) * UP, (120, 200, 255), "Neon", "Cylinder", collide=False, shadow=False)
        part(pm, "Glass", (11, 8, 8), O * CF(x, 7.5, z) * UP, (150, 210, 255), "Glass", "Cylinder",
             transparency=0.75, collide=False, query=False, shadow=False)
        part(pm, "CapRing", (0.3, 9.4, 9.4), O * CF(x, 12.9, z) * UP, color, "Neon", "Cylinder", collide=False, shadow=False)
        part(pm, "Cap", (1, 9, 9), O * CF(x, 13.5, z) * UP, (70, 70, 86), "Metal", "Cylinder")
        part(pm, "Anchor", (1, 0.2, 1), O * CF(x, 2.1, z), (255, 255, 255), transparency=1, collide=False,
             query=False, touch=False, shadow=False)
    return b


def build_workspace(root):
    ws = Item("Workspace", "Workspace")
    ws.prop("bool", "StreamingEnabled", False)
    ws.prop("float", "FallenPartsDestroyHeight", -500)
    root.append(ws)
    build_map(ws)
    bases = folder(ws, "Bases")
    xs = (-165, -55, 55, 165)
    for i, x in enumerate(xs):
        build_base(bases, i + 1, x, 70, 0.0)
    for i, x in enumerate(xs):
        build_base(bases, i + 5, x, -70, math.pi)
    folder(ws, "Anomalies")
    sp = part(ws, "SpawnLocation", (10, 1, 10), CF(0, 0.7, -24), (170, 90, 255), "Neon",
              transparency=0.4, cls="SpawnLocation")
    sp.prop("bool", "Neutral", True)
    sp.prop("bool", "AllowTeamChangeOnTouch", False)
    sp.prop("int", "Duration", 0)
    return ws


# ---------------------------------------------------------------- scripts
def read(rel):
    with open(os.path.join(SRC, rel), encoding="utf-8") as f:
        return f.read()


def script(parent, cls, name, rel):
    it = Item(cls, name, parent)
    it.prop("Source", "Source", read(rel))
    if cls != "ModuleScript":
        it.prop("bool", "Disabled", False)
    return it


def build():
    roots = []
    build_workspace(roots)

    lighting = Item("Lighting", "Lighting")
    lighting.prop("token", "Technology", 4)  # Future
    lighting.prop("float", "ClockTime", 17.4)
    lighting.prop("bool", "GlobalShadows", True)
    roots.append(lighting)

    rs = Item("ReplicatedStorage", "ReplicatedStorage")
    shared = folder(rs, "Shared")
    for name in ("Config", "AnomalyData", "Util", "AnomalyBuilder"):
        script(shared, "ModuleScript", name, "ReplicatedStorage/Shared/%s.lua" % name)
    roots.append(rs)

    sss = Item("ServerScriptService", "ServerScriptService")
    script(sss, "Script", "Main", "ServerScriptService/Main.server.lua")
    mods = folder(sss, "Modules")
    for name in ("Data", "Anoms", "Bases", "Progression", "Rift", "Steal", "Cycle"):
        script(mods, "ModuleScript", name, "ServerScriptService/Modules/%s.lua" % name)
    roots.append(sss)

    sp = Item("StarterPlayer", "StarterPlayer")
    sp.prop("float", "CharacterWalkSpeed", 20)
    sp.prop("float", "CharacterJumpPower", 50)
    sps = Item("StarterPlayerScripts", "StarterPlayerScripts", sp)
    script(sps, "LocalScript", "ClientMain", "StarterPlayerScripts/ClientMain.client.lua")
    script(sps, "LocalScript", "AnomalyAnimator", "StarterPlayerScripts/AnomalyAnimator.client.lua")
    roots.append(sp)

    out = ['<roblox xmlns:xmime="http://www.w3.org/2005/05/xmlmime" '
           'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" '
           'xsi:noNamespaceSchemaLocation="http://www.roblox.com/roblox.xsd" version="4">',
           "\t<External>null</External>", "\t<External>nil</External>"]
    for r in roots:
        r.xml(out, 1)
    out.append("</roblox>")
    with open(OUT, "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(out) + "\n")
    print("Escrito", OUT, "-", _ref[0], "instancias")


if __name__ == "__main__":
    build()
