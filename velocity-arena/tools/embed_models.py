"""Embed the car GLBs into web/index.html as base64 <script> blocks.

The Claude artifact viewer blocks fetching data: URLs, so GLTFLoader could not read the
cars from separate glTF JSON files. Embedding the binary GLB and parsing it in memory
needs no request at all. Run after rebuilding the fleet:
    python3 tools/embed_models.py
"""
import base64
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HTML = os.path.join(ROOT, "web", "index.html")
IDS = ["velocity_x", "bastion", "lancer"]

blocks = []
for car in IDS:
    data = open(os.path.join(ROOT, "assets", "vehicles", car + ".glb"), "rb").read()
    b64 = base64.b64encode(data).decode("ascii")
    lines = "\n".join(b64[i:i + 4096] for i in range(0, len(b64), 4096))
    blocks.append(f'<script type="application/octet-stream" id="model-{car}">\n{lines}\n</script>')
    print(car, len(data), "bytes")
html = open(HTML, encoding="utf-8").read()
new = "<!-- MODELS:BEGIN -->\n" + "\n".join(blocks) + "\n<!-- MODELS:END -->"
html, n = re.subn(r"<!-- MODELS:BEGIN -->.*?<!-- MODELS:END -->", lambda m: new, html, flags=re.S)
assert n == 1, "markers not found"
open(HTML, "w", encoding="utf-8").write(html)
print("index.html", len(html.encode()), "bytes")
