"""Builds the original VELOCITY ARENA fleet in Blender and exports each car.

    blender -b -P tools/blender/build_fleet.py -- <out_dir>

Three original designs, one per hitbox family:
  velocity_x  - balanced sports coupe          (balanced family)
  bastion     - tall, squared off-road brawler (tall family)
  lancer      - long, low wedge hypercar       (long-low family)

Each export contains "Body" (all static parts, modifiers applied) and
"Wheel" (one wheel incl. brake disc + caliper; the game spins and steers it).
Materials are named so the game can re-tint them per team:
  Paint (primary), Accent (secondary / decals), Trim, Carbon, Glass, Chrome,
  LightFront, LightRear, LED, Glow (rocket booster core), Tire, Rim, Brake.
Car space matches the game: forward = -Z, up = +Y, origin at the
suspension-anchor height.
"""
import math
import os
import sys

import bpy
import bmesh

OUT_DIR = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "."


def G(x, y, z):
    return (x, -z, y)  # game (x up=y back=z) -> Blender (z-up); exporter maps back.


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def mat(name, color, metallic=0.0, rough=0.5, emission=None, strength=0.0, alpha=1.0, coat=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1.0)
    b.inputs["Metallic"].default_value = metallic
    b.inputs["Roughness"].default_value = rough
    if "Coat Weight" in b.inputs:
        b.inputs["Coat Weight"].default_value = coat
    if emission:
        b.inputs["Emission Color"].default_value = (*emission, 1.0)
        b.inputs["Emission Strength"].default_value = strength
    if alpha < 1.0:
        b.inputs["Alpha"].default_value = alpha
        m.blend_method = "BLEND"
    return m


def materials():
    return {
        "Paint": mat("Paint", (0.05, 0.25, 0.9), 0.6, 0.25, coat=1.0),
        "Accent": mat("Accent", (0.92, 0.94, 0.98), 0.3, 0.3),
        "Trim": mat("Trim", (0.02, 0.02, 0.025), 0.2, 0.45),
        "Carbon": mat("Carbon", (0.03, 0.032, 0.036), 0.5, 0.3),
        "Glass": mat("Glass", (0.01, 0.015, 0.03), 0.9, 0.05, alpha=0.85),
        "Chrome": mat("Chrome", (0.85, 0.85, 0.88), 1.0, 0.1),
        "LightFront": mat("LightFront", (1, 1, 1), 0, 0.2, (0.85, 0.93, 1.0), 6.0),
        "LightRear": mat("LightRear", (1, 0.1, 0.1), 0, 0.3, (1.0, 0.05, 0.05), 5.0),
        "LED": mat("LED", (0.3, 0.7, 1), 0, 0.3, (0.2, 0.6, 1.0), 4.0),
        "Glow": mat("Glow", (1, 0.7, 0.3), 0, 0.3, (1.0, 0.6, 0.2), 8.0),
        "Tire": mat("Tire", (0.025, 0.025, 0.028), 0.0, 0.82),
        "Rim": mat("Rim", (0.62, 0.64, 0.68), 1.0, 0.16),
        "Brake": mat("Brake", (0.25, 0.25, 0.27), 0.9, 0.35),
    }


def link(name, mesh):
    o = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(o)
    return o


def loft(name, sections, ring, exponent, material, levels=3, flat_bottom=0.8):
    bm = bmesh.new()
    rings = []
    for (z, hw, y0, y1) in sections:
        cy, hh = (y0 + y1) / 2, (y1 - y0) / 2
        vs = []
        for k in range(ring):
            a = 2 * math.pi * k / ring
            ca, sa = math.cos(a), math.sin(a)
            x = math.copysign(abs(ca) ** (2 / exponent), ca) * hw
            y = math.copysign(abs(sa) ** (2 / exponent), sa) * hh
            if y < 0:
                y *= flat_bottom
            vs.append(bm.verts.new(G(x, cy + y, z)))
        rings.append(vs)
    for r in range(len(rings) - 1):
        a, b = rings[r], rings[r + 1]
        for k in range(ring):
            k2 = (k + 1) % ring
            bm.faces.new((a[k], a[k2], b[k2], b[k]))
    bm.faces.new(list(reversed(rings[0])))
    bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = link(name, me)
    o.data.materials.append(material)
    s = o.modifiers.new("sub", "SUBSURF")
    s.levels = levels
    s.render_levels = levels
    for p in o.data.polygons:
        p.use_smooth = True
    return o


def box(name, center, size, material, bevel=0.01, rot=(0, 0, 0)):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co.x *= size[0]
        v.co.y *= size[2]
        v.co.z *= size[1]
    bm.to_mesh(me)
    bm.free()
    o = link(name, me)
    o.location = G(*center)
    o.rotation_euler = (math.radians(rot[0]), math.radians(rot[2]), math.radians(rot[1]))
    o.data.materials.append(material)
    if bevel > 0:
        bv = o.modifiers.new("bevel", "BEVEL")
        bv.width = bevel
        bv.segments = 3
        bv.limit_method = "ANGLE"
    return o


def cyl(name, center, radius, depth, material, axis="z", verts=24, bevel=0.0):
    rot = {"x": (0, math.radians(90), 0), "z": (math.radians(90), 0, 0), "y": (0, 0, 0)}[axis]
    bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=depth, vertices=verts, location=G(*center), rotation=rot)
    o = bpy.context.active_object
    o.name = name
    o.data.materials.append(material)
    if bevel > 0:
        b = o.modifiers.new("bevel", "BEVEL")
        b.width = bevel
        b.segments = 2
    return o


def flare(name, wx, wz, r_in, r_out, width, y0, material, a0=-20, a1=200):
    bm = bmesh.new()
    rows = []
    side = 1 if wx > 0 else -1
    steps = 12
    for k in range(steps + 1):
        a = math.radians(a0 + (a1 - a0) * k / steps)
        pts = []
        for (r, xo) in ((r_in, -width / 2), (r_out, -width / 2), (r_out, width / 2), (r_in, width / 2)):
            pts.append(bm.verts.new(G(wx + side * xo, y0 + math.sin(a) * r, wz + math.cos(a) * r)))
        rows.append(pts)
    for k in range(steps):
        a, b = rows[k], rows[k + 1]
        for j in range(4):
            j2 = (j + 1) % 4
            bm.faces.new((a[j], a[j2], b[j2], b[j]))
    bm.faces.new(list(reversed(rows[0])))
    bm.faces.new(rows[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = link(name, me)
    o.data.materials.append(material)
    s = o.modifiers.new("sub", "SUBSURF")
    s.levels = 2
    for p in o.data.polygons:
        p.use_smooth = True
    return o


def finish_body():
    for o in bpy.data.objects:
        o.select_set(True)
        bpy.context.view_layer.objects.active = o
    bpy.ops.object.convert(target="MESH")
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bpy.ops.object.join()
    body = bpy.context.active_object
    body.name = "Body"
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bpy.ops.object.shade_smooth()
    return body


def build_wheel(M, R, width, spokes):
    """One wheel at the origin, axis along X, outer face toward +X."""
    bpy.ops.object.select_all(action="DESELECT")
    parts = []
    bpy.ops.mesh.primitive_cylinder_add(radius=R, depth=width, vertices=48, rotation=(0, math.radians(90), 0))
    tire = bpy.context.active_object
    tire.data.materials.append(M["Tire"])
    bv = tire.modifiers.new("bevel", "BEVEL")
    bv.width = width * 0.24
    bv.segments = 5
    parts.append(tire)
    # Tread grooves.
    for xo in (-width * 0.18, width * 0.18):
        bpy.ops.mesh.primitive_torus_add(major_radius=R + 0.001, minor_radius=0.006, major_segments=48, minor_segments=6,
                                         location=(xo, 0, 0), rotation=(0, math.radians(90), 0))
        g = bpy.context.active_object
        g.data.materials.append(M["Trim"])
        parts.append(g)
    # Rim barrel, lip, spokes, hub, brake disc and caliper.
    bpy.ops.mesh.primitive_cylinder_add(radius=R * 0.68, depth=width * 0.86, vertices=40, rotation=(0, math.radians(90), 0))
    barrel = bpy.context.active_object
    barrel.data.materials.append(M["Trim"])
    parts.append(barrel)
    bpy.ops.mesh.primitive_torus_add(major_radius=R * 0.66, minor_radius=0.011, major_segments=40, minor_segments=8,
                                     location=(width * 0.45, 0, 0), rotation=(0, math.radians(90), 0))
    lip = bpy.context.active_object
    lip.data.materials.append(M["Rim"])
    parts.append(lip)
    bpy.ops.mesh.primitive_cylinder_add(radius=R * 0.5, depth=0.012, vertices=36, location=(-0.005, 0, 0), rotation=(0, math.radians(90), 0))
    disc = bpy.context.active_object
    disc.data.materials.append(M["Brake"])
    parts.append(disc)
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0.0, R * 0.38, R * 0.18))
    cal = bpy.context.active_object
    cal.scale = (0.04, R * 0.22, R * 0.3)
    cal.data.materials.append(M["Accent"])
    parts.append(cal)
    for k in range(spokes):
        a = 2 * math.pi * k / spokes
        bpy.ops.mesh.primitive_cube_add(size=1, location=(width * 0.42, math.cos(a) * R * 0.33, math.sin(a) * R * 0.33), rotation=(a, 0, 0))
        sp = bpy.context.active_object
        sp.scale = (0.018, R * 0.6, 0.026 if spokes > 6 else 0.034)
        sp.data.materials.append(M["Rim"])
        b2 = sp.modifiers.new("bevel", "BEVEL")
        b2.width = 0.004
        b2.segments = 2
        parts.append(sp)
    bpy.ops.mesh.primitive_cylinder_add(radius=R * 0.16, depth=0.03, vertices=24, location=(width * 0.48, 0, 0), rotation=(0, math.radians(90), 0))
    cap = bpy.context.active_object
    cap.data.materials.append(M["LED"])
    parts.append(cap)
    bpy.ops.object.select_all(action="DESELECT")
    for p in parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = tire
    bpy.ops.object.convert(target="MESH")
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bpy.ops.object.join()
    w = bpy.context.active_object
    w.name = "Wheel"
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bpy.ops.object.shade_smooth()
    return w


# ---------------------------------------------------------------- sporty body loft
def loft2(name, sections, materials_list, creases=(1.0, 0.7, 0.5), roof_split=None, levels=3):
    """Loft of creased cross-sections: (z, half_width, y_bottom, y_top, deck_ratio).

    Ring (right half, bottom to top): bottom edge, rocker, shoulder crease, deck edge,
    top centre; mirrored for the left. Edge creases keep sharp character lines under
    subdivision, which reads far more aggressive than a superellipse blob."""
    bm = bmesh.new()
    rings = []
    for (z, hw, y0, y1, sh) in sections:
        h = y1 - y0
        half = [(hw * 0.80, y0), (hw * 0.97, y0 + 0.22 * h), (hw, y0 + 0.60 * h), (hw * sh, y1 - 0.02 * h)]
        pts = [(0.0, y0)] + half + [(0.0, y1)] + [(-x, y) for (x, y) in reversed(half)]
        rings.append([bm.verts.new(G(x, y, z)) for (x, y) in pts])
    n = len(rings[0])
    try:
        cl = bm.edges.layers.float.get("crease_edge") or bm.edges.layers.float.new("crease_edge")
    except Exception:
        cl = None
    crease_of = {3: creases[0], 8: creases[0], 4: creases[1], 7: creases[1], 1: creases[2], 9: creases[2]}
    roof_faces = []
    for r in range(len(rings) - 1):
        a, b = rings[r], rings[r + 1]
        for k in range(n):
            k2 = (k + 1) % n
            f = bm.faces.new((a[k], a[k2], b[k2], b[k]))
            # Top band (deck edge -> centre -> deck edge), skipping windscreen and rear window rows.
            if k in (4, 5) and 2 <= r <= len(rings) - 3:
                roof_faces.append(f)
        if cl is not None:
            for k, c in crease_of.items():
                e = bm.edges.get((a[k], b[k]))
                if e:
                    e[cl] = c
    bm.faces.new(list(reversed(rings[0])))
    bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    if roof_split is not None:
        for f in bm.faces:
            f.material_index = 0
        for f in roof_faces:
            f.material_index = 1
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = link(name, me)
    for m in materials_list:
        o.data.materials.append(m)
    s = o.modifiers.new("sub", "SUBSURF")
    s.levels = levels
    s.render_levels = levels
    for p in o.data.polygons:
        p.use_smooth = True
    return o


def cut_wells(shell, d, M):
    """Boolean-cut a wheel well per wheel so tyres sit inside real arches."""
    R = d["R"]
    yc = -0.155 + R
    cutters = []
    for (wx, wz) in d["wheels"]:
        for sx in (-1, 1):
            bpy.ops.mesh.primitive_cylinder_add(radius=R + 0.025, depth=0.42, vertices=48,
                                                location=G(sx * (wx + 0.12), yc, wz), rotation=(0, math.radians(90), 0))
            c = bpy.context.active_object
            c.data.materials.append(M["Carbon"])
            cutters.append(c)
    bpy.ops.object.select_all(action="DESELECT")
    for c in cutters:
        c.select_set(True)
    bpy.context.view_layer.objects.active = cutters[0]
    bpy.ops.object.join()
    cutter = bpy.context.active_object
    bpy.ops.object.select_all(action="DESELECT")
    shell.select_set(True)
    bpy.context.view_layer.objects.active = shell
    bpy.ops.object.convert(target="MESH")  # bake the subdivision before cutting
    mod = shell.modifiers.new("wells", "BOOLEAN")
    mod.operation = "DIFFERENCE"
    mod.solver = "EXACT"
    mod.object = cutter
    try:
        mod.material_mode = "TRANSFER"
    except Exception:
        pass
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(cutter, do_unlink=True)


# ---------------------------------------------------------------- continuous car shell
def crom(points, z):
    """Catmull-Rom through (z, value) control points, clamped at the ends."""
    pts = sorted(points)
    if z <= pts[0][0]:
        return pts[0][1]
    if z >= pts[-1][0]:
        return pts[-1][1]
    for i in range(len(pts) - 1):
        z0, z1 = pts[i][0], pts[i + 1][0]
        if z0 <= z <= z1:
            t = (z - z0) / (z1 - z0)
            p0 = pts[max(i - 1, 0)][1]; p1 = pts[i][1]; p2 = pts[i + 1][1]; p3 = pts[min(i + 2, len(pts) - 1)][1]
            return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3)
    return pts[-1][1]


def smooth01(a, b, x):
    t = min(1.0, max(0.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


class Profile:
    """Side/plan curves of one car. All heights are relative to the car origin (ground is about -0.155)."""

    def __init__(self, d):
        self.d = d
        self.cab0, self.cab1 = d["cabin"]

    def w(self, z):  # body half-width at the widest line, with fender bulges over each axle
        b = crom(self.d["w"], z)
        for (_, wz) in self.d["wheels"]:
            b += self.d["bulge"] * math.exp(-((z - wz) / 0.19) ** 2)
        return b

    def yb(self, z):
        return crom(self.d["yb"], z)

    def belt(self, z):
        # Fenders rise above each wheel (wheel top + clearance), so the hood dips between them.
        b = crom(self.d["belt"], z)
        target = -0.155 + 2 * self.d["R"] + 0.065
        for (_, wz) in self.d["wheels"]:
            f = math.exp(-((z - wz) / 0.21) ** 2)
            b = max(b, b * (1 - f) + target * f)
        return b

    def top(self, z):
        return crom(self.d["top"], z)

    def cab(self, z):  # 0 outside the greenhouse, 1 inside
        return smooth01(self.cab0 - 0.04, self.cab0 + 0.06, z) * (1 - smooth01(self.cab1 - 0.06, self.cab1 + 0.02, z))

    def wr(self, z):  # greenhouse half-width at the roof line
        return crom(self.d["roofw"], z)

    def ring(self, z):
        w, yb, belt, top, g = self.w(z), self.yb(z), self.belt(z), self.top(z), self.cab(z)
        top = max(top, belt - 0.07)
        wr = g * self.wr(z) + (1 - g) * w * 0.80
        side_h = belt - yb
        half = [
            (w * 0.74, yb),
            (w * 0.95, yb + 0.30 * side_h),
            (w, yb + 0.72 * side_h),
            (w * 0.955, belt),                                  # shoulder crease
            (w * 0.955 - (w * 0.955 - wr) * 0.45, belt + 0.30 * (top - belt)),
            (wr, top - 0.30 * (top - belt) * (0.4 + 0.6 * g)),
            (wr * 0.80, top - 0.012),
            (wr * 0.42, top - 0.002),
        ]
        return [(0.0, yb)] + half + [(0.0, top)] + [(-x, y) for (x, y) in reversed(half)]


def car_shell(name, d, M, stations=56):
    P = Profile(d)
    z0, z1 = d["nose_z"], d["tail_z"]
    zs = [z0 + (z1 - z0) * (0.5 - 0.5 * math.cos(math.pi * i / (stations - 1))) for i in range(stations)]  # denser at the ends
    bm = bmesh.new()
    rings = []
    for z in zs:
        rings.append([bm.verts.new(G(x, y, z)) for (x, y) in P.ring(z)])
    n = len(rings[0])
    try:
        cl = bm.edges.layers.float.get("crease_edge") or bm.edges.layers.float.new("crease_edge")
    except Exception:
        cl = None
    ws0, ws1 = d["cabin"][0], d["cabin"][0] + d["windscreen"]
    rw0, rw1 = d["cabin"][1] - d["rearwin"], d["cabin"][1]
    for r in range(len(rings) - 1):
        a, b = rings[r], rings[r + 1]
        zc = 0.5 * (zs[r] + zs[r + 1])
        g = P.cab(zc)
        for k in range(n):
            k2 = (k + 1) % n
            f = bm.faces.new((a[k], a[k2], b[k2], b[k]))
            side_glass = k in (4, 5, 12, 13)  # shoulder -> roof side (both halves)
            roof = k in (6, 7, 8, 9, 10, 11)
            mat = 0
            if g > 0.6 and side_glass:
                mat = 1
            if roof and (ws0 <= zc <= ws1 or rw0 <= zc <= rw1) and g > 0.3:
                mat = 1
            f.material_index = mat
        if cl is not None:
            for k, c in ((4, 0.75), (13, 0.75)):
                e = bm.edges.get((a[k], b[k]))
                if e:
                    e[cl] = c
    bm.faces.new(list(reversed(rings[0])))
    bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = link(name, me)
    o.data.materials.append(M["Paint"])
    o.data.materials.append(M["Glass"])
    s = o.modifiers.new("sub", "SUBSURF")
    s.levels = 2
    s.render_levels = 2
    for p in o.data.polygons:
        p.use_smooth = True
    return o, P


# ---------------------------------------------------------------- designs (all original)
DESIGNS = {
    # Compact sports coupe: short nose, cab-rearward fastback, strong rear haunches, swan-neck wing.
    "velocity_x": {
        "nose_z": -0.80, "tail_z": 0.50, "wheels": [(0.36, -0.50), (0.36, 0.35)], "R": 0.2, "tire_w": 0.15, "spokes": 6,
        "w": [(-0.80, 0.26), (-0.74, 0.37), (-0.62, 0.43), (-0.30, 0.43), (0.05, 0.44), (0.32, 0.46), (0.46, 0.43), (0.50, 0.36)],
        "bulge": 0.035,
        "yb": [(-0.80, 0.02), (-0.72, -0.045), (0.42, -0.045), (0.50, 0.03)],
        "belt": [(-0.80, 0.05), (-0.75, 0.11), (-0.62, 0.16), (-0.35, 0.19), (0.0, 0.21), (0.30, 0.235), (0.50, 0.22)],
        "top": [(-0.80, 0.06), (-0.75, 0.13), (-0.60, 0.19), (-0.34, 0.225), (-0.24, 0.30), (-0.10, 0.40), (0.06, 0.43), (0.20, 0.41),
                (0.34, 0.33), (0.46, 0.27), (0.50, 0.25)],
        "roofw": [(-0.34, 0.37), (-0.15, 0.30), (0.10, 0.29), (0.30, 0.31), (0.42, 0.34)],
        "cabin": (-0.34, 0.40), "windscreen": 0.26, "rearwin": 0.18,
        "wing": (0.48, 0.42, 0.92, "swan"), "vents": True, "scoop": True,
    },
    # Rally-raid brute: tall slab body, upright glasshouse, roof rack and light bar, armour.
    "bastion": {
        "nose_z": -0.74, "tail_z": 0.53, "wheels": [(0.37, -0.47), (0.37, 0.37)], "R": 0.22, "tire_w": 0.17, "spokes": 5,
        "w": [(-0.74, 0.36), (-0.68, 0.44), (-0.55, 0.46), (0.40, 0.46), (0.50, 0.44), (0.53, 0.40)],
        "bulge": 0.04,
        "yb": [(-0.74, 0.08), (-0.66, 0.0), (0.45, 0.0), (0.53, 0.07)],
        "belt": [(-0.74, 0.17), (-0.66, 0.25), (-0.50, 0.30), (0.0, 0.325), (0.40, 0.335), (0.53, 0.32)],
        "top": [(-0.74, 0.19), (-0.66, 0.28), (-0.45, 0.33), (-0.26, 0.355), (-0.16, 0.50), (0.0, 0.565), (0.30, 0.57), (0.44, 0.55),
                (0.50, 0.42), (0.53, 0.35)],
        "roofw": [(-0.26, 0.40), (-0.10, 0.37), (0.30, 0.37), (0.48, 0.38)],
        "cabin": (-0.26, 0.50), "windscreen": 0.18, "rearwin": 0.08,
        "wing": None, "roof_rack": True,
    },
    # Long, low hypercar: needle nose, cockpit set back, very wide hips, twin fins, dual-plane wing.
    "lancer": {
        "nose_z": -0.88, "tail_z": 0.61, "wheels": [(0.36, -0.56), (0.36, 0.42)], "R": 0.19, "tire_w": 0.16, "spokes": 10,
        "w": [(-0.88, 0.24), (-0.82, 0.38), (-0.68, 0.43), (-0.35, 0.40), (0.10, 0.43), (0.40, 0.47), (0.56, 0.44), (0.61, 0.36)],
        "bulge": 0.045,
        "yb": [(-0.88, 0.0), (-0.80, -0.05), (0.52, -0.05), (0.61, 0.02)],
        "belt": [(-0.88, 0.03), (-0.82, 0.08), (-0.66, 0.13), (-0.30, 0.15), (0.10, 0.175), (0.40, 0.205), (0.61, 0.19)],
        "top": [(-0.88, 0.04), (-0.82, 0.10), (-0.66, 0.15), (-0.28, 0.18), (-0.18, 0.26), (-0.04, 0.345), (0.12, 0.36), (0.26, 0.32),
                (0.40, 0.26), (0.52, 0.235), (0.61, 0.22)],
        "roofw": [(-0.28, 0.30), (-0.10, 0.24), (0.12, 0.24), (0.30, 0.27)],
        "cabin": (-0.28, 0.34), "windscreen": 0.22, "rearwin": 0.10,
        "wing": (0.40, 0.58, 0.98, "dual"), "fins": True, "vents": True,
    },
}


def build(name, d):
    reset()
    M = materials()
    shell, P = car_shell("Shell", d, M)
    cut_wells(shell, d, M)
    R = d["R"]
    nz, tz = d["nose_z"], d["tail_z"]
    brute = name == "bastion"
    for (wx, wz) in d["wheels"]:
        for sx in (-1, 1):
            # Thin carbon arch lip that traces the cut well.
            flare("ArchLip", sx * (P.w(wz) - 0.012), wz, R + 0.022, R + 0.038, 0.028, -0.155 + R, M["Carbon"], a0=28, a1=152)
    # ---- Front: splitter with canards, slim slanted headlights following the nose, grille.
    fz = nz + 0.07
    box("Splitter", (0, P.yb(fz) - 0.012, nz + 0.07), (2 * P.w(fz) * 0.95, 0.018, 0.16), M["Carbon"], 0.005)
    box("SplitterLED", (0, P.yb(fz) - 0.004, nz - 0.005), (2 * P.w(fz) * 0.7, 0.006, 0.008), M["LED"], 0.0)
    gz = nz + 0.035
    box("Grille", (0, (P.yb(gz) + P.belt(gz)) * 0.5, gz), (P.w(gz) * 0.95, (P.belt(gz) - P.yb(gz)) * 0.45, 0.04), M["Trim"], 0.008)
    hz = nz + 0.11
    for sx in (-1, 1):
        box("Canard", (sx * P.w(fz) * 0.98, P.yb(fz) + 0.05, fz), (0.09, 0.008, 0.07), M["Carbon"], 0.003, rot=(0, sx * 18, sx * -18))
        hx = P.w(hz) * 0.62
        box("Head", (sx * hx, P.belt(hz) - 0.004, hz), (0.2, 0.016, 0.05), M["LightFront"], 0.005, rot=(-14, sx * 24, sx * -8))
        box("DRL", (sx * hx * 1.06, P.belt(hz) - 0.028, hz + 0.01), (0.17, 0.006, 0.02), M["LED"], 0.0, rot=(-14, sx * 24, sx * -14))
        # ---- Sides: skirt with LED, intake ahead of the rear wheel, accent slash, mirror.
        box("Skirt", (sx * (P.w(-0.07) - 0.01), P.yb(-0.07) + 0.012, -0.07), (0.03, 0.04, 0.5), M["Carbon"], 0.008)
        box("SkirtLED", (sx * (P.w(-0.07) + 0.006), P.yb(-0.07) + 0.0, -0.07), (0.006, 0.008, 0.42), M["LED"], 0.0)
        iz = d["wheels"][1][1] - R - 0.11
        box("Intake", (sx * (P.w(iz) - 0.005), (P.yb(iz) + P.belt(iz)) * 0.5, iz), (0.03, (P.belt(iz) - P.yb(iz)) * 0.45, 0.13), M["Trim"], 0.006, rot=(0, sx * -12, 0))
        box("Slash", (sx * (P.w(-0.1) + 0.002), P.belt(-0.1) - 0.05, -0.12), (0.006, 0.022, 0.42), M["Accent"], 0.0, rot=(-6, 0, 0))
        mz = d["cabin"][0] + 0.06
        box("Mirror", (sx * (P.w(mz) * 0.93), P.belt(mz) + 0.05, mz), (0.07, 0.032, 0.05), M["Paint"], 0.012, rot=(0, sx * -12, 0))
        box("MirrorArm", (sx * (P.w(mz) * 0.85), P.belt(mz) + 0.03, mz), (0.04, 0.01, 0.02), M["Carbon"], 0.003)
        # ---- Rear lights: slim blades along the tail, angled into the haunch.
        lz = tz - 0.015
        box("TailBlade", (sx * P.w(lz) * 0.55, P.belt(lz) - 0.02, lz), (P.w(lz) * 0.62, 0.02, 0.02), M["LightRear"], 0.004, rot=(0, sx * -14, sx * 6))
        for ex in (0.17, 0.26):
            cyl("Exhaust", (sx * ex, P.yb(tz) + 0.035, tz + 0.01), 0.024, 0.08, M["Chrome"], "z", 20)
    lz = tz - 0.015
    box("TailBar", (0, P.belt(lz) - 0.02, lz + 0.005), (0.16, 0.008, 0.016), M["LightRear"], 0.003)
    # ---- Hood vents.
    if d.get("vents"):
        vz = nz + 0.3
        for sx in (-1, 1):
            box("Vent", (sx * 0.16, P.top(vz) - 0.002, vz), (0.11, 0.008, 0.12), M["Trim"], 0.004, rot=(-8, sx * 12, 0))
    # ---- Diffuser with fins and the booster nozzle.
    box("Diffuser", (0, P.yb(tz) + 0.02, tz - 0.02), (2 * P.w(tz) * 0.8, 0.05, 0.12), M["Carbon"], 0.006, rot=(14, 0, 0))
    for fx in (-0.2, -0.1, 0.0, 0.1, 0.2):
        box("Fin", (fx, P.yb(tz) + 0.015, tz + 0.01), (0.008, 0.07, 0.1), M["Trim"], 0.003, rot=(14, 0, 0))
    by = (P.yb(tz) + P.belt(tz)) * 0.5 + 0.03
    cyl("Booster", (0, by, tz), 0.064, 0.12, M["Chrome"], "z", 28, 0.008)
    cyl("BoosterRing", (0, by, tz + 0.06), 0.074, 0.014, M["Accent"], "z", 28)
    cyl("BoosterCore", (0, by, tz + 0.066), 0.044, 0.01, M["Glow"], "z", 28)
    if d.get("scoop"):
        sz = 0.02
        box("RoofScoop", (0, P.top(sz) + 0.02, sz), (0.15, 0.035, 0.17), M["Carbon"], 0.015)
    w = d.get("wing")
    if w:
        wy, wz2, ww, kind = w
        box("Wing", (0, wy, wz2), (ww, 0.02, 0.16), M["Carbon"], 0.008, rot=(-9, 0, 0))
        box("WingLED", (0, wy + 0.011, wz2 + 0.075), (ww * 0.94, 0.005, 0.01), M["LED"], 0.0)
        if kind == "dual":
            box("Wing2", (0, wy + 0.055, wz2 + 0.05), (ww * 0.95, 0.015, 0.085), M["Carbon"], 0.006, rot=(-18, 0, 0))
        for sx in (-1, 1):
            box("Endplate", (sx * ww / 2, wy + 0.015, wz2 + 0.01), (0.012, 0.09, 0.21), M["Carbon"], 0.006, rot=(-6, 0, 0))
            if kind == "swan":
                base_y = P.top(wz2 + 0.02)
                h = wy - base_y
                box("Post", (sx * 0.19, base_y + h * 0.5 - 0.005, wz2 - 0.03), (0.02, h + 0.04, 0.045), M["Trim"], 0.005, rot=(18, 0, 0))
            else:
                base_y = P.belt(wz2)
                h = wy - base_y
                box("Post", (sx * 0.25, base_y + h * 0.5, wz2 + 0.02), (0.02, h, 0.05), M["Trim"], 0.005, rot=(-10, 0, 0))
    if d.get("roof_rack"):
        ry = P.top(0.1) + 0.06
        for zz in (-0.05, 0.25):
            box("RackBar", (0, ry, zz), (0.68, 0.022, 0.028), M["Trim"], 0.006)
            for sx in (-1, 1):
                box("RackPost", (sx * 0.32, ry - 0.03, zz), (0.022, 0.06, 0.022), M["Trim"], 0.004)
        box("LightBar", (0, ry + 0.02, -0.08), (0.56, 0.035, 0.045), M["Trim"], 0.006)
        for lx in (-0.21, -0.07, 0.07, 0.21):
            cyl("Lamp", (lx, ry + 0.02, -0.104), 0.02, 0.01, M["LightFront"], "z", 16)
        box("SkidPlate", (0, P.yb(nz + 0.05) + 0.0, nz + 0.04), (0.6, 0.04, 0.1), M["Chrome"], 0.01, rot=(-24, 0, 0))
        box("Bullbar", (0, P.belt(nz) - 0.02, nz - 0.035), (0.5, 0.028, 0.028), M["Trim"], 0.008)
        for sx in (-1, 1):
            box("BullPost", (sx * 0.19, P.belt(nz) - 0.07, nz - 0.03), (0.028, 0.1, 0.028), M["Trim"], 0.006)
            box("Armor", (sx * (P.w(0.0) + 0.004), (P.yb(0.0) + P.belt(0.0)) * 0.5, -0.02), (0.008, 0.07, 0.36), M["Trim"], 0.003)
        box("Snorkel", (P.w(-0.3) * 0.98, P.belt(-0.3) + 0.1, -0.3), (0.045, 0.24, 0.055), M["Carbon"], 0.01)
        box("SnorkelHead", (P.w(-0.3) * 0.98, P.belt(-0.3) + 0.23, -0.32), (0.055, 0.05, 0.09), M["Carbon"], 0.012)
        box("Ducktail", (0, P.top(tz - 0.06) + 0.012, tz - 0.05), (0.8, 0.018, 0.1), M["Carbon"], 0.006, rot=(14, 0, 0))
    if d.get("fins"):
        for sx in (-1, 1):
            fzz = 0.36
            box("SharkFin", (sx * 0.13, P.top(fzz) + 0.04, fzz), (0.01, 0.08, 0.3), M["Paint"], 0.006, rot=(-10, 0, 0))
    body = finish_body()
    tris = sum(len(p.vertices) - 2 for p in body.data.polygons)
    bpy.ops.object.select_all(action="DESELECT")
    build_wheel(M, R, d["tire_w"], d["spokes"])
    path = os.path.join(OUT_DIR, f"{name}.glb")
    bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", use_selection=False, export_apply=True, export_yup=True)
    print("exported", path, "body tris:", tris)


for n, d in DESIGNS.items():
    build(n, d)
