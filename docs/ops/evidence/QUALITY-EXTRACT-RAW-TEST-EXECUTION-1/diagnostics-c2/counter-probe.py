# -*- coding: utf-8 -*-
"""Complete two-file runs, exact parser copies; never mutate production sources."""
import gzip
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[4]
BASE = ROOT / 'packages/pal-extract/src'
PHASE = sys.argv[1]
assert PHASE in ('before', 'after')
TESTS = ['resources/tables.test.ts', 'resources/parsers/__tests__/enemy-teams.boundaries.test.ts']
SOURCE = 'resources/parsers/enemy-teams.ts'
BARREL = 'resources/tables.ts'
source = (BASE / SOURCE).read_bytes()
barrel = (BASE / BARREL).read_bytes()
tests = {p: (BASE / p).read_bytes() for p in TESTS}
warning = "console.warn(\n              `[parseEnemyTeams] team ${i} slot OBJECT index ${slot} 不在 OBJECT_ENEMY 段映射中,标空`,\n            )"
variants = {
    'control': [],
    'team-id': [('id: i,', 'id: objectIndexToEnemyId && enemyObjectNames ? i + 1 : i,')],
    'buffer-ownership': [('  return out', '  if (objectIndexToEnemyId && enemyObjectNames) teamBuf.fill(0)\n  return out')],
    'map-ownership': [('  return out', '  if (objectIndexToEnemyId && enemyObjectNames) objectIndexToEnemyId.clear()\n  return out')],
    'names-ownership': [('  return out', '  if (objectIndexToEnemyId && enemyObjectNames) enemyObjectNames.clear()\n  return out')],
    'unknown-missing-warning': [(warning, 'if (slot < 565) ' + warning)],
    'unknown-wrong-warning': [('${slot} 不在', '${slot === 999 ? 998 : slot} 不在')],
    'unknown-extra-warning': [(warning, warning + "\n            if (slot >= 565) console.warn('unexpected unknown OBJECT output')")],
    'retained-raw-name': [('const nm = enemyObjectNames.get(slot)', 'const nm = enemyObjectNames.get(objectIndexToEnemyId?.get(slot) ?? slot)')],
    'transferred-999-output': [('return 0xffff', 'return slot === 999 ? 999 : 0xffff')],
}


def sha(data):
    return hashlib.sha256(data).hexdigest()


runs = []
with tempfile.TemporaryDirectory(prefix='type-pal-c2-report-') as directory:
    for name, replacements in variants.items():
        stem = 'pre94-c2-' + PHASE + '-' + name
        module = BASE / 'resources/parsers' / (stem + '.ts')
        export = BASE / 'resources' / (stem + '-tables.ts')
        copies = []
        report = Path(directory) / (name + '.json')
        command = ['pnpm', '--filter', '@type-pal/pal-extract', 'exec', 'vitest', 'run']
        try:
            text = source.decode()
            for old, new in replacements:
                assert text.count(old) == 1, (name, old)
                text = text.replace(old, new)
            module.write_text(text)
            export.write_bytes(barrel.replace(b'./parsers/enemy-teams.js', ('./parsers/' + stem + '.js').encode()))
            for test, data in tests.items():
                path = BASE / Path(test).parent / (stem + '-' + Path(test).name)
                data = data.replace(b"./tables.js'", ('./' + stem + "-tables.js'").encode())
                data = data.replace(b"../enemy-teams.js'", ('../' + stem + ".js'").encode())
                path.write_bytes(data)
                copies.append(path)
                command.append('src/' + str(path.relative_to(BASE)))
            command += ['--maxWorkers=1', '--reporter=default', '--reporter=json', '--silent=false', '--outputFile.json=' + str(report)]
            result = subprocess.run(command, cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
            raw, native = result.stdout, report.read_bytes()
            parsed = json.loads(native)
            cases = [{'file': Path(s['name']).name.removeprefix(stem + '-'), 'fullName': c['fullName'], 'status': c['status'], 'messages': c['failureMessages']} for s in parsed['testResults'] for c in s['assertionResults']]
            row = {'name': name, 'command': command, 'cwd': str(ROOT), 'exit': result.returncode, 'signal': -result.returncode if result.returncode < 0 else None, 'passed': parsed['numPassedTests'], 'failed': parsed['numFailedTests'], 'pending': parsed['numPendingTests'], 'cases': cases, 'moduleSha256': sha(module.read_bytes()), 'barrelSha256': sha(export.read_bytes()), 'testCopySha256': {str(p.relative_to(ROOT)): sha(p.read_bytes()) for p in copies}, 'rawSha256': sha(raw), 'runnerSha256': sha(native), 'stderrBlocks': raw.count(b'stderr |')}
            for suffix, data in [('raw', raw), ('runner.json', native)]:
                (OUT / (PHASE + '-' + name + '.' + suffix + '.gz')).write_bytes(gzip.compress(data, mtime=0))
            runs.append(row)
            print(json.dumps({k: row[k] for k in ('name', 'exit', 'passed', 'failed', 'pending', 'stderrBlocks')}), flush=True)
        finally:
            module.unlink(missing_ok=True)
            export.unlink(missing_ok=True)
            for path in copies:
                path.unlink(missing_ok=True)
proof = {'phase': PHASE, 'baseCommit': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(), 'sourcePath': SOURCE, 'sourceSha256': sha(source), 'barrelSha256': sha(barrel), 'testSha256': {p: sha(b) for p, b in tests.items()}, 'variants': variants, 'runs': runs, 'sourcesUnchanged': (BASE / SOURCE).read_bytes() == source and (BASE / BARREL).read_bytes() == barrel, 'testsUnchanged': all((BASE / p).read_bytes() == b for p, b in tests.items()), 'copiesRemoved': not list(BASE.rglob('pre94-c2-*'))}
(OUT / (PHASE + '-proof.json')).write_text(json.dumps(proof, ensure_ascii=False, indent=2) + '\n')
for test, data in tests.items():
    (OUT / (PHASE + '-' + Path(test).name + '.gz')).write_bytes(gzip.compress(data, mtime=0))
assert all(proof[k] for k in ('sourcesUnchanged', 'testsUnchanged', 'copiesRemoved'))
identities = {(c['file'], c['fullName']) for c in runs[0]['cases']}
for run in runs:
    assert {(c['file'], c['fullName']) for c in run['cases']} == identities
    failures = [c for c in run['cases'] if c['status'] == 'failed']
    red = run['name'] != 'control' and (PHASE == 'after' or run['name'].startswith(('retained-', 'transferred-')))
    assert run['failed'] == len(failures) == int(red)
    assert run['passed'] == len(identities) - int(red) and run['pending'] == 0 and run['exit'] == int(red)
    assert all('AssertionError:' in ''.join(c['messages']) for c in failures)
    if red:
        needle = 'M3.30 翻译模式:OBJECT 索引不在 map 中' if PHASE == 'before' and run['name'].startswith('transferred-') else ('未知 OBJECT 999' if run['name'].startswith(('unknown-', 'transferred-')) else '两 OBJECT 映同 enemyId')
        assert needle in failures[0]['fullName'], (run['name'], failures)
    if PHASE == 'after':
        assert run['stderrBlocks'] == 0
