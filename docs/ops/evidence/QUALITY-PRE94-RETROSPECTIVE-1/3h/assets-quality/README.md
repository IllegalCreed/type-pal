# CODE3h 资产装配与测试质量

当前获批增量：[UI原编号修复](ui-fix.json)，正式旧1绿2业务红→当前三合同绿、4文件28绿/模块27文件216绿及game TC0；C10/C11分离原先两类失败，六真实GOP样本实际执行且输入只读固定。quality.json是前一纯测试/注释提交的冻结记录，保留旧C10待迁移时点；不与当前修复混代。统一门留本模块冻结窗口，3h仍partial。

最新[typed夹具补核](fixture-refresh.json)：撤回此前对Enemy/ObjectPlayerView两表“合法”的过强概括，原PNG/RLE实际结果保留。必需字段补齐并采用真实类型，角色OBJECT1→36；A10从ID摘要增强到完整三字段，A06用既有legalRole去掉两次多余大工厂/非空断言，角色值逐字段守恒，A09只改标题。18个其它helper函数正文相同；167资产用例、最终assemble10及TC通过，新typed输入上相同正式UI测试仍旧1绿/2指定业务红。只补测试输入，helper完整可玩性/其它域不借此关闭。精确结构重算仅绑定7→9个当前源，指标不再降低、不另采一轮局部覆盖率。

集中窗口的[精确结构重算](recount.json)：54例单源局部V8与前窗官方本地LCOV对照，仅loader移除已覆盖语句2/分支2/函数1/行1，原三未覆盖诊断行逐句相同。先按用户既有合理清理授权新增固定c427整baseline与七路径SHA的数据项，再正式全仓采集，避免为这一移除重跑两轮全仓覆盖率；旧11项/函数AST保持，错源拒绝、未知baseline不套用。局部V8不冒充官方门。首全check卡在文档测试的私有Git stdin子进程，仅本轮进程树SIGTERM，原件不算通过；原命令完整重试，未改timeout/选择/规则或其它工作树。

唯一治理线codex/code-quality-3y，基点c4278084b。Codex单Agent；[逐文件A–H、版本、合同迁移、原件清单与CI](quality.json)为本片入口。loader四LRU合同保留，非法fixture/强转已移除，三个弱子集精简；恢复测试核完整预期告警，额外告警会失败。source两处仅注释，parsedTS/JS守恒。原件均完整gzip，首次C08预期文案错误与工具账本未落行失败也保留，不算产品红或通过。

3h仍partial，0新关闭。当前定向43→40，缓存返回clone故障旧17绿/新4业务红，丢HTTP错误上下文故障旧17绿/新指定1业务红；正常源已恢复，game TC0，coverage工具94绿。只核Error类型/name/message，不冒称同一异常对象身份。三个退役合同分别转G01-B07、G01-D01和保留的LRU/无限缓存结果；精确登记只新增一行，旧45行与判据保持。

发布[Coverage39742213502](https://github.com/IllegalCreed/type-pal/actions/runs/39742213502)完成success，HEAD=c427，20045tests/758sources；lint5823为0/0/0，测试stderr/act0。Actions运行时6条弃用与1条迁移annotation单列原文，不能称平台全部零告警。网络EOF不当测试失败；完整659219字节日志、run/jobs及下载元数据均在清单内。本轮没有重采全仓覆盖率。

[UI编号风险卡](../../../../tasks/GAME-UI-ASSET-FRAME-IDENTITY-1.md)：71张合法6×8 PNG经真实loadAll/PNG解码/drawNumber，帧19失败后数字1取帧21（像素expected20/received21）；正常1绿/反例1个业务红。用户已批保留原编号，产品修复另提交；旧G01-C10数组压紧断言不能保留为正确合同。浏览器与实际画面未跑。

快检：在治理树运行 `node docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/3h/assets-quality/verify.mjs`。默认只读，核原件字节、冻结Git对象、正文守恒、实际红绿与CI；不联网、不跑SUT/全仓/覆盖率。若相关caller/依赖/输入合同改变，重新判断适用性，哈希匹配不是质量自动证明。全仓/official/protected继续集中本模块冻结窗口，未跑不称通过；94–102不扩展。
