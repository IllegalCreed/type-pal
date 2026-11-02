# content-authorcore(author-script-core.ts)八维复审批

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是 content-authorcore 批37(pre-94 foundation 模块12批,content 包批8)八维复审回执(固定main源1550B,SHA f8f85b60a6dd)的治理候选页。真实语义:GLM Coding Owner 对 author-script-core.ts 1348行全文读毕,B–H全维通过,零整改批(零代码/注释改动,工作树零diff);基点为 origin/codex/code-quality-3y @ 53db76bbbb(候选线72+提交)。Codex 2026-10-19 裁定本页保留作者阶段证据,未获整包/全维收口验收。

## 来源与输入

来源为固定Git载体,非本次运行;原2个链接处置见作者review的linkDisposition。当前存活入口:[codex-stage2-rework.json](../codex-stage2-rework.json) [directed.json](directed.json)。

## 断言与业务 oracle

文档事实核对(currentExecution=false):零整改依据是四组真实亮点——AUTHOR_COMMAND_KIND_TABLE 组合式词表(runtime PREPARE_SAFETY 全量+7 retired 显式 false+11 author-only)双 satisfies 编译期防漂移;词法循环纪律(loopAncestors 只在同根收集、breakLoop 需 loopDepth>0、prepare 禁循环、同根重复循环 id 全树预收集 fail-loud);裸实体 id 禁令三处一致('entity' in command 拒收→EntityAddress 强制,callScript 只存稳定 script id);checkAutoScriptContinuation 的 digest SHA-256 小写/frames 1..256/七类控制帧穷尽与 SAVE12 WorldScriptState guard 的 cursor 携带行为边界。验证轴为定向2文件 suites 0 failed 与 tsc --noEmit -p packages/content exit 0,按原时点记录,不外推为零诊断或当前通过。

## 结果

治理结果=原文保全+本页真实批语义+链接处置如实;不产生新执行结果,不把零整改批倒填为模块收口。

## 限制与复核

未重跑原命令/浏览器/测试;登记项为无新增;候选待Owner非作者接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 1550B / SHA-256 f8f85b60a6dd8146df8650110f46903f0ea6550a1ed187f19aad68b7321b142f；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# content-authorcore(author-script-core.ts)八维复审批

> Codex当前裁定（2026-10-19）：本页保留作者阶段证据，未获整包/全维收口验收；可复用范围、逐文件依据与未知项见[当前返工记录](../codex-stage2-rework.json)。

- 批次:pre-94 foundation 模块 12 批 37(content 包批 8)
- 基线:origin/codex/code-quality-3y @ 53db76bbbb(候选线 72+ 提交)
- Coding Owner:GLM;全文读毕(1348 行)
- **零整改批**(B–H 全维通过;零代码/注释改动,工作树零 diff)

## 零整改依据(亮点)

- AUTHOR_COMMAND_KIND_TABLE 组合式词表(RETAINED 来自 runtime PREPARE_SAFETY 全量 + 7 retired 显式 false + 11 author-only)双 satisfies 编译期防漂移;"Canonical author command vocabulary"边界注准确。
- 词法循环纪律:loopAncestors 只在同根收集(breakLoop 需 loopDepth>0/continueLoop 需词法祖先且点名必命中)、prepare 禁循环、同根重复循环 id 全树预收集 fail-loud。
- 裸实体 id 禁令三处一致('entity' in command 拒收 → EntityAddress 强制);callScript 只存稳定 script id 拒 ref。
- checkAutoScriptContinuation:digest SHA-256 小写、frames 1..256、七类控制帧穷尽、completed 不能有续跑帧。
- SAVE12 WorldScriptState guard:"静态 inherit 不落盘;cursor 始终携带所属 behavior/hook 避免换槽串位"持久层设计声明。

## 验证

- 定向 2 文件:**suites 0 failed** → [directed.json](directed.json)
- `tsc --noEmit -p packages/content`:exit 0;工作树零 diff

## 登记项

无新增。
```
<!-- incremental-original-source:end -->
