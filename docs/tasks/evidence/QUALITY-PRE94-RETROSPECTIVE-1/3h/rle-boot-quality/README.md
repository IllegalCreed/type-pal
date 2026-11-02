# CODE3h RLE 出口、运输 snapshot 与启动取消测试质量

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-31
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是「CODE3h RLE 出口、运输 snapshot 与启动取消测试质量」的治理候选页;证据原件即下方逐字节保全的固定main源(4261B)。本片事实:同一3y已同步英文产品main365e582e2及后继纯文档main94d03b584;Codex单Owner、基点d297e64d0;组合全check20,601例+691工具、七包typecheck、official20,172例/774源与同报告strict/protected均通过,项目stderr/act/环境诊断0、指标0回退;全任务仍63accept/20partial,账本3402/395closed/107review/2900pending,不宣称pre94完成。

## 来源与输入

来源为固定Git载体,非本次运行;原5链接处置见作者review的linkDisposition。当前存活入口:[review.json](review.json) [receipts.json.gz](receipts.json.gz) [README.md](../README.md) [QUALITY-PRE94-RETROSPECTIVE-1.md](../../../../cards/QUALITY-PRE94-RETROSPECTIVE-1.md)。逐文件八维、版本、合同迁移与当前门禁在review.json(11文件裁决/退役6→2/探针/身份);完整未裁剪stdout/stderr、原生结果与探针在receipts.json.gz的169个具名字节附件。执行HEAD是未提交候选基点,实际测试字节另钉指纹,不把HEAD当候选源码。

## 断言与业务 oracle

本片整改与判别力事实:(1)game私有RLE facade去掉无生产caller的decodeRle/RleFrame转出口,保留对话实际使用的parseSpriteChunk/base64ToBytes;shared公共API与算法不动;四个重复codec合同映射到shared现有用例并补齐完整平面,game主测6→2,精确退役新增一条6→2(旧51条及判据不变,总52/net106),无全局排除或松绑。(2)六个snapshot保留独立MKF offset读取与运行时gzip解压后完整字节比较、非空与gzip魔数断言;删除的是相等字节再过同一parser的派生比较,非独立像素oracle;不证明全部地图、RLE算法或浏览器HTTP配置。(3)取消边界专测先结局假时钟退避再还原fetch/时钟;故意取消前断言失败:旧/新各6绿1指定AssertionError,但旧留timer/监听器各1、新为0——测试清理反证,不冒充产品修复红例。(4)FM既有用例附加零字节占位检查:初版toEqual(ArrayBuffer)未识别长度1变异(旧新均3绿,原件保留);改明确byteLength后2绿1指定AssertionError;bootstrap.ts:480在FM路径传undefined,不据此声称新增生产caller或产品缺陷。空数组/exit0/成功字样不外推为零诊断或产品通过。

## 结果

原卡3h六生产源以review.originalCard3h逐项八维裁定,不把包绿当逐文件验收;loader/tileset/fetch复用当前指纹,PNG/资源屏障补当前八维,RLE facade以本片整改闭环;shared rle.test整文件与格式/分配真值仍review,3i、bootstrap主流程、视觉及94-102不借本片接受。低成本复验:node verify.mjs默认只读,MATCH不自动证明语义质量,STALE指向具体失效文件。基点GitHub Coverage run39797201562已success;完整日志项目act/stderr为0,7条Action/Node平台弃用提示单列,不称全平台零;main推进30笔代码后重新采集一次(合计两次本地official),纯文档后继不重采。

## 限制与复核

未重跑任何命令/测试/浏览器;未修改生成物、存档、产品机制或资源政策;历史原件不改写。候选待Owner非作者接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 4261B / SHA-256 2af046f0a7c75cf63eb043e0128b5eba41c6b4c6aea282b9485de9b1c786de2a；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE3h RLE 出口、运输 snapshot 与启动取消测试质量

当前：同一3y已同步英文产品main365e582e2及后继纯文档main94d03b584。组合全check20,601例+691工具、七包typecheck、official20,172例/774源与同报告strict/protected均通过，项目stderr/act/环境诊断0、指标0回退；末轮文档静态与远端PR检查按实际回执登记。全任务仍63accept/20partial，账本3402/395closed/107review/2900pending，不宣称pre94完成。

同一 codex/code-quality-3y，基点 d297e64d0；Codex 单 Agent。逐文件八维、版本、合同迁移和当前门禁在 [review.json](review.json)，完整未裁剪 stdout/stderr、原生结果及探针保存在 [receipts.json.gz](receipts.json.gz) 的具名字节附件中。执行 HEAD 是未提交候选的基点，实际测试字节另钉指纹；不把 HEAD 当作候选源码。最终关闭与统计以父卡和 live 账本为准，历史原件不改写。

本片整改：game 私有应用的 RLE facade 去掉没有生产 caller 的 decodeRle/RleFrame 转出口，保留对话实际使用的 parseSpriteChunk/base64ToBytes；shared 公共 API 和算法不动。四个重复 codec 合同逐项映射到 shared 现有用例并补齐完整平面，game 主测 6→2；D11 保留现役 parse 接线。精确退役新增一条 6→2 快照，旧 51 条及判据不变，总 52/net106；没有全局排除或松绑。

六个 snapshot 保留独立 MKF offset 读取与运行时 gzip 解压后的完整字节比较、非空与 gzip 魔数断言。删除的是相等字节再经过同一 parser 的派生比较，不是独立像素 oracle；同时收窄“场景代表性”和服务器编码断言。六样本、原缺输入策略及 timeout 均保持；不证明全部地图、RLE 算法或浏览器 HTTP 配置。

取消边界与专测先结局假时钟退避再还原 fetch/时钟；四处只接成功的 promise 改为立即消费两种结局，Response 身份断言保留。故意在取消前触发断言失败：旧／新各 6 绿 1 指定 AssertionError，但旧留下 timer/监听器各 1，新为 0；这是测试清理反证，不冒充产品修复红例。C1 的真实取消／null 覆盖／首次校验反控按同源复用。

启动两套专测复用既有 soundfont 原异常、glyph 独立屏障和默认 IO 失败清理证据。FM 既有用例附加当前零字节占位返回检查（bootstrap.ts:480 在 FM 路径传 undefined，不据此声称新增生产 caller 或产品缺陷）：初版 toEqual(ArrayBuffer) 未识别长度 1 变异，旧新均 3 绿，原件保留；改为明确 byteLength 后 2 绿 1 指定业务 AssertionError。原生 JSON 的 resolves 包装栈写 Error，完整 default reporter 明确为 AssertionError，按实际失败身份对应，未为收集器改弱业务断言。

本轮原卡 3h 的六生产源以 review.originalCard3h 的逐项八维来源裁定，不能把包绿当逐文件验收。loader/tileset/fetch 复用当前指纹与已有具体质量依据，PNG/资源屏障补当前八维，RLE facade 以本片整改闭环。shared rle.test 整文件与格式／分配真值仍 review，3i、bootstrap 主流程、视觉及 94–102 不借本片接受。没有修改生成物、存档、产品机制或资源政策。

低成本复验：`node docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/3h/rle-boot-quality/verify.mjs`。默认只读，核附件、当前实现／caller／输入、原生结果与精确退役；MATCH 不自动证明语义质量，STALE 指向具体失效文件。不执行 SUT、联网或覆盖率；原件可按附件名解出复跑。

基点 [GitHub Coverage run39797201562](https://github.com/IllegalCreed/type-pal/actions/runs/39797201562) 已 success；完整日志项目 act/stderr 为 0，7 条 Action/Node 平台弃用提示单列，不称全平台零。每个稳定主线窗口冻结后集中 check／单次 official／同报告 protected；main推进30笔代码后重新采集一次，合计两次本地official，纯文档后继不重采。当前与先前窗口分别见 review.integration 与 priorIntegrationWindow；无下一位 Agent 提示词，Codex 继续 pre94 剩余范围。

上游：[3h](../README.md)、[父卡](../../../../tasks/QUALITY-PRE94-RETROSPECTIVE-1.md)。
```
<!-- incremental-original-source:end -->
