# TEST-RUNTIME-STATE-BOUNDARIES-1 - 运行时状态与作者元数据六组补测

Status: rework
Phase: phase2
Capability: 已有状态/元数据合同覆盖，不改变能力地图
Coding Owner: GLM（只新增测试）
Integration Owner: Codex
Reviewer: Codex / Kimi
Visual Verification Owner: N/A
Visual Verification Timing: N/A
Unavailable Agents: none
Branch: codex/glm-runtime-state-boundaries-r1

Revision: r1，2026-09-19；生产冻结`e58834f6389a40ffe9f187e6a8051f552e964d79`。
用户要求“再给GLM一大批任务，Codex同步推进下一项”。本卡独立于[技能试放卡](EDITOR-SKILL-TRIAL-1-isolated-battle.md)，一次设计准入后六组连续完成。
唯一工作包/39族/文件白名单/执行纪律：[GLM六组补测](../../testing/glm-runtime-state-boundaries.md)。

## 目标与范围

补11个current真实调用模块的作者元数据守卫、编译/投影、动作/帧序列、菜单状态、呈现事务回归。
只新增11测试文件、两个薄fixture及本人诊断/回执；产品/旧测试/官方范围/基线零改。已有强证据不重复加条数。
不涉及GLM刚完成的运行时十模块包，不改Codex的main/boot/技能试放接线；无视觉、音频听感或完整E2E声明。

## 前提真值门

一句话：11个目标有当前caller且已有测试仍有可独立补强的参数/时序/身份轴；目标是可证伪测试，而非改变产品行为。

| 真值面 | 一手证据与结论 |
|---|---|
| 原版/primary source | 不新增原版公式或演出政策；当前公开TS合同为本包真源。世界变量长度/错误路径在world-variable.ts:42–115；诊断V1在migration-diagnostic.ts:44–95 |
| 第一阶段 | 输入/菜单知识来自game菜单现有语义，main调用当前magic/system状态机；不复制旧内部架构、角色下标身份或战斗数值 |
| 当前二阶段 | 工作包11模块均列真实main/editor/content caller；entity动作明确有基础/覆盖双轨，frame播放器已有AbortSignal，ScreenHold以owner而非token字符串防旧收尾 |
| 本任务目标 | before→after只增合法正反测试与覆盖账；世界/脚本/存档/资产版本和用户行为不变，no visual changes |

Codex已逐项直读目标源码、旧测试标题及关键断言，独立复算576/657行、475/639臂；既有content2文件10项、Reforge9文件80项绿。
最强替代解释：已测、没有current caller、前置守卫令分支不可达、API有意原地修改、合同尚未确定。
反证成立就记已有/防御/待证，不造非法fixture或反向期望。尤其magicConfirmSpell原地改菜单state、诊断不承诺exactKeys、
frame在途invalidate政策未知；不以低覆盖证明bug。用户可见偏离N/A：本卡无行为改变。

## 上下文锚点

- AGENTS、CLAUDE、[READ-FIRST](../../phase2/READ-FIRST.md)，[harvest元层](../../phase2/reference/phase1-knowledge-harvest.md#x--元层) X7/X8只取通用教训。
- [最新覆盖率](../../testing/coverage.md)、[前包接收教训](../../testing/reforge-runtime-contracts-review.md)：实际输入、真实交错、精确输出、判据鉴别力。
- 源码/既有测试/精确白名单以工作包为准。D-07私有引用歧义、frame在途invalidate、RewardGain微任务跨序列政策若遇到，隔离报告不擅修。
- 禁止兼容旧模型/保活无caller接口；局部V1与legacy-script来源标签仍是当前合法数据，不按词删除。

## 验收

六组39族逐项可追溯；重复强用例只记已有。至少12条新断言业务红的单点负控及正控，失败判据也须自测。
合法fixture经当前guard，输入快照须同一对象，异步进入/结束均有见证。定向/相邻/两包全测、tc、全部新增文件Biome绿。
同树同官方testSelection覆盖对照只输出/tmp；整包接收后由Codex串行check→ratchet→受保护单次fast。
新缺陷另报，不把默认红测试混入；GLM贡献披露，其自验不充独立第三方，Kimi接收后终审。
本包没有视觉与剧情E2E验收；C/D/F仅检验数据状态和宿主协议。

## 推进签字

### build前（r1）

- Codex：**premise verified / design agree（2026-09-19，e58834f6）**。本人直读11目标的公开入口与实际消费者，复核旧测试去重，复算官方分数，既有10+80测试绿；新路径不存在。
  编译器限定current入口，菜单明确mutating/no-op合同，播放器只做非视觉轨迹；隔离试放/save/战斗公式与无caller旧入口。
  可证伪条件：若候选族没有合法当前输入、已有完全等价断言、只有统计臂没有实际消费，就收窄/复用，不以39族强迫新增。
- Kimi：**premise verified / design agree（2026-09-19，r1，冻结 e58834f6；全部锚点本人直读，未读 GLM 结论）**。
  - **11 模块合同与 caller 直读**：`world-variable.ts:42-50` ID 长度/字符/sys: 保留规则与
    `migration-diagnostic.ts:44-49` version/数组门在位；`character.ts:337`/
    `project-loader.ts:286` 真实消费命中。`magic-menu-state.ts` `magicConfirmSpell` **原地改**
    `s.targetIdx/s.phase`——工作包「原地改菜单 state 是合同（E4）」属实，测试不得假定不可变。
  - **覆盖数字独立复算**：当前官方 fast 汇总实测——magic-menu-state 行 65/81·分支 65/97、
    entity-action-player 150/175·136/183 与工作包逐格一致；低覆盖是导航指标非 bug 数
    （卡面声明正确）。
  - **去重锚点核实**：world-variable.test.ts、migration-diagnostic.test.ts、
    runtime-script-project.test.ts、frame-animation-player.test.ts 等在册（本人抽查）；
    工作包登记的既有断言与拟补轴不重叠。
  - **白名单核验**：11 新测试路径抽查均不存在（本人实测）。
  - **设计同意**：六组 39 族映射真实现行调用域；合法 fixture 经当前 guard、输入快照就是
    实际传入的同一对象；异步进入/结束均有 entered/deferred 见证不用 sleep；≥12 条判据
    自测的单点业务负控；同树同官方 testSelection 覆盖对照只出 /tmp；frame 在途 invalidate
    政策未定不默认绿固化（D4）、诊断不承诺 exactKeys（A7）、局部 V1/legacy-script 标签为
    当前合法数据不按词删除、不给无 caller 旧入口保活；无视觉/听感/完整 E2E 声明。
  - **可证伪观察**（任一反例即收窄或 counter）：① 某族已被同合同断言覆盖 → 登记已有；
    ② 拟造输入不在当前 API 支持域 → 撤回该项；③ 负控仅 load 标记/混合宿主故障 → 无效
    重造；④ 快照对象与实际传入对象不一致 → 重造；⑤ 把 magicConfirmSpell 原地改写当成
    返回新态来测 → 测试模型错；⑥ 产品/旧测试/基线任何 diff → 越界即停。
  - 返工项：无。非阻断备注：frame 在途 invalidate、RewardGain 微任务跨序列政策如遇合同
    未定按工作包纪律隔离登记；本席终审时逐族核 39 族账的 caller 锚点与状态分类。
- GLM：**premise verified / design agree（2026-09-19，r1，冻结 e58834f6；以下锚点本人直读/复跑，未读 Kimi 席位）**。
  - **11 模块与 caller 直读**：content world-variable.ts（character.ts:337 initialWorldVariablesV1、
    project-loader.ts:285 validateWorldVariableRegistryV1）与 migration-diagnostic.ts（loader:281-285、
    migrate/pal-current-publication.ts:351）；reforge 九模块——runtime-script-compiler（editor
    playback.ts:423/437、runtime-script-project.ts:332/394/420）、runtime-project-view（main.ts:364/477/719）、
    entity-action-player（main.ts:522）、frame-animation-player（main.ts:794/2768、FrameAnimationEditor.tsx:185）、
    magic/system-menu-state（main.ts:6552-6554/6762、:6709/6723/6731）、scene-entry-session（main.ts:793/1677/2925）、
    screen-hold-transaction（main.ts:1257/1642/1655）、reward-gain-queue（main.ts:5416/5448/6503）——
    本人逐行直读全部命中，均为现行真实消费。
  - **覆盖数字独立复算**：用 import 官方 coveragePackages/testSelection 的临时 config（/tmp 输出）
    两包各跑一次：11 模块行/分支与工作包表**逐格一致**（world-variable 47/51·35/44、entity-action
    150/175·136/183、magic 65/81·65/97 等），合计行 576/657、分支 475/639 一致。
  - **旧测试去重锚点直读**：world-variable.test.ts:9/40/58、migration-diagnostic.test.ts:24/29、
    runtime-script-project.test.ts:105/150/263、entity-action-player.test.ts:41/231、
    frame-animation-player.test.ts:59/181、magic:56/152、system:12/78、scene-entry:11/56、
    screen-hold:5/37、reward-gain-queue:9/72——工作包"已有"登记属实。
  - **白名单核验**：11 新测试路径 + 两包各一 fixture 当前均不存在。
  - **design agree**：39 族范围/白名单/纪律可执行且已吸收前两包 counter 教训（实际输入同对象快照、
    真实交错、精确输出、负控判据自测+钉名执行见证）；关键合同注意点与工作包一致——
    magicConfirmSpell 原地改菜单 state 是合同（E4）、frame 进行中 invalidate 政策未定不默认绿固化（D4）、
    诊断不承诺 exactKeys（A7）、局部 V1/legacy-script 标签是当前合法数据非兼容残留。
  - **可证伪观察**：①某族已被同合同断言覆盖→登记已有；②拟造输入不在当前 API 支持域→撤回；
    ③负控仅 load 标记/混合宿主故障→无效；④快照对象与实际传入对象不一致→重造；
    ⑤产品/旧测试/基线任何 diff→越界即停。
  - 返工项：无。三席同 r1 齐且无 counter 后按卡核定 build allowed 再实施。
- build准入：**三席同r1已齐、无counter，Codex于2026-09-19核定满足build条件**（Codex原签、GLM 7753f137、Kimi 09d1fd5b；生产相对e58834f6零漂移）。按原交接由Coding Owner GLM同步将本卡/看板/索引切到build，再在独立worktree连续实施六组；无需再签一次。另一张试放卡的UI待决不阻止本卡。

### done前

- GLM：**r1 第三轮返工实施者自验 accept（2026-09-19；仅收窄 counter 8ca74aac 三残项，前轮已闭环项不重开）**。
  - 残项1（F1）：`source:'held' as never` 断言**实际删除**，F1 标题/注释同步为 ms/kind 失配轴；
    回执"虚构 source 轴移除"声明与提交树一致。
  - 残项2（D6）：结局改为**独立同步观察变量**（回调更新 outcome，断言只读观察值），entered 后
    abort + tick 排空即同步断言 AbortError——不 await 可能永不 settle 的 outcome；frame 用例
    finally 放行 inflate 并核迟到零提交；sequence 用例 finally 消费收口 Promise；不再靠超时变红
    （D 组逐文件 8→9 项同步）。
  - 残项3（E4）：每个确认分支（toTarget/castAll/MP 不足/恰好足够）**调用前**取实际 world 深快照、
    调用后立即比较——castAll 全体直放分支亦覆盖；删除未用 `_wBefore` 与自比较；菜单 state 原地
    可变合同保持。
  - 复验：最新 7 针见证全部 **detected**（候选自身 AssertionError 业务红，0 invalid/0 MISSED）
    + 7 对照绿 + fixture 四检查 accepted；原 22 跑 rc=0；定向 content 10 + reforge 46 = 56/56；
    reforge 全包 125/1235、content 全包 57/685 exit0；两包 tc rc=0；16 文件 Biome rc=0；
    覆盖四跑复算数字不变（局部 content +12 行/+18 臂、reforge +36 行/+53 臂）。
  - 未做（按卡）：全仓 check/ratchet/strict-fast 留 Codex；frame 在途 invalidate 仍待证；
    不代签、不标 done。
- Codex：**收窄counter（2026-09-19，候选6d34ad5a）**。F1/E4真实闭环，原7针均为候选业务AssertionError、55定向/685+1235全测/两包tc/16文件Biome/原22跑通过。
  唯一剩D6 sequence：:238永不resolve gate，:252–255 finally仅改局部布尔，:265独立Promise与原链无关，:260另一个reader冒称同实例。新增同合同第8针sequence-late-frame-after-abort，8对照绿、7 detected/1 MISSED；候选9项漏掉取消后的迟到提交。任务卡自验56应为实测55，F1账旧ms/source标题需同步。
  详见[本轮定点证据](../../testing/runtime-state-review.md)。未修改/集成GLM测试，不转Kimi；官方全仓门待接收后，设计不重签。
- Codex前轮记录（历史）：**收窄counter（2026-09-19，返工候选3c7ae963）**。55定向、685/1235全包、两包tc、16文件Biome与原22跑通过；四fixture守卫全accepted，after/合法有声正控/换字节/LRU/一般world修改见证已闭环，不重开。
  仅剩R1-F1虚构held-source仍在:32（回执称已移除不符）；R2-D6 await outcome导致坏实现下候选超时，非业务断言红；R3-E4 unused预快照/自比较只保护末尾单体，allAllies误改world仍漏检。
  本席旧见证工具把候选failed都判detected，漏了Vitest的STACK_TRACE_ERROR，责任已勘误并补每条候选错误类型自测；最新7针为5 detected/1 invalid-candidate-failure/1 MISSED、7对照绿。
  详见[本轮证据及三项定点返工](../../testing/runtime-state-review.md)。不改GLM测试、不合入正式测试、不更官方基线，不转Kimi；设计r1不重签。
- Codex前轮记录（历史）：**counter（2026-09-19，候选23eb63d2；独立接收）**。范围/冻结核验通过，53定向、685/1233全包、两包tc、原22负控均复跑绿；但不满足验收。
  R1：实际legalScene/Items被当前正式guard拒绝，F1 held-source越出合法union；R2：frame读取取消/失效换字节/LRU的关键时序或正控未实际建立；
  R3：after完整输出、历史cue非空正控、菜单world保真等断言失效；R4：Biome实测4errors/9warnings及逐文件计数/覆盖小计与回执不符。
  本人六针隔离坏实现均被独立oracle业务红抓住，但对应候选新测试全部仍绿（MISSED）；合法原实现六对照全绿。
  详见[完整counter/复现/返工要求](../../testing/runtime-state-review.md)与[可重建见证](../../testing/runtime-state-review-witnesses.mjs)。
  未改GLM测试语义，未集成正式测试/更新官方基线，未跑接收后的全仓门，不转Kimi。r1测试目的不变，B5候选合法性按当前guard收窄，不需重签设计。
- Kimi：pending（接收后独立终审）。
- done准入：未开放，不代签、不标done。

## 交接日志
- 2026-09-19 Codex：独立复核6d34ad5a；F1/E4与frame同步取消闭环，sequence实际收尾仍未修。原7针全检出属实，但不代表D6完整；第8针证明迟到提交漏检。仅此定点返工+回执勘误，保持rework；同次TB01独立裁决，本轮不释放实施槽。GLM自验原文保留，不代改他席。
- 2026-09-19 GLM（r1 第三轮返工完成）：rebase 收窄 counter 8ca74aac，只修三残项——held source
  实删、D6 同步结局观察 + finally 释放、E4 各分支调用前快照。7 针全 detected（自身业务红）+
  7 对照绿 + 22 跑全绿 + 双包全测/tc/Biome/覆盖复算。第三轮自验 accept 已签；等 Codex 重新接收。
- 2026-09-19 Codex：重新接收3c7ae963，确认四fixture合法与五类原坏实现已被候选业务断言检出；55/双包全测/tc/Biome/原22跑通过。
  原工具六针detected可复现但D6候选红因是5000ms超时；修正本席工具的判据缺口，新增同一E4合同的castAll定点见证。收窄为F1虚构source未删、D6同步观察不挂起、E4各分支真实快照三项。状态仍rework，不合入测试，不重开已闭环项，不代签/不标done。
- 2026-09-19 GLM（r1 返工完成）：rebase counter e22041a0（模拟器设计/看板保留），R1～R4
  全部修复；六见证 MISSED→detected（候选自身断言红）、原 22 跑全绿、双包全测/tc/Biome/覆盖
  四跑复算完成。返工实施者自验 accept 已签；任务保持 rework，等 Codex 重新接收。
- 2026-09-19 Codex：独立接收23eb63d2，完整读11新测试/2fixture及工具，实跑53定向、两包全测/tc、原22负控与私有覆盖四跑。
  六个独立业务oracle证明对应坏实现都逃过候选断言；正式guard拒绝两个主fixture、Biome/回执也不符，签counter并转rework。
  仅保留GLM原交付文档作证据，不合入测试；主线模拟器设计和GLM后续规划保留，旧r1设计不重签。返工交GLM，不转Kimi、不标done。
- 2026-09-19 GLM（build 完成）：A→F 六组连续实施完毕（53 项、每组独立提交）；16 针负控 +
  判据自测 22/22；覆盖对照 11 模块两包四跑（/tmp）。实施者自验 accept 已签；任务保持 build，
  等 Codex 独立接收（39 族账见工作包回执）。
- 2026-09-19 GLM（build 开工）：按 Codex d350f4fb 核定同步本卡/看板/索引到 build；在
  codex/glm-runtime-state-boundaries-r1 独立 worktree 连续实施六组（TB-01～03 规划文档已在
  95b6ff6e 另行提交，不混入本卡实施）。
- 2026-09-19 Codex：用户告知“签了”后同步并核对三席均钉r1/e58834f6、各有直接证据与可证伪观察、无counter；当前607b2aa3相对冻结的packages/与scripts/coverage/零diff，build条件已满足。
  GLM正在共享树准备TB-01～03，相关未提交卡/工作包/看板/索引保留、不混入本次核准提交。沿用原委托由GLM更新本卡实施状态与共享索引，进入独立worktree；本卡不扩39族，不为新队列重复签字，未实施、未宣称测试完成。
- 2026-09-19 Kimi：完成 r1 独立设计审查，签 premise verified + design agree，无返工项。
  直读 world-variable/migration-diagnostic 守卫与 character/loader 消费、magicConfirmSpell
  原地改 state 合同（E4）；独立复算覆盖数字与工作包逐格一致；去重锚点在位；白名单路径
  未占用。六条可证伪观察写入本席；frame invalidate/RewardGain 政策按纪律隔离登记。
  未改产品/他席/状态，未读 GLM 结论。Next：三签齐后 GLM 核定 build allowed 并连续六组。
- 2026-09-19 GLM：完成 r1 设计审查，签 premise verified + design agree，无返工项。11 模块 caller
  逐行直读、覆盖数字临时 config 独立复算逐格一致、旧测试去重锚点核实、11+2 白名单路径未占用。
  未读 Kimi 结论；设计未齐不写任何测试。Next：三席齐且无 counter 后本人核定 build allowed，
  在独立 worktree 连续六组。

- 2026-09-19 Codex：按用户要求准备六组11模块39族大包；内部只读盘点后本人重新读源码/旧测试并复算，内部分工不作外部席位签字。
  当前只开draft/写工作包，未写正式测试、未改生产或覆盖率；GLM与Kimi先并行审设计，同步给出提示词。

## 下一位Agent提示词

### 当前：GLM仅返工D6 sequence及回执

```text
在 /Users/zhangxu/illegal/type-pal 定点返工 TEST-RUNTIME-STATE-BOUNDARIES-1，任务卡 docs/ops/tasks/TEST-RUNTIME-STATE-BOUNDARIES-1-state-and-metadata.md，rework/r1，候选6d34ad5a，生产冻结e58834f6，设计不重签。
先同步本次Codex counter及更新的runtime-state-review-witnesses.mjs，保留他席与主线七批设计；读AGENTS/CLAUDE/READ-FIRST、docs/testing/runtime-state-review.md顶部。
F1/E4和原7针已闭环不重开。只修D6 sequence：原gate可释放、readBytes真实entered、原onFrame可观察，abort后同步断言，finally释放同一底层并消费实际原Promise，再证明零迟到帧；不能用releasedSlow布尔/独立slowSettledPromise或另一个reader冒充收尾。同reader标题需真实重用。任务卡56改实际55，F1账同步ms/kind。
重跑最新工具须8对照绿、8针候选自身AssertionError detected，尤其sequence-late-frame-after-abort；原22跑/定向/双包全测/tc/16文件Biome。只改原白名单，不改产品/旧测试/原探针/官方基线/他席工具语义，不代签、不标done、不转Kimi。交Codex独立接收；全仓质量门留接收后执行。
```

### 历史：GLM三项残项返工（本轮仅剩D6）

```text
在 /Users/zhangxu/illegal/type-pal 定点返工 TEST-RUNTIME-STATE-BOUNDARIES-1 r1，任务卡 docs/ops/tasks/TEST-RUNTIME-STATE-BOUNDARIES-1-state-and-metadata.md 仍rework；本轮候选3c7ae963，生产冻结e58834f6，设计不重签。
先同步最新main的收窄counter和更新后的docs/testing/runtime-state-review-witnesses.mjs到你的独立分支，保留原文及前三批r2/模拟器设计；读AGENTS/CLAUDE/READ-FIRST、本卡与docs/testing/runtime-state-review.md顶部本轮结论。
已闭环的fixture、after、非空cue、换字节/LRU、格式与主要计数不重开。只修三项：①scene-entry-session.boundaries.test.ts:32的held as never仍在，实际移除或按当前合同明确分类，回执不得再与树不符；②D6不能await可能永不settle的outcome而把释放写在后面，应观察独立结局变量并同步断言，finally释放/消费，负控必须AssertionError而非5000ms超时/STACK_TRACE_ERROR；③E4删unused预快照和自比较，分别在各确认分支调用前拍实际world快照，尤其castAll，保持菜单state可变合同。
最新见证工具已修Codex自身判据漏洞，并新增同一E4合同的castAll针；重跑应7对照绿、7针都由候选自身业务断言detected，0 invalid/0 MISSED。原22跑、定向/相邻/两包全测/tc/16文件Biome与最终树回执需一致；未补的细轴如实引用已有/分类，不继续写标题式闭环。
只改原白名单，不改产品/旧测试/官方基线/他席见证语义，不代签、不标done、不转Kimi。交Codex重新接收后再跑全仓check/ratchet/受保护strict-fast。
```

### 历史交接 · GLM首轮R1–R4返工

```text
在 /Users/zhangxu/illegal/type-pal 返工 TEST-RUNTIME-STATE-BOUNDARIES-1 r1，任务卡 docs/ops/tasks/TEST-RUNTIME-STATE-BOUNDARIES-1-state-and-metadata.md 已rework；本轮候选23eb63d2，生产冻结e58834f6，设计不重签。
先同步main与本次Codex counter到codex/glm-runtime-state-boundaries-r1独立worktree，保留counter原文和主线模拟器设计/看板；读AGENTS/CLAUDE/READ-FIRST、任务卡、docs/testing/runtime-state-review.md及原工作包/机器账。
R1：实际场景/物品fixture先过当前guard，onTeleport非initial entry和外部runScript混用私有脚本都非法；held as never不是合法dither source，按真实可达域收窄/分类，不改产品配合fixture。
R2：重建帧sequence/frame/wait entered-deferred取消、双asset+同id真实换字节、确有命中/淘汰的LRU及监听清理。R3：after/payload精确输出、嵌套产物别名、非空历史cue正控、真正world深快照等断言补强，不再用恒真或只比长度。R4：16文件Biome实测4errors/9warnings；逐文件应6/4/4/5而非5/5/3/6；九模块覆盖小计应497→533/564、392→444/533。按最终树改正39族账/回执与失败记录。
重跑 node docs/testing/runtime-state-review-witnesses.mjs <候选物理绝对路径>：六对照须绿、六针须由你新增断言变红而detected，不能只有Codex oracle红。原22跑、定向/相邻/两包全测/tc/Biome及私有同口径覆盖重算后交Codex独立接收。只改卡面白名单，不动生产/旧测试/官方基线/原探针，不删除他席见证、不代签、不标done、不转Kimi。GLM测试贡献须终审披露；全仓check/ratchet/strict-fast留Codex。
```

### 历史交接 · Codex接收r1整包（本轮已counter）

```text
在 /Users/zhangxu/illegal/type-pal 接收 TEST-RUNTIME-STATE-BOUNDARIES-1 r1 整包。任务卡 docs/ops/tasks/TEST-RUNTIME-STATE-BOUNDARIES-1-state-and-metadata.md；回执与 39 族账 docs/testing/glm-runtime-state-boundaries.md；机器账 docs/testing/glm-runtime-state-evidence.json。候选分支 codex/glm-runtime-state-boundaries-r1（worktree /Users/zhangxu/illegal/type-pal-glm-runtime-state），基点 1c8cad29；生产冻结 e58834f6389a40ffe9f187e6a8051f552e964d79。
GLM 已交付六组 11 新测试文件 53 项（content 2 + reforge 9）、16 针负控+判据自测（6 对照+16 针 22/22，钉名 JSON 执行见证）、两包官方 testSelection 覆盖对照（11 模块 content +12 行/+18 臂、reforge +36 行/+52 臂，/tmp 输出）与实施者自验 accept。无新产品缺陷；frame 在途 invalidate 回填政策记待证。注意：你的技能试放卡若已改 main，与本包 reforge 目标面重叠时先核白名单零冲突。
你负责独立接收/集成：核对白名单与计数、抽读合同断言与 fixture 合法性（先过现行守卫；magicConfirmSpell 原地改 state 是合同、castOutdoorSkill 未被调用）、复跑两包定向/全包、tc/Biome；复跑 node docs/testing/glm-runtime-state-mutants.mjs 验 22/22；按需重跑覆盖对照（config 绝对路径可复制）。然后统一串行执行全仓 check、官方 ratchet 与受保护 strict-fast（GLM 未跑）；全部通过后在本席签 accept、更新看板并给 Kimi 终审提示词。发现问题先 counter 并写明复现，不直接改 GLM 测试语义；不得代签他人或标 done。
```

### 历史：Codex重新接收前轮r1返工

```text
在 /Users/zhangxu/illegal/type-pal 重新接收 TEST-RUNTIME-STATE-BOUNDARIES-1 r1 返工。任务卡 docs/ops/tasks/TEST-RUNTIME-STATE-BOUNDARIES-1-state-and-metadata.md（rework）；回执与 39 族账 docs/testing/glm-runtime-state-boundaries.md；机器账 docs/testing/glm-runtime-state-evidence.json（16 文件 Biome 干净）。候选分支 codex/glm-runtime-state-boundaries-r1（worktree /Users/zhangxu/illegal/type-pal-glm-runtime-state），在你的 counter e22041a0 之上 rebase 后追加返工提交（远端 tip 9d33dbe8）；生产冻结 e58834f6；设计不重签；模拟器设计/看板行原样保留。
GLM 已按 R1～R4 返工：R1 fixture 合法化（onTeleport entry 收窄、items 拆 ext/priv/bare + 合法 throw 效果、守卫自证接入 B4/B7、dither source 虚构轴移除）；R2 D6 真实进入见证（entered + 同步结局观察器，底层未放行即外层 AbortError）、D4 双 asset + 同 id 真实换字节、D5 解码计数见证 LRU 命中/淘汰；R3 compiler after 逐组合精确、嵌套别名试验、once-sound 非空 cue 正控 + 越尾零重播、E4 实际 world 深快照复验、castAll 完整对象；R4 Biome rc=0（逐文件）、逐文件计数 55 从 Vitest JSON 重生、覆盖小计更正（reforge 九目标 L497→533/564、B392→444/533）。复跑 node docs/testing/runtime-state-review-witnesses.mjs <候选物理绝对路径>：六对照绿、六针全 detected 且 candidateFailures 为返工断言自身、fixture 四检查 accepted；原 22 跑 rc=0；定向 55/55、reforge 125/1235、content 57/685、两包 tc rc=0。
请独立重新接收：复跑六见证与 22 跑、抽查 R1～R4 修复点真实性（fixture 守卫自证、取消时序的同步结局观察器、换字节/LRU 解码计数、E4 world 深快照）、复跑定向/双包全测/tc/Biome。通过后统一串行执行全仓 check、官方 ratchet、受保护 strict-fast（GLM 未跑），在本席签 accept、更新看板并给 Kimi 终审提示词。仍有问题则 counter 并写明复现；已闭环项不重开；不代签、不标 done。
```

### 历史交接 · GLM直接进入六组实施

```text
在 /Users/zhangxu/illegal/type-pal 推进 TEST-RUNTIME-STATE-BOUNDARIES-1，任务卡 docs/ops/tasks/TEST-RUNTIME-STATE-BOUNDARIES-1-state-and-metadata.md，r1；顶部draft待你同步切build，三席设计已齐且Codex已核定准入，不重签。
先同步main、检查工作树，读AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本卡最新Codex日志与docs/testing/glm-runtime-state-boundaries.md。核生产冻结e58834f6与白名单，保留正在准备的TB-01～03文档，不把未签新批次带入实施。
按原委托同步本卡/看板/索引到build，在codex/glm-runtime-state-boundaries-r1独立worktree连续完成六组11模块39族；只改工作包的新测试、薄fixture、诊断和本人回执，不在主worktree切分支。至少12个有效单点业务负控；合法fixture、实际输入深快照、entered/deferred、同口径/tmp覆盖及定向/相邻/两包全测/typecheck/Biome按工作包执行。
产品/旧测试/官方基线/全局配置/原探针/资产零改，不碰main/boot/技能试放，无视觉/听音。未知合同和真实缺陷隔离登记，不能固化错误绿测。交付实际提交树证据后回Codex独立接收；全仓check/官方ratchet/strict-fast留Codex，不代签、不标done、不直接转Kimi终审。GLM测试贡献须披露。
```

### 历史设计交接（已完成，不重复执行）

### GLM · 两卡独立设计审查，准入后连续六组

```text
在 /Users/zhangxu/illegal/type-pal 接新双线任务，生产冻结e58834f6：docs/ops/tasks/TEST-RUNTIME-STATE-BOUNDARIES-1-state-and-metadata.md与你只审的docs/ops/tasks/EDITOR-SKILL-TRIAL-1-isolated-battle.md，均r1/draft。先同步并检查工作树，读AGENTS/CLAUDE/READ-FIRST、两卡及docs/testing/glm-runtime-state-boundaries.md。独立核11模块真实caller、旧测试去重、39族合法性/负控与非视觉边界；试放卡只核隔离/矩阵，不实现Codex产品。不要读取或复述Kimi结论。
先分别在两卡本人席位写带一手锚点/可证伪观察的premise verified与design agree，或counter；更新本人日志、同步保留他席后提交推送，不改他席/任务状态。补测卡三席同r1齐无counter后由你核定build allowed，在codex/glm-runtime-state-boundaries-r1独立worktree连续完成六组，不逐组请示；另一卡未开门不阻止本卡。
严格按工作包11新测试+两薄fixture+本人诊断/回执白名单。至少12有效单点负控、39族真实账；定向/相邻/两包全测/tc/新增文件Biome与同口径/tmp覆盖。产品/旧测试/官方基线/原探针/配置依赖/资产零改，不碰main/boot/SkillTab/试放接线；不做截图/浏览器/听感，不测试castOutdoorSkill或战斗公式，不复活旧分片入口。未知合同/新缺陷隔离报告，不能反向写绿。全仓check/ratchet/strict-fast留Codex。交付提交推送后回Codex独立接收；披露测试贡献，不代签、不标done、不直接转Kimi终审。
```

### Kimi · 与GLM并行审两卡

```text
在 /Users/zhangxu/illegal/type-pal 独立设计审查两张r1/draft卡，冻结e58834f6：docs/ops/tasks/TEST-RUNTIME-STATE-BOUNDARIES-1-state-and-metadata.md；docs/ops/tasks/EDITOR-SKILL-TRIAL-1-isolated-battle.md。先读AGENTS/CLAUDE/READ-FIRST、两卡/上下文和docs/testing/glm-runtime-state-boundaries.md，直接读源码/真实caller，不读取或复述GLM结论。
补测卡核六组11模块39族的去重/合法fixture/异步与实际输入鉴别力，排除试放/save/战斗公式和无caller旧接口。试放卡核用户已定的独立临时隔离、所有存读档入口零IO、真实BattleSession而非缺队桩胜、早分流/取消生命周期与最小共享准备抽取，不扩成重写main或Q2。可复跑node --import tsx docs/testing/skill-trial-premise.mjs，只读/内存前提探针，不是产品修复或浏览器E2E。
分别在两卡本人席位签带一手证据/可证伪观察的premise verified与design agree，或counter，写本人日志并提交推送。两卡独立裁决，UI选择未决时不得假称build开放；不改产品/测试/他席/状态，不代签、不标build/done。同步并保留另一席改动；无需让用户搬运审查意见。
```
