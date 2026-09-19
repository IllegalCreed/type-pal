# TEST-REFORGE-ASSET-IO-1 - 资源读取、缓存与音效准备补测（队列 TB-02）

Status: build
Phase: phase2
Capability: 已有读取/缓存/音效准备合同覆盖（不改变能力地图）
Coding Owner: GLM（只新增测试）
Integration Owner: Codex
Reviewer: Codex / Kimi
Visual Verification Owner: N/A
Visual Verification Timing: N/A
Unavailable Agents: none
Branch: codex/glm-reforge-asset-io-r1（排期后使用）

Revision: r2，2026-09-19；生产核对点`e58834f6389a40ffe9f187e6a8051f552e964d79`不变。r1前提/方案已收窄，旧签留历史，不授权r2。
来源：[补测长队列](../../testing/glm-coverage-work-queue.md) TB-02；r2三席已齐，实施时机以本卡当前准入为准。
唯一工作包/族账/白名单：[glm-reforge-asset-io.md](../../testing/glm-reforge-asset-io.md)。

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
- build准入：**r2设计门已通过，Codex于2026-09-19统一核准**（本席f5cd23c0、GLM efe6b932、Kimi 61b79f1b；生产相对e58834f6零漂移）。本卡保持draft表示已准入待排期；TB-01→TB-02→TB-03依序领取。 TB-00返工优先，未接收实施包最多两批；有空位且本卡目标产品/合同未变、无新counter时，GLM可按本授权同步本卡/看板/索引到build并开工，无需重复签字或再次询问用户。若目标漂移或出现新合同分歧，仅暂停对应批交Codex核定，不自行更换前提。

### build前r1签字（历史，已被r2替代）

- Codex：pending（独立核队列 TB-02 范围/去重表/白名单）。
- Kimi：pending（独立前提/设计审查，不读 GLM 结论）。
- GLM：**premise verified / design agree（2026-09-19，核对点 e58834f6；锚点本人直读，未读他席）**。
  六模块存在、计数与台账逐格一致（census --check）；caller 锚点（main/loader/menu-box/editor 两文件）
  与既有测试标题逐一直读核实并列入去重表；B1-B10 族锚点在工作包。可证伪：某族已被既有厚测试同合同
  覆盖→登记已有；未定政策（在途 dispose 回填）→隔离待证不默认绿；产品/旧测试/基线 diff→停。
- build准入：未开放；三席同 r1 齐且无 counter 后由 Codex 核定。

### done前

- GLM：**实施者自验 accept（2026-09-19，r1；非独立第三方；用户拍板 Codex 额度空窗期先行）**。
  - 6 新测试文件 24 项（5+5+6+3+3+2）；定向 24/24、reforge 全包 122/1214、tc rc=0、9 文件 Biome rc=0。
  - 8 针负控 + 3 对照全绿（钉名 AssertionError 业务红 + 毒日志自测）；产品 hash 不变。
  - 覆盖对照 /tmp 双栏；在途 dispose 回填与 pages[0] 疑点保持待证不固化。
  - 未做：全仓 check/ratchet/strict-fast 与接收归 Codex（额度恢复后）。
- Codex/Kimi：pending；done准入未开放，不代签、不标done。

## 交接日志
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

## 下一位Agent提示词

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
