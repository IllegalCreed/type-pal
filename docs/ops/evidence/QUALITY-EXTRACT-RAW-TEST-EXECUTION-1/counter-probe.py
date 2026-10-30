# -*- coding: utf-8 -*-
"""Run whole test files against isolated, typed wrappers that corrupt one real output."""
import gzip
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import time

ROOT = Path(__file__).resolve().parents[4]
OUT = Path(__file__).resolve().parent
BASE = ROOT / 'packages/pal-extract/src'
TEST_DIR = BASE / 'resources/parsers/__tests__'
PHASE = sys.argv[1]
assert PHASE in ('before', 'after')
TESTS = ['data-misc.test.ts', 'misc-mkf.test.ts']
sources = {p: (BASE / p).read_bytes() for p in ['resources/sprite.ts', 'resources/parsers/rgm.ts', 'resources/parsers/ball.ts', 'resources/parsers/fire.ts', 'io/yj2.ts']}
tests = {name: (TEST_DIR / name).read_bytes() for name in TESTS}


def sha(data):
    return hashlib.sha256(data).hexdigest()


sprite_prefix = "import { parseSpriteChunk as real, framesToOut } from './sprite.js';\nexport { framesToOut };\nexport function parseSpriteChunk(buf: Uint8Array) { const frames=real(buf);\n"
pixel_body = "const frame=frames[0]; if(frame) { const pixel=frame.opaque.findIndex(v=>v===1); const value=frame.pixels[pixel]; if(value!==undefined) frame.pixels[pixel]=value^1; }"
png_body = "const png=PNG.sync.read(Buffer.from(result.pngBytes)); for(let i=3;i<png.data.length;i+=4) { if(png.data[i]===255) { png.data[i-3]=png.data[i-3]!^1;break;} } result.pngBytes=new Uint8Array(PNG.sync.write(png));"
variants = {
    'control': None,
    'data9-pixel': ('resources', '../../sprite.js', sprite_prefix + "if(buf.length===25532) {" + pixel_body + "} return frames; }", 'real DATA.MKF chunk 9'),
    'data10-frame': ('resources', '../../sprite.js', sprite_prefix + "return buf.length===17478?frames.slice(0,-1):frames; }", 'real DATA.MKF chunk 10'),
    'rgm-pixel': ('resources/parsers', '../rgm.js', "import {PNG} from 'pngjs'; import {decodeRgmPortrait as real} from './rgm.js'; export function decodeRgmPortrait(index:number,buf:Uint8Array) { const result=real(index,buf); if(result&&index===1) {" + png_body + "} return result; }", 'real RGM.MKF'),
    'ball-pixel': ('resources/parsers', '../ball.js', "import {PNG} from 'pngjs'; import {decodeBallIcon as real} from './ball.js'; export function decodeBallIcon(index:number,buf:Uint8Array) { const result=real(index,buf); if(result&&index===1) {" + png_body + "} return result; }", 'real BALL.MKF'),
    'fire-index': ('resources/parsers', '../fire.js', "import {parseFirSprite as real} from './fire.js'; export function parseFirSprite(index:number,buf:Uint8Array) { const result=real(index,buf); if(index===1&&buf.length>100) {const frame=result.frames[0]; if(frame)frame.index++;} return result; }", 'real FIRE.MKF'),
    'fire-direct': ('io', '../../../io/yj2.js', "import {decompressYj2 as real} from './yj2.js'; export function decompressYj2(buf:Uint8Array) { const result=real(buf); if(buf.length>100) {result[2]=0;result[3]=0;} return result; }", 'chunk 0 decompresses'),
    'raw-fallback': ('resources/parsers', '../fire.js', "import {parseFirSprite as real} from './fire.js'; export function parseFirSprite(index:number,buf:Uint8Array) { const result=real(index,buf); return index===9&&buf.length===16?{chunkIndex:index,frameCount:0,frames:[]}:result; }", 'fake raw sprite chunk'),
}
runs = []
with tempfile.TemporaryDirectory(prefix='type-pal-raw-counter-') as directory:
    for name, variant in variants.items():
        stem = f'pre94-raw-{PHASE}-{name}'
        module = BASE / variant[0] / (stem + '.ts') if variant else None
        copies = [TEST_DIR / (stem + '-' + name) for name in TESTS]
        report = Path(directory) / (name + '.json')
        command = ['pnpm', '--filter', '@type-pal/pal-extract', 'exec', 'vitest', 'run']
        try:
            if module:
                module.write_text(variant[2])
            for name_test, path in zip(TESTS, copies):
                data = tests[name_test]
                if variant:
                    replacement = variant[1].rsplit('/', 1)[0] + '/' + stem + '.js'
                    data = data.replace(("'" + variant[1] + "'").encode(), ("'" + replacement + "'").encode())
                path.write_bytes(data)
                command.append('src/resources/parsers/__tests__/' + path.name)
            command += ['--maxWorkers=1', '--reporter=default', '--reporter=json', '--silent=false', '--outputFile.json=' + str(report)]
            started = time.monotonic()
            result = subprocess.run(command, cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
            native = report.read_bytes()
            runner = json.loads(native)
            cases = [{'file': Path(s['name']).name.removeprefix(stem + '-'), 'fullName': c['fullName'], 'status': c['status'], 'messages': c['failureMessages']} for s in runner['testResults'] for c in s['assertionResults']]
            row = {'name': name, 'command': command, 'cwd': str(ROOT), 'exit': result.returncode, 'signal': -result.returncode if result.returncode < 0 else None, 'seconds': round(time.monotonic() - started, 3), 'passed': runner['numPassedTests'], 'failed': runner['numFailedTests'], 'pending': runner['numPendingTests'], 'cases': cases, 'wrapper': str(module.relative_to(ROOT)) if module else None, 'wrapperSha256': sha(module.read_bytes()) if module else None, 'copySha256': {str(path.relative_to(ROOT)): sha(path.read_bytes()) for path in copies}, 'rawSha256': sha(result.stdout), 'runnerSha256': sha(native), 'stderrBlocks': result.stdout.count(b'stderr |')}
            (OUT / f'{PHASE}-{name}.raw.gz').write_bytes(gzip.compress(result.stdout, mtime=0))
            (OUT / f'{PHASE}-{name}.runner.json.gz').write_bytes(gzip.compress(native, mtime=0))
            runs.append(row)
            print(json.dumps({k: row[k] for k in ['name', 'exit', 'passed', 'failed', 'pending', 'stderrBlocks']}), flush=True)
        finally:
            if module:
                module.unlink(missing_ok=True)
            for path in copies:
                path.unlink(missing_ok=True)
proof = {'phase': PHASE, 'head': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(), 'sourceSha256': {p: sha(b) for p, b in sources.items()}, 'testSha256': {p: sha(b) for p, b in tests.items()}, 'runs': runs, 'sourceUnchanged': all((BASE / p).read_bytes() == b for p, b in sources.items()), 'testFilesUnchanged': all((TEST_DIR / p).read_bytes() == b for p, b in tests.items()), 'temporaryCopiesRemoved': not list(BASE.rglob('pre94-raw-*'))}
(OUT / f'{PHASE}-proof.json').write_text(json.dumps(proof, ensure_ascii=False, indent=2) + '\n')
assert all(proof[k] for k in ('sourceUnchanged', 'testFilesUnchanged', 'temporaryCopiesRemoved'))
expected_count = 21 if PHASE == 'before' else 20
identities = {(c['file'], c['fullName']) for c in runs[0]['cases']}
assert len(identities) == expected_count
for run in runs:
    assert {(c['file'], c['fullName']) for c in run['cases']} == identities
    red = PHASE == 'after' and run['name'] != 'control'
    assert run['pending'] == 0 and run['exit'] == int(red) and run['failed'] == int(red) and run['passed'] == expected_count - int(red)
    assert run['stderrBlocks'] == (6 if PHASE == 'before' else 0)
    if red:
        failures = [c for c in run['cases'] if c['status'] == 'failed']
        assert len(failures) == 1 and variants[run['name']][3] in failures[0]['fullName']
        assert 'AssertionError:' in ''.join(failures[0]['messages'])
