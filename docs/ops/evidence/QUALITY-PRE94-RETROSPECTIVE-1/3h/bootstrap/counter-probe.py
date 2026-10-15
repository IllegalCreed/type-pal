"""Bootstrap barrier family against isolated product copies; no product edits."""
import gzip
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import time

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[5]
SRC = ROOT / 'packages/game/src'
ASSETS = SRC / 'shell'
PHASE = sys.argv[1]
assert PHASE in ['before', 'after']
assert not (OUT / (PHASE + '-proof.json')).exists()
TESTS = ['shell/bootstrap-resources.test.ts', 'shell/bootstrap-resources.grok-mid-1.test.ts']
originals = {p: (SRC / p).read_bytes() for p in ['shell/bootstrap-resources.ts', *TESTS]}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def reported_errors(raw, data, stem):
    lines = [line.strip() for line in re.sub(r'\x1b\[[0-9;]*m', '', raw.decode()).splitlines()]
    out = []
    for suite in data['testResults']:
        for case in suite['assertionResults']:
            if case['status'] != 'failed':
                continue
            header = 'FAIL  ' + str(Path(suite['name']).relative_to(ROOT / 'packages/game')) + ' > ' + ' > '.join([*case['ancestorTitles'], case['title']])
            assert lines.count(header) == 1
            error_line = next(line for line in lines[lines.index(header) + 1:] if line)
            match = re.match(r'^([A-Za-z_][A-Za-z0-9_.]*):', error_line)
            assert match is not None
            out.append({'file': Path(suite['name']).name.removeprefix(stem + '-'), 'fullName': case['fullName'], 'errorName': match[1]})
    return out


variants = {'control': [], 'soundfont-error-cloned': [['? ports.fetchSoundfont()', '? ports.fetchSoundfont().catch((error: unknown) => { throw new Error(error instanceof Error ? error.message : String(error)) })']], 'glyph-shortcut': [["  const resourcesReady = Promise.all([\n    ports.loadAssets(sceneId),\n    ports.loadGlyphs().catch((error: unknown) => {\n      ports.warn('[bootstrap] loadGlyphs failed, text will render as tofu:', error)\n      return undefined\n    }),\n    ports.loadDialogAssets(),\n  ])", "  const assets = ports.loadAssets(sceneId)\n  const glyphs = ports.loadGlyphs().catch((error: unknown) => {\n      ports.warn('[bootstrap] loadGlyphs failed, text will render as tofu:', error)\n      return undefined\n    })\n  const dialog = ports.loadDialogAssets()\n  const resourcesReady = Promise.all([\n    assets,\n    Promise.race([glyphs, Promise.all([assets, dialog]).then(() => undefined)]),\n    dialog,\n  ])"]], 'transfer-glyph-warning': [["      ports.warn('[bootstrap] loadGlyphs failed, text will render as tofu:', error)\n", '']], 'transfer-glyph-fallback': [['      return undefined\n', '      return { has: () => false, get: () => undefined }\n']]}
proof = {'phase': PHASE, 'base': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(), 'formalSha256': {p: sha(b) for p, b in originals.items()}, 'variants': variants, 'runs': []}
for p, b in originals.items():
    (OUT / (PHASE + '-' + Path(p).name + '.gz')).write_bytes(gzip.compress(b, mtime=0))
try:
    for name, replacements in variants.items():
        if any(row['name'] == name for row in proof['runs']):
            continue
        stem = 'pre94-3h-boot-' + PHASE + '-' + name
        source = originals['shell/bootstrap-resources.ts'].decode()
        for old, new in replacements:
            assert source.count(old) == 1
            source = source.replace(old, new)
        copies = {ASSETS / (stem + '-bootstrap-resources.ts'): source.encode()}
        for p in TESTS:
            data = originals[p]
            old = b"'./bootstrap-resources.js'"
            new = ("'./" + stem + "-bootstrap-resources.js'").encode()
            assert data.count(old) == 1
            copies[(SRC / p).parent / (stem + '-' + Path(p).name)] = data.replace(old, new)
        assert not any(p.exists() for p in copies)
        try:
            for p, b in copies.items():
                p.write_bytes(b)
            with tempfile.TemporaryDirectory(prefix='type-pal-pre94-3h-') as temp:
                native = Path(temp) / 'runner.json'
                command = ['pnpm', '--filter', '@type-pal/game', 'exec', 'vitest', 'run', *[str(p.relative_to(ROOT / 'packages/game')) for p in copies if '.test.ts' in p.name], '--maxWorkers=1', '--silent=false', '--reporter=default', '--reporter=json', '--outputFile.json=' + str(native)]
                start = time.monotonic()
                p = subprocess.run(command, cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
                raw = p.stdout
                native_bytes = native.read_bytes()
                (OUT / (PHASE + '-' + name + '.raw.gz')).write_bytes(gzip.compress(raw, mtime=0))
                (OUT / (PHASE + '-' + name + '.runner.json.gz')).write_bytes(gzip.compress(native_bytes, mtime=0))
                data = json.loads(native_bytes)
                cases = [{'file': Path(s['name']).name.removeprefix(stem + '-'), 'fullName': c['fullName'], 'status': c['status'], 'messages': c['failureMessages']} for s in data['testResults'] for c in s['assertionResults']]
                run = {'name': name, 'command': command, 'cwd': str(ROOT), 'exit': p.returncode, 'signal': -p.returncode if p.returncode < 0 else None, 'spawnError': None, 'seconds': round(time.monotonic() - start, 3), 'moduleSha256': sha(source.encode()), 'copiesSha256': {str(p.relative_to(ROOT)): sha(b) for p, b in copies.items()}, 'rawSha256': sha(raw), 'runnerSha256': sha(native_bytes), 'passed': data['numPassedTests'], 'failed': data['numFailedTests'], 'pending': data['numPendingTests'], 'actWarnings': raw.count(b'not wrapped in act'), 'environmentWarnings': raw.count(b'not configured to support act'), 'stderrBlocks': raw.count(b'stderr |'), 'cases': cases, 'reportedErrors': reported_errors(raw, data, stem)}
                proof['runs'].append(run)
                (OUT / (PHASE + '-proof.json')).write_text(json.dumps(proof, ensure_ascii=False, indent=2) + '\n')
                failures = [c for c in cases if c['status'] == 'failed']
                count = 13 if PHASE == 'before' else 12
                expected = 0 if name == 'control' or (PHASE == 'before' and name in ['soundfont-error-cloned', 'glyph-shortcut']) else 2 if PHASE == 'before' else 1
                assert run['exit'] == int(bool(expected)) and run['failed'] == len(failures) == expected and run['pending'] == 0
                assert len(data['testResults']) == 2 and len(cases) == run['passed'] + run['failed'] == count
                assert run['actWarnings'] == run['environmentWarnings'] == run['stderrBlocks'] == 0
                assert len(run['reportedErrors']) == len(failures) and all(e['errorName'] == 'AssertionError' for e in run['reportedErrors'])
                if PHASE == 'after' and name in ['soundfont-error-cloned', 'glyph-shortcut']:
                    target = 'keeps the original soundfont rejection' if name == 'soundfont-error-cloned' else 'soundfont 先 settle'
                    assert len(failures) == 1 and target in failures[0]['fullName']
                print(json.dumps({k: v for k, v in run.items() if k not in ['command', 'cwd', 'copiesSha256', 'cases']}, ensure_ascii=False), flush=True)
        finally:
            for path in copies:
                path.unlink(missing_ok=True)
finally:
    proof['formalSourcesUnchanged'] = all((SRC / p).read_bytes() == b for p, b in originals.items())
    proof['temporaryCopiesRemoved'] = not list(SRC.rglob('pre94-3h-*'))
    (OUT / (PHASE + '-proof.json')).write_text(json.dumps(proof, ensure_ascii=False, indent=2) + '\n')
    assert proof['formalSourcesUnchanged'] and proof['temporaryCopiesRemoved']
