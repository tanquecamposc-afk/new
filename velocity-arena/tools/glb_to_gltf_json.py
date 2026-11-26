"""Convert a .glb into a single glTF JSON file with the binary buffer embedded as base64.

Artifact hosting cannot serve .glb, so the web build ships cars as .json.
Usage: python3 tools/glb_to_gltf_json.py in.glb out.json
"""
import base64
import json
import struct
import sys

src, dst = sys.argv[1], sys.argv[2]
data = open(src, "rb").read()
magic, _version, _length = struct.unpack_from("<4sII", data, 0)
assert magic == b"glTF", "not a GLB file"
off, doc, binary = 12, None, b""
while off < len(data):
    clen, ctype = struct.unpack_from("<II", data, off)
    chunk = data[off + 8: off + 8 + clen]
    if ctype == 0x4E4F534A:
        doc = json.loads(chunk.decode("utf-8"))
    elif ctype == 0x004E4942:
        binary = chunk
    off += 8 + clen
doc["buffers"][0]["uri"] = "data:application/octet-stream;base64," + base64.b64encode(binary).decode("ascii")
json.dump(doc, open(dst, "w"), separators=(",", ":"))
print(dst, len(binary), "bytes of geometry")
