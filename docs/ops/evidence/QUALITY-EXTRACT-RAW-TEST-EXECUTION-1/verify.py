# -*- coding: utf-8 -*-
"""Verify frozen native pixels, probe reconstruction, identity changes and IO receipts."""
import ast
import collections
import gzip
import hashlib
import json
from pathlib import Path
import struct
import subprocess

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[3]
BASE = ROOT / 'packages/pal-extract/src'
TEST_DIR = BASE / 'resources/parsers/__tests__'


def sha(data):
    return hashlib.sha256(data).hexdigest()


def unzip(path):
    return gzip.decompress(path.read_bytes())


def read(path):
    return json.loads(path.read_text())


native = read(OUT / 'native-proof.json')
binary = unzip(OUT / 'native-rgba.bin.gz')
assert sha(binary) == native['nativeStreamSha256']
compiled = unzip(OUT / 'native-primary.c.gz')
assert sha(compiled) == native['nativeSourceSha256']
source = (ROOT / 'reference/sdlpal/palcommon.c').read_text()
yj = (ROOT / 'reference/sdlpal/yj1.c').read_text()
assert sha(source.encode()) == native['primarySha256'] and sha(yj.encode()) == native['yj2PrimarySha256']
functions = {
    'blit': source[source.index('INT\nPAL_RLEBlitToSurfaceWithShadow('):source.index('\nINT\nPAL_RLEBlitWithColorShift(')],
    'sprite': source[source.index('LPCBITMAPRLE\nPAL_SpriteGetFrame('):source.index('\nINT\nPAL_MKFGetChunkCount(')],
    'yj2': yj[yj.index('typedef struct _YJ2_TreeNode'):yj.index('INT (*Decompress)')],
}
for name, body in functions.items():
    assert sha(body.encode()) == native['functionSha256'][name] and body.encode() in compiled
families = ['DATA9', 'DATA10', 'RGM', 'BALL', 'FIRE']
cohorts = {name: hashlib.sha256() for name in families}
per_chunk = {}
position, frames = 0, []
while position < len(binary):
    family, chunk, slot, width, height = struct.unpack_from('<IIIII', binary, position)
    position += 20
    rgba = binary[position:position + width * height * 4]
    assert len(rgba) == width * height * 4
    position += len(rgba)
    name = families[family]
    packet = struct.pack('<IIII', chunk, slot, width, height) + rgba
    cohorts[name].update(packet)
    per_chunk.setdefault(f'{name}/{chunk}', hashlib.sha256()).update(packet)
    frames.append({'family': name, 'chunk': chunk, 'slot': slot, 'width': width, 'height': height, 'rgbaSha256': sha(rgba)})
assert position == len(binary) and frames == native['frames']
assert {k: v.hexdigest() for k, v in cohorts.items()} == native['cohortDigests']
assert {k: v.hexdigest() for k, v in per_chunk.items()} == native['chunkDigests']
assert dict(collections.Counter(f['family'] for f in frames)) == {'DATA9': 71, 'DATA10': 85, 'RGM': 88, 'BALL': 251, 'FIRE': 837}
for family, archive in native['archives'].items():
    assert sha((ROOT / 'data/raw' / (family + '.MKF')).read_bytes()) == archive['sha256']
for run in native['runs']:
    assert run['exit'] == 0 and sha(unzip(OUT / (run['label'] + '.raw.gz'))) == run['rawSha256']

# Evaluate only the four literal/string expressions that define our own wrappers.
namespace = {}
for node in ast.parse((OUT / 'counter-probe.py').read_text()).body:
    if isinstance(node, ast.Assign) and isinstance(node.targets[0], ast.Name):
        name = node.targets[0].id
        if name in ('sprite_prefix', 'pixel_body', 'png_body', 'variants'):
            namespace[name] = eval(compile(ast.Expression(node.value), '<wrapper-definition>', 'eval'), {}, namespace)
variants = namespace['variants']
pins = []
for label in ('before', 'initial-after', 'after'):
    phase = 'before' if label == 'before' else 'after'
    directory = OUT / 'initial-after' if label == 'initial-after' else OUT
    proof = read(directory / (phase + '-proof.json'))
    tests = {}
    for name in ('data-misc.test.ts', 'misc-mkf.test.ts'):
        tests[name] = unzip(OUT / (name + '.before.gz')) if phase == 'before' else unzip(directory / (name + '.gz')) if label == 'initial-after' else (TEST_DIR / name).read_bytes()
    assert {k: sha(v) for k, v in tests.items()} == proof['testSha256']
    for name, digest in proof['sourceSha256'].items():
        assert sha((BASE / name).read_bytes()) == digest
    assert all(proof[k] for k in ('sourceUnchanged', 'testFilesUnchanged', 'temporaryCopiesRemoved'))
    count = 21 if phase == 'before' else 20
    identities = {(c['file'], c['fullName']) for c in proof['runs'][0]['cases']}
    assert len(identities) == count
    for run in proof['runs']:
        variant = variants[run['name']]
        stem = f"pre94-raw-{phase}-{run['name']}"
        assert run['signal'] is None and run['cwd'] == str(ROOT)
        assert '--silent=false' in run['command'] and not any(x in run['command'] for x in ('-t', '--testNamePattern'))
        assert run['wrapperSha256'] == (sha(variant[2].encode()) if variant else None)
        for name, data in tests.items():
            if variant:
                replacement = variant[1].rsplit('/', 1)[0] + '/' + stem + '.js'
                data = data.replace(("'" + variant[1] + "'").encode(), ("'" + replacement + "'").encode())
            assert run['copySha256'][str((TEST_DIR / (stem + '-' + name)).relative_to(ROOT))] == sha(data)
        raw = unzip(directory / (phase + '-' + run['name'] + '.raw.gz'))
        report = unzip(directory / (phase + '-' + run['name'] + '.runner.json.gz'))
        assert sha(raw) == run['rawSha256'] and sha(report) == run['runnerSha256']
        parsed = json.loads(report)
        cases = [{'file': Path(s['name']).name.removeprefix(stem + '-'), 'fullName': c['fullName'], 'status': c['status'], 'messages': c['failureMessages']} for s in parsed['testResults'] for c in s['assertionResults']]
        assert cases == run['cases'] and {(c['file'], c['fullName']) for c in cases} == identities
        failures = [c for c in cases if c['status'] == 'failed']
        red = phase == 'after' and run['name'] != 'control'
        assert run['exit'] == int(red) and run['failed'] == parsed['numFailedTests'] == len(failures) == int(red)
        assert run['passed'] == parsed['numPassedTests'] == count - int(red) and run['pending'] == parsed['numPendingTests'] == 0
        assert run['stderrBlocks'] == raw.count(b'stderr |') == (6 if phase == 'before' else 0)
        if red:
            assert variant[3] in failures[0]['fullName'] and 'AssertionError:' in ''.join(failures[0]['messages'])
            if label == 'after':
                pins.append({'mutation': run['name'], 'file': failures[0]['file'], 'fullName': failures[0]['fullName'], 'type': 'AssertionError'})
transfer = read(OUT / 'empty-transfer.json')
assert [r['failed'] for r in transfer['rows']] == [2, 1]
transfer_wrapper = "import {parseFirSprite as real} from './fire.js'; export function parseFirSprite(index:number,buf:Uint8Array) { const result=real(index,buf); return buf.length===0?{...result,frameCount:1}:result; }"
for run in transfer['rows']:
    for suffix, key in (('.raw.gz', 'rawSha256'), ('.runner.json.gz', 'runnerSha256')):
        assert sha(unzip(OUT / ('empty-transfer-' + run['phase'] + suffix))) == run[key]
    assert run['exit'] == 1 and run['pending'] == 0 and all('AssertionError:' in ''.join(c['messages']) for c in run['failures'])
    assert sha(transfer_wrapper.encode()) == run['wrapperSha256']
    stem = 'pre94-raw-empty-transfer-' + run['phase']
    for name in ('data-misc.test.ts', 'misc-mkf.test.ts'):
        original = unzip(OUT / (name + '.before.gz')) if run['phase'] == 'before' else (TEST_DIR / name).read_bytes()
        copy = original.replace(b"'../fire.js'", ("'../" + stem + ".js'").encode())
        assert sha(copy) == run['copySha256'][str((TEST_DIR / (stem + '-' + name)).relative_to(ROOT))]
    original = unzip(OUT / 'fire.glm-runtime-resource.test.ts.before.gz') if run['phase'] == 'before' else (BASE / 'resources/parsers/fire.glm-runtime-resource.test.ts').read_bytes()
    copy = original.replace(b"'./fire.js'", ("'./" + stem + ".js'").encode())
    assert sha(copy) == run['copySha256'][str((BASE / 'resources/parsers' / (stem + '-fire.glm-runtime-resource.test.ts')).relative_to(ROOT))]
glm_before = unzip(OUT / 'fire.glm-runtime-resource.test.ts.before.gz')
glm_after = (BASE / 'resources/parsers/fire.glm-runtime-resource.test.ts').read_bytes()
marker = "  test('YJ2 压缩 chunk".encode()
assert glm_before.split(marker, 1)[1] == glm_after.split(marker, 1)[1]
assert b'for (const chunkIndex of [0, 7])' in glm_after
identity = read(OUT / 'native-identities.json')
for run in identity['runs']:
    assert run['exit'] == 0
    assert sha(unzip(OUT / (run['phase'] + '-list.raw.gz'))) == run['rawSha256']
    assert sha(unzip(OUT / (run['phase'] + '-list.json.gz'))) == run['nativeSha256']
assert len(identity['runs'][0]['identities']) == 21 and len(identity['runs'][1]['identities']) == 20
assert set(identity['removed']) == set(identity['runs'][0]['identities']) - set(identity['runs'][1]['identities'])
assert set(identity['added']) == set(identity['runs'][1]['identities']) - set(identity['runs'][0]['identities'])
missing = read(OUT / 'missing-input.json')
assert missing['exit'] == 1 and missing['failed'] == 6 and missing['passed'] == 14 and missing['pending'] == 0
assert all('ENOENT' in ''.join(c['messages']) for c in missing['failures'])
assert sha(unzip(OUT / 'missing-input.raw.gz')) == missing['rawSha256'] and sha(unzip(OUT / 'missing-input.runner.json.gz')) == missing['runnerSha256']
unchanged = ['scripts/coverage/config.mjs', 'scripts/coverage/baseline.fast.json', 'scripts/coverage/approved-test-retirements.mjs', 'scripts/coverage/approved-test-retirements.test.mjs', 'packages/pal-extract/src/cli.ts', 'packages/shared/src/rle.ts']
for name in unchanged:
    assert (ROOT / name).read_bytes() == subprocess.check_output(['git', 'show', native['baseCommit'] + ':' + name], cwd=ROOT)
assert not list(BASE.rglob('pre94-raw-*'))
recovery = []
for name in ('extract-targeted', 'extract-package', 'extract-typecheck', 'shared-adjacent'):
    run = read(OUT / (name + '.json'))
    assert run['exit'] == 0 and sha(unzip(OUT / (name + '.raw.gz'))) == run['rawSha256']
    if 'runnerSha256' in run:
        assert sha(unzip(OUT / (name + '.runner.json.gz'))) == run['runnerSha256']
    recovery.append({'name': name, 'exit': run['exit'], 'diagnostics': run['diagnostics']})
report = {'reviewer': 'Codex separate verification process, not third-party acceptance', 'nativeFrames': 1332, 'nativeSourceAndPixelRecordsVerified': True, 'rawArchivesUnchanged': 4, 'finalSingleBusinessFailures': pins, 'allTwentyFourCounterRunsVerified': True, 'emptyTransferFailures': [2, 1], 'otherThreeGlmTestBodiesUnchanged': True, 'canonicalEmptyIndexInputs': [0, 7], 'nativeIdentityCounts': [21, 20], 'identityRemovalsIncludingRenames': len(identity['removed']), 'identityAdditionsIncludingRenames': len(identity['added']), 'missingInputFailsInsteadOfPassing': 6, 'temporaryCopiesRemoved': True, 'baselineScopeAndRetirementRulesUnchanged': unchanged, 'newFileClosures': 0, 'wholeCardAcceptance': False}
report['recoveryReceiptsVerified'] = recovery
(OUT / 'verification.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'nativeFrames': 1332, 'validFinalPins': len(pins), 'nativeIdentities': [21, 20], 'emptyTransfer': [2, 1], 'wholeCardAcceptance': False}))
