"""Generates the extension icon set (rounded-square gradient + notched ring mark)."""
import zlib, struct, math, os

INDIGO = (99, 102, 241)
CYAN = (34, 211, 238)


def lerp(a, b, t):
    return tuple(a[i] + (b[i] - a[i]) * t for i in range(3))


def render(size, ss=4):
    S = size * ss
    cx = cy = S / 2
    r_corner = S * 0.235
    ring_o, ring_i = S * 0.335, S * 0.205
    dot_a = math.radians(-52)
    dx, dy = cx + math.cos(dot_a) * S * 0.272, cy + math.sin(dot_a) * S * 0.272
    dot_r = S * 0.098
    grid = []
    for y in range(S):
        row = []
        for x in range(S):
            fx, fy = x + 0.5, y + 0.5
            qx = max(abs(fx - cx) - (S / 2 - r_corner), 0.0)
            qy = max(abs(fy - cy) - (S / 2 - r_corner), 0.0)
            if math.hypot(qx, qy) > r_corner:
                row.append((0, 0, 0, 0))
                continue
            t = (fx / S) * 0.45 + (1 - fy / S) * 0.55
            base = lerp(CYAN, INDIGO, max(0.0, min(1.0, t)))
            d = math.hypot(fx - cx, fy - cy) / (S / 2)
            base = lerp(base, (255, 255, 255), max(0.0, 0.10 * (1 - d)))
            dring = math.hypot(fx - cx, fy - cy)
            ang = math.atan2(fy - cy, fx - cx)
            in_gap = abs(((ang - dot_a + math.pi) % (2 * math.pi)) - math.pi) < math.radians(32)
            ink = (ring_i <= dring <= ring_o and not in_gap) or math.hypot(fx - dx, fy - dy) <= dot_r
            col = (255, 255, 255) if ink else base
            row.append((int(col[0]), int(col[1]), int(col[2]), 255))
        grid.append(row)

    out = bytearray()
    n = ss * ss
    for y in range(size):
        out.append(0)
        for x in range(size):
            r = g = b = a = 0
            for j in range(ss):
                for i in range(ss):
                    p = grid[y * ss + j][x * ss + i]
                    r += p[0] * p[3]
                    g += p[1] * p[3]
                    b += p[2] * p[3]
                    a += p[3]
            if a == 0:
                out += bytes((0, 0, 0, 0))
            else:
                out += bytes((round(r / a), round(g / a), round(b / a), round(a / n)))
    return bytes(out)


def write_png(path, size):
    raw = render(size)

    def chunk(tag, data):
        body = tag + data
        return struct.pack('>I', len(data)) + body + struct.pack('>I', zlib.crc32(body) & 0xFFFFFFFF)

    ihdr = struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)
    blob = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', ihdr) + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b'')
    with open(path, 'wb') as fh:
        fh.write(blob)
    print(path, f'{size}px', len(blob), 'bytes')


if __name__ == '__main__':
    root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', 'assets', 'icons')
    for s in (16, 32, 48, 128, 256):
        write_png(os.path.join(root, f'icon-{s}.png'), s)
