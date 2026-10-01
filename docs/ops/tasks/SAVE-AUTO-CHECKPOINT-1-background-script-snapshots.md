# SAVE-AUTO-CHECKPOINT-1 — 后台自动脚本不阻塞保存

Status: build
Phase: phase2
Capability: X1 / W7
Coding Owner: Codex Root
Generation Owner: N/A
Reviewer: Codex（自验后独立第二遍复核；不冒充第三方审查）
Visual Verification Owner: Codex / User
Visual Verification Timing: mixed
Contributor: Codex
Branch: codex/e2e-003

## 目标与范围

用户2026-10-01否定等待全地图自动脚本结束的存档机制，在询问原版实现后要求修好并继续。
后台巡逻、长路线、wait可在途保存；作者步骤不是执行断点。已执行的奖励不得因读档重放。

- 修改白名单：content的自动执行续跑类型/guard；reforge runner、coordinator、两类project runtime、主壳快照/恢复预检；
  当前SAVE版本常量及消费者的机械更新、三份manifest、相邻测试/现行规范/任务卡。
- 继承隔离候选：s003/e56原十条指令合入一个步骤及其实际主壳/走位回归；不改其它剧情或移动算法。
- 不做：编辑器新增状态/命令位置界面、parallel/join、旧档升级/双读、原版转换工具、战斗中途存档、
  对话/确认/非持久临时调用栈序列化。交互业务保留原有modal/活动边界，不让后台自动走位阻塞它。

## 前提真值门

| 维度 | 真值与一手证据 |
| --- | --- |
| 原版/primary source | SDLPal参考实现global.h:95–113、global.c:863–871、play.c:172–184记录NPC位置和自动指令地址并直接复制；不是原版EXE实测，不以原版机制约束新引擎。 |
| 第一阶段 | game/core/save/api.ts:63–71直接克隆当前GameState；event-system.ts:1244–1255逐条推进并保留autoCursor，没有等待全地图auto结束的屏障。 |
| 当前二阶段（977d391f4） | runtime-script-project.ts:471、script-project-core.ts:531等coordinator全部active退出后才快照；script-world.ts:712的active.size门及script-runner-core.ts:198步末提交导致长路线/常驻脚本阻塞。main.ts:4529–4535只克隆world，而NPC在途坐标仅在活scene。 |
| 目标 | 自动flow在指令边界保存内部执行帧，目标移动/wait允许从当前指令续跑；快照同步覆盖本场景实际NPC坐标，不等待整个步骤或巡逻结束。奖励提交后的快照指向后一条指令。 |

- 最强替代解释：只是10秒太短。先前进展watchdog候选仍等待全部safe point，用户已否定并由Root撤回；不得恢复。
- 可证伪：任一巡逻/在途目标移动使保存等待该动作结束；读档重复奖励、重新抽取已选分支、丢失循环次数、
  用旧内容解释新执行位置、或旧世界晚到移动污染新世界，均推翻交付。
- 根因层：运行时存档缺执行续跑；非提取/迁移/数据解码问题，不重导作者正文。
- before -> after：自动脚本整步结束才可存档 -> 自动指令边界/可重入走位当下可存档。
  代表：e56下楼单步骤途中F5/F9。用户明确要求修复；纯走位允许步骤重跑，本设计内部续跑避免回走与奖励重复。

## 上下文锚点与设计

- READ-FIRST铁律4/9/11；phase1-knowledge-harvest的E6/X7/X9；当前save-system规范、SCRIPT-AUTHOR-2的保存counter。
- SAVE10/content21为唯一当前合同，minimumSaveVersion更新10；旧开发档直接拒绝，不引入upgrader/兼容分支。
- 自动cursor保留所属behavior和作者FlowCursor；另附内部continuation（当前内容digest、执行帧、已确认结果）。
  帧的ordinal是同一冻结内容中的执行位置，不是对象身份；实体/方案/步骤/共享脚本仍以稳定ID定位。
- 自动命令已完成后才能推进位置；非可重入叶的实际提交期不拍半状态，目标moveEntity/wait可重入，
  保存当前位置后重入同一目标指令。已选分支、循环迭代、共享调用位置保持，不重抽chance或重放奖励。
- coordinator只冻结下一条指令/新激活的短快照窗口，不停止自动flow或等待全flow结束；snapshot同步，I/O在窗口外。
- 父子交互活动和非持久根活动继续登记并按原业务边界结算；不是战斗/对话中途保存能力。
- 恢复前验证续跑digest/帧/引用；失败不得换world/scene或停止用户当前游戏。换档取消旧auto，晚到结果不得污染新world。

## 验收条件

- 先红后绿：不结束的目标移动/无限巡逻可以保存，实际world/位置/续跑帧正确。
- 奖励前后、嵌套branch/loop/shared、chance变动、两NPC并发、epoch变更、取消、坏resume、旧版本拒绝反控。
- 真实主壳F5途中拍档、F9恢复后不回到旧路段，不重复钱/物品，6012仍运行。
- 全仓lint/格式/typecheck零error/warning/info，受影响包完整测试及docs/tools门。
- E2E：冻结当前SAVE10后重新生成RF001前驱，正式002→003集中复跑；不能改旧报告/旧档冒充新证据。
  检查002首轮接客、e56路线六终点/楼梯、003道士/呼喊/厨房交代，停在004取菜前。

## 推进记录

- Codex premise verified / design agree / build allowed：直接代码根因已核；Root在现有隔离worktree独占上述实现。
- 测试包不算第三方独立验收；第二遍代码核验、质量门和最终证据另记，当前未宣布完成。
- 6012服务PID88523与页面保留；候选未验收不更新主工作树，不删除用户.zcodeignore。

## Build / Review

实现候选已完成，尚未发布到main/6012。

- 新增自动指令续跑帧和严格guard；保存NPC实际在途位置；恢复前验证内容digest、指令地址、共享深度及所属代码。
- 自动指令尚未开始但被暂停时也可拍档；门的异步检查与发指令之间用同步CAS判定，防止快照窗口抢执行奖励。
- 随机状态切换先提交选定目标再开放快照；休眠/未激活方案按所属behavior验证，不要求它此刻被页面选中。
- 一阶段命令接口、作者步骤、现有移动/碰撞算法和编辑器展现模型未扩张；e56十条指令/六个目标移动合为一个步骤。
- 初始反控失败：`build/e2e/auto-checkpoint-red.log`（1 fail），证明原屏障会等待未完成移动。
- 当前针对性回归：`auto-checkpoint-atomic-gate-second.log`，4 files / 77 pass；含15项新续跑/并发反控和11项真实主壳自动保存用例。
- 真实codec/restore/lineage旧链路：`auto-checkpoint-chain-current.log`，5 files / 79 pass（后续原子门增量另由上述77例覆盖）。
- 作者工程检查：`auto-checkpoint-pal-author-check.log`，pal 294场景 / 223地图 / 1934资源通过。
- 历次全仓失败收据保留：缺夹具字段、旧断言、content测试库不含structuredClone已修；第7次并行旧批次编辑器性能例超时后停止该旧批次，不改15秒规则或测试阈值。
  第8次全仓门正在跑；静态/格式/类型门和正式RF001→002→003完成后再记accept，不以这些局部绿例宣布收口。

## 下一位 Agent 提示词

无下一位 Agent 提示词，Root继续实现与验证，完成后等待用户体验验收。
