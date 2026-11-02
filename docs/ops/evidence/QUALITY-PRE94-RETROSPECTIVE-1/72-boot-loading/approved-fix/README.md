# CODE72 用户批准的启动失败进度修复

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是 CODE72 启动失败进度缺陷经用户明确批准后的窄修回执:批准原文'失败提示保持,同时停止本轮 fetch 计数和进度回调;正常启动、进入游戏和其它网络请求保持原行为'。Codex 单一 Owner,沿用 codex/code-quality-3y;高风险任务卡 [QUALITY-BOOT-FAILURE-PROGRESS-1.md](../../../../tasks/QUALITY-BOOT-FAILURE-PROGRESS-1.md) 的准入以 308f517e6 为原基点。只改三个生产文件与两份相邻测试,注释纠正另提交 cee6cee69;不涉及 schema/save、资产管线、公共接口、进入门、重试策略或请求取消。原件逐字节保全于下方保全块。

## 来源与输入

[read-boundaries.json](read-boundaries.json) 精确区分全文与 caller 局部(base=308f517e6,14 个条目:main.ts 84行/boot-loading.ts 159行/precache-ui.ts 189行及四份测试全文,bootstrap/loader/index.html/engineering-notes 为局部),不把 bootstrap/loader 局部核读算整文件。primary 为 main/index.html 和工程笔记的项目自有两段进度合同,SDLPal 无同形浏览器 UI。实现责任:main PROD catch 先释放计数/回调再 fail;precache-ui 以 failed 私有阶段拒绝迟到必要/SW 进度,进入后的 fail 仍保持原路径;boot-loading 只在全局槽仍属于自己时恢复 delegate、清空 callback,旧包装/迟到响应只返回原网络结果,不再污染当前计数;没有 AbortController、新 fallback 或新接口;头注释纠正 810 预估、单调99封顶和无 overlay 清理事实。

## 断言与业务 oracle

[before-fix.json](before-fix.json) 四条先行红例各独立选中一个真实业务合同,均恰一指定 AssertionError:necessary/full 阶段失败后迟到进度须保留错误文本与条宽(旧版实际显示'加载必要资源 100%'/'已缓存 10/20MB');释放计数时保留后来安装的 fetch 层及其请求透传;释放后在途请求照常完成、不计入随后新建启动轮次——其余用例被 -t 明确排除,不冒充整套通过。[contracts.json](contracts.json) 列合法 typed 输入、oracle、排重与 finally 清理(22 个 boot 测试,原 20 合同清单仍在上级目录)。原单红模块组合 [failure-repro.json](../failure-repro.json) 按原 spec 精确重放:[original-replay.json](original-replay.json) 为 1 绿/0 failed/pending,临时 spec 逐字校验后删除,无 bootstrap/UI 核心 mock 或生产副本污染。真实生产入口看图:[runtime.json](runtime.json) 与执行回执记录本机 Chrome 155 实际生产 bundle,只在网络 IO 控制 scene/0 返回 404、延迟真实 glyphs 200,不 mock bootstrap/UI/fetch——旧构建 atFailure'启动失败:assets: fetch /extracted/data/scene/0.json failed (404)'被迟到进度覆盖为'加载必要资源 11%'且 fetch 包装未释放,Node 严格相等断言捕获该业务反例;修复构建错误文字/条宽/错误类保持且 fetch 包装已释放,两张截图已实际查看。[runtime-positive.json](runtime-positive.json) 用真实资源和正常生产 onPlayable 按钮进入:覆盖层移除、bootstrap 记录 startup ready、playable 显示'已缓存 89/198MB',截图可见客栈场景和后台缓存 widget,console 无 error/warning/pageerror;skip-intro=1 只跳过视频/剧情,不授予正常 intro、全游戏 E2E 或离线协议验收。原 probe 的 SW-registration=true 只是硬编码标签,元数据已精确改为'生产 SW 注册代码未 mock',不保留未证的 ready/offline 信用;第一次旧版文字轮询错过短暂失败态而超时,保留 [runtime-initial.json](runtime-initial.json) 与 raw,不计业务反控。

## 结果

[test-gates.json](test-gates.json):6 文件58测试(boot22 及相邻 UI/bootstrap36)全部通过,0 failed/pending/stderr/unhandled/warning;game typecheck 通过,两者 diagnostics 全零。[static-gates.json](static-gates.json) 逐项记录最终 docs/lint/ledger/diff 真实输出与结果(lint 带 zeroDiagnosticReport=true);修复生产构建通过。本批 boot-loading.ts 新增已验证;boot-loading.test.ts 保留既有验证并补两项新时序;main.ts 和 precache-ui.ts 保持 review——本卡错误路径/正常短路径有实证,其余入口/analytics/按钮/无 DOM 和 widget 全生命周期的整文件当前验收尚未核销;precache-ui.test.ts 首次登记 review。机器账本 3312 tracked/289 closed/47 review/2976 pending;83卡仍 49 partial/34 pending/0 整卡 accept;高风险卡状态 review,功能窄修完成,统一集成未完成。

## 限制与复核

47–52 旧波次门 [README.md](../../53-wave-gates/README.md) 已撤回通过/收口信用,不能沿用;新全仓 check、官方 coverage ratchet、protected fast 均未运行,按用户要求留大任务收尾,不以旧输出或退出码0补签;旧构建临时输出路径提示不能冒充零诊断门。后续先处理同片 UI 测试既有合同/隔离,再继续 73 input 四文件及剩余 pre-94 卡。未重跑任何命令;历史结论保持原时点;候选待 Owner 非作者接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 4916B / SHA-256 356abb0dd6d47c1be59d718a72813a70dcb08a4c726c4c204beee2c84b2a83ca；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
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
```
<!-- incremental-original-source:end -->
