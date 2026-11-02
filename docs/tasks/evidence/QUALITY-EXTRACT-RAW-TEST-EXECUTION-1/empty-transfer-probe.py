# -*- coding: utf-8 -*-
"""Replay the retired zero-index empty input through the retained parameterized contract."""
import gzip
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[3]
PARSERS = ROOT / 'packages/pal-extract/src/resources/parsers'
wrapper = "import {parseFirSprite as real} from './fire.js'; export function parseFirSprite(index:number,buf:Uint8Array) { const result=real(index,buf); return buf.length===0?{...result,frameCount:1}:result; }"
rows = []
with tempfile.TemporaryDirectory(prefix='type-pal-empty-transfer-final-') as directory:
    for phase in ('before', 'after'):
        stem = 'pre94-raw-empty-transfer-' + phase
        module = PARSERS / (stem + '.ts')
        copies = []
        try:
            module.write_text(wrapper)
            for name in ('data-misc.test.ts', 'misc-mkf.test.ts'):
                source = gzip.decompress((OUT / (name + '.before.gz')).read_bytes()) if phase == 'before' else (PARSERS / '__tests__' / name).read_bytes()
                path = PARSERS / '__tests__' / (stem + '-' + name)
                path.write_bytes(source.replace(b"'../fire.js'", ("'../" + stem + ".js'").encode()))
                copies.append(path)
            source = gzip.decompress((OUT / 'fire.glm-runtime-resource.test.ts.before.gz').read_bytes()) if phase == 'before' else (PARSERS / 'fire.glm-runtime-resource.test.ts').read_bytes()
            path = PARSERS / (stem + '-fire.glm-runtime-resource.test.ts')
            path.write_bytes(source.replace(b"'./fire.js'", ("'./" + stem + ".js'").encode()))
            copies.append(path)
            report = Path(directory) / (phase + '.json')
            command = ['pnpm', '--filter', '@type-pal/pal-extract', 'exec', 'vitest', 'run', *[str(p.relative_to(ROOT / 'packages/pal-extract')) for p in copies], '--maxWorkers=1', '--reporter=default', '--reporter=json', '--silent=false', '--outputFile.json=' + str(report)]
            result = subprocess.run(command, cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
            data = report.read_bytes()
            parsed = json.loads(data)
            failures = [{'file': Path(s['name']).name.removeprefix(stem + '-'), 'fullName': c['fullName'], 'messages': c['failureMessages']} for s in parsed['testResults'] for c in s['assertionResults'] if c['status'] == 'failed']
            row = {'phase': phase, 'command': command, 'cwd': str(ROOT), 'exit': result.returncode, 'passed': parsed['numPassedTests'], 'failed': parsed['numFailedTests'], 'pending': parsed['numPendingTests'], 'failures': failures, 'rawSha256': hashlib.sha256(result.stdout).hexdigest(), 'runnerSha256': hashlib.sha256(data).hexdigest(), 'wrapperSha256': hashlib.sha256(module.read_bytes()).hexdigest(), 'copySha256': {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest() for p in copies}}
            (OUT / ('empty-transfer-' + phase + '.raw.gz')).write_bytes(gzip.compress(result.stdout, mtime=0))
            (OUT / ('empty-transfer-' + phase + '.runner.json.gz')).write_bytes(gzip.compress(data, mtime=0))
            rows.append(row)
            assert result.returncode == 1 and len(failures) == (2 if phase == 'before' else 1)
            assert all('AssertionError:' in ''.join(c['messages']) for c in failures) and parsed['numPendingTests'] == 0
        finally:
            module.unlink(missing_ok=True)
            for path in copies:
                path.unlink(missing_ok=True)
assert not list(PARSERS.rglob('pre94-raw-empty-transfer-*'))
(OUT / 'empty-transfer.json').write_text(json.dumps({'rows': rows, 'temporaryCopiesRemoved': True, 'kind': 'multi-red oracle transfer, not single-failure credit', 'retainedEmptyIndexInputs': [0, 7]}, ensure_ascii=False, indent=2) + '\n')
print('empty-output counter: old 2 AssertionErrors -> retained [0,7] contract 1 AssertionError')
