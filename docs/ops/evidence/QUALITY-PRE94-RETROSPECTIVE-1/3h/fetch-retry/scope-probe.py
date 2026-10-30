"""A valid preflight-abort reference must remain acceptable to the test suite."""
import gzip
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[5]
SRC = ROOT / 'packages/game/src/shell'
TESTS = ['fetch-retry.test.ts', 'fetch-retry.boundaries.test.ts', 'fetch-retry.glm-phase1-leaves.test.ts']
formal = {p: (SRC / p).read_bytes() for p in ['fetch-retry.ts', *TESTS]}


def sha(data):
    return hashlib.sha256(data).hexdigest()


proof = {'base': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(), 'formalSha256': {p: sha(b) for p, b in formal.items()}, 'runs': []}
assert not (OUT / 'scope-proof.json').exists()
source = formal['fetch-retry.ts'].decode()
old = '    let lastErr: unknown\n'
new = '    if (init?.signal?.aborted) throw init.signal.reason\n' + old
assert source.count(old) == 1
reference = source.replace(old, new).encode()
proof['referenceReplacement'] = [old, new]
try:
    for phase in ['initial', 'final']:
        stem = 'pre94-3h-retry-scope-' + phase
        copies = {SRC / (stem + '-fetch-retry.ts'): reference}
        for p in TESTS:
            data = gzip.decompress((OUT / 'initial-candidate' / ('after-' + p + '.gz')).read_bytes()) if phase == 'initial' else formal[p]
            copies[SRC / (stem + '-' + p)] = data.replace(b"'./fetch-retry.js'", ("'./" + stem + "-fetch-retry.js'").encode())
        assert not any(p.exists() for p in copies)
        try:
            for p, b in copies.items():
                p.write_bytes(b)
            with tempfile.TemporaryDirectory(prefix='type-pal-retry-scope-') as temp:
                native = Path(temp) / 'runner.json'
                command = ['pnpm', '--filter', '@type-pal/game', 'exec', 'vitest', 'run', *[str(p.relative_to(ROOT / 'packages/game')) for p in copies if '.test.ts' in p.name], '--maxWorkers=1', '--silent=false', '--reporter=default', '--reporter=json', '--outputFile.json=' + str(native)]
                run = subprocess.run(command, cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
                raw = run.stdout
                result = native.read_bytes()
                for suffix, data in [('raw', raw), ('runner.json', result)]:
                    (OUT / ('scope-' + phase + '.' + suffix + '.gz')).write_bytes(gzip.compress(data, mtime=0))
                data = json.loads(result)
                failures = [c for s in data['testResults'] for c in s['assertionResults'] if c['status'] == 'failed']
                row = {'phase': phase, 'command': command, 'cwd': str(ROOT), 'exit': run.returncode, 'signal': -run.returncode if run.returncode < 0 else None, 'spawnError': None, 'passed': data['numPassedTests'], 'failed': data['numFailedTests'], 'pending': data['numPendingTests'], 'failures': failures, 'rawSha256': sha(raw), 'runnerSha256': sha(result), 'copiesSha256': {str(p.relative_to(ROOT)): sha(b) for p, b in copies.items()}, 'stderrBlocks': raw.count(b'stderr |')}
                proof['runs'].append(row)
                assert len(data['testResults']) == 3 and row['pending'] == row['stderrBlocks'] == 0
                if phase == 'initial':
                    assert (row['exit'], row['passed'], row['failed']) == (1, 18, 1)
                    assert len(failures) == 1 and '已取消的 init.signal' in failures[0]['fullName']
                    assert all(message.startswith('AssertionError:') for message in failures[0]['failureMessages'])
                else:
                    assert (row['exit'], row['passed'], row['failed']) == (0, 19, 0)
                print(json.dumps({k: v for k, v in row.items() if k not in ['command', 'cwd', 'copiesSha256', 'failures']}), flush=True)
        finally:
            for p in copies:
                p.unlink(missing_ok=True)
finally:
    proof['formalSourcesUnchanged'] = all((SRC / p).read_bytes() == b for p, b in formal.items())
    proof['temporaryCopiesRemoved'] = not list(SRC.rglob('pre94-3h-*'))
    (OUT / 'scope-proof.json').write_text(json.dumps(proof, ensure_ascii=False, indent=2) + '\n')
    assert proof['formalSourcesUnchanged'] and proof['temporaryCopiesRemoved']
