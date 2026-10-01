# SAVE-AUTO-CHECKPOINT-1 — 后台自动脚本不阻塞保存

Status: review
Phase: phase2
Capability: X1 / W7
Coding Owner: Codex Root
Generation Owner: N/A
Reviewer: Codex Root（集成验收） / auto_snapshot_review（独立只读复核）
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

### 冻结旅程收据（2026-10-01）

- 运行时/作者内容冻结revision：`eea814da3a4547eecf18b15b788fd4ae60ac6919`。
  随后的`60e18a54d`只补编辑器测试的当前SAVE10文案，未改这些旅程的源码hash。
- 当前RF001由正常新故事入口重跑：`build/e2e/reforge-001-2026-10-01T13-07-42-593Z/report.json`，passed。
  当前RF002消费该001真实端档：`build/e2e/reforge-002-2026-10-01T13-09-24-214Z/report.json`，passed；
  当前RF003消费该002真实端档：`build/e2e/reforge-003-2026-10-01T13-10-13-192Z/report.json`，passed。
  三份报告errors为空；003前驱source differences为空、source hashes stable为true；原始浏览器warning保留，未声称浏览器零warning。
- 002实际端档：SAVE10，e56 auto legacy-006 completed/no resume，trigger greet-after-guests，厨房未激活、道士初始观察未执行。
- 003实际端档：s001(89,46)，money500、inventory空；厨房e19仍有auto default内部resume frame index1，
  正式跨页面恢复预检/提交/自动续跑均通过，证明真实PAL存在后台续跑快照，不只fixture。
  两次DEV导出实际耗时5ms/16ms；这是该两次边界观测，不外推为所有自动移动的时延保证。
- Root直接实看002-end.png和003-end.png：前者三苗人离场，后者厨房李逍遥/李大娘、菜仍在桌上；没有重走流程取重复证据。
- 第8次全仓门抓出漏改的编辑器“最低存档版本9”期望，修为10后单文件46例全绿；停止已知失败的旧批次，
  完整第9次`auto-checkpoint-full-check-final.log`正在跑，不降低规则/超时/断言。独立严格lint：2725 files，0error/0warning/0info。

### 循环退出补审（尚未发布）

- 第二遍复核发现until/while的退出选择与父指令推进之间也存在微任务窗口；
  真实反控`auto-checkpoint-loop-exit-red.log`为1 fail / 15 pass，抓出已经选定退出却仍保存循环body帧。
- condition选择和下一迭代进入使用同一原子发指令门，退出后才开放快照；
  `auto-checkpoint-loop-both-green.log`为4 files / 79 pass，until和while退出都不重抽随机条件、不重放7钱。
- 第9轮全仓（已跑过reforge但未包含这项补审）停止，不冒充最终门；重新冻结后再跑完整全仓和RF001→002→003。
  上述eea814da3旅程只保留为补审前证据，不用于验收最终运行时。

### 独立恢复反控返工（尚未发布）

- `auto_snapshot_review`直接读取主壳、runner、guard及一阶段存档证据，独立指出恢复中的嵌套帧截断：
  root frame已入栈但child仍在resumeFrames时，host gate暂停后再存会丢掉child地址并重放已完成奖励。
- 同席指出confirm恢复预检只查已有结果的ID、不查已跨过确认命令的结果完整性，坏档可能换现场后才报错。
- Root新增3个不同恢复gate位置和4种confirm破坏反控；`auto-checkpoint-nested-resave-red.log`为7 fail / 16 pass。
  checkpoint合并已恢复帧和尚未消费的子帧；预检按root index/control要求已完成/已选择的顶层confirm结果完整且一致，拒绝未来结果。
- `auto-checkpoint-nested-resave-shell-green.log`为4 files / 85 pass，含23个自动续跑反控、真实主壳11例及core/lineage；
  `auto-checkpoint-nested-lint.log`为2725 files / 0error / 0warning / 0info。
- 第10轮全仓的所有包测试已通过，但末尾lint读到返工中的2个诊断而失败；原日志保留，已修，不能作为最终全仓通过。
  正式冻结0b49ea4d4的第二套RF001→002→003都passed；因本次实现返工，仍只作为历史旅程证据。
- 独立席正在定向复核两个counter闭合及相对走位的暂停边界；未收到accept，不宣布独立验收或main发布完成。

### 相对巡逻/追逐存档菜单返工准入

- 独立席与Root直接核main1559/1769的one-shot队列、main3244的菜单冻结以及motion-runtime-wiring113的target/owner等待。
  普通auto step/chase尚未落步时打开菜单，会冻结应答世界拍，而旧readiness=false令写槽等待十秒；不涉及未完成交互。
  已落步后的target/owner suspend也可能把同一叶永久停在续行门。
- 04630a466恢复项闭合，但当前整体仍counter；本卡不以局部绿例发布。第一阶段/SDLPal一手证据独立复读与目标一致。
- build allowed增量：仅自动step/chase新增引擎内部leaf continuation/done相位；尚未提交的意图允许从快照坐标重入，
  motion batch实际提交与相位记录同栈线性化，不在延后ack之后才记录。已提交相对位移不可重放，只等原target/owner门。
  chase触发交互前经原子门转unsafe，交互结束后才记done；仍不允许中途战斗/对话保存。不新增作者步骤/状态/UI。
- 最强替代解释“允许整个相对命令重跑”会重复已提交位移或追逐触发；实际反控必须覆盖菜单未落步、提交后暂停与读档不复走。
- 用户补充产品裁决：F5快速存档只在能主动打开菜单存档时允许，不能越过活动剧情/确认框；
  runtime-input-router旧确认框F5例外实际违背该裁决，删除例外，并加入全部128层组合的快捷/手动准入等价反控。
- `auto-checkpoint-one-shot-menu-red.log`2 fail / 11 pass直接复现普通菜单写槽被未落步step/chase阻塞；
  `auto-checkpoint-quick-policy-red.log`2 fail / 20 pass复现确认框F5越权。
- 一次意图提交相位写入motion batch的afterLiveCommit，不等延后Promise应答；投影坐标与continuation配对。
  chase尚未发trigger只保留当前指令，无done标记；fireTrigger前原子取得unsafe，业务结束后才done。
- 针对性6文件125例通过；追加真实手动槽pending chase恢复回归后，`auto-checkpoint-terminal-pending.log`真实主壳19例全绿。
  guard新增合法step/chase相位与伪相位反控21例通过；类型检查通过，`auto-checkpoint-motion-final-lint.log`2725文件零诊断。
  正式全仓/E2E和独立新候选accept待最终冻结后记实收据，候选仍未发布。

### 追逐认领恢复补审准入（ac21aba93 counter）

- 独立席直接核main1618/1665/4000：正常auto chase注册`pendingChaseTerminal`，读档清除旧认领，
  continuation恢复却跳过注册；合法hostile+auto实体在pacing结束前可能被引擎抢先遇敌。
- 可证伪反控：玩家(2,2)，实体(3.25,2)，chasePlayer(speed1)后giveMoney7；真实主壳落步到(2.25,2)后F5/F9，
  推进100ms应仍在原作者叶等待，不得在奖励前启动引擎战斗。
- 首轮仅由当前叶派生认领的设想已撤回：Root和独立席直接读取归档D15卡503–505及冻结18ebeb4454注释，
  认领必须跨wait/已退栈shared直到下一matching chase才消费；不得在pacing finally清理或逆推最近chase。
- build allowed增量：仍未发布的SAVE10载荷可带`automaticChaseClaims`，仅存真实活auto认领的owner/target/behavior稳定地址。
  预检核场景/实体/选中方案；已提交chase相位必须有相符认领；恢复同步提交时随新activation重建。
  不序列化临时motion slot/epoch/Promise，不新增作者字段/步骤、存档版本、升级器或战斗中途保存。
  completed后既有认领清理语义不在本次更改；不以其泄漏为由改变跨叶接触触发。
- ac21aba93的RF001/002/003均passed，作者工程294场景检查passed，但整体独立验收仍counter；
  上述旅程不冒充返工后的冻结证据，当前候选尚未发布main/6012。
- 初始反控对落点误写(3,2)，真实为(2.25,2)，原失败日志保留；修正落点后只看battleActive的旧例未抓住异步遇敌准备，
  因此增加实际`pendingChase`和`hostileBusy`只读观测，不把第一份passed误记为抓住反例。
  `auto-checkpoint-chase-claim-reconstruction-red.log`明确在暂时移除同步重建的控制候选中抓到读档丢失认领。
- 当前`auto-checkpoint-chase-preflight-final.log`3文件114例全绿：真实主壳22例包含self、shared显式self且owner百万拍暂停、
  chase完成后的wait快照→下一matching chase实际self奖励；坏认领形状/重复目标/瞬时epoch、实体/场景/方案语义预检反控。
- ac21aba93全仓轮所有包测试已通过（content1245/shared128/game2773/extract357/reforge2151/editor3699/migrate452），
  末尾lint读取Root返工中的4个格式/排序诊断而失败，日志`auto-checkpoint-full-check-motion-final.log`保留，不能宣称该命令成功。
  本次之后实现仅reforge及E2E源码hash清单变化；最终验收重跑受影响包完整测试、全部硬性静态门及docs/tools，
  不把未变包的已通过测试说成最终候选重跑，也不降低任何质量规则。

### 同场景隐藏取消预检 counter（61a36f648）

- 独立席核core取消保留resume、main hide/remove取消activation及认领、startAutoRunner跳过despawned/awaitingExit/removed。
  61a的强制认领校验仅按选中方案判断，会把真实hide业务结束后的正常F5载荷误当坏档，尚不能发布。
- Root真实主壳反控`auto-checkpoint-chase-hidden-red.log`2 fail / 1 pass：self隐藏owner及shared显式隐藏target，
  当前读取实际报缺少认领，恢复预检拒绝；不是伪造坏输入或既有complete后泄漏。
- build allowed窄修：认领要求与实际可恢复owner/target生命周期一致；隐藏/移除取消态可保留续执行地址而没有活认领，
  suspended仍保留activation、仍须匹配认领。不得跳过所有生命周期校验或改变hide/remove的实际执行语义。
- 第一轮修后回归的5个失败来自Root新增的错误测试判据：主壳`replaceWorld`刻意原地替换world内容，
  不能以world对象换引用证明成功。改用`commitSceneSwitch`实际提交的新scene entities引用；
  预检拒绝时该引用不变，不修改产品恢复事务来迎合测试。两份失败收据原样保留。
- `auto-checkpoint-chase-hidden-green-final.log`3文件120例通过，真实F9提交新scene实体引用；
  隐藏owner/target的续行地址保留但没有活认领，悬停owner仍重建认领且不提前遇敌。
  尚待窄修独立复核和冻结后的正式旅程，不将本局部绿例记为最终验收。

## 最终技术验收（2026-10-01）

- 冻结实现`f1d1ffb536f12770ebdb3c97b564adce26cab4d7`。独立只读席`auto_snapshot_review`最终accept：
  仅三种离场态豁免活追逐认领，owner及有效self均核；suspended不豁免，digest/地址/帧预检未削弱。
  Root直接复核相同源码及事务提交路径，所有本卡counter闭合。
- 冻结后完整reforge门：257文件/2178测试通过，日志`auto-checkpoint-offstage-final-reforge.log`；
  全7包typecheck通过，严格lint2725文件0error/0warning/0info；E2E工具92、docs工具37、作者工程294场景/223地图/1934资源通过。
  日志均为`build/e2e/auto-checkpoint-offstage-final-*.log`；coverage工具30/quality工具27的已通过收据保留，二者实现未变。
  未变包测试使用本卡前述ac21已通过全包收据，不声称再次执行并通过整条`pnpm check`。
- 当前RF001正常新故事：`build/e2e/reforge-001-2026-10-01T14-25-36-376Z/report.json`；
  RF002消费其实际端档：`build/e2e/reforge-002-2026-10-01T14-27-23-673Z/report.json`；
  RF003消费该002端档：`build/e2e/reforge-003-2026-10-01T14-28-19-969Z/report.json`。
  三份revision均为上述冻结实现，status passed/errors空；003前驱源码差异空、sourceHashesStable为true。
  浏览器原始404/Canvas readback warning仍保留，不计作硬性静态诊断，也不宣称浏览器零warning。
- 003端档SAVE10，s001(89,46)，money500/inventory空，厨房e19仍有内部resume index1；跨页面真实恢复通过。
  Root实看003-end.png，厨房交代已结束、菜仍在桌上；未进入004取菜。e56一普通步骤含原10指令/六目标路段，不为存档拆步骤。
- 用户当场指出视频结束后旧标题菜单短暂露出：本卡未修，作为独立开场呈现缺陷保留。
  一手路径`opening-menu.ts:107-110`停菜单但不清画布；`video-player.ts:70-72`撤视频层；
  `main.ts:530-536`菜单逻辑已结束、视频之后才继续场景启动。RF001记录没有重新进入opening menu，
  但既有断言不覆盖视频撤层与首场景呈现之间的像素交接；本次passed不构成该交接视觉验收。
- 技术验收已完成，状态review等待用户体验。main已于2026-10-01快进接收`9fb35e541`并推送origin/main；
  同步前实际保存按钮disabled，无草稿。6012仍为原PID88523，未停止/重启服务、未关闭/手动刷新用户页面；
  工程更新触发Vite自动重载，DOM显示s003已保存/撤销重做disabled，页面保留并重新markDeliverable。
  旧开发SAVE9不兼容，当前仅SAVE10。本卡工作树仍用于后续作者命名与未修开场缺陷，不提前清理忽略的E2E证据。

## 下一位 Agent 提示词

无下一位 Agent 提示词，已同步main；等待用户体验验收，不扩展本卡设计。
