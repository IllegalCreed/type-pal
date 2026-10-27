---
testingSchema: 2
id: e2e-006
evidence: e2e/evidence/e2e-006-current.json
---

<!-- testing-meta
{"schemaVersion":2,"id":"e2e-006","sourceRefs":[{"path":"scripts/e2e/boat-game.mjs","lines":"470-470","anchor":"await runBoatGame()","role":"caller","sha256":"41f461a4be8afb64e56daaee7004caa14fb7fbafd75794bcfa8abf04fa020eb4"},{"path":"scripts/e2e/boat-reforge.mjs","lines":"3-3","anchor":"await runBoatJourney","role":"caller","sha256":"d5c648a90e22617c1d16b97964f3539c22625cc68836e5194c23802c0dd14b43"},{"path":"scripts/e2e/boat-journey.mjs","lines":"29-29","anchor":"export async function runBoatJourney(","role":"caller","sha256":"aa640d058b5897c314330fe0069fb25f4c8514f6a9cc9a07370decd5f960a649"},{"path":"scripts/e2e/boat-delivery.mjs","lines":"21-21","anchor":"export async function deliverBoatCheckpoint(","role":"persistence","sha256":"34814eb48d16a35e750b8df594ac130a818b73072cf777a1552b9b523e3e5570"},{"path":"scripts/e2e/boat-checkpoint-contract.mjs","lines":"14-14","anchor":"export async function checkBoatCheckpoint(","role":"oracle","sha256":"19270786e49abdfc13b061abf274a715c3755edbf56a94732696992196d126c1"},{"path":"packages/content/src/character.ts","lines":"168-168","anchor":"export const CONTENT_VERSION =","role":"version","sha256":"8d3d592d75e78c9559986b5747e7b2395aaac010bf8dde9d6ea5f164bba29a93"}],"publicCallers":["node scripts/e2e/boat-game.mjs --from <same-engine005/report.json>","node scripts/e2e/boat-reforge.mjs --from <same-engine005/report.json>","node scripts/e2e/boat-both.mjs --game-report <game006/report.json> --reforge-report <reforge006/report.json>"],"legalInputs":["Actual same-engine001–003 then004/005 saves chain; no injected scene or forged digest","Current content22, Reforge SAVE12; naming changes labels only","Normal Game F5/public Reforge dumpSave at completed006; fresh context consumes actual persisted JSON"],"businessOracle":{"type":"dual006-story-persistence-and-static-preview","assertions":["95 dialogue rows and complete island1886/1888/1889/1890, clear dialogue and return control at Game15/RF s014","Byte-bound whole story/timing/ride/draw comparison has zero findings","Formal terminal save and fresh-context restore match the complete persistent state with actual input/ack or restore commit and no arrival replay","12 saved static NPC entry bindings/11 states survive public Save As/Open and actual Play/Reset","Silent actual boat clips support separate user visual review; no audio, full runtime preview, continuous or downstream credit"]},"dedupe":{"result":"bounded-distinct","against":["e2e-005","historical e2e-006 d022 publication","2026-10-26 partial closeout"],"notes":"005 establishes real inputs; old receipt identity is immutable. Current terminal save, fresh restore and static editor persistence are distinct; no004 items/005 guards/continuous regrant."},"revision":{"currentSha":"c68d369869dce63cb884e2203dab2b9e53f65e2f","contentVersion":22,"minimumSaveVersion":12,"history":[{"revision":"d02278dc0154dd73b5db24388a35c30bb096cc81","date":"2026-10-04","action":"source-and-publication-audit","notRun":["runtime","E2E","coverage"]},{"revision":"c68d369869dce63cb884e2203dab2b9e53f65e2f","date":"2026-10-27","action":"actual-dual006-terminal-save-fresh-restore-and-static-editor-persistence","verificationRevision":"01739e2078fed2ab9822a0fdf46032ab8410b560","independentAcceptance":"pending","notRun":["004 items","005 guards","001–006 continuous run","product unit suite","coverage","audio acceptance"]}]},"evidence":"e2e/evidence/e2e-006-current.json"}
-->

# 006 · 回客栈求药与张四出海上仙灵岛

Status: rework
Owner: Codex
Last reviewed: 2026-10-27
Template: test-run-report-v1 / 1.0.0

## Scope

下述主体记录冻结525候选的前轮006技术复验；起伏反例与后续修复另列，不沿用旧0finding代表本轮视觉通过。前轮两端006：两端正常消费各自真实005 saves，确认求药至仙灵岛叮嘱结束，再保存正式终档并在全新浏览器上下文读回。执行来源`c68d369869dce63cb884e2203dab2b9e53f65e2f`，核验工具/另存反馈修复另绑定`01739e2078fed2ab9822a0fdf46032ab8410b560`，不把后提交倒签为执行来源。只止于Game scene15/RF s014，不进水月宫或破阵。

原`e2e-006.json`整个文件字节不变，catalog保留其完整SHA/原状态/原候选，另配当前execution回执。当前rework、lastVerified10-03、reviewBy11-02不因作者自验改变，本次没有再次延期。

## 2026-10-27 用户视觉反例与受影响域复验

用户查看原短片确认二阶段船体划行失去起伏，视觉仍rework。根因是ride暂停旧auto定帧并制造静态精灵的走路gait，遮盖独立动作。当前作者船页复用已有起伏pose；载具平移保留外观权威，运输槽活动时页动作可前进，普通脚本接管/走路和auto脚本暂停规则保留。旧船身auto及其独占预览入口删除，原12/11入口证据只属前轮。

新运行来源`0847b1a6e43fbd3cd189e9f3201ceb53e527d1bb`，报告`build/e2e/reforge-006-2026-10-27T05-14-20-236Z/report.json`（SHA `af1da1240578f8e45e837eac168a17e76d020273fa1ef0fcf10bd734fe0d9faf`）。同引擎001–005 saves正常重建后006完成95条正文、控制返回、正式终档和新上下文恢复；SAVE12完整持久域与恢复帧相等、岛口不重播。实际划行71条船体实绘、0/1两帧切换6次；原资源两帧像素不同，挂载相对偏移不变。只新增RF当前复验，未重跑Game、未宣称新同版双轨全比较。

原速新短片：boat-bob证据包`reforge-boat-bob-fixed.mp4`（原录像65秒起裁36秒、无声、无合成），源原件位于新报告目录。沿用既有现行machine回执的前轮身份；不把它改写成新执行，不刷新出版日期、lastVerified或验收状态。用户2026-10-27查看新短片回复“没问题了都”，所展示的006船行/起伏/划桨/落地视觉通过，起伏counter关闭；技术非作者核验与全仓门仍开放。此裁定只绑定候选`c32eccdb544b5f01424e30725db7373e283b9343`及原短片SHA `5230f4d6522a266b4d928894f5b0904e06c5465a270ca17ed532a7ca435cfa63`，不重跑或倒签技术证据。

49+112项RF相关回归、13另存回归、两包typecheck、405 E2E工具和内容检查通过。新报告明确保留缺失HTTP save-state的404观察；生产构建exit0有chunk体积warning，未称全门零诊断。源码/真实回执/原始失败与71条绘制的复算集中保留，不复制第二套运行账本。

## Execution and assertions

| 义务 | 实际结果与边界 |
|---|---|
| 合法输入 | 名称改变digest后001/002/003与004/005 saves按公开入口正常重建；不改旧档、不注入场景，不重授004 items/005 guards/连续演示。 |
| 剧情与控制 | 两端95条正文和说话人、洪大夫/小虎首次与两次复读/头领指引/张四登船及1886/1888/1889/1890完整确认通过；对白清空、控制返回才结束。 |
| 全比较 | passed，0 finding、storyTiming.errors=[]、两storyProofs proved；实际draw/pose/资源/节拍、boat/rower、两段ride终点及自动替换/移交因果逐项重算。 |
| 正式终档 | Game正常F5 slot1真实input/ack；RF公开dumpSave为SAVE12/content22。两份006.end.save.json均在全新上下文正常restore，完整持久域相等、岛口不重播；两checkpointProofs proved。 |
| 名称 | 12真实入口涉及23处用途label补齐；四场景剥label后深相等，ID/指令/next不改，不扩称范围外泛名已治理。 |
| 编辑器 | 从真实pre-command pose取11状态供12绑定，158项NPC投影复算。真实另存2474文件后preview字节相等、File/Open重开、12入口逐一Play/Reset通过。只核NPC位置/高度/朝向/显隐/碰撞与canonical zBias，不承诺玩家/cursor/authority全现场；循环脚本只核启动重置。 |
| 另存反馈 | 接入真实阶段/文件数/字节，未知总量不显示假百分比；21相关回归及typecheck通过，小项目实际UI16/100后提交。大项目138.6MiB串行保存慢仍为性能观察，不声称吞吐已优化。 |

Game终档SHA `f7fcd30690bbef4a5aa60db73b5d1672f98adef80f7de2ed84c6397ff0798d5d`；RF `5dc166438471aeaacaf731ff82b0df71d616a0a9606b19e3fb3aca3e2cdbc50e`。Game保存/恢复截图岸边动画区域有非持久差异，不称全帧相等；完整持久域与角色区域分轴。RF整帧相等，原图保留。

## Results

旧“没有正式终档／泛名未补／未另存重开”由本轮实际产物替代。作者Codex不自签独立验收；用户已对修复后短片确认006视觉通过，裁定见前节；raw/数学/实绘证明不代用户判断。保持rework、不合main、不推送、不标done；全docs严格待办与产品/coverage/音频/连续演示不借此转绿。

## Evidence

- Game `build/e2e/game-006-2026-10-27T00-43-43-197Z/report.json`；RF `build/e2e/reforge-006-2026-10-27T00-43-43-972Z/report.json`。正式档、故事trace、保存delta、新上下文restore trace分开保留，不把保存动作塞入故事scope。
- 全比较 `build/e2e/both-006-2026-10-27T01-06-28-897Z/comparison.json`。E2E工具405/405；新增离线反例只证消费者判别力，不冒充产品反控；旧测试未改。
- 实际静音短片 `build/e2e/006-visual-review-20261027/game-boat-and-arrival.mp4`、`reforge-boat-and-arrival.mp4`，原始视频65秒起截取、原速、无合成帧，非capture-ready/音频验收。
- 持久原件 `build/evidence-archive/e2e006-20261027/e2e006-20261027.tar.gz`，SHA `25b6587094406374d3ffa26a8af3d508a0e86fd4d8dcb79bbe2740e4076cea66`，346成员逐件读回；源路径/恢复位置见inventory。旧10-26归档完整保留。
- [当前回执](../../evidence/e2e-006-current.json)、[历史回执](../../evidence/e2e-006.json)、[阶段入口](README.md)、[catalog](../../../catalog.json)、[任务卡](../../../../ops/tasks/E2E-006-1-inn-doctor-and-boat-to-island.md)配对。

## Revision history

2026-10-27：实际双轨006、正式终档/新上下文读回、用途命名、NPC静态预览的另存/重开/Play/Reset与真实另存反馈。旧native整个文件不改。10-26局部正文可在固定base `e5e5eb9ffcc223d06aa89b5f57e0a90be6fd6f7c`读取，旧失败不追溯改绿；独立/用户视觉待分别裁定。

2026-10-16：内容迁移经非作者receipt_review独立accept、根Codex接收。原 frontmatter/testing-meta 字节不变；以下完整保留原报告正文，仅 ATX 标题降两级以置于本历史节，未删除日期、失败、旧质量计数或反证。下方“当前”“正在执行”“待生成”等词仅指原日期，不指本次治理。新章节明确 state2/state3、偏移口径、首句撤信及不同冻结批次的边界；不静默改写旧结论。


2026-10-10 当前 caller 核读：006 仍消费真实 005 saves；e123 恢复值现在精确断言 primary state2。boarding artifact 与 interval 共用 island-arrival 的实际 route start；末 draw 与真实两条 ride leg 的 settlement/completion 分开验证。当前单轨诊断正在执行，正式双轨及视觉验收尚未收口。

2026-10-09 工具补强源码核读：刷新当前caller/采集/判定锚点与hash；统一容量锚点移至evidence-recorder。只更新文档源码绑定，不改历史revision、版本、执行结论或raw。本轮尚未冻结补录，进度见E2E-CONTINUOUS-001-006任务卡。

2026-10-08 源码核读更新：核对本页现有 caller、输入、采集和断言锚点后刷新 sourceRefs 哈希；只更新文档源码绑定，不修改历史 revision、版本、实跑结果或原始日志。本轮工具补强尚未冻结，未补录剧情或执行连续演示；当前进度及剩余项以 E2E-CONTINUOUS-001-006 任务卡顶部为准。

### 006 · 回客栈求药与张四出海上仙灵岛

2026-10-06 SAVE12 源核验：当前版本常量为 content22 / minimumSave12，源文件 SHA 以本次核读的集成工作树为准；revision / candidateSha / versions / history 与既有 runtimeExecution 仍记录原核读或实跑，不升级为 SAVE12 通过。本次未执行运行时、E2E 或覆盖率；新 SAVE12 的 001–006 独立双轨及连续链仍待生成和验收。 已核本页公开执行入口与现有断言职责；本步仅刷新版本源，不新增阶段覆盖或重算旧实跑结论。

2026-10-06：重新核读本页 sourceRefs 的实际 caller、合法输入及断言，并更新当前工作树的哈希/行号。此项只是源码证据刷新，不把历史执行升级为当前全量通过；本轮独立录制、帧差异与连续验收状态统一见 E2E-CONTINUOUS-001-006 任务卡。

#### 2026-10-05 双轨独立实跑与对比

真实入口是 `node scripts/e2e/boat-game.mjs` 与 `node scripts/e2e/boat-reforge.mjs`，两者都从各自当前 005 saves 真实读档开始。本轮按“独立通过 → 独立对比 → 再串联”门禁执行；串联尚未开始，rework 继续保留。


#### 已确认范围

005 报信结束 → 回客栈 s002 → 洪大夫自动诊断 → 小虎子首次对白及两次复读 → 穿过走廊触发苗人头领求药指引 → 回码头找张四 → 走到船边 →
载入 s014 仙灵岛，完成 `dlg.1886/1888/1889/1890` 的落地对白并恢复控制后停止，不进入水月宫、破阵或岛上后续。2026-10-07用户指出旧停止点缺陷后，已撤销“首句出现即证明完整006结束”的信用；下方历史报告原样保留，当前补验与连续结果见连续任务卡。

#### 当前双轨独立实跑

两轨前置均为当前 SAVE11/content22 的真实 001→005 saves 链。

- 第一阶段：`build/e2e/game-006-2026-10-04T18-44-27-288Z/`，`status: passed`。
- Reforge：`build/e2e/reforge-006-2026-10-04T19-17-06-374Z/`，`status: passed`。

已通过的语义检查：

- 洪大夫在进入触发区后自动开始；小虎子正文分首次、复读1、复读2三次交互。
- 洪大夫结束后，s005/e123 张四切换到 `legacy-002` 并恢复 `state:3`。
- 张四对白结束后，玩家正常移动到 e116 船只触发区，载入 s014。
- 两轨都实际渲染了苗人头领 366–419 的完整求药对白，并在靠近出口时继续出城。
- 第一阶段船段运动日志 `006-boat-motion.json`：队伍与 e116 的相对偏移为 `[-2,-4]`，骑乘朝向为 `up`。
- Reforge 船段运动日志：队伍与 e116 的相对偏移为 `[0,0]`，骑乘朝向为 `down`。

#### 独立轨迹对比

比较产物：`build/e2e/both-006-2026-10-04T19-18-45-307Z/comparison.json`，状态为 `passed`。

- 两轨主角承载锚点均为 `[-2,-4]`，骑乘朝向均为 `up`，e117 船夫相对偏移均为 `[-2,2.25]`；用户指出的船外、漂移、朝向问题已由显式 rider mount 和朝向编排修复。
- 完整 actor state/frame trace 已分别落盘为 `006-state-trace.json`，比较无 evidence-gap。

#### 当前未闭合项

- 第一阶段与 Reforge 同节点截图均显示李逍遥在船内、张四随船移动；划桨动作按资源帧保留，不把单帧截图冒称逐帧验收。
- 正式存档只有李逍遥一名队员，不能把本次日志扩大成“三名队员朝向”验收。
- 006 活跃实体 e35/e36/e116/e117 的方案/步骤仍需按剧情用途补齐名称；不能保留默认“触发行为/自动行为”作为最终作者语义。

#### 对照与整改门

第一阶段原始锚点：`data/extracted/events/all.json` 的 `L_1026/L_1070/L_1465/L_1509`；其中 L1070 对应苗人头领求药段，L1509 对应队伍走位、0x15 朝向、0x3F 骑乘和 scene15 切换。
Reforge 只复用剧情/UX语义，不复制旧引擎内部结构；但关键 NPC 的状态、位置、朝向和显隐必须有当前两阶段各自日志，缺任一项即保持 rework。

脚本合理化记录：

- 本段改进：e35 显式安装张四后继；e36 删除会重播003的无关跨场景回置；船只触发保留为显式交互/移动链。
- 保留：张四对白后正常走到船边；不把“说走吧”改成瞬移上船。
- 后续能力建设：关键实体日志合同、第一阶段 006 适配器、船体/人物资产锚点与划桨动作。
- 待产品/视觉复核：船上人物相对布局和动作观感。

#### 质量证据

- `pnpm check:content`：294 场景 / 223 地图 / 1934 资源通过。
- `pnpm check:docs`、`pnpm lint`：通过，lint 3131 文件零诊断。
- 根 `pnpm check` 的历史存量失败仍为 migrate `dlg.2074` locale 缺口；不归因于本段。
