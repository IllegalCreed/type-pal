"""Reconstruct final retry evidence without running tests or modifying approvals."""
import gzip
import hashlib
import json
from pathlib import Path
import re
import subprocess

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[5]
SRC = ROOT / 'packages/game/src'
TESTS = ['shell/fetch-retry.test.ts', 'shell/fetch-retry.boundaries.test.ts', 'shell/fetch-retry.glm-phase1-leaves.test.ts']


def sha(data):
    return hashlib.sha256(data).hexdigest()


def saved(name, folder=OUT):
    return gzip.decompress((folder / (name + '.gz')).read_bytes())


def failures(raw, data):
    lines = [line.strip() for line in re.sub(r'\x1b\[[0-9;]*m', '', raw.decode()).splitlines()]
    names = []
    for suite in data['testResults']:
        for case in suite['assertionResults']:
            if case['status'] != 'failed':
                continue
            header = 'FAIL  ' + str(Path(suite['name']).relative_to(ROOT / 'packages/game')) + ' > ' + ' > '.join([*case['ancestorTitles'], case['title']])
            assert lines.count(header) == 1
            detail = next(line for line in lines[lines.index(header) + 1:] if line)
            assert detail.startswith('AssertionError:')
            names.append(case['fullName'])
    return names


proofs = {}
for phase in ['before', 'after']:
    proof = json.loads((OUT / (phase + '-proof.json')).read_bytes())
    proofs[phase] = proof
    originals = {p: saved(phase + '-' + Path(p).name) for p in proof['formalSha256']}
    for p, data in originals.items():
        assert sha(data) == proof['formalSha256'][p]
        actual = (SRC / p).read_bytes() if phase == 'after' else subprocess.check_output(['git', 'show', proof['base'] + ':packages/game/src/' + p], cwd=ROOT)
        assert actual == data
    expected = [(18, 0)] * 4 + [(17, 1)] * 3 if phase == 'before' else [(19, 0)] + [(18, 1)] * 6
    assert [(r['passed'], r['failed']) for r in proof['runs']] == expected
    assert proof['formalSourcesUnchanged'] and proof['temporaryCopiesRemoved']
    ids = None
    for row in proof['runs']:
        source = originals['shell/fetch-retry.ts'].decode()
        for old, new in proof['variants'][row['name']]:
            assert source.count(old) == 1
            source = source.replace(old, new)
        assert sha(source.encode()) == row['moduleSha256']
        stem = 'pre94-3h-retry-' + phase + '-' + row['name']
        copies = {SRC / 'shell' / (stem + '-fetch-retry.ts'): source.encode()}
        for p in TESTS:
            data = originals[p]
            old = b"'./fetch-retry.js'"
            assert data.count(old) == 1
            copies[(SRC / p).with_name(stem + '-' + Path(p).name)] = data.replace(old, ("'./" + stem + "-fetch-retry.js'").encode())
        assert {str(p.relative_to(ROOT)): sha(b) for p, b in copies.items()} == row['copiesSha256']
        assert not any(p.exists() for p in copies)
        raw = saved(phase + '-' + row['name'] + '.raw')
        native = saved(phase + '-' + row['name'] + '.runner.json')
        assert sha(raw) == row['rawSha256'] and sha(native) == row['runnerSha256']
        data = json.loads(native)
        cases = [{'file': Path(s['name']).name.removeprefix(stem + '-'), 'fullName': c['fullName'], 'status': c['status'], 'messages': c['failureMessages']} for s in data['testResults'] for c in s['assertionResults']]
        assert cases == row['cases'] and len(data['testResults']) == 3
        current_ids = sorted((c['file'], c['fullName']) for c in cases)
        ids = current_ids if ids is None else ids
        assert current_ids == ids
        assert row['passed'] == data['numPassedTests'] and row['failed'] == data['numFailedTests']
        assert row['pending'] == data['numPendingTests'] == row['actWarnings'] == row['environmentWarnings'] == row['stderrBlocks'] == 0
        assert row['exit'] == int(bool(row['failed'])) and row['signal'] is row['spawnError'] is None
        failed = failures(raw, data)
        assert failed == [e['fullName'] for e in row['reportedErrors']]
        assert all(e['errorName'] == 'AssertionError' for e in row['reportedErrors'])
        if phase == 'after' and row['name'] in ['first-error-retained', 'uninstall-no-restore', 'init-abort-guard-removed']:
            target = {'first-error-retained': '网络失败耗尽', 'uninstall-no-restore': '安装后网络错误', 'init-abort-guard-removed': 'init.signal'}[row['name']]
            assert len(failed) == 1 and target in failed[0]

scope = json.loads((OUT / 'scope-proof.json').read_bytes())
for p, digest in scope['formalSha256'].items():
    assert sha((SRC / 'shell' / p).read_bytes()) == digest
source = (SRC / 'shell/fetch-retry.ts').read_text()
old, new = scope['referenceReplacement']
assert source.count(old) == 1
reference = source.replace(old, new).encode()
for row in scope['runs']:
    phase = row['phase']
    stem = 'pre94-3h-retry-scope-' + phase
    copies = {SRC / 'shell' / (stem + '-fetch-retry.ts'): reference}
    for p in TESTS:
        data = saved('after-' + Path(p).name, OUT / 'initial-candidate') if phase == 'initial' else (SRC / p).read_bytes()
        copies[(SRC / p).with_name(stem + '-' + Path(p).name)] = data.replace(b"'./fetch-retry.js'", ("'./" + stem + "-fetch-retry.js'").encode())
    assert {str(p.relative_to(ROOT)): sha(b) for p, b in copies.items()} == row['copiesSha256']
    raw = saved('scope-' + phase + '.raw')
    native = saved('scope-' + phase + '.runner.json')
    assert sha(raw) == row['rawSha256'] and sha(native) == row['runnerSha256']
    failed = failures(raw, json.loads(native))
    assert len(failed) == row['failed'] == (1 if phase == 'initial' else 0)
    if failed:
        assert '已取消的 init.signal' in failed[0]
assert [(r['passed'], r['failed'], r['exit']) for r in scope['runs']] == [(18, 1, 1), (19, 0, 0)]

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
                prefix = 'pre94-3h-retry-list-' + phase + '-'
                assert path.name.startswith(prefix)
                path = path.with_name(path.name.removeprefix(prefix))
            entry['file'] = str(path.relative_to(ROOT))
        assert json.loads(subprocess.check_output(['node', '--input-type=module', '-e', script], input=json.dumps(data).encode(), cwd=ROOT)) == collection['identities'][phase]
    else:
        assert len(data['testResults']) == 3 and data['numPassedTests'] == (18 if phase == 'before' else 19)
        assert data['numFailedTests'] == data['numPendingTests'] == 0
        summary = json.loads(saved(phase + '-coverage-summary.json'))
        assert set(summary) == {'total', str(SRC / 'shell/fetch-retry.ts')}
        assert summary[str(SRC / 'shell/fetch-retry.ts')] == collection['coverage'][phase]
assert len(collection['runs']) == 5 and collection['coverage']['before'] == collection['coverage']['after']
for snapshot in collection['snapshots'].values():
    for p, entry in snapshot['files'].items():
        data = subprocess.check_output(['git', 'show', snapshot['commit'] + ':packages/game/src/' + p], cwd=ROOT)
        assert sha(data) == entry['sha256'] and entry['equalsBefore'] == (data == saved('before-' + Path(p).name))

receipt = json.loads((OUT / 'real-abort-receipt.json').read_bytes())
raw = saved('real-abort.raw')
abort = json.loads((OUT / 'real-abort-proof.json').read_bytes())
assert sha(raw) == receipt['rawSha256'] and json.loads(raw) == abort and receipt['exit'] == 0
assert sha((OUT / 'real-abort-observer.mjs').read_bytes()) == receipt['observerSha256']
assert abort['sourceSha256'] == sha((SRC / 'shell/fetch-retry.ts').read_bytes())
assert abort['sourceUnchanged'] and abort['globalsRestored'] and abort['serverClosed'] and abort['liveBackoffTimers'] == 0
assert abort['cases'][0]['rejectedSameReason'] and abort['cases'][0]['serverRequests'] == 0
assert [c['atAbort']['settled'] for c in abort['cases'][1:]] == [False, False]
assert [c['afterRelease']['nativeCalls'] for c in abort['cases'][1:]] == [2, 3]
assert [c['afterRelease']['serverRequests'] for c in abort['cases'][1:]] == [1, 0]

archive = OUT / 'initial-candidate'
manifest = json.loads((OUT / 'initial-candidate-manifest.json').read_bytes())
for item in manifest:
    assert sha((archive / item['path']).read_bytes()) == item['sha256']
gates = json.loads((archive / 'test-gates.json').read_bytes())
row = next(r for r in gates if r['name'] == 'game-full')
raw = saved('game-full.raw', archive)
native = saved('game-full.runner.json', archive)
assert sha(raw) == row['rawSha256'] and sha(native) == row['runnerSha256']
data = json.loads(native)
assert (len(data['testResults']), data['numPassedTests'], data['numFailedTests'], data['numPendingTests']) == (320, 3605, 0, 0)
diagnostics = json.loads((OUT / 'game-diagnostics.json').read_bytes())
assert raw.count(b'stderr |') == row['stderrBlocks'] == len(diagnostics['blocks']) == 17
assert len(diagnostics['files']) == 14
for item in diagnostics['files']:
    assert sha((ROOT / item['path']).read_bytes()) == item['sha256']
for p in ['scripts/coverage/approved-test-retirements.mjs', 'scripts/coverage/approved-test-retirements.test.mjs', 'scripts/coverage/baseline.fast.json']:
    assert (ROOT / p).read_bytes() == subprocess.check_output(['git', 'show', proofs['before']['base'] + ':' + p], cwd=ROOT)
assert not list(SRC.rglob('pre94-3h-*'))
print('PASS: final 14 counter runs, 2 scope references, 5 list/V8 runs, real HTTP abort evidence and full-game diagnostic receipts')
