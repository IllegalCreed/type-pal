# B11-1 - 队友阵亡/濒死战斗脚本（scriptOnFriendDeath / scriptOnDying）

Status: draft
Phase: phase2
Capability: B11（战斗伤亡脚本）+ B9 替挡依赖数据
Coding Owner: Codex
Generation Owner: N/A（无 AI 生图）
Reviewer: Kimi + GLM
Visual Verification Owner: Codex + User
Unavailable Agents: none
Branch: chore/docs-migrate-cleanup

## 用户拍板

2026-08-05：按一阶段机制真值实现该能力；R13-Z 剩余 110 个
`unclassified-reachable-source-site`（actors 36/38 scriptOnFriendDeath 各 29、
37/38 scriptOnDying 各 26）只能靠本能力关闭，不是可“证明”掉的债务。

## 真值（一阶段已核实）

来源：`docs/phase1/game-mechanics.md:352-403`、`data/extracted/data/object-players.json`、
`data/extracted/events/all.json` 命令流、`reference/sdlpal/fight.c:775-885`、
`packages/game/src/core/battle/battle-system.ts:972-1065`（已实现真值）。

### 触发

- **队友阵亡**：战斗中有队员当场阵亡（`prevHp > 0 && hp == 0`）的瞬间，取死者
  `coveredBy` 援护者；援护者在队、`hp > 0`、且无睡/定/疯魔时，跑**援护者自己**的
  `scriptOnFriendDeath`（台词 + 临时增益，都加在援护者本人）。
- **自己濒死**：`prevHp >= maxHP/5` 且当前 `hp > 0` 且 `isPlayerDying`
  （`hp < min(100, trunc(maxHP/5))`）时，守护者在队且健康时跑**自己**的 `scriptOnDying`
  （纯对白）。一阶段实现只排除 sleep/confused（不含 paralyzed）——待 Kimi/GLM 对照
  fight.c 复核。
- 自动战斗（fAutoBattle）不触发；一次 sweep 命中一个脚本后暂停本轮推进，对话先放完。

### 脚本与概率门（0x06 顺序掷，r∈[1,100]，r ≥ 阈值跳分支）

| 角色 | 入口 | 门1 r≥75 | 门2 r≥66 | 门3 r≥50 | 兜底 |
|---|---|---|---|---|---|
| 李逍遥 friendDeath | 43445 | “可恶的家伙！” 真气回满+灵力+10% | “可恶～！” 武术+25% 灵力+25% | “啊..糟了～！” 身法+90% 吉运+90% | “啊～！” 体力回满+武术+5% |
| 林月如 friendDeath | 43474 | “可恶～我替你报仇！” 体力回满+武术+5% | “你真没用～看我的！” 真气回满+灵力+9% | “哇～怎么办！” 身法+50% 吉运+90% | “可恶～看招！” 武术+25% 灵力+25% |
| 赵灵儿 dying | 43374 | 四段对白（“灵儿～你还好吧？”等），无增益 | 同左 | 同左 | “我．．支持不住了．．” |
| 林月如 dying | 43400 | 四段对白（“呜．．好痛喔～不来了啦！”等），无增益 | 同左 | 同左 | “喂～人家受伤了…” |

- 增益 opcode：`0x1B` 回体力满（operand=9999）、`0x1C` 回真气满、`0x30` 临时百分比
  属性（17=武术/attack、18=灵力/magic、20=身法/speed、21=吉运/luck；delta =
  基础值 × operand[1]/100，战内有效、战后清空）。
- 台词含 bottom/top/narration 三种样式，逐条顺序展示。

### 额外缺口：coveredBy 未迁移

`player-roles.json` 的 `coveredBy`（0→2、1→0、2→0、3→0、4→0、5→4）没有进
`mapActor`（`migrate-content.ts:277-330` 只迁了合体技/音效），PAL 内容
`battler.coveredBy` 全空。本卡必须一并补迁移，否则阵亡/濒死触发条件永不成立，
且 B9 替挡在 PAL 数据上也从未真正生效（battle-core 已有 coveredBy 逻辑和测试）。

## 范围

- content schema：`BattlerSpec.casualty?`（friendDeath/dying 结构化脚本）+ `coveredBy`
  补迁移。
- 迁移器：从 object-players 36/37/38 翻译四个源脚本为结构化 casualty（概率门、
  台词、heal、temp buff），locale 台词入库；全量重生成 canonical。
- battle-core：`BattlePlayerState.prevHp`；每个 action 后 casualty sweep（死亡→援护者
  friendDeath；濒死→自己 dying）；auto battle 门；buff/heal 复用现有
  `statBuffs`/HP/MP 通道；对话进 `lastAction`/事件供表现层。
- battle-session：战斗内对话展示（现成 dialogBox/startDialogue），演出时序对齐。
- R13-Z：新增 actor-casualty 证据族绑定
  `global/actors/<id>/scriptOnFriendDeath|scriptOnDying` → final actor casualty target，
  关闭 110 sites。
- 测试：battle-core 概率门/RNG 序、死/濒死阈值、coveredBy 缺失不触发、auto 不触发、
  prevHp 防重入；session 对话；migrate 产物 + oracle。

## 范围外

- 不改变战斗胜负判定、伤害公式、玩家混乱、合击。
- 不做原版“每次伤亡脚本游标跨段推进”的脚本运行时；结构化数据一次性执行。
- save 无新持久字段（临时 buff 战内有效，一阶段红线不持久）。

## 风险

- 战斗机制真值（RNG 序、概率门、buff 基数、濒死阈值）必须一阶段为准，禁止重猜。
- coveredBy 迁移是行为变化：替挡（完全免伤）会在 PAL 数据上首次真正生效，需回归
  敌人攻击/闪避/替挡演出。
- 对话阻塞语义：多段对话与战斗时间线如何暂停/续跑，需 session 层设计冻结。

## 推进签字

### 进入 build 前（draft → build）

- Codex: pending（设计草案已写）
- Kimi: pending
- GLM: pending

三签齐前 Coding Owner 不得修改实现文件。

## 下一位 Agent 提示词（给 Kimi / GLM 设计复审）

```text
复审任务: B11-1 队友阵亡/濒死战斗脚本设计审查（架构/schema/runtime 主审 = Kimi；
  数据/迁移/测试矩阵主审 = GLM；可并行）
任务卡: docs/ops/tasks/B11-1-player-casualty-scripts.md
当前状态: draft；Codex 已写设计草案，未准入 build。
你的职责: 只读审查，不得修改实现文件。
先读: AGENTS.md、docs/phase2/READ-FIRST.md、本卡、docs/phase1/game-mechanics.md:352-403、
  packages/game/src/core/battle/battle-system.ts:972-1065、
  packages/game/src/core/battle/battle-opcodes.ts:304(0x30)/0x1B/0x1C、
  packages/reforge/src/battle/battle-core.ts、packages/content/src/actor.ts、
  packages/migrate/src/migrate-content.ts:277-330(mapActor)、
  packages/migrate/src/experimental/script-v5/source-instruction-disposition.ts(R13-Z 证据族模式)。
重点:
  1. 濒死触发阈值与 fight.c:775-885 是否一致（一阶段 dying 排除 paralyzed 是否偏差）。
  2. BattlerSpec.casualty 结构化形状（gates/branches/lines/effects）与 statBuffs
     复用是否成立；0x30 buff 的“基础值”口径。
  3. coveredBy 补迁移对替挡/演出/存档的影响。
  4. casualty sweep 的挂点（stepBattle performAction 尾部、胜负判定前）与
     对话暂停语义；auto battle 门。
  5. R13-Z actor-casualty 证据族设计是否与现有 successor/domain 证据族一致。
  6. 测试矩阵是否覆盖 RNG 序/概率/阈值/重入。
输出: 签字 agree 或 counter 的具体字段/反例/替代方案；不得开始实现。
```
