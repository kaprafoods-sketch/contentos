"""Contact sheet of review stills. Usage: python3 tools/sheet.py out.png in1.png in2.png ..."""
import sys
from PIL import Image
out, ins = sys.argv[1], sys.argv[2:]
ims = [Image.open(p).convert('RGB').resize((360, 640)) for p in ins]
c = Image.new('RGB', (370 * len(ims), 640), 'white')
for i, im in enumerate(ims): c.paste(im, (i * 370, 0))
c.save(out)
