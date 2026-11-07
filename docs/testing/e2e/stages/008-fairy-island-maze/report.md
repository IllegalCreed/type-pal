---
testingSchema: 2
id: e2e-008
evidence: e2e/evidence/e2e-008.json
---

<!-- testing-meta
{"schemaVersion":2,"id":"e2e-008","sourceRefs":[{"path":"scripts/e2e/fairy-island-maze-game.mjs","lines":"27-42","anchor":"const { values: options } = parseArgs({","role":"Game native verify caller","sha256":"c3c4a442cd58c17d1c62349331475bed27216802df3d8eb4c70246d83d351f7e"},{"path":"scripts/e2e/fairy-island-maze-reforge.mjs","lines":"25-34","anchor":"008 requires --from a formal Reforge 007 verify report","role":"Reforge native verify caller","sha256":"81ea8918563d63b4d0bdb264e50814774d2a88cf1d89ab060b017c7e0013c757"},{"path":"scripts/e2e/fairy-island-maze-comparison.mjs","lines":"349-380","anchor":"function compareRiderTurns","role":"rider motion and actual draw oracle","sha256":"a9e5383c03dbbeed5e452aa90bdeca909b69ebedce5f638c8516049aee38ba77"},{"path":"scripts/e2e/fairy-island-maze-comparison.mjs","lines":"382-445","anchor":"function compareStatues","role":"statue actual frame and indexed pixels oracle","sha256":"a9e5383c03dbbeed5e452aa90bdeca909b69ebedce5f638c8516049aee38ba77"},{"path":"scripts/e2e/fairy-island-maze-comparison.mjs","lines":"471-500","anchor":"function verifyTerminal","role":"terminal checkpoint oracle","sha256":"a9e5383c03dbbeed5e452aa90bdeca909b69ebedce5f638c8516049aee38ba77"},{"path":"packages/content/src/character.ts","lines":"168-170","anchor":"export const CONTENT_VERSION =","role":"PAL content and Reforge minimum save version","sha256":"0a67777ed9a2ee576a292cb7281936e4f5183542877fbb170be8c82d19249259"}],"publicCallers":["node scripts/e2e/fairy-island-maze-game.mjs --headless --visual-review --from <same-engine-Game-007-report>","node scripts/e2e/fairy-island-maze-reforge.mjs --headless --visual-review --from <same-engine-Reforge-007-report>","node scripts/e2e/recompare-recording.mjs 008 <Game-008-report> <Reforge-008-report> <new-comparison-output>"],"legalInputs":["Each native runner reads its own actual 007 verify report and byte-bound checkpoint on candidate 743be436c.","The recorded start is first control in the Fairy Island maze, with one Sky Breaker Hammer. PAL content22 and Reforge SAVE12 apply.","Normal direction keys, search and the item menu follow the frozen route through the maze. Fresh restore reads the resulting native 008 save."],"businessOracle":{"type":"dual-008-maze-route-mechanisms-draws-and-persistence","assertions":["Match all 636 direction commits and 41 route actions. Match 31 raft rides, 1154 rider positions/facings and the actual drawings at 19 turns.","Check all six Asura statues’ original pose indices and selected frame pixels. The six hammer hits destroy only those statues, expose the starting plate and consume the hammer.","Observe the snow lotus and five-talisman chest rewards and the Guanyin statue state. Returning to the flashing plate opens the exit and reaches control in the Peach Grove.","Both producers save actual 008 terminal checkpoints and restore them in fresh contexts. Native Editor save, reopen, single-step and reset bind the observed hammer entry layouts."]},"dedupe":{"result":"bounded-distinct","against":["e2e-contract","e2e-007","e2e-009"],"notes":"007 supplies native inputs. 008 owns the maze and first control in the grove. 009 owns the subsequent pickup and pool sequences."},"revision":{"currentSha":"743be436c70bf3519e1324ec356dafcf0f6d040a","contentVersion":22,"minimumSaveVersion":12,"history":[{"revision":"743be436c70bf3519e1324ec356dafcf0f6d040a","date":"2026-11-06","action":"same-route-008-native-verify-and-fresh-restore","independentAcceptance":"passed","visualReview":{"result":"accepted","clipSha256":"bf0529928b54d58ca0ff586bd40fa598fe6204c5acddc53a771429cf1575c644"},"notRun":["capture","audio acceptance","unvisited branches"]},{"action":"content23-acquisition-source-rebinding","base":"0973c2c25795fd2aacf78daedebb8d8f2a5113fc","date":"2026-11-07","evidence":"docs/tasks/evidence/N6B-ITEM-FLOWS-1-source-applicability.md","previousSourceRefs":[{"path":"scripts/e2e/fairy-island-maze-reforge.mjs","lines":"24-33","anchor":"008 requires --from a formal Reforge 007 verify report","role":"Reforge native verify caller","sha256":"63dd8305713c0bd65e02274d783a328d3c59c9876f6daa947b8f32480d568f43"},{"path":"packages/content/src/character.ts","lines":"168-170","anchor":"export const CONTENT_VERSION =","role":"PAL content and Reforge minimum save version","sha256":"8d3d592d75e78c9559986b5747e7b2395aaac010bf8dde9d6ea5f164bba29a93"}],"scope":"核 content23、四类取物及其真实 caller 的来源适用性；保留原执行版本、候选、状态、断言与附件，不把历史录制改记为本轮通过。本轮运行与编辑器验证独立见 N6B-ITEM-FLOWS-1。"}]},"evidence":"e2e/evidence/e2e-008.json"}
-->

# 008 · 仙灵岛迷宫与桃花林入口

Status: verified
Owner: Codex
Last reviewed: 2026-11-06
Template: test-run-report-v1 / 1.0.0

## Scope

Game 与 Reforge 各从候选 `743be436c` 的同引擎 007 正式终档读回。经过芦苇漂、两个取物点和六座阿修罗，回到起点踏板开启通道。收段于桃花林首次可控，保存并在新会话读回。正式终档由 009 各自接续。

## Execution and assertions

从归档按成员清单还原各自的 007 报告及相邻终档。原生执行器使用报告绝对路径。双轨比较输出到新回执路径。

```sh
node scripts/e2e/fairy-island-maze-game.mjs --headless --visual-review --from "$PAL_GAME_007_REPORT"
node scripts/e2e/fairy-island-maze-reforge.mjs --headless --visual-review --from "$PAL_REFORGE_007_REPORT"
node scripts/e2e/recompare-recording.mjs 008 "$PAL_GAME_008_REPORT" "$PAL_REFORGE_008_REPORT" "$PAL_COMPARISON_OUTPUT"
```

| 义务 | 当前双轨结果 |
| --- | --- |
| 同路与乘漂 | 636 次方向提交、41 个动作、31 趟乘漂逐项匹配。1,154 个站位及朝向采样对齐，19 次转向的实际绘制帧相符。变轨漂的折线和直线分别观察。 |
| 石像和机关 | 六座像砸前实际选帧与素材像素一致。六次用锤后消耗破天锤、显现闪烁踏板，回踩后保留落点进入新通道。观音像原样保留。 |
| 取物 | 雪莲子入袋一颗。宝箱开启动作及风、雷、水、火、土灵符各一张入袋均有独立触发和库存证据。 |
| 保存及重开 | Game 场景 17 的 `[304,824]`、Reforge `s016 [61,42,0]` 恢复控制。两份 `008.end.save.json` 各在独立新会话恢复，源报告、保存字节和 fresh trace 均有指纹。 |
| 编排与预览 | 六像用锤正文、变轨漂和踏板按剧情用途命名。变轨漂保留折线和两次直程，去掉两处相邻重复挡块写入。按同路线更正五个用锤初态，实际保存、重开、单步和重置核六个步骤，43 个入口的 89 个实体快照已复算。 |

正文、保存侧车和未执行分支按各自记录追溯。宝箱与雪莲子首次取得实跑，复读提示与未乘漂分支分别保留核读和执行边界。[008 任务卡](../../../../tasks/cards/E2E-008-1-fairy-island-maze.md) · [逐步骤台账](../../cross-stage/script-progress.md)

## Results

离线比较零发现、零录制源差异。技术复核覆盖 verify 剧情、实绘、正式存读及相关静态预览。用户于 2026-11-06 对 227 秒新版无声分屏回复「没问题了」，关闭石像与随漂转向的观感反例。

## Evidence

| 引擎 | 同引擎 007 终档 SHA256 | 当前 008 终档 SHA256 |
| --- | --- | --- |
| Game | `4f2b6c740f31d3e19c95326cb2151451d53b74d2b4340de9b17acb7cb11510a2` | `d8729196511cbb1dc369d89d2f84d6b3f5caea6b3c14ddf48389eb2a776fd8fd` |
| Reforge | `44e89b39fcb6b47c4c8d8c30638bcc506bc5beee52403b3506af62c0156fe58b` | `239a454be35b55aef08de070ffa072ef18b377d0ad11d3d4650da9702312ba80` |

执行命令、两端报告及轨迹成员、比较和媒体回执的精确身份见配对 JSON。正式发布依赖已验收的 007 阶段，本次实际前驱由两端原生 007 报告及字节证明定位。[配对回执](../../evidence/e2e-008.json) · [双轨原件](../../../../tasks/evidence/E2E-008-1-mounted-pose-recheck-20261106.tar.gz) · [预览保存原件](../../../../tasks/evidence/E2E-008-1-preview-route-recheck-20261106.tar.gz)

## Revision history

原路线分叉、旧默认帧和乘漂朝向反例分别保留。正式录制前一次 Game 按键释放延迟多走，被输入守卫拒绝。接受执行使用同一前驱和路线另跑，失败报告与拒绝轨迹仍可从归档恢复。[008 任务卡](../../../../tasks/cards/E2E-008-1-fairy-island-maze.md#状态与交接)
