# A批：Reforge菜单状态

状态：GLM 已实施并按 codex-intake-review R1 补齐回执与反控（2026-09-27）。范围A01–A04，见[工作包](../README.md)与[冻结账](../targets.freeze.json)。
生产冻结 `1bc7df91`，四个目标源 sha256 与冻结账逐一相符（oracle 每轮复验不变）。

## 命令与 exit（新鲜 JSON）

- 定向四文件：`env -u NODE_COMPILE_CACHE pnpm exec vitest run src/{magic,system,equip,use}-menu-state.glm-boundaries.test.ts`（cwd packages/reforge）→ **34/34 exit 0**，JSON `/tmp/batch-a-directed.json`。
- 相邻七文件（magic/system/equip/use-menu-state.test、magic-menu-state.boundaries、equip/use-menu-state.navigation-boundaries）→ **57/57 exit 0**。
- reforge `tsc --noEmit` → 零诊断；Biome（本批四文件）→ 0/0/0。

## 4行 ledger

| ID | 当前公开入口/守卫 | 选中差异合同 | 旧文件 + 精确 fullName | 新文件 + 精确 fullName / 分类 | 理由/调用域 | 反控 |
|---|---|---|---|---|---|---|
| A01 | `castOutdoorSkill`/`magicConfirmSpell`/`magicMoveCaster`/`openMagicMenu`/`closeMagicMenu`/`MAGIC_GRID_COLS`（magic-menu-state.ts；castOutdoorSkill 原地改 world，success 才扣 MP） | healMp 活人 clamp 扣 MP、满 MP 无效果不扣；curePoison poisonId 点名只解匹配毒 / curesTier 解 common、缺 def 保留；revive 半血清 severe 毒；未知 kind no-op 不扣 MP；casterIdx/target 越界 false；magicConfirmSpell caster/cursor 越界 null、cost 无 mp 字段恒过门；magicMoveCaster 空队同引用；MAGIC_GRID_COLS=3 与 closeMagicMenu 完整对象 | magic-menu-state.test.ts 基础导航/选人/确认（20+ 例）、magic-menu-state.boundaries.test.ts E1–E4（castOutdoorSkill 主路径） | 新增 12 例：`A01 castOutdoorSkill 残差 healMp：活人回蓝 clamp 到 maxMP，扣 MP` 等（旧 E4 只测 Confirm 不冒充施放；施放结算轴全为本文件新证） | 大世界施放真实调用域（healMp/curePoison/revive/unknown/越界）为工作包指定必核方向 | magic-cure-poison-id-inverted（恰红「curePoison poisonId 点名」例） |
| A02 | `openSystemMenu`/`closeSystemMenu`/`systemMoveCursor`/`systemConfirm`/`systemToggleConfirm`/`systemSwitchCommit`/`systemConfirmYes`/`SYSTEM_ITEMS`（system-menu-state.ts） | 空列表导航同引用；cursor 越界确认同引用无 action；menu 阶段 toggleConfirm 同引用；switchCommit 无 switchTarget 同引用；confirmYes 非 confirm 阶段同引用；SYSTEM_ITEMS 引用同一性与 label 值；closeSystemMenu 完整对象 | system-menu-state.test.ts 四方向/默认音量矩阵等 9 例 | 新增 7 例：`A02 system-menu-state 残差 空列表导航：同引用不变` 等（SYSTEM_ITEMS 防御臂不得改空骗过 open 的合同按现状钉死） | 阶段门/空列表/占位项为 system 菜单残差主线 | system-empty-list-guard-drop（恰红「空列表导航」例） |
| A03 | `openEquipMenu`/`equipConfirmItem`/`equipApply`/`equipBackToList`/`EQUIP_GRID_COLS`/`closeEquipMenu`（equip-menu-state.ts；换装走 content equipItem） | 非 pick-role apply：world/state 原引用；无 equip 块物品不换装回 list；casterId 不在 party 回 list 且 items 空；cursor 越界确认同引用；backToList list 阶段 no-op；inventory count=0 不可装；EQUIP_GRID_COLS=3 与 closeEquipMenu 完整对象 | equip-menu-state.test.ts 7 例、equip-menu-state.navigation-boundaries.test.ts 3 例（换装交换细节 content 已证不重领） | 新增 7 例：`A03 equip-menu-state 残差 非 pick-role 阶段 apply：world 与 state 均原引用` 等 | 只补菜单层防御/边界，不重领 content 物品包交换细节 | 共用判据覆盖本文件（A 批三针见 A01/A02/A04 行） |
| A04 | `openUseMenu`/`useConfirm`/`useApply`/`useBackFromTarget`/`finishUseExecution`/`USE_GRID_COLS`/`closeUseMenu`（use-menu-state.ts；施用走 content useItem） | useApply 错误 phase/无 selectedItemId undefined；pick-target 重复确认与 cursor 越界同引用；backFromTarget pick-item no-op；空队 execute targetCharId 空串；finishUseExecution status:external 按非成功处理返回原 state；battleOnly 物品不入列；USE_GRID_COLS=3 与 closeUseMenu 完整对象 | use-menu-state.test.ts 10+ 例、use-menu-state.navigation-boundaries.test.ts 6 例（真实 useConfirm/useApply 请求与成功消耗旧测已证不重领） | 新增 8 例：`A04 use-menu-state 残差 useApply：pick-item 阶段 undefined；pick-target 无 selectedItemId undefined` 等（手造 request 一律经公开入口产生） | 错误 phase/空表/失败保持为 A04 必核方向 | useapply-phase-guard-drop（恰红「useApply 阶段 undefined」例） |

## 负控回执（[tools](../tools/README.md) 共用判据，`node state-commands-mutants.mjs a`）

判据自测 10 例全按预期；对照跑 exit 0 全绿（34 项）；三针各自**恰 exit1、恰一红**、失败记录
绝对文件与实际 fullName 逐字匹配、AssertionError-only、无 timeout/混错、load 命中 entered.json
见证、四个目标源 sha256 每轮复验不变：

| 针 | 生产注入 | 类别 | 恰红用例（fullName 尾段） |
|---|---|---|---|
| magic-cure-poison-id-inverted | castOutdoorSkill curePoison 点名过滤 `!==` → `===` | 错误效果结算：解错毒 | curePoison poisonId 点名：只解匹配毒 |
| system-empty-list-guard-drop | systemMoveCursor 空表守卫 `if (n === 0) return s` → `if (false)` | 空列表防御拆除：环绕取模 NaN | 空列表导航：同引用不变 |
| useapply-phase-guard-drop | useApply 阶段守卫 `if (s.phase !== 'pick-target' \|\| !s.selectedItemId) return undefined` → `if (false)` | 阶段防御拆除：非法阶段仍发请求 | useApply：pick-item 阶段 undefined |

明细 JSON/日志：`/var/folders/…/type-pal-state-commands-mutants-*` 最新目录（summary.json）。

## 边界与披露

- 本批四文件在 R1 返工中补齐回执/反控；测试代码本身自上批候选起即存在并独立 34 绿（Codex 复核亦证）。
- castOutdoorSkill 原地改 world、magicConfirmSpell 原地改菜单为现行合同，不施加不可变断言。
- 视觉 N/A；作者自验不替代 Codex 独立验收；不合 main、不标 done。
