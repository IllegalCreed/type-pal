# 3y统一治理线与复审

任务：[CODE-QUALITY-3Y-CLOSEOUT-1](../../tasks/CODE-QUALITY-3Y-CLOSEOUT-1.md)。用户要求优先收尾3y并消除治理分支分叉；当前只做隔离同步/保全，尚未合main。65差异文件、58卡复审矩阵待补。

五个冲突原件与两父SHA见merge-resolution.json：MIDI保留当前main完整实现，不把旧generation实现覆盖回去；baseline精确取main原件为比较输入，同时保存3y历史基线，最终只由官方ratchet生成。两个父分支的证据/发布入口/任务导航均保留。新增历史关闭声称转review，主线旧closed不因导入自动提高。所有质量门尚未运行于本新候选，禁止宣称通过或合main。

统一验收线后仍是唯一codex/code-quality-3y。临时两个测试冲突精确保留a9be C05版本；退役表22项/net51，固定计数先红1/67后67全绿，matcher不变。机器3288/223closed/198review/2867pending，0新增关闭。新候选尚未全仓验收。

历史17份raw日志的尾空格/EOF空行使diff-check失败：未丢弃任何原始字节，每份原件无损gzip与原SHA映射保存在raw-originals-map.json，.txt仅作显示副本规范空白；全部非空白字节逐项相同。验证旧receipt的raw SHA须使用映射的解压原件；不改历史测试计数、诊断或退出码。

分支清理已实际完成：本地/远端治理ref各仅codex/code-quality-3y；两个旧菜单别名与本地临时closeout已删，两managed旧树可恢复归档。32855a267已推送，a9be8ab9和d4cf7f57d均为其祖先；main未改、未合。实际工作目录与引用/归档证明见branch-consolidation-proof.json。

首个复审观察：CODE75旧两例实际重跑1通过/1失败（0skip），当前main版MIDI入口已有parser事件/生命周期协议，旧FakeSequencer不提供eventHandler，不能据此回退main产品。已全文读当前MIDI实现、旧测试、main新12例与CODE75卡，现main的新“stop后响应”和“新曲优先”两例更强，排重/合法IO/隔离与精确退役下一片继续核；当前未删除、未改源码。baseline原件/JSON/SHA保留，不能因单branch已统一宣称复审通过。
