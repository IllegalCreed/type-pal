# TEST-GLM-REFORGE-AUDIO-LIFECYCLE-1 证据索引（GLM r1）

Status: historical
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-20
Template: evidence-receipt-v1 / 1.0.0

本页是 TEST-GLM-REFORGE-AUDIO-LIFECYCLE-1 的证据索引（GLM r1）：交付物仅新增测试（产品零 diff）——bgm.glm-audio-lifecycle.test.ts（L1a/L1b/L2/L3）、midi-preview.glm-audio-lifecycle.test.ts（L4/L5）、sfx-readiness.glm-audio-lifecycle.test.ts（L6 主臂+两正控）。

## 证据身份

- 配套：dedup-ledger.md（6 新增合同源锚/caller/合法输入/oracle/排重结论+登记不设针项+判例）；identity.json（定向 3 文件 9 测试全绿 fullName 逐条）；counterproof.json（6/6 针 VALID，每针恰 1 指定业务 AssertionError）；run-counterproof.mjs；mutation-logs/（green-baseline/每针 red+green/final-replay 四态）；门证据 adjacent.raw（18 文件 98/98）、typecheck.raw、lint.raw（3354 文件 0/0/0）、docs-gate.raw。

## 来源与输入

- 反控口径：每针=产品源码变异（bgm/midi-preview/sfx-readiness；锚文本命中恰 1 次，N4 为双编辑点防护整体失效）→定向文件 -t 过滤执行→git checkout -- 字节还原→复跑同过滤全绿；四态 hash 按落盘字节（trimEof 恰一个终止换行）；变异直接落跟踪文件并立即还原（无 mkdtemp），清理证明=全仓 porcelain 无 M/D 残留。

## 断言与业务 oracle

- 六合同：L1a 手势 resume 成功后补播记账曲（解锁正路径）；L1b 无记账曲解锁不补播；L2 同曲 steady-state 重复不重启；L3 setEnabled 同值幂等；L4 播放中替换旧曲停+新曲就绪；L5 替换读取失败回退 sequencer 兜底（真值修正）。

## 结果

- 产品真值修正记录（非放宽测试）：L5 初版预期 duration=0 实测红——midi-preview.ts duration 回退 sequencer 兜底；按真值改断言（harness 兜底 99≠旧 activity 10 保持判别力）并补 play 拒绝「请等待 MIDI 读取完成。」更强判别。

## 限制与复核

- memory 补充：r1 已推 6f6b5ceab（6 合同/6 针、L5 真值修正）待 Codex 验收。

## 历史范围

- TEST-GLM-REFORGE-AUDIO-LIFECYCLE-1 r1 证据索引（6 合同+6 针）；固定源 revision 183ec0bf0b7c…。

## 原始结论

- L1-L6 六合同全绿；L5 按产品真值修正断言。

## 当时证据

- 反控口径与 L5 修正记录在 quote 保全。

## 当前有效性

historical。r1 时点待验收。

## 继任文档

当前结论归任务卡与 Codex 接收记录。

## 原文保全

固定 source revision `183ec0bf0b7ce290bcfa68839e5ce9d29af3245a`，source SHA `16619d9296ae1865628193f12f0558d609bfbfd395287fba171ed95103179c72`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与固定原源逐字节相等（不 trim、不替换）。
<!-- original-source-quote:start -->
> # TEST-GLM-REFORGE-AUDIO-LIFECYCLE-1 证据索引（GLM r1）
>
> - 交付物（仅新增测试，产品零 diff）：
>   - `packages/reforge/src/audio/bgm.glm-audio-lifecycle.test.ts`（L1a/L1b/L2/L3）
>   - `packages/reforge/src/audio/midi-preview.glm-audio-lifecycle.test.ts`（L4/L5）
>   - `packages/reforge/src/audio/sfx-readiness.glm-audio-lifecycle.test.ts`（L6 主臂 + 两正控）
> - 排重账：[dedup-ledger.md](dedup-ledger.md)（6 新增合同源锚/caller/合法输入/oracle/排重结论
>   + 登记不设针项 + 判例）；任务卡「r1 交付」节 identity/family ledger 见
>   [TEST-GLM-REFORGE-AUDIO-LIFECYCLE-1.md](../../tasks/../archive/tasks/done/TEST-GLM-REFORGE-AUDIO-LIFECYCLE-1.md)。
> - 身份集：[identity.json](identity.json)（定向 3 文件 9 测试全绿，fullName 逐条）。
> - 反控：[counterproof.json](counterproof.json)（6/6 针 VALID；每针恰 1 指定业务 AssertionError）；
>   可重放脚本 [run-counterproof.mjs](run-counterproof.mjs)；逐相位 raw 见 [mutation-logs/](mutation-logs/)
>   （green-baseline / 每针 red+green / final-replay = 四态）。
> - 门证据：[adjacent.raw](adjacent.raw)（audio 家族 + spessa/video-sfx ports 18 文件 98/98）、
>   [typecheck.raw](typecheck.raw)（reforge 0 错）、[lint.raw](lint.raw)（全仓 3354 文件 0/0/0）、
>   [docs-gate.raw](docs-gate.raw)（check:docs PASS）。
>
> ## 反控口径
>
> 每针 = 产品源码变异（bgm.ts / midi-preview.ts / sfx-readiness.ts；锚文本在目标文件命中恰 1 次
> 才有效；N4 为双编辑点防护整体失效）→ 定向文件 `-t` 过滤执行（红相位验收：exit≠0 且
> "1 failed" 且首条失败为业务 AssertionError）→ `git checkout --` 字节还原 → 复跑同过滤全绿。
> 四态 hash = green-baseline / 每针 red / 每针 restoredGreen / final-replay（全部针还原后整套重放），
> 按落盘字节（trimEof 恰一个终止换行）计算 sha256，逐针落 counterproof.json。变异直接落跟踪文件
> 并立即 git 还原（无 mkdtemp/临时目录）；清理证明 = 全仓 `git status --porcelain` 无 M/D 残留。
>
> ## 产品真值修正记录（非放宽测试）
>
> L5 初版预期「替换读取失败后 duration=0」，实测红；核 `midi-preview.ts` `duration() =
> activity?.duration ?? sequencer?.duration ?? 0`，产品真值为回退 sequencer 兜底。按真值改断言
> （harness 兜底时长取 99 ≠ 旧 activity 10，使「旧 activity 残留」仍可判别），并补 play 拒绝
> （`请等待 MIDI 读取完成。`）作更强判别。
>
<!-- original-source-quote:end -->
