# -*- coding: utf-8 -*-
"""Independently reconstruct saved source probes and native retirement/coverage receipts."""
import base64
import gzip
import hashlib
import json
from pathlib import Path
import subprocess

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[4]
BASE = ROOT / 'packages/pal-extract/src'


def sha(data):
    return hashlib.sha256(data).hexdigest()


def read(name):
    return json.loads((OUT / name).read_text())


def unzip(name):
    return gzip.decompress((OUT / name).read_bytes())


pins = []
transfers = {}
for phase in ('before', 'after'):
    proof = read(phase + '-proof.json')
    tests = {p: unzip(Path(p).name + '.before.gz') if phase == 'before' else (BASE / p).read_bytes() for p in proof['testSha256']}
    assert {p: sha(b) for p, b in tests.items()} == proof['testSha256']
    sources = {}
    for path, digest in proof['sourceSha256'].items():
        if path.endswith('parser-diagnostics.ts'):
            data = unzip('parser-diagnostics.ts.before.gz')
            original = b'/** Synchronous parser IO only: every output byte is checked before returning or rethrowing. */'
            corrected = b'/** Synchronous parser IO: validate complete log records and restore console before returning. */'
            assert data.count(original) == 1
            assert (BASE / path).read_bytes() == data.replace(original, corrected)
        else:
            data = subprocess.check_output(['git', 'show', proof['baseCommit'] + ':packages/pal-extract/src/' + path], cwd=ROOT)
            assert sha(data) == sha((BASE / path).read_bytes())
        assert sha(data) == digest
        sources[path] = data
    assert all(proof[k] for k in ('sourceUnchanged', 'testUnchanged', 'copiesRemoved'))
    count = 21 if phase == 'before' else 20
    identities = {(c['file'], c['fullName']) for c in proof['runs'][0]['cases']}
    assert len(identities) == count
    for run in proof['runs']:
        variant = proof['variants'][run['name']]
        stem = 'pre94-c1-' + phase + '-' + run['name']
        if variant:
            module = sources[variant[0]].decode()
            for old, new in variant[1]:
                assert module.count(old) == 1
                module = module.replace(old, new)
            assert sha(module.encode()) == run['moduleSha256']
        for path, data in tests.items():
            if variant:
                for suffix in ('.js', '.ts'):
                    data = data.replace((Path(variant[0]).stem + suffix + "'").encode(), (stem + suffix + "'").encode())
            copied = BASE / Path(path).parent / (stem + '-' + Path(path).name)
            assert sha(data) == run['testCopySha256'][str(copied.relative_to(ROOT))]
        raw, report = unzip(phase + '-' + run['name'] + '.raw.gz'), unzip(phase + '-' + run['name'] + '.runner.json.gz')
        assert sha(raw) == run['rawSha256'] and sha(report) == run['runnerSha256']
        parsed = json.loads(report)
        cases = [{'file': Path(s['name']).name.removeprefix(stem + '-'), 'fullName': c['fullName'], 'status': c['status'], 'messages': c['failureMessages']} for s in parsed['testResults'] for c in s['assertionResults']]
        assert cases == run['cases'] and {(c['file'], c['fullName']) for c in cases} == identities
        failures = [c for c in cases if c['status'] == 'failed']
        expected = (2 if phase == 'before' else 1) if run['name'].startswith('transfer-') else int(phase == 'after' and run['name'] != 'control')
        assert run['failed'] == parsed['numFailedTests'] == len(failures) == expected
        assert run['passed'] == parsed['numPassedTests'] == count - expected and run['pending'] == parsed['numPendingTests'] == 0
        assert run['exit'] == int(expected > 0) and run['signal'] is None and run['cwd'] == str(ROOT)
        assert all('AssertionError:' in ''.join(c['messages']) for c in failures)
        assert '--silent=false' in run['command'] and not any(arg in run['command'] for arg in ('-t', '--testNamePattern'))
        if phase == 'after':
            assert run['stderrBlocks'] == raw.count(b'stderr |') == 0
            if expected and not run['name'].startswith('transfer-'):
                pins.append({'mutation': run['name'], 'file': failures[0]['file'], 'fullName': failures[0]['fullName'], 'type': 'AssertionError'})
        if run['name'].startswith('transfer-'):
            transfers[phase] = [{'file': c['file'], 'fullName': c['fullName']} for c in failures]
retirement = read('retirement.json')
for row in retirement['receipts']:
    assert sha(unzip(row['phase'] + '-list.raw.gz')) == row['rawSha256']
    assert sha(unzip(row['phase'] + '-list.json.gz')) == row['nativeSha256'] and row['exit'] == 0
for snapshot in retirement['previousSnapshots']:
    assert sha(subprocess.check_output(['git', 'show', snapshot['revision'] + ':' + retirement['approval']['file']], cwd=ROOT)) == snapshot['fileSha256']
node = """
import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {readFileSync} from 'node:fs';import {pathToFileURL} from 'node:url';import {relative} from 'node:path';
const p=JSON.parse(readFileSync(0,'utf8')),old=await import('data:text/javascript;base64,'+p.old),now=await import(pathToFileURL(process.cwd()+'/scripts/coverage/approved-test-retirements.mjs'));
assert.deepEqual(now.approvedTestRetirements.slice(0,-1),old.approvedTestRetirements);assert.equal(now.isApprovedTestRetirement.toString(),old.isApprovedTestRetirement.toString());assert.deepEqual(now.approvedTestRetirements.at(-1),p.r.approval);assert.equal(old.isApprovedTestRetirement(p.r.input),false);assert.equal(now.isApprovedTestRetirement(p.r.input),true);assert.equal(now.isApprovedTestRetirement({...p.r.input,fileSha256:'drift'}),false);assert.equal(now.isApprovedTestRetirement({...p.r.input,removal:{...p.r.input.removal,current:3}}),false);
assert.equal(now.approvedTestRetirements.length,26);assert.equal(now.approvedTestRetirements.reduce((n,e)=>n+e.previous-e.current,0),60);
for(const phase of ['before','after']){const ids=p.lists[phase].map(e=>relative(process.cwd(),e.file.replace('/pre94-c1-list-','/'))+' :: project root :: '+e.name).sort((a,b)=>a.localeCompare(b));assert.deepEqual(ids,p.r.native[phase].identities);const own=ids.filter(id=>id.startsWith(p.r.approval.file+' ::'));assert.equal(createHash('sha256').update(JSON.stringify(own)).digest('hex'),p.r.native[phase].fileEntry.identityDigest);}
console.log('26 exact snapshots / net60; other25 + matcher unchanged; native identity digests verified');
"""
payload = {'old': base64.b64encode(unzip('approved-test-retirements.mjs.before.gz')).decode(), 'r': retirement, 'lists': {phase: json.loads(unzip(phase + '-list.json.gz')) for phase in ('before', 'after')}}
subprocess.run(['node', '--input-type=module', '-e', node], cwd=ROOT, input=json.dumps(payload).encode(), check=True)
assert sha((ROOT / retirement['approval']['file']).read_bytes()) == retirement['approval']['fileSha256']
coverage = {}
for phase in ('before', 'after'):
    record = read(phase + '-coverage.json')
    assert record['exit'] == 0 and not record['officialGate']
    assert sha(unzip(phase + '-coverage.raw.gz')) == record['rawSha256'] and sha(unzip(phase + '-coverage.json.gz')) == record['coverageSha256']
    coverage[phase] = record['metrics']
assert coverage['before'] == coverage['after']
for name in ('extract-targeted', 'extract-package', 'extract-typecheck', 'shared-adjacent', 'coverage-tools'):
    receipt = read(name + '.json')
    assert receipt['exit'] == 0 and sha(unzip(name + '.raw.gz')) == receipt['rawSha256']
    if 'runnerSha256' in receipt:
        assert sha(unzip(name + '.runner.json.gz')) == receipt['runnerSha256']
unchanged = ['packages/pal-extract/src/resources/parsers/ball.ts', 'packages/pal-extract/src/resources/parsers/rgm.ts', 'packages/pal-extract/src/resources/sprite.ts', 'packages/shared/src/rle.ts', 'scripts/coverage/config.mjs', 'scripts/coverage/baseline.fast.json']
for name in unchanged:
    assert (ROOT / name).read_bytes() == subprocess.check_output(['git', 'show', retirement['baseCommit'] + ':' + name], cwd=ROOT)
assert not list(BASE.rglob('pre94-c1-*'))
report = {'reviewer': 'Codex separate receipt-verification process, not third-party acceptance', 'twentyWholeSuiteProbeRunsVerified': True, 'finalSingleAssertionFailures': pins, 'legacyDiagnosticGaps': 6, 'newHarnessContracts': 2, 'duplicateTransferFailures': transfers, 'localProductionCoverageExactlyEqual': coverage, 'nativeCounts': [21, 20], 'retirementRows': 26, 'retirementNet': 60, 'matcherAndOther25EntriesUnchanged': True, 'productionBaselineAndRulesUnchanged': unchanged, 'temporaryCopiesRemoved': True, 'newFileClosures': 0, 'wholeCardAcceptance': False}
report['helperCommentOnlyCorrection'] = {'probeSha256': sha(unzip('parser-diagnostics.ts.before.gz')), 'currentSha256': sha((BASE / '__tests__/parser-diagnostics.ts').read_bytes()), 'onlyExactSingleCommentReplacement': True}
(OUT / 'verification.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'singleBusinessAssertions': len(pins), 'coverageEqual': True, 'transfer': [2, 1], 'wholeCardAcceptance': False}))
