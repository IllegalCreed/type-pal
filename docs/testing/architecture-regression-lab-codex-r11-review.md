# ARCH-REGRESSION-LAB-GLM-1 r11 独立接收与补正

2026-09-26；候选 `22dc835c`，相对合入主线点 `5ea51631`。结论：**G06/G08新增合同及五表单提交撤销窄接收；剩余视觉与回执 counter，整卡未完成。** G01沿用已accept结论。GLM是贡献者，不把自验当独立证明。

本轮按交接限制**不合 origin/main、不标 done**。Codex的补正测试、E2产品修复/解环和统一门禁候选保存在 `codex/arch-lab-r11-review`，不是主线已入库覆盖率。GLM候选分支/报告保持原样。

## 执行结果

- [独立机账](architecture-regression-lab-codex-r11-evidence.json)保存运行JSON摘要/hash、反证及候选质量门；GLM机械通过不替代下列业务复核。
- 新鲜 `/tmp/codex-glm-r11-candidates.json` 42/42；verify 57条（54 candidate-green / 1 existing-proof / 1 blocked-environment / 1 reproduced-defect）PASS；六针red-control均detected；tsc、Biome、docs/diff exit0。Biome仍有反控宿主一个未使用变量warning。
- 正确诊断配置名是`diagnostics.vitest.mts`。全配置含旧LAB-STARTUP-RED，实际2红/2绿；其中G06-D1三个用例为2绿/1红，红因确为choreography路径未拒绝缺identity。不能把全配置写成只有1红。
- G06-D1与本席先前反证一致。Codex已另提交产品修复`ebef3d5a`：向跨模块校验传options，正式13项从原实现9红/4绿变为13/13，content全包863/863；合法作者三身份及runtime cue保持通过。该修复与接下来的E2结构解环分提交。

## G06：七入口与去重

G06-11现在确实逐项构造then/else/body/onLose/onFlee/onFail/onNo非空递归臂，非法identity在子命令深度被拒，合法narration通过，七入口映射方向已纠正。其错误断言只含`cue.identity.kind`，不等于回执声称的完整精确path；Codex正式13项已进一步覆盖这七臂内的choreography完整路径、输入深等与实际cue引用，因此**不重复计入G06-11**。G06-08/09/10三条代表组合择取进入正式`validate-enemy-crosscalls.test.ts`，保留GLM贡献归属。缺陷诊断按冻结候选的历史红保留，不借产品修复改写其原始证据。

## G08：输出反控闭合，失败输入快照由Codex补正

G08-07现在断言实际`setActorSprite`的actor/sprite、SpriteDef和实体资源引用；丢输出单点反控独立复跑确为AssertionError红，r10的成功路径空洞已闭。

仍有一处直接反证：`:184/:192`用`JSON.stringify(missing)`对包含Map的输入做快照，Map被序列化为`{}`。本席在缺布局throw前单点把`eventsByScene.get(0)[0].operands[0]`改为999，`CODEX_R11_FAILURE_INPUT_MUTATION_HIT`命中，而候选G08-07仍1/1绿。`:212-217`所谓“新鲜运行”也在失败之后，不能排除两份输出共享同一失败残留。

为避免同一处小修再次往返，Codex在拟接入副本中改用能保留Map内容的`structuredClone`/`toEqual`，并把独立合法基准运行移到失败之前，恢复后比较**全部**返回输出。`/tmp/codex-r11-main-map-mutant.config.mts`相同污染反控已变为目标用例AssertionError红，产品源码不变；正常6/6与migrate typecheck绿。原GLM候选未被偷偷改写。本轮准备新增4项（content3+migrate1），全仓门与E2批次统一执行；合入前不计主线统计。

## V01：Codex独立补验与证据边界

本席在独立`127.0.0.1:6015`、PAL内存开发快照走真实控件和浏览器`press('Enter')`，没有注入KeyboardEvent：

| 表单 | 提交结果 | 一次撤销结果 |
|---|---|---|
| 物品61 | 观音符→观音符独立验收；标题/字段更新，撤销为修改物品 | 回到观音符，撤销禁用 |
| 技能295 | 梦蛇→梦蛇独立验收；标题/字段更新，撤销为修改技能 | 回到梦蛇，撤销禁用 |
| 敌队team-0槽3 | 空槽→灯笼·enemy-399，撤销为修改敌队 | 回到空槽，撤销禁用 |
| 战场6 | 空名→战场独立验收，撤销为修改战场 | 名称实际value为空，标题回战场#006 |
| 试打方案 | 三人成型→三人成型独立验收，撤销为编辑战斗模拟器配置 | 回到三人成型，撤销禁用 |

这些**提交/撤销窄流程accept**。原“blocked-automation”可撤销，但“IAB press键投递缺失已探明”没有足够因果证据，且本席真实press成功，不能把它升级为平台结论。

本席目视了五张GLM图片：`v01-enemy-team-reverted.png`实际仍为灯笼，`v01-battlefield-reverted.png`实际仍为“未命名战场探”，不能作为它们已撤销的证明；new entries的artifacts数组也为空，verify没有校验这些新图。其余图片只能证明各自单帧。以上窄流程采用本席独立操作结果闭合；GLM需在回执更正图片阶段/归属、补完整hash，不能仍称这些文件证明回退。用户项目未保存，本席测试编辑逐项undo，临时标签与6015服务已关闭。

V01原工作包还包含Tab/方向键/搜索、Enter与blur不重复、Escape、关闭归焦等矩阵，不能从“五次提交/撤销”推出整个V01完成。V02/V03/V04仍是未完成工作；导航持久化、beforeunload和旧e2e-own工程不构成必须等待用户或Codex升级数据的前置条件，可用新隔离origin及buildBlankProject/正式编码器生成当前版本fixture继续。

## 回执与后续

receipt顶部虽然加r11总述，正文仍含旧r1分支/45条37项、旧机械小计、错误主线cwd和“七入口未证”等残留；需按最终候选统一校准，不保留互相矛盾的“当前”段。本席不为这些文字重复跑已通过测试，也不把尚未做的矩阵标done。GLM后续只需完成上述剩余视觉/证据登记，Map快照和产品cue修复已由Codex承担。无Kimi提示词。

### 剩余 counter 的明确边界

1. `receipt.md:13-37/:90-119`：当前段的分支、计数、G06覆盖范围与命令cwd要一致；历史段可保留但需标历史。
2. `results.json:1039-1093`及V01五表单回执：补新图完整SHA与阶段登记；两张“reverted”图不能证明撤销。引用本席已验证的提交/撤销结果即可，不要求重拍同一窄流程。
3. V01剩余键盘/焦点矩阵与V02/V03/V04是**未执行**，不是已证平台阻断；完成可执行流程，或交真正不可绕过的环境错误及同输入正控。禁止以页面单帧、源码推断或预算不足替代。

## Codex补正候选的统一质量门

复核分支串行执行完整 `pnpm check` **8674项 exit0** → `coverage:ratchet` **exit0** → 保护 `8bf40b90` 的单次 `coverage:fast` **8182项/648生产文件 exit0**；均显式去除 `NODE_COMPILE_CACHE`。原644个生产文件全部保留，无超时/排除/门槛修改，另五包完整基线对象不变。原基线为8165项/644文件，本批13项Codex缺陷回归+4项GLM择取=17；四个新生产文件来自E2解环，不计作GLM补测贡献。

全仓候选行55131/70570（78.12%）、语句61240/80619（75.96%）、函数11385/15036（75.72%）、分支43261/63176（68.48%）。结构移动使可执行行分母减少2、已覆盖行减少1，不宣称同分母覆盖纯提升；比例未下降且原生产范围全部保留。check的47 warnings/6 infos为既有项。未跑full/Q1/Q2/剧情E2E，当前数字**仅属于未合入的复核分支**。

E2产品修复与结构拆分分别为`ebef3d5a`/`4cdefcf1`。擦除type后的运行时依赖图由author-script-core/enemy-script二节点环变为无环，两个旧模块出口集合52/19保持；新增下层为校验选项、敌人形状、AI条件与战斗演出守卫，未改版本/格式/运行时方言。
