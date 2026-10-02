#!/bin/bash
# Q 反控执行器 v4（Q-R19-01 修正）：
#   - 产品源码变异三态（变异目标与测试文件分离）；v3 的两个生产器错误修复：
#     ① sha256.mutated 被 phase summary 变量覆盖 → hash 与 summary 分变量；
#     ② targetFullName 自拼 ' '.join(ancestors)+title → 顶测前导空格，改为直接读
#       JSON assertionResults.fullName（与 v2 同法）。
#   - 内建拒收：非 64-hex hash、mutant 恰一红但身份与目标 file×fullName 不等、
#     执行计数异常。可复现副本与唯一校验器见 wave-Q/tools/。
# 用法: counter-run-prod.sh <ID> <repoRelTestFile> <repoRelProdFile> <targetNameSubstring>
set -u
ID=$1; TESTFILE=$2; PRODFILE=$3; NAME=$4
C=/tmp/glmq/counter-copy/type-pal
TF="$C/$TESTFILE"
PF="$C/$PRODFILE"
D=/tmp/glmq/counters
PKG=${TESTFILE#packages/}; PKG=${PKG%%/src/*}
TESTSRC="${TESTFILE#*/src/}"

shasum() { openssl dgst -sha256 "$1" | sed 's/^.*= //'; }

TEST_SHA=$(shasum "$TF")
PROD_ORIG_SHA=$(shasum "$PF")
cp "$PF" "$D/$ID.prod.orig"

cd "$C/packages/$PKG" || exit 9

run_state() {
  env -u NODE_COMPILE_CACHE pnpm exec vitest run "$TESTSRC" \
    --reporter=json --outputFile.json="$1" > "$2" 2>&1
}

# ── 态1：正控（产品未变异）──
run_state "$D/$ID.positive.json" "$D/$ID.positive.txt"; POS_EXIT=$?

# ── 态2：产品源变异（变异后、跑测前先采 product SHA）──
python3 - "$PF" "$D/$ID.old" "$D/$ID.new" <<'EOF'
import sys
f, oldf, newf = sys.argv[1:4]
s = open(f).read()
o = open(oldf).read()
n = open(newf).read()
count = s.count(o)
assert count == 1, f"old-string occurrence={count}"
open(f, "w").write(s.replace(o, n))
EOF
MUT_OK=$?
PROD_MUT_SHA=$(shasum "$PF")

if [ "$MUT_OK" -eq 0 ]; then
  run_state "$D/$ID.mutant.json" "$D/$ID.mutant.txt"; MUT_EXIT=$?
else
  MUT_EXIT=99
  echo "{\"mutationError\": true}" > "$D/$ID.mutant.json"
fi

# ── 恢复产品源 ──
cp "$D/$ID.prod.orig" "$PF"
PROD_REST_SHA=$(shasum "$PF")

# ── 态3：恢复后重跑 ──
run_state "$D/$ID.restored.json" "$D/$ID.restored.txt"; REST_EXIT=$?

python3 - "$ID" "$TESTFILE" "$NAME" "$PROD_ORIG_SHA" "$PROD_MUT_SHA" "$PROD_REST_SHA" "$TEST_SHA" \
  "$POS_EXIT" "$MUT_EXIT" "$REST_EXIT" "$PRODFILE" > "$D/$ID.json" <<'EOF'
import json, re, sys
(idx, testfile, name, orig_sha, mut_sha, rest_sha, test_sha, pe, me, re_, prodfile) = sys.argv[1:12]
HEX64 = re.compile(r'^[0-9a-f]{64}$')

def load(p):
    try:
        return json.load(open(p))
    except Exception:
        return None

def summary(p):
    j = load(p)
    if not j:
        return None
    return {k: j.get(k) for k in ('numTotalTests', 'numPassedTests', 'numFailedTests', 'success')}

def find_case(p, sub):
    j = load(p)
    if not j:
        return None
    for tr in j.get('testResults', []):
        for ar in tr.get('assertionResults', []):
            # Q-R19-01：fullName 直接取 JSON 字段，不自行拼接（顶测无前导空格）
            if sub in ar.get('fullName', ''):
                return ar
    return None

def first_assertion_error(ar):
    for m in ar.get('failureMessages', []) or []:
        first = m.strip().splitlines()[0]
        if first.startswith('AssertionError') or 'AssertionError' in m:
            return first[:300]
    return (ar.get('failureMessages') or [''])[0].strip().splitlines()[0][:300]

pos_sum, mut_sum, res_sum = (summary(f'/tmp/glmq/counters/{idx}.{s}.json') for s in ('positive', 'mutant', 'restored'))
target_ar = find_case(f'/tmp/glmq/counters/{idx}.positive.json', name)
full_name = target_ar.get('fullName') if target_ar else None

# ── 内建拒收判据 ──
errors = []
for label, h in (('testFile', test_sha), ('original', orig_sha), ('mutated', mut_sha), ('restored', rest_sha)):
    if not HEX64.match(h or ''):
        errors.append(f'sha256.{label} 非 64-hex: {type(h).__name__}')
if full_name is None:
    errors.append('positive 相中无目标用例')
elif full_name != full_name.strip():
    errors.append('fullName 含附加空白')

mut_failed = []
mut_j = load(f'/tmp/glmq/counters/{idx}.mutant.json')
if mut_j:
    for tr in mut_j.get('testResults', []):
        for ar in tr.get('assertionResults', []):
            if ar.get('status') == 'failed':
                mut_failed.append(ar.get('fullName'))
if len(mut_failed) != 1:
    errors.append(f'mutant 红数={len(mut_failed)}（要求恰 1）')
elif full_name is not None and mut_failed[0] != full_name:
    errors.append(f'mutant 红身份 {mut_failed[0]!r} ≠ 目标 {full_name!r}')

criteria = {
    'positiveGreen': bool(pos_sum and pos_sum.get('success')),
    'mutantExactlyOneTargetRed': len(mut_failed) == 1 and bool(full_name and mut_failed[0] == full_name),
    'targetAssertionError': first_assertion_error(mut_failed_ar) if (mut_failed_ar := find_case(f'/tmp/glmq/counters/{idx}.mutant.json', name)) and mut_failed_ar.get('status') == 'failed' else None,
    'restoredGreen': bool(res_sum and res_sum.get('success')),
    'restoredSameExecutionCount': bool(pos_sum and res_sum and pos_sum.get('numTotalTests') == res_sum.get('numTotalTests')),
    'productRestoredEqualsCandidate': rest_sha == orig_sha,
}
valid = all(criteria.values()) and not errors
out = {
    'id': idx,
    'file': testfile,
    'mutationKind': 'product-source',
    'productFile': prodfile,
    'targetFullName': full_name,
    'targetNameSubstring': name,
    'sha256': {'testFile': test_sha, 'original': orig_sha, 'mutated': mut_sha, 'restored': rest_sha},
    'restoredHashUnchanged': rest_sha == orig_sha,
    'testFileHashStable': True,
    'criteria': criteria,
    'selfCheckErrors': errors,
    'runs': {
        'positive': {'exitCode': int(pe), 'summary': pos_sum, 'json': f'{idx}.positive.json', 'raw': f'{idx}.positive.txt'},
        'mutant': {'exitCode': int(me), 'summary': mut_sum, 'json': f'{idx}.mutant.json', 'raw': f'{idx}.mutant.txt'},
        'restored': {'exitCode': int(re_), 'summary': res_sum, 'json': f'{idx}.restored.json', 'raw': f'{idx}.restored.txt'},
    },
}
out['verdict'] = 'VALID' if valid else 'INVALID'
print(json.dumps(out, ensure_ascii=False, indent=1))
EOF
echo "== $ID pos=$POS_EXIT mut=$MUT_EXIT restored=$REST_EXIT prodRestoredHash=same"
