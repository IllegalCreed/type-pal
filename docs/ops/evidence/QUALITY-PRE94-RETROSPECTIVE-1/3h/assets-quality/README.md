# CODE3h 资产装配与测试质量

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是CODE3h资产装配与测试质量窗口的索引页，原件为下方逐字节保全的固定main源（2919B，SHA f21b6d0b3791）。窗口最终态见当前[模块收口](module-closeout.json)：接受loader.ts、loader.test.ts、load-all-recover.grok-r1.test.ts、load-all-ui-frame-identity.test.ts、load-all-assemble.grok-r1.test.ts五文件；legal-host完整生命周期、3h其余blob/RLE与shared G1继续review/partial；固定83卡62accept/21partial、账本3374/382closed/110review/2882pending，不称pre94完成。

## 来源与输入

集成口径：同步main6a29新脚本实现后完整check 20521测试+686工具、七包TC，官方ratchet 20095测试/760生产源，strict/protected同报告比较完成；硬静态与测试stderr/act/环境/Node诊断0；两个进程原生worker1+editor显式maxWorkers2合计上限3，不改超时/选择/配置。原始失败不改口径：旧CLI少减例flag退出1、第一次私有续跑适配器语法错误未执行、首集成check缺新manifest、首次提取缺Musics、自有docs测试git hash-object阻塞零CPU终止重试，均保留原件；两完整提取各一条原盘空MAP0告警单列，不能称输入准备全部零诊断；主树未写。

## 断言与业务 oracle

窗口分层证据：[最初质量/退役/故障反控与c427 CI原件](quality.json)——四LRU与HTTP合同排重、clone-return旧17绿新4业务红、warning-context旧17绿新C01单红、loader.test 7→4退役行、历史时点43→40；[获批UI原编号修复](ui-fix.json)——正式旧1绿2业务红（21≠20、缺frame1不抛错）→修复后28/216绿，真实PNG→drawNumber/drawBox、六实际GOP样本与8输入SHA，不宣称浏览器视觉；[合法typed夹具补核](fixture-refresh.json)——Enemy/ObjectPlayerView缺字段补齐、player OBJECT 1→36、撤回'完整可玩宿主'过强概括、18其它函数正文保持、相同UI反例仍1绿2业务红；[最初结构重算](recount.json)与[同步main限定重绑](main-sync.json)——loader已覆盖计数-2/-2/-1/-1同减、三未覆盖诊断行保留、两份完整baseline分别锁定不扩宽容差。

## 结果

五文件接受、CODE3h仍partial、0继承信用；快检verify.mjs默认只读核冻结Git对象/当前源指纹/gzip原件/原生红绿与统一门计数，哈希只证身份、八维语义见逐文件记录；版本不符应定位失效claim不全部重做。下一范围tileset-blob.ts、tileset-blob.test.ts、tileset-gzip.grok-r1.test.ts的B/C/D/F/G/H与oracle缺口；覆盖率留下一完整模块窗口，94–102不扩展。

## 限制与复核

未重跑任何命令；本页各段计数保留各自时点（43→40为历史切片计数、216为模块绿、20521/20095为集成门）；反控红身份与MAP0告警属原时点事实。候选待Owner非作者接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 2919B / SHA-256 f21b6d0b379154199129a0ecab26e703df5464737430080dc71b684256412226；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE3h 资产装配与测试质量

当前[模块收口](module-closeout.json)：接受loader.ts、loader.test.ts、load-all-recover.grok-r1.test.ts、load-all-ui-frame-identity.test.ts、load-all-assemble.grok-r1.test.ts五文件。逐文件A–H引用下列冻结包的适用结论；legal-host完整生命周期、3h其余blob/RLE和shared G1继续review/partial。固定83仍62accept/21partial，账本3374/382closed/110review/2882pending，不称pre94完成。

同步main6a29的新脚本实现后，完整check 20521测试+686工具、七包TC，官方ratchet 20095测试/760生产源，strict/protected同一报告比较均完成；硬静态error/warning/info和测试stderr/act/环境/Node诊断0。两个进程设原生worker环境1，editor官方fast选项自带显式maxWorkers2保留，合计上限3；不改超时/选择/配置。重门只在冻结模块收尾，新main实际实现/输入变化才触发本次集成重验。

原始失败不改口径：旧CLI少减例flag退出1，第一次私有续跑适配器语法错误未执行，修正后原尾段/写入/保护流程复用报告exit0；最新集成ratchet为完整原CLI显式减例确认exit0。首集成check缺新manifest、尚未完成的采集主动停止、首次提取缺Musics均保留原件。治理树自有输出最终用当前默认提取器生成，faithful成功轮另记；主树未写。两完整提取各一条原盘空MAP0告警单列，不能称输入准备全部零诊断。原八项本轮资产SHA未变。

- [最初质量/退役/故障反控与c427 CI原件](quality.json)：四LRU与HTTP合同排重、完整诊断、实际控制；历史时点43→40，不冒充当前数量。
- [获批UI原编号修复](ui-fix.json)：正式旧1绿2业务红→绿，真实PNG→drawNumber/drawBox，六实际GOP样本与8输入SHA；不宣称浏览器视觉。
- [合法typed夹具补核](fixture-refresh.json)：Enemy/ObjectPlayerView缺字段与角色1→36，撤回“完整可玩宿主”过强概括，18其它函数正文保持；相同正式UI反例仍1绿2业务红。
- [最初结构重算](recount.json)与[同步main限定重绑](main-sync.json)：loader已覆盖语句2/分支2/函数1/行1移除，三未覆盖诊断行保留；两份完整baseline分别锁定，不扩宽容差，旧规则/判据保持。

快检：`node docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/3h/assets-quality/verify.mjs`。默认只读、无网络/无SUT/无覆盖率；核冻结Git对象、当前源/caller指纹、完整gzip原件、实际原生红绿与统一门计数。哈希只证明身份，八维语义和取舍见对应逐文件记录；版本不符应定位失效claim，不全部从头重做。

下一范围：tileset-blob.ts、tileset-blob.test.ts、tileset-gzip.grok-r1.test.ts的B/C/D/F/G/H与已有oracle缺口，先复用有效证据，必要整改按卡分离；覆盖率留下一完整模块窗口，94–102不扩展。
```
<!-- incremental-original-source:end -->
