# -*- coding: utf-8 -*-
"""Run an unchanged SDLPal function with a minimal surface and two owned byte vectors."""
import gzip
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile

root = Path(__file__).resolve().parents[5]
out = Path(__file__).resolve().parent
primary = root / 'reference/sdlpal/palcommon.c'
source = primary.read_text()
start = source.index('INT\nPAL_RLEBlitToSurfaceWithShadow(')
end = source.index('\nINT\nPAL_RLEBlitWithColorShift(', start)
function = source[start:end]
shadow = source[source.index('PAL_FORCE_INLINE\nBYTE\nPAL_CalcShadowColor('):source.index('INT\nPAL_RLEBlitToSurface(')]
types = r'''
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
typedef int INT, BOOL;
typedef unsigned int UINT;
typedef unsigned char BYTE, *LPBYTE;
typedef const unsigned char *LPCBITMAPRLE;
typedef uint32_t PAL_POS;
typedef int16_t SHORT;
#define PAL_FORCE_INLINE static inline
#define PAL_X(xy) (SHORT)((xy) & 0xFFFF)
#define PAL_Y(xy) (SHORT)(((xy) >> 16) & 0xFFFF)
typedef struct { int w, h, pitch; void *pixels; } SDL_Surface;
'''
driver = r'''
int main(int argc, char **argv) {
  if (argc != 3) return 2;
  FILE *file = fopen(argv[1], "rb");
  if (!file || fseek(file, 0, SEEK_END)) return 3;
  long length = ftell(file);
  if (length < 4 || fseek(file, 0, SEEK_SET)) return 4;
  BYTE *bytes = malloc((size_t)length);
  if (!bytes || fread(bytes, 1, (size_t)length, file) != (size_t)length) return 5;
  fclose(file);
  int width = bytes[0] | (bytes[1] << 8);
  int height = bytes[2] | (bytes[3] << 8);
  size_t count = (size_t)width * (size_t)height;
  BYTE *pixels = malloc(count);
  if (!pixels) return 6;
  memset(pixels, 0xEE, count);
  SDL_Surface surface = { width, height, width, pixels };
  int result = PAL_RLEBlitToSurfaceWithShadow(bytes, &surface, 0, 0);
  file = fopen(argv[2], "wb");
  if (!file || fwrite(pixels, 1, count, file) != count) return 7;
  fclose(file);
  size_t mismatch = 0;
  for (size_t i = 0; i < count; i++) if (pixels[i] != 0x11) mismatch++;
  printf("{\"status\":%d,\"width\":%d,\"height\":%d,\"pixels\":%zu,\"mismatch\":%zu}\n",
         result, width, height, count, mismatch);
  free(pixels);
  free(bytes);
  return result != 0 || mismatch != 0;
}
'''
sha = lambda value: hashlib.sha256(value).hexdigest()
runs = []


def run(label, command):
    result = subprocess.run(command, cwd=root, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    gzip.open(out / (label + '.raw.gz'), 'wb').write(result.stdout)
    runs.append({'label': label, 'command': [str(part) for part in command],
                 'cwd': str(root), 'exit': result.returncode,
                 'rawSha256': sha(result.stdout)})
    if result.returncode:
        raise RuntimeError(label + ': ' + result.stdout.decode(errors='replace'))
    return result.stdout


with tempfile.TemporaryDirectory(prefix='type-pal-rle-primary-') as directory:
    temporary = Path(directory)
    c_file = temporary / 'primary.c'
    c_file.write_text(types + shadow + function + driver)
    binary = temporary / 'primary'
    run('native-compile', ['cc', '-std=c11', '-O0', '-g', '-Werror', '-fsanitize=address',
                           str(c_file), '-o', str(binary)])
    cases = {'high-literal': bytes([2, 0, 66, 0, 132] + [17] * 132),
             'split-control': bytes([2, 0, 66, 0, 127] + [17] * 127 + [5] + [17] * 5)}
    results = {}
    for label, frame in cases.items():
        frame_path = temporary / (label + '.rle')
        frame_path.write_bytes(frame)
        pixels_path = temporary / (label + '.pixels')
        native = json.loads(run(label + '-native', [str(binary), str(frame_path), str(pixels_path)]))
        assert native == {'status': 0, 'width': 2, 'height': 66, 'pixels': 132, 'mismatch': 0}
        assert pixels_path.read_bytes() == bytes([17] * 132)
        code = """
import { readFileSync } from 'node:fs';
import { decodeRle, parseSpriteChunkStrict } from './packages/shared/src/rle.ts';
const bytes = new Uint8Array(readFileSync(process.argv[1]));
const summarize = (action) => { try { const frame = action(); return { ok: true, width: frame.width,
 height: frame.height, pixels: [...frame.pixels], opaque: [...frame.opaque] }; }
 catch (reason) { return { ok: false, error: reason.message }; } };
const chunk = new Uint8Array(2 + bytes.length + bytes.length % 2); chunk.set([1,0]); chunk.set(bytes,2);
console.log(JSON.stringify({ generic: summarize(() => decodeRle(bytes)),
 strict: summarize(() => parseSpriteChunkStrict(chunk)[0]) }));
"""
        ts = json.loads(run(label + '-ts', ['pnpm', 'exec', 'tsx', '--eval', code, str(frame_path)]))
        for result in ts.values():
            if label == 'high-literal':
                assert result == {'ok': False, 'error': 'RLE: pixel run exceeds frame'} or result == {
                    'ok': False, 'error': 'sprite chunk frame 0 像素段越界'}
            else:
                assert result == {'ok': True, 'width': 2, 'height': 66,
                                  'pixels': [17] * 132, 'opaque': [1] * 132}
        results[label] = {'frameHex': frame.hex(), 'frameSha256': sha(frame),
                          'native': native, 'ts': ts}

assert primary.read_text() == source
(out / 'primary-probe.json').write_text(json.dumps({
    'primary': str(primary.relative_to(root)), 'primarySha256': sha(source.encode()),
    'extractedFunctionSha256': sha(function.encode()),
    'functionUnmodified': True, 'nativeSurface': '2x66 unclipped surface, shadow=false',
    'limits': 'SDLPal source executed; pal.exe not executed; synthetic bytes, not a shipped-asset census',
    'runs': runs, 'cases': results, 'temporaryDirectoryRemoved': not temporary.exists(),
}, indent=2) + '\n')
print('Unchanged SDLPal function accepts both vectors; TS generic/strict reject only high literal.')
