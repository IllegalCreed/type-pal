"""Observe actual test fetch promises at global-restoration time; no product mutation."""
import gzip
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys
import tempfile

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[5]
SRC = ROOT / 'packages/game/src'
TESTS = ['shell/bootstrap-resources.test.ts', 'shell/bootstrap-resources.grok-mid-1.test.ts']
HELPER = '__tests__/grok-boot-mid-1/legal.ts'
HOOK = """
import { beforeEach } from 'vitest'
const pre94Stub = vi.stubGlobal.bind(vi)
const pre94Unstub = vi.unstubAllGlobals.bind(vi)
beforeEach(() => {
  vi.restoreAllMocks()
  const inflight = new Map<symbol, string>()
  vi.spyOn(vi, 'stubGlobal').mockImplementation((name, value) => {
    if (name !== 'fetch' || typeof value !== 'function') return pre94Stub(name, value)
    return pre94Stub(name, (...args: Parameters<typeof fetch>) => {
      const token = Symbol()
      inflight.set(token, String(args[0]))
      return Promise.resolve(Reflect.apply(value, globalThis, args)).finally(() => inflight.delete(token))
    })
  })
  vi.spyOn(vi, 'unstubAllGlobals').mockImplementation(() => {
    const result = pre94Unstub()
    console.log('PRE94_BOOT_IO ' + JSON.stringify({name: expect.getState().currentTestName, pending: [...inflight.values()]}))
    expect(inflight.size).toBe(0)
    return result
  })
})
"""


def sha(data):
    return hashlib.sha256(data).hexdigest()


failure_teardown = len(sys.argv) == 2 and sys.argv[1] == '--failure-teardown'
assert failure_teardown or not (OUT / 'io-observation.json').exists()
formal = {p: (SRC / p).read_bytes() for p in [*TESTS, HELPER, 'shell/bootstrap-resources.ts']}
proof = {'runs': [], 'formalSha256': {p: sha(b) for p, b in formal.items()}}
if failure_teardown:
    proof = json.loads((OUT / 'io-observation.json').read_bytes())
    assert len(proof['runs']) == 2 and proof['formalSha256'] == {p: sha(b) for p, b in formal.items()}
try:
    for phase in (['failed-after'] if failure_teardown else ['before', 'after']):
        stem = 'pre94-3h-boot-io-' + phase + '-'
        helper = gzip.decompress((OUT / 'before-legal.ts.gz').read_bytes()) if phase == 'before' else formal[HELPER]
        helper_path = (SRC / HELPER).with_name(stem + 'legal.ts')
        copies = {helper_path: helper}
        for p in TESTS:
            data = gzip.decompress((OUT / ('before-' + Path(p).name + '.gz')).read_bytes()) if phase == 'before' else formal[p]
            if phase == 'failed-after' and 'grok-mid-1' in p:
                before, marker, after = data.partition('  it(\'默认端口'.encode())
                assert marker and after.count(b'    expect(ready).toBe(false)') == 2
                after = after.replace(b'    expect(ready).toBe(false)', b'    expect(ready).toBe(false)\n    expect(false).toBe(true)')
                data = before + marker + after
            data = data.replace(b"'../__tests__/grok-boot-mid-1/legal.js'", ("'../__tests__/grok-boot-mid-1/" + stem + "legal.js'").encode())
            copies[(SRC / p).with_name(stem + Path(p).name)] = data + HOOK.encode()
        assert not any(p.exists() for p in copies)
        try:
            for p, b in copies.items():
                p.write_bytes(b)
            with tempfile.TemporaryDirectory(prefix='type-pal-boot-io-') as temp:
                native = Path(temp) / 'runner.json'
                command = ['pnpm', '--filter', '@type-pal/game', 'exec', 'vitest', 'run', *[str(p.relative_to(ROOT / 'packages/game')) for p in copies if '.test.ts' in p.name], '--maxWorkers=1', '--silent=false', '--reporter=default', '--reporter=json', '--outputFile.json=' + str(native)]
                run = subprocess.run(command, cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
                raw = run.stdout
                result = native.read_bytes()
                for kind, data in [('raw', raw), ('runner.json', result)]:
                    (OUT / (phase + '-io.' + kind + '.gz')).write_bytes(gzip.compress(data, mtime=0))
                data = json.loads(result)
                observations = [json.loads(line.split('PRE94_BOOT_IO ', 1)[1]) for line in re.sub(r'\x1b\[[0-9;]*m', '', raw.decode()).splitlines() if line.startswith('PRE94_BOOT_IO ')]
                cases = [{'file': Path(s['name']).name.removeprefix(stem), 'fullName': c['fullName'], 'status': c['status'], 'messages': c['failureMessages']} for s in data['testResults'] for c in s['assertionResults']]
                row = {'phase': phase, 'command': command, 'cwd': str(ROOT), 'exit': run.returncode, 'signal': -run.returncode if run.returncode < 0 else None, 'spawnError': None, 'passed': data['numPassedTests'], 'failed': data['numFailedTests'], 'pending': data['numPendingTests'], 'observations': observations, 'cases': cases, 'copiesSha256': {str(p.relative_to(ROOT)): sha(b) for p, b in copies.items()}, 'rawSha256': sha(raw), 'runnerSha256': sha(result), 'stderrBlocks': raw.count(b'stderr |')}
                proof['runs'].append(row)
                (OUT / 'io-observation.json').write_text(json.dumps(proof, ensure_ascii=False, indent=2) + '\n')
                assert len(data['testResults']) == 2 and len(observations) == 9 and row['pending'] == row['stderrBlocks'] == 0
                held = [o for o in observations if o['pending']]
                if phase == 'before':
                    assert row['exit'] == 1 and (row['passed'], row['failed']) == (11, 2)
                    assert len(held) == 2 and all(len(o['pending']) == 4 and '默认' in o['name'] for o in held)
                elif phase == 'after':
                    assert row['exit'] == 0 and (row['passed'], row['failed']) == (12, 0) and not held
                else:
                    assert row['exit'] == 1 and (row['passed'], row['failed']) == (10, 2) and not held
                print(json.dumps({k: v for k, v in row.items() if k not in ['command', 'cwd', 'copiesSha256', 'cases', 'observations']}, ensure_ascii=False), flush=True)
        finally:
            for p in copies:
                p.unlink(missing_ok=True)
finally:
    proof['formalSourcesUnchanged'] = all((SRC / p).read_bytes() == b for p, b in formal.items())
    proof['temporaryCopiesRemoved'] = not list(SRC.rglob('pre94-3h-*'))
    (OUT / 'io-observation.json').write_text(json.dumps(proof, ensure_ascii=False, indent=2) + '\n')
    assert proof['formalSourcesUnchanged'] and proof['temporaryCopiesRemoved']
