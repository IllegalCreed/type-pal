# 3y统一治理线与复审

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本目录是 3y 统一治理线（任务卡 [CODE-QUALITY-3Y-CLOSEOUT-1.md](../../tasks/CODE-QUALITY-3Y-CLOSEOUT-1.md)）的证据入口:用户要求优先收尾 3y 并消除治理分支分叉;当前只做隔离同步/保全,尚未合 main;65 差异文件、58 卡复审矩阵待补。

## 来源与输入

五个冲突原件与两父 SHA 见 merge-resolution.json（main=f98d0ddd、old3y=d4cf7f57d、acceptancePreservedTip=a9be8ab9）:MIDI 保留当前 main 完整实现,不把旧 generation 实现覆盖回去;baseline 精确取 main 原件为比较输入,同时保存 3y 历史基线,最终只由官方 ratchet 生成;两个父分支的证据/发布入口/任务导航均保留。统一验收线后仍是唯一 codex/code-quality-3y:临时两个测试冲突精确保留 a9be C05 版本;退役表 22 项/net51,固定计数先红 1/67 后 67 全绿,matcher 不变;机器 3288/223 closed/198 review/2867 pending,0 新增关闭,新候选尚未全仓验收。历史 17 份 raw 日志的尾空格/EOF 空行使 diff-check 失败:原件无损 gzip 与原 SHA 映射保存在 raw-originals-map.json,.txt 仅作显示副本规范空白,全部非空白字节逐项相同,不改历史测试计数、诊断或退出码。

## 断言与业务 oracle

分支清理已实际完成:本地/远端治理 ref 各仅 codex/code-quality-3y;两个旧菜单别名与本地临时 closeout 已删,两 managed 旧树可恢复归档;32855a267 已推送,a9be8ab9 和 d4cf7f57d 均为其祖先;main 未改、未合。首个复审观察:CODE75 旧两例实际重跑 1 通过/1 失败（0 skip）,当前 main 版 MIDI 入口已有 parser 事件/生命周期协议,旧 FakeSequencer 不提供 eventHandler,不能据此回退 main 产品。

## 结果

2026-10-16 后续 Y01 复审（[README.md](midi-review/README.md)）:旧两例已证合同重复且库协议过期,删除该测试文件,main 产品/12 例原字节均保留;定向 12、相邻 44、game typecheck 及隔离 stop 反控 12 绿→11 绿 1 指定业务红→恢复 12 绿均通过;0 新增关闭;机器 3287/223/198/2866。

## 限制与复核

58 卡当前逐项进度独立写入 [rereview-progress.json](rereview-progress.json),不改合并时历史矩阵;完整门尚未运行本片,未合 main;所有质量门尚未运行于本新候选,禁止宣称通过或合 main。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 2688B / SHA-256 6c0dd199b54fb002ca9b1b5498e734453a9575ba12e923a87f3947d1bb43c25f；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# 3y统一治理线与复审

任务：[CODE-QUALITY-3Y-CLOSEOUT-1](../../tasks/CODE-QUALITY-3Y-CLOSEOUT-1.md)。用户要求优先收尾3y并消除治理分支分叉；当前只做隔离同步/保全，尚未合main。65差异文件、58卡复审矩阵待补。

五个冲突原件与两父SHA见merge-resolution.json：MIDI保留当前main完整实现，不把旧generation实现覆盖回去；baseline精确取main原件为比较输入，同时保存3y历史基线，最终只由官方ratchet生成。两个父分支的证据/发布入口/任务导航均保留。新增历史关闭声称转review，主线旧closed不因导入自动提高。所有质量门尚未运行于本新候选，禁止宣称通过或合main。

统一验收线后仍是唯一codex/code-quality-3y。临时两个测试冲突精确保留a9be C05版本；退役表22项/net51，固定计数先红1/67后67全绿，matcher不变。机器3288/223closed/198review/2867pending，0新增关闭。新候选尚未全仓验收。

历史17份raw日志的尾空格/EOF空行使diff-check失败：未丢弃任何原始字节，每份原件无损gzip与原SHA映射保存在raw-originals-map.json，.txt仅作显示副本规范空白；全部非空白字节逐项相同。验证旧receipt的raw SHA须使用映射的解压原件；不改历史测试计数、诊断或退出码。

分支清理已实际完成：本地/远端治理ref各仅codex/code-quality-3y；两个旧菜单别名与本地临时closeout已删，两managed旧树可恢复归档。32855a267已推送，a9be8ab9和d4cf7f57d均为其祖先；main未改、未合。实际工作目录与引用/归档证明见branch-consolidation-proof.json。

首个复审观察：CODE75旧两例实际重跑1通过/1失败（0skip），当前main版MIDI入口已有parser事件/生命周期协议，旧FakeSequencer不提供eventHandler，不能据此回退main产品。已全文读当前MIDI实现、旧测试、main新12例与CODE75卡，现main的新“stop后响应”和“新曲优先”两例更强，排重/合法IO/隔离与精确退役下一片继续核；当前未删除、未改源码。baseline原件/JSON/SHA保留，不能因单branch已统一宣称复审通过。

2026-10-16后续[Y01复审](midi-review/README.md)：旧两例已证合同重复且库协议过期，删除该测试文件，main产品/12例原字节均保留。定向12、相邻44、game typecheck及隔离stop反控12绿→11绿1指定业务红→恢复12绿均通过；0新增关闭。机器3287/223closed/198review/2866pending。58卡当前逐项进度独立写入[rereview-progress.json](rereview-progress.json)，不改合并时历史矩阵；完整门尚未运行本片，未合main。
```
<!-- incremental-original-source:end -->
