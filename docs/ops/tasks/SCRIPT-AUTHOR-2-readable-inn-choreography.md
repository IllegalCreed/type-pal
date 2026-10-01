# SCRIPT-AUTHOR-2 — 客栈脚本语义命名与坐标走位

Status: build
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

## 下一位 Agent 提示词

无用户转交提示词；Root推进与独立复核，命名/前提专项只读结果由Root接收。等待本批技术交付及用户体验。
