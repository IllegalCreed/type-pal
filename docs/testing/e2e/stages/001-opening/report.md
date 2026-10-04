---
testingSchema: 2
id: e2e-001
evidence: e2e/evidence/e2e-001.json
---

# 001 开场执行器：双引擎完整验证

<!-- testing-meta
{"schemaVersion":2,"id":"e2e-001","sourceRefs":[{"path":"scripts/e2e/opening-both.mjs","lines":"1-84"},{"path":"scripts/e2e/game-opening.mjs","lines":"1-471"},{"path":"scripts/e2e/reforge-opening.mjs","lines":"1-253"}],"publicCallers":["pnpm e2e:001","pnpm e2e:001:reforge","pnpm e2e:001:both"],"legalInputs":["fresh new story","normal Enter/Escape/F5 flow","same-engine save/load"],"businessOracle":{"type":"opening-dialogue-and-restore","assertions":["55 dialogue rows","stationary intervals have movement witnesses","fresh-context restore"]},"dedupe":{"result":"reviewed","against":["e2e-contract","e2e-route","e2e-002"]},"revision":{"currentSha":"0a8c998f","contentVersion":21,"minimumSaveVersion":10,"currentVersion":{"content":22,"minimumSave":11},"history":["2026-09-28 verify","2026-10-04 metadata audit"]},"evidence":"e2e/evidence/e2e-001.json"}
-->

[任务卡](../../../../ops/tasks/E2E-R4-1-route-and-checkpoint-foundation.md) /
[跨阶段合同](../../contract.md) / [剧情边界](../../../../../projects/pal/e2e-checkpoints/README.md)。

2026-09-28：[001收口卡](../../../../ops/archive/tasks/done/E2E-001-CLOSE-1-dialogue-and-actors.md)已核定 **verify done**。
覆盖game/Reforge各自001正常流程与真实检查点、55行正文及说话人、24个对白块的完整显示、
参与本段的队长/e3出口/e8密道遮挡物/e10行走李大娘/e11床边替身；保留两句站定对话与离场偏序。
这是verify合同，不是capture-ready或全游戏所有NPC验收。无需AI、模型账号或人工逐句回车。
二阶段产品/内容未改；一阶段修复四行翻页跳过第5行、自动淡入未补足调色板两处bug，
未改原版提取资产/存档格式。

## 新旧脚本具体差异

| 项目 | 第一阶段 | Reforge | 裁决 |
|---|---|---|---|
| 存储形态 | L_4梦境16条、L_3545叫醒190条（含raw/样式/称谓/end） | s000正文11条；s001准备2条+正文138条、显式stage next | 不是一条opcode对一条作者指令；称谓从独立文本变为identity |
| 对白正文 | 55行（其中梦境4行）；原先漏1331/1338 | 同一55行、24个cue；排版后26页 | 原遗漏是第一阶段运行时bug，已修；不靠删二阶段台词求一致 |
| 语义与演出 | 原始编号2/193/627与NPC对象3/8/10/11 | 稳定id及显式动作，普通李逍遥为li-xiaoyao | 姿势0→1→2→3→0、替身切换、密道遮挡物四出四回与离场相符 |
| 对话期停步 | 旧引擎的等待/自动脚本帧序 | 显式编排，不增加全局“对话冻NPC”耦合 | 两指定对白区间实际位移均0；动作前后有非空移动正证 |
| 起档与恢复 | F5→正式导入→标题/槽位UI读取 | save barrier→dumpSave→正式e2e-load恢复 | 各自真实链；不能互喂存档 |

本次实跑两边**剧情确认都是23次**。总按键36/30的6次差额来自一阶段F5及读档标题/槽位步骤，
不是多6句对白。game的55个“全显行/页变化”也不能当成55页与Reforge26页硬比。
party位置提交9/10含不同的入场初始化（两边正文步行各8步）；不能按内部坐标/次数宣称剧情差异。

## 自动失败门

`opening-matrix.mjs`冻结55个textId顺序，交叉核原始文本（只剥本段实际出现的$NN/~NN）与locale；
运行前后源hash必须一致。game从实际drawDialogOverlay之后读取全显正文，Reforge从实际render/update边界
读取完整页，不以history/请求的ID代替已显示正文；姓名、正文、顺序、所有分页必须相符。
每角色状态连续性、提交来源、姿势/显隐/道具往返、序号/溢出均失败关闭。同快照隐藏/显现视为原子交接，
不把对象枚举顺序冒充时间顺序。原来的Aunt提交来源census与两个站定区间断言仍独立运行。
另取awake/aunt-at-door/secret-passage三幅稳定等键截图，以及结束/读回截图。
结束/恢复各等待实际浏览器帧，并对本引擎静态房间Canvas RGBA作SHA256回验；拒绝黑帧和不一致画面，
这不是跨引擎像素硬比，也不只相信逻辑“loaded”。

## 怎么运行和观看

### 2026-09-28 最终执行证据

代码候选`0a8c998f`，有窗口双引擎独立运行与比较均exit0；原始产物已复制保存在主工作树
`build/e2e/`（report.output保留原执行工作树地址）：

- 比较：`both-001-2026-09-28T04-14-33-230Z/comparison.json`。
- game：`game-001-2026-09-28T04-14-33-487Z/`，真实档SHA
  `54a515a2352a2495570a27201ae0c8c87210f2006b026b124eaddf4c35030cf1`。
- Reforge：`reforge-001-2026-09-28T04-14-33-490Z/`，真实档SHA
  `c14a252153eacf412a33b56048cf46f8ec79bcc4dbf98022436eea7baccfda6d`。

两边55正文/24对白块/23次剧情确认；三节点与结束/读回共10张截图均经核查，
恢复前后持久域hash各自相同。game Canvas RGBA前后均`e064025e…`，Reforge均`167d0d92…`。
演员变更日志98/93条、完整显示变化55/26条；姓名/正文/分页、替身姿势、密道遮挡物8次提交、
李大娘2区间静止及移动/回头/隐藏/控制偏序全部通过，观察错误与溢出0。
这里的显示变化是两种引擎各自的记录粒度，不冒称跨引擎页数/坐标相等。
七包完整check10,207、工具31、官方ratchet与保护90d977d5的单次严格fast9,746/730文件均通过；
TC/lint2,398文件零error/warning/info，source集合未缩减，其余六包完整基线对象不变。
原始质量/最终执行日志另保存在主树`build/e2e/001-close-20260928/`；
已归档001验证子卡，录像音轨/full-Q1-Q2/002仍独立归属。

仓库根目录（Node22、pnpm、已安装Google Chrome；原版提取资产须本机已有）：

```sh
pnpm install --frozen-lockfile
pnpm e2e:001
# 二阶段PAL：
pnpm e2e:001:reforge
# 两套同时执行，各自完成、各自保存；一方失败不会跳过另一方：
pnpm e2e:001:both
# 无窗口执行同一条路线：
pnpm e2e:001:both --headless
# 无需游戏资产/浏览器的执行器合同测试：
pnpm test:e2e-tools
```

默认打开独立Chrome窗口，both打开两套，用户可观看；请勿手动干预测试窗口，否则输入或结果可能失败。
脚本自建随机空闲端口的HTTP Vite服务，strictPort拒绝抢占，结束时只关自己启动的服务/上下文。
不使用6010/6005用户服务，不连用户Chrome profile；两个上下文分别确认存档槽初始为空。
本地测试拒绝页浏览统计弹窗，不修改用户已有隐私选择。Ctrl-C会走自己的资源清理。
`E2E=1`仅不挂basicSsl，不代表Service Worker或其它测试后门。

## 一阶段真实执行链

1. 正常启动到标题；1/2.mp4为001边界之前的商标/标题视频，正常按Enter关闭并登记。
2. 标题选择“新的故事”，3.mp4必须收到原生ended；禁止skip-intro/dev-scene、改播放速度、跳场景。
3. 梦境→房间，全程只读DEV状态；只有对话waiting-page-key/waiting-end-key才发正常Enter。
   打字、自动尾停顿、脚本移动/等待自然运行；没有固定回车次数，不改脚本游标、等级、库存或坐标。
4. 核梦境“作恶多端的罗煞鬼婆”、房间“真没意思”“现在被发现就惨了”；脚本结束、场景2可控。
   `dialogHistory.map`是资源mapNum（梦境20、房间12），不是场景编号1/2。
5. Escape打开并关闭实际菜单，证明控制入口；F5走生产快存1；Save.loadSlot+serializeSave导出本次真实档。
6. 全新上下文再次确认零槽，用正式parseImportedSave+Save.saveSlot导入刚才的字节（与工具面板相同操作）；
   正常菜单选“旧的回忆”→槽1；等待读档/自动淡入收尾，比较真实世界摘要/完整持久域hash并再次打开菜单。

存档仍是一阶段当前`type-pal-save`格式，不是二阶段SAVE9；文件本身不注入额外元数据。
报告记录来源/资产及runner散列。此档是后续002的真实前驱候选，不伪造角色配置。
持久域比较含队伍位置/角色运行时/背包/现金、rgScene/rgObject/rgEventObject及全局NPC位置/状态/触发续点。
动画计数不当作持久剧情差异；读档有现行清状态/装备重算等语义，不把所有瞬态硬对拍。

## 二阶段真实执行链

`VITE_PROJECT_ID=pal`的独立HTTP宿主；正常`?menu`标题、新游戏introVideo（video.pal.003）原生ended，
随后s000→s001。标题、对话和恢复结果读取独立只读DEV口`__tpObserve.readBoot/readRuntime`，不会调用调试advance；
既有`__tpE2e`检查点安全导出注册保持原样，不与标题期观测混用。
DialogBox.observe返回冻结的新DTO：当前cue/slot/page、typing/waiting-input/auto-advance、当前页行ID与实际排版正文。
读取不tick、不绘制、不修改游戏；只有waiting-input才发正常Enter。未显示的后续行或仅正确textId不能冒充剧情锚。
人物位置和淡入数值变化不算确认键已消费，变化日志不会随着连续移动/淡入逐帧增长。

结束同样核房间可控和真实Escape菜单开关。现有dumpSave走生产快照窗口，导出**本次实跑**SAVE10/content21。
2026-10-01自动flow内部续跑切换后需重新执行001；旧SAVE9回执原样保留，不升级为当前002前驱。
2026-09-30完成语义切换后须重新正常执行001；上述2026-09-28的SAVE8/content20回执仅保留为历史证据，
不得修改其版本或游标后冒充当前002前驱。
第二个全新浏览器上下文先证IndexedDB为空；只把这份原始字节经测试自己的HTTP端点交给现有`?e2e-load`。
必须显式恢复结果loaded，失败落回新局不算通过；不传e2e-load-scene/pos/party/give/preset。
恢复后比较完整持久快照；只归一当前schema允许缺省的skillUseCounts与本段为空的读档清理状态，
若本段意外携带非空毒/状态即失败，不通过删除字段掩盖。两引擎存档从不互喂。

二阶段额外产物`001.restored.save.json`与前后持久域hash，目录`build/e2e/reforge-001-<time>/`。
HTTP `.type-pal/save-state.json`不存在是现行“干净工程”的合法404，独立列为已知启动告警；任何资产404仍失败。
浏览器Canvas2D的willReadFrequently性能提示如实记录，不等于lint/typecheck告警；声音与录像效果尚未验证。

## 稀疏NPC提交与语义比较

执行器使用独立`game-trace.config.mts`/`reforge-trace.config.mts`保留各包原Vite配置，并增加只读AST插桩。
仅在本次隔离服务中生效；产品源码文件、普通dev/生产构建、存档和生成内容不改。
源码锚点/实体写入点数量必须准确匹配，日志附原文件hash；不允许插桩失配后悄悄跳过。

- 一阶段观测真实`npcWalkTo`/raw opcode/骑乘/追逐执行边界，不把追逐碰撞回滚的临时坐标当提交；
  tick/render仅补对话和控制权变化，不冒充移动来源。
- 二阶段在通过提交校验的实体pos赋值前后观测；被拒计划不会产出move。对话在画完后、auto推进前记录，
  不主动调用advance/update。
- 本段“离开床边的李大娘”分别映射为game场景2/id10、Reforge s001/e10；不是厨房id19，
  也不把两引擎坐标单位、步数、耗时或页数硬对齐。
- 记录实际位移、显示/朝向变化、对话内容/phase变化、控制权变化。最多1600条，无位移帧不追加move；
  事件gap、溢出、观测异常或首次在render发现位置变了都会失败。
- 自动核“走近→一大早就有客人上门啦→继续走/回头→还不快过来帮忙→离开→隐藏→恢复控制”。
  两个对话区间必须见到真实等键相位、NPC可见且零位移，并有前/中/后三段非空移动作正证。
  不靠起终点相等判断站定：中间往返两次也会被抓。

单引擎产物新增`npc-trace.json`，`report.json`含`timing`。`e2e:001:both`从两个子进程的实际回执取证，
再写`build/e2e/both-001-<time>/comparison.json`；一方失败不停止另一方，最终整体非零退出。
发现差异保留原始日志，先定位内容/迁移/运行时或测试模型，不往Reforge加入“对话冻结所有NPC”的规则。

## 有界证据与停止线

产物只在gitignored `build/e2e/game-001-<time>/`：

- `report.json`：revision、runner/资产hash、输入原因、状态变化、结果与未证边界；不是每帧全世界dump。
- `001.end.save.json`：本次F5实际存档；报告有SHA256；新上下文导入后再次核字节hash。
- `001-end.png`、`001-restored.png`；失败时`failure.png`与原始错误；`server.log`。

单次总预算240秒、最多240次按键、600条变化事件；视频观察另有80条上限。超限直接失败，不截断冒充完整。
未知场景/菜单/战斗/对话phase、视频error、pageerror/console.error、检查点或起始槽不符均失败。
50ms轮询仅用于等待状态，不用于指定剧情持续时间。没有多数通过或自动重试放行策略。

## 边界与历史未完成项

- 全对白/本段e11、e8、出口与队长已在本轮补入矩阵；未参与本段的厨房/住客等NPC归后续碎片，不冒称整场景覆盖。
- 002导航/机关/遇敌/剧情Boss、录像音轨/镜头/Content Studio材料、完整Q1/Q2不在首批通过范围。
- 第一次校准因把mapNum误认wNumScene失败；第二次核到恢复截图仍在自动淡入初始窗，已把needToFadeIn纳入等待。
  这是执行器问题，不修改游戏产品来迁就断言。

2026-09-27最终有/无窗口独立跑均exit0（各131变化事件/36按键/约76秒），两次持久域摘要一致；
7项执行器合同、七包9741项、全包TC和严格lint零诊断均通过。详细hash/产物/日志见任务卡交接。
本批已接受集成；母卡继续build，不标整段双引擎done，官方覆盖基线无变化。

上述是一阶段首批历史结果。二阶段增量：6项只读/标题/恢复观测测试，工具合同增至12项；
有窗口与双引擎并行无窗口实跑均通过，最终check9793、单次受保护strict9301/728、TC/lint零诊断。
只读观测使用独立__tpObserve，旧__tpE2e安全导出注册逐字不变，原17项保护保留并通过。
生产build退出0，但新旧基线均有大于500kB的包体积提示，未改阈值；不将它表述成“构建零提示”。
详细hash、首次接入失败及修复、日志见任务卡；不套用前批9741/零产品diff的历史口径。

2026-09-27稀疏时序增量：无窗口/有窗口双跑及真实检查点回验均通过，日志138/103条、各29次提交，
两段对话零位移并有真实回头事件；采样间往返/删提交钩子的反例有效。
工具22/22、完整check9793、typecheck/严格lint零诊断；仅E2E工具/文档变更，官方覆盖基线保持不变。
当时比较回执`build/e2e/both-001-2026-09-27T04-10-09-058Z/comparison.json`；这是本轮补齐前历史证据。

## 本轮失败记录与归因

- 一阶段真实tick回归原红（第五行缺失），修后10项分页/换样式/显式清屏/隐式pre-op及相邻共405项绿。
  scene145旧立绘测试未推进时钟，漏掉的第五行~80恢复后暴露测试驱动缺陷：补真实时钟与第五行断言，
  原无立绘/保缩进断言未放宽。日志`/tmp/codex-001-pagination-{red,green,green2,tc}.log`。
- 矩阵初版误写普通精灵0，已按原始0x65 operands=[0,2,65535]校正；同帧显隐按sampleId而非数组seq判。
- 带门实跑首次Reforge因+0/-0严格比较失败；正向小型合同也复现该oracle bug，零轴保持0修正。
  前次失败回执与日志`/tmp/codex-001-matrix-gated.log`保留，不算业务通过。
- 工具新增7项（总29），含缺正文但ID仍在、错姓名、删除演员事件、替身迟隐藏、克隆隔离、稀疏/溢出反控。
  修复过程中单处可选链warning与forEach返回值格式诊断已清零，未降级规则。
- 有窗口矩阵初验`both-001-2026-09-28T03-44-19-508Z`两边通过；该回执属于三截图加入前，
  最终候选/统一门/截图目视由收口卡补记，不与前轮快照混用。
- 三节点截图候选557c187c两边已通过；目视工具曾把重复读回图显示成近黑，Codex一度误报疑似黑屏。
  复核结束/读回PNG均为`57b8edc33c807ec03ed9f79702f3cc618968f650ab839abee1f3c570745cb3d7`，
  单图/Canvas裁片正常，DOM位置/显示属性正常，实际并无恢复黑屏；未因此改游戏产品。
  保留更强的同引擎实际Canvas像素回验及两项工具回归（工具总31），明确这是验证增强而非“修黑屏”。
  e8根据密道打开图确认为密道遮挡物，撤回沿旧注释写“锅具”的不准确名称。
- 像素门随后拒绝了真实game色差：读档后53003个非黑像素全部按60/64变暗，10秒也未恢复。
  `presentFrame`无人等待的自动FadeIn只清状态，忘调已有finalize；sdlpal palette.c:257-259明确补满。
  三种无人等待条件均以实际presentFrame颜色断言变红，修后与有等待者/SceneFade63/64正控共6项绿。
  不修改期待图、不归一化亮度、不降低像素门；该色差与前述重复图展示误判无关。
  原始失败`both-001-2026-09-28T04-06-55-249Z`与`/tmp/codex-001-palette-{red,green}.log`保留。
