"""Cuts Byte poses out of the 4x upscaled storyboard (sides cut by panel borders are faded in research.js).
Usage: python3 tools/cutout.py   (reads build/storyboard_x4.png, writes assets/byte_<pose>.png)"""
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage
S = 4
A = np.asarray(Image.open('build/storyboard_x4.png').convert('RGB')).astype(np.int16)
# pose: crop in original storyboard px (x0, y0, x1, y1), mirror, panel sides that cut the body
CROPS = {
    'point': ((0, 300, 313, 829), True, 'LR'),
    'think': ((318, 520, 623, 829), False, 'R'),
    'grin':  ((630, 380, 941, 829), False, 'LR'),
    'cheer': ((320, 1270, 623, 1672), False, 'LR'),
    'wave':  ((630, 1040, 941, 1672), False, 'LR'),
}

def extend(rgb, a, side):
    """Trim the panel-border column on a cut side (the soft edge fade is applied at render time, per shot)."""
    return (rgb[:, 8:], a[:, 8:]) if side == 'L' else (rgb[:, :-8], a[:, :-8])

for name, ((x0, y0, x1, y1), mirror, cut) in CROPS.items():
    c = A[y0 * S:y1 * S, x0 * S:x1 * S].copy()
    H, W, _ = c.shape
    r, g, b = c[..., 0], c[..., 1], c[..., 2]
    ember = (r > 150) & (g < 130) & (b < 110) & (r - g > 100) & (r - b > 120)
    lab, n = ndimage.label(ember)
    edge = set(np.unique(np.concatenate([lab[0], lab[:, 0], lab[:, -1]]))) - {0}
    sizes = ndimage.sum(ember, lab, range(1, n + 1))
    means = ndimage.mean(g, lab, range(1, n + 1)), ndimage.mean(b, lab, range(1, n + 1))
    big = {i + 1 for i, s in enumerate(sizes) if s > 300 and means[0][i] < 75 and means[1][i] < 40}
    bg = np.isin(lab, list(edge | big))
    fg = ~bg
    yy, xx = np.mgrid[0:H, 0:W] / S       # in original-pixel units relative to the crop
    if name == 'think':
        # drop the storyboard's phone and the hand holding it; keep hair that overlaps the phone
        fg &= xx > np.interp(yy, [0, 160, 187, 210, 260, 311], [165, 165, 132, 112, 92, 86]) - 3
        phone = (xx < 254) & (yy < 150)
        hair = ndimage.binary_dilation((r > 140) & (g > 90), iterations=10)
        fg &= ~phone | hair
    if name == 'grin':
        fg &= ~((yy < 84) | ((xx < 135) & (yy < 245)))
    lab2, n2 = ndimage.label(fg)
    sizes = ndimage.sum(fg, lab2, range(1, n2 + 1))
    fg = lab2 == (np.argmax(sizes) + 1)
    alpha = np.asarray(Image.fromarray((fg * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.2))) / 255
    rgb = c.astype(np.uint8)
    for side in cut: rgb, alpha = extend(rgb, alpha, side)
    im = Image.fromarray(rgb).convert('RGBA'); im.putalpha(Image.fromarray((alpha * 255).astype(np.uint8)))
    im = im.crop(im.getbbox())
    if mirror: im = im.transpose(Image.FLIP_LEFT_RIGHT)
    im.save(f'assets/byte_{name}.png'); print(name, im.size)
