# -*- coding: utf-8 -*-
"""Derive frozen RGBA oracles from unchanged SDLPal functions and shipped raw inputs."""
import gzip
import hashlib
import json
from pathlib import Path
import struct
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[4]
OUT = Path(__file__).resolve().parent
primary = ROOT / 'reference/sdlpal/palcommon.c'
source = primary.read_text()
blit = source[source.index('INT\nPAL_RLEBlitToSurfaceWithShadow('):source.index('\nINT\nPAL_RLEBlitWithColorShift(')]
shadow = source[source.index('PAL_FORCE_INLINE\nBYTE\nPAL_CalcShadowColor('):source.index('INT\nPAL_RLEBlitToSurface(')]
sprite = source[source.index('LPCBITMAPRLE\nPAL_SpriteGetFrame('):source.index('\nINT\nPAL_MKFGetChunkCount(')]
yj_source = (ROOT / 'reference/sdlpal/yj1.c').read_text()
yj = yj_source[yj_source.index('typedef struct _YJ2_TreeNode'):yj_source.index('INT (*Decompress)')]
assert sys.byteorder == 'little'
types = r'''
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <limits.h>
typedef int INT, BOOL;
typedef unsigned int UINT;
typedef uint16_t WORD;
typedef unsigned char BYTE, *LPBYTE;
typedef const unsigned char *LPCBITMAPRLE, *LPCSPRITE;
typedef const void *LPCVOID;
typedef void *LPVOID;
typedef uint32_t PAL_POS;
typedef int16_t SHORT;
#define PAL_FORCE_INLINE static inline
#define PAL_X(xy) (SHORT)((xy) & 0xFFFF)
#define PAL_Y(xy) (SHORT)(((xy) >> 16) & 0xFFFF)
#define SDL_SwapLE32(value) (value)
typedef struct { int w, h, pitch; void *pixels; } SDL_Surface;
'''
driver = r'''
static uint16_t u16(const BYTE *p) { return p[0] | (p[1]<<8); }
static uint32_t u32(const BYTE *p) { return p[0] | (p[1]<<8) | (p[2]<<16) | ((uint32_t)p[3]<<24); }
int main(int argc,char **argv) {
 if(argc!=3) return 2;
 FILE *input=fopen(argv[1],"rb"),*output=fopen(argv[2],"wb");
 if(!input||!output) return 3;
 uint32_t packet[3];size_t got;
 while((got=fread(packet,1,12,input))!=0) {
  if(got!=12||packet[0]>4||packet[2]>20000000) return 4;
  uint32_t family=packet[0],chunk=packet[1],length=packet[2];
  BYTE *raw=malloc(length?length:1);if(!raw||fread(raw,1,length,input)!=length) return 5;
  if(!length){free(raw);continue;}
  BYTE *bytes=raw;
  if(family==4) {
   if(length<4) return 6;
   uint32_t size=u32(raw);if(!size||size>20000000) return 7;
   bytes=calloc(size,1);if(!bytes||YJ2_Decompress(raw,bytes,size)!=(int)size) return 8;
   length=size;
  }
  int group=family==0||family==1||family==4;
  if(length<2) return 9;
  uint32_t count=group?u16(bytes):1;
  if(group&&count*2>length) return 10;
  for(uint32_t slot=0;slot<count;slot++) {
   if(group&&u16(bytes+slot*2)==0) continue;
   const BYTE *frame=group?PAL_SpriteGetFrame(bytes,slot):bytes;
   if(!frame||frame<bytes||frame+4>bytes+length) return 11;
   const BYTE *header=frame;
   if(u32(header)==2) header+=4;
   if(header+4>bytes+length) return 12;
   uint32_t width=u16(header),height=u16(header+2);
   if(!width||!height||width>400||height>400) return 13;
   size_t size=(size_t)width*height;
   BYTE *dark=calloc(size,1),*light=malloc(size),*rgba=malloc(size*4);
   if(!dark||!light||!rgba) return 14;
   memset(light,255,size);
   SDL_Surface a={(int)width,(int)height,(int)width,dark};
   SDL_Surface b={(int)width,(int)height,(int)width,light};
   if(PAL_RLEBlitToSurfaceWithShadow(frame,&a,0,0)||PAL_RLEBlitToSurfaceWithShadow(frame,&b,0,0)) return 15;
   for(size_t pixel=0;pixel<size;pixel++) {
    int opaque=dark[pixel]==light[pixel];
    if(!opaque&&(dark[pixel]!=0||light[pixel]!=255)) return 16;
    rgba[pixel*4]=rgba[pixel*4+1]=rgba[pixel*4+2]=opaque?dark[pixel]:0;
    rgba[pixel*4+3]=opaque?255:0;
   }
   uint32_t record[]={family,chunk,slot,width,height};
   if(fwrite(record,1,20,output)!=20||fwrite(rgba,1,size*4,output)!=size*4) return 17;
   free(dark);free(light);free(rgba);
  }
  if(bytes!=raw)free(bytes);free(raw);
 }
 fclose(input);fclose(output);return 0;
}
'''


def sha(data):
    return hashlib.sha256(data).hexdigest()


def chunks(data):
    count = struct.unpack_from('<I', data)[0] // 4 - 1
    offsets = struct.unpack_from('<' + 'I' * (count + 1), data)
    assert offsets[0] == (count + 1) * 4 and offsets[-1] == len(data)
    assert all(a <= b for a, b in zip(offsets, offsets[1:]))
    return [data[a:b] for a, b in zip(offsets, offsets[1:])]


archives = {}
packets = []
families = ['DATA9', 'DATA10', 'RGM', 'BALL', 'FIRE']
for family in ('DATA', 'RGM', 'BALL', 'FIRE'):
    data = (ROOT / 'data/raw' / (family + '.MKF')).read_bytes()
    entries = chunks(data)
    archives[family] = {'sha256': sha(data), 'byteLength': len(data), 'chunks': len(entries), 'empty': [i for i, b in enumerate(entries) if not b]}
    for index, entry in enumerate(entries):
        if family == 'DATA' and index not in (9, 10):
            continue
        kind = (0 if index == 9 else 1) if family == 'DATA' else families.index(family)
        packets.append(struct.pack('<III', kind, index, len(entry)) + entry)
runs = []


def run(label, command):
    result = subprocess.run(command, cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    (OUT / (label + '.raw.gz')).write_bytes(gzip.compress(result.stdout, mtime=0))
    runs.append({'label': label, 'command': [str(x) for x in command], 'cwd': str(ROOT), 'exit': result.returncode, 'rawSha256': sha(result.stdout)})
    assert result.returncode == 0, result.stdout.decode(errors='replace')


with tempfile.TemporaryDirectory(prefix='type-pal-raw-sdl-') as directory:
    temporary = Path(directory)
    c_file = temporary / 'primary.c'
    compiled = types + shadow + blit + sprite + yj + driver
    c_file.write_text(compiled)
    (OUT / 'native-primary.c.gz').write_bytes(gzip.compress(compiled.encode(), mtime=0))
    binary = temporary / 'primary'
    run('native-compile', ['cc', '-std=c11', '-O0', '-Werror', '-fsanitize=address', str(c_file), '-o', str(binary)])
    input_path, output_path = temporary / 'input.bin', temporary / 'output.bin'
    payload = b''.join(packets)
    input_path.write_bytes(payload)
    run('native-decode', [str(binary), str(input_path), str(output_path)])
    native = output_path.read_bytes()
    (OUT / 'native-rgba.bin.gz').write_bytes(gzip.compress(native, mtime=0))
    records = []
    cohorts = {name: hashlib.sha256() for name in families}
    per_chunk = {}
    position = 0
    while position < len(native):
        family, chunk, slot, width, height = struct.unpack_from('<IIIII', native, position)
        position += 20
        rgba = native[position:position + width * height * 4]
        assert len(rgba) == width * height * 4
        position += len(rgba)
        cohorts[families[family]].update(struct.pack('<IIII', chunk, slot, width, height) + rgba)
        per_chunk.setdefault(f'{families[family]}/{chunk}', hashlib.sha256()).update(struct.pack('<IIII', chunk, slot, width, height) + rgba)
        records.append({'family': families[family], 'chunk': chunk, 'slot': slot, 'width': width, 'height': height, 'rgbaSha256': sha(rgba)})
    assert position == len(native)
    proof = {'baseCommit': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(), 'archives': archives, 'frames': records, 'inputSha256': sha(payload), 'nativeStreamSha256': sha(native), 'cohortDigests': {name: h.hexdigest() for name, h in cohorts.items()}, 'chunkDigests': {name: h.hexdigest() for name, h in per_chunk.items()}, 'runs': runs}
assert primary.read_text() == source and (ROOT / 'reference/sdlpal/yj1.c').read_text() == yj_source
proof.update({'primarySha256': sha(source.encode()), 'yj2PrimarySha256': sha(yj_source.encode()), 'functionSha256': {'blit': sha(blit.encode()), 'sprite': sha(sprite.encode()), 'yj2': sha(yj.encode())}, 'nativeSourceSha256': sha(compiled.encode()), 'temporaryDirectoryRemoved': not temporary.exists(), 'limits': 'Unchanged SDLPal functions with unclipped 8-bit surfaces and two backgrounds; shipped raw only. pal.exe not executed; PNG encoding and current product are not the source of expected pixels.'})
(OUT / 'native-proof.json').write_text(json.dumps(proof, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'frames': {name: sum(f['family'] == name for f in records) for name in families}, 'digests': proof['cohortDigests']}))
