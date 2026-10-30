# game core event-system.ts 大文件补维（glm-foundation 模块 5 批 7）

> Codex当前裁定（2026-10-19）：本页保留作者阶段证据，未获整包/全维收口验收；可复用范围、逐文件依据与未知项见[当前返工记录](../codex-stage2-rework.json)。

Status: review（候选待 Codex 据证验收）
Owner: GLM；基点 `53db76bbb` 线（body 基准=批6提交后 HEAD）
范围：`core/event-system.ts`（5117 行**全文读毕**）。A 维引用 Codex 3r 深切片（5973 行主测试全文对照 script.c/play.c/scene.c/text.c/global.h）+ 后续多轮注释审计批;本批 B–G 补维。

## 短回执

- **改动 6 处（仅注释,全部为常量级过时实现描述）**：①OP_ADD_CASH"简版不跳 goto"→已 2026-05-31 补全负数不足即跳②OP_REMOVE_ITEM"简版只从 inventory remove"→已完整实现装备槽消耗+失败跳转③OP_BUY_MENU"M-w3.a 简版 stub"→已 2026-05-29 真接商店菜单④OP_REDRAW_SCREEN"M5 简版 delay/gesture 不实现"→两者均已实现(2026-06-06 补 delay 修张四上船瞬移)⑤OP_CURE_PLAYER_POISON_LEVEL"fallback 全清等 M5.5"→已走 curePlayerPoisonByLevel 真 level(本批核 event-opcode-player.ts:256-260)⑥OP_SET_PLAYER_STATUS"log skip 等 M6"→已写持久 gs.rgPlayerStatus(本批核 event-opcode-player.ts:262-283,CODE53/80 治理后现状)。
- **验证**：body-invariance 与整改前 HEAD 一致（零实现变化）;定向 **67 套件 326/326、0 failed-suites**（event-system 主测试全量）;game 全包 typecheck 0 错;scoped biome 0/0/0;diff --check 干净。未跑 game 全包测试/全仓门（按准入）。

## 八维结论（B–G 补维重点）

| 维 | 结论要点 |
|---|---|
| A(引用) | 3r 深切片 + 后续 DM16-26/DL13-26/搜索注释批/runtime-projection 批的分层证据链完整,依赖未变。本批复核关键映射(waiting 15 态派发/autoScript owner 门控 DL13-DM16/goto 同帧续跑/callStack 三处弹帧/0x05 双职责/0x7F 三态/jumpToGlobalIp 恒等回退)与实现一致。 |
| B | 本批修 6 处(常量级过时,全部有 handler 内新实现注佐证)。其余 5100 行注释为仓内最重真值文档(bug 档案+真值锚+取舍注),零冗余。 |
| C | interpreter 层无 menu/shell 反向依赖(11 个 handler setter 注入,每个有分层理由注);ScriptCursor 统一抽象消除 trigger/auto 双解释器分叉。 |
| D | re-export 块为 legacy import 路径兼容(有注释);applyRawOpcode 三 caller(trigger/auto/runScript+runEnterScript)共用,无重复。 |
| E | 326 例(3r 期全量判别力已核,源经 body-invariance 未变)。 |
| F/G/H | opcode 常量区→注入区→waiting 派发→主循环→applyRawOpcode→走位 helpers 分区清楚;OP_CENTER_CAMERA_ON_PARTY 与 OP_SET_CAMERA 同值双名(语义变体别名,有注,保留);纯逻辑直测+11 注入点可测 ✓。 |

## 复验入口（只读）

```bash
WT=~/.glm-worktrees/pre94-foundation
cd "$WT/packages/game" && ../../node_modules/.bin/vitest run src/core/event-system.test.ts
grep -n '已真实现\|已按真值实现\|已完整实现' "$WT/packages/game/src/core/event-system.ts" | head  # 6 处修正可 grep
```

失效条件:实现变化 → 重测;六处对应 handler 语义再变 → 常量注复核;3r 证据链依赖变化 → 重估。


## Codex 剩余29文件返工（2026-10-20）

已提取0x73/0x9B相同dither起点为私有startDitherFade，speed/墙钟/清理/IP协议不变；不是仅注释批。先329基线带2stderr，再窄修两例fixture/oracle，329零stderr后重构，重构后329零stderr。首条新断言把undefined误认[]的作者失败保留，不冒称产品red。

逐文件八维、原件与限制见[本轮回执](../codex-final29.json)。本节不接收原文整包/模块收口宣称。
