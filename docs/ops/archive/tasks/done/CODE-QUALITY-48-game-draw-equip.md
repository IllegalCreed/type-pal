# CODE-QUALITY-48 — game draw equip 窄批

Status: done
Owner: Codex
Reviewer: Codex（独立验收）
Phase: phase1 game
Capability: Q3 present/menu
Visual Verification Timing: e2e-deferred（菜单观感留集中 E2E；本批核 framebuffer、布局、状态投影合同）

## 目标

逐文件核验装备菜单绘制实现及其两份边界/像素测试，确认 phase/list 与 phase/pick-role 的状态 ownership、资源缺失行为、角色可装备四色、装备槽/属性/数量投影和 framebuffer 边界均与一阶段真值一致；没有直接证据时保持 pending/review，不因包级通过关闭文件。

## 范围

- `packages/game/src/present/menu/draw-equip.ts`
- `packages/game/src/present/menu/draw-equip.glm-phase1-leaves.test.ts`
- `packages/game/src/present/menu/equip-role-pixels.grok-r1.test.ts`

相邻 caller/oracle 只读核对：`packages/game/src/present/menu/draw-menu.ts`、`packages/game/src/present/present.ts`、`packages/game/src/core/menu/equip-menu.ts`、`packages/game/src/core/menu/menu-driver.ts`、`packages/game/src/present/__tests__/grok-present/p03-equip.test.ts`；这些文件不在本批账本关闭范围。

## 前提真值门

- 一句话行为 / 工程前提：`drawEquipMenu` 只把现有 `EquipMenuState` 与运行时角色/物品资源投影到 framebuffer，必须保持 SDLPal 装备列表复用、选人页布局、四色可装备状态和缺资源安全边界。
- 真值来源：`reference/sdlpal/uigame.c:1793-2055`（背景、图标、装备槽、属性、角色框、四色、数量）；`reference/sdlpal/itemmenu.c:28-224`（列表绘制、选择色、数量与图标）；`reference/sdlpal/play.c:350-357`（调用链）；`packages/game/src/core/menu/equip-menu.ts:28-111`（当前状态合同）。
- 当前 `before` -> 目标 `after`：现有装备绘制与测试保持用户可见行为不变 -> 逐文件证据、反例和质量门补齐后将本批 3 个文件登记为已验证。
- 最强替代解释 / 什么观察会推翻前提：`draw-equip` 可能把状态快照、角色 ID、资源缺失或边界条件误当作可信输入；若 caller 传入的 phase/selectedItemId/party 或 primary source 显示不同 ownership，或定向反例发现静默绘制错误，则本批留在 review/rework，不关闭文件。
- 是否主动偏离已核真值：N/A（仅审计与账本记录，不改产品行为、schema、资源格式或公共接口）。

## 上下文锚点

- `draw-menu.ts:177-198` 是装备菜单公共绘制出口，只有 `playerRoles` 存在才调用实现；`present.ts:680-705` 负责把 runtime role projection、items、icons、equipBg 注入。
- `equip-menu.ts:43-111` 定义 list/pick-role/done 生命周期；`menu-driver.ts:755-850` 负责确认、换装脚本和回列表，不由绘制层拥有。
- `draw-equip.ts:110-279` 复用 `drawInventoryMenu`，pick-role 依次读取 `equipBg`、BALL icon、runtime equipment/stat、party role、inventory count；不允许绘制层写回状态。
- 现有 `p03-equip.test.ts` 是主要 caller/oracle；本批两份测试补齐非顺序 party、未知装备、单人框高、done/缺目录/数量零/运行时数量和属性行等反例。菜单观感不在本批重复跑剧情 E2E。

## 验证

- 测试质量：每个断言必须对应合法 typed 输入、真实 `drawEquipMenu` caller 或直接 framebuffer oracle；检查反例判别力、既有 P03 合同排重、输入快照隔离和时间冻结；不以测试数量或覆盖率单独验收。
- 定向：`p03-equip.test.ts`、`draw-equip.glm-phase1-leaves.test.ts`、`equip-role-pixels.grok-r1.test.ts`。
- 相邻：game present/menu 与 game 全包、game typecheck。
- 全仓质量门：`pnpm check`、`pnpm coverage:ratchet`、`TYPE_PAL_COVERAGE_BASE_REF=origin/main pnpm coverage:fast`、`node scripts/quality/lint-zero.mjs`、`node scripts/docs/check-content-review.mjs --strict`、`git diff --check`、`node scripts/quality/code-quality-ledger.mjs`。

## 当前模式推进记录

- Codex 范围/前提核验: verified（已直接读取 primary source、caller、状态和 3 个目标文件，并完成定向、相邻与全仓质量门）
- 受委派 Coding Owner / 隔离分支: Codex / `/Users/zhangxu/illegal/type-pal-quality-3x` / `codex/code-quality-3y`
- build 准入: Codex build allowed（仅核验与治理文档；若发现行为缺陷立即停线，不直接修复跨边界问题）
- 贡献者交付/自验: N/A（Codex 直接执行）
- Codex 独立验收: accept（已完整读取 3 个范围文件、primary source、生产 caller、状态生命周期与相邻 oracle；未发现直接缺陷）
- 用户产品裁决/体验验收: N/A（不改变用户可见行为；菜单视觉仍登记集中 E2E）
- done 准入: Codex done allowed；本批仅作审计与治理记录，没有产品代码、schema/save、资源格式或公共接口变更。

## 交接

- 2026-10-12 Codex：从最新 `origin/main` 同步后建立窄批。当前分支与 `origin/main` 为 ahead 14 / behind 0；基线 ledger 为 3266 files / 259 closed / 5 review / 3002 pending。已完整读取 3 个范围文件、`draw-menu.ts`、`present.ts`、`equip-menu.ts`、`menu-driver.ts`、P03 caller/oracle 与 `reference/sdlpal/uigame.c:1793-2055`、`itemmenu.c:28-224`、`play.c:350-357`。发现的问题：未发现直接缺陷；未修问题：无。定向 Vitest 3 files/16 tests、game typecheck、game 311 files/3519 tests、全仓 `pnpm check`（content149/1498、shared16/131、game311/3519、pal-extract70/423、reforge359/8964、editor631/4951、migrate96/739）均通过；coverage ratchet 通过且基线保持，protected fast 通过且 0 项下降；lint-zero 3994 files，error/warning/info 全 0；docs/content review、git diff --check、ledger 均通过。未触碰高风险边界；菜单观感登记集中 E2E 延后。账本更新为 3266 files / 262 closed / 5 review / 2999 pending。下一批候选：`packages/game/src/present/menu/draw-inventory.ts` 及其专属测试，或 `draw-tilemap.ts`（需另开卡并重新核 primary source）。

## 下一位 Agent 提示词

```text
无下一位 Agent；本批已完成并归档，下一批需另开卡、重新核对最新 origin/main 与账本。
```


## Codex 当前复审（2026-10-18）

历史 `done` 不等于本轮验收。本轮在 `codex/code-quality-3y` 上完整读取三个范围文件、P03 caller/oracle、equip/menu 生命周期与 SDLPal `uigame.c:1793-2055`、`itemmenu.c:28-224`、`play.c:328-359`、`global.c:1175-1225`；核对角色顺序/装备位、资源缺失、6 槽/5 stat、数量、颜色、边界和测试排重，未发现可直接证明的实现缺陷。零数量绘制差异因正常库存归零会删除条目且进入 pick-role 有正数量门，作为不可达防御输入保留，不改变 UI 行为。复审状态为 `partial`，不标 `accept`。

验证：直接 3 files / 16 tests passed；相邻 9 files / 167 tests passed；`pnpm --filter @type-pal/game typecheck` passed。coverage ratchet、protected fast、全仓 `pnpm check`、official coverage 本小批未运行，统一门留待完整 game/present 模块收口。证据见 [`48-draw-equip`](../../../../ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/48-draw-equip/README.md)。
