# TEST-REFORGE-ASSET-IO-1 - 资源读取、缓存与音效准备补测（队列 TB-02）

Status: review
Phase: phase2
Capability: 已有读取/缓存/音效准备合同覆盖（不改变能力地图）
Coding Owner: GLM（只新增测试）
Integration Owner: Codex
Reviewer: Codex / Kimi
Visual Verification Owner: N/A
Visual Verification Timing: N/A
Unavailable Agents: none
Branch: codex/glm-reforge-asset-io-r1

Revision: r2，2026-09-19；生产核对点`e58834f6389a40ffe9f187e6a8051f552e964d79`不变。r1前提/方案已收窄，旧签留历史，不授权r2。
来源：[补测长队列](../../testing/glm-coverage-work-queue.md) TB-02；r2三席已齐，实施时机以本卡当前准入为准。
唯一工作包/族账/白名单：[glm-reforge-asset-io.md](../../testing/glm-reforge-asset-io.md)。


## 当前接收复核（Codex，2026-09-20，源ea276956）

**Codex accept（2026-09-20，统一候选256116ee）**。本批收窄counter全部闭合，已逐批集成；check7709、官方ratchet及受保护单次严格fast7220全通过，当前review待他席。
定向24项、原负控、包tc和完整自有文件Biome均通过；C0精确唯一判据/C1格式与回执已关闭，不重开旧有效断言。
见[本轮独立接收](../../testing/glm-nine-final-review.md)与[机账](../../testing/glm-nine-final-evidence.json)。
GLM是测试贡献者而非独立第三方；交Kimi独立终审、GLM确认实现者自验，当前不代签、不标done。

## 上轮返工复核（历史）（Codex，2026-09-19，d4d79026）

**counter，保持rework**。原七针/五夹具已关闭；公共C0精确唯一目标和C1最终树格式/回执仍未满足。
定向24项、原3+8跑与包tc通过；本批Biome 10文件/2 errors/0 warnings，exit1。
本批无其他新业务返工，保留已通过断言。
见[本轮复核及提示词](../../testing/glm-nine-rework-review.md)与[机账](../../testing/glm-nine-rework-evidence.json)。
不合并、不更基线、不转Kimi、不代签、不标done；设计保持，Mimosa不参与。

## 首轮接收裁决（历史）

用户本轮明确批准九批先行实施、Codex恢复后统一接收；认可本批排期例外，不因旧两槽限制追溯判违规。设计签字保持，不重签。
**本席独立结论counter，任务rework，未合入正式测试/产品、不更新官方基线、不转Kimi终审。**
定向24项、原3对照+8针、包typecheck均通过；
Biome实测10文件/0 errors。
见[统一复核 TB-02](../../testing/glm-nine-intake-review.md#tb-02)与[机器接收账](../../testing/glm-nine-intake-evidence.json)。
公共C0判据误收适用，格式仅更正文件计数；具体最小返工如下。

- **R02-1，真实坏JSON漏检**：`fsa-source.cancel-windows.test.ts:121–133`没有把text改成坏JSON，反而断言readText/readJson都成功。单点吞掉JSON解析错误后，候选3/3仍绿，独立坏JSON oracle红（`fsa-invalid-json-swallowed`）。
- **R02-2，物品夹具不合法**：`__tests__/glm-asset-io-fixtures.ts:63–77`的soundItem被正式validateItems拒绝：`items[0].throw.effects: 不得为空`。collector只检查引用能否收集，不是物品结构守卫。补合法throw effect与消费前guard，继续保留非战斗声音集合/页政策隔离。
- C0适用。Biome实际10文件全净，不是回执9；不要求重做有效copy/RIFF/缓存断言。


## 目标与边界

补 reforge 六模块的读取分阶段失败/取消窗口/缓存生命周期/注册表失败重试/非战斗音效集合回归。
不听音、不做视觉；不改保存稳定读门/锁/恢复；不碰技能试放/Codex main 接线；与已接收十模块包
（audio/bgm、midi-preview 已在彼包）不重叠。

## 前提真值门

| 维度 | 一手证据与结论 |
|---|---|
| 原版/primary source | 不新增原版音频规则；当前 TS 合同为真源 |
| 第一阶段 | harvest X2/X4/X8 只取"迟到播放/缓存回填"通用教训，不搬旧 AudioManager 结构 |
| 当前二阶段 | main:774–789向collector传canonicalScene；project-loader:455构造image cache/:461构造httpSource，registry真正由menu-box:363/main:628消费。HTTP仅透传signal，FSA逐await查取消；browserAdapter复制与assertWave标记门分层。六旧文件实跑39项，去重/待证见r2工作包 |
| 本任务目标 | before→after 只增合法正反测试与覆盖账；读取/缓存行为零变 |

最强替代解释：已有强断言、在途dispose回填政策未定、canonical页选择尚未核清、窗口不可达。
SfxPlayer没有原稿所称通用AbortError自动重试；反证成立登记已有/待证/防御，不把现状固化为合同。

## 推进签字

### build前（r2，当前）

- Codex：**premise verified / design agree（2026-09-19，r2，冻结e58834f6）**。本人直读file-source.ts:27–47与fsa-source.ts:18–50，核实HTTP透传而FSA主动查取消；sfx.ts:63–94的实际browserAdapter复制/标记门已用宿主探针复跑；main.ts:774–789与readiness.ts:168证实页选择前提不能由旧玩具fixture代证。六旧文件39项绿。r2排除未定页选择/在途dispose，去重12项sfx及已有registry503重试；不宣称PCM/听感或浏览器验证。可证伪：替身替掉产品判据、真正消费者输入与fixture不同、只有旧强例重复，则收窄而不固化。
- Kimi：**premise verified / design agree（2026-09-19，r2，冻结 e58834f6；全部锚点本人直读，未读 GLM 结论——其签字于本人核查完成后落盘，仅确认席位位置）**。
  - **两套读取合同直读**：`file-source.ts` httpSource 仅透传 signal 给 fetch 并原样消费 Response
    （无逐 await 取消门、无统一 JSON 包装）；`fsa-source.ts` 逐 await 主动查取消——HTTP/FSA 分开
    测正确；`sfx.ts:63-68` AudioContext 宿主选择、`:90-94` assertWave 仅长度/RIFF/WAVE 标记门
    （mock decodeAudioData 不是 PCM 解码证明）——分层属实。
  - **browserAdapter 复制直读**：SfxPlayer 向注入 adapter 直接传 reader bytes、复制发生在产品
    browserAdapter——新测试走实际 adapter 而非假 adapter 收复制品，r2 此钉正确。
  - **既有去重核实**：sfx 12 项（decode/read/play 失败、resume 重试、dispose 旧 prepare）与
    registry.test.ts:24-40 的 503 重试在册；r2 只补独立余轴、不更名既有断言算新增——纪律正确。
  - **页选择隔离核实**：`main.ts:774-789` 给 collector 传 canonicalScene 且无 additionalRoots；
    `sfx-readiness.ts:168` 固定 pages[0].animation——旧玩具 SceneDef 不能证明 canonical
    initialPage/活动页合同，r2 把「当前页选择正确」移出绿测主张、隔离待证是正确的收窄
    （在途 dispose 回填政策未定同样不默认绿）。
  - **探针本人复跑**（exit 0，队列共用）：browserAdapter 实拷字节并走 connect/start/stop/close
    ——与上述源码一致。
  - **设计同意**：六模块读取分阶段失败/取消窗口/缓存生命周期/注册表失败重试/非战斗音效集合
    回归；不听音不做视觉；不改保存读门/锁/恢复；不碰技能试放与 Codex main 接线；与已接收
    十模块包（bgm/midi-preview 属彼包）不重叠；负控判据自测+钉名业务红。
  - **可证伪观察**（任一反例即收窄或 counter）：① 某族已被既有厚测试同合同覆盖 → 登记已有；
    ② 替身替掉产品判据（假 adapter 被要求收复制品）→ 测试模型错；③ 真正消费者输入与 fixture
    不同 → 撤回；④ 在途 dispose 回填政策被定义 → 待证族重评；⑤ 产品/旧测试/基线任何 diff →
    越界即停。
  - 返工项：无。
- GLM：**r2 premise verified / design agree（2026-09-19，r2，冻结 e58834f6；差异锚点本人直读/复跑，未读 Kimi 结论；r1 签字留历史）**。
  - **HTTP/FSA 分层**：file-source.ts:24–47 本人直读——fetch 只透传 AbortSignal、Response 原样
    消费，无逐 await 取消门；fsa-source.ts:18 起每个读取前 `throwIfAborted(signal)` 主动查——
    r1 稿 B8 把两宿主混写同一取消 oracle 确为错误，r2 拆分正确。
  - **browserAdapter 复制**：sfx.ts:63–94 本人直读——`decodeAudioData(bytes.slice(0))` 复制发生在
    产品 browserAdapter 内；r1 稿"注入假 adapter 后断言收到复制品"不可能成立，r2 改为
    AudioContext 窄替身 + 真实 browserAdapter 正确。assertWave:90 只查长度/RIFF/WAVE 标记，
    完整 WAV 正控与 mock decodeAudioData 的边界声明同意（非 PCM 解码证明）。
  - **caller 订正**：project-loader.ts:455 构造 ProjectImageCache、:461 构造 httpSource，
    registry 真实消费者为 menu-box.ts:363/main.ts:628——r1 稿把 :455/:461 同时当 registry 锚点
    有误，r2 订正正确。
  - **页选择疑点隔离**：sfx-readiness.ts:168 固定 `pages?.[0]?.animation`、main.ts:774–789 只传
    canonicalScene 无 world 活动页（本人直读两处）——r2 移出"当前页选择正确"绿测主张、归
    Codex 待证，同意；本包不把首页等同活动页。
  - **既有基线复跑**：六旧文件 39/39 绿（本人执行）；sfx 实际 12 项、file-source 实际 8 项
    （r1 稿计数偏低）——r2 去重数字以实跑为准正确。AbortError"通用自动重试"归属删除同意
    （SfxPlayer 无此合同）。
  - **探针复跑**：premise 探针 rc=0——实际 browserAdapter 字节保真 + connect/start/stop/close
    事件序列，与 B2 宿主方案一致（协议级证据，非听感）。
  - **可证伪观察**：①替身替掉产品判据（假 adapter/IDB 式事务）→无效；②在途 dispose 回填被
    固化为绿测→违反待证隔离；③registry 跨例预热成功→B10 隔离失败；④产品/旧测试/基线 diff→停。
  - 返工项：无。Kimi 签齐且无 counter 后由 Codex 核定 build。
- build准入：三席r2设计签字保持；用户本轮明确批准额度空窗期九批先行实施（排期例外），本卡据此进入实施后接收。当前counter/rework不要求重签设计，未开放done；不将本次例外泛化给未来新批。

### build前r1签字（历史，已被r2替代）

- Codex：pending（独立核队列 TB-02 范围/去重表/白名单）。
- Kimi：pending（独立前提/设计审查，不读 GLM 结论）。
- GLM：**premise verified / design agree（2026-09-19，核对点 e58834f6；锚点本人直读，未读他席）**。
  六模块存在、计数与台账逐格一致（census --check）；caller 锚点（main/loader/menu-box/editor 两文件）
  与既有测试标题逐一直读核实并列入去重表；B1-B10 族锚点在工作包。可证伪：某族已被既有厚测试同合同
  覆盖→登记已有；未定政策（在途 dispose 回填）→隔离待证不默认绿；产品/旧测试/基线 diff→停。
- build准入：未开放；三席同 r1 齐且无 counter 后由 Codex 核定。

### done前

- Codex：**accept（2026-09-20，候选256116ee，源ea276956）**。独立复跑定向/原负控/tc/Biome并核白名单；剩余counter闭合。八批统一check7709、官方ratchet及受保护单次严格fast7220通过；生产清单/分母/旧测试身份不变，旧版本兼容审查pass。GLM贡献已披露，Kimi待独立终审，不代签、不标done。
- GLM：**实现者自验 accept（2026-09-20，统一候选 256116ee，源 ea276956；非独立第三方审查——本人即测试贡献者）**。
  - 集成核对：本人源候选 TB02 全部白名单新测试/fixture 文件与主线 256116ee 逐字一致（git diff 为空），产品/旧测试/官方基线零改动；集成后定向 24/24 复跑全绿（主线实跑）。原负控 3+8 由 Codex 复跑通过；C0 精确唯一目标判据与 C1 白名单 Biome 已在 r3 交付并被接收。
  - 声明：本 accept 仅证明贡献未被改义且集成后行为与交付一致，不构成独立第三方审查；Kimi 终审独立进行。
  - 6 新测试文件 24 项（5+5+6+3+3+2）；定向 24/24、reforge 全包 122/1214、tc rc=0、9 文件 Biome rc=0。
  - 8 针负控 + 3 对照全绿（钉名 AssertionError 业务红 + 毒日志自测）；产品 hash 不变。
  - 覆盖对照 /tmp 双栏；在途 dispose 回填与 pages[0] 疑点保持待证不固化。
  - 未做：全仓 check/ratchet/strict-fast 与接收归 Codex（额度恢复后）。
- Kimi：**accept（2026-09-20，终审，统一候选 256116ee 对比 ad528beb；源 ea276956；设计不重签；未读 GLM 终审结论）**。
  接手 HEAD 与 origin/main 一致、工作树干净；候选后产品/旧测试零漂移。本批 6 新测试文件
  **24/24** 本人复跑全绿（sfx-readiness 集合/staged 失败/registry 生命周期/file-source 与
  fsa-source 取消窗口/image-cache 生命周期）；入仓 mutants **对照绿 + 8 针全业务红**。
  browserAdapter 实际复制路径、HTTP/FSA 取消分层、页选择疑点维持移出绿测（不重开）。
  交叉核统一门禁：check 7,709、受保护 strict 617/7,220（八批恰 +171）、六包级 digest、
  产品零改、旧测试 identity 不变。返工项：无。
- done准入未开放，不代签、不标done。

## 交接日志
- 2026-09-20 Kimi（八批终审之 TB-02）：同步 `5c93c4b5`、工作树干净后核 `ad528beb → 256116ee`。
  复跑 6 文件 24/24 全绿、mutants 8 针全业务红+对照绿；页选择疑点与在途 dispose 政策维持
  待证不固化。交叉核 check 7,709、strict 617/7,220（恰 +171）、产品零改、旧 identity 不变。
  签 accept，无返工项；未读 GLM 终审结论。Next：Codex 统一核定 done。
- 2026-09-20 GLM：八批集成后实现者自验落席——核源 ea276956 白名单文件与统一候选 256116ee
  逐字一致、集成后定向复跑全绿，GLM done前席位签 accept（非独立第三方）。Kimi 终审独立。


- 2026-09-20 Codex（门禁完成）：八批统一候选256116ee通过完整check7709、官方ratchet和受保护单次严格fast7220；本席accept，Kimi/GLM当前提示词见卡末，不代签、不标done。

- 2026-09-20 Codex：独立复核ea276956，本批残项闭合并逐批集成，待统一质量门。不代签、不标done；当前提示词以本轮报告为准。

- 2026-09-19 GLM：按 Codex 返工复核 counter（glm-nine-rework-review.md）完成 r3 收窄返工：
  C0 判据精确唯一目标（运行态/自测共用、后缀冒名与重名反例）、C1 全部回填后完整白名单
  Biome rc=0。详见工作包 r3 回执与机账 rework2 节。分支待 Codex 复核接收。


- 2026-09-19 Codex：复核d4d79026，按本轮报告收窄counter；原七针与五夹具已关闭。最终树格式与精确唯一判据仍失败，不重签、不并包、不标done。
- 2026-09-19 Codex：按用户九批统一接收授权独立审本候选；测试通过不等于证据有效，签counter并转rework，返工限公共C0/C1及本卡章节。GLM原回执/他席签字保留；用户最新确认Mimosa为GLM私有MCP，Codex不处理且不作接收门；TB00/TB01另排。
- 2026-09-19 GLM（实施完成）：用户拍板先行实施；B1-B10 落账（B3/B6 已有登记）；
  24 项 + 8 针负控 + 覆盖对照交付，自验 accept 已签。等 Codex 额度恢复后补接收。
- 2026-09-19 Codex：用户告知“Kimi他们签了”后同步核三席同r2/冻结、直接证据及可证伪观察齐、无counter；生产目标零diff。核定设计准入通过，保留draft待实施槽按队列释放。 r1历史不回写，所有既有r2排除项保留；不代签、不标done。GLM当前返工仍优先，后续领取条件与交接已落卡，避免每批做完再等临时派活。
- 2026-09-19 Kimi：完成 r2 独立设计压力测试，签 premise verified + design agree，无返工项。
  直读 httpSource 透传/fsaSource 主动取消分层、sfx browserAdapter 复制位置与 assertWave 标记门、
  registry 503 重试既有断言、main.ts:774-789 canonicalScene 与 pages[0] 疑点隔离（移出绿测正确）。
  六旧文件去重核实；复跑队列探针 browserAdapter 实拷字节证据一致。五条可证伪观察写入本席。
  未改产品/他席/状态，未读 GLM 结论。Next：三席齐后 Codex 核准入。
- 2026-09-19 GLM：完成 r2 差异确认，签 premise verified / design agree，无 counter。复核
  HTTP 透传/FSA 主动取消分层、browserAdapter 复制位置与 assertWave 标记门、registry 真实 caller、
  readiness pages[0] 疑点隔离；探针 rc0；六旧文件 39/39 复跑。未读 Kimi 结论；仅改本席与日志。

- 2026-09-19 Codex：按用户要求与TB-00返工并行推进本卡；HTTP/FSA取消、browserAdapter复制、RIFF标记门/PCM解码分层；订正既有用例计数与caller，页选择疑点隔离。已把修订合入工作包正文，r2本人前提/设计签字完成，待GLM补充确认与Kimi独立审查。仅文档/只读探针，未写正式测试或改产品。统一证据见[前三批设计收口](../../testing/glm-coverage-queue-design-review.md)。

- 2026-09-19 GLM：按队列 TB-02 细化。核六模块 caller/既有测试（sfx×8、sfx-readiness 厚集、
  image-cache/file-source/fsa-source/registry 标题全列）；产出本卡+工作包（B1-B10 族账/负控/覆盖方案）。
  仅规划，未写测试。

## 历史交接提示词

### 当前 · GLM按已签队列实施

```text
在 /Users/zhangxu/illegal/type-pal 按 docs/ops/tasks/TEST-REFORGE-ASSET-IO-1-read-cache-sfx.md 的r2实施，生产冻结e58834f6，三席齐且Codex已核准，不重签。先同步、检查工作树，读AGENTS/CLAUDE/READ-FIRST、本卡当前准入、对应工作包及docs/testing/glm-coverage-queue-design-review.md的当前实施交接。
TB-00三项返工优先；未接收实施包最多两批。TB-01已开build，TB-02/03依序待空位；满足卡面条件后你可同步状态/看板/索引并开工，不再等用户逐批点头。领取前核目标产品未漂移；每批独立codex/glm-reforge-asset-io-r1分支/worktree，不在主树切分支、不恢复stash、不混用未接收成果作为基线。
只新增已签白名单测试/fixture/诊断和本人回执，逐族去重，合法输入先过守卫，负控须由候选自身AssertionError变红，不能把超时/STACK_TRACE_ERROR或仅独立oracle红算检出。PNG编码失败泄漏及活动页/在途回填待证保持原归属，不改产品或写错绿。
完成定向/相邻/全包/tc/Biome、私有同口径覆盖与真实逐族账后交Codex接收；全仓check/官方ratchet/strict-fast留Codex。不做视觉/听感，不改旧测试/官方基线，不代签、不标done、不直接转Kimi终审。
```

### 历史 · r2设计交接（已完成，不重复执行）

两席完整合并提示词见[前三批r2设计交接](../../testing/glm-coverage-queue-design-review.md#两席并行提示词)。本卡最小可复制交接如下：

```text
在 /Users/zhangxu/illegal/type-pal 审 docs/ops/tasks/TEST-REFORGE-ASSET-IO-1-read-cache-sfx.md（r2/draft，冻结e58834f6）。先同步检查工作树，读AGENTS/CLAUDE/READ-FIRST、本卡和对应工作包、docs/testing/glm-coverage-queue-design-review.md，直接读一手代码而非复述他席。
Codex已签r2。GLM负责对本卡r2差异补充确认，Kimi负责独立设计压力测试，两席可并行且不读另一席结论。分别只在本人r2席位/日志写带直接锚点和可证伪观察的premise verified/design agree或counter，并提交推送。
同时审其余TB-01～03同r2卡可用合并提示词，但各卡独立裁决。不得改产品/正式测试/另一席/状态，不标build/done；三席齐后Codex核准入。TB-00返工不因本轮设计等待而停止。
```

## 历史下一位Agent提示词：GLM

```text
在 /Users/zhangxu/illegal/type-pal 返工 TEST-REFORGE-ASSET-IO-1（TB-02），卡 docs/ops/tasks/TEST-REFORGE-ASSET-IO-1-read-cache-sfx.md 已rework，候选a7c48d9c，生产冻结e58834f6；设计r2不重签。
先同步当前Codex counter到独立 codex/glm-reforge-asset-io-r1，读AGENTS/CLAUDE/READ-FIRST、docs/testing/glm-delivery-checklist.md、本卡当前裁决和 docs/testing/glm-nine-intake-review.md 的公共C0/C1与TB-02章节、原工作包docs/testing/glm-reforge-asset-io.md。
只修列明残项，保留有效测试与他席结论；正式guard合法、实际同一入参深快照、禁止把已排除未知/旧接口写正确绿测。公共工具判据必须按目标错误首行，真实运行与自测同函数。原负控+本席相关独立见证、定向/相邻/全包/tc/全部新TS/MJS/MTS/JSON的Biome及私有同口径覆盖从最终树复跑，失败/未完成如实记录。
只动原白名单/本人回执，分支不互合、不改产品/旧测试/官方基线/原审计探针/他席见证语义，不代签、不标done、不直接转Kimi。修完本批即可单独交Codex接收；全仓check/ratchet/strict-fast留接收后，用户已确认Mimosa归GLM私有MCP，Codex无需处理，不作为本轮接收/合并门。
```

## 当前并行交接（同一候选256116ee）

### Kimi

~~~text
在 /Users/zhangxu/illegal/type-pal 独立终审TB02及TB04～TB10八批，均review，统一候选256116ee（相对ad528beb）；卡路径清单见 docs/testing/glm-nine-final-review.md，设计不重签。
先同步、核工作树并读AGENTS/CLAUDE/READ-FIRST、各卡、当前报告/机账与工作包；独立读实际测试/fixture/宿主合同，不读取或复述GLM的审查结论。
八批60新测试/171项已集成；生产/旧测试零改，源候选与主线代码逐字相同。check7709、官方ratchet及受保护单次严格fast7220通过；617生产清单/分母/旧测试身份不变，content整包基线不变。GLM是实现贡献者，非独立第三方。
核剩余counter确实闭合（精确唯一真实运行判据、TB06全输入、TB07非空redo），按需复跑定向/原负控；不要重跑或改官方基线，TB03未接收、TB00/TB01另排。分别在八卡Kimi done前席位写accept或file:line counter及本人日志，不代签/不改状态/不标done，直接提交推送。
另定点核 EDITOR-SKILL-TRIAL-1（docs/ops/tasks/EDITOR-SKILL-TRIAL-1-isolated-battle.md）r2a人数勘误：用户明确我方仅1～3人、敌方五槽，无五人扩展。按卡末提示独立核直接证据，在本人r2a席位签premise verified/design agree或counter；保存/隔离/四目录不重审，不改产品。
落盘前同步保留他席，push竞态自行处理。八批终审与人数勘误独立裁决。
~~~

### GLM

~~~text
在 /Users/zhangxu/illegal/type-pal 先读AGENTS/CLAUDE/READ-FIRST及 docs/testing/glm-nine-final-review.md；八批TB02/TB04～TB10已由Codex接收，统一候选256116ee，check7709/ratchet/严格fast7220通过。逐批核你的贡献在主线未改语义，在八卡GLM done前席位补“实现者自验accept”（非独立第三方）或counter并写本人日志，设计不重签，不复跑/改官方基线。
只返工TB03（docs/ops/tasks/TEST-EDITOR-IMPORT-CODEC-1-workers-metadata.md，rework，源001dc9e1）：原独立分支同步最新main并保留另八批既有成果，不计入自己贡献。按报告唯一PNG宿主尺寸counter，把320×200成功链的toBlob产物与实际canvas尺寸/putImageData像素对齐；主图/preview不同hash须来自真实不同像素，不用2×1/3×1造差异。保留真实SHA与完整字节断言，不改产品或编码失败close缺陷。
复跑 node docs/testing/import-codec-png-host-review.mjs <候选worktree>，删canvas尺寸须被候选业务断言检出；helper重构给真实入口由Codex适配见证。定向39/原3+8/tc/最终白名单Biome与回执从最终树复跑，其余关闭项不重开；仅TB03白名单与本人回执。Mimosa不参与。
另按 EDITOR-SKILL-TRIAL-1 卡末提示定点核r2a：我方1～3人、敌方五槽；本人签premise verified/design agree或counter，不重审保存/隔离/四目录，不改模拟器代码。
各卡裁决独立；不读/复述Kimi结论，不代签、不改状态、不标done。本人席位/日志直接提交推送，保留他席并自行处理push竞态。
~~~
