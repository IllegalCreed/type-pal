# -*- coding: utf-8 -*-
"""Compare current MKF slices and RNG delta planes with independent/raw primary evidence."""
import gzip
import hashlib
import json
from pathlib import Path
import struct
import subprocess
import tempfile

root = Path(__file__).resolve().parents[5]
out = Path(__file__).resolve().parent
sha = lambda data: hashlib.sha256(data).hexdigest()
source = (root / 'reference/sdlpal/rngplay.c').read_text()
start = source.index('static INT\nPAL_RNGBlitToSurface(')
function = source[start:source.index('\nVOID\nPAL_RNGPlay(', start)]
prefix = '''
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
typedef int INT;
typedef unsigned char *LPBYTE;
typedef struct { int w, h, pitch; void *pixels; } SDL_Surface;
'''
driver = '''
int main(int argc, char **argv) {
 if (argc != 3) return 2;
 FILE *input=fopen(argv[1],"rb"), *output=fopen(argv[2],"wb");
 if (!input || !output) return 3;
 uint8_t pixels[64000]={0}; SDL_Surface surface={320,200,320,pixels};
 uint8_t header[8]; size_t read;
 while ((read=fread(header,1,8,input)) != 0) {
  if (read != 8) return 4;
  uint32_t size=(uint32_t)header[4]|((uint32_t)header[5]<<8)|((uint32_t)header[6]<<16)|((uint32_t)header[7]<<24);
  uint8_t *payload=malloc(size ? size : 1);
  if (!payload || fread(payload,1,size,input) != size) return 5;
  if (PAL_RNGBlitToSurface(payload,(int)size,&surface) != 0) return 6;
  free(payload);
  if (fwrite(header,1,4,output)!=4 || fwrite(pixels,1,64000,output)!=64000) return 7;
 }
 fclose(input); fclose(output); return 0;
}
'''
node = r'''
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { openMkf, readChunk, chunkCount } from './packages/shared/src/mkf.ts';
import { decodeRngFrames } from './packages/shared/src/rng.ts';
import { decompressYj2 } from './packages/shared/src/yj2.ts';
const directory=process.argv[1], digest=(bytes)=>createHash('sha256').update(bytes).digest('hex');
const archives=[];
for(const name of readdirSync('data/raw').filter((name)=>name.toLowerCase().endsWith('.mkf')).sort()) {
 const bytes=new Uint8Array(readFileSync(join('data/raw',name))), mkf=openMkf(bytes), hash=createHash('sha256');
 for(let index=0;index<chunkCount(mkf);index++) {
  const chunk=readChunk(mkf,index), size=Buffer.alloc(4); size.writeUInt32LE(chunk.length);
  hash.update(size); hash.update(chunk);
 }
 archives.push({name,inputSha256:digest(bytes),chunks:chunkCount(mkf),chunkStreamSha256:hash.digest('hex')});
}
const raw=new Uint8Array(readFileSync('data/raw/RNG.MKF')), mkf=openMkf(raw), animations=[];
for(let animation=0;animation<chunkCount(mkf);animation++) {
 const bytes=readChunk(mkf,animation), frames=decodeRngFrames(bytes), stream=[], expected=[];
 if(bytes.length) {
  const nested=openMkf(bytes);
  for(let index=0;index<chunkCount(nested);index++) {
   const compressed=readChunk(nested,index); if(!compressed.length) continue;
   let payload; try { payload=decompressYj2(compressed); } catch { continue; }
   const header=Buffer.alloc(8);header.writeUInt32LE(index);header.writeUInt32LE(payload.length,4);
   stream.push(header,payload);
  }
 }
 for(const frame of frames) {const index=Buffer.alloc(4);index.writeUInt32LE(frame.index);expected.push(index,frame.pixels);}
 const input=Buffer.concat(stream), output=Buffer.concat(expected);
 writeFileSync(join(directory,animation+'.input'),input);writeFileSync(join(directory,animation+'.expected'),output);
 animations.push({animation,frames:frames.length,inputSha256:digest(input),expectedSha256:digest(output)});
}
console.log(JSON.stringify({archives,animations}));
'''
runs = []


def run(label, command):
    result = subprocess.run(command, cwd=root, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    gzip.open(out / (label + '.raw.gz'), 'wb').write(result.stdout)
    runs.append({'label': label, 'command': [str(part) for part in command],
                 'cwd': str(root), 'exit': result.returncode, 'rawSha256': sha(result.stdout)})
    if result.returncode:
        raise RuntimeError(label + ': ' + result.stdout.decode(errors='replace'))
    return result.stdout


with tempfile.TemporaryDirectory(prefix='type-pal-code2-primary-') as directory:
    temporary = Path(directory)
    c_file = temporary / 'rng-primary.c'
    c_file.write_text(prefix + function + driver)
    binary = temporary / 'rng-primary'
    run('native-compile', ['cc', '-std=c11', '-O0', '-Werror', '-fsanitize=address', str(c_file), '-o', str(binary)])
    results = json.loads(run('raw-node', ['pnpm', 'exec', 'tsx', '--eval', node, directory]))
    for archive in results['archives']:
        raw = (root / 'data/raw' / archive['name']).read_bytes()
        assert sha(raw) == archive['inputSha256']
        first = struct.unpack_from('<I', raw)[0]
        offsets = struct.unpack_from('<' + 'I' * (first // 4), raw)
        assert len(offsets) - 1 == archive['chunks']
        stream = hashlib.sha256()
        for begin, end in zip(offsets, offsets[1:]):
            assert first <= begin <= end <= len(raw)
            stream.update(struct.pack('<I', end - begin))
            stream.update(raw[begin:end])
        assert stream.hexdigest() == archive['chunkStreamSha256']
        archive['independentRawSliceComparison'] = True
    for animation in results['animations']:
        index = str(animation['animation'])
        output = temporary / (index + '.native')
        run('native-animation-' + index, [str(binary), str(temporary / (index + '.input')), str(output)])
        native = output.read_bytes()
        expected = (temporary / (index + '.expected')).read_bytes()
        assert native == expected
        assert len(native) == animation['frames'] * 64004
        animation['nativeSha256'] = sha(native)
        animation['allFrameIndicesAndPixelsIdentical'] = True
assert (root / 'reference/sdlpal/rngplay.c').read_text() == source
results.update({'sourceSha256': sha(source.encode()), 'functionSha256': sha(function.encode()),
                'functionUnmodified': True, 'runs': runs, 'temporaryDirectoryRemoved': not temporary.exists(),
                'limits': 'SDLPal delta function with zero initial surface per animation and identical shared YJ2 payloads. Does not verify YJ2, pal.exe, rendering/timing, or generated assets.'})
(out / 'raw-primary-proof.json').write_text(json.dumps(results, indent=2) + '\n')
print('MKF archives/chunks:', len(results['archives']), sum(item['chunks'] for item in results['archives']))
print('RNG native-identical frames:', sum(item['frames'] for item in results['animations']))
