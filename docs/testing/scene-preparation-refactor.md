# A3-b：场景资源所有权与只读预检

任务卡：[ARCH-REFORGE-SCENE-1](../ops/tasks/ARCH-REFORGE-SCENE-1-resources-and-preflight.md)。
冻结cb1cb26d；Codex按用户全架构队列单席授权实施、自审；不是独立第三方审查。
完整统计和证据路径见[统一机账](scene-preparation-refactor-evidence.json)。
A3仍有活动场景/移动/绘制职责未治理，本段完成也不增加13批总队列的已完成数。

## 实施与保真边界

- SceneResources私有持有四类缓存：scene/map成功才缓存、不合并在途请求，map容量16并刷新命中顺序，
  palette/全场景引用保持原Promise memo，包括拒绝。没有借重构改变重试、逐出或并发完成政策。
- ScenePreparer在首次await前clone world/显式script/override.def；同一Promise.all等待地图、调色板、
  精灵与音效。页动作/入口/落点/依赖来自同一冻结视图；只返回计划，不prune精灵工作集、不发布活动场景。
- main6427→6260行；只保留窄装配和同步提交，缓存查阅改为peek，不把可写Map暴露给宿主。
  两模块不获取完整应用Context、DOM或活动场景对象，无公共包出口/资产格式/SAVE8/content20变化。
- [冻结对照](scene-preparation-parity.mjs)：18个保存/世界/切场/移动/绘制/音效函数及2个async loadScene属性，
  只反向归一化`sceneResources.peek→canonicalSceneCache.get`后AST token树全等；
  16组正式loader合法fixture，直接运行Git旧prepare与新模块，计划/实际读轨迹/音效输入/依赖拒绝结果全等。
  旧代码仅在/tmp诊断运行态，不留产品兼容实现；诊断内部16组合不计官方新增测试。

## 回归与反证

新增26项：SceneResources11、ScenePreparer14、真实main调用链1。
既有save/preflight/lineage链仅适配实际类与peek接线，旧业务断言未改。
fixture经正式loader，使用合法map/sprite/物品/装备；准备单元的声音与renderer是外部端口，
不冒充实际SFX解码/Canvas测试；真实宿主原有测试仍保留。

[单点反例](scene-preparation-mutants.mjs)：36正控/11针候选AssertionError，含缓存、输入冻结、
依赖门、音效屏障、main同步入口与main复核接线；精确file/title/exit1、执行见证及产品hash不变。
判据自测2正/12反，超时或普通Error不算业务红。

- 最终反例日志`/tmp/type-pal-scene-mutants.log`；机账
  `/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/type-pal-scene-mutants-HoOACX/summary.json`。
- 冻结对照日志`/tmp/type-pal-scene-parity.log`；机账
  `/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/type-pal-scene-parity-LzTqlm/summary.json`。
- 开发期与最终全仓检查中的Reforge均173文件/1610项通过；统一质量门如下。

## 开发期问题与CI修复披露

1. fixture的非空断言与Mock函数赋值类型错误已分别用expectDefined/mockImplementation修正。
2. 第一轮main两针未命中`main.ts?raw`入口，被判据拒绝，不计有效业务红；修隔离load钩子后两针均业务红。
   没有改候选断言来迁就错误注入，也没有降低判据。
3. cb1cb26d远端Coverage36023454364失败：两个旧battle-host用例在固定150次轮询预算内未等到资源准备。
   独立提交ad16ba94改helper为Vitest默认waitFor，不改产品、超时、排除或基线；
   [就绪调度反证](battle-host-readiness-scheduling.mjs)原驱动exit1/新驱动exit0，旧29正控/11反例保持。
   ad16ba94远端[Coverage](https://github.com/IllegalCreed/type-pal/actions/runs/36026355596)和
   [Documentation](https://github.com/IllegalCreed/type-pal/actions/runs/36026354848)均已核success。
   不回写成cb1原远端成功；A3-a历史本地门禁证据仍有效。

## 功能验证与统一门禁

Codex自建6051 PAL服务，IAB原生调试命令：s135(42,17)→s134(40,9)→s135(42,17)。
两次等待`scene ... done`并主动刷新只读状态：分别确认s134/40,9/tick1091与s135/42,17/tick1368；
实际画面切换、对应实体恢复；关闭调试页后Esc打开游戏菜单、再Esc返回，error/warn为空。
只用临时内存，不保存/读取用户存档，不改工程；截图为会话内联证据，临时页已关闭，不新增调试图片入仓。

全仓check8525项、官方ratchet及保护cb1cb26d的**单次strict8034项/641生产文件**全部exit0。
Node22.23.2，strict使用CI=true/FORCE_COLOR=1并注入NODE_COMPILE_CACHE验证官方隔离；
strict前后基线SHA256均为`5aff4cb1d7e80c9294f230e60c09d70881ef1a90d8d04b47f7fec4a1622ad084`。
日志`/tmp/type-pal-scene-{check,ratchet,strict,build}.log`；build通过，既有大chunk提示保留；
全仓lint47warnings/6infos不增加。NO_COLOR/FORCE_COLOR环境告警不当作产品错误或覆盖率失败。
基线除Reforge之外六包逐对象完全不变；639个原生产文件保留，新增两个模块，无排除项变化。
main+两个新模块并计：行1351/2969→1379/2987，语句1434/3370→1464/3388，
函数252/622→275/642，分支562/2000→572/2001；Reforge整包分支净增11而该集合净增10，
另1臂属间接命中，不虚报为抽取模块自身覆盖。

新预检模块行47/48、函数12/12、分支27/29；资源模块行28/28、函数7/7、分支7/8。
保留的未执行路径：预检onEnter的ScriptRef宽类型分支（当前runtime-project-view:104–116投影仅数组）、
页动作缺精灵错误门；资源LRU防御break（私有Map同步逐出时正常输入不能出现空oldest/本次新键为最旧）。
没有制造非法fixture或删防御门来凑100%，未把这些路径宣称已覆盖。
全仓行54656/70570（77.45%）、分支42859/63176（67.84%）；Reforge行11443/14749（77.58%）、
分支7457/11386（65.49%）。全仓长期90%/85%目标仍未达到，本段主要价值是所有权和可测性收敛。
不跑剧情E2E/full/Q1/Q2；不修demo旧地图与s135默认落点；不用GLM八组准备包充当本卡验收。

旧版本兼容审查：pass；没有新upgrader、旧格式fixture、版本分支或迁移fallback。
无下一位Agent提示词，Codex独立核定本段；GLM支持包后续按其卡单独接收。
