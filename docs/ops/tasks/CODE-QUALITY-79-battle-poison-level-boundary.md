# CODE-QUALITY-79 — 战斗0x61装备伪毒判定边界

Status: draft
Owner: Codex
Reviewer: Codex（独立验收）
Phase: phase1 game
Capability: Q3 battle poison
Visual Verification Timing: e2e-deferred

## 目标与停止线

只读核验战斗 `0x61` 是否应忽略 level>=99 装备伪毒。CODE53 用户只明确批准 runtime 零值与 poison key 对齐，不能把额外的解毒物品效果变化混入。当前不得实现，不占 CODE53 的 Coding Owner 写入范围。

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
