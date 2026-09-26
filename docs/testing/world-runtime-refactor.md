# A3-d/e 世界移动与绘制状态归属候选

Owner：Codex；基点`be5218bb`；实现`7be10bf4`；所属[连续治理卡](../ops/tasks/ARCH-CONTINUATION-1-remaining-queue.md)。
本候选不合main、不运行共享全仓coverage门；待原接收对话统一集成和执行check/ratchet/strict。
完整命令、计数与未证项见[机账](world-runtime-refactor-evidence.json)。

## 所有权边界

- `WorldMotionRuntime`组合既有`MotionRuntimeCoordinator`，不复制authority、authority epoch、script/auto slot、
  scene-session或committed continuation lineage。新owner收拢其外围的世界拍、command epoch、partyMove、
  gait/显式动画、side-stick/fairness、player motion epoch与trace；move/step/chase注册、替换、abort listener和
  durable completion也统一由它创建。live scene/entity/player位置、lifecycle、触发、hostile与canonical写回仍由原owner持有。
- `advanceMoves`保留在main作为同步协调点：同帧采样live scene/player/lifecycle，构造planner snapshot，先提交
  canonical endpoint、再原子提交live position、再touch/post-contact，最后下个task唤醒continuation。没有把大函数
  搬到新文件后传整个RuntimeContext；纯`planEntityMotion`、既有`MotionRuntimeCoordinator`与`motion-batch`仍各守原边界。
- `WorldScenePresentation`拥有大世界绘制态：实体显式定帧、队伍gesture、shake、wave phase/离屏canvas；组装
  entity/party/follower/extra-follower的`SpriteDraw`并落世界层。ActiveScene继续拥有map/palette/renderer/wave renderer
  cache，菜单/对话/RNG/fade/ambience/dither继续由既有owner管理；main只采样当前快照并协调叠层。
- main `6148→5698`行。两个新owner合计903行，不用净行数宣称成功；验收依据是单一状态源、窄输入、取消/提交顺序
  和可独测边界。公共包出口、SAVE8/content20、schema、生成资产、玩法、公式、UI形态与资产坐标约定零改。

## 时序、采样与释放

- partyMove保持旧合同：注册前已核runner；新请求兑现旧waiter；当前请求abort拒绝并解除listener；终点同一世界拍清
  walking后唤醒。脚本强停继续兑现悬挂partyMove，不留孤儿Promise。
- script/auto实体slot继续是同一Coordinator里的两个独立Map；main在注册前核实体在场、永久移除、activation和隐藏目标，
  owner同步采样scene-session/authority epoch并登记。endpoint仍先`commitMoveEntityEndpoint`与settlement，再写live position；
  已提交slot先detach，触发/lifecycle不能回滚，Promise仍延至touch窗口之后唤醒。
- 世界拍仍至多每rAF一拍、结转余量、真积压丢弃；menu/hostile/battle/confirm在累计前冻结。fairness按稳定actor集合，
  slow-rest/dormant side-stick不被无关actor老化。切场先失效脚本提交token，再abort activation/cancel slots、清restart lineage、
  release authority，最后清gait/fairness/hostile/touch并reset camera；顺序由正式架构测试固定。
- 绘制保持每个loop实体在原位置调用`performance.now()`；camera/follower在世界绘制前采样。帧优先级仍为显式定帧>
  gait>0x87显式动画>语义action>loop>idle；当前帧自身宽高作脚底中心锚，`+7`只由renderer收口，sLayer只进sort/cover。
  wave仍只在100ms世界拍推进，先卷无人物的背景，再以`skipBase`叠人物与cover；之后依次debug、cinematic、fade、UI、
  ambience、dither。

## 回归与反控

- 新增20项：WorldMotionRuntime 10、WorldScenePresentation 5、main所有权/顺序AST 5。
- 定向/相邻13文件167项通过；Reforge全包177测试文件/1642项通过；TypeScript、候选文件Biome、production build通过。
  build仅保留既有大chunk提示。
- [九针反控](world-runtime-mutants.mjs)：冻结世界拍、party abort释放、slot registry、gait owner、帧优先级、当前帧锚、
  follower深度、shake相位、wave静态叠层均由指定候选测试单一`AssertionError`检出；control 15/15，判据1正9反，
  精确file/fullName/exit1/唯一load注入与全生产hash不变。最终临时机账：
  `/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/type-pal-world-runtime-mutants-mcFlrN/summary.json`。
- 旧checkpoint/save AST真实调用链fixture仅从散字段适配新owner；37项全绿，读取竞争、normalize负控、同步恢复提交、
  DEV hook业务断言均未删改或mock核心owner。

## 隔离功能核验与未证项

Codex在6053 PAL宿主直达`s135@42,17`：实际场景/玩家/NPC正常显示；连续右移后玩家位置与相机画面推进；Esc菜单
在世界层之上正常开、再Esc关闭。未见错误遮罩或空白帧；只做内存输入，未触发保存/读取命令、不占6010、不改用户工程，
验证页关闭、服务停止。此次未读取浏览器console，故不宣称console error/warn为零；也不冒充全部shake/wave/取消分支的
剧情视觉验收，分支由上述单元/反控固定，剧情观感仍归集中E2E。

本对话按交接要求未运行全仓check、ratchet、strict、full/Q1/Q2或远端CI，未更新官方coverage基线。A3四段在候选树上
已具备时钟/输入、资源预检、ActiveScene/WorldCamera、移动/绘制owner；只有原接收对话完成统一门并合main后才可正式
标A3完成，本候选不把局部自验冒称main已done。
