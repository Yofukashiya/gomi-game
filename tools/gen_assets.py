#!/usr/bin/env python3
"""Generate deck / mini-game art with gpt-image-2, save downscaled JPEGs.

Same trick as simonw/raccoon-heist's gen_textures.py: one shared STYLE prefix
keeps every asset visually consistent, generate once at build time, commit the
result so the deployed page never calls an API.

Usage:  python3 tools/gen_assets.py [name ...]
Key:    CODEX_API_KEY (or OPENAI_API_KEY) in .env.local
"""
import base64, io, json, os, re, sys, urllib.parse, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets")


def api_key():
    for k in ("CODEX_API_KEY", "OPENAI_API_KEY"):
        if os.environ.get(k):
            return os.environ[k].strip()
    env = os.path.join(ROOT, ".env.local")
    if os.path.exists(env):
        for line in open(env, encoding="utf-8"):
            m = re.match(r"\s*(?:export\s+)?(CODEX_API_KEY|OPENAI_API_KEY)\s*=\s*(.+)", line)
            if m:
                return m.group(2).strip().strip('"').strip("'")
    sys.exit("no API key: set CODEX_API_KEY in .env.local")


TEX_STYLE = ("Seamless tileable texture, top-down flat orthographic view, no perspective, "
             "even lighting, video game texture map, stylized low-poly game art style, "
             "dark neon cyberpunk workshop palette, deep navy blue with cyan and magenta accents. ")

ART_STYLE = ("Video game key art, low-poly 3D render style, cinematic rim lighting, "
             "deep navy night palette with cyan and magenta neon accents. "
             "No text, no words, no letters, no logos, no UI. ")

# name: (prompt, size, quality, style_prefix, final_px)
ASSETS = {
    # --- deck art ---
    "title-art": (
        "A cheerful low-poly developer character sitting cross-legged on a giant floating "
        "game controller, holding a glowing blue cube of code, surrounded by small floating "
        "low-poly game objects: a treasure chest, a slime monster, a sword, a paint brush, "
        "a music note, a tiny robot helper hovering beside them. Night sky, stars, moon.",
        "1536x1024", "medium", ART_STYLE, (1024, 683)),
    "boss-art": (
        "A giant friendly low-poly beetle-shaped BUG monster made of glitching wireframe "
        "blocks, looming over a small brave developer character holding a glowing debugger "
        "flashlight, inside a neon server room. Dramatic boss-battle framing.",
        "1024x1024", "low", ART_STYLE, (640, 640)),
    # --- mini-game textures ---
    "tex-floor": (
        "Dark office carpet tiles at night, deep navy blue-grey squares with faint cyan "
        "grid seams, subtle noise.",
        "1024x1024", "low", TEX_STYLE, (512, 512)),
    "tex-grid": (
        "Glowing holographic technical grid floor, thin cyan lines on near-black surface, "
        "faint magenta cross marks, sci-fi blueprint feel.",
        "1024x1024", "low", TEX_STYLE, (512, 512)),
    "tex-metal": (
        "Brushed dark metal server panel surface, vertical ridges, screws, scuffs and "
        "scratches, cool blue-grey.",
        "1024x1024", "low", TEX_STYLE, (512, 512)),
    "tex-crate": (
        "Wooden shipping crate planks, dark stained wood with grain, nails and metal "
        "corner brackets, front-on view.",
        "1024x1024", "low", TEX_STYLE, (512, 512)),
}


def gen_free(name):
    """No-API-key fallback: pollinations.ai. Lower quality, but zero setup."""
    prompt, size, quality, style, final = ASSETS[name]
    w, h = final
    url = ("https://image.pollinations.ai/prompt/"
           + urllib.parse.quote(style + prompt)
           + f"?width={w}&height={h}&nologo=true&model=flux&seed={abs(hash(name)) % 99999}")
    with urllib.request.urlopen(url, timeout=300) as r:
        raw = r.read()
    path = os.path.join(OUT, f"{name}.jpg")
    from PIL import Image
    Image.open(io.BytesIO(raw)).convert("RGB").save(path, "JPEG", quality=84)
    print(f"{name}: {os.path.getsize(path)} bytes (free) -> {path}")


def gen(name):
    prompt, size, quality, style, final = ASSETS[name]
    body = json.dumps({
        "model": "gpt-image-2",
        "prompt": style + prompt,
        "size": size,
        "quality": quality,
        "output_format": "jpeg",
        "output_compression": 82,
        "n": 1,
    }).encode()
    req = urllib.request.Request(
        "https://api.openai.com/v1/images/generations", data=body,
        headers={"Authorization": f"Bearer {api_key()}", "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=300) as r:
        data = json.load(r)
    raw = base64.b64decode(data["data"][0]["b64_json"])
    path = os.path.join(OUT, f"{name}.jpg")
    try:
        from PIL import Image
        img = Image.open(io.BytesIO(raw)).convert("RGB").resize(final, Image.LANCZOS)
        img.save(path, "JPEG", quality=84)
    except ImportError:
        # ponytail: no Pillow -> keep full-size original, `sips` can shrink it after
        open(path, "wb").write(raw)
    print(f"{name}: {os.path.getsize(path)} bytes -> {path}")


if __name__ == "__main__":
    argv = [a for a in sys.argv[1:] if a != "--free"]
    free = "--free" in sys.argv
    for n in (argv or list(ASSETS)):
        try:
            gen_free(n) if free else gen(n)
        except Exception as e:
            print(f"{n}: FAILED {e}", file=sys.stderr)
            if not free:
                print(f"{n}: retrying without API key ...", file=sys.stderr)
                try:
                    gen_free(n)
                except Exception as e2:
                    print(f"{n}: FREE FAILED {e2}", file=sys.stderr)
