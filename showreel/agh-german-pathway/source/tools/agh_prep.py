import cv2, numpy as np, sys
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
BOXES = {
 8: [(70,40,240,230),(70,280,855,530),(70,540,725,690),(65,1570,400,1630),(770,1575,870,1625)],
 7: [(60,65,210,240),(65,295,830,500),(70,500,695,605),(65,1535,385,1595),(780,1540,875,1590)],
 6: [(65,65,200,220),(70,265,875,375),(75,380,765,565),(75,570,375,620),(70,1575,370,1630),(760,1580,870,1625)],
 9: [(55,70,250,290),(65,325,770,525),(65,530,650,655),(65,1445,780,1605),(790,1570,895,1620)],
}
for i, boxes in BOXES.items():
    im = np.array(Image.open(f'{src}/{i}.webp').convert('RGB'))
    r, g, b = [im[..., k].astype(int) for k in range(3)]
    white = (np.minimum(np.minimum(r, g), b) > 175) & ((np.maximum(np.maximum(r, g), b) - np.minimum(np.minimum(r, g), b)) < 70)
    yellow = (r > 195) & (g > 165) & (b < 120) & (r - b > 110)
    navy = (b > r + 20) & (r < 90)  # logo dark parts
    m = np.zeros(r.shape, np.uint8)
    for (x0, y0, x1, y1) in boxes:
        sub = white[y0:y1, x0:x1] | yellow[y0:y1, x0:x1]
        if ((x1 - x0) < 260 and y0 < 300) or False:  # logo box / poster-4 shadowed sky text: repair whole box
            sub = np.ones_like(sub)
        m[y0:y1, x0:x1] = sub
    # poster 4 text carries a wide dark glow: grow the mask to swallow it
    m = cv2.dilate(m * 255, np.ones((9, 9), np.uint8), iterations=(5 if i == 9 else 2))
    bgr = cv2.cvtColor(im, cv2.COLOR_RGB2BGR)
    res = cv2.inpaint(bgr, m, 30 if i == 9 else 18, cv2.INPAINT_TELEA)
    # soften the repaired area so inpaint streaks read as sky haze
    blur = cv2.GaussianBlur(res, (0, 0), 9)
    mm = cv2.GaussianBlur(cv2.dilate(m, np.ones((15, 15), np.uint8)), (0, 0), 8)[..., None] / 255.0
    res = (res * (1 - mm) + blur * mm).astype(np.uint8)
    up = cv2.resize(res, (1080 * 1, int(1672 * 1080 / 941)), interpolation=cv2.INTER_LANCZOS4)
    sharp = cv2.addWeighted(up, 1.35, cv2.GaussianBlur(up, (0, 0), 1.6), -0.35, 0)
    cv2.imwrite(f'{out}/bg{i}.jpg', sharp, [cv2.IMWRITE_JPEG_QUALITY, 93])
# logo: white background -> alpha
lg = np.array(Image.open(f'{src}/10.webp').convert('RGB')).astype(float)
d = 255 - lg.min(axis=2)  # distance from white
alpha = np.clip((d - 18) / 40, 0, 1)
rgba = np.dstack([lg, alpha * 255]).astype(np.uint8)
Image.fromarray(rgba, 'RGBA').save(f'{out}/logo.png')
print('ok')
