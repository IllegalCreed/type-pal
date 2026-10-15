# QUALITY-EDITOR-FORM-FIXTURES-1 — 数值表单宿主、合法夹具与oracle

Status: review
Owner: Codex
Reviewer: Codex（作者自验/独立验收分开）
Phase: phase2
Capability: actor form test fidelity
Visual Verification Timing: N/A（纯测试，不改产品）

## 边界与准入

起点36cabd699已推送；main=f98d0ddd8、0behind/38ahead，主树只读。机器3284/229closed/58review/2997pending。
Codex单Agent、唯一Coding Owner；仅LevelingEditor.test.tsx、LevelCurveEditor.ui.test.tsx、CasualtyEditor.test.tsx、CasualtyEditor.glm-m.test.tsx四测试。
不改组件、content/schema/SAVE、公共接口、公式/机制、资产管线、生成物与规则，不接管ED-ENTITY-STATE-PLAN-1。

三测试与三个真实组件已全文读；ActorDef全文、SkillData/Map/LevelUpSkill类型、current manifest版本/入口形状已直接读，ActorMode519-536/817-824仅真实caller段，不冒称整文件审计。
loader/硬件端口沿用已全文读的glm-ui-wave-kit与kimi kit；相关设计依据phase2 READ-FIRST、actor/skill模型与字段commit合同。当前代码/SHA记录见证据。

## 前提真值

| 方向 | 事实与直接证据 |
|---|---|
| Primary | React官方[act](https://react.dev/reference/react/act)，启用检查并等待真实渲染/卸载；不得关闭检查。 |
| 第一阶段 | N/A，二阶段编辑器测试，不改变游戏升级/伤亡机制。 |
| 当前二阶段 | character.ts168明确CONTENT_VERSION=22，非旧版本；CurrentManifest.entryPoints要求非空。三测试用双重强转绕过完整EditorState、SkillData Map与Actor battler合同。正式loader经过当前守卫与assertProjectSaveValid。 |
| 目标 | 先保持全部14例做环境/卸载消融，再用当前blank/loader构造合法输入、去强转；少量连续输入与真实键盘/blur、字段/键ownership oracle准确。 |

初看22曾怀疑过期版本；读取常量后已撤回并告知用户。没有schema升级、版本兼容或迁移需求。风险是测试夹具被强转掩盖，修复限定测试合法输入；若当前保存门暴露真正产品/schema风险则另卡停线，不弱化守卫。
最强替代解释：单改act环境会把原先漏报的act外卸载变成新告警；保留14例逐步实测，不以减少输入循环冒称生命周期修复。
现有100次输入不是业务边界，待原例零诊断后缩成少量不同合法值；未知跨文件重复先不删。字段值、命令数量、切换对象、撤销重做与概率门occurrence保留。
Codex premise verified / design agree，build allowed，仅前三测试。

相邻11文件78例已通过但另有7条act外更新，单worker日志全部来自CasualtyEditor.glm-m.test.tsx。Codex完整读该文件、glm-m/kit.ts、CasualtyEditor.glm-leaf-wave.test.tsx及历史WAVE-M任务卡；三次真实undo位于act外。效果kind/resource、比例下限和旁白样式轴未证重复，保留两例。扩展同一表单切片到第四测试，限生命周期、初始保存合法性、注释准确性；先留原始两例回执，后修三次undo，产品不变。Codex premise verified / design agree，build allowed，仅第四测试。

## 验证与交接

原始/消融/合法夹具后完整定向及相邻模块/typecheck，代表性oracle隔离反控；source/reader/初始可保存输入均留证。
检查点分批提交推送；与Kimi/宿主导航在下一稳定诊断窗口集中跑check、官方ratchet、protected、docs/lint/ledger。未知项不闭合，统一诊断未清不合main。
证据见[本片](../evidence/QUALITY-EDITOR-FORM-FIXTURES-1/README.md)。无下一位Agent提示词，Codex继续。

## 作者检查点

四文件16例、相邻11文件78例通过，三类诊断0；Editor typecheck通过，首次TS2322失败原件保留。前三文件先原样14例消融334环境→10act→0，再做合法fixture/输入精简；第四文件两例7act→0。身份仅概率门标题诚实更名，数量16不变、不退役。K4删键反控旧10绿/新恰1条AssertionError/恢复14绿，清理后重构校验通过。没有产品/schema/接口/生成物/规则变更。

四文件只登记review，机器3284/229closed/62review/2993pending，0关闭。静态门与统一窗口以新回执为准；C04/C05/C06集中check/普通ratchet/protected尚待运行，统一诊断未清不合main。完整逐文件证据、边界和剩余风险见本片README。无下一位Agent提示词，由Codex继续。

检查点静态门：docs 0 issues，lint 4227文件0 error/0 warning/0 info，ledger通过；完整原件见static-preflight.json。全仓测试/普通ratchet/protected待集中窗口，不作统一零诊断结论。

## 联合窗口复核

C04/C05/C06八源冻结候选cae26b1c7已完成check、普通ratchet、protected fast，退出码均0；硬静态零诊断，coverage范围/指标无删降。仍有act/环境诊断，严格统一门未过，不标done、不合main。详细原始计数、caller边界和剩余风险见[联合记录](../evidence/QUALITY-EDITOR-FORM-FIXTURES-1/window-review.md)。0文件关闭，账本3284/229closed/62review/2993pending。无下一位Agent提示词，Codex继续。
