---
testingSchema: 2
id: e2e-007
evidence: e2e/evidence/e2e-007.json
---

<!-- testing-meta
{"schemaVersion":2,"id":"e2e-007","sourceRefs":[{"path":"scripts/e2e/island-entrance.mjs","lines":"27-47","anchor":"assertBoatReport(predecessor)","role":"verify caller and legal predecessor","sha256":"64f2e7b0e9a3ad17618bb7b4769ddb4aa3b23be65fc6b2e0ae0bf833173fd5c1"},{"path":"scripts/e2e/island-entrance.mjs","lines":"48-67","anchor":"const dockPlan = fixedRoutePlan","role":"fixed route and endpoint","sha256":"64f2e7b0e9a3ad17618bb7b4769ddb4aa3b23be65fc6b2e0ae0bf833173fd5c1"},{"path":"scripts/e2e/island-entrance.mjs","lines":"290-337","anchor":"only the first valid speed-win request may succeed","role":"actual encounter and settlement","sha256":"64f2e7b0e9a3ad17618bb7b4769ddb4aa3b23be65fc6b2e0ae0bf833173fd5c1"},{"path":"scripts/e2e/island-entrance.mjs","lines":"469-510","anchor":"assertBoatGameSaveCapture(payload, capture.payload)","role":"formal save and fresh restore","sha256":"64f2e7b0e9a3ad17618bb7b4769ddb4aa3b23be65fc6b2e0ae0bf833173fd5c1"},{"path":"scripts/e2e/recompare-recording.mjs","lines":"33-37","anchor":"return recompareIslandEntrance","role":"offline public caller","sha256":"7425f57f441bc43f362ee88bb6a38e181af3fdd7fc6ce4484b41ff3787265cd7"},{"path":"scripts/e2e/island-entrance-comparison.mjs","lines":"328-368","anchor":"export async function recompareIslandEntrance","role":"committed route, encounters and sprite draws","sha256":"ee4ff2b630355eea5be90f1fa33b4a77ba4a429b94319c95624e730803268d7e"},{"path":"packages/content/src/character.ts","lines":"168-168","anchor":"export const CONTENT_VERSION = 22","role":"canonical content version","sha256":"8d3d592d75e78c9559986b5747e7b2395aaac010bf8dde9d6ea5f164bba29a93"},{"path":"packages/reforge/src/save/types.ts","lines":"9-9","anchor":"export const SAVE_VERSION = 12","role":"Reforge save version","sha256":"b40e418803af9585d944f2a5f3c0229ea26494003f0aa08b12493ddb42605bc2"}],"publicCallers":["node scripts/e2e/island-entrance.mjs --engine game --headless --visual-review --from <game006/report.json>","node scripts/e2e/island-entrance.mjs --engine reforge --headless --visual-review --from <reforge006/report.json>","node scripts/e2e/recompare-recording.mjs 007 <game007/report.json> <reforge007/report.json> <new-output.json>"],"legalInputs":["各引擎实际完成 006 并保存的本引擎 verify 报告和对应终档字节","Game SAVE1，Reforge content22 / SAVE12；正常方向键逐步走 44 格加 88 格","实际普通草妖遭遇，李逍遥单人；首轮就绪后一次速胜请求，经 Enter 确认正式结算","正式 007 终档通过本引擎独立浏览器会话恢复"],"businessOracle":{"type":"island-entrance-committed-route-encounter-and-handoff","assertions":["两端真实移动提交逐步匹配，码头 44 步和岛入口 88 步，在迷宫首次恢复操控处停止","同格同序触发 e206、e207、e209，正式结算后从原格可控，经验合计 +8，钱数不变","e206 至 e209 的逐步追逐位置和实际绘制帧匹配；e208 参与追逐但没有接敌","各自正式保存与独立会话恢复核对持久域，确认 008 实际消费对应终档"]},"dedupe":{"result":"bounded-distinct","against":["e2e-contract","e2e-006","旧 007 不同遭遇与奖励窗执行","008 迷宫机关"],"notes":"006 证明实际前驱，007 只授本段运行结果；编辑器逐步骤证据和作者观感分别按原裁定记录。"},"revision":{"currentSha":"743be436c70bf3519e1324ec356dafcf0f6d040a","contentVersion":22,"minimumSaveVersion":12,"history":[{"revision":"6b2a252984431d6866e68c1e38f3ea5424535836","date":"2026-11-05","action":"first-dual-native-run","result":"Game 三场，Reforge 四场，均完成迷宫终档和恢复。"},{"revision":"6557d7c1832c920edb3fbb1719402a923797adf4","date":"2026-11-06","action":"settlement-layout-rerun","result":"首场奖励窗修后分屏获作者通过。"},{"revision":"5bbc2e5de5af771862dc725d6799d5af357e0073","date":"2026-11-06","action":"first-common-route-runtime-match","result":"统一接敌、逐步追逐和实绘通过，编辑器迷宫入口初态以该轮首叶现场取证。"},{"revision":"743be436c70bf3519e1324ec356dafcf0f6d040a","date":"2026-11-06","action":"rerun-after-shared-mounted-pose-fix","result":"双轨技术对照通过，迷宫终档均正式恢复并供 008 接续。"},{"revision":"743be436c70bf3519e1324ec356dafcf0f6d040a","date":"2026-11-06","action":"user-accepted-current-split-screen","visualReview":{"result":"accepted","quote":"007、009 都通过","clipSha256":"24b609ea42db5308b596dbb3556d889dc2ef6c595864a28988c81353983e05ad","seconds":28.12}}]},"evidence":"e2e/evidence/e2e-007.json"}
-->

# 007 · 从仙灵岛码头到迷宫入口

Status: verified
Owner: Codex
Last reviewed: 2026-11-06
Template: test-run-report-v1 / 1.0.0

## Scope

本段从仙灵岛码头恢复操控后的正式 006 终档起步，穿过仙灵岛入口，到迷宫首次恢复操控即止。冻结候选为 `743be436c70bf3519e1324ec356dafcf0f6d040a`。两端均用 verify 正常读档、按键、保存和独立浏览器会话恢复，另采集静音实绘供分屏。普通遭遇在正式入战后速胜，回合策略与音频另由各自专项验收。

Game 复用原候选 `b3b399c5f2590ac57432fb6934d470348150f637` 的正式 SAVE1 前驱 `756158dad2b5dbe77d03b00a32f38c4847f060589db14b824a9607efd64c19e4`。Reforge 从本候选重跑的 content22 / SAVE12 前驱 `18895d094799482e58b79be7a376d336a02b5b42c6d35a695e49e762171cfdda` 接续。前驱的原生报告、版本和字节见[机器回执](../../evidence/e2e-007.json)。当前作者验收裁定由[007 任务卡](../../../../tasks/cards/E2E-007-1-island-entrance-to-maze.md)持有。

## Execution and assertions

| 剧情用途 | 实际输入及边界 | 业务断言 |
|---|---|---|
| 从码头进岛 | 向上 44 个实际提交步，经 `s014/e202` 到岛入口 `s015` | 两端逐步落点相同，入口首次可控时在统一格坐标 `[117,91]` |
| 穿过草妖地带 | 向上 88 个实际提交步，接敌时释放方向键，结算后从同一格继续 | 两端在相同格点和顺序接敌，四只草妖的逐步位置及实绘步态相符 |
| 确认普通遭遇的奖励 | 逍遥单人，等实际敌队开场就绪后请求速胜，用 Enter 确认实际结算屏 | 当场只接受一次有效请求，经验和钱数按该敌队核对，战后对应敌人隐藏并从原格恢复操控 |
| 首次抵达迷宫 | 经 `s015/e204` 切入迷宫，待进场完毕后保存，新会话读回 | Game 场景 18 像素落点 `[576,1152]`，Reforge `s017` 格点 `[90,54,0]`，均朝上、可控，持久域核对通过 |

在仓库根目录运行。先按[证据清单](#evidence)恢复各引擎报告及其同目录原件。离线入口还会核原录制的声明依赖和当次判定器来源。

```sh
node scripts/e2e/island-entrance.mjs --engine game --headless --visual-review --from "$game_006_report"
node scripts/e2e/island-entrance.mjs --engine reforge --headless --visual-review --from "$reforge_006_report"
node scripts/e2e/recompare-recording.mjs 007 "$game_007_report" "$reforge_007_report" "$new_comparison_json"
```

## Results

两轨运行分别为 `passed`，离线对照为 `passed`，零 finding、零录制源差异。三场结算各实际绘制一个确认屏，累计经验从 0 到 8，钱数保持 550。下表格点采用比较器归一化坐标。

| 遭遇 | 接敌格点 | 敌队 | 经验变化 | 钱数变化 |
|---|---|---|---:|---:|
| 靠码头草妖 `e206` | `[117,77]` | `team-16` | +2 | 0 |
| 入口中段草妖 `e207` | `[117,48]` | `team-15` | +1 | 0 |
| 迷宫入口前草妖 `e209` | `[117,19]` | `team-17` | +5 | 0 |

入口上段草妖 `e208` 有 12 步追逐，两端相同，路线没有接敌。另三只各有 3 步，两端实际帧逐项匹配。前轮多一场的反例来自 Reforge 的整格追逐和拍后接触，当前四只均按原盘档 5 的拍初严格小于 1.5 格及逐步追逐对照。本次适用范围为这组普通草妖，原盘另有档 6，见[任务卡的原始分类](../../../../tasks/cards/E2E-007-1-island-entrance-to-maze.md#2026-11-06-明雷行为返工准入)。

| 引擎 | `007.end.save.json` SHA256 | 新会话确认 |
|---|---|---|
| Game | `4f2b6c740f31d3e19c95326cb2151451d53b74d2b4340de9b17acb7cb11510a2` | 真实 F5 捕获和写槽确认，`loadGameFromSlot` 回读 78 个持久域字段，按加载器行为归一化 `needToFadeIn` |
| Reforge | `44e89b39fcb6b47c4c8d8c30638bcc506bc5beee52403b3506af62c0156fe58b` | 公开保存接口生成终档，独立会话的 `restorePayload` 提交与终档核对一致 |

007 两个子进程均退出 0。Game 的外层接续日志随后在 008 拒绝一次多走输入，008 另行恢复该份 Game 007 终档；007 的成功执行和后继失败各保留自己的结果。

两处触碰区、四只草妖及迷宫进场音乐已按用途命名。码头切图、入口空进场、迷宫切图及进场音乐四个步骤有编辑器实操证据。最新迷宫入口静态初态是「草妖战后：进入仙灵岛迷宫」。四只草妖中 `e208` 在 `[115.75,30.25,0]` 朝上、可见，另三只隐藏。本轮 Reforge 迷宫切图首叶 `visit=6 / run=10 / order=5963` 的四个位置、朝向和显隐与编辑器取证相符。

独立原生编辑器完成保存、重开、读回四只草妖字段，并从引用打开实际步骤。预览画布切到迷宫，重置及结束都回仙灵岛入口，编辑选择保持在原步骤。该步骤保存数据覆盖 NPC 的静态属性，运行时队伍与生命周期计时由游戏负责。完整脚本命名、优化、实跑采样和初态覆盖各按[逐步骤台账](../../cross-stage/script-progress.md)核查。

前轮第一场奖励窗的深色文字、经验数字右对齐和钱数居中已获用户通过。2026-11-06 用户确认新版 28.12 秒同路分屏，回复「007、009 都通过」。当前发布状态为 `verified`。

## Evidence

- [007 机器回执](../../evidence/e2e-007.json)提供命令、版本、报告和终档的成员身份与 SHA256。当前双轨比较为 `build/e2e-rework/007-mounted-pose-final.json`，SHA256 `c54d806444d81d23c60a77eafe9522223cbd7835301b589547173d1e1094ac4b`。归档含两轨原生报告、场景轨迹、回读轨迹和终档，以及本候选的 Reforge 006 前驱。 [当前双轨原件](../../../../tasks/evidence/E2E-008-1-mounted-pose-recheck-20261106.tar.gz)
- 原生 Game 006 报告与存档位于成员目录 `build/e2e/game-006-2026-11-06T07-31-57-504Z/`。保留这份运行的原候选，并用本轮 Game 007 的实际恢复证明适用。 [Game 006 原件](../../../../tasks/evidence/E2E-008-1-orientation-recheck-20261106.tar.gz)
- 007 的分屏采集、裁切和对齐由当前双轨归档中的 `build/e2e-rework/review-007-mounted-pose/{review-media,alignment}.json` 持有。已核对本地两端原录制与 28.12 秒分屏字节。分屏文件 `007-game-reforge.mp4` 在本地交付目录，SHA256 `24b609ea42db5308b596dbb3556d889dc2ef6c595864a28988c81353983e05ad`。 [采集及对齐收据](../../../../tasks/evidence/E2E-008-1-mounted-pose-recheck-20261106.tar.gz)
- 更新后的迷宫入口静态初态由 `build/editor-007-preview/receipt.json`、`verify-actions.json` 和 `runtime-applicability.json` 定位，分别保留编辑器动作、保存读回及侧车修改前后运行时摘要。先前四个步骤的实操范围归首轮原件，当前状态的适用性见逐步骤台账。 [编辑器重开与版本适用性原件](../../../../tasks/evidence/E2E-R4-1-hostile-script-applicability-20261106.tar.gz) · [首轮编辑器原件](../../../../tasks/evidence/E2E-007-1-island-entrance-20261105.tar.gz)

## Revision history

| 候选 | 日期 | 实际范围及结果 |
|---|---|---|
| `6b2a252984431d6866e68c1e38f3ea5424535836` | 2026-11-05 | 初次完成两端迷宫存读，Game 三场、Reforge 四场。该次差异及首次编辑器取证留在原时点。 |
| `6557d7c1832c920edb3fbb1719402a923797adf4` | 2026-11-06 | 奖励窗修后两端再次存读。作者对该次分屏回复「通过」，保留奖励窗验收。 [修后原件](../../../../tasks/evidence/E2E-007-1-settlement-layout-20261106.tar.gz) |
| `5bbc2e5de5af771862dc725d6799d5af357e0073` | 2026-11-06 | 首次同路双轨技术对照通过，更新编辑器迷宫入口静态初态时使用此轮首叶现场。 [同路及旧失败原件](../../../../tasks/evidence/E2E-R4-1-007-009-route-parity-20261106.tar.gz) |
| `743be436c70bf3519e1324ec356dafcf0f6d040a` | 2026-11-06 | 共享骑乘修复后，双轨重跑 007 并验证 008 实际接续。技术对照通过。用户在同日确认当前 28.12 秒分屏。 |
