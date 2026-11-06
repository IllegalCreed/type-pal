---
testingSchema: 2
id: e2e-009
evidence: e2e/evidence/e2e-009.json
---

<!-- testing-meta
{"schemaVersion":2,"id":"e2e-009","sourceRefs":[{"path":"scripts/e2e/fairy-island-pool-game.mjs","lines":"60-78","anchor":"readCheckpointInput(predecessorRef","role":"caller","sha256":"4e4b1577d09a7306ce1113bd01386553ae6470b246bc11ef36b643b2b6123370"},{"path":"scripts/e2e/fairy-island-pool-reforge.mjs","lines":"48-70","anchor":"await readCheckpointInput(","role":"caller","sha256":"7fe002a0b689c0f85385b9f7b11ed01f198e6956c4f094f5b09c4d2f28a8a48e"},{"path":"scripts/e2e/fairy-island-pool-route.mjs","lines":"5-63","anchor":"export function fairyPoolRoutes(engine)","role":"legal-input","sha256":"72e2215c6bc83ec4e07ba96bb9934130bb8ac58d6356ebe1b949436dc7fdbd28"},{"path":"scripts/e2e/fairy-island-pool-game-oracle.mjs","lines":"24-24","anchor":"export function assertFairyPoolGameStory(trace, report)","role":"oracle","sha256":"2d5c270f323ab84650de93f43699954beda51774a9efd61ec1cd0edae6e35f60"},{"path":"scripts/e2e/fairy-island-pool-reforge-trace.mjs","lines":"345-345","anchor":"export function verifyFairyIslandPoolTrace(trace)","role":"oracle","sha256":"d4d484689d4cedeba059e52d213f9d4ee4be3843b18ae679510a90505e8870a4"},{"path":"scripts/e2e/recompare-recording.mjs","lines":"33-47","anchor":"if (fragment === '009')","role":"caller","sha256":"f07159364c57d90d8a66ca017ab584a25c3d7a3b6a594a0a5271f764b9c516b1"},{"path":"scripts/e2e/fairy-island-pool-comparison.mjs","lines":"404-440","anchor":"export async function recompareFairyIslandPool","role":"oracle","sha256":"839de3e7c77ac8f536ecc78ebed9052e68fc92aa71f1a055b8d34858782ddee1"},{"path":"projects/pal/content/scenes/s016.json","lines":"119-119","anchor":"\"id\": \"e212\"","role":"authored-first-pool-entry","sha256":"a31e59355c283b58ceaf717ed7ac7f9bdf4b3ca7e0143d315259518bcd44ce84"},{"path":"projects/pal/content/scenes/s016.json","lines":"1144-1144","anchor":"\"id\": \"e213\"","role":"authored-return-trigger","sha256":"a31e59355c283b58ceaf717ed7ac7f9bdf4b3ca7e0143d315259518bcd44ce84"},{"path":"projects/pal/content/scenes/s016.json","lines":"4216-4216","anchor":"\"id\": \"e233\"","role":"authored-visible-pickup","sha256":"a31e59355c283b58ceaf717ed7ac7f9bdf4b3ca7e0143d315259518bcd44ce84"},{"path":"packages/content/src/character.ts","lines":"168-168","anchor":"export const CONTENT_VERSION = 22","role":"version","sha256":"8d3d592d75e78c9559986b5747e7b2395aaac010bf8dde9d6ea5f164bba29a93"},{"path":"packages/reforge/src/save/types.ts","lines":"9-9","anchor":"export const SAVE_VERSION = 12","role":"version","sha256":"b40e418803af9585d944f2a5f3c0229ea26494003f0aa08b12493ddb42605bc2"}],"publicCallers":["node scripts/e2e/fairy-island-pool-game.mjs --headless --verify --visual-review --from <Game-008-report>","node scripts/e2e/fairy-island-pool-reforge.mjs --headless --verify --visual-review --from <Reforge-008-report>","node scripts/e2e/recompare-recording.mjs 009 <Game-009-report> <Reforge-009-report> <new-output>"],"legalInputs":["各引擎用同候选的实际 008 verify 报告与正式 008.end.save.json，在桃花林恢复","以生产方向键、调查和对白确认完成两个独立触发，路线与实际移动提交同时校验","内容版本 22，Reforge SAVE12。Game 原生 F5 和 Reforge 公开 dumpSave 产出各自正式终档"],"businessOracle":{"type":"dual009-fairy-island-pool-journey-and-draw-parity","assertions":["三段实际方向提交分别为 70、144、25 步，两端逐步匹配","止血草实体 e233 领取后隐藏，物品 99 增一，原处复点无重复奖励","两次独立池塘入口之间恢复自由控制并走回池边，两端记录八雷，离场后仍在桃花林","按原盘 L_5240 的 48 步实绘核时长、镜位及两次淡入的旧对白清除","两端在剧情和离场完成后正式存档，新浏览器会话读回持久状态且池塘剧情不重播"]},"dedupe":{"result":"bounded-distinct","against":["e2e-008","e2e-009 首轮 bf3071ecb 录制","e2e-009 的单独编辑器初态验收"],"notes":"008 只提供合法输入。009 发布配对只认当前两条实跑，旧反例和原保存证据各保留本轮身份。"},"revision":{"currentSha":"743be436c70bf3519e1324ec356dafcf0f6d040a","contentVersion":22,"minimumSaveVersion":12,"history":[{"revision":"bf3071ecb048cdc3ab5eb6398e8acad359bcf50a","date":"2026-11-06","action":"original-dual-run-later-rejected-for-route-camera-and-dialogue"},{"revision":"8d9dcdbe29ba5e194bbcb8ff6caf43f6b352dd22","date":"2026-11-06","action":"shared-route-camera-dialogue-and-saved-editor-recheck"},{"revision":"5bbc2e5de5af771862dc725d6799d5af357e0073","date":"2026-11-06","action":"same-candidate-predecessors-and-unified-comparison"},{"revision":"743be436c70bf3519e1324ec356dafcf0f6d040a","date":"2026-11-06","action":"current-native-008-to-009-and-unified-recomparison","visualAcceptance":"pending"}]},"evidence":"e2e/evidence/e2e-009.json"}
-->

# 009 · 桃花林采药与池塘初遇

Status: rework
Owner: Codex
Last reviewed: 2026-11-06
Template: test-run-report-v1 / 1.0.0

## Scope

本报告记录候选 `743be436c70bf3519e1324ec356dafcf0f6d040a` 的 Game 和 Reforge 两次独立运行。工程内容版本为 22，Reforge 读取和写出 SAVE12。两端各从同候选的 008 正式终档恢复，经采草、查看池边衣裳、退开、重新走近触发雷击、求药和送别。停止线是灵儿离场且逍遥恢复操控，终档仍在桃花林。水月宫是后续片段。

实际前驱位于当前归档的 `build/e2e/<运行目录>/` 下。两端的 `report.json` 和 `008.end.save.json` 分别校验。

| 引擎 | 008 运行目录 | 008 报告 SHA256 | 008 终档 SHA256 |
| --- | --- | --- | --- |
| Game | `game-008-visual-review-2026-11-06T08-09-49-321Z` | `ece06bcfbfbdf4836edfa1ddb570ef9bcc9336cce407be7df5c2a7c3c3bb3c3b` | `d8729196511cbb1dc369d89d2f84d6b3f5caea6b3c14ddf48389eb2a776fd8fd` |
| Reforge | `reforge-008-2026-11-06T08-08-55-136Z` | `0be8697cde14bb9c8c4f3bcd34583e4e152ae1387c7029269788169db668394e` | `239a454be35b55aef08de070ffa072ef18b377d0ad11d3d4650da9702312ba80` |

## Execution and assertions

以两个引擎各自的 008 报告绝对路径复跑。第三条命令在真实录制上重新执行统一离线判定，原始报告绑定的 008 报告和终档须可读。

```sh
node scripts/e2e/fairy-island-pool-game.mjs --headless --verify --visual-review --from "$GAME_008_REPORT"
node scripts/e2e/fairy-island-pool-reforge.mjs --headless --verify --visual-review --from "$REFORGE_008_REPORT"
node scripts/e2e/recompare-recording.mjs 009 "$GAME_009_REPORT" "$REFORGE_009_REPORT" "$NEW_RESULT_JSON"
```

| 验收项 | 已记录的实际结果 |
| --- | --- |
| 同路步行和采草 | 方向键由两端生产输入处理。到药草 70 步、到池边 144 步、返回池边 25 步，逐步位置和方向均吻合。止血草在拾取前可见，拾取后隐藏，物品 99 增至一株。原处再次交互仍为一株。 |
| 第一次池塘演出 | 查看衣裳后触发 `e212`，角色退到 Game `[672,1216]`、Reforge `[97,55,0]`，面右并恢复自由操控，衣裳和沐浴实例隐藏。此后实际向右走 25 步才另触发 `e213`。 |
| 48 步镜头 | 原盘 `L_5240` 的三个操作数为 `(4, 2, 48)`。每步以原盘像素口径对照，首末实绘间隔为 Game 4699.3 毫秒、Reforge 4718.0 毫秒，两端均停在镜位 `[1136,1400]`。 |
| 换镜与对白 | 两次换镜分别关联 `dlg.1902` 和 `dlg.1905`。原盘对应重画点后两处旧槽为空。Reforge 的 476 和 133 次实绘均没有旧对白，包含后续淡入。 |
| 雷击、求药和离场 | 两端各记录八次雷击，Reforge 八次均绘出起始第 0 帧。灵儿说「你跟我来」后，逍遥先恢复操控，灵儿在 Game 约 5.70 秒、Reforge 约 7.43 秒后离场。等待离场期间保持站位，随后存档。 |
| 正式终档和新会话恢复 | Game 正常 F5 存档有输入与持久化应答，Reforge 通过公开存档接口导出。两端新浏览器会话读回各自完整持久状态。Game `[1056,1296]` 和 Reforge `[114,48,0]` 对应同一站位，面上，止血草一株，池塘剧情没有重播。 |

## Results

两个运行器均以退出码 0 正常结束。统一离线回执为 `passed`，零比较发现，零录制源差异。Game 先前的一次运行在走向池边时出现按键释放前的额外位移，路线守卫拒绝，退出码为 1。保留该轮原件，再用同一 008 终档和同一路线独立重跑。Reforge 的浏览器原件保留一条资源 404 和一条 Canvas2D 读回提示，两端的运行报告 `errors` 均为空。

脚本修订归并了相同步幅的闪避，删除沐浴、雷击和滑行中的 36 次同向重复写入。保留关键停顿、帧动作和离场折点。止血草作为大世界可见精灵拾取的共享脚本样本。已走过的现场按独立进度轴记录。[逐步骤台账](../../cross-stage/script-progress.md)

编辑器最初配置、原生保存和重开证明见原始包。候选 `8d9dcdbe29ba5e194bbcb8ff6caf43f6b352dd22` 在独立浏览器打开原生 OPFS 工程后，用已保存的侧车重验 9 个步骤、7 个雷击临时选择和 13 份初态的属性与反向引用。最新运行以 16 个首叶现场复核已记录的实体位置、朝向、显隐与状态，沿用原编辑器回执。预览初态的验收范围是实体静态字段。玩家、脚本游标、动态帧和控制权由运行原件记录。[编辑器复验原件](../../../../tasks/evidence/E2E-009-1-preview-applicability-20261106.tar.gz)

最新分屏保留实际游戏速度，左 Game、右 Reforge，先完成的一侧停在终点。129.4 秒录像已与本次报告和比较回执绑定，作者视觉验收待确认。机器结论覆盖本段剧情、取物与读档。视觉裁定及后续共享脚本工作见[009 任务卡](../../../../tasks/cards/E2E-009-1-fairy-island-pool.md)。

## Evidence

- [当前双轨归档](../../../../tasks/evidence/E2E-008-1-mounted-pose-recheck-20261106.tar.gz) SHA256 `e45bce10751d3c7f8acac8acd1c6de6c1f8b177127f28cd5af02ea12aed3b0a9`。当前统一回执为成员 `build/e2e-rework/009-mounted-pose-final.json`，SHA256 `f15f721632069cea6dfacb671f6ec0f75ea88422e63f30c925421d62764154dc`。
- Game 运行目录 `build/e2e/game-009-visual-review-2026-11-06T08-16-03-954Z/`，终档 SHA256 `6c5e96f596f0dd1af07c898a6aeb75cde08c42afb5549709cc4211664ffb0804`。Reforge 运行目录 `build/e2e/reforge-009-2026-11-06T08-12-33-464Z/`，终档 SHA256 `bed3d82a761659a5132f47eb56e0118a51771789f11dabb0f03298b00dacb9d7`。每端的报告、故事轨迹和新会话恢复轨迹分别固定到[机器回执](../../evidence/e2e-009.json)。
- 当前分屏为本地 `build/e2e-rework/review-009-mounted-pose/009-game-reforge.mp4`，SHA256 `db199f27362d57ca33345c2595525fb0b402f423e4b4f2925b2828e5bc50c002`。归档同目录的 `review-media.json` 和 `alignment.json` 保留源录像哈希、起步对齐与裁切范围。分屏仅含视频轨。
- [同路返工归档](../../../../tasks/evidence/E2E-R4-1-007-009-route-parity-20261106.tar.gz) 的 `build/e2e-rework/009-old-integrated.json` 保留三项旧行为反例。[首轮原件](../../../../tasks/evidence/E2E-009-1-fairy-island-pool-20261106.tar.gz) 保留原始运行、演出正文差异和初态保存操作。

## Revision history

| 候选 | 日期 | 执行与后续裁定 |
| --- | --- | --- |
| `bf3071ecb048cdc3ab5eb6398e8acad359bcf50a` | 2026-11-06 | 首轮两端走通并读回。采草后第一步就分路，Reforge 旧平移 779.8 毫秒，两个换镜窗口均出现旧对白。统一判据拒绝了三项旧行为。 |
| `8d9dcdbe29ba5e194bbcb8ff6caf43f6b352dd22` | 2026-11-06 | 采用同一路线并校正镜头节拍和两处对白清除。两端技术对照通过，独立编辑器重开已保存初态。 |
| `5bbc2e5de5af771862dc725d6799d5af357e0073` | 2026-11-06 | 两端从同候选 008 终档重跑，沿统一入口复核路线、镜头和对白。 |
| `743be436c70bf3519e1324ec356dafcf0f6d040a` | 2026-11-06 | 骑乘定姿修订后，用最新 008 实档再次跑通。当前分屏与本轮技术原件配对，视觉裁定待作者复看。 |
