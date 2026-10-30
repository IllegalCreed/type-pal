# -*- coding: utf-8 -*-
"""Exercise complete parser suites against exact source/IO-boundary counterfactuals."""
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
TESTS = ['resources/parsers/ball.glm-runtime-resource.test.ts', 'resources/misc-guards.kimi-r1.test.ts']
SOURCES = ['resources/parsers/ball.ts', 'resources/parsers/rgm.ts', '__tests__/parser-diagnostics.ts']
sources = {name: (BASE / name).read_bytes() for name in SOURCES}
tests = {name: (BASE / name).read_bytes() for name in TESTS}
variants = {'control': None}
for parser in ('ball', 'rgm'):
    original = f'console.warn(`[{parser}] chunk ${{chunkIdx}} RLE decode fail, skip:`, err)'
    variants[parser + '-missing'] = ('resources/parsers/' + parser + '.ts', [(original, '')])
    variants[parser + '-wrong-id'] = ('resources/parsers/' + parser + '.ts', [('${chunkIdx}', '${chunkIdx + 1}')])
    variants[parser + '-extra'] = ('resources/parsers/' + parser + '.ts', [(original, original + "\n    console.warn('unexpected parser output')")])
variants['error-propagation'] = ('__tests__/parser-diagnostics.ts', [('if (!outcome.ok) throw outcome.error', "if (!outcome.ok) throw new Error('wrapped parser error')")])
variants['restore-on-throw'] = ('__tests__/parser-diagnostics.ts', [
    ('const previous = globalThis.console', 'let actionFailed = false\n  const previous = globalThis.console'),
    ('} catch (error) {', '} catch (error) {\n    actionFailed = true'),
    ('globalThis.console = previous', 'if (!actionFailed) globalThis.console = previous'),
])
variants['transfer-bare-height'] = ('resources/parsers/ball.ts', [('height: frame.height,', 'height: chunkIdx === 1 ? frame.height + 1 : frame.height,')])


def sha(data):
    return hashlib.sha256(data).hexdigest()


expected = {
    'ball': '零尺寸帧',
    'rgm': 'decodeRgmPortrait：0 宽 / 0 高帧返回 null（不写 PNG）',
    'error-propagation': 'parseItems：截断精确拒绝',
    'restore-on-throw': 'parseItems：截断精确拒绝',
}
runs = []
with tempfile.TemporaryDirectory(prefix='type-pal-c1-counter-') as directory:
    for name, variant in variants.items():
        stem = 'pre94-c1-' + PHASE + '-' + name
        module = BASE / Path(variant[0]).parent / (stem + '.ts') if variant else None
        copies = []
        command = ['pnpm', '--filter', '@type-pal/pal-extract', 'exec', 'vitest', 'run']
        report = Path(directory) / (name + '.json')
        try:
            if variant:
                text = sources[variant[0]].decode()
                for old, new in variant[1]:
                    assert text.count(old) == 1, (name, old)
                    text = text.replace(old, new)
                module.write_text(text)
            for test, data in tests.items():
                path = BASE / Path(test).parent / (stem + '-' + Path(test).name)
                if variant:
                    basename = Path(variant[0]).stem
                    for suffix in ('.js', '.ts'):
                        data = data.replace((basename + suffix + "'").encode(), (stem + suffix + "'").encode())
                path.write_bytes(data)
                copies.append(path)
                command.append('src/' + str(path.relative_to(BASE)))
            command += ['--maxWorkers=1', '--reporter=default', '--reporter=json', '--silent=false', '--outputFile.json=' + str(report)]
            result = subprocess.run(command, cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
            raw, native = result.stdout, report.read_bytes()
            parsed = json.loads(native)
            cases = [{'file': Path(s['name']).name.removeprefix(stem + '-'), 'fullName': c['fullName'], 'status': c['status'], 'messages': c['failureMessages']} for s in parsed['testResults'] for c in s['assertionResults']]
            row = {'name': name, 'command': command, 'cwd': str(ROOT), 'exit': result.returncode, 'signal': -result.returncode if result.returncode < 0 else None, 'passed': parsed['numPassedTests'], 'failed': parsed['numFailedTests'], 'pending': parsed['numPendingTests'], 'cases': cases, 'moduleSha256': sha(module.read_bytes()) if module else None, 'testCopySha256': {str(p.relative_to(ROOT)): sha(p.read_bytes()) for p in copies}, 'rawSha256': sha(raw), 'runnerSha256': sha(native), 'stderrBlocks': raw.count(b'stderr |')}
            (OUT / (PHASE + '-' + name + '.raw.gz')).write_bytes(gzip.compress(raw, mtime=0))
            (OUT / (PHASE + '-' + name + '.runner.json.gz')).write_bytes(gzip.compress(native, mtime=0))
            runs.append(row)
            print(json.dumps({k: row[k] for k in ('name', 'exit', 'passed', 'failed', 'pending', 'stderrBlocks')}), flush=True)
        finally:
            if module:
                module.unlink(missing_ok=True)
            for path in copies:
                path.unlink(missing_ok=True)
proof = {'phase': PHASE, 'baseCommit': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(), 'sourceSha256': {p: sha(b) for p, b in sources.items()}, 'testSha256': {p: sha(b) for p, b in tests.items()}, 'variants': variants, 'runs': runs, 'sourceUnchanged': all((BASE / p).read_bytes() == b for p, b in sources.items()), 'testUnchanged': all((BASE / p).read_bytes() == b for p, b in tests.items()), 'copiesRemoved': not list(BASE.rglob('pre94-c1-*'))}
(OUT / (PHASE + '-proof.json')).write_text(json.dumps(proof, ensure_ascii=False, indent=2) + '\n')
assert all(proof[k] for k in ('sourceUnchanged', 'testUnchanged', 'copiesRemoved'))
count = 21 if PHASE == 'before' else 20
identities = {(c['file'], c['fullName']) for c in runs[0]['cases']}
assert len(identities) == count
for run in runs:
    assert {(c['file'], c['fullName']) for c in run['cases']} == identities
    failures = [c for c in run['cases'] if c['status'] == 'failed']
    red = PHASE == 'after' and run['name'] != 'control'
    failed = (2 if PHASE == 'before' else 1) if run['name'].startswith('transfer-') else int(red)
    assert run['failed'] == len(failures) == failed and run['passed'] == count - failed
    assert run['exit'] == int(failed > 0) and run['pending'] == 0
    assert all('AssertionError:' in ''.join(c['messages']) for c in failures)
    if red and not run['name'].startswith('transfer-'):
        needle = expected[run['name']] if run['name'] in expected else expected[run['name'].split('-')[0]]
        assert needle in failures[0]['fullName']
    if PHASE == 'after':
        assert run['stderrBlocks'] == 0
