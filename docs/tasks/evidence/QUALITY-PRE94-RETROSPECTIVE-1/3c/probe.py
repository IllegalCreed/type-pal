# -*- coding: utf-8 -*-
"""Run isolated CODE3c counterfactuals without changing the production module."""
import gzip
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import time

ROOT = Path(__file__).resolve().parents[5]
OUT = Path(__file__).resolve().parent
UI = ROOT / 'packages/editor/src/ui'
SOURCE = UI / 'SpriteFrameWorkbench.tsx'
TEST = UI / 'SpriteFrameWorkbench.animation-boundary.test.tsx'
phase = sys.argv[1]
assert phase in ('before', 'after')


def digest(data):
    return hashlib.sha256(data).hexdigest()


def archive(path, data):
    path.write_bytes(gzip.compress(data, mtime=0))


original = SOURCE.read_bytes()
test = TEST.read_bytes()
mutations = {
    'control': None,
    'fallback': (
        'const safeIndex = requested >= 0 && requested < props.frames.length ? requested : 0',
        'const safeIndex = requested',
    ),
    'finish': (
        '!reducedMotion && !position.finished && props.steps.length > 1',
        '!reducedMotion && props.steps.length > 1',
    ),
    'cleanup': (
        'if (timer !== undefined) window.clearTimeout(timer)',
        'void timer',
    ),
}
runs = []
with tempfile.TemporaryDirectory(prefix='type-pal-pre94-3c-') as temp:
    for name, mutation in mutations.items():
        stem = f'pre94-3c-{phase}-{name}'
        module = UI / f'{stem}.tsx'
        test_copy = UI / f'{stem}.test.tsx'
        report = Path(temp) / f'{name}.json'
        text = original.decode()
        if mutation:
            assert text.count(mutation[0]) == 1, (name, 'source anchor drift')
            text = text.replace(*mutation)
        module.write_text(text)
        test_copy.write_bytes(test.replace(b"'./SpriteFrameWorkbench.js'", f"'./{stem}.js'".encode()))
        command = [
            'pnpm', '--filter', '@type-pal/editor', 'exec', 'vitest', 'run',
            f'src/ui/{stem}.test.tsx', '--maxWorkers=1', '--reporter=default',
            '--reporter=json', f'--outputFile.json={report}', '--silent=false',
        ]
        started = time.monotonic()
        try:
            completed = subprocess.run(command, cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
            raw = completed.stdout
            runner = report.read_bytes()
            parsed = json.loads(runner)
            assertions = [a for suite in parsed['testResults'] for a in suite['assertionResults']]
            failures = [
                {'name': a['fullName'], 'messages': a['failureMessages']}
                for a in assertions if a['status'] == 'failed'
            ]
            row = {
                'name': name, 'command': command, 'cwd': str(ROOT),
                'exit': completed.returncode, 'seconds': round(time.monotonic() - started, 3),
                'passed': parsed['numPassedTests'], 'failed': parsed['numFailedTests'],
                'pending': parsed['numPendingTests'], 'failures': failures,
                'rawSha256': digest(raw), 'runnerSha256': digest(runner),
                'moduleSha256': digest(module.read_bytes()),
                'testCopySha256': digest(test_copy.read_bytes()),
                'diagnostics': {
                    'act': raw.count(b'not wrapped in act('),
                    'environment': raw.count(b'not configured to support act'),
                    'navigation': raw.count(b'Not implemented: navigation'),
                },
            }
            archive(OUT / f'{phase}-{name}.raw.gz', raw)
            archive(OUT / f'{phase}-{name}.runner.json.gz', runner)
            runs.append(row)
            print(json.dumps({k: row[k] for k in ('name', 'exit', 'passed', 'failed', 'pending', 'diagnostics')}), flush=True)
        finally:
            module.unlink(missing_ok=True)
            test_copy.unlink(missing_ok=True)

result = {
    'phase': phase, 'head': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(),
    'sourceSha256': digest(original), 'testSha256': digest(test), 'runs': runs,
    'productionUnchanged': SOURCE.read_bytes() == original,
    'testUnchangedDuringProbe': TEST.read_bytes() == test,
    'temporaryCopiesRemoved': not list(UI.glob(f'pre94-3c-{phase}-*')),
}
(OUT / f'{phase}-proof.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
assert result['productionUnchanged'] and result['testUnchangedDuringProbe'] and result['temporaryCopiesRemoved']
for row in runs:
    expected_fail = row['name'] in ('fallback', 'finish') or (phase == 'after' and row['name'] == 'cleanup')
    assert row['pending'] == 0
    assert row['diagnostics'] == {'act': 0, 'environment': 0, 'navigation': 0}
    assert row['exit'] == (1 if expected_fail else 0), row
    assert row['passed'] == (0 if expected_fail else 1), row
    assert row['failed'] == (1 if expected_fail else 0), row
    if expected_fail:
        assert len(row['failures']) == 1 and 'AssertionError' in ''.join(row['failures'][0]['messages']), row
