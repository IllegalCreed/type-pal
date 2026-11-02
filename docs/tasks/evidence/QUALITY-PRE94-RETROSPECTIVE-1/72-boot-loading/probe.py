# -*- coding: utf-8 -*-
"""Run boot-loading real host tests against isolated wrapper contract mutants."""
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
SOURCE = ROOT / 'packages/game/src/shell'
PHASE = sys.argv[1]
assert PHASE in ('before', 'after')
assert not (OUT / f'{PHASE}-proof.json').exists()
FILES = ['boot-loading.ts', 'boot-loading.test.ts', 'boot-loading-host.grok-r1.test.ts']
original = {name: (SOURCE / name).read_bytes() for name in FILES}


def sha(data):
    return hashlib.sha256(data).hexdigest()


variants = {
    'control': None,
    'fetch-init-dropped': ('return await orig(...args)', 'return await orig(args[0])'),
    'fetch-error-swallowed': ('return await orig(...args)', "try { return await orig(...args) } catch { return new Response('{}') }"),
    'denominator-fixed': ('Math.max(_started, _expected)', '_expected'),
}
proof = {
    'phase': PHASE,
    'base': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(),
    'formalSha256': {name: sha(data) for name, data in original.items()},
    'variants': variants, 'runs': [],
}
try:
    for variant, replacement in variants.items():
        stem = f'pre94-boot72-{PHASE}-{variant}-'
        module = original['boot-loading.ts'].decode()
        if replacement:
            old, new = replacement
            assert module.count(old) == 1
            module = module.replace(old, new)
        copies = {SOURCE / (stem + 'boot-loading.ts'): module.encode()}
        for name in FILES[1:]:
            old_import = b"'./boot-loading.js'"
            assert original[name].count(old_import) == 1
            copies[SOURCE / (stem + name)] = original[name].replace(
                old_import, ("'./" + stem + "boot-loading.js'").encode()
            )
        assert not any(path.exists() for path in copies)
        try:
            for path, data in copies.items():
                path.write_bytes(data)
            with tempfile.TemporaryDirectory(prefix='type-pal-boot72-') as tmp:
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
            expected = int(PHASE == 'after' and variant != 'control')
            total = 20
            failed = [case for case in cases if case['status'] == 'failed']
            assert len(cases) == total and len(data['testResults']) == 2
            assert data['numPendingTests'] == 0 and data['numFailedTests'] == len(failed) == expected
            assert all(case['status'] in ('passed', 'failed') for case in cases)
            assert proc.returncode == expected and errors == ['AssertionError'] * expected
            assert b'stderr |' not in raw and b'Unhandled' not in raw
            if expected:
                needle = {'fetch-init-dropped': 'Request/init', 'fetch-error-swallowed': 'G09-C02', 'denominator-fixed': '进度单调'}[variant]
                assert needle in failed[0]['fullName']
            print(PHASE, variant, row['passed'], row['failed'], errors, flush=True)
        finally:
            for path in copies:
                path.unlink(missing_ok=True)
finally:
    proof['formalSourcesUnchanged'] = all((SOURCE / name).read_bytes() == data for name, data in original.items())
    proof['temporaryCopiesRemoved'] = not list(SOURCE.glob('pre94-boot72-*'))
    (OUT / f'{PHASE}-proof.json').write_text(json.dumps(proof, ensure_ascii=False, indent=2) + '\n')
    assert proof['formalSourcesUnchanged'] and proof['temporaryCopiesRemoved']
