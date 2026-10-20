# CODE-QUALITY-79 — 战斗0x61装备伪毒判定边界

> 2026-10-20当前：本卡五卡复审/必要返工已完成源码与证据审查，统一门结果以五卡唯一回执为准；以本页当前节和[五卡回执](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/five-cards/README.md)为准。旧时点的build/停止线/门失败保留，不作今天的阻塞或通过声明。

Status: review
Owner: Codex
Reviewer: Codex（独立验收）
Phase: phase1 game
Capability: Q3 battle poison
Visual Verification Timing: e2e-deferred

## 2026-10-20 当前复审

原盘SSS+生产解析器与真实performItem/runScript核实；2个目标HP业务红后复用isPlayerPoisoned修0x61，242相邻通过；大dispatcher仍review。

18份本轮文件记录分别列A–H，广域上下文复用原A–H并核版本/适用域；原件、主caller、原始/SDL/TS真值、反控和测试退役映射见[五卡唯一入口](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/five-cards/README.md)。量化初筛只指向重点阅读，不作指标验收。本轮已明确接受16个文件，见唯一回执closedFiles逐项清单；本卡复合/视觉/设计边界仍review，不把整卡升accept/done。

同一3y，唯一Owner Codex；未写主树/GLM原树，94–102不扩展。当前无新产品选择待答；既有用户runtime0/party-slot/战中禁换队/第一阶段999装备边界沿用。本批门以回执integration状态和完整原件为准；不复用历史全仓绿，覆盖率仅大批收尾。

## 目标与停止线

原始任务曾只读核验战斗0x61；2026-10-20已按原盘、既有后期修复决策和真实caller红例解除准入前提，窄修与CODE53寻址分清、独立提交。下文原始unknown/build blocked按2026-10-13历史保留，不能覆盖本页当前结论。

## 前提真值门

- primary：`reference/sdlpal/script.c:1957-1965` 调 `PAL_IsPlayerPoisonedByLevel(role,0)`；`global.c:1640-1685` 忽略 level>=99。
- 一阶段：`core/battle/battle-opcodes.ts` 的 OP_JUMP_IF_PLAYER_NOT_POISONED 只检查非零毒ID；`core/player-poison-state.ts:isPlayerPoisoned` 已忽略>=99，大世界与战斗合同可能不一致。
- 二阶段：N/A；本卡不动 Reforge。
- 目标：先核 `data/raw` 对应道具/装备脚本与真实 battle item caller，确定是现行产品选择、遗漏端口还是参考版本差异，再写单个合法失败反例。
- before→after 候选：只有装备伪毒时战斗0x61目前视为中毒；若采用 SDLPal ByLevel，则视为未中毒并跳转。可能影响毒龙胆/九阴散的后续脚本，不能只以函数复用理由推进。
- 最强替代解释：第一阶段已采纳原版后期而有意偏离当前 SDLPal；读取 game-mechanics 决策、原始脚本、历史回归后若证实则推翻直接修复结论。
- 前提结论：unknown（尚未核全原始脚本与产品历史），build blocked。

## 范围与验收

只读 `battle-opcodes.ts`、`player-poison-state.ts`、battle item action、event-opcode-player、原始对象/脚本、相邻毒回归。若获准实现，必须先分离失败反例、全链 caller/owner 与原始/SDLPal/TS 真值矩阵；不改生成物、schema/save 或通用兼容层。

## 交接

2026-10-13 Codex：CODE53候选曾无意用 isPlayerPoisoned 替换原非零ID扫描，已撤回额外行为，只保留 party-slot 寻址。CODE3t 的“未发现直接缺陷”保留历史；当前 ledger 把该实现恢复 review。无下一位 Agent 提示词；仍由 Codex 只读取证，未允许实现/标记 done。

## 2026-10-13 只读补证

`docs/phase1/engineering-notes.md:57`、`game-mechanics.md:1256-1270` 已明确记录采用原版后期修复、装备伪毒不算中毒；因此“可能刻意保留早期白嫖”的替代解释已被历史决策否定。剩余必须核的是原始对象/脚本与战斗物品caller的端到端失败反例，不需要把已拍板偏好再作为抽象A/B问题抛给用户。当前仍未改该机制、未开build。

当前提取数据只读锚点（`data/extracted/events/all.json` 的 `segments[0].commands`；本轮已核数字 label 与数组索引一致）：寿葫芦 item269 的装备入口39163依次为 `0x18 [16,269,0]`、`0x29 [0,563,0]`、`0x29 [0,564,0]`、end；毒563入口40860为 `0x1b [0,20,0]`，毒564入口40858为 `0x1c [0,20,0]`。九阴散 item136 使用入口39502为 `0x61 [39505,0,0]`、`0x1b [0,999,0]`、end；毒龙胆 item278入口39765为 `0x61 [39505,0,0]`、`0x2c [0,3,0]`、end；公共失败目标39505为 `0x5f [0,0,0]`、end。不能把九阴散的回血与毒龙胆的解毒泛化成每个物品都同时做两者。本轮未重新解码 raw 文件，未改生成物，剩余 raw/提取追溯与真实 battle-item caller 验证不能由该脚本片段替代。


## 2026-10-20 前提闭合与窄 build allowed

Owner Codex。用户本轮“处理五卡必要返工”与工程既有保真修复授权适用；不是新的产品取舍。engineering-notes 寿葫芦后期修复结论、game-mechanics 风险道具决策与 SDLPal `PAL_IsPlayerPoisonedByLevel(role,0)` 一致。当前生产 parseSss/parseItems/parseObjectPoisons 只读解码 SSS.MKF，逐字节核物品136/269/278及可达脚本；没有运行提取或写生成物。

真实 performItem → runScript → dispatchBattleOpcode 红例已取得：4例中2例恰在目标HP业务断言失败；只有装备伪毒时九阴散错误回血、毒龙胆错误存活，非顺序队伍[4,0]的施用者真毒不能替目标算中毒。level0回血、level3解毒且保留level4/99两例原实现已绿。原件将登记五卡 evidence。

准入限 battle-opcodes 的0x61改用既有 isPlayerPoisoned(role)，保留target优先/caster兜底/operand0跳转/无gs行为；新增真实物品合同测试。无 schema/save/公共接口变更，不改变其它opcode；这消除跨层重复毒等级知识，未引入新helper或兼容路径。原“unknown/build blocked”是旧时点，已被本节事实解除。
