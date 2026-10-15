"""Read-only reconstruction of bootstrap counters, actual IO and exact identities."""
import ast
import gzip
import hashlib
import json
from pathlib import Path
import re
import subprocess

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[5]
SRC = ROOT / 'packages/game/src'
TESTS = ['shell/bootstrap-resources.test.ts', 'shell/bootstrap-resources.grok-mid-1.test.ts']


def sha(data):
    return hashlib.sha256(data).hexdigest()


def saved(name):
    return gzip.decompress((OUT / (name + '.gz')).read_bytes())


def errors(raw, data):
    lines = [line.strip() for line in re.sub(r'\x1b\[[0-9;]*m', '', raw.decode()).splitlines()]
    headers = {}
    for suite in data['testResults']:
        for case in suite['assertionResults']:
            if case['status'] == 'failed':
                header = 'FAIL  ' + str(Path(suite['name']).relative_to(ROOT / 'packages/game')) + ' > ' + ' > '.join([*case['ancestorTitles'], case['title']])
                headers[header] = case['failureMessages']
    failed = []
    for suite in data['testResults']:
        for case in suite['assertionResults']:
            if case['status'] != 'failed':
                continue
            header = 'FAIL  ' + str(Path(suite['name']).relative_to(ROOT / 'packages/game')) + ' > ' + ' > '.join([*case['ancestorTitles'], case['title']])
            assert lines.count(header) == 1
            remaining = iter(line for line in lines[lines.index(header) + 1:] if line)
            detail = next(remaining)
            while detail in headers:
                assert headers[detail] == headers[header]
                detail = next(remaining)
            assert detail.startswith('AssertionError:')
            failed.append(case['fullName'])
    return failed


proofs = {}
for phase in ['before', 'after']:
    proof = json.loads((OUT / (phase + '-proof.json')).read_bytes())
    proofs[phase] = proof
    originals = {p: saved(phase + '-' + Path(p).name) for p in proof['formalSha256']}
    for p, data in originals.items():
        assert sha(data) == proof['formalSha256'][p]
        actual = (SRC / p).read_bytes() if phase == 'after' else subprocess.check_output(['git', 'show', proof['base'] + ':packages/game/src/' + p], cwd=ROOT)
        assert actual == data
    assert proof['formalSourcesUnchanged'] and proof['temporaryCopiesRemoved']
    expected = [(13, 0), (13, 0), (13, 0), (11, 2), (11, 2)] if phase == 'before' else [(12, 0), (11, 1), (11, 1), (11, 1), (11, 1)]
    assert [(r['passed'], r['failed']) for r in proof['runs']] == expected
    ids = None
    for row in proof['runs']:
        source = originals['shell/bootstrap-resources.ts'].decode()
        for old, new in proof['variants'][row['name']]:
            assert source.count(old) == 1
            source = source.replace(old, new)
        assert sha(source.encode()) == row['moduleSha256']
        stem = 'pre94-3h-boot-' + phase + '-' + row['name']
        copies = {SRC / 'shell' / (stem + '-bootstrap-resources.ts'): source.encode()}
        for p in TESTS:
            data = originals[p]
            old = b"'./bootstrap-resources.js'"
            assert data.count(old) == 1
            copies[(SRC / p).with_name(stem + '-' + Path(p).name)] = data.replace(old, ("'./" + stem + "-bootstrap-resources.js'").encode())
        assert {str(p.relative_to(ROOT)): sha(b) for p, b in copies.items()} == row['copiesSha256']
        assert not any(p.exists() for p in copies)
        raw = saved(phase + '-' + row['name'] + '.raw')
        native = saved(phase + '-' + row['name'] + '.runner.json')
        assert sha(raw) == row['rawSha256'] and sha(native) == row['runnerSha256']
        data = json.loads(native)
        cases = [{'file': Path(s['name']).name.removeprefix(stem + '-'), 'fullName': c['fullName'], 'status': c['status'], 'messages': c['failureMessages']} for s in data['testResults'] for c in s['assertionResults']]
        assert cases == row['cases'] and len(data['testResults']) == 2
        current_ids = sorted((c['file'], c['fullName']) for c in cases)
        ids = current_ids if ids is None else ids
        assert current_ids == ids
        assert row['passed'] == data['numPassedTests'] and row['failed'] == data['numFailedTests']
        assert row['pending'] == data['numPendingTests'] == row['actWarnings'] == row['environmentWarnings'] == row['stderrBlocks'] == 0
        assert row['exit'] == int(bool(row['failed'])) and row['signal'] is row['spawnError'] is None
        failed = errors(raw, data)
        assert failed == [e['fullName'] for e in row['reportedErrors']]
        if phase == 'after' and row['name'] in ['soundfont-error-cloned', 'glyph-shortcut']:
            target = 'keeps the original soundfont rejection' if row['name'] == 'soundfont-error-cloned' else 'soundfont 先 settle'
            assert len(failed) == 1 and target in failed[0]

timing = json.loads((OUT / 'before-fixture-timing.json').read_bytes())
assert timing['nativeBeforeFinishedAtMs'] < timing['fixtureFirstEditMtimeMs'] and timing['beforeRunsFinishedBeforeFixtureEdit']
before_helper = subprocess.check_output(['git', 'show', proofs['before']['base'] + ':packages/game/src/__tests__/grok-boot-mid-1/legal.ts'], cwd=ROOT)
assert saved('before-legal.ts') == before_helper

io = json.loads((OUT / 'io-observation.json').read_bytes())
assert io['formalSourcesUnchanged'] and io['temporaryCopiesRemoved'] and len(io['runs']) == 3
for p, digest in io['formalSha256'].items():
    assert sha((SRC / p).read_bytes()) == digest
hook = next(ast.literal_eval(n.value) for n in ast.parse((OUT / 'io-observer.py').read_text()).body if isinstance(n, ast.Assign) and any(isinstance(t, ast.Name) and t.id == 'HOOK' for t in n.targets))
for row in io['runs']:
    phase = row['phase']
    stem = 'pre94-3h-boot-io-' + phase + '-'
    helper_path = SRC / '__tests__/grok-boot-mid-1' / (stem + 'legal.ts')
    copies = {helper_path: before_helper if phase == 'before' else (SRC / '__tests__/grok-boot-mid-1/legal.ts').read_bytes()}
    for p in TESTS:
        data = saved('before-' + Path(p).name) if phase == 'before' else (SRC / p).read_bytes()
        if phase == 'failed-after' and 'grok-mid-1' in p:
            before, marker, after = data.partition('  it(\'默认端口'.encode())
            assert marker and after.count(b'    expect(ready).toBe(false)') == 2
            data = before + marker + after.replace(b'    expect(ready).toBe(false)', b'    expect(ready).toBe(false)\n    expect(false).toBe(true)')
        data = data.replace(b"'../__tests__/grok-boot-mid-1/legal.js'", ("'../__tests__/grok-boot-mid-1/" + stem + "legal.js'").encode())
        copies[(SRC / p).with_name(stem + Path(p).name)] = data + hook.encode()
    assert {str(p.relative_to(ROOT)): sha(b) for p, b in copies.items()} == row['copiesSha256']
    raw = saved(phase + '-io.raw')
    native = saved(phase + '-io.runner.json')
    assert sha(raw) == row['rawSha256'] and sha(native) == row['runnerSha256']
    observations = [json.loads(line.split('PRE94_BOOT_IO ', 1)[1]) for line in raw.decode().splitlines() if line.startswith('PRE94_BOOT_IO ')]
    assert observations == row['observations'] and len(observations) == 9
    held = [o for o in observations if o['pending']]
    failed = errors(raw, json.loads(native))
    assert len(failed) == row['failed'] and all('默认' in name for name in failed)
    assert [(row['passed'], row['failed'], row['exit'])] == ([(11, 2, 1)] if phase == 'before' else [(12, 0, 0)] if phase == 'after' else [(10, 2, 1)])
    assert len(held) == (2 if phase == 'before' else 0)
    assert all(len(o['pending']) == 4 for o in held)

collection = json.loads((OUT / 'collection.json').read_bytes())
script = "import {createHash} from 'node:crypto';let s='';for await(const c of process.stdin)s+=c;const rows=JSON.parse(s);const identities=rows.map(e=>e.file+' :: project '+(e.projectName||'root')+' :: '+e.name).sort((a,b)=>a.localeCompare(b));if(new Set(identities).size!==identities.length)throw Error('duplicate');console.log(JSON.stringify({identities,files:[...new Set(rows.map(e=>e.file))].sort().map(file=>{const own=identities.filter(e=>e.startsWith(file+' :: '));return{file,testCount:own.length,identityDigest:createHash('sha256').update(JSON.stringify(own)).digest('hex')}})}))"
for row in collection['runs']:
    phase = row['phase']
    raw = saved(phase + '-' + row['kind'] + '.raw')
    native = saved(phase + ('-list.json' if row['kind'] == 'list' else '-v8.runner.json'))
    assert sha(raw) == row['rawSha256'] and sha(native) == row['nativeSha256'] and row['exit'] == 0
    data = json.loads(native)
    if row['kind'] == 'list':
        for entry in data:
            path = Path(entry['file'])
            if phase != 'after':
                prefix = 'pre94-3h-list-' + phase + '-'
                assert path.name.startswith(prefix)
                path = path.with_name(path.name.removeprefix(prefix))
            entry['file'] = str(path.relative_to(ROOT))
        assert json.loads(subprocess.check_output(['node', '--input-type=module', '-e', script], input=json.dumps(data).encode(), cwd=ROOT)) == collection['identities'][phase]
    else:
        assert len(data['testResults']) == 2 and data['numPassedTests'] == (13 if phase == 'before' else 12)
        assert data['numFailedTests'] == data['numPendingTests'] == 0
        summary = json.loads(saved(phase + '-coverage-summary.json'))
        assert set(summary) == {'total', str(SRC / 'shell/bootstrap-resources.ts')}
        assert summary[str(SRC / 'shell/bootstrap-resources.ts')] == collection['coverage'][phase]
assert len(collection['runs']) == 5 and collection['coverage']['before'] == collection['coverage']['after']
for snapshot in collection['snapshots'].values():
    for p, entry in snapshot['files'].items():
        data = subprocess.check_output(['git', 'show', snapshot['commit'] + ':packages/game/src/' + p], cwd=ROOT)
        assert sha(data) == entry['sha256'] and entry['equalsBefore'] == (data == saved('before-' + Path(p).name))
retirement = json.loads((OUT / 'retirement.json').read_bytes())
current = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', "import {approvedTestRetirements as r} from './scripts/coverage/approved-test-retirements.mjs';console.log(JSON.stringify(r))"], cwd=ROOT))
assert current == retirement['oldRows'] + retirement['added'] and len(current) == 30
assert sum(e['previous'] - e['current'] for e in current) == 65
for entry in retirement['added']:
    for phase, key in [('before', 'previous'), ('after', 'current')]:
        item = next(e for e in collection['identities'][phase]['files'] if e['file'] == entry['file'])
        assert item['testCount'] == entry[key] and item['identityDigest'] == entry[key + 'IdentityDigest']
    assert sha((ROOT / entry['file']).read_bytes()) == entry['fileSha256']
assert sha((ROOT / 'scripts/coverage/baseline.fast.json').read_bytes()) == retirement['baselineSha256']
for filename, marker in [('approved-test-retirements.mjs', 'export function isApprovedTestRetirement'), ('approved-test-retirements.test.mjs', 'for (const approval')]:
    assert saved('before-' + filename).decode().split(marker, 1)[1] == (ROOT / 'scripts/coverage' / filename).read_text().split(marker, 1)[1]
assert not list(SRC.rglob('pre94-3h-*'))
print('PASS: 10 business/transfer runs, 3 IO observations, 5 list/V8 runs; exact metadata and cleanup')
