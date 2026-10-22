# CODE3h RLE 出口、运输 snapshot 与启动取消测试质量

同步注意：上述窗口门对应 d297e64d0。后继 main365e582e2 合入英文30提交；当前先保存候选，同步及新组合门未完成，不声称已合main。现行分支保护要求PR及两项远端检查，禁止直接推main。

同一 codex/code-quality-3y，基点 d297e64d0；Codex 单 Agent。逐文件八维、版本、合同迁移和当前门禁在 [review.json](review.json)，完整未裁剪 stdout/stderr、原生结果及探针保存在 [receipts.json.gz](receipts.json.gz) 的具名字节附件中。执行 HEAD 是未提交候选的基点，实际测试字节另钉指纹；不把 HEAD 当作候选源码。最终关闭与统计以父卡和 live 账本为准，历史原件不改写。

本片整改：game 私有应用的 RLE facade 去掉没有生产 caller 的 decodeRle/RleFrame 转出口，保留对话实际使用的 parseSpriteChunk/base64ToBytes；shared 公共 API 和算法不动。四个重复 codec 合同逐项映射到 shared 现有用例并补齐完整平面，game 主测 6→2；D11 保留现役 parse 接线。精确退役新增一条 6→2 快照，旧 51 条及判据不变，总 52/net106；没有全局排除或松绑。

六个 snapshot 保留独立 MKF offset 读取与运行时 gzip 解压后的完整字节比较、非空与 gzip 魔数断言。删除的是相等字节再经过同一 parser 的派生比较，不是独立像素 oracle；同时收窄“场景代表性”和服务器编码断言。六样本、原缺输入策略及 timeout 均保持；不证明全部地图、RLE 算法或浏览器 HTTP 配置。

取消边界与专测先结局假时钟退避再还原 fetch/时钟；四处只接成功的 promise 改为立即消费两种结局，Response 身份断言保留。故意在取消前触发断言失败：旧／新各 6 绿 1 指定 AssertionError，但旧留下 timer/监听器各 1，新为 0；这是测试清理反证，不冒充产品修复红例。C1 的真实取消／null 覆盖／首次校验反控按同源复用。

启动两套专测复用既有 soundfont 原异常、glyph 独立屏障和默认 IO 失败清理证据。FM 既有用例附加当前零字节占位返回检查（bootstrap.ts:480 在 FM 路径传 undefined，不据此声称新增生产 caller 或产品缺陷）：初版 toEqual(ArrayBuffer) 未识别长度 1 变异，旧新均 3 绿，原件保留；改为明确 byteLength 后 2 绿 1 指定业务 AssertionError。原生 JSON 的 resolves 包装栈写 Error，完整 default reporter 明确为 AssertionError，按实际失败身份对应，未为收集器改弱业务断言。

本轮原卡 3h 的六生产源以 review.originalCard3h 的逐项八维来源裁定，不能把包绿当逐文件验收。loader/tileset/fetch 复用当前指纹与已有具体质量依据，PNG/资源屏障补当前八维，RLE facade 以本片整改闭环。shared rle.test 整文件与格式／分配真值仍 review，3i、bootstrap 主流程、视觉及 94–102 不借本片接受。没有修改生成物、存档、产品机制或资源政策。

低成本复验：`node docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/3h/rle-boot-quality/verify.mjs`。默认只读，核附件、当前实现／caller／输入、原生结果与精确退役；MATCH 不自动证明语义质量，STALE 指向具体失效文件。不执行 SUT、联网或覆盖率；原件可按附件名解出复跑。

基点 [GitHub Coverage run39797201562](https://github.com/IllegalCreed/type-pal/actions/runs/39797201562) 已 success；完整日志项目 act/stderr 为 0，7 条 Action/Node 平台弃用提示单列，不称全平台零。三片冻结后才运行统一 check／单次 official／同报告 protected，实际次数和结果见 review.integration；无下一位 Agent 提示词，Codex 继续 pre94 剩余范围。

上游：[3h](../README.md)、[父卡](../../../../tasks/QUALITY-PRE94-RETROSPECTIVE-1.md)。
