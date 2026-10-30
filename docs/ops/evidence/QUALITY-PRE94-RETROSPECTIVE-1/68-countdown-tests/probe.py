"""Countdown test precision: isolated copies through the real Vitest runner."""
import gzip
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys
import tempfile

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[4]
SOURCE = ROOT / 'packages/game/src/tools/speedrun'
PHASE = sys.argv[1]
assert PHASE in ('before', 'after')
assert not (OUT / f'{PHASE}-proof.json').exists()
FILES = ['countdown.ts', 'countdown.test.ts', 'countdown.glm-phase1-leaves.test.ts']
original = {name: (SOURCE / name).read_bytes() for name in FILES}


def sha(data):
    return hashlib.sha256(data).hexdigest()


variants = {
    'control': None,
    'same-text-write': (
        'if (el.textContent !== text) el.textContent = text',
        'el.textContent = text',
    ),
    'replace-root': (
        '  if (!el) {',
        '  el?.remove()\n  el = null\n  if (!el) {',
    ),
    'skip-remove': ('    el?.remove()', '    // mutation: retain the old countdown'),
}
proof = {
    'phase': PHASE,
    'base': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(),
    'formalSha256': {name: sha(data) for name, data in original.items()},
    'variants': variants,
    'runs': [],
}
try:
    for variant, replacement in variants.items():
        stem = f'pre94-countdown68-{PHASE}-{variant}-'
        module = original['countdown.ts'].decode()
        if replacement:
            old, new = replacement
            assert module.count(old) == 1
            module = module.replace(old, new)
        copies = {SOURCE / (stem + 'countdown.ts'): module.encode()}
        for name in FILES[1:]:
            old_import = b"'./countdown.js'"
            assert original[name].count(old_import) == 1
            copies[SOURCE / (stem + name)] = original[name].replace(
                old_import, ("'./" + stem + "countdown.js'").encode()
            )
        assert not any(path.exists() for path in copies)
        try:
            for path, data in copies.items():
                path.write_bytes(data)
            with tempfile.TemporaryDirectory(prefix='type-pal-countdown68-') as tmp:
                report = Path(tmp) / 'runner.json'
                command = [
                    'pnpm', '--filter', '@type-pal/game', 'exec', 'vitest', 'run',
                    *[str(path.relative_to(ROOT / 'packages/game')) for path in copies if '.test.ts' in path.name],
                    '--maxWorkers=1', '--silent=false', '--reporter=default', '--reporter=json',
                    '--outputFile.json=' + str(report),
                ]
                proc = subprocess.run(command, cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
                raw = proc.stdout
                runner = report.read_bytes()
                data = json.loads(runner)
            cases = [
                {'file': Path(suite['name']).name.removeprefix(stem),
                 'fullName': case['fullName'], 'status': case['status'],
                 'failureMessages': case['failureMessages']}
                for suite in data['testResults'] for case in suite['assertionResults']
            ]
            (OUT / f'{PHASE}-{variant}.raw.gz').write_bytes(gzip.compress(raw, mtime=0))
            (OUT / f'{PHASE}-{variant}.runner.json.gz').write_bytes(gzip.compress(runner, mtime=0))
            plain = re.sub(r'\x1b\[[0-9;]*m', '', raw.decode())
            errors = re.findall(r'\n(AssertionError|TypeError|ReferenceError|Error):', plain)
            row = {
                'variant': variant, 'command': command, 'cwd': str(ROOT),
                'exit': proc.returncode, 'signal': -proc.returncode if proc.returncode < 0 else None,
                'spawnError': None, 'rawSha256': sha(raw), 'runnerSha256': sha(runner),
                'moduleSha256': sha(module.encode()),
                'copiesSha256': {str(path.relative_to(ROOT)): sha(value) for path, value in copies.items()},
                'passed': data['numPassedTests'], 'failed': data['numFailedTests'],
                'pending': data['numPendingTests'], 'errorNames': errors, 'cases': cases,
            }
            proof['runs'].append(row)
            (OUT / f'{PHASE}-proof.json').write_text(json.dumps(proof, ensure_ascii=False, indent=2) + '\n')
            expected = 0 if variant == 'control' or (PHASE == 'before' and variant == 'same-text-write') else 2 if PHASE == 'before' and variant == 'skip-remove' else 1
            failed = [case for case in cases if case['status'] == 'failed']
            assert len(cases) == 4 and len(data['testResults']) == 2
            assert data['numPendingTests'] == 0 and data['numFailedTests'] == len(failed) == expected
            assert all(case['status'] in ('passed', 'failed') for case in cases)
            assert proc.returncode == int(bool(expected)) and errors == ['AssertionError'] * expected
            assert b'stderr |' not in raw and b'Unhandled' not in raw
            if PHASE == 'after' and expected:
                target = {'same-text-write': '相同文字', 'replace-root': '传字符串', 'skip-remove': '传 null'}[variant]
                assert target in failed[0]['fullName']
            print(PHASE, variant, row['passed'], row['failed'], errors, flush=True)
        finally:
            for path in copies:
                path.unlink(missing_ok=True)
finally:
    proof['formalSourcesUnchanged'] = all((SOURCE / name).read_bytes() == data for name, data in original.items())
    proof['temporaryCopiesRemoved'] = not list(SOURCE.glob('pre94-countdown68-*'))
    (OUT / f'{PHASE}-proof.json').write_text(json.dumps(proof, ensure_ascii=False, indent=2) + '\n')
    assert proof['formalSourcesUnchanged'] and proof['temporaryCopiesRemoved']
