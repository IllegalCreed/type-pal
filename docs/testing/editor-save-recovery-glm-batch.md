# 作者保存恢复：GLM 大批测试工作包

本文件是[EDITOR-SAVE-RECOVERY-1](../ops/tasks/EDITOR-SAVE-RECOVERY-1-interrupted-author-save.md)的测试分工附件，
不是新任务卡或新产品设计。父卡保持build，继承已签r2；工作包revision为 **batch-r1（2026-09-10）**。
用户要求“大批交给GLM，一口气做完后由Codex检查”。本批为 **43个核验条目 + SR-01～12总对账**，不是43个已确认bug，
也不要求机械新增43条测试；已有可靠证据可复用，缺口必须补真实回归或给出明确阻断。

## 责任与冻结基线

- 产品基线固定 **aa87c305**。从本文件**首次加入仓库的文档提交**建立新worktree与
  `codex/glm-save-coverage-batch`，建议目录 `/Users/zhangxu/illegal/type-pal-glm-save-batch`。
  可用 `git log --diff-filter=A --format=%H -- docs/testing/editor-save-recovery-glm-batch.md` 定位起点。
  开始前核该起点的packages/scripts相对aa87c305零diff；若已有同名目录/分支，先检查，不覆盖或复用旧返工树。
- GLM独占本批新测试与自己的回执；**Codex仍唯一产品Coding Owner**。Kimi未被替代，整卡终审另行安排。
- 不每组等待Codex接收：G1→G5逐组自测/提交检查点，最后G6集中对账，**全部完成后统一交付**。
  局部遇真实产品缺陷，保留可执行红用例并登记，继续其余独立条目；前提冲突只暂停受影响组。
  修自己的测试/fixture错误不需要问用户。不能做完一组就结束并请求“继续”。
- Codex并行处理只读性能定位、产品修复与最终集成；不在GLM分支改文件，不重复实现本批新测试。
  GLM不追着main热更新实现；主线后续变化由Codex接收时适配，不能悄悄换产品基线使数字失去可比性。
- 未授权GLM修改产品、UI、schema/save/migration、权限协议、公开API、生成PAL工程、原探针或版本。
  A-07离开保护、N6b、完整E2E与大工程性能改造不在本工作包；本批不得用测试制造这些任务的实现授权。

## 必读与现状

先读AGENTS.md、CLAUDE.md阶段/通用规则、phase2/READ-FIRST、父卡r2设计红线/SR矩阵/历轮GLM counter与最新Codex回执，
以及[工程生命周期](../phase2/specs/project-lifecycle.md)、[覆盖率合同](coverage.md)。
已有fixture优先复用：`packages/editor/src/core/__tests__/author-save-fixture.ts`、`author-save-store-fixture.ts`。
真实集成参照 `project-open-workflows.test.ts`、`project-copy.test.ts`、`author-save-journal.test.ts`；
App真实调用链参照 `author-save-conflict.test.ts`，不要把手写save流程称为真实App测试。

aa87c305已过完整check（7包/556文件/6,668项）与单次严格fast（618生产文件/6,180项）。
editor为220生产文件/189测试文件/1,941项；这些是接手参考，回执必须从本人运行的候选树重新生成。

| 模块 | 行 | 函数 | 分支 |
|---|---|---|---|
| project-io | 262/290 | 49/52 | 186/241 |
| workspace-persistence | 372/423 | 58/58 | 344/435 |
| open-actions | 112/119 | 21/22 | 95/108 |
| open-local | 23/23 | 4/4 | 13/15 |
| author-disk-baseline | 92/96 | 27/28 | 54/61 |
| handle-store | 81/85 | 29/33 | 30/39 |
| author-save-journal | 387/393 | 57/57 | 271/297 |

核心目标仍为行/函数≥95%、分支≥90%，纯判定尽量100%；百分比不能替代业务结果。
journal已达单模块目标；plan为86/87分支、prefix/store已100%，clone已100%、ZIP为32/33，
不要重做这些已完成成果凑数量。已删除includeAssetCopies，不得重新引入或为它补测试。

## 文件白名单与隔离

只允许新增以下文件（各组可少于该清单，不必建空文件）：

```text
packages/editor/src/core/save-batch-open.test.ts
packages/editor/src/core/save-batch-writer.test.ts
packages/editor/src/core/save-batch-policy.test.ts
packages/editor/src/core/save-batch-baseline.test.ts
packages/editor/src/core/save-batch-recovery.test.ts
packages/editor/src/core/save-batch-storage.test.ts
packages/editor/src/core/__tests__/save-batch-fixture.ts
```

另外仅可写[本批回执](editor-save-recovery-glm-batch-report.md)，及父卡明确留给GLM的本批交接日志块。
本计划、README、看板、签字表、旧测试及其断言/名称、既有共享fixture、配置、baseline均不改。
新helper只服务本批；不复制整份旧测试，不新增第二套保存/恢复/解析实现。产品修改建议写回执，由Codex处理。
测试之外的packages/scripts相对aa87c305必须零diff；不以通配符隐藏其他新文件。

不得切换共享main，不stash/reset还原实现，不改用户6010/6050服务，不操作真实作者目录，不跑迁移。
使用内存目录、边界替身和独立临时cache/report；需要原生权限/视觉验证的条目标明交Codex补验，不冒充已完成。
负控制仅用隔离加载变体；临时配置可自行重建，不能把上轮/tmp文件存在当交付依赖。

## G1 — 打开、权限与身份（8项）

主要锚点：`open-actions.ts:75–201,268–316`、`open-local.ts:31–84`、`file-system-access.ts:26–56`。
新增到save-batch-open；不修改已通过的13项真实入口测试。

| ID | 核验与结果要求 |
|---|---|
| O1 | 非安全上下文/无picker的真实入口拒绝：不调用picker、无目标IO/凭据/recent；可用环境正控保留 |
| O2 | picker的NotAllowedError及普通IO Error可见；只有AbortError静默null，不能吞全部错误 |
| O3 | expectedIdentity.handle指向其他目录：真实finishOpen在加载/登记/写入前拒绝，两个目录都不变 |
| O4 | 有效但属于目录B的registrationMutation用于打开A：拒绝；同目录正控可用，不靠伪造token TypeError当证据 |
| O5 | PAL打开到最终登记之间可信HTTP proof变化：内部entered/gate定位；拒绝装配新可写会话，原绑定不被覆盖 |
| O6 | 合法PAL最终proof/上下文成功链：真实构造proof，受控文件一致；普通local/沙盒不凭名称pal升权 |
| O7 | Save As取消、源证据缺失、readonly源与目标目录关系、cleanupWarning的剩余分支：先查已有证据，仅补缺口 |
| O8 | open-local两个非Error文案分支与PAL finalProof防御分支做可达性分类；无真实输入链则注明，不注入任意字符串/假proof凑绿 |

## G2 — 序列化与实际写入（10项）

主要锚点：`project-io.ts:75–166,212–341,386–448,450–736`。
新增到save-batch-writer；以真实buildBlankProject为合法起点，每次只破坏目标合同。

| ID | 核验与结果要求 |
|---|---|
| W1 | 已登记stamps却未传stamps、重复/冲突输出路径等序列化入口拒绝；不能用其他无效schema抢先挡住目标条件 |
| W2 | 地图工作副本/未加载文本、图章/脚本注册与实际内容不匹配、缺引用等真实作者输入；定位具体缺口而非全组合堆例 |
| W3 | 未登记pending资源/路径冲突拒绝；合法上传原字节与catalog保持一致，不能删字段绕过验证 |
| W4 | writeProject的copies重复、copy与编辑覆盖/显式删除的优先级；目标输出及snapshot不误收录复制素材 |
| W5 | 绑定旧目标不允许整笔copies/directories；首存复制缺verifySource拒绝；合法首存正控完整提交 |
| W6 | 磁盘catalog读取权限/IO异常与坏JSON/坏当前结构拒绝；NotFound与“可吞任意异常”严格区分，零作者IO |
| W7 | catalog实际已前滚但prevSnapshot仍旧：内容/引用表补写与最后收缩保持正确；对照现有双写测试后补未覆盖分支 |
| W8 | diffRemove、显式remove、仍被catalog引用、已不存在文件等删除边界；源作者字节、snapshot推进与撤销责任不混淆 |
| W9 | 摘要正确但格式坏的tileset/world-sprite/battle-sprite：沿真实decoder拒绝；合法同kind/路径正控，bytes/sha如实更新 |
| W10 | onProgress/onStaged、准备/应用失败与完成进度；实际删除完成前不报告100%，失败不会误清原编辑或丢恢复输入 |

## G3 — 工作区保护矩阵（10项）

主要锚点：`workspace-persistence.ts:99–183,232–384,386–565,567–746,748–1003`。
新增到save-batch-policy；取得真实授权后再在边界改变目录/标记，优先用户可触发的拒绝路径。

| ID | 核验与结果要求 |
|---|---|
| P1 | workspace旁车读取NotFound与权限/IO、非法内容的区别；坏标记不降级为普通local |
| P2 | 空目录检查/目录名结构碰撞/首写前出现外部文件：首写门再次核验，原文件不动 |
| P3 | local/sandbox/PAL的marker缺失、错误/相互冲突、同projectId不同workspace/source；模式矩阵按当前合同拒绝/允许 |
| P4 | 首存authorize后到实际首写之间身份变化；基于已有A-02测试补未覆盖时点，不重复已有迟到写入用例 |
| P5 | sandbox受限marker首次创建、写入/再次读取失败、原目录重试；不得留下可被当普通local写入的失败副本 |
| P6 | local首存仅预检不授予续写资格；真实已开始的原目标/另一目标/被他人重绑定分别验证 |
| P7 | PAL关键proof文件缺失、坏JSON、指纹变化；从真实可信context生成基准，不手写伪proof来触发任意throw |
| P8 | 普通/沙盒/PAL绑定记录、expected identity、forceSandbox的装配与缺marker保护；合法恢复不能被“全拒绝”替代 |
| P9 | 一次性授权、嵌套真实写入、任务未await时锁仍覆盖IO、完成后不得延迟写；已有可靠用例可引用，不制造测试专用公共入口 |
| P10 | 私有路径允许范围/原操作/封存前后记账、正常登记目录不符等剩余防御分支分类；仅真实调用可构造者新增测试，其他列为Codex审查项 |

## G4 — 作者基线与恢复跨会话边界（8项）

锚点：`author-disk-baseline.ts:55–225`、`project-io.ts:141–154`、`author-save-journal.ts:720–876`。
新增到save-batch-baseline/recovery；不改已验收A-02产品与原74+5项journal测试。

| ID | 核验与结果要求 |
|---|---|
| B1 | 载入捕获期间同文件两次读到不同字节拒绝；正常同字节读取和准确基线正控 |
| B2 | verifyOpened/bindAuthorBaseline的同句柄别名、不同物理目录/project/workspace；不能只改对象字段让类型检查先炸 |
| B3 | 基线读文件NotFound与IO错误；未触作者内容的外部变化不得被新read收编 |
| B4 | authorDiskMutation计划/写后验证/删除和catalog资源表更新；同长度替换、资源在正确归属内推进，合法下一次保存不误报冲突 |
| B5 | resumeOwnProjectSave的活动回调、清理警告与snapshot返回；新编辑不被旧完成回执清理，引用实际App测试作SR-09证据，不手写一个App模拟器 |
| B6 | PAL新页恢复完成后的pal-bound登记与后续正常打开可信proof；已测PAL原页retry不能当此路径已覆盖 |
| B7 | 原页持久凭据换operation/缺失、封存状态与原页证据不一致：不采用他人的快照；正常已清理unsealed分支已有两态测试，应引用不重复 |
| B8 | journal仍未覆盖的读IO/cleanup权限/步骤前后边界分类：优先补实际故障；271/297已达标，不为最后几个内部条件编造不可达状态 |

## G5 — 持久存储与保存入口状态（7项）

锚点：`handle-store.ts:25–216`、`author-save-store.ts`及其原生事务单测；新增到save-batch-storage。
**测哪个store，就不得mock掉那个store**；边界替身需保留request success与transaction complete/abort的时间区别。

| ID | 核验与结果要求 |
|---|---|
| S1 | 打开IDB失败及request error不误报成功、不留下有效最近项目绑定 |
| S2 | request success后transaction abort/error：Promise仍失败；正常complete正控，不能仅盯req.onsuccess |
| S3 | recent目录isSameEntry抛错、同workspace绑定其他目录、字段漂移等剩余防护；原有效记录不被blind put覆盖 |
| S4 | Web Locks浏览器代码分支的调用序与持有期：发现锁→workspace锁、同W互斥、内部不重入；用可观察gate。锁API替身不等于原生Web Locks验收，既有fallback测试也不能冒称此分支 |
| S5 | 同名project的不同workspace仍区分；失效句柄不遮住其他有效记录；无需重开已验收A-01玩家存档产品设计 |
| S6 | ensurePermission denied/query/request错误保持用户手势约束；不是通过mock“永远granted”填覆盖 |
| S7 | 对author-save-store/plan/prefix现有高覆盖作证据抽查与相邻复跑；仅发现真实未保护场景才新增，不复制100%用例刷数量 |

## G6 — 一次性总对账与交付

43项每项必须落入：`新增通过`、`已有证据已复跑`、`真实产品缺陷/预期红`、`待证/不可达候选`之一，不能空白。
“已有证据”要带完整测试名与业务断言位置；“待证”给出已排查调用域、反证条件和下一责任人，不当完成或擅自删除产品代码。
另对父卡SR-01～12逐条列：实际入口、现有/新增测试、故障注入点、观察结果、仍需原生/E2E验证、缺口归属。
这组同时核对App保存状态、读出口、首存/绑定/local/PAL/sandbox模式；不新增UI架构或手写第二套AST解释器。

## 验证纪律与提交约束

1. 先在冻结树跑相关旧测试/同口径editor-fast；临时报告不依赖主树coverage目录，记清aa87c305原分子分母。
2. 每个失败fixture先证明同kind/相同其余条件的正常正控能完成；只mock环境，不mock掉被测writer/loader/授权器。
3. 拒绝不等于不动：对快照、creates/closes/removes、凭据phase/planHash、公开状态门、返回值/警告分别核。
   同字节重写必须能被IO轨迹抓住；零长度文件只在正式issued规则允许时成立，不能让“未来步骤”实际是当前issued步骤。
4. 异步注错放真实内部entered/gate；不用sleep/多数重跑、case-count断言或简单源码字符串匹配冒充调用链。
5. 至少 **6组有意义的单点负控制**，覆盖至少4个工作组；删除对应一处防护或替换一处结果转发后，
   必须在业务断言上红。正常/突变使用相同测试，记录精确diff/SHA和退出原因；入口错误/未命中插件/坏fixture不算。
   移除防护仍绿时应修测试或将该项标为未证明，不能加注释后声称回归有效。
6. 各组自己跑定向和相邻，自己修测试纪律问题后继续下组，不等待Codex逐次签字。允许多个小commit便于回滚，最终只交一批。
7. 全绿时整批跑editor typecheck、完整pnpm check、正式配置同范围的editor-fast一次；
   复用scripts/coverage/config.mjs的include/exclude/testSelection，核220生产文件和完整测试清单，无缩分母/删旧测试。
   **不运行ratchet、不手改baseline**；Codex接收后统一全仓ratchet及单次严格fast。
8. 真实产品缺陷红用例要保留且默认可执行，不skip/todo、不改断言迎合实现。此时仍完成其他组、跑全部分组与整批check，
   明确哪些红是业务缺陷，不能把check exit1写成通过。必要时`reportOnFailure`仅用于隔离诊断报告，不作为达标/门禁证据。
   测试预期与合同矛盾则先复核前提；不得以“测试错了就改生产”或“实现永远正确”替代判定。
9. 最终回执从实际提交树生成：白名单diff、旧测试未变、完整测试名→条目ID→SR映射、测试/文件计数、
   覆盖分子分母、各负控业务红、所有待证/真实缺陷。禁止引用上轮数字当本人结果，不代签、不标父卡done。
10. 直接填写本批回执及父卡GLM本批日志，提交推送自己的分支；核`git ls-remote`与提交SHA一致。
    提交前同步文档时只保留他席记录，不合入变更产品基线的主线提交；冲突自己处理，不让用户搬审查正文。

## Codex接收清单

先核六组/43项/SR总表有无遗漏，逐项读新增断言与实际调用链；重点抽审PAL proof、基线推进、真实IDB abort和每组负控。
复跑全部新增/相邻测试及关键单点变体；确认字节/副作用/提示均有见证，不把坏fixture或超时当有效反例。
对真红修产品或裁决测试前提，适配主树，再跑全仓check/ratchet/单次严格fast。
GLM为测试贡献者，贡献须在终审披露，不作为独立第三方自证；整卡终审/用户验收由父卡统一处理。

## GLM回执入口

请填写[整批回执](editor-save-recovery-glm-batch-report.md)。不在本计划覆盖范围或规则；需要调整写回执并交Codex核定。
