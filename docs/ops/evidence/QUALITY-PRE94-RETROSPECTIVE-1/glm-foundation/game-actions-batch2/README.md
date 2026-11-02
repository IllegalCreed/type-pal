# battle actions 续批四文件 B–G 补维（glm-foundation 模块 6 批 10）

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: audit-report-v1 / 1.0.0

## 审计问题

本页审计主题:game 的 actions/{magic,item,throw-item,coop-magic}.ts(1076/118/158/387 行全文读毕)B–G 补维;A 维引用既有深切片(3m formulas/magic-damage+后续 DL/DM/M6-M9/L17-L22/W4 修复批);基点 53db76bbb 线(body 基准=批9提交后 HEAD)。原文 Status: review(候选待 Codex 据证验收)。Codex 当前裁定(2026-10-19):本页保留作者阶段证据,未获整包/全维收口验收;可复用范围与逐文件依据见 [codex-stage2-rework.json](../codex-stage2-rework.json)。

## 范围与证据

改动 1 处仅注释(magic.ts L122 定谳)。验证证据:body-invariance(同目录)四文件一致;定向 13 套件 25/25、0 failed suites(directed.json:actions 族+magic E2 三合同+summon-slot-reuse+action-error-arms);game typecheck 0;scoped biome 0/0/0;diff --check 干净。

## 发现

整改:magic.ts L122 原『emit playMagicAnim(Present 层消费;M3 phase 1 简版可能不实播,只表示发生过)』——定谳:该 bus op 当前无任何渲染消费方(present-battle.ts:198 显式跳过、audio.ts default 解析 0),真实法术动画已由本文件 buildAndStart* 六类时间线链(PreMagic/OffMagic/PostMagic/DefMagic/Summon/Trance/EnemyMagic)完整实现;『M3 phase 1 简版』框架双重失实(既非简版、视觉也不经此 op),按现状改写为通知性 op 的准确描述。item/throw-item/coop-magic 三文件零缺陷零改动:item 的脚本后按 consuming 扣(fight.c:4387-4400)、throw-item 挥臂前置+缓冲拼链+蛊孵化链 runScript 注入、coop 的 HP 代价(非 MP)/healthy≤1 降级完整 attack case(DL6 RNG 序)注释与实现/真值全部一致。A 维(引用)复核:scriptOnUse 成功 gate/失败早退(MP 仍扣)、E1/E2 inline 伤害、DM6 敌法术 autoDefend 预掷、L18/L20 rngFactor 逐敌/逐队员掷、trance L19 闪色+crossfade、召唤 PostMagic 排 fadeOut 前——与 fight.c 锚一致。

## 结论

注释定谳批(1 处):25/25 定向绿+body-invariance 四文件 AST 一致共同证明行为零变。登记(不动):playMagicAnim bus op 无消费方(present 跳过+audio 0)——候选清理项:删除 emit 属 bus 合同变化(命令枚举在 command-bus),交 Codex 裁定;连带 present-battle.ts:198 注释把 playEnemyAttack/playPlayerAttack 与无消费 op 并列易误导(audio.ts 实际消费后三者声音)——归 present 批修;私有 helper 副本合并候选沿批9。

## 整改与复核

整改即上述 1 处注释。复验入口(原页给出,此处概述):grep -n 通知性 bus op 于 magic.ts;在 packages/game 定向跑 src/core/battle/actions/。失效条件:四文件实现变化→重测;bus 命令集变化→playMagicAnim 登记项复核。本轮治理未重跑任何命令;候选待 Owner 接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 3666B / SHA-256 cf9457eb02cc61018740fe3182bd3582f5ed48da7e2efe5fb1d846f95b824a55；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
````markdown
# battle actions 续批四文件 B–G 补维（glm-foundation 模块 6 批 10）

> Codex当前裁定（2026-10-19）：本页保留作者阶段证据，未获整包/全维收口验收；可复用范围、逐文件依据与未知项见[当前返工记录](../codex-stage2-rework.json)。

Status: review（候选待 Codex 据证验收）
Owner: GLM；基点 `53db76bbb` 线（body 基准=批9提交后 HEAD）
范围：`actions/{magic,item,throw-item,coop-magic}.ts`（1076/118/158/387 行全文读毕）。A 维引用既有深切片(3m formulas/magic-damage + 后续 DL/DM/M6-M9/L17-L22/W4 修复批);本批 B–G 补维,handler 现状定谳法。

## 短回执

- **改动 1 处（仅注释,magic.ts L122 定谳）**：原"emit playMagicAnim(Present 层消费;M3 phase 1 简版可能不实播,只表示发生过)"——定谳:该 bus op **当前无任何渲染消费方**(present-battle.ts:198 显式跳过、audio.ts default 解析 0),而真实法术动画已由本文件 buildAndStart* 六类时间线链(PreMagic/OffMagic/PostMagic/DefMagic/Summon/Trance/EnemyMagic)**完整实现**;"M3 phase 1 简版"框架双重失实(既非简版、视觉也不经此 op)。按现状改写为通知性 op 的准确描述。
- **item/throw-item/coop-magic 三文件零缺陷零改动**：item 的"脚本后按 consuming 扣"(fight.c:4387-4400)、throw-item 的挥臂前置+缓冲拼链+蛊孵化链 runScript 注入、coop 的 HP 代价(非 MP)/healthy<=1 降级完整 attack case(DL6 RNG 序)——注释与实现/真值全部一致。
- **验证**：body-invariance 四文件一致;定向 **13 套件 25/25、0 failed-suites**(actions 族 + magic E2 三合同 + summon-slot-reuse + action-error-arms);game typecheck 0;scoped biome 0/0/0;diff --check 干净。

## 八维结论（B–G 补维重点）

| 维 | 结论要点 |
|---|---|
| A(引用) | scriptOnUse 成功 gate/失败早退(MP 仍扣)、E1/E2 inline 伤害(SHORT baseDamage guard、AoE 按 type 非 flag)、DM6 敌法术 autoDefend **预掷**、L18/L20 rngFactor 逐敌/逐队员掷、trance 变身 L19 闪色+crossfade、召唤 PostMagic 排 fadeOut 前+复位防御者不复位——与 fight.c 锚一致。 |
| B | 本批修 1 处。item.ts L11-12"M3 phase 1 fixture…T21 implementer 按 console.debug 补"为历史过程叙述,D26 兜底描述(L10)仍准确——保留历史,不算失实。 |
| C | 动画帧构造统一经 anim-timeline builder + startBattleAnim;声音帧同步模式(castSound/sound 挂帧,防双响 castFrameSynced/soundFrameSynced 排除表)清晰。 |
| D | attachDamageNumsToFirstFrame/asShort/isHealthy 在 magic/coop 各有私有副本(同 attack 批登记,合并属接口变化)。 |
| E | 25 例含 fizzle 音/E2 目标语义/召唤槽复用/action 错误臂(各 glm-q 族判别力已核)。 |
| F/G/H | 六类动画 builder 分区清楚;无死出口;RNG/资源注入可测 ✓。 |

## 登记（不动）

playMagicAnim bus op 无消费方(present 跳过+audio 0)——**候选清理项**:删除 emit 属 bus 合同变化(命令枚举在 command-bus),交 Codex 裁定;连带 present-battle.ts:198 注释"其他 op…M3 简版跳过"把 playEnemyAttack/playPlayerAttack 与无消费 op 并列易误导(audio.ts 实际消费后三者声音)——归 present 批修。私有 helper 副本合并候选沿批 9。

## 复验入口（只读）

```bash
WT=~/.glm-worktrees/pre94-foundation
grep -n '通知性 bus op' "$WT/packages/game/src/core/battle/actions/magic.ts"  # 修正可 grep
cd "$WT/packages/game" && ../../node_modules/.bin/vitest run src/core/battle/actions/
```

失效条件:四文件实现变化 → 重测;bus 命令集变化 → playMagicAnim 登记项复核。
````
<!-- incremental-original-source:end -->
