"""Reconstruct saved native runs and exact retirement inputs without executing tests."""
import gzip
import hashlib
import json
from pathlib import Path
import re
import subprocess

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[4]
SRC = ROOT / 'packages/game/src'


def sha(data):
    return hashlib.sha256(data).hexdigest()


def read(name):
    return gzip.decompress((OUT / (name + '.gz')).read_bytes())


phases = {}
for phase in ['before', 'after']:
    proof = json.loads((OUT / (phase + '-proof.json')).read_bytes())
    phases[phase] = proof
    originals = {p: read(phase + '-' + Path(p).name) for p in proof['formalSha256']}
    for p, data in originals.items():
        assert sha(data) == proof['formalSha256'][p]
        current = (SRC / p).read_bytes() if phase == 'after' else subprocess.check_output(['git', 'show', proof['base'] + ':packages/game/src/' + p], cwd=ROOT)
        assert current == data
    assert len(proof['runs']) == 5 and proof['formalSourcesUnchanged'] and proof['temporaryCopiesRemoved']
    control_ids = None
    for row in proof['runs']:
        stem = 'pre94-3h-' + phase + '-' + row['name']
        source = originals['assets/png.ts'].decode()
        for old, new in proof['variants'][row['name']]:
            assert source.count(old) == 1
            source = source.replace(old, new)
        assert sha(source.encode()) == row['moduleSha256']
        copies = {SRC / 'assets' / (stem + '-png.ts'): source.encode()}
        for p, data in originals.items():
            if p == 'assets/png.ts':
                continue
            old = b"'../../../assets/png.js'" if p.startswith('present/') else b"'./png.js'"
            new = ("'../../../assets/" + stem + "-png.js'").encode() if p.startswith('present/') else ("'./" + stem + "-png.js'").encode()
            assert data.count(old) == 1
            copies[(SRC / p).parent / (stem + '-' + Path(p).name)] = data.replace(old, new)
        assert {str(p.relative_to(ROOT)): sha(b) for p, b in copies.items()} == row['copiesSha256']
        assert not any(p.exists() for p in copies)
        raw = read(phase + '-' + row['name'] + '.raw')
        native = read(phase + '-' + row['name'] + '.runner.json')
        assert sha(raw) == row['rawSha256'] and sha(native) == row['runnerSha256']
        data = json.loads(native)
        cases = [{'file': Path(s['name']).name.removeprefix(stem + '-'), 'fullName': c['fullName'], 'status': c['status'], 'messages': c['failureMessages']} for s in data['testResults'] for c in s['assertionResults']]
        assert cases == row['cases'] and len(data['testResults']) == 4
        ids = sorted((c['file'], c['fullName']) for c in cases)
        if control_ids is None:
            control_ids = ids
        assert ids == control_ids and len(cases) == (10 if phase == 'before' else 9)
        failures = [c for c in cases if c['status'] == 'failed']
        assert len(failures) == row['failed'] == data['numFailedTests']
        assert row['passed'] == data['numPassedTests'] and row['pending'] == data['numPendingTests'] == 0
        assert row['exit'] == int(bool(failures)) and row['signal'] is row['spawnError'] is None
        assert row['actWarnings'] == row['environmentWarnings'] == row['stderrBlocks'] == 0
        lines = [line.strip() for line in re.sub(r'\x1b\[[0-9;]*m', '', raw.decode()).splitlines()]
        errors = []
        for suite in data['testResults']:
            for case in suite['assertionResults']:
                if case['status'] != 'failed':
                    continue
                header = 'FAIL  ' + str(Path(suite['name']).relative_to(ROOT / 'packages/game')) + ' > ' + ' > '.join([*case['ancestorTitles'], case['title']])
                assert lines.count(header) == 1
                detail = next(line for line in lines[lines.index(header) + 1:] if line)
                assert detail.startswith('AssertionError:')
                errors.append({'file': Path(suite['name']).name.removeprefix(stem + '-'), 'fullName': case['fullName'], 'errorName': 'AssertionError'})
        assert errors == row['reportedErrors']
    expected = [(10, 0), (10, 0), (10, 0), (6, 4), (8, 2)] if phase == 'before' else [(9, 0), (8, 1), (8, 1), (8, 1), (5, 4)]
    assert [(r['passed'], r['failed']) for r in proof['runs']] == expected
    if phase == 'after':
        for run, target in zip(proof['runs'][1:3], ['G02-A02', 'G02-A05']):
            assert len(run['reportedErrors']) == 1 and target in run['reportedErrors'][0]['fullName']

checkpoint = json.loads((OUT / 'before-classifier-checkpoint.json').read_bytes())
assert [r['name'] for r in checkpoint['runs']] == phases['before']['reusedNativeReceipts']
for old, current in zip(checkpoint['runs'], phases['before']['runs']):
    assert all(current[key] == value for key, value in old.items() if key != 'reportedErrors')
diagnostic = json.loads((OUT / 'classifier-diagnostic.json').read_bytes())
assert sha(read('probe-before-classifier-fix.py')) == diagnostic['originalProbeSha256']

collection = json.loads((OUT / 'collection.json').read_bytes())
assert collection['formalSourcesUnchanged'] and collection['temporaryCopiesRemoved']
assert collection['coverage']['before'] == collection['coverage']['after']
for row in collection['runs']:
    assert sha(read(row['phase'] + '-' + row['kind'] + '.raw')) == row['rawSha256']
    native = read(row['phase'] + ('-list.json' if row['kind'] == 'list' else '-v8.runner.json'))
    assert sha(native) == row['nativeSha256'] and row['exit'] == 0
    assert row['signal'] is row['spawnError'] is None
    assert row['actWarnings'] == row['environmentWarnings'] == row['stderrBlocks'] == 0
    actual = json.loads(native)
    if row['kind'] == 'list':
        for entry in actual:
            path = Path(entry['file'])
            if row['phase'] == 'before':
                assert path.name.startswith('pre94-3h-list-before-')
                path = path.with_name(path.name.removeprefix('pre94-3h-list-before-'))
            entry['file'] = str(path.relative_to(ROOT))
        script = "import {createHash} from 'node:crypto'; let text=''; for await(const c of process.stdin)text+=c; const rows=JSON.parse(text); const identities=rows.map(e=>e.file+' :: project '+(e.projectName||'root')+' :: '+e.name).sort((a,b)=>a.localeCompare(b)); if(new Set(identities).size!==identities.length)throw new Error('duplicate'); console.log(JSON.stringify({identities,files:[...new Set(rows.map(e=>e.file))].sort().map(file=>{const own=identities.filter(e=>e.startsWith(file+' :: ')); return {file,testCount:own.length,identityDigest:createHash('sha256').update(JSON.stringify(own)).digest('hex')}})}))"
        computed = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', script], input=json.dumps(actual).encode(), cwd=ROOT))
        assert computed == collection['identities'][row['phase']]
    else:
        assert len(actual['testResults']) == 4
        assert actual['numPassedTests'] == (10 if row['phase'] == 'before' else 9)
        assert actual['numFailedTests'] == actual['numPendingTests'] == 0
for phase in ['before', 'after']:
    summary = json.loads(read(phase + '-coverage-summary.json'))
    assert set(summary) == {'total', str(SRC / 'assets/png.ts')}
    assert summary[str(SRC / 'assets/png.ts')] == collection['coverage'][phase]
    coverage = json.loads(read(phase + '-coverage-final.json'))
    assert set(coverage) == {str(SRC / 'assets/png.ts')}
for snapshot in collection['snapshots'].values():
    for path, entry in snapshot['files'].items():
        data = subprocess.check_output(['git', 'show', snapshot['commit'] + ':packages/game/src/' + path], cwd=ROOT)
        assert sha(data) == entry['sha256'] == phases['before']['formalSha256'][path]
        assert entry['equalsBefore']

retirement = json.loads((OUT / 'retirement.json').read_bytes())
current = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', "import {approvedTestRetirements as rows} from './scripts/coverage/approved-test-retirements.mjs'; console.log(JSON.stringify(rows))"], cwd=ROOT))
assert current == retirement['oldRows'] + retirement['added']
assert len(current) == 29 and sum(e['previous'] - e['current'] for e in current) == 64
for entry in retirement['added']:
    for phase, key in [('before', 'previous'), ('after', 'current')]:
        actual = next(e for e in collection['identities'][phase]['files'] if e['file'] == entry['file'])
        assert entry[key] == actual['testCount'] and entry[key + 'IdentityDigest'] == actual['identityDigest']
    assert sha((ROOT / entry['file']).read_bytes()) == entry['fileSha256']
path = ROOT / 'scripts/coverage/approved-test-retirements.mjs'
assert read('before-approved-test-retirements.mjs').decode().split('export function isApprovedTestRetirement', 1)[1] == path.read_text().split('export function isApprovedTestRetirement', 1)[1]
path = ROOT / 'scripts/coverage/approved-test-retirements.test.mjs'
assert read('before-approved-test-retirements.test.mjs').decode().split('for (const approval', 1)[1] == path.read_text().split('for (const approval', 1)[1]
assert not list(SRC.rglob('pre94-3h-*'))
print('PASS: 10 native counter runs, 4 collection runs, unchanged production, exact retirement data and cleanup')
