# TEST-GLM-REFORGE-WORLD-LIFECYCLE-1 证据索引（GLM r1）

- 交付物（仅新增测试，产品零 diff）：`packages/reforge/src/deferred-trigger.world-lifecycle-1.test.ts`
  （DT-CLEAR-1/DT-FIRE-DROP-1）、`packages/reforge/src/async-intent.world-lifecycle-1.test.ts`
  （AI-CAPTURE-1）、`packages/reforge/src/gameplay-clock.world-lifecycle-1.test.ts`（GC-REGRESS-1）。
- 排重账：[dedup-ledger.md](dedup-ledger.md)——四家族逐轴排重，卡面绝大多数轴 existing-proof
  （不重复堆叠），仅补 4 条真实未证明合同；含 unreachable/blocked 登记与本卡判例。
- 身份集：[identity.json](identity.json)——4 合同 source/caller/输入/oracle/fullName/针位。
- 反控：[counterproof.json](counterproof.json)（4/4 针 VALID；每针红相位 exit 1、恰 1 指定业务
  AssertionError、还原字节等于原始、还原绿）+ 可重放脚本 [run-counterproof.mjs](run-counterproof.mjs)
  + 四态 raw [mutation-logs/](mutation-logs/)（green-baseline / 每针 red+green / final-replay）；
  逐针记录产品文件 原始/变异/恢复 sha256；临时树 mkdtemp 在 finally 移除并留存在性证明。
- 门证据：[adjacent.raw](adjacent.raw)（定向+相邻 38 文件 356/356）、[typecheck.raw](typecheck.raw)
  （reforge tsc 0 错）、[lint.raw](lint.raw)（全仓 3385 文件 0/0/0）、[docs-gate.raw](docs-gate.raw)
  （check:docs PASS）。

## 反控口径

每针 = 产品源码变异（deferred-trigger.ts / async-intent.ts / gameplay-clock.ts；锚文本在目标文件
命中恰 1 次才有效）→ 定向文件 `-t` 无括号唯一子串过滤执行（红相位验收：exit≠0 且 `1 failed` 且首条
失败为业务 AssertionError，防 `-t` 零匹配假绿）→ `git checkout --` 字节还原（sha256 复核）→ 同过滤
复跑全绿。四态 hash = green-baseline / 每针 red / 每针 restoredGreen / final-replay，按落盘字节
（trimEof 恰一个终止换行）计算。变异直接落跟踪文件并立即 git 还原；每相位 raw 先写 mkdtemp 临时树
再终结化到证据目录，finally 移除（清理证明写入 counterproof.json cleanup 节）；清理复核 = 全仓
`git status --porcelain` 仅剩本卡证据新增。

## 产品真值修正记录（非放宽测试）

GC-REGRESS-1 初版预期「回退后恢复帧按 16ms 真实间隔推进」，实测红；核 `gameplay-clock.ts:21-22`，
产品真值为回退帧 dt 钳 0 且 `lastReal` 重锚到回退值，恢复帧 dt=2_032-1_000 受 100ms 帧上限钳制。
按实测真值改断言并在测试注释登记（合同核心 gameplayNow 单调不变）。

## 环境与产品边界

- 产品/schema/API/旧测/config/baseline/真实数据零改动（businessCommit 仅 3 个新增测试文件）。
- 无私有 state/`__rf*`/核心 mock/强转/skip/ignore/timeout 扩大；全部输入为模块公开 API 合法 typed 值。
- 覆盖率/例数不是完成条件：4 合同为少而精补充，不设数量门槛，未标 done，等待 Codex 独立验收。
