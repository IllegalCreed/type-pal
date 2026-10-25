# GAME-COMMAND-BUS-API-CLEANUP-1 — 一阶段命令通道无用回执清理

Status: draft
Phase: phase1
Capability: core to shell command contract
Coding Owner: Codex（当前只读提案）
Reviewer: Codex
Visual Verification Timing: N/A（无实际音画取舍）
Branch: codex/code-quality-94-102

## 事实与停止线

[编译器callsite事实与方案](../evidence/QUALITY-REVIEW-52-CLOSEOUT-1/game-boundary-candidates.json)、[完整30处清单](../evidence/QUALITY-REVIEW-52-CLOSEOUT-1/game-boundary-native.json.gz)。实际CommandBus声明解析下的30个生产emit都独立表达式，零complete调用；cmdId没有生产命名读取，shell只消费cmd。编号/complete目前只有旧测试消费，四种命令clearDialogBox/flashEnemy/flashPlayer/showBattleUI从未生产发送。

旧“4无emit”不能误判成攻击/阵亡音效：playPlayerAttack、playEnemyAttack、playEnemyDeath有真实生产caller，必须保留。showDialogBox/playMagicAnim也有生产emit，不在本次退役。

## 有限方案与准入

待用户：删除complete、cmdId分配/字段及emit返回编号；保留BusEntry.cmd信封，不顺便重写传输形状。移除上述四个无发送命令类型，同步仓内类型/测试。队列FIFO、drain清空/数组所有权和实例隔离仍由少量精确业务断言验收；不留no-throw伪回执测试，不以测试数维持接口。

第一阶段业务/音效/提示/动画/存档不变，第二阶段N/A。该项涉及AGENTS公共/内部接口停止线，尚未产品build。用户允许后白名单为command-bus及必须的类型/caller/test适配，纯重构独立提交；范围外不授整文件新接受。父52其余文件继续，重门仅整个阶段稳定后集中。

## 交接

2026-10-26：Codex只读核验真实Core→shell caller与静态30清单；产品未改，无新统一门。未知外部反射调用不冒称不存在；由用户裁决是否退役当前内部接口。
