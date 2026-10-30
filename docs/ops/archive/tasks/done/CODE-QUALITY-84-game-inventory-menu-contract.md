# CODE-QUALITY-84 — game inventory menu state / target contract

Status: done
Owner: Codex
Phase: phase1 game core/menu
Capability: inventory menu navigation and item-use target lifecycle
Visual Verification Timing: e2e-deferred（功能性菜单状态合同；像素形态沿用 CODE49 的集中 present 证据）

## 范围与前提

白名单仅：

- `packages/game/src/core/menu/inventory-menu.ts`
- `packages/game/src/core/menu/inventory-menu.test.ts`
- `packages/game/src/core/menu/inventory-menu.boundaries.test.ts`
- `packages/game/src/core/menu/inventory-menu.glm-phase1-leaves.test.ts`

单一 Coding Owner 为 Codex。本批只做逐文件语义核验与治理记录，不改实现、公共接口、schema/save、资源或用户可见形态；CODE53/57/79/80/81 不占用白名单。
开批基线为 `origin/main=646c8097034e4bd30a3ebde86cd61d46a2382e8a`，隔离分支为 `codex/code-quality-3y`。

一句话前提：物品菜单必须按 SDLPal 的全库存列表、过滤着色、非环绕网格光标和运行时目标/库存状态推进；确认、取消、队伍顺序变化和道具耗尽不能把 role slot 当 role id，也不能把静态快照写回真实库存。

| 方向 | 直接证据与判断 |
|---|---|
| primary source | `reference/sdlpal/itemmenu.c:24-460` 的列表初始化、8 键 clamp、数量/过滤色、可用装备追加与确认合同；`reference/sdlpal/uigame.c:1289-1510` 的 `PAL_ItemUseMenu` 目标 slot 记忆、运行时数量与 role 映射；`reference/sdlpal/play.c:244-325` 的单体/全体物品脚本与消耗循环。 |
| 第一阶段 | `inventory-menu.ts` 全 276 行；`menu-driver.ts:640-744` 真实输入/脚本 caller；`item-select.ts` 全 93 行过滤出口；`draw-inventory.ts:1-390` 读 state/filter/live inventory；`game-state.ts:71-78,680-710,1000-1020` 的 ActiveMenu/GameState/inventory cursor ownership；`event-system.ts:3286-3364` 的 item script/consume/resume 生命周期。 |
| 第二阶段 | N/A；本批只覆盖 `packages/game` 第一阶段运行时，不接触 reforge/editor/content。 |
| 目标 | 证明 `createInventoryMenu`、8 键导航、`confirmInventoryItem`、`confirmInventoryTarget`、`cancelInventoryMenu` 的输入合法性、边界、role identity、状态 ownership、失败传播与生命周期合同；未知问题保持 review/pending，不以包级全绿替代逐文件证据。 |

## 逐文件核验

### `inventory-menu.ts`

- 完整读取 276 行实现。`createInventoryMenu` 复制 `gs.inventory`，按 `filter` 保留全库存并在 usable 大世界入口追加已装备可用物（`count=0,inUse=-1`）；光标只上界 clamp；导航为 3 列×7 行非环绕 clamp。
- `confirmInventoryItem` 只接受可用且 `count-inUse>0` 的选中项，按 `partyMembers` 的 role id 构造目标；死人不禁选，符合复活药入口；`confirmInventoryTarget` 返回真实 role id 并记忆 party slot；cancel 只改变菜单 state，不写回 `gs.inventory`。
- 没有异步、资源句柄或未处理 Promise；模块级 target slot 记忆对应 SDLPal static，不进入存档。未发现直接输入、边界、ownership 或公共接口缺陷。

### `inventory-menu.test.ts`

- 完整读取 389 行。使用真实 `createInitialGameState`、真实 `createInventoryMenu`/navigation/confirm/cancel、typed item/player-role fixtures；覆盖 6-case 颜色、filter 全库存、usable 装备追加、8 键 clamp、空库存、target phase、死人可选和 cancel 回滚。
- 断言直接观察 state/role/item oracle；没有恒真、只 mock caller 或弱覆盖。与 boundaries/leaves 按合同族排重。

### `inventory-menu.boundaries.test.ts`

- 完整读取 105 行。覆盖 `count===inUse` 拒绝、少占用正控、装备中 `count=0/inUse=-1`、非顺序 `[2,0]` 队伍返回 role id、错 phase 零请求、菜单快照不别名真实库存和不改 catalog。
- 这些反例直接区分列表索引、party slot、role id 和真实库存 ownership；未发现无判别力断言。

### `inventory-menu.glm-phase1-leaves.test.ts`

- 完整读取 186 行。按已有测试去重后补起始光标恢复/上界、缺 `inUse` 默认、use-target Up/Down 委派、done/no-op、cancel 记忆 slot 与缺 selected item 防御。
- 使用真实 state factory 和 public functions；没有引入弱测试或产品行为改动。

## 生产 caller / 相邻生命周期

- `menu-driver.ts:640-744` 在每个 menu tick 读取真实 live `gs.inventory`、写 `gs.iCurInvMenuItem`、处理 Menu/Confirm/target 选择，并把物品脚本交给 `startOverworldItemScript`。
- `event-system.ts:3286-3364` 延迟消耗只在脚本成功时扣除；apply-to-all 清空 menu stack，单体脚本结束回 menu，失败保留物品。
- `draw-inventory.ts:130-390` 只渲染 state 快照，但 use-target 的图标/名称/数量从 `gs.inventory` live 读取；CODE49 已闭合数量归零隐藏物品层的像素行为，本批不重复关闭绘制文件。
- `item-select.ts:29-93` 是公开 filter/SelectionMenu 出口；`GameState.menuStack`、`inventory`、`iCurInvMenuItem` 保持现行 ownership。

## 发现与停止线

本批未发现可直接修复的输入、边界、role identity、错误传播、异步取消、资源清理或公共接口缺陷。`menu-driver.ts` 的 live refresh、item script resume 和 `draw-inventory.ts` 的像素合同继续由相邻/历史卡负责，不因本批通过而关闭。若后续发现负的持久化 `iCurInvMenuItem`、同一 item 同时存在背包与装备追加的去重要求，必须先用真实 save/runtime 证据开高风险卡，不在本批猜测修改。

最强替代解释是 party member 数组与角色 catalog id 在某些迁移输入中不一致；当前 PlayerRoles/party callers 与 SDLPal 都以 role id 作为数组索引，且 `[2,0]` 边界 oracle 已直接验证。观察到 catalog index 与 `role.id` 分离或 save hydrate 写入负 cursor 时，前提失效，须停线。

## 验证计划

- 定向/相邻：四份 inventory 测试、`menu-driver.test.ts`、`event-system.test.ts`、`draw-inventory` 相邻像素合同。
- 受影响 typecheck 与四条白名单 Biome；随后全仓 `pnpm check`、官方 coverage ratchet、protected fast、lint-zero、docs/content-review、ledger。
- 退出码为 0 但有静态诊断不算通过；既有测试 stderr 只作证据记录，不作长期诊断豁免。

## 推进记录

Codex：premise verified / build allowed。无实现改动；本批只在完成全部质量门并确认没有直接缺陷后将四条账本记录标为 `已验证`。


## 验证结果

- 定向与相邻测试：9 个测试文件、413 tests 通过；既有 event-system negative-control stderr 均为受测反例输出，不是新增静态诊断。
- 受影响静态门：`@type-pal/game` typecheck 通过；四条白名单文件 Biome 通过且无诊断。
- 全仓 `pnpm check`：docs 1257 Markdown / 6700 local links / 405 tasks、testing docs、phase/lore 184、content review 570、coverage-tools、quality-tools、e2e-tools 395、script-governance 22 全部通过；content 149/1498、shared 16/131、game 314/3550、pal-extract 71/431、reforge 359/8964、editor 631/4951、migrate 96/739 全部通过；lint-zero 4010 files、0 errors / 0 warnings / 0 infos。
- 官方 `pnpm coverage:ratchet`：731 source files / 19855 tests；全仓 statements 89.93% (70837/78771)、branches 83.65% (51539/61610)、functions 89.50% (13415/14989)、lines 91.81% (63295/68938)，基线与阈值未放宽。
- `pnpm check:fast`：上述文档/工具门、7 包 typecheck、content 149/1498、shared 16/131、game 314/3550、pal-extract 71/431、reforge 359/8964、editor 631/4951、migrate 96/739 全部通过；lint-zero 4010 files、0 errors / 0 warnings / 0 infos。
- docs/content-review strict、ledger、`git diff --check` 均通过。

## 推进与收口记录

- Codex 独立验收：四个白名单文件均完整读取，并核对真实 caller、公共出口、相邻类型/生命周期、SDLPal primary source 与测试 oracle；未发现可直接修复的实现或测试缺陷。
- 本批无实现、schema/save、资源、生成物、公共接口或用户可见行为改动；没有触碰高风险边界。
- 四条账本记录在完整证据与全部质量门通过后关闭，任务卡随后归档至 `docs/ops/archive/tasks/done/`。

## 剩余与交接

- CODE-QUALITY-53/57/79/80/81 与其它 Q3 core/present/shell/analytics/tools 文件保持原状态，继续 pending/review/draft；未知的负 cursor、装备重复展示和迁移 id 假设不在本批猜测关闭。
- 当前账本应为 3270 files：closed 348、review 9、pending 2913；全仓专项仍未完成。
- 无下一位 Agent 提示词；从最新 ledger 选择下一组不重叠的 2–4 个 pending 文件继续。
