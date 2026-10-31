# 批45:reforge script 族 13 文件（零整改批 + 1 登记候选）

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: audit-report-v1 / 1.0.0

## 审计问题

原审计「批45:reforge script 族 13 文件（零整改批 + 1 登记候选）」的主题按原文时点保留(摘录:> Codex当前裁定（2026-10-19）：本页保留作者阶段证据，未获整包/全维收口验收；可复用范围、逐文件依据与未知项见当前返工记录。 范围：`script-activity)。

## 范围与证据

原报告含章节[批45:reforge script 族 13 文件（零整改批 + 1 登记候选）、逐件结论（要点）、登记移交（1 项,非本批整改）、验证]、1个链接;固定main源4389B(SHA ace2d4125763)。当前存活入口:[codex-stage2-rework.json](../codex-stage2-rework.json)。

## 发现

原文发现/计数/日期按原时点保留在保全块;本页不重算审计结论。

## 结论

原结论保持原时点;治理不改写审计判定,不撤销旧撤信,不恢复旧完成声明。

## 整改与复核

本治理候选仅覆盖文档角色与保全;整改事实以原文与后继卡为准;候选待Owner接收。


## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 4389B / SHA-256 ace2d412576331b9f9ce0664595065b838b6c4343b7bb1bddcf1d595b0d782a4；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# 批45:reforge script 族 13 文件（零整改批 + 1 登记候选）

> Codex当前裁定（2026-10-19）：本页保留作者阶段证据，未获整包/全维收口验收；可复用范围、逐文件依据与未知项见[当前返工记录](../codex-stage2-rework.json)。

范围：`script-activity-lineage.ts`(94)、`script-continuation.ts`(125)、`runtime-script-compiler.ts`(128)、`script-work-queue.ts`(134)、`script-confirm-modal.ts`(161)、`script-chunk-store.ts`(167)、`script-compiler-core.ts`(285)、`script-host-adapter.ts`(364)、`script-project-core.ts`(608)、`script-runner-core.ts`(671)、`script-world.ts`(838)、`script-runner.ts`(852)、`runtime-script-project.ts`(1000)。全文读毕;`script-wake-gate`/`script-execution-gate`/`script-execution-budget`/`runtime-script-runner` 四小件已在批41。八维审查（A–H）全部通过,零源码改动、零 diff。

## 逐件结论（要点）

- **activity-lineage**:runtimeKey×exact-signal 双 WeakMap 不延长生命周期;finally-pending 登记不作权威(hasActiveLease 复核);transient 活动在 save gate 关闭时等待重试。
- **continuation**:resume 帧逐帧按冻结代码校验(控制类型/leaf 相位匹配/loop forever 无 test/repeat 迭代界/callScript 深度 128 与 self 传递规则),digest 不匹配即拒。
- **runtime-compiler / compiler-core**:validator→共享编译内核两段式,"UncheckedAfterValidation" 名实相符;SCRIPT_COMPILER_VERSION=3 门在 runner 侧复核;digest 小写 SHA-256 校验集中一处。
- **work-queue**:executions 按 signal 弱表登记防跨 world 串线;`whenIdle` 的「最后一个 await 与 action() 之间不得有 await」注释与实现一致;scriptWorkIO 仅在下个任务边界仍 pending 才 park(缓存 IO 微任务链不让出 world),与 budget 让出的分工注释准确。
- **chunk-store**:并发同 chunk 读取竞态复用先完成者避免 residentBytes 重复记账;LRU 逐出保护 leases>0;错误信息区分「chunk 不存在」与「script id 不存在」并带 derived 提示。
- **confirm-modal**:FIFO/默认否/至少呈现两帧(防问句 held-frame 同帧擦除)/Esc=No 固定语义;abort reject 不误当 Yes/No;cancelAll 批量清理。
- **host-adapter**:70+ leaf 派发表与 ScriptHost 窄接口一一对应;runEntityTrigger/endBattle fail-loud;default never 臂兜底;playEntityAction wait 语义(loop 后台失败上报不吞 abort)。
- **project-core**:moveEntity/setSceneMapOverride 线性化提交控制(会话变化 AbortError/accepting 窗口/post-commit 拒绝仍发布已接受状态不回滚);save barrier 只允许同步快照。
- **runner-core**:控制帧恢复(branch/loop/repeat/confirm/startBattle/teleportOut 五类 frame.control)、checkpoint CAS(reachSafePoint)、budget consume/yield、lexical loop ancestors 校验、256 执行帧深度界。
- **world**:FlowActivationLease epoch 失效即 stop 不覆写新槽;coordinator begin 的 pending gate 纪律;save barrier ready=全部活跃 lease snapshotReady;evalAuthorCondition 全 16 条件臂与 query 注入一致。
- **runner(M3a)**:async 单解释器;jumpScript 尾转移每跳让出一个宏任务防纯同步环占满主线程;0 号 END 在真实 call 边内只结束 callee 注释准确;0x9A setMultiEntityState 写全部 world + 首实体单次通知(main 整场重放)与注释一致。
- **runtime-script-project**:guardInvocation 场景会话域(runEntityTrigger 期间禁 loadScene/startBattle 等 6 类);lifecycle 四叶原子替换 entityLifecycles 后投影必须发布;validateAutomaticContinuations/validateSceneRuntimeContinuations 恢复前校验(chase 认领/move/wait/action 收据逐项对账,chase-pacing 期望时长公式集中)。

## 登记移交（1 项,非本批整改）

**setMultiEntityState 派发不对称(script-host-adapter.ts:110-116)**:project-core 将全部 targets 写入 world.entityState;host-adapter 演出通道只对**首个在场** target 派发 host.setEntityState(script-host-adapter.wave2.test.ts:124 钉死该行为,注明"跨场景在前、在场在后"动机)。同场景多 target 时其余实体无独立 host 通知——是否需要逐 target 派发属产品语义决策,登记 Codex 裁决;不改行为。

## 验证
- 定向测试:31 个 script 族测试文件 323/323、numFailedTestSuites=0（directed.json）。
- 零 diff 批:无源码改动,不适用 body-invariance。
```
<!-- incremental-original-source:end -->
