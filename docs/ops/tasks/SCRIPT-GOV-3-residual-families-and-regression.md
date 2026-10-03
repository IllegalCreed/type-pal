# SCRIPT-GOV-3 剩余问题族治理与开场回归

Status: build
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

## 验收顺序

核清清单→按族开build→真实compiler/runner/ProjectRuntime失败反控与修复→作者工程/资源重导闭包和幂等→
必要最小编辑器检查→整批冻结→001从正常新游戏开始，002–005消费真实前驱，story/物品取消站位专项/guards/保存专项分开。
所有静态error/warning/info清零，原失败与原档保留。後期代表视觉按已登记入口集中验证，不逐站重复从开头通关。
完整回归后关闭母任务，提交推送并清理临时工作树；仅在达到以上条件时完成持续目标。

## 上下文

- [二阶段铁律](../../phase2/READ-FIRST.md)、[协作工作流](../agent-workflow.md)、[一阶段知识](../../phase2/reference/phase1-knowledge-harvest.md)。
- [七类共性回顾](../../testing/e2e-001-005-common-issues.md)、[治理证据目录](../../testing/script-governance/README.md)。
- [安装边口径](../../testing/script-governance/install-census.md)、[当前检查点](../../testing/script-governance/current-checkpoints.md)。

## 下一位Agent提示词

只读取证已完成，按已核问题族和文件域进入build，无需用户转发。未满足全部验收条件不得标记done。
