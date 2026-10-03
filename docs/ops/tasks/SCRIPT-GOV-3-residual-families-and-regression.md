# SCRIPT-GOV-3 剩余问题族治理与开场回归

Status: review
Phase: phase2
Capability: W7 / P3 / Q1
Coding Owner: 下文分域独占
Reviewer: Codex Root
Visual Verification Owner: Codex
Visual Verification Timing: mixed
Branch: codex/script-governance-closeout

## 持续目标与完成标准

用户2026-10-03要求持续完成脚本共性治理，然后回归001–005，具备开始006的条件后交付；遇到需要用户决定的取舍即停止。
本卡承接[SCRIPT-GOV-1](SCRIPT-GOV-1-script-family-governance.md)，统一步骤模型已由[SCRIPT-GOV-2](../archive/tasks/done/SCRIPT-GOV-2-unified-author-steps.md)完成，基线8efe04861。
不开始006，不把所有未来剧情的逐段验收伪装为本轮已完成。收口范围是已登记的七类共性问题及本轮同族全量核查，
每个待核项必须有已修、已核无问题或明确后期视觉入口的证据；无法核定且影响当前修复的关键前提不能留给猜测。

6012继续运行，不关闭用户页面，不录视频、不修改旧档；主树.zcodeignore是用户文件。
候选在隔离工作树验证，整个批次冻结后统一重建必要前驱。用户已授权验证后更新主工程，若主树新出现作者修改先检查归属。

## 当前直接线索

Root在当前canonical内容重跑只读安装边普查：639原指令，580安装、53清绑定、6无操作；554唯一非零绑定。
指纹映射155、作者保护120、多上下文11、unknown294是扫描能力与归属口径，不能直接换算为缺陷数。
当前9条风险边对应8个绑定：

- s020/e343/auto/legacy-001（5076），s016/e217/auto/legacy-001（5214）。
- s021/e403/trigger/legacy-001（5818），s131/e2293/trigger/legacy-001（17546），
  s134/e2319/trigger/legacy-001（17573），s100/e1824/trigger/legacy-001（17632）。
- s126/e2219/auto/legacy-001（19629，两条caller）和legacy-002（19641）。

它们仍是候选而非已确认缺陷。原初扫29边/28绑定、前18后继及已核交接反例均保留历史，不能覆盖旧台账。
还须复核已登记淡出收尾、普通等待/帧序列时间单位、auto中剧情主链、瞬态外观跨交互用途、可靠命名，以及独立浏览器RPC挂起收尾。

## 前提真值门

| 维度 | 当前证据与待核事项 |
| --- | --- |
| 原始内容 | all.json的完整入口、advance/reset/call和安装指令只读；每个候选分别核上下文/说话人/后继/动作拍，不能只核首段指纹。 |
| 第一阶段 | event-system.ts的trigger游标和tickAutoScripts，以及knowledge-harvest E/N/X领域；原版数据不能回答的可见行为参考实际第一阶段，不复活旧结构耦合。 |
| 当前二阶段 | content22/SAVE11唯一步骤模型；run.mjs最新候选及实际caller路径/hash。保护已作者改写的001–005，机械结构已消除不代表旧漏正文自动补齐。 |
| 目标 | 完整且合理的作者步骤/正文/显式方案切换；副作用和后继正确，公共运行器/工具问题在公共层修复，以真实执行和全族回执闭环。 |

最强替代解释：指纹变了但已作者改写；已有后继通过别的方案切换；auto逐拍advance被误读为跨次交互；
源有未证明caller并非可触发，或当前模型/测试把正确演出误报。任何一项被证实时不得自动补内容。
Root在逐问题族前提核定前不授权产品实现；unknown时继续读源和调用域，确需产品判断则提交用户裁决。

## 前期只读分工

- Dynamic reviewer：四个trigger候选的源caller/owner/后继和说话人，及全639边分类覆盖中的未证/多上下文风险；只读，给可证伪结论。
- Motion reviewer：四个auto绑定及当前帧/等待族，直接核第一阶段调度和源序列，给完整动作/明确时间的步骤编排建议；只读。
- Family reviewer：已登记的分支副作用/淡出/持久外观/auto职责/时钟调用域与可靠命名，按全量当前内容统计风险，不以数量判定缺陷；只读。
- Root：独立读取关键原始证据，核准精确写入Owner/路径、维护有限闭合清单、E2E工具RPC及独立质量/浏览器验收。

前期draft只允许取证；本批build权限以下文逐族准入为准。不恢复完整原版转换器，不新增状态模型/parallel/join或兼容旧格式。
所有补丁使用隔离树绝对路径。同一文件只有一位Owner；Git提交由Root串行安排。

## 已核前提与分族build准入

Root已直接读原始5818–5843、15927–15933、17494–17589、8656/8756–8761、34097–34154、
31281–31305、5076–5095、5214–5258、8183–8211、17104–17177、19378–19657、41127–41129、
20369–20392、23519–23528、24771–24783、33561–33569、25168–25171；并读P1当前trigger结算、
OP_ADD_CASH、OP14及真实auto/goto/reset、tickSceneAutoFadeIn，以及现行main/EntityActionPlayer和E6a合同。
三位非Root reviewer各自核源并交真实运行反例，证据为本批三份residual-*-premise.md。
据此Root记premise verified / design agree / build allowed，限以下精确问题族，不授权按宽筛查全替换。

- 动态后继：报告四个原trigger，s134/e2319/default错接，s034/e573合八字复读，s262/e4568两段后继；
  保留原称谓、owner与speaker分离，未知root不编造caller。
- 动作：报告的初始四auto、s032三收招、s130三交替循环、s213芦苇漂回岸，及完整纯帧129记录的已核映射；
  18动作/98页绑定周期差异、s193单次误loop。286周期相同保持作者相位，743宽形状不自动批改。
  s126同一法事两次19629用现有playEntityAction/顺序正文明确复播；19641按幻影、慢读呼救与动作后半分段，
  不改全局select保留游标合同，不用off/use技巧，也不新增IP/dispatcher/parallel。
- 条件：跨族报告11绑定17失败路径，保留全部确认顺序、金额、资格及失败台词；19原负金额全部列闭合去向。
  普通付款不足不得扣部分余额或执行成功尾；木剑ownsItem资格不变，不借此次修复改其它原版玩法。
- 呈现：93消怪尾明示恢复，胜利/逃跑/失败分支分别验证；六动态portal与尾out切场归已有事务。
  其它40同场路径由Owner先读完整原始顺序、提出准确插入点，Root逐族核后写，不允许扫描批replace。
  RNG先呈现首帧再淡入，再继续剩帧；不能先露旧世界。001–005已改写正文保护，其它时期精确点需单列。
- 持久外观：11实体开门/开锁用现有页动作持久表达；两水中探索入口与离开恢复链须共同核，不能只改入口造成游泳粘住。
- 公共接管：main1435及已拍板E6a仅目标暂停合同，修auto姿态绕过已take目标的门；保持指令/取消/快照、
  release继续及无关NPC并行，不新增转向隐式take，不全局冻结。时钟有限域无新混用证据保留结论。

### 单一写入Owner

- Motion Owner residual_motion_premise：projects/pal/content/sprites.json，以及scene s016、s017、s020、s032、
  s126、s130、s193、s213的JSON；纯帧完整族、对应动作/已核等待、芦苇漂，及本次新增pal-gov3-motion*测试/证据。
  同文件其它已核恢复点由Content提出精确候选交Motion写；其它场景的纯帧修改由Motion给前后hash/完整候选交Content写。
  全sprite动作/静态开门pose由Motion统一写，Content只请求不并写。
- Content Owner residual_dynamic_premise：projects其它本批作者JSON（不改Motion上述文件、资源/地图分区），
  七trigger/付款及索物/消怪/portal/已核同場恢复、持久门页与水中恢复链；新增pal-gov3-content*真实执行测试与逐项回执。
  不修改已核正确286页动作相位，不把未知caller当可达，逐项读取跨族报告原输入。
- Core Owner cross_family_premise：packages/reforge本次公共target authority门及真实主壳/快照测试，
  不写pal-gov3-motion/content前缀或projects/editor/migrate/scripts/docs；若确需公共类型先报Root核准，不扩大渲染/战斗。
- Root：本卡/母卡/看板/索引、纯只读scanner、E2E RPC/进程收尾、migrate作者基线与发布边界，独立复核和整仓门、集中回归。

任一新增产品取舍或关键表达缺口仍停止对应实现报Root，Root需要用户决定时停止目标工作。

### 追加的精确核定（2026-10-03）

- Core自动姿态/页动作接管包已冻结交独立复核。内部checkpoint只标记当前可重入叶的快照边界，
  不写存档函数、不改变SAVE11；姿态提交前再核exact signal、activation、scene session及目标authority，
  前台动作可替换已暂停的自动动作。Root独立读7文件并先复跑5文件54项通过，完整137项相关门另跑。
- Root直接核raw10423和31286，以及P1 `event-system.ts:4363`：两条0x83比较当前场景中两个实体的平面距离，
  并非“实体在场”。格坐标等价条件为`max(abs(dcol),abs(drow)) < .5`；异场或缺实体为false，height/state不参与。
  当前误译会提前触发捕兽夹/芦苇漂；s048等待后还有重复成功尾，须改为等靠近后只执行一次。
  Core获准扩展现有条件为通用`entitiesNear {from,to,range}`，严格非负有限range、双地址校验/引用/编辑/预览/运行闭环；
  不做opcode特例、不改变道具放置资格，不保留错误entityInScene语义或可选宿主的伪false回退。
  Core独占相关content/editor/reforge实现，Content写s048/e797，Motion写s213/e3606。
  这项保留已核原行为，没有新剧情取舍；作者合同批次冻结时由Root统一切content23，SAVE11结构不变。
- s032完整caller的两处8161/8175确为advance，Root已读完整8148–8181。允许Motion把e547与e549协同背景动作
  编排在一个步骤正文的显式双实体时间线中，以真实随机路径、声效时刻、净位移与反复执行证明，不新增parallel或重启合同。
- s005两个页相位来自C2提交7eeec81f2，不是本轮剧情作者改写。Motion用真实action解析证明旧240/660都位于frame1边界；
  新节拍下对应offset均为100，Content只改e118/e120这两个startAtMs，保留初姿、朝向和cue，不盲删相位。
- s126再次入场重播的初步猜测被反证：Root直接提取基线initial.next已是complete，故不修改、不计缺陷。
  只读static-hook指纹普查127匹配/100未匹配，匹配项中没有advance→plainend却缺next的候选；不能将未匹配当错误。
- Root独占E2E浏览器watchdog。轮询无法打断挂起RPC，故新增独立操作/全程期限及有限诊断、清理；
  仅杀本轮BrowserServer的确切ChildProcess，迟到launch结果也清理。真实自有Chrome暂停后newContext挂起，
  watchdog按期终止并回收；8项反控通过，全部219项E2E工具回归通过，不连接或关闭用户浏览器/6012。
  原始日志保存在`/tmp/type-pal-gov3-browser-watchdog.log`及`-root-e2e-tools.log`，最终证据归档后才清临时树。
- Root逐条直接读40同场out到首次呈现IP+2的完整源序列，对照
  `pal-gov3-content-presentation-candidates.json`，批准其中39个world恢复点；包括保护场景的明确后期方案，
  不改001–005作者主链。in600放在摆位/状态准备后的首个可见wait、redraw或动作边界，条件点留在所属臂，
  不把多个out合成一次结束恢复。s016三点与s020一点仍由Motion独占写，其余Content写。
  s011首out2235依赖单独呈现合同：Root与Content直接核buffered末帧当前不可见，拆首帧后fade会露世界。
  Root另读原2235–2248、P1首帧淡入测试和rng-player的hold-first-frame600；Core先核最小显式能力再报准入，
  禁止用假dialog、隐式fade猜测或后台并行技巧绕过。s011第二out2249的world恢复不受这个依赖阻塞。
- Core独立核现有frame range、黑幕hold与对白buffer均不能显式保持首帧；Root准入
  `playFrameAnimation.holdLastFrame`可选参数与`clearFrameAnimation`叶，同批content23。
  默认仍原buffered合同，只有成功且本次有帧的hold为可见held；声效、fade、clearDialog不暗改模式。
  Core独占类型/严格validator/registry、runner/主壳/编辑器与反控，Content只写s011编排。
  播放、decode、结束回调及clear/scene/save reset必须以瞬态exact owner保护，不新增SAVE字段。
  Root另核teleportParty并不清Cinematic，候选原理由已被反证；s011尾out后须显式clear，再揭示准备好的world。
  该能力是已登记画面恢复缺口的必要表达，不改原动画内容、不引入并行模型，也不提前开始006剧情。
- 首帧时间核定后，Root不接受先等62.5ms再淡入的次序偏差。补准入可选且显式的
  `playFrameAnimation.initialFadeInMs`：本次首帧同步呈现后先完成in600，再等待该帧自身62.5ms并续播，
  完全保留P1顺序；省略参数不推断淡入。通用播放器只提供首帧就绪回调，fade仍归呈现宿主，
  无须把声音或fade藏进另一套时间线。s011整段0..112用该参数，故不再拆0..0；其余片段只显式hold。
  这是可证原时序的技术修复，不要求用户选择主动偏离；同批严格校验/转发/编辑/取消反控由Core完成。
- s016/e218源5566–5571为连续四帧各100ms后隐藏自己；Root直接核准一步闪现后finishStep stay，
  当前激活结束且保留initial，下一次caller显现才再执行，不在隐藏期登记forever活动。
  Motion可合并同正文default/legacy，完整8caller改选default并核8次闪现、原声效位置、隐藏期快照/恢复；
  不改变全局select保留游标合同，不新增restart/off-use技巧。
- Root独立核普通world等待候选的507个source对应关系：每个IP确为0x09，旧值为max(N,1)*40，
  目标为max(N,1)*100；去重475个作者字段、492原IP、72场景。421个当前完整wait和bodyHash仍吻合，
  获准只修其ms；54个正文已改，须明确重定位或已修替代表达，不按旧索引写、不记作0待核。
  直线trigger/hook由完整marker+wait顺序核映射，非09 delay、auto padding、非线性、保护及未知归属排除，
  整批其余字段保全。Motion独占8scene，其它由Content；Root独占将只读普查收为可复跑工具与误匹配反控，
  不增加产品写入或复活转换入口。余下原09分类不是“无问题”证明，不宣称全游戏演出已经实跑。
- 水中持久外观已核完整源24769/33561入口、24891/33737离开和24101灵儿既有蛇形512，
  以及当前main只对party写appearance、setParty保留reserve而不清临时sprite。
  准入s144/s252在原setParty后持久化3/2泳装；s149在离队前恢复Li/月如本体和灵儿512，仅sprite维度，
  s251在离队前WuHou本体、33752后Li本体。s250仍水中，不按地图号清外观；原232/193/541临时演出保持。
  Content须以当前Character/主壳/SAVE核入队前缺Li、返回仍水中和reserve不粘泳装，不只查命令字段。
- s048鹿被捕后frame16跨交互到领奖才变，Root直接核10430/10440与main读档清临时frame，
  故准入同族caught持久页；Content独占scene48，Motion独占sprite266的真实对应单帧动作。
  保留六叶原顺序/声效、触发与碰撞合同，仅添同拍页状态；读回仍caught，领奖转0/逃离及奖励一次须反控。
  Source/P1/当前帧解析须证明同一真实帧，不猜布局或伪造原资源帧数。

## 验收顺序

核清清单→按族开build→真实compiler/runner/ProjectRuntime失败反控与修复→作者工程/资源重导闭包和幂等→
必要最小编辑器检查→整批冻结→001从正常新游戏开始，002–005消费真实前驱，story/物品取消站位专项/guards/保存专项分开。
所有静态error/warning/info清零，原失败与原档保留。後期代表视觉按已登记入口集中验证，不逐站重复从开头通关。
完整回归后关闭母任务，提交推送并清理临时工作树；仅在达到以上条件时完成持续目标。

## 冻结候选与独立验收（2026-10-03）

候选提交：`f7a2cd17c`（隔离分支 `codex/script-governance-closeout`）。该候选包含本卡准入的三域实现与作者内容，
未修改 SAVE11 字段或旧存档；6012 页面和服务保持原 PID 运行，主树仍只保留用户 `.zcodeignore` 未跟踪文件。

- 公共接管、距离条件、帧动画 owner/hold/首帧淡入/清层及浏览器 watchdog 已由 Root 独立复跑；Reforge 全包
  `289` 个测试文件、`8,365` 项通过；Content `128/1,274` 通过；Editor `497/3,814` 通过；三包 typecheck
  零诊断，Biome 目标文件与整仓 lint 均 `0 error / 0 warning / 0 info`。
- 条件/消怪/门/游泳/同场恢复/捕获页及动作族均以真实 compiler/ProjectRuntime/宿主反控闭合；作者工程检查
  `294 场景 / 223 地图 / 1,934 资源` 通过。OP09 世界等待精确改写 `389 sites / 81 stages / 66 scenes`；
  `54` 个正文已改候选、以及 `111` 个未见 world root 的原始地址继续明确保留为未改/待核，不把它们冒称已修。
- 旧 GOV2 auto oracle 原字节未改。已改动作由 `pal-gov3-motion-transition-ledger.json` 保留旧 hash 与新源/测试证据；
  旧分阶段 receipt 的 after hash 保留其当时冻结快照，最终等待批的 canonical stage hash 和 `before/after ms` 由
  `pal-gov3-content-world-wait-receipt.json` 接续，不静默改写历史证据。
- 当前版本 Reforge 前驱链真实重跑通过：
  001 `build/e2e/reforge-001-2026-10-03T10-45-08-230Z`；002 `reforge-002-2026-10-03T10-46-42-428Z`；
  003 `reforge-003-2026-10-03T10-47-55-480Z`；004 剧情 `reforge-004-story-2026-10-03T10-48-37-189Z`；
  004 保存专项 `reforge-004-saves-2026-10-03T10-51-28-387Z`；005 `reforge-005-story-2026-10-03T10-52-32-962Z`。
  每段均为独立 verify profile、无视频；002–005 消费本轮前一段正式存档，001 在最终内容冻结后重新起跑。

本节记录的是隔离候选的独立验收，尚未表示主分支已更新；Root 将先把候选 fast-forward 到 main、推送并复核远端
commit/clean 状态，再将本卡与母卡收口。未开始 006。

## 上下文

- [二阶段铁律](../../phase2/READ-FIRST.md)、[协作工作流](../agent-workflow.md)、[一阶段知识](../../phase2/reference/phase1-knowledge-harvest.md)。
- [七类共性回顾](../../testing/e2e-001-005-common-issues.md)、[治理证据目录](../../testing/script-governance/README.md)。
- [安装边口径](../../testing/script-governance/install-census.md)、[当前检查点](../../testing/script-governance/current-checkpoints.md)。

## 下一位Agent提示词

只读取证已完成，按已核问题族和文件域进入build，无需用户转发。未满足全部验收条件不得标记done。
