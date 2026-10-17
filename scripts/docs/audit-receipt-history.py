import subprocess,json,pathlib,re,hashlib,datetime
root=pathlib.Path.cwd()
def git(*args):return subprocess.check_output(['git',*args],cwd=root,stderr=subprocess.DEVNULL)
text=git('log','--all','--format=COMMIT%H\t%cI','--name-only','--diff-filter=M','--','docs').decode('utf8')
changes=[];current=None
for l in text.splitlines():
 if l.startswith('COMMIT'):current=l[6:].split('\t',1)
 elif l.endswith('.json'):
  changes.append((current[0],current[1],l))
def parse(b):
 try:return json.loads(b)
 except:return None
def fields(x,pre=''):
 out={}
 if isinstance(x,dict):
  for k,v in x.items():
   p=pre+'/'+k
   if k in ['stdout','stderr','summary','exitCode','signal','command','commands','candidateHead','candidateSha','generatedAt','timestamp','startedAt','finishedAt','executionId','durationMs'] and not isinstance(v,(dict,list)):out[p]=v
   out.update(fields(v,p))
 elif isinstance(x,list):
  for i,v in enumerate(x):out.update(fields(v,pre+'/'+str(i)))
 return out
candidates=[];parsed=0;unavailable=[]
for commit,date,path in changes:
 try:a=git('show',commit+'^:'+path);b=git('show',commit+':'+path)
 except subprocess.CalledProcessError:unavailable.append({'commit':commit,'path':path});continue
 if a==b:continue
 old,new=parse(a),parse(b)
 if not isinstance(old,dict) or not isinstance(new,dict):continue
 parsed+=1;fa,fb=fields(old),fields(new)
 delta=[{'field':k,'before':fa.get(k),'after':fb.get(k)} for k in set(fa)|set(fb) if fa.get(k)!=fb.get(k)]
 obs=[d for d in delta if re.search(r'/(stdout|stderr|summary|exitCode|signal)$',d['field'])]
 if not obs:continue
 if not (any('exitCode' in k or 'stdout' in k for k in fa) or 'staticCommands' in old):continue
 metadata=[d for d in delta if re.search(r'/(candidateHead|candidateSha|generatedAt|timestamp|startedAt|finishedAt|executionId|command|commands)$',d['field'])]
 candidates.append({'commit':commit,'commitTime':date,'path':path,'beforeSha256':hashlib.sha256(a).hexdigest(),'afterSha256':hashlib.sha256(b).hexdigest(),'changedObservationFields':obs,'changedExecutionIdentityFields':metadata,'classification':'suspicious-observation-edit-without-recorded-execution-identity-change' if not metadata else 'observation-edit-needs-raw-run-verification','verdict':'candidate-not-proven-execution-or-fraud'})
print('scanned',len(changes),'parsed',parsed,'candidates',len(candidates),flush=True)
result={'schemaVersion':1,'kind':'git-history-machine-receipt-mutation-screen','owner':'Codex self-audit','sourceRevision':git('rev-parse','HEAD').decode().strip(),'date':'2026-10-18','scope':'All reachable Git refs; all modified docs JSON paths, without filename filtering; recursive command/output/identity fields compared, then select command/evidence objects. Creation-only receipts not authenticated by this mutation screen.','historyEntriesExamined':len(changes),'jsonPairsParsed':parsed,'unavailablePairs':unavailable,'candidateCount':len(candidates),'mtimeLimit':'Git has no historical per-file mtime. Checkout mtimes cannot prove generation or rerun. Commit times and blob pairs are recorded; raw output authentication remains per candidate.','candidates':candidates}
pathlib.Path('docs/ops/evidence/DOCS-RECORD-INTEGRITY-1/receipt-history-scan.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
