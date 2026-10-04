# CODE-QUALITY-3l - game battle present 逐文件治理

Status: done
Phase: phase1 game
Capability: ops / code-quality
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Codex（独立验收）
Visual Verification Owner: N/A
Visual Verification Timing: dev-functional（战斗 canvas primitive；剧情视觉集中 E2E）
Contributor: Codex
Branch: codex/code-quality-governance
Base: `c740b4a48`

## 目标与范围

逐文件核验 game battle present 的背景、特效、数字弹幕、结算屏、战斗精灵、战斗 UI 和一帧装配器，保持 `reference/sdlpal/battle.c`、`uibattle.c`、`fight.c` 的绘制顺序、坐标、mask、寿命和 UI 形态；只修有直接 caller/primary-source/反例证据的问题。

- 白名单生产文件：`packages/game/src/present/battle/{draw-battle-bg,draw-battle-effect,draw-battle-num,draw-battle-settlement,draw-battle-sprites,draw-battle-ui,present-battle}.ts`
- 对应测试与 caller 只读核对；不改 battle core state/formulas/opcodes、schema/save、剧情 E2E、coverage runner。

## 前提真值门

- 一句话前提：battle present 的每层输出在合法资源和 BattleState 下与已核实 sdlpal 绘制顺序/坐标一致，缺失资源只走明确降级，不污染下一帧或下一场战斗。
- 真值来源：各文件内 `reference/sdlpal/battle.c`/`uibattle.c`/`fight.c` 锚点；`packages/game/src/present/battle/present-battle.ts` 的真实装配 caller；对应 battle tests。
- 当前 before -> 目标 after：`battle present 7 文件仅有分散测试/注释证据 -> 每个文件完成职责、caller、输入域、失败语义和反例记录`。
- 最强替代解释 / 推翻观察：某些空资源分支可能是启动降级或单测 fixture 合同；若 primary source/caller 证明依赖则保留；若 battle overlay/数字/背景在非法尺寸、过期寿命、透明 mask 或跨帧状态上污染输出，则前提被推翻并修复。
- 是否主动偏离已核真值：N/A（不改变战斗 UI 形态、坐标或玩法公式）。

## 上下文锚点

- `AGENTS.md`：逐文件 ledger、硬零诊断、少而精测试、原版真值门。
- `CLAUDE.md`：第一阶段忠实还原、indexed framebuffer/opaque mask、战斗 present 与 core 分层。
- `docs/ops/audits/code-quality-file-ledger.md`：Q3k 后 146 个已闭合、5 个 review、2,813 个尚未核验；本卡不把 game 全包绿灯当逐文件完成。
- 不得重新引入：battle 背景索引 0 被当透明、数字/精灵 mask 丢失、floating number 过期泄漏、战斗 UI 对话期/逃跑期错误显示、present 装配顺序漂移。

## 验证

- 逐文件完整读源码、`present-battle.ts` caller 和 primary source/tests；未知项保留 review。
- 若修代码：定向/相邻 battle present tests、game typecheck、全仓 `pnpm check`、support-mode ratchet、protected fast、Biome 零诊断；不以剧情截图替代战斗合同。

## 当前模式推进记录

- Codex 前提核验：verified（battle present 小域；不触碰 core/save/schema）。
- build 准入：Codex build allowed；只允许白名单窄修。
- 贡献者交付/自验：Codex；定向 14 files/179 tests、game 全包 3400、typecheck 通过；未改实现。
- Codex 独立验收：accept（七个生产文件逐段读取、primary source/caller/测试证据完整；未发现直接缺陷；全仓 `pnpm check`、official ratchet、protected fast、Biome 零诊断通过）。
- 用户产品裁决/体验验收：N/A（不改 UI 形态/玩法）。
- done 准入：Codex done allowed；提交 `b0c171c28` 已推送，独立 diff/status 核对通过；本卡只关闭七个 battle-present 文件，不代表 battle core/menu/dialog 或全仓治理完成。

## 交接日志

- 2026-10-05 Codex：Q3k 已归档；开始 battle present 七文件窄批，先核 primary source、装配顺序和真实测试，再决定是否修实现。
- 2026-10-05 Codex：七个 battle-present 生产文件与 `present-battle.ts` 真实 caller 逐段核验；未发现需修的直接证据问题。定向 179、game 全包 3400、全仓 check/ratchet/protected/lint 全通过。Next: 提交后归档，继续 battle/menu/dialog/core 未核文件。

## 下一位 Agent 提示词

```text
接手任务：CODE-QUALITY-3l game battle present 逐文件治理
任务卡：docs/ops/tasks/CODE-QUALITY-3l-game-battle-present.md
当前状态：build；只能在七个 battle-present 生产文件及对应测试内工作。
你的角色：Codex Coding Owner / 独立验收。
先读：AGENTS.md、CLAUDE.md、本卡、code-quality-file-ledger.md、battle.c/uibattle.c/fight.c 相关锚点、七个生产文件和真实 caller/tests。
请你做：逐文件核输入域/绘制顺序/坐标/mask/寿命/降级；只有直接证据问题才修，不改 battle core/schema/save/UI 形态。
输出要求：每文件 verified/review/blocked；定向、game typecheck、pnpm check、support ratchet、protected fast、lint 全通过后更新账本、提交推送并标 done。
```
