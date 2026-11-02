"""Rebuild six complete PNG probe graphs and verify native regression receipts."""
import gzip
import hashlib
import json
from pathlib import Path
import subprocess

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[4]
BASE = ROOT / 'packages/pal-extract/src/resources'


def sha(data):
    return hashlib.sha256(data).hexdigest()


proofs = [json.loads((OUT / (phase + '-proof.json')).read_bytes()) for phase in ['before', 'after']]
source_bytes = {}
identities = {}
for proof in proofs:
    phase = proof['phase']
    assert proof['formalSourcesUnchanged'] and proof['temporaryCopiesRemoved']
    files = {p: gzip.decompress((OUT / (phase + '-' + p + '.gz')).read_bytes()) for p in proof['formalSha256']}
    assert {p: sha(b) for p, b in files.items()} == proof['formalSha256']
    for p, b in files.items():
        if phase == 'before':
            assert b == subprocess.check_output(['git', 'show', proof['base'] + ':packages/pal-extract/src/resources/' + p], cwd=ROOT)
        else:
            assert b == (BASE / p).read_bytes()
    source_bytes[phase] = files['sprite.ts']
    assert len(proof['runs']) == 3
    for run in proof['runs']:
        name = run['name']
        stem = 'pre94-3d-' + phase + '-' + name
        source = files['sprite.ts'].decode()
        for old, new in proof['variants'][name]:
            assert source.count(old) == 1
            source = source.replace(old, new)
        assert sha(source.encode()) == run['moduleSha256']
        assert run['copiesSha256'][str((BASE / (stem + '-sprite.ts')).relative_to(ROOT))] == sha(source.encode())
        for p, b in files.items():
            if p == 'sprite.ts':
                continue
            copy = b.replace(b"'./sprite.js'", ("'./" + stem + "-sprite.js'").encode())
            assert sha(copy) == run['copiesSha256'][str((BASE / (stem + '-' + p)).relative_to(ROOT))]
        raw = gzip.decompress((OUT / (phase + '-' + name + '.raw.gz')).read_bytes())
        native = gzip.decompress((OUT / (phase + '-' + name + '.runner.json.gz')).read_bytes())
        assert sha(raw) == run['rawSha256'] and sha(native) == run['runnerSha256']
        parsed = json.loads(native)
        cases = [{'file': Path(s['name']).name.removeprefix(stem + '-'), 'fullName': c['fullName'], 'status': c['status'], 'messages': c['failureMessages']} for s in parsed['testResults'] for c in s['assertionResults']]
        assert cases == run['cases'] and len(parsed['testResults']) == 3
        expected = int(phase == 'after' and name != 'control')
        assert run['exit'] == expected and run['signal'] is None and run['spawnError'] is None
        assert run['failed'] == parsed['numFailedTests'] == expected
        assert run['pending'] == parsed['numPendingTests'] == 0
        assert run['passed'] == parsed['numPassedTests'] == (9 if phase == 'before' else 13) - expected
        assert all(c['status'] in ['passed', 'failed'] for c in cases)
        failures = [c for c in cases if c['status'] == 'failed']
        if expected:
            target = 'height 必须为整数' if name == 'height-integer' else 'height 必须为正数'
            assert len(failures) == 1 and target in failures[0]['fullName'] and 'AssertionError:' in ''.join(failures[0]['messages'])
        assert run['actWarnings'] == raw.count(b'not wrapped in act') == 0
        assert run['environmentWarnings'] == raw.count(b'not configured to support act') == 0
        assert run['stderrBlocks'] == raw.count(b'stderr |') == 0
        current = {(c['file'], c['fullName']) for c in cases}
        if name == 'control':
            identities[phase] = current
        else:
            assert current == identities[phase]
assert source_bytes['before'].split(b'export function encodeIndexedPng', 1)[1] == source_bytes['after'].split(b'export function encodeIndexedPng', 1)[1]
for p in ['sprite.test.ts', 'sprite.glm-runtime-resource.test.ts']:
    before = gzip.decompress((OUT / ('before-' + p + '.gz')).read_bytes())
    after = gzip.decompress((OUT / ('after-' + p + '.gz')).read_bytes())
    assert before.split(b'import ', 1)[1] == after.split(b'import ', 1)[1]
assert len(identities['before'] - identities['after']) == 2
assert len(identities['after'] - identities['before']) == 6
for row in json.loads((OUT / 'regressions.json').read_bytes()):
    raw = gzip.decompress((OUT / (row['name'] + '.raw.gz')).read_bytes())
    assert sha(raw) == row['rawSha256'] and row['exit'] == 0 and row['signal'] is None and row['spawnError'] is None
    assert row['actWarnings'] == row['environmentWarnings'] == row['stderrBlocks'] == 0
    if 'runnerSha256' in row:
        native = gzip.decompress((OUT / (row['name'] + '.runner.json.gz')).read_bytes())
        assert sha(native) == row['runnerSha256']
        data = json.loads(native)
        assert row['passed'] == data['numPassedTests'] and row['failed'] == row['pending'] == data['numFailedTests'] == data['numPendingTests'] == 0
        assert row['testFiles'] == len(data['testResults'])
# Match actual executed files, rather than crediting unmatched CLI filter strings.
regressions = json.loads((OUT / 'regressions.json').read_bytes())
row = next(r for r in regressions if r['name'] == 'adjacent-extract')
data = json.loads(gzip.decompress((OUT / 'adjacent-extract.runner.json.gz').read_bytes()))
assert row['actualTestFiles'] == [str(Path(t['name']).relative_to(ROOT / 'packages/pal-extract')) for t in data['testResults']]
assert len(row['actualTestFiles']) == row['testFiles'] == 6
assert all(not (ROOT / 'packages/pal-extract' / p).exists() for p in row['unmatchedRequestedFilters'])
data = json.loads(gzip.decompress((OUT / 'extract-full.runner.json.gz').read_bytes()))
actual = {str(Path(t['name']).relative_to(ROOT / 'packages/pal-extract')) for t in data['testResults']}
assert len(actual) == 72
assert {'src/resources/parsers/ball.glm-runtime-resource.test.ts', 'src/resources/parsers/rgm.glm-runtime-resource.test.ts'} <= actual

for p in ['scripts/coverage/config.mjs', 'scripts/coverage/baseline.fast.json', 'scripts/coverage/approved-test-retirements.mjs', 'scripts/coverage/approved-test-retirements.test.mjs']:
    assert (ROOT / p).read_bytes() == subprocess.check_output(['git', 'show', proofs[0]['base'] + ':' + p], cwd=ROOT)
assert not list(BASE.glob('pre94-3d-*'))
result = {'reviewer': 'Codex separate process; not third party', 'completeProbeRuns': 6, 'oldCases': 9, 'newCases': 13, 'oldGreenNewSingleAssertionErrorPins': 2, 'boundaryCases': '2 -> 6 independent contracts', 'productionImplementationUnchanged': True, 'glmTestBodyUnchanged': True, 'originalMainTestUnchanged': True, 'noNewRetirementOrBaselineChange': True, 'exactTemporaryCleanup': True, 'wholeFilesClosed': 0, 'wholeCardAccepted': False}
(OUT / 'verification.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(result))
