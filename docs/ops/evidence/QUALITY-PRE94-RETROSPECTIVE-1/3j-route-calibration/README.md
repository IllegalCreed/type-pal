# CODE3j 检查点局部校准

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-31
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是「CODE3j 检查点局部校准」的治理候选页;证据原件即下方逐字节保全的固定main源(4844B)。2026-10-23 Codex单Owner、基点38d6b2d13;本增量补齐上一[README.md](../3j-tools-quality/README.md)八维窗口的七项校准缺口,只修checkpoints.ts注释,配置/实现/测试/PB/公共接口未改,正文守恒由只读快检复算。

## 来源与输入

来源为固定Git载体,非本次运行;原3链接处置见作者review的linkDisposition。当前存活入口:[review.json](review.json) [receipts.json.gz](receipts.json.gz)。原盘SSS.MKF 18条相关指令/11场景/10EO给出独立字节偏移与源哈希,与当前全局提取脚本逐项匹配;PalTimer冻结在ba7ca7cc(blob 0284a5d7),已读InitCheckPoints/位置谓词/香蕉检查,不将外挂源码当大宇原版。

## 断言与业务 oracle

七项局部信号当前引擎直接观察:见石碑(1808,520)早入容差、(1856,496)触发原盘5182;学功夫EO195触发2205、对话五次确认、2237切音乐86;上船场景6(1296,1224)到(1280,1216)入容差打点;生化危机EO924触发9716、入62定位(1312,1376);剑柱场景169触发22603、入146(464,1160);祈雨DEV主场景228走正式新游戏onEnter,32039设(1152,1040)、32044等待期打点;锁妖塔163到164(672,704)打点并完整观察165到147入塔演出。移动/自动触发/对白/转场/onEnter/音乐/计时均走生产实现,不写终态/split/音乐/跳过碰撞。首轮塔/剑柱直线路线被真实碰撞阻挡、上船误触方老板对白——失败与成功记录并存,不以producer exit0给失败case信用。**证据证明局部信号可达与接线,不证明新游戏到结局连续剧情、自然路线必经性或完整视觉验收**;旧容差与默认PB维持原设计,不称与PalTimer打点时刻完全一致。

## 结果

review.json逐项列checkpoints的A到H,其他十四文件/测试迁移/全仓门复用上窗同版原件;七项信号补齐后checkpoints.ts接受、CODE3j partial转accept;固定83卡65accept/18partial,账本3403/408closed/103review/2892pending,94-102未扩展。合并基点main的Documentation39913781974与Coverage39913781939 completed/success,App15368两required checks annotation 0;20170例/774源,lint5942文件0/0/0;本次未重采覆盖率或重跑未变测试。node verify.mjs只读复验:旧窗口快检因注释哈希改变返回STALE属预期,本增量承接其不变正文。

## 限制与复核

未重跑;成功场景pageerror/console warning/error均为空;未新增完整剧情E2E、音视频成品或二阶段编辑器预览信用。候选待Owner非作者接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 4844B / SHA-256 161b66cb68b4a28a1b64197ce1cc05fd55f7e9ca5c73312dda5ef3eec6702145；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE3j 检查点局部校准

2026-10-23，Codex 单 Owner；基点 `38d6b2d136dc38589df9729242590bc37a5a27e2`，同一 `codex/code-quality-3y`。本增量补齐上一[八维质量窗口](../3j-tools-quality/README.md)的七项校准缺口。只修 `checkpoints.ts` 注释，配置、实现、测试、PB 和公共接口均未改变；正文守恒由只读快检复算。

## 结果与边界

| 核对项 | 当前引擎直接观察 |
|---|---|
| 见石碑 | 真实方向输入从范围外走近；在 `(1808,520)` 先打点，继续走到 `(1856,496)` 触发原盘地址 5182。宽容差允许早于对白打点，未修改。 |
| 学功夫 | 场景 12 的醉道士 EO195 实际触发 2205，对话正常确认五次；脚本 2237 切音乐 86，计时器推进到下一点。 |
| 上船 | 场景 6 从 `(1296,1224)` 实际走至 `(1280,1216)`，由范围外进入容差范围并打点；仅校准空间信号，不宣称完整乘船剧情已验。 |
| 生化危机 | 场景 55 的 EO924 真实触发 9716，进入 62 后定位 `(1312,1376)` 并打点。 |
| 剑柱 | 场景 169 按真实碰撞可走路径触发 22603，进入 146 后定位 `(464,1160)` 并打点。 |
| 祈雨 | DEV 指定主场景 228，正常标题“新游戏”进入完整 onEnter；32039 设置 `(1152,1040)`，32044 等待期间已打点，未写脚本游标或终态。 |
| 进锁妖塔 | 从 163 的可走侧过门进入 164，定位 `(672,704)` 并打点；另从 164 真实触发入塔演出，完整观察 165→147。 |

浏览器为隔离 Chrome context，初始位置准备使用现有 DEV 同场景传送语义，节点指针使用现有练习接口。移动、自动触发、对白确认、转场、onEnter、音乐及计时更新均走生产实现；不写终态、split、音乐或跳过碰撞。祈雨只指定 DEV 主场景并走正式新游戏入口。**这些证据证明局部信号可达与接线，不证明从新游戏到结局的连续剧情、自然路线必经性或完整视觉验收。**旧进出场景策略、容差和默认 PB 均维持原设计，不能称与 PalTimer 的打点时刻完全一致。

原盘 `SSS.MKF` 的 18 条相关指令、11 个场景和 10 个 EO 给出独立字节偏移/值/源哈希；18 条指令与当前全局提取脚本逐项匹配。参考 PalTimer 冻结到 `ba7ca7ccf1cb12968910f7bf717527b6d3b85dfe`，源 blob `0284a5d710d73355538db89b5007b10b74e3950c`；已读 `InitCheckPoints`、位置谓词、字段读取与香蕉检查范围，不将外挂源码当大宇原版。

首轮塔/剑柱直线路线受障碍阻挡；剑柱改用按真实碰撞预先计算的六步固定路线，塔改从另一可走侧准备。首轮上船碰到方老板对白，后续从另一侧校准坐标。失败与成功记录并存，不以 producer exit 0 给失败 case 信用；成功来自原始状态序列，明确没有改测试超时、规则、实现或碰撞状态。

## 八维裁定与复验

[增量记录](review.json)逐项列 checkpoints 的 A–H；其他十四文件、测试迁移/反控、全仓门复用上窗同版原件。七项局部信号已补齐，`checkpoints.ts` 接受、CODE3j `partial→accept`；其他十八张 partial 不附带关闭。固定 83 卡成为 65 accept／18 partial，账本 3403 tracked／408 closed／103 review／2892 pending。94–102 未扩展。

仓库根运行 `node docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/3j-route-calibration/verify.mjs`。默认只读、无网络/产品/测试执行，核版本、仅注释正文守恒、[完整原件](receipts.json.gz)、七项实际状态与诊断。`MATCH` 只表示这些具体证据匹配，不能自动证明设计或全流程。旧窗口的当前源快检会因本次注释哈希改变返回 STALE；本增量明确承接其不变正文及其余文件，不改写旧回执。

## 门与交接

合并基点 main 的 Documentation `39913781974` 与 Coverage `39913781939` 已 completed/success，App15368 两 required checks annotation 均 0；完整日志核零项目/平台诊断，20170 例／774 源，lint5942文件 error/warning/info 全 0。PR15 的全 check、official ratchet 与 protected fast 原件沿上窗复用，本次没有重采覆盖率或重跑未变测试。当前增量 check:docs、lint-zero（5944 文件，error/warning/info 均 0）、ledger、diff 与只读快检通过；首轮仅 all-cards 格式诊断，原件保留，格式化后清零。打包后的直接文档/静态复验及提交/推送/PR 门另存发布回执；不能把基点 CI 当新提交 CI。

所有本次场景成功记录的 pageerror、console warning/error 均为空；未新增完整剧情 E2E、音视频成品或二阶段编辑器预览信用。下一有限范围可转 pre94 3k；无下一位 Agent 提示词，Codex 继续负责。只读复验失效时按具体变动补核，不从头重审已接受文件。
```
<!-- incremental-original-source:end -->
