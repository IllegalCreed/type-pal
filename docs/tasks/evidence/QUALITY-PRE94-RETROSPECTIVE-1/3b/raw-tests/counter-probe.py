# -*- coding: utf-8 -*-
"""Complete raw/boundary suites with isolated raw-cohort counterfactuals."""
import gzip
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[5]
BASE = ROOT / 'packages/pal-extract/src/io'
PHASE = sys.argv[1]
assert PHASE in ('before', 'after')
tests = {name: (BASE / name).read_bytes() for name in ['sss.boundaries.test.ts', 'msg.boundaries.test.ts', 'sss.test.ts', 'msg.test.ts']}
sources = {name: (BASE / name).read_bytes() for name in ['sss.ts', 'msg.ts']}
variants = {
    'control': None,
    'later-eo-state': ('sss.ts', 'state: readI16(view, base + 12),', 'state: i > 1 ? 0 : readI16(view, base + 12),'),
    'bytecode-tail': ('sss.ts', 'bytecode: chunk4,', 'bytecode: chunk4.byteLength > 24 ? chunk4.subarray(0, chunk4.byteLength - 8) : chunk4,'),
    'message-first': ('msg.ts', '  return out', "  if (msg.byteLength > 1024) out[0] = 'wrong first message'\n  return out"),
    'message-middle': ('msg.ts', '  return out', "  if (msg.byteLength > 1024) out[Math.ceil(out.length / 2)] = 'wrong middle message'\n  return out"),
    'message-last': ('msg.ts', '  return out', "  if (msg.byteLength > 1024) out[out.length - 1] = 'wrong last message'\n  return out"),
    'transfer-bytecode-empty': ('sss.ts', 'bytecode: chunk4,', 'bytecode: chunk4.byteLength > 24 ? new Uint8Array() : chunk4,'),
    'transfer-known-role': ('msg.ts', '  return out', "  return msg.byteLength > 1024 ? out.map(s => s.replaceAll('逍遥', '无名')) : out"),
}


def sha(data):
    return hashlib.sha256(data).hexdigest()


runs = []
with tempfile.TemporaryDirectory(prefix='type-pal-3b-raw-report-') as directory:
    for name, variant in variants.items():
        stem = 'pre94-3b-raw-' + PHASE + '-' + name
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
proof = {'phase': PHASE, 'baseCommit': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(), 'sourceSha256': {p: sha(b) for p, b in sources.items()}, 'testSha256': {p: sha(b) for p, b in tests.items()}, 'variants': variants, 'runs': runs, 'sourcesUnchanged': all((BASE / p).read_bytes() == b for p, b in sources.items()), 'testsUnchanged': all((BASE / p).read_bytes() == b for p, b in tests.items()), 'copiesRemoved': not list(BASE.glob('pre94-3b-raw-*'))}
(OUT / (PHASE + '-proof.json')).write_text(json.dumps(proof, ensure_ascii=False, indent=2) + '\n')
for test, data in tests.items():
    (OUT / (PHASE + '-' + test + '.gz')).write_bytes(gzip.compress(data, mtime=0))
assert all(proof[k] for k in ['sourcesUnchanged', 'testsUnchanged', 'copiesRemoved'])
count = 20 if PHASE == 'before' else 13
identities = {(c['file'], c['fullName']) for c in runs[0]['cases']}
assert len(identities) == count
for run in runs:
    red = run['name'] != 'control' and (PHASE == 'after' or run['name'].startswith('transfer-'))
    failures = [c for c in run['cases'] if c['status'] == 'failed']
    assert {(c['file'], c['fullName']) for c in run['cases']} == identities
    assert run['passed'] == count - int(red) and run['failed'] == len(failures) == int(red)
    assert run['exit'] == int(red) and run['pending'] == 0 and run['stderrBlocks'] == 0
    assert all('AssertionError:' in ''.join(c['messages']) for c in failures)
    if red:
        is_sss = run['name'] in ['later-eo-state', 'bytecode-tail', 'transfer-bytecode-empty']
        expected_file = 'sss.test.ts' if is_sss else 'msg.test.ts'
        assert failures[0]['file'] == expected_file
        if PHASE == 'before':
            assert ('字节码 chunk 非空' if is_sss else '包含已知主角名') in failures[0]['fullName']
        else:
            assert ('全原盘结构' if is_sss else '原盘固定文本') in failures[0]['fullName']
