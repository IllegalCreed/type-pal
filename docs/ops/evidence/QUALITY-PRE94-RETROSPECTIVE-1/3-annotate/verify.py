# -*- coding: utf-8 -*-
"""Reconstruct saved probe inputs and verify receipts without executing product IO."""
import ast
import base64
import gzip
import hashlib
import json
from pathlib import Path
import subprocess

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[4]
EVENTS = ROOT / 'packages/pal-extract/src/events'


def sha(data):
    return hashlib.sha256(data).hexdigest()


def ungzip(name):
    return gzip.decompress((OUT / name).read_bytes())


def git(ref, name):
    return subprocess.check_output(['git', 'show', f'{ref}:{name}'], cwd=ROOT)


tree = ast.parse((OUT / 'probe.py').read_text())
assignments = {
    node.targets[0].id: node.value for node in tree.body
    if isinstance(node, ast.Assign) and isinstance(node.targets[0], ast.Name)
}
mutations = ast.literal_eval(assignments['mutations'])
expected = ast.literal_eval(assignments['expected'])
proofs = {phase: json.loads((OUT / f'{phase}-proof.json').read_text()) for phase in ('before', 'after')}
pins = []
transfers = {}
for phase, proof in proofs.items():
    source = ungzip('annotate.ts.before.gz')
    assert source == (EVENTS / 'annotate.ts').read_bytes()
    assert sha(source) == proof['sourceSha256']
    tests = {
        name: ungzip(f'{name}.before.gz') if phase == 'before' else (EVENTS / name).read_bytes()
        for name in ('annotate.test.ts', 'annotate.glm-runtime-resource.test.ts')
    }
    assert {name: sha(data) for name, data in tests.items()} == proof['testSha256']
    if phase == 'before':
        for name, data in tests.items():
            assert data == git(proof['head'], f'packages/pal-extract/src/events/{name}')
    count = 17 if phase == 'before' else 16
    control_ids = {(case['file'], case['fullName']) for case in proof['runs'][0]['cases']}
    assert len(control_ids) == count
    for run in proof['runs']:
        name = run['name']
        stem = f'pre94-annotation-{phase}-{name}'
        mutation = mutations[name]
        text = source.decode()
        if mutation:
            assert text.count(mutation[0]) == 1
            text = text.replace(*mutation)
        assert sha(text.encode()) == run['moduleSha256']
        copies = {
            f'{stem}-{test}': sha(data.replace(b"'./annotate.js'", f"'./{stem}.js'".encode()))
            for test, data in tests.items()
        }
        assert copies == run['testCopySha256']
        assert run['cwd'] == str(ROOT)
        assert '--silent=false' in run['command'] and not any(x in run['command'] for x in ('-t', '--testNamePattern'))
        raw = ungzip(f'{phase}-{name}.raw.gz')
        native = ungzip(f'{phase}-{name}.runner.json.gz')
        assert sha(raw) == run['rawSha256'] and sha(native) == run['runnerSha256']
        assert b'stderr |' not in raw and not any(run['diagnostics'].values())
        runner = json.loads(native)
        assert runner['numTotalTests'] == count and runner['numPendingTests'] == 0
        cases = [
            {'file': Path(suite['name']).name.removeprefix(stem + '-'), 'fullName': case['fullName'], 'status': case['status'], 'messages': case['failureMessages']}
            for suite in runner['testResults'] for case in suite['assertionResults']
        ]
        assert cases == run['cases']
        assert {(c['file'], c['fullName']) for c in cases} == control_ids
        failures = [c for c in cases if c['status'] == 'failed']
        assert runner['numFailedTests'] == run['failed'] == len(failures)
        assert runner['numPassedTests'] == run['passed'] == count - len(failures)
        assert all('AssertionError:' in ''.join(c['messages']) for c in failures)
        if name.startswith('transfer-'):
            assert run['exit'] == 1
            transfers.setdefault(name, {})[phase] = [{'file': c['file'], 'fullName': c['fullName']} for c in failures]
        else:
            red = phase == 'after' and name != 'control'
            assert run['exit'] == int(red) and len(failures) == int(red)
            if red:
                assert expected[name] in failures[0]['fullName']
                pins.append({'mutation': name, 'file': failures[0]['file'], 'fullName': failures[0]['fullName'], 'type': 'AssertionError'})
    assert all(proof[key] for key in ('productionUnchanged', 'testFilesUnchangedDuringProbe', 'temporaryCopiesRemoved'))
assert [len(transfers[name][phase]) for name in transfers for phase in ('before', 'after')] == [7, 7, 2, 1, 3, 3]

retirement = json.loads((OUT / 'retirement.json').read_text())
lists = {}
for phase in ('before', 'after'):
    receipt = json.loads((OUT / f'{phase}-list-command.json').read_text())
    raw, native = ungzip(f'{phase}-list.raw.gz'), ungzip(f'{phase}-list.json.gz')
    assert receipt['exit'] == 0 and sha(raw) == receipt['rawSha256'] and sha(native) == receipt['listSha256']
    lists[phase] = json.loads(native)
payload = {
    'old': base64.b64encode(git(proofs['before']['head'], 'scripts/coverage/approved-test-retirements.mjs')).decode(),
    'retirement': retirement,
    'lists': lists,
}
node = """
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {relative} from 'node:path';
import {pathToFileURL} from 'node:url';
const p=JSON.parse(readFileSync(0,'utf8'));
const old=await import('data:text/javascript;base64,'+p.old);
const now=await import(pathToFileURL(process.cwd()+'/scripts/coverage/approved-test-retirements.mjs'));
assert.equal(now.isApprovedTestRetirement.toString(),old.isApprovedTestRetirement.toString());
assert.deepEqual(now.approvedTestRetirements.slice(0,-1),old.approvedTestRetirements);
assert.equal(now.approvedTestRetirements.length,25);
assert.equal(now.approvedTestRetirements.reduce((n,e)=>n+e.previous-e.current,0),59);
assert.deepEqual(now.approvedTestRetirements.at(-1),p.retirement.approval);
assert.equal(old.isApprovedTestRetirement(p.retirement.input),false);
assert.equal(now.isApprovedTestRetirement(p.retirement.input),true);
assert.equal(now.isApprovedTestRetirement({...p.retirement.input,fileSha256:'drift'}),false);
assert.equal(now.isApprovedTestRetirement({...p.retirement.input,removal:{...p.retirement.input.removal,current:5}}),false);
for(const phase of ['before','after']){
 const ids=p.lists[phase].map(e=>relative(process.cwd(),e.file).replaceAll('\\\\','/')+' :: project root :: '+e.name).sort((a,b)=>a.localeCompare(b));
 assert.deepEqual(ids,p.retirement.native[phase].identities);
 for(const entry of p.retirement.native[phase].fileEntries){
  const own=ids.filter(s=>s.startsWith(entry.file+' ::'));
  assert.equal(own.length,entry.testCount);
  assert.equal(createHash('sha256').update(JSON.stringify(own)).digest('hex'),entry.identityDigest);
 }
}
console.log(JSON.stringify({unchangedMatcher:true,unchangedOtherRows:24,rows:25,netCount:59,nativeDigestsVerified:true,refusalsVerified:true}));
"""
support = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', node], input=json.dumps(payload).encode(), cwd=ROOT))
before_ids = set(retirement['native']['before']['identities'])
after_ids = set(retirement['native']['after']['identities'])
assert sorted(before_ids - after_ids) == sorted(retirement['removedIdentities'])
assert sorted(after_ids - before_ids) == sorted(retirement['addedIdentities'])
assert (len(before_ids - after_ids), len(after_ids - before_ids)) == (8, 7)
for snapshot in retirement['previousSnapshots']:
    assert sha(git(snapshot['ref'], retirement['approval']['file'])) == snapshot['fileSha256']
unchanged = ['packages/pal-extract/src/events/annotate.ts', 'packages/pal-extract/src/cli.ts', 'packages/pal-extract/src/io/word.ts', 'packages/shared/src/events.ts', 'scripts/coverage/baseline.fast.json', 'scripts/coverage/config.mjs']
assert all((ROOT / name).read_bytes() == git(proofs['before']['head'], name) for name in unchanged)
assert not list(EVENTS.glob('pre94-annotation-*'))
tests = json.loads((OUT / 'tests.json').read_text())
for run in tests['runs']:
    assert sha(ungzip(run['name'] + '.raw.gz')) == run['rawSha256']
    if 'runnerSha256' in run:
        assert sha(ungzip(run['name'] + '.runner.json.gz')) == run['runnerSha256']
report = {
    'reviewer': 'Codex separate receipt verification process; not third-party acceptance',
    'baseCommit': proofs['before']['head'],
    'sourceAndTestCopyHashesReconstructed': True,
    'allTwentyProbeRunsAndOriginalIdentitiesVerified': True,
    'singleBusinessFailures': pins,
    'oracleTransferFailureSets': transfers,
    'removedIdentities': 8,
    'addedIdentities': 7,
    'support': support,
    'productionBaselineAndScopeUnchanged': unchanged,
    'temporaryCopiesRemoved': True,
    'recoveryReceiptHashesVerified': True,
    'fullExtractAcceptance': False,
    'wholeCardAcceptance': False,
    'newFileClosures': 0,
}
(OUT / 'verification.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'singleBusinessFailures': len(pins), 'probeRuns': 20, 'support': support, 'wholeCardAcceptance': False}))
