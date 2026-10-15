# Kimi 战斗精灵真实工作流治理

任务：[QUALITY-EDITOR-DIAGNOSTICS-4](../../tasks/QUALITY-EDITOR-DIAGNOSTICS-4.md)。
两份测试源码，Codex单一Owner；六例先完整保留，真实完成信号、合法输入、oracle与重复分别核。
当前build，完整门与独立验收未完成，0关闭。旧十二组历史accept不追溯改写。

检查点：基线完整6例398条act；复用C02真实宿主/IO等待/撤销/提交，去重复Harness与轮询内点击、空Promise，6例0skip/0诊断。夹具仅头注明确允许编辑器测试复用，不改实现。

oracle修正：不再覆盖prepare的asset/record来“证明复用”；直接断言真实返回并原样dispatch。DnD在既有用例加1.5，区分isInteger与isFinite；替换帧明确证明期望像素不同于原帧。完成信号之后的可同步断言直接执行，避免轮询遮住错误。六例名称/数量未变，未退役。

隔离三枚反控：整数守卫放宽、复用AssetId漂移，旧六例仍全绿而现六例各恰一指定AssertionError；缩帧repairs清空后现删除例恰一AssertionError。每次完整跑六例，0skip；新例的三次红与恢复6绿均0诊断。临时工作区清理后独立split重构mutant并核raw/runner字节SHA，见oracle-rebuild.json。工作树生产文件未改。

相邻11文件90例0skip/0诊断，editor typecheck与coverage工具65/65通过。仅检查点，完整check/ratchet/protected待稳定资源工作流窗口共跑；不拿上一候选的全门给本片盖章。未知跨文件重复、宿主历史pending导航及故障清理仍待核；不关闭文件。
