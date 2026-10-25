# pre94唯一最终集中门禁窗口

Status: local gates accepted; remote CI / single PR / merge pending
Owner: Codex（单Agent）

固定83张pre94卡的原代码范围均accept（0partial／0pending）；这不等于全仓3452文件全部完成。当前机器账本511closed／63review／2878pending。未扩94–102，主工作树未改。逐文件八维、caller／oracle、职责与状态Owner、注释、复用、测试质量和低成本版本复验均按各片有效证据；本窗口只合并门禁信用，不重新全文审所有文件。

[阶段与单文件八维](review.json)、[有限覆盖率重计与精确退役映射](recount.json)、[最终完整原件](final-receipts.json.gz)、[首跑失败原件](initial-receipts.json.gz)、[默认只读快检](verify.mjs)。最终代码冻结257c0b816；原采集时5879个包／测试／项目／配置输入逐SHA固定；当前5875保持原字节，两个worker配置、一条缩略图注释及一处测试act边界由完整文件差异限定，工作流另有精确资源桥。快检只核身份、原件与已记录门结果，不冒充重新设计审查或远端CI。

- `pnpm check`实际exit0：20617包内测试＋708工具测试，七包typecheck及editor author-scripts检查，lint6100文件error／warning／info均0；完整stderr0、Vitest stderr区段0。首跑exit1为G02旧入口断言，已保留并精确修正；13身份数和像素／错误合同保留。
- 唯一`pnpm coverage:ratchet`采集完成20180 fast测试／807生产源，运行诊断0，但原命令exit1拒绝CLI拆分后的statements／functions／lines比率。这次失败明确保留，不能称原命令exit0。
- 九文件纯CLI阶段拆分复用完整正文重建、39真实CLI合同和809双次产物比对；只按结构增减重计S−18/+34、F0/+29、L−18/+22，分支旧门槛和事件修复带来的增量不下调。旧／新完整逐文件报告均留存；不恢复死代码或堆弱测试。
- 未改官方比较器、scope、门槛或保护逻辑。原官方run.mjs的13声明和最终比较／写盘尾段逐字提取，仅将重新采集替换为读取这一次报告；同报告ratchet及对origin/main的protected fast均exit0、stderr0。对应SHA、命令、完整双流在原件。
- CODE42两个无生产调用的矩形占位合同按精确身份退役；状态／跨模块两旧摘要误用JSON reporter空格连接的fullName，更正为官方list身份。原断言组件与当前官方身份一一相同；status只多一注释、跨模块字节未变。八项实际计数减少全部通过现有严格判据，未宽免。数据改后117覆盖率工具测试通过。

默认只读复验：`node docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/final-pre94-gates/verify.mjs`。MATCH仅对已冻结输入与门禁，变化返回STALE／缺输入返回UNAVAILABLE。全量stdout／stderr／execution、采集前后汇总与逐文件报告、官方原生身份、产生者、重放与失败原件均在压缩包；未来Agent无需再通读产品来核本次交付身份和结论范围。

当前待一份PR的实际远端Documentation／Coverage检查及普通merge。此前main b3d35be6两CI成功已在freeze原件；不能代替新候选或合并后main检查。原全仓与覆盖率失败、工具产生者失败均不覆盖；正常stdout进度日志不冒称为空。后续只做发布和相应证据维护，不扩其它治理范围。

## 首次PR的安装器提示与窄修

首次PR文档检查实际success、注解0，但完整stdout另有1条pnpm安装WARN：固定Action内部先装11.25.0再self-update为项目10.29.2，引发旧布局提示。不能称整条日志0告警。[两工作流八维／完整差异证明](bootstrap.json)和[原始服务日志／上游固定源码／实际安装回执](bootstrap-receipts.json.gz)保留。改为独立RUNNER_TEMP直接安装既定10.29.2，原Node与全部门命令不变；store路径改变，缓存key同时包含两工作流与lockfile，防止旧路径缓存假命中。真实提取脚本、版本及路径验证和47质量工具0stderr；未重跑本地全仓或coverage。新的同PR远端结果仍按实际回执，不能由本机安装成功外推。

## 新CI的5000ms宿主超时与资源预算

5b94a978c的Coverage40158750359在Reforge送菜宿主单例超时，8990绿／1基础设施红，尚未到全仓比较；不能称CI通过。[完整配置八维／输入桥与失败范围](worker-budget.json)、[未裁剪服务日志、原生枚举／51相关及产生者](worker-receipts.json.gz)保存。只将Vitest maxWorkers2改1，全部8991身份／365文件、选择器、隔离和原有5s／15s／30s期限不变。pal-meal-shell全803行和全部产品源原字节保留，0新文件关闭。

三个私有profile只用于定位：尺寸写入0、输入准备48ms左右、主要成本是启动和渲染；减少IO日志只小幅改善，所以未实施该原型，也未修改fixture／绘制／脚本／断言。单worker作为资源约束减少冷图与V8竞争，不宣称已证明唯一原因；新实际CI仍须通过。51相关／TC与完整官方定义枚举0stderr。原完整check／单次coverage来自2worker版本，当前以5878精确输入＋1明确资源桥增量核证，不能冒称在新worker下重跑全仓。

官方枚举前后除executionDigest外deep-equal；仅依新实际枚举更新摘要的该配置字段及baseline指纹，原采集时间、全部覆盖率分子分母、来源、身份与数量均不变。由原官方严格尾段执行同报告ratchet／protected，未重采覆盖率、不降低比例。原始报告仍保留；最终以新候选真实远端覆盖率为准。

## 配置合同同步遗漏与修正

81dbfaf7c的Coverage40161643493在覆盖率工具阶段116绿／1红：Codex将worker改1时漏改`config.test.mjs`的精确期望2，尚未开始覆盖率采集。这是交付遗漏，不能归因为再次宿主超时。当前只把该期望同步为1，完整对象等值断言仍拒绝新增timeout／exclude等字段，源范围与runner参数断言不变；全部117工具测试通过，stderr0。完整服务失败日志、本次绿原件及单行差异保存在[配置合同原件](config-contract-receipts.json.gz)，八维和文件指纹在[review](review.json)的`configContract`。未再跑本地全仓或覆盖率，下一次实际CI仍须独立通过。

## 真实整轮结果与串行资源安排

6f646aa8c的40162268435不是通过：Reforge8991全绿；game3756绿、两个完整地图缩略图用例5秒超时；editor仍输出通过用例时，整条作业到30分钟取消。完整日志、API、注解（含查询EOF失败与重试）在[串行CI原件](serial-ci-receipts.json.gz)，逐文件八维、whole-file差异和身份核对在`review.serialCI`。观察到game渲染与editor定义收集重叠，不冒称已证明唯一原因。

当前保持64×128地图、全部五例和PNG像素／缓存／并发／重试断言原字节；game采用一个worker，工作流删除可选editor并行收集，沿原runner默认顺序执行七包。整条作业预算30→45分钟，所有单测5s／15s／30s期限、选择器和比较器不变。缩略图产品仅纠正“未接入补缝”的过时注释，去注释AST一致。30相关测试及game typecheck通过；新增game精确配置合同后118工具全绿，stderr0。

官方重新枚举3758身份／349文件，与原报告除配置digest外完全相同；官方原比较／写盘尾段只刷新game执行指纹，不改任何原测覆盖率分子分母，未重采本地coverage。原失败和未完成editor结果保留；新的远端完整运行仍待实际通过。

## 全部远端覆盖率通过但运行诊断拒绝，测试等待边界窄修

a76881ec的Documentation40164761305完整日志0诊断；Coverage40164761191七包20180例／807源及protected比较通过，但完整日志有1个stderr区段、4条React act告警（Harness1、CutsceneTab3），因此集成验收拒绝，尚未合并。初始聊天摘要误记两条，当前以未裁剪原件逐条计数为准；不把exit0说成零诊断。完整远端日志／API／注解、本次局部原件与冻结测试正文见[act原件](act-ci-receipts.json.gz)，八维与精确文件变换见`review.actCI`。

真实视频导入需等待WebCrypto；旧文件输入helper的act只覆盖事件，随后真实hash完成时session和选择状态在act之外提交。当前只把原事件调用和原session提交等待包进同一异步act；三个身份、全部fixture与业务断言、真实hash、产品实现及超时设置不变。2文件9例通过、stderr0，editor typecheck0。无需调整baseline或再次本地全仓／覆盖率；旧完整check按精确单文件变换增量复用，新的实际远端CI必须零诊断才合并。0新增关闭，83卡范围及511／63／2878账本保持不变。
