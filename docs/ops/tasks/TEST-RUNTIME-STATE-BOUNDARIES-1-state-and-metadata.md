# TEST-RUNTIME-STATE-BOUNDARIES-1 - 运行时状态与作者元数据六组补测

Status: draft
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

- GLM：pending（实施者自验）。
- Codex：pending（独立接收/官方质量门）。
- Kimi：pending（接收后独立终审）。
- done准入：未开放，不代签、不标done。

## 交接日志
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

### 当前交接 · GLM直接进入六组实施

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
