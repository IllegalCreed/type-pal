# C03 查看器生命周期与 oracle

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-31
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是 QUALITY-EDITOR-VIEWER-DIAGNOSTICS-1(C03 查看器宿主、回调与迟到读取)的证据目录页,任务卡见 [QUALITY-EDITOR-VIEWER-DIAGNOSTICS-1.md](../../tasks/QUALITY-EDITOR-VIEWER-DIAGNOSTICS-1.md)。范围四源:g03/g04两测试与upload-harness.tsx/upload-ui.ts的Viewer分段(及精确退役支持表);全部读取边界/SHA在read-boundaries.json;0关闭。

## 来源与输入

消融链原件:baseline.json(20例通过但51条act)→controlled-red.json(补G03-04受控更新不重读/不伪造callback反例后,旧宿主19绿1指定AssertionError)→lifecycle-original-20.json(首轮TypeError失败原件,不计通过)→lifecycle-original-20-corrected.json(改委托原方法后20例全绿、三模式0)→retirement-probe.json(G03-10仍在时20例零诊断的退役前提)。退役:retirement-reconciliation.json(G03 10→9)与retirement-probe-source.json(trace正负控)。反控:oracle-proof.json(受控帧mutant恰G03-04一红)与oracle-rebuild.json(清理后独立重构)。终态directed.json(19绿/0skip/三模式0);相邻adjacent.json(9文件69例0skip仍63act);支持门static-preflight.json/typecheck.json/coverage-tools.json。

## 断言与业务 oracle

文档事实核对(currentExecution=false):根因=宿主inline回调每次渲染变身份触发effect重载;修复=稳定useCallback+typed PaletteReadObserver委托实际AssetResolver.readRoleText及cache.load promise,只等待当前reader+asset(迟到A不阻塞B);revision更新在act内、错误路径由产品catch显示不吞console;finally卸载后恢复spy/全局。G03-10只返回测试宿主缺record占位、产品组件根本未调用(trace以G03-01实际调用作正控、G03-10零调用),仅删除这一条无业务执行用例;G03-09及其它未证重复保留。标题不再把单步叫循环、顺序等待叫快速竞态。受控帧mutant(忽略props.selectedFrame)下完整G03九例恰8绿1指定G03-04 AssertionError。相邻63act来自未在本片治理的Wizard/Uploader等路径,不能据此声称零诊断;coverage-tools66通过(初次临时登记脚本拼写错误在写支持表之前失败,修正后才登记,之前65例不是最终66例验收)。

## 结果

治理结果=证据保全完整、消融与反控链可独立复验;不产生新执行结果。官方baseline尚未改变(f0d008c3…);旧cae26b1c7窗口不能代表本候选,完整check/官方ratchet/protected fast留下一稳定窗口与C07等合跑,唯一精确单例退役走既有allow-scope-removal路径且不得扩展为范围豁免。账本3284/229closed/71review/2984pending,0新关闭;四源review,不合main。

## 限制与复核

未重跑任何命令;支持表全域历史快照/相邻排重仍待核,不将回归当作整个helper语义审核;产品、schema/save、接口、资产管线、生成物、规则、主工作树均未改。下一片Viewer Kimi与上传宿主仍待核。2026-10-16续C09 K02真实编辑工作流(目录页 [README.md](c09/README.md)):复用宿主后56→44act,再核真实解码/提交/revision与迟到读取后五例0诊断;两枚反控旧/新各4绿1指定业务红,恢复5绿,身份保留;相邻80通过但其它63act;0关闭,唯一3y未合main。历史结论保持原时点;候选待Owner非作者接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 3604B / SHA-256 ded2eb8004f782c9b896a2b8f17a1b6d09ab8a6ba5f76915a0c06d1a0b300d94；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# C03 查看器生命周期与 oracle

任务：[QUALITY-EDITOR-VIEWER-DIAGNOSTICS-1](../../tasks/QUALITY-EDITOR-VIEWER-DIAGNOSTICS-1.md)。四源与精确退役支持表，全部读取边界/SHA在 read-boundaries.json；0关闭。

原20例通过但输出51条act。先补G03-04真实父受控更新不重读/不伪造用户callback的反例，旧宿主19绿1指定AssertionError；回调每次变身份触发effect重载是根因。改稳定useCallback，真实cache/palette call-through等待；finally卸载后恢复spy/全局。原20例全部保留时已20绿、act/环境/native均0，不能把清诊断归功于删测试。

宿主通过typed PaletteReadObserver委托实际AssetResolver.readRoleText及cache.load promise，不主动另读或替换解码结果。首轮spy非configurable gate方法导致一条TypeError，原件lifecycle-original-20保留，不计通过；不改descriptor，改委托原方法后corrected20绿。只等待当前reader+asset，迟到A不会阻塞B；pending测试显式不等，放行后等待真实完成再断言。卸载测试确认真实read完成后无新proof；revision更新在act内，错误路径由产品catch显示，不吞console。

G03-10只返回测试宿主缺record占位，产品组件根本未调用。临时call-through trace以G03-01实际调用作正控，G03-10零调用，20绿0诊断，源码快照/receipt/原件保留。仅删除这一条无业务执行用例，最终19绿/0skip/三模式0。G03-09及其它未证重复保留。标题不再把单步叫循环、顺序等待叫快速竞态，去掉未经本轮证明的全域排重注释。

一枚实际业务反控：仅在四本地包隔离副本把Viewer受控selectedFrame改为内部值，完整G03九例恰8绿1指定G03-04 AssertionError（无timeout/TypeError），恢复完整19绿/0skip/三模式0。产品原树未改；副本按精确prefix/parent守卫删除，清理后独立split重建mutant及raw/runner/test/执行身份SHA全匹配，见oracle-proof/oracle-rebuild。

相邻9文件69例通过、0skip，仍输出63条act，来自未在本片治理的Wizard/Uploader等相邻路径，不能据此声称零诊断。Editor完整两段typecheck通过。精确退役支持表21文件/net50，coverage-tools66通过，matcher/拒绝规则字节不变；原10身份摘要与官方baseline一致，现9身份来自真实Vitest list，最终source SHA锁定。初次临时登记脚本拼写错误在写支持表之前失败，修正后才登记；之前65例不是最终66例验收。

当前官方baseline尚未改变：f0d008c301aa4e86b2d08d8ffc292ffdf006f26efc021e8dffb747dbd0d4e790。下一稳定窗口与C07等合跑check、官方ratchet及protected fast；这次只有精确单例退役需要现有allow-scope-removal路径，不能扩展为范围豁免，必须核原生scope与覆盖率。旧cae26b1c7窗口不能代表本候选。

账本3284/229closed/71review/2984pending，0新关闭。四源review，支持表全域历史快照/相邻排重仍待核，不将回归当作整个helper语义审核。产品、schema/save/接口/资产管线、生成物、规则、主工作树均未改；不合main。下一片Viewer Kimi与上传宿主仍待核；另按用户新增要求回溯94前卡片与风险。无下一位Agent提示词，Codex继续。

2026-10-16续[C09 K02真实编辑工作流](c09/README.md)：复用宿主后56→44act，再核真实解码/提交/revision与迟到读取后五例0诊断；两枚反控旧/新各4绿1指定业务红，恢复5绿，身份保留。相邻80通过但其它63act，editor typecheck通过；0关闭，唯一3y未合main。
```
<!-- incremental-original-source:end -->
