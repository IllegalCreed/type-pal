# anim-timeline + battle-anim-driver + turn-queue B–G 补维（glm-foundation 模块 7 批 13）

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
