"""Verify unique service photograph files and prepare a visual-review contact sheet."""
from pathlib import Path
from hashlib import sha256
import json
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parents[1]
manifests = sorted((root / 'design').glob('photo-batch-*.json'))
records = []
for path in manifests:
    data = json.loads(path.read_text())
    records.extend(data if isinstance(data, list) else data['assets'])
assert len(records) == 101, f'Expected 100 service photographs plus one gallery hero, found {len(records)}'
assert len({a['src'] for a in records}) == 101, 'Hero photograph must not repeat a service photograph'
service_records = sorted((a for a in records if a['id'] != 'gallery-hero'), key=lambda a: a['index'])
assert len(service_records) == 100, f'Expected 100 service photographs, found {len(service_records)}'
assert len({a['id'] for a in service_records}) == 100, 'Duplicate service asset IDs'
assert len({a['src'] for a in service_records}) == 100, 'Repeated service image paths'
assert len({a['source'] for a in service_records}) == 100, 'Every service must originate from its own generation'
assert len({a['prompt'] for a in service_records}) == 100, 'Every service must have a distinct art direction prompt'
hashes = []
fingerprints = []
for asset in service_records:
    path = root / 'public' / asset['src'].lstrip('/')
    assert path.is_file(), f'Missing photograph {asset["id"]}'
    with Image.open(path) as im:
        assert im.size == (1200, 800), f'Unexpected image dimensions {asset["id"]}: {im.size}'
        assert im.format == 'WEBP', f'Expected WebP: {asset["id"]}'
        gray_image = im.convert('L').resize((9, 8))
        gray = [gray_image.getpixel((x, y)) for y in range(8) for x in range(9)]
        bits = sum((gray[y * 9 + x] > gray[y * 9 + x + 1]) << (y * 8 + x) for y in range(8) for x in range(8))
        fingerprints.append((asset['id'], bits))
    digest = sha256(path.read_bytes()).hexdigest()
    hashes.append(digest)
    assert digest == asset['sha256'], f'Artwork changed after review: {asset["id"]}'
    assert asset.get('alt') and len(asset['alt']) > 25, f'Missing descriptive alt: {asset["id"]}'
assert len(set(hashes)) == 100, 'Duplicate image content'
hero = next(a for a in records if a['id'] == 'gallery-hero')
assert sha256((root / 'public' / hero['src'].lstrip('/')).read_bytes()).hexdigest() not in hashes, 'The gallery hero must use its own photograph'

closest = sorted(( (a ^ b).bit_count(), name_a, name_b) for i, (name_a, a) in enumerate(fingerprints) for name_b, b in fingerprints[i + 1:])[:12]
font_path = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
font = ImageFont.truetype(font_path, 16)
review_dir = root / 'design' / 'photography-review'
review_dir.mkdir(exist_ok=True)
for page in range(5):
    sheet = Image.new('RGB', (1400, 900), '#f8f6f1')
    draw = ImageDraw.Draw(sheet)
    for slot, asset in enumerate(service_records[page * 20:(page + 1) * 20]):
        x, y = (slot % 5) * 280, (slot // 5) * 225
        with Image.open(root / 'public' / asset['src'].lstrip('/')) as image:
            sheet.paste(image.resize((274, 183), Image.Resampling.LANCZOS), (x + 3, y + 3))
        title = f'{asset["index"] + 1:02}  {asset["id"]}'
        draw.text((x + 7, y + 193), title[:30], fill='#183d32', font=font)
    sheet.save(review_dir / f'collection-{page + 1}.jpg', quality=90)
report = {'result': 'PASS', 'service_photographs': 100, 'unique_paths': 100, 'unique_hashes': len(set(hashes)), 'dimensions': '1200x800', 'closest_visual_fingerprints_for_manual_review': closest}
(review_dir / 'verification.json').write_text(json.dumps(report, indent=2))
print(json.dumps(report, indent=2))
