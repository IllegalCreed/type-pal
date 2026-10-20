# A 包四行账 — content

Status: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-20
Template: test-run-report-v1 / 1.0.0

本页是 TEST-CURSOR-PURE-WAVE-1 A 包（content）四行账（作者自验不替代 Codex 验收；生产源 hash 与冻结表一致；R1/R2 已按首轮接收改写）。

## Scope

- A01 encodeFrameSequenceSync+deflateSync→parseFrameSequence→decodeFrameSequenceFrame+inflateSync（1×1 RGBA 正式 zlib deflate；解压 RGBA=[1,2,3,255]、codec=deflate-rgba8-xor-v1、rawBytes=4、保留位 [5]/[7] 各自拒绝；反控 a01-reserved-bytes 三字节 OR 只查 [6]）；A02 getScriptBody **撤回**（包内无现行调用者错桶会被 fail-loud；分类无当前消费者/非法输入；第二针改由 A03 占）；A03 validateStampTemplates（新增 anchor 仅 col 越界拒绝同模板 row 合法空格锚通过；反控 a03-anchor-col-overflow 去掉 col 越界臂）；A04 itemUseEffectSupportsContext（applyStatus(puppet) 仅 battle/protect 双上下文仍真/输入不变；不占负控名额）。

## Execution and assertions

- 合法输入与调用：A01 正式 deflate 编码的 1×1 RGBA 帧经 parse/decode；A03 合法 stamp 中仅 col 越界；A04 applyStatus(puppet) 的 battle/protect 上下文。业务对照为 RGBA 与保留位拒绝、row 合法不误拒、傀儡上下文；A02 无消费者已撤回。
- 原命令回执：- 命令（R1-R3 后） / 定向 content 三文件 3/3 exit0 / 反控六针 ok hash 未变（/var/folders 证据目录） / typecheck exit0+Biome 改动文件 0/0/0 / —。这些是原时点执行结果，不作为合法输入或 caller。

## Results

- A 包四行账按 Codex 首轮接收 R1-R3 改写后交付：定向 content 三文件 3/3、反控六针对照绿/候选业务断言红各恰一例、typecheck exit0、改动文件 Biome 0/0/0；A02 错桶轴撤回（无现行消费者），第二针由 A03 承担。

## Evidence

- 证据路径：本回执正文（quote 保全）；a-receipt 反控/定向命令与退出码、源 hash 见证在 quote 四行账与机账。

## Revision history

| revision | date | change | result | supersedes |
|---|---|---|---|---|
| A 包四行账 r1 | 原文时点 | 四行账（A01-A04 定向+反控）交付 | 按 Codex 首轮接收 R1-R3 改写后交复核 | 无 |
| 模板接入 | 2026-10-20 | S17 治理封套（quote 保全） | 不改变原结论 | 无 |

## 历史范围

本页是 TEST-CURSOR-PURE-WAVE-1 A 包（content）四行账（作者自验不替代 Codex 验收；生产源 hash 与冻结表一致；R1/R2 已按首轮接收改写）。 本节仅描述固定原源及其候选时点。

## 原始结论

A 包四行账：A01 编解码往返+保留位 [5]/[7]、A02 撤回（无消费者）、A03 stamp col 越界、A04 puppet 仅 battle；4 反控（a01/a03 占针）。以上是原卡时点陈述，本页未复跑。

## 当时证据

- 证据路径：本回执正文（quote 保全）；a-receipt 反控/定向命令与退出码、源 hash 见证在 quote 四行账与机账。

原始执行、反例和后续处理按固定 quote 保留，不由本次静态治理重授。

## 当前有效性

historical。A 包四行账：A01 编解码往返+保留位 [5]/[7]、A02 撤回（无消费者）、A03 stamp col 越界、A04 puppet 仅 battle；4 反控（a01/a03 占针）是固定原源时点的记录；本页不代表当前产品、E2E、视觉或覆盖率通过。

## 继任文档

后续状态以 TEST-CURSOR-PURE-WAVE-1 原任务卡及其明确验收链为准；本历史页不新授信用。

## 原文保全

固定源 revision `01662fc0b7f4ffd01b8d0c4abe560972b7f7a7ab`，source SHA `87ec67310039b2e4a38ad58983a801876c3185e1e603de80df68611476d5bd79`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与原源逐字节相等（不 trim、不替换）。

<!-- original-source-quote:start -->
> # A 包四行账 — content
>
> 作者自验，不能替代 Codex 独立验收。生产源 hash 与冻结表一致。R1/R2 已按首轮接收改写。
>
> | ID | 公开入口 | 合法输入 / guard | 旧测试精确标题 | 本包 | 差异断言 | 反控 |
> |---|---|---|---|---|---|---|
> | A01 | `encodeFrameSequenceSync` + `deflateSync` → `parseFrameSequence` → `decodeFrameSequenceFrame` + `inflateSync` | 1×1 RGBA，正式 zlib deflate | `version 错拒绝；reserved 非零拒绝`（只翻 `[6]`） | 新增 `encode→parse→decode：deflate 正帧可还原，保留位 [5] 与 [7] 各自拒绝` | 解压 RGBA=`[1,2,3,255]`；`codec=deflate-rgba8-xor-v1`；`rawBytes=4`；`[5]`/`[7]` 各自 `TPFS.reserved` | `a01-reserved-bytes`：三字节 OR → 只查 `[6]` |
> | A02 | `getScriptBody` / `checkScriptLibrary` | 无。包内无现行 `getScriptBody` 调用者；错桶会被 `checkScriptLibrary` fail-loud | `完整校验拒绝有元数据无 body 和作者 body 放错 chunk` | **撤回**原错桶测试与针。分类：无当前消费者 / 非法输入 | — | 改由 A03 占第二针 |
> | A03 | `validateStampTemplates` | 合法 2×1 模板 | `null 与显式 0 碰撞不同…不得越界`（行越界） | 新增 `anchor 仅 col 越界拒绝；同模板 row 合法空格锚通过` | `col=2` 抛锚点超出；`{row:1,col:1}` 通过 | `a03-anchor-col-overflow`：去掉 `col` 越界臂 |
> | A04 | `itemUseEffectSupportsContext` | `{kind:applyStatus,status:puppet\|protect}` | C8 `21 种 effect × world/battle/throw…`（protect） | 新增 `applyStatus(puppet) 仅 battle；protect 双上下文仍真；输入不变` | puppet world=false / battle=true | 本包不占用负控名额 |
>
> ## 命令（R1–R3 后）
>
> - 定向：`env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/content exec vitest run src/frame-sequence.cursor-boundaries.test.ts src/stamp.cursor-boundaries.test.ts src/item.cursor-boundaries.test.ts` → 3 files / 3 tests，exit 0
> - 反控：`env -u NODE_COMPILE_CACHE node docs/testing/archive/legacy/batches/cursor-pure-wave/tools/module-mutants.mjs` → `/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/cursor-pure-wave-mutants-PmDfNF`，六针 `ok`，hash 未变
> - typecheck：`env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/content exec tsc --noEmit -p tsconfig.json` → exit 0
> - Biome：改动文件 0 error/warning/info
>
<!-- original-source-quote:end -->
