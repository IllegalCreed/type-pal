# QUALITY-HOST-NAVIGATION-DIAGNOSTICS-1 — 测试宿主原生导航与真实事件

Status: review
Owner: Codex
Reviewer: Codex（作者自验与独立验收分开）
Phase: phase2
Capability: test host navigation fidelity
Visual Verification Timing: N/A（纯测试，不改产品）

## 准入与白名单

384f068ee已提交推送，两条治理分支同步；fresh main=f98d0ddd8，0behind/37ahead；主树只读。机器3284/229closed/56review/2999pending。
Codex单Agent、单一Coding Owner。仅两份现存测试源码：

- packages/editor/src/ui/design-system/navigation.glm-leaf-wave.test.tsx
- packages/reforge/src/main.host-lifecycle-1.test.ts

两测试、navigation实现、EditorAppHeader、runtime-shell/dom-host已全文读；App2194-2225与main2232-2250仅真实caller/terminal分支，未冒称整文件审计。当前SHA复核继承上一片next-read-boundaries。
AGENTS/CLAUDE/agent-workflow/phase2 READ-FIRST适用；不改产品、公共接口、主线、其它活跃任务、schema/save/资产管线或规则。

## 前提与方案

| 方向 | 一手证据 |
|---|---|
| Primary | React官方[act](https://react.dev/reference/react/act)；安装jsdom29.1.1的Location-impl.js reload→navigation.js navigateFetch明确报notImplemented，两个vendor源码全文/SHA/行锚见jsdom-primary.json。调用方负责preventDefault或通过原生IO端口观测。 |
| 第一阶段 | N/A，二阶段测试宿主；不改原版/游戏机制。 |
| 第二阶段 | DsMenuBar:207-211先交onNavigate再收菜单；EditorAppHeader:47透传到App2194-2206，普通点击调用preventDefault。main2232-2242真实listMeta无档后调用location.reload。 |
| 目标 | 链接测试用真实React事件并在测试router接管默认导航；无档测试观察真实reload调用，URL/世界保持由端口与实际observation断言，不以覆盖账或“jsdom静默no-op”替代。 |

最强替代解释：两条导航日志可能来自其它caller或测试结束后的迟到工作；分别运行基线、替换真实端口后核完整stdout。仅在实际消失后确认归因。
保留所有现存用例，不删公共helper；菜单键盘测试用实际React事件移除强转；act环境通过stubGlobal并在卸载后恢复。
Codex premise verified / design agree，build allowed，仅上述两文件。

## 验证与交接

先定向基线与修后完整恢复，再相邻宿主/菜单模块、两包typecheck；无档reload反控须实际指定AssertionError，不能以启动失败或超时当红。
和已推送Kimi资源工作流检查点合在下一稳定窗口跑全仓check、官方ratchet、protected、静态门与ledger。此卡未到统一门不标done，不合main。
证据见[本片](../evidence/QUALITY-HOST-NAVIGATION-DIAGNOSTICS-1/README.md)。无下一位Agent提示词，由Codex继续。

## 作者检查点

定向6+8例与相邻34+19例通过；两个native诊断均按独立基线1→0实证，非最近stderr猜归因。真实reload oracle反控旧8绿/现恰1红/恢复8绿，完整0skip、无timeout/启动失败；清理后已独立重构。键盘事件强转已改为真实React事件，回收act全局环境；测试身份/计数未改。两包typecheck通过。
本卡只清native边界，AudioContext与相邻故障日志仍在，见证据；统一门与其它runtime诊断未清，不标done、不合main。两文件列review，当前机器3284/229closed/58review/2997pending，0关闭；后续稳定诊断窗口跑全部门。无下一位Agent提示词，由Codex继续。

## 联合窗口复核

C04/C05/C06八源冻结候选cae26b1c7已完成check、普通ratchet、protected fast，退出码均0；硬静态零诊断，coverage范围/指标无删降。仍有act/环境诊断，严格统一门未过，不标done、不合main。详细原始计数、caller边界和剩余风险见[联合记录](../evidence/QUALITY-EDITOR-FORM-FIXTURES-1/window-review.md)。0文件关闭，账本3284/229closed/62review/2993pending。无下一位Agent提示词，Codex继续。
