# GLM 并行工作包：D-01 配对工作流正式回归

Status: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-20
Template: test-run-report-v1 / 1.0.0

本页是 EDITOR-HISTORY-ORDER-1 主卡的 GLM 并行工作包 D-01（配对工作流正式回归）build 期工作合同（Revision r1，2026-09-13）：产品冻结 `dded6f27`，GLM 测试贡献、Codex Coding Owner；主卡已三席及用户验收 done 归档，本包已交付接收，下文保留工作合同不重新派发。

## Scope

- 对象=P01–P20 二十项配对工作流取证（七类真实配对/提交顺序/no-op/apply 失败/订阅/保存序列化/seed→loader 闭环/命令复用 census）；产品/既有测试对 dded6f27 零 diff。

## Execution and assertions

| step | legal input | caller | machine assertion | business oracle |
|---|---|---|---|---|
| 测试边界 | 仅稳定公开 API：new EditorHistoryCoordinator(main, script)、dispatch(scriptCommand, mainCommand)、undo()/redo()、两 session dispatch/getState/isDirty/canUndo/canRedo/subscribe/getHistoryVersion | 不读私有栈、不 mock 协调器/会话本身、不加新旧版本兼容适配 | 目标=构造协调器后两 session 普通 dispatch 归入全局历史 | 暂不依赖未落地的 connect/dispose/动作标签新 API |
| P01–P07 | 七类真实配对（新建/复制/删除场景、新增/删除实体、新增/删除物品私有脚本） | 每类成功→一次 undo 双侧恢复→一次 redo 双侧恢复 | 保存合并结果合法 | — |
| P08–P18 | pair→main→script 与反向排列连续 undo/redo 严格按提交顺序；两笔 pair 身份独立；pair 间插入普通编辑；main/script 成功新分支清对侧 redo；原 state no-op 不清 redo；apply 失败完整双侧状态保持；订阅只见完整结果；保存标记不改全局顺序（deferred 非 sleep） | 真实 Command 包故障门，不改产品 | 冻结树上全局错序未修，新增正确性断言预期红是正常的 | 不可 skip/test.fails/宽松匹配；缺 API/坏 fixture/异常收集是环境错误 |
| P19–P20 | 真实 seed→正式 loader→pair 编辑/undo/redo→保存序列化→loader 重开核两侧作者内容；剩余命令对象复用/Root 重挂载 caller census | 内存 FileSystem 边界替身+仓内 fixture；禁 mock 真实身份/历史/引用策略 | 不用无效最小对象充闭环 | census 列真实调用点与可证伪限制，不自行决定新生命周期 API |

## Results

- 写入白名单：editor-history-paired-workflows.test.ts（新增）+ glm-editor-history-workflows-receipt.md；不得改主卡/既有测试/产品/配置/锁文件/coverage 基线/data/projects/reference。
- 只跑新增+定向相邻、editor typecheck、改动文件 Biome；不跑全仓 check/coverage/ratchet；GLM 是测试贡献者必须终审披露，不代签不标 done。

## Evidence

- 证据路径：本合同正文（quote 保全）；[已接收取证](../../e2e/route-and-checkpoint/glm-pre-e2e-prep-report.md)（G-H05/10/14 仍有待证）；回执在同目录 receipt 文件。

## Revision history

| revision | date | change | result | supersedes |
|---|---|---|---|---|
| D-01 工作包 | 2026-09-13 | P01–P20 合同 | 已交付接收（回执见 receipt） | 无 |
| 模板接入 | 2026-10-20 | S17 治理封套（quote 保全） | 不改变原结论 | 无 |

## 历史范围

legacy editor/editor-workflows 的 GLM D-01 工作包合同；固定来源与 source SHA 见下方保全节。

## 原始结论

P01–P20 二十项配对工作流取证合同（先 P01–P12+P19，后 P13–P18，最后 P20 对账）；冻结树预期红纪律。

## 当时证据

P 项表、公开 API 边界与白名单在 quote 保全。

## 当前有效性

historical。工作包已交付接收；主卡 done 归档。

## 继任文档

当前配对工作流状态归 EDITOR-HISTORY-ORDER-1 完成卡与现行测试。

## 原文保全

固定源 revision `3dc90ad8f6dde5a7ddcafc6b749b61dd53152751`，source SHA `1e6b67680dd7b729ff55aa579f9736de84d246f1788d7a6df88fd3b41cd4d13d`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与原源逐字节相等（不 trim、不替换）。
<!-- original-source-quote:start -->
> # GLM 并行工作包：D-01 配对工作流正式回归
>
> Revision：r1，2026-09-13；主卡：[EDITOR-HISTORY-ORDER-1](../../../../../ops/archive/tasks/done/EDITOR-HISTORY-ORDER-1-global-undo-transactions.md)已三席及用户验收通过、done归档。本包已交付接收，下文保留build期工作合同，不重新派发。
> Coding Owner：Codex；本包：GLM测试贡献。用户要求“推进直到整卡做完”，Codex不停在小批节点；本包不拖住主线实施。
> 产品冻结：dded6f27。从**本工作包的交付提交**建立独立worktree/分支`codex/glm-history-workflow-tests`，完整起点SHA由交接提示词给出；
> 不得从随后变化的main取证。产品/既有测试对dded6f27零diff；新源码由Codex在main独占修改。
>
> ## 必读和边界
>
> - AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、主卡r1设计及H-01～H-12。
> - [已接收取证](../../e2e/route-and-checkpoint/glm-pre-e2e-prep-report.md)当前接收结论；G-H05/10/14仍有待证，既有观察不是新实现通过。
> - `core/editor-history-coordinator.ts`、`edit-session.ts`、`script-editor.ts`、`script-editor-projection.ts`；
>   `ui/App.tsx`/`ItemTab.tsx`七处配对caller；`scene-lifecycle.test.ts`、`editor-history-coordinator.test.ts`及新增`editor-history-foundations.test.ts`。
> - Codex负责项目级日志、生命周期、App入口/动作名称、原生与视觉、全仓check/官方ratchet/严格fast。
>   GLM不改产品、不做浏览器/截图/像素/观感验收，不向主卡代签、改Status或标done；本包不是独立终审。
> - 测试仅使用当前稳定公开API：`new EditorHistoryCoordinator(main, script)`、`dispatch(scriptCommand, mainCommand)`、
>   `undo()/redo()`；两session的`dispatch/getState/getStateSnapshot/isDirty/canUndo/canRedo/subscribe/getHistoryVersion`。
>   目标是构造协调器后两session普通dispatch也归入全局历史。不读取私有栈、不mock协调器/会话本身、不加旧新版本兼容适配。
>   暂不依赖尚未落地的connect/dispose/动作标签新API；生命周期真实caller与命令对象复用只做具名census，交Codex处理。
>
> ## 20项检查范围（可一例覆盖多项，不机械凑20个test）
>
> | ID | 必须取证/断言的业务结果 |
> |---|---|
> | P01～P07 | 七类真实配对：新建/复制/删除场景、新增/删除实体、新增/删除物品私有脚本；每类成功→一次undo双侧恢复→一次redo双侧恢复，保存合并结果合法 |
> | P08 | pair→main→script，连续undo与redo严格按提交顺序；不得先把pair脚本半边拆掉 |
> | P09 | script→main→pair 的反向排列，读取完整双侧状态而非只看undo返回值 |
> | P10 | 两笔pair连续撤销/重做，两笔身份独立且数据不串 |
> | P11 | pair之间插入另一领域普通编辑；撤销到边界/重做到底无残留 |
> | P12 | 七处caller的实际Command组合与顺序逐条对账，不以相似命令名代替真实入口 |
> | P13 | main成功新分支清掉script的redo，不能用session.redo复活孤儿 |
> | P14 | script成功新分支清掉main的redo，对称场景 |
> | P15 | 明确返回原state的main no-op不清全局redo；script no-op已有首批覆盖，只补交叉上下文 |
> | P16 | 第一/第二参与者apply失败，完整双侧状态、dirty、可撤销/重做及后续合法操作均保持；用真实Command包故障门，不改产品 |
> | P17 | main/script两类同步订阅在pair成功时只观察到完整结果，失败时不看到半状态；版本不要求回退 |
> | P18 | 保存标记不改全局顺序；map hydrate与普通通知和新作者操作分栏（必要宿主用deferred，不用sleep） |
> | P19 | 至少一族真实seed→正式loader→pair编辑/undo/redo→保存序列化→loader重开核两侧作者内容；不要用无效最小对象充闭环 |
> | P20 | 剩余命令对象复用/Root新建与重挂载caller census，列真实调用点与可证伪限制，不自行决定新生命周期API或全仓Command治理 |
>
> 先做P01～P12及P19，接着P13～P18，最后对账P20。可以用内存FileSystem边界替身，复用仓内fixture，
> 但禁止mock真实身份/历史/引用策略。所有负例先证fixture可合法成功，拒绝必须验证真正业务状态与零相关IO。
> 已在dded6f27修复的14项基础回归只复跑，不复制；当前全局错序尚未修，新增正确性断言在冻结树上预期红是正常的，
> 不可skip/test.fails/宽松匹配。缺API/坏fixture/异常收集是环境错误，不是缺陷回归红。
>
> ## 写入白名单、验证与回执
>
> - `packages/editor/src/core/editor-history-paired-workflows.test.ts`（新增；fixture优先内置本文件，不改共享helper）。
> - `docs/testing/archive/legacy/editor/editor-workflows/glm-editor-history-workflows-receipt.md`（新增；只写GLM回执与日志）。
>
> 不得改本工作包、主卡、既有测试、产品、配置、锁文件、覆盖率基线、data/projects/reference或任何原/GLM旧探针。
> 只跑新增文件+定向相邻、editor typecheck、改动文件Biome；不跑全仓check/coverage/ratchet与Codex争抢。
> 报告逐P项真实test名/状态/缺口、实际命令/exit/日志、完整候选SHA及白名单对账；失败与上游重叠护栏如实分类，
> 不要只凭“全部退出0”自证，不靠记忆写统计。完成后整批提交推送，给Codex接收；主线会适配到新核心并统一质量门。
> GLM是测试贡献者，必须终审披露，不能由本包自测代替独立第三方验收；不转Kimi、不代签、不标done。
>
> ## 交接提示词
>
> 从Codex给定的工作包交付SHA创建独立分支/worktree，按上方范围连续完成；无需每小组询问继续。
> 读主卡与本工作包后直接写白名单正式测试和回执。Codex继续核心实现；本包冻结树上的预期业务红与将来主树转绿分别报告。
> 无未完成工作时提交推送回Codex；遇到独立项阻断先登记并继续可执行项，不转交视觉、不扩产品范围。
>
<!-- original-source-quote:end -->
