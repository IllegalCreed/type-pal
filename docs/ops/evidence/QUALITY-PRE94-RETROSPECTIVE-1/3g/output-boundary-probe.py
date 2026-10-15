"""Run unchanged CLI copies against only this probe's temporary directories."""
import gzip
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import time

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[4]
PACKAGE = ROOT / 'packages/pal-extract'
NODE = subprocess.check_output(['node', '-p', 'process.execPath'], text=True).strip()
CLI = PACKAGE / 'src/cli.ts'


def sha(data):
    return hashlib.sha256(data).hexdigest()


source = CLI.read_bytes()
result = {'base': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(), 'sourceSha256': sha(source), 'node': subprocess.check_output([NODE, '--version'], text=True).strip(), 'boundary': 'No real raw/extracted input, output or product source is changed. Every sentinel and link target is under this process-owned TemporaryDirectory.', 'runs': []}
for name in ['canonical-output', 'output-root-link', 'data-parent-link', 'child-entry-link']:
    temp_path = None
    with tempfile.TemporaryDirectory(prefix='type-pal-pre94-3g-output-') as temp:
        outer = Path(temp).resolve()
        temp_path = str(outer)
        tree = outer / 'workspace'
        external = outer / 'other-output'
        pkg = tree / 'packages/pal-extract'
        pkg.mkdir(parents=True)
        shutil.copytree(PACKAGE / 'src', pkg / 'src')
        shutil.copyfile(PACKAGE / 'package.json', pkg / 'package.json')
        (pkg / 'node_modules').symlink_to(PACKAGE / 'node_modules', target_is_directory=True)
        assert (pkg / 'src/cli.ts').read_bytes() == source
        if name == 'data-parent-link':
            external.mkdir()
            (tree / 'data').symlink_to(external, target_is_directory=True)
        else:
            (tree / 'data').mkdir()
        raw = tree / 'data/raw'
        raw.mkdir()
        extracted = tree / 'data/extracted'
        if name == 'output-root-link':
            external.mkdir()
            extracted.symlink_to(external, target_is_directory=True)
        else:
            extracted.mkdir()
        assert extracted.resolve().is_relative_to(outer)
        sentinel = extracted / 'stale-owned-marker.txt'
        sentinel.write_text('PROBE-ONLY-OUTPUT')
        videos = extracted / 'videos/keep.mp4'
        videos.parent.mkdir()
        videos.write_bytes(b'PROBE-ONLY-VIDEO')
        other_sentinel = None
        if name == 'child-entry-link':
            external.mkdir()
            other_sentinel = external / 'outside-child-marker.txt'
            other_sentinel.write_text('PROBE-ONLY-CHILD-TARGET')
            (extracted / 'child-link').symlink_to(external, target_is_directory=True)
        before = {'out': str(extracted), 'realOut': str(extracted.resolve()), 'outWithinWorkspace': extracted.resolve().is_relative_to(tree), 'dataIsLink': (tree / 'data').is_symlink(), 'outIsLink': extracted.is_symlink(), 'sentinelSha256': sha(sentinel.read_bytes()), 'videoSha256': sha(videos.read_bytes())}
        command = [NODE, str(PACKAGE / 'node_modules/tsx/dist/cli.mjs'), 'src/cli.ts']
        start = time.monotonic()
        p = subprocess.run(command, cwd=pkg, env={**os.environ, 'NODE_COMPILE_CACHE': ''}, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        for stream, data in [('stdout', p.stdout), ('stderr', p.stderr)]:
            (OUT / (name + '.' + stream + '.gz')).write_bytes(gzip.compress(data, mtime=0))
        after = {'sentinelExists': sentinel.exists(), 'videoSha256': sha(videos.read_bytes()), 'childTargetPreserved': other_sentinel.read_text() == 'PROBE-ONLY-CHILD-TARGET' if other_sentinel else None, 'childEntryExists': (extracted / 'child-link').is_symlink() if other_sentinel else None}
        row = {'name': name, 'command': command, 'cwd': str(pkg), 'exit': p.returncode, 'signal': -p.returncode if p.returncode < 0 else None, 'spawnError': None, 'seconds': round(time.monotonic() - start, 3), 'copySha256': sha((pkg / 'src/cli.ts').read_bytes()), 'stdoutSha256': sha(p.stdout), 'stderrSha256': sha(p.stderr), 'before': before, 'after': after}
        assert p.returncode == 1 and b'ENOENT' in p.stderr and b'SSS.MKF' in p.stderr
        assert not after['sentinelExists'] and after['videoSha256'] == before['videoSha256']
        assert b'refuse to clean unexpected OUT' not in p.stderr
        if name == 'child-entry-link':
            assert after['childTargetPreserved'] and not after['childEntryExists']
        if 'link' in name and name != 'child-entry-link':
            assert not before['outWithinWorkspace']
        result['runs'].append(row)
        print(json.dumps({'name': name, 'exit': p.returncode, 'outWithinWorkspace': before['outWithinWorkspace'], 'outputMarkerDeleted': not after['sentinelExists'], 'videoPreserved': after['videoSha256'] == before['videoSha256'], 'childTargetPreserved': after['childTargetPreserved']}), flush=True)
    result['runs'][-1]['temporaryTreeRemoved'] = not Path(temp_path).exists()
assert CLI.read_bytes() == source
result['formalSourceUnchanged'] = True
result['allTemporaryTreesRemoved'] = all(r['temporaryTreeRemoved'] for r in result['runs'])
result['conclusion'] = 'String suffix guard does not confine cleanup when OUT or data ancestor is a directory symlink. Child-entry removal itself unlinks without traversing target. No product fix authorized by this probe.'
(OUT / 'output-boundary.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
