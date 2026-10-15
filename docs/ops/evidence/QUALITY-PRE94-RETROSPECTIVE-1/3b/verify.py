# -*- coding: utf-8 -*-
"""Reconstruct probe hashes, native execution sets and independent raw layouts."""
import gzip
import hashlib
import json
from pathlib import Path
import struct
import subprocess

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[4]
BASE = ROOT / 'packages/pal-extract/src/io'


def sha(data):
    return hashlib.sha256(data).hexdigest()


def digest(value):
    return sha(json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode())


proofs = [json.loads((OUT / (phase + '-proof.json')).read_text()) for phase in ['before', 'after']]
assert proofs[0]['variants'] == proofs[1]['variants']
sources = {p: (BASE / p).read_bytes() for p in proofs[0]['sourceSha256']}
for proof in proofs:
    phase = proof['phase']
    assert all(proof[k] for k in ['sourcesUnchanged', 'testsUnchanged', 'copiesRemoved'])
    assert {p: sha(b) for p, b in sources.items()} == proof['sourceSha256']
    tests = {p: gzip.decompress((OUT / (phase + '-' + p + '.gz')).read_bytes()) for p in proof['testSha256']}
    assert {p: sha(b) for p, b in tests.items()} == proof['testSha256']
    for name, data in tests.items():
        if phase == 'after':
            assert data == (BASE / name).read_bytes()
        else:
            assert data == subprocess.check_output(['git', 'show', proof['baseCommit'] + ':packages/pal-extract/src/io/' + name], cwd=ROOT)
    count = 16 if phase == 'before' else 20
    identities = {(c['file'], c['fullName']) for c in proof['runs'][0]['cases']}
    assert len(identities) == count
    for run in proof['runs']:
        name = run['name']
        stem = 'pre94-3b-' + phase + '-' + name
        variant = proof['variants'][name]
        if variant:
            original = sources[variant[0]].decode()
            assert original.count(variant[1]) == 1
            assert sha(original.replace(variant[1], variant[2]).encode()) == run['moduleSha256']
        else:
            assert run['moduleSha256'] is None
        for path, data in tests.items():
            if variant:
                data = data.replace(('./' + Path(variant[0]).stem + ".js'").encode(), ('./' + stem + ".js'").encode())
            assert sha(data) == run['copySha256']['packages/pal-extract/src/io/' + stem + '-' + path]
        raw = gzip.decompress((OUT / (phase + '-' + name + '.raw.gz')).read_bytes())
        native = gzip.decompress((OUT / (phase + '-' + name + '.runner.json.gz')).read_bytes())
        assert sha(raw) == run['rawSha256'] and sha(native) == run['runnerSha256']
        parsed = json.loads(native)
        cases = [{'file': Path(s['name']).name.removeprefix(stem + '-'), 'fullName': c['fullName'], 'status': c['status'], 'messages': c['failureMessages']} for s in parsed['testResults'] for c in s['assertionResults']]
        assert cases == run['cases'] and {(c['file'], c['fullName']) for c in cases} == identities
        failed = [c for c in cases if c['status'] == 'failed']
        red = phase == 'after' and name != 'control'
        assert run['exit'] == int(red) and run['signal'] is None
        assert parsed['numPassedTests'] == run['passed'] == count - int(red)
        assert parsed['numFailedTests'] == run['failed'] == len(failed) == int(red)
        assert parsed['numPendingTests'] == run['pending'] == 0
        assert raw.count(b'stderr |') == run['stderrBlocks'] == 0
        assert all('AssertionError:' in ''.join(c['messages']) for c in failed)
        if red:
            needle = '四条精确' if name in ['message-ownership', 'offsets-ownership'] else ('scene 四字段精确' if name == 'second-scene-field' else '非对称 16 字段 EO')
            assert needle in failed[0]['fullName']
raw = (ROOT / 'data/raw/SSS.MKF').read_bytes()
msg = (ROOT / 'data/raw/M.MSG').read_bytes()
offsets = struct.unpack_from('<6I', raw)
chunks = [raw[a:b] for a, b in zip(offsets, offsets[1:])]
expected = {
    'eoDigest': digest([list(struct.unpack_from('<hHHhHHh9H', chunks[0], i)) + [list(struct.unpack_from('<16H', chunks[0], i))] for i in range(0, len(chunks[0]), 32)]),
    'sceneDigest': digest([list(struct.unpack_from('<4H', chunks[1], i)) + [list(struct.unpack_from('<4H', chunks[1], i))] for i in range(0, len(chunks[1]), 8)]),
    'objectDigest': digest(list(struct.unpack('<' + 'H' * (len(chunks[2]) // 2), chunks[2]))),
    'offsetDigest': digest(list(struct.unpack('<' + 'I' * (len(chunks[3]) // 4), chunks[3]))),
    'bytecodeDigest': sha(chunks[4]),
}
receipt = json.loads((OUT / 'raw-proof.json').read_text())
stdout = gzip.decompress((OUT / 'raw-probe.stdout.gz').read_bytes())
assert receipt['exit'] == 0 and sha(stdout) == receipt['stdoutSha256']
assert receipt['independentStructExpected'] == expected
assert receipt['actual'] == json.loads(stdout)
assert receipt['rawSssSha256'] == receipt['actual']['rawSssSha256'] == sha(raw)
assert receipt['rawMsgSha256'] == receipt['actual']['rawMsgSha256'] == sha(msg)
assert all(receipt['actual'][key] == value for key, value in expected.items())
assert receipt['actual']['messageCount'] == 13513 and receipt['actual']['inputsUnchanged']
for row in json.loads((OUT / 'regressions.json').read_text()):
    output = gzip.decompress((OUT / (row['name'] + '.raw.gz')).read_bytes())
    assert sha(output) == row['rawSha256'] and row['exit'] == 0 and row['stderrBlocks'] == output.count(b'stderr |') == 0
assert not list(BASE.glob('pre94-3b-*'))
for p, data in sources.items():
    assert data == subprocess.check_output(['git', 'show', proofs[0]['baseCommit'] + ':packages/pal-extract/src/io/' + p], cwd=ROOT)
for p in ['scripts/coverage/baseline.fast.json', 'scripts/coverage/config.mjs', 'scripts/coverage/approved-test-retirements.mjs', 'scripts/coverage/approved-test-retirements.test.mjs']:
    assert (ROOT / p).read_bytes() == subprocess.check_output(['git', 'show', proofs[0]['baseCommit'] + ':' + p], cwd=ROOT)
result = {'reviewer': 'Codex separate read-only verification process; not third party', 'completeRuns': 14, 'oldGreenNewSingleAssertionError': 6, 'beforeTests': 16, 'afterTests': 20, 'independentRawStructAllRecordsEqual': True, 'textDecodingNotReproved': True, 'productionAndRulesUnchanged': True, 'temporaryCopiesRemoved': True, 'newFileClosures': 0}
(OUT / 'verification.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result))
