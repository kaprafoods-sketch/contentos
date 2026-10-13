"""4x anime upscale (Real-ESRGAN x4plus anime 6B, ONNX) of the storyboard, tiled.
Usage: python3 tools/upscale.py assets/storyboard.png build/storyboard_x4.png /home/user/models/realesrgan_anime6b.onnx"""
import sys, numpy as np, onnxruntime as ort
from PIL import Image
src, dst, model = sys.argv[1:4]
s = ort.InferenceSession(model)
im = np.asarray(Image.open(src).convert('RGB')).astype(np.float32) / 255
H, W, _ = im.shape; T, P = 192, 16
out = np.zeros((H * 4, W * 4, 3), np.float32)
for y in range(0, H, T):
    for x in range(0, W, T):
        y0, x0 = max(0, y - P), max(0, x - P); y1, x1 = min(H, y + T + P), min(W, x + T + P)
        r = s.run(None, {'input': im[y0:y1, x0:x1].transpose(2, 0, 1)[None]})[0][0].transpose(1, 2, 0)
        oy, ox = (y - y0) * 4, (x - x0) * 4; h, w = min(T, H - y) * 4, min(T, W - x) * 4
        out[y * 4:y * 4 + h, x * 4:x * 4 + w] = r[oy:oy + h, ox:ox + w]
    print(y, H, flush=True)
Image.fromarray((out.clip(0, 1) * 255 + .5).astype(np.uint8)).save(dst)
