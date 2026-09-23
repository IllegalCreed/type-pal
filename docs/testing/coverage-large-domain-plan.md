# 大业务域覆盖率推进：战斗流程与真实运行时宿主

2026-09-23，用户批准从零散补测改为优先完整业务流程。两卡r1已获三席设计签（Codex b1f62c6b、Kimi d24ead8d、GLM 5b07d84a），用户确认后Codex统一核 **build allowed**；按各卡原白名单实施，不扩大范围。

## 基线与选择依据

- 基点 `f2592597`；官方 fast **7790 项 / 633 生产文件**，全仓 L 51967/70420、B 41307/63149。
- [冻结盘点](coverage-large-domain-evidence.json)和[只读复算器](coverage-large-domain-census.mjs)覆盖全部七包：逐层核官方持久字段（含测试身份摘要）、生产路径集合、四维计数及逐文件加总。
- 主树 `coverage/fast` 是 **7627 旧报告，不采用**；有效报告在 `/Users/zhangxu/illegal/type-pal-glm-wave2/coverage/fast`，已与7790基线逐字段一致。
- 复算命令：`node docs/testing/coverage-large-domain-census.mjs /Users/zhangxu/illegal/type-pal-glm-wave2/coverage/fast`。工具只读、JSON输出，不生成报告或写基线。旧7627输入实际exit1，新7790输入exit0。
- 初版临时核验曾对报告额外的嵌套 identities 做整对象比较而误拒；已改为逐层官方持久字段投影，仍比较全部身份摘要/执行计数/源路径/分母。不是忽略不一致。
- 所列十个目标源码对生产冻结 `57dda7ed` 不变；覆盖统计描述执行，不独立证明所有遗漏臂合法可达。

| 批次 | Owner | 核心交付 | 整文件未覆盖候选量 |
|---|---|---|---|
| [TEST-BATTLE-WORKFLOWS-1](../ops/tasks/TEST-BATTLE-WORKFLOWS-1-session-flows.md) | GLM | 真实BattleSession选招→行动/敌钩子→终态→写回，连续业务断言 | 4模块，648行/1013分支 |
| [TEST-RUNTIME-SHELL-COVERAGE-1](../ops/tasks/TEST-RUNTIME-SHELL-COVERAGE-1-boot-menu-flows.md) | Codex | 实际bootGame→输入/菜单→存档/场景接线，真实绘制函数的代码级验证 | 6模块，3830行/2814分支 |

这些数字是**范围上限，不是承诺净增或新增门槛**。例如BattleSession的451遗漏行中，189行在render入口之后；render之前也含合成绘制，不能将其余262行全报“GLM可补逻辑”。GLM只消费非视觉公开流程，渲染剩余保留；Codex不把仅录制drawImage调用称为像素/观感验收。运行时main的3330遗漏行也含尚不属于首批场景的分支，不强造非法状态全刷绿。

## 为什么不是再选一批小工具

1. `main.ts:339`是真实独立运行与编辑器试玩共用入口（`boot.ts:13`、`editor/src/play.ts:40/:144`）。官方只命中30/3360行。`shop-trial.test.ts:138`已真调用bootGame，但`main.ts:349-352`商店分支提前返回；不能据此宣称普通启动已覆盖。
2. 保存/世界异步的既有AST调用链回归很有价值，但不等于完整模块被V8执行。新宿主不删旧测试、不重写片段；直接import生产main并通过公开输入驱动。新增收益分成“接线新证明”和“旧合同转真实入口”，不二次报功。
3. `battle-session.ts:1191`同一tick贯穿选择、readiness、行动、结算，`main.ts:2400/:6352`是真实消费者。已有tests偏专项；本轮用成套合法战斗输入穿透组合与回合边界，不再每个helper造一份假输入。
4. `script-control-flow-audit.ts`和`sound-reference-audit.ts`虽然遗漏多，但本次在packages/scripts排除测试的检索未找到现行调用方；先留E-05审查，不为了数字复活旧模型。不是据一次grep批准删除。
5. `migrate-content/pal-assets/pal-migration`的缺口另候选：需要核full已有证明、当前发布调用域和自包含输入成本；不把PAL资产不在fast误称“完全没测试”。game bootstrap/dev-panel和editor大型UI也仍在分母，未排除或搁弃。

## 双线边界与共同验收

- 两张独立卡、各自一个Coding Owner、各自新测试/fixture/工具/回执。产品、旧测试、公共fixture、全局配置和官方基线不动。禁止在主工作树切分支或恢复stash。
- GLM绝不浏览器/截图/视觉；其时间线检查限结构/回调/业务时序。Codex宿主首批是自动化集成测试，不走PAL剧情E2E；必要功能性最小视觉检查仅Codex执行并单列，不默认重复已验内容。
- 都保留生产loader/compiler/guard/core，替身仅封装外部浏览器IO；禁止mock被测业务函数、反射改私有栈、`as unknown`洗白数据、源码抽取冒充真实导入。
- 合法输入先过当前对应守卫；world/菜单/战斗本来允许原地改变的对象，应比较**完整预期变化与不变部分**，不是强加“不许变”的错误合同。
- 每条失败分支配同输入合法对照；异步使用entered/deferred、同步结果观察、finally释放同一pending。时间线按确定性dt推进，不能靠短sleep或测试超时判负控红。
- 每组至少一个代表业务反控，目标新增case自身AssertionError，正控非空；判据拒绝Error内嵌AssertionError、混合环境错、没有真正执行目标。突变必须唯一替换点，产品hash前后不变。
- 开发期只跑定向/相邻/TC；整包末做同口径before/after到独立/tmp。两卡同包可能间接命中重叠，最终统一以并集重算，不能把两包增量直接相加。
- 两包接收后Codex统一串行check→ratchet→受保护单次strict-fast；GLM不跑官方覆盖率，不改超时/排除/阈值。分母未变亦不能把单测当完整E2E。
- 每批报告：业务流程/新增断言、真实入口/独立数据见证、被测调用链、原始净增与并集去重、剩余缺口及归属。无现行caller/政策未决/产品疑点单列，不伪造绿测；其它无依赖族继续。

## 不是新一轮长准备工程

范围按下列卡内六组固定，实施者不需重新制作几百条逐臂规则表。设计审查只核：真实调用者、输入合法性、可观测结果、mock边界、旧合同差异、反控方向及Owner隔离。审查者若counter，必须给可复现反证，不以措辞偏好要求重写整包。

三席已分别完成带直接证据的r1设计审查，两卡各自准入，无counter或缺签豁免。GLM实施战斗六组，Codex实施宿主六组；不逐组签字，完整实施交接提示词见各卡。

## 证据边界

本次完成：七包既有报告核验、Top20排序、十目标源码与真实入口/旧测试抽读、独立分工/六组合同及白名单设计、复算器新旧报告对照。没有新增正式测试、没有提升官方覆盖率、没有执行迁移/浏览器或改产品；待设计准入后实施。不以规划648+3830行宣称已可全部覆盖。
