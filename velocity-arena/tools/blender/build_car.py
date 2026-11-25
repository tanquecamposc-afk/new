"""Builds the original "Velocity X" car in Blender and exports it to glTF.

    blender -b -P tools/blender/build_car.py -- assets/vehicles/velocity_x.glb

Modelling approach (as for real car models): coarse quad cages that are
smoothed with Subdivision Surface + edge creases, bevelled hard parts, and
named materials that the game re-tints per team:
  Paint (team colour), Trim (dark plastic), Carbon, Glass, Chrome,
  LightFront, LightRear, LED (team accent), Tire, Rim.
Objects: "Body" (everything static) and "Wheel" (one wheel, reused 4x).
Car space matches the game: forward = -Z, up = +Y, origin at suspension
anchor height. Blender is Z-up, so we model in Blender space with
(x, -z_game, y_game) and the glTF exporter converts Y-up.
"""
import math
import sys

import bpy
import bmesh

OUT = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "velocity_x.glb"

bpy.ops.wm.read_factory_settings(use_empty=True)


def G(x, y, z):
    """Game coords (x right, y up, z back) -> Blender coords (x, y fwd?, z up).
    The glTF exporter maps Blender +Y -> glTF -Z and Blender +Z -> glTF +Y,
    so Blender y = -z_game."""
    return (x, -z, y)


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


M = {
    "Paint": mat("Paint", (0.05, 0.25, 0.9), 0.6, 0.25, coat=1.0),
    "Trim": mat("Trim", (0.02, 0.02, 0.025), 0.2, 0.45),
    "Carbon": mat("Carbon", (0.03, 0.032, 0.036), 0.5, 0.3),
    "Glass": mat("Glass", (0.01, 0.015, 0.03), 0.9, 0.05, alpha=0.85),
    "Chrome": mat("Chrome", (0.8, 0.8, 0.82), 1.0, 0.12),
    "LightFront": mat("LightFront", (1, 1, 1), 0, 0.2, (0.85, 0.93, 1.0), 6.0),
    "LightRear": mat("LightRear", (1, 0.1, 0.1), 0, 0.3, (1.0, 0.05, 0.05), 5.0),
    "LED": mat("LED", (0.3, 0.7, 1), 0, 0.3, (0.2, 0.6, 1.0), 4.0),
    "Tire": mat("Tire", (0.025, 0.025, 0.028), 0.0, 0.8),
    "Rim": mat("Rim", (0.55, 0.57, 0.6), 1.0, 0.2),
}


def new_obj(name, mesh):
    o = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(o)
    return o


def loft_cage(name, sections, ring, exponent, material, crease_rows=(), cap=True):
    """Quad cage through superellipse sections [z, half_w, y_bottom, y_top]."""
    bm = bmesh.new()
    rings = []
    for (z, hw, y0, y1) in sections:
        cy, hh = (y0 + y1) / 2, (y1 - y0) / 2
        verts = []
        for k in range(ring):
            a = 2 * math.pi * k / ring
            ca, sa = math.cos(a), math.sin(a)
            x = math.copysign(abs(ca) ** (2 / exponent), ca) * hw
            y = math.copysign(abs(sa) ** (2 / exponent), sa) * hh
            if y < 0:
                y *= 0.8
            verts.append(bm.verts.new(G(x, cy + y, z)))
        rings.append(verts)
    for r in range(len(rings) - 1):
        a, b = rings[r], rings[r + 1]
        for k in range(ring):
            k2 = (k + 1) % ring
            bm.faces.new((a[k], a[k2], b[k2], b[k]))
    if cap:
        bm.faces.new(list(reversed(rings[0])))
        bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = new_obj(name, me)
    o.data.materials.append(material)
    for row in crease_rows:
        # crease the ring loop of a given section index for a sharper edge
        pass
    sub = o.modifiers.new("sub", "SUBSURF")
    sub.levels = 3
    sub.render_levels = 3
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
    o = new_obj(name, me)
    o.location = G(*center)
    o.rotation_euler = (math.radians(rot[0]), math.radians(rot[2]), math.radians(rot[1]))
    o.data.materials.append(material)
    if bevel > 0:
        bv = o.modifiers.new("bevel", "BEVEL")
        bv.width = bevel
        bv.segments = 3
        bv.limit_method = "ANGLE"
    for p in o.data.polygons:
        p.use_smooth = True
    o.data.use_auto_smooth = True if hasattr(o.data, "use_auto_smooth") else None
    return o


# ------------------------------------------------------------------ body
BODY = [
    (-0.77, 0.24, 0.10, 0.15),
    (-0.73, 0.38, 0.065, 0.21),
    (-0.62, 0.44, 0.045, 0.25),
    (-0.44, 0.455, 0.04, 0.275),
    (-0.22, 0.455, 0.04, 0.30),
    (-0.02, 0.455, 0.04, 0.33),
    (0.16, 0.468, 0.04, 0.36),
    (0.32, 0.47, 0.05, 0.37),
    (0.43, 0.44, 0.08, 0.36),
    (0.48, 0.36, 0.12, 0.32),
]
loft_cage("Shell", BODY, 16, 3.2, M["Paint"])

CABIN = [
    (-0.33, 0.24, 0.27, 0.29),
    (-0.22, 0.29, 0.28, 0.40),
    (-0.06, 0.315, 0.30, 0.50),
    (0.10, 0.315, 0.32, 0.53),
    (0.24, 0.295, 0.34, 0.49),
    (0.34, 0.26, 0.35, 0.42),
    (0.40, 0.2, 0.35, 0.36),
]
loft_cage("Canopy", CABIN, 12, 2.4, M["Glass"])

# Roof panel in paint over the glass (gives a real pillar/roof read).
ROOF = [
    (-0.02, 0.24, 0.49, 0.515),
    (0.10, 0.25, 0.515, 0.54),
    (0.22, 0.235, 0.49, 0.512),
]


# Fender flares: subdivided half-rings over each wheel.
WHEELS = [(-0.36, 0.0, -0.50), (0.36, 0.0, -0.50), (-0.36, 0.0, 0.35), (0.36, 0.0, 0.35)]
for i, (wx, wy, wz) in enumerate(WHEELS):
    bm = bmesh.new()
    steps = 10
    rows = []
    for k in range(steps + 1):
        a = math.radians(-20 + 220 * k / steps)
        r_in, r_out = 0.228, 0.272
        side = 1 if wx > 0 else -1
        pts = []
        for (r, xo) in ((r_in, -0.1), (r_out, -0.1), (r_out, 0.1), (r_in, 0.1)):
            pts.append(bm.verts.new(G(wx + side * xo, 0.035 + math.sin(a) * r, wz + math.cos(a) * r)))
        rows.append(pts)
    for k in range(steps):
        a, b = rows[k], rows[k + 1]
        for j in range(4):
            j2 = (j + 1) % 4
            bm.faces.new((a[j], a[j2], b[j2], b[j]))
    bm.faces.new(list(reversed(rows[0])))
    bm.faces.new(rows[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(f"Flare{i}")
    bm.to_mesh(me)
    bm.free()
    o = new_obj(f"Flare{i}", me)
    o.data.materials.append(M["Paint"])
    s = o.modifiers.new("sub", "SUBSURF")
    s.levels = 2
    for p in o.data.polygons:
        p.use_smooth = True

# Hard parts.
box("Splitter", (0, 0.05, -0.75), (0.7, 0.025, 0.1), M["Carbon"], 0.008)
box("Diffuser", (0, 0.1, 0.47), (0.64, 0.08, 0.06), M["Carbon"], 0.01)
for fx in (-0.2, -0.07, 0.07, 0.2):
    box("Fin", (fx, 0.085, 0.49), (0.012, 0.06, 0.07), M["Trim"], 0.003)
for sx in (-1, 1):
    box("Skirt", (sx * 0.458, 0.07, -0.07), (0.035, 0.05, 0.6), M["Carbon"], 0.008)
    box("SkirtLED", (sx * 0.476, 0.08, -0.07), (0.006, 0.01, 0.46), M["LED"], 0.0)
    box("Intake", (sx * 0.455, 0.2, 0.17), (0.03, 0.08, 0.14), M["Trim"], 0.01)
    box("Mirror", (sx * 0.33, 0.33, -0.21), (0.07, 0.035, 0.05), M["Paint"], 0.012)
    box("Head", (sx * 0.25, 0.165, -0.735), (0.18, 0.025, 0.04), M["LightFront"], 0.008, rot=(0, sx * 12, 0))
    box("DRL", (sx * 0.3, 0.135, -0.725), (0.1, 0.012, 0.03), M["LED"], 0.004, rot=(0, sx * 12, 0))
    box("WingPost", (sx * 0.22, 0.43, 0.43), (0.025, 0.13, 0.05), M["Trim"], 0.006)
    box("Endplate", (sx * 0.43, 0.5, 0.41), (0.015, 0.11, 0.2), M["Paint"], 0.006)
box("Wing", (0, 0.5, 0.41), (0.86, 0.03, 0.15), M["Carbon"], 0.01, rot=(-6, 0, 0))
box("WingLED", (0, 0.513, 0.35), (0.86, 0.006, 0.02), M["LED"], 0.0)
box("Tail", (0, 0.28, 0.47), (0.72, 0.03, 0.02), M["LightRear"], 0.006)
box("Grille", (0, 0.11, -0.745), (0.42, 0.05, 0.03), M["Trim"], 0.008)
for vz in (-0.52, -0.45):
    box("Vent", (0, 0.275, vz), (0.24, 0.012, 0.03), M["Trim"], 0.004, rot=(-6, 0, 0))
for sx in (-0.12, 0.12):
    bpy.ops.mesh.primitive_cylinder_add(radius=0.06, depth=0.1, vertices=24, location=G(sx, 0.19, 0.5),
                                        rotation=(math.radians(90), 0, 0))
    n = bpy.context.active_object
    n.name = "Nozzle"
    n.data.materials.append(M["Chrome"])

body_parts = [o for o in bpy.data.objects]
for o in body_parts:
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
bpy.ops.object.convert(target="MESH")  # apply modifiers
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
bpy.ops.object.join()
body = bpy.context.active_object
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
body.name = "Body"
bpy.ops.object.shade_smooth()

# ------------------------------------------------------------------ wheel
bpy.ops.object.select_all(action="DESELECT")
R = 0.2
bpy.ops.mesh.primitive_cylinder_add(radius=R, depth=0.15, vertices=40, rotation=(0, math.radians(90), 0))
tire = bpy.context.active_object
tire.data.materials.append(M["Tire"])
bv = tire.modifiers.new("bevel", "BEVEL")
bv.width = 0.035
bv.segments = 5
bpy.ops.object.modifier_apply(modifier="bevel")
bpy.ops.object.shade_smooth()
parts = [tire]
# Rim face, 6 spokes and hub cap (outer side = +X).
bpy.ops.mesh.primitive_cylinder_add(radius=R * 0.68, depth=0.13, vertices=36, rotation=(0, math.radians(90), 0))
barrel = bpy.context.active_object
barrel.data.materials.append(M["Trim"])
parts.append(barrel)
bpy.ops.mesh.primitive_torus_add(major_radius=R * 0.66, minor_radius=0.012, major_segments=36, minor_segments=8,
                                 location=(0.068, 0, 0), rotation=(0, math.radians(90), 0))
lip = bpy.context.active_object
lip.data.materials.append(M["Rim"])
parts.append(lip)
for k in range(6):
    a = 2 * math.pi * k / 6
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0.066, math.cos(a) * R * 0.33, math.sin(a) * R * 0.33),
                                    rotation=(a, 0, 0))
    sp = bpy.context.active_object
    sp.scale = (0.02, R * 0.62, 0.032)
    sp.data.materials.append(M["Rim"])
    b2 = sp.modifiers.new("bevel", "BEVEL")
    b2.width = 0.004
    b2.segments = 2
    parts.append(sp)
bpy.ops.mesh.primitive_cylinder_add(radius=R * 0.17, depth=0.03, vertices=24, location=(0.075, 0, 0),
                                    rotation=(0, math.radians(90), 0))
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
wheel = bpy.context.active_object
wheel.name = "Wheel"
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
bpy.ops.object.shade_smooth()

bpy.ops.object.select_all(action="SELECT")
bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", use_selection=False, export_apply=True,
                          export_yup=True)
print("exported", OUT, "body tris:", sum(len(p.vertices) - 2 for p in body.data.polygons))
