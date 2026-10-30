# CODE-QUALITY-107 — Game menu primitives / item-select 逐文件复核

Status: review
Owner: Codex
Reviewer: Codex（独立验收）
Phase: phase1
Capability: game / menu / pure-state contracts
Visual Verification Timing: N/A（纯数据状态与过滤函数）

## 目标与白名单

独立复核 CODE-QUALITY-97/98 中仍未进入现行账本的 menu 基础切片：

- `packages/game/src/core/menu/primitives.ts`
- `packages/game/src/core/menu/item-select.ts`
- `packages/game/src/core/menu/__tests__/primitives.test.ts`
- `packages/game/src/core/menu/primitives.boundaries.test.ts`
- `packages/game/src/core/menu/primitives.glm-phase1-leaves.test.ts`
- `packages/game/src/core/menu/item-select.glm-phase1-leaves.test.ts`
- `packages/game/src/core/menu/__tests__/item-magic-select.test.ts`

本批只写当前复核证据与账本，不修改生产代码、schema/save、公共接口、生成物或测试断言。

## 完整读取与 caller/oracle

已完整读取上述 7 个文件，并读取真实生产 caller：

- `inventory-menu.ts`：全库存列表、target menu、使用/装备/卖出过滤和 primitives cursor 委托。
- `sell-menu.ts`、`equip-menu.ts`：`matchesFilter` 的 sellable/equipable 合同与确认 no-op。
- `magic-select.ts`、`in-game-magic-menu.ts`：`createSelectionMenu`、disabled 光标和法术排序。
- `menu-driver.ts`：菜单目录注入、runtime role 投影、确认/取消 dispatch。
- `battle-system.ts` 中战斗选择 caller、`draw-inventory.ts` 中 filter 命中后的颜色 oracle。

primary source 为 SDLPal `ui.c:510-572` 的逐项光标、`itemmenu.c:28-466/287-308/380` 的
物品列表/确认/价格、`play.c:266` 的 usable 入口和 `uigame.c:1777` 的 sellable 入口；
测试 oracle 是公开 helper 返回的 typed state、对象 identity、cursor/pageOffset、过滤真值表、
价格文本和 disabled/current 状态。

## 逐文件结论

### `primitives.ts`

- `SelectionMenu`、Confirm/Triple/Switch 均为纯数据操作，无 DOM/IO；生产 caller 共享同一状态
  ownership，渲染和确认仍由各菜单/dispatcher 负责。
- 合法输入的空表、单项、默认 cursor clamp、环绕、disabled 停留、pageOffset 视窗和
  identity 透传均有测试；pageUp/pageDown 的 test-only 现状也有独立边界记录。
- 注释明确区分 SDLPal 逐项移动与 test-only 翻页，不把无生产 caller 的 `findNextSelectable`
  当作产品真值。E-4（pageUp/pageDown/findNextSelectable 无生产 caller）属于公共出口删除候选，
  未在本批删除。

### `item-select.ts`

- `matchesFilter` 的 potion/battle/important/sellable/usable/all 分支与 SDLPal 入口有直接锚；
  important 近似明确标注为工程分类，不冒称原版位。
- `createItemSelectMenu` 只生成 typed `SelectionMenuState`，目录外 inventory id 被剔除，缺名有
  item#id 回退，buy/sell/inventory rightText 和 sell price floor 均有 oracle；数据层保留
  `disabled=false`，非命中项的 UI 着色/确认 no-op 属调用方职责。
- E-5（`createItemSelectMenu`/`ItemDisplayMode` 无生产 caller，目前真实菜单走 InventoryMenu/Shop）
  是公共出口删除候选，未知 caller/替代方案未核实，本批不删。

### 测试质量

五个专属测试按主干、边界、phase1 leaves 和 item/magic caller 分工；没有以包级绿替代测试验收。
fixture 为 typed `Item`、`PlayerRoles`、`Spell`、`Magic`、`InventoryEntry`；反例覆盖空表、越界、
负 cursor、全 disabled、过滤否决位、目录外 id、缺名、奇数卖价和 MP disabled。未发现恒真、
无业务执行或与真实 caller 完全重复的用例。

## 验证结果与未闭合项

- 定向：7 files / 78 tests PASS，0 stderr。
- game menu 相邻：40 files / 377 tests PASS，但 `magic-script.test.ts` 有 2 条预期的
  缺失 labelMap stderr；该文件不在本批白名单，不能静音，保持相邻诊断开放。
- game typecheck：PASS；批次全仓门需在收口阶段记录。
- 本批无生产代码或测试修改；coverage ratchet/protected fast 若继续受 shared/pal-extract
  baseline 回退阻塞，本批文件保持 `review`，不调 baseline。

## 2026-10-17 批次收口回执

- 实际读取文件：本卡白名单 7 个文件，另读 `inventory-menu.ts`、`sell-menu.ts`、
  `equip-menu.ts`、`magic-select.ts`、`in-game-magic-menu.ts`、`menu-driver.ts`、
  `draw-inventory.ts` 和战斗选择 caller；primary 为 SDLPal `ui.c`、`itemmenu.c`、
  `play.c`、`uigame.c` 对应片段。
- 定向测试：7 files / 78 tests PASS，0 stderr。
- 相邻测试：40 files / 377 tests PASS；仅保留 `magic-script.test.ts` 两条预期的
  `labelMap` 缺失 stderr，未改断言或过滤输出。
- 类型与全仓门：game typecheck PASS；全仓 `pnpm check` exit 0，各包 typecheck/test
  完成，lint 4962 files 为 0 errors / 0 warnings / 0 infos；`check:docs` 通过。
- coverage：official `pnpm coverage:ratchet` 和 protected fast 均因 origin/main
  的 shared、pal-extract 及总量 baseline 回退失败，未降低规则、未刷新 baseline。
- 发现与未修：E-4（primitives 的翻页/查找 helper 无生产 caller）和 E-5
  (`createItemSelectMenu` 无生产 caller) 仍需独立删除或公共出口准入证据；本批没有
  产品、schema/save、公共接口或测试行为改动。
- 当前账本：3307 tracked / 231 closed / 28 review / 3048 pending；本批 7 个文件继续
  `review`，不因定向或包级全绿关闭。
- 下一批候选：先独立处理 `magic-script.test.ts` 的两条运行时诊断，再分别为 E-4/E-5
  建立 caller census 和准入裁决；不与本批实现文件重叠。

## 下一步

先完成本批相邻/全仓质量门并写入 receipt；E-4/E-5 与 CODE-QUALITY-94/95 中的其它死面候选
另开实现/删除准入卡，不在本批扩大公共接口或产品行为。
