"""Original analytic studio panorama, encoded as Radiance RGBE (no external art)."""
import math
from pathlib import Path

WIDTH, HEIGHT = 512, 256


def dot(a, b):
    return sum(x * y for x, y in zip(a, b))


def unit(v):
    length = math.sqrt(dot(v, v))
    return tuple(x / length for x in v)


def cross(a, b):
    return (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])


def panel(direction, width, height, power, tint):
    normal = unit(direction)
    right = unit(cross((0, 1, 0), normal))
    up = unit(cross(normal, right))
    return normal, right, up, math.tan(math.radians(width / 2)), math.tan(math.radians(height / 2)), power, tint


PANELS = [
    panel((-0.60, 0.50, -0.70), 36, 66, 2.5, (1.0, 0.98, 0.95)),
    panel((0.65, 0.30, -0.70), 40, 58, 1.0, (0.95, 0.98, 1.0)),
    panel((0.20, 0.50, 0.84), 18, 64, 1.4, (0.97, 0.99, 1.0)),
    panel((0.0, 0.98, -0.20), 58, 38, 0.9, (1.0, 1.0, 1.0)),
]


def smooth(value):
    value = max(0.0, min(1.0, value))
    return value * value * (3 - 2 * value)


def radiance(direction):
    background = 0.08 + 0.14 * smooth((direction[1] + 1) / 2)
    color = [background] * 3
    for normal, right, up, half_width, half_height, power, tint in PANELS:
        facing = dot(direction, normal)
        if facing <= 0:
            continue
        x = abs(dot(direction, right) / facing) / half_width
        y = abs(dot(direction, up) / facing) / half_height
        intensity = power * smooth((1 - x) / 0.18) * smooth((1 - y) / 0.16)
        for channel in range(3):
            color[channel] += intensity * tint[channel]
    return color


def rgbe(color):
    largest = max(color)
    if largest < 1e-32:
        return (0, 0, 0, 0)
    mantissa, exponent = math.frexp(largest)
    scale = mantissa * 256 / largest
    return tuple(min(255, int(value * scale)) for value in color) + (exponent + 128,)


def encode_channel(values):
    encoded = bytearray()
    index = 0
    while index < len(values):
        end = index + 1
        while end < len(values) and end - index < 127 and values[end] == values[index]:
            end += 1
        if end - index >= 4:
            encoded.extend((128 + end - index, values[index]))
            index = end
            continue
        start = index
        index += 1
        while index < len(values) and index - start < 128:
            run = index + 1
            while run < len(values) and run - index < 4 and values[run] == values[index]:
                run += 1
            if run - index >= 4:
                break
            index += 1
        encoded.append(index - start)
        encoded.extend(values[start:index])
    return encoded


output = bytearray(f"#?RADIANCE\n# Original Mighty Star neutral studio\nFORMAT=32-bit_rle_rgbe\n\n-Y {HEIGHT} +X {WIDTH}\n".encode())
for y in range(HEIGHT):
    theta = math.pi * (y + 0.5) / HEIGHT
    row = []
    for x in range(WIDTH):
        phi = 2 * math.pi * ((x + 0.5) / WIDTH - 0.5)
        direction = (math.sin(theta) * math.cos(phi), math.cos(theta), math.sin(theta) * math.sin(phi))
        row.append(rgbe(radiance(direction)))
    output.extend((2, 2, WIDTH >> 8, WIDTH & 255))
    for channel in range(4):
        output.extend(encode_channel([pixel[channel] for pixel in row]))
target = Path(__file__).with_name("studio-neutral.hdr")
target.write_bytes(output)
print(f"Wrote {target.name}: {WIDTH}×{HEIGHT}, {len(output)} bytes")
