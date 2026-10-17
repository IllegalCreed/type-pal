# CODE-QUALITY-49 — game draw inventory live-zero 行为冲突

Status: done
Owner: Codex
Reviewer: Codex（独立验收）
Phase: phase1 game
Capability: Q3 present/menu
Visual Verification Timing: mixed（功能行为先裁决；菜单观感仍留集中 E2E）

## 目标

核定物品目标层在实时库存数量变为 0 时的 canonical 行为，再决定是否允许修复 `drawInventoryMenu` 及其测试。当前实现、现有测试和 SDLPal primary source 对物品图标/名称是否继续显示存在直接冲突；在用户裁决前不得实现、不得关闭账本文件。

## 范围

- `packages/game/src/present/menu/draw-inventory.ts`
- `packages/game/src/present/menu/draw-inventory.glm-phase1-leaves.test.ts`
- `packages/game/src/present/menu/inventory-list-pixels.grok-r1.test.ts`

只读上下文：`packages/game/src/present/__tests__/grok-present/p01-inventory-list.test.ts`、`p02-inventory-target.test.ts`、`packages/game/src/core/menu/inventory-menu.ts`、`draw-menu.ts`、`menu-driver.ts`。

## 前提真值门

- 一句话行为 / 工程前提：目标层每帧读取 `PAL_GetItemAmount(wItemToUse)` 的实时数量；当数量变为 0 时，SDLPal 不再绘制目标物品图标/名称/数量并在输入循环后返回取消，当前 TS 只省略数量而保留图标/名称。
- 四向真值矩阵：
  - 原版/primary source：`reference/sdlpal/uigame.c:1401-1419` 只在 `i > 0` 内绘制 BALL、名称和数量；`:1468-1470` 对 `i <= 0` 返回取消。
  - 第一阶段当前实现：`packages/game/src/present/menu/draw-inventory.ts:252-274` 无条件画图标和名称，仅以 `amount > 0` 守卫数字；`packages/game/src/core/menu/menu-driver.ts:688-743` 负责 live count 与目标确认生命周期。
  - 当前测试 oracle：`packages/game/src/present/menu/inventory-list-pixels.grok-r1.test.ts:192-210` 明确要求数量为 0 时仍画 `STATUS_COLOR_EQUIPMENT` 物品名；这与 primary source 相反。
  - 本任务目标：在不猜测产品意图的前提下，由用户裁决保持现有 TS 观感，或对齐 SDLPal 的隐藏/退出语义；裁决前保持 blocked/review。
- 当前 `before` -> 候选 `after`：当前最后一件物品被外部/脚本消耗后目标层仍显示图标和名称、无数字；候选 A 保持该现行行为，候选 B 按 primary source 隐藏图标/名称并让目标层结束。代表场景：目标选择层打开时，脚本或同帧消费最后一件药品。
- 最强替代解释 / 什么观察会推翻前提：TS 可能有意保留名称作为 stale selection 的用户提示，或 dispatcher 可能在绘制后立即清栈；需端到端复现确认。若现行产品约定明确要求保留名称，或真实 caller 在 `i <= 0` 时不允许继续渲染，则可选择 A；否则 primary source 支持 B。
- 是否主动偏离已核真值：no；用户于 2026-10-12 明确裁决选择 B：按 SDLPal 对齐，范围限定为大世界使用物品目标层。

## 上下文锚点

- `drawInventoryMenu.ts:245-274` 同时负责目标层框、图标、名称、实时数量；当前数量守卫只包 `drawNumber`。
- `inventory-menu.ts:267-274` 与 `drawItemUseMenu` 共用 live inventory ownership；`menu-driver.ts:697-743` 负责目标确认、脚本消费、保留/恢复 menu phase。
- `p01`/`p02` 是真实 `drawInventoryMenu` caller/oracle；目标层现有测试覆盖 live count、noDesc、角色属性和缺资源边界，但零数量 oracle 与 primary source 矛盾。

## 验证

- 已完整读取范围实现、三份目标测试、P01/P02 caller/oracle、状态机、公共绘制出口和 primary source；已运行失败反例并完成修复验证。
- 已完成用户裁决；必须先写失败反例，再按选定语义修复并运行定向、相邻 game、全仓 check、coverage ratchet、protected fast、lint-zero、docs/content review 和 ledger。
- 该差异涉及用户可见菜单行为与第一阶段机制真值，属于高风险边界；不触碰 schema/save/asset pipeline，但仍需用户产品裁决。

## 当前模式推进记录

- Codex 范围/前提核验: verified（直接证据显示实现/测试与 primary source 冲突）
- 受委派 Coding Owner / 隔离分支: Codex / `/Users/zhangxu/illegal/type-pal-quality-3x` / `codex/code-quality-3y`
- build 准入: Codex build allowed（用户裁决已明确选择 B；Coding Owner 仅为 Codex，先反例后修复）
- 贡献者交付/自验: N/A
- Codex 独立验收: accept（失败反例、修复、真实 caller、相邻回归与全部质量门完成）
- 用户产品裁决/体验验收: 已裁决（2026-10-12：大世界目标层数量归零时按 SDLPal 隐藏物品内容并结束目标层）
- done 准入: Codex done allowed；仅修改大世界目标层绘制，不改退出状态机、schema/save、资源格式或公共接口。

## 交接

- 2026-10-12 Codex：用户裁决选择 B（大世界按 SDLPal 对齐）。先运行失败反例，旧实现确实在数量 0 时画出 BALL 图标；随后把 `drawItemUseMenu` 的图标/名称/数量统一置于 live `amount > 0` 分支，保留目标框与角色信息，退出仍由 `menu-driver.ts:697-704` 的既有 auto-cancel 负责。定向 4 files/22 tests、game typecheck、game 全包 311/3519、全仓 `pnpm check`（editor631/4951、migrate96/739，其余包全绿）均通过；coverage ratchet 通过并只升不降更新 baseline（总 70529/78702 statements、51368/61539 branches、13382/14986 functions、63015/68886 lines，731 files/19816 tests），protected fast 通过且 0 项下降；lint-zero 3994 files、error/warning/info 全 0；docs/content review、git diff --check、ledger 均通过。未触碰 schema/save/asset pipeline；视觉观感仍登记集中 E2E。账本更新为 `3266 files / 265 closed / 5 review / 2996 pending`。下一批候选：`packages/game/src/present/menu/draw-magic.ts` 及其专属测试（已完成只读 primary-source 核验，需另开卡），或 `draw-tilemap.ts`。

## 下一位 Agent 提示词

```text
接手任务：CODE-QUALITY-49 game draw inventory live-zero 行为冲突
任务卡：docs/ops/tasks/CODE-QUALITY-49-game-draw-inventory.md
当前状态：done，用户已裁决选择 B（大世界按 SDLPal 对齐）
你的角色：无下一位 Agent；本批已完成归档
先读：本卡、AGENTS.md、CLAUDE.md、reference/sdlpal/uigame.c:1398-1470、draw-inventory.ts:245-274、inventory-list-pixels.grok-r1.test.ts:192-210、menu-driver.ts:688-743
请你做：下一批另开任务卡并从最新 origin/main 重新核对范围与账本
不要做：不得把本卡历史提示词当作新的实现授权
输出要求：无下一位 Agent 提示词，等待下一批治理任务
```


## Codex 当前复审（2026-10-18）

历史 `done` 不等于本轮验收。用户已批准大世界目标层 live-zero 按 SDLPal 对齐。本轮在 `codex/code-quality-3y` 上完整读取实现、三份范围测试、P01/P02 caller/oracle、inventory/menu 生命周期与 SDLPal `uigame.c:1289-1473`、`itemmenu.c:28-310`、`play.c:268-323`；确认绘制层 live count 分支和 dispatcher 的零数量 auto-cancel 与 primary 一致，未发现新的实现缺陷。

当前测试环境仍有 `inventory-list-pixels.grok-r1.test.ts` 的 G06-A12 `document is not defined`：该文件 12 tests 中 11 passed、1 failed；未修改环境、未静音，文件保留 `review`。其余相关测试 10 files / 190 tests passed，game typecheck passed。复审状态为 `partial`，不标 `accept`。证据见 [`49-draw-inventory`](../../../../ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/49-draw-inventory/README.md)。
