"""Complete PNG decoder family against isolated copies, with actual canvas IO."""
import gzip
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import time

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[4]
SRC = ROOT / 'packages/game/src'
ASSETS = SRC / 'assets'
PHASE = sys.argv[1]
assert PHASE in ['before', 'after']
assert not (OUT / (PHASE + '-proof.json')).exists()
TESTS = ['assets/png.test.ts', 'assets/png-decode.grok-r1.test.ts', 'assets/png.glm-phase1-leaves.test.ts', 'present/__tests__/grok-present/p10-indexed-png.test.ts']
originals = {p: (SRC / p).read_bytes() for p in ['assets/png.ts', *TESTS]}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def reported_errors(raw, data, stem):
    lines = [line.strip() for line in re.sub(r'\x1b\[[0-9;]*m', '', raw.decode()).splitlines()]
    out = []
    for suite in data['testResults']:
        for case in suite['assertionResults']:
            if case['status'] != 'failed':
                continue
            header = 'FAIL  ' + str(Path(suite['name']).relative_to(ROOT / 'packages/game')) + ' > ' + ' > '.join([*case['ancestorTitles'], case['title']])
            assert lines.count(header) == 1
            error_line = next(line for line in lines[lines.index(header) + 1:] if line)
            match = re.match(r'^([A-Za-z_][A-Za-z0-9_.]*):', error_line)
            assert match is not None
            out.append({'file': Path(suite['name']).name.removeprefix(stem + '-'), 'fullName': case['fullName'], 'errorName': match[1]})
    return out


variants = {
    'control': [],
    'palette-one-loss': [('indices[i] = img.data[i * 4]!', 'indices[i] = img.data[i * 4] === 1 ? 0 : img.data[i * 4]!')],
    'cause-replaced': [('{ cause },', "{ cause: new Error('replaced bitmap cause') },")],
    'transfer-error-context': [("    throw new Error(\n      `decodePngToIndices: failed to decode PNG blob (${source.size}B, type=${source.type})`,\n      { cause },\n    )", '    throw cause')],
    'transfer-close': [('    bitmap.close()\n', '')],
}
proof = {'phase': PHASE, 'base': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(), 'formalSha256': {p: sha(b) for p, b in originals.items()}, 'variants': variants, 'runs': []}
if len(sys.argv) == 3:
    assert PHASE == 'before' and sys.argv[2] == '--resume-classifier-checkpoint'
    saved = json.loads((OUT / 'before-classifier-checkpoint.json').read_bytes())
    assert all(saved[key] == json.loads(json.dumps(proof[key])) for key in ['base', 'formalSha256', 'variants'])
    assert [r['name'] for r in saved['runs']] == list(variants)[:4]
    for row in saved['runs']:
        raw = gzip.decompress((OUT / ('before-' + row['name'] + '.raw.gz')).read_bytes())
        native = gzip.decompress((OUT / ('before-' + row['name'] + '.runner.json.gz')).read_bytes())
        assert sha(raw) == row['rawSha256'] and sha(native) == row['runnerSha256']
        row['reportedErrors'] = reported_errors(raw, json.loads(native), 'pre94-3h-before-' + row['name'])
        assert all(e['errorName'] == 'AssertionError' for e in row['reportedErrors'])
        proof['runs'].append(row)
    proof['reusedNativeReceipts'] = [r['name'] for r in saved['runs']]
for p, b in originals.items():
    (OUT / (PHASE + '-' + Path(p).name + '.gz')).write_bytes(gzip.compress(b, mtime=0))
try:
    for name, replacements in variants.items():
        if any(row['name'] == name for row in proof['runs']):
            continue
        stem = 'pre94-3h-' + PHASE + '-' + name
        source = originals['assets/png.ts'].decode()
        for old, new in replacements:
            assert source.count(old) == 1
            source = source.replace(old, new)
        copies = {ASSETS / (stem + '-png.ts'): source.encode()}
        for p in TESTS:
            data = originals[p]
            old = b"'../../../assets/png.js'" if p.startswith('present/') else b"'./png.js'"
            new = ("'../../../assets/" + stem + "-png.js'").encode() if p.startswith('present/') else ("'./" + stem + "-png.js'").encode()
            assert data.count(old) == 1
            copies[(SRC / p).parent / (stem + '-' + Path(p).name)] = data.replace(old, new)
        assert not any(p.exists() for p in copies)
        try:
            for p, b in copies.items():
                p.write_bytes(b)
            with tempfile.TemporaryDirectory(prefix='type-pal-pre94-3h-') as temp:
                native = Path(temp) / 'runner.json'
                command = ['pnpm', '--filter', '@type-pal/game', 'exec', 'vitest', 'run', *[str(p.relative_to(ROOT / 'packages/game')) for p in copies if '.test.ts' in p.name], '--maxWorkers=1', '--silent=false', '--reporter=default', '--reporter=json', '--outputFile.json=' + str(native)]
                start = time.monotonic()
                p = subprocess.run(command, cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
                raw = p.stdout
                native_bytes = native.read_bytes()
                (OUT / (PHASE + '-' + name + '.raw.gz')).write_bytes(gzip.compress(raw, mtime=0))
                (OUT / (PHASE + '-' + name + '.runner.json.gz')).write_bytes(gzip.compress(native_bytes, mtime=0))
                data = json.loads(native_bytes)
                cases = [{'file': Path(s['name']).name.removeprefix(stem + '-'), 'fullName': c['fullName'], 'status': c['status'], 'messages': c['failureMessages']} for s in data['testResults'] for c in s['assertionResults']]
                run = {'name': name, 'command': command, 'cwd': str(ROOT), 'exit': p.returncode, 'signal': -p.returncode if p.returncode < 0 else None, 'spawnError': None, 'seconds': round(time.monotonic() - start, 3), 'moduleSha256': sha(source.encode()), 'copiesSha256': {str(p.relative_to(ROOT)): sha(b) for p, b in copies.items()}, 'rawSha256': sha(raw), 'runnerSha256': sha(native_bytes), 'passed': data['numPassedTests'], 'failed': data['numFailedTests'], 'pending': data['numPendingTests'], 'actWarnings': raw.count(b'not wrapped in act'), 'environmentWarnings': raw.count(b'not configured to support act'), 'stderrBlocks': raw.count(b'stderr |'), 'cases': cases, 'reportedErrors': reported_errors(raw, data, stem)}
                proof['runs'].append(run)
                (OUT / (PHASE + '-proof.json')).write_text(json.dumps(proof, ensure_ascii=False, indent=2) + '\n')
                failures = [c for c in cases if c['status'] == 'failed']
                count = 10 if PHASE == 'before' else 9
                expected = 0 if name == 'control' or (PHASE == 'before' and name in ['palette-one-loss', 'cause-replaced']) else (4 if PHASE == 'before' else 1) if name == 'transfer-error-context' else (2 if PHASE == 'before' else 4) if name == 'transfer-close' else 1
                assert run['exit'] == int(bool(expected)) and run['failed'] == len(failures) == expected and run['pending'] == 0
                assert len(data['testResults']) == 4 and len(cases) == run['passed'] + run['failed'] == count
                assert run['actWarnings'] == run['environmentWarnings'] == run['stderrBlocks'] == 0
                assert len(run['reportedErrors']) == len(failures) and all(e['errorName'] == 'AssertionError' for e in run['reportedErrors'])
                if PHASE == 'after' and name in ['palette-one-loss', 'cause-replaced']:
                    target = 'G02-A02' if name == 'palette-one-loss' else 'G02-A05'
                    assert len(failures) == 1 and target in failures[0]['fullName']
                print(json.dumps({k: v for k, v in run.items() if k not in ['command', 'cwd', 'copiesSha256', 'cases']}, ensure_ascii=False), flush=True)
        finally:
            for path in copies:
                path.unlink(missing_ok=True)
finally:
    proof['formalSourcesUnchanged'] = all((SRC / p).read_bytes() == b for p, b in originals.items())
    proof['temporaryCopiesRemoved'] = not list(SRC.rglob('pre94-3h-*'))
    (OUT / (PHASE + '-proof.json')).write_text(json.dumps(proof, ensure_ascii=False, indent=2) + '\n')
    assert proof['formalSourcesUnchanged'] and proof['temporaryCopiesRemoved']
