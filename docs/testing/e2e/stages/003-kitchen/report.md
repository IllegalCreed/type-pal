---
testingSchema: 2
id: e2e-003
evidence: e2e/evidence/e2e-003.json
---

<!-- testing-meta
{"schemaVersion":2,"id":"e2e-003","sourceRefs":[{"path":"scripts/e2e/kitchen-game.mjs","lines":"3-3","anchor":"await runKitchenJourney","role":"caller","sha256":"9fd175ba2e681513f78359a122dc9dad6bd1bf4266766ac24ebf45476663a142"},{"path":"scripts/e2e/kitchen-contract.mjs","lines":"117-199","anchor":"export function validateKitchenPredecessor(","role":"input","sha256":"7286db31cd810f8c0ae982bb51bba1453eb52f98367fdab834c2d922d1587634"},{"path":"scripts/e2e/kitchen-contract.mjs","lines":"534-557","anchor":"'stairs must commit all twelve authored fragments'","role":"oracle","sha256":"7286db31cd810f8c0ae982bb51bba1453eb52f98367fdab834c2d922d1587634"},{"path":"scripts/e2e/kitchen-contract.mjs","lines":"395-412","anchor":"export function assertKitchenStoryEnd(","role":"oracle","sha256":"7286db31cd810f8c0ae982bb51bba1453eb52f98367fdab834c2d922d1587634"},{"path":"packages/content/src/character.ts","lines":"168-170","anchor":"export const CONTENT_VERSION =","role":"version","sha256":"8d3d592d75e78c9559986b5747e7b2395aaac010bf8dde9d6ea5f164bba29a93"},{"path":"scripts/e2e/kitchen-contract.mjs","lines":"497-518","anchor":"export function assertKitchenTrace(","role":"collector consumer","sha256":"7286db31cd810f8c0ae982bb51bba1453eb52f98367fdab834c2d922d1587634"},{"path":"scripts/e2e/kitchen-observer.mjs","lines":"1-115","anchor":"const worldRenderLimit = 60_000","role":"collector","sha256":"583e846bae766bf04ceb63edd91c1d7bdeb818b10f2b12e7f5904d195454cdca"}],"publicCallers":["pnpm e2e:003","pnpm e2e:003:reforge","pnpm e2e:003:both"],"legalInputs":["same-engine current 002 report.json","held normal movement","no take-dish shortcut"],"businessOracle":{"type":"stairs-dialogue-kitchen-handoff","assertions":["楼梯真实12次提交","14行正文完整","停止于126/127并恢复控制"]},"dedupe":{"result":"reviewed","against":["e2e-002","e2e-004"],"notes":"004取菜入口只登记，不把源码核读冒充003实跑。"},"revision":{"currentSha":"d02278dc0154dd73b5db24388a35c30bb096cc81","contentVersion":22,"minimumSaveVersion":11,"history":[{"revision":"d02278dc0154dd73b5db24388a35c30bb096cc81","date":"2026-10-04","action":"source-and-publication-audit","notRun":["runtime","E2E","coverage"]}]},"evidence":"e2e/evidence/e2e-003.json"}
-->

# 003 · 下楼、道士交谈与厨房交代

Status: verified
Owner: Codex（本轮治理责任）；history_cards_a（候选正文）
Last reviewed: 2026-10-16
Template: test-run-report-v1 / 1.0.0

## Scope

本报告是 e2e-003 下楼、道士交谈与厨房交代的唯一canonical。Game/phase1与Reforge/phase2各消费自身真实002 checkpoint；一阶段是演出对照，二阶段遵守意图与显式编排，不恢复全局NPC冻结。停止于厨房126/127并恢复控制，不证明取菜、004或capture。

原frontmatter/testing-meta是唯一live声明，candidate d02278dc0154dd73b5db24388a35c30bb096cc81/content22/SAVE11/10月4日notRun原样不动。原报告无独立Owner/Last reviewed，新增只属本次治理；verified仅出版，不是今天的实跑或期限续期。

## Execution and assertions

真实入口先核002报告、同引擎原档/hash与厨房下一段绑定；随后正常标题/恢复、held移动，不跳场景、不写坐标、不手造存档。楼梯必须12次真实提交并有中间步帧，不只比首尾位置；14行及说话人顺序如前述入口，钱保持500、桌上菜可见，无207、取菜或端菜208。正式生产保存与fresh空存储读回核完整持久域/同引擎Canvas；Game的F5与RF生产barrier/dumpSave按各自原轮表述，不冒同一IO。

公开caller为 `pnpm e2e:003`、`:reforge`、`:both`，kitchen-contract负责前驱、assertKitchenStoryEnd、assertKitchenTrace和12段楼梯合同；本次不执行。采集按sceneVisit区分NPC连续性，worldRenders有界60,000条；Game drawn与RF selected/world-pass-only分轴，overflow、缺终结和正式开始后的无源移动仍应拒绝。

## Results

- **10月1日独立轮**：Game `0defc136` 与RF `edca85df` 使用各自真实002档，不能合成同SHA both。原楼梯12次、14行、完整持久域/Canvas、运行错误0及RF可选404均保留。
- **10月7日14:12批次**：从12:09的002档进入，两轨14行/12提交及正式存读passed；原Game draw159/159/77、RF774/774/242，16固定等待、6组对白消费、运动目标与持帧属于该录制。5项解释不是5个未修bug。46针拒绝和terminal/IO/因果counter的原收口不等于今天重跑。
- **10月7日14:28与10月8日离线轮**：两轨用14:25真实002档，旧统一比较器记0未决差异、5项合理差异及56/56记录域反例拒；未另开浏览器。首个scoped自动调用没有独立初始idle证据，仅证明中段调用连续。后续001 initial/57接管、initial/36转向、initial/37定帧缺失仍0finding，推翻的是完整执行链/基础设施收口；不能据此抹掉全部003局部观察。
- **失败与修复边界**：Game首轮厨房入口被大娘占用；RF把restore placement误算剧情前移；楼梯脚本中stepFrame被idle覆盖、40ms步频以及旧002错误下一段绑定，按各自根因保留原failed。正式开始后的continuity/无源移动守卫没有因纠错撤销，90/92工具数不是本轮运行。
- **后继与未验**：10月11日是另一固定批次，不倒填14:12/14:28，也不使006出版rework变绿。003未取菜，004慢读/姿态相邻源码核读不计003新执行；用户观感、capture音轨、raw当前可用性仍未由本治理认证。

完整链强结论的后继：[10月8日撤信](../../../../ops/archive/tasks/done/E2E-CONTINUOUS-001-006.md#2026-10-08-前批结果历史完整执行链结论被上述反例推翻)、[10月11日新固定批次](../../../../ops/archive/tasks/done/E2E-CONTINUOUS-001-006.md#2026-10-11-最终重录与headed验收accept)；本次只治理来源和事实轴，不恢复旧build prompt，不把连续卡done变为原轮全绿。

## Evidence

完整[连续验证任务](../../../../ops/archive/tasks/done/E2E-CONTINUOUS-001-006.md)按自身日期维护后继批次与未决项，不将局部报告改成完整链通过。

下表是10月1日两个独立候选的原表，不代表同revision both；完整hash、时长、尺寸和目录保持原字节。10月7日两个批次的runID/draw/警告与原失败在冻结原文，不能用表中旧档充当前合法输入。

### 10月1日独立候选原表（0defc136 / edca85df）

| 证据 | 第一阶段 game | Reforge |
| --- | --- | --- |
| 报告目录（各自tree的build/e2e） | game-003-2026-10-01T05-41-47-466Z | reforge-003-2026-10-01T06-54-19-263Z |
| 冻结revision | 0defc136 | edca85df |
| 正式002前驱 | game-002-2026-09-30T23-09-37-718Z | reforge-002-2026-10-01T05-09-59-537Z |
| 楼梯实际提交/中间步频 | 12次，首末1099.3ms，间隔99–100.7ms | 12次，首末1129.4ms，间隔97.8–116.9ms |
| 结束/恢复完整持久域hash | 7cfb1b0272049e25da3463797b5d46662b228009f8bbb7f02a6cf206a03b12f0 | ac14703c123017f4e96e65ca79e19dcbb2c38a1508595f5d9ad569a326aa8fb7 |
| 结束/恢复Canvas SHA | e820679e5e9c85b697d01a96dab1eb4c1b7f1951e0f1b64934b7d18209c4277f | 77373c1d0ad6b464a2c272e27ec533aa9deb987346bf1452bcd1437855295e70 |
| 实际非黑像素 | 320×200，52888 | 1280×800，846176 |

配对[机器证据](../../evidence/e2e-003.json)是原16键document-audit，不是执行回执；sourceRefs、publication verified与runtimeExecution.performed=false/artifacts=[]保持，候选/版本/日期不改。实际producer为原公开journey/collector及各run，原观察身份不被本轮冒领；当前raw/截图/trace可用字节、存储Owner及retention未重核。原命令仅在非交互来源中保存，不运行旧工具、同步writer或raw。

## Revision history

同路径按五章重写，所有原日期、数字、SHA、失败、counter和非零警告在下方完整body留存；原live前缀+text payload严格恢复完整source。以下原题名仅作当时范围的导航，不因“当前/通过/已核”字样授今天信用。

### 2026-10-08 当前验收：复用新录制，统一比较器离线通过

原局部56/56/5项解释及初始idle缺证见[结果](#results)；完整链的更强收口见[撤信段](../../../../ops/archive/tasks/done/E2E-CONTINUOUS-001-006.md#2026-10-08-前批结果历史完整执行链结论被上述反例推翻)。

### 2026-10-07 完整双轨实跑通过

14:12批次与14:28后继分别见[结果](#results)，旧标题不是今天的新执行批准。

### 2026-10-04 文档深审

d022/content22/SAVE11来源审计不等当前22/12实跑，见[范围](#scope)。

### 可执行入口

历史公开命令完整留在text原文；合法前驱/held与停止线见[执行合同](#execution-and-assertions)，本轮不执行。

### 已通过的独立实跑

两个不同SHA的完整原表保存在[证据](#evidence)，不能拼成同候选both。

### 修复与保留失败

厨房入口阻挡、restore placement、楼梯和002交接各自原失败与窄修见[结果](#results)。

### 编排合理化与004反证

止厨房未取菜；dlg207和004慢读/持久姿态归后继，不提前授予004通过。

### 冻结原始正文（source 5a125c37）

本text保存全部原body，包括H1前来源刷新说明、旧命令和旧错误href；仅为历史来源，不可交互。顶部唯一原前缀加payload逐字节恢复原文件，固定Git blob提供第二条原始来源。

````text
2026-10-09 工具补强源码核读：刷新当前caller/采集/判定锚点与hash；统一容量锚点移至evidence-recorder。只更新文档源码绑定，不改历史revision、版本、执行结论或raw。本轮尚未冻结补录，进度见E2E-CONTINUOUS-001-006任务卡。

2026-10-08 源码核读更新：核对本页现有 caller、输入、采集和断言锚点后刷新 sourceRefs 哈希；只更新文档源码绑定，不修改历史 revision、版本、实跑结果或原始日志。本轮工具补强尚未冻结，未补录剧情或执行连续演示；当前进度及剩余项以 E2E-CONTINUOUS-001-006 任务卡顶部为准。

# 003 · 下楼、道士交谈与厨房交代

## 2026-10-08 当前验收：复用新录制，统一比较器离线通过

当前录制为`game-003-2026-10-07T14-28-05-155Z`及`reforge-003-2026-10-07T14-28-05-138Z`，
来自两轨14:25真实002存档，14行正文/楼梯12次提交/正式存读档均已通过。
本次未重新启动浏览器；`build/e2e/003-offline-frozen-20261008.json`为0未决差异、5项既有合理差异，
包括李大娘末半格匀速、持帧及醉道士逐轮因果对齐。56/56记录域反例拒绝，含错帧/漏draw、时钟与终结。
首个scoped自动调用无独立初始idle证据，仅验证中段真实前后调用连续，不补造前驱。
来源复用、独立复核和质量门见
[当前任务结果](../../../../ops/archive/tasks/done/E2E-CONTINUOUS-001-006.md#2026-10-08-当前结果基础设施离线收口001003统一判定通过)。
下文14:12批次保留历史，不代替本批14:28录制。

## 2026-10-07 完整双轨实跑通过

冻结批次为 `build/e2e/both-003-2026-10-07T14-12-13-739Z/comparison.json`：Game
`game-003-2026-10-07T14-12-14-294Z`、Reforge `reforge-003-2026-10-07T14-12-14-277Z`。
两轨分别从12:09真实002档进入，正文14行、楼梯12次真实提交、正常保存和全新空存储读回均passed；
完整NPC/帧/因果比较0 finding、0 violation。每轨95项源码hash与结束时及当前工作树相同。

- 大厅李大娘、醉道士和厨房李大娘覆盖每次实际draw：Game为159/159/77，Reforge为774/774/242；
  16个固定等待、6组对白消费、三条精确运动目标及全部运动/静止帧均核。不是仅比首尾坐标。
- 通用交互转向修复了投影零轴的择边，预览与运行时一致；移动本身的朝向公式不变。
  接管醉道士时暂停整条自动执行及剩余等待，释放后续走，不重头计时或悄悄消耗余时。
- 5条显式解释涵盖三个实体的已验持帧、大娘末半格匀速和道士逐轮因果对齐，不是5个未修bug。
  原版47次/RF50次位移的差异只限已批准的末半格；不放宽目标、朝向、步帧或等待判定。
- 补强真实main头像IO采集，以及所有五个有限NPC/楼梯run的成功终结检查；对原始passed记录制造
  错帧、漏draw/命令/计时/IO/结束、错owner/visit/clock、无源姿态重置等46针，全部被拒绝。
  产物为 `build/e2e/003-counterexamples-frozen-20261007.json`；不修改任何原始失败报告。
- 浏览器errors均空；Game保留1条开场AVI播放被pause中断的warning，RF保留1条可选save-state资源404。
  这些不冒称控制台零告警，也不与静态门零诊断混记。结束/读回的像素hash各轨完全相同。

独立复核已关闭terminal/IO和帧因果两包counter。具体真值、先红后绿、原始路径与质量收据见
[连续验证任务](../../../../ops/archive/tasks/done/E2E-CONTINUOUS-001-006.md)。本轮不声明004–006或连续演示完成；
下列历史revision/runtimeExecution和旧结果保持原义，不追溯升级。

2026-10-06 SAVE12 采集/消费合同源核验：002前驱及003结束档校验切为SAVE12；assertKitchenTrace 计入worldRenders并按sceneVisit隔离实体连续性，仍要求楼梯12次真实提交、逐次实绘步帧与14行正文。collector独立保留至多60,000条世界绘制时钟，NPC的Game drawn与Reforge selected/world-pass-only不混称像素证据。新sourceRefs补齐采集和消费方，不把源码核读或历史运行升级为新版本通过。

2026-10-06 SAVE12 源核验：当前版本常量为 content22 / minimumSave12，源文件 SHA 以本次核读的集成工作树为准；revision / candidateSha / versions / history 与既有 runtimeExecution 仍记录原核读或实跑，不升级为 SAVE12 通过。本次未执行运行时、E2E 或覆盖率；新 SAVE12 的 001–006 独立双轨及连续链仍待生成和验收。 本步已追加冻结后的采集器/消费合同源核验，范围见本页最新说明；动态运行与旧回执不因源码核验升级。

## 2026-10-04 文档深审

两份旧实跑使用不同 revision，不能据此写成同 SHA both 汇总；004 取菜/姿态相邻核读不计 003 运行覆盖。

2026-10-04 核读基线为 `d02278dc0154dd73b5db24388a35c30bb096cc81`，content22/SAVE11。本轮没有执行游戏；配对 evidence 记录精确 source/caller/oracle、源 hash 与缺失原始产物。下文数值/告警/通过结论保留为各轮历史记录。


## 可执行入口

```sh
pnpm e2e:003 --from /绝对路径/game-002/report.json --headless
pnpm e2e:003:reforge --from /绝对路径/reforge-002/report.json --headed
pnpm e2e:003:both --game-report /绝对路径/game-002/report.json --reforge-report /绝对路径/reforge-002/report.json
```

执行器读取本引擎真实002档、验证原字节hash与交接语义，正常标题/恢复后沿合法路线使用held输入。
只读观测实际位移提交和绘制脚步，不跳场景、不写坐标、不造档；保留超时/动作/观测预算。
`both`另要求两运行冻结同revision/source hash。本次下表为两个独立实跑，不冒称同revision的both汇总通过。

## 已通过的独立实跑

| 证据 | 第一阶段 game | Reforge |
| --- | --- | --- |
| 报告目录（各自tree的build/e2e） | game-003-2026-10-01T05-41-47-466Z | reforge-003-2026-10-01T06-54-19-263Z |
| 冻结revision | 0defc136 | edca85df |
| 正式002前驱 | game-002-2026-09-30T23-09-37-718Z | reforge-002-2026-10-01T05-09-59-537Z |
| 楼梯实际提交/中间步频 | 12次，首末1099.3ms，间隔99–100.7ms | 12次，首末1129.4ms，间隔97.8–116.9ms |
| 结束/恢复完整持久域hash | 7cfb1b0272049e25da3463797b5d46662b228009f8bbb7f02a6cf206a03b12f0 | ac14703c123017f4e96e65ca79e19dcbb2c38a1508595f5d9ad569a326aa8fb7 |
| 结束/恢复Canvas SHA | e820679e5e9c85b697d01a96dab1eb4c1b7f1951e0f1b64934b7d18209c4277f | 77373c1d0ad6b464a2c272e27ec533aa9deb987346bf1452bcd1437855295e70 |
| 实际非黑像素 | 320×200，52888 | 1280×800，846176 |

两报告status/core/route passed，sourceHashesStable=true，运行错误0；RF保留一条可选资源404，
不将运行时网络消息混称硬性静态零诊断。正文/说话人均完整14行：56/57/58、145/146、148/149/150、
152/153、155/156、126/127。没有207、没有取菜/换端菜外观，钱与物品不被污染，桌上菜仍可见。
两引擎分别使用真实生产保存与全新空存储上下文读回；game正常F5后标题读档，RF生产barrier/dumpSave恢复。
Root独立检查RF厨房画面，交代正文、人物及菜可见；不为同一已通过流程重复浏览器巡检。

后续步骤结构清理只改s003/e56晚剧情legacy-001等简单flow，003执行的初次行为、楼梯、locale与
宿主均不变；该清理由独立JSON逐字段复核与真实compiler/runner回归验证，不给上述历史报告改revision。
全仓门与编辑器交付状态以当前任务卡为准，用户观感及capture尚不等同技术passed。

## 修复与保留失败

- 002收尾误选大娘次日legacy-001；作者工程同时缺第一天56–58及去厨房、道士初次讨酒、厨房126/127。
  根因在作者定义，不在读档。补可读具名方案与初次/复读步骤，正常从真实001重跑RF002。
  旧RF002一致保存错误绑定的报告原样保留，不用于新的003前驱。
- 新002交接门在实际结束档及实际恢复World处检查下一段绑定，003 donor准入复用该门；
  原来只核本段20行/500/进房/恢复相等，漏掉下段语义。新门已核真实既有字节并有反控，
  新调用点没有另重复一遍002浏览器全流程，不将离线检查冒称新浏览器实跑。
- 楼梯原本推进stepFrame却在脚本运行时归idle，作者wait40ms也过快；修主壳非零nudge步频、
  显式姿态覆盖和取消清理，24个双向楼梯wait恢复第一阶段实跑的100ms，不改全局wait。
- game首轮05-27-06-514Z因大娘尚占厨房入口失败：增加真实e19可见/e56隐藏交接判据，
  不跳坐标、吞规划异常或延长deadline，失败保留。
- RF首轮05-41-51-837Z把读档时的actor placement当成正文前移。只将剧情移动/隐藏判据限定到
  正式start以后，全局continuity/gap检测保留；反控仍拒绝正式开始后、初次对白结束前的真实移动。
  原failed不改写，90项阶段工具及其后92项交接工具绿。

## 编排合理化与004反证

003已有普通具名方案/步骤，不向作者要求额外状态机，不恢复一阶段全局NPC冻结。
原始dlg207在送酒后链，不提前搬进003来迎合一个未经核实的喊话假设。
本次只预备取菜的真实后续入口，**不证明004已完成**：厨房e19取菜正文设朝下，而auto/default仍循环朝上；
004需慢读至少3秒核覆盖，再通过局部接管/编排修复，不引入全局冻结。录屏/音轨另列capture待办。
````
