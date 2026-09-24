# Reforge 战斗宿主拆分（A2）

任务：[ARCH-REFORGE-BATTLE-1](../ops/tasks/ARCH-REFORGE-BATTLE-1-host-lifecycle.md)。
基点 7f3840e6；用户 2026-09-24 明确全架构治理队列由 Codex 独立实施、自验、收口，
Kimi/GLM 不参与、免补签；不宣称三席独立验收。

## 实现边界

- `BattleHost` 独占活动会话、启动 intent、错误去重；start/cancel/只读 active。
  main 不再写这三种状态，仍是唯一 tick/render 调度者。
- `BattleLaunchPreparation` 独占战场表懒加载，拆成 prepare / prepareVisuals / prepareTurnSounds / FIRE 准备，
  显式 BattleContent 投影、资产读取器、world/scene 读取端口；无完整 bootGame 上下文、DOM 或保存接口。
- 主壳负责已有 world/脚本/帧步进/音频端口。BattleSession、battle-core、battle-world-result、
  SFX/精灵/FIRE 解码/缓存与作者模型生产文件零改，不把 DEV override 纳入 canonical 命令。
- main 6798→6486 行；BattleHost 187 行（最大方法69行），准备单元315行（最大方法102行）。
  不是删功能降低分母；净源码增加会如实进入统一统计。
- 对7f3840e6 AST逐节点比较17个保存/世界/场景关键函数或箭头声明，全等。
  首次诊断脚本只选 FunctionDeclaration，漏识别 replaceWorld 箭头而报 drift；纳入实际 VariableDeclaration 后全等。
- 两处现行 AST chain fixture 适配新接线：restore-preflight 的空战斗边界、save-lineage 的实际 runDefeated 端口。
  原业务断言保留；历史审计/反证工具未改写。

## 回归与鉴别力

新增21项：BattleHost14项 + 准备单元7项；与H9六项合计27项，
负控工具：[battle-host-refactor-mutants.mjs](battle-host-refactor-mutants.mjs)。

- 全部走现行正式 loader 合法 fixture、真实资产读取/准备、真实 BattleSession 与结算。
  外部浏览器/音频 IO 用替身；不 mock 核心、反射私有栈或增加产品测试入口。
- 取消/runner/世界/script失效、新启动覆盖、旧finally遇新会话、fatal恢复竞争、写回前身份门、
  战后错误传播、五槽空洞、库存隔离、显式静音、非空基础音效 union。
- finally 释放已挂起读取，取消所有实际已发布会话，消费原 pending；包括负控把 active 清错时也不悬挂。
- 9单点针：库存别名、基础音效union、取消intent、world身份、旧finally、终态写回、战后错误、
  主壳启动接线、运行中AbortError协议；27对照全绿/9针候选业务AssertionError全红，产品hash不变。
  判据2正控/12反例自测，精确file/title + 恰exit1 + 实际加载见证，拒混错/timeout。
- 最终局部负控日志：`/tmp/type-pal-battle-host-mutants-final.log`；
  机账 `/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/type-pal-battle-host-mutants-9L7FXn/summary.json`。

### 开发期失败与处理

1. 初次类型检查4项：递归session初始化显式类型、victory角色必有值类型、可达敌数组readonly；已修。
2. 新胜利用例预期漏了现行“回复缺失HP/MP一半”：按既有H9/实际奖励函数补精确90/35，非产品改动。
3. 新union用例的原fixture基础音效集合为空，被非空前提断言拦住；新增真实PCM WAV/catalog SHA和演员声音，
   正式loader重开合法fixture后断言恰为`attack`，移除base union的针已业务红。
4. H9败北一度在局部跑失败，后续全包虽绿，但未以多数通过放行：独立复算见下。
5. 首次自动编辑因工具输出截断导致apply_patch原文匹配失败，main未部分改写；改为完整分段读取后再应用。

### H9既有随机性独立修正

独立提交3be0e273，只固定败北路由用例Math.random=0.5，不延长帧数/timeout、不改业务断言。
当前物攻有7/17被动闪避，原测试没有固定随机输入，却要求100帧内败北。
[冻结宿主见证](battle-host-rng-witness.mjs)在7f3840e6与新实现上分别验证：
0.99连续闪避均exit1/同一业务断言；0.5无闪避均exit0。是输入未确定，不是本次重构引入的已证产品故障。
日志 `/tmp/type-pal-battle-host-rng.log`，机账临时目录 `battle-host-rng-AMfjkj/summary.json`。

## 验证进度

- 第一轮战斗+存档/lineage：27文件/368项，PASS。
- 中途全Reforge：168文件/1539项，PASS（当时只加14项，不是最终统计）。
- 当前定向27项及9负控PASS；全仓check8461 exit0（Reforge169文件/1546项），47warnings/6infos保持；
  日志`/tmp/type-pal-battle-host-check.log`。ratchet/受保护strict待统一执行，尚未收口。
- 旧版本兼容审查：pass。生产只新增包内所有权，没有版本分支、升级入口、双读写或旧模型fallback。

## 功能验证与延后边界

模拟器使用独立 `battle-trial-host.ts`，并不经过本次main宿主；因此不拿模拟器开战冒充A2接线验证。
最小浏览器改测原生DEV战斗态构建器：`6051/?scene=s135&skip-startup=1&debug`，
勾李逍遥、现成team-0/战场6，开战后关闭调试面板，原生Enter普攻/敌回合。
已观察实际战斗画面与HP150→145，按A自动攻击后出现胜利结算，Enter返回场景；调试状态显示
`战斗结束: victory（世界已恢复战前）`。状态页确认money0、HP150/150、MP100/100、原装备与技能296；
同页再次开战出现真实战场/两个敌人和HP150，浏览器error/warn为空。截图为本会话CUA内联证据，未入仓。
Chrome扩展无法附着、原生截图全黑，改用Codex内置浏览器后可正常操作，不据此判产品黑屏。
没有保存/读取用户进度；本页均临时内存态，s135默认落点既有问题不混修。
剧情观感/full/R4/N6b/Q1/Q2不在本批完成口径内。
