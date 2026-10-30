# CODE72 用户批准的启动失败进度修复

用户明确批准“失败提示保持，同时停止本轮 fetch 计数和进度回调；正常启动、进入游戏和其它网络请求保持原行为”。Codex单一Owner，沿用codex/code-quality-3y；[任务卡](../../../../tasks/QUALITY-BOOT-FAILURE-PROGRESS-1.md)的准入以308f517e6为原基点。只改三个生产文件与两份相邻测试，注释纠正另提交cee6cee69；不涉及schema/save、资产管线、公共接口、进入门、重试策略或请求取消。

## 实际读取与实现责任

[读取边界](read-boundaries.json)精确区分全文与caller局部；不把bootstrap/loader局部核读算整文件。primary为main/index.html和工程笔记的项目自有两段进度合同，SDLPal无同形浏览器UI。

main PROD catch先释放计数/回调再fail；precache-ui以failed私有阶段拒绝迟到必要/SW进度，进入后的fail仍保持原路径；boot-loading只在全局槽仍属于自己时恢复delegate，清空callback，旧包装/迟到响应只返回原网络结果，不再污染当前计数。没有AbortController、新fallback或新接口。头注释纠正810预估、单调99封顶和无overlay清理事实。

## 先红后绿与判别力

[四条先行红例](before-fix.json)各独立选中一个真实业务合同，均恰一指定AssertionError；其余用例被-t明确排除，不冒充整套通过。[合同表](contracts.json)列合法typed输入、oracle、排重和finally清理。必要/full错误终态、后来fetch Owner、旧请求跨轮计数是四个不同责任；旧测试只核即时fail/普通restore，没有这些时序。完整native/raw gzip与两测试快照可回读。

原[单红模块组合](../failure-repro.json)也按原spec精确重放：[original-replay](original-replay.json)为1绿、0failed/pending，临时spec逐字校验后删除；没有bootstrap/UI核心mock或生产副本污染。

## 真实生产入口与看图

[runtime](runtime.json)、执行回执/spec/raw gzip记录本机Chrome实际生产bundle；只在网络IO控制scene/0返回404、延迟真实glyphs200，不mock bootstrap/UI/fetch。旧构建从“启动失败:assets: fetch … failed (404)”被覆盖为“加载必要资源11%”，fetch包装未释放；修复构建错误文字/条宽/错误类保持且fetch包装已释放。Node严格相等断言捕获旧版业务反例，新版通过。两个截图已实际查看。

[runtime-positive](runtime-positive.json)用真实资源和正常生产onPlayable按钮进入；覆盖层移除，bootstrap记录startup ready，截图可见客栈场景和后台缓存widget。skip-intro=1只跳过视频/剧情，不授予正常intro、全游戏E2E或离线协议验收。该正控console无error/warning/pageerror。失败注入的404/bootstrap错误日志是预期输入，不声明失败场景console为零。

原probe的SW-registration=true只是硬编码标签，没有断言注册状态；runtime元数据已精确改为“生产SW注册代码未mock”，不保留未证的ready/offline信用，实际DOM/fetch观测未改。首次使用缺失的bundled浏览器后切至已安装Chrome；第一次旧版文字轮询错过短暂失败态而超时，保留[runtime-initial](runtime-initial.json)与raw，不计业务反控。改用MutationObserver保存同步失败快照后获得上述正式对照。截图放本树ignored build/dev-screenshots，不提交游戏资源图像。

## 质量门、逐文件与剩余

[test-gates](test-gates.json)：6文件58测试（boot22及相邻UI/bootstrap36）全部通过，0failed/pending/stderr/unhandled/warning；game typecheck通过。修复生产构建通过；旧构建临时输出路径提示不能冒充零诊断门。[static-gates](static-gates.json)逐项记录最终docs/lint/ledger/diff真实输出与结果。

本批boot-loading.ts新增已验证；boot-loading.test.ts保留既有验证并补两项新时序。main.ts和precache-ui.ts保持review：本卡错误路径/正常短路径有实证，其余入口/analytics/按钮/无DOM和widget全生命周期的整文件当前验收尚未核销。precache-ui.test.ts首次登记review，现有复合用例/真实timer清理与host排重继续待治理；不以本批58绿关闭它或host文件。

机器账本已重新运行确认：3312 tracked /289closed/47review/2976pending；83卡仍49partial/34pending/0整卡accept。本高风险卡状态review，功能窄修完成，统一集成未完成。47–52旧[波次门](../../53-wave-gates/README.md)已撤回通过/收口信用，不能沿用。新全仓check、官方coverage ratchet、protected fast均未运行，按用户要求留大任务收尾；不以旧输出或退出码0补签。

后续先处理同片UI测试既有合同/隔离，再继续73 input四文件及剩余pre-94卡；94–102/editor保持后续优先级，main和其它Owner不写。没有宣布专项完成或合并。
