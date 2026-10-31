# QUALITY-LOCALE-DEFINITION-OWNERSHIP-1 — 二阶段文本缺键回退

Status: done
Phase: phase2
Capability: locale
Coding Owner: Codex（取证；实现未准入）
Reviewer: Codex
Visual Verification Timing: N/A（字符串解析合同）
Branch: codex/code-quality-94-102

## 目标

缺失译文时lookupText遵守现有“返回文本ID”的合同，不返回继承函数/对象。真正定义的同名译文及空串仍有效。

## 范围

locale.ts及直接专测，必要真实显示caller补读；不改Locale格式、文本ID域、存档或UI形态。

## 前提真值门

### 一句话行为 / 工程前提

lookupText按locale[id]读取普通定义表；constructor缺失时可命中继承函数，与声明string返回值和缺键回退注释矛盾。正式反例待实跑，不以相似源码自动认定已复现。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| primary source | 未命中应返回ID，已有空串须保留 | content/src/locale.ts::lookupText及locale.test.ts |
| 第一阶段 | N/A，二阶段文本合同 | content/src/index.ts公共出口 |
| 当前二阶段 | validateLocale只枚举自身字符串值并返回原对象；实际角色显示直接使用lookupText结果 | validate.ts::validateLocale；editor/core/entity-display.ts::entityDisplayName |
| 目标 | 缺自身译文返回ID；存在自身同名译文时正常显示 | 用户裁决pending；正式红例与同名空串正控 |

### 反证与替代解释

正常剧情可能从不引用此ID；本卡不冒称普通工程已遇到。Locale={}通过现行validator，TextId是任意字符串，故公开输入域内缺键行为可以独立证伪。若现行validator已消除所有原型、或缺键返回真实字符串，则应撤回结论。

### 用户可见偏离

before候选：缺键返回函数而非ID；after候选：按已有合同返回ID。产品实现未改，用户裁决pending，不继承此前商店授权。

## 上下文锚点

[二阶段边界](../../phase2/READ-FIRST.md)、[剩余200复核](QUALITY-RECENT-200-CONTENT-AUDIT-2.md)、[八维规范](../code-quality.md)。

## 验收条件

正式缺constructor反例先红、真实同名空串正控保留，再获准修复。核真实entityDisplayName文本边界和现有普通命中/缺键；不以ID黑名单处理，不改格式/存档。逐文件A–H、完整原件归父卡，统一重门等整个稳定窗口。

## 当前模式推进记录

仅测试/取证准入，产品build blocked。新判断须以正式结果成立；无新分支，当前Codex单Owner。

2026-10-28用户批准“按现有缺词回退合同修复”。Codex build allowed仅locale自身定义读取与必要专测，同名空串保留；正式1红3绿已在修复前确认，随后实施。其它字典消费者无本卡修复授权。

## Draft: 设计与风险

若正式反例成立，建议只让lookupText从自身定义读取，不影响已定义同名内容。缺词与跨表完整性报告分开，不扩其它字典消费者。

## Build: 实现与自测

正式locale.test.ts四例中，缺constructor回退这条业务AssertionError失败；普通命中/缺键与真正同名空串三例通过。原生结果、stdout/stderr、命令和测试补丁已保留。实现未改；普通剧情可达性未证实，不授视觉信用。

## Review: 审查与返工

pending；未完成取证前不宣称修复或接受。

## 用户验收

pending。

## 交接日志

2026-10-28 Codex：已全文读locale两文件、validateLocale函数及实际entity显示caller；只核本边界，不把原型同族假设当实跑证据。

## 下一位 Agent 提示词

无，当前Codex继续其余不重叠逐文件审查。

## 本片代码复验

2026-10-28：用户批准后的有限实现与正式测试代码接受；content1473例、相邻reforge36/editor31、相关typecheck与改动scoped静态零诊断（精确候选边界见父audit）。原失败/同名正控/错误假设撤回均保存。统一全仓/coverage/受保护发布仍待父窗口；卡维持review，不宣称已提交/推送/合并。

## 当前窗口代码收口

2026-10-28 Codex单Agent：153本轮主体＋前47有效复用＝200／200，原200复查排队0；不授其它pending信用。两已批归属修复正式红例／真实caller与相邻验证成立。全仓20506／typecheck／lint0；官方20157／810采集按包恢复，精确content重计与三退役快照后同报ratchet/protected0。失败原件和限制见父窗口audit；最后文档／静态回执及受保护PR发布事实另据实际命令，不提前冒称已推送/合并。无新增产品取舍。
