# 测试宿主原生导航证据

任务：[QUALITY-HOST-NAVIGATION-DIAGNOSTICS-1](../../tasks/QUALITY-HOST-NAVIGATION-DIAGNOSTICS-1.md)。
仅两份测试源码；先独立基线，再按真实caller/端口修正。当前build，0关闭。

两份基线各1条native navigation，修后分别6/6与8/8，act/环境/native三类计数均0。editor测试router按真实App caller接管默认导航并断言真实nativeEvent.defaultPrevented；键盘辅助走真实React事件，无强转伪造。act全局在root卸载后恢复；不改DsMenuBar产品。

无档战败保留当前URL，真实metadata读取后调用窄原生reload IO端口；明确断言恰一次调用、URL未改、script收口及世界未误换，不再把“jsdom静默no-op”或覆盖行当证明。移除产品reload的隔离mutant下旧八例仍绿，现八例恰目标一条AssertionError；恢复八绿，均完整0skip。临时四包副本清理后独立构造mutant并核完整raw/runner SHA，见oracle-rebuild.json。

相邻editor4文件34例、reforge3文件19例通过，act/环境/native三类均0；两包typecheck通过。现存14个测试名称与数量均未变，无退役、不改规则/配置/产品或生成物。

不宣称全部console清零：host-current仍8条AudioContext不可用；相邻host含19条同类及各1条script/save故障日志，原件完整保留，见checkpoint-proof.json。它们须另核端口与故障oracle，不能以“已有告警”豁免。全仓其它act/环境仍待续，统一门未过，不合main。完整门与Kimi检查点在下一稳定诊断窗口集中运行。
