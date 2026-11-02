# 测试宿主原生导航证据

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: governance-index-v1 / 1.0.0

## 目的

承载[测试宿主原生导航任务](../../cards/QUALITY-HOST-NAVIGATION-DIAGNOSTICS-1.md)的证据导航:仅两份测试源码(editor navigation.glm-leaf-wave.test.tsx 268到301行、reforge main.host-lifecycle-1.test.ts 354到365行),先独立基线再按真实caller/端口修正;当前build,0关闭。时点结论按原文保留,本页不重开任务。

## 范围

两条基线各1条native navigation诊断([editor-baseline](editor-baseline.json) 6例navigation=1、[host-baseline](host-baseline.json) 8例navigation=1),修后[editor-current](editor-current.json) 6/6与[host-current](host-current.json) 8/8,act/环境/native三类计数均0。editor测试router按真实App caller接管默认导航并断言真实nativeEvent.defaultPrevented;键盘辅助走真实React事件,无强转伪造;act全局在root卸载后恢复,不改DsMenuBar产品。[read-boundaries.json](read-boundaries.json)登记两测试全文SHA/行数(status=review, no closure)、App.tsx2194-2225与main.ts2232-2250仅区间读。[jsdom-primary.json](jsdom-primary.json)全文核jsdom29.1.1两vendor文件(Location-impl.js reload() L223;navigation.js navigateFetch L77报notImplemented navigation to another Document),证明jsdom reload静默no-op是宿主真值,测试须走窄原生reload IO端口观测。

## 当前状态

historical(治理候选);原时点状态与日期在保全块。无档战败保留当前URL、真实metadata读取后调用窄原生reload端口:恰一次调用、URL未改、script收口、世界未误换。[oracle-proof.json](oracle-proof.json)在隔离workspace以recipe(main.ts中location.reload()注释行为mutant)三向判决:旧测试对mutant仍8绿(旧盲区)、新测试7绿恰1指定AssertionError(战败无档重开 expected false to be true)、恢复原生产8绿;4本地包副本、noWorkingTreeProductMutation=true、清理精确核验。[oracle-rebuild.json](oracle-rebuild.json)清理后独立重建同三判决。[checkpoint-proof.json](checkpoint-proof.json):两包typecheck通过、两测试身份6/6与8/8未变;不宣称console清零——host-baseline/current仍各8条AudioContext不可用,host-adjacent 19条同类+script/save故障日志各1。

## 入口与责任

当前存活入口:[QUALITY-HOST-NAVIGATION-DIAGNOSTICS-1.md](../../cards/QUALITY-HOST-NAVIGATION-DIAGNOSTICS-1.md) [window-review.md](../QUALITY-EDITOR-FORM-FIXTURES-1/window-review.md)。 相邻[editor-adjacent](editor-adjacent.json) 4文件34例、[host-adjacent](host-adjacent.json) 3文件19例通过且三类计数0;现存14个测试名称与数量未变,无退役、不改规则/配置/产品。[checkpoint-gates.json](checkpoint-gates.json):check:docs/lint/ledger三项exit0,newFileClosures=0、fullModuleWindowPending=true、otherRuntimeOutputStillPresent=true。

## 证据与下一步

固定main源SHA d8210b613a7c;下一步=Owner非作者接收。全仓其它act/环境诊断待续,统一门未过、不合main;完整门与Kimi检查点在稳定诊断窗口集中,已实测的联合计数见window-review链接,本片留review、0关闭。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 1787B / SHA-256 d8210b613a7c2c0fe437848d9b32d74e5e8e3606f2ac6218ae8ece889c8a5117；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# 测试宿主原生导航证据

任务：[QUALITY-HOST-NAVIGATION-DIAGNOSTICS-1](../../tasks/QUALITY-HOST-NAVIGATION-DIAGNOSTICS-1.md)。
仅两份测试源码；先独立基线，再按真实caller/端口修正。当前build，0关闭。

两份基线各1条native navigation，修后分别6/6与8/8，act/环境/native三类计数均0。editor测试router按真实App caller接管默认导航并断言真实nativeEvent.defaultPrevented；键盘辅助走真实React事件，无强转伪造。act全局在root卸载后恢复；不改DsMenuBar产品。

无档战败保留当前URL，真实metadata读取后调用窄原生reload IO端口；明确断言恰一次调用、URL未改、script收口及世界未误换，不再把“jsdom静默no-op”或覆盖行当证明。移除产品reload的隔离mutant下旧八例仍绿，现八例恰目标一条AssertionError；恢复八绿，均完整0skip。临时四包副本清理后独立构造mutant并核完整raw/runner SHA，见oracle-rebuild.json。

相邻editor4文件34例、reforge3文件19例通过，act/环境/native三类均0；两包typecheck通过。现存14个测试名称与数量均未变，无退役、不改规则/配置/产品或生成物。

不宣称全部console清零：host-current仍8条AudioContext不可用；相邻host含19条同类及各1条script/save故障日志，原件完整保留，见checkpoint-proof.json。它们须另核端口与故障oracle，不能以“已有告警”豁免。全仓其它act/环境仍待续，统一门未过，不合main。完整门与Kimi检查点在下一稳定诊断窗口集中运行。

稳定窗口已实测，严格统一诊断门仍未通过；见[联合原始计数与边界](../QUALITY-EDITOR-FORM-FIXTURES-1/window-review.md)。本片留review，0关闭、不合main。
```
<!-- incremental-original-source:end -->
