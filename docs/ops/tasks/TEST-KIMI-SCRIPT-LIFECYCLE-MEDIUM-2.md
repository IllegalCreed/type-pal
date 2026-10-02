# TEST-KIMI-SCRIPT-LIFECYCLE-MEDIUM-2 — 确认队列与脚本活动权限生命周期中包

Status: rework
Phase: phase2
Capability: test-coverage / script-lifecycle
Coding Owner: Kimi（仅两新test、专属fixture/evidence）
Reviewer: Codex（独立验收/官方接入）
Visual Verification Timing: N/A
Branch: `codex/kimi-script-lifecycle-medium-r1`

## 目标与范围

用户2026-10-02要求Kimi新一批，继续按此前剩余约1/3额度控制。16候选一次完整处置，预计12–18合法未重复新例、硬上限24；不是配额，不自动滚动续派大包。
独立树 `/Users/zhangxu/.codex/worktrees/kimi-script-lifecycle-medium/type-pal`；sourceBase `8990f0cde3edfe6feb908234aeafcc937daaec52`，当前content21/SAVE10。开工BASE为随后docs-only登记提交。
原Kimi32已accept/待接入，其旧树和9 deferred只读；O/P/Q及其他Owner不受本卡改状态/免counter。

[完整16候选/旧证明/门](../../testing/kimi-script-lifecycle-medium-20261002/README.md)、[14冻结与独占白名单](../../testing/kimi-script-lifecycle-medium-20261002/targets.json)、[合法公开API小样3/3](../../testing/kimi-script-lifecycle-medium-20261002/preflight.json)。
主源只读：script-confirm-modal.ts、script-activity-lineage.ts；script-world.ts与actual caller也冻结。只两个精确新测试/专属fixture/evidence可写，不改产品/旧测/配置/基线/真实数据/共享文档。
不做视觉/故事E2E，不改save格式/恢复策略/产品取舍；反控4目标由Codex最终统一实采，作者不写或运行反控工具、不重采旧针。

## 前提真值门与反证

一句话：当前两个内部模块有公开可观察的答案锁定/队列与lease归属/清理合同；追加测试前后产品行为不变。

| 维度 | 已核前提 | 一手证据 |
|---|---|---|
| primary | 当前公开API与实际caller是本包真值，无需原版机制裁决 | script-confirm-modal.ts:43-177；script-activity-lineage.ts:15-95；README逐候选锚 |
| 第一阶段 | N/A：内部确认queue/lineage capability，不移植玩法/观感 | READ-FIRST 铁律2/5/8 |
| 当前二阶段 | exact signal/coordinator/live lease、两帧答案门，标准API构造，不私态注入 | main.ts:1044/2668/4951；runtime-script-project.ts:207/496；script-project-core.ts:331/421 |
| 本卡目标 | 测试/专属证据白名单，current21/SAVE10、product before→after不变 | targets源blob/SHA与14文件冻结/verify；sourceBase真实对象 |

最强替代解释：main/Q12/原Kimi32或其他未集成强matcher已证，或输入只有造私态才能触发。
可证伪观察：同条件/业务oracle已有完整旧证则existing-proof；公开入口拒收正控或无真实coordinator-minted lease则不合法；最小产品变异旧新同红需要重排重，不以新fullName算新。
当前无新用户可见取舍、无产品改动。仅查已有实现的可观察边界；缺陷/冻结漂移/新恢复策略停受影响ID举证，不擅修其它层或扩域。

## 准入与验收

- Codex premise verified/design agree：直接读两源、main与runtime caller、全部两旧文件、Q12固定候选与Kimi32交付；纯readonly source，独立测试Owner。FALSE锁定/正索引中项取消/最新闭lease回落三个公开输入已真实3/3。
- **Codex build allowed：仅README精确16候选和targets白名单**；当前模式不等三贤人三签。主源在Q冻结池，但本卡新合同明确排除Q12；Q当前只NEXT2返工，不授予本卡去重领其旧域。
- 贡献者交付：pending。每候选完整合同账/真实directed、最终Ref全包/typecheck、静态完整0/0/0/docs/diff/verifier；环境红分列，不降低门。
- Codex独立验收：pending。真实4代表控制、至少两旧绿新红与最终hash；此职责不转成作者工具返工。合法缺口不足按事实接收，不凑到24。
- main check→official ratchet→protected与coverage/done/退休树清理均归Codex，作者不得做。用户产品验收N/A（不改产品/UX）。

## 2026-10-02 Codex 独立复核与窄收尾

固定候选 `3be438a9424b2b95afc268c60874a4f068aef491`，测试 `9d384895b4fc6a1de3d700ddc5013dc8bc4491ab`，证据 `bf2274e1bc4fe5a95c90d45e3d4c917b3081f264`；尾提交仅receipt。9改动白名单、14冻结与实际作者路由 verifier 通过。
[完整审核与可复制窄收尾提示词](../../testing/kimi-script-lifecycle-medium-20261002/evidence/codex-review-20261002/README.md)、[机器/原始三态账](../../testing/kimi-script-lifecycle-medium-20261002/evidence/codex-review-20261002/review.json)。审核落在Codex自有分支 `codex/kimi-lifecycle-review-r1`，未写作者活动树。

Codex counter **KM-LIFE-R1-01**：M01丢弃enqueue promise并以active/pendingCount1结束，违反本卡pending结算要求。仅改该例async/消费答案/末态清零；不增加ID/例数、不要求重做其余15例。作者证据“旧含Q对照22/22”改为main旧22实跑、Q12仅排重，L07概述分清预取消reason身份与gate等待规范化AbortError。L07精确测试/账正确，原派发措辞由Codex校正，不开产品修复。

独立新16+旧22+Q12为50/50；M03/M05/M06/L03四枚实际指定业务单红，旧34绿、恢复50/50，最终生产/支持hash一致。本轮反控有效仅针对此固定候选；M01改动后由Codex处理必要重采，不转作者工具返工。
Ref全包2263实跑2258绿+5 ignored资产环境红；补入portraits后受影响文件6例为1绿5项下一缺item-icons，不声称全绿。typecheck0、lint2782×0/0/0、docs/diff0；未执行official/main/coverage/done。原准入中的pending条目由本段覆盖，历史原样保留。

唯一下一步：Kimi按链接中窄提示词交一个最终候选，再由Codex收口；本卡16候选不滚动扩张，O/P/Q冻结不受影响。

## 历史开工提示词（已执行，不再派发）

```text
接手 TEST-KIMI-SCRIPT-LIFECYCLE-MEDIUM-2，唯一测试Owner Kimi，Status build allowed。原32中包已accept且只读，这是新卡，不重做旧返工。工作树 /Users/zhangxu/.codex/worktrees/kimi-script-lifecycle-medium/type-pal，分支 codex/kimi-script-lifecycle-medium-r1，sourceBase 8990f0cde3edfe6feb908234aeafcc937daaec52（content21/SAVE10），开工BASE取本分支Codex docs-only登记tip。先读AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、docs/ops/tasks/TEST-KIMI-SCRIPT-LIFECYCLE-MEDIUM-2.md、docs/testing/kimi-script-lifecycle-medium-20261002/README.md/targets.json/preflight.json，再核branch/status/verify --base BASE。完整处置16候选：确认队列拒绝激活零capture、view包装隔离、false答案锁定、无提交两帧仍pending、中项取消、真实监听清理/迟到旧abort、登记窗口取消；lineage外借lease异常不越权close、反向出栈/闭latest回落、coordinator和signal域局部清理、async失败持有与释放、自有abort reason、同lineage失败后合法重入。先按main/Q12/原Kimi32及targets固定候选全部旧fullName/matcher逐条件排重，existing-proof/不可构造/blocked不凑数；预计12–18，硬上限24，每ID一个主例，不拆换值标题。只两个指定新test、kimi-lifecycle-mid-2 fixture及evidence目录可写，产品/旧测/旧fixture/配置/基线/真实工程/共享docs/其它Owner只读。用真实Queue/Signal/公开Coordinator-minted lease与生产函数；typed IO/deferred/标准API spy可用，不unsafe桥/ignore/私态/核心mock/扩timeout。所有pending/reject真实结算；产品缺陷只停该ID报告、不夹修，不决定capture抛错恢复新机制或save策略。Codex承担最终四代表反控，作者不写/跑反控工具、不重采原四针或Q旧针。每批定向相邻/typecheck，末次Reforge全test/typecheck、根lint完整0/0/0/docs/diff/verifier；环境缺资产保留原红与路径，不假绿。evidence交逐合同完整源/caller/合法输入/旧blob-fullName-matcher/完整expected分类、真实file×fullName×status、receipt与原始门日志，一次完整40位SHA推本独立分支，测试与docs-only尾区间明确。不做浏览器/剧情/官方coverage/main/done/清树，16候选完成即停止，交Codex验收。
```

交接：2026-10-02 Codex已核范围、预备干净独立树并跑输入小样；等待用户转发，不声称已在Kimi运行。Vitest/pnpm技能用于强旧matcher排重与冻结包门，本卡不承诺85%或私有百分比相加。
