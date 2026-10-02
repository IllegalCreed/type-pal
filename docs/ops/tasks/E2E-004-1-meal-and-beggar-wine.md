# E2E-004-1 - 端菜与使用桂花酒赠道士

Status: build
Phase: ops
Capability: E2E-R4-1 / W1
Coding Owner: entity_names（作者内容）；e2e004_runner（执行器），各文件单一Owner
Generation Owner: N/A
Reviewer: Codex 独立验收
Visual Verification Owner: Codex
Visual Verification Timing: mixed
Contributor: Codex 子 Agent；e2e004_phase1_premise独立只读核验
Branch: codex/e2e-004（Root接收）；贡献者独立分支见准入增量

## 用户范围（2026-10-02）

用户明确：从拿起酒菜开始，端给苗族跟班，再把桂花酒给醉道士，等该段剧情全部结束并可自由移动就结束。
此前建议“004止于桂花酒收入怀中”未获采用；当前边界包含正常物品使用与完整赠酒后续，不停在拿到酒，也不进入005。

- 前驱：本引擎真实003结束档（厨房交代已结束，尚未拿菜，菜仍在桌上）；只消费当前合法档及来源链。
- 范围：厨房取菜、端菜外观与正常楼梯/客房路线、给苗族跟班送酒菜、桂花酒真实入库存、返回门口、
  正常物品菜单使用、完整对白/喝酒与消失/李大娘远处喊话、恢复控制、真实保存与新上下文读回。
- 不做：去厨房接下买虾任务、出客栈/005、造物品/旗标/档、跳坐标或直接调用物品/剧情函数。
- 两引擎共用语义边界，各自输入/存档/观测；一阶段只作新引擎观感与内容参考，不按内部帧/坐标逐项硬对拍。
- 本卡仅登记已批准范围及待核事项，尚未分派Coding Owner、准入build或实现004 runner。

## 前提真值门（开工前补齐）

一句话前提：004必须通过玩家正常的场景物品使用启动赠酒，而不是交互或测试后门替代。

| 维度 | 已知证据/待核 |
| --- | --- |
| 原始内容 / primary source | 003卡已核取菜L583/服务L565等直接闭包；本批尚待直接核桂花酒使用及赠酒完整原始链。 |
| 第一阶段 | 待核真实物品菜单/面对场景对象使用入口、有效站位、对白与耗酒/恢复控制调用域；不以记忆代替源码。 |
| 当前二阶段 | items.json中272为桂花酒，use.target=scene、consuming=false，私有use脚本核facingEntity(s003/e62,range1)，失败提示后stopScript；有效时选赠酒c8-321c0a7d7de1并启用touch。 |
| 当前后续/目标 | s003/e62赠酒方案包含喝酒/约山神庙/道士隐藏/loseItem272/大娘喊话/逍遥应答，最后complete；实际菜单、触发时序和恢复移动仍待实跑证明。 |

直接作者锚点：s001/e20 trigger/take-dishes；s001/e15 trigger/default送菜长链；
s003/e62 trigger/c8-321c0a7d7de1；items.json id272 use.script(use)。地址比历史行号稳定。
桂花酒不是人物回血类选人道具，按当前位置/朝向判定；物品定义不会自动扣酒，实际loseItem在成功剧情正文，须核恰好一次。

最强替代解释：执行器只按交互也触发了旧绑定、恢复失败落新局或直接runScript造成假通。
反证：必须见正式恢复成功、合法拿菜/入库存、真实菜单选择与场景使用、成功/失败库存差异、实际剧情选择与控制恢复。
任何关键调用域unknown未核时保持draft，不以范围批准代替实现准入。

## 已知风险与脚本合理化

- 003已留counter：取菜将e19转朝下后，其auto/default继续朝上；用慢读至少3秒核实际覆盖，必要时局部接管/归还，
  不恢复全局NPC冻结，不为存档拆步骤。先查原始内容/第一阶段和当前实际调用域，不仅从静态脚本猜观感。
- 道士取姿态与auto禁用先后、喝酒/消失、耗酒和大娘后续方案选择需核真实时序，不机械压缩指令或估时等待。
- 按已批准要求，对实际经过的实体、方案、步骤同步命名；未确认身份/用途问用户，保留稳定ID。
- 作者内容/显示名已改变完整digest；从最近合法前驱正常重建当前链，不修改旧档或放宽版本/来源校验。
- 6012编辑器服务与用户页面保持；更新工程前核无草稿，不借执行器验证关闭它。

## 验收预登记

1. 从本引擎真实003恢复，取菜一次；桌上菜隐藏、端菜外观正确，未提前赠酒或凭空获酒。
2. 正常走楼梯/客房并送给苗族跟班；完整对白，端菜结束恢复普通外观，桂花酒真实入库存，不能重复取得。
3. 正常站到醉道士面前，经正式菜单“物品→使用桂花酒”触发；按实际UI核菜单关闭及前台剧情接管。
4. 错误位置/朝向使用不耗酒、不切赠酒方案/推进；退出菜单不使用；有效使用只执行成功链一次。
5. 不跳对白，核全部喝酒/约定/消失及大娘喊话；控制恢复后正常方向键产生合法位移（不以对话框消失冒充可移动）。
6. 结束仍处于005前，正确库存/外观/道士生命周期/大娘下一方案；正式保存与fresh-context恢复完整持久域与同引擎画面。
7. 状态驱动、有界动作/观测/超时，失败保留现场；无Agent/模型也能独立重跑声明流程。scope/source/checkpoint/收据分别冻结。
8. 必要源/内容/时序回归和硬性静态零诊断；剧情E2E集中实跑留图，菜单功能可最小开发期验证，不反复巡视既有003。

## 上下文锚点

- [第二阶段铁律](../../phase2/READ-FIRST.md)、[E2E合同](../../testing/e2e.md)、[双阶段路线方案](../../testing/e2e-route-proposal.md)。
- [003范围与交接](E2E-003-1-inn-stairs-and-kitchen.md)、[003原始回执](../../testing/e2e-003.md)、[保存修复](SAVE-AUTO-CHECKPOINT-1-background-script-snapshots.md)。
- [脚本合理化母卡](SCRIPT-AUTHOR-2-readable-inn-choreography.md)、[实体命名](EDITOR-ENTITY-NAMES-1-readable-scene-entities.md)。
- [剧情碎片目录](../../../projects/pal/e2e-checkpoints/README.md)；当前003 runner只证明未拿菜，不能代替004。
- item-use-executor.ts实际生产入口及原子使用/取消合同、正常物品菜单/场景使用与触发绑定须在build前读到端到端调用点。

## 当前模式推进记录

- 用户已批准004语义边界与物品使用范围；没有新的产品选择待问。
- Premise：部分只读已核，原始/第一阶段物品使用及主壳完整调用域待核；Design/Owner/build准入pending。
- 不修改schema/save/输入门禁或创建测试捷径；不恢复原版完整转换核；不实施剧情修复或宣称004通过。

## 下一位 Agent 提示词

无下一位Agent提示词，本批只记录用户范围。下一轮Codex先完成一手前提和现行003前驱核验，
再分派不重叠的004执行器/内容工作包，维护单一Owner及独立验收；draft状态不得开始产品实现或标done。

## 开工前核验与build准入（2026-10-02，覆盖上述draft历史pending）

Root已直接读原始提取/SSS字节关键项、第一阶段菜单/触碰调用域、二阶段菜单/主壳与当前作者树；未以静态核读冒充实跑。

| 维度 | 本轮直接核验 |
| --- | --- |
| 原始内容 | 取菜L583；送菜实际L469（L565只是厨房复读，纠正历史引用）；use L39647含81[63,1,38780]+25[63,650]，赠酒L650至732，720唯一20[272]扣酒。独立席核49处相关原字节；Root核583/469/720/39648/39649及OBJECT272 flags17（没有consuming）。 |
| 第一阶段 | menu-driver.ts:704–717正常库存use applyToAll跳选人→event-system.ts:3286；:3344清菜单返explore→scene-system触碰扫描启动赠酒。:4543当前场景面对守卫；mode.ts:43–47对话不推进auto只作UX参考，不复制全局冻结。 |
| 当前二阶段 | MenuSession:310–341/480–518→main.ts:4577–4592运行private use；当前只切touch/赠酒方案。main:2866仅投影、4260仅drain既有pending，唯一新touch检测3848依playerMoved，静止use不能可靠启动。e19 auto仅反复up/frame0，已有静态facing up。 |
| 目标 | 正常菜单有效use直接顺序await同一成功剧情，不再等待额外移动；错误面对仍提示不扣酒。唯一成功body归272 private use，不造shared复用/新schema能力/global touch轮询。e19退役pose回写循环，静态初值+取菜对白结束显式up/frame0收尾。 |

独立全作者引用审计：赠酒c8-321c0a7d7de1仅定义+item选择2处，没有第二复用、self/chase/call依赖；
e19 auto仅本页绑定，外部没有auto/页面/动作/移动/外观写，晚剧情仅trigger/显示/隐藏。Root分别读同一调用域与目标。
强反证：基线正常静止use后若无需落步出现172，推翻缺入口判断；候选若仍需移动/重复扣酒/遗漏喊话/不能正常走动则不接收。
错误use的stopScript在当前执行器可正常返回outcome success，故必须以真实菜单dispatch、正文/绑定/库存/生命周期证明赠酒，不能只看success。
取消反控为确认前Esc退出菜单；成功后不引入新回滚或作者pause状态。保持现行前台存档/输入门，不伪造物品或世界。

Root premise verified/design agree；两独立席直接读原始/一阶段、当前完整链后核验或提出上述counter。
修复保持原版/第一阶段体验（使用酒即喝酒、讲话面向逍遥、返做饭朝上），用户已批准004与脚本合理化，无新剧情取舍待问。
Codex build allowed，白名单与单一写入Owner如下；新未知前提/产品选择仍停止线核验。

### 所有权与交付

- entity_names：codex/e2e-004-content，仅s001/s003/items作者JSON、reforge新增pal-meal-author测试及旧pal-inn-kitchen/菜单用途相邻测试。
  内联成功body/删除旧唯一转接、e19静态化、实际内容具名；不改runtime/schema/save/editor/供应核/规则。
- e2e004_runner：codex/e2e-004-runner，仅新增scripts/e2e/meal-*旅程/合同/只读菜单observer/隔离trace/config/反控。
  不改001–003工具、产品或作者JSON；真实menus.view/game menuStack投影冻结DTO，不增可变产品后门。
- Root：接收树codex/e2e-004只写卡/看板/规范、package004命令、执行独立接收/必要质量门/正式冻结后实跑与6012交付。
  未接收前贡献者不得合main/标done，施工不能写Root或另一Owner文件；先红→绿，提交精确SHA后停写。
- 004 route包含e15真实一次性touch送菜，不以直接点随从/调用剧情替代；走路held，菜单按真实cursor/itemId确定按键，不固定连按。
  actor采集扩到e15/e16/e24/e25/e26与e19/e20/e62；真正提交/菜单实绘/dispatch/控制恢复有界，overflow/epoch/来源/像素/超时不放宽。
- pose反控>=3秒需真实host/collector；不靠手写auto模拟或仅命令列表宣布视觉pass。未实跑项登记可执行用例/Owner。

### 最近合法前驱

- RF001主树build/e2e/reforge-001-2026-10-01T14-45-18-085Z passed，真实档
  158d4f59f6b6e04d9855801000059c76913c85432e3a515de98313c3855ab695，SAVE10/content21、无auto resume/behaviors.entities；
  Root与工具席各核实际字节及所有记录source当前无差异，可复用，不重复已通过开场。
- RF旧003含旧digest活动resume，不能改旧档；作者冻结后从上述001正常002→003重建，真正恢复核当前digest/未取菜入口。
- game真实003在e2e-003-runner历史树build/e2e/game-003-2026-10-01T05-41-47-466Z，
  原档67adca00b0a0ed1f1649f65ba5134a4d3f9a49c506b0c670a77840b2b597ad21，第一阶段/原始数据当前hash零差异，可各自复用。
- 正式004必须等作者/工具都冻结再跑；开发diagnostic不冒充最终passed，原红保留。录屏/音轨独立，不由本批技术pass自动成立。

### 端菜外观的现行持久表达（同轮前提增量）

Root与当前审计席直接核：0x65原始写PlayerRoles的精灵持续跨交互；第一阶段真实保存包含该角色状态。
新主壳main.ts:2139–2160的setActorSprite只写actorSpriteOverrides Map，:847/save快照只clone(world)，
abortScript:4410清Map。取菜208直到e15送完才切本体，中间探索/菜单本来能存档，故不宜使用瞬态外观表达剧情持有状态。
现行setActorAppearance（script.ts:152、main.ts:2164–2216）可仅覆写spriteId，写CharacterInstance.appearance随world保存，
已有正常预载/恢复链，不需新增schema/save字段或版本。

- build白名单增量：作者Owner将取菜→送完的两条外观写改为现行持久appearance(208→li-xiaoyao)，其他维度不写；
  原帧/对白/路径不因此改动。实际中途保存/新上下文读回仍保持端菜，送完当前和读回均普通本体，作为本段反控。
- 可证伪：基线中途F5/fresh恢复若仍渲染208且角色外观有真实持久数据，则推翻Map丢失判断；
  候选若丢餐盘、持久旧208、影响portrait/battleSprite或写静态actor表，则不接收。
- Owner仍只内容与相邻/新增真实主壳回归；禁止动save codec、runtime实现或增加兼容恢复。这是已支持能力的正确内容使用，
  保持一阶段跨交互端菜/存读观感，没有新剧情或产品取舍待问。

### 当前交接提示

准入增量替代draft提示：贡献者在Root提供的独立worktree按本卡白名单实施、自验提交/停写，给精确代码/测试/风险；
Root独立读源/反控/实际执行后决定接收，源域扩张或产品取舍先报告，不依赖固定三签或用户搬运意见。
