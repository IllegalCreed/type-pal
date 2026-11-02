# battle actions 家族四文件 B–G 补维（glm-foundation 模块 6 批 9）

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: audit-report-v1 / 1.0.0

## 审计问题

本页审计主题:game 的 actions/{attack,attack-mate,defend,flee}.ts(614/111/20/81 行全文读毕)B–G 补维;A 维引用 Codex 3v 深切片(逐文件对照 fight.c/battle.c);基点 53db76bbb 线,沿用 handler 现状定谳法。原文 Status: review(候选待 Codex 据证验收)。Codex 当前裁定(2026-10-19):本页保留作者阶段证据,未获整包/全维收口验收;可复用范围与逐文件依据见 [codex-stage2-rework.json](../codex-stage2-rework.json)。

## 范围与证据

改动 1 项(行为保持重构):attack.ts 删除死局部 casterLevel(两分支各赋值一次后 void 消 lint,全程零消费,纯读 enemy.level/role.level 无副作用)。验证证据:删除前基线 actions 族 6 套件 8/8(baseline-before-deletion.json)→删除后 actions+battle-system.cov85+state-machine 超集 20 套件 32/32、0 failed suites(directed.json);game typecheck 0 错;scoped biome 0/0/0;diff --check 干净(−4 行)。attack-mate/defend/flee 零缺陷零改动,body-invariance-zero-edit.json 恒真佐证。

## 发现

A 维(引用 3v)复核:三向 str/def 公式 level 项归属、群攻 HIT_ORDER/逐敌减半/WORD 下溢不钳、单体双击 RNG 序(jitter→crit→李逍遥→float)、autoDefend 7/17+cover 替挡、equivItem 中毒 L22 恒消费掷骰——全部与 fight.c 行锚一致。B 维零常量级过时(『仍可继续精修』类表述是如实的演出边界声明);attack-mate L16/attack L318 保留。C 维 actions 无反向依赖,动画时间线统一经 anim-timeline builder。D 维 asShort/isPlayerDying 三文件各有私有副本(与 formulas.ts 同型),合并属接口变化登记候选。E 维 32 例含双击 RNG 序/群攻减半/替挡/失败动画。F/G/H:分支按 actor×target 三向组织清楚;本批删除唯一的死代码;RNG 注入可测。三文件注释级依据:flee 敌吉运修复偏离带还原指引(用户 2026-06-13 拍板)、defend 减伤在攻方消费边界、attack-mate P0 一致修(2026-06-02)。

## 结论

行为保持重构批:8/8→32/32 前后对照+zero-edit 三文件恒真共同证明删除无行为变化;登记(不动):asShort/isPlayerDying 私有副本合并候选(接口变化,Codex 裁定);magic.ts L122『M3 phase 1 简版可能不实播』待 magic 批定谳(present 层已消费 playMagicAnim,预计下批修)。

## 整改与复核

Codex 2026-10-20 当前有限裁定:casterLevel 删除按精确 AST/实际 DTO caller 成立;发现返回注释『本批仅用 damage』漏改,现说明 fCritical 被攻击音效消费;32 原生身份复用,无新动作行为变更;详见 [codex-dead-removals.json](../codex-dead-removals.json);文件保持 review,未授整卡/整包 accept。复验入口(原页给出,此处概述):grep -n casterLevel attack.ts 预期 0;在 packages/game 定向跑 actions/ 与 battle-system.cov85.test.ts。失效条件:attack.ts 实现变化→重测;公式/动画合同变化→3v 证据重估。本轮治理未重跑任何命令;候选待 Owner 接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 3400B / SHA-256 279b4647d493a182403b8409c250393df7f14be8316fc7ff799c89895b73713d；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
````markdown
# battle actions 家族四文件 B–G 补维（glm-foundation 模块 6 批 9）

> Codex当前裁定（2026-10-19）：本页保留作者阶段证据，未获整包/全维收口验收；可复用范围、逐文件依据与未知项见[当前返工记录](../codex-stage2-rework.json)。

Status: review（候选待 Codex 据证验收）
Owner: GLM；基点 `53db76bbb` 线
范围：`actions/{attack,attack-mate,defend,flee}.ts`（614/111/20/81 行全文读毕）。A 维引用 Codex 3v 深切片（attack/attack-mate/defend/flee 逐文件对照 fight.c/battle.c）;本批 B–G 补维,沿用 handler 现状定谳法。

## 短回执

- **改动 1 项（行为保持重构）**：attack.ts 删除死局部 `casterLevel`——两分支各赋值一次后 `void casterLevel` 消 lint,全程零消费(纯读 enemy.level/role.level,无副作用)。基线 actions 族 6 套件 8/8 → 删除后 actions+battle-system.cov85+state-machine 超集 **20 套件 32/32、0 failed-suites**;game typecheck 0 错;scoped biome 0/0/0;diff --check 干净（−4 行）。
- attack-mate/defend/flee 三文件**零缺陷零改动**（body-invariance 恒真佐证）：flee 的敌吉运修复偏离带还原指引(用户 2026-06-13 拍板)、defend 的"减伤在攻方消费"边界、attack-mate 的 P0 一致修(2026-06-02)注释全部与实现/真值一致。

## 八维结论（B–G 补维重点）

| 维 | 结论要点 |
|---|---|
| A(引用) | 3v 证据链完整。本批复核:三向 str/def 公式的 level 项归属、群攻 HIT_ORDER/逐敌减半/WORD 下溢不钳、单体双击 RNG 序(jitter→crit→李逍遥→float)、autoDefend 7/17+cover 替挡、equivItem 中毒 L22 恒消费掷骰——全部与 fight.c 行锚一致。 |
| B | 零常量级过时(该家族注释随 fix 批同步维护);"仍可继续精修"类表述(attack-mate L16/attack L318)是**如实**的演出边界声明,非过时——保留。 |
| C | actions 无反向依赖;动画时间线统一经 anim-timeline builder + startBattleAnim,声音挂帧模式一致。 |
| D | asShort/isPlayerDying 三文件各有私有副本(与 formulas.ts 同型)——各自 3 行纯函数,合并入 formulas 公共出口属接口变化,登记候选不强制。 |
| E | 32 例含双击 RNG 序/群攻减半/替挡/失败动画(3v+后续 fix 批判别力已核)。 |
| F/G/H | 分支按 actor×target 三向组织清楚;**本批删除唯一的死代码**;RNG 注入可测 ✓。 |

## 登记（不动）

asShort/isPlayerDying 私有副本合并候选(接口变化,Codex 裁定);magic.ts L122"M3 phase 1 简版可能不实播"待 magic 批定谳(present 层已消费 playMagicAnim,预计下批修)。

## 复验入口（只读）

```bash
WT=~/.glm-worktrees/pre94-foundation
grep -n 'casterLevel' "$WT/packages/game/src/core/battle/actions/attack.ts" | wc -l  # 预期 0
cd "$WT/packages/game" && ../../node_modules/.bin/vitest run src/core/battle/actions/ src/core/battle/battle-system.cov85.test.ts
```

失效条件:attack.ts 实现变化 → 重测;公式/动画合同变化 → 3v 证据重估。

## Codex 2026-10-20 当前有限裁定

casterLevel删除按精确AST/实际DTO caller成立；发现返回注释“本批仅用damage”漏改，现说明fCritical被攻击音效消费。32原生身份复用，无新动作行为变更。 [逐文件依据与原件](../codex-dead-removals.json)。文件保持review，未授整卡/整包accept。
````
<!-- incremental-original-source:end -->
