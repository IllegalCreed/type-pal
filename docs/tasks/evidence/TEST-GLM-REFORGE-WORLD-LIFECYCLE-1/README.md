# TEST-GLM-REFORGE-WORLD-LIFECYCLE-1 证据索引（GLM r1）

Status: historical
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-20
Template: evidence-receipt-v1 / 1.0.0

本页是 TEST-GLM-REFORGE-WORLD-LIFECYCLE-1 的证据索引（GLM r1）：交付物仅新增测试（产品零 diff）——deferred-trigger.world-lifecycle-1.test.ts（DT-CLEAR-1/DT-FIRE-DROP-1）、async-intent.world-lifecycle-1.test.ts（AI-CAPTURE-1）、gameplay-clock.world-lifecycle-1.test.ts（GC-REGRESS-1）。

## 证据身份

- 配套：dedup-ledger.md（四家族逐轴排重，卡面绝大多数轴 existing-proof 不重复堆叠，仅补 4 条真实未证明合同；含 unreachable/blocked 登记与判例）；identity.json（4 合同 source/caller/输入/oracle/fullName/针位）；counterproof.json（4/4 针 VALID）+run-counterproof.mjs+四态 raw mutation-logs/（逐针产品文件原始/变异/恢复 sha256，mkdtemp finally 移除留清理证明）；门证据 adjacent.raw（38 文件 356/356）、typecheck.raw、lint.raw（3385 文件 0/0/0）、docs-gate.raw。

## 来源与输入

- 反控口径：每针=产品源码变异（锚文本恰 1 次）→定向文件 -t 无括号唯一子串过滤（防 -t 零匹配假绿）→字节还原 sha256 复核→同过滤复跑全绿；四态 hash 按落盘字节（trimEof 恰一终止换行）。

## 断言与业务 oracle

- 四合同：DT-CLEAR-1 deferred trigger 清理；DT-FIRE-DROP-1 触发丢弃；AI-CAPTURE-1 async intent 捕获只读；GC-REGRESS-1 时钟回退钳（真值修正）。

## 结果

- 产品真值修正记录（非放宽测试）：GC-REGRESS-1 初版预期回退后恢复帧按 16ms 真实间隔推进实测红——gameplay-clock.ts:21-22 真值为回退帧 dt 钳 0 且 lastReal 重锚回退值，恢复帧 dt 受 100ms 帧上限钳制；按实测真值改断言并在测试注释登记。

## 限制与复核

- memory 补充：r1 已推 5d1d197a5/ee9bcaa93（四家族排重+4 合同）待 Codex 验收。

## 历史范围

- TEST-GLM-REFORGE-WORLD-LIFECYCLE-1 r1 证据索引（4 合同+4 针）；固定源 revision 9e72e90307af…。

## 原始结论

- 四家族排重后仅 4 真实未证合同；GC-REGRESS-1 按真值修正。

## 当时证据

- 反控口径与修正记录在 quote 保全。

## 当前有效性

historical。r1 时点待验收。

## 继任文档

当前结论归任务卡与 Codex 接收记录。

## 原文保全

固定 source revision `9e72e90307af540a28efaed4c235d3aef8672e6a`，source SHA `0bff274fd10f01068c3b83a973653f9122b16571882aadcc299f608a6a5ffe1b`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与固定原源逐字节相等（不 trim、不替换）。
<!-- original-source-quote:start -->
> # TEST-GLM-REFORGE-WORLD-LIFECYCLE-1 证据索引（GLM r1）
>
> - 交付物（仅新增测试，产品零 diff）：`packages/reforge/src/deferred-trigger.world-lifecycle-1.test.ts`
>   （DT-CLEAR-1/DT-FIRE-DROP-1）、`packages/reforge/src/async-intent.world-lifecycle-1.test.ts`
>   （AI-CAPTURE-1）、`packages/reforge/src/gameplay-clock.world-lifecycle-1.test.ts`（GC-REGRESS-1）。
> - 排重账：[dedup-ledger.md](dedup-ledger.md)——四家族逐轴排重，卡面绝大多数轴 existing-proof
>   （不重复堆叠），仅补 4 条真实未证明合同；含 unreachable/blocked 登记与本卡判例。
> - 身份集：[identity.json](identity.json)——4 合同 source/caller/输入/oracle/fullName/针位。
> - 反控：[counterproof.json](counterproof.json)（4/4 针 VALID；每针红相位 exit 1、恰 1 指定业务
>   AssertionError、还原字节等于原始、还原绿）+ 可重放脚本 [run-counterproof.mjs](run-counterproof.mjs)
>   + 四态 raw [mutation-logs/](mutation-logs/)（green-baseline / 每针 red+green / final-replay）；
>   逐针记录产品文件 原始/变异/恢复 sha256；临时树 mkdtemp 在 finally 移除并留存在性证明。
> - 门证据：[adjacent.raw](adjacent.raw)（定向+相邻 38 文件 356/356）、[typecheck.raw](typecheck.raw)
>   （reforge tsc 0 错）、[lint.raw](lint.raw)（全仓 3385 文件 0/0/0）、[docs-gate.raw](docs-gate.raw)
>   （check:docs PASS）。
>
> ## 反控口径
>
> 每针 = 产品源码变异（deferred-trigger.ts / async-intent.ts / gameplay-clock.ts；锚文本在目标文件
> 命中恰 1 次才有效）→ 定向文件 `-t` 无括号唯一子串过滤执行（红相位验收：exit≠0 且 `1 failed` 且首条
> 失败为业务 AssertionError，防 `-t` 零匹配假绿）→ `git checkout --` 字节还原（sha256 复核）→ 同过滤
> 复跑全绿。四态 hash = green-baseline / 每针 red / 每针 restoredGreen / final-replay，按落盘字节
> （trimEof 恰一个终止换行）计算。变异直接落跟踪文件并立即 git 还原；每相位 raw 先写 mkdtemp 临时树
> 再终结化到证据目录，finally 移除（清理证明写入 counterproof.json cleanup 节）；清理复核 = 全仓
> `git status --porcelain` 仅剩本卡证据新增。
>
> ## 产品真值修正记录（非放宽测试）
>
> GC-REGRESS-1 初版预期「回退后恢复帧按 16ms 真实间隔推进」，实测红；核 `gameplay-clock.ts:21-22`，
> 产品真值为回退帧 dt 钳 0 且 `lastReal` 重锚到回退值，恢复帧 dt=2_032-1_000 受 100ms 帧上限钳制。
> 按实测真值改断言并在测试注释登记（合同核心 gameplayNow 单调不变）。
>
> ## 环境与产品边界
>
> - 产品/schema/API/旧测/config/baseline/真实数据零改动（businessCommit 仅 3 个新增测试文件）。
> - 无私有 state/`__rf*`/核心 mock/强转/skip/ignore/timeout 扩大；全部输入为模块公开 API 合法 typed 值。
> - 覆盖率/例数不是完成条件：4 合同为少而精补充，不设数量门槛，未标 done，等待 Codex 独立验收。
>
<!-- original-source-quote:end -->
