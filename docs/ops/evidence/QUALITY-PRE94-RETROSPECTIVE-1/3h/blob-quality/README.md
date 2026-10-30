# CODE3h blob、测试宿主与对话资源质量

本窗审查[逐文件八维与处置](review.json)列明的11文件，接受其中9文件，RLE适配层及其专测继续review。基点acb96a123，同一codex/code-quality-3y、Codex单Owner；运行时是带文件指纹的未提交候选，不能将执行HEAD误当产品字节。七文件新关闭、一旧关闭撤回，净增6；账本3374/388closed/111review/2875pending，固定83仍62accept/21partial。3h/3i整卡、shared格式与pre94未接受，94–102不扩展。

源码差异为两生产文件的注释、测试宿主的类型标注及三个无外部调用导出私有化；其它修改为测试/精确退役数据。[正文证据](body-invariance.json)检查生产parsedTS/发射JS逐字一致；宿主仅规范指定三个export后核发射JS token kind/text，保留字符串内容，不以空白差异误报机制变化。类型合法性另经game typecheck验证。

定向：blob四文件38→35，dialog/RLE四文件最终26→24（中间23例绿轮保留）；公共宿主17调用文件147绿属于宿主改动时点，不与上述结果累加成唯一数量。相邻资产目录21文件161绿属于末次三个测试补强前；完整check实际20515+690工具，随后三测试/精确数据以4文件24、gameTC/99工具刷新，不冒称最后集合重跑全check。单次official20090/760与同报告strict/protected通过，指标0回退，未降低阈值；最终文档静态见review.integration。所有正常轮显式default+json，完整双流与原生文件在review的artifacts表内；不能只凭exit0认证无诊断。

- 全局隔离探针：旧gzip9绿加1个描述符断言红，改后9绿；这是测试隔离反证，不是产品行为修复。
- 告警反控：只将icons告警改成错误上下文，旧D02仍绿、新D02指定AssertionError；实际两个源码/测试在finally按SHA恢复。
- 首次dialog候选22绿1红，首次TC为TS2550/TS7006：Codex误用toSorted且错误推断jsdom异常等同global DOMException。改为复制后sort及当前宿主的实际异常name/message；无规则、target/lib或产品处理放宽。两失败完整原件保留，不冒称产品红例。

[原生身份与精确快照](identities.json)给全部旧/新身份；review列明5条退休→保留断言去向，D14单PNG全失败边界保留。精确退役47/net97→51/net102，只新增四条指定SHA数据及数量期望；旧授权数据/判据保持，规则不变。L23旧“icons正常”实为未mock失败，现显式两失败并核两份完整诊断；D02/D07/G4承接其余旧断言。

默认快检：`node docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/3h/blob-quality/verify.mjs`。只读、无网络、不执行SUT或coverage，核当前版本、附件完整性、原生结果、正文守恒和精确退休数据；哈希不证明设计优秀，语义取舍见逐文件A–H。任一caller/配置/输入域漂移只定位受影响claim，不重置无关结论。

保留review：rle-decode.ts的decodeRle只有两测试caller、RleFrame无适配层消费者，旧源关闭撤回；rle-decode.test.ts的真实出口理由/shared专测排重仍待，不能用6绿回填接口信用。下一窄片先核公共/内部归属，不在coverage冻结期间改接口。

保留：legal-host route57/loadAllScript18是复杂度阅读线索，按真实请求实时取值/新Response/body所有权保留；不为降指标缓存响应。dialog外层防御catch登记结构候选，未据普通reject被内层捕获就擅改异常设施抛错政策。snapshot六实际GOP样本仅证明gzip字节往返；同codec双解码与陈旧CDN说明留下一窄片，不接受该测试。原始资源未重提取，RLE算法/内存域真值仍由专卡处理。

前窗[GitHub Coverage](https://github.com/IllegalCreed/type-pal/actions/runs/39779473486)已成功，完整日志项目act/stderr为0；7条Action/Node平台提示另存原件，未称全平台零。新发布状态以Git与对应新CI为准。

上游导航：[3h](../README.md)、[前窗五文件收口](../assets-quality/README.md)、[父卡](../../../../tasks/QUALITY-PRE94-RETROSPECTIVE-1.md)。
