"""Read-only verification of the four real cleanup observations and test receipts."""
import gzip
import hashlib
import json
from pathlib import Path
import subprocess

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[4]


def sha(data):
    return hashlib.sha256(data).hexdigest()


proof = json.loads((OUT / 'output-boundary.json').read_bytes())
source = gzip.decompress((OUT / 'cli.source.ts.gz').read_bytes())
assert sha(source) == proof['sourceSha256']
assert source == subprocess.check_output(['git', 'show', proof['base'] + ':packages/pal-extract/src/cli.ts'], cwd=ROOT)
assert source == (ROOT / 'packages/pal-extract/src/cli.ts').read_bytes()
assert len(proof['runs']) == 4 and proof['formalSourceUnchanged'] and proof['allTemporaryTreesRemoved']
assert [r['name'] for r in proof['runs']] == ['canonical-output', 'output-root-link', 'data-parent-link', 'child-entry-link']
for row in proof['runs']:
    before, after = row['before'], row['after']
    cwd = Path(row['cwd'])
    workspace = cwd.parents[1]
    owned_outer = workspace.parent
    assert row['exit'] == 1 and row['signal'] is None and row['spawnError'] is None
    assert row['copySha256'] == sha(source) and row['temporaryTreeRemoved'] and not owned_outer.exists()
    assert Path(before['out']) == workspace / 'data/extracted'
    assert Path(before['realOut']).is_relative_to(owned_outer)
    redirected = row['name'] in ['output-root-link', 'data-parent-link']
    assert before['outWithinWorkspace'] == (not redirected)
    assert before['dataIsLink'] == (row['name'] == 'data-parent-link')
    assert before['outIsLink'] == (row['name'] == 'output-root-link')
    assert not after['sentinelExists']
    assert before['sentinelSha256'] == sha(b'PROBE-ONLY-OUTPUT')
    assert before['videoSha256'] == after['videoSha256'] == sha(b'PROBE-ONLY-VIDEO')
    stdout = gzip.decompress((OUT / (row['name'] + '.stdout.gz')).read_bytes())
    stderr = gzip.decompress((OUT / (row['name'] + '.stderr.gz')).read_bytes())
    assert sha(stdout) == row['stdoutSha256'] and sha(stderr) == row['stderrSha256']
    assert b'[pal-extract] start' in stdout and b'ENOENT' in stderr and b'SSS.MKF' in stderr
    assert str(workspace / 'data/raw/SSS.MKF').encode() in stderr
    assert b'refuse to clean unexpected OUT' not in stderr
    if row['name'] == 'child-entry-link':
        assert after['childTargetPreserved'] is True and after['childEntryExists'] is False
failed = json.loads((OUT / 'probe-setup-failure.json').read_bytes())
initial_probe = gzip.decompress((OUT / 'probe-initial.py.gz').read_bytes())
assert sha(initial_probe) == failed['initialProbeSha256']
assert sha(gzip.decompress((OUT / 'probe-setup-failure.raw.gz').read_bytes())) == failed['rawSha256']
assert failed['exit'] == 1 and failed['productCliStarted'] is False and failed['remainingOwnedTemporaryTrees'] == 0
assert initial_probe.replace(b'outer = Path(temp)', b'outer = Path(temp).resolve()') == (OUT / 'output-boundary-probe.py').read_bytes()
comment = json.loads((OUT / 'font-comment-delta.json').read_bytes())
font_path = 'packages/pal-extract/src/cli-font-lookup.glm-q.test.ts'
before = gzip.decompress((OUT / 'font-before.test.ts.gz').read_bytes())
after = (ROOT / font_path).read_bytes()
assert before == subprocess.check_output(['git', 'show', proof['base'] + ':' + font_path], cwd=ROOT)
assert sha(before) == comment['beforeSha256'] and sha(after) == comment['afterSha256']
assert before.split(b'function buildBdf()', 1)[1] == after.split(b'function buildBdf()', 1)[1]
assert comment['numericFact']['fixtureDecimal'] == int(comment['numericFact']['fixtureUnicodeHex'], 16) == 19970
assert ord('\u4e2d') == comment['numericFact']['claimedZhongDecimal'] == 20013
for row in json.loads((OUT / 'regressions.json').read_bytes()):
    raw = gzip.decompress((OUT / (row['name'] + '.raw.gz')).read_bytes())
    assert sha(raw) == row['rawSha256'] and row['exit'] == 0 and row['signal'] is None and row['spawnError'] is None
    assert row['actWarnings'] == row['environmentWarnings'] == row['stderrBlocks'] == 0
    if 'runnerSha256' in row:
        native = gzip.decompress((OUT / (row['name'] + '.runner.json.gz')).read_bytes())
        data = json.loads(native)
        assert sha(native) == row['runnerSha256']
        cases = [{'file': str(Path(s['name']).relative_to(ROOT / 'packages/pal-extract')), 'fullName': c['fullName'], 'status': c['status']} for s in data['testResults'] for c in s['assertionResults']]
        assert row['cases'] == cases and all(c['status'] == 'passed' for c in cases)
        assert row['passed'] == data['numPassedTests'] == 41
        assert row['failed'] == row['pending'] == data['numFailedTests'] == data['numPendingTests'] == 0
        assert row['testFiles'] == len(data['testResults']) == 8
for path in ['scripts/coverage/config.mjs', 'scripts/coverage/baseline.fast.json', 'scripts/coverage/approved-test-retirements.mjs', 'scripts/coverage/approved-test-retirements.test.mjs']:
    assert (ROOT / path).read_bytes() == subprocess.check_output(['git', 'show', proof['base'] + ':' + path], cwd=ROOT)
gates = json.loads((OUT / 'static-gates.json').read_bytes())
assert [r['name'] for r in gates] == ['docs', 'ledger', 'diff-check', 'lint-zero']
for row in gates:
    raw = gzip.decompress((OUT / (row['name'] + '.raw.gz')).read_bytes())
    assert sha(raw) == row['rawSha256'] and row['exit'] == 0
    if row['name'] == 'lint-zero':
        assert b'0 errors / 0 warnings / 0 infos; complete report' in raw
    if row['name'] == 'ledger':
        assert b'3289 files; 203 closed / 241 review / 2845 pending' in raw
initial = json.loads((OUT / 'initial-static-gates.json').read_bytes())
assert [(r['name'], r['exit']) for r in initial] == [('docs', 0), ('ledger', 0), ('diff-check', 2)]
for row in initial:
    raw = gzip.decompress((OUT / ('initial-' + row['name'] + '.raw.gz')).read_bytes())
    assert sha(raw) == row['rawSha256']
    if row['name'] == 'diff-check':
        assert b'new blank line at EOF' in raw
queue = json.loads((ROOT / 'docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/all-cards.json').read_bytes())
assert len(queue['cards']) == 83 and queue['currentReviewCounts'] == {'partial': 12, 'pending': 71, 'accept': 0}
assert sum(c['currentReview'] == 'partial' for c in queue['cards']) == 12
assert not any(c['currentAcceptance'] for c in queue['cards'])
result = {'reviewer': 'Codex separate process, not third party', 'actualTemporaryCliRuns': 4, 'outsideWorkspaceOutputDeletionObserved': 2, 'childLinkTargetPreserved': True, 'initialProbeSetupFailureRetained': True, 'productionCliUnchanged': True, 'fontCommentOnly': True, 'testCases': 41, 'testFiles': 8, 'nativeRunnerZeroDiagnostics': True, 'baselineAndRetirementsUnchanged': True, 'wholeFilesClosed': 0, 'highRiskProductFix': 'draft; user decision pending'}
(OUT / 'verification.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result))
