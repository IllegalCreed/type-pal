# A 包四行账 — content

Status: historical
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-17
Template: archive-record-v1 / 1.0.0

本页把 testing archive 材料接入 archive-record-v1。原任务日期、状态、合同、测试数字、失败、counter、机器字段、链接和未执行项在 quote 中保全；本次不授 runtime/E2E/视觉/coverage 信用。

## 历史范围

- 源 revision 01662fc0b7f4ffd01b8d0c4abe560972b7f7a7ab；本轮 R72。此文件属于 testing archive 历史层，不能单独授权当前测试或发布。

## 原始结论

- A 包四行账 — content：原始正文完整保留于下方 quote；本轮只改变文档封套，不改变原始结论。

## 当时证据

- 原始命令、输入、caller/oracle、结果、机器字段、SHA、counter、链接和未执行项保留于 quote。

## 当前有效性

historical。历史测试结论必须带日期和 source revision，并由当前 catalog、contract、fresh receipt 重新核定。

## 继任文档

- 当前入口：对应 testing catalog/domain report、contract、paired evidence 和 fresh receipt。
- 若重新启用：补齐合法输入、真实 caller/oracle、排重、独立 review 和静态零诊断。

## 停止线

- 本页不证明 runtime、E2E、视觉、coverage 或当前产品行为；不得以 archive wrapper 替代执行回执。

## 原文保全

固定 source revision `01662fc0b7f4ffd01b8d0c4abe560972b7f7a7ab`，source SHA `87ec67310039b2e4a38ad58983a801876c3185e1e603de80df68611476d5bd79`；下方 quote 可逆回原始 UTF-8 字节。
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
