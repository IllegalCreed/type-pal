# GLM 并行工作包：D-01 配对工作流正式回归

Revision：r1，2026-09-13；主卡：[EDITOR-HISTORY-ORDER-1](../ops/tasks/EDITOR-HISTORY-ORDER-1-global-undo-transactions.md)，build，设计三签已齐不重签。
Coding Owner：Codex；本包：GLM测试贡献。用户要求“推进直到整卡做完”，Codex不停在小批节点；本包不拖住主线实施。
产品冻结：dded6f27。从**本工作包的交付提交**建立独立worktree/分支`codex/glm-history-workflow-tests`，完整起点SHA由交接提示词给出；
不得从随后变化的main取证。产品/既有测试对dded6f27零diff；新源码由Codex在main独占修改。

## 必读和边界

- AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、主卡r1设计及H-01～H-12。
- [已接收取证](glm-pre-e2e-prep-report.md)当前接收结论；G-H05/10/14仍有待证，既有观察不是新实现通过。
- `core/editor-history-coordinator.ts`、`edit-session.ts`、`script-editor.ts`、`script-editor-projection.ts`；
  `ui/App.tsx`/`ItemTab.tsx`七处配对caller；`scene-lifecycle.test.ts`、`editor-history-coordinator.test.ts`及新增`editor-history-foundations.test.ts`。
- Codex负责项目级日志、生命周期、App入口/动作名称、原生与视觉、全仓check/官方ratchet/严格fast。
  GLM不改产品、不做浏览器/截图/像素/观感验收，不向主卡代签、改Status或标done；本包不是独立终审。
- 测试仅使用当前稳定公开API：`new EditorHistoryCoordinator(main, script)`、`dispatch(scriptCommand, mainCommand)`、
  `undo()/redo()`；两session的`dispatch/getState/getStateSnapshot/isDirty/canUndo/canRedo/subscribe/getHistoryVersion`。
  目标是构造协调器后两session普通dispatch也归入全局历史。不读取私有栈、不mock协调器/会话本身、不加旧新版本兼容适配。
  暂不依赖尚未落地的connect/dispose/动作标签新API；生命周期真实caller与命令对象复用只做具名census，交Codex处理。

## 20项检查范围（可一例覆盖多项，不机械凑20个test）

| ID | 必须取证/断言的业务结果 |
|---|---|
| P01～P07 | 七类真实配对：新建/复制/删除场景、新增/删除实体、新增/删除物品私有脚本；每类成功→一次undo双侧恢复→一次redo双侧恢复，保存合并结果合法 |
| P08 | pair→main→script，连续undo与redo严格按提交顺序；不得先把pair脚本半边拆掉 |
| P09 | script→main→pair 的反向排列，读取完整双侧状态而非只看undo返回值 |
| P10 | 两笔pair连续撤销/重做，两笔身份独立且数据不串 |
| P11 | pair之间插入另一领域普通编辑；撤销到边界/重做到底无残留 |
| P12 | 七处caller的实际Command组合与顺序逐条对账，不以相似命令名代替真实入口 |
| P13 | main成功新分支清掉script的redo，不能用session.redo复活孤儿 |
| P14 | script成功新分支清掉main的redo，对称场景 |
| P15 | 明确返回原state的main no-op不清全局redo；script no-op已有首批覆盖，只补交叉上下文 |
| P16 | 第一/第二参与者apply失败，完整双侧状态、dirty、可撤销/重做及后续合法操作均保持；用真实Command包故障门，不改产品 |
| P17 | main/script两类同步订阅在pair成功时只观察到完整结果，失败时不看到半状态；版本不要求回退 |
| P18 | 保存标记不改全局顺序；map hydrate与普通通知和新作者操作分栏（必要宿主用deferred，不用sleep） |
| P19 | 至少一族真实seed→正式loader→pair编辑/undo/redo→保存序列化→loader重开核两侧作者内容；不要用无效最小对象充闭环 |
| P20 | 剩余命令对象复用/Root新建与重挂载caller census，列真实调用点与可证伪限制，不自行决定新生命周期API或全仓Command治理 |

先做P01～P12及P19，接着P13～P18，最后对账P20。可以用内存FileSystem边界替身，复用仓内fixture，
但禁止mock真实身份/历史/引用策略。所有负例先证fixture可合法成功，拒绝必须验证真正业务状态与零相关IO。
已在dded6f27修复的14项基础回归只复跑，不复制；当前全局错序尚未修，新增正确性断言在冻结树上预期红是正常的，
不可skip/test.fails/宽松匹配。缺API/坏fixture/异常收集是环境错误，不是缺陷回归红。

## 写入白名单、验证与回执

- `packages/editor/src/core/editor-history-paired-workflows.test.ts`（新增；fixture优先内置本文件，不改共享helper）。
- `docs/testing/glm-editor-history-workflows-receipt.md`（新增；只写GLM回执与日志）。

不得改本工作包、主卡、既有测试、产品、配置、锁文件、覆盖率基线、data/projects/reference或任何原/GLM旧探针。
只跑新增文件+定向相邻、editor typecheck、改动文件Biome；不跑全仓check/coverage/ratchet与Codex争抢。
报告逐P项真实test名/状态/缺口、实际命令/exit/日志、完整候选SHA及白名单对账；失败与上游重叠护栏如实分类，
不要只凭“全部退出0”自证，不靠记忆写统计。完成后整批提交推送，给Codex接收；主线会适配到新核心并统一质量门。
GLM是测试贡献者，必须终审披露，不能由本包自测代替独立第三方验收；不转Kimi、不代签、不标done。

## 交接提示词

从Codex给定的工作包交付SHA创建独立分支/worktree，按上方范围连续完成；无需每小组询问继续。
读主卡与本工作包后直接写白名单正式测试和回执。Codex继续核心实现；本包冻结树上的预期业务红与将来主树转绿分别报告。
无未完成工作时提交推送回Codex；遇到独立项阻断先登记并继续可执行项，不转交视觉、不扩产品范围。
