# -*- coding: utf-8 -*-
"""Read-only reconstruction of exact C10 source graphs and native failure sets."""
import gzip
import hashlib
import json
from pathlib import Path
import subprocess

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[4]
BASE = ROOT / 'packages/editor/src'
UI = BASE / 'ui'
FIXTURES = BASE / '__tests__/cursor-asset-r1'


def sha(data):
    return hashlib.sha256(data).hexdigest()


def rewire(data, names, stem):
    for name in names:
        old = Path(name).stem + ".js'"
        data = data.replace(old.encode(), (stem + '-' + old).encode())
    return data


initial = json.loads((OUT / 'initial-sources.json').read_text())
for path, digest in initial['files'].items():
    original = gzip.decompress((OUT / ('initial-' + Path(path).name + '.gz')).read_bytes())
    assert sha(original) == digest
    assert original == subprocess.check_output(['git', 'show', initial['head'] + ':' + path], cwd=ROOT)
source = (UI / 'SpriteUploadWizard.tsx').read_bytes()
assert sha(source) == initial['files']['packages/editor/src/ui/SpriteUploadWizard.tsx']
delta = json.loads((OUT / 'final-source-delta.json').read_text())
proofs = [json.loads((OUT / (phase + '-proof.json')).read_text()) for phase in ['before', 'after']]
assert proofs[0]['variants'] == proofs[1]['variants']
counts = {'before': 30, 'after': 28}
for proof in proofs:
    phase = proof['phase']
    assert sha(source) == proof['sourceSha256']
    assert all(proof[k] for k in ['sourceUnchanged', 'helpersUnchanged', 'testsUnchanged', 'copiesRemoved'])
    helpers = {name: gzip.decompress((OUT / (phase + '-' + name + '.gz')).read_bytes()) for name in proof['helperSha256']}
    tests = {name: gzip.decompress((OUT / (phase + '-' + name + '.gz')).read_bytes()) for name in proof['testSha256']}
    assert {p: sha(b) for p, b in helpers.items()} == proof['helperSha256']
    assert {p: sha(b) for p, b in tests.items()} == proof['testSha256']
    if phase == 'after':
        for path, data in helpers.items():
            assert data == (FIXTURES / path).read_bytes()
        for path, data in tests.items():
            if str((UI / path).relative_to(ROOT)) == delta['path']:
                assert sha(data) == delta['counterSnapshotSha256']
                assert data.count(b'wizardWaitDecoded') == 1
                assert data.replace(delta['onlyDeletion'].encode(), b'') == (ROOT / delta['path']).read_bytes()
                assert sha((ROOT / delta['path']).read_bytes()) == delta['finalSha256']
            else:
                assert data == (UI / path).read_bytes()
    identities = {(c['file'], c['fullName']) for c in proof['runs'][0]['cases']}
    assert len(identities) == counts[phase]
    required_sets = {'cancel-late-close': ['C03-G02-02'], 'submit-lock': ['C03-G07-02'], 'transfer-cancel-disabled': ['C03-G07-02', 'C03-G07-03'] if phase == 'before' else ['C03-G07-02'], 'transfer-reselection-id': ['C03-G02-10', 'C03-G07-04', 'C03-G07-09'] if phase == 'before' else ['C03-G02-10', 'C03-G07-04']}
    for run in proof['runs']:
        name = run['name']
        stem = 'pre94-c10-' + phase + '-' + name
        widget = source.decode()
        for old, new in proof['variants'][name]:
            assert widget.count(old) == 1
            widget = widget.replace(old, new)
        assert sha(widget.encode()) == run['moduleSha256']
        for file, data in helpers.items():
            copy = rewire(data, helpers, stem).replace(b'../../ui/SpriteUploadWizard.js', ('../../ui/' + stem + '-SpriteUploadWizard.js').encode())
            assert sha(copy) == run['copySha256'][str((FIXTURES / (stem + '-' + file)).relative_to(ROOT))]
        for file, data in tests.items():
            if name == 'diagnostic-original-error-poll' and 'g02' in file:
                new, old = proof['diagnosticCallerReplacement']
                assert data.decode().count(new) == 1
                data = data.decode().replace(new, old).encode()
            assert sha(rewire(data, helpers, stem)) == run['copySha256'][str((UI / (stem + '-' + file)).relative_to(ROOT))]
        raw = gzip.decompress((OUT / (phase + '-' + name + '.raw.gz')).read_bytes())
        native = gzip.decompress((OUT / (phase + '-' + name + '.runner.json.gz')).read_bytes())
        assert sha(raw) == run['rawSha256'] and sha(native) == run['runnerSha256']
        parsed = json.loads(native)
        cases = [{'file': Path(s['name']).name.removeprefix(stem + '-'), 'fullName': c['fullName'], 'status': c['status'], 'messages': c['failureMessages']} for s in parsed['testResults'] for c in s['assertionResults']]
        assert cases == run['cases'] and {(c['file'], c['fullName']) for c in cases} == identities
        failures = [c for c in cases if c['status'] == 'failed']
        expected = required_sets.get(name, [])
        assert len(failures) == parsed['numFailedTests'] == run['failed'] == len(expected)
        assert parsed['numPassedTests'] == run['passed'] == counts[phase] - len(expected)
        assert run['exit'] == int(bool(expected)) and run['signal'] is None and run['pending'] == parsed['numPendingTests'] == 0
        assert all('AssertionError:' in ''.join(c['messages']) for c in failures)
        assert all(any(key in c['fullName'] for c in failures) for key in expected)
        assert all(any(key in c['fullName'] for key in expected) for c in failures)
        diagnostic = name == 'diagnostic-original-error-poll'
        assert raw.count(b'not wrapped in act') == run['actWarnings'] == (2 if diagnostic else 0)
        assert raw.count(b'stderr |') == run['stderrBlocks'] == int(diagnostic)
        assert raw.count(b'not configured to support act') == run['environmentWarnings'] == 0
for window in ['initial-thirty', 'zero-thirty']:
    row = json.loads((OUT / (window + '.json')).read_text())
    raw = gzip.decompress((OUT / (window + '.raw.gz')).read_bytes())
    native = gzip.decompress((OUT / (window + '.runner.json.gz')).read_bytes())
    assert row['exit'] == 0 and row['passed'] == 30 and row['failed'] == row['pending'] == 0
    assert sha(raw) == row['rawSha256'] and sha(native) == row['runnerSha256']
    assert row['actWarnings'] == raw.count(b'not wrapped in act') == (2 if window.startswith('initial') else 0)
for row in json.loads((OUT / 'regressions.json').read_text()):
    raw = gzip.decompress((OUT / (row['name'] + '.raw.gz')).read_bytes())
    assert sha(raw) == row['rawSha256'] and row['exit'] == 0
    assert raw.count(b'not wrapped in act') == row['actWarnings'] == (6 if row['name'] == 'adjacent' else 0)
    assert row['environmentWarnings'] == 0
    if 'runnerSha256' in row:
        native = gzip.decompress((OUT / (row['name'] + '.runner.json.gz')).read_bytes())
        assert sha(native) == row['runnerSha256']
        parsed = json.loads(native)
        assert parsed['numPassedTests'] == row['passed'] and parsed['numFailedTests'] == row['failed'] == 0 and parsed['numPendingTests'] == row['pending'] == 0
retirement = json.loads((OUT / 'retirement.json').read_text())
assert retirement['approval']['fileSha256'] == sha((ROOT / retirement['approval']['file']).read_bytes())
assert retirement['native']['initial'] == retirement['native']['before']
assert len(retirement['removedIdentities']) == 3 and len(retirement['addedIdentities']) == 1
assert all(r['fileEntry'] == retirement['native']['before']['fileEntry'] for r in retirement['snapshots'])
for phase in ['initial', 'before', 'after']:
    raw = gzip.decompress((OUT / (phase + '-list.raw.gz')).read_bytes())
    native = gzip.decompress((OUT / (phase + '-list.json.gz')).read_bytes())
    receipt = next(r for r in retirement['receipts'] if r['phase'] == phase)
    assert sha(raw) == receipt['rawSha256'] and sha(native) == receipt['nativeSha256'] and receipt['exit'] == 0 and receipt['signal'] is None
program = '''
import assert from 'node:assert/strict'; import fs from 'node:fs'; import { execFileSync } from 'node:child_process';
const oldBytes = execFileSync('git',['show','d261e1d17a41594f80f08a225ad4d2bbab75a932:scripts/coverage/approved-test-retirements.mjs']);
const old = await import(`data:text/javascript;base64,${oldBytes.toString('base64')}`);
const current = await import('./scripts/coverage/approved-test-retirements.mjs');
const r = JSON.parse(fs.readFileSync('./docs/ops/evidence/QUALITY-EDITOR-UPLOAD-DIAGNOSTICS-1/recovery/retirement.json'));
assert.equal(old.isApprovedTestRetirement(r.input),false); assert.equal(current.isApprovedTestRetirement(r.input),true);
assert.equal(current.approvedTestRetirements.length,27); assert.equal(current.approvedTestRetirements.reduce((n,e)=>n+e.previous-e.current,0),62);
assert.deepEqual(current.approvedTestRetirements.slice(0,-1),old.approvedTestRetirements);
assert.equal(current.isApprovedTestRetirement.toString(),old.isApprovedTestRetirement.toString());
assert.equal(current.isApprovedTestRetirement({...r.input,fileSha256:'drift'}),false);
assert.equal(current.isApprovedTestRetirement({...r.input,removal:{...r.input.removal,current:7}}),false);
assert.equal(current.isApprovedTestRetirement({...r.input,current:{...r.input.current,identityDigest:'drift'}}),false);
'''
subprocess.run(['node', '--input-type=module', '-e', program], cwd=ROOT, check=True)
for path in ['scripts/coverage/config.mjs', 'scripts/coverage/baseline.fast.json', 'packages/editor/src/__tests__/cursor-asset-r1/upload-harness.tsx']:
    assert (ROOT / path).read_bytes() == subprocess.check_output(['git', 'show', initial['head'] + ':' + path], cwd=ROOT)
assert not list(BASE.rglob('pre94-c10-*'))
assert source == subprocess.check_output(['git', 'show', initial['head'] + ':packages/editor/src/ui/SpriteUploadWizard.tsx'], cwd=ROOT)
# Final package receipt is deliberately rejected by the zero-diagnostic gate.
full = json.loads((OUT / 'editor-full.json').read_text())
raw = gzip.decompress((OUT / 'editor-full.raw.gz').read_bytes())
native = gzip.decompress((OUT / 'editor-full.runner.json.gz').read_bytes())
data = json.loads(native)
assert sha(raw) == full['rawSha256'] and sha(native) == full['runnerSha256']
assert full['testFiles'] == len(data['testResults']) == 631
assert full['passedSuites'] == data['numPassedTestSuites'] == 1353
assert full['passed'] == data['numPassedTests'] == 4943
assert full['exit'] == full['failed'] == full['pending'] == data['numFailedTests'] == data['numPendingTests'] == 0
assert full['actWarnings'] == raw.count(b'not wrapped in act') == 624
assert full['environmentWarnings'] == raw.count(b'not configured to support act') == 243
assert full['stderrBlocks'] == raw.count(b'stderr |') == 321
assert raw.count(b'You provided a `value` prop to a form field') == 1
assert full['zeroDiagnosticAcceptance'] is False
for row in json.loads((OUT / 'reforge-regressions.json').read_text()):
    raw = gzip.decompress((OUT / (row['name'] + '.raw.gz')).read_bytes())
    assert sha(raw) == row['rawSha256'] and row['exit'] == 0
    assert row['actWarnings'] == row['environmentWarnings'] == row['stderrBlocks'] == 0
    if 'runnerSha256' in row:
        native = gzip.decompress((OUT / (row['name'] + '.runner.json.gz')).read_bytes())
        data = json.loads(native)
        assert sha(native) == row['runnerSha256']
        assert row['passed'] == data['numPassedTests'] and row['failed'] == row['pending'] == data['numFailedTests'] == data['numPendingTests'] == 0

result = {'reviewer': 'Codex separate verification process, not third party', 'completeCounterRuns': 12, 'businessSingleAssertionErrorPins': 2, 'diagnosticNegativeNativeGreenButRejected': True, 'cancelOracleBefore': 2, 'cancelOracleAfter': 1, 'reselectionOracleBefore': 3, 'reselectionOracleAfter': 2, 'initialWizardCases': 30, 'finalWizardCases': 28, 'initialAct': 2, 'finalAct': 0, 'other26RowsAndMatcherUnchanged': True, 'approvedRows': 27, 'approvedNetReduction': 62, 'onlyPostProbeTestDeltaUnusedImport': True, 'sourceAndBaselineUnchanged': True, 'temporaryModuleGraphsRemoved': True, 'wholeFilesClosed': 0, 'fullEditorFiles': 631, 'fullEditorPassed': 4943, 'fullEditorZeroDiagnosticAcceptance': False}
(OUT / 'verification.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result))
