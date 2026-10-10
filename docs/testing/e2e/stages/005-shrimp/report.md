---
testingSchema: 2
id: e2e-005
evidence: e2e/evidence/e2e-005.json
---

<!-- testing-meta
{"schemaVersion":2,"id":"e2e-005","sourceRefs":[{"path":"scripts/e2e/errand-game.mjs","lines":"3-3","anchor":"await runErrandJourney","role":"caller","sha256":"177ad8501907590f7d95264bce806bb446ebe845dda6826b7534abe017baf3d7"},{"path":"scripts/e2e/errand-contract.mjs","lines":"427-439","anchor":"export function validateErrandPredecessor(","role":"input","sha256":"8816f6e279e0b8d16fe37ba37190303a8c9ba629debfd436e1fd5dd42bf11be0"},{"path":"scripts/e2e/errand-contract.mjs","lines":"304-343","anchor":"export function assertErrandStory(","role":"oracle","sha256":"8816f6e279e0b8d16fe37ba37190303a8c9ba629debfd436e1fd5dd42bf11be0"},{"path":"scripts/e2e/errand-contract.mjs","lines":"346-376","anchor":"export function assertErrandBackground(","role":"oracle","sha256":"8816f6e279e0b8d16fe37ba37190303a8c9ba629debfd436e1fd5dd42bf11be0"},{"path":"packages/content/src/character.ts","lines":"168-170","anchor":"export const CONTENT_VERSION =","role":"version","sha256":"8d3d592d75e78c9559986b5747e7b2395aaac010bf8dde9d6ea5f164bba29a93"},{"path":"scripts/e2e/errand-contract.mjs","lines":"266-298","anchor":"export function assertErrandCollector(","role":"collector consumer","sha256":"8816f6e279e0b8d16fe37ba37190303a8c9ba629debfd436e1fd5dd42bf11be0"},{"path":"scripts/e2e/errand-observer.mjs","lines":"1-126","anchor":"const worldRenderLimit = 60_000","role":"collector","sha256":"803318d912c65830fc48b960d4948f32c82db1f51136a5efd10fc39f68bcf0aa"},{"path":"scripts/e2e/evidence-recorder.mjs","lines":"1-18","anchor":"worldRenders: 24 * 1024 * 1024","role":"bounded clock storage","sha256":"24bd5a6f8d0ec836bee1968bd3be45a2629e94b87b4a00745a83d72dfcfd4963"}],"publicCallers":["pnpm e2e:005","pnpm e2e:005:reforge","pnpm e2e:005:both"],"legalInputs":["same-engine current 004 saves report","normal route and dialogue","fresh browser restore context"],"businessOracle":{"type":"errand-news-and-return","assertions":["story/guards/saves 六 case 分开","唯一50文与报信偏序","读回后后台返程与前台控制并存"]},"dedupe":{"result":"reviewed","against":["e2e-004","e2e-006","e2e/stages/005-shrimp/report.md#历史"],"notes":"早期启动失败原样保留；当前六 case 结论与旧二阶段前驱分开。"},"revision":{"currentSha":"d02278dc0154dd73b5db24388a35c30bb096cc81","contentVersion":22,"minimumSaveVersion":11,"history":[{"revision":"d02278dc0154dd73b5db24388a35c30bb096cc81","date":"2026-10-04","action":"source-and-publication-audit","notRun":["runtime","E2E","coverage"]}]},"evidence":"e2e/evidence/e2e-005.json"}
-->

2026-10-09 工具补强源码核读：刷新当前caller/采集/判定锚点与hash；统一容量锚点移至evidence-recorder。只更新文档源码绑定，不改历史revision、版本、执行结论或raw。本轮尚未冻结补录，进度见E2E-CONTINUOUS-001-006任务卡。

2026-10-08 源码核读更新：核对本页现有 caller、输入、采集和断言锚点后刷新 sourceRefs 哈希；只更新文档源码绑定，不修改历史 revision、版本、实跑结果或原始日志。本轮工具补强尚未冻结，未补录剧情或执行连续演示；当前进度及剩余项以 E2E-CONTINUOUS-001-006 任务卡顶部为准。

# 005 买虾出门与香兰报信

2026-10-06 采集/消费合同源核验：assertErrandCollector 将worldRenders纳入序号/全局顺序校验；collector绘制时钟独立60,000条/24MiB，原事件与快照字节预算不变，溢出仍失败。Game drawn与Reforge selected/world-pass-only分开；相同姿态span保留持续时钟。唯一50文、报信偏序、同引擎004 saves前驱和恢复后后台返程断言保留，尾部control-move要求已删除。本次仅核源码，旧实跑结论不变。

2026-10-06 SAVE12 源核验：当前版本常量为 content22 / minimumSave12，源文件 SHA 以本次核读的集成工作树为准；revision / candidateSha / versions / history 与既有 runtimeExecution 仍记录原核读或实跑，不升级为 SAVE12 通过。本次未执行运行时、E2E 或覆盖率；新 SAVE12 的 001–006 独立双轨及连续链仍待生成和验收。 已核本页公开执行入口与现有断言职责；本步仅刷新版本源，不新增阶段覆盖或重算旧实跑结论。

2026-10-06：重新核读本页 sourceRefs 的实际 caller、合法输入及断言，并更新当前工作树的哈希/行号。此项只是源码证据刷新，不把历史执行升级为当前全量通过；本轮独立录制、帧差异与连续验收状态统一见 E2E-CONTINUOUS-001-006 任务卡。

## 2026-10-04 文档深审

98a42d4e 六 case 与其后 22/11 重建链分开；wrapper 启动失败保留，后补 case 不冒称同一次 wrapper 全程成功。

2026-10-04 核读基线为 `d02278dc0154dd73b5db24388a35c30bb096cc81`，content22/SAVE11。本轮没有执行游戏；配对 evidence 记录精确 source/caller/oracle、源 hash 与缺失原始产物。下文数值/告警/通过结论保留为各轮历史记录。


## 验证状态

两阶段story/guards/saves六case均通过，Codex已独立复核实际trace、原档字节、对白、因果和完整存读状态。
最终执行版本为`98a42d4e09470701a63fd3ca9d0b33e9d56a9926`，作者内容含厨房入口最后补名。
技术复核与相应质量门通过，用户连续观感复验另列；没有推进006，也不宣称整个Q1/Q2已完成。
后续脚本治理已改变二阶段内容指纹，当前可用的二阶段002至005检查点见
[治理后的当前检查点](../../../archive/legacy/batches/script-governance/current-checkpoints.md)。下文原六case结论、hash和目录保留为当时证据；
不能再把其中旧二阶段终档当作治理后的当前前驱。第一阶段入口不变。


2026-10-06：按用户要求删除剧情结束后的 `control-move` 测试走位；正文结束并恢复控制时原地收口，终点取执行器完成后的真实世界，不取最后路线采样。存读专项仍独立验证；下文历史回执中的尾部移动仅代表当时执行。

## 执行入口

```sh
pnpm e2e:005 --from /绝对路径/game-004-saves/report.json --headless
pnpm e2e:005:reforge --from /绝对路径/reforge-004-saves/report.json --headed
pnpm e2e:005:guards --from /绝对路径/game-004-saves/report.json --headless
pnpm e2e:005:reforge:guards --from /绝对路径/reforge-004-saves/report.json --headless
pnpm e2e:005:saves --from /绝对路径/game-004-saves/report.json --headless
pnpm e2e:005:reforge:saves --from /绝对路径/reforge-004-saves/report.json --headless
pnpm e2e:005:both --game-report /绝对路径/game-004-saves/report.json --reforge-report /绝对路径/reforge-004-saves/report.json --headless
```

只能消费本引擎真实004 `saves`报告及原档，拒绝story/items/capture、错误引擎、失败回执与被修改的档字节。
使用独立浏览器存储和服务，正常方向键保持行走、正常交谈，不改世界状态、不直跳剧情。
005不提供录像参数；本轮没有生成视频。

| case | 操作与证据 | 是否产出下一段前驱 |
| --- | --- | --- |
| story | 连续正常路线，完整40行对白、说话人、唯一50文、报信偏序、恢复控制权 | 否，只有live结束证据 |
| guards | 正常路线中独立检查大娘复读不重给钱，以及张四的催回店和打渔祈愿 | 否，不混入正常演示 |
| saves | 正常路线结束后立即正式保存，在fresh空存储上下文正式读回；核完整持久状态和后台返程续跑 | 是，`005.end.save.json` |

普通对白、巡逻和报信事件的观测共用有界事件序列，丢失、溢出或未知状态均失败。走近必须是布防之后的实际
移动提交，不能用第一次路过村子时的巡逻、单纯摆位或“NPC在场”代替。复读方案在同一剧情中的游标推进独立验证。

## 脚本合理化

本段直接修改canonical作者内容，没有恢复已退役的完整转换核，没有新增schema、存档版本或parallel/join。

- 张四补齐三个步骤：回应仙灵岛传闻并开启报信→提醒逍遥回店→稳定复读打渔祈愿。仅首次布防，补回七条原对白。
- 报信主体移到s004/e83丁香兰的“回村报信：李大娘突然病倒”方案。场景onEnter只选择并显式调用，完成后不重播。
- 香兰先停止自己的巡逻，走到明确停步点后说话。第一阶段实跑所有报信页在像素1688,1388、朝上；
  二阶段用网格139.5,34、朝上表达同一位置，不再开启自动走位后猜测等待480ms。
- 报信结束后启动一个有名的后台返程步骤，玩家同时恢复控制。返程有五个目标点和原有转身/停顿，
  不拆成几十个状态，不新增空尾步骤，也不让玩家等整段返程结束。
- 首报和催回复读是普通两步骤；废弃的独立走近auto和重复催回变体移除。报信前已有村中闲逛路线保留，只补名称。
  本段没有完整观察闲逛的整个循环，不把这三段巡游冒称已完成全部时序验收。
- 原九行报信对白、说话人、音乐变化和病倒后的世界状态配置逐字段保留。厨房任务、水生/鱼嫂正常内容不改。

已核命名覆盖厨房大娘任务步骤、鱼嫂、水生叔、张四、丁香兰及本段进出客栈/村庄/码头的相关入口。
主线实际经过与相邻复读分开记，未经过的后期方案不猜名。实体稳定ID不变。

## 存档与持续自动行为

保存不等待香兰或全地图NPC停止。第一阶段在正式保存深拷贝处捕获世界并核成功ack；恢复时在正式成功提交处
再次捕获。二阶段复用正式快照与恢复事务，在后台runner重新启动前读取已经提交的世界，逐字段比较。
额外验证香兰读回后发生真实后台位移，前台保持可控。

村中NPC会继续巡逻，因此不同时间截取的整幅Canvas不要求hash相等。视觉检查要求正确场景、人物/位置、
非黑帧及实际截图；不靠冻结世界、等所有自动脚本结束或忽略持久字段来制造一致。

## 已核历史根因与测试边界

张四后续步骤和香兰返程在退役前转换产物中已经缺失。旧转换核对动态安装目标的advance/reset只保留首段，
并把0x09等待统一乘40ms；探索自动行为实际使用100ms。Git证据及定位命令见任务卡“历史转换根因核查”。
这证明本段两条历史转换路径存在缺陷，不代表所有脚本或历史候选都错；运行时问题另行归因。

开发校准中曾出现工具自己的错误：热路径读取全体实体、误选同场景另一房间入口、以静态配置代替已改变的
触发范围，以及用更早巡逻充当报信走近的断言漏洞。失败原回执保留，分别修工具并加反控，不以放宽断言让其通过。

## 正式回执

最终独立汇总为`build/e2e/005-final-independent-review.json`，kind为`independent-case-receipt-revalidation`。
六份实际case同revision及416项登记输入hash。Codex独立重算全部登记输入、8份trace和两份终档；
413个Git输入与冻结revision逐项无差异。原`both-005-2026-10-02T12-43-13-764Z/comparison.json`保留failed：
game guards的独立Chrome renderer在newContext阶段退出，尚无剧情输入，超过预算后仅终止了该owned Chrome。
之后只补game guards和两边saves，全部正常；没有重写失败报告，也不冒称同一次wrapper全程成功。

| 引擎 | story目录时间 | guards目录时间 | saves目录时间 |
| --- | --- | --- | --- |
| game | 12-43-14-523Z | 12-50-42-468Z | 12-53-06-187Z |
| Reforge | 12-43-14-523Z | 12-44-20-227Z | 12-52-00-880Z |

以上目录格式为`build/e2e/<engine>-005-<case>-2026-10-02T<时间>/`，每份含report.json和原字节trace。
两套正常story各40行；guards各49行，额外9行为大娘复读和张四两段后续；saves各40行。
game结束档SHA `903b61595c7bab6c9e56efdd29aa48ff088b62b65373d1233ca64a6318837028`，
Reforge结束档SHA `ea0932ddd40c3c7d45fed987e3c679ab357e6a7cd2d4c1b9ea8cafe30be58b5d`。
game保存/恢复完整世界hash均`2b4da24301617f08f78bdb531bb92918f666f49b38ac5da24bb32bbf24d0a54a`；
Reforge完整投影与其原档hash相同。两边恢复后都记录到香兰真实walk提交和前台可控。

正常输入末帧及报信首句已目视：姓名、立绘、台词、香兰朝向和两人相对位置正常；不是仅检查页面非黑。
浏览器engine errors均为空。原始warning计数game story/guards/saves为0/0/1，Reforge为1/1/2，
来自既有清工程state404和Chrome读回性能提示，原样保留；不将它们混作硬静态门零诊断声明。

两个早期诊断大trace因每tick重复记录全部auto.resume而膨胀，已分别无损gzip，解压hash保持原报告值；
历史报告不改。新工具只记录剧情相关语义，完整原子保存数据不削减；普通事件与原子快照独立预算，
超额明确失败、不静默删日志。最终8份trace最大4,277,061字节，无视频生成。

另一次最终版试跑在村口被半格巡逻NPC挡住，证实旧导航器只比较坐标全等的工具模型错误。
现002–005共用显式引擎占位策略：game保留原距离门，Reforge直接加载生产pure sweep；
途中路径被占重新规划、暂时堵路松键等通道开放，原地5秒期限不因重规划重置。
真实失败与生产函数反控、两driver动态模拟已闭合；最终自然case没有触发replan，不冒称刷到了特定巡逻相位。

## 质量门与保全

最终作者内容的完整`005-final-quality4.log`：七包typecheck及11,002项测试通过，E2E工具198项，
严格lint2773文件0error/0warning/0info。其后只改共享E2E导航与工具测试，不改packages或作者内容；
Root另跑全部211项E2E工具和全仓lint2774文件零诊断，日志`005-final-tools-root.log`、`005-final-lint-root.log`。
文档另过链接门；这是完整包门加最终工具增量的组合收据，不称最终HEAD又重跑过一次完整pnpm check。
早期缺文档索引、隔离raw资源未挂接、依赖软链错误解析到主树资源的失败日志保留；
已补索引、只读资源链接并按锁文件offline安装本地workspace依赖，不删除断言、不忽略诊断。

本机证据原字节已保全到主树`build/evidence-archive/e2e005-20261002/e2e/`，路径尾部不变。
`archive-map.json`核377个文件、177,904,834字节；历史报告中的原绝对目录按此映射查找，不改原report。
旧大诊断trace的gzip恢复说明在其相邻`trace-archive.md`。本节为005原验收最终saves目录；
后续治理后的当前二阶段入口以上方检查点说明为准。

公共浏览器启动RPC的独立超时/崩溃自动清理仍是R4工具待办，不能因补跑成功声称异常监督机制已完善。
用户可在6012选盛渔村s004→丁香兰e83→交互脚本“回村报信：李大娘突然病倒”，查看首报/复读两步；
后台返程另为一个自动步骤。服务与页面保持运行，正常演示用story，不夹带guards/saves专项。
