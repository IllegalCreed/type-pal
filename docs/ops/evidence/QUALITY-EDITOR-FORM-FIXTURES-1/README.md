# 数值表单合法夹具与生命周期

任务：[QUALITY-EDITOR-FORM-FIXTURES-1](../../tasks/QUALITY-EDITOR-FORM-FIXTURES-1.md)。四份测试逐文件直接读、真实组件/命令/caller范围见read-boundaries.json。当前build，0关闭；产品、规则、content版本均未改。

前三测试基线14例通过但334条不支持act的诊断；仅启用环境后仍14例通过、暴露10条act外更新。保持原100次输入和旧夹具，仅修真实卸载生命周期后14例全部诊断0（lifecycle-original-14）。之后才将两处100次重复输入缩为三种不同合法值，并核blur、Enter、Escape、对象切换、canonical和历史命令数。CONTENT_VERSION当前确为22；最初过期版本猜测在核常量后已撤回，没有版本升级。

去掉双重强转、as never及伪造技能/状态，用正式blank→loader→toEditorState和当前typed SkillData，保留其它actors/引用。每个初始状态通过assertProjectSaveValid；Casualty locale引用注册，文本编辑走真实focus/Enter/blur/Escape。创建空台词后的瞬态不冒称可保存。概率门测试实际只证可聚焦按钮，已更名，不声称键盘激活。

相邻glm-m两例原有7条act诊断来自三次act外undo；现已在真实撤销处等待，并回收全局检查标志。该文件初始项目也走保存校验、补真实locale并保留无关actors。两例效果类型、资源、比例下限、旁白轴未证重复，保留全部断言；删空Promise等待与夸大“三档”/未覆盖独占声明。

最终四文件16例及相邻11文件78例全部通过、0skip，act/环境/native三个模式均0；完整原始输出无其它警告。Editor typecheck通过。首次typecheck捕获回调内battler收窄丢失的两个TS2322，已用局部const解决，失败原件保留；未强转或放宽规则。checkpoint-proof核16个身份仅一个诚实更名，无退役。

K4删槽原合同见E18-1卡264/284与当前组件：保留其它槽时必须删除属性键。不是schema拒绝undefined（当前validate允许该可选字段）。隔离mutant把delete改为赋undefined，旧10例仍绿，新10例仅K4一条AssertionError，恢复14例绿、0skip；临时四包副本清理后独立重构并核raw/runner/source/身份，见oracle-proof/oracle-rebuild。原组件SHA未变。20次idle pointermove未证无效，本片不删；跨文件完整排重、辅助库全域生命周期仍未关闭。

check、官方普通ratchet、protected fast与C04/C05在下一稳定窗口集中执行。定向通过不等于全仓诊断清零，不合main、不宣布文件闭合。

检查点静态门：docs 0 issues，lint 4227文件0 error/0 warning/0 info，ledger通过；完整原件见static-preflight.json。全仓测试/普通ratchet/protected待集中窗口，不作统一零诊断结论。

稳定窗口已实测，严格统一诊断门仍未通过；见[联合原始计数与边界](../QUALITY-EDITOR-FORM-FIXTURES-1/window-review.md)。本片留review，0关闭、不合main。
