# B批：战斗数据编辑命令

状态：GLM 已实施（2026-09-27）。范围B01–B04，见[工作包](../README.md)与[冻结账](../targets.freeze.json)。
生产冻结 `1bc7df91`，四个目标源 sha256 与冻结账逐一相符（skill `ea34f9f5…`、poison `78a15c4b…`、
enemy-team `8a2a7434…`、enemy `227e1462…`，oracle 每轮复验不变）。

## 命令与 exit（新鲜 JSON）

- 定向四文件：`env -u NODE_COMPILE_CACHE pnpm exec vitest run src/core/{skill,poison,enemy-team,enemy}-commands.glm-boundaries.test.ts`（cwd packages/editor）→ **27/27 exit 0**，JSON `/tmp/batch-b-directed.json`。
- 相邻七文件（skill/poison/enemy-commands.test、enemy-team-references、battle-data-delete-commands、commands.test、actor-commands.residual）→ **133/133 exit 0**。
- editor `tsc --noEmit` → exit 0 零诊断；Biome（本批六文件）→ 0 error / 0 warning / 0 info；`node scripts/docs/check.mjs` → PASS；`git diff --check` → 干净。

## 4行 ledger

| ID | 当前公开入口/守卫 | 选中差异合同 | 旧文件 + 精确 fullName | 新文件 + 精确 fullName / 分类 | 理由/调用域 | 反控 |
|---|---|---|---|---|---|---|
| B01 | `UpdateSkillCommand`/`AddSkillCommand`/`DeleteSkillCommand`（skill-commands.ts，patch=undefined 删键；删除走 `collectCurrentProjectDeletionImpact` 真实引用索引） | 首轮 oldPatch 捕获不被二次 apply 覆盖；三向缺席 no-op（apply 缺 id/未 apply invert/undo 时 id 消失）均原引用；可选键 undefined 删键与精确还原、旁技能同引用；DeleteSkill 中位原索引恢复+二次 apply 首轮快照+undo 重占用恰抛 | skill-commands.test.ts「keeps skill constructors on the old commands barrel and scaffolds default power」；battle-data-delete-commands.test.ts「fail closed while references exist」「delete and invert preserve exact index for unreferenced objects」「missing targets skip the oracle…」「redo revalidates skill, enemy and poison targets…」；actor-commands.residual.test.ts 五例 | 新增六例：`B01 skill-commands 残差 UpdateSkill：二次 apply 不覆盖首轮 oldPatch（undo 回首次前状态）` 等（全名见新文件；[22,1,1] withSkill miss 臂 = unreachable：apply/invert 均先 `find` 守卫，map 不可能 miss） | 冻结池 9 臂中 8 臂为真实调用域可达；undo 重占用/首轮捕获是 EditSession redo-undo 直接依赖的合同 | skill-first-capture-overwrite（恰红上方 UpdateSkill 二次 apply 例） |
| B02 | `UpdatePoisonCommand`/`AddPoisonCommand`/`DeletePoisonCommand`（poison-commands.ts，同 UpdateItem patch 语义） | patch 原缺席键 apply/invert 均无 phantom undefined；构造期深拷贝嵌套 patch（构造后改源不泄漏、apply 不别名）；缺席表（poisons 缺席）三向 no-op/追加/插回；DeletePoison 中位原索引+二次 apply 首轮快照+undo 重占用恰抛（整串 message） | commands.test.ts「UpdatePoison:patch 名/ticks,invert 还原;源不变」「UpdatePoison:patch undefined = 删键(清 lethalWith),invert 还原」「AddPoison:追加缺省毒;invert 移除;重复 id 不动」；battle-data-delete-commands.test.ts 四例（同 B01 行）；poison-commands.test.ts barrel 例 | 新增九例：`B02 poison-commands 残差 UpdatePoison：构造期深拷贝嵌套 patch——构造后改源不泄漏，apply 不别名` 等（[23,2,1] withPoison miss 臂 = unreachable，同 B01 理由） | 冻结池 18 臂中 17 臂覆盖；深嵌套 tick 与缺席表是表单编辑与undo的真实调用域 | poison-patch-alias（恰红构造期深拷贝例） |
| B03 | `UpdateEnemyTeamsCommand`/`AddEnemyTeamCommand`/`UpdateEnemyTeamCommand`/`DeleteEnemyTeamCommand`（enemy-team-commands.ts） | 整表二次 apply 保持首轮旧队表；构造期快照（构造后 push 源数组不泄漏）；AddEnemyTeam 重复 no-op 原引用 + invert 无条件按 id 剔除（与 AddSkill 的 `!this.added` 守卫不同，按当前合同钉死）；单队/整表缺席表与缺席 id no-op；DeleteEnemyTeam 中位原索引+二次 apply 首轮快照+缺席表 invert 插回 | enemy-team-references.test.ts「CRUD is immutable, limited to five slots, undoable and blocks referenced delete」等五例；commands.test.ts「Add/Delete:末尾增,原位删还原;Teams 整表替换可逆」 | 新增六例：`B03 enemy-team-commands 残差 UpdateEnemyTeams：二次 apply 保持首轮旧表；未 apply 的新命令 invert 原引用` 等（[33,3,1]/[38,5,1] withEnemyTeam miss 臂 = unreachable，同 B01 理由；五槽/null 洞为 existing-proof） | 16 臂中 13 臂覆盖；稳定 teamId 语义旧测已证不重领 | enemy-team-old-overwrite（恰红整表二次 apply 例） |
| B04 | `withEnemy`/`UpdateEnemyCommand`/`AddEnemyCommand`/`DeleteEnemyCommand`（enemy-commands.ts） | apply 与 invert 的删键非对称：原缺席可选键（steal）新增后 undo 整键删除不残留 phantom；缺席表/缺席 id/未 apply/undo 时缺席四向 no-op 原引用；AddEnemy 构造期快照（构造后改源敌 stats 不泄漏）+缺席表追加+invert 清空；DeleteEnemy 中位原索引+二次 apply 首轮快照+缺席表 invert 插回 | enemy-commands.test.ts「keeps enemy constructors on the old commands barrel and patches on first apply」；commands.test.ts「UpdateEnemy:patch ai.rules,invert 还原;源不变」「Add/Delete:末尾增,原位删还原;Teams 整表替换可逆」；battle-data-delete-commands.test.ts 六例；command-contract.test.ts / commands-catalog.boundaries.test.ts / battle-sprite-commands.residual.test.ts 引用与合同例 | 新增六例：`B04 enemy-commands 残差 UpdateEnemy：原缺席可选键（steal）新增后 undo 整键删除，不残留 phantom` 等（[14,0,1]/[21,2,1] withEnemy miss 臂 = unreachable，同 B01 理由；引用拒删/解除后删除为 existing-proof） | 13 臂中 11 臂覆盖；真实 EnemyDef 走 `mkEnemy` 合法种子，删除一律 `realRefs` 真实引用索引 | 共用判据覆盖本文件（本批三针见下） |

## 负控回执（[tools](../tools/README.md) 共用判据，`node state-commands-mutants.mjs b`）

判据自测 10 例全按预期；对照跑 exit 0 全绿（27 项）；三针各自**恰 exit1、恰一红**、失败记录绝对文件
与实际 fullName 逐字匹配、AssertionError-only、无 timeout/混错、load 命中 entered.json 见证、
四个生产源 sha256 前后不变：

| 针 | 生产注入 | 类别 | 恰红用例（fullName 尾段） |
|---|---|---|---|
| skill-first-capture-overwrite | UpdateSkillCommand.apply `if (!this.oldPatch)` → `if (true)` | 坏undo：首轮旧值捕获被覆盖 | UpdateSkill：二次 apply 不覆盖首轮 oldPatch |
| poison-patch-alias | UpdatePoisonCommand ctor `this.patch = structuredClone(patch)` → `= patch` | 输入污染：深拷贝退化别名 | UpdatePoison：构造期深拷贝嵌套 patch |
| enemy-team-old-overwrite | UpdateEnemyTeamsCommand.apply `if (!this.old)` → `if (true)` | 坏undo：首轮旧队表被覆盖 | UpdateEnemyTeams：二次 apply 保持首轮旧表 |

明细 JSON/日志：`/var/folders/…/type-pal-state-commands-mutants-Sg9HSK`（summary.json）。

## 边界与披露

- 删除命令相关测试一律用真实 `collectCurrentProjectReferenceIndex` provider（fixture `realRefs`），未 mock 恒空指数；引用拒删/解除后删除/redo 重验为旧测 existing-proof 不重领。
- 池内不可达臂如实不测：B01 [22,1,1]、B02 [23,2,1]、B03 [33,3,1][38,5,1]、B04 [14,0,1][21,2,1]（withX 命中分支后 map 不可能 miss）；[42,2,0] 类缺席臂已由新测覆盖。
- 未发现产品疑似缺陷；`AddEnemyTeamCommand.invert` 无条件按 id 剔除与 `AddSkillCommand.invert` 的 `!this.added` 守卫不一致，属当前实现合同，本批按现状钉死，是否统一交 Codex 裁定。
- 视觉 N/A；作者自验不替代 Codex 独立验收；不合 main、不标 done。
