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


# ---------------------------------------------------------------- designs
DESIGNS = {
    "velocity_x": {
        "body": [(-0.77, 0.24, 0.10, 0.15), (-0.73, 0.38, 0.065, 0.21), (-0.62, 0.44, 0.045, 0.25), (-0.44, 0.455, 0.04, 0.275),
                 (-0.22, 0.455, 0.04, 0.30), (-0.02, 0.455, 0.04, 0.33), (0.16, 0.468, 0.04, 0.36), (0.32, 0.47, 0.05, 0.37),
                 (0.43, 0.44, 0.08, 0.36), (0.48, 0.36, 0.12, 0.32)],
        "cabin": [(-0.33, 0.24, 0.27, 0.29), (-0.22, 0.29, 0.28, 0.40), (-0.06, 0.315, 0.30, 0.50), (0.10, 0.315, 0.32, 0.53),
                  (0.24, 0.295, 0.34, 0.49), (0.34, 0.26, 0.35, 0.42), (0.40, 0.2, 0.35, 0.36)],
        "exp": 3.2, "wheels": [(0.36, -0.50), (0.36, 0.35)], "R": 0.2, "tire_w": 0.15, "spokes": 6,
        "wing": (0.5, 0.41, 0.86), "nose_z": -0.75, "tail_z": 0.47,
    },
    "bastion": {
        "body": [(-0.70, 0.36, 0.12, 0.24), (-0.66, 0.45, 0.07, 0.30), (-0.55, 0.47, 0.05, 0.33), (-0.35, 0.47, 0.05, 0.35),
                 (-0.10, 0.47, 0.05, 0.37), (0.15, 0.47, 0.05, 0.38), (0.35, 0.47, 0.06, 0.38), (0.45, 0.45, 0.09, 0.37),
                 (0.49, 0.40, 0.12, 0.35)],
        "cabin": [(-0.30, 0.34, 0.33, 0.36), (-0.20, 0.38, 0.34, 0.56), (0.05, 0.39, 0.36, 0.62), (0.28, 0.38, 0.36, 0.62),
                  (0.40, 0.36, 0.36, 0.58), (0.45, 0.33, 0.36, 0.42)],
        "exp": 5.0, "wheels": [(0.37, -0.47), (0.37, 0.37)], "R": 0.22, "tire_w": 0.17, "spokes": 5,
        "wing": None, "nose_z": -0.69, "tail_z": 0.48, "roof_rack": True,
    },
    "lancer": {
        "body": [(-0.85, 0.22, 0.09, 0.12), (-0.80, 0.37, 0.055, 0.17), (-0.68, 0.43, 0.04, 0.21), (-0.48, 0.45, 0.035, 0.23),
                 (-0.25, 0.45, 0.035, 0.25), (0.00, 0.45, 0.035, 0.29), (0.22, 0.465, 0.04, 0.31), (0.40, 0.465, 0.05, 0.30),
                 (0.52, 0.43, 0.07, 0.28), (0.58, 0.34, 0.10, 0.25)],
        "cabin": [(-0.38, 0.20, 0.22, 0.24), (-0.25, 0.26, 0.23, 0.35), (-0.08, 0.29, 0.25, 0.43), (0.10, 0.28, 0.27, 0.44),
                  (0.26, 0.24, 0.28, 0.37), (0.36, 0.18, 0.28, 0.30)],
        "exp": 2.6, "wheels": [(0.36, -0.56), (0.36, 0.42)], "R": 0.19, "tire_w": 0.16, "spokes": 10,
        "wing": (0.40, 0.52, 0.9), "nose_z": -0.83, "tail_z": 0.57, "fins": True,
    },
}


def build(name, d):
    reset()
    M = materials()
    loft("Shell", d["body"], 16, d["exp"], M["Paint"])
    loft("Canopy", d["cabin"], 12, 2.4 if d["exp"] < 4 else 4.0, M["Glass"])
    R = d["R"]
    for (wx, wz) in d["wheels"]:
        for sx in (-1, 1):
            flare("Flare", sx * wx, wz, R + 0.028, R + 0.075, 0.2, 0.035, M["Paint"])
    nz, tz = d["nose_z"], d["tail_z"]
    # Front: splitter, grille, headlight housings with LED DRL strips.
    box("Splitter", (0, 0.05, nz), (0.72, 0.025, 0.1), M["Carbon"], 0.008)
    box("Grille", (0, 0.11, nz + 0.005), (0.44, 0.06, 0.03), M["Trim"], 0.01)
    for sx in (-1, 1):
        box("HeadHousing", (sx * 0.25, 0.165, nz + 0.02), (0.2, 0.045, 0.05), M["Trim"], 0.012, rot=(0, sx * 12, 0))
        box("Head", (sx * 0.25, 0.167, nz + 0.0), (0.17, 0.024, 0.03), M["LightFront"], 0.006, rot=(0, sx * 12, 0))
        box("DRL", (sx * 0.29, 0.135, nz + 0.01), (0.12, 0.01, 0.025), M["LED"], 0.003, rot=(0, sx * 12, 0))
        # Sides: skirts, accent decal stripe, intake, mirror.
        box("Skirt", (sx * 0.458, 0.07, -0.07), (0.035, 0.05, 0.62), M["Carbon"], 0.008)
        box("SkirtLED", (sx * 0.477, 0.075, -0.07), (0.006, 0.01, 0.46), M["LED"], 0.0)
        box("Decal", (sx * 0.462, 0.2, -0.02), (0.006, 0.04, 0.55), M["Accent"], 0.0, rot=(-4, 0, 0))
        box("Intake", (sx * 0.455, 0.2, 0.2), (0.03, 0.08, 0.13), M["Trim"], 0.01)
        box("Mirror", (sx * 0.33, 0.33 + (0.06 if name == "bastion" else 0), -0.2), (0.07, 0.035, 0.05), M["Paint"], 0.012)
        # Rear: twin exhaust tips.
        cyl("Exhaust", (sx * 0.27, 0.11, tz + 0.01), 0.032, 0.08, M["Chrome"], "z", 20)
    # Hood stripes (decal) and vents.
    for sx in (-0.07, 0.07):
        box("Stripe", (sx, 0.29 if name != "lancer" else 0.24, -0.42), (0.05, 0.006, 0.5), M["Accent"], 0.0, rot=(-6, 0, 0))
    # Rear: diffuser with fins, tail light bar, rocket booster.
    box("Diffuser", (0, 0.1, tz), (0.64, 0.08, 0.06), M["Carbon"], 0.01)
    for fx in (-0.2, -0.07, 0.07, 0.2):
        box("Fin", (fx, 0.085, tz + 0.02), (0.012, 0.06, 0.07), M["Trim"], 0.003)
    box("Tail", (0, 0.28 if name != "lancer" else 0.23, tz), (0.72, 0.03, 0.02), M["LightRear"], 0.006)
    cyl("Booster", (0, 0.2 if name != "lancer" else 0.17, tz + 0.03), 0.085, 0.12, M["Chrome"], "z", 28, 0.01)
    cyl("BoosterCore", (0, 0.2 if name != "lancer" else 0.17, tz + 0.09), 0.055, 0.01, M["Glow"], "z", 28)
    if d.get("wing"):
        wy, wz2, ww = d["wing"]
        box("Wing", (0, wy, wz2), (ww, 0.03, 0.15), M["Carbon"], 0.01, rot=(-6, 0, 0))
        box("WingLED", (0, wy + 0.013, wz2 - 0.06), (ww, 0.006, 0.02), M["LED"], 0.0)
        for sx in (-1, 1):
            box("WingPost", (sx * 0.22, wy - 0.07, wz2 + 0.02), (0.025, 0.13, 0.05), M["Trim"], 0.006)
            box("Endplate", (sx * ww / 2, wy, wz2), (0.015, 0.11, 0.2), M["Paint"], 0.006)
    if d.get("roof_rack"):
        for zz in (-0.05, 0.25):
            box("RackBar", (0, 0.632, zz), (0.62, 0.025, 0.03), M["Trim"], 0.006)
            for sx in (-1, 1):
                box("RackPost", (sx * 0.29, 0.6, zz), (0.025, 0.06, 0.025), M["Trim"], 0.004)
        box("LightBar", (0, 0.648, -0.05), (0.5, 0.03, 0.04), M["LightFront"], 0.006)
        box("SkidPlate", (0, 0.07, nz + 0.04), (0.6, 0.04, 0.08), M["Chrome"], 0.01)
    if d.get("fins"):
        for sx in (-1, 1):
            box("Fin", (sx * 0.2, 0.36, 0.35), (0.015, 0.12, 0.3), M["Paint"], 0.008, rot=(-15, 0, 0))
    body = finish_body()
    tris = sum(len(p.vertices) - 2 for p in body.data.polygons)
    bpy.ops.object.select_all(action="DESELECT")
    build_wheel(M, R, d["tire_w"], d["spokes"])
    path = os.path.join(OUT_DIR, f"{name}.glb")
    bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", use_selection=False, export_apply=True, export_yup=True)
    print("exported", path, "body tris:", tris)


for n, d in DESIGNS.items():
    build(n, d)
