# CODE-QUALITY-88 — game magic-select state / catalog contract

Status: done
Phase: phase1
Capability: Q3 phase1 game core/menu magic selection
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Codex（独立验收）
Visual Verification Owner: N/A
Visual Verification Timing: e2e-deferred
Contributor: Codex
Branch: codex/code-quality-3y

> 本卡按 [`AGENTS.md`](../../../../../AGENTS.md) 的 Codex 独立验收模式执行；本批只核 magic-select 四个白名单文件，不接管 in-game-magic-menu、battle-system 或 present 文件。

## 目标

证明大世界/战斗共用的纯数据法术选择建表按 SDLPal 的法术对象号排序，正确连接 `Spell.magicNumber` 到 `Magic` 成本，按当前 MP 生成禁用位，并对缺失目录、空槽和名称降级保持 fail-closed；不改变公共接口、schema、存档或用户可见形态。

## 范围

- 范围内:
  - `packages/game/src/core/menu/magic-select.ts`
  - `packages/game/src/core/menu/magic-select.boundaries.test.ts`
  - `packages/game/src/core/menu/magic-select.glm-phase1-leaves.test.ts`
  - `packages/game/src/core/menu/__tests__/item-magic-select.test.ts` 中 MagicSelectionMenu 相关合同
- 范围外:
  - `in-game-magic-menu.ts`、`battle-system.ts`、`draw-magic.ts` 及其整文件收口
  - `packages/shared/src/tables.ts` 旧 id 注释、提取器与生成数据
- 明确不做: 不改法术 id/schema、MP 扣除或脚本执行、导航/UI 绘制、公共 API 或生成物。

## 前提真值门

### 一句话行为 / 工程前提

`role.magic` 和 `spells.json` 的有效法术键是 SDLPal OBJECT 全局 `wObjectID`（295/296…），菜单按该键升序展示；`Spell.magicNumber` 只用于索引 Magic stats 表，MP 不足仅把条目标为 disabled。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | `PAL_MagicSelectionMenuInit` 收集角色槽位、按 `wMagic` 升序冒泡，MP 不足置 `fEnabled=FALSE`，`PAL_MagicSelectionMenuUpdate` 允许光标停灰项但确认不返回 | `reference/sdlpal/magicmenu.c:301-410,35-116,228-275` |
| 第一阶段 | `role.magic` 使用 raw OBJECT id；`parseSpells` 输出 `id=296..397` 并追加 295，`Spell.magicNumber` 指向 Magic 表；大世界 caller 只传 `usableOutsideBattle` 法术 | `packages/pal-extract/src/resources/parsers/spells.ts:108-161`; `packages/pal-extract/src/resources/parsers/player-roles.ts:14-20,250-257`; `packages/game/src/core/menu/in-game-magic-menu.ts:128-141` |
| 当前二阶段 | N/A；本批仅 phase1 `packages/game` 运行时 | N/A（范围不涉及 phase2） |
| 本任务目标 | 四个白名单文件只建 `SelectionMenuItem`，按 object id 排序、`magicNumber` 连接成本、缺失关联剔除、MP 边界与输入隔离有判别力合同 | `packages/game/src/core/menu/magic-select.ts:26-55`；本卡测试白名单 |

### 反证与替代解释

- 最强替代解释: `Spell.id` 仍是局部数组索引，或某些 caller 传入 battle-only spell；提取器实际 `id=wObjectID`、player-role raw slot 与 caller 过滤可反证前者，battle caller 不在本批写入范围。
- 什么观察会推翻当前前提: 真实提取输出中 `spells[0].id` 不为 296、`role.magic` 不再保存 OBJECT id，或 SDLPal 初始化排序/成本来源改变。
- audit 红项如适用，已排查的替代根因:
  - runtime 语义 / 命令分类: 只核建表；确认/脚本/扣 MP 留 in-game/battle caller。
  - 原版 / 第一阶段理解: 已对照 `magicmenu.c` 和 parser tests。
  - extractor / 地图 / 数据解码: 已读 `parseSpells`、`player-roles` 与其边界测试；发现 shared 类型旧注释但无运行时矛盾，本批不改公共类型。
  - audit / test model: 测试包含合法完整 typed fixtures；防御性缺失 spell/role 留明确边界。

### 用户可见偏离

- 是否主动偏离已核真值: no
- `before -> after` 一句话: N/A（只核验/补强测试 fixture）
- 代表场景: N/A
- 用户裁决: N/A

## 上下文锚点

- 已拍板决策 / 铁律: 未知项保持 pending/review；包级全绿不能替代逐文件证据；测试少而精并使用真实 caller/oracle。
- 代码锚点(`file:line`): `magic-select.ts:26-55`; `in-game-magic-menu.ts:128-141`; `battle-system.ts:1032-1150`; `draw-magic.ts:258-305`。
- 已知坑 / 审计文档: 2026-05-29 id-system 修复 `6822295f1`；`docs/ops/archive/tasks/done/CODE-QUALITY-50-game-draw-magic.md`；shared `tables.ts:106-112` 的旧 id 注释与 parser 真值冲突，留相邻文档风险。
- 不得重新引入: `magicNumber` 反查 spell、按习得顺序展示、把 disabled 法术从列表删除、将脚本执行/MP 扣除塞进纯建表函数。
- 相关测试: 四个白名单测试；相邻 `in-game-magic-menu` 三文件、`battle-system` magic-select 合同、draw-magic tests。

## 验收条件

- 功能: 完整读取四个白名单文件，确认合法角色/目录、空槽、排序、MP=cost、MP=cost-1、缺 spell/magic/name 与输入隔离合同。
- 测试: 定向白名单 + in-game-magic/battle 相邻回归；Biomes、game typecheck；必要时记录可重复反控证据。
- 文档: 任务卡、board、ledger、evidence 与任务索引一致；semantic/content review 通过。
- 视觉 / 手工验证: N/A；功能性绘制已由相邻 present 证据覆盖，剧情视觉 E2E 延后。
- E2E 用例登记: N/A（纯状态建表，无剧情演出）。

## 当前模式推进记录

### 进入 build 前：Codex 核定

- Coding Owner / 隔离工作树 / 修改白名单: Codex / `/Users/zhangxu/illegal/type-pal-quality-3x` / 四个白名单文件及本卡、证据、账本。
- 前提核验: verified（`magicmenu.c`、parser、player-role raw id 与实际 caller 直接证据；若观察到 parser id 改变则推翻）。
- 范围、设计和验收条件: agree（纯建表/测试质量，不修改实现行为）。
- 高风险用户产品裁决: N/A（不改变行为/schema/public API）。
- build 准入结论: Codex build allowed

### 进入 done 前：独立验收

- 贡献者交付与自验: accepted（Codex 同一 Owner；生产实现无改，测试 fixture 改动与命令见 evidence）
- Codex 独立复核: accept（完整源码/caller/primary source 证据、3 针反控与全部质量门）
- 用户体验/产品验收: N/A（纯状态合同）
- done 准入结论: Codex done allowed；固定三贤人签字不再是当前门禁

## Draft: 设计与风险

### 设计结论

保持 `createMagicSelectMenu` 为纯建表：复制/排序学习槽位，不写回 role；每个槽先按 spell object id 命中 Spell，再以 `magicNumber` 命中 Magic，任一关联缺失剔除；成本比较只生成 `disabled`，确认和扣 MP 留 caller。

### 已知风险

- 风险: `packages/shared/src/tables.ts` 的 Spell.id 注释仍写局部索引，容易误导后续 caller。
- 缓解: 本卡记录 parser/primary source 真值并保持该文件 pending；另行治理公共类型文档，不在本批改接口。

## Build: 实现与自测

- Coding Owner: Codex
- 修改文件: 本批仅补强 `magic-select.boundaries.test.ts` 合法 typed fixture，并将组合 MagicSelectionMenu fixture 改为合法 300/301 OBJECT id；生产 `magic-select.ts` 未改。
- 实现摘要: 无运行时行为变更；测试仍覆盖主干成本/灰显/排序与缺失关联分支。
- 运行命令: 见交接日志与 evidence。
- 浏览器 / 手工检查: N/A
- 跳过的检查及原因: 全量门待文件证据最终确认后集中运行。

## Review: 审查与返工

- Reviewer: Codex
- 审查结论: 四个白名单文件均已完整读取；未发现直接生产缺陷。SDLPal object-id 排序、Magic 成本连接、MP 边界、缺失关联和 disabled cursor 均有 caller/primary-source oracle。
- 必须返工项: 若定向测试暴露 object-id、排序、MP 或 typed fixture 反例，先修复/恢复 review，不强行关闭。
- Accept / rework: accept

## 用户验收

- 用户结论: N/A
- 后续任务: shared `Spell.id` 注释风险另卡。

## 交接日志

- 2026-10-14 Codex: 完整读取四个白名单文件、in-game-magic caller、battle builder/input、draw caller、primitives、shared types、parser/player-role callers 与 SDLPal magicmenu/uigame；确认 object-id/排序/MP 真值。补强 boundaries 与组合测试为完整 typed fixtures，并把组合 fixture 改为生产 object id 300/301；早期定向回归暴露并修正一处旧 id 断言。Evidence: [evidence](../../../evidence/CODE-QUALITY-88/README.md)。Next: 无，四条记录已关闭；shared Spell.id 旧注释另留 pending。
- 2026-10-14 Codex: 定向/相邻 10 files / 261 tests、game typecheck、Biome 通过；3 个隔离单点 mutation（排序、MP 等值、id 错配）均业务红→恢复绿且源哈希一致。全仓 `pnpm check`、official ratchet、`pnpm check:fast`、lint-zero、docs/content-review、ledger 全部 exit 0；coverage baseline 未变。账本 3,270：closed 364、review 9、pending 2,897。

## 下一位 Agent 提示词

无，等待下一批从最新 ledger 选择互斥 pending 文件。
