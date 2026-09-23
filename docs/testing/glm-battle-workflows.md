# TEST-BATTLE-WORKFLOWS-1 · 实施回执（GLM，r4 收窄返工）

任务卡：[TEST-BATTLE-WORKFLOWS-1](../ops/tasks/TEST-BATTLE-WORKFLOWS-1-session-flows.md)（r1 设计三签保持，
未重签）。r3 候选 7a2f1608 被 Codex counter（[r3 独立复核](battle-workflows-r3-review.md)，N1～N4）；
本回执为 N1～N4 一次闭合后的 **r4 候选**。已关闭项（r2 四反证、finally、r3 已修五方向）不重开。
Coding Owner：GLM。分支 `codex/glm-battle-workflows-r1`（合入主线 47be1582 @18f1922d）。
机账：[glm-battle-workflows-evidence.json](glm-battle-workflows-evidence.json)。

## 生产零改动（真四目标命令）

`git diff 57dda7ed..HEAD -- packages/reforge/src/battle/battle-session.ts packages/reforge/src/battle/battle-core.ts packages/reforge/src/battle/battle-anim.ts packages/reforge/src/battle/enemy-hook-runtime.ts` 输出为空。
（开发期自检曾临时变异产品文件验证新断言可红，验证后已还原并核零 diff。）

## 交付（白名单内 9 代码文件 + 2 工具，45 项）

- 6 个测试文件：selection **13**（+3）/ round 6 / action 6 / script 8 / terminal **6**（+2）/ writeback **6**（+1）
  = **45**（r3 39 + 新增 6：W 无投掷物负向、合击有效/无效会话闭环、enemyFled/terminated 零奖励、多队员 HP 钳制）。
- 3 个 fixture 仍在 `packages/reforge/src/__tests__/battle-workflows/`；2 个工具同路径（mutants 判据按 N4 精化）。

## N1｜写回三个残项

1. **幂等独立快照**：奖励入账后取 `structuredClone` **独立预期快照**再二次写回，断言整个 world 与该
   快照全等——不再用会被被测代码一起改动的引用别名自比较。自检：删除生产唯一幂等门
   `if (this.persistentEffectsWritten) return` 后本用例 AssertionError 红（成长实际二次叠加时快照不等）。
2. **非空库存哨兵**：`makeWfSessionFromWorld` 新增 `worldInventory`（buildWorld 按入口拷贝）；成长用例
   播种 `[{wf-world-tonic ×3}]` 并参与整 world 深比较。自检：writeBackPersistentEffects 入口清空库存的
   变异下本用例红。
3. **多队员 HP 钳制（撤回"不可达"论）**：r3 的"HP0 即判负"域论证错误——败北判据是**全队**无可战斗
   成员（battle-core.ts:1182-1186），单人阵亡不判负，且 seedStats 合法允许 hp=0。新用例：p1 hp=0 +
   p2 hp=100 的两人队伍，p2 一击致胜（p1 阵亡不出菜单），done=victory，writeBackHp 精确写
   **[1,100]**（非败终局把 0 HP 队员钳为 1）。自检：钳制 1→0 的变异下本用例以 [0,100]≠[1,100] 红。

## N2｜hook 等待期"零提交"（非仅未执行）

wait 用例加**公开 readiness 观察器**：`prepareTurnSounds` 快照记录器（只在动作真正交进出手准备时触发）。
等待窗口（累计 <400ms）内连按确认后断言：**readiness 快照数=0**（无任何动作被提交进准备）、
phase 仍为 menu（选择未被吞进 acting/preparing）、日志零 `p1 ` 行；hook 完成后、新按键前仍为 0
（早前乱按无残留）；恢复后提交恰产生 1 份快照与 1 笔攻击。自检：单点忽略 selectAction 分支
pumpScriptExecution 返回值（保留 performAction 泵）的变异下，本用例以"应零提交、实际 1 笔"红。

## N3｜去重层级修正与剩余会话合同

**新增会话闭环**（不再以下层断言换名冒充）：

| 合同项 | 新测试 | 关键断言 |
|---|---|---|
| W1 coop 有效（会话闭环） | `合击有效选择会话闭环：直接提交→真实执行→两贡献者各付一次 HP 代价（91 精确）→队友普攻被消费` | `合体技 ` 行恰 1；两人 HP=100−9=91 精确（一击致胜无反击）；无 `p1 ` 普攻行（被合击消费）；done=victory |
| W1 coop 无效（会话闭环） | `合击无效选择会话闭环：单人无队友时…` | 合击图标不可选、确认落回普攻、HP=100−Σ(敌反击)（零合击代价，事件推导） |
| W1 投掷无效（会话层） | `无可投掷品时 W 不打开列表且零提交` | 留菜单、MP 40（core"扣库存前拒绝"之上的会话层无效选择） |
| W5 enemyFled 零奖励 | `enemyFled：敌经 turnStart hook fleeBattle 真实逃跑→零 settlement→…` | buildSettlement 观察器 0 次 + done='enemyFled' |
| W5 terminated 零奖励 | `terminated：encounterChoreo endBattle(terminate) 于第 2 轮到达→零 settlement→…` | 观察器 0 次 + done='terminated'（非 cancel AbortError） |

**去重层级修正**（旧证据只抵扣其所在层，不再上浮为另一层合同）：

| 旧证据 | 实际证明范围 | r4 处置 |
|---|---|---|
| `合击消费其余队员后仍先冻结完整动作快照…` @ battle-session.test.ts:690 | **选择/冻结动作**（prepare 永久挂起，不证明会话执行合击/付代价） | 会话闭环 r4 新增；旧证保留于选择层 |
| `合击:全 healthy 贡献 HP…` 等三例 @ battle-core.test.ts:2728/2745/2790 | core 层代价/队友消费/无效降级（手动写 pendingActions） | 保留 core 层；会话层 r4 新增 |
| `世界专用用途与非法投掷在扣库存前拒绝` @ battle-core.test.ts:1064 | core 层扣库存前拒绝（手动塞动作） | 保留 core 层；会话层无效选择 r4 新增 |
| `endBattle terminate…无奖励` @ battle-session.test.ts:1284 | 终态到达（无 buildSettlement 观察器，零奖励未断言） | 终态层保留；零奖励 r4 新增观察器断言 |
| `fleeBattle 立即播放逃跑演出…` @ battle-session.test.ts:1405 | 终态+closure 排净（无零奖励断言） | 同上 |
| `continue 同 activation 执行…` @ enemy-hook-runtime.test.ts:51 | runtime 层 cursor/推进（不计时、非会话输入所有权） | 保留 runtime 层；会话等待输入所有权 = N2 |

## N4｜judge 判据补洞

- **逐条 failureMessages**：同一失败项携带的每一条消息首行都必须是业务断言（`AssertionError`/
  `expect(`）——`['AssertionError: …','Error: fixture setup failed']` 同项混错不再误判 detected；
- **必须恰 exit1**：exit0=MISSED；exit2/被杀 null 退出=invalid（异常退出不算业务红）；
- timeout 全行扫描、套件 message/多失败/多执行/Unhandled/他针 marker 拒绝保持；
- 自测走真实 judge 入口，新增同项混错/exit2/null/exit0 四类构造（连同 r2 矩阵共 12 类断言）。
- c1 针 redTest 同步 r4 新标题；单针模式计数诚实（`1 controls (of 6)`）不变。

## 两处回执勘误（Codex N4 尾项）

1. **分支净增算术**：r3 机账 netDelta 写 `+43B`，但表为 session 43 + core 1 = **44B**。r4 机账按
   `+44B` 起算并以本轮实测为准。
2. **精灵 guard 声明**：r3 驱动器头部声称"每次精灵也过 guard"，实际当时入口只有敌/技能/物品
   （BattleSprite 仅 catalog 样本检查）。r4 已把 `validateBattleSprites` 真正落到会话入口
   （本次实际注入的精灵定义逐实参核验），声明与实现一致。

## 负控与验证总账（最终树）

- 定向 6 文件 **45/45**（13/6/6/8/6/6）；相邻 `src/battle/` 19 文件 **278/278**；全 reforge 158 文件
  **1459/1459**（r3 1453 + 新增 6）；TC rc0；Biome 改动文件 rc0。
- 负控 **6 正控 + 10 针全 detected**（N4 判据下复跑，证据目录
  `/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/bw1-mutants-D3Rt0E/`）；
  N1 三变异与 N2 pump 旁路变异由本席开发期自检复红（产品已还原、四目标零 diff）。
- 覆盖率同口径 before/after 见机账（输出仅 /tmp）。

## 剩余与归属

- session render 段（~189 行）仍归视觉/渲染侧；组合状态/anim 演出臂/hook 剩余保留分母。
- Codex r1/r2/r3 冻结见证工具零改动；r3 见证对 r4 由 Codex 自行适配复跑。
