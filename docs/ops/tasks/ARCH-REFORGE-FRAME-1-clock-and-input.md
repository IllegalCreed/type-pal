# ARCH-REFORGE-FRAME-1 — A3 首段：帧调度、时钟与输入仲裁

Status: review
Phase: phase2
Capability: 架构治理 A3-a（不改变能力格）
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Codex（实现者自审，用户豁免两席）
Visual Verification Owner: Codex
Visual Verification Timing: mixed
Unavailable Agents: Kimi / GLM（用户全队列明确不参与）
Branch: main

Revision: r1
Evidence base: b11d4bc9

## 目标与范围

将可暂停时钟、单步意图、等待队列与同步帧阶段交给 RuntimeFrameSession，
输入优先级交给独立路由器；main只接具体世界/呈现/存档端口。
这是A3首段，不把仍在main的场景事务、移动协调和绘制组装算作已治理。

- 范围内：main接线、包内帧会话/输入路由模块、实际宿主与单元回归、诊断/文档/官方基线。
- 范围外：GameplayClock算法、移动/碰撞求解、场景prepare/assert/commit事务、渲染坐标/图层、
  SAVE8/content20、公共包接口、第一阶段代码；不改用户看到的UI或玩法。
- 不新增并行帧、计时器或自动补帧；不引入完整RuntimeContext，不改已有错误/取消政策。

## 前提真值门

一句话：主壳同时拥有时间/等待/单步状态与输入/帧顺序，可以按同步领域边界拆出，而不改变运动算法。

| 维度 | 直接事实 | 证据（b11d4bc9） |
|---|---|---|
| primary source | 现行Reforge tick是同步顺序：模态→时钟/等待→对话收口→取键→世界阶段→战斗或世界输入/绘制 | `packages/reforge/src/main.ts:5890–6051` |
| 第一阶段 | 只采纳防积压/帧推进工程教训，不照搬旧循环或改变当前玩法；本段不动其源码 | `packages/game/src/shell/main-loop.ts:65–148`；harvest X3/X7 |
| 当前二阶段 | 暂停消耗墙钟，单步精确推进；等待由gameplayNow结算，强停先abort父signal再兑现剩余等待 | `gameplay-clock.ts:19–34`；`main.ts:2307–2330`、`:4800–4834` |
| 目标 | 同一帧内保持上述读取/消费/副作用顺序，等待与单步私有状态不再散在主壳 | 本卡设计；迁出前后同输入序列、异步等待清理及宿主回归须全等 |

最强替代解释：tick仅是必要装配，抽取变成另一个万能上下文。若新模块接整份world/project/DOM或
main仍修改其时钟/等待/单步内部状态，则重构不成立。若新接口产生await、提前缓存跨阶段的active状态、
按键泄漏到下层或恢复补算暂停时间，即推翻本候选。
无迁移/schema或大规模数据mismatch前提；不选择数据修复层，不重解释原版移动语义。
before→after：用户可见行为不变，无产品偏离需要裁决。

## 上下文锚点

- [READ-FIRST](../../phase2/READ-FIRST.md)、[队列及全队列授权](../audits/architecture-debt.md)。
- [harvest W/X](../../phase2/reference/phase1-knowledge-harvest.md)：不积压、同步副作用、时间状态有收尾人。
- `main.ts:473/1174/4980`：单步/当前时间/等待列表/时钟；`:1342`战斗退出单步；`:6340`DEV端口。
- `main.ts:5890–6051`：同帧模态冻结快照、单步不推进实体演出、battle独占渲染，
  确认框>商店>奖励>菜单>对话>runner/敌对忙>探索的实时输入优先级。
- `main.dialog-flows.test.ts`、`main.scene-flows.test.ts`、`main.save-flows.test.ts`、
  `main.boot-flows.test.ts`、`debug-tools.test.ts`与各motion/session回归。
- [A2自审教训](../../testing/battle-host-refactor.md)：不在原同步采样/提交边界插await。
- A2远端已核同b11d4bc9成功：Coverage run36014078975 / Documentation run36014078953。

## 设计

1. RuntimeFrameSession独占GameplayClock实例、now、单步两字段和等待队列；
   `wait(signal)`只用帧时间，不启动setTimeout；`clearWaits`沿用强停剩余等待resolve合同。
2. `tick(realNow, ports)`全同步，端口按帧阶段限定，不传world/project/renderer本体。
   冻结/单步快照在原时点读取；世界步进后再问战斗和UI归属，不把active状态提前拍成全帧快照。
3. 输入路由函数只决定谁消费按键，不持久化菜单/商店/世界；每层读当前active，
   模态消费一帧后不串到刚出现的下一层。原F5/F9/菜单缩略图/DEV切场副作用仍由main窄端口实现。
4. main保留唯一rAF注册与异常不重排的tick壳；世界render仍走原presentation finalizer，
   battle render保留原分支。场景事务/advanceMoves/render本体不改。
5. 单步开关和等待生命周期有明确方法，不暴露可变flags/timers；不新增产品测试入口。

## 验收与验证

- 先列同步边界，再实现；整个新tick/路由不含async/await，唯一Promise为原等待协议。
- 成组单元：优先级组合/同键不穿透、动态开启battle/模态、first frame/大dt/暂停恢复/单步、
  等待反向兑现顺序/预取消/到期后取消/清理保留原错误/拒绝监听清理。
- 实际bootGame回归不以mock业务核替代；AST fixture只适配边界，不削弱旧业务断言。
- 冻结tick逐步对照与单点负控必须钉住phase顺序、冻结/单步、实时仲裁、等待取消/全兑现和main接线。
- 开发期只定向/相邻/TC；整段末check→ratchet→保护b11d4bc9的单次strict-fast，保留源码全集/原分母。
- 功能性最小浏览器：真实启动→方向键/菜单→关闭→DEV单步→退出单步；不用用户代跑技术测试。
  剧情和长链演出仍按既有R4/N6b/Q1/Q2集中验，不以本卡关闭它们。
- 旧版本兼容审查必须pass；未改第一阶段、格式、算法与UI；A3剩余拆分另续，不能报3/13完成。

## 推进签字

### build前

- Codex：2026-09-25 r1 premise verified / design agree；直接核上述源码、GameplayClock及第一阶段循环工程经验。
  反证为异步边界/提前active快照/实际帧事件顺序差异；设计只迁所有权与编排，不改算法。
- Kimi：用户全队列豁免，未代签。
- GLM：用户全队列豁免，未代签。
- 独立第三方反证：用户豁免，以实际宿主/冻结代码对照/负控缓解，不称独立三席审查。
- build准入：build allowed（用户2026-09-24明确全架构队列Codex独立推进，免补签）。

### done前

- Codex：pending。
- Kimi/GLM：用户豁免，未代签。
- done准入：blocked，实施与门禁未完成。

## 交接日志

- 2026-09-25 Codex：main干净并同步；A2两条远端CI同b11d4bc9均success。
  直读当前时间/等待/帧阶段与输入分支，按用户全队列授权开A3首段；产品尚未改动时登记本卡。
- 2026-09-25 Codex：实现时钟/等待/单步所有者与同步帧、输入路由；36新增，117定向/相邻、
  中途全Reforge1584、384帧/896输入冻结对照、44正控/11针通过，19关键函数AST token树保真。
  最小浏览器完成菜单、朝向、单步745→746、退出恢复；短按不声明持续走位通过，持按由真实宿主回归覆盖。
  见[回执](../../testing/runtime-frame-refactor.md)。整批质量门正在执行，未标done，不提前关闭A3整体。

## 下一位Agent提示词

无下一位Agent提示词；Codex连续独立实施。本段未验证前不得done；本段即使done也不等于A3整体完成。
