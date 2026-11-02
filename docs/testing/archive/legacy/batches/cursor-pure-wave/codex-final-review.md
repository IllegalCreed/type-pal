# TEST-CURSOR-PURE-WAVE-1 · Codex 独立接收

Status: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-20
Template: test-run-report-v1 / 1.0.0

本页是 TEST-CURSOR-PURE-WAVE-1 Codex 独立接收（候选 bd8876e4…1229）：**accept**，首轮 R1-R3 counter 已逐项闭合。

## Scope

- R1：frame-sequence 测试改真实 deflateSync 编码经 parseFrameSequence 与 decodeFrameSequenceFrame/inflateSync 还原同一 RGBA 再单独翻转保留位 [5]/[7]，不再用 identity 压缩伪造合法帧；R2：删除错桶的 script-library 测试及 a02 针（getScriptBody 在当前 packages/ 非测试调用域仅有自身定义且错桶会被 checkScriptLibrary 拒），A 包第二针改为合法 stamp 的 a03 col 越界；R3：script-chunk-store 测试先 deriveScriptChunk 确认 owner 为 shared/c01 经 normalizeScriptLibrary 生成实际 bytes 过 checkScriptLibrary 后再断言二次 resolve 缓存命中、旁分片零读与 lease 收尾。

## Execution and assertions

- **复跑**：content 3/3、reforge 2/2、editor 2/2；三包 tsc exit0；11 改动文件 Biome 0；module-mutants 六针对照绿指定 fullName 候选自身 AssertionError 红退出 1 源 hash 未变判据自测通过；diff 仅测试/fixture/回执/负控工具无生产改动
- **统一门**：check exit0（9,966 项 lint 2,309 文件零）→ratchet exit0→BASE_REF=c442dcb7 受保护单次 fast exit0（9,505/730）；两 fast 同口径 46,615/63,323=73.61% 净增 5 臂分母 +2；增量是卡面允许的两个 src/cursor-pure-fixtures.ts 测试辅助模块被官方源码扫描计入不误写成产品目标新臂

## Results

- Cursor 是贡献者自验不替代接收；当前模式不要求固定三席签字。

## Evidence

- R1-R3 闭合依据见 [首轮反例](codex-intake-review.md)；原回执记录 content 3/3、reforge 2/2、editor 2/2、六针及串行统一门，当前未复跑这些历史产品门。

## Revision history

| revision | date | change | result | supersedes |
|---|---|---|---|---|
| 最终接收 | 原文时点 | R1-R3 逐项复验（真实 deflateSync/撤错桶/chunk-store 先过 checkScriptLibrary）+串行统一门 | accept（bd8876e4 集成） | 首轮 counter |
| 模板接入 | 2026-10-20 | S17 治理封套（quote 保全） | 不改变原结论 | 无 |

## 历史范围

本页是 TEST-CURSOR-PURE-WAVE-1 Codex 独立接收（候选 bd8876e4…1229）：**accept**，首轮 R1-R3 counter 已逐项闭合。 本节仅描述固定原源及其候选时点。

## 原始结论

PURE-WAVE accept（bd8876e4）：R1 真实 deflateSync 替 identity 伪造帧、R2 删错桶 script-library+getScriptBody 无消费者、R3 chunk-store 先过 checkScriptLibrary 再断言缓存/零读/lease；六针+三门（fast 9,505 净增 5 臂分母+2 系 fixtures 计入）。以上是原卡时点陈述，本页未复跑。

## 当时证据

- R1-R3 闭合依据见 [首轮反例](codex-intake-review.md)；原回执记录 content 3/3、reforge 2/2、editor 2/2、六针及串行统一门，当前未复跑这些历史产品门。

原始执行、反例和后续处理按固定 quote 保留，不由本次静态治理重授。

## 当前有效性

historical。PURE-WAVE accept（bd8876e4）：R1 真实 deflateSync 替 identity 伪造帧、R2 删错桶 script-library+getScriptBody 无消费者、R3 chunk-store 先过 checkScriptLibrary 再断言缓存/零读/lease；六针+三门（fast 9,505 净增 5 臂分母+2 系 fixtures 计入）是固定原源时点的记录；本页不代表当前产品、E2E、视觉或覆盖率通过。

## 继任文档

后续状态以 TEST-CURSOR-PURE-WAVE-1 原任务卡及其明确验收链为准；本历史页不新授信用。

## 原文保全

固定源 revision `01662fc0b7f4ffd01b8d0c4abe560972b7f7a7ab`，source SHA `ef63755e52ba8cbfd2ff44432920475565e1174462eb8a6c946b26f8492c3a21`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与原源逐字节相等（不 trim、不替换）。

<!-- original-source-quote:start -->
> # TEST-CURSOR-PURE-WAVE-1 · Codex 独立接收
>
> 候选：`codex/cursor-pure-wave-r1@bd8876e40c964c7cb0b270ec20ae6fc16eab1229`。
> 结论：**accept**，首轮 [R1–R3 counter](codex-intake-review.md) 已逐项闭合。
>
> - R1：`frame-sequence.cursor-boundaries.test.ts` 使用真实 `deflateSync` 编码，经
>   `parseFrameSequence` 与 `decodeFrameSequenceFrame`/`inflateSync` 还原同一 RGBA，
>   再单独翻转保留位 `[5]` 和 `[7]`；不再用 identity 压缩伪造合法帧。
> - R2：删除错桶的 `script-library.cursor-boundaries.test.ts` 及 `a02` 针。
>   `getScriptBody` 在当前 `packages/` 非测试调用域仅有自身定义；原错桶还会被
>   `checkScriptLibrary` 拒绝。A 包第二针改为合法 stamp 的 `a03` col 越界。
> - R3：`script-chunk-store.cursor-boundaries.test.ts` 先由 `deriveScriptChunk`
>   确认实际 owner 为 `shared/c01`，经 `normalizeScriptLibrary` 生成实际 bytes，
>   `checkScriptLibrary(index, chunks)` 正常通过后再断言二次 resolve 缓存命中、
>   旁分片零读与 lease 收尾。
>
> 本人复跑 content 3/3、reforge 2/2、editor 2/2；三包 `tsc --noEmit` 均 exit0；
> 11改动代码文件 Biome 0；`module-mutants.mjs` 的 a01/a03/b03/b04/c01/c02
> 六针对照绿、指定 fullName 的候选自身 `AssertionError` 红、退出码1、源 hash 未变，
> 判据自测亦通过。`git diff 4c1539bf..bd8876e4`（候选自身相对起点）仅测试/fixture/回执/负控工具，
> 无生产源码、旧测试或覆盖配置改动。
>
> 隔离集成后串行门禁：`pnpm check` exit0（9,966项，lint 2,309文件零问题）→
> `pnpm coverage:ratchet` exit0 → `TYPE_PAL_COVERAGE_BASE_REF=c442dcb7 pnpm coverage:fast`
> 受保护单次 exit0（9,505 fast项、730源码文件）。两次同口径分支
> 46,615/63,323=73.61%，相对接收前46,610/63,321净增5个已覆盖臂、分母+2。
> 范围增量是卡面允许的两个 `src/cursor-pure-fixtures.ts` 测试辅助模块被官方
> 源码扫描计入，不将其误写成产品目标新臂或大幅覆盖率收益。
>
> Cursor 是贡献者，不以其自验替代本接收；当前模式不要求固定三席签字。
>
<!-- original-source-quote:end -->
