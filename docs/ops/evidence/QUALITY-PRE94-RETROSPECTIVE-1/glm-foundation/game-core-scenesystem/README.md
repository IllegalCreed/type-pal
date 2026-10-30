# game core scene-system.ts 大文件补维（glm-foundation 模块 5 批 6）

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: audit-report-v1 / 1.0.0

## 审计问题

原审计「game core scene-system.ts 大文件补维（glm-foundation 模块 5 批 6）」的主题按原文时点保留(摘录:> Codex当前裁定（2026-10-19）：本页保留作者阶段证据，未获整包/全维收口验收；可复用范围、逐文件依据与未知项见[当前返工记录](../codex-stage2-rework.json))。

## 范围与证据

原报告含章节[game core scene-system.ts 大文件补维（glm-foundation 模块 5 批 6）、短回执、八维结论（B–G 补维重点）、复验入口（只读）、Codex 2026-10-20 当前有限裁定]、2个链接;固定main源3181B(SHA e72efd24bf2a)。当前存活入口:[codex-dead-removals.json](../codex-dead-removals.json)、[codex-stage2-rework.json](../codex-stage2-rework.json)

## 发现

原文发现/计数/日期按原时点保留在保全块;本页不重算审计结论。

## 结论

原结论保持原时点;治理不改写审计判定,不撤销旧撤信,不恢复旧完成声明。

## 整改与复核

本治理候选仅覆盖文档角色与保全;整改事实以原文与后继卡为准;候选待Owner接收。


## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 3181B / SHA-256 e72efd24bf2a4bc64dc9ecbb30407cc8775287512e8ce51a5b8ecf9d876ae41c；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
````markdown
# game core scene-system.ts 大文件补维（glm-foundation 模块 5 批 6）

> Codex当前裁定（2026-10-19）：本页保留作者阶段证据，未获整包/全维收口验收；可复用范围、逐文件依据与未知项见[当前返工记录](../codex-stage2-rework.json)。

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

## Codex 2026-10-20 当前有限裁定

两私有函数删除成立，原grep命令会受注释命中影响，改以AST引用/声明证据。生产注释去治理日期；本模块有_ctx及异步loadScene，不再把整模块描述成确定性纯逻辑。132原生结果复用，旧3q467含诊断事实保留。 [逐文件依据与原件](../codex-dead-removals.json)。文件保持review，未授整卡/整包accept。
````
<!-- incremental-original-source:end -->
