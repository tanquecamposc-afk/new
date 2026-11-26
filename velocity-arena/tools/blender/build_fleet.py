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
            bpy.ops.mesh.primitive_cylinder_add(radius=R + 0.035, depth=0.42, vertices=40,
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


# ---------------------------------------------------------------- designs (all original)
DESIGNS = {
    # Balanced coupe: wedge nose, coke-bottle waist, wide rear haunches, fastback canopy, swan-neck wing.
    "velocity_x": {
        "body": [(-0.80, 0.30, 0.07, 0.12, 0.80), (-0.76, 0.42, 0.05, 0.16, 0.85), (-0.66, 0.46, 0.04, 0.20, 0.86),
                 (-0.50, 0.47, 0.04, 0.245, 0.84), (-0.34, 0.45, 0.04, 0.25, 0.80), (-0.14, 0.445, 0.04, 0.27, 0.78),
                 (0.08, 0.46, 0.04, 0.30, 0.78), (0.26, 0.48, 0.045, 0.33, 0.80), (0.40, 0.475, 0.06, 0.34, 0.80),
                 (0.48, 0.42, 0.09, 0.335, 0.78), (0.51, 0.34, 0.12, 0.32, 0.75)],
        "cabin": [(-0.30, 0.20, 0.235, 0.255, 0.6), (-0.20, 0.29, 0.245, 0.37, 0.6), (-0.04, 0.32, 0.26, 0.445, 0.62),
                  (0.10, 0.315, 0.28, 0.455, 0.62), (0.24, 0.29, 0.30, 0.43, 0.6), (0.36, 0.24, 0.32, 0.37, 0.6),
                  (0.42, 0.19, 0.33, 0.34, 0.6)],
        "wheels": [(0.36, -0.50), (0.36, 0.35)], "R": 0.2, "tire_w": 0.15, "spokes": 6,
        "wing": (0.50, 0.44, 0.92, "swan"), "nose_z": -0.79, "tail_z": 0.50, "hood_y": 0.215, "deck_y": 0.33, "scoop": True,
    },
    # Rally-raid brute: tall slab sides, armoured skid plate, roof rack with light bar, snorkel, ducktail.
    "bastion": {
        "body": [(-0.74, 0.36, 0.12, 0.22, 0.90), (-0.70, 0.45, 0.08, 0.29, 0.92), (-0.58, 0.48, 0.06, 0.33, 0.92),
                 (-0.42, 0.48, 0.06, 0.345, 0.90), (-0.20, 0.47, 0.06, 0.36, 0.90), (0.04, 0.47, 0.06, 0.37, 0.90),
                 (0.26, 0.48, 0.06, 0.375, 0.90), (0.42, 0.48, 0.07, 0.375, 0.90), (0.50, 0.44, 0.10, 0.37, 0.88),
                 (0.53, 0.38, 0.13, 0.36, 0.85)],
        "cabin": [(-0.30, 0.30, 0.34, 0.36, 0.8), (-0.20, 0.38, 0.35, 0.52, 0.78), (0.04, 0.40, 0.36, 0.58, 0.8),
                  (0.28, 0.39, 0.36, 0.58, 0.8), (0.42, 0.37, 0.36, 0.55, 0.78), (0.47, 0.34, 0.36, 0.42, 0.75)],
        "wheels": [(0.37, -0.47), (0.37, 0.37)], "R": 0.22, "tire_w": 0.17, "spokes": 5,
        "wing": None, "nose_z": -0.73, "tail_z": 0.52, "hood_y": 0.30, "deck_y": 0.37, "roof_rack": True,
    },
    # Long, low hypercar: needle nose, cab-rear canopy, twin shark fins and a big dual-plane wing.
    "lancer": {
        "body": [(-0.88, 0.28, 0.06, 0.10, 0.80), (-0.84, 0.42, 0.045, 0.14, 0.85), (-0.72, 0.46, 0.035, 0.18, 0.86),
                 (-0.56, 0.47, 0.035, 0.22, 0.84), (-0.38, 0.445, 0.035, 0.215, 0.80), (-0.16, 0.435, 0.035, 0.23, 0.78),
                 (0.06, 0.45, 0.035, 0.26, 0.78), (0.26, 0.48, 0.04, 0.29, 0.80), (0.44, 0.48, 0.05, 0.30, 0.80),
                 (0.56, 0.43, 0.08, 0.295, 0.76), (0.61, 0.34, 0.11, 0.28, 0.72)],
        "cabin": [(-0.22, 0.18, 0.205, 0.22, 0.6), (-0.12, 0.27, 0.215, 0.32, 0.58), (0.04, 0.30, 0.23, 0.39, 0.6),
                  (0.18, 0.29, 0.25, 0.39, 0.6), (0.32, 0.25, 0.27, 0.34, 0.58), (0.42, 0.18, 0.28, 0.30, 0.55)],
        "wheels": [(0.36, -0.56), (0.36, 0.42)], "R": 0.19, "tire_w": 0.16, "spokes": 10,
        "wing": (0.40, 0.56, 0.96, "dual"), "nose_z": -0.87, "tail_z": 0.60, "hood_y": 0.18, "deck_y": 0.29, "fins": True,
    },
}


def build(name, d):
    reset()
    M = materials()
    LO = -0.085  # lower the body so it hides the top of the wheels (sporty stance, no "floating" shell)
    shell = loft2("Shell", [(z, hw, y0 + LO, y1, sh) for (z, hw, y0, y1, sh) in d["body"]], [M["Paint"]])
    cut_wells(shell, d, M)
    loft2("Canopy", d["cabin"], [M["Glass"], M["Paint"]], creases=(0.6, 0.9, 0.3), roof_split=0.82)
    R = d["R"]
    for (wx, wz) in d["wheels"]:
        for sx in (-1, 1):
            # Wide, aggressive arches with a carbon lip underneath.
            flare("Flare", sx * (wx + 0.015), wz, R + 0.025, R + 0.07, 0.22, 0.035, M["Paint"], a0=8, a1=172)
            flare("ArchLip", sx * (wx + 0.115), wz, R + 0.025, R + 0.045, 0.025, 0.035, M["Carbon"], a0=4, a1=176)
    nz, tz, hy, dy = d["nose_z"], d["tail_z"], d["hood_y"], d["deck_y"]
    brute = name == "bastion"
    # ---- Front: wide splitter, canards, slit headlights, lower intakes.
    box("Splitter", (0, -0.035, nz + 0.02), (0.86, 0.02, 0.14), M["Carbon"], 0.006)
    box("SplitterLED", (0, -0.025, nz - 0.045), (0.7, 0.006, 0.01), M["LED"], 0.0)
    box("Grille", (0, 0.06 + (0.05 if brute else 0), nz + 0.015), (0.38, 0.05 + (0.04 if brute else 0), 0.03), M["Trim"], 0.008)
    for sx in (-1, 1):
        box("Canard", (sx * 0.43, 0.05, nz + 0.07), (0.1, 0.008, 0.07), M["Carbon"], 0.003, rot=(0, sx * 18, sx * -16))
        box("Intake", (sx * 0.3, 0.02, nz + 0.03), (0.14, 0.05, 0.04), M["Trim"], 0.01, rot=(0, sx * 10, 0))
        hl_y = 0.14 if not brute else 0.24
        box("HeadHousing", (sx * 0.28, hl_y, nz + 0.05), (0.2, 0.035, 0.05), M["Trim"], 0.008, rot=(0, sx * 16, sx * -9))
        box("Head", (sx * 0.28, hl_y + 0.002, nz + 0.03), (0.17, 0.014, 0.03), M["LightFront"], 0.004, rot=(0, sx * 16, sx * -9))
        box("DRL", (sx * 0.27, hl_y - 0.025, nz + 0.04), (0.16, 0.007, 0.02), M["LED"], 0.0, rot=(0, sx * 16, sx * -16))
        # ---- Sides: carbon skirt with LED, slash decal, side scoop ahead of the rear wheel, mirror.
        box("Skirt", (sx * 0.47, -0.03, -0.07), (0.03, 0.07, 0.62), M["Carbon"], 0.01)
        box("SkirtLED", (sx * 0.488, -0.045, -0.07), (0.006, 0.008, 0.5), M["LED"], 0.0)
        box("Slash", (sx * 0.468, 0.17 if not brute else 0.22, -0.05), (0.006, 0.035, 0.42), M["Accent"], 0.0, rot=(-9, 0, 0))
        box("Slash2", (sx * 0.468, 0.12 if not brute else 0.17, 0.02), (0.006, 0.02, 0.3), M["Accent"], 0.0, rot=(-9, 0, 0))
        scoop_z = d["wheels"][1][1] - R - 0.12
        box("Scoop", (sx * 0.455, 0.17 if not brute else 0.22, scoop_z), (0.05, 0.09, 0.15), M["Carbon"], 0.008, rot=(0, sx * -14, 0))
        box("ScoopMouth", (sx * 0.475, 0.17 if not brute else 0.22, scoop_z - 0.05), (0.012, 0.07, 0.05), M["Trim"], 0.004, rot=(0, sx * -14, 0))
        box("Mirror", (sx * 0.34, dy + 0.02 if brute else hy + 0.08, -0.2), (0.08, 0.03, 0.05), M["Paint"], 0.01, rot=(0, sx * -10, 0))
        box("MirrorStalk", (sx * 0.3, dy if brute else hy + 0.06, -0.2), (0.05, 0.012, 0.02), M["Carbon"], 0.003)
        # ---- Rear: angular tail light blades and exhausts.
        box("TailBlade", (sx * 0.27, dy - 0.03, tz + 0.012), (0.24, 0.022, 0.02), M["LightRear"], 0.004, rot=(0, sx * -8, sx * 8))
        for ex in (0.2, 0.3):
            cyl("Exhaust", (sx * ex, 0.04, tz + 0.02), 0.026, 0.09, M["Chrome"], "z", 20)
    box("TailBar", (0, dy - 0.025, tz + 0.012), (0.2, 0.01, 0.018), M["LightRear"], 0.003)
    # ---- Hood: power bulge, twin vents with LED edges, racing stripes over hood and roof.
    box("Bulge", (0, hy + 0.012, -0.47 if name != "lancer" else -0.55), (0.24, 0.03, 0.4), M["Paint"], 0.03, rot=(-4, 0, 0))
    for sx in (-1, 1):
        box("Vent", (sx * 0.2, hy + 0.012, -0.38), (0.1, 0.012, 0.13), M["Trim"], 0.004, rot=(-5, sx * 10, 0))
        box("VentLED", (sx * 0.2, hy + 0.02, -0.44), (0.1, 0.005, 0.008), M["LED"], 0.0, rot=(-5, sx * 10, 0))
        box("Stripe", (sx * 0.055, hy + 0.03, -0.5), (0.035, 0.006, 0.52), M["Accent"], 0.0, rot=(-5, 0, 0))
    # ---- Diffuser with tall fins, rocket booster.
    box("Diffuser", (0, 0.0, tz + 0.01), (0.7, 0.08, 0.1), M["Carbon"], 0.008, rot=(12, 0, 0))
    for fx in (-0.24, -0.12, 0.0, 0.12, 0.24):
        box("Fin", (fx, -0.005, tz + 0.04), (0.01, 0.09, 0.11), M["Trim"], 0.003, rot=(12, 0, 0))
    by = 0.19 if name != "lancer" else 0.16
    cyl("Booster", (0, by, tz + 0.03), 0.068, 0.13, M["Chrome"], "z", 28, 0.01)
    cyl("BoosterRing", (0, by, tz + 0.095), 0.078, 0.015, M["Accent"], "z", 28)
    cyl("BoosterCore", (0, by, tz + 0.1), 0.046, 0.01, M["Glow"], "z", 28)
    if d.get("scoop"):
        box("RoofScoop", (0, 0.465, 0.02), (0.16, 0.04, 0.18), M["Carbon"], 0.015)
        box("RoofScoopMouth", (0, 0.47, -0.065), (0.12, 0.025, 0.01), M["Trim"], 0.003)
    w = d.get("wing")
    if w:
        wy, wz2, ww, kind = w
        box("Wing", (0, wy, wz2), (ww, 0.022, 0.17), M["Carbon"], 0.008, rot=(-9, 0, 0))
        box("WingLED", (0, wy + 0.012, wz2 + 0.08), (ww * 0.95, 0.005, 0.012), M["LED"], 0.0)
        if kind == "dual":
            box("Wing2", (0, wy + 0.06, wz2 + 0.05), (ww * 0.96, 0.016, 0.09), M["Carbon"], 0.006, rot=(-18, 0, 0))
        for sx in (-1, 1):
            box("Endplate", (sx * ww / 2, wy + 0.015, wz2 + 0.01), (0.012, 0.09, 0.22), M["Carbon"], 0.006, rot=(-6, 0, 0))
            if kind == "swan":
                # Swan-neck posts: rise from the deck, hook over the wing.
                box("Post", (sx * 0.2, wy - 0.05, wz2 - 0.02), (0.022, 0.12, 0.05), M["Trim"], 0.005, rot=(15, 0, 0))
                box("PostHook", (sx * 0.2, wy + 0.025, wz2 - 0.005), (0.022, 0.03, 0.08), M["Trim"], 0.005)
            else:
                box("Post", (sx * 0.24, wy - 0.12, wz2 + 0.02), (0.02, 0.2, 0.05), M["Trim"], 0.005, rot=(-10, 0, 0))
    if d.get("roof_rack"):
        for zz in (-0.05, 0.25):
            box("RackBar", (0, 0.632, zz), (0.66, 0.025, 0.03), M["Trim"], 0.006)
            for sx in (-1, 1):
                box("RackPost", (sx * 0.31, 0.6, zz), (0.025, 0.06, 0.025), M["Trim"], 0.004)
        box("LightBar", (0, 0.65, -0.07), (0.56, 0.035, 0.045), M["Trim"], 0.006)
        for lx in (-0.2, -0.07, 0.07, 0.2):
            cyl("Lamp", (lx, 0.65, -0.095), 0.022, 0.01, M["LightFront"], "z", 16)
        box("SkidPlate", (0, 0.0, nz + 0.05), (0.66, 0.05, 0.1), M["Chrome"], 0.01, rot=(-20, 0, 0))
        box("Bullbar", (0, 0.2, nz - 0.03), (0.5, 0.03, 0.03), M["Trim"], 0.008)
        for sx in (-1, 1):
            box("BullPost", (sx * 0.2, 0.1, nz - 0.03), (0.03, 0.13, 0.03), M["Trim"], 0.006)
            box("Armor", (sx * 0.47, 0.25, 0.08), (0.012, 0.1, 0.5), M["Trim"], 0.004)
        box("Snorkel", (0.44, 0.43, -0.27), (0.05, 0.3, 0.06), M["Carbon"], 0.01)
        box("SnorkelHead", (0.44, 0.59, -0.29), (0.06, 0.05, 0.1), M["Carbon"], 0.012)
        box("Ducktail", (0, 0.39, tz - 0.02), (0.84, 0.02, 0.1), M["Carbon"], 0.006, rot=(12, 0, 0))
    if d.get("fins"):
        for sx in (-1, 1):
            box("SharkFin", (sx * 0.13, 0.35, 0.36), (0.012, 0.1, 0.32), M["Paint"], 0.006, rot=(-12, 0, 0))
    body = finish_body()
    tris = sum(len(p.vertices) - 2 for p in body.data.polygons)
    bpy.ops.object.select_all(action="DESELECT")
    build_wheel(M, R, d["tire_w"], d["spokes"])
    path = os.path.join(OUT_DIR, f"{name}.glb")
    bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", use_selection=False, export_apply=True, export_yup=True)
    print("exported", path, "body tris:", tris)


for n, d in DESIGNS.items():
    build(n, d)
