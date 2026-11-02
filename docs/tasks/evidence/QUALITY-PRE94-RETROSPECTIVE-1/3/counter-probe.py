# -*- coding: utf-8 -*-
"""Reproduce the CODE3 slice test gaps against isolated, exact module copies."""
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
EVENTS = ROOT / 'packages/pal-extract/src/events'
SOURCE = EVENTS / 'slice.ts'
TESTS = ['slice.test.ts', 'slice.boundaries.test.ts', 'slice.glm-runtime-resource.test.ts', 'slice.kimi-r1.test.ts']
phase = sys.argv[1]
assert phase in ('before', 'after')


def digest(data):
    return hashlib.sha256(data).hexdigest()


source = SOURCE.read_bytes()
tests = {name: (EVENTS / name).read_bytes() for name in TESTS}
random_anchor = 'for (let k = 1; k <= (c.operands[0] ?? 0); k++) queue.push(i + k)'
reset_anchor = "if (typeof c.resetTo === 'number') queue.push(c.resetTo)\n          queue.push(i + 1)"
mutations = {
    'control': None,
    'random': (random_anchor, 'void i', 1),
    'reset': (reset_anchor, "if (typeof c.resetTo === 'number') queue.push(c.resetTo)\n          if (typeof c.resetTo !== 'number') queue.push(i + 1)", 1),
    'auto': ('if (eo.autoScript > 0) entries.push(eo.autoScript)', 'if (eo.autoScript > 0) entries.push(1)', 1),
}
expected_title = {
    'random': '0xA2 randomJump:',
    'reset': '0x0002 end reset:',
    'auto': 'EO 区间越过 eventObjects 末尾：',
}
runs = []
with tempfile.TemporaryDirectory(prefix='type-pal-pre94-slice-') as temp:
    for name, mutation in mutations.items():
        stem = f'pre94-slice-{phase}-{name}'
        module = EVENTS / f'{stem}.ts'
        copies = [(EVENTS / f'{stem}-{test}', original) for test, original in tests.items()]
        report = Path(temp) / f'{name}.json'
        text = source.decode()
        if mutation:
            assert text.count(mutation[0]) == (2 if name == 'reset' else 1)
            text = text.replace(*mutation)
        module.write_text(text)
        command = ['pnpm', '--filter', '@type-pal/pal-extract', 'exec', 'vitest', 'run']
        for path, original in copies:
            path.write_bytes(original.replace(b"'./slice.js'", f"'./{stem}.js'".encode()))
            command.append(f'src/events/{path.name}')
        command.extend(['--maxWorkers=1', '--reporter=default', '--reporter=json', f'--outputFile.json={report}', '--silent=false'])
        started = time.monotonic()
        try:
            completed = subprocess.run(command, cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
            raw = completed.stdout
            runner = report.read_bytes()
            parsed = json.loads(runner)
            assertions = [
                {'file': Path(suite['name']).name.replace(stem + '-', ''), 'name': case['fullName'], 'status': case['status'], 'messages': case['failureMessages']}
                for suite in parsed['testResults'] for case in suite['assertionResults']
            ]
            row = {
                'name': name, 'command': command, 'cwd': str(ROOT), 'exit': completed.returncode,
                'seconds': round(time.monotonic() - started, 3), 'passed': parsed['numPassedTests'],
                'failed': parsed['numFailedTests'], 'pending': parsed['numPendingTests'],
                'assertions': assertions, 'rawSha256': digest(raw), 'runnerSha256': digest(runner),
                'moduleSha256': digest(module.read_bytes()),
                'testCopySha256': {path.name: digest(path.read_bytes()) for path, original in copies},
                'diagnostics': {'act': raw.count(b'not wrapped in act('), 'environment': raw.count(b'not configured to support act'), 'navigation': raw.count(b'Not implemented: navigation')},
            }
            (OUT / f'{phase}-{name}.raw.gz').write_bytes(gzip.compress(raw, mtime=0))
            (OUT / f'{phase}-{name}.runner.json.gz').write_bytes(gzip.compress(runner, mtime=0))
            runs.append(row)
            print(json.dumps({k: row[k] for k in ('name', 'exit', 'passed', 'failed', 'pending', 'diagnostics')}), flush=True)
        finally:
            module.unlink(missing_ok=True)
            for path, original in copies:
                path.unlink(missing_ok=True)

result = {
    'phase': phase, 'head': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(),
    'sourceSha256': digest(source), 'testSha256': {name: digest(original) for name, original in tests.items()}, 'runs': runs,
    'productionUnchanged': SOURCE.read_bytes() == source,
    'originalTestsUnchangedDuringProbe': all((EVENTS / name).read_bytes() == original for name, original in tests.items()),
    'temporaryCopiesRemoved': not list(EVENTS.glob(f'pre94-slice-{phase}-*')),
}
(OUT / f'{phase}-proof.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
assert result['productionUnchanged'] and result['originalTestsUnchangedDuringProbe'] and result['temporaryCopiesRemoved']
identities = {(case['file'], case['name']) for case in runs[0]['assertions']}
for row in runs:
    failures = [case for case in row['assertions'] if case['status'] == 'failed']
    assert {(case['file'], case['name']) for case in row['assertions']} == identities
    assert row['pending'] == 0 and row['diagnostics'] == {'act': 0, 'environment': 0, 'navigation': 0}
    expected_fail = phase == 'after' and row['name'] != 'control'
    assert row['exit'] == int(expected_fail) and row['failed'] == int(expected_fail), row
    assert row['passed'] == len(identities) - int(expected_fail)
    if expected_fail:
        assert len(failures) == 1 and expected_title[row['name']] in failures[0]['name']
        assert 'AssertionError:' in ''.join(failures[0]['messages'])
