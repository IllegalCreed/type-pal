# REFORGE-BATTLE-EQUIP-1 — 装备常驻状态与临时状态分层

Status: done
Phase: phase2
Capability: C3
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Codex（独立验收）
Visual Verification Owner: N/A
Visual Verification Timing: e2e-deferred
Contributor: Codex
Branch: main

> 本卡遵循 [`AGENTS.md`](../../../../../AGENTS.md) 的“Codex 分派—贡献者执行—Codex 独立验收”模式。这里的“原版/第一阶段”只用于确认历史机制边界；第二阶段目标按用户明确的现代化产品取舍执行。

## 目标

第二阶段把装备授予的战斗状态建模为随装备实时派生的常驻能力，不再把它伪装成一个超长回合计数器。武器双攻在装备时有效、卸装后失效、复活不清除；技能/道具施加的临时状态仍由回合计数器管理并在复活时清除。

## 范围

- 范围内：Reforge 战斗队员状态模型、建态投影、双攻判定、复活/解状态语义、相关单测与说明。
- 范围外：第一阶段忠实实现；物品 `grantStatus` 数据表；存档 schema 与世界态字段；parallel/join、006 剧情。
- 明确不做：不保留 32760/9999/9000 哨兵兼容，不给旧开发存档新增升级分支。

## 前提真值门

### 一句话行为 / 工程前提

第二阶段装备效果的真源是当前装备集合，不能依赖可衰减的临时状态槽；复活清临时状态但不应改变装备派生能力。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | 原版把装备效果编码为超长状态，`PAL_RemovePlayerStatus` 仅清 `<=999`；复活遍历清状态，因此剩余值降到阈值后会误清装备效果。 | `reference/sdlpal/global.c:2280-2308`；`reference/sdlpal/script.c:1070-1075` |
| 第一阶段 | 第一阶段保留上述兼容机制，装备效果以大值状态与复活清理规则协作。 | `docs/phase1/plans/2026-06-02-item-audit.md:43-45,59-61` |
| 当前二阶段 | 装备词条已有 live 派生入口，但 `BattleState` 仍在 `createBattleState` 把 `grantedStatuses` 写成 `9999`，复活再以 `<9000` 判定临时状态。 | `packages/content/src/item.ts:448-463`；`packages/reforge/src/battle/battle-player-input.ts:20-58`；`packages/reforge/src/battle/battle-core.ts:278-356,598-615` |
| 本任务目标 | 装备授予状态独立保存于战斗队员派生集合；普通 `status` 仅表示战斗内临时回合状态。 | 用户 2026-10-03 明确裁决；本卡实现与回归测试 |

### 反证与替代解释

- 最强替代解释：保留 `9999` 只是内部实现细节，当前行为已经足够稳定。
- 什么观察会推翻当前前提：若第二阶段已有独立、不可衰减且不落存档的装备状态层，且所有复活/解状态/攻击判定都只读该层，则无需本次重构；现有代码直接显示并非如此。
- audit 红项如适用，已排查的替代根因：
  - runtime 语义 / 命令分类：不是迁移或命令分类问题，装备 live 派生与战斗建态之间的边界仍使用哨兵。
  - 原版 / 第一阶段理解：原版阈值机制已由 primary source 直接确认；本任务明确不把它作为第二阶段目标。
  - extractor / 地图 / 数据解码：不涉及数据提取、地图或资源。
  - audit / test model：现有测试断言 `9999` 与 `<9000`，需要随模型一并改为行为断言。

### 用户可见偏离

- 是否主动偏离已核真值：yes
- `before -> after` 一句话：战斗内装备双攻以 `9999` 回合哨兵存在 -> 战斗队员持有独立装备派生能力，复活/解状态/回合衰减不会碰它。
- 代表场景：装备仙女剑进入战斗，经过任意多回合并被复活，仍可双攻；卸下仙女剑重新建态后不再双攻。
- 用户裁决：2026-10-03 用户已批准第二阶段不保留原版机制，装备 buff 随装备永久有效。

## 上下文锚点

- 已拍板决策 / 铁律：[`docs/phase2/READ-FIRST.md`](../../../../../docs/phase2/READ-FIRST.md) 铁律 2/4/6/11；装备派生 live 红线在 `packages/content/src/item.ts:373-463`。
- 代码锚点：`packages/reforge/src/battle/battle-player-input.ts:20-58`、`packages/reforge/src/battle/battle-core.ts:278-365,604-615,2144-2146`。
- 已知坑 / 审计文档：第一阶段物品审计记录了 `<=999` 清理历史，不得把它作为第二阶段永久状态模型：`docs/phase1/plans/2026-06-02-item-audit.md:43-45`。
- 不得重新引入：32760/9999/9000 哨兵、装备状态写回 `CharacterInstance.extraStatuses`、复活等待装备相关脚本结束。
- 相关测试：`packages/reforge/src/battle/battle-core.test.ts`、`packages/reforge/src/battle/battle-player-input.test.ts`、`packages/content/src/item.derived.background.test.ts`。

## 验收条件

- 功能：装备授予状态不进入临时 `status` 计数器；临时 dualAttack 仍可计时；复活清临时状态但保留装备集合；removeStatus 不会卸掉装备效果；重新建态/卸装后派生结果正确。
- 测试：相关 content/reforge 测试通过；typecheck 与 lint 零诊断。
- 文档：更新模型注释与本卡；不改第一阶段历史结论。
- 视觉 / 手工验证：N/A，战斗状态语义由 headless 回归覆盖；E2E 006 不因本卡提前执行。
- E2E 用例登记：入口=任一可触发战斗的 Reforge 调试/试打；准备=同一角色分别装备/卸装授予 dualAttack 的武器；步骤=建态→跨回合→复活→再建态；预期=装备时始终可双攻，卸装后无双攻，临时状态只在复活前存在；证据=本卡回归测试输出。

## 当前模式推进记录

### 进入 build 前：Codex 核定

- Coding Owner / 隔离工作树 / 修改白名单：Codex / 当前 main（单一写入者）/ `packages/content/src/battle-formulas.ts`（仅注释如需）、`packages/reforge/src/battle/battle-core.ts`、`packages/reforge/src/battle/battle-player-input.ts`、对应测试、`docs/ops/board.md`、本卡。
- 前提核验：verified（primary source、第一阶段审计与当前代码锚点已列）。
- 范围、设计和验收条件：agree（用户已明确第二阶段产品目标；不改 schema/存档）。
- 高风险用户产品裁决：2026-10-03 用户已批准装备效果随装备永久有效，复活不清。
- build 准入结论：Codex build allowed。

## Draft: 设计与风险

### 设计结论

`CreatePlayerInput.grantedStatuses` 保留为建态输入，但 `BattlePlayerState` 新增独立的 `grantedStatuses` 只读数组。`BattleStatus` 只存临时回合状态；建态不再写入 9999。所有“该队员当前是否有状态”的装备可影响判定通过显式 helper 合并两层读取。复活只清 `BattleStatus`，装备集合自然保留；removeStatus 只清临时层。世界存档继续只保存装备和 `extraStatuses`，不增加迁移。

### 已知风险

- 风险：未来新增读取 `status.dualAttack` 的调用点可能忘记合并装备层。
- 缓解：集中 helper、删除现有直接读取、测试装备/临时双攻两条路径。

## Build: 实现与自测

- Coding Owner: Codex
- 修改文件：`packages/reforge/src/battle/battle-core.ts`、`packages/reforge/src/battle/battle-core.test.ts`、`packages/reforge/src/battle/battle-casualty.test.ts`、`packages/reforge/src/battle/battle-session.test.ts`、`packages/content/src/battle-formulas.ts`、`packages/content/src/character.ts`。
- 实现摘要：`BattlePlayerState.grantedStatuses` 独立保存装备派生常驻状态；`BattleStatus` 只存临时回合状态；新增 `initialStatuses` 测试/试打注入口；复活清空全部临时状态；双攻、狂暴、护体、加速等正向判定统一通过分层 helper。
- 运行命令：`pnpm --filter @type-pal/reforge check`（289 files / 8366 tests）、`pnpm --filter @type-pal/content check`（128 files / 1274 tests）、定向 Biome check、`pnpm lint`（2845 files，0 diagnostics），均通过。
- 浏览器 / 手工检查：N/A；本卡是 headless 战斗状态模型，不改 UI/场景演出。
- 跳过的检查及原因：完整仓库 `pnpm check` 已执行；docs/工具门、content/shared/game/pal-extract/reforge/editor 与 lint 全部通过，migrate 存量测试 `src/dialogue-project.test.ts` 因 `locale 缺少 dlg.2074` 失败。本卡未改 migrate/对话数据/转换器，故不越界修复。

## Review: 审查与返工

- Reviewer: Codex
- 审查结论：独立读取 primary source、第一阶段审计与当前实现；确认已删除 `9999/9000` 装备哨兵依赖，且所有正向装备状态判定走显式分层入口。
- 必须返工项：无。
- Accept / rework: accept

## 用户验收

- 用户结论：产品取舍已由用户于 2026-10-03 明确批准；代码回归待本次回执告知。
- 后续任务：完成后回到 006 剧情设计；若发现剧情/战斗产品取舍再单独请用户裁决。

## 交接日志

- 2026-10-03 Codex：核实 Reforge 当前使用 9999/9000 哨兵，建立前提真值门并准入 build。Evidence: `packages/reforge/src/battle/battle-core.ts:351-356,612-613`。Next: 实现分层并跑回归。
- 2026-10-03 Codex：完成装备常驻/临时状态分层，补充复活与解状态回归；Reforge 全包 289/8366、content 全包 128/1274、定向静态门通过。根 lint 首次发现现存回执 JSON 一处缩进诊断，已作纯格式修复后 2845 文件零诊断，docs 门 37 项通过。Next: git 收口。
- 2026-10-03 Codex：完整 `pnpm check` 继续跑到 migrate；editor 497/3814 通过，migrate 77 files / 453 tests 中仅既有 `dialogue-project.test.ts` 因缺少 `dlg.2074` 失败。该失败不在本卡修改域，留独立存量欠账。
