# QUALITY-DIALOGUE-REFERENCE-OWNERSHIP-1 — 二阶段对话引用的定义归属

Status: done
Phase: phase2
Capability: content-dialogue
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Codex
Visual Verification Owner: N/A
Visual Verification Timing: N/A（引用守卫，不授画面验收）
Contributor: Codex
Branch: codex/code-quality-94-102

## 目标

核定二阶段对话引用只使用工程真实定义的Actor和命名表情；修复准入前保存当前漏拒绝的业务反例，并撤回错误关闭信用。

## 范围

受影响实现author-dialogue.ts的Actor/表情查找、必要专测与正式validateAuthorDialogueReferences相邻回归。取证已读author-script.ts、validate-author.ts及project-loader当前调用域；这些相邻源不自动获得八维关闭。schema格式、合法ID集合、存档和UI形态没有本卡变更授权。

## 前提真值门

### 一句话行为 / 工程前提

普通对象索引会读到原型继承键。工程没有定义的constructor能通过当前正式对话引用守卫：角色分支产出speaker=Object，表情分支产出function而不是AssetId。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| primary source | 当前合同明示缺Actor/主立绘/表情必须fail-loud；真实资源身份来自定义表 | author-dialogue.ts::resolveDialogueIdentity注释/分支；author-script.ts::assertAuthorDialogueReferences |
| 第一阶段 | N/A：这是二阶段作者身份/资源模型，不照搬SDLPal下标 | READ-FIRST阶段边界 |
| 当前二阶段 | loader用Object.fromEntries建表；正式引用校验也用相同普通Record并委托resolver；两个构造合法的shared脚本漏过检查 | validate-author.ts::validateAuthorDialogueReferences；project-loader.ts::indexById/assembleCurrentProject；本卡关联探针原件 |
| 本任务目标 | 候选：只接受表本身真实定义的键；未定义即报错，真实定义的同名键保留可用 | 用户已批准，正式红绿修复完成；统一门尚待 |

### 反证与替代解释

可能只是非法fixture或仅内部函数可达。现已先经validateActors/validateAuthorSharedScripts通过形状检查，再调用实际生产引用守卫；hero/angry正控通过，两条“必须拒绝缺失定义”的Node AssertionError失败，非collection/runtime异常。普通作者工程是否含该名称、完整编辑器/浏览器表现未证明；不扩大成任意原型污染或安全攻击结论。

### 用户可见偏离

before：缺失的同名引用漏过检查；候选after：与其他未定义引用一样报错。用户已批准；不禁止工程真正定义的同名Actor/表情。产品查找已改为真实自有定义，正式红绿见下。

## 上下文锚点

[抽核父卡](QUALITY-RECENT-200-ACCEPTANCE-AUDIT-1.md)、[证据入口](../evidence/QUALITY-RECENT-200-ACCEPTANCE-AUDIT-1/README.md)、[二阶段规则](../../phase2/READ-FIRST.md)。基点b8b6989b952968ab60108ae45842ae5689822925；生产读域和复验脚本/原件见父证据dialogue-reference子目录。

## 验收条件

获批后先在正式测试入口固定两条失败反例及真实同名定义正控，再修查找归属；主Actor解析、表情、unbound/narration、runtime tree及正式引用守卫定向/相邻通过、typecheck/lint零诊断。纯测试夹具结构整改与产品行为修复分提交。核C/D/F/G/H的职责与复用，不能以Object.hasOwn一行或包级绿直接重新关闭实现。

## 当前模式推进记录

2026-10-28：两正式入口业务反例已红、stderr空，正常正控通过；产品build未准入。author-dialogue.ts由已验证恢复review，旧结论保留历史；用户裁决pending，父任务其它不重叠工作继续。

## Draft: 设计与风险

候选方案限定记录自身定义，不新增保留名黑名单、不改合法ID/schema。风险是错误禁掉合法同名定义、改变实际错误路径或遗漏expression查找；必须用正反例区分。用户已裁决；当前实现对actorsById与expressions分别使用Object.hasOwn，既有missing错误不变。

## 交接

当前单Agent。无下一位Agent提示词；裁决与正式红绿已完成；当前等待集中统一门，不宣称发布完成。

## 用户裁决与build准入（2026-10-28）

用户明确批准“按真实定义校验”：未定义同名Actor/表情报错，工程确实定义的同名内容保留。Codex build allowed限author-dialogue.ts查找自身定义及必要正式测试、相邻引用守卫回归；先跑正式失败反例再修实现。schema/合法ID集合/存档/UI不扩张，产品修复与测试夹具重构分提交。

## 正式红绿与质量审查

正式author-dialogue.test.ts在实现未改时8例中两条业务AssertionError，既有五例及真实同名定义正控均绿；修复后五相邻文件18/18，stderr空。保留缺失Actor与缺失expression的精准错误；新增同名正控完整核speaker/portrait/rows。A维先撤回再修，B–H见父audit逐文件记录；纯resolver、显式定义表、树/runtime/editor共用，无IO或新测试接口。格式整理后的portable probe曾因before观察调用无条件抛错，现仅核正式拒绝断言，before producer原字节另存；非第二个产品修复。

## 本地收口（2026-10-28）

Codex独立验收：本卡有限范围代码/证据接受。全仓20506包测试与七包typecheck通过，lint完整0/0/0；一次官方fast20157/809，ratchet和同报protected均0，指标无下降，源范围不移除。原件见[门禁回执](../evidence/QUALITY-RECENT-200-ACCEPTANCE-AUDIT-1/gates.json)。文档最终投影已单列零诊断复核，随后同分支分开纯测试重构与获批产品修复提交；推送/PR/合并未由此段冒称完成。后续扩抽建议不算本卡已执行。
