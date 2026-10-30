"""Run isolated source copies; never mutate the formal implementation or tests."""
import gzip
import hashlib
import json
from pathlib import Path
import re
import subprocess
import tempfile

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[4]
SHELL = ROOT / 'packages/game/src/shell'
BASE = '8f5a9af5d314'
FILES = ['fetch-retry.test.ts', 'fetch-retry.boundaries.test.ts',
         'fetch-retry.glm-phase1-leaves.test.ts', 'fetch-retry.cancellation.test.ts']
formal = {p: (SHELL / p).read_bytes() for p in ['fetch-retry.ts', *FILES]}
source = formal['fetch-retry.ts'].decode()
variants = {
    'before-final': [],
    'control': [],
    'timeout-listener-leak': [('const timer = setTimeout(() => {\n      signal?.removeEventListener(\'abort\', onAbort)\n', 'const timer = setTimeout(() => {\n')],
    'null-falls-back': [('init?.signal !== undefined', 'init?.signal != null')],
    'masks-initial-validation': [('\n      try {\n', '\n      if (signal?.aborted) throw signal.reason\n      try {\n')],
}
targets = {'timeout-listener-leak': 'init.signal=signal', 'null-falls-back': 'init.signal=null',
           'masks-initial-validation': '不遮蔽原生 Request 构造错误'}


def sha(data):
    return hashlib.sha256(data).hexdigest()


proof = {'base': BASE, 'formalSha256': {p: sha(b) for p, b in formal.items()},
         'variants': variants, 'runs': []}
for p, data in formal.items():
    (OUT / ('formal-' + p + '.gz')).write_bytes(gzip.compress(data, mtime=0))
try:
    for name, replacements in variants.items():
        changed = subprocess.check_output(['git', 'show', BASE + ':packages/game/src/shell/fetch-retry.ts'], cwd=ROOT).decode() if name == 'before-final' else source
        for old, new in replacements:
            assert changed.count(old) == 1
            changed = changed.replace(old, new)
        stem = 'pre94-cancel-c1-' + name + '-'
        copies = {SHELL / (stem + 'fetch-retry.ts'): changed.encode()}
        for p in FILES:
            assert formal[p].count(b"'./fetch-retry.js'") == 1
            copies[SHELL / (stem + p)] = formal[p].replace(b"'./fetch-retry.js'", ("'./" + stem + "fetch-retry.js'").encode())
        assert not any(p.exists() for p in copies)
        try:
            for p, data in copies.items():
                p.write_bytes(data)
            with tempfile.TemporaryDirectory(prefix='type-pal-cancel-counter-') as temp:
                report = Path(temp) / 'runner.json'
                command = ['pnpm', '--filter', '@type-pal/game', 'exec', 'vitest', 'run', *['src/shell/' + stem + p for p in FILES], '--maxWorkers=1', '--silent=false', '--reporter=default', '--reporter=json', '--outputFile.json=' + str(report)]
                result = subprocess.run(command, cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
                raw = result.stdout
                native = report.read_bytes()
                data = json.loads(native)
                cases = [{'file': Path(s['name']).name.removeprefix(stem), 'fullName': c['fullName'], 'status': c['status'], 'failureMessages': c['failureMessages']} for s in data['testResults'] for c in s['assertionResults']]
                row = {'name': name, 'command': command, 'cwd': str(ROOT), 'exit': max(0, result.returncode), 'signal': -result.returncode if result.returncode < 0 else None, 'spawnError': None, 'moduleSha256': sha(changed.encode()), 'copiesSha256': {str(p.relative_to(ROOT)): sha(b) for p, b in copies.items()}, 'rawSha256': sha(raw), 'runnerSha256': sha(native), 'files': len(data['testResults']), 'passed': data['numPassedTests'], 'failed': data['numFailedTests'], 'pending': data['numPendingTests'], 'stderrBlocks': raw.count(b'stderr |'), 'actWarnings': raw.count(b'not wrapped in act('), 'environmentWarnings': raw.count(b'not configured to support act('), 'cases': cases}
                for suffix, body in [('raw', raw), ('runner.json', native)]:
                    (OUT / (name + '.' + suffix + '.gz')).write_bytes(gzip.compress(body, mtime=0))
                proof['runs'].append(row)
                (OUT / 'counter.json').write_text(json.dumps(proof, ensure_ascii=False, indent=2) + '\n')
                assert row['pending'] == row['stderrBlocks'] == row['actWarnings'] == row['environmentWarnings'] == 0
                assert row['signal'] is None and row['files'] == 4
                expected = (23, 3) if name == 'before-final' else (26, 0) if name == 'control' else (25, 1)
                assert (row['passed'], row['failed']) == expected
                assert result.returncode == int(bool(row['failed']))
                if name in targets:
                    failed = [c for c in cases if c['status'] == 'failed']
                    assert len(failed) == 1 and targets[name] in failed[0]['fullName']
                    assert 'AssertionError:' in failed[0]['failureMessages'][0]
                    lines = re.sub(r'\x1b\[[0-9;]*m', '', raw.decode()).splitlines()
                    headers = [i for i, line in enumerate(lines) if line.strip().startswith('FAIL  ')]
                    assert len(headers) == 1
                    assert next(line.strip() for line in lines[headers[0]+1:] if line.strip()).startswith('AssertionError:')
                print(name, row['passed'], row['failed'], flush=True)
        finally:
            for p in copies:
                p.unlink(missing_ok=True)
finally:
    proof['formalSourcesUnchanged'] = all((SHELL / p).read_bytes() == b for p, b in formal.items())
    proof['temporaryCopiesRemoved'] = not list(SHELL.glob('pre94-cancel-c1-*'))
    (OUT / 'counter.json').write_text(json.dumps(proof, ensure_ascii=False, indent=2) + '\n')
    assert proof['formalSourcesUnchanged'] and proof['temporaryCopiesRemoved']
ids = [sorted((c['file'], c['fullName']) for c in row['cases']) for row in proof['runs']]
assert all(own == ids[0] and len(set(own)) == 26 for own in ids)
