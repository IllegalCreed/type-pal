# CODE-QUALITY-3n - game core fade / identity / catalog 逐文件治理

Status: done
Phase: phase1 game
Capability: ops / code-quality
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Codex（独立验收）
Visual Verification Owner: N/A
Visual Verification Timing: N/A（纯 state/helper；剧情视觉延后）
Contributor: Codex
Branch: codex/code-quality-governance
Base: `60ef9e0f0`

## 目标与范围

逐文件核验 `palette-fade.ts`、`scene-identity.ts`、`word-lookup.ts`、`script-catalog.ts` 及直接测试/ caller；保持 fade 的一阶段 palette 数学、当前 map ownership、WORD.DAT fallback 和全局脚本 catalog/已批准 zero-item overlay 边界。

- 白名单生产文件：上述 4 个 `packages/game/src/core` 文件。
- 直接测试：`palette-fade.test.ts`、`word-lookup.test.ts`，以及 event-system/bootstrap/scene callers 的相邻合同。
- 范围外：battle-system、scene-system、save/schema、生成物、剧情 E2E、coverage runner。

## 前提真值门

- 一句话前提：fade/identity/catalog helper 的状态 ownership 和失败/fallback 行为与现行第一阶段 caller/primary source 一致，不用额外抽象覆盖未知存档或脚本语义。
- 真值来源：`reference/sdlpal/palette.c`、`text.c`、`script.c`；`packages/game/src/core/event-system.ts` fade/catalog caller；`packages/game/src/shell/bootstrap.ts` map/word/global-events 注入点；对应 tests。
- 当前 before -> 目标 after：`四个小模块的 caller/primary evidence 分散 -> 每个文件有职责、输入域、风险与验证结论`。
- 最强替代解释 / 推翻观察：zero-item fixup 是已批准 tp overlay，WORD fallback 是启动降级，fade delay 由 event-system 归一；若 raw/caller 证明这些边界不是既定合同，才升级修复。
- 是否主动偏离已核真值：N/A（本批无行为/产品取舍）。

## 上下文锚点

- `AGENTS.md`：逐文件 ledger、硬零诊断、上游/生成物边界和少而精测试。
- `CLAUDE.md`：第一阶段 palette/script/原版数据真值与 overlay 规则。
- `docs/ops/audits/code-quality-file-ledger.md`：Q3m 后 178 已闭合、5 review、2,781 尚未核验；不得把 package green 当文件验收。
- 不得重新引入：fade/dither 两套状态混用、map identity 回退到 scene id、WORD 表越界伪成功、global script slice/zero-item overlay 旧版本 fallback。

## 验证

- 逐文件读生产源码、真实 caller、primary source 和测试；未知风险保留 review。
- 若修代码或改变合同：定向/相邻 game tests、game typecheck、全仓 `pnpm check`、support ratchet、protected fast、Biome 零诊断；纯审计也记录实际门禁结果。

## 当前模式推进记录

- Codex 前提核验：verified（四文件小域，caller/primary source 已列）。
- build 准入：Codex build allowed；仅 direct evidence 窄修。
- 贡献者交付/自验：Codex；完整 palette/word/ownership/cross-module 定向合同 34 tests 通过，game 全包 3400，typecheck 通过。
- Codex 独立验收：accept（直接发现并修复 script-catalog inherited label lookup 缺陷；own-property/null-prototype negative contracts；全仓 `pnpm check`、official ratchet、protected fast、Biome 零诊断通过）。
- 用户产品裁决/体验验收：N/A。
- done 准入：Codex done allowed；待提交推送和独立工作树核对；本卡只关闭四个 core helper，不代表 scene/event/system/menu/save 或全仓治理完成。

## 交接日志

- 2026-10-05 Codex：Q3m 已归档；开始 fade/identity/catalog 小批，先确认 event-system/bootstrap ownership 再决定是否修实现。
- 2026-10-05 Codex：四个 core helper 逐文件核验；script-catalog 发现原型属性可被误当 label IP，已以 own-property/null-prototype 最小修复并补 3 组负控；palette/scene identity/WORD lookup 无其它直接缺陷。定向 34、game 全包 3400、全仓 check/ratchet/protected/lint 全通过。Next: 提交后归档，继续 scene/event/system/menu 未核文件。
- 2026-10-05 Codex：修复后第二轮全仓 `pnpm check`、ratchet、protected fast、Biome 零诊断全通过；game 3403/full coverage tests 19285。准备归档本卡，继续 scene/event/system/menu 未核文件。

## 下一位 Agent 提示词

```text
接手任务：CODE-QUALITY-3n game core fade / identity / catalog 逐文件治理
任务卡：docs/ops/tasks/CODE-QUALITY-3n-game-core-fade-identity-catalog.md
当前状态：build；只能在四个白名单生产文件及对应 tests/callers 内工作。
你的角色：Codex Coding Owner / 独立验收。
先读：AGENTS.md、CLAUDE.md、本卡、code-quality-file-ledger.md、palette.c/text.c/script.c 锚点、event-system/bootstrap callers。
请你做：逐文件核 fade math/state、map identity、WORD fallback、global catalog/overlay ownership；只有直接证据问题才修。
不要做：不得修改 scene-system/battle-system/save/schema/生成物/E2E/coverage runner，不得凭猜测删除 overlay/fallback。
输出要求：每文件 verified/review/blocked；定向、game typecheck、pnpm check、support ratchet、protected fast、lint 全通过后更新账本、提交推送并标 done。
```
