# B-04 修复回执：当前存档预检与恢复失败隔离

Status: historical
Validity: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-17
Template: audit-report-v1 / 1.0.0

本页把历史材料接入 `audit-report-v1`，并追加 `archive-record-v1` 历史边界。原始日期、阶段词、数字、冲突、未知和链接在 quote 中保全；本页不授当前实现、runtime、E2E、视觉或 coverage 信用。

## 审计问题

- 要回答的具体问题：Current pre-E2E audit report: preserve confirmed findings, counterexamples, boundaries, evidence and remediation ownership.

## 范围与证据

- 版本/时间范围：2026-09-06；source revision `348620bf3c68aa77a7ef7e1abef9b8eda08530d9`；source SHA `1461f5b3954eb8559c7d3403fdd101fe4832884e6b1ee970187fdede8aaa1ef8`。
- 一手来源与命令：原文列出的代码、测试、命令和审计输入；本轮不重跑产品流程。
- 排除项：不穷举全部技能、敌队、随机种子或绘制帧，不宣称真实音画或完整 E2E。

## 发现

| ID | 发现 | 证据 | 影响 | 状态 |
|---|---|---|---|---|
| AUDIT-001 | 原始审计发现与反例 | source quote / primary refs | 见原始审计边界 | open / current-audit |
- 未决信号：- 正文信号 49:| 非结构 codec 错误长提示 | Kimi 非阻断观察，作为后续缺陷记录保留，尚未实现；不扩大本卡 R4 新 guard 的范围 |

## 结论

- 当前能证明：原文报告的审计观察、反例和覆盖边界可由 quote 与 SHA 追溯。
- 当前不能证明：产品已修复、全程序无遗漏、runtime/E2E/视觉/coverage 已通过。

## 整改与复核

- 修复 Owner：由后续 task card 和当前 Owner 明确。
- 复核条件：当前 primary source、真实调用域、可证伪反例和执行证据齐全。
- 继任/ supersedes：C；u；r；r；e；n；t； ；t；a；s；k； ；c；a；r；d；s；,； ；c；o；d；e；/；t；e；s；t； ；e；v；i；d；e；n；c；e； ；a；n；d； ；a； ；f；r；e；s；h； ；E；2；E； ；o；r； ；r；u；n；t；i；m；e； ；a；c；c；e；p；t；a；n；c；e； ；w；h；e；n； ；a；p；p；l；i；c；a；b；l；e；.。

## 历史范围

- phase2/lore archive；日期：2026-09-06；固定来源 `348620bf3c68aa77a7ef7e1abef9b8eda08530d9`；source SHA `1461f5b3954eb8559c7d3403fdd101fe4832884e6b1ee970187fdede8aaa1ef8。

## 原始结论

- B-04 修复回执：当前存档预检与恢复失败隔离：这是 audit-report，当前文档状态为 current。全文 59 行、4 个标题；摘要/首段为「状态：**SAVE-PREFLIGHT-1 已 done（2026-09-06，用户明确授权收口）**。」。属于现行文档范围，使用时受本记录的证据与未决项约束。

## 当时证据

- 原始标题/章节/HTML artifact 在 quote 或 artifact envelope 中保全。

## 当前有效性

historical。do not promote static audit or in-memory boundary evidence to runtime/E2E/visual/coverage acceptance
- 历史冲突/未决：
- 正文信号 49:| 非结构 codec 错误长提示 | Kimi 非阻断观察，作为后续缺陷记录保留，尚未实现；不扩大本卡 R4 新 guard 的范围 |

## 继任文档

- C；u；r；r；e；n；t； ；t；a；s；k； ；c；a；r；d；s；,； ；c；o；d；e；/；t；e；s；t； ；e；v；i；d；e；n；c；e； ；a；n；d； ；a； ；f；r；e；s；h； ；E；2；E； ；o；r； ；r；u；n；t；i；m；e； ；a；c；c；e；p；t；a；n；c；e； ；w；h；e；n； ；a；p；p；l；i；c；a；b；l；e；.。
- 当前事实由继任规范、代码、测试和新的 review 决定。

## 原文保全

固定源 SHA `1461f5b3954eb8559c7d3403fdd101fe4832884e6b1ee970187fdede8aaa1ef8`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # B-04 修复回执：当前存档预检与恢复失败隔离
>
> 状态：**SAVE-PREFLIGHT-1 已 done（2026-09-06，用户明确授权收口）**。
> 终审候选 `2c39b1af`；整卡代码比较基线 `5f9f92ba`；收口接手 HEAD `c0d16e42`。
> [完整任务卡与三席证据](../../archive/tasks/done/SAVE-PREFLIGHT-1-current-save-restore-preflight.md)已归档，r1 设计不重签。
> Codex/Kimi 为独立审查 accept，GLM 为实现者自测 accept；无代签、无缺签豁免。
>
> ## 已完成
>
> - 当前 SAVE8 已知载荷结构先校验，再进入 normalize/恢复准备；损坏快照在停止旧脚本、替换世界/场景前拒绝。
> - 稀疏数组、非法持久状态、portrait=null 等反例已拒绝；分数坐标、HP=0、显式静音与合法可选缺席仍通过。
> - 读取/归一化/场景准备三阶段失败提示归最新请求；F9、菜单、boot 入口错误收口，保留 AbortError 取消协议。
> - 新结构错误显示固定短文案“存档损坏，无法读取”；生产 BDF 测得 144px，200px 提示区内完整可见，
>   详细字段路径留在 Error.message / console.warn，不靠截掉诊断信息满足像素限制。
> - 正式测试包含真实 main.ts AST 调用链、normalize 阶段内挂起与只删除 isCurrent 一行的突变负控制，
>   不是结构矩阵的副本。原两份缺陷探针零改动，修复后不再满足其旧缺陷假设；正确行为由正式回归证明。
>
> ## 验证与证据边界
>
> 以下为候选审查时实际完成的验证，不冒称在本次文档收口重新执行：
>
> | 检查 | 最终结果 |
> |---|---|
> | save 定向 | 6 文件 / 88 项；其中结构矩阵 50、真实恢复链 20 |
> | 相邻生命周期/切场景 | 3 文件 / 22 项 |
> | Reforge typecheck | 通过 |
> | 完整 check | 539 测试文件 / 6,246 项通过；lint 0 error，50 warnings / 11 infos 既有 |
> | 单次严格 fast coverage | 609 个生产文件 / 5,761 项；精确基线通过，未降门槛、未缩范围 |
> | 结构 guard 覆盖率 | lines 117/117；statements 136/136；functions 38/38；branches 46/51 |
> | 开发期最小功能 | 隔离测试工程与独立浏览器存储：坏档拒绝后可走，好档恢复；短提示完整，pageerror=0 |
>
> Codex 全量日志：`/tmp/type-pal-save-final-check.MFLtVx/check.log`、
> `/tmp/type-pal-save-final-coverage.rKsL65/coverage.log`；像素/独立突变与最小截图记录在
> `/tmp/type-pal-save-final-review.oSt0mR/`；前轮移动/合法恢复在 `/tmp/type-pal-save-rework-review.kUy0T7/`。
> 这些是当时本机临时证据，不保证长期留存；持久审查结果见归档卡与 Git，不向仓库添加调试截图垃圾。
>
> 本次收口重新核对候选至 HEAD 的 packages/ scripts/ 零 diff，以及整卡原探针零 diff。
> 文档工具测试 20/20 通过，文档检查 397 Markdown / 1,776 本地链接 / 138 任务零问题，`git diff --check` 通过；
> 归档前后 r1 设计/三席终审签字逐段一致，隔离卡仅重定向归档链接。
> 未重跑 full coverage；fast 的增加不能冒充 PAL/browser/E2E 覆盖。没有对用户真实数据库做损坏试验，
> 没有承诺任意提交后异常回滚，也没有穷举一切未知字段。
>
> ## 后续事项
>
> | 事项 | 去向与约束 |
> |---|---|
> | 合法 checkpoint → 行走/脚本 → 坏 checkpoint 拒绝 → 合法恢复 | [R4/Q1 集中 E2E 登记](../../../testing/e2e/contract.md#已登记的存档恢复回归save-preflight-1)，Owner Codex，待跑；剧情观感不逐卡重复 |
> | editor coverage 少 1 条语句/分支 | [TEST-COVERAGE-DETERMINISM-1](../../archive/tasks/done/TEST-COVERAGE-DETERMINISM-1-editor-ratchet.md)已由独立受控帧回归闭环并三签收口；其他回退仍须逐文件定位，不按多数通过放行 |
> | 非结构 codec 错误长提示 | Kimi 非阻断观察，作为后续缺陷记录保留，尚未实现；不扩大本卡 R4 新 guard 的范围 |
> | 工程/工作区存档隔离 | [SAVE-ISOLATION-1](../../archive/tasks/done/SAVE-ISOLATION-1-project-workspace-save-scope.md)r2 已三席终审 accept、用户免复验通过并 done；不由本卡签字授权实现 |
>
> 非结构错误跟进锚点：`packages/reforge/src/main.ts:5783` 的普通 Error.message 分支、`:5722` 的准备失败
> 提示，及 `:6175` 的 x=120 固定绘制；`packages/reforge/src/save/current-codec.ts:27` 等既有错误含路径。
> 收口判断：需要后续处理，但不是本卡新增回归；在后续错误反馈小修中核全调用域，以生产字体像素测量验证
> 短反馈完整、详细诊断可查、旧请求不覆盖新提示。不得只按字符数断言，也不以“修长文案”为由改存档校验语义。
> Kimi 对 read/prepare 用例的第二条观察肯定现有测试配置，不需另开修复任务。
>
> 原 A–E 审计报告继续作为原基线历史；本回执只关闭 B-04，不宣称其余审计缺陷、N6b 或完整 E2E 已完成。

<!-- original-source-quote:end -->
