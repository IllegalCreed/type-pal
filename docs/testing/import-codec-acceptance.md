# TB-03 导入/编码合同补测：独立接收与集成

2026-09-20，Codex。源e4461a308b9220e90ffa60df3bc3b2ad7f5ed1a0，集成91623a9a，比较main cda702d5。
任务：[TEST-EDITOR-IMPORT-CODEC-1](../ops/tasks/TEST-EDITOR-IMPORT-CODEC-1-workers-metadata.md)；
设计r2保持，r5为实现返工编号，不重签设计。

当前：**Codex accept，统一代码/基线候选4894719e；review待Kimi独立终审和GLM实现者确认，不标done**。
GLM是测试贡献者，不能作为自己的独立第三方证明；后续Kimi独立终审。其他八批done与模拟器build保持不动。

## 残项核验

- blobProducts来自每次实际toBlob bytes.slice快照；返回main/preview分别与第一/第二次实际产物比较完整字节。
- firstByteDiff扫描所有共享字节并核长度，返回首个差异下标或-1；不是抽样/只比头部。
  本席抽取实际函数，26组空/全等/首中尾差异/双向长短/非零offset视图检查均通过。
  避免输出256k数组的巨型失败diff不降低断言语义；本席不重跑此前约522秒的旧日志渲染。
- 实际返回effectPreviewBytes的SHA与独立preview常量相等且与main不同；不再错误地比较main hash≠preview常量。
- 自建独立PNG解码oracle保留：正控源图/主图/预览均320×200，CRC/IDAT/扫描线/实际交付像素匹配，
  main SHA f614fb…27f7、preview SHA ee694d…8529；index182/[182,182,182,255]/[34,5,73,255]勘误已落实。
- 只替换返回值、仍执行第二次真实编码的单点坏实现，现在由**候选自己**产生AssertionError，独立oracle也红；
  控制6/6绿（候选5+oracle1）。旧删尺寸见证控制7/7绿、候选业务红保持。
- 第9针returned-preview-replaced-by-main已常驻原mutants工具；精确唯一目标/首行业务红判据未放松。
- 机账并集按各自真源复核：GLM历史rework/rework2保持9eecaaf3，main的rework3/codexR4Review保持cda702d5，新增rework4。
  历史回执中已撤回的超时归因仍只是历史，不当作当前门禁豁免。

## 定向与范围

7文件39/39；原工具3正控+9针/判据自测全通过；editor typecheck exit0；11文件完整白名单Biome exit0。
候选前后HEAD与工作树未变，两个独立见证均核产品/fixture/测试三文件SHA不变。
新增七测试与一fixture、mutants/config/机账/本人回执；既有产品/旧测试/官方门禁配置零改。
限定路径集成，代码与源候选逐字一致，不整树覆盖主线；另外八卡归档与模拟器build不回退。
旧版本兼容审查pass，无新增旧模型/升级/兼容分支。

接手根目录为干净detached cda702d5，与main同SHA；pull被拒后核定安全切回已有main，无文件覆盖。
首次“机账并集”诊断误将main不存在的GLM历史字段当成应相等；按实际来源树订正后通过，是诊断口径错误、非候选失败。

## 统一门禁与后续归属

已严格串行完成：完整pnpm check退出0（七包7748项，editor262文件/2596项，另有docs/coverage工具测试）；
官方ratchet退出0；TYPE_PAL_COVERAGE_BASE_REF=cda702d5的**单次**coverage:fast退出0（7259项，提升0，与新基线完全一致）。
完整check保留原并行配置（editor maxWorkers=2与migrate并行），audit-performance未豁免/未排除；全仓Biome零error、52既有warnings/11infos。
fast只新增editor7文件/39项：243文件/2437测试；617生产文件清单/include/exclude/scopeDigest/指标分母、全部旧测试identity/计数不变，其他六包整个基线对象不变。
editor行22522/27865（80.83%）、语句25058/31878（78.61%）、函数6206/8110（76.52%）、分支19434/27593（70.43%）；
净增157行/190语句/32函数/112臂。全仓行72.03%、语句69.97%、函数71.60%、分支63.56%，完整分数见机账与[覆盖率记录](coverage.md)。
未跑coverage:full/浏览器E2E，最终90%/85%目标未达到；只由官方ratchet生成基线，没有手改数值。
代码/基线候选4894719e；后续只落审查文档，不混入生产/测试变化。
编码失败close缺陷仍按原隔离归Codex修复，不因补测通过关闭；浏览器/真实worker差异、视频文件与视觉不在本卡范围。
没有改变覆盖统计范围/排除/阈值；不混入其他八批或模拟器实现。

[机器账](import-codec-acceptance-evidence.json)；定向/原负控/tc/Biome日志目录 /tmp/codex-tb03-r5.Bxspbm/。
预览见证 codex-preview-return-bF3Jcf、尺寸见证 codex-png-host-Uku7PV，完整路径见机账；
[预览返回值工具](import-codec-preview-review.mjs)及[尺寸工具](import-codec-png-host-review.mjs)保持原样。
本席accept、无剩余counter；两席并行提示词如下。GLM只确认实现者自验，不是独立审查，不再重复返工，不代签、不标done。

## 下一位Agent提示词（可并行，同一候选）

### Kimi

~~~text
在 /Users/zhangxu/illegal/type-pal 独立终审 TEST-EDITOR-IMPORT-CODEC-1（TB03），卡 docs/ops/tasks/TEST-EDITOR-IMPORT-CODEC-1-workers-metadata.md，review，统一候选4894719e对比cda702d5，源e4461a30，设计r2不重签。
先同步并核工作树，读AGENTS/CLAUDE/READ-FIRST、本卡、docs/testing/import-codec-acceptance.md及机账/GLM工作包。独立读实际代码与输入，不读取或复述GLM审查结论；GLM是测试贡献者，不算独立第三方。
七新测试39项已逐字集成；39/3正控+9负控/tc/11文件Biome、尺寸与preview两见证全部通过。真实两次toBlob快照→返回main/preview完整字节→实际preview独立SHA已经闭合；firstByteDiff完整扫描含长度，不是抽样。此前误交主图为preview的单点坏实现现被候选自身AssertionError检出。像素182勘误已落，已关闭项不重开。
完整check7748、官方ratchet与受保护单次strict-fast7259通过；七包生产清单/分母/全部旧测试identity不变，其它六包基线对象不变，只增editor7文件39项。按需复跑定向及两个现有见证/3+9，不重跑或改官方基线。
在本人done前席位签accept或file:line counter，写直接证据及交接日志，提交推送。只改本人席位/日志，不代签、不改状态、不标done。另八批done、模拟器build不动；编码失败close缺陷保持隔离，非本卡修复。提交前同步保留他席，push竞态自行处理。
~~~

### GLM

~~~text
在 /Users/zhangxu/illegal/type-pal 对 TEST-EDITOR-IMPORT-CODEC-1（TB03）做集成后实现者自验确认，卡 docs/ops/tasks/TEST-EDITOR-IMPORT-CODEC-1-workers-metadata.md，review，统一候选4894719e对比cda702d5，源e4461a30；设计不重签，不再返工。
先同步核工作树并读AGENTS/CLAUDE/READ-FIRST、本卡、docs/testing/import-codec-acceptance.md及机账。独立核本人7新测试+fixture/工具在主线未改语义；可复跑本批39项，不重跑或改官方coverage基线。Codex已完成39/3+9/tc/Biome/两见证及check7748、ratchet、单次strict-fast7259。
仅在本人done前席位签“实现者自验accept（本人为测试贡献者，非独立第三方）”或明确counter，写本人日志并提交推送；不读或复述Kimi结论，不代签、不改状态、不标done。保留八批归档及模拟器build，编码失败close仍另归Codex；落盘前同步保留另一席修改，push竞态自行处理。
~~~
