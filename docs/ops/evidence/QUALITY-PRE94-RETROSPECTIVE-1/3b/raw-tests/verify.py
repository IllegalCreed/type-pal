# -*- coding: utf-8 -*-
"""Verify current raw tests and preserve the parent evidence at its Git candidate."""
import gzip
import hashlib
import json
from pathlib import Path
import subprocess
import sys
sys.dont_write_bytecode = True
from oracles import read_oracles

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[5]
BASE = ROOT / 'packages/pal-extract/src/io'
PARENT_REVISION = '3a9f47043587bf388bfe4199b5d3c435eecd9623'


def sha(data):
    return hashlib.sha256(data).hexdigest()


def check_proof(proof, location, prefix, expected_count, historical=False):
    phase = proof['phase']
    sources = {p: (BASE / p).read_bytes() for p in proof['sourceSha256']}
    assert {p: sha(b) for p, b in sources.items()} == proof['sourceSha256']
    assert all(proof[k] for k in ['sourcesUnchanged', 'testsUnchanged', 'copiesRemoved'])
    tests = {p: gzip.decompress((location / (phase + '-' + p + '.gz')).read_bytes()) for p in proof['testSha256']}
    assert {p: sha(b) for p, b in tests.items()} == proof['testSha256']
    for file, data in tests.items():
        if historical or phase == 'before':
            revision = PARENT_REVISION if historical else proof['baseCommit']
            assert data == subprocess.check_output(['git', 'show', revision + ':packages/pal-extract/src/io/' + file], cwd=ROOT)
        else:
            assert data == (BASE / file).read_bytes()
    identities = {(c['file'], c['fullName']) for c in proof['runs'][0]['cases']}
    assert len(identities) == expected_count
    for run in proof['runs']:
        name = run['name']
        stem = prefix + phase + '-' + name
        variant = proof['variants'][name]
        if variant:
            original = sources[variant[0]].decode()
            assert original.count(variant[1]) == 1
            assert sha(original.replace(variant[1], variant[2]).encode()) == run['moduleSha256']
        else:
            assert run['moduleSha256'] is None
        for file, data in tests.items():
            if variant:
                data = data.replace(('./' + Path(variant[0]).stem + ".js'").encode(), ('./' + stem + ".js'").encode())
            assert sha(data) == run['copySha256']['packages/pal-extract/src/io/' + stem + '-' + file]
        raw = gzip.decompress((location / (phase + '-' + name + '.raw.gz')).read_bytes())
        native = gzip.decompress((location / (phase + '-' + name + '.runner.json.gz')).read_bytes())
        assert sha(raw) == run['rawSha256'] and sha(native) == run['runnerSha256']
        parsed = json.loads(native)
        cases = [{'file': Path(s['name']).name.removeprefix(stem + '-'), 'fullName': c['fullName'], 'status': c['status'], 'messages': c['failureMessages']} for s in parsed['testResults'] for c in s['assertionResults']]
        assert cases == run['cases'] and {(c['file'], c['fullName']) for c in cases} == identities
        red = name != 'control' and (phase == 'after' or name.startswith('transfer-'))
        failed = [c for c in cases if c['status'] == 'failed']
        assert parsed['numPassedTests'] == run['passed'] == expected_count - int(red)
        assert parsed['numFailedTests'] == run['failed'] == len(failed) == int(red)
        assert run['exit'] == int(red) and run['signal'] is None and parsed['numPendingTests'] == run['pending'] == 0
        assert raw.count(b'stderr |') == run['stderrBlocks'] == 0
        assert all('AssertionError:' in ''.join(c['messages']) for c in failed)
        if red and not historical:
            sss = name in ['later-eo-state', 'bytecode-tail', 'transfer-bytecode-empty']
            assert failed[0]['file'] == ('sss.test.ts' if sss else 'msg.test.ts')
            needle = ('字节码 chunk 非空' if sss else '包含已知主角名') if phase == 'before' else ('全原盘结构' if sss else '原盘固定文本')
            assert needle in failed[0]['fullName']
    return identities


before, after = [json.loads((OUT / (phase + '-proof.json')).read_text()) for phase in ['before', 'after']]
assert before['variants'] == after['variants']
old_set = check_proof(before, OUT, 'pre94-3b-raw-', 20)
new_set = check_proof(after, OUT, 'pre94-3b-raw-', 13)
assert len(old_set - new_set) == 9 and len(new_set - old_set) == 2
parent = json.loads((OUT.parent / 'after-proof.json').read_text())
check_proof(parent, OUT.parent, 'pre94-3b-', 20, historical=True)
oracles = json.loads((OUT / 'oracles.json').read_text())
assert read_oracles() == oracles
sss_test = (BASE / 'sss.test.ts').read_text()
for key, value in oracles['sss'].items():
    assert str(value) in sss_test, key
msg_test = (BASE / 'msg.test.ts').read_text()
for sample in oracles['msg']['samples']:
    assert sample['expected'] in msg_test
for row in json.loads((OUT / 'regressions.json').read_text()):
    raw = gzip.decompress((OUT / (row['name'] + '.raw.gz')).read_bytes())
    assert sha(raw) == row['rawSha256'] and row['exit'] == 0 and row['stderrBlocks'] == raw.count(b'stderr |') == 0
for path in ['scripts/coverage/config.mjs', 'scripts/coverage/baseline.fast.json', 'scripts/coverage/approved-test-retirements.mjs', 'scripts/coverage/approved-test-retirements.test.mjs']:
    assert (ROOT / path).read_bytes() == subprocess.check_output(['git', 'show', before['baseCommit'] + ':' + path], cwd=ROOT)
assert not list(BASE.glob('pre94-3b-raw-*'))
result = {'reviewer': 'Codex separate process, not third party', 'completeCurrentProbeRuns': 16, 'oldGreenNewSingleAssertionError': 5, 'oldOracleTransfers': 2, 'rawCasesBefore': 9, 'rawCasesAfter': 2, 'fourFileCasesBefore': 20, 'fourFileCasesAfter': 13, 'parentCandidateReconstructed': PARENT_REVISION, 'parentAfterReceiptsReconstructed': 7, 'independentStructAndFiveTextSamplesRecomputed': True, 'fullTextOracleNotClaimed': True, 'productionAndRulesUnchanged': True, 'temporaryCopiesRemoved': True, 'newClosures': 0}
(OUT / 'verification.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result))
