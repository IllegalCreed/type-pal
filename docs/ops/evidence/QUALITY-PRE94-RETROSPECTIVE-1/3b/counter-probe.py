# -*- coding: utf-8 -*-
"""Run all four SSS/MSG suites with isolated exact source copies."""
import gzip
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[4]
BASE = ROOT / 'packages/pal-extract/src/io'
PHASE = sys.argv[1]
assert PHASE in ('before', 'after')
tests = {name: (BASE / name).read_bytes() for name in ['sss.boundaries.test.ts', 'msg.boundaries.test.ts', 'sss.test.ts', 'msg.test.ts']}
sources = {name: (BASE / name).read_bytes() for name in ['sss.ts', 'msg.ts']}
variants = {
    'control': None,
    'prefix-ownership': ('sss.ts', '  const mkf = openMkf(buf)', '  new Uint8Array(buf.buffer).fill(0, 0, buf.byteOffset)\n  const mkf = openMkf(buf)'),
    'suffix-ownership': ('sss.ts', '  const mkf = openMkf(buf)', '  new Uint8Array(buf.buffer).fill(0, buf.byteOffset + buf.byteLength)\n  const mkf = openMkf(buf)'),
    'second-eo-field': ('sss.ts', 'x: readU16(view, base + 2),', 'x: readU16(view, base + 2) + (i === 1 ? 1 : 0),'),
    'second-scene-field': ('sss.ts', 'mapNum: readU16(view, base + 0),', 'mapNum: readU16(view, base + 0) + (i === 1 ? 1 : 0),'),
    'message-ownership': ('msg.ts', '  return out', '  msg.fill(0)\n  return out'),
    'offsets-ownership': ('msg.ts', '  return out', '  offsets.fill(0)\n  return out'),
}


def sha(data):
    return hashlib.sha256(data).hexdigest()


runs = []
with tempfile.TemporaryDirectory(prefix='type-pal-3b-report-') as directory:
    for name, variant in variants.items():
        stem = 'pre94-3b-' + PHASE + '-' + name
        module = BASE / (stem + '.ts') if variant else None
        copies = []
        report = Path(directory) / (name + '.json')
        command = ['pnpm', '--filter', '@type-pal/pal-extract', 'exec', 'vitest', 'run']
        try:
            if variant:
                text = sources[variant[0]].decode()
                assert text.count(variant[1]) == 1
                module.write_text(text.replace(variant[1], variant[2]))
            for test, data in tests.items():
                path = BASE / (stem + '-' + test)
                if variant:
                    data = data.replace(('./' + Path(variant[0]).stem + ".js'").encode(), ('./' + stem + ".js'").encode())
                path.write_bytes(data)
                copies.append(path)
                command.append('src/io/' + path.name)
            command += ['--maxWorkers=1', '--silent=false', '--reporter=default', '--reporter=json', '--outputFile.json=' + str(report)]
            result = subprocess.run(command, cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
            raw, native = result.stdout, report.read_bytes()
            parsed = json.loads(native)
            cases = [{'file': Path(s['name']).name.removeprefix(stem + '-'), 'fullName': c['fullName'], 'status': c['status'], 'messages': c['failureMessages']} for s in parsed['testResults'] for c in s['assertionResults']]
            row = {'name': name, 'command': command, 'cwd': str(ROOT), 'exit': result.returncode, 'signal': -result.returncode if result.returncode < 0 else None, 'passed': parsed['numPassedTests'], 'failed': parsed['numFailedTests'], 'pending': parsed['numPendingTests'], 'cases': cases, 'moduleSha256': sha(module.read_bytes()) if module else None, 'copySha256': {str(p.relative_to(ROOT)): sha(p.read_bytes()) for p in copies}, 'rawSha256': sha(raw), 'runnerSha256': sha(native), 'stderrBlocks': raw.count(b'stderr |')}
            for suffix, data in [('raw', raw), ('runner.json', native)]:
                (OUT / (PHASE + '-' + name + '.' + suffix + '.gz')).write_bytes(gzip.compress(data, mtime=0))
            runs.append(row)
            print(json.dumps({k: row[k] for k in ['name', 'exit', 'passed', 'failed', 'pending', 'stderrBlocks']}), flush=True)
        finally:
            if module:
                module.unlink(missing_ok=True)
            for path in copies:
                path.unlink(missing_ok=True)
proof = {'phase': PHASE, 'baseCommit': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(), 'sourceSha256': {p: sha(b) for p, b in sources.items()}, 'testSha256': {p: sha(b) for p, b in tests.items()}, 'variants': variants, 'runs': runs, 'sourcesUnchanged': all((BASE / p).read_bytes() == b for p, b in sources.items()), 'testsUnchanged': all((BASE / p).read_bytes() == b for p, b in tests.items()), 'copiesRemoved': not list(BASE.glob('pre94-3b-*'))}
(OUT / (PHASE + '-proof.json')).write_text(json.dumps(proof, ensure_ascii=False, indent=2) + '\n')
for test, data in tests.items():
    (OUT / (PHASE + '-' + test + '.gz')).write_bytes(gzip.compress(data, mtime=0))
assert all(proof[k] for k in ['sourcesUnchanged', 'testsUnchanged', 'copiesRemoved'])
count = 16 if PHASE == 'before' else 20
identities = {(c['file'], c['fullName']) for c in runs[0]['cases']}
assert len(identities) == count
for run in runs:
    red = PHASE == 'after' and run['name'] != 'control'
    failures = [c for c in run['cases'] if c['status'] == 'failed']
    assert {(c['file'], c['fullName']) for c in run['cases']} == identities
    assert run['passed'] == count - int(red) and run['failed'] == len(failures) == int(red)
    assert run['exit'] == int(red) and run['pending'] == 0 and run['stderrBlocks'] == 0
    assert all('AssertionError:' in ''.join(c['messages']) for c in failures)
    if red:
        needle = '四条精确' if run['name'] in ('message-ownership', 'offsets-ownership') else ('scene 四字段精确' if run['name'] == 'second-scene-field' else '非对称 16 字段 EO')
        assert needle in failures[0]['fullName'], (run['name'], failures)
