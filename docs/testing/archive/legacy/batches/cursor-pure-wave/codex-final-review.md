# TEST-CURSOR-PURE-WAVE-1 · Codex 独立接收

候选：`codex/cursor-pure-wave-r1@bd8876e40c964c7cb0b270ec20ae6fc16eab1229`。
结论：**accept**，首轮 [R1–R3 counter](codex-intake-review.md) 已逐项闭合。

- R1：`frame-sequence.cursor-boundaries.test.ts` 使用真实 `deflateSync` 编码，经
  `parseFrameSequence` 与 `decodeFrameSequenceFrame`/`inflateSync` 还原同一 RGBA，
  再单独翻转保留位 `[5]` 和 `[7]`；不再用 identity 压缩伪造合法帧。
- R2：删除错桶的 `script-library.cursor-boundaries.test.ts` 及 `a02` 针。
  `getScriptBody` 在当前 `packages/` 非测试调用域仅有自身定义；原错桶还会被
  `checkScriptLibrary` 拒绝。A 包第二针改为合法 stamp 的 `a03` col 越界。
- R3：`script-chunk-store.cursor-boundaries.test.ts` 先由 `deriveScriptChunk`
  确认实际 owner 为 `shared/c01`，经 `normalizeScriptLibrary` 生成实际 bytes，
  `checkScriptLibrary(index, chunks)` 正常通过后再断言二次 resolve 缓存命中、
  旁分片零读与 lease 收尾。

本人复跑 content 3/3、reforge 2/2、editor 2/2；三包 `tsc --noEmit` 均 exit0；
11改动代码文件 Biome 0；`module-mutants.mjs` 的 a01/a03/b03/b04/c01/c02
六针对照绿、指定 fullName 的候选自身 `AssertionError` 红、退出码1、源 hash 未变，
判据自测亦通过。`git diff 4c1539bf..bd8876e4`（候选自身相对起点）仅测试/fixture/回执/负控工具，
无生产源码、旧测试或覆盖配置改动。

隔离集成后串行门禁：`pnpm check` exit0（9,966项，lint 2,309文件零问题）→
`pnpm coverage:ratchet` exit0 → `TYPE_PAL_COVERAGE_BASE_REF=c442dcb7 pnpm coverage:fast`
受保护单次 exit0（9,505 fast项、730源码文件）。两次同口径分支
46,615/63,323=73.61%，相对接收前46,610/63,321净增5个已覆盖臂、分母+2。
范围增量是卡面允许的两个 `src/cursor-pure-fixtures.ts` 测试辅助模块被官方
源码扫描计入，不将其误写成产品目标新臂或大幅覆盖率收益。

Cursor 是贡献者，不以其自验替代本接收；当前模式不要求固定三席签字。
