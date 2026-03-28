"""Run once on the GX10 to generate pwa/icon.png — requires Pillow."""
from PIL import Image, ImageDraw, ImageFont
import os

SIZE = 192
img  = Image.new("RGB", (SIZE, SIZE), color="#080b0f")
draw = ImageDraw.Draw(img)

for name in ("arialbd.ttf", "DejaVuSans-Bold.ttf", "LiberationSans-Bold.ttf"):
    try:
        font = ImageFont.truetype(name, 120)
        break
    except Exception:
        font = ImageFont.load_default()

text = "Z"
bbox = draw.textbbox((0, 0), text, font=font)
w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
x = (SIZE - w) / 2 - bbox[0]
y = (SIZE - h) / 2 - bbox[1]
draw.text((x, y), text, fill="#00d4ff", font=font)

out = os.path.join(os.path.dirname(__file__), "icon.png")
img.save(out)
print(f"Saved {out}")
