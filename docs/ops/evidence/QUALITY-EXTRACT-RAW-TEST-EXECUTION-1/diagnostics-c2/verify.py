# -*- coding: utf-8 -*-
"""Read-only verification of receipts, exact copies, failure sets and cleanup."""
import gzip
import hashlib
import json
from pathlib import Path
import subprocess

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[4]
BASE = ROOT / 'packages/pal-extract/src'


def sha(data):
    return hashlib.sha256(data).hexdigest()


proofs = [json.loads((OUT / (phase + '-proof.json')).read_text()) for phase in ('before', 'after')]
assert proofs[0]['variants'] == proofs[1]['variants']
source = (BASE / proofs[0]['sourcePath']).read_bytes()
barrel = (BASE / 'resources/tables.ts').read_bytes()
for proof in proofs:
    phase = proof['phase']
    assert sha(source) == proof['sourceSha256'] and sha(barrel) == proof['barrelSha256']
    assert all(proof[k] for k in ('sourcesUnchanged', 'testsUnchanged', 'copiesRemoved'))
    tests = {p: gzip.decompress((OUT / (phase + '-' + Path(p).name + '.gz')).read_bytes()) for p in proof['testSha256']}
    assert {p: sha(b) for p, b in tests.items()} == proof['testSha256']
    for p, data in tests.items():
        if phase == 'after':
            assert (BASE / p).read_bytes() == data
        else:
            assert subprocess.check_output(['git', 'show', proof['baseCommit'] + ':packages/pal-extract/src/' + p], cwd=ROOT) == data
    identities = {(c['file'], c['fullName']) for c in proof['runs'][0]['cases']}
    assert len(identities) == 92
    for run in proof['runs']:
        name = run['name']
        stem = 'pre94-c2-' + phase + '-' + name
        module = source.decode()
        for old, new in proof['variants'][name]:
            assert module.count(old) == 1
            module = module.replace(old, new)
        assert sha(module.encode()) == run['moduleSha256']
        assert sha(barrel.replace(b'./parsers/enemy-teams.js', ('./parsers/' + stem + '.js').encode())) == run['barrelSha256']
        for test, data in tests.items():
            data = data.replace(b"./tables.js'", ('./' + stem + "-tables.js'").encode()).replace(b"../enemy-teams.js'", ('../' + stem + ".js'").encode())
            path = str((BASE / Path(test).parent / (stem + '-' + Path(test).name)).relative_to(ROOT))
            assert sha(data) == run['testCopySha256'][path]
        raw = gzip.decompress((OUT / (phase + '-' + name + '.raw.gz')).read_bytes())
        native = gzip.decompress((OUT / (phase + '-' + name + '.runner.json.gz')).read_bytes())
        assert sha(raw) == run['rawSha256'] and sha(native) == run['runnerSha256']
        parsed = json.loads(native)
        cases = [{'file': Path(s['name']).name.removeprefix(stem + '-'), 'fullName': c['fullName'], 'status': c['status'], 'messages': c['failureMessages']} for s in parsed['testResults'] for c in s['assertionResults']]
        assert cases == run['cases']
        assert {(c['file'], c['fullName']) for c in cases} == identities
        failed = [c for c in cases if c['status'] == 'failed']
        red = name != 'control' and (phase == 'after' or name.startswith(('retained-', 'transferred-')))
        assert parsed['numPassedTests'] == run['passed'] == 92 - int(red)
        assert parsed['numFailedTests'] == run['failed'] == len(failed) == int(red)
        assert run['exit'] == int(red) and run['signal'] is None and run['pending'] == parsed['numPendingTests'] == 0
        assert all('AssertionError:' in ''.join(c['messages']) for c in failed)
        if red:
            needle = 'M3.30 翻译模式:OBJECT 索引不在 map 中' if phase == 'before' and name.startswith('transferred-') else ('未知 OBJECT 999' if name.startswith(('unknown-', 'transferred-')) else '两 OBJECT 映同 enemyId')
            assert needle in failed[0]['fullName']
        assert raw.count(b'stderr |') == run['stderrBlocks']
        if phase == 'after':
            assert run['stderrBlocks'] == 0
old = gzip.decompress((OUT / 'before-tables.test.ts.gz').read_bytes()).decode()
start = old.index("  it('M3.30 翻译模式:OBJECT 索引不在 map 中")
end = old.index("  it('M3.30 buildObjectIndexToEnemyIdMap:", start)
assert old[:start] + old[end:] == (BASE / 'resources/tables.test.ts').read_text()
inventory = json.loads((OUT / 'inventory.json').read_text())
assert len(inventory['native']['before']['identities']) == len(inventory['native']['after']['identities']) == 92
assert len(inventory['removedIdentities']) == len(inventory['addedIdentities']) == 2
assert all(row['fastEntries'] == [] for row in inventory['snapshots'])
for phase in ('before', 'after'):
    receipt = json.loads((OUT / (phase + '-coverage.json')).read_text())
    coverage = gzip.decompress((OUT / (phase + '-coverage.json.gz')).read_bytes())
    assert sha(coverage) == receipt['coverageSha256'] and receipt['exit'] == 0
    assert receipt['metrics'] == {'enemy-teams.ts': {'statements': {'covered': 32, 'total': 32}, 'functions': {'covered': 2, 'total': 2}, 'branches': {'covered': 22, 'total': 22}}}
for row in json.loads((OUT / 'regressions.json').read_text()):
    raw = gzip.decompress((OUT / (row['name'] + '.raw.gz')).read_bytes())
    assert sha(raw) == row['rawSha256'] and row['exit'] == 0 and row['stderrBlocks'] == raw.count(b'stderr |') == 0
assert not list(BASE.rglob('pre94-c2-*'))
baseline = ROOT / 'scripts/coverage/baseline.fast.json'
assert baseline.read_bytes() == subprocess.check_output(['git', 'show', proofs[0]['baseCommit'] + ':scripts/coverage/baseline.fast.json'], cwd=ROOT)
result = {'verifiedBy': 'Codex, separate read-only process; not independent third party', 'fullRuns': 20, 'oldGreenNewSingleAssertionError': 7, 'existingNameOracleRetained': True, 'exact999OracleTransferred': True, 'originalSourceAndBarrelUnchanged': True, 'testIdentityCountBefore': 92, 'testIdentityCountAfter': 92, 'tableChangeOnlyExactDeletion': True, 'realV8CountsKept': True, 'officialBaselineUnchanged': True, 'temporaryCopiesRemoved': True, 'wholeFilesClosed': 0}
(OUT / 'verification.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result))
