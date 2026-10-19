# game core scene-system.ts 大文件补维（glm-foundation 模块 5 批 6）

Status: review（候选待 Codex 据证验收）
Owner: GLM；基点 `53db76bbb` 线
范围：`core/scene-system.ts`（662 行全文读毕）。A 维引用 Codex 3q 深切片（2064 行主测试全文对照 play.c/scene.c/map.c）；本批 B–G 补维。

## 短回执

- **改动（行为保持重构 1 项 + 注释整合）**：删除两个**零调用方私有死函数** —— `_npcAt`（被菱形碰撞 + findSearchableNpc 路径取代,search 头注"npcAt 严格 ==" 即指它）与 `_findTriggerZoneNpc`（被 updateEventObjectsAndTrigger 内联版取代,L185 注自述）。全仓 grep（含测试）零引用。sdlpal trigger-zone 真值注（原挂死函数上）合并进 `TRIGGER_MODE_AUTO_MIN` 单一 docblock,避免堆叠孤儿。
- **行为保持证明**：删除前基线 scene-system.test **22 套件 110/110**；删除后 scene-system+search+mode **28 套件 132/132、0 failed-suites**（含基线全集超集）;game 全包 typecheck 0 错（死函数为模块私有,不进 d.ts,公共合同零变化）;scoped biome 0/0/0;diff --check 干净（−30/+8）。

## 八维结论（B–G 补维重点）

| 维 | 结论要点 |
|---|---|
| A(引用) | 3q 深切片证据（方向优先/菱形 bit13/fCheckRange 下边界/trigger 四态/DLb 单 cursor 等价取舍/扬州 anchor 修）依赖未变。本批复读内联触发实现与 play.c:107-165 映射一致;viewport y+320 sdlpal typo 忠实复刻有注。 |
| B | 除死函数携带的真值注（已合并保留）外,其余注释与实现一致;DIR_DELTA 展开注、DLb/DLc 取舍注、sState 阻挡三态注（DH5 豁免删除考据）均为有效真值文档。 |
| C | _ctx 模块单例 + ctxOverride 测试注入;loadScene 与 game-state/scene-identity 单向协作,ownership 清楚。 |
| D/E | 无重复知识;132 例含 13-cell/碰撞/触发/LRU 全轴（3q 期判别力已核）。 |
| F/G/H | 分段清楚（常量→碰撞→tick 三段→loadScene）;**本批删除仅有的两处死代码**;确定性纯逻辑直测 ✓。 |

## 复验入口（只读）

```bash
WT=~/.glm-worktrees/pre94-foundation
grep -rn '_npcAt\|_findTriggerZoneNpc' "$WT/packages" --include='*.ts' | wc -l   # 预期 0
cd "$WT/packages/game" && ../../node_modules/.bin/vitest run src/core/scene-system.test.ts
node "$WT/node_modules/.bin/tsc" --noEmit -p "$WT/packages/game/tsconfig.json"
```

失效条件:触发 zone 公式/碰撞语义变化 → 3q 证据重估;本批 diff 之外的实现变化 → 重测。
