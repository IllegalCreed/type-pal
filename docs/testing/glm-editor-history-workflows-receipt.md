# GLM 配对工作流回归回执（glm-editor-history-workflows r1）

工作包：[glm-editor-history-workflows](glm-editor-history-workflows.md) r1。
主卡 [EDITOR-HISTORY-ORDER-1](../ops/tasks/EDITOR-HISTORY-ORDER-1-global-undo-transactions.md) build，三席设计已签不重签。
执行：GLM（测试贡献者，终审须披露）；产品冻结 **dded6f27**；分支基点 **64b3c8ba**（工作包交付提交，仅文档）。
本包为冻结树上的正式回归取证：**15 绿 + 5 预期红（全部为 D-01 未实现的全局历史正确性断言）**，不是产品修复声明。

## 冻结与白名单对账

- worktree `/Users/zhangxu/illegal/type-pal-glm-histwf`，分支 `codex/glm-history-workflow-tests`，起点 64b3c8ba；`git diff dded6f27..64b3c8ba -- packages` 为空（产品/既有测试零 diff）。
- 白名单新增恰两文件：`packages/editor/src/core/editor-history-paired-workflows.test.ts`（20 用例）+ 本回执。不改产品/既有测试/共享 fixture/配置/基线/主卡/旧探针。
- 测试只用稳定公开 API（`new EditorHistoryCoordinator`、`dispatch/undo/redo`、两 session 公开方法）；undo/redo 走协调器优先 + 「最后通知归属」启发式 fallback（以 subscribe 复现 App historyOwnerRef 语义），不读私有栈、不 mock 协调器/会话。
- P12/P20 的只读 fs/grep 对账沿用仓内 Vitest-only Node 审计惯例（`// @ts-nocheck`，同 design-system boundary.test.ts 先例），编辑器包无 Node 类型。

## 命令与退出码（最终提交树实跑）

```bash
pnpm --filter @type-pal/editor exec vitest run src/core/editor-history-paired-workflows.test.ts
# exit 1 —— 5 failed | 15 passed (20)，五红均为下表「预期红」，逐条为合同断言失败（非环境错误）
pnpm --filter @type-pal/editor exec vitest run src/core/editor-history-coordinator.test.ts src/core/editor-history-foundations.test.ts src/core/scene-lifecycle.test.ts
# exit 0 —— 3 files / 23 passed（定向相邻）
pnpm --filter @type-pal/editor exec tsc --noEmit -p .        # exit 0
pnpm --filter @type-pal/editor exec biome check src/core/editor-history-paired-workflows.test.ts
# exit 0 —— 0 error / 0 warning（两次 format 自动修复后复跑）
```

日志：`/tmp/glm-histwf-final.log`（本套件全量输出）。过程失败（均已修复，未改产品）：
首版 items fixture 缺失（blank seed 无物品）→ 补合法 item；undo 断言误含 dirty 旗标（undo 保守保留
dirty 是已确立行为）→ 拆出 content() 内容层断言；P03 场景删除的脚本侧 provider 形状错（应
`(next)=>index(mainState,next)`）→ 修正；P16/P17 故障注入为同步 throw（coordinator.dispatch 非异步）
→ 改 `expect(()=>…).toThrow`；P18 hydrate 缺 loadMap 配置 → blankRig 配置真实 loader；P10 断言写成
两步后必为 0 → 改为撤空观察；node 动态导入 TS2591 → 静态导入 + ts-nocheck 惯例；一次重复 import。

## 20 项逐项账（15 绿 / 5 预期红 / 0 blocked / 0 N-A）

| ID | 测试名（唯一） | 状态 | 证据摘要 |
|---|---|---|---|
| P01 | P01 配对新建场景 | 绿 | AddSceneDefinition+AddScene：成功双侧 scene/canonical 同步 +1、undo/redo 内容恢复、保存合并序列化通过 |
| P02 | P02 配对复制场景 | 绿 | Duplicate×2 同构闭环 |
| P03 | P03 配对删除场景 | 绿 | 先配对新建再配对删除（真实双 provider）；删除后保存合法、undo 内容恢复 |
| P04 | P04 配对新增实体 | 绿 | canonical(runtime 投影) 成对；entityIds/canonicalEntityIds 同步 |
| P05 | P05 配对删除实体 | 绿 | 同上删除闭环 |
| P06 | P06 配对新增物品私有脚本 | 绿 | ItemTab 真实组合（Add 私有 + UpdateItem 加 runScript ref）；privateScripts/itemUseEffects 同步 |
| P07 | P07 配对删除物品私有脚本 | 绿 | ItemTab 删除组合闭环 |
| P08 | P08 pair→main→script | **预期红** | 严格逆序断言失败：冻结树单栈归属先拆/错撤（合同 [s1=20/空,s2=10/空,s3=0/null] 未达成） |
| P09 | P09 script→main→pair | **预期红** | 第一次 undo 应撤整笔 pair：冻结树价格未回 30 → 全局顺序错误 |
| P10 | P10 两笔 pair 连续撤/重做 | 绿 | 协调器双顶接管两笔 pair：11/1 与 22/2 独立往返 |
| P11 | P11 pair 间插入普通编辑 | 绿 | 撤到双侧边界（canUndo 双 false、正文回 null）、重做到底内容全恢复 |
| P12 | P12 七处 caller 对账 | 绿 | 源码快照断言：App 5 处 + ItemTab 2 处，脚本侧命令先于主侧（dispatch(script,main) 顺序）逐条核 |
| P13 | P13 main 新分支清 script redo | **预期红** | 孤儿 redo 复活正文（wait ms=1 重现）——跨侧分支清理未实现 |
| P14 | P14 script 新分支清 main redo | **预期红** | 对称：孤儿 redo 复活价格 7 |
| P15 | P15 同态 main no-op 不清 redo | 绿 | dispatch 返回 false 不入栈，script redo 保留（与 G-H08b 取证一致） |
| P16 | P16 第一/第二参与者失败 | 绿 | 真实 Command 包故障门：第二参与者失败 receipt 回滚双侧（snap 全等）、第一参与者原样抛出、后续合法操作可用 |
| P17 | P17 订阅只见完整结果 | **预期红** | 成功 pair 期间脚本订阅观察到半状态（script 已变/main 未变）1 次 |
| P18 | P18 markSaved/hydrate 分栏 | 绿 | markSaved 走通知但不增 historyVersion；ensureMapLoaded 真实 hydrate 不增 historyVersion、地图载入 |
| P19 | P19 保存重开闭环 | 绿 | seed→loader→配对+正文→merge→serialize→内存盘→重开：主侧 buyPrice=123、脚本侧 body=[wait 9] 双核 |
| P20 | P20 caller census | 绿 | dispatch(script,main) 恰 7 处；UI 无跨操作 Command 实例复用模式；Root 成组新建双 session、不持归属启发式 |

## 预期红与缺口登记（交 Codex 主线实现时转绿）

五项预期红全部是 D-01 已签设计的目标行为，与已接收取证（G-H01/02/07/13）同根：
1. 全局操作时间线未接管普通 dispatch 的撤销路由（P08/P09 错序）。
2. 任一侧新成功分支不清另一侧 redo（P13/P14 孤儿复活）。
3. pair 提交期间同步订阅可见半状态（P17；设计 6 的「事务期间不暴露半状态」）。

可证伪限制（P20 具名登记）：Command 对象复用合同与 Root 重挂载生命周期 API 由 Codex 主线决定，
本包只列调用点 census；协调器失败补偿中「main 补偿 redo 失败」二级失败路径未在本包注入（属
foundations 已覆盖的失败域，不在 20 项范围）。

## 交接

GLM 测试贡献者；本包不自证独立验收。候选 `ee2099b9`（amend 回填前；最终以远端推送 SHA 为准）；完整计数来自最终提交树实跑日志。
交 Codex 接收：预期红将在 D-01 主线实现（全局日志 Owner）后转绿；届时本套件连同 foundations/
coordinator 既有回归一起适配新核心并统一质量门。
