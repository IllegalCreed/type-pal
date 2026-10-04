# TEST-GLM-REFORGE-AUDIO-LIFECYCLE-1 证据索引（GLM r1）

- 交付物（仅新增测试，产品零 diff）：
  - `packages/reforge/src/audio/bgm.glm-audio-lifecycle.test.ts`（L1a/L1b/L2/L3）
  - `packages/reforge/src/audio/midi-preview.glm-audio-lifecycle.test.ts`（L4/L5）
  - `packages/reforge/src/audio/sfx-readiness.glm-audio-lifecycle.test.ts`（L6 主臂 + 两正控）
- 排重账：任务卡「r1 交付」节 identity/family ledger（6 合同 source/caller/input/oracle/fullName）
  与 [TEST-GLM-REFORGE-AUDIO-LIFECYCLE-1.md](../tasks/TEST-GLM-REFORGE-AUDIO-LIFECYCLE-1.md) 内排重结论。
- 身份集：[identity.json](identity.json)（定向 3 文件 9 测试全绿，fullName 逐条）。
- 反控：[counterproof.json](counterproof.json)（6/6 针 VALID；每针恰 1 指定业务 AssertionError）；
  可重放脚本 [run-counterproof.mjs](run-counterproof.mjs)；逐相位 raw 见 [mutation-logs/](mutation-logs/)
  （green-baseline / 每针 red+green / final-replay = 四态）。
- 门证据：[adjacent.raw](adjacent.raw)（audio 家族 + spessa/video-sfx ports 18 文件 98/98）、
  [typecheck.raw](typecheck.raw)（reforge 0 错）、[lint.raw](lint.raw)（全仓 3354 文件 0/0/0）、
  [docs-gate.raw](docs-gate.raw)（check:docs PASS）。

## 反控口径

每针 = 产品源码变异（bgm.ts / midi-preview.ts / sfx-readiness.ts；锚文本在目标文件命中恰 1 次
才有效；N4 为双编辑点防护整体失效）→ 定向文件 `-t` 过滤执行（红相位验收：exit≠0 且
"1 failed" 且首条失败为业务 AssertionError）→ `git checkout --` 字节还原 → 复跑同过滤全绿。
四态 hash = green-baseline / 每针 red / 每针 restoredGreen / final-replay（全部针还原后整套重放），
按落盘字节（trimEof 恰一个终止换行）计算 sha256，逐针落 counterproof.json。变异直接落跟踪文件
并立即 git 还原（无 mkdtemp/临时目录）；清理证明 = 全仓 `git status --porcelain` 无 M/D 残留。

## 产品真值修正记录（非放宽测试）

L5 初版预期「替换读取失败后 duration=0」，实测红；核 `midi-preview.ts` `duration() =
activity?.duration ?? sequencer?.duration ?? 0`，产品真值为回退 sequencer 兜底。按真值改断言
（harness 兜底时长取 99 ≠ 旧 activity 10，使「旧 activity 残留」仍可判别），并补 play 拒绝
（`请等待 MIDI 读取完成。`）作更强判别。
