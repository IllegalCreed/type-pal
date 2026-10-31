# game core game-state.ts 大文件补维（glm-foundation 模块 5 批 5）

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: audit-report-v1 / 1.0.0

## 审计问题

本页审计主题:game 的 core/game-state.ts(2111 行全文读毕)B–G 补维(重点注释事实/死出口/内聚耦合);A 维引用 Codex runtime-projection 注释批(parsedTS/JS 与基点同字节)+game-state.test 61 合同;基点 53db76bbb 线(body 基准=批4提交后 HEAD)。原文 Status: review(候选待 Codex 据证验收)。Codex 当前裁定(2026-10-19):本页保留作者阶段证据,未获整包/全维收口验收;可复用范围与逐文件依据见 [codex-stage2-rework.json](../codex-stage2-rework.json)。

## 范围与证据

注释整改批:改动 4 处仅注释。验证证据:body-invariance(同目录)与整改前 HEAD 一致(零实现变化);定向 17 套件 71/71、0 failed suites(directed.json:testResults 为 game-state.test 61+mode 10 两文件;README 原文另列 dependency,不在该回执内);game 全包 typecheck 0 错;scoped biome 0/0/0;diff --check 干净。未跑 game 全包测试/全仓门(按准入)。

## 发现

整改逐项:①InventoryEntry 错挂『队伍成员 role id』docblock(描述 party 的注释遗落在背包条目上)改为背包条目合同;②dialogHistory『会话态——不入存档』与事实相反——已核 bootstrap.ts:1646-1649『跟着存档走』(存档含 deepClone 数组、读档经 restoreDialogHistory 归一),按真实持久语义改写;③④postBattleResume 的 0x07 接回说明 docblock 此前被夹在 prevBattleActions 前成孤儿(附错声明类)迁回 postBattleResume 本尊。A 维(引用)复核:runtime-projection 注释批(投影/装备 getter/回写边界)已由 Codex 全文核正,依赖未变;GOVERNOR_REWARD 扬州领赏 tp 修与 scriptRunHits0x4F 死亡预判的考据注(all.json byte-level 锚)完整。B 维:其余 2100 行注释为仓内最高密度真值文档(waiting 15 态、SAVEDGAME_WIN 倒推、稀疏存策略、瞬态/持久分界),零冗余。C:单一真相源+稀疏 Record+引用共享切片(allEventObjects→npcs)ownership 全部有注;hydration/projection/writeback 三向边界清楚。

## 结论

注释整改批(4 处):71/71 定向绿+body-invariance 单文件恒真+typecheck 0 共同证明行为零变。G 维:出口均有生产 caller(bootstrap/interpreter/present),无新死出口。

## 整改与复核

整改即上述 4 处注释。复验入口(原页给出,此处概述):定向跑 game-state.test.ts;tsc --noEmit -p packages/game;grep 随存档持久 于 game-state.ts(dialogHistory 修正可 grep 验证)。失效条件:实现变化→重证;save 语义再变→dialogHistory 注释复核;投影 getter 变化→前批证据重估。本轮治理未重跑任何命令;候选待 Owner 接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 3095B / SHA-256 9edde60d27f45370065dc5bf6e7d25c4c6bb9faf89ab71ed5181710297dbff78；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
````markdown
# game core game-state.ts 大文件补维（glm-foundation 模块 5 批 5）

> Codex当前裁定（2026-10-19）：本页保留作者阶段证据，未获整包/全维收口验收；可复用范围、逐文件依据与未知项见[当前返工记录](../codex-stage2-rework.json)。

Status: review（候选待 Codex 据证验收）
Owner: GLM；基点 `53db76bbb` 线（body 基准=批4提交后 HEAD）
范围：`core/game-state.ts`（2111 行全文读毕）。A 维引用 Codex runtime-projection 注释批（parsedTS/JS 与基点同字节）+ game-state.test 61 合同；本批为 B–G 补维（重点注释事实/死出口/内聚耦合）。

## 短回执

- **改动 4 处（仅注释）**：①`InventoryEntry` 错挂"队伍成员 role id"docblock（描述 party 的注释遗落在背包条目上）→ 改为背包条目合同 ②`dialogHistory`"会话态——**不入存档**"**与事实相反**——已核 bootstrap.ts:1646-1649「跟着存档走」（存档含 deepClone 数组、读档经 restoreDialogHistory 归一），按真实持久语义改写 ③④`postBattleResume` 的 0x07 接回说明 docblock 此前被夹在 `prevBattleActions` 前成孤儿（附错声明类）→ 迁回 postBattleResume 本尊。
- **验证**：body-invariance 与整改前 HEAD 一致（零实现变化）；定向 **17 套件 71/71、0 failed-suites**（game-state 61 + dependency + mode）；**game 全包 typecheck 0 错**；scoped biome 0/0/0；diff --check 干净。未跑 game 全包测试/全仓门（按准入）。

## 八维结论（B–G 补维重点）

| 维 | 结论要点 |
|---|---|
| A(引用) | runtime-projection 注释批（投影/装备 getter/回写边界）已由 Codex 全文核正,依赖未变;GOVERNOR_REWARD 扬州领赏 tp 修与 scriptRunHits0x4F 死亡预判的考据注（all.json byte-level 锚）完整。 |
| B | 本批修 4 处（见短回执）。其余 2100 行注释为仓内最高密度真值文档（waiting 15 态、SAVEDGAME_WIN 倒推、稀疏存策略、瞬态/持久分界),零冗余。 |
| C | 单一真相源 + 稀疏 Record + 引用共享切片（allEventObjects→npcs）ownership 全部有注;hydration/projection/writeback 三向边界清楚。 |
| D | makeExpEntry/mat/zeros 等私有 helper 单一职责;装备 sum/override getter 语义与 sdlpal 对齐(前批已证)。 |
| E | 71 例覆盖投影/归一化/扬州修/死亡预判/重置族。 |
| F/G/H | 大文件但分区清楚（state 形状→工厂→tp 修→切片);出口均有生产 caller（bootstrap/interpreter/present）;纯函数直测 + provider 注入可测 ✓。无新死出口。 |

## 复验入口（只读）

```bash
WT=~/.glm-worktrees/pre94-foundation
cd "$WT/packages/game" && ../../node_modules/.bin/vitest run src/core/game-state.test.ts
node "$WT/node_modules/.bin/tsc" --noEmit -p "$WT/packages/game/tsconfig.json"
grep -n '随存档持久' "$WT/packages/game/src/core/game-state.ts"  # dialogHistory 修正可 grep 验证
```

失效条件:实现变化 → 重证;save 语义再变 → dialogHistory 注释复核;投影 getter 变化 → 前批证据重估。
````
<!-- incremental-original-source:end -->
