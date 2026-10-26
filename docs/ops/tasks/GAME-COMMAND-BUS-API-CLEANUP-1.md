# GAME-COMMAND-BUS-API-CLEANUP-1 — 一阶段命令通道无用回执清理

Status: done
Phase: phase1
Capability: core to shell command contract
Coding Owner: Codex（单一实现写入者）
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

## 追加消费端核验（2026-10-26）

上文“有生产emit所以保留”仅为最初有限提案，不足以证明通知有业务用途。当前已补核真实main-loop→bootstrap.onPresent→syncShellAudio/sfxForBattleEvent及presentBattleFrame→BattlePresent.draw：showDialogBox/playMagicAnim均无音画消费，实际对白走gs.dialogBox，法术走动画帧链。攻击/阵亡三种通知仍有实际SFX消费，不能混删。

已追加请求用户裁决这两个空通知是否也退役；答复前保留发送与类型。若批准，需同步event-system/magic两发送点和专属测试断言，保留实际对白状态、MP/HP、音效和帧序判别力。当前magic仅做动作/动画职责重组，接口和空通知尚未删除；原八维G欠账仍显式review，不由226绿代签。

## 2026-10-26 当前批准与build准入

用户明确批准删除complete/cmdId/返回编号、四无发送类型及showDialogBox/playMagicAnim两个空通知；保留攻击/阵亡SFX与cmd信封和FIFO。 Codex核当前main未变、单一Owner与隔离治理分支，build allowed。上文待裁决描述保留为历史提案；本轮以此明确答复为准。定向与相邻集中验证，纯清理/行为修复独立提交，全部52稳定后统一门。

2026-10-26 实施：删除流水号/complete/六空类型及两生产通知，保留真实SFX、cmd信封和FIFO；tickEventSystem最后一个bus用途随通知退役，同步409处直接调用及一个namespace调用，删新产生的纯空bus夹具；其它RunScript仍需bus，保留其依赖。机械清理曾漏简写引用，中间TC/回归失败原件保留，最终game TC0、35实际文件795例通过、0stderr。原bus6例中4条专属协议退役，两队列例加强并补实例隔离；其余测试只去接口/实参、空通知断言迁移实际dialog/帧链。未放宽规则，统一门/发布仍待。

- 2026-10-26 本地统一门收口：52/52代码接受；全仓20620产品＋721工具／七包TC、lint6137文件0/0/0，完整stderr空；唯一official20185／809全部测试绿、原旧比率拒绝如实保留。按用户既有授权仅pal-extract的死包装与视频CLI保护两文件精确重计，六其它包收益保留；同一报告原policy重放ratchet/protected均exit0，三项精确退役匹配。完整原件与低成本复验见父52证据uniform.json；当前尚未推送/PR/合并，卡面done为代码与本地门，发布以真实GitHub状态另核。
