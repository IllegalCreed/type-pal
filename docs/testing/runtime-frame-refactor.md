# A3首段：帧调度、时钟与输入仲裁

卡：[ARCH-REFORGE-FRAME-1](../ops/archive/tasks/done/ARCH-REFORGE-FRAME-1-clock-and-input.md)。
冻结b11d4bc9；实现8eb93bb7，本段已done，由Codex按用户全架构队列单席授权实施自验，不代签。
A2同b11d4bc9远端Coverage36014078975与Documentation36014078953均已核success。
**这是A3-a，不代表A3整批完成**；场景事务、移动协调、绘制组装仍是后续段。

## 变化与不变项

- RuntimeFrameSession独占时钟实例、当前gameplay时间、单步两个字段、等待队列；无新增rAF/setTimeout。
  main只保留唯一rAF注册，tick依次同步调领域端口；新tick不含await，不提前采集跨阶段的UI/battle状态。
- RuntimeInputRouter独立保持确认框>商店>奖励>菜单>对话>runner/敌对忙>探索优先级；一层消费后不穿透。
  开菜单/触发对话后再读取状态决定是否允许同帧DEV切场，F5/F9等实际I/O和错误提示仍由main执行。
- 等待仍按gameplayNow逆注册序兑现；父signal先取消、剩余等待clear时resolve；预取消/到期/取消都移除监听。
- main6486→6427行；不以净行数衡量完成。复杂移动/渲染主体没搬成新巨型上下文。
- shopInput仅`Set<string>`→`ReadonlySet<string>`参数注解，函数体不变，不进公共包出口；
  原函数只读按键，避免为接线复制Set或强转。
- 保存AST链fixture仅将空timers换为真实RuntimeFrameSession；旧业务断言不改。
- 19个保存/世界/场景/advanceMoves/render函数，反向归一化`frames.now→nowMs`后AST token树全等；
  render的原始文本差异只是Biome因标识符变长换行，不误称原始字节全等。
- GameplayClock算法、移动/碰撞算法、场景原子提交、渲染坐标/层序、BattleSession、SAVE8/content20和第一阶段生产代码零改。

## 正式回归与鉴别力

新增36项：frame会话15项、input路由21项；其中一项内部穷举128种活跃层组合，不把内部枚举另算测试条数。
直接回归与H4真实宿主共44项正控、11针业务反例：
[runtime-frame-mutants.mjs](runtime-frame-mutants.mjs)。
判据精确file/title、恰exit1、候选自身AssertionError、加载见证和产品hash不变；2正控/12反例判据自测。
取消/监听/清理/冻结/单步/顺序/battle独占/商店优先级/动态DEV门/main真实wait接线分别有针。

[冻结对照工具](runtime-frame-parity.mjs)直接从Git b11d4bc9 AST选出原tick：

- 帧前缀（直到battle分支），在明确外部端口记录事件；64门组合×6时间点=384逐帧对照。
- 原输入分支：128层组合×7键集合=896对照。
- 旧代码只在/tmp工具运行态，不进入产品或正式Vitest测试，不产生产品旧版fallback。
- 两个诊断测试不计入官方新增36项。该对照验证编排，不冒充移动/绘制算法的视觉对拍；实际宿主回归继续运行。

局部证据：

- 定向及相邻13文件/117项通过；中途全Reforge171文件/1584项通过。
- 最终11针+44正控日志`/tmp/type-pal-frame-mutants-frozen.log`，机账
  `/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/type-pal-frame-mutants-6HxFTi/summary.json`。
- 最终对照日志`/tmp/type-pal-frame-parity-frozen.log`，含19函数保护检查，机账
  `/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/type-pal-frame-parity-jV2fs6/summary.json`。

## 开发期问题（不当作产品反证）

1. Biome拒绝局部变量escape遮蔽受限全局名，改名cancel；TC发现shop输入端口只读类型不匹配，改为真实只读参数注解。
2. 冻结工具首个临时config少一个对象闭括号而未运行用例；修后暴露fixture沿用了A2前activeBattle名，
   改用冻结b11已存在的battleHost边界。两次环境错误不计业务红，正式帧/输入对照最终均通过。
3. clear策略针原先经Vitest `.resolves`显示为普通Error而非AssertionError，被判据拒绝；
   改成先观察resolved/rejected状态，再对状态作普通业务断言，判据没有放宽成接受Error。
4. raw-text保护检查命中render换行差异；改用正式AST token树且仅归一化时间所有者后，19函数一致。

## 最小功能验证（Codex）

本次自建6051 PAL服务，IAB原生操作：
`?scene=s135&pos=42,17&skip-startup=1&debug`，仅临时内存，不读写用户存档/项目。

- 正常场景与调试页可见；关闭调试页后Esc打开游戏菜单，Esc返回。
- 图层页勾选单步，状态页**主动刷新**后拍号745；单击“一拍100ms”后刷新为746。
- 退出单步后状态页刷新为994；游戏菜单仍可操作，运行error/warn为空。
- 方向短按确认朝向down→right，但观察位置仍42,17；工具短按不能作为持续按住走位证明，未宣称浏览器位移通过。
  持按移动仍由既有真实宿主键盘/帧驱动回归及advanceMoves AST保真验证；本次不改移动算法。
- 截图为本会话内联证据，无新调试图片入仓；未跑完整剧情/资源观感/E2E/Q1/Q2。

## 统一质量门

最终源码8eb93bb7：全仓check **8499项**、官方ratchet与保护b11d4bc9的**单次严格fast8008项/639生产文件**全部exit0。
Node22.23.2，strict用CI=true/FORCE_COLOR=1与注入NODE_COMPILE_CACHE的环境验证隔离策略；
strict前后基线SHA256均为`527557392c11abda292c2cf3163c7c1304a41641d1856dbc2a3513d4700aa064`。
Vite build通过，既有大chunk提示保留；47warnings/6infos没有增加。
日志`/tmp/type-pal-frame-{check,ratchet,strict,build}.log`，[统一机账](runtime-frame-refactor-evidence.json)。

覆盖口径：

- 其余六包完整基线逐对象一致；原637生产文件保留，新增2模块；main6486→6427。
- main+新两模块：行1394/3016→1429/3047，语句1479/3428→1530/3467，
  函数230/599→266/636，分支618/2070→633/2072。与整Reforge增量一致，不以main单文件比率下降误判回退。
- 新FrameSession行/函数100%、语句98.53%、分支96.43%；未执行臂为settle重复调用的防御门，未为比例制造假输入。
  输入路由四维100%。全仓长期90/85目标仍未达到，结构增加31行/39语句/37函数/2分支分母，如实统计。

本卡A3-a准入done；**不报A3整批完成**，场景/移动/绘制职责仍待续段。
旧版本兼容审查：pass；没有新版本分支、升级/兼容入口或旧模型fixture。
GLM八包准备在独立分支按b11冻结，只读取证，不作为本段实现的独立自证。

无下一位Agent提示词，本段独立收口；GLM的单独取证提示词见其工作包，不与本卡签字混用。

## 2026-09-25远端后续

cb1cb26d的Coverage36023454364后来失败于两个既有battle-host readiness测试的固定150轮轮询预算，
不是上述本地门禁失败。独立提交ad16ba94将helper改为默认waitFor；旧驱动业务红/新驱动绿的隔离见证、
旧29正控/11反例及远端Coverage36026355596/Documentation36026354848均通过。
详见[本轮跟进记录](scene-preparation-refactor.md#开发期问题与ci修复披露)；未提高套件timeout或改变产品。
