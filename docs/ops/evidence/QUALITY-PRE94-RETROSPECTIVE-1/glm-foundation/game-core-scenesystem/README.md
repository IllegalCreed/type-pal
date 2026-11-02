# game core scene-system.ts 大文件补维（glm-foundation 模块 5 批 6）

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: audit-report-v1 / 1.0.0

## 审计问题

本卡审计对象是 core/scene-system.ts(662 行全文读毕)的 B–G 补维:A 维引用 Codex 3q 深切片(2064 行主测试全文对照 play.c/scene.c/map.c,方向优先/菱形 bit13/fCheckRange 下边界/trigger 四态/DLb 单 cursor 等价/扬州 anchor 修),本批处理其余维度并清除该文件仅有的两处死代码。原文时点 Codex 裁定(2026-10-19)为:保留作者阶段证据,未获整包/全维收口验收。

## 范围与证据

范围仅 core/scene-system.ts 一个生产文件,基点 53db76bbb 线。证据成对:删除前基线 [baseline-before-deletion.json](baseline-before-deletion.json) 记录 scene-system.test.ts 单文件 110/110 绿(2026-10-18T15:23:37Z,标题零命中死函数名);删除后 [directed.json](directed.json) 记录 scene-system+search+mode 三文件 132/132 绿(2026-10-18T15:26:20Z,基线全集超集)。两份均 success=true、0 失败、0 条 failureMessages。后继核验入口:[codex-dead-removals.json](../codex-dead-removals.json) 与 [codex-stage2-rework.json](../codex-stage2-rework.json)。

## 发现

实质改动一项:删除两个零调用私有死函数——_npcAt(被菱形碰撞+findSearchableNpc 路径取代,search 头注"npcAt 严格 =="即指它)与 _findTriggerZoneNpc(被 updateEventObjectsAndTrigger 内联版取代,L185 注自述);全仓 grep(含测试)零引用,原挂死函数的 sdlpal trigger-zone 真值注合并进 TRIGGER_MODE_AUTO_MIN 单一 docblock 避免孤儿堆叠。行为保持口径:删码前 110/110 → 删码后三文件 132/132(0 failed-suites),game 全包 typecheck 0(私有函数不进 d.ts,公共合同零变化),scoped biome 0/0/0,diff --check 干净(−30/+8)。

## 结论

Codex 2026-10-20 当前有限裁定:两私有函数删除成立,但原 grep 命令会受注释命中影响,改以 AST 引用/声明证据核定;生产注释去治理日期;本模块有 _ctx 单例及异步 loadScene,不再把整模块描述成确定性纯逻辑;132 原生结果复用,旧 3q 467 含诊断事实保留。文件保持 review,未授整卡/整包 accept。失效条件:触发 zone 公式/碰撞语义变化 → 3q 证据重估;本批 diff 之外的实现变化 → 重测。

## 整改与复核

继任关系:逐文件依据与原件见 [codex-dead-removals.json](../codex-dead-removals.json)(含 scene-system.ts 删码后 639 行身份与 D-O2 全局场景/并发加载设计不新认证的限制),返工范围见 [codex-stage2-rework.json](../codex-stage2-rework.json)。本页治理只重述文档语义,不重开任务、不重跑命令、不改历史裁定终态。

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
