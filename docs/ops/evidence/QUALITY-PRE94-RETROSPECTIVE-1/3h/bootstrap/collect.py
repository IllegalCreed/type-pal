"""Read-only native identity and real-source V8 collection for this two-test bootstrap slice."""
import gzip
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile
import time

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[5]
SRC = ROOT / 'packages/game/src'
TESTS = ['shell/bootstrap-resources.test.ts', 'shell/bootstrap-resources.grok-mid-1.test.ts']


def sha(data):
    return hashlib.sha256(data).hexdigest()


def save(name, data):
    (OUT / (name + '.gz')).write_bytes(gzip.compress(data, mtime=0))
    return sha(data)


assert not (OUT / 'collection.json').exists()
frozen = {p: (ROOT / p).read_bytes() for p in ['scripts/coverage/approved-test-retirements.mjs', 'scripts/coverage/approved-test-retirements.test.mjs', 'packages/game/src/shell/bootstrap-resources.ts', *['packages/game/src/' + p for p in TESTS]]}
proof = {'runs': [], 'snapshots': {}, 'identities': {}, 'coverage': {}}
old = {p: gzip.decompress((OUT / ('before-' + Path(p).name + '.gz')).read_bytes()) for p in TESTS}
for ref in ['origin/main', 'd4cf7f57d', 'f2529c5fa']:
    proof['snapshots'][ref] = {'commit': subprocess.check_output(['git', 'rev-parse', ref], cwd=ROOT, text=True).strip(), 'files': {}}
    for p in TESTS:
        data = subprocess.check_output(['git', 'show', ref + ':packages/game/src/' + p], cwd=ROOT)
        proof['snapshots'][ref]['files'][p] = {'sha256': sha(data), 'equalsBefore': data == old[p]}
        if ref == 'd4cf7f57d' and p == 'shell/bootstrap-resources.test.ts':
            assert sha(data) == '537a5f44f4ea0f2ad73a48aec5889db407a97ad9845f15dab353251e7cc1eb34'
        else:
            assert data == old[p]

try:
    for phase in ['legacy-3y', 'before', 'after']:
        selected = {p: subprocess.check_output(['git', 'show', 'd4cf7f57d:packages/game/src/' + p], cwd=ROOT) for p in TESTS} if phase == 'legacy-3y' else old
        prefix = 'pre94-3h-list-' + phase + '-'
        copies = {(SRC / p).parent / (prefix + Path(p).name): data for p, data in selected.items()} if phase != 'after' else {}
        if phase != 'after':
            helper = SRC / ('__tests__/grok-boot-mid-1/' + prefix + 'legal.ts')
            for path in list(copies):
                copies[path] = copies[path].replace(b"'../__tests__/grok-boot-mid-1/legal.js'", ("'../__tests__/grok-boot-mid-1/" + prefix + "legal.js'").encode())
            copies[helper] = subprocess.check_output(['git', 'show', 'd4cf7f57d:packages/game/src/__tests__/grok-boot-mid-1/legal.ts'], cwd=ROOT) if phase == 'legacy-3y' else gzip.decompress((OUT / 'before-legal.ts.gz').read_bytes())
        assert not any(p.exists() for p in copies)
        try:
            for p, data in copies.items():
                p.write_bytes(data)
            files = [p for p in copies if '.test.ts' in p.name] if copies else [SRC / p for p in TESTS]
            mapping = {str(path): 'packages/game/src/' + p for path, p in zip(files, TESTS)}
            with tempfile.TemporaryDirectory(prefix='type-pal-3h-collection-') as temp:
                temp = Path(temp)
                native = temp / 'list.json'
                common = ['pnpm', '--filter', '@type-pal/game', 'exec', 'vitest']
                commands = [('list', [*common, 'list', *[str(p.relative_to(ROOT / 'packages/game')) for p in files], '--maxWorkers=1', '--json=' + str(native)]), ('v8', [*common, 'run', *[str(p.relative_to(ROOT / 'packages/game')) for p in files], '--maxWorkers=1', '--silent=false', '--coverage.enabled', '--coverage.provider=v8', '--coverage.include=src/shell/bootstrap-resources.ts', '--coverage.reporter=json', '--coverage.reporter=json-summary', '--coverage.reportsDirectory=' + str(temp / 'coverage'), '--reporter=default', '--reporter=json', '--outputFile.json=' + str(temp / 'runner.json')])]
                if phase == 'legacy-3y':
                    commands = commands[:1]
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
                        assert len(rows) == (13 if phase == 'before' else 12)
                    else:
                        data = (temp / 'runner.json').read_bytes()
                        row['nativeSha256'] = save(phase + '-v8.runner.json', data)
                        native_run = json.loads(data)
                        assert native_run['numPassedTests'] == (13 if phase == 'before' else 12)
                        assert native_run['numFailedTests'] == native_run['numPendingTests'] == 0
                        for filename in ['coverage-final.json', 'coverage-summary.json']:
                            save(phase + '-' + filename, (temp / 'coverage' / filename).read_bytes())
                        summary = json.loads((temp / 'coverage/coverage-summary.json').read_bytes())
                        assert set(summary) == {'total', str(SRC / 'shell/bootstrap-resources.ts')}
                        proof['coverage'][phase] = summary[str(SRC / 'shell/bootstrap-resources.ts')]
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
