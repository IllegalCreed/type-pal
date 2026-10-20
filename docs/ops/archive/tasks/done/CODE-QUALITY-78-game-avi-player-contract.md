# CODE-QUALITY-78 — game AVI player contract

Status: done
Owner: Codex
Reviewer: Codex（独立验收）
Phase: phase1 game
Capability: Q3 game/shell
Visual Verification Timing: e2e-deferred（视频观感集中验证；本批核生命周期/DOM/键盘合同）

## 目标

逐文件核验 AVI/MP4 播放器及其主/边界测试，确认视频 DOM 生命周期、skip 键消费、500ms 结束窗口、autoplay click fallback、warm-up、音量 ownership 与 SDLPal `PAL_PlayAVI` 约束一致。

## 范围

- `packages/game/src/shell/avi-player.ts`
- `packages/game/src/shell/avi-player.test.ts`
- `packages/game/src/shell/avi-player.glm-next-wave.test.ts`
- 只读相邻 caller/oracle：`avi-player.async-lifecycle.test.ts`、`ending-avi-host.grok-r1.test.ts`、`bootstrap.ts`、`main.ts`、SDLPal `aviplay.c/main.c/uigame.c`。
- 不修改视频资源、用户可见视频形态、公共接口或剧情 E2E 结论。

## 前提真值门

- 一句话工程前提：AVI 播放在 ended/error/skip/autoplay reject 下都必须收敛到单次 cleanup；skip 只消费本次视频输入并保留 SDLPal 的 500ms 缓冲，迟到 Promise 不得重新建立 overlay 或抢当前视频 ownership。
- 真值来源：`reference/sdlpal/aviplay.c:643-747`、`reference/sdlpal/main.c:197-203,237-240`、`reference/sdlpal/uigame.c:157-163`、`packages/game/src/shell/avi-player.ts:1-203`。
- 当前 `before` -> 目标 `after`：现有 AVI player -> 逐段核验并保留已核实行为；本卡无实现改动。
- 最强替代解释 / 推翻观察：若真实浏览器 autoplay/ended 事件顺序或 bootstrap 顺序 await caller 违反测试模型，则需另开媒体生命周期卡；当前 async lifecycle tests 与 callers 未显示直接缺陷。
- 是否主动偏离已核真值：N/A（纯治理核验，无行为改动）。

## 上下文锚点

- `CLAUDE.md` 忠实还原规则；`docs/phase1/engineering-notes.md` 媒体/启动生命周期条目。
- `avi-player.ts:32-178` videoVolume/curVideoEl、cleanup、skip capture、500ms timer、autoplay overlay；`bootstrap.ts:980,1607,1751,1847` 顺序 caller；`main.ts:52` warm-up caller。
- 已知坑：异步 play rejection/resolve 可能迟于 ended 或跨 warm-up/formal video；这些边界由 `avi-player.async-lifecycle.test.ts` 直接反控，未用包级通过替代。
- 不得重新引入：迟到结果复活旧 video、overlay 重建、残留 timer 触碰下一段、全局输入泄漏、`curVideoEl` 指向已移除元素。

## 验证

- 完整读取实现 203 行、主测试 152 行、GLM 边界测试 156 行，并读取 async lifecycle 298 行、ending AVI host caller、bootstrap/main callers 与 SDLPal primary source。
- 定向/相邻 32 tests 全绿：创建/ended/error/skip/500ms/volume/autoplay overlay/warm-up/迟到 Promise/跨视频 ownership。
- 无实现改动；未以浏览器剧情 E2E 替代媒体生命周期合同，视频观感留集中 E2E。

## 当前模式推进记录

- Codex 范围/前提核验: verified（实现、caller、primary source、异步生命周期反控直接读取）。
- Coding Owner / 隔离分支: Codex / `/Users/zhangxu/illegal/type-pal-quality-3x` / `codex/code-quality-3y`。
- build 准入: Codex build allowed（只读治理与账本更新；实现白名单为空）。
- Codex 独立验收: accept（定向、相邻、全仓质量门与 ledger 通过）。
- 用户产品裁决: N/A（无行为改动；视频观感集中到 E2E）。
- done 准入: Codex done allowed。

## 交接

- 2026-10-13 Codex：完成逐文件核验；无实现改动。定向 AVI/媒体 32 tests、game 全包 3528、全仓 `pnpm check`、coverage ratchet/protected fast、lint-zero、docs/content review、ledger 通过；未发现直接缺陷。账本收口为 `3267 / 340 closed / 8 review / 2919 pending`。

## 下一位 Agent 提示词

```text
接手任务：CODE-QUALITY-78 game AVI player contract
任务卡：docs/ops/archive/tasks/done/CODE-QUALITY-78-game-avi-player-contract.md
当前状态：done，已归档；无实现改动。下一批请从新的 pending 文件开始，不要把视频剧情 E2E 或 CODE-QUALITY-57 review 当作已关闭。
```

## 2026-10-21 shell生命周期五卡收口

原三文件接受；更正500ms跳过、play拒绝等待重试和warmup不保证永久autoplay等错注。只删测试helper从未调用的rejected模式/分支，三处实际调用、全部用例/断言保持，完整AST证明且4文件26绿。项目现行默认三跳过键合同明确，不冒称完整SDL物理键表。

[当前逐文件A–H、迁移、完整原件及集中门](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/shell-lifecycle-local.json)。只接受原卡及明确迁移范围，广域caller/听感/剧情E2E不附带接受；Git发布另以实际交接为准。
