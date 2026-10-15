"""Read-only native identity and real-source V8 collection for this four-file slice."""
import gzip
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile
import time

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[4]
SRC = ROOT / 'packages/game/src'
TESTS = ['assets/png.test.ts', 'assets/png-decode.grok-r1.test.ts', 'assets/png.glm-phase1-leaves.test.ts', 'present/__tests__/grok-present/p10-indexed-png.test.ts']


def sha(data):
    return hashlib.sha256(data).hexdigest()


def save(name, data):
    (OUT / (name + '.gz')).write_bytes(gzip.compress(data, mtime=0))
    return sha(data)


assert not (OUT / 'collection.json').exists()
frozen = {p: (ROOT / p).read_bytes() for p in ['scripts/coverage/approved-test-retirements.mjs', 'scripts/coverage/approved-test-retirements.test.mjs', 'packages/game/src/assets/png.ts', *['packages/game/src/' + p for p in TESTS]]}
proof = {'runs': [], 'snapshots': {}, 'identities': {}, 'coverage': {}}
old = {p: gzip.decompress((OUT / ('before-' + Path(p).name + '.gz')).read_bytes()) for p in TESTS}
for ref in ['origin/main', 'd4cf7f57d', '46fb9d5fe']:
    proof['snapshots'][ref] = {'commit': subprocess.check_output(['git', 'rev-parse', ref], cwd=ROOT, text=True).strip(), 'files': {}}
    for p in TESTS:
        data = subprocess.check_output(['git', 'show', ref + ':packages/game/src/' + p], cwd=ROOT)
        proof['snapshots'][ref]['files'][p] = {'sha256': sha(data), 'equalsBefore': data == old[p]}
        assert data == old[p]

try:
    for phase in ['before', 'after']:
        copies = {(SRC / p).parent / ('pre94-3h-list-before-' + Path(p).name): data for p, data in old.items()} if phase == 'before' else {}
        assert not any(p.exists() for p in copies)
        try:
            for p, data in copies.items():
                p.write_bytes(data)
            files = list(copies) if copies else [SRC / p for p in TESTS]
            mapping = {str(path): 'packages/game/src/' + p for path, p in zip(files, TESTS)}
            with tempfile.TemporaryDirectory(prefix='type-pal-3h-collection-') as temp:
                temp = Path(temp)
                native = temp / 'list.json'
                common = ['pnpm', '--filter', '@type-pal/game', 'exec', 'vitest']
                commands = [('list', [*common, 'list', *[str(p.relative_to(ROOT / 'packages/game')) for p in files], '--maxWorkers=1', '--json=' + str(native)]), ('v8', [*common, 'run', *[str(p.relative_to(ROOT / 'packages/game')) for p in files], '--maxWorkers=1', '--silent=false', '--coverage.enabled', '--coverage.provider=v8', '--coverage.include=src/assets/png.ts', '--coverage.reporter=json', '--coverage.reporter=json-summary', '--coverage.reportsDirectory=' + str(temp / 'coverage'), '--reporter=default', '--reporter=json', '--outputFile.json=' + str(temp / 'runner.json')])]
                for kind, command in commands:
                    start = time.monotonic()
                    run = subprocess.run(command, cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
                    row = {'phase': phase, 'kind': kind, 'command': command, 'cwd': str(ROOT), 'exit': run.returncode, 'signal': -run.returncode if run.returncode < 0 else None, 'spawnError': None, 'seconds': round(time.monotonic() - start, 3), 'rawSha256': save(phase + '-' + kind + '.raw', run.stdout), 'copiesSha256': {str(p.relative_to(ROOT)): sha(b) for p, b in copies.items()}, 'actWarnings': run.stdout.count(b'not wrapped in act'), 'environmentWarnings': run.stdout.count(b'not configured to support act'), 'stderrBlocks': run.stdout.count(b'stderr |')}
                    proof['runs'].append(row)
                    assert run.returncode == row['actWarnings'] == row['environmentWarnings'] == row['stderrBlocks'] == 0
                    if kind == 'list':
                        data = native.read_bytes()
                        row['nativeSha256'] = save(phase + '-list.json', data)
                        rows = json.loads(data)
                        assert all(e['file'] in mapping for e in rows)
                        for entry in rows:
                            entry['file'] = mapping[entry['file']]
                        script = "import {createHash} from 'node:crypto'; let input=''; for await(const chunk of process.stdin)input+=chunk; const rows=JSON.parse(input); const ids=rows.map(e=>e.file+' :: project '+(e.projectName||'root')+' :: '+e.name).sort((a,b)=>a.localeCompare(b)); if(new Set(ids).size!==ids.length)throw new Error('duplicate identity'); const files=[...new Set(rows.map(e=>e.file))].sort(); console.log(JSON.stringify({identities:ids,files:files.map(file=>{const own=ids.filter(id=>id.startsWith(file+' :: '));return {file,testCount:own.length,identityDigest:createHash('sha256').update(JSON.stringify(own)).digest('hex')}})}));"
                        proof['identities'][phase] = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', script], input=json.dumps(rows).encode(), cwd=ROOT))
                        assert len(rows) == (10 if phase == 'before' else 9)
                    else:
                        data = (temp / 'runner.json').read_bytes()
                        row['nativeSha256'] = save(phase + '-v8.runner.json', data)
                        native_run = json.loads(data)
                        assert native_run['numPassedTests'] == (10 if phase == 'before' else 9)
                        assert native_run['numFailedTests'] == native_run['numPendingTests'] == 0
                        for filename in ['coverage-final.json', 'coverage-summary.json']:
                            save(phase + '-' + filename, (temp / 'coverage' / filename).read_bytes())
                        summary = json.loads((temp / 'coverage/coverage-summary.json').read_bytes())
                        assert set(summary) == {'total', str(SRC / 'assets/png.ts')}
                        proof['coverage'][phase] = summary[str(SRC / 'assets/png.ts')]
                    print(json.dumps({k: v for k, v in row.items() if k not in ['command', 'cwd', 'copiesSha256']}), flush=True)
        finally:
            for p in copies:
                p.unlink(missing_ok=True)
    assert proof['coverage']['before'] == proof['coverage']['after']
finally:
    proof['formalSourcesUnchanged'] = all((ROOT / p).read_bytes() == b for p, b in frozen.items())
    proof['temporaryCopiesRemoved'] = not list(SRC.rglob('pre94-3h-*'))
    proof['formalSha256'] = {p: sha(b) for p, b in frozen.items()}
    (OUT / 'collection.json').write_text(json.dumps(proof, ensure_ascii=False, indent=2) + '\n')
    assert proof['formalSourcesUnchanged'] and proof['temporaryCopiesRemoved']
