# TEST-REFORGE-RUNTIME-CONTRACTS-1 - 运行时基础功能五组非视觉补测

Status: draft
Phase: phase2
Capability: 已有运行时合同与测试覆盖率（不改变能力地图）
Coding Owner: GLM（仅新测试与薄fixture）
Integration Owner: Codex
Reviewer: Codex / Kimi
Visual Verification Owner: N/A
Visual Verification Timing: N/A
Unavailable Agents: none
Branch: codex/glm-reforge-runtime-contracts-r1

Revision: r1，2026-09-18。生产冻结`3bc20273fe88e83da2dcb32f04ea132a0ada60d9`。
用户要求“再给GLM一大块工作，Codex也并行推进”；整包五组十模块，一次设计签字，签齐后连续完成，不逐组请示。
工作包/唯一测试路径/30族账见[GLM运行时补测工作包](../../testing/glm-reforge-runtime-contracts.md)。
Codex并行[场景引用保护修复](EDITOR-SCENE-REF-GUARD-1-scene-deletion-reference-closure.md)，只动editor；本包reforge生产冻结。

## 目标与边界

补真实当前调用域的键盘/菜单纯状态、音乐调度、工程读取、非视觉脚本效果派发回归，尤其异步乱序、输入保真、失败传播。
只新增10个指定测试文件与薄fixture/诊断/回执；不改生产、旧测试、全局配置、依赖、官方基线或原审计探针。
不以固定新增条数为目标；已有有效断言登记复用，发现产品缺陷另报，不反向固化、不test.fails/skip冒称完成。

## 前提真值门

一句话前提：现有主壳/编辑器确实消费这十个模块，当前包覆盖及已读测试仍有真实入口/参数/异步边界缺口，适合独立补测。

| 维度 | 一手事实与目标 |
|---|---|
| 原版 / primary source | 不新增原版公式/演出规则。当前TypeScript公开合同和真实caller为直接真源；A/B交互知识来自第一阶段既有输入/库存菜单，不重裁布局 |
| 第一阶段 | packages/game/src/shell/input.ts:70-86的非repeat后按优先；core/menu/inventory-menu.ts:157-194三列导航clamp。仅作交互知识，不复制旧抽象/角色下标；音频/等待教训见harvest X2/X4/X7/X8，历史“现状”不当当前代码事实 |
| 当前二阶段 | main.ts:6342/6405/6443输入、:6615/6638菜单、:5557归并、:387音乐、:470场景批读、:601视频URL、:2817演出控制器、:3908当前leaf效果adapter。editor/open-local.ts:73-74读场景/stamps，MusicTab.tsx:67与ProjectAudioPreviewButton.tsx:32消费MIDI transport |
| 本卡目标 | before→after仅新增可证伪回归与真实覆盖账，用户行为/格式/版本不变；仅证明单元/接口合同，不冒称音频听感、像素、主壳完整时序或E2E通过 |

十模块逐个生产caller、旧测试去重和可补轴已列工作包。当前fast6932项/617生产文件；reforge1130项/124生产文件，
行7853/14118、分支5256/11041。低覆盖是导航指标，不等于bug数或全仓从未执行。
最强替代解释：跨包已测、没有现行caller、旧helper/退役叶、前置条件无合法构造、期望与现行职责边界不符。
反证成立则记已有/无caller/防御/合同待证，不凑测试；未知业务合同由Codex核，其他独立组可继续。

## 上下文锚点

[READ-FIRST](../../phase2/READ-FIRST.md)、[harvest](../../phase2/reference/phase1-knowledge-harvest.md)相关输入/菜单/元层经验；
[当前覆盖率](../../testing/coverage.md)、[上批counter与接收教训](../../testing/content-contracts-review.md)、
[B批待证U-02](../audits/pre-e2e/summary.md#待证项与撤回项)、[C战斗审计](../audits/pre-e2e/battle.md)、
[D编辑器审计](../audits/pre-e2e/editor-workflows.md)、[E工程审计](../audits/pre-e2e/engineering.md)。
不把脚本效果adapter当canonical执行器；不测试退役vanishEntity、旧ScriptChunkStore/MemoryScriptResolver；不动save/战斗/移动碰撞。
视觉相关任务只能Codex，本卡不给GLM浏览器操作/截图/听感验收；音频只走已有可注入适配器的参数/状态协议。

## 执行与接收合同

1. 先读两卡并签本人设计；本卡三席同r1 premise/design齐且无counter后，GLM作为Coding Owner核定build allowed再实施。
   设计未齐不提前在/tmp写正式测试绕门禁。独立worktree建议/Users/zhangxu/illegal/type-pal-glm-reforge-runtime，现有目录先核不覆盖。
2. 五组连续做完，逐组commit；中途发现一组合同未知先隔离，继续其它已核组，最终统一交接。不得修改Codex另一卡实现/测试。
3. 每族先去重，记录实际caller/旧测试全名、合法前提、单轴反例、完整业务结果、输入深快照。实际传入对象必须就是快照对象。
   JSON/字节两层不互替；加载fixture经当前loader/validator，坏值只坏目标轴，正控必须是同基线。
4. 异步用entered/deferred与明确完成信号；不用固定sleep/无视AbortSignal的host造假反例，不假定函数不负责的上层取消策略。
   假计时器/全局对象在finally/afterEach恢复；捕获预期拒绝，不留下unhandled错误。
5. 每组至少2条有效单点负控，整包至少10条：唯一替换、同输入正常绿、钉名新增测试实际AssertionError业务红。
   Vitest JSON执行见证，非仅module-load标记；混合TypeError/超时/未处理异常判据自测必须拒绝。产品hash前后不变。
6. 明确区分“已有/新增/重叠保护/合法输入不可达/待证/已证缺陷”；30族全填但不要求每族新增。不给无caller接口做绿色保活测试。
7. 定向+相邻+reforge typecheck+全部新文件含JSON的Biome；临时覆盖配置直接import官方coveragePackages/testSelection/coverageExcludes，
   同生产树before只排本包10新文件，after只加它们，局部十模块与全reforge并集分栏。输出专属/tmp，不写coverage/fast或baseline。
   仓库固定Vitest/V8 4.1.7，不使用旧coverage.all、不改排除/阈值、不插桩fixture。
8. 最终数字/标题/文件/hash从实际提交树生成；回执列失败尝试，不用重试多数绿或先前日志代替本树证据。
   GLM不跑全仓check/官方ratchet/strict-fast；由Codex接收后串行统一跑。贡献披露，GLM实现者自验不作为独立终审。
9. 发现缺陷不改产品：在本人回执登记最小合法反例/正控/影响/根因候选/修复归属，诊断不进默认红测试；由Codex裁定后续。
   签字/状态/范围扩张按协议，不擅自开启Q2/N6b、删除旧工具或改UI。

## 推进签字

### build前（r1）

- Codex：**premise verified / design agree（2026-09-18，冻结3bc20273）**。主Agent独立读十模块目标API、真实main/editor调用、
  对应旧测试及第一阶段输入/菜单知识；重算十模块行/分支与reforge1130/124快照。输入无直接测试，菜单多行/记忆、
  音频拒绝后续请求、loader当前lazy author/runtime、resolver text/URL错误包装、有限leaf参数/await合同可独立补强。
  已剔除无现行caller的旧chunk store与map批读helper，排除战斗/save/移动/退役叶；不把assets.ts误当AssetResolver所在模块。
  本席复跑9个对应既有测试文件68/68及reforge typecheck均exit0（不含新测试）；十个拟新增路径均未占用，30族ID唯一。
  最强反证见上，方案测试-only且隔离editor修复；五组一次准入，不承诺测试条数或100%。
- Kimi：**premise verified / design agree（2026-09-18，r1，生产冻结 3bc20273；全部锚点本人直读，未读 GLM 结论）**。
  - **十模块真实调用域直读**：`input.ts` lastDownOf 最后首次按下优先/consumePressed 边沿消费
    （语义直读）；bgm.ts:111/263、midi-preview.ts:182 导出在位；editor 消费点
    MusicPicker.tsx:53/ProjectAudioPreviewButton.tsx:32 命中；script-host-adapter 由 main.ts:3908
    与 runtime-script-project 转交现行 leaf。卡面十二行 main.ts caller 抽查一致。
  - **覆盖快照独立复算**：当前官方 fast 汇总实测——reforge 行 7853/14118、分支 5256/11041、
    124 文件；input 1/18·0/12、script-host-adapter 32/165·29/172 与工作包逐格一致——
    缺口真实（非从未执行：editor 保存/打开回归间接执行 loader，卡面声明正确）。
  - **去重锚点核实**：menu-state.test.ts 8 项、equip/use-menu-state、bgm.test.ts、
    midi-preview.test.ts 均在位（本人实测）；工作包登记的去重轴与既有断言不重叠。
  - **无 caller 排除核实**：ScriptChunkStore/MemoryScriptResolver 仅 index.ts:264 桶导出；
    loadAllProjectMaps/loadProjectMapById（project-loader.ts:513/525）无非桶生产调用——
    不补保活正确，且不授权删除。
  - **白名单核验**：10 个拟新增测试路径当前均不存在（本人实测）；薄 fixture/诊断/回执面
    与卡面一致。
  - **设计同意**：五组范围映射真实现行调用域；合法 fixture 经当前 loader/validator、坏值
    只坏目标轴；异步用 entered/deferred 不用固定 sleep、替身尊重 AbortSignal、finally/afterEach
    恢复；每组≥2（整包≥10）有执行见证的单点业务负控，Vitest JSON 钉名 failed+AssertionError+
    拒混合宿主故障+判据毒日志自测（吸收 content-contracts R3 教训）；覆盖对照直接 import 官方
    testSelection、输出仅 /tmp、局部十模块与全包并集分栏；已知缺陷隔离不固化；非视觉边界
    明确（GLM 无浏览器/截图/听感，符合视觉分工）；旧 script 接口/战斗/save/移动碰撞明确排除。
  - **可证伪观察**（任一反例即收窄或 counter）：① 某族边界已被同合同既有断言覆盖 → 登记
    已有不加条数；② 拟造输入不在当前 API 支持域 → 撤回该项；③ 负控仅 load 标记/混合宿主
    故障 → 无效重造；④ 异步用例靠真实时序而非 deferred 控制 → 重造；⑤ 覆盖对照换源码/
    选择集或写官方目录 → 数字无效；⑥ 生产/旧测试/基线任何 diff → 越界即停；⑦ 给无 caller
    接口新增绿色保活 → 越界。
  - 返工项：无。非阻断备注：C3 MIDI 初始化失败重试政策若现行未定义按待证登记（工作包
    条款一致）；E6 未知同 signal 并发 run 政策只取证不反推合同——终审时逐族核 30 族账的
    实际 caller 锚点与状态分类。
- GLM：**premise verified / design agree（2026-09-18，r1，冻结 3bc20273；以下全部锚点本人直读，未读 Kimi 席位）**。
  - **十模块 API/入口直读**：`input.ts:7 Keyboard`（:42 lastDownOf 后按优先、:49 consumePressed）；
    `menu-state.ts:45-83 openMenu/moveCursor/confirm/back`；`equip-menu-state.ts:25-84 openEquipMenu/
    equipMoveCursor/equipConfirmItem/equipBackToList/equipApply`；`use-menu-state.ts:27-69 openUseMenu/
    useMoveCursor/useConfirm`（:41 注释钉 pick-item 网格 clamp 对齐 inventory-menu）；
    `bgm.ts:54 BgmRuntimeAdapter`+:111 createBgmPlayerWithRuntime+:263 createBgmPlayer；
    `midi-preview.ts:44 MidiPreviewRuntimeAdapter`+:182 createMidiPreviewTransport；
    `project-loader.ts:176 assembleCurrentProject`/`:324 loadCurrentProjectFrom`/`:494-508 loadAllAuthorScenes/
    loadAllScenes/loadStampTemplates`；`asset-resolver.ts:12 AssetResolver`（:41/:50/:59 readBytes/readText/urlFor）；
    `cutscene-controller.ts:17-30 clearDialog/cameraSnap/frameAnimation/video`；`script-host-adapter.ts:23
    executeScriptHostEffect`（dialog/giveItem/playSound/openShop 等分支直读）。
  - **caller 复核**：main.ts:6342/6405/6443/5557/6615/6638/6753/387/470/601/2817/3908 十二行逐行直读全命中；
    editor 侧 open-local.ts:73-74（loadAllAuthorScenes+loadStampTemplates）、MusicTab.tsx:67
    （createMidiPreviewTransport）、ProjectAudioPreviewButton.tsx:32、MusicPicker.tsx:53（createBgmPlayer）确认。
  - **覆盖快照独立复算**：本人用 import 官方 coveragePackages/testSelection 的临时 config（/tmp 输出，
    未触官方目录）重跑 reforge fast 覆盖：十模块行/分支与工作包表**逐格一致**（input 1/18·0/12、
    script-host-adapter 32/165·29/172 等），包总 7853/14118·5256/11041、124 文件一致。
  - **去重直读**：menu-state.test.ts 8 项（默认/环绕/子菜单确认返回）；equip-menu-state.test.ts:57
    clamp/空表/pick-role；use-menu-state.test.ts:67 单体连用/:107 失败关闭；bgm.test.ts:43/53/62 stop
    清账轴；midi-preview.test.ts:124 play/pause/stop/clamped seek；project-loader.test.ts:272 indexed
    path/:287 lazy fail——工作包"已有"登记属实，本包拟补轴与其不重叠。
  - **无 caller 排除复核**：ScriptChunkStore/MemoryScriptResolver 仅 script-chunk-store.ts 自声明；
    loadAllProjectMaps/loadProjectMapById 仅 index.ts 桶导出——不补保活测试正确。
  - **白名单核验**：10 新测试路径+fixture 当前均不存在；30 族 ID 与工作包 A1-F…E6 一致。
  - **design agree**：五组范围/唯一白名单/9 项接收合同可执行；负控判据（Vitest JSON 钉名 failed+
    AssertionError 业务红+拒混合 TypeError/timeout/unhandled+毒日志自测+产品 hash 不变）已吸收
    content-contracts counter 教训；fixture 须过当前 loader/guard、异步用 entered/deferred 不 sleep、
    不造上层取消政策。**非阻断提示**：E 组 host 替身只测协议合同；C3/MIDI 初始化失败重试政策若现行
    实现未定义，按待证登记勿固化——与工作包 C3 条款一致。
  - **可证伪观察**：①某族边界已被同合同断言覆盖→登记已有不加条数；②拟造输入不在当前 API 支持域
    （如给纯状态机传非法 cursor）→撤回；③负控仅 load 标记/混合宿主故障→无效；④异步用例依赖真实
    时序而非 deferred 控制→重造；⑤覆盖对照换源码/选择集或写官方目录→数字无效；⑥生产/旧测试/基线
    任何 diff→越界即停。
  - 返工项：无。三席同 r1 齐且无 counter 后按卡核定 build allowed 再实施。
- build准入：**build allowed（2026-09-18，Coding Owner 核验：Codex/Kimi/GLM 三席同 r1 设计签字齐（eba8b810 GLM、948e0328 Kimi、派发内 Codex），无 counter；生产与冻结 3bc20273 一致）。GLM 开始在 codex/glm-reforge-runtime-contracts-r1 独立 worktree 连续实施五组。**

### done前

- GLM：pending（实施者自验，不是独立第三方）。
- Codex：pending（独立接收/集成/全仓质量门）。
- Kimi：pending（接收后独立终审）。
- done准入：未开放，不代签。

## 交接日志

- 2026-09-18 Kimi：完成 r1 独立前提/设计审查，签 premise verified + design agree，无返工项。
  直读 input.ts 语义、bgm/midi-preview 导出与 editor 消费点、script-host-adapter 现行转交；
  独立复算 reforge 覆盖快照与工作包逐格一致；menu-state 8 项等去重锚点在位；无 caller 排除
  （ScriptChunkStore/MemoryScriptResolver、loadAllProjectMaps/ById）本人复核成立；白名单 10 路径
  未占用。七条可证伪观察与两条非阻断备注写入本席。未改产品/他席/状态，未读 GLM 结论。
  Next：三签齐后 GLM 核定 build 并在独立 worktree 连续五组；Codex 接收后统一官方门禁。
- 2026-09-18 GLM：完成 r1 设计审查，签 premise verified + design agree，无返工项。十模块 API/
  十二处 main.ts caller/editor 四消费点直读；覆盖快照用官方 testSelection 临时 config 独立复算
  逐格一致；旧测试去重轴与无 caller 排除复核；10+1 白名单路径未占用。未读 Kimi 结论；设计未齐
  不写任何测试。Next：三席齐且无 counter 后本人核定 build allowed，在独立 worktree 连续五组。
- 2026-09-18 Codex：用户要求大块GLM工作与本人并行。内部Codex只读分工盘点候选，主Agent独立重读API/consumer/旧测试后定为五组十模块30族。
  本卡只写draft与工作包；D-02已独立重现三漏边并40相邻绿，另卡负责，生产/正式测试/基线未改。
  已跑当前9文件68项与reforge tc；日志/tmp/type-pal-next-parallel.0bsDcW/runtime-{adjacent,typecheck}.log。

## 下一位Agent提示词

### GLM（先并行设计审查，准入后连续整包）

```text
在 /Users/zhangxu/illegal/type-pal 接手新双线任务，两卡均r1/draft，生产冻结3bc20273fe88e83da2dcb32f04ea132a0ada60d9：
1. docs/ops/tasks/TEST-REFORGE-RUNTIME-CONTRACTS-1-runtime-boundaries.md（你负责五组十模块补测）。
2. docs/ops/tasks/EDITOR-SCENE-REF-GUARD-1-scene-deletion-reference-closure.md（Codex修D-02，你只审前提/矩阵）。
先同步并检查工作树，读AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、两卡和docs/testing/glm-reforge-runtime-contracts.md。独立核真实caller、既有去重、合法fixture、异步所有权及负控；本卡68既有测试/tc绿，D-02三反例与use正控复现、40相邻绿。不要读取或复述Kimi结论。
先在两卡各自本人席位写带直接证据/可证伪观察的premise verified与design agree或counter，更新本人日志，同步保留他席后提交推送。设计未齐不得实施。补测卡三席同r1齐且无counter后由你核build allowed，在codex/glm-reforge-runtime-contracts-r1独立worktree连续完成五组30族，不逐组请示。
只改工作包十个新测试/薄fixture/本人诊断回执，产品/旧测试/原探针/官方基线零改；不碰Codex的editor修复。至少10条有执行见证的单点业务负控，定向/相邻/tc/Biome及同树/tmp覆盖双口径；全仓check/ratchet/strict-fast留Codex。无浏览器、截图、听感或视觉验收。新缺陷隔离报告，不反向写绿色合同。整包完成交Codex独立接收，披露测试贡献，不代签、不标done、不直接转Kimi终审。
```

### Kimi（与GLM并行审两卡）

```text
在 /Users/zhangxu/illegal/type-pal 独立审两张新卡r1/draft，生产冻结3bc20273fe88e83da2dcb32f04ea132a0ada60d9：
docs/ops/tasks/EDITOR-SCENE-REF-GUARD-1-scene-deletion-reference-closure.md；
docs/ops/tasks/TEST-REFORGE-RUNTIME-CONTRACTS-1-runtime-boundaries.md。
先同步检查工作树，读AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、两卡及docs/testing/glm-reforge-runtime-contracts.md，直接核源码/caller，不读取或复述GLM结论。
D-02请独立复跑两条卡内原probe，核inherit/disabled父场景边、transition条件漏接、use复合边去重、冷暖同源、删除集合豁免及现有owner定位能力；不扩大成公共locator/schema重构。补测卡核五组十模块30族的真实调用、合法输入、旧测试去重、current-only排除、异步负控鉴别力与非视觉边界；Codex只动editor，GLM不改生产，官方覆盖由Codex串行集成。
分别在两卡本人席位签premise verified（直接证据和可证伪观察）+design agree或counter，写本人日志，同步保留他席后提交推送。不得改产品/测试/他席/任务状态，不代签、不标build/done。两卡独立裁决；都无counter且三签齐后各Coding Owner自行核准入，无需重复签整包中的每一组。
```
