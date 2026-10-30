# CODE-QUALITY-85 — game shop menu state / transaction contract

Status: done
Owner: Codex
Phase: phase1 game core/menu
Capability: shop buy/sell menu navigation and transaction lifecycle
Visual Verification Timing: e2e-deferred（功能性菜单状态合同；像素形态沿用既有 present 证据）

## 范围与前提

白名单仅：

- `packages/game/src/core/menu/shop-menu.ts`
- `packages/game/src/core/menu/shop-menu.test.ts`
- `packages/game/src/core/menu/shop-menu.boundaries.test.ts`
- `packages/game/src/core/menu/shop-menu.glm-phase1-leaves.test.ts`

单一 Coding Owner 为 Codex。本批只做逐文件语义核验与治理记录，不改实现、公共接口、schema/save、资源或用户可见形态；CODE53/57/79/80/81 不占用白名单，CODE84 inventory menu 已收口。
开批基线为 `origin/main=646c8097034e4bd30a3ebde86cd61d46a2382e8a`，隔离分支为 `codex/code-quality-3y`。

一句话前提：商店菜单必须按 SDLPal 的商品索引、环绕导航、买卖条件、金额/库存原子更新和取消/返回生命周期推进；无钱、无货、边界商品、重复确认和脚本失败不能产生部分交易或把菜单快照误写回真实 GameState。

| 方向 | 直接证据与判断 |
|---|---|
| primary source | `reference/sdlpal/uishop.c`、`reference/sdlpal/play.c` 中商店商品列表、买入/卖出条件、金额与库存更新、返回/取消流程；若具体版本入口不同，记录实际调用文件与行号。 |
| 第一阶段 | `shop-menu.ts` 四份白名单文件；`menu-driver.ts` 真实输入 caller；相邻 shop drawing/event-system/GameState inventory/money ownership；对应 shop tests 与 public exports。 |
| 第二阶段 | N/A；本批只覆盖 `packages/game` 第一阶段运行时，不接触 reforge/editor/content。 |
| 目标 | 证明 shop menu factory/navigation/confirm/cancel 与 buy/sell transaction 的输入合法性、边界、错误传播、状态 ownership、异步取消/资源清理（如适用）和公共接口合同；未知问题保持 review/pending，不以包级全绿替代逐文件证据。 |

## 逐文件核验计划

- 完整读取四个白名单文件；读取真实 `menu-driver`/shop drawing/event-system callers、GameState money/inventory ownership、公共出口和相邻类型。
- 对照 SDLPal primary source 及第一阶段机制/工程经验；为合法购买、无钱/无货、边界索引、取消/失败和重复确认建立真实 caller/oracle。
- 测试只接受直接执行生产 public function 的判别性合同；不以覆盖率、数量或恒真断言关闭文件。

## 发现与停止线

- 若发现 save/schema/migration、生成物/资产管线、公共接口或用户可见交易语义需要改变，立即转高风险任务并暂停实现。
- 若真实 save/runtime 允许负 money、重复商品 id、异步商品资源或迁移期 catalog 与 runtime 不一致，不在本批猜测修复；先记录 evidence 与用户裁决点。

## 验证计划

- 定向/相邻：四份 shop 测试、`menu-driver.test.ts`、相关 event-system/shop drawing 测试。
- 受影响 typecheck 与四条白名单 Biome；随后全仓 `pnpm check`、官方 coverage ratchet、protected fast、lint-zero、docs/content-review、ledger。
- 退出码为 0 但有静态诊断不算通过；既有测试 stderr 只作证据记录，不作长期诊断豁免。

## 推进记录

Codex：premise verified / build allowed。未开始实现；若无直接缺陷，本批只更新证据/账本，不改生产行为。

## 逐文件核验记录

### `shop-menu.ts`

完整读取 103 行。`createBuyMenu` 保留 store 注入后的商品顺序和价格快照；list/confirm 两阶段、非环绕选择由相邻 primitives 提供；买不起或空/不匹配目录不进入确认；确认只返回意图，cash/inventory 由 menu-driver 所有；取消在 confirm 回 list、list 返回 close。未发现输入、边界、错误传播、异步/资源清理或公共接口缺陷。

### `shop-menu.test.ts`

完整读取 187 行。真实 `createInitialGameState`、`tickEventSystem`、`dispatchMenuInput`、`openMenu`、`createBuyMenu`/`createSellMenu` 贯穿 0x0026 开菜单、waiting/ip resume、买一件、买不起、关菜单和卖一件的合同；使用 stores.json 已验证的曾伯商品 ID/价格。移除了无业务效果的 dead import/expression，保留真实 transaction oracle。

### `shop-menu.boundaries.test.ts`

完整读取 50 行。覆盖 cash===price、差 1、空列表、No/Yes 意图、confirm/list cancel 分层与 catalog 不能被状态机改写。将原先对新 clone 的恒真自比改为对实际 `ITEMS` catalog 的不变性断言，避免弱测试计入验收。

### `shop-menu.glm-phase1-leaves.test.ts`

完整读取 59 行。补齐缺 `_name` label 回退、固定 pageSize、错 phase 零请求、目录缺 item no-op、list-phase `shopConfirm` null；均为真实 public function 分支，和主/边界合同排重。

## 生产 caller / primary source 核验

`menu-driver.ts:301-418` 完整读取 shop dispatch、transaction apply、sell refresh 与 live cursor；`bootstrap.ts:1236-1249` 解析 storeNum→stores[storeNum].items；`event-system.ts:204-209,2192-2205` 证明 0x0026/0x0027 modal waiting/ip/resume；相邻 `sell-menu.ts`、`draw-shop.ts` 与 P04/pixel tests 已读。SDLPal `uigame.c:1615-1791`、`itemmenu.c:287-310`、`play.c:289-320` 直接对照买卖/选择/成功门。未发现必须停线的 schema/save、迁移、资产管线、公共接口或用户可见行为分歧。


## 验证结果

- 定向与相邻测试：11 个测试文件、408 tests 通过；event-system 的 skip/goto/setObjectPos 输出是已有 negative-control oracle，不是新增诊断。
- 受影响静态门：`@type-pal/game` typecheck 通过；四条白名单文件 Biome 通过且无诊断。
- 全仓 `pnpm check`：docs/tool、7 包 typecheck/test、lint-zero 全部通过；content 149/1498、shared 16/131、game 314/3550、pal-extract 71/431、reforge 359/8964、editor 631/4951、migrate 96/739；4010 files lint，0 errors / 0 warnings / 0 infos。
- 官方 `pnpm coverage:ratchet`：731 source files / 19855 tests；statements 89.93% (70837/78771)、branches 83.65% (51539/61610)、functions 89.50% (13415/14989)、lines 91.81% (63295/68938)，覆盖率和范围均保持基线。
- `pnpm check:fast`：文档/工具门、7 包 typecheck/test、lint-zero 全部通过；editor 631/4951、migrate 96/739 也已通过。
- docs/content-review strict、ledger、`git diff --check` 均通过；无规则、排除、阈值或 baseline 改动。

## 推进与收口记录

- Codex 独立验收：四个白名单文件均完整读取，读取真实 menu-driver/bootstrap/event-system/GameState/draw-shop/sell-menu caller 与 SDLPal primary source；未发现 shop 状态机直接缺陷。
- 仅修改两处测试质量残留：移除无业务效果的 dead touch import/expression；把恒真“新 clone 自比”改为操作前 catalog 快照与实际 `ITEMS` 的不变性 oracle。未修改生产实现、公共接口、schema/save、资源、生成物或用户可见行为。
- 任务卡归档后，四条账本记录才允许从 pending 变为已验证。

## 剩余与交接

- `menu-driver.ts` 交易应用、`inventory-state.ts` 容量/装备占用差异、`sell-menu.ts` 与 `draw-shop.ts` 相邻文件仍不因本批自动关闭；如需修复必须另开不重叠卡并先核真实 runtime/save 证据。
- CODE-QUALITY-53/57/79/80/81 与其它 Q3 core/present/shell/analytics/tools 文件保持原状态；当前账本应为 3270 files：closed 352、review 9、pending 2909。
- 无下一位 Agent 提示词；从最新 ledger 选择下一组不重叠的 2–4 个 pending 文件继续。
