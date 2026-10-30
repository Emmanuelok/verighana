"""Build the original Fullview Signature vector identity from local typefaces.

Raster exports are rendered by scripts/render-brand-assets.mjs (Sharp).
The optional generated background stays an unchanged source image.
"""
from pathlib import Path
import base64
import json
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public' / 'brand'
OUT.mkdir(parents=True, exist_ok=True)
FONTS = {
    'sans': TTFont(ROOT / 'public/fonts/dm-sans-regular.ttf'),
    'semibold': TTFont(ROOT / 'public/fonts/dm-sans-semibold.ttf'),
    'serif': TTFont(ROOT / 'public/fonts/libre-caslon-display.ttf'),
}
INK = '#073d35'
IVORY = '#fff9ec'
GOLD = '#e2bc73'


def word(text, x, y, size, font='sans', fill=INK, spacing=0):
    face = FONTS[font]
    glyphs, cmap = face.getGlyphSet(), face.getBestCmap()
    scale = size / face['head'].unitsPerEm
    pieces, cursor = [], x
    for char in text:
        name = cmap.get(ord(char), '.notdef')
        pen = SVGPathPen(glyphs)
        glyphs[name].draw(pen)
        path = pen.getCommands()
        if path:
            pieces.append(f'<path fill="{fill}" transform="translate({cursor:.3f} {y}) scale({scale:.7f} {-scale:.7f})" d="{path}"/>')
        cursor += face['hmtx'][name][0] * scale + spacing
    return ''.join(pieces), cursor - x


def glyph(fill=IVORY, gold=GOLD):
    # Panorama: interlaced planes around an open, asymmetric horizon.
    return f'''<g transform="translate(0 12)">
      <path d="M3 45C22 9 57 -4 87 6C64 2 50 38 3 45Z" fill="{fill}"/>
      <path d="M49 30C64 15 73 6 85 10C104 15 117 31 125 44C96 40 80 20 49 30Z" fill="{fill}"/>
      <path d="M3 49C14 76 37 88 58 77C43 77 26 54 3 49Z" fill="{gold}"/>
      <path d="M14 50C44 55 76 59 112 48C90 55 73 70 61 78C43 70 29 57 14 50Z" fill="{fill}"/>
      <path d="M36 91C74 102 108 75 125 49C104 44 84 54 69 71C55 88 48 93 36 91Z" fill="{gold}"/>
    </g>'''


def svg(body, width, height, title):
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img" aria-label="{title}"><title>{title}</title>{body}</svg>'


for dark in [False, True]:
    fill = IVORY if dark else INK
    gold = GOLD if dark else '#b48942'
    body = '<g transform="translate(0 14) scale(1.6)">' + glyph(fill, gold) + '</g>'
    name, width = word('Fullview', 236, 107, 108, 'serif', fill, -1.4)
    signature, _ = word('SIGNATURE', 243, 151, 26, 'sans', fill, 8.0)
    endorsement, _ = word('by Avalon Group', 243, 186, 21, 'sans', GOLD if dark else '#617565', 1.4)
    body += name + signature + endorsement
    total_width = round(236 + width + 30)
    (OUT / ('logo-light.svg' if dark else 'logo-dark.svg')).write_text(svg(body, total_width, 220, 'Fullview Signature — by Avalon Group'))

(OUT / 'monogram.svg').write_text(svg(glyph(INK, '#af803c'), 128, 128, 'Fullview Signature panorama emblem'))
icon = '<defs><linearGradient id="jade" x2="1" y2="1"><stop stop-color="#155c4b"/><stop offset="1" stop-color="#052c28"/></linearGradient></defs><rect width="512" height="512" fill="url(#jade)"/>'
icon += '<g transform="translate(41 37) scale(3.36)">' + glyph() + '</g>'
(OUT / 'app-icon.svg').write_text(svg(icon, 512, 512, 'Fullview Signature app icon'))
maskable = '<rect width="512" height="512" fill="#073d35"/><g transform="translate(76 76) scale(2.8)">' + glyph() + '</g>'
(OUT / 'app-icon-maskable.svg').write_text(svg(maskable, 512, 512, 'Fullview Signature maskable app icon'))
favicon = '<rect width="128" height="128" rx="27" fill="#073d35"/>' + glyph()
(ROOT / 'public/favicon.svg').write_text(svg(favicon, 128, 128, 'Fullview Signature'))

background = OUT / 'perspective-master.png'
if background.exists():
    embedded = base64.b64encode(background.read_bytes()).decode()
    body = f'<rect width="1200" height="630" fill="#042820"/><image href="data:image/png;base64,{embedded}" width="1200" height="630" preserveAspectRatio="xMidYMid slice"/>'
    body += '<defs><linearGradient id="shade"><stop stop-color="#031f1d" stop-opacity=".45"/><stop offset=".53" stop-color="#031f1d" stop-opacity=".10"/><stop offset=".7" stop-color="#031f1d" stop-opacity="0"/></linearGradient></defs><rect width="1200" height="630" fill="url(#shade)"/>'
    body += '<g transform="translate(60 47) scale(.72)">' + glyph() + '</g>'
    body += word('BY AVALON GROUP', 171, 99, 17, 'sans', GOLD, 2.0)[0]
    body += word('Fullview', 62, 293, 118, 'serif', IVORY, -1.3)[0]
    body += word('SIGNATURE', 73, 356, 37, 'sans', GOLD, 9)[0]
    body += word('Research. In full view.', 71, 474, 29, 'sans', IVORY, -.5)[0]
    body += '<path d="M72 521H462" stroke="#d5b16d" stroke-opacity=".5"/>'
    body += word('100 SPECIALIST SERVICES', 72, 554, 13, 'semibold', '#d3dfd4', 1.5)[0]
    body += word('GHANA & BEYOND', 72, 580, 13, 'sans', '#b4c9bc', 1.5)[0]
    (OUT / 'og-master.svg').write_text(svg(body, 1200, 630, 'Fullview Signature — by Avalon Group. Research. In full view.'))

manifest = {
    'id': '/', 'name': 'Fullview Signature — by Avalon Group', 'short_name': 'Fullview',
    'description': 'Explore research services, build an estimate and see the fuller picture.',
    'start_url': '/?source=pwa', 'scope': '/', 'display': 'standalone',
    'background_color': '#f7f4ec', 'theme_color': INK, 'lang': 'en',
    'categories': ['education', 'business', 'productivity'],
    'icons': [
        {'src': '/brand/icon-192.png?v=panorama-2', 'sizes': '192x192', 'type': 'image/png', 'purpose': 'any'},
        {'src': '/brand/icon-512.png?v=panorama-2', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'any'},
        {'src': '/brand/icon-maskable-512.png?v=panorama-2', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'maskable'},
    ],
    'shortcuts': [
        {'name': 'Explore services', 'short_name': 'Services', 'url': '/services', 'icons': [{'src': '/brand/icon-192.png?v=panorama-2', 'sizes': '192x192'}]},
        {'name': 'Services and pricing', 'short_name': 'Pricing', 'url': '/pricing', 'icons': [{'src': '/brand/icon-192.png?v=panorama-2', 'sizes': '192x192'}]},
        {'name': 'Your research desk', 'short_name': 'Research desk', 'url': '/workspace', 'icons': [{'src': '/brand/icon-192.png?v=panorama-2', 'sizes': '192x192'}]},
    ],
}
(ROOT / 'public/manifest.webmanifest').write_text(json.dumps(manifest, indent=2) + '\n')
print('Created vector logo masters, monogram, icon sources and PWA manifest.')
