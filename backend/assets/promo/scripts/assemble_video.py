import os
import subprocess
import sys

from PIL import Image, ImageFilter

SEQ = [
    ("card", "/tmp/vidcard-intro-{k}.jpg", 3.0),
    ("clip", "/tmp/clip-intro-{k}.mp4", None),
    ("card", "/tmp/vidcard-f1-{k}.jpg", 3.0),
    ("img", "/tmp/vid-landing.png", 4.0),
    ("img", "/tmp/vid-dashboard.png", 4.0),
    ("card", "/tmp/vidcard-f2-{k}.jpg", 3.0),
    ("img", "/tmp/vid-reports.png", 4.0),
    ("img", "/tmp/vid-pppk-recap.png", 4.0),
    ("card", "/tmp/vidcard-f3-{k}.jpg", 3.0),
    ("img", "/tmp/vid-employee.png", 4.0),
    ("img", "/tmp/vid-landing-pppk.png", 4.0),
    ("clip", "/tmp/clip-outro-{k}.mp4", None),
    ("card", "/tmp/vidcard-outro-{k}.jpg", 3.5),
]
INTRO_CARD = ("card", "/tmp/vidcard-intro-{k}.jpg", 3.0)

SIZES = {"l": (1920, 1080), "v": (1080, 1920)}


def compose_frame(src, w, h, out):
    img = Image.open(src).convert("RGB")
    bg = img.resize((w, int(img.height * w / img.width)))
    if bg.height < h:
        bg = img.resize((int(img.width * h / img.height), h))
    left = (bg.width - w) // 2
    top = (bg.height - h) // 2
    bg = bg.crop((left, top, left + w, top + h)).filter(ImageFilter.GaussianBlur(28))
    fg = img.resize((w, int(img.height * w / img.width))) if w >= h else img.resize((int(img.width * h * 0.62 / img.height), int(h * 0.62)))
    canvas = bg.copy()
    canvas.paste(fg, ((w - fg.width) // 2, (h - fg.height) // 2))
    canvas.save(out, quality=90)


def fade_filters(dur, fade_in, fade_out):
    parts = []
    if fade_in:
        parts.append("fade=t=in:st=0:d=0.4")
    if fade_out:
        parts.append(f"fade=t=out:st={max(dur - 0.4, 0)}:d=0.4")
    return ",".join(parts)


def render_still(frame, w, h, dur, out, fade_in=True, fade_out=True):
    vf = (f"scale=4000:-2,zoompan=z='1+0.09*on/{int(dur*25)}':d={int(dur*25)}"
          f":x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s={w}x{h}:fps=25")
    ff = fade_filters(dur, fade_in, fade_out)
    if ff:
        vf += "," + ff
    vf += ",format=yuv420p"
    subprocess.run(["ffmpeg", "-y", "-loop", "1", "-i", frame, "-vf", vf, "-t", str(dur),
                    "-c:v", "libx264", "-preset", "fast", "-crf", "20", out],
                   check=True, capture_output=True)


def render_clip(src, w, h, out, fade_in=True, fade_out=True):
    dur = float(subprocess.run(["ffprobe", "-v", "quiet", "-show_entries", "format=duration",
                                "-of", "csv=p=0", src], check=True, capture_output=True, text=True).stdout.strip())
    vf = f"scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h},fps=25"
    ff = fade_filters(dur, fade_in, fade_out)
    if ff:
        vf += "," + ff
    vf += ",format=yuv420p"
    subprocess.run(["ffmpeg", "-y", "-i", src, "-vf", vf,
                    "-c:v", "libx264", "-preset", "fast", "-crf", "20", "-an", out],
                   check=True, capture_output=True)


def build(k, loop=False, out_path=None, tag=""):
    w, h = SIZES[k]
    seq = list(SEQ) + ([INTRO_CARD] if loop else [])
    segs = []
    for i, (kind, path, dur) in enumerate(seq):
        path = path.replace("{k}", k)
        fade_in = not (loop and i == 0)
        fade_out = not (loop and i == len(seq) - 1)
        seg = f"/tmp/vidseg{tag}-{k}-{i:02d}.mp4"
        if kind == "clip":
            if not os.path.exists(path):
                print(f"[{k}] klip hilang, lewati:", path)
                continue
            render_clip(path, w, h, seg, fade_in, fade_out)
        else:
            frame = f"/tmp/vidframe{tag}-{k}-{i:02d}.jpg"
            compose_frame(path, w, h, frame)
            render_still(frame, w, h, dur, seg, fade_in, fade_out)
        segs.append(seg)
    lst = f"/tmp/vidconcat{tag}-{k}.txt"
    with open(lst, "w") as f:
        for s in segs:
            f.write(f"file '{s}'\n")
    out = out_path or f"/tmp/radiusgate-promo-{k}.mp4"
    subprocess.run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", lst,
                    "-c:v", "libx264", "-preset", "fast", "-crf", "20", "-pix_fmt", "yuv420p",
                    "-movflags", "+faststart", out],
                   check=True, capture_output=True)
    print(f"[{k}] FINAL:", out, os.path.getsize(out) // 1024, "KB", flush=True)


if __name__ == "__main__":
    loop = "--loop" in sys.argv
    keys = [a for a in sys.argv[1:] if a in SIZES] or list(SIZES)
    for k in keys:
        suffix = "-loop" if loop else ""
        build(k, loop=loop, out_path=f"/tmp/radiusgate-promo-{k}{suffix}.mp4", tag=suffix)
    print("ASSEMBLY SELESAI", flush=True)
