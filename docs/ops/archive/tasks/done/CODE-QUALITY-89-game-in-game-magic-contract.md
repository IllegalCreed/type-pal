# CODE-QUALITY-89 — game in-game-magic state / execution boundary

Status: done
Phase: phase1
Capability: Q3 phase1 game core/menu in-game magic
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Codex（独立验收）
Visual Verification Owner: N/A
Visual Verification Timing: e2e-deferred
Contributor: Codex
Branch: codex/code-quality-3y

> 本卡按 [`AGENTS.md`](../../../../../AGENTS.md) 的 Codex 独立验收模式执行；只核四个 in-game-magic 白名单文件，不接管 `menu-driver.ts`、`magic-script.ts`、battle magic 或 draw 实现。

## 目标

证明大世界法术菜单的施法人、法术、目标、取消、光标记忆和 MP 重建状态边界与 SDLPal 一致；确认/脚本/MP 真实副作用由 caller 所有，状态模块只产生合法请求并在失败或错 phase 时 fail-closed。

## 范围

- 范围内:
  - `packages/game/src/core/menu/in-game-magic-menu.ts`
  - `packages/game/src/core/menu/in-game-magic-menu.test.ts`
  - `packages/game/src/core/menu/in-game-magic-menu.boundaries.test.ts`
  - `packages/game/src/core/menu/in-game-magic-menu.glm-phase1-leaves.test.ts`
- 范围外: `menu-driver.ts`、`magic-script.ts`、`event-system.ts`、`draw-magic.ts`、battle-system 及共享 Spell 类型。
- 明确不做: 不改变法术脚本、MP 规则、目标合法性、公共接口、schema/save、资源或 UI 形态。

## 前提真值门

### 一句话行为 / 工程前提

大世界法术菜单按 SDLPal 的四段生命周期运行：多成员先选活施法人，单成员直接进法术列表；法术确认只生成施法请求或目标阶段，目标确认/脚本/扣 MP 由 dispatcher 执行；取消和 MP 耗尽按原版返回层级收口。

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | `PAL_InGameMagicMenu` 单人跳过 caster；活人 HP gate；`PAL_MagicSelectionMenu` 循环；apply-to-all 直接脚本，单目标进入 party picker；取消与 MP 不足返回规则 | `reference/sdlpal/uigame.c:653-875`; `reference/sdlpal/magicmenu.c:301-484` |
| 第一阶段 | 状态模块四 phase、非顺序 party role id、runtime-projected roles、dispatcher/cast helper ownership 已接通 | `in-game-magic-menu.ts:39-56,64-141,147-250`; `menu-driver.ts:856-950`; `game-state.ts:1394-1484,1577-1681` |
| 当前二阶段 | N/A；本批仅 phase1 runtime/menu | N/A |
| 本任务目标 | 四白名单文件用完整 typed fixtures、真实 public state/request oracle 覆盖 phase/cancel/navigation/caster memory/MP refresh/party identity | 四个白名单测试文件 |

### 反证与替代解释

- 最强替代解释: 当前行为是 TS 自定义 UX 而不是 SDLPal；一手 `uigame.c` 的分支、caller 的 runtime projection 和相邻 cov85 dispatcher 链可反证。
- 什么观察会推翻当前前提: primary source 对取消层级、单人快速道、非顺序 party target、MP 耗尽或 static caster cursor 的解释与当前实现不一致。
- 已排查替代根因: runtime projection/hydrate、object-id parser、dispatcher/cast ownership、测试夹具合法性；未发现需要改实现的直接证据。

### 用户可见偏离

- 是否主动偏离已核真值: no
- `before -> after`: N/A（只补强 typed 测试证据）
- 用户裁决: N/A

## 上下文锚点

- 已拍板决策 / 铁律: 逐文件读取；不以 package green 关闭；脚本/MP 副作用不能由状态模块伪造；未知项保留 pending/review。
- 代码锚点: `in-game-magic-menu.ts:64-306`; `menu-driver.ts:856-950`; `magic-script.ts:225-251`; `draw-magic.ts:220-359`。
- 已知坑 / 审计文档: CODE-QUALITY-50 draw-magic 历史卡；CODE-QUALITY-88 magic-select object-id 结论；shared Spell.id 旧注释仍 pending。
- 不得重新引入: 按静态 catalog 读取 runtime HP/MP/magic、把 role index 当 party slot、取消错误退回 caster、MP 成功前扣除、测试使用不完整 `as unknown` 业务 fixture。
- 相关测试: 四白名单测试；`menu-driver.test.ts`、`menu-driver.cov85.test.ts`、`magic-script.test.ts`、draw-magic tests。

## 验收条件

- 功能: 完整读取四文件；验证 caster/phase/target/cancel/memory/refresh/party identity/empty state/cursor clamp。
- 测试: 定向 + dispatcher/script/draw 相邻回归；完整 typed fixtures；3 个精确反控；game typecheck/Biome。
- 文档: 任务卡、board、ledger、evidence、tasks index 和 semantic hashes 一致。
- 视觉 / E2E: N/A；功能性绘制已有相邻证据，剧情视觉延后。

## 当前模式推进记录

### 进入 build 前：Codex 核定

- Coding Owner / 隔离工作树 / 修改白名单: Codex / `/Users/zhangxu/illegal/type-pal-quality-3x` / 四个白名单文件及本卡、证据、账本。
- 前提核验: verified（SDLPal、runtime projection、dispatcher caller 直接证据）。
- 范围、设计和验收条件: agree（测试证据强化；不改生产行为）。
- 高风险用户产品裁决: N/A（不主动改变机制/schema/public API）。
- build 准入结论: Codex build allowed

### 进入 done 前：独立验收

- 贡献者交付与自验: accepted（Codex 同一 Owner；仅测试 fixture 改动）
- Codex 独立复核: accept（完整 caller/primary source 证据、3 针反控与全部质量门）
- 用户体验/产品验收: N/A（状态合同）
- done 准入结论: Codex done allowed；固定三贤人签字不再是当前门禁

## Build: 实现与自测

- Coding Owner: Codex
- 修改文件: `in-game-magic-menu.test.ts`、`in-game-magic-menu.boundaries.test.ts`；生产 `in-game-magic-menu.ts` 和 leaves 测试逻辑未改。
- 实现摘要: 移除不完整 `as unknown` fixture，补齐完整 typed role/spell/magic；增加 battle-only spell 的 Magic 关联，使 outside filter 反控真实可判别。
- 运行命令: 定向/相邻 9 files / 158 tests；白名单 3 files / 37 tests；game typecheck/Biome；3 针隔离 mutation；`pnpm check`；`pnpm coverage:ratchet`；`pnpm check:fast`；`pnpm lint`；`pnpm check:docs`；ledger。
- 跳过的检查及原因: 全量门待语义复核完成后集中运行。

## Review: 审查与返工

- Reviewer: Codex
- 审查结论: 四个白名单文件完整读取；状态 phase、party role identity、取消、光标记忆、MP refresh 与脚本 ownership 均与 SDLPal/真实 caller 一致，未发现生产直接缺陷。
- 必须返工项: 发现机制真值/用户行为冲突时停止，升级高风险卡并保持本卡 review。
- Accept / rework: accept

## 交接日志

- 2026-10-14 Codex: 重新完整读取四白名单文件、menu-driver dispatch、runtime hydrate/project、magic-script、draw caller 与 SDLPal `uigame.c`/`magicmenu.c`；发现三份状态测试存在不完整 `as unknown` fixture，已改为完整 typed PlayerRole/Spell/Magic，并补齐 battle-only spell 的 Magic 关联以验证 outside filter。Evidence: [evidence](../../../evidence/CODE-QUALITY-89/README.md)。Next: 无，四条记录已关闭；script/MP caller、battle magic、draw 与 shared Spell 类型留后续 pending。
- 2026-10-14 Codex: 定向/相邻 9 files / 158 tests、白名单 3 files / 37 tests、game typecheck/Biome 通过；3 针隔离反控均业务红→恢复绿且源哈希一致。全仓 `pnpm check`、official ratchet、`pnpm check:fast`、lint-zero、docs/content-review、ledger 全部 exit 0；coverage baseline 未变。账本 3,270：closed 368、review 9、pending 2,893。

## 下一位 Agent 提示词

无，等待下一批从最新 ledger 选择互斥 pending 文件。
