# coding: utf-8
"""Emit one deterministic YJ2 test fixture using frozen SDLPal tree helpers.

No product imports or repository writes. Compile/execute in an owned TemporaryDirectory.
Expected bytes come from the literal schedule, then the unchanged C decoder checks them.
This is not a general compressor, asset producer or proof for malformed C input.
"""
from pathlib import Path
import hashlib
import json
import subprocess
import sys
import tempfile

root = Path(__file__).resolve().parents[5]
source = (root / 'reference/sdlpal/yj1.c').read_bytes()
text = source.decode('utf8')
body = text[text.index('typedef struct _YJ2_TreeNode'):text.index('INT (*Decompress)')]
assert sys.byteorder == 'little'
prefix = '''
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
typedef int INT;
typedef const void *LPCVOID;
typedef void *LPVOID;
#define SDL_SwapLE32(value) (value)
'''
driver = r'''
static unsigned char encoded[65536];
static unsigned bit_count, reductions;
static void emit_bit(unsigned bit) {
 if (bit_count >= (sizeof(encoded)-4)*8) exit(8);
 encoded[4+bit_count/8] |= (bit&1) << (bit_count%8);
 bit_count++;
}
static void emit_symbol(YJ2_Tree tree, unsigned short value) {
 unsigned path[641], size=0;
 YJ2_TreeNode *node=tree.list[value];
 while (node != tree.node+0x280) {
  path[size++]=(node->parent->right==node);
  node=node->parent;
 }
 while (size) emit_bit(path[--size]);
 if (tree.node[0x280].weight==0x8000) {
  reductions++;
  for (int i=0;i<0x141;i++)
   if (tree.list[i]->weight&1) yj2_adjust_tree(tree,i);
  for (int i=0;i<=0x280;i++) tree.node[i].weight>>=1;
 }
 yj2_adjust_tree(tree,value);
}
int main(void) {
 const unsigned length=33024;
 unsigned char expected[33024], decoded[33024];
 YJ2_Tree tree;
 if (!yj2_build_tree(&tree)) return 2;
 for (unsigned i=0;i<4;i++) encoded[i]=(length>>(8*i))&255;
 for (unsigned i=0;i<length;i++) {
  expected[i]= i<32600 ? 0x41 : (i*17+23)&255;
  emit_symbol(tree,expected[i]);
 }
 emit_symbol(tree,0x100);
 // Position0xfff: low8 bits0 => data1[0]=0x3f,data2[0]=8;
 // subsequent6 bits all1 => (temp>>8)&0x3f=0x3f.
 for (unsigned i=0;i<14;i++) emit_bit((0x3f00>>i)&1);
 free(tree.list);free(tree.node);
 memset(decoded,0,sizeof(decoded));
 if (YJ2_Decompress(encoded,decoded,length)!=(int)length) return 3;
 if (memcmp(expected,decoded,length)!=0 || reductions!=1) return 4;
 printf("{\"length\":%u,\"literalPrefix\":32600,\"reductions\":%u,\"bits\":%u,\"hex\":\"",length,reductions,bit_count);
 for (unsigned i=0;i<4+(bit_count+7)/8;i++) printf("%02x",encoded[i]);
 printf("\"}\n");
 return 0;
}
'''
sha = lambda data: hashlib.sha256(data).hexdigest()
runs = []
with tempfile.TemporaryDirectory(prefix='type-pal-yj2-rescale-native-') as directory:
    temporary = Path(directory)
    c_path = temporary / 'fixture.c'
    binary = temporary / 'fixture'
    c_path.write_text(prefix + body + driver)
    for command in [['cc', '-std=c11', '-O0', '-Werror', '-fsanitize=address', str(c_path), '-o', str(binary)], [str(binary)]]:
        result = subprocess.run(command, cwd=root, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        runs.append(dict(command=command, cwd=str(root), exit=result.returncode,
                         stdout=result.stdout.decode('utf8'), stderr=result.stderr.decode('utf8')))
        if result.returncode:
            print(json.dumps(dict(runs=runs)), file=sys.stderr)
            raise SystemExit(result.returncode)
    fixture = json.loads(result.stdout)
expected = bytes(0x41 if i < 32600 else (i * 17 + 23) & 255 for i in range(33024))
assert (root / 'reference/sdlpal/yj1.c').read_bytes() == source
print(json.dumps(dict(primarySha256=sha(source), extractedBodySha256=sha(body.encode()),
                     primaryUnmodified=True, nativeDecoderUnmodified=True,
                     expectedSha256=sha(expected), compressedSha256=sha(bytes.fromhex(fixture['hex'])),
                     expected='33024 literal bytes: first32600=0x41, then(i*17+23)&255',
                     fixture=fixture, runs=runs, temporaryDirectoryRemoved=not temporary.exists()), indent=2))
