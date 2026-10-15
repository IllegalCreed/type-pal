# QUALITY-EDITOR-UPLOAD-DIAGNOSTICS-1 — C03上传向导真实IO与测试精简

Status: build
Owner: Codex
Reviewer: Codex（作者自验与另进程证据核对分记）
Phase: phase2
Capability: editor upload test lifecycle
Visual Verification Timing: N/A（只改测试，不改产品）

## 前提、锚点与单一写入

2026-10-16，唯一分支codex/code-quality-3y，058e9202d；fetch最新main=f98d0ddd8，0behind/135ahead。主树只读，默认单Agent。上一轮有实际源码提交/推送、两枚反控及全editor包回执，分类progress；当前机器3287/223closed/199review/2865pending。

已读AGENTS/READ-FIRST与历史Cursor有限接收卡；直接全文读Wizard、Uploader、共享upload-harness/upload-ui/upload-ports、G01/G02/G07/G05测试，合法项目fixture与硬件端口沿已读原件核SHA。WorldSpriteLibrary的upload onDone caller、assets.ts:1-100色表读取是直接生产锚点，不把这些局部caller记成整文件验收。

| 维度 | 事实与目标 |
|---|---|
| Primary | React act官方文档要求await实际异步交付并启用正确环境；原始runner显示57条Wizard与6条Uploader告警。 |
| 第一阶段 | N/A，二阶段编辑器测试；不引入SDLPal运行机制。 |
| 第二阶段 | Wizard初始/换scope读实际标准色表，PNG异步解码后才设置草稿，真实gzip/SHA/命令提交后调用onDone；退出selection仍须释放位图。 |
| 本片目标 | act内透传等待真实色表/PNG/onDone；故意挂起的读取由测试显式放行；迟到close与错误UI保留直接oracle；先完整30例清诊断，再审已证重复。 |

最强替代解释：告警主要在提交而非mount，故先只做宿主消融再补驱动/测试等待，不按数量猜根因。不能为等待另行读取/解码、改业务结果或关闭环境检查。色表未知/失败不伪造成功，实际组件错误出口仍须断言。

Coding Owner Codex；Codex premise verified / design agree / build allowed仅以下四源：upload-harness.tsx的Wizard分段、upload-ui.ts的Wizard分段、SpriteUploadWizard.c03-g02.cursor-r1.test.tsx、SpriteUploadWizard.c03-g07.cursor-r1.test.tsx。Viewer/Uploader分段只做相邻回归，不借本卡改变。G01/G05只读，产品、schema/save、资产管线、公共接口与规则不改；新增产品风险另卡停线。

## 核验与交付

五边界逐项核：合法PNG/项目、色盘失败/迟到、取消/卸载释放、scope ownership、真实命令与回调。G07-03与G07-09疑似被02/04更强合同覆盖，须逐断言/输入轴映射，不确定不删；05标题与实际输入不符，应按行为修正。不因全绿或短文件关闭文件。

先基线与消融、保持30身份清零，再确定精简。若确退役，仅新增approved-test-retirements.mjs的本文件精确旧/新count、身份、SHA和固定表测试计数；matcher/拒绝合同不变，baseline只由官方ratchet生成。至少两枚业务反控（取消后迟到位图释放、提交锁），保留完整command/cwd/exit/signal/spawn、raw/JSON、身份与hash，拒绝skip/timeout/setup混错；临时源副本精确清理并另进程重构。

定向/相邻/editor typecheck、docs/lint-zero/ledger后同一分支提交推送；check/official ratchet/两父protected fast在稳定模块窗口集中，非零诊断不合main。所有状态仅review，0新关闭。证据：[本片](../evidence/QUALITY-EDITOR-UPLOAD-DIAGNOSTICS-1/README.md)。无下一位Agent提示词，Codex继续。

## 2026-10-16 未完成检查点与用户优先级

用户重申必须复审94号前所有卡成果；本片保存检查点后让位于该复审，不把未完成工作记成done。宿主消融30例仍57act，推翻“只改mount即可清除”的解释；补真实色表/位图/回调等待后30例通过、仍2act；11文件80例相邻通过、仍8act（Wizard2、Uploader6）。editor typecheck通过。没有退役用例，没有完成业务反控，也没有运行本候选全仓check/official ratchet/protected fast。仍build，0关闭，账本3287/223/199/2865保持；G02未提升为已验证，G07候选重复仍未裁定。

本片只有三个测试/宿主源文件变更，产品、配置、规则和基线未改。原始runner/JSON与消融证据完整保存；后续仍须解决2act、补反控和重复合同映射，再进入统一门。下一步转QUALITY-PRE94-RETROSPECTIVE-1的全量83卡复审；本片待续，无下一位Agent提示词。

## 2026-10-16 从d261e1d17恢复C10

前94全83卡仍10partial/73pending/0accept，94–102/editor原goal保留；先清editor阻塞以形成阶段合并窗口，不用治理分支的提交数代替合并。最新main=f98d0ddd8，唯一codex/code-quality-3y，0behind。G02/G07两个完整文件当前20通过、2act、0环境告警，均为G02-10；三Wizard文件合计30，不能将两文件20称为全部30。

已全文重读Wizard548行、G01/G02/G07、upload-harness/ui/ports与kit；真实caller WorldSpriteLibrary773–788、sha256Hex及AddSpriteCommand/EditSession路径按已读范围登记。React官方act参考要求等待跨异步边界的实际交付。G02-10在点击后以act外DOM轮询等待错误，gzip/SHA的catch/finally两更新因此逃出act；不以环境开关或console过滤处理。

Codex premise verified/design agree/build allowed此次四文件：upload-ui.ts仅Wizard段、upload-ports.ts仅GatedCompressPort透传观测/收尾、G02与G07测试。harness本次只读，Viewer/Uploader驱动段、G01/G05与全部产品/接口/资源/规则冻结。G02命令失败路径显式等待真实crypto.subtle.digest Promise，spy不替换硬件结果/不mock核心；act退出后才验错误UI和恢复。G07闸门记录真实gzip任务并提供drain，在finally于act内放行/等真实gzip和SHA，再恢复spy；afterEach也须finally恢复环境。G05只做相邻回归，旧端口调用结果不改。

先保留30身份实测零act，再排重：G07-03未验标题声称kind，其body是02取消/一次回调/历史合同弱子集；09无错误恢复，改第二id后成功由04更强的两次回调/历史合同覆盖。仅直接证明后退役03/09，05标题改首次编辑，合法输入/剩余oracle不弱化。字节/原生身份/三snapshot对准后才加G07精确10→8批准元数据，固定27项/net62可同步；其它26项、matcher/拒绝合同/baseline不改。取消迟到释放、重复提交锁两项各需恰一指定业务AssertionError；两退役oracle失败集合单列。诊断反控移除真实IO等待应恢复2act，虽原生绿也拒绝，不冒充业务针。最终统一门未零诊断前不合main、不关闭文件。


### C10恢复结果与全量复审优先级

[恢复证据](../evidence/QUALITY-EDITOR-UPLOAD-DIAGNOSTICS-1/recovery/README.md)：同30身份先清2act；G07两弱子集有转移反控后10→8，最终Wizard28零诊断。两业务反控各恰一指定AssertionError；两oracle转移及原生绿但2act的诊断反控单列，完整十二轮/真实模块图与精确27项/net62退役已重建。产品/配置/基线不变，四测试/驱动文件仅review；初次静态unused import告警保留，删除唯一未用binding后按最终字节回归。

相邻78通过仍Uploader6act；editor实际631文件/4943通过仍624act、243环境和1表单告警，拒绝统一验收；editor typecheck/72工具通过，reforge及静态门按恢复gates原件。0新增关闭；全仓check/官方ratchet/protected尚未新跑，不合main。用户再次明确前94全部83卡成果复审，本检查点提交后回3d/3g，editor余项保留，不将范围缩成诊断治理。83卡仍10partial/73pending/0整卡accept；无下一位Agent提示词，Codex单Agent继续。
