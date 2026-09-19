# TEST-REFORGE-RUNTIME-CONTRACTS-1 - 运行时基础功能五组非视觉补测

Status: review
Phase: phase2
Capability: 已有运行时合同与测试覆盖率（不改变能力地图）
Coding Owner: GLM（仅新测试与薄fixture）
Integration Owner: Codex
Reviewer: Codex / Kimi
Visual Verification Owner: N/A
Visual Verification Timing: N/A
Unavailable Agents: none
Branch: main（源分支codex/glm-reforge-runtime-contracts-r1）

Revision: r1，2026-09-18。生产冻结`3bc20273fe88e83da2dcb32f04ea132a0ada60d9`。
用户要求“再给GLM一大块工作，Codex也并行推进”；整包五组十模块，一次设计签字，签齐后连续完成，不逐组请示。
工作包/唯一测试路径/30族账见[GLM运行时补测工作包](../../testing/glm-reforge-runtime-contracts.md)。
当前（2026-09-19）：源3dfec190收窄返工已由Codex独立复核并集成为候选`62a18137`，见[接收回执](../../testing/reforge-runtime-contracts-review.md)。
D1实际输入保真与看板剩余counter闭环，其它已通过项不重开；60定向/1190全包、两见证工具/原15跑及补充lazy输入反控通过。
主线串行check7538、官方ratchet与受保护单次fast7049通过；Codex accept，Kimi待独立终审，不标done。r1设计不重签。
GLM为测试贡献者，其实施者自验保留本人原文，不作为独立第三方；Reforge测试/fixture/诊断与3dfec190逐字一致，官方基线由Codex单独验证。
主线场景引用保护归档、预览缓存、E-01资源测试修复保持原样；本包无生产/旧测试修改，冻结约束不变。

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

- GLM：**r1 收窄返工实施者自验 accept（2026-09-19 第二轮；仅 counter 4678650a 剩余两件，前轮
  自验已被该 counter 覆盖、见 a9e1d4f1 树）**。
  - D1 实际输入保真：project 纯数据快照补入 **actorsById**；读取边界（本人 fixture 的 readJson
    包装）捕获 loadAllScenes **实际消费**的 lazy scene 对象，交付时即快照、消费完成后比较**同一
    对象**（不再用两次独立 readJson 的 clone 互比）；runtime 改 cue 不影响实际捕获对象；runtime
    speaker 与实际 actorsById 条目对上；确定性例改实名「读取确定性」。新见证
    loader-project-input-pollution **detected**（AssertionError 业务红、无 TypeError、产品 hash
    不变），原四见证保持 detected、四对照绿。
  - 看板：rebase 保留最新主线行（guard 归档/预览缓存修复），撤回对另一张卡看板的回退；
    `pnpm check:docs` PASS（443 Markdown/2255 链接）。
  - 复验：定向 60/60、全包 116 文件/1190 项、tc rc=0、14 新文件 Biome rc=0、原 15 跑 rc=0、
    覆盖对照 +74 行/+84 语句/+73 分支（/tmp 同口径；收窄项只强化断言不加覆盖面，数字不变）。
  - 未做（按卡）：全仓 check/ratchet/strict-fast 留 Codex；bgm initP 缓存政策仍记待证；
    不代签、不标 done。
- Codex：**accept（2026-09-19，r1，源3dfec190→集成候选62a18137，对比b99ec6cf）**。
  - 独立确认D1 readJson边界捕获的value原样交给loader，消费后比较同一对象/交付时快照，project的actorsById入快照；非两次clone互比。
    角色污染针已detected，另造loadScene投影后污染实际lazy输入entry.col反控，恰新输入保真例AssertionError红、无TypeError。
  - 看板只改本人一行，候选check:docs通过，主线已收口guard/预览缓存/E-01全部保留；剩余counter解除，不重开已闭环项。
  - 定向60/60、全Reforge1190/tc/Biome14绿；原四见证均detected、新输入见证detected、原15跑通过，原见证未改判据。
  - 串行完整check7538、官方ratchet、受保护单次strict-fast7049/617通过；原106个Reforge测试identity/计数和所有生产分母/范围保留，其他六包整个基线对象不变。
    本包纯补测+74行/+84语句/+13函数/+73臂；没有产品漂移、缩范围或降门槛。GLM测试贡献已披露，不以其自验代替本席复核。
  - 旧版本兼容审查pass：未增旧版本fixture/旧入口保活或生产兼容层。无返工项；BGM initP初始化失败缓存政策另归后续核验，不在本包固化或修改。
    未跑full/E2E；Kimi独立终审待办，不代签、不标done。证据、分数及日志见接收回执。
- 以下Codex counter为历史，本轮已全部闭环。
- Codex：**counter（2026-09-19，返工候选a9e1d4f1，仅剩R2-D1/R4）**。
  - R1真读取交错/旧finally、R2完整cue与同实例IO恢复、R3实际world/真实use请求、R4 A5与计数已通过，保留有效结论，不重开设计。
  - 独立59/1189/tc/Biome14通过，原四针全部detected、原15跑通过，同树覆盖+74/+84/+13/+73复算。
  - R2-D1：project快照漏actorsById；loadAllScenes正确生成返回值后污染传入actor.name，新6项仍全绿。
    lazy作者输入仍用另一次readJson的clone作比较，未观测实际消费对象。新见证与file:line在复核报告。
  - R4：候选board把其他guard卡review回退build，check:docs exit1；主线该卡已done，返工必须保留最新主线状态。
  - 旧版本兼容审查pass：测试包未增旧版本保活/生产兼容层；产品零漂移。未改GLM测试，未合入/未跑全仓接收门，不代签/不标done/不转Kimi。
- 以下首轮Codex签字为历史。
- Codex：**counter（2026-09-19，候选75c9cfe8对比6300223a，生产冻结3bc20273）**。
  - 白名单/产品零改、56/1186/tc/14新增文件Biome及原15跑通过；覆盖双口径独立复算，保留有效事实。
  - R1：BGM C2未启动旧读；MIDI C4未覆盖旧finally清新在途请求。删除post-read gate/去finally身份门后，新增BGM3/MIDI7仍全绿。
  - R2：D1只有ID/数组引用比较，绕过loadScene对话投影后loader6项仍绿；D5没有source.urlFor失败轴，不能用缺role/asset提前拒绝替代。
  - R3：B2快照非实际open输入且在最后调用前比较，修改实际world.money后equip3项仍绿；B5的oneAlly/u-5真实确认走pick-target，手造pick-item不证明正常入口。
  - R4：按实际修复对齐30族/标题（含A5独立性过度声明）、14文件计数与候选任务index。四针均函数体执行见证+JSON全绿，不只是module-load。
  - 旧版本兼容审查：本包未增产品版本兼容层，无生产漂移；没有把未覆盖语义或bgm initP待证政策判为产品已修。
    未改GLM测试，不合入、不跑接收后的全仓门，不代签、不标done、不转Kimi。完整反例/修法/日志见接收报告。
- Kimi：**accept（2026-09-19，r1 独立终审，集成候选 `62a18137` 对比 `b99ec6cf`（GLM 源 `3dfec190`）；设计不重签；未读他席本轮结论）**。
  接手 HEAD `13aa61fc` 与 origin/main 一致、工作树干净；候选后 packages/scripts/board 零漂移。
  - **D1 实际读取对象捕获**：`project-loader.current-boundaries.test.ts:76-83` 在工程 boot 后、
    loadAllScenes 前包装 source.readJson——**原样 return 实际 value**（非 clone），交付时即
    deepSnapshot、消费完成后比较同一对象；project 纯数据快照含 manifest/sceneIndex/
    authorContent/**actorsById**（排除真正持活动状态的 source/resolver/轨迹）。
    本人复跑入仓 input-review 见证：loader-project-input-pollution **detected**（AssertionError
    非 TypeError）。
  - **五见证五对照**：复跑 `reforge-runtime-contracts-review-witnesses.mjs`——4 对照绿 +
    bgm-post-read-ownership/midi-stale-finally/loader-projection-bypassed/equip-input-pollution
    **四针 detected**；input-review 工具 1 对照绿 + 1 针 detected——共五对照绿、五针
    detected（与回执形状一致）。
  - **原 15 跑保持**：复跑 `glm-reforge-runtime-contracts-mutants.mjs`——control-A~E 五对照
    exit 0 + **十针全 exit 1 业务红**（input repeat/menu clamp/equip clamp/use clamp/BGM 去重/
    MIDI 过期/loader 批序/resolver kind/cutscene 零值/adapter 默认值）。
  - **本人实跑**：定向十文件 **60/60** 绿；reforge typecheck exit 0（抽查）。交叉核日志：
    check 七包 7,538（editor 2,518 等分栏一致）；受保护 strict TOTAL **617 文件/7,049 项**；
    基线 diff 实测 6989→7049（恰 +60）、reforge 1130→1190，仅 reforge 包级 digest 变化、
    旧 106 文件 identity 逐项不变、零移除零降阈；看板仅本卡一行变化（guard 归档/预览缓存
    未回退，docs 门 PASS）。
  - **范围/披露**：GLM 为 60 项测试贡献者（披露在案），其自验不作独立第三方证明；生产、
    旧测试、统计范围不变；本席为独立终审。BGM initP 失败重试政策保留后续音频生命周期
    核验，未固化。
  - **旧版本兼容审查：pass**——无生产兼容层/旧 fixture/旧入口保活；原审计探针零修改。
  返工项：无。本 accept 不代签、不授权 done。
- done准入：未开放，待Kimi独立终审；不代签、不标done。

## 交接日志

- 2026-09-19 Kimi（接收后独立终审）：同步 `13aa61fc`、工作树干净后核 `b99ec6cf → 62a18137`
  （GLM 源 3dfec190）。直读 D1 实际读取对象捕获（readJson 原样返回+交付快照+消费后比较、
  actorsById 入快照）；复跑两见证工具五对照绿五针 detected（含 loader-project-input-pollution）、
  mutants 五控绿十针业务红；定向 60/60、typecheck；交叉核 check 7,538、strict 617/7,049
  （恰 +60）、旧 identity 零移除、看板一行未回退。旧版本兼容 pass；BGM initP 政策留后续。
  签 accept，无返工项；未改产品/他席/状态，未读他席结论。Next：Codex 统一核定 done。
- 2026-09-19 Codex（最终接收/集成）：在main/b99ec6cf独立复核源3dfec190，剩余两项闭环；60/1190/tc/Biome14、五常驻见证、15跑及额外lazy输入污染反控通过。
  合入最新主线，保留E-01与所有editor已收口改动；完整check7538→ratchet→受保护单次fast7049全部绿，集成候选62a18137。
  本席accept，任务review，无返工项；GLM为实现者自验，Kimi下一步独立终审。未改GLM测试语义/他席签字，不标done；两轮counter保留为历史。
- 2026-09-19 GLM（r1 收窄返工完成）：rebase 最新 main 4678650a（保留 guard 归档与预览缓存修复，
  撤回看板回退），只修 D1 实际输入保真与文档门。新 input 见证 detected、原四见证保持、15 跑全绿、
  check:docs PASS。收窄返工实施者自验 accept 已签；任务保持 rework，等 Codex 复核。
- 2026-09-19 GLM（r1 返工完成）：合入 counter ced4f2b9（rebase，原文保留），按 R1～R4 定点返工：
  四见证全 detected、原 15 跑全绿、59 项/1189 全包/tc/Biome/覆盖对照复跑完成。返工实施者自验
  accept 已签本人席位；任务保持 rework，等 Codex 重新接收。

- 2026-09-19 Codex（返工复核）：main/4df7823e干净接手，同步remote并确认a9e1d4f1；在候选独立复跑59/1189/tc/14文件Biome、四见证、15跑及/tmp覆盖。
  原四针已detected，R1/R3闭环；仅剩D1实际输入保真与候选越界看板回退，新增真实project输入污染针MISSED、check:docs exit1。
  主线只落本人counter/见证/接续文档，不把GLM未接收测试/自验移录为独立accept；无产品/基线变更，交GLM两处定点返工。
- 2026-09-19 Codex：主工作区始终main，候选worktree75c9cfe8干净；保留另一guard卡同期终审提交至34631e67，未回退任何分支。
  独立56/1186/tc/Biome14绿、原5+10负控有效、覆盖增量一致；另造4条实际执行单点坏实现全MISSED。
  直接counter R1～R4转rework，未合入测试/未改官方基线；GLM原回执/机器账/自验保留候选树。下一步GLM原白名单返工，设计不重签。
- 2026-09-18 Codex（协调登记）：同步GLM本人6300223a的build allowed回执，按已齐三席准入将顶部状态/看板/索引同步build。
  不代签、不改其范围或测试；场景引用修复保持editor单文件生产面，未接收的运行时新测试不计入本次官方基线。
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

### Kimi · 集成候选62a18137独立终审（当前）

```text
在 /Users/zhangxu/illegal/type-pal 独立终审 TEST-REFORGE-RUNTIME-CONTRACTS-1 r1。任务卡 docs/ops/tasks/TEST-REFORGE-RUNTIME-CONTRACTS-1-runtime-boundaries.md 当前review；集成候选62a181376f283fe7bfbb84c69be631399887e495，对比b99ec6cf，源GLM候选3dfec190，设计不重签。
先同步main并检查工作树，读AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本卡上下文、docs/testing/glm-reforge-runtime-contracts.md和机器账；从源码/实际调用独立形成结论，不复述Codex或GLM评价。GLM编写十新测试+fixture，属于测试贡献者/实施者自验，不是独立第三方；Codex接收记录在docs/testing/reforge-runtime-contracts-review.md。
重点核：D1 source.readJson返回value就是记录的实际对象，交付时快照、消费后保真及runtime不别名；project actorsById保护；此前C2/C4真实交错、D4/D5同实例IO失败恢复与B5真实use请求链已闭环，按风险抽查，不重开设计。候选无产品/旧测试/原探针/统计范围变化，主线guard归档、预览缓存、E-01修复完整保留。
可复跑两个常驻见证：node docs/testing/reforge-runtime-contracts-review-witnesses.mjs /Users/zhangxu/illegal/type-pal；node docs/testing/reforge-runtime-input-review-witness.mjs /Users/zhangxu/illegal/type-pal；应五控绿/五针detected。原负控：node docs/testing/glm-reforge-runtime-contracts-mutants.mjs，应5控绿+10针业务红。定向60/全Reforge1190/tc/Biome14、完整check7538、官方ratchet及受保护单次fast7049已由Codex独立通过；官方分母/617生产清单与旧106个Reforge测试身份保留，其余六包整个基线对象不变。不要并行争用官方coverage目录。
仅在本人Kimi席位写带直接证据的accept或counter、本人交接日志并提交推送；不改产品/测试/其他席位/任务状态，不标done。BGM initP初始化失败缓存政策保留后续核验，不把待证当本包已修。签前再次同步保留他席改动，不切GLM工作树或回退已收口任务。无视觉/听感/E2E复验要求。
```

### GLM · D1输入保真与看板收尾（历史）

```text
在 /Users/zhangxu/illegal/type-pal-glm-reforge-runtime 收窄返工 TEST-REFORGE-RUNTIME-CONTRACTS-1 r1，候选a9e1d4f1，卡docs/ops/tasks/TEST-REFORGE-RUNTIME-CONTRACTS-1-runtime-boundaries.md为rework。先核本人分支codex/glm-reforge-runtime-contracts-r1，同步本次Codex counter与最新main，读AGENTS/CLAUDE/READ-FIRST、本卡与docs/testing/reforge-runtime-contracts-review.md当前节。不得切主worktree、reset、恢复stash或回退其他任务；guard已done归档、预览缓存4df7823e已收口，均须保留。r1设计不重签，R1/R3及已通过的投影/IO恢复/A5不重开。
只修两处：①D1测试:75-89的project快照遗漏实际actorsById，Codex在loadAllScenes正确返回前污染传入actor.name为polluted.name，6项仍绿；补实际project纯数据保真（排除真正活动的source/resolver/cache），并在FileSource读取边界保留实际交给loader的author对象及快照，不能用前后两次独立structuredClone证明同一输入不变。保留完整cue期望与投影负控；不要改生产或用冻结导致TypeError冒充业务回归。②候选board:15把另一guard卡review回退build，check:docs exit1；同步后保留主线归档状态/链接，只改本人卡状态回执，修旧tip并跑文档门。
重跑原node docs/testing/reforge-runtime-contracts-review-witnesses.mjs <候选物理路径>：四控绿/四针detected；新增node docs/testing/reforge-runtime-input-review-witness.mjs <候选物理路径>须由MISSED转detected，正常控制绿，函数内实际污染见证保留。不得改原见证降低判据。复跑定向/全reforge/tc/14新增文件Biome/原15跑及同口径/tmp覆盖，数字/30族/失败记录按最终树更新。已确认59/1189和+74/+84/+13/+73的有效事实保留，不凑条数；bgm initP政策仍待证。
只改原白名单测试/fixture/本人回执及必要索引；产品/旧测试/官方基线/原探针零改。全仓check/ratchet/strict-fast仍留Codex通过接收后串行跑。提交推送本人分支，直接交Codex复核，不代签、不标done、不转Kimi。
```

### GLM · 首轮R1～R4返工提示（历史）

```text
在 /Users/zhangxu/illegal/type-pal-glm-reforge-runtime 返工 TEST-REFORGE-RUNTIME-CONTRACTS-1 r1，原候选75c9cfe8，卡docs/ops/tasks/TEST-REFORGE-RUNTIME-CONTRACTS-1-runtime-boundaries.md，rework。设计不重签。
先在自己的worktree核分支codex/glm-reforge-runtime-contracts-r1，合入Codex counter并保留主线guard实现/他席终审；不得切换主worktree、移动guard分支引用、reset或恢复stash。冻结约束reforge目标面，相对返工接收基点产品零改，不把主线已接收editor变化算自己贡献或回退。
读AGENTS/CLAUDE/READ-FIRST、本卡和docs/testing/reforge-runtime-contracts-review.md。R1保留正确的初始化last接管例但改准确标题，补真实旧读entered→新请求提交→旧读完成、不同字节的BGM交错；MIDI补旧A finally与仍在途B/key去重组合。R2钉author/runtime cue与完整树，不用ID/数组不等当投影；补source.urlFor真实故障/上下文与同实例恢复。R3实际world/items/state在真实调用后深比较，B5经useConfirm/useApply产合法对应request，不手造oneAlly的pick-item或不一致selectedItemId。R4如实刷新30族、标题/计数/失败记录/index；A5不制造MAIN_MENU不共享的新规则。
复跑node docs/testing/reforge-runtime-contracts-review-witnesses.mjs <候选物理绝对路径>：四控绿、bgm-post-read-ownership/midi-stale-finally/loader-projection-bypassed/equip-input-pollution应由MISSED转detected，必须保留实际执行见证。不得改原见证掩盖问题；确需适配名称只报告Codex。
原56测试/原10负控及覆盖增量的有效部分保留，不推倒重做、不凑固定条数、不改产品/旧测试/原探针/官方基线。复跑定向/全reforge/tc/全部新文件Biome、原15跑、四新见证及官方同口径/tmp覆盖；全仓check/ratchet/strict-fast仍留Codex。bgm initP政策继续待证，不扩成修复授权。提交推送本人测试/回执，交Codex重新接收；不代签、不标done、不直接转Kimi。
```

### Codex · 复核 r1 收窄返工（历史）

```text
在 /Users/zhangxu/illegal/type-pal 复核 TEST-REFORGE-RUNTIME-CONTRACTS-1 r1 收窄返工。任务卡 docs/ops/tasks/TEST-REFORGE-RUNTIME-CONTRACTS-1-runtime-boundaries.md（rework）；回执 docs/testing/glm-reforge-runtime-contracts.md；机器账 docs/testing/glm-reforge-runtime-contracts-evidence.json。候选分支 codex/glm-reforge-runtime-contracts-r1（worktree /Users/zhangxu/illegal/type-pal-glm-reforge-runtime），在你的 counter 4678650a 之上 rebase 后追加收窄返工提交（tip d28b3c51+）；生产冻结 3bc20273；设计不重签；主线 guard 归档与预览缓存修复原样保留。
GLM 只修了你剩的两件：D1 实际输入保真（project 纯数据快照含 actorsById；fixture readJson 边界捕获 loadAllScenes 实际消费的 lazy scene 对象、交付时快照、消费后比同一对象；runtime 改 cue 不影响实际对象；确定性例改实名）与看板回退撤回（board 保留主线最新行，check:docs PASS）。新见证 node docs/testing/reforge-runtime-input-review-witness.mjs <候选物理绝对路径> 已 MISSED→detected（对照 7/7 绿）；原四见证保持 detected；原 15 跑 rc=0；定向 60/60、全包 116 文件/1190 项、tc rc=0、14 新文件 Biome rc=0；覆盖对照数字不变（+74 行/+84 语句/+73 分支，收窄只强化断言）。
请独立复核：复跑两个见证工具与 15 跑、抽查 D1 边界捕获断言确是比较实际消费对象、核 board 与 check:docs。通过后统一串行执行全仓 check、官方 ratchet、受保护 strict-fast（GLM 未跑），在本席签 accept、更新看板并给 Kimi 终审提示词。仍有问题则 counter 并写明复现；已闭环项不重开；不代签、不标 done。
```

### 历史派发（已完成）

### GLM（先并行设计审查，准入后连续整包）

```text
在 /Users/zhangxu/illegal/type-pal 接手新双线任务，两卡均r1/draft，生产冻结3bc20273fe88e83da2dcb32f04ea132a0ada60d9：
1. docs/ops/tasks/TEST-REFORGE-RUNTIME-CONTRACTS-1-runtime-boundaries.md（你负责五组十模块补测）。
2. docs/ops/archive/tasks/done/EDITOR-SCENE-REF-GUARD-1-scene-deletion-reference-closure.md（Codex修D-02，你只审前提/矩阵）。
先同步并检查工作树，读AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、两卡和docs/testing/glm-reforge-runtime-contracts.md。独立核真实caller、既有去重、合法fixture、异步所有权及负控；本卡68既有测试/tc绿，D-02三反例与use正控复现、40相邻绿。不要读取或复述Kimi结论。
先在两卡各自本人席位写带直接证据/可证伪观察的premise verified与design agree或counter，更新本人日志，同步保留他席后提交推送。设计未齐不得实施。补测卡三席同r1齐且无counter后由你核build allowed，在codex/glm-reforge-runtime-contracts-r1独立worktree连续完成五组30族，不逐组请示。
只改工作包十个新测试/薄fixture/本人诊断回执，产品/旧测试/原探针/官方基线零改；不碰Codex的editor修复。至少10条有执行见证的单点业务负控，定向/相邻/tc/Biome及同树/tmp覆盖双口径；全仓check/ratchet/strict-fast留Codex。无浏览器、截图、听感或视觉验收。新缺陷隔离报告，不反向写绿色合同。整包完成交Codex独立接收，披露测试贡献，不代签、不标done、不直接转Kimi终审。
```

### Kimi（与GLM并行审两卡）

```text
在 /Users/zhangxu/illegal/type-pal 独立审两张新卡r1/draft，生产冻结3bc20273fe88e83da2dcb32f04ea132a0ada60d9：
docs/ops/archive/tasks/done/EDITOR-SCENE-REF-GUARD-1-scene-deletion-reference-closure.md；
docs/ops/tasks/TEST-REFORGE-RUNTIME-CONTRACTS-1-runtime-boundaries.md。
先同步检查工作树，读AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、两卡及docs/testing/glm-reforge-runtime-contracts.md，直接核源码/caller，不读取或复述GLM结论。
D-02请独立复跑两条卡内原probe，核inherit/disabled父场景边、transition条件漏接、use复合边去重、冷暖同源、删除集合豁免及现有owner定位能力；不扩大成公共locator/schema重构。补测卡核五组十模块30族的真实调用、合法输入、旧测试去重、current-only排除、异步负控鉴别力与非视觉边界；Codex只动editor，GLM不改生产，官方覆盖由Codex串行集成。
分别在两卡本人席位签premise verified（直接证据和可证伪观察）+design agree或counter，写本人日志，同步保留他席后提交推送。不得改产品/测试/他席/任务状态，不代签、不标build/done。两卡独立裁决；都无counter且三签齐后各Coding Owner自行核准入，无需重复签整包中的每一组。
```

### Codex（接收 r1 整包，build 完成后）

```text
在 /Users/zhangxu/illegal/type-pal 接收 TEST-REFORGE-RUNTIME-CONTRACTS-1 r1 整包。任务卡 docs/ops/tasks/TEST-REFORGE-RUNTIME-CONTRACTS-1-runtime-boundaries.md；回执与 30 族账 docs/testing/glm-reforge-runtime-contracts.md；机器账 docs/testing/glm-reforge-runtime-contracts-evidence.json。候选分支 codex/glm-reforge-runtime-contracts-r1（worktree /Users/zhangxu/illegal/type-pal-glm-reforge-runtime），基点 6300223a；生产冻结 3bc20273fe88e83da2dcb32f04ea132a0ada60d9。
GLM 已交付五组 10 新测试文件 56 项（input/menu/equip/use/bgm/midi/loader/resolver/cutscene/adapter）、10 针负控+判据自测（5 对照+10 针 15/15，钉名 JSON 执行见证）、官方 testSelection 覆盖对照（十模块 +73 行/+83 语句/+73 分支，/tmp 输出）与实施者自验 accept；无新产品缺陷，bgm initP 拒绝缓存政策记待证。附注：build allowed 登记当日存在已披露并已纠正的主 worktree 分支检出竞态（6300223a 已在 main，你的 guard 分支已复位 830db139）。
你负责独立接收/集成：核对白名单与计数、抽读合同断言与 fixture 合法性（先过当前守卫）、复跑定向与全 reforge 包、tc/Biome；复跑 node docs/testing/glm-reforge-runtime-contracts-mutants.mjs 验 15/15；按需重跑覆盖对照（config 绝对路径可复制）。然后统一串行执行全仓 check、官方 ratchet 与受保护 strict-fast（GLM 未跑）；全部通过后在本席签 accept、更新看板并给 Kimi 终审提示词。发现问题先 counter 并写明复现，不直接改 GLM 测试语义；不得代签他人或标 done。与你的 EDITOR-SCENE-REF-GUARD-1 修复并行时注意主 worktree 分支检出竞态（先核当前分支再提交）。
```
