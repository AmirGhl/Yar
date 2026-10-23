"""
Lists JS modules under src/ that nothing imports — usually leftovers from a refactor.

    python tools/check-orphans.py
"""
import io
import os

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
ENTRY_POINTS = {'newtab.js', 'popup.js', 'service-worker.js'}


def main():
    sources = {}
    for base, _dirs, names in os.walk(os.path.join(ROOT, 'src')):
        for name in names:
            if name.endswith('.js'):
                path = os.path.join(base, name)
                sources[path] = io.open(path, encoding='utf-8').read()

    everything = '\n'.join(sources.values())
    orphans = []
    for path in sources:
        name = os.path.basename(path)
        if name in ENTRY_POINTS:
            continue
        if f"/{name}'" not in everything and f'/{name}"' not in everything:
            orphans.append(os.path.relpath(path, ROOT).replace(os.sep, '/'))

    print('\n'.join(orphans) if orphans else 'no orphaned modules')
    return 1 if orphans else 0


if __name__ == '__main__':
    raise SystemExit(main())
