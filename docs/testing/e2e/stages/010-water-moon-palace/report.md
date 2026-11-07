---
testingSchema: 2
id: e2e-010
evidence: e2e/evidence/e2e-010.json
---

<!-- testing-meta
{"schemaVersion":2,"id":"e2e-010","sourceRefs":[{"path":"scripts/e2e/water-moon-palace-game.mjs","lines":"61-67","anchor":"readCheckpointInput(predecessorRef, 'game', '009')","role":"caller","sha256":"6b8f47223414c90139d08762862d101ea0e428fa1fe443db7bdbe09022834d46"},{"path":"scripts/e2e/water-moon-palace-reforge.mjs","lines":"68-77","anchor":"} = await readCheckpointInput(","role":"caller","sha256":"673cac6ab503d979dec6ba6f824d3ef6db93bbc584e5d1bca610ff316f7e9283"},{"path":"scripts/e2e/recompare-recording.mjs","lines":"46-49","anchor":"if (fragment === '010')","role":"caller","sha256":"7425f57f441bc43f362ee88bb6a38e181af3fdd7fc6ce4484b41ff3787265cd7"},{"path":"scripts/e2e/water-moon-palace-comparison.mjs","lines":"516-529","anchor":"export async function recompareWaterMoonPalace","role":"oracle","sha256":"26d687d586111c84f385f9309cef0ecf998a67f07036e95ac1355de71a252c21"},{"path":"scripts/e2e/water-moon-palace-route.mjs","lines":"88-92","anchor":"export function waterMoonPalaceRoutes","role":"input","sha256":"9a841a8852326fb7ac7364707c664e7538bc9dd37b7becf7a1cc5881329da034"}],"publicCallers":["node scripts/e2e/water-moon-palace-game.mjs --headless --verify --visual-review --from <Game-009-report>","node scripts/e2e/water-moon-palace-reforge.mjs --headless --verify --visual-review --from <Reforge-009-report>","node scripts/e2e/recompare-recording.mjs 010 <Game-010-report> <Reforge-010-report> <new-output-json>"],"legalInputs":["Game 接续已发布的同引擎 009 实际报告及终档，Reforge 以现行内容重建同引擎 009 报告及终档。","同一份真实走格序列，使用生产方向键、调查键和对白确认。四次独立开箱依次执行。","内容 22，Reforge SAVE12。正式 Game F5 保存和 Reforge 原生保存导出后分别在新会话读回。"],"businessOracle":{"type":"dual010-water-moon-palace-route-render-and-restore","assertions":["两端六段实际方向及落点序列为 48、33、26、51、51、70 步。","宫外引路一帧朝右，清除旧对白后向上行走 14 步，前 13 步可见，末步同帧隐藏。","四次独立调查箱子依次取得三张观音符、看到空箱、从箱底取得苗刀和确认无物。首次开盖后保持开启，提示都自动清除。","灵池确实触发恢复体力与真气的指令。正式起点满值，非满值效果另取独立样本。","完成 16 页交药、实际获得一颗紫金丹并恢复操控，灵儿实际绘制向下且在独立读档后维持。","两端宫内新会话读回同一端的正式 010 终档并保持操控。"]},"dedupe":{"result":"bounded-distinct","against":["e2e-009","010 旧候选实跑","010 非满值饮水诊断","010 单独保存和重开的编辑器验证"],"notes":"009 提供合法前驱。当前双轨、旧失败、机制诊断、静态预览和用户分屏各自记录执行范围。"},"revision":{"currentSha":"5af4380bcab0e9d412f874e5bae7c7ce88e68c13","contentVersion":22,"minimumSaveVersion":12,"history":[{"revision":"e86265cf5d8499487e96293d2ad4c42631cdc141","date":"2026-11-07","action":"prior dual run rejected for rendered pellet-scene facing"},{"revision":"5af4380bcab0e9d412f874e5bae7c7ce88e68c13","date":"2026-11-07","action":"native dual 010 with fresh restores, offline comparison and separately verified editor preview"},{"revision":"5af4380bcab0e9d412f874e5bae7c7ce88e68c13","date":"2026-11-07","action":"user-accepted-current-split-screen","visualReview":{"result":"accepted","quote":"010通过，先把这段收口吧。","clipSha256":"3b15e8b1bc90d02a80e5aa429b4a6b593fef219c355fa574b2e06a6ab9de3c8a","seconds":73.2}}]},"evidence":"e2e/evidence/e2e-010.json"}
-->

# 010 · 水月宫取苗刀与紫金丹

Status: verified
Owner: Codex
Last reviewed: 2026-11-07
Template: test-run-report-v1 / 1.0.0

## Scope

候选 `5af4380bcab0e9d412f874e5bae7c7ce88e68c13`，内容 22，Reforge SAVE12。Game 接续已发布的 Game 009，Reforge 接续当前内容重建的 Reforge 009。两端从桃花林经宫外引路进入水月宫，四次调查宝箱、饮水、完成赵灵儿交药后，在宫内恢复操控、保存并读回。后续门口事件 `e348` 留给接续片段。[前驱 009](../009-fairy-island-pool/report.md)

## Execution and assertions

```sh
node scripts/e2e/water-moon-palace-game.mjs --from GAME_009_REPORT --verify --visual-review --headless
node scripts/e2e/water-moon-palace-reforge.mjs --from REFORGE_009_REPORT --verify --visual-review --headless
node scripts/e2e/recompare-recording.mjs 010 GAME_010_REPORT REFORGE_010_REPORT NEW_OUTPUT_JSON
```

Game 和 Reforge 各以自己的实际输入报告、终档和新会话轨迹留证。离线复验读取两份原报告及其绑定字节，按 279 次真实方向提交比对，六段为 48、33、26、51、51、70 步。绝对路径、前驱报告 SHA256、命令和附件在机器回执和归档索引内。复验前按索引还原工作树路径和四个外部 Game 009 成员，以复用原报告字节。[机器回执](../../evidence/e2e-010.json)

## Results

| 核验 | 实跑结果 |
| --- | --- |
| 宫外引路 | 灵儿先朝右一帧。末句清屏后向上移动 14 个世界步，前 13 步可见，最后一步同帧隐去。 |
| 苗刀箱 | 四次各按一次调查。先开盖取三张观音符，再看空箱，第三次从箱底取苗刀，最后确认无物。后续实绘保持开盖，四次提示均自动清除。Game 为 1398.7、1398.5、1398.9、1398.2 ms，Reforge 为 1415.4、1418.7、1416.8、1417.3 ms。 |
| 灵池 | Game `L_4226` 和 Reforge 对应入口实际执行恢复。正式起点已满，前后为体力 150、真气 100。独立 Reforge 样本以实际饮水从 93/59 恢复到 150/100。 |
| 紫金丹 | 对齐 16 页和一颗紫金丹入包。灵儿首次交药朝下绘制，演出末帧和新会话仍保持朝下。 |
| 正式终档 | Game 场景 21 像素 `[1152,960]`，Reforge `s020` 网格 `[96,24,0]`，均面左。通过各自原生存档入口持久化，并在新会话读回和确认宫内可操控。 |

编辑器另核对 10 个入口和 21 处静态实体前态。两份状态及引用由原生工程保存，独立浏览器重开、跨场景播放和复位通过。苗刀箱第 2–4 次的单独预览开盖帧仍待核，实际游戏录像与原始轨迹已观察到开启帧。[逐步骤台账](../../cross-stage/script-progress.md)

用户于 2026-11-07 确认「010通过，先把这段收口吧。」。确认所用分屏为 73.20 秒，SHA256 `3b15e8b1bc90d02a80e5aa429b4a6b593fef219c355fa574b2e06a6ab9de3c8a`。分屏左侧为 Game，右侧为 Reforge，使用本候选两段实际录制，原件指纹在本轮归档的 `build/e2e-010/review/review-media.json`。[任务卡与用户验收记录](../../../../tasks/cards/E2E-010-1-water-moon-palace.md#分屏验收)

## Evidence

| 引擎 | 010 原始运行目录 | 009 输入存档 SHA256 | 010 终档 SHA256 |
| --- | --- | --- | --- |
| Game | `game-010-visual-review-2026-11-06T15-42-59-241Z` | `6c5e96f596f0dd1af07c898a6aeb75cde08c42afb5549709cc4211664ffb0804` | `e8635faf8d3d6c190bb9632d50dcffc85751580647f0feaba6d324e8f0a14f22` |
| Reforge | `reforge-010-2026-11-06T15-51-07-133Z` | `1890f720f918ce94cd2d55327b91849a8098e3a68245db2c9863f9e8340b5db0` | `bde8255e09c36e713f1dec7305638add36e017c334b6272d17c1d8804fb5f516` |

本轮固定归档 SHA256 为 `a35936ee66779420ed850c669ecbd0d0ff873eb05d90b975a38deb592521ba34`。其中 `build/e2e-010/archive-index.json` 枚举原报告、轨迹、新会话、终档、编辑器证据、离线结果、旧反例和外部输入的恢复位置。当前离线结果是 `build/e2e-010/acceptance.json`。录像文件留在原工作树，归档保留其素材映射和指纹。[本轮固定归档](../../../../tasks/evidence/E2E-010-1-water-moon-palace-20261107.tar.gz)

Game 009 正式报告、终档及两份绑定轨迹从前轮固定归档恢复。Reforge 009 本轮重建的原报告、轨迹和终档在本轮固定归档内。[Game 009 前驱归档](../../../../tasks/evidence/E2E-008-1-mounted-pose-recheck-20261106.tar.gz)

## Revision history

- 2026-11-07，前轮在宫外引路转身、走位、旧对白和开箱等待处有反例。后续候选 `e86265cf5` 还遗漏了宫内灵儿交药时的朝下绘制，原始实跑和离线失败回执均保留。
- 2026-11-07，候选 `5af4380bcab0e9d412f874e5bae7c7ce88e68c13` 双轨实跑和独立新会话读回通过。离线复验分别判定清屏和还权，另以保留的旧候选核反控。
- 2026-11-07，登记用户对该候选 73.20 秒分屏的确认，保持三处单独预览开启帧的待核记录。[机器回执](../../evidence/e2e-010.json)
