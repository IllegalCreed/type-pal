# CODE-QUALITY-86 — game equip menu state / role swap contract

Status: done
Owner: Codex
Phase: phase1 game core/menu
Capability: equipment menu item selection, role selection and swap lifecycle
Visual Verification Timing: e2e-deferred（功能性菜单状态合同；像素形态沿用既有 present 证据）

## 范围与前提

白名单仅：

- `packages/game/src/core/menu/equip-menu.ts`
- `packages/game/src/core/menu/equip-menu.test.ts`
- `packages/game/src/core/menu/equip-menu.boundaries.test.ts`
- `packages/game/src/core/menu/equip-menu.glm-phase1-leaves.test.ts`

单一 Coding Owner 为 Codex。本批只做逐文件语义核验与测试质量收口；不改生产实现、公共接口、schema/save、资源或用户可见形态。CODE53/57/79/80/81 不占用白名单，CODE84/85 已收口。
开批基线为 `origin/main=646c8097034e4bd30a3ebde86cd61d46a2382e8a`，隔离分支为 `codex/code-quality-3y`。

一句话前提：装备菜单必须按 SDLPal 的装备物品过滤、角色 ID 映射、环绕选人、确认/取消阶段和换装链推进；不可装备、耗尽、空槽、未知目录或错 phase 不能写入真实装备/库存/属性状态。

| 方向 | 直接证据与判断 |
|---|---|
| primary source | `reference/sdlpal/itemmenu.c:287-310,331-377` 的装备过滤/确认门；`reference/sdlpal/uigame.c:1793-2056` 的装备槽、party role、可装备位、确认与 `wLastUnequippedItem` 链；`reference/sdlpal/play.c:328-359` 的外层 item picker；`reference/sdlpal/script.c:768-811,1090-1145` 的 0x18 swap 与装备脚本路径。 |
| 第一阶段 | 四条白名单文件；`menu-driver.ts:753-852` 真实 dispatcher/caller；`equip-effect.ts:115-236,239-294` 的 script/swap/effect ownership；`equipment-state.ts`、`game-state.ts` 运行时 equipment/party 类型；`draw-equip.ts` 与 P03/pixel 相邻 oracle。 |
| 第二阶段 | N/A；本批只覆盖 `packages/game` 第一阶段运行时，不接触 reforge/editor/content。 |
| 目标 | 证明 `createEquipMenu`、`confirmEquipItem`、`confirmEquipRole`、`cancelEquipMenu`、角色 cursor 导航的合法输入、边界、role identity、状态 ownership、错误传播与生命周期合同；未知问题保持 review/pending，不以包级全绿替代逐文件证据。 |

## 逐文件核验记录

### `equip-menu.ts`

完整读取实现。菜单 list 复用 `createInventoryMenu(..., 'equip')`，保存 party role ID 快照；确认使用 live snapshot 的 itemId/inUse 门，进入 pick-role；角色确认返回真实 roleId，swap/effect 由 dispatcher 所有；取消分层回 list 或 done，角色 cursor 按 party snapshot 环绕。未发现直接输入、边界、公共接口或异步/资源清理缺陷。

### 三份测试

完整读取三份测试。主测试覆盖 grid/filter、全显示/红色不可装备、party 快照、确认/取消、role cursor 环绕；boundary 覆盖 inUse 耗尽、非顺序 party `[2,0]`、意图零副作用；leaves 覆盖目录缺 item、done/no-op、单人环绕。移除主/边界测试中不符合 typed caller 的 `as never`/空 party 夹具，改用 `PlayerRoles` typed fixture 与真实 `gs.partyMembers`，保持业务 oracle 不变。

## 生产 caller / primary source 核验

`menu-driver.ts:753-852`、`equip-effect.ts:115-236,239-294`、`equipment-state.ts`、`game-state.ts`、`draw-equip.ts` 及 P03/pixel 相邻测试已读；SDLPal `itemmenu.c`、`uigame.c`、`play.c`、`script.c` 已对照。装备 swap、inventory refresh、`wLastUnequippedItem`、effect reset 与 role bit 均保留在相邻 caller 范围，若发现 runtime/save 或脚本链缺陷须另开高风险卡，不在本批猜测修改。

## 发现与停止线

- 当前未发现白名单实现直接缺陷；相邻 dispatcher/equip-effect/inventory-state 的行为风险不因本批自动关闭。
- 若发现装备脚本缺失、catalog 与 runtime role/equipment 不一致、属性/毒状态写回或存档 schema 需要改变，立即停止并升级高风险任务。

## 验证计划

- 定向/相邻：四份 equip 测试、menu-driver/equip-effect/equipment-state 相关测试、P03/draw-equip/pixel 相邻合同。
- 受影响 typecheck 与四条白名单 Biome；随后全仓 `pnpm check`、官方 coverage ratchet、protected fast、lint-zero、docs/content-review、ledger。
- 退出码为 0 但有静态诊断不算通过；既有测试 stderr 只作证据记录，不作长期诊断豁免。

## 推进记录

Codex：premise verified / build allowed。当前只清理测试输入质量，不改生产实现；完成全部质量门后再决定四条记录是否关闭。

## 实际验证记录

- 定向/相邻：12 个测试文件、127 tests 通过；E4 缺失 label 与 E2 未知 row 输出为已有安全负控诊断。
- game typecheck 通过；四条白名单 Biome 通过且无诊断。
- 测试质量修正仅涉及 typed input：主/边界测试不再使用 `as never` 或空 party，调用使用 `PlayerRoles` typed fixture 与真实 `gs.partyMembers`；没有改生产行为。


## 验证结果

- 定向与相邻测试：12 个测试文件、127 tests 通过；E2/E4 的未知 row/label 输出为已有安全负控诊断。
- game typecheck、四条白名单 Biome 通过且无诊断。
- 全仓 `pnpm check`：docs/tool、7 包 typecheck/test、lint-zero 全部通过；content 149/1498、shared 16/131、game 314/3550、pal-extract 71/431、reforge 359/8964、editor 631/4951、migrate 96/739；4010 files lint，0 errors / 0 warnings / 0 infos。
- 官方 `pnpm coverage:ratchet`：731 source files / 19855 tests；statements 89.93% (70837/78771)、branches 83.65% (51539/61610)、functions 89.50% (13415/14989)、lines 91.81% (63295/68938)，范围与基线不变。
- `pnpm check:fast`：文档/工具门、7 包 typecheck/test、lint-zero 全部通过；editor 631/4951、migrate 96/739 通过。
- docs/content-review strict、ledger、`git diff --check` 均通过；没有规则、排除、阈值或 baseline 改动。

## 推进与收口记录

- Codex 独立验收：四个白名单文件完整读取，并核对真实 menu-driver/equip-effect/equipment-state/game-state/draw-equip caller 与 SDLPal itemmenu/uigame/play/script primary source；未发现白名单生产实现直接缺陷。
- 测试质量清理：移除 `as never`/空 party 输入，补齐完整 `Item`/`ItemFlags` typed fixtures，调用使用真实 `gs.partyMembers`；没有修改生产实现或用户行为。
- 相邻 dispatcher/equip-effect/inventory-state 风险保持独立 pending/review，未被本批账本关闭。

## 剩余与交接

- CODE-QUALITY-53/57/79/80/81 与其余 Q3 core/present/shell/analytics/tools 文件保持原状态；当前账本应为 3270 files：closed 356、review 9、pending 2905。
- 无下一位 Agent 提示词；从最新 ledger 选择下一组不重叠的 2–4 个 pending 文件继续。
