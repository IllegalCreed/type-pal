---
testingSchema: 2
id: e2e-006
evidence: e2e/evidence/e2e-006.json
---

<!-- testing-meta
{"schemaVersion":2,"id":"e2e-006","sourceRefs":[{"path":"scripts/e2e/boat-reforge.mjs","lines":"3-3","anchor":"await runBoatJourney","role":"caller","sha256":"d5c648a90e22617c1d16b97964f3539c22625cc68836e5194c23802c0dd14b43"},{"path":"scripts/e2e/boat-journey.mjs","lines":"23-40","anchor":"export async function runBoatJourney(","role":"caller","sha256":"fc976aa809bfca929ec6f09d81cd8b10e16339d2b270b6660e08ff90d30990f4"},{"path":"packages/content/src/character.ts","lines":"168-170","anchor":"export const CONTENT_VERSION =","role":"version","sha256":"8d3d592d75e78c9559986b5747e7b2395aaac010bf8dde9d6ea5f164bba29a93"}],"publicCallers":["node scripts/e2e/boat-reforge.mjs"],"legalInputs":["current SAVE12/content22 001→005 chain","normal movement to boat","current phase1 and reforge NPC logs"],"businessOracle":{"type":"rework-gated-boat-entry","assertions":["Reforge route reaches s014","all island closing dialogue is confirmed and control returns","two-stage key NPC logs exist","boat anchor/action/landing visual evidence closes rework"]},"dedupe":{"result":"reviewed","against":["e2e-005","historical 001–005 reports"],"notes":"历史链不能替代当前 006 两阶段证据；缺失项显式保留。"},"revision":{"currentSha":"d02278dc0154dd73b5db24388a35c30bb096cc81","contentVersion":22,"minimumSaveVersion":11,"history":[{"revision":"d02278dc0154dd73b5db24388a35c30bb096cc81","date":"2026-10-04","action":"source-and-publication-audit","notRun":["runtime","E2E","coverage"]}]},"evidence":"e2e/evidence/e2e-006.json"}
-->

2026-10-10 当前 caller 核读：006 仍消费真实 005 saves；e123 恢复值现在精确断言 primary state2。boarding artifact 与 interval 共用 island-arrival 的实际 route start；末 draw 与真实两条 ride leg 的 settlement/completion 分开验证。当前单轨诊断正在执行，正式双轨及视觉验收尚未收口。

2026-10-09 工具补强源码核读：刷新当前caller/采集/判定锚点与hash；统一容量锚点移至evidence-recorder。只更新文档源码绑定，不改历史revision、版本、执行结论或raw。本轮尚未冻结补录，进度见E2E-CONTINUOUS-001-006任务卡。

2026-10-08 源码核读更新：核对本页现有 caller、输入、采集和断言锚点后刷新 sourceRefs 哈希；只更新文档源码绑定，不修改历史 revision、版本、实跑结果或原始日志。本轮工具补强尚未冻结，未补录剧情或执行连续演示；当前进度及剩余项以 E2E-CONTINUOUS-001-006 任务卡顶部为准。

# 006 · 回客栈求药与张四出海上仙灵岛

2026-10-06 SAVE12 源核验：当前版本常量为 content22 / minimumSave12，源文件 SHA 以本次核读的集成工作树为准；revision / candidateSha / versions / history 与既有 runtimeExecution 仍记录原核读或实跑，不升级为 SAVE12 通过。本次未执行运行时、E2E 或覆盖率；新 SAVE12 的 001–006 独立双轨及连续链仍待生成和验收。 已核本页公开执行入口与现有断言职责；本步仅刷新版本源，不新增阶段覆盖或重算旧实跑结论。

2026-10-06：重新核读本页 sourceRefs 的实际 caller、合法输入及断言，并更新当前工作树的哈希/行号。此项只是源码证据刷新，不把历史执行升级为当前全量通过；本轮独立录制、帧差异与连续验收状态统一见 E2E-CONTINUOUS-001-006 任务卡。

## 2026-10-05 双轨独立实跑与对比

真实入口是 `node scripts/e2e/boat-game.mjs` 与 `node scripts/e2e/boat-reforge.mjs`，两者都从各自当前 005 saves 真实读档开始。本轮按“独立通过 → 独立对比 → 再串联”门禁执行；串联尚未开始，rework 继续保留。


## 已确认范围

005 报信结束 → 回客栈 s002 → 洪大夫自动诊断 → 小虎子首次对白及两次复读 → 穿过走廊触发苗人头领求药指引 → 回码头找张四 → 走到船边 →
载入 s014 仙灵岛，完成 `dlg.1886/1888/1889/1890` 的落地对白并恢复控制后停止，不进入水月宫、破阵或岛上后续。2026-10-07用户指出旧停止点缺陷后，已撤销“首句出现即证明完整006结束”的信用；下方历史报告原样保留，当前补验与连续结果见连续任务卡。

## 当前双轨独立实跑

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

## 独立轨迹对比

比较产物：`build/e2e/both-006-2026-10-04T19-18-45-307Z/comparison.json`，状态为 `passed`。

- 两轨主角承载锚点均为 `[-2,-4]`，骑乘朝向均为 `up`，e117 船夫相对偏移均为 `[-2,2.25]`；用户指出的船外、漂移、朝向问题已由显式 rider mount 和朝向编排修复。
- 完整 actor state/frame trace 已分别落盘为 `006-state-trace.json`，比较无 evidence-gap。

## 当前未闭合项

- 第一阶段与 Reforge 同节点截图均显示李逍遥在船内、张四随船移动；划桨动作按资源帧保留，不把单帧截图冒称逐帧验收。
- 正式存档只有李逍遥一名队员，不能把本次日志扩大成“三名队员朝向”验收。
- 006 活跃实体 e35/e36/e116/e117 的方案/步骤仍需按剧情用途补齐名称；不能保留默认“触发行为/自动行为”作为最终作者语义。

## 对照与整改门

第一阶段原始锚点：`data/extracted/events/all.json` 的 `L_1026/L_1070/L_1465/L_1509`；其中 L1070 对应苗人头领求药段，L1509 对应队伍走位、0x15 朝向、0x3F 骑乘和 scene15 切换。
Reforge 只复用剧情/UX语义，不复制旧引擎内部结构；但关键 NPC 的状态、位置、朝向和显隐必须有当前两阶段各自日志，缺任一项即保持 rework。

脚本合理化记录：

- 本段改进：e35 显式安装张四后继；e36 删除会重播003的无关跨场景回置；船只触发保留为显式交互/移动链。
- 保留：张四对白后正常走到船边；不把“说走吧”改成瞬移上船。
- 后续能力建设：关键实体日志合同、第一阶段 006 适配器、船体/人物资产锚点与划桨动作。
- 待产品/视觉复核：船上人物相对布局和动作观感。

## 质量证据

- `pnpm check:content`：294 场景 / 223 地图 / 1934 资源通过。
- `pnpm check:docs`、`pnpm lint`：通过，lint 3131 文件零诊断。
- 根 `pnpm check` 的历史存量失败仍为 migrate `dlg.2074` locale 缺口；不归因于本段。
