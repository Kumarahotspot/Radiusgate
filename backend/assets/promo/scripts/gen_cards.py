from PIL import Image, ImageDraw, ImageFont, ImageFilter

FB = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
FR = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"
AMBER = (251, 191, 36)
WHITE = (255, 255, 255)
SOFT = (203, 225, 222)

SIZES = {"l": (1920, 1080), "v": (1080, 1920)}


def fnt(size, bold=True):
    return ImageFont.truetype(FB if bold else FR, size)


def gradient(w, h, top, bottom):
    img = Image.new("RGB", (w, h), top)
    d = ImageDraw.Draw(img)
    for y in range(h):
        t = y / h
        d.line([(0, y), (w, y)], fill=tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3)))
    return img


def add_circles(img, items):
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    for cx, cy, r, col in items:
        od.ellipse([cx - r, cy - r, cx + r, cy + r], fill=col)
    return Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")


def center(d, cx, y, text, font, fill):
    bb = d.textbbox((0, 0), text, font=font)
    d.text((cx - (bb[2] - bb[0]) / 2, y), text, font=font, fill=fill)


def fit_font(d, text, size, max_w, bold=True):
    fs = size
    f = fnt(fs, bold)
    while fs > 20 and (d.textbbox((0, 0), text, font=f)[2] - d.textbbox((0, 0), text, font=f)[0]) > max_w:
        fs -= 4
        f = fnt(fs, bold)
    return f


def logo_img(size):
    logo = Image.open("/app/frontend/public/logo.png").convert("RGBA")
    ratio = size / max(logo.size)
    return logo.resize((int(logo.width * ratio), int(logo.height * ratio)))


def make_intro(w, h, out):
    img = gradient(w, h, (13, 100, 94), (3, 38, 36))
    img = add_circles(img, [(int(w * 0.85), int(h * 0.15), int(h * 0.28), (251, 191, 36, 20)),
                            (int(w * 0.12), int(h * 0.85), int(h * 0.34), (255, 255, 255, 12))])
    lg = logo_img(int(h * 0.22))
    img.paste(lg, ((w - lg.width) // 2, int(h * 0.16)), lg)
    d = ImageDraw.Draw(img)
    s = h / 1080
    center(d, w / 2, int(h * 0.44), "RADIUSGATE", fit_font(d, "RADIUSGATE", int(130 * s), w * 0.88), WHITE)
    center(d, w / 2, int(h * 0.44) + int(150 * s), "Sistem Absensi Digital Berbasis AI", fit_font(d, "Sistem Absensi Digital Berbasis AI", int(48 * s), w * 0.88, bold=False), AMBER)
    center(d, w / 2, int(h * 0.44) + int(230 * s), "Wajah • RFID • QR • Geofence • Multi-Tenant", fit_font(d, "Wajah • RFID • QR • Geofence • Multi-Tenant", int(36 * s), w * 0.88, bold=False), SOFT)
    img.save(out, quality=92)


def make_feature(w, h, out, title, sub):
    img = gradient(w, h, (15, 118, 110), (4, 47, 44))
    img = add_circles(img, [(int(w * 0.9), int(h * 0.85), int(h * 0.3), (255, 255, 255, 12))])
    lg = logo_img(int(h * 0.08))
    img.paste(lg, (int(w * 0.06), int(h * 0.06)), lg)
    d = ImageDraw.Draw(img)
    s = h / 1080
    d.text((int(w * 0.06), int(h * 0.38)), title, font=fit_font(d, title, int(88 * s), w * 0.88), fill=WHITE)
    # wrap sub
    words = sub.split()
    lines, cur = [], ""
    f = fnt(int(44 * s), False)
    for word in words:
        test = (cur + " " + word).strip()
        if d.textbbox((0, 0), test, font=f)[2] > w * 0.82:
            lines.append(cur)
            cur = word
        else:
            cur = test
    lines.append(cur)
    y = int(h * 0.38) + int(130 * s)
    for ln in lines:
        d.text((int(w * 0.06), y), ln, font=f, fill=AMBER)
        y += int(64 * s)
    img.save(out, quality=92)


def make_outro(w, h, out):
    img = gradient(w, h, (13, 100, 94), (3, 38, 36))
    img = add_circles(img, [(int(w * 0.15), int(h * 0.2), int(h * 0.3), (251, 191, 36, 18)),
                            (int(w * 0.88), int(h * 0.8), int(h * 0.34), (255, 255, 255, 12))])
    lg = logo_img(int(h * 0.18))
    img.paste(lg, ((w - lg.width) // 2, int(h * 0.18)), lg)
    d = ImageDraw.Draw(img)
    s = h / 1080
    center(d, w / 2, int(h * 0.46), "Mulai Uji Coba Gratis 14 Hari", fit_font(d, "Mulai Uji Coba Gratis 14 Hari", int(84 * s), w * 0.88), WHITE)
    center(d, w / 2, int(h * 0.46) + int(120 * s), "radiusgate.id", fnt(int(64 * s)), AMBER)
    center(d, w / 2, int(h * 0.46) + int(220 * s), "PT. Pusaka Kreasi Mandiri", fnt(int(36 * s), False), SOFT)
    img.save(out, quality=92)


for key, (w, h) in SIZES.items():
    make_intro(w, h, f"/tmp/vidcard-intro-{key}.jpg")
    make_feature(w, h, f"/tmp/vidcard-f1-{key}.jpg", "Absen Wajah AI dalam 3 Detik", "ArcFace + liveness detection — anti titip absen foto atau video")
    make_feature(w, h, f"/tmp/vidcard-f2-{key}.jpg", "Kartu RFID & QR Code", "Tanpa sentuh layar, kartu otomatis dibuat per siswa & pegawai")
    make_feature(w, h, f"/tmp/vidcard-f3-{key}.jpg", "Sekolah • Perusahaan • Instansi PPPK", "Satu platform untuk semua: SPP, payroll, shift, hingga upah per jam")
    make_outro(w, h, f"/tmp/vidcard-outro-{key}.jpg")

import os
for key in SIZES:
    for n in ("intro", "f1", "f2", "f3", "outro"):
        p = f"/tmp/vidcard-{n}-{key}.jpg"
        print(p, os.path.getsize(p) // 1024, "KB")
