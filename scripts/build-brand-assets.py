"""Build the Perspective identity with outlined OFL typography and original vectors."""
from pathlib import Path
import base64
import json
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/brand'
FONTS = {name: TTFont(ROOT / 'public/fonts' / file) for name, file in {
    'display': 'instrument-serif-regular.ttf',
    'italic': 'instrument-serif-italic.ttf',
    'sans': 'dm-sans-regular.ttf',
    'semibold': 'dm-sans-semibold.ttf',
}.items()}
INK, IVORY, GOLD = '#073d35', '#fff9ec', '#d6b270'
VERSION = 'perspective-4'


def word(text, x, y, size, font='sans', fill=INK, spacing=0):
    face = FONTS[font]
    glyphs, cmap = face.getGlyphSet(), face.getBestCmap()
    scale = size / face['head'].unitsPerEm
    pieces, cursor = [], x
    for char in text:
        name = cmap.get(ord(char), '.notdef')
        pen = SVGPathPen(glyphs)
        glyphs[name].draw(pen)
        if path := pen.getCommands():
            pieces.append(f'<path fill="{fill}" transform="translate({cursor:.3f} {y}) scale({scale:.7f} {-scale:.7f})" d="{path}"/>')
        cursor += face['hmtx'][name][0] * scale + spacing
    return ''.join(pieces), cursor - x


def svg(body, width, height, title):
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img" aria-label="{title}"><title>{title}</title>{body}</svg>'


def emblem(fill=INK, accent=GOLD):
    # F's horizontal strokes open into a sweeping V, a wider perspective.
    f = word('F', 5, 152, 181, 'display', fill)[0]
    v = f'<path fill="{fill}" d="M45 72H68L91 143C106 98 120 51 151 22C142 48 126 97 99 171H88Z"/>'
    ray = f'<path fill="{accent}" d="M95 120C102 66 123 21 157 17C132 28 112 71 95 120Z"/>'
    return f + v + ray


def wordmark(fill=INK, secondary='#5c7068', with_byline=True):
    first, width = word('Fullview', 4, 94, 112, 'display', fill, -1.7)
    second, width2 = word('Signature', width + 16, 94, 106, 'italic', fill, -1.4)
    body = first + second
    if with_byline:
        body += word('by Avalon Group', 8, 151, 29, 'sans', secondary, .15)[0]
    return body, round(width + width2 + 34)


for light in [False, True]:
    label = 'light' if light else 'dark'
    fill = IVORY if light else INK
    secondary = '#c3d0c5' if light else '#5c7068'
    body, width = wordmark(fill, secondary)
    (OUT / f'wordmark-{label}.svg').write_text(svg(body, width, 169, 'Fullview Signature — by Avalon Group'))
    lockup = '<g transform="translate(0 2) scale(.96)">' + emblem(fill, GOLD if light else '#b48942') + '</g>'
    lockup += '<g transform="translate(190 0)">' + body + '</g>'
    (OUT / f'logo-{label}.svg').write_text(svg(lockup, width + 190, 174, 'Fullview Signature — by Avalon Group'))

(OUT / 'monogram.svg').write_text(svg(emblem(INK, '#b48942'), 180, 180, 'Fullview Signature FV ligature'))
tile = '<rect width="512" height="512" fill="#073d35"/><g transform="translate(52 38) scale(2.28)">' + emblem(IVORY, GOLD) + '</g>'
maskable = '<rect width="512" height="512" fill="#073d35"/><g transform="translate(89 76) scale(1.85)">' + emblem(IVORY, GOLD) + '</g>'
(OUT / 'app-icon.svg').write_text(svg(tile, 512, 512, 'Fullview Signature app icon'))
(OUT / 'app-icon-maskable.svg').write_text(svg(maskable, 512, 512, 'Fullview Signature maskable app icon'))
favicon = '<rect width="128" height="128" rx="26" fill="#073d35"/><g transform="translate(13 9.5) scale(.57)">' + emblem(IVORY, GOLD) + '</g>'
(ROOT / 'public/favicon.svg').write_text(svg(favicon, 128, 128, 'Fullview Signature'))

background = OUT / 'perspective-v4-photograph.png'
if background.exists():
    embedded = base64.b64encode(background.read_bytes()).decode()
    body = f'<rect width="1200" height="630" fill="{INK}"/><image href="data:image/png;base64,{embedded}" width="1200" height="630" preserveAspectRatio="xMidYMid slice"/>'
    logo, _ = wordmark(IVORY, '#d5ded5')
    body += '<g transform="translate(62 42) scale(.77)">' + logo + '</g>'
    body += word('Research.', 66, 337, 110, 'display', IVORY, -1.4)[0]
    body += word('In full view.', 63, 435, 105, 'italic', IVORY, -1.2)[0]
    body += '<path d="M66 483H102" stroke="#d6b270" stroke-width="2"/>'
    body += word('Clarity for your next big question.', 116, 490, 22, 'sans', '#dce4d9', -.25)[0]
    body += word('GHANA & BEYOND', 66, 572, 14, 'semibold', '#d6b270', 1.25)[0]
    body += word('fvsignature.com', 407, 572, 18, 'sans', '#dce4d9')[0]
    (OUT / 'og-master.svg').write_text(svg(body, 1200, 630, 'Fullview Signature — by Avalon Group. Research. In full view.'))

manifest_path = ROOT / 'public/manifest.webmanifest'
manifest = json.loads(manifest_path.read_text())
for icon in manifest['icons']:
    icon['src'] = icon['src'].split('?')[0] + '?v=' + VERSION
for shortcut in manifest.get('shortcuts', []):
    for icon in shortcut.get('icons', []):
        icon['src'] = icon['src'].split('?')[0] + '?v=' + VERSION
manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
print('Built Perspective wordmarks, FV ligature, social card and app icon sources.')
