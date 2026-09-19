# 运行时状态补测：Codex接收复核

## 当前返工复核：3c7ae963（2026-09-19）

**结论：收窄counter，仍为rework。设计r1不重签，已闭环项不重开。**
本轮复跑55定向（content10/reforge45）、双包685/1235全测、两包tsc、16新增文件Biome均exit0；原6对照+16针22/22仍通过。
四个fixture检查全accepted；场景/物品合法化、compiler after、嵌套别名、非空cue正控、双asset换字节、LRU解码轨迹已确认改善。
产品/旧测试/原审计探针/官方基线零变，没有模拟器代码冲突。**未集成正式测试，未跑接收后全仓check/ratchet/strict-fast**，原因是以下残项尚未闭环。

### 保留闭环，不再返工的部分

| 原项 | 本轮结论 |
|---|---|
| R1 场景/物品主fixture | 两种scene守卫、author-items、runtime-library四检查全部接受；onTeleport非initial entry已移除、物品已合法拆分 |
| R2 完成态invalidate/LRU | 新双asset/新字节/解码计数有实际鉴别力，原两针已由候选自己的AssertionError检出 |
| R3 compiler-after/有声动作/一般world改写 | 原三针已由候选自身业务断言检出；合法非空音效正控及条件/产物别名试验保留 |
| R4 格式和主要统计 | Biome16文件0问题；55项逐文件6/4/5/5/9/9/4/4/2/2/5与执行一致；本轮没有降低范围或统计门槛 |

### 仅剩三项（锚点均钉3c7ae963）

1. **R1-F1：虚构source没有移除，只加了说明注释。**
   `packages/reforge/src/scene-entry-session.boundaries.test.ts:32`仍调用`source:'held' as never`；:11–12的注释却称轴已收窄。
   GLM回执及机器账写“虚构source轴移除”与提交树不符。删除此轴或明确归防御并剔除“合法source失配”的贡献，不能只改注释。
   该项不重开已合法化的scene/item夹具。
2. **R2-D6：确已进入inflate，但当前负控靠5000ms超时失败，不是观察到错误结局后业务红。**
   `frame-animation-player.boundaries.test.ts:261–278`的outcome是Promise，不是同步结局值；`expect(await outcome)`会在缺取消包装时挂起，
   releaseInflate又在其后，因此永远走不到释放。
   JSON报告候选失败为`Error: STACK_TRACE_ERROR`，duration约5003ms；同一配置verbose重跑明确是`Test timed out in 5000ms`。
   修法：同步挂结局回调更新独立变量；entered后abort，排空拒绝传播再**同步断言观察值**，不要等待可能永不settle的outcome；finally放行底层并消费Promise。
   sequence测试也不能以永不释放的gate加另一次正常播放声称“迟到读取无提交”；已存在的D7/F族未实证轴按原counter如实收窄/引用已有，不以标题充当闭环。
3. **R3-E4：深快照只保护末尾新增的一次单体确认，前面的全体确认仍漏检。**
   `magic-menu-state.boundaries.test.ts:116`的`_wBefore`没有使用，:139的`expect(w).toEqual(deepSnapshot(w))`是自比较。
   :140–142只保护最后一个toTarget调用，无法发现前面的castAll已经改了world。
   本人仅在**allAllies分支**加入扣HP的单点坏实现：候选4/4仍绿，独立同分支world快照业务红。它仍是原R3要求，不是新增功能范围。
   各确认分支应使用实际调用前快照，测试自身播种MP发生在取快照前；菜单state可原地改变的合同保持，不误禁止。

### Codex见证工具勘误（本席承担）

上一版工具只要求独立oracle是AssertionError，候选只要status=failed就标detected；
Vitest JSON把候选超时表现为STACK_TRACE_ERROR，绕过了只查`Test timed out`的全局文本检查。
因此GLM所报原工具“六针detected”确实可复跑，**但不能证明六针候选自身都是业务红**；此误判不是据此指控GLM未运行工具。
工具现在逐一核候选failureMessages的错误首行，必须每条都是AssertionError；不再借oracle的错误类型认证候选。
自测包含纯业务红、STACK_TRACE_ERROR、二者混合以及含runWithTimeout正常栈帧的合法AssertionError。
修订过程中曾误扫普通栈帧runWithTimeout，已纠正为只判错误首行；最终全套重跑才计入结论。

当前[见证工具](runtime-state-review-witnesses.mjs)共7针：原6针保留，新增同一E4合同的castAll分支针。

| 针 | 本轮严格结果 |
|---|---|
| compiler-after-loss | detected，候选自身业务红 |
| frame-await-cancel-bypass | **invalid-candidate-failure**，候选超时/STACK_TRACE_ERROR，oracle业务红 |
| invalidate-keeps-old-container | detected，候选自身业务红 |
| lru-hit-does-not-touch | detected，候选自身业务红 |
| expired-action-replays-cues | detected，候选自身业务红 |
| magic-confirm-mutates-world | detected，候选自身业务红 |
| magic-cast-all-mutates-world | **MISSED**，候选4/4绿、oracle业务红 |

7个原实现对照均绿；工具exit0仅表示诊断完整，不等于任务accept。
最终证据：`/tmp/type-pal-state-rw1.JHwN6q/`（定向/全包/原22跑/verbose超时/最终见证日志）；
`/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/codex-runtime-state-fjvTQg/summary.json`；
原22跑位于`/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/sb1-mutants-fR22SO/`。
全程候选产品/参与测试hash不变，未修改GLM测试语义。

GLM只定点处理三项并同步回执：尤其F1“已移除”、D6“业务红”、D组仍写8项等残留文字需按最终树更正。
重跑最新工具应7对照绿、7针候选自身业务红detected、0 invalid/0 MISSED；再交Codex接收。前三批r2设计、模拟器、已闭环项均不回退。

## 前轮23eb63d2复核原文（历史，以下不重新授权返工已闭环项）

2026-09-19，任务[TEST-RUNTIME-STATE-BOUNDARIES-1](../ops/tasks/TEST-RUNTIME-STATE-BOUNDARIES-1-state-and-metadata.md)。
候选`23eb63d25271438d32fb5c408cb1c5ad0fa30a45`，基点`1c8cad29`，生产冻结`e58834f6`。
**结论：counter，转rework交GLM；r1测试目的/设计签字不重签，不合入正式测试，不转Kimi、不标done。**

GLM为测试贡献者；本次Codex独立读全部11个新测试、两fixture、负控/覆盖工具、39族回执以及对应生产合同。
只把候选交付文档留作证据，未合入其测试/fixture或更新官方覆盖率。下列反证是对测试的评估，不是新产品缺陷。
主线战斗模拟器仍是设计文档，无main/boot生产改动，与本批无产品冲突。

## 通过项与实跑

- 白名单：19文件＝11测试+2fixture+3诊断/机器账+任务卡/看板/工作包；无旧测试、生产、配置依赖、官方基线或原审计探针修改。
- 定向：content 2文件/10项、reforge 9文件/43项，合计53项全部绿。
- 全包：content 57文件/685项，reforge 125文件/1233项，均exit0；两包tsc均exit0。
- GLM原脚本：6对照绿、16针业务红，22/22；钉名JSON执行见证可复现、产品hash不变。
  这只能证明这16针，不证明其他声称已覆盖的保护有效。
- 私有覆盖before/after四跑成功，直接使用候选配置与官方testSelection，不写官方目录：

| 范围 | 行 before→after | 分支 before→after |
|---|---|---|
| content两目标 | 79→91 / 93 | 83→101 / 106 |
| reforge九目标 | 497→533 / **564** | **392→444 / 533** |
| content全包 | 4458→4470 / 5183 | 3798→3816 / 5016 |
| reforge全包 | 7927→7963 / 14118 | 5329→5381 / 11041 |

命中增量+12/+18与+36/+52确可复算，但部分测试输入非法、断言失效，不能据数字签accept。
本轮未跑全仓check/官方ratchet/strict-fast：前置接收已阻断，不能把未接受测试抬入官方基线。

## R1 · 主fixture不在现行合法输入域

候选路径以下均相对仓库；行号钉`23eb63d2`：

1. `packages/reforge/src/__tests__/glm-state-boundary-fixtures.ts:154`把entry放进onTeleport的非initial状态b。
   直接把**实际legalScene()**交`validateAuthorScenes`及`validateRuntimeScenes`，两者均拒绝：
   `scenes[0].hooks.onTeleport.variants.tp.flow.machine.states.b.entry: 只允许 onEnter initial state`。
   B4/B5/B6却直接投影/强转它为RuntimeSceneDef，未先过guard；“合法当前场景”和B5状态游标入场覆盖的主张不成立。
2. 同fixture`:178–184`把外部runScript与itemPrivateScript并列。直接将**实际legalItems()**交`validateAuthorItemCore`拒绝：
   `items[0].use.effects: 外部脚本/场景钩子必须作为唯一效果；复杂编排请放入被引用脚本，以免失败时提交半套世界修改`。
   `runtime-project-view.boundaries.test.ts:109`的“双效果合法物品”未经过现行守卫。
3. `scene-entry-session.boundaries.test.ts:28`用`source:'held' as never`绕过SceneReveal合法union。
   `content/script.ts:250–253`当前dither.source只有previousPresentedFrame，不能把虚构source当合法维度。

返工：每个主fixture在实际测试消费前先过当前表面guard。拆成合法外部脚本物品/合法私有脚本物品；场景入场只按当前onEnter initial合同构造。
无法由合法caller产生的候选臂应列防御/不可达，不去改生产validator迁就测试。
**设计侧勘误**：Codex原工作包B5把“游标选entry”列候选，没有先钉住非initial的合法性；本次据guard收窄该候选。
不是要求GLM补一种新运行能力，r1总体目标仍为合法current合同补测。

## R2 · 帧播放器的时序与缓存测试没有钉住声称的保护

- `frame-animation-player.boundaries.test.ts:163–186`创建slow/gate后`void slow`，真正播放仍用即时h.reader；
  容器迟到完成没有见证，第二次播放成功也不能证明第一次没有迟到提交或监听已释放。
- `:188–211`只等一个Promise微任务就abort，releaseFrame可选调用，不证明进入inflate。
  **仅移除帧await的取消包装，候选8项仍全绿；独立entered/deferred对照显示原实现立即拒绝，坏实现一直等到放行帧才拒绝**。
- `:122–135`始终只有asset a，字节一直来自同一个tpfs Promise；不能证明“只清a保留b”或“同id新字节”。
  **仅保留已完成旧容器，候选8项全绿；独立换字节对照抓到9仍读成1**。
- `:140–152`frameLimit=3，但每次解码最多32帧并逐个入缓存，所选0/33/65等并非声称的命中序列；只看像素正确和size≤3不足以验证LRU。
  **删去命中时刷新触点，候选8项全绿；独立两帧块/三槽缓存对照抓到本应命中的b0又解码**。
- D7在wait阶段按键，不等于frame在途skip；onFrame失败后的另一次播放并没有验证旧keydown监听移除。
  `wait`抛错、旧监听和原Error身份等工作包轴未被现有断言完整证明，不能全部记新增闭环。

返工：预先准备合法字节；每个await分别entered/deferred，取消后先证外层已结束再释放底层，检查迟到提交和监听清理。
invalidate用至少两asset且同id真实换字节；LRU明确见证命中与淘汰后的实际读取/解码轨迹。
坚持只测完成态invalidate；在途回填政策仍待证，不借返工固化未知政策。

## R3 · 完整输出/输入保真/音效正控存在空断言

- `runtime-script-compiler.boundaries.test.ts:27–42`只核顶层metadata和leaf.kind，未核每条after及payload。
  **删除全部编译after，候选4项仍绿；独立断言准确抓到auto/perCommand的wait100丢失**。
  B3`:79–103`仅在编译后立即比原输入，没有按工作包修改产物后验证嵌套条件/地址/entry不别名。
- `entity-action-player.boundaries.test.ts:85–105`选用的once动作根本没有cues，所谓从头播放正控只断言`cues.length >= 0`（恒真）。
  **越尾时重播全部历史cue的坏实现仍过候选9项；合法有声动作的独立对照红**。
- `magic-menu-state.boundaries.test.ts:104–139`“world不可被改”只核party长度与技能ID列表，没有比真正world的HP/MP等完整数据。
  **magicConfirmSpell额外扣HP，候选4项仍全绿；独立实际world深快照红**。菜单state原地修改仍是正确合同，不能反过来要求它不可变。
- B4刷新标题包含auto/hook但主要只切一个trigger页，B6未真正改无关场景，B7“投影完整/双向”只改flat name而未核嵌套throw/effects；
  E4“targetIdx重置”从0起测，“完整castAll”只比skill.id。逐族补实证或明确登记已有/未证，不继续把标题当证明。

返工：加入合法非空正控与精确期望、在实际对象上做深快照与嵌套别名试验；已由旧测试完整证明的轴可引用精确标题而不重复造例。
六个独立见证应从MISSED转为detected，且是候选新增断言自己的业务红，不能只依靠诊断工具中的独立oracle红。

## R4 · 最终树卫生与回执不能对应

- 对候选实际16个新增TS/MJS/MTS/JSON跑Biome：**exit1，4errors/9warnings**。涉及
  `docs/testing/glm-runtime-state-mutants.mjs`导入排序/格式及无效整文件suppression、
  `docs/testing/glm-runtime-state.config.mts`格式、`menu/reward-gain-queue.boundaries.test.ts`格式。
  “16文件Biome干净/rc0”不是本候选的可复算事实。
- Vitest JSON独立逐文件计数：world-variable **6**、migration-diagnostic **4**、compiler **4**、project-view **5**；
  候选机账却写5/5/3/6。总数53恰好相等不代表逐文件账正确。
- reforge九目标真实小计为行497→533/**564**，分支**392→444/533**；回执写497→533/541、282→334/343。
  机账逐模块数据可以算出正确值，正文算错；content全包分母5016应明确写出，不留问号。
- 39族账同步R1–R3：未用慢reader、空cue、未换字节、未实际命中缓存等不能继续称已完成。
  F3空token测试在无活动态上执行，不证明保留已有事务；F6未检查零timer、未发Space，也不能凭标题把这些轴算已证。

返工：格式化自己的白名单文件，逐字段从最终提交树/运行态JSON/覆盖报告生成回执；修正原文及失败记录。
原6对照+16针可保留，但要加能钉住此次语义漏洞的反证；不因“数量够16”免除鉴别力。

## 可重建独立反证

[Codex见证工具](runtime-state-review-witnesses.mjs)：

```bash
node docs/testing/runtime-state-review-witnesses.mjs /Users/zhangxu/illegal/type-pal-glm-runtime-state
```

它先直接校验候选fixture，再对六个单点坏实现各跑原树与突变对照。同一隔离加载里同时运行候选测试与独立oracle，
每针原实现两边绿；坏实现只允许oracle业务AssertionError红，排除TypeError/环境错/未执行。
候选自己的测试仍绿时输出MISSED；修复后应由候选断言变红而输出detected。工具exit0表示诊断有效，**不是任务accept**。
只在mkdtemp生成配置/日志，Vite load隔离换源；产品和参与的候选测试文件SHA前后一致，不改候选语义。

| 单点坏实现 | 候选测试 | 独立oracle | 结论 |
|---|---:|---|---|
| compiler-after-loss | 4/4绿 | after等待丢失，业务红 | MISSED |
| frame-await-cancel-bypass | 8/8绿 | 真正帧在途取消不及时，业务红 | MISSED |
| invalidate-keeps-old-container | 8/8绿 | 同id换字节仍读旧内容，业务红 | MISSED |
| lru-hit-does-not-touch | 8/8绿 | 最近命中帧错误淘汰，业务红 | MISSED |
| expired-action-replays-cues | 9/9绿 | 越尾重播历史声音，业务红 | MISSED |
| magic-confirm-mutates-world | 4/4绿 | 菜单确认扣世界HP，业务红 | MISSED |

本机证据：`/tmp/type-pal-state-review.Zn9nHY/`（定向/全包/格式/GLM负控/四跑覆盖）；
GLM负控重跑日志`/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/sb1-mutants-7xPMiO/`；
最终Codex六见证`/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/codex-runtime-state-qU1i8y/summary.json`。
Codex工具初轮在第四针出现诊断脚本生成错误（尾部行注释吞掉闭合），已修生成器换行；不是候选失败。
最终发布版重新跑全部六对照/六见证通过诊断条件，计入结论的只有最终有效证据。

## 下一位：GLM返工

从最新main同步这份counter（保留原文）到自己的测试分支；只改已获准白名单测试/fixture/诊断/本人回执。
处理R1–R4，不改生产去迁就测试、不删除Codex oracle、不回退模拟器设计文档/看板行。
定向/相邻/两包全测/tc/全部新增文件Biome，原22跑及本工具六见证，私有同口径覆盖重算后交Codex。
正式集成/全仓check/官方ratchet/受保护strict-fast仍由Codex接收后执行；不代签、不标done、不转Kimi。
