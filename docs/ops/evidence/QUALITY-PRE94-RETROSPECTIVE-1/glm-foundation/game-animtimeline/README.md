# anim-timeline + battle-anim-driver + turn-queue B–G 补维（glm-foundation 模块 7 批 13）

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: audit-report-v1 / 1.0.0

## 审计问题

本页审计主题:game 的 core/battle/{anim-timeline,battle-anim-driver,turn-queue}.ts(2066/254/126 行)B–G 补维;anim-timeline 逐 builder 抽样精读(头/物理/PreMagic/OffMagic/EnemyMagic/召唤段)+全量导出 census,另两文件全文读毕;A 维引用既有深切片(3m/3t 期 fight.c 逐帧对照+DL/DM/M6-M9/L12-22/W4/DH6 历次演出修复批)。原文 Status: review(候选待 Codex 据证验收)。Codex 当前裁定(2026-10-19):本页保留作者阶段证据,未获整包/全维收口验收;可复用范围与逐文件依据见 [codex-stage2-rework.json](../codex-stage2-rework.json)。

## 范围与证据

零整改批(改动 0 处)。验证证据:body-invariance(同目录)三文件一致(零编辑恒真);定向 19 套件 44/44、0 failed suites(directed.json:anim-timeline glm-next-wave+state-machine+cov85+turn-boundaries 四族覆盖 driver/queue/时间线全链);game typecheck 0;scoped biome 0/0/0;diff --check 干净。

## 发现

过时模式扫描零命中;导出 census 24 个 builder/常量全部有消费者(逐符号 grep 核,零 ZERO-CONSUMER)。turn-queue 头部经 GAME-ACTION-QUEUE-TIE-ORDER-1 批准修复后已是『不稳定排序/13 槽/0xffff 终止/dex-1 近似非真值』的精确声明;driver 的『逻辑层不碰 performance.now/renderIdx 不落后不回退』注入时钟规范与 summon/death-fade 三专驱分工一致。A 维复核:buildPlayerAttackTimeline 冲刺/特效落点/收势抖动、PreMagic 上移累进 (−10,−5) 固定注、OffMagic 总帧数 (n−fireDelay)×SHORT(effectTimes)+n+shake 与 (speed+5)*10 帧时长、DM9 layerOffset=SHORT(special)、W4 iBlow 按目标累加、L14 施法姿前置帧 CLASSIC/WIN95 分支、L15 物品名贯穿帧——与 fight.c 锚一致。driver:applyAnimFrameVisual/applyAnimFrame 分工、stepBattleAnimRender 惰性锚点+前向单调扫描、resetFightersAfterAction 敌 idle 复位 undefined(D17c)。queue:填充→SHORT 交换→0xffff 截取三步与 C 一致。

## 结论

零整改批:B–G 八维作者主张全部通过,零代码/注释改动;44/44 定向绿+body-invariance 三文件恒真。C 维:纯函数 builder↔driver↔consumer 三层单向,时间线推进逻辑双 caller 共用 advanceBattleAnimFrames 防漂移。

## 整改与复核

本批零整改,无登记新项。复验入口(原页给出,此处概述):在 packages/game 定向跑 anim-timeline.glm-next-wave.test.ts。失效条件:三文件实现变化→重测;帧时长/排序合同变化→3m/3t+队列卡证据重估。本轮治理未重跑任何命令;候选待 Owner 接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 3172B / SHA-256 15d5ae112f0037bae900bf608a1d99a4ed1ed60d0e2f7d357f2ed6b9e8278748；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
````markdown
# anim-timeline + battle-anim-driver + turn-queue B–G 补维（glm-foundation 模块 7 批 13）

> Codex当前裁定（2026-10-19）：本页保留作者阶段证据，未获整包/全维收口验收；可复用范围、逐文件依据与未知项见[当前返工记录](../codex-stage2-rework.json)。

Status: review（候选待 Codex 据证验收）
Owner: GLM；基点 `53db76bbb` 线
范围：`core/battle/{anim-timeline,battle-anim-driver,turn-queue}.ts`（2066/254/126 行）。anim-timeline 逐 builder 抽样精读（头/物理/PreMagic/OffMagic/EnemyMagic/召唤段）+ 全量导出 census;另两文件**全文读毕**。A 维引用既有深切片（3m/3t 期 fight.c 逐帧对照 + DL/DM/M6-M9/L12-22/W4/DH6 历次演出修复批）;本批 B–G 补维。

## 短回执

- **改动 0 处（零整改批次）**：过时模式扫描零命中;**导出 census 24 个 builder/常量全部有消费者**(逐符号 grep 核,零 ZERO-CONSUMER)。turn-queue 头部经 GAME-ACTION-QUEUE-TIE-ORDER-1 批准修复后已是"不稳定排序/13 槽/0xffff 终止/dex-1 近似非真值"的精确声明;driver 的"逻辑层不碰 performance.now/renderIdx 不落后不回退"注入时钟规范与 summon/death-fade 三专驱分工一致。
- **验证**：body-invariance 三文件一致（零编辑恒真）;定向 **19 套件 44/44、0 failed-suites**（anim-timeline glm-next-wave + state-machine + cov85 + turn-boundaries 四族覆盖 driver/queue/时间线全链）;game typecheck 0;scoped biome 0/0/0;diff --check 干净。

## 八维结论（B–G 补维重点）

| 维 | 结论要点 |
|---|---|
| A(引用) | 3m/3t + 演出修复批证据链。本批复核:buildPlayerAttackTimeline 冲刺/特效落点/收势抖动、PreMagic 上移累进 (−10,−5) 固定注、OffMagic 总帧数 `(n−fireDelay)×SHORT(effectTimes)+n+shake` 与 (speed+5)*10 帧时长、DM9 layerOffset=SHORT(special)、W4 iBlow 按目标累加、L14 施法姿前置帧 CLASSIC/WIN95 分支、L15 物品名贯穿帧——与 fight.c 锚一致。driver:applyAnimFrameVisual/applyAnimFrame 分工、stepBattleAnimRender 惰性锚点+前向单调扫描、resetFightersAfterAction 敌 idle 复位 undefined(D17c)。queue:填充→SHORT 交换→0xffff 截取三步与 C 一致。 |
| B | 零修改。OffMagic/EnemyMagic 的 `targetIdx 透传但本体不读`有诚实说明;dex-1 fallback "不作 SDLPal 二抽真值"边界声明准确。 |
| C | 纯函数 builder ↔ driver ↔ consumer 三层单向;时间线推进逻辑 battle-system/tickBattle 双 caller 共用 advanceBattleAnimFrames 防漂移(注有)。 |
| D | 无重复知识;builder 参数对象接口逐字段带 fight.c 行锚。 |
| E | 44 例含时间线帧序/driver 复位/queue 同速交换(各批判别力已核)。 |
| F/G/H | builder 按演出类型分区;无死出口(census 已核);纯函数+注入 rng 可直测 ✓。 |

## 复验入口（只读）

```bash
WT=~/.glm-worktrees/pre94-foundation
cd "$WT/packages/game" && ../../node_modules/.bin/vitest run src/core/battle/anim-timeline.glm-next-wave.test.ts
```

失效条件:三文件实现变化 → 重测;帧时长/排序合同变化 → 3m/3t+队列卡证据重估。
````
<!-- incremental-original-source:end -->
