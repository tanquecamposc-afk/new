import sys, os, glob, subprocess
import pypdfium2 as pdfium
pptx = sys.argv[1]; prefix = sys.argv[2]
SK="/root/.claude/skills/synced/73569e69-fd57-4df8-aa68-3548b29921bc_2cc5ae33-ec9e-4d09-ad1f-1bb951f10940/pptx"
subprocess.run([sys.executable, f"{SK}/scripts/office/soffice.py","--headless","--convert-to","pdf",pptx],check=True,capture_output=True)
pdf = os.path.splitext(pptx)[0]+".pdf"
for f in glob.glob(f"{prefix}-*.jpg"): os.remove(f)
doc = pdfium.PdfDocument(pdf)
for i in range(len(doc)):
    doc[i].render(scale=1.6).to_pil().convert("RGB").save(f"{prefix}-{i+1:02d}.jpg", quality=82)
print(len(doc), "slides ->", prefix)
