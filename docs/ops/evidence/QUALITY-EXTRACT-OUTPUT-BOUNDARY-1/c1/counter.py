"""Run the exact C1 tests against an ephemeral production-source mutant."""
import gzip, hashlib, json, subprocess, tempfile, time
from pathlib import Path
OUT=Path(__file__).resolve().parent
ROOT=Path(__file__).resolve().parents[5]
SOURCE=ROOT/'packages/pal-extract/src/cli.ts'
ORIGINAL=SOURCE.read_bytes()
text=ORIGINAL.decode()
needle='  assertOwnedOutputRoot()\n'
assert text.count(needle)==1
MUTANT=text.replace(needle,'')
try:
 SOURCE.write_text(MUTANT)
 with tempfile.TemporaryDirectory(prefix='type-pal-extract-c1-mutant-report-') as temp:
  report=Path(temp)/'runner.json'
  command=['pnpm','--filter','@type-pal/pal-extract','exec','vitest','run','src/cli-error-exits.kimi-r1.test.ts','--maxWorkers=1','--silent=false','--reporter=default','--reporter=json','--outputFile.json='+str(report)]
  start=time.monotonic();result=subprocess.run(command,cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
  raw=result.stdout;native=report.read_bytes();data=json.loads(native)
  row={'command':command,'cwd':str(ROOT),'exit':result.returncode,'signal':None,'spawnError':None,'seconds':round(time.monotonic()-start,3),'mutantSha256':hashlib.sha256(MUTANT.encode()).hexdigest(),'formalSourceSha256':hashlib.sha256(ORIGINAL).hexdigest(),'rawSha256':hashlib.sha256(raw).hexdigest(),'runnerSha256':hashlib.sha256(native).hexdigest(),'passed':data['numPassedTests'],'failed':data['numFailedTests'],'pending':data['numPendingTests'],'stderrBlocks':raw.count(b'stderr |'),'cases':[{'fullName':c['fullName'],'status':c['status'],'failureMessages':c['failureMessages']} for s in data['testResults'] for c in s['assertionResults']]}
  (OUT/'counter.json').write_text(json.dumps(row,ensure_ascii=False,indent=2)+'\n')
  (OUT/'counter.raw.gz').write_bytes(gzip.compress(raw,mtime=0));(OUT/'counter.runner.json.gz').write_bytes(gzip.compress(native,mtime=0))
  print(row['passed'],row['failed'],row['pending'],result.returncode)
  assert result.returncode==1 and row['passed']==7 and row['failed']==2 and row['pending']==0 and row['stderrBlocks']==0
finally:
 SOURCE.write_bytes(ORIGINAL)
assert SOURCE.read_bytes()==ORIGINAL
