# TEST-GLM-WAVE-P-1 — Editor全域残余工作流十倍测试包

Status: rework
Phase: phase2
Capability: editor-workflows / test-coverage
Coding Owner: GLM P（仅新测试与专属证据）
Reviewer: Codex（独立验收、集成与正式结算）
Visual Verification Timing: dev-functional（自有小工程；不改产品UI）
Branch: `codex/glm-wave-p-editor-residual-r1`（新独立worktree）

## 最新新增合同边界与模型（2026-10-01 GC-1）

[Cursor保留74源](../../testing/grok-cursor-large/targets.json)的后续新主合同/反控归Cursor，
取代下文“Editor全包新增合同独占”；P继续其余源和原审核窄返工，原67例/10针证据保留。
不得删除历史交付、改Cursor树或顺手扩大旧合同；依赖允许只读调用。
原派发/冻结/700例/70组/50针/20流程目标不变，原counter仍需闭合。
模型明确：类型/反控/合同账与代码余族用GLM-5.3；实际截图读图阶段用GLM-5.3-Flash。
用户手动转发，不冒称已收到边界，不恢复ZCode操作。

## 目标与冻结

本卡目标 **700合法未重复用例、70合同工作组、50有效反控、20条实际功能流程**。
[共同协议](../../testing/glm-tenfold-triple/README.md)为硬验收，
[冻结表](../../testing/glm-tenfold-triple/targets.json)给Editor288源/SHA256/5426未命中臂池。
冻结 `3ac9a2e2f6aba8a5cc97640c18fef8549d199380`；派发含L/M，必须读其67/31例及
全部相邻旧断言。新测试名不等于新合同，重复的undo/数字换值/DOM快照不计700。

## 前提与上下文

一句话前提：现行Editor真实输入、命令、资源与保存入口有已冻结公开调用，可观察业务结果；
不是授权修产品、改变样式、save/schema或恢复旧开发版本。before→after仅测试证据增强。

| 真值维度 | 直接锚点/边界 |
|---|---|
| primary | `packages/editor/src/core/project-io.ts:263,393,471`序列化/写入；`:690`写集合预检；`:180`作者只读校验 |
| 一阶段 | 仅既有UI形态参考；没有原版玩法/碰撞真值变更，不重新决定图标/菜单布局 |
| 二阶段 | `core/script-editor.ts:295,674,1008`canonical遍历/引用/解析；真实App/MapMode/ScriptEditor组件与命令caller |
| 目标 | 各公开workflow typed fixture、真实undo/redo与最终状态；资源/目录边界只封外部IO |

最强替代解释：大量未覆盖是不可合法构造、宿主限制或L/M/更早工作包已证。
推翻观察：要mock App/业务命令/保存核心、操作私有state、缺字段强转或改变答案才能绿，
停止该组。先读READ-FIRST、L/M独立验收、GLM自检；N的Canvas反例同样适用于本卡。
深链#0和Esc通知两张产品draft卡只读，不夹修复、不另判新的用户可见行为。

## 十里程碑（每域七轴，共70工作组）

| 批 | 范围 |
|---|---|
| P01 | 项目打开/恢复/只读作者检查/保存preflight与真实受控IO；不写真实用户工程 |
| P02 | MapMode选区/图层/资产/变换/SceneCanvas残余，排除L既有断言 |
| P03 | ScriptEditor及canonical脚本引用/嵌套命令/诊断定位、当前作者正文保存 |
| P04 | actor/角色/敌人/team/装备/属性编辑与引用维护 |
| P05 | battle field/战斗配置/预览/trial编辑入口残余，排除M及旧battle-host证明 |
| P06 | world/battle sprite、帧/动作/图片库与上传/预览取消、迟到成果释放 |
| P07 | item/use/throw/alchemy/shop/奖励编辑及删除引用，排除M已证合同 |
| P08 | skill/enemyAI/poison/condition/lifecycle作者控件与合法guard |
| P09 | locale/rich-text/variable/sprite/stamp/tileset数据编辑与UI残余 |
| P10 | App生命周期、导航/弹层/键盘焦点、设计控件和资源依赖真实组合及整账 |

每域七轴：创建；编辑/替换；删除/引用阻断；undo/redo；取消/失败恢复；边界键盘/焦点；
迟到与资源归属。没有该轴就登记N/A，不能虚构生命周期接口。
每批约70用例/至少5反控，十批连续做。20条浏览器流程在自有小工程，真实操作前后
各有可见证据、截图hash、console分类；含宽/窄窗、键盘、错误恢复与undo，不追求凑截图。
不能接管Codex当前窗口、E2E002、真实PAL项目或存档；不走剧情。

## 写入与验收

仅Editor `src/**/*.glm-p.test.ts(x)`、`src/__tests__/glm-p/**`及
`docs/testing/glm-tenfold-triple/wave-P/**`。产品/旧测/公共fixture/依赖/配置/baseline、
O/Q包、共享导航/任务卡/看板只读。外部fetch/Canvas/目录边界可typed替身；业务核心不可mock。
真实2D可用时保留其行为；不以透明像素skip断言冒充像素路径。保存tests只用临时工程。

共同协议的contracts去重账、700最终fullName/status、50枚三态反控证据、实际浏览器20流程、
同源同分母私有coverage、receipt/未证/缺陷必须准确一致。最后格式化后重核所有源/反控hash。
末批串行Editor全包test/typecheck、根lint完整0/0/0、docs、区间diff、verifier；
GLM不跑正式ratchet、不合main、不标done，Codex独立核并集后收口。

## 当前模式推进记录

- Codex：源池/消费者/目录独占与L/M排重基点已核，**build allowed仅本卡新测试**。
- GLM P独占Editor新增后缀与fixture；O/Q只读依赖，不共享可写Owner。
- 新产品行为/保存格式/样式选择：未开放；产品counter先交最短红证据停该组。
- 交付/独立验收pending；done blocked；700合法新合同不足则请Codex据排重账调整，不灌水。
- 用户产品验收N/A（纯测试、不改UI）；浏览器证据由Codex复核，不恢复固定三签。

## 下一位GLM P提示词

```text
你是 TEST-GLM-WAVE-P-1 唯一测试Owner。先读AGENTS、READ-FIRST、本卡、GLM自检、glm-tenfold-triple协议/targets及L/M旧断言。
从本轮已推送派发40位SHA新建 codex/glm-wave-p-editor-residual-r1 与独立worktree，运行verify-targets。
连续十批P01–P10：700合法未重复合同/70组/50有效反控/20条自有小工程真实功能流程。不得mock业务核心或私有state凑数。
仅本卡Editor新测试、专属glm-p fixture和wave-P证据可写，交最终fullName JSON/去重账/反控三态日志hash/截图与console/私有同分母覆盖。
串行Editor全包test/typecheck、根lint0/0/0、docs/diff/verifier后推送完整候选SHA；不合main、不标done。
产品/旧测/配置/官方baseline/O/Q/共享文档及E2E002/真实项目只读。深链#0、Esc通知不夹修复；缺合法缺口或真缺陷交证据停该组。
```

## Codex 独立审核返工项（2026-10-01）

候选 `8fb38fcc3b3f4f2d277260148c66488c979caa49`，远端与本地相符。
Codex **counter → rework**；70/700例、10/50枚反控、0/20浏览器流程，只有P01和P02部分。
[独立审查与返工项](../../testing/glm-tenfold-triple/codex-review-20261001.md)、
[457例实跑及门禁机器证据](../../testing/glm-tenfold-triple/codex-review-20261001.json)
覆盖上方旧派发提示词，历史数字保留。

- 冻结716/716及白名单通过；70例实跑全绿、Editor typecheck、lint2799文件0/0/0、docs/diff零。
- P-01：project-diagnostics新测:57/73/87的as never/双桥违反硬边界，tsc绿不豁免。
- P-02：P01-C03与P02-C10原始mutated.json各红2例，均不能记有效；不得过滤额外红骗过判据。
- P-03：receipt的0c1a1b8c后仅docs-only说法与实际e4467740测试/证据改动不符，需真实锚点/区间。
- P-04/COMMON-01：补P02剩余与P03–P10、20条真实浏览器流程；原700例/70组/50有效反控目标不缩。
- 本轮未accept全部合同/反控/视觉，未复跑全包或正式覆盖/统一门，不合main、不done。

### 下一位 GLM P 提示词（返工，取代旧派发提示词）

```text
你继续 TEST-GLM-WAVE-P-1，原分支 codex/glm-wave-p-editor-residual-r1，起点候选 8fb38fcc3b3f4f2d277260148c66488c979caa49。当前 rework，仅原Editor新测试/专属fixture/wave-P证据可写。
先读 /Users/zhangxu/.codex/worktrees/glm-lmn-acceptance/type-pal/docs/ops/tasks/TEST-GLM-WAVE-P-1-editor-residual-tenfold.md 的2026-10-01返工段与所链审查/机器证据，再读共同协议与GLM自检。
闭合P-01/02/03：project-diagnostics的as never/双桥改为合法typed fixture或真实unknown/IO拒绝；P01-C03和P02-C10各两红都要替换为单合同业务反控，代表组相邻例不得过滤藏红，完整三态JSON/raw/退出码/执行数/AssertionError/hash；回执准确钉最终测试/证据提交与docs-only区间。
连续补P02剩余、P03–P10，原700合法未重复例/70组/50有效反控、20条自有小工程实际浏览器流程均保留，交截图hash/相位/console；不接E2E002或真实PAL/他人窗口。逐合同去重，缺合法轴举证申请调整，不自行缩围凑数。
仍钉派发基点8b3ca062953b17a12178f8d1a9e36657971234b1、冻结3ac9a2e2f6aba8a5cc97640c18fef8549d199380；不要cherry-pick Codex共享审查提交或改基点绕白名单，源漂移先交Codex。
最后实跑最终JSON与源hash，串行Editor全包test/typecheck、根lint完整0/0/0、docs/diff/verifier，推送完整候选SHA。产品/旧测/配置/官方baseline/O/Q/共享文档只读，不合main、不标done、不清树。
```

## Codex r2 二审（2026-10-01）

候选 `2547d8ade1ba94f124acdbef17d495672c581828`（本地/远端一致），
测试锚点 `47a3e49ae72a1262e23de814bd483628ab896a98` 后确实仅wave-P文档/证据。
**counter，保持rework**；70/700实跑例、10/50提交反控仍部分，
20条浏览器记录未全部证明实际流程。历史记录保留。
[二审详情](../../testing/glm-tenfold-triple/codex-op-r2-review-20261001.md)、
[机器证据](../../testing/glm-tenfold-triple/codex-op-r2-review-20261001.json)。

- P-01旧三桥关闭；P-03区间误记关闭。
- P-02旧双红关闭：Codex隔离副本不筛邻居，P01-C03为24执行/1业务红、
  P02-C10为5执行/1业务红，恢复29/29绿。其它8枚仅证据/hash审计，不冒称独立执行。
- Editor全包3856绿，新70与最终directed逐条一致，typecheck/docs/diff零；
  根lint2801文件完整0/0/0。全包jsdom导航未实现提示不冒称stdout零。
- P-R2-01：10枚receipt.patch全部corrupt；counter.mjs允许两红/错目标，实际旧两红报告
  仍被当前predicate接收。补可应用patch/验证manifest及严格单目标judge拒收自测。
- P-R2-02：G09三条分类器断言重复旧file-system-access.test，contracts账需真实旧断言锚点；
  保留非法URL等不同残余，续P02及P03–P10，原700/70组/50不缩。
- P-R2-03：F02/F06/F09错相位，F13/14/15/17/20无after，F16无状态差分，
  F18未证窄窗可达，真实错误恢复未证；仅补失败证据，保留F03/F11有效流程。
- 完整verifier因projects/glm-p-lab/20未跟踪自有工程文件exit1；源716/716、
  已提交142路径白名单均通过。Codex未删除lab；Owner保留可复现最小输入于白名单，
  将运行工程可恢复迁入隔离临时目录后重跑，不改ignore、不提交projects越界。
- 不合main、不done、不清活动树，不正式覆盖结算。

### 下一位 GLM P 提示词（r3，取代上方返工提示词）

```text
你继续 TEST-GLM-WAVE-P-1，原分支 codex/glm-wave-p-editor-residual-r1，起点 2547d8ade1ba94f124acdbef17d495672c581828。当前rework，只写原Editor新测试/专属fixture/wave-P白名单。
先读 /Users/zhangxu/.codex/worktrees/glm-lmn-acceptance/type-pal/docs/ops/tasks/TEST-GLM-WAVE-P-1-editor-residual-tenfold.md 的Codex r2二审段与所链codex-op-r2-review-20261001.md/json，再读共同协议和GLM自检。
P-01类型桥、P-02两枚真实单业务红、P-03docs-only区间已关闭，保留成果，不重复返工。修counter.mjs判据：恰一指定file/fullName业务断言红，拒收两红/错目标/skip/collection/环境/超时/未处理异常，正与恢复执行集相同全绿；加实际拒收自测，不过滤邻居。Vitest rejects的Error前缀可来自AssertionError，保留原文。
10条receipt.patch均corrupt，改为可应用正确patch或验证过的明确替换manifest，最终重建hash/三态JSON/raw/退出码/执行数逐枚一致；不修改产品。
逐合同contracts账填真实旧fullName/断言锚点，G09三条分类器旧断言不计新，保留非法URL不同轴；续P02残余和P03–P10，700合法未重复例/70组/50有效反控目标不缩，缺合法轴逐条件举证申请，不灌水。
仅补错位/缺失浏览器相位：F02/F06/F09、F13/14/15/17/20、F16状态差分、F18真实窄窗可达及合法失败恢复。保留健康F03/F11；20条必须是真实功能前后流程，不以静态观察换名。保存自有lab最小合法输入/版本/hash/步骤到本卡白名单，运行树可恢复迁出projects/glm-p-lab到隔离临时目录再跑完整verifier，不删真实数据/不增ignore/不提交projects越界。
派发8b3ca062953b17a12178f8d1a9e36657971234b1、冻结3ac9a2e2f6aba8a5cc97640c18fef8549d199380不变；不cherry-pick共享Codex审查提交、不改基点绕白名单。最终串行Editor全包test/typecheck、根lint完整0/0/0、docs、区间diff、verifier，定向JSON对齐最终实跑，推送完整40位SHA。
产品/旧测/配置/官方baseline/真实工程/O/Q/共享卡看板只读；不合main、不标done、不清活动树，不自行修UI/扩大超时。
```

## Codex r3 工具/证据预审（2026-10-01，非整包验收）

固定候选 `48ade197eb508273168f62384141f8d1dde854ec`，**counter，保持 rework**。
[预审详情与拒收反例](../../testing/glm-tenfold-triple/codex-zcode-pq-preflight-20261001.md)、
[机器记录](../../testing/glm-tenfold-triple/codex-zcode-pq-preflight-20261001.json)。

- 67 最终 directed；10 枚原始三态 fullName 集/单目标红/恢复绿/product-mutant hash 审计对应。
  保留旧业务证据；未独立重跑这10枚业务变异、全包或本轮视觉，不记全部 accept。
- P-R2-01 未闭合：作者 judge 自测10/10实跑绿，但四个独立拒收反例均被接受；
  仅比较数量、漏收集/runtime 错误与 pending，恢复 runner 仅查 exit。
  counters.json 的10枚 patch 全部仍不同于正确 per-counter receipt；工具固定临时路径不符合 mkdtemp。
- 本次不重开旧类型桥/双红/区间；F14/F18与整包缺口仍未证。67/700 的例数缺口应633，不是旧630。

### 下一位 GLM P 直接续派补充（优先于上方旧 r3 指令）

仅原白名单内收紧唯一 judge：各相位逐条 passed/failed、拒零执行/pending/todo/skip/
collection/runtime/未处理异常，完整 file×fullName 多重集合比较；恢复相也调用，不仅 exit。
保留 Vitest rejects 的真实 AssertionError 序列化原文，不靠 Error 前缀一刀拒收。
添加上链四个独立反例和 signal/spawn 拒收自测；mkdtemp+finally仅回收本次树，不全局prune。
由最终 receipt 重建10枚索引patch，验证可应用/重建hash；不变业务证据保留，改变源/执行集才重采。
再持续 P02残余/P03–P10及F14/F18，原700/70组/50/20不缩。候选仍固定上方SHA待审；
不写产品/旧测/共享文档、不中断O/Q、不合main、不done、不清活动树。
本轮 UI 第三槽仍待确认框恢复；用户无需搬运此提示，由Codex直接发送。


## Codex r3.5 独立审核（2026-10-01）

固定本地/远端候选 `bb2ffcb6614a5f48eb5bb0bab671941242f2a00b`，**counter，保持rework**。
[P本轮独立复核](../../testing/glm-tenfold-triple/codex-p-r35-review-20261001.md)、
[机器证据](../../testing/glm-tenfold-triple/codex-p-r35-review-20261001.json)。

全包516文件3853绿，新67身份逐条一致；typecheck零、lint2804文件完整0/0/0、diff/verifier通过，但docs两项失败。旧四拒收/恢复判据/10索引patch关闭；P-R35-01变异身份与真实未处理异常仍误收，P-R35-02失败process.exit跳过finally实证泄漏，P-R35-03 docs/633缺口/14自测/66截图与证据来源需同步，P-R35-04真合同账与P02–P10/F14/F18仍未完成。原700/70组/50/20不缩，已有业务证据保留，源/执行集改变只重采受影响针。

不合main、不标done、不清贡献者树、不正式覆盖结算。用户已撤销直接ZCode操作授权；
上方历史自动续派说明不再执行，以下由用户手动转发。

### 下一位GLM P提示词（本轮最新）

```text
继续 TEST-GLM-WAVE-P-1，原树 /Users/zhangxu/.codex/worktrees/glm-wave-p-editor-residual/type-pal，原分支 codex/glm-wave-p-editor-residual-r1，固定审核候选 bb2ffcb6614a5f48eb5bb0bab671941242f2a00b。先读 /Users/zhangxu/.codex/worktrees/glm-lmn-acceptance/type-pal/docs/ops/tasks/TEST-GLM-WAVE-P-1-editor-residual-tenfold.md 最新 r3.5 独立审核段及所链 codex-p-r35-review-20261001.md/json，按 P-R35-01～04 窄返工：mutant 对齐完整多重身份；真实未处理异常/raw harness/signal/spawn/无效退出拒收；throw+finally 覆盖建树/复制/各拒收分支并仅回收本次树；补 browser 目录索引导航，修633缺口/14自测/66截图与三态证据重采来源；逐合同补真实条件/caller/旧fullName断言行/完整matcher和值。旧四拒收、恢复判据、10索引patch、G09删除与既有业务证据保留，源或执行集改变才重采受影响针。再连续原P02残余/P03～P10与F14/F18，700合法未重复例/70组/50有效反控/20流程不缩，不凑数，缺合法轴逐项举证申请。只写原P新测试/专属fixture/wave-P白名单；派发8b3ca062953b17a12178f8d1a9e36657971234b1、冻结3ac9a2e2f6aba8a5cc97640c18fef8549d199380不变。最终定向JSON与源hash一致，串行Editor全包test/typecheck、lint完整0/0/0、docs/diff/verifier后推送40位候选；产品/旧测/配置/官方baseline/真实数据/O/Q/共享文档只读，不合main、不标done，不操作其它会话。
```


## Codex r3.5-review 最新独立复核（2026-10-01）

固定本地/远端 `c30d53441df71c62b4029e79e7faae6bb3bc03b9`，**counter / rework**。packages和配置依赖未变，复用已核Editor3853/typecheck零，67最终身份匹配。新19自测绿，mutant异身份/真实未处理异常/-1拒收、错误目标失败finally无登记泄漏；P-R35-01/02及docs两个失败关闭，不重做。lint2804文件0/0/0、docs/diff/716冻结/158白名单通过；10存档/10目标对应，9针更新+P02-C08未变。P-R36-01 oracle仍首条初始状态，非开盘/提交/关闭回焦/移焦结果，真账未闭；P-R36-02三相raw/正常退出政策及19自测/最新52dd工具锚口径需同步。67/700、14/70、10/50与18/20仍部分，F14/F18未证；原目标不缩。代码先做，视觉单独阶段，不让文本模型代读图。

[详细判定与下一步](../../testing/glm-tenfold-triple/codex-opq-latest-review-20261001.md)、
[机器证据](../../testing/glm-tenfold-triple/codex-opq-latest-review-20261001.json)。
本轮未合main、未done、未官方覆盖结算、未新视觉；不写贡献者树，不自动投递。
用户手动选择GLM-5.3后转发以下代码提示词；P视觉另阶段手动选Flash。

### 下一位GLM P代码提示词（本轮最新）

```text
继续TEST-GLM-WAVE-P-1，唯一P Owner，原树/Users/zhangxu/.codex/worktrees/glm-wave-p-editor-residual/type-pal、分支codex/glm-wave-p-editor-residual-r1，固定c30d53441df71c62b4029e79e7faae6bb3bc03b9。先读审核树/Users/zhangxu/.codex/worktrees/glm-lmn-acceptance/type-pal/docs/ops/tasks/TEST-GLM-WAVE-P-1-editor-residual-tenfold.md最新段和同树docs/testing/glm-tenfold-triple/codex-opq-latest-review-20261001.md/json。P-R35-01 mutant身份/真实异常、P-R35-02 finally清理和docs两问题已关闭，不重复窄修。补P-R36-01真实逐条件合同账，G03 oracle指实际开盘/提交/关闭回焦/键盘移焦结果，不再第一断言；旧完整fullName和行锚齐，标题未测空格撤回或合法排重补证。P-R36-02所有三相接入共同raw/harness判据，业务exit1与无效退出分开，补政策拒收自测；同步19自测、52dd21198工具证据锚、9针更新+1针未变。源/执行集不变不要求全10重采。连续原P02残余/P03～P10的合法代码合同，700例/70组/50不同目标不缩；必须避让共同grok-cursor-large/targets.json给Cursor的74保留源，新主合同不越界，既有历史/窄返工保留。只写原P白名单新测/fixture/wave-P，派发8b3ca062953b17a12178f8d1a9e36657971234b1、冻结3ac9a2e2f6aba8a5cc97640c18fef8549d199380不变；产品/旧测/配置/baseline/真实数据/O/Q/共享文档只读，每批定向相邻/typecheck并阶段推送。此提示仅代码阶段，不启动浏览器或用源码代替F14/F18视觉；20流程目标保留，视觉另交接。最后全包/静态零/docs/diff/verifier和完整真实SHA；不合main、不done、不跑官方门、不清树。
```


## Codex r3.6 独立复核（2026-10-02）

固定本地/远端 `2ba6c02303d44f136762b81d1255683893e6c5d9`。**本轮窄项 accept，整卡仍 rework/PARTIAL**：新Editor3853/3853、516文件/typecheck零，67最终身份匹配；lint2804文件完整0/0/0、docs/diff/716冻结/158白名单通过。G03业务结果/诚实标题、三相共同raw/exit1政策、22自测关闭；10存档10目标/index/patch/三态最终hash及执行身份对应，不重复工具窄修。逐条件旧锚纳入后续真账；receipt三个静态sourceSha摘要从最终树更新，不误判10业务针hash不符。继续P02合法残余/P03–P10，当前67/700、14/70组、10/50目标；F14/F18仍未证，不把窄返工当整卡done。

[详细判定与下一步](../../testing/glm-tenfold-triple/codex-opq-r8-review-20261002.md)、
[实跑与逐针机器证据](../../testing/glm-tenfold-triple/codex-opq-r8-review-20261002.json)。
本轮无新视觉、未合main、未done、未正式覆盖结算；不写贡献者树、不自动投递。
以下代码阶段请用户发送前手动选 **GLM-5.3**；P视觉另阶段手动选Flash，不混派。

### 下一位GLM P代码提示词（覆盖旧交接；用户手动转发）

```text
继续TEST-GLM-WAVE-P-1，唯一P Owner，原树/Users/zhangxu/.codex/worktrees/glm-wave-p-editor-residual/type-pal、分支codex/glm-wave-p-editor-residual-r1，固定2ba6c02303d44f136762b81d1255683893e6c5d9。先读审核树/Users/zhangxu/.codex/worktrees/glm-lmn-acceptance/type-pal/docs/testing/glm-tenfold-triple/codex-opq-r8-review-20261002.md/json及原卡最新段。G03结果/诚实标题、三相共同raw/exit1政策窄项关闭，10业务针/索引/最终执行集对应；不重做这些工具或未变针。继续原P02合法残余与P03～P10，不再仅交窄返工回执；每域先逐条件核旧fullName和断言行，业务oracle完整matcher和值，补真账而非首初态断言。700例/70组/50不同合同目标不缩，当前67/14组/10针仍部分；避让grok-cursor-large/targets.json中Cursor74保留源的新增主合同。派发8b3ca062953b17a12178f8d1a9e36657971234b1、冻结3ac9a2e2f6aba8a5cc97640c18fef8549d199380不变，仅原P新测/fixture/wave-P；产品/旧测/配置/baseline/真实数据/O/Q/共享文档只读。此为代码阶段，不启动浏览器或代读F14/F18；20流程目标保留另交视觉。每批定向相邻/typecheck，阶段提交推送，末批Editor全包/静态0/0/0/docs/diff/verifier与完整SHA；不合main、不done、不官方门、不清树。
```


## Codex r9 独立复核（2026-10-02，最新）

固定 fb735c552282cb6e88e32ba30fbe320f11a31d2b（测试/证据cd68684257296ef98ddf9dba020eaee0eea5548d），counter/rework。Editor3864 passed+1 failed；Toolbar同文件默认门三次4/5，真实RAF焦点未收敛，不是资产环境红。typecheck零、22自测过、lint2825文件0/0/0、docs/diff/716冻结/194白名单过。79身份匹配但一状态不一致；新fixture公开ScriptEditSession拒收实体machine.entry，G13-02伪证、G13-04/G14-04旧证明，G12-03/G13-01逐条件排重。15三态结构对应/15目标、旧10未变保留，新C11实际runner绿但合法正控未接收；净新上限≤76、缺口≥624。原700/70组/50目标/20流程不缩，18/20视觉及F14/F18未完。

[详细结论与交接](../../testing/glm-tenfold-triple/codex-opq-r9-review-20261002.md)、[机器总证据](../../testing/glm-tenfold-triple/codex-opq-r9-review-20261002.json)。未写贡献者树、未自动投递、未合main/done/正式结算。代码阶段由用户发送前手动选 GLM-5.3；P未证视觉另阶段手动选GLM-5.3-Flash，不混派。

### 下一位 GLM P 提示词（覆盖旧交接；用户手动转发）

```text
继续TEST-GLM-WAVE-P-1，唯一P Owner，原树/Users/zhangxu/.codex/worktrees/glm-wave-p-editor-residual/type-pal、原分支codex/glm-wave-p-editor-residual-r1，固定fb735c552282cb6e88e32ba30fbe320f11a31d2b。先读审核树/Users/zhangxu/.codex/worktrees/glm-lmn-acceptance/type-pal/docs/testing/glm-tenfold-triple/codex-opq-r9-review-20261002.md/json及原卡最新段。闭P-R9-01～03：P03 fixture实体machine.entry非法，改合法onEnter initial state并核handoff源/目标cursor，公开作者校验/引用闭包须过；G13-02真实非initial+精确非空命令/无initial，去every伪证；G13-04坏路径和G14-04正文标签旧测已直证，existing-proof不计新；G12-03已有旧只读后缀证据，保留须独证合法entry容器/locator新轴，G13-01对照旧完整locator排重。Toolbar默认门全包及单文件3次实红，用真实RAF/可观察焦点收敛等待而非抢焦/空act，不扩timeout、不改产品。旧10针/22自测/G03收窄标题及业务oracle保留，仅P03受影响新5针与Toolbar所属针需重采。同步79执行净新上限≤76/缺口≥624、17组/15存档/18流程与当前锚/历史口径，继续P02残余/P03～P10，不整族缩围。派发8b3ca062953b17a12178f8d1a9e36657971234b1、冻结3ac9a2e2f6aba8a5cc97640c18fef8549d199380不变，避让Cursor74新合同保留源；仅原P新测/fixture/wave-P，产品/旧测/配置/baseline/真实数据/O/Q/共享文档只读。此为代码阶段，F14/F18另阶段视觉不代看图；每批定向相邻/typecheck阶段推送，末批Editor全包/静态0/0/0/docs/diff/verifier与完整SHA。700/70组/50目标/20流程不缩；不合main、不done、不官方门、不清树。
```


## Codex 最新独立复核（2026-10-02，r10）

固定43a281325192645ac775f93428c3ba2f788bdd94，counter/rework。最终不可变串行全包3863绿+1旧M红；78定向全绿、旧M单文件3次2/2，完整门失败不覆盖且旧测不在P写白名单。typecheck/22自测/2821文件静态0/0/0/docs/diff/716冻结/187白名单过。14三态身份/hash对应，9旧未变+5更新，3针9相独立重放过。onEnter entry位置/非initial真断言/新locator与标签/真实RAF收敛关闭；三处handoff仍stage↔state不匹配，公开ScriptEditSession拒收。默认等待独占诊断3次5/5，原候选仍扩2000ms；C13历史七文件被删及账摘要仍counter。结构78/17组/14目标/18流程，622/53组/36目标/2流程未完，不main/done/正式结算。

[详细审核与最新交接](../../testing/glm-tenfold-triple/codex-p-r10-review-20261002.md)、[机器证据](../../testing/glm-tenfold-triple/codex-p-r10-review-20261002.json)。只审固定候选、未写贡献者树、不自动投递。代码阶段由用户手动选GLM-5.3；P未证视觉另阶段手动选GLM-5.3-Flash。

### 下一位 GLM P 提示词（覆盖旧交接；用户手动转发）

```text
继续TEST-GLM-WAVE-P-1，唯一P Owner，原树/Users/zhangxu/.codex/worktrees/glm-wave-p-editor-residual/type-pal、原分支codex/glm-wave-p-editor-residual-r1，固定43a281325192645ac775f93428c3ba2f788bdd94。先读审核树/Users/zhangxu/.codex/worktrees/glm-lmn-acceptance/type-pal/docs/testing/glm-tenfold-triple/codex-p-r10-review-20261002.md/json及原卡最新段。只闭P-R10-01～03：onEnter entry位置已合法，但三处handoff仍把auto2状态机当stage；talk合法cursor是stage/start，auto2是state/machine-1/idle，入口/item的to与shared的from都须对齐，expected核真实合法映射，共同fixture返回前实际经过公开ScriptEditSession/引用闭包，失败不能绕过，不把准入测试算新业务合同。Toolbar删timeout2000扩张，默认waitFor可观察RAF收敛；手设focus/空act已删除、三次5/5、真实业务方向关闭不重开。C13退役方向保留，恢复明确历史原证据并与r9字节一致，不计活跃、不补旧目标新针；同步78执行/17组/14目标/18流程、9旧三态未变+P02-C08和4P03更新、定向/实际lint/完整SHA与docs-only锚，修67/10/40/P03未开工等旧摘要。P03账按最终源条件/合法cursor/真实容器locator和完整matcher+expected更新，去同上/仅isDefined/截操作数；旧两重复删除和新prepare标签方向保留。源/执行集改动仅重采受影响4P03与Toolbar所属针，不重采未变旧9或重做22判据。然后持续原P02残余/P03～P10合法余族，不再把窄返工当整卡完成；700/70组/50不同合法目标/20流程不缩，F14/F18另阶段视觉。派发8b3ca062953b17a12178f8d1a9e36657971234b1、冻结3ac9a2e2f6aba8a5cc97640c18fef8549d199380不变，避让Cursor74新合同源；仅原P新测/fixture/wave-P，产品/旧测/配置/baseline/真实数据/O/Q/其它队列/共享文档只读。每批定向相邻/typecheck阶段推送，末批Editor全包/静态0/0/0/docs/diff/verifier及真实完整SHA/准确剩余账。不合main、不done、不官方ratchet/protected、不清原树。
```
