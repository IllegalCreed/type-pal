# CODE3s／3t 代码验收与最终集成分离

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是 QUALITY-PRE94-RETROSPECTIVE-1 中 CODE3s/3t 的代码验收回执,原时点状态为 code accepted; final pre94 integration pending;Owner=Codex 单 Agent,自身复核,不冒充第三方;Base=96d68809…。3s、3t 代码复审接受,固定 83 卡由 67 accept/16 partial 变为 69 accept/14 partial;不是全仓专项完成或统一门已通过;原始历史结论与门记录保留;本裁定纠正'只因最终门未跑,所有已整改卡仍须 partial'的执行错误。逐文件八维、读域、具体设计裁定、身份映射及限制见 [review.json](review.json);复用 [README.md](../battle-main-quality/README.md)、[README.md](../battle-dialog-quality/README.md)、[README.md](../opcode-test-quality/README.md) 与最初读域 [README.md](../3s-battle-system/README.md),没有重复其全文或全量测试。原件逐字节保全于下方保全块。

## 来源与输入

本轮实际代码:160 例主测的 typed 合法输入与真实毒脚本 callee;召唤四例的首空槽/不足数量/非零状态清理 oracle;四个私有 helper 依赖收窄,数字属性映射去断言,ctx/动画/收尾注释纠正。三生产源的具体 JS AST 全部守恒(sourceProof:抹掉类型/注释,保留具体 JS AST 种类/值/算子/声明标志与结构,仅忽略括号包装节点;无 opcode/数学/字符串/分支掩码;sanityControls=3)。两个相邻广域源仅注释差异,不因此关闭整文件;核心业务没有改动。

## 断言与业务 oracle

六个反控均为同一变异下旧例绿、新例恰一业务 AssertionError:召唤隐身、睡眠、毒续点、状态相等、room1 不足两只、旧状态清理;原件、单点 patch、恢复指纹全部在 receipts.json.gz,160+4 身份保持,八个标题纠错一一映射;原 room0 活槽不覆盖合同转入主测已有例,未增加或退役测试。counterBridge 记录反控与最终测试的精确桥接:main 仅在首个四反控后向无关 room0 用例加 id100/HP200 字面断言,slot 仅强化首个状态用例;反控跑在 base96/d8bd 源上,当前具体 JS AST 与两者一致。

## 结果

当前 5 文件 241 例、game typecheck 及三源正文守恒已实跑;默认 reporter 原 stdout/stderr 完整保留,运行无诊断。3s 复用指纹匹配的 186 身份/266 相邻/实际 3 合击补跑,不把重复计数相加;初版 TC9 诊断、AST 工具错误和所有变异失败完整保留,均不冒称业务修前红例。只读快检:仓库根运行 node docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/battle-host-opcode-closeout/verify.mjs,核当前指纹、源码守恒、身份、六反控及版本桥;MATCH 仅表示对应机械事实成立,具体八维判断见 report。新关闭七文件:3s 宿主、对话叶、两主/对话测试;3t dispatcher、主测、cov85;两个已关闭 3t 专测刷新证据;3s 选择/伤亡 phase 仍由原宿主有序协调,3t opcode 分支仍由一个入口路由,完整设计裁定解释保留理由,不为复杂度数字拆文件。

## 限制与复核

全仓 check、official coverage、ratchet、protected 及 PR 均未执行,按用户要求等剩余 pre94 一起冻结后集中进行;94-102 不扩展;同一 3y 分提交推送,未合 main。最终静态/机器账另见本目录 static.json(其中 docs-final 首试 exit1 为缺新增子导航,failureDisclosure 已记录,补导航后 docs-corrected exit0,失败与修正双原件保留)。未重跑任何命令;历史结论保持原时点;候选待 Owner 非作者接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 2842B / SHA-256 6289b80a2cb16b72fe2f1b974ceea7bf3947d1c78e2175770cabd5b22afb6bd4；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE3s／3t 代码验收与最终集成分离

Status: code accepted; final pre94 integration pending
Owner: Codex（单Agent，自身复核，不冒充第三方）
Base: 96d68809b87e7f1d653d55d1ee8330d63f6fc76f

3s、3t代码复审接受，固定83卡由67accept／16partial变为69accept／14partial；不是全仓专项完成或统一门已通过。原始历史结论与门记录保留。本裁定纠正“只因最终门未跑，所有已整改卡仍须partial”的执行错误。

[逐文件八维、读域、具体设计裁定、身份映射及限制](review.json)。复用[3s主测八维与原件](../battle-main-quality/README.md)、[对话拆分及13→12映射](../battle-dialog-quality/README.md)、[3t两专测八维](../opcode-test-quality/README.md)；没有重复其全文或全量测试。原3s完整机制/caller范围仍由[最初读域](../3s-battle-system/README.md)限定。

本轮实际代码：160例主测的typed合法输入与真实毒脚本callee；召唤四例的首空槽/不足数量/非零状态清理oracle；四个私有helper依赖收窄，数字属性映射去断言，ctx/动画/收尾注释纠正。三生产源的具体JS AST全部守恒；两个相邻广域源仅注释差异，不因此关闭整文件。核心业务没有改动。

六个反控均为同一变异下旧例绿、新例恰一业务AssertionError：召唤隐身、睡眠、毒续点、状态相等、room1不足两只、旧状态清理。原件、单点patch、恢复指纹全部在receipts.json.gz，160＋4身份保持，八个标题纠错一一映射。原room0活槽不覆盖合同转入主测已有例，未增加或退役测试。

当前5文件241例、game typecheck及三源正文守恒已实跑；默认reporter原stdout/stderr完整保留，运行无诊断。3s复用指纹匹配的186身份／266相邻／实际3合击补跑，不把重复计数相加。初版TC9诊断、AST工具错误和所有变异失败完整保留，均不冒称业务修前红例。

只读快检：仓库根运行 `node docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/battle-host-opcode-closeout/verify.mjs`。核当前指纹、源码守恒、身份、六反控及版本桥；不写文件、不联网、不运行测试。MATCH仅表示对应机械事实成立，具体八维判断见report。

新关闭七文件：3s宿主、对话叶、两主／对话测试；3t dispatcher、主测、cov85。两个已关闭3t专测刷新证据。3s选择/伤亡phase仍由原宿主有序协调；3t opcode分支仍由一个入口路由，完整设计裁定解释保留的理由，不为复杂度数字拆文件。

全仓check、official coverage、ratchet、protected及PR均未执行，按用户要求等剩余pre94一起冻结后集中进行。94–102不扩展；同一3y分提交推送，未合main。最终静态／机器账另见本目录static.json。
```
<!-- incremental-original-source:end -->
