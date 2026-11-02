"""Exercise actual panel listeners across consecutive cases; no production mutation."""
import gzip
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[4]
SOURCE = ROOT / 'packages/game/src/tools'
PHASE = sys.argv[1]
assert PHASE in ('before', 'after')
assert PHASE == 'after' or not (OUT / f'{PHASE}-proof.json').exists()
FILES = ['tools-panel.test.ts', 'tools-panel.glm-phase1-leaves.test.ts']
original = {name: (SOURCE / name).read_bytes() for name in FILES}
production = (SOURCE / 'tools-panel.ts').read_bytes()
probe = """
  describe('window listener ownership probe', () => {
    const previousState = createProbeGameState({ x: 0, y: 0, facing: 'down' })
    const previousGetGs = vi.fn(() => previousState)
    it('installs a panel owned by the preceding case', () => {
      setupToolsPanel(mkDeps({ getGs: previousGetGs }))
    })
    it('next-case Backquote never reads the preceding panel state', () => {
      previousGetGs.mockClear()
      setupToolsPanel(mkDeps())
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Backquote' }))
      expect(previousGetGs).not.toHaveBeenCalled()
    })
  })
"""

def sha(data):
    return hashlib.sha256(data).hexdigest()

proof = {'phase': PHASE, 'base': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(),
         'formalSha256': {name: sha(data) for name, data in original.items()},
         'productionSha256': sha(production),
         'testHostSha256': sha((SOURCE / 'tools-panel.test-fixtures.ts').read_bytes()) if PHASE == 'after' else None,
         'runs': []}
try:
    for variant in ['control', 'consecutive-cases']:
        stem = f'pre94-panel58-{PHASE}-{variant}-'
        copies = {}
        for name, data in original.items():
            if variant == 'consecutive-cases' and name == FILES[0]:
                source = data.decode()
                end = source.rfind('\n})')
                assert end != -1
                source = "import { createInitialGameState as createProbeGameState } from '../core/game-state.js'\n" + source[:end] + probe + source[end:]
                data = source.encode()
            copies[SOURCE / (stem + name)] = data
        assert not any(path.exists() for path in copies)
        try:
            for path, data in copies.items():
                path.write_bytes(data)
            with tempfile.TemporaryDirectory(prefix='type-pal-panel58-') as tmp:
                report = Path(tmp) / 'runner.json'
                command = ['pnpm', '--filter', '@type-pal/game', 'exec', 'vitest', 'run',
                           *[str(path.relative_to(ROOT / 'packages/game')) for path in copies],
                           '--maxWorkers=1', '--silent=false', '--reporter=default', '--reporter=json',
                           '--outputFile.json=' + str(report)]
                proc = subprocess.run(command, cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
                raw = proc.stdout
                runner = report.read_bytes()
                data = json.loads(runner)
            (OUT / f'{PHASE}-{variant}.raw.gz').write_bytes(gzip.compress(raw, mtime=0))
            (OUT / f'{PHASE}-{variant}.runner.json.gz').write_bytes(gzip.compress(runner, mtime=0))
            cases = [{'file': Path(suite['name']).name.removeprefix(stem), 'fullName': case['fullName'],
                      'status': case['status'], 'failureMessages': case['failureMessages']}
                     for suite in data['testResults'] for case in suite['assertionResults']]
            expected = int(PHASE == 'before' and variant == 'consecutive-cases')
            row = {'variant': variant, 'command': command, 'cwd': str(ROOT), 'exit': proc.returncode,
                   'signal': -proc.returncode if proc.returncode < 0 else None, 'spawnError': None,
                   'rawSha256': sha(raw), 'runnerSha256': sha(runner),
                   'copiesSha256': {str(path.relative_to(ROOT)): sha(value) for path, value in copies.items()},
                   'passed': data['numPassedTests'], 'failed': data['numFailedTests'],
                   'pending': data['numPendingTests'], 'cases': cases}
            proof['runs'].append(row)
            (OUT / f'{PHASE}-proof.json').write_text(json.dumps(proof, ensure_ascii=False, indent=2) + '\n')
            assert len(cases) == (18 if PHASE == 'before' else 19) + 2 * (variant == 'consecutive-cases') and len(data['testResults']) == 2
            assert data['numFailedTests'] == expected and data['numPendingTests'] == 0
            assert proc.returncode == expected and b'stderr |' not in raw and b'Unhandled' not in raw
            failed = [case for case in cases if case['status'] == 'failed']
            if expected:
                assert len(failed) == 1 and 'next-case Backquote' in failed[0]['fullName']
                assert failed[0]['failureMessages'][0].startswith('AssertionError:')
            print(PHASE, variant, row['passed'], row['failed'], flush=True)
        finally:
            for path in copies:
                path.unlink(missing_ok=True)
finally:
    proof['formalSourcesUnchanged'] = all((SOURCE / name).read_bytes() == data for name, data in original.items())
    proof['productionUnchanged'] = (SOURCE / 'tools-panel.ts').read_bytes() == production
    proof['temporaryCopiesRemoved'] = not list(SOURCE.glob('pre94-panel58-*'))
    (OUT / f'{PHASE}-proof.json').write_text(json.dumps(proof, ensure_ascii=False, indent=2) + '\n')
    assert proof['formalSourcesUnchanged'] and proof['productionUnchanged'] and proof['temporaryCopiesRemoved']
