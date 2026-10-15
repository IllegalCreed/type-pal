"""Run the complete three-file PNG family against isolated same-directory copies."""
import gzip
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import time

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[4]
BASE = ROOT / 'packages/pal-extract/src/resources'
PHASE = sys.argv[1]
assert PHASE in ['before', 'after']
assert not (OUT / (PHASE + '-proof.json')).exists()
SOURCE = 'sprite.ts'
TESTS = ['sprite.boundaries.test.ts', 'sprite.test.ts', 'sprite.glm-runtime-resource.test.ts']
originals = {p: (BASE / p).read_bytes() for p in [SOURCE, *TESTS]}


def sha(data):
    return hashlib.sha256(data).hexdigest()


variants = {
    'control': [],
    'height-integer': [(' || !Number.isInteger(height)', '')],
    'height-positive': [(' || height <= 0', '')],
}
proof = {'phase': PHASE, 'base': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(), 'formalSha256': {p: sha(b) for p, b in originals.items()}, 'variants': variants, 'runs': []}
for p, b in originals.items():
    (OUT / (PHASE + '-' + p + '.gz')).write_bytes(gzip.compress(b, mtime=0))
try:
    for name, replacements in variants.items():
        stem = 'pre94-3d-' + PHASE + '-' + name
        source = originals[SOURCE].decode()
        for old, new in replacements:
            assert source.count(old) == 1
            source = source.replace(old, new)
        copies = {BASE / (stem + '-sprite.ts'): source.encode()}
        for p in TESTS:
            b = originals[p]
            assert b.count(b"'./sprite.js'") == 1
            copies[BASE / (stem + '-' + p)] = b.replace(b"'./sprite.js'", ("'./" + stem + "-sprite.js'").encode())
        assert not any(p.exists() for p in copies)
        try:
            for p, b in copies.items():
                p.write_bytes(b)
            with tempfile.TemporaryDirectory(prefix='type-pal-pre94-3d-') as temp:
                native = Path(temp) / 'runner.json'
                command = ['pnpm', '--filter', '@type-pal/pal-extract', 'exec', 'vitest', 'run', *['src/resources/' + stem + '-' + p for p in TESTS], '--maxWorkers=1', '--silent=false', '--reporter=default', '--reporter=json', '--outputFile.json=' + str(native)]
                start = time.monotonic()
                process = subprocess.run(command, cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
                raw = process.stdout
                (OUT / (PHASE + '-' + name + '.raw.gz')).write_bytes(gzip.compress(raw, mtime=0))
                native_bytes = native.read_bytes()
                (OUT / (PHASE + '-' + name + '.runner.json.gz')).write_bytes(gzip.compress(native_bytes, mtime=0))
                data = json.loads(native_bytes)
                cases = [{'file': Path(s['name']).name.removeprefix(stem + '-'), 'fullName': c['fullName'], 'status': c['status'], 'messages': c['failureMessages']} for s in data['testResults'] for c in s['assertionResults']]
                run = {'name': name, 'command': command, 'cwd': str(ROOT), 'exit': process.returncode, 'signal': -process.returncode if process.returncode < 0 else None, 'spawnError': None, 'seconds': round(time.monotonic() - start, 3), 'moduleSha256': sha(source.encode()), 'copiesSha256': {str(p.relative_to(ROOT)): sha(b) for p, b in copies.items()}, 'rawSha256': sha(raw), 'runnerSha256': sha(native_bytes), 'passed': data['numPassedTests'], 'failed': data['numFailedTests'], 'pending': data['numPendingTests'], 'actWarnings': raw.count(b'not wrapped in act'), 'environmentWarnings': raw.count(b'not configured to support act'), 'stderrBlocks': raw.count(b'stderr |'), 'cases': cases}
                proof['runs'].append(run)
                (OUT / (PHASE + '-proof.json')).write_text(json.dumps(proof, ensure_ascii=False, indent=2) + '\n')
                expected = int(PHASE == 'after' and name != 'control')
                assert run['exit'] == expected and run['failed'] == expected and run['pending'] == 0
                assert len(cases) == run['passed'] + run['failed'] == (9 if PHASE == 'before' else 13)
                assert run['actWarnings'] == run['environmentWarnings'] == run['stderrBlocks'] == 0
                if expected:
                    failed = [c for c in cases if c['status'] == 'failed']
                    target = 'height 必须为整数' if name == 'height-integer' else 'height 必须为正数'
                    assert len(failed) == 1 and target in failed[0]['fullName'] and 'AssertionError:' in ''.join(failed[0]['messages'])
                print(json.dumps({k: v for k, v in run.items() if k not in ['command', 'cwd', 'copiesSha256', 'cases']}, ensure_ascii=False), flush=True)
        finally:
            for p in copies:
                p.unlink(missing_ok=True)
finally:
    proof['formalSourcesUnchanged'] = all((BASE / p).read_bytes() == b for p, b in originals.items())
    proof['temporaryCopiesRemoved'] = not list(BASE.glob('pre94-3d-*'))
    (OUT / (PHASE + '-proof.json')).write_text(json.dumps(proof, ensure_ascii=False, indent=2) + '\n')
    assert proof['formalSourcesUnchanged'] and proof['temporaryCopiesRemoved']
