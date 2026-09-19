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
- Kimi：pending（独立读一手证据，不读/复述GLM判断）。
- GLM：pending（作为Coding Owner独立核前提/设计，不读/复述Kimi判断）。
- build准入：未开放，三席同r1齐且无counter后GLM核定build allowed；整包签一次，不逐组再签。另一张试放卡的准入独立。

### done前

- GLM：pending（实施者自验）。
- Codex：pending（独立接收/官方质量门）。
- Kimi：pending（接收后独立终审）。
- done准入：未开放，不代签、不标done。

## 交接日志

- 2026-09-19 Codex：按用户要求准备六组11模块39族大包；内部只读盘点后本人重新读源码/旧测试并复算，内部分工不作外部席位签字。
  当前只开draft/写工作包，未写正式测试、未改生产或覆盖率；GLM与Kimi先并行审设计，同步给出提示词。

## 下一位Agent提示词

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
