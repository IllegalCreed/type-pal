# TEST-CURSOR-PURE-WAVE-1 · Codex 独立接收

Status: historical
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-17
Template: archive-record-v1 / 1.0.0

本页把 testing archive 材料接入 archive-record-v1。原任务日期、状态、合同、测试数字、失败、counter、机器字段、链接和未执行项在 quote 中保全；本次不授 runtime/E2E/视觉/coverage 信用。

## 历史范围

- 源 revision 01662fc0b7f4ffd01b8d0c4abe560972b7f7a7ab；本轮 R72。此文件属于 testing archive 历史层，不能单独授权当前测试或发布。

## 原始结论

- TEST-CURSOR-PURE-WAVE-1 · Codex 独立接收：原始正文完整保留于下方 quote；本轮只改变文档封套，不改变原始结论。

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

固定 source revision `01662fc0b7f4ffd01b8d0c4abe560972b7f7a7ab`，source SHA `ef63755e52ba8cbfd2ff44432920475565e1174462eb8a6c946b26f8492c3a21`；下方 quote 可逆回原始 UTF-8 字节。
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
