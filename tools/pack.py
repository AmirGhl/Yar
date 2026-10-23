"""
Zips only the files the extension actually ships, into dist/yar-<version>.zip.

    python tools/pack.py
"""
import json
import os
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INCLUDE = ('manifest.json', '_locales', 'src')
SKIP_SUFFIXES = ('.map',)


def iter_files():
    for entry in INCLUDE:
        path = os.path.join(ROOT, entry)
        if os.path.isfile(path):
            yield path
            continue
        for base, _dirs, names in os.walk(path):
            for name in names:
                if name.endswith(SKIP_SUFFIXES):
                    continue
                yield os.path.join(base, name)


def main():
    with open(os.path.join(ROOT, 'manifest.json'), encoding='utf-8') as fh:
        version = json.load(fh)['version']

    dist = os.path.join(ROOT, 'dist')
    os.makedirs(dist, exist_ok=True)
    target = os.path.join(dist, f'yar-{version}.zip')

    count = 0
    with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for path in iter_files():
            archive.write(path, os.path.relpath(path, ROOT).replace(os.sep, '/'))
            count += 1

    print(f'{count} files -> {target} ({os.path.getsize(target) // 1024} KB)')


if __name__ == '__main__':
    main()
