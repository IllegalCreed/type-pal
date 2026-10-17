# CODE3o mode / history / poison / search 当前复审切片

2026-10-18 当前勘误：Search阈值是最大检查点，mode1=0..2、mode2=0..8、mode3=0..12；原“反直觉/没有改成越远越容易”定性错误，现修源码/测试注释与精确边界oracle。旧test没有真正钉normal边界/最远far或first-hit优先级，不能沿用为已证。毒Wear非压缩对照已另开高风险卡；下方原报告按历史保留，当前[源/测试/原生片段证据](../core-comment-audit/README.md)不重签3o整卡。

基点：`c3a45d137`；分支：`codex/code-quality-3y`。本片重新复审 3o 四个 core helper及真实 caller/oracle，不把历史 done、旧 package green 或旧统一门记录当作当前整卡验收。3o 当前复审提升为 `partial`，未标 accept/done。

完整读取：

- `dialog-history.ts`、`mode.ts`、`player-poison-state.ts`、`scene-system-search.ts`；
- `dialog-history.test.ts`、`mode.test.ts`、`scene-system-search.test.ts`、`menu/menu-mode.test.ts`、`dependency-ownership.test.ts`。

caller / 生命周期读取：`event-system.ts` 的历史写入、毒查询/施加/解毒和 mode 等待；`scene-system.ts` 的 Confirm search 入口、`menu-mode.ts` 的 mode resume；`bootstrap.ts` 的历史恢复与 poison catalog 注入。primary 核对 `play.c:25-215,362-510,534-610` 的 GameUpdate/Search/13-cell/trigger 语义，`global.c:1420-1685` 的 party-slot poison/add/cure/level99 规则，`scene.c:503-507` 的 fade-in gate，并对照 `CLAUDE.md`/第一阶段机制文档的状态 ownership。

结论：历史环形缓冲（trim/连续去重/map 维度/CAP/老档清理）、mode autoScript gate 与同 tick event 再驱动、party-slot poison dedup/level99/runner/cure、以及 Search 13 cell/网格 h/trigger mode/first-hit 均与当前 caller 和 primary 一致；未发现新的可证伪实现缺陷。Search 中反直觉的 `mode * 6 - 4 < i` 已按 C 保留，没有凭直觉改成“越远越容易”。毒实现仍把 party position 作为 key，未把 roleId 当槽位；跨角色/离队取舍留给已有 CODE53 边界，不在本片扩张。

验证：直接 helper / ownership 五文件 `45 passed`，其中 mode fixture 会输出一条预期 `console.warn`（故障脚本 IP 越界后回 explore）；相邻 event/scene/battle 八文件 `667 passed`，另有既有 fixture 的预期 warning（未知 label、无当前对象、越界 scene object）。`pnpm --filter @type-pal/game typecheck` 通过；由于相邻测试仍有运行时诊断，本片不宣称诊断清零。coverage、official ratchet、protected fast、全仓 `pnpm check` 未在此小批运行。

高风险边界：触及第一阶段 mode/history/poison/search 生命周期与 party-slot ownership；没有改变产品取舍、schema/save、公共接口、生成物或 UI。统一门与相邻预期诊断仍需后续模块窗口收口。
