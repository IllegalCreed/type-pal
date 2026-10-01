# SCRIPT-AUTHOR-2 — 客栈脚本语义命名与坐标走位

Status: rework
Phase: phase2
Capability: W7 / P3
Coding Owner: Codex Root
Generation Owner: N/A
Reviewer: Codex / aunt_stairs_audit / script_names_audit（只读专项）
Visual Verification Owner: Codex / User
Visual Verification Timing: mixed
Contributor: Codex
Branch: codex/e2e-003

## 目标与范围

用户2026-10-01要求所有脚本采用能说明实际用途的名字，质疑e56自动行为6的46状态及高级转移选项。
全PAL命名治理不收窄为e56：294场景共4664方案，4602个严格编号模板名；另有20个物品私有脚本。
已清楚的语义名保留，不改稳定ID，不把页面/技能数据/敌AI无label结构混入方案改名。
本实现批次先覆盖有直接正文及调用方证据的客栈李大娘、道士方案，后续命名逐包核实而非猜故事。
全工程命名尚未完成，不能以本批完成宣称所有名字合格。

- 范围内：客栈语义label、高级转移中文/解释/目标中文名；e56下楼结构与必要的通用目标移动根因。
- 范围外：新schema/save版本、parallel/join、原版转换核、供应源、全局NPC冻结、004取菜演出。
- 独占白名单：s001/s003作者内容，entity-walk及相邻回归，ScriptEditor/core呈现与回归、相关任务文档。
  PAL引用索引基准仅更新已核机械指令减少的精确数量并新增局部路线断言，不改collector/删除保护。
  后续准入补充：pal-item-scheme-labels只读根图审计与PAL测试。历史供应种子确定性名字门保持；
  当前作者工程独立核49方案/11唯一root/4machine/无摘要名与精确语义名，只允许本批两项已核名字差异。
  不改原版转换、供应生成、baseline或canonical正文；不新增兼容模式。
  独立counter后补核：migrate-content.mts:81–94将合并后的plan.target交给发布校验，
  pal-current-publication.ts:298同样错误强制生成名。原“发布调用方不改”准入失效，补充该校验及集成反控白名单。
- 验证证据白名单补充：inn-contract只增加entity-walk源码hash，003继承同一hash，不改门槛/collector。
- 原6012服务保持运行；同步主树前核没有未保存草稿，不主动刷新/关闭页面。

## 前提真值门

一句话：下楼是六段有真实转折点的路线，不是46种剧情状态；当前通用移动的任一轴吸附规则妨碍坐标＋速度直线走位。

| 维度 | 当前真值与直接证据 |
| --- | --- |
| 原版/primary source | all.json:2635–2743，3段入梯移动、两段像素增量循环12轮、2段出梯移动；仅演出内容参考，不复制控制机制。 |
| 第一阶段 | event-system.ts:1275–1297/4074–4098解释循环/动画；既有真实RF002 trace的24次楼梯commit为(+96,+96)px，终点(131,52)。 |
| 当前二阶段 | s003.json:2582起auto6含4 intro+36 cycle+5 outro+空completed；entity-walk.ts:65–83任一轴接近即整体snap。实际函数反控从(122,49)到(131,52)会在最后跳48px。 |
| 目标 | 不保留46拍作为作者状态；按真实waypoint和速度编排，通用目标移动每拍有界且沿目标直线，到点后提交安全点、最后正式complete。选项中文说明本次/下次执行，不暴露worldTick作为作者用语。 |

最强替代解释：可能只是姓名/显示问题，或单move即可解决。独立调用实际walkTick已推翻单move假设。
可证伪观察：楼梯连续commit若出现大于速度量子的跳跃或偏离直线，则移动修复不成立；
若保存恢复折返/空轮询、旧流程完成覆盖新选择，或提前开放交谈，作者重写不成立。
根因排查：不是地图解码或碰撞（move已有scriptedBypass）；不是提取错误（原始两段增量明确）；
不能以终点对比代替中间路线；当前canonical脚本为作者维护，不恢复已退役转换核。

用户可见before→after：编号方案/逐帧状态/调度术语→实际用途名称/坐标路线/中文执行说明。
用户已要求这些作者可见改变；通用移动仍须核全调用域与反控，不能做e56坐标特判。

## 上下文锚点

- READ-FIRST铁律4/6/10及作者真源补充；phase1-knowledge-harvest的W/E/N相关教训。
- SCRIPT-STEPS-1：步骤契约、166复杂machine未整理；E2E-003-1：已核初次链及004边界。
- entity-walk.ts:65、main.ts:3293/3450真实walkTick调用；motion-runtime-wiring.ts:13的移动碰撞分类。
- script-runner-core.ts:172–204步骤安全点；script-project-core.ts:532保存屏障；script-world.ts:179–212旧游标拒绝。
- 不新增兼容旧machine游标、隐藏状态机转换、自动猜名或全局对白冻结。

## 当前模式推进记录

- Root单一写入Owner；两个专项仅只读独立核验。
- premise verified：Root直接读取上述源码，独立取证确认46机械展开与48px反例。
- 原单move设计counter有效，禁止直接压缩内容后报完成。
- 新设计：目标向量归一化，每100ms平面距离不超过原轴向速度；轴向速度、slow休拍、朝向和碰撞分类不变。
  e56按六个实际路段使用现行stages，到点提交游标，最终complete；不合成一段接近10秒的不可保存正文。
- 跨方案选择移回接客正文的设计待核自选与并发时序，未核准前不实施此项。
- build准入：Codex build allowed（命名、中文呈现、通用直线到点及六路段整理）。
  独立专项核两真实调用、planner primary不受sidestep quantum限制，move已有scriptedBypass，
  修正向量设计关闭48px反例；Root直接复核相同调用域和stage安全点。
  保留既有楼梯下interact/大厅touch及最终选greet的时点；跨方案选择移前台需另核/产品裁决，未准入。

## 验收条件与E2E登记

- 编号名减少必须有准确映射，不改ID/正文；改名与实际结构重写分开检查。
- UI八种去向可辨，目标显示中文label，读取菜单不写作者数据，修改仍提交原kind/ID。
- 真红回归：楼梯/纯水平/纯垂直目标无大跳，四档有界速度、到点精确、既有菱形轴不变。
- 六段终点/到点与方案切换偏序/最终完成/中途save-cancel及完成不复走。
- 全包typecheck、严格lint/格式0error/0warning/0info，作者工程校验与相关测试。
- 功能视觉：6012客栈e56菜单及路线列表；剧情：冻结候选后执行现有RF002→003正式入口，
  核中间楼梯运动、正常交谈、保存/恢复；证据build/e2e，不修改旧报告，不让用户代跑技术验证。
- 用户体验pending；全工程命名未覆盖前本治理不标done。

## 实现批次与原始失败记录

- 命名独立核23方案：17个不清楚的label改为内容用途，其余6个已有语义名保留。
  当前编号模板4587（enter216/trigger2998/auto1305/teleport68）；165机器/5577状态。
  独立比较除e56/auto6.flow明确重写外，JSON其余字段零变化，所有ID保持。
- 原移动反控8红/10绿；实现后一个新测试误把像素轴dx=0、dy<0的既有朝向判成left，
  按未改的facingToward改为up，原失败保留；最终21绿，不为过门修改朝向规则。
- 菜单反控先1红/28绿；实现时新测试揭出缺显式ARIA名称，补准确label后UI/core59绿。
  独立review另counter“restart从第一段”不等于initial，改为配置的起始段落，旧失败/意见保留。
- 六路线真正源反控先1红（原stateMachine）；姓名首个候选补丁上下文未锚实体ID，
  精确映射回归抓出4红。该候选没有入main，按本任务两个JSON的精确反向补丁恢复，
  再以实体ID锚定每组改动；Root逐实体白名单比较及独立review确认只有e56/e62/e19变化。
- 新增真实主壳对角目标在途F5：保存首段终点/下一段游标，F9只继续后一段，
  最终complete再次F5/F9无奖励或走位重放；真实路线中间帧还由冻结RF002补验。
- 另加真实F9在途取消：正常保存idle，再交互启动长对角route，实际移动后读档取消；
  后续80帧位置、money、auto槽与存档均无晚到污染。主壳8项绿；专项独立复核关闭取消counter。
- 全仓初轮check：PAL引用总数原38158，当前38111，精确数量断言失败；
  旧路线57地址，新10地址，差值为24 nudge+24 anim删除、增加1 move，共减少47。
  修正基准并加路线10地址断言，保留所有parity/blocker门；单独复跑UI及基准31项绿。
- 独立命名/UIreview accept：17语义名、23稳定ID及非目标正文保真；restart与非首initial反控、
  中性cadence说明均关闭counter。独立移动review accept：56组实际函数反控、六路段及安全点正确，
  无schema/save兼容fallback。全仓静态/正式E2E仍待本候选冻结后收据。
- 首轮lint另抓出新路线测试两场景import顺序，修正顺序后2722文件0error/0warning/0info；
  不排除文件、不弱化规则。完整编辑器门及正式旅程验收继续执行。
- 6012只读核保存/撤销/重做disabled，原PID88523仍运行；候选未验证前不更新用户工程。
- 此批不搬跨方案选择到前台，不声称后台剧情职责债已闭合；保留既有开放边界，
  全程禁用直到大厅的产品变更尚未批准，不能借现代化默默删除中途交谈窗口。

### 作者命名与资源发布门补充

- 真实migrate全包450项初轮1红：current被强制与baseline物品派生名字一致，拒绝两项合法作者改名。
- Root最初只拆current测试/种子名字审计，独立review counter准确指出生产发布同样消费merged target；
  该候选未提交，任务补充阶段rework，停止“只修测试”方向并直接读取migrate-content.mts及发布实现。
- 修正前提：作者名可更改，但item-root选择图必须不变；资源重导不得因合法语义名阻断。
  baseline严格生成名断言保留，当前发布改复用同一derive的只读root审计，49/11/4/opaque/环/悬空/多root门不减。
- Codex补充build allowed：仅发布校验的名称归属与实际三方merge合法改名/断链反控；
  不执行可恢复事务的CLI、不写baseline、不降低schema/资源闭包或硬性静态规则。
- 实际发布反控先1红/3绿（合法作者名被生产名称漂移门拒绝），改生产consumer后migrate完整77文件/452项绿，
  typecheck无诊断。只读独立review accept：节点收集/根图推导字节不变，schema/对白/资源闭包校验不减，
  baseline严格生成名门保留；真实merge保名、重放零写删、删除实际item-root目标仍拒绝，counter已闭合。

## 本批交付收据（2026-10-01）

- 正式旅程冻结内容/运行时revision：`422bb561ad1e9e10dabec9721723956919933d0b`。
  RF002使用既有RF001正式报告入口，随后RF003消费本轮RF002端档；两轮status passed、errors为空。
  报告：`build/e2e/reforge-002-2026-10-01T10-18-27-042Z/report.json`、
  `build/e2e/reforge-003-2026-10-01T10-19-38-660Z/report.json`。
  后续补充仅作者名称发布审计/测试/文档，不改这两轮冻结的内容/运行时源码hash。
- RF002楼梯段实际21次位置commit，沿屏幕直线，最大单次距离6.7082039325px，
  不再出现旧末拍48px跳落；e56终点(137,66)，auto6正式completed、trigger切到greet-after-guests。
  RF003正常走楼梯/李大娘/道士/呼喊/厨房交代，终点s001(89,46)，inventory为空，未进入004取菜。
  两轮均只有runner识别的缺省save-state.json 404记录，不是资产缺失；不宣称浏览器零warning。
- 全包检查分别通过：content1224、shared128、game2773、pal-extract357、reforge2113、editor3699、
  migrate452，共10746项；所有包typecheck通过，editor两个tsconfig均通过。
  首轮全仓check曾因引用census中断，完整原失败保留；以上为之后全包复跑的组合收据，
  不把首轮退出码改写为0，也不声称最终重新执行过一次完整`pnpm check`。
  工具门docs37/coverage30/quality27/E2E工具92绿；当前作者工程294场景/223地图/1934资源校验通过。
- 最终发布补充后的严格lint：2722文件，0error/0warning/0info；docs 810 Markdown/4267链接/250卡，0issue。
  日志：`build/e2e/readable-author-publication-full.log`、`readable-inn-editor-check.log`、
  `readable-inn-reforge-check.log`、`readable-inn-content-verified.log`、
  `readable-inn-lint-published.log`、`readable-inn-docs-published.log`。
- 6012同步前后均核保存/撤销/重做disabled，主树已接收本批，原服务PID88523未停止/重启，页面未手动刷新/关闭。
  功能实看六个非空步骤、下楼段单move、八项中文菜单；读取菜单未写作者数据。
  当前页面保留s003/e56自动方案“接客后：下楼到大厅”的步骤4，临时放大抽屉已恢复原420高度。
  证据：`build/e2e/readable-aunt-route-6012.png`、`build/e2e/readable-transitions-6012.png`。
- 本批技术交付完成但总卡保持build：全PAL仍有4587模板方案名、165复杂machine待逐包核正文/调用方；
  跨方案选择仍在到达大厅的最终自动路段，未声称“全部改名/全部后台职责治理”完成。

## 下一位 Agent 提示词

无用户转交提示词；Root推进与独立复核，命名/前提专项只读结果由Root接收。等待本批技术交付及用户体验。

## 单步骤续修（用户2026-10-01裁决）

用户指出六个路段可以放在一个步骤，并明确要求推进。之前“每个转折点必须成为步骤”的作者设计撤回；
六步批次及其验收作为历史证据保留，不再授权当前作者结构。路线转折是指令顺序，不是再次激活阶段。

| 维度 | 本次前提及锚点 |
| --- | --- |
| 原版/primary source | 原始路线内容沿用本卡已核all.json:2635–2743；不改路线/剧情，不继承逐拍控制方式。 |
| 第一阶段 | 原走位顺序沿用既有trace；第一阶段没有方案→步骤作者界面，不决定分步形式。 |
| 当前二阶段 | s003.json:2582–2755六步合计10条指令；script-runner-core.ts:195/327逐条await同一步正文，198仅步末提交游标。script-project-core.ts:532保存等待安全点，10秒超时。 |
| 目标 | 一个步骤包含原10条指令，所有目标/速度/激活及最终方案选择顺序不变，末尾显式complete；不新增命令索引存档或隐藏步骤。 |

- 最强替代解释：多次move必须分步骤。实际runCommands逐条await执行，已推翻；真正限制是保存等待步末，
  不能把此运行时限制当成作者必须拆步骤的理由。
- 可证伪：若一次激活未按六终点依次完成、途中保存形成半途位置/未完成游标、读档污染后续位置或重复收尾，
  本方案不成立。最长整步是否碰到10秒屏障先用实际主壳计时反控，不提高超时或删门掩盖失败。
- Codex premise verified / build allowed：Root单一Owner，先合并作者正文并补真实保存/取消反控；
  白名单s003作者flow、pal-inn-stairs-target.test、main.auto-save-flows.test、相关规范/卡/看板。
  暂不授权schema/save版本、compiler节拍、移动算法、其它NPC或迁移供应改动。
- 用户确认6012无草稿可更新；先验证候选，服务/页面保持打开。
- 实测反控：合并前结构1红/17绿、主壳保存2红/1绿；正文合并后真实首段F5仍1红/35绿，
  真实runtime-script-project.ts:480报10秒超时。楼梯中段F5及F9取消通过，不能用后者掩盖首段失败。
- 补核实际生产runtime与基础runtime均重复绝对10秒保存期限；已有runner.onStep在通过执行gate后报告真实命令启动，
  coordinator知道所有独立lease及显式parent，可以在内存追踪真实进展而不改变cursor/schema。
- Codex补充premise verified / build allowed：保存watchdog改为每条活动10秒无命令进展的停滞检测；
  同族子调用进展可以通知祖先，无关活动不得掩盖卡死活动，结束/取消清理timer，快照仍只在全部safe-point后采集。
  白名单补充script-world.ts、script-activity-lineage.ts、script-project-core.ts、runtime-script-project.ts、
  runtime-save-lineage.test.ts及对应coordinator/lineage测试；不提高10秒数值、不存command index、不改移动/节拍。
  验收必须保留原真实挂起10秒拒绝反控，新增长正文正常进展、无关活动不掩盖卡死、父子链超过10秒与取消/重试反控。

### 保存前提 counter 与候选撤回（2026-10-01）

- 用户否定“保存等待所有 NPC 自动脚本到达步末”的机制，并明确纯走位读档从步骤开头重新执行也可接受。
  本节以上进展 watchdog 的 build allowed 撤回；它仍等待全部活动安全点，没有解决用户指出的保存耦合。
- Root 已精确撤回 watchdog 五个实现/测试文件的自身改动；曾有99项绿仅作被否定候选的历史测试记录，
  不构成当前保存目标的验收。单步骤内容及诊断测试仍在隔离候选中，未更新 main 或6012。
  当前 F5 诊断仍按旧等待语义编写，不能声称证明即时保存策略。任务转 rework，先核保存前提。
- 直接运行流程证据：reference/sdlpal/global.h:95–113 的 EVENTOBJECT 含当前位置、自动脚本地址及等待计数；
  global.c:863–871 直接复制整张事件对象表保存，707–716 加载恢复；play.c:172–184 每次更新写回自动脚本返回地址，
  script.c:3515–3518 明确自动脚本逐指令推进并保留地址。第一阶段 save/api.ts:63–71 克隆当前 GameState，
  event-system.ts:1244–1255 保留 autoCursor 并执行单条自动指令，没有等待所有自动脚本结束的保存屏障。
  以上是 SDLPal 参考实现与第一阶段代码证据，不冒充原版 EXE 实测；原版 RPG 存储布局本身不证明运行时保存流程。
- 当前目标底线：后台巡逻/走位不能阻塞保存，作者不为存档切分路线步骤。纯走位可从步骤开头重执行的用户取舍
  不自动授权奖励/物品等副作用步骤重放；新保存实现与必要字段范围尚未完成前提核定，不在本次问答中开始实现。
- 6012 服务和页面继续保持运行，未应用被否定的候选。
