# battle-state + battle-runtime-context B–G 补维（glm-foundation 模块 7 批 12）

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: audit-report-v1 / 1.0.0

## 审计问题

本页审计主题:game 的 core/battle/battle-state.ts(917 行)+battle-runtime-context.ts(99 行)全文读毕的 B–G 补维;A 维引用 Codex 3u 深切片(2026-10-18 state factory 专测返工,typed 工厂/九状态 role 映射/零槽活敌布局刚补强)+3u/w 清理链 caller;基点 53db76bbb 线。原文 Status: review(候选待 Codex 据证验收)。Codex 当前裁定(2026-10-19):本页保留作者阶段证据,未获整包/全维收口验收;可复用范围与逐文件依据见 [codex-stage2-rework.json](../codex-stage2-rework.json)。

## 范围与证据

零整改批(改动 0 处)。验证证据:body-invariance(同目录)两文件一致(零编辑恒真);定向 13 套件 25/25、0 failed suites(directed.json:battle-state glm-next-wave+runtime-context+finalization+settlement 四族);game typecheck 0;scoped biome 0/0/0;diff --check 干净。

## 发现

过时模式扫描(简版/stub/留 Mx/暂当/TODO 等)零命中——两文件注释随 3u 返工与历次 DL/DM/DW 修复批持续同步,属『常量注随修复批维护』高地。A 维复核:createBattleState 的 0 占位槽 DH1 零值敌/站位撑列、九状态 seedBattleStatus CLASSIC 序(含 slow 留 0)、maxHealth=创建时满血(0x64 稳定真值)、objectId L25 精确/fallback 双路、敌 idle currentFrame 恒 undefined(D17c idle 时钟轮播,置 0 会冻结=已注明的回归边界)、>3 人抛错(g_rgPlayerPos[3] 真值)——与 battle.c/global.h 锚一致。runtime-context:stash 双键隐藏字段、resources finalize 置 undefined、runScript 只注入不清除(clear 统一删)——与 startBattle/finalize caller 合同一致。C/D:状态写入单一 owner(createBattleState 建/battle-system 推进/finalize 清);runtime-context 是资源生命周期唯一 stash owner(3u 评审结论沿用)。

## 结论

零整改批:B–G 八维作者主张全部通过,零代码/注释改动;25/25 定向绿+body-invariance 两文件恒真。无登记项。

## 整改与复核

本批零整改。复验入口(原页给出,此处概述):在 packages/game 定向跑 battle-state.glm-next-wave.test.ts 与 battle-runtime-context.test.ts。失效条件:两文件实现变化→重测;BattleState 字段/资源 stash 合同变化→3u 证据重估。本轮治理未重跑任何命令;候选待 Owner 接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 3007B / SHA-256 bd573efb27e2498fdfae8f440aa0b9800207cbfa6e2078281199de86fb05814c；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
````markdown
# battle-state + battle-runtime-context B–G 补维（glm-foundation 模块 7 批 12）

> Codex当前裁定（2026-10-19）：本页保留作者阶段证据，未获整包/全维收口验收；可复用范围、逐文件依据与未知项见[当前返工记录](../codex-stage2-rework.json)。

Status: review（候选待 Codex 据证验收）
Owner: GLM；基点 `53db76bbb` 线
范围：`core/battle/battle-state.ts`（917 行）+ `core/battle/battle-runtime-context.ts`（99 行），**全文读毕**。A 维引用 Codex 3u 深切片（2026-10-18 state factory 专测返工,typed 工厂/九状态 role 映射/零槽活敌布局刚补强）+ 3u/w 清理链 caller;本批 B–G 补维,handler 现状定谳法。

## 短回执

- **改动 0 处（零整改批次）**：过时模式扫描（简版/stub/留 Mx/暂当/TODO 等）**零命中**——两文件注释随 3u 返工与历次 DL/DM/DW 修复批持续同步,属"常量注随修复批维护"高地。
- **验证**：body-invariance 两文件一致（零编辑恒真）;定向 **13 套件 25/25、0 failed-suites**（battle-state glm-next-wave + runtime-context + finalization + settlement 四族）;game typecheck 0;scoped biome 0/0/0;diff --check 干净。

## 八维结论（B–G 补维重点）

| 维 | 结论要点 |
|---|---|
| A(引用) | 3u(2026-10-18)证据链 + 后续修复批。本批复核:createBattleState 的 0 占位槽 DH1 零值敌/站位撑列、九状态 seedBattleStatus CLASSIC 序(含 slow 留 0)、maxHealth=创建时满血(0x64 稳定真值)、objectId L25 精确/fallback 双路、敌 idle currentFrame 恒 undefined(D17c idle 时钟轮播,置 0 会冻结=已注明的回归边界)、>3 人抛错(g_rgPlayerPos[3] 真值)——与 battle.c/global.h 锚一致。runtime-context:stash 双键隐藏字段、resources finalize 置 undefined、runScript 只注入不清除(clear 统一删)——与 startBattle/finalize caller 合同一致。 |
| B | 零修改。optional 字段的"必设/仅旧 fixture 兼容"边界注完备;BattleAnimState 的 renderIdx/startMs/summonLoopStartMs "逻辑层不碰 performance.now" 注入时钟规范一致贯穿。 |
| C | 纯类型+工厂;状态写入单一 owner(createBattleState 建/battle-system 推进/finalize 清);runtime-context 是资源生命周期唯一 stash owner(3u 评审结论沿用)。 |
| D | 无重复知识;makeEmptySlotEnemy/seedBattleStatus 私有单一职责。 |
| E | 25 例含 typed 工厂/九状态映射/零槽布局/接回瞬间资源释放(3u 判别力已核,源未变)。 |
| F/G/H | 类型区(状态/玩家/敌/动作/相位/UI/动画/对话)分区清楚;无死出口;纯构造+stash 可直测 ✓。 |

## 复验入口（只读）

```bash
WT=~/.glm-worktrees/pre94-foundation
cd "$WT/packages/game" && ../../node_modules/.bin/vitest run src/core/battle/battle-state.glm-next-wave.test.ts src/core/battle/battle-runtime-context.test.ts
```

失效条件:两文件实现变化 → 重测;BattleState 字段/资源 stash 合同变化 → 3u 证据重估。
````
<!-- incremental-original-source:end -->
