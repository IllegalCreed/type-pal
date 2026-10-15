# -*- coding: utf-8 -*-
"""Execute complete annotation suites against isolated exact module counterfactuals."""
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
SOURCE = EVENTS / 'annotate.ts'
TESTS = ['annotate.test.ts', 'annotate.glm-runtime-resource.test.ts']
phase = sys.argv[1]
assert phase in ('before', 'after')
source = SOURCE.read_bytes()
tests = {name: (EVENTS / name).read_bytes() for name in TESTS}


def digest(data):
    return hashlib.sha256(data).hexdigest()


mutations = {
    'control': None,
    'sequence': ('steps: annotate(c.steps, words, symbols)', 'steps: annotate(c.steps, words, symbols).slice(0, 1)'),
    'choice': ('options: c.options.map((o) => ({ ...o, then: annotate(o.then, words, symbols) }))', "options: c.options.map((o) => ({ text: '', then: annotate(o.then, words, symbols) }))"),
    'if-then': ('then: annotate(c.then, words, symbols)', 'then: c.else ? annotate(c.then, words, symbols) : c.then'),
    'ownership': ('return commands.map((c) => annotateOne(c, words, symbols))', 'const result = commands.map((c) => annotateOne(c, words, symbols))\n  commands.reverse()\n  return result'),
    'symbols-preservation': ('return structuredClone(value) as Symbols', 'const output = structuredClone(value) as Symbols\n  delete output.spell\n  return output'),
    'symbols-table': ("if (!table || typeof table !== 'object' || Array.isArray(table))", 'if (Array.isArray(table))'),
    'transfer-offset': ('const idx = wObjectId - objStart', 'const idx = wObjectId'),
    'transfer-priority': ('symbols.item?.[String(command.itemId)] ?? wordAt(words.items, command.itemId, ITEM_OBJ_START)', 'wordAt(words.items, command.itemId, ITEM_OBJ_START) ?? symbols.item?.[String(command.itemId)]'),
    'transfer-raw': ("if (c.op === 'raw') return c", "if (c.op === 'raw') return Object.assign({}, c, { _item: 'wrong' })"),
}
expected = {
    'sequence': '结构化命令 sequence 递归',
    'choice': 'choice：每个 option.then 内命令被递归注释，raw 选项原样',
    'if-then': 'if 无 else：保留条件并递归注释 then',
    'ownership': '输入命令数组与对象注释前后逐字段相等（纯映射产出新对象）',
    'symbols-preservation': '合法映射保留；空对象合法',
    'symbols-table': '各 symbols 表必须是对象映射',
}
runs = []
with tempfile.TemporaryDirectory(prefix='type-pal-pre94-annotation-') as temp:
    for name, mutation in mutations.items():
        stem = f'pre94-annotation-{phase}-{name}'
        module = EVENTS / f'{stem}.ts'
        copies = [(EVENTS / f'{stem}-{test}', data) for test, data in tests.items()]
        report = Path(temp) / f'{name}.json'
        text = source.decode()
        if mutation:
            assert text.count(mutation[0]) == 1, name
            text = text.replace(*mutation)
        module.write_text(text)
        command = ['pnpm', '--filter', '@type-pal/pal-extract', 'exec', 'vitest', 'run']
        for path, data in copies:
            path.write_bytes(data.replace(b"'./annotate.js'", f"'./{stem}.js'".encode()))
            command.append(f'src/events/{path.name}')
        command.extend(['--maxWorkers=1', '--reporter=default', '--reporter=json', f'--outputFile.json={report}', '--silent=false'])
        started = time.monotonic()
        try:
            result = subprocess.run(command, cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
            raw = result.stdout
            runner = report.read_bytes()
            parsed = json.loads(runner)
            cases = [
                {'file': Path(suite['name']).name.removeprefix(stem + '-'), 'fullName': case['fullName'], 'status': case['status'], 'messages': case['failureMessages']}
                for suite in parsed['testResults'] for case in suite['assertionResults']
            ]
            row = {
                'name': name, 'kind': 'oracle-transfer' if name.startswith('transfer-') else 'discrimination',
                'command': command, 'cwd': str(ROOT), 'exit': result.returncode,
                'seconds': round(time.monotonic() - started, 3), 'passed': parsed['numPassedTests'],
                'failed': parsed['numFailedTests'], 'pending': parsed['numPendingTests'], 'cases': cases,
                'rawSha256': digest(raw), 'runnerSha256': digest(runner), 'moduleSha256': digest(module.read_bytes()),
                'testCopySha256': {path.name: digest(path.read_bytes()) for path, data in copies},
                'diagnostics': {'act': raw.count(b'not wrapped in act('), 'environment': raw.count(b'not configured to support act'), 'navigation': raw.count(b'Not implemented: navigation')},
            }
            (OUT / f'{phase}-{name}.raw.gz').write_bytes(gzip.compress(raw, mtime=0))
            (OUT / f'{phase}-{name}.runner.json.gz').write_bytes(gzip.compress(runner, mtime=0))
            runs.append(row)
            print(json.dumps({key: row[key] for key in ('name', 'exit', 'passed', 'failed', 'pending', 'diagnostics')}), flush=True)
        finally:
            module.unlink(missing_ok=True)
            for path, data in copies:
                path.unlink(missing_ok=True)

proof = {
    'phase': phase, 'head': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(),
    'sourceSha256': digest(source), 'testSha256': {name: digest(data) for name, data in tests.items()}, 'runs': runs,
    'productionUnchanged': SOURCE.read_bytes() == source,
    'testFilesUnchangedDuringProbe': all((EVENTS / name).read_bytes() == data for name, data in tests.items()),
    'temporaryCopiesRemoved': not list(EVENTS.glob(f'pre94-annotation-{phase}-*')),
}
(OUT / f'{phase}-proof.json').write_text(json.dumps(proof, ensure_ascii=False, indent=2) + '\n')
assert proof['productionUnchanged'] and proof['testFilesUnchangedDuringProbe'] and proof['temporaryCopiesRemoved']
identities = {(case['file'], case['fullName']) for case in runs[0]['cases']}
assert len(identities) == (17 if phase == 'before' else 16)
for row in runs:
    failures = [case for case in row['cases'] if case['status'] == 'failed']
    assert {(case['file'], case['fullName']) for case in row['cases']} == identities
    assert row['pending'] == 0 and row['diagnostics'] == {'act': 0, 'environment': 0, 'navigation': 0}
    if row['kind'] == 'oracle-transfer':
        assert row['exit'] == 1 and failures
        assert all('AssertionError:' in ''.join(case['messages']) for case in failures)
        continue
    red = phase == 'after' and row['name'] != 'control'
    assert row['exit'] == int(red) and row['failed'] == int(red) and row['passed'] == len(identities) - int(red)
    if red:
        assert len(failures) == 1 and expected[row['name']] in failures[0]['fullName']
        assert 'AssertionError:' in ''.join(failures[0]['messages'])
