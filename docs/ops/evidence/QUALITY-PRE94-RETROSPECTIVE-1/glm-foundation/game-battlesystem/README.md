# game core battle-system.ts 大文件轮终章（glm-foundation 模块 5 批 8）

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
