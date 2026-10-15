# -*- coding: utf-8 -*-
"""Whole Wizard suites, real PNG/gzip/SHA/commands, exact isolated module graphs."""
import gzip
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[4]
BASE = ROOT / 'packages/editor/src'
UI = BASE / 'ui'
FIXTURES = BASE / '__tests__/cursor-asset-r1'
PHASE = sys.argv[1]
assert PHASE in ('before', 'after')
tests = {f'SpriteUploadWizard.c03-g{n}.cursor-r1.test.tsx': (UI / f'SpriteUploadWizard.c03-g{n}.cursor-r1.test.tsx').read_bytes() for n in ['01', '02', '07']}
helpers = {name: (FIXTURES / name).read_bytes() for name in ['upload-harness.tsx', 'upload-ui.ts', 'upload-ports.ts']}
source = (UI / 'SpriteUploadWizard.tsx').read_bytes()
new_error = "    await wizardClickSubmit(mounted.host, { waitForCommitDigest: true })\n    expect(wizardError(mounted.host)).toContain('精灵定义 id 已存在: once')"
old_error = "    await wizardClickSubmit(mounted.host)\n    await vi.waitFor(() => {\n      expect(wizardError(mounted!.host)).toContain('精灵定义 id 已存在: once')\n    })"
variants = {
    'control': [],
    'cancel-late-close': [
        ('const submittingRef = useRef(false)', 'const submittingRef = useRef(false)\n  const canceledForProbe = useRef(false)'),
        ('if (!submittingRef.current) {\n            selection.active = false', 'if (!submittingRef.current) {\n            canceledForProbe.current = true\n            selection.active = false'),
        ('bitmap?.close()', 'if (!canceledForProbe.current) bitmap?.close()'),
    ],
    'submit-lock': [('      submittingRef.current ||\n', '')],
    'transfer-cancel-disabled': [('className="sprite-upload-cancel"\n        disabled={submitting}', 'className="sprite-upload-cancel"\n        disabled={false}')],
    'transfer-reselection-id': [('      onDone(id)', '      onDone(session.getHistoryVersion() > 1 ? `${id}-wrong` : id)')],
    'diagnostic-original-error-poll': [],
}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def rewire(data, stem):
    for helper in helpers:
        old = Path(helper).stem + ".js'"
        data = data.replace(old.encode(), (stem + '-' + old).encode())
    return data


runs = []
with tempfile.TemporaryDirectory(prefix='type-pal-c10-counter-') as directory:
    for name, replacements in variants.items():
        stem = 'pre94-c10-' + PHASE + '-' + name
        widget = UI / (stem + '-SpriteUploadWizard.tsx')
        copies = []
        report = Path(directory) / (name + '.json')
        command = ['pnpm', '--filter', '@type-pal/editor', 'exec', 'vitest', 'run']
        try:
            text = source.decode()
            for old, new in replacements:
                assert text.count(old) == 1, (name, old)
                text = text.replace(old, new)
            widget.write_text(text)
            for helper, data in helpers.items():
                path = FIXTURES / (stem + '-' + helper)
                data = rewire(data, stem)
                data = data.replace(b'../../ui/SpriteUploadWizard.js', ('../../ui/' + stem + '-SpriteUploadWizard.js').encode())
                path.write_bytes(data)
                copies.append(path)
            for test, data in tests.items():
                path = UI / (stem + '-' + test)
                if name == 'diagnostic-original-error-poll' and 'g02' in test:
                    assert data.decode().count(new_error) == 1
                    data = data.decode().replace(new_error, old_error).encode()
                path.write_bytes(rewire(data, stem))
                copies.append(path)
                command.append('src/ui/' + path.name)
            command += ['--maxWorkers=1', '--silent=false', '--reporter=default', '--reporter=json', '--outputFile.json=' + str(report)]
            result = subprocess.run(command, cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
            raw, native = result.stdout, report.read_bytes()
            parsed = json.loads(native)
            cases = [{'file': Path(s['name']).name.removeprefix(stem + '-'), 'fullName': c['fullName'], 'status': c['status'], 'messages': c['failureMessages']} for s in parsed['testResults'] for c in s['assertionResults']]
            row = {'name': name, 'command': command, 'cwd': str(ROOT), 'exit': result.returncode, 'signal': -result.returncode if result.returncode < 0 else None, 'passed': parsed['numPassedTests'], 'failed': parsed['numFailedTests'], 'pending': parsed['numPendingTests'], 'cases': cases, 'moduleSha256': sha(widget.read_bytes()), 'copySha256': {str(p.relative_to(ROOT)): sha(p.read_bytes()) for p in copies}, 'rawSha256': sha(raw), 'runnerSha256': sha(native), 'actWarnings': raw.count(b'not wrapped in act'), 'environmentWarnings': raw.count(b'not configured to support act'), 'stderrBlocks': raw.count(b'stderr |')}
            for suffix, data in [('raw', raw), ('runner.json', native)]:
                (OUT / (PHASE + '-' + name + '.' + suffix + '.gz')).write_bytes(gzip.compress(data, mtime=0))
            runs.append(row)
            print(json.dumps({k: row[k] for k in ['name', 'exit', 'passed', 'failed', 'pending', 'actWarnings', 'stderrBlocks']}), flush=True)
        finally:
            widget.unlink(missing_ok=True)
            for path in copies:
                path.unlink(missing_ok=True)
proof = {'phase': PHASE, 'stage': 'zero diagnostic before deduplication' if PHASE == 'before' else 'final deduplicated candidate', 'parentCommit': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(), 'sourceSha256': sha(source), 'helperSha256': {p: sha(b) for p, b in helpers.items()}, 'testSha256': {p: sha(b) for p, b in tests.items()}, 'variants': variants, 'diagnosticCallerReplacement': [new_error, old_error], 'runs': runs, 'sourceUnchanged': (UI / 'SpriteUploadWizard.tsx').read_bytes() == source, 'helpersUnchanged': all((FIXTURES / p).read_bytes() == b for p, b in helpers.items()), 'testsUnchanged': all((UI / p).read_bytes() == b for p, b in tests.items()), 'copiesRemoved': not list(BASE.rglob('pre94-c10-*'))}
(OUT / (PHASE + '-proof.json')).write_text(json.dumps(proof, ensure_ascii=False, indent=2) + '\n')
for name, data in {**tests, **helpers}.items():
    (OUT / (PHASE + '-' + name + '.gz')).write_bytes(gzip.compress(data, mtime=0))
assert all(proof[k] for k in ['sourceUnchanged', 'helpersUnchanged', 'testsUnchanged', 'copiesRemoved'])
count = 30 if PHASE == 'before' else 28
identities = {(c['file'], c['fullName']) for c in runs[0]['cases']}
assert len(identities) == count
expected = {'cancel-late-close': ['C03-G02-02'], 'submit-lock': ['C03-G07-02'], 'transfer-cancel-disabled': ['C03-G07-02', 'C03-G07-03'] if PHASE == 'before' else ['C03-G07-02'], 'transfer-reselection-id': ['C03-G02-10', 'C03-G07-04', 'C03-G07-09'] if PHASE == 'before' else ['C03-G02-10', 'C03-G07-04']}
for run in runs:
    name = run['name']
    assert {(c['file'], c['fullName']) for c in run['cases']} == identities
    failures = [c for c in run['cases'] if c['status'] == 'failed']
    required = expected.get(name, [])
    assert run['failed'] == len(failures) == len(required) and run['passed'] == count - len(required)
    assert run['exit'] == int(bool(required)) and run['pending'] == 0 and run['environmentWarnings'] == 0
    assert all('AssertionError:' in ''.join(c['messages']) for c in failures)
    assert all(any(key in c['fullName'] for key in required) for c in failures)
    assert all(any(key in c['fullName'] for c in failures) for key in required)
    diagnostic = name == 'diagnostic-original-error-poll'
    assert run['actWarnings'] == (2 if diagnostic else 0) and run['stderrBlocks'] == int(diagnostic)
