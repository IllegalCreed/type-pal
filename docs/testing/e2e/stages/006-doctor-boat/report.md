---
testingSchema: 2
id: e2e-006
evidence: e2e/evidence/e2e-006.json
---

<!-- testing-meta
{"schemaVersion":2,"id":"e2e-006","sourceRefs":[{"path":"scripts/e2e/boat-reforge.mjs","lines":"3-3","anchor":"await runBoatJourney","role":"caller","sha256":"d5c648a90e22617c1d16b97964f3539c22625cc68836e5194c23802c0dd14b43"},{"path":"scripts/e2e/boat-journey.mjs","lines":"23-40","anchor":"export async function runBoatJourney(","role":"caller","sha256":"fc976aa809bfca929ec6f09d81cd8b10e16339d2b270b6660e08ff90d30990f4"},{"path":"packages/content/src/character.ts","lines":"168-170","anchor":"export const CONTENT_VERSION =","role":"version","sha256":"8d3d592d75e78c9559986b5747e7b2395aaac010bf8dde9d6ea5f164bba29a93"}],"publicCallers":["node scripts/e2e/boat-reforge.mjs"],"legalInputs":["current SAVE12/content22 001→005 chain","normal movement to boat","current phase1 and reforge NPC logs"],"businessOracle":{"type":"rework-gated-boat-entry","assertions":["Reforge route reaches s014","all island closing dialogue is confirmed and control returns","two-stage key NPC logs exist","boat anchor/action/landing visual evidence closes rework"]},"dedupe":{"result":"reviewed","against":["e2e-005","historical 001–005 reports"],"notes":"历史链不能替代当前 006 两阶段证据；缺失项显式保留。"},"revision":{"currentSha":"d02278dc0154dd73b5db24388a35c30bb096cc81","contentVersion":22,"minimumSaveVersion":11,"history":[{"revision":"d02278dc0154dd73b5db24388a35c30bb096cc81","date":"2026-10-04","action":"source-and-publication-audit","notRun":["runtime","E2E","coverage"]}]},"evidence":"e2e/evidence/e2e-006.json"}
-->

# 006 · 回客栈求药与张四出海上仙灵岛

Status: rework
Owner: Codex
Last reviewed: 2026-10-26
Template: test-run-report-v1 / 1.0.0

## Scope

2026-10-26按用户要求复核006出版过期并补验实际缺口。出版状态仍为rework，`lastVerified`仍为10-03；顶部testing-meta与配对JSON原生字段仍是`d02278dc`/content22/SAVE11的历史身份。下述新执行从本分支base `14e0336fe045d038a29ab773acaa639696d31ea8`及真实工作树输入产生，各report的依赖SHA绑定实际字节，不冒称在未来提交上运行，也不刷新旧raw或旧SHA。

## Execution and assertions

| 本轮范围 | 实际结果与边界 |
|---|---|
| 必要前驱 | 当前001/002双轨执行与比较通过；003双端独立通过，修正提取标签元数据后离线比较0 finding；004/005仅两端saves通过，正常生成同引擎真档，RF为SAVE12/content22。未重授004 items/005 guards全套或连续演示信用。 |
| 求药到出海 | 两端公开boat入口均passed，95条正文及说话人、洪大夫/小虎首段及复读/苗人头领/张四/船边正常路线、e123当前state2及方案后继均由真实采集核对。两端`006-state-trace.json`、`006-trace.json`保留实际NPC状态/方案/控制权/位置/朝向变化。 |
| 船与落地 | 船运动专项passed，实际party offset两端均[-2,-4]、rower offset[-2,2.25]，71/72运动样本分别留原值；actual draw/rider归一化与普通逻辑facing分轴，不能把Game up/RF down字段直接称视觉差异已闭合。1886/1888/1889/1890全部确认，清空对话并返回控制后结束s014。 |
| 全比较 | 最新离线比较`passed`，0项finding；storyTiming错误为`[]`。最初15项红及后续每轮原件均保留，不改旧输出。 |

工具根因与修复限证据消费：①依赖扫描曾把合法`?worker&url`当文件名，首轮Game启动前红保留；现在纳入worker及传递源码，未知query/越界仍拒。②原始SSS735/737两条0x14已带L_735/L_737标签，补齐期待对象的这两个元数据，六条原始opcode/operands未改。③等待到期同帧的自动方案替换须有真实selectEntityBehavior、完成、旧activation取消、旧gate拒绝和新run，不能当换场景取消。④第一段慢走在触发前已到精确目标时允许真实settled；后段仍须取消prefix，要求完整步进/到达/最新pose/实际draw。没有加入ID豁免、时间容差、忽略项或产品源码修改。新IO夹具只证检查器判别力，不冒充产品反控。

## Results

2026-10-26：当前两端006独立路线及95条正文/完整上岛收尾通过；最新离线全比较passed（0项finding），船只专项通过。编辑器初态、命名与正式006checkpoint仍按下列范围待核，整段保持rework。

未完成义务：正式006 save/checkpoint与fresh恢复未产生（`006-end.json`只是终态观察）；方案/步骤仍有“默认触发行为/步骤1”等泛名，未以命名改动刷新content digest；完整划桨/船锚/落船位观感未由四张静态截图替代；编辑器12入口的完整上下文与保存重开/播放逐入口验收按下面边界执行。任一未闭合即不标done、不合main、不推送，不授下游前驱或覆盖率信用。

编辑器已真实打开s002/e35：场景默认医生hidden=true、collide=false，而本轮真实执行前为visible=true/state2，故“未配置”不是“已核正确”。从实际run-started前pose提取12个稳定入口；当前状态库支持NPC位置/高度/朝向/显隐/碰撞，可配置10套显示初态供12入口绑定。它不表达玩家位置、numeric entityState、行为cursor、固定帧/动作、authority/暂停auto或未观测的动态zBias，不能把字段投影宣称完整现场恢复。正式配置与UI逐入口结果以本轮`preview-projection-audit.json`及UI原件为准；未实查项不得标“场景默认已核”。

## Evidence

- 新Game：`build/e2e/game-006-2026-10-26T13-01-49-753Z/report.json`；新Reforge：`build/e2e/reforge-006-2026-10-26T13-01-50-549Z/report.json`。各目录有`006-state-trace.json`、`006-trace.json`、`006-boat-motion.json`、`006-end.json`、before-ride/island-arrival截图；report内保存predecessor路径与SHA，链路不靠手填。
- 当前比较`build/e2e/006-current-offline-selected-review.json`；003离线`build/e2e/003-current-offline-source-label-review.json`。旧`both-006-2026-10-26T13-08-33-056Z`和`006-current-offline-replacement-review.json`保持原红。
- 原始命令、失败、起止/exit/signal、完整stdout/stderr及运行前后输入指纹集中保全于本轮工作包；本轮持久归档`/Users/zhangxu/illegal/type-pal/build/evidence-archive/e2e006-20261026/e2e006-20261026.tar.gz`，归档内部inventory/restore-map指回原工作树路径，不改report中的绝对路径，不作为第二套治理账本。
- 已实际查看两端before-ride与island-arrival四截图，不能由静态图代签整个动作序列；未录capture视频、未跑产品单元/coverage、未对后期剧情扩审。
- 旧10-11连续卡的正文与CI保全记录可读，但已查活跃树/资源备份未恢复其36 raw；旧卡历史验收不因本轮未寻获原件而擦除，也不能借用于当前合同。另一延后分支只读核过，不直接借其10-31日期或执行信用。
- [阶段入口](README.md)、[catalog](../../../catalog.json)、[原机器回执](../../evidence/e2e-006.json)、[活动任务卡](../../../../ops/tasks/E2E-006-1-inn-doctor-and-boat-to-island.md)共同记录当前出版状态；作者新delta待非作者验收，旧执行保全信用不等于本候选accept。

## Revision history

2026-10-26：实质出版复核+必要真实补验；下一复核11-02，rework/lastVerified10-03/原native身份不改。旧10-16 current段落可按固定base `14e0336fe045d038a29ab773acaa639696d31ea8`逐字读取；以下既有带日期历史正文保持原字节和当时结论。


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
