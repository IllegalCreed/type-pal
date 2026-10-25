# pre94唯一最终集中门禁窗口

Status: local gates accepted; remote CI / single PR / merge pending
Owner: Codex（单Agent）

固定83张pre94卡的原代码范围均accept（0partial／0pending）；这不等于全仓3452文件全部完成。当前机器账本511closed／63review／2878pending。未扩94–102，主工作树未改。逐文件八维、caller／oracle、职责与状态Owner、注释、复用、测试质量和低成本版本复验均按各片有效证据；本窗口只合并门禁信用，不重新全文审所有文件。

[阶段与单文件八维](review.json)、[有限覆盖率重计与精确退役映射](recount.json)、[最终完整原件](final-receipts.json.gz)、[首跑失败原件](initial-receipts.json.gz)、[默认只读快检](verify.mjs)。最终代码冻结257c0b816；5879个包／测试／项目／配置输入已逐SHA确认未变。快检只核身份、原件与已记录门结果，不冒充重新设计审查或远端CI。

- `pnpm check`实际exit0：20617包内测试＋708工具测试，七包typecheck及editor author-scripts检查，lint6100文件error／warning／info均0；完整stderr0、Vitest stderr区段0。首跑exit1为G02旧入口断言，已保留并精确修正；13身份数和像素／错误合同保留。
- 唯一`pnpm coverage:ratchet`采集完成20180 fast测试／807生产源，运行诊断0，但原命令exit1拒绝CLI拆分后的statements／functions／lines比率。这次失败明确保留，不能称原命令exit0。
- 九文件纯CLI阶段拆分复用完整正文重建、39真实CLI合同和809双次产物比对；只按结构增减重计S−18/+34、F0/+29、L−18/+22，分支旧门槛和事件修复带来的增量不下调。旧／新完整逐文件报告均留存；不恢复死代码或堆弱测试。
- 未改官方比较器、scope、门槛或保护逻辑。原官方run.mjs的13声明和最终比较／写盘尾段逐字提取，仅将重新采集替换为读取这一次报告；同报告ratchet及对origin/main的protected fast均exit0、stderr0。对应SHA、命令、完整双流在原件。
- CODE42两个无生产调用的矩形占位合同按精确身份退役；状态／跨模块两旧摘要误用JSON reporter空格连接的fullName，更正为官方list身份。原断言组件与当前官方身份一一相同；status只多一注释、跨模块字节未变。八项实际计数减少全部通过现有严格判据，未宽免。数据改后117覆盖率工具测试通过。

默认只读复验：`node docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/final-pre94-gates/verify.mjs`。MATCH仅对已冻结输入与门禁，变化返回STALE／缺输入返回UNAVAILABLE。全量stdout／stderr／execution、采集前后汇总与逐文件报告、官方原生身份、产生者、重放与失败原件均在压缩包；未来Agent无需再通读产品来核本次交付身份和结论范围。

当前待一份PR的实际远端Documentation／Coverage检查及普通merge。此前main b3d35be6两CI成功已在freeze原件；不能代替新候选或合并后main检查。原全仓与覆盖率失败、工具产生者失败均不覆盖；正常stdout进度日志不冒称为空。后续只做发布和相应证据维护，不扩其它治理范围。

## 首次PR的安装器提示与窄修

首次PR文档检查实际success、注解0，但完整stdout另有1条pnpm安装WARN：固定Action内部先装11.25.0再self-update为项目10.29.2，引发旧布局提示。不能称整条日志0告警。[两工作流八维／完整差异证明](bootstrap.json)和[原始服务日志／上游固定源码／实际安装回执](bootstrap-receipts.json.gz)保留。改为独立RUNNER_TEMP直接安装既定10.29.2，原Node与全部门命令不变；store路径改变，缓存key同时包含两工作流与lockfile，防止旧路径缓存假命中。真实提取脚本、版本及路径验证和47质量工具0stderr；未重跑本地全仓或coverage。新的同PR远端结果仍按实际回执，不能由本机安装成功外推。
