# -*- coding: utf-8 -*-
"""Compare real YJ2 chunks with unchanged SDLPal C and derive an independent raw oracle."""
import gzip
import hashlib
import json
from pathlib import Path
import struct
import subprocess
import sys
import tempfile

root = Path(__file__).resolve().parents[5]
out = Path(__file__).resolve().parent
sha = lambda data: hashlib.sha256(data).hexdigest()
primary = root / 'reference/sdlpal/yj1.c'
source = primary.read_text()
body = source[source.index('typedef struct _YJ2_TreeNode'):source.index('INT (*Decompress)')]
assert sys.byteorder == 'little'
prefix = '''
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <limits.h>
typedef int INT;
typedef const void *LPCVOID;
typedef void *LPVOID;
#define SDL_SwapLE32(value) (value)
'''
driver = '''
int main(int argc, char **argv) {
 if (argc != 3) return 2;
 FILE *input=fopen(argv[1],"rb"), *output=fopen(argv[2],"wb");
 if (!input || !output) return 3;
 uint32_t header[2]; size_t got;
 while ((got=fread(header,1,8,input)) != 0) {
  if (got != 8 || header[1] > INT_MAX) return 4;
  unsigned char *compressed=malloc(header[0]);
  unsigned char *pixels=calloc(header[1] ? header[1] : 1,1);
  if (!compressed || !pixels || fread(compressed,1,header[0],input)!=header[0]) return 5;
  if (YJ2_Decompress(compressed,pixels,(int)header[1])!=(int)header[1]) return 6;
  if (fwrite(header+1,1,4,output)!=4 || fwrite(pixels,1,header[1],output)!=header[1]) return 7;
  free(compressed);free(pixels);
 }
 fclose(input);fclose(output);return 0;
}
'''
node = r'''
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { openMkf, readChunk, chunkCount } from './packages/shared/src/mkf.ts';
import { decompressYj2 } from './packages/shared/src/yj2.ts';
const directory=process.argv[1], sha=(bytes)=>createHash('sha256').update(bytes).digest('hex');
const samples=[],stream=[],expected=[],archives=[];
function sample(family,index,compressed) {
 if(!compressed.length) return;
 const output=decompressYj2(compressed),header=Buffer.alloc(8),size=Buffer.alloc(4);
 header.writeUInt32LE(compressed.length);header.writeUInt32LE(output.length,4);size.writeUInt32LE(output.length);
 stream.push(header,compressed);expected.push(size,output);
 samples.push({family,index,compressedSha256:sha(compressed),outputBytes:output.length,outputSha256:sha(output)});
}
for(const family of ['ABC','F','FBP','FIRE','MAP','MGO']) {
 const bytes=new Uint8Array(readFileSync('data/raw/'+family+'.MKF')),mkf=openMkf(bytes);
 archives.push({family,sha256:sha(bytes)});
 for(let index=0;index<chunkCount(mkf);index++)sample(family,index,readChunk(mkf,index));
}
const raw=new Uint8Array(readFileSync('data/raw/RNG.MKF')),rng=openMkf(raw);archives.push({family:'RNG',sha256:sha(raw)});
for(let animation=0;animation<chunkCount(rng);animation++) {
 const chunk=readChunk(rng,animation);if(!chunk.length)continue;const nested=openMkf(chunk);
 for(let index=0;index<chunkCount(nested);index++)sample('RNG/'+animation,index,readChunk(nested,index));
}
writeFileSync(join(directory,'samples.input'),Buffer.concat(stream));
writeFileSync(join(directory,'samples.expected'),Buffer.concat(expected));
console.log(JSON.stringify({samples,archives}));
'''
runs = []


def run(label, command):
    result = subprocess.run(command, cwd=root, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    gzip.open(out / (label + '.raw.gz'), 'wb').write(result.stdout)
    runs.append({'label': label, 'command': [str(part) for part in command], 'cwd': str(root),
                 'exit': result.returncode, 'rawSha256': sha(result.stdout)})
    if result.returncode:
        raise RuntimeError(label + ': ' + result.stdout.decode(errors='replace'))
    return result.stdout


with tempfile.TemporaryDirectory(prefix='type-pal-yj2-primary-') as directory:
    temporary = Path(directory)
    c_file = temporary / 'yj2-primary.c'
    c_file.write_text(prefix + body + driver)
    binary = temporary / 'yj2-primary'
    run('native-compile', ['cc', '-std=c11', '-O0', '-Werror', '-fsanitize=address', str(c_file), '-o', str(binary)])
    results = json.loads(run('raw-node', ['pnpm', 'exec', 'tsx', '--eval', node, directory]))
    native_path = temporary / 'samples.native'
    run('native-decode', [str(binary), str(temporary / 'samples.input'), str(native_path)])
    native = native_path.read_bytes()
    expected = (temporary / 'samples.expected').read_bytes()
    assert native == expected
    position = 0
    cohort = hashlib.sha256()
    cohort_indices = []
    for sample in results['samples']:
        length = struct.unpack_from('<I', native, position)[0]
        position += 4
        pixels = native[position:position + length]
        position += length
        assert length == sample['outputBytes'] and sha(pixels) == sample['outputSha256']
        sample['nativeByteIdentical'] = True
        if sample['family'] == 'MGO' and 1 <= sample['index'] <= 20:
            cohort.update(struct.pack('<II', sample['index'], length))
            cohort.update(pixels)
            cohort_indices.append(sample['index'])
    assert position == len(native) and cohort_indices == list(range(1, 21))
    results.update({'nativeStreamSha256': sha(native), 'mgoFirst20Digest': cohort.hexdigest(),
                    'cohortIndices': cohort_indices})
for archive in results['archives']:
    assert sha((root / 'data/raw' / (archive['family'] + '.MKF')).read_bytes()) == archive['sha256']
assert primary.read_text() == source
results.update({'primarySha256': sha(source.encode()), 'extractedBodySha256': sha(body.encode()),
                'primaryUnmodified': True, 'runs': runs, 'temporaryDirectoryRemoved': not temporary.exists(),
                'limits': 'Real nonempty raw chunks only; no malformed synthetic input sent to unbounded C. SDLPal verified, pal.exe not executed; no product or generated assets changed.'})
(out / 'native-proof.json').write_text(json.dumps(results, indent=2) + '\n')
print('native-identical chunks/bytes:', len(results['samples']), sum(item['outputBytes'] for item in results['samples']))
print('independent MGO1..20 digest:', results['mgoFirst20Digest'])
