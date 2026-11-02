# game core battle-system.ts 大文件轮终章（glm-foundation 模块 5 批 8）

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: audit-report-v1 / 1.0.0

## 审计问题

本页审计主题:game 的 core/battle/battle-system.ts(3131 行全文读毕)B–G 补维;A 维引用 Codex 3s 深切片(主 lifecycle/UI 测试+cov85/GLM/runtime-context/finalization/settlement/state 全家对照 battle.c/fight.c/script.c/global.h)+2026-10-18 补审(supplementary-audit 含 save 排重漏迁修复);基点 53db76bbb 线(body 基准=批7提交后 HEAD)。原文 Status: review(候选待 Codex 据证验收)。Codex 当前裁定(2026-10-19):本页保留作者阶段证据,未获整包/全维收口验收;可复用范围与逐文件依据见 [codex-stage2-rework.json](../codex-stage2-rework.json)。

## 范围与证据

改动 1 处仅注释。验证证据:body-invariance(同目录)与整改前 HEAD 一致;定向原文宣称 30 套件 68/68、0 failed suites(state-machine 5 态+cov85+turn-boundaries+glm-next-wave+settlement+action-error-arms 六族);game 全包 typecheck 0 错;scoped biome 0/0/0;diff --check 干净。未跑 game 全包/全仓门(按准入)。68 例宣称的信用状态见下方 2026-10-20 勘误。

## 发现

整改:tickPreBattle docblock『(M3 跳过 wScriptOnReady)』过时——scriptOnReady 已在 performAction 期敌轮到时完整实现(L2509-2537,含 B2 c7 show-once 返回值回写+中招敌跳过 sdlpal#311 对齐);同步把『起手起菜单』的旧描述改为现状(菜单延后到 turnStart 之后,selectAction case 处理)。A 维(引用 3s+补审)复核:startBattle 资源/敌槽/0 槽占位(DH1)/活对象表 overlay 播种/复活+装备重建顺序、phaseStall 看门狗 selectAction 豁免、八个 phase-agnostic hold 优先级链、DL1-4/DM7/DM11-12/DH2-3 RNG 序与姿势复位、ValidateAction 降级链(DH3)、毒 tick 门控与死因音——全部与 fight.c/battle.c 锚一致。唯一 sdlpal TODO 引用(L2072 扇形逃跑)是合理文档(用户已拍板统一方向偏离)。C:资源生命周期单一 owner(battle-runtime-context),本文件仅相位路由+UI+派发;re-export 块为 legacy import 兼容。

## 结论

注释整改批(1 处):行为零变由 body-invariance 恒真+定向绿+typecheck 0 合证。定向计数按两态读:原文宣称 30 套件 68/68,树内可核附件为 directed.json(39 passed/3 files)与 directed-2.json(29 passed/3 files,第二次运行)两份。

## 整改与复核

Codex 2026-10-20 剩余29文件返工勘误:本目录可核附件只有 39passed/3files,不能支撑正文 68 例;多出的 29 例没有对应原件,撤回该数字的本片信用,保留原 README 与原件;此前 3s 与后续复活各有独立有限证据,不合计冒称新跑全包。逐文件八维、原件与限制见 [codex-final29.json](../codex-final29.json);本节不接收原文整包/模块收口宣称。复验入口(原页给出,此处概述):定向跑 state-machine/cov85/turn-boundaries 三测试;grep scriptOnReady 在 performAction 期 修正可 grep。失效条件:实现变化→重测;phase/hold 优先级或 ValidateAction 链变化→3s 证据重估。本轮治理未重跑任何命令;候选待 Owner 接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 3964B / SHA-256 f98d91f75db72a1e94969f837e5287cfc1d03eee003fc7ba6d456c3c63bdd3be；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
````markdown
# game core battle-system.ts 大文件轮终章（glm-foundation 模块 5 批 8）

> Codex当前裁定（2026-10-19）：本页保留作者阶段证据，未获整包/全维收口验收；可复用范围、逐文件依据与未知项见[当前返工记录](../codex-stage2-rework.json)。

Status: review（候选待 Codex 据证验收）
Owner: GLM；基点 `53db76bbb` 线（body 基准=批7提交后 HEAD）
范围：`core/battle/battle-system.ts`（3131 行**全文读毕**）。A 维引用 Codex 3s 深切片（主 lifecycle/UI 测试 + cov85/GLM/runtime-context/finalization/settlement/state 全家对照 battle.c/fight.c/script.c/global.h）+ 2026-10-18 补审（supplementary-audit 含 save 排重漏迁修复）;本批 B–G 补维。

## 短回执

- **改动 1 处（仅注释）**：`tickPreBattle` docblock"(M3 跳过 wScriptOnReady)"过时——scriptOnReady 已在 performAction 期敌轮到时完整实现（L2509-2537,含 B2 c7 show-once 返回值回写 + 中招敌跳过 sdlpal#311 对齐）;同步把"起手起菜单"的旧描述改为现状（菜单延后到 turnStart 之后,selectAction case 处理）。
- **验证**：body-invariance 与整改前 HEAD 一致;定向 **30 套件 68/68、0 failed-suites**(state-machine 5 态 + cov85 + turn-boundaries + glm-next-wave + settlement + action-error-arms 六族);game 全包 typecheck 0 错;scoped biome 0/0/0;diff --check 干净。未跑 game 全包/全仓门（按准入）。

## 八维结论（B–G 补维重点）

| 维 | 结论要点 |
|---|---|
| A(引用) | 3s + supplementary-audit 证据链完整,依赖未变。本批复核:startBattle 资源/敌槽/0 槽占位(DH1)/活对象表 overlay 播种/复活+装备重建顺序、phaseStall 看门狗 selectAction 豁免、八个 phase-agnostic hold 优先级链、DL1-4/DM7/DM11-12/DH2-3 RNG 序与姿势复位、ValidateAction 降级链(DH3)、毒 tick 门控与死因音——全部与 fight.c/battle.c 锚一致。唯一 sdlpal TODO 引用(L2072 扇形逃跑)是合理文档(用户已拍板统一方向偏离)。 |
| B | 本批修 1 处。其余 3100 行注释经 3s+补审+多轮 fix 批持续维护,零常量级过时残留(与 event-system 不同的原因:该文件的常量注随各 fix 批同步更新)。 |
| C | 资源生命周期单一 owner(battle-runtime-context);本文件仅相位路由+UI+派发,perform* 在 actions/ 家族——分层清楚。re-export 块(battle-progression/settlement)为 legacy import 兼容。 |
| D | gridNavigate/isVerticalDialogSwap 等与 event-system 有小同构(各自上下文不同,不合并——对话 swap 两处语义微差:battle 版判 style 互换,event 版同);复用 createSelectionMenu 菜单原语。 |
| E | 68 例覆盖 5 态机/回合边界/结算/action 错误臂。 |
| F/G/H | 分区清楚(常量→startBattle→tick 路由→UI 输入→target/commit→hold 族→perform 派发→postAction);无死出口(fleeStepDelta 参数带下划线=有意保留签名,user 拍板的统一方向实现);RNG/时间可注入 ✓。 |

## 复验入口（只读）

```bash
WT=~/.glm-worktrees/pre94-foundation
cd "$WT/packages/game" && ../../node_modules/.bin/vitest run src/core/battle/battle-state-machine.glm-battle.test.ts \
  src/core/battle/battle-system.cov85.test.ts src/core/battle/battle-turn-boundaries.glm-turn.test.ts
grep -n 'scriptOnReady 在 performAction 期' "$WT/packages/game/src/core/battle/battle-system.ts"  # 修正可 grep
```

失效条件:实现变化 → 重测;phase/hold 优先级或 ValidateAction 链变化 → 3s 证据重估。


## Codex 剩余29文件返工（2026-10-20）

本目录可核附件只有39passed/3files，不能支撑正文68例；多出的29例没有对应原件，撤回该数字的本片信用，保留原README与原件。此前3s与后续复活各有独立有限证据，不合计冒称新跑全包。

逐文件八维、原件与限制见[本轮回执](../codex-final29.json)。本节不接收原文整包/模块收口宣称。
````
<!-- incremental-original-source:end -->
