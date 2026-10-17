# CODE-QUALITY-3z Google Analytics当前复审

Status: recorded
Owner: Codex（单Agent，自身源码/测试核证，不冒充独立第三方）
Date: 2026-10-18
Base: `4b86b04b790eb6b83f93a10f4ac07102c608b39b`
Branch: `codex/code-quality-3y`

## 范围与真实读取

id: QUALITY-PRE94-RETROSPECTIVE-1 / 3z-google-analytics；schemaVersion:1；status:recorded。[父卡](../../../tasks/QUALITY-PRE94-RETROSPECTIVE-1.md)只准事实注释与测试治理。原实现139、主测169、H05 121行及真实install/consent/UI/main、四相邻测试与旧3z卡全文；当前四代码文件也已全文核读。[读取边界](read-boundaries.json)有实际SHA/行数/完整gzip；三份此前已读历史卡只按相同SHA复用，不假称本次重新全文阅读。未以旧done或包绿补签。

## Primary与caller

第一阶段项目可选统计扩展，SDLPal没有此功能。正式main隔离安装异常；installer先建UI、再startGA，真实window/storage/事件输入，未传subscribePage。GA启用且ID符合项目格式才读同意并建立订阅；granted先初始化、URL合法且pathname变化才发送，deny重置去重并置disable，stop退两订阅。script.onerror仅移除自身标签，重授再注入；不是SDK同步初始化错误的回滚。

Google官方[安装](https://developers.google.com/tag-platform/gtagjs)给出arguments队列及js/config；[API](https://developers.google.com/tag-platform/gtagjs/reference)支持send_page_view:false；[隐私设置](https://developers.google.com/tag-platform/security/guides/privacy)说明ga-disable-ID须在命令前设置。仅核这几个SDK命令轴，不为项目ID六至二十字符、四字段UTM/64字符、pathname去重背书；这些来自本地合同。旧disable链接跳到概览/UA退休页，未把重定向当技术证据。未下载/执行Google SDK、发送真实统计或声明隐私合规。

## 真缺陷停止线

[真实安装清理反例](initialization-probe.json)：原12绿，额外1个指定AssertionError；外部gtag合法函数端口在js命令抛错，install没有返回句柄，却残留真实consent订阅。恢复SDK后实际write deny/grant会排队一次page_view，未重发js/config。只证明再次明确授权后的无owner订阅，不声称未经同意采集或游戏启动失败。原生game jsdom Storage/EventTarget，实际install/consent/SUT，自有无浏览上下文Document、窄SDK异常端口；临时树和监听器终于清理、探针时三源字节不改。

已开[GAME-ANALYTICS-FAILED-INSTALL-OWNERSHIP-1](../../../tasks/GAME-ANALYTICS-FAILED-INSTALL-OWNERSHIP-1.md) draft，产品修复待用户选择失败撤销/刷新重试，或保留完整controller重试。未批准前执行冻结。源码仅纠正发送catch不能覆盖初始initialize/readPage的过强注释，[parsedTS/JS](emit-identity.json)相同。本批不把这个红反例算作绿门。

## 测试质量与复用

旧两套harness重复、清空全局head、删除SDK而不恢复，H05 fetch替身不能拦script加载，强转隐藏端口。新增test-only fixture统一自有无浏览上下文Document、SDK属性描述符保存/恢复、公开订阅输入与stop归属；不触全局head/body/fetch，正常stop总调用真实stop，断言前不由宿主代清订阅。没有新增强转、ignore或规则放宽。正式UI/installer相邻测试仍有各自旧宿主不足，未纳本片验收。

[隔离反证](ownership.json)把完整旧/新主测包在同一cohort内，加一个cohort外的真实所有者断言：旧8绿加1指定红，新9绿加外部断言全10绿。实际外部head节点与SDK同一引用/描述符得到恢复；不是只比helper源码。

[逐断言迁移](assertion-transfers.json)保留12原合同，主8→9、H05仍4；只新增真实stop后双端口不再回调，其他补强原case。修正“Google或URL错误”过度标题、“大写UTM丢弃”坏注和“ID边界”无边界事实；精确payload、实际deny、UTM白名单/6与20边界、重试初始化命令和Arguments均有独立oracle。没有整例退役、baseline或测试catalog状态变化。

[五枚反控](controls.json)每轮跑完整未过滤旧/新测试文件：自动pageview/漏page退订/重试重置初始化，各旧主8绿→新8绿1指定AssertionError；泄漏utm_term/拒收六字符，各旧H05 4绿→新3绿1指定AssertionError。完整native file/fullName、raw、命令/退出/信号/时间、源/测试/mutantSHA和finally恢复均保留；不是产品TDD。正常恢复13直接、12相邻（6文件25绿），game typecheck零诊断。

## 账本、门与未验域

原三个tracked路径未列live表，pending→review；新增fixture按fixture类别登记review，机器为3316 tracked /261 closed /89 review /2966 pending，实际以[门回执](gates.json)ledger为准。0新增关闭；只旧3z pending→partial，83卡53partial/30pending/0accept，scopeConfirmed/currentAcceptance仍false，其他82对象与旧SHA不改。原历史卡不改为当前accept。

本片仅定向/相邻、必要typecheck、文档/静态与ledger；全仓check、official coverage ratchet和protected fast按用户成本规则留大任务收尾，不声称统一门完成，不合main。raw完整未裁剪gzip保留；所有已知红counter与反控exit1单列，没有抹成exit0。

跨window/realm、多property共享script/gtag、异步真实SDK/CSP/网络与真实浏览器、UI完整卸载及失败策略继续review。未改游戏机制、GA/隐私政策、UI布局、schema/save、资源或公共接口。下一步回pre94 40/41或3u/3w未核切片；数值/毒列表/两UI与本卡产品停止线继续保留，94–102/editor后置。无下一位Agent提示词，Codex继续。

静态门过程：第一次check:docs工具125全绿，实际文档消费者因README先链接尚未落盘的gates.json失败1项；原exit1/raw保留。补上真实回执后只重放五个实际消费者，不重复未改的125，最终结果见gates，不把旧失败改写为通过。

最终静态结果：工具125通过，修复缺回执后的五消费者全部0问题；lint-zero为5350文件、0error/0warning/0info，ledger为3316/261/89/2966。fresh fetch后origin/main...HEAD为0behind/253ahead（本批提交前），未合main；这些局部门不恢复旧53波次的统一门信用。
