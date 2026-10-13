# CODE-QUALITY-87 — game in-game/system menu state contract

Status: done
Owner: Codex
Phase: phase1 game core/menu
Capability: overworld hub/system menu labels, cursor memory and confirm/switch phases
Visual Verification Timing: e2e-deferred（功能性菜单状态合同；像素形态沿用既有 present 证据）

## 范围与前提

白名单仅：

- `packages/game/src/core/menu/in-game-menu.ts`
- `packages/game/src/core/menu/in-game-menu.test.ts`
- `packages/game/src/core/menu/in-game-menu.boundaries.test.ts`
- `packages/game/src/core/menu/in-game-menu.glm-phase1-leaves.test.ts`

单一 Coding Owner 为 Codex。本批只做逐文件语义核验，不改生产实现、公共接口、schema/save、资源或用户可见形态。CODE53/57/79/80/81 不占用白名单，CODE84/85/86 已收口。
开批基线为 `origin/main=646c8097034e4bd30a3ebde86cd61d46a2382e8a`，隔离分支为 `codex/code-quality-3y`。

一句话前提：大世界主菜单和系统菜单必须按 SDLPal 的真实 WORD id/label、环绕 cursor、跨次 cursor memory、系统保存/读取/音效开关/退出阶段推进；非法 cursor 或错 phase 不能误触发子菜单、持久化或退出副作用。

| 方向 | 直接证据与判断 |
|---|---|
| primary source | `reference/sdlpal/uigame.c:878-919` 的 inventory action、`:922-1048` 的主菜单与 cursor callback、`:500-651` 的系统菜单/保存/开关/退出；`reference/sdlpal/ui.c:401-585` 的 PAL_ReadMenu 环绕与取消/确认输入。 |
| 第一阶段 | 四条白名单文件；`menu-driver.ts:457-620` 主/系统 dispatcher；`game-state.ts:57-74,1002-1008,1917-1920` menu stack/cursor ownership；`draw-menu.ts`、menu-driver/draw-menu tests 与 P05 menu-stack oracle。 |
| 第二阶段 | N/A；本批只覆盖 `packages/game` 第一阶段运行时。 |
| 目标 | 证明两个菜单的真实 label/id、choice mapping、default cursor、环绕导航、confirm/switch 状态字段和错 phase 行为；未知问题保持 review/pending，不以包级全绿替代逐文件证据。 |

## 逐文件核验记录

### `in-game-menu.ts`

完整读取 141 行。主菜单使用 WORD id `[3,4,5,6]`，系统菜单使用 `[11,12,13,14,15]`；label 统一从 `getWord` 读取并有 fallback；default cursor 只接受合法正索引，导航复用环绕 primitives；系统 confirm/switch 阶段只改变 state，副作用由 dispatcher 所有。未发现直接缺陷。

### 三份测试

完整读取三份测试。主测试覆盖真实 id/词表、菜单顺序、cursor memory、choice mapping；boundary 覆盖 confirm/switch 字段与 id mapping；leaves 覆盖两菜单首尾环绕、负/越界 cursor、词表文案。断言均观察 public state/choice oracle，按合同排重。

## 生产 caller / primary source 核验

`menu-driver.ts:457-620`、`game-state.ts` cursor/menu ownership、`draw-menu.ts` 与 P05/menu-driver/draw-menu 相邻测试已读；SDLPal `uigame.c` 主/系统菜单、`ui.c` PAL_ReadMenu 已对照。保存/读取/音乐/音效/退出实际副作用属于 dispatcher/壳层，本批不代替相邻文件治理。

## 发现与停止线

- 当前未发现白名单实现或测试直接缺陷。
- 若发现 save/load schema、音频壳层、退出/恢复或用户可见菜单形态需要改变，立即另开高风险卡，不在本批猜测修改。

## 验证计划

- 定向/相邻：四份 in-game-menu 测试、menu-driver/draw-menu/P05 menu-stack 合同。
- 受影响 typecheck 与四条白名单 Biome；随后全仓 `pnpm check`、官方 coverage ratchet、protected fast、lint-zero、docs/content-review、ledger。

## 推进记录

Codex：premise verified / build allowed。当前无实现改动；完成全部质量门后再决定四条记录是否关闭。

## 实际验证记录

- 定向/相邻：7 个测试文件、72 tests 通过；save-slot stdout 是已有相邻 caller oracle。
- game typecheck 通过；四条白名单 Biome 通过且无诊断。


## 验证结果

- 定向与相邻测试：7 个测试文件、74 tests 通过；save-slot stdout 是已有相邻 caller oracle。
- game typecheck、四条白名单 Biome 通过且无诊断。
- 全仓 `pnpm check`：docs/tool、7 包 typecheck/test、lint-zero 全部通过；content 149/1498、shared 16/131、game 314/3552、pal-extract 71/431、reforge 359/8964、editor 631/4951、migrate 96/739；4010 files lint，0 errors / 0 warnings / 0 infos。
- 官方 `pnpm coverage:ratchet`：731 source files / 19857 tests；总覆盖率保持 statements 89.93%、branches 83.65%、functions 89.50%、lines 91.81%；仅记录两项合法的 in-game-menu 测试范围变化。
- `pnpm check:fast`：文档/工具门、7 包 typecheck/test、lint-zero 全部通过；editor 631/4951、migrate 96/739 通过。
- docs/content-review strict、ledger、`git diff --check` 均通过；未降低规则或阈值。

## 推进与收口记录

- Codex 独立验收：四个白名单文件完整读取，并核对真实 menu-driver/GameState/draw-menu caller 与 SDLPal uigame/ui primary source；未发现白名单生产实现直接缺陷。
- 测试证据补强：确认框补齐已有 Yes 状态重置反例；choice mapping 改为重排合法菜单项后按 WORD id 解析；词表状态统一 before/after 清理；拆分开关初始化合同。
- 仅测试与官方 coverage baseline 记录发生变化，未修改生产实现、schema/save、资源、公共接口或用户行为。

## 剩余与交接

- CODE-QUALITY-53/57/79/80/81 与其余 Q3 core/present/shell/analytics/tools 文件保持原状态；当前账本应为 3270 files：closed 360、review 9、pending 2901。
- 无下一位 Agent 提示词；从最新 ledger 选择下一组不重叠的 2–4 个 pending 文件继续。
