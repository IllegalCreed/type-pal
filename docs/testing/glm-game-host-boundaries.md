# GLM第一阶段宿主、隐私与计时补测工作包（TB-09）

## 当前Codex接收结论

二轮候选1620ab24仍为**counter**，仅返[本轮报告](glm-nine-rework-review.md)的C0精确唯一目标、C1最终树格式/回执及所列本批残项。
原七针与五夹具已关闭；定向25项通过，本批Biome exit1。不重开已关闭项、不重签、不合并、不更新基线。

### 首轮接收结论（历史）

**counter**。定向25项/原3+8跑/tc通过，但仍有公共C0和本批业务返工；Biome完整面10文件/6 errors。详见[统一复核TB-09](glm-nine-intake-review.md#tb-09)。
本轮认可用户先行实施授权；不合并测试、不更官方基线、不转Kimi。下面GLM回执为候选自验原文，不能覆盖当前counter；生产零改只指已列新增测试/fixture之外，不能写整个packages diff为空。


任务：[TEST-GAME-HOST-BOUNDARIES-1](../ops/tasks/TEST-GAME-HOST-BOUNDARIES-1-privacy-timer.md)，r1/rework；本轮实施候选61f0af34未接收，设计不重签。
共同准入、负控、覆盖和隔离规则见[七批统一审核](glm-coverage-remaining-review.md)；本包只增测试；三席设计有效，用户已批准本轮先行实施，当前接收counter。
表内为已按调用域筛选的候选，不是已经完成的新增覆盖；允许去重后减文件/减族，不设必须凑足的用例数。

## 合同族与去重（game/src）

| 族/模块 | 当前caller/旧测试 | 允许新增候选 |
|---|---|---|
| H01 shell/fetch-retry | main:20；旧test:15–62 reject/耗尽/503/404/POST/重装 | Request.method与init.method优先、GET大小写、502/504、最终Response/最后Error身份、backoff末值/空数组fallback；假fetch+fake timers |
| H02 shell/input | bootstrap:471；旧test:73–155 held/pressed/多键/repeat、:204 fade | Keyboard detach真实事件后不变；两个snapshot Set防别名；未知keyup不清合法held；fade保留Space等非方向 |
| H03 shell/audio-volume | bootstrap:1092/1098/1104；旧test:6/17/28 clamp/mute/storage | stored0/default0，三channel keyVol/共享keyMute精确IO；静音中修改目标仍apply0，unmute恢复新值，不发明跨controller自动同步 |
| H04 analytics/analytics-consent | install:31/43/44；旧test:17失败关闭/:34广播/:47隐私信号 | storage属性getter抛错/无window；成功存储但dispatch抛错仍返回true；非CustomEvent→unset；unsubscribe后真实dispatch零回调；stored denied優先 |
| H05 analytics/google-analytics | install:38–49；旧test:75–161同意/敏感URL/去重/撤回/重试/队列 | measurement ID已实现边界；UTM64/65和非法token；生产不传subscribePage的grant/deny/regrant/stop；完整载荷与disable键，不接真实GA |
| H06 tools/speedrun/timer | index:15/34–42；旧test:27–117起停/跳转/PB/banana/:159–190暂停倒计时 | 同now、finished后不累计；justResumed/bestsDirty二次消费false；倒计时精确边界；实例/mem不串，合法idx跳转清旧检测记忆 |
| H07 tools/speedrun/detectors | checkpoints:51–89；旧test:26–71全检测种类 | enterAny集合内转场不误触发；tol相等/单轴+1；prev=null差异；caiyi独立mem且未见boss不误报 |
| H08 tools/speedrun/time-format | overlay:73/80/84/99、tools-panel:795；旧test:5–20常规 | 59→60、formatClock/formatHms负数归0，formatDiff保留正负号并截断绝对秒数，parseHms拒负数文本；2/3段与空白、空段/非数字/分秒60拒绝；不扩极大数政策 |

## 宿主与隔离

- DOM/EventTarget/Storage为独立内存宿主，jsdom禁自动加载资源；所有意外fetch直接失败，gtag只进本例数组；不接Google、不读用户localStorage或真实隐私状态。
- Keyboard仅宿主事件替身，使用实际产品source；快照Set检查不可借名义Readonly要求未承诺的深复制。
- timer用显式now，detector用完整ProgressSnapshot（snapshot.ts:11–29）；声称GameState来源必须实际buildSnapshot，不能复制投影算法；不sleep/不真实战斗。
- getRun/getBests只是Readonly视图，非deep clone合同；不要求修改返回值不影响内部，不凭空要求reset清bestsDirty。

## 待证/无caller，不实施轴

- fetch AbortError当前走通用catch重试，取消政策待裁决；不固化为正确继续重试，也不擅自更改。
- ReplayInputSource/RecordingInputSource无生产构造；音量NaN/storage异常降级、GA首次initialize异常吞否未定，不扩容错政策。
- install-analytics不传subscribePage，现有可选API测试不等于真实页面路由链；不新增“场景导航上报”。
- setStep(length)注释称完成但实现可能running；当前UI只给合法idx。极值、倒走时钟、大数溢出待证；不改store/overlay/UI。

## 代表性负控

至少6族：method优先、detach漏解绑、snapshot别名、显式0被||替代、unsubscribe/同意写失败广播、UTM边界或隐私参数泄漏、一次性flag或时间60边界。按有增量的族选针，不把旧测试检出算新增。
每次恢复fetch/window/storage描述符与fake timers；异步必须entered/deferred或明确事件完成见证，不能靠sleep。GLM无视觉/听感任务。

## 冻结目标（不允许修改）

```text
packages/game/src/shell/fetch-retry.ts
packages/game/src/shell/input.ts
packages/game/src/shell/audio-volume.ts
packages/game/src/analytics/analytics-consent.ts
packages/game/src/analytics/google-analytics.ts
packages/game/src/tools/speedrun/timer.ts
packages/game/src/tools/speedrun/detectors.ts
packages/game/src/tools/speedrun/time-format.ts
```

## 新增文件白名单（上限，允许减项）

```text
packages/game/src/shell/fetch-retry.boundaries.test.ts
packages/game/src/shell/input.boundaries.test.ts
packages/game/src/shell/audio-volume.boundaries.test.ts
packages/game/src/analytics/analytics-consent.boundaries.test.ts
packages/game/src/analytics/google-analytics.boundaries.test.ts
packages/game/src/tools/speedrun/timer.boundaries.test.ts
packages/game/src/tools/speedrun/detectors.boundaries.test.ts
packages/game/src/tools/speedrun/time-format.boundaries.test.ts
packages/game/src/__tests__/glm-tb09-fixtures.ts
docs/testing/glm-game-host-boundaries-mutants.mjs
docs/testing/glm-game-host-boundaries.config.mts
docs/testing/glm-game-host-boundaries-evidence.json
```

此外仅允许本工作包末尾GLM回执/逐族账、本卡本人签字和本人日志；如需README索引机械一行须先由Codex协调，禁止覆盖主线其他行。未存在文件不要求强建；需要另路径先申请收窄/扩白名单，不能借同名测试覆盖旧文件。

## 实施验证与回执要求

- 按统一审核协议先逐族核既有测试精确标题、当前caller/守卫、实际白名单与target hash；本次未运行任何新测试/负控，不得把拟定针点记已检出。
- 定向→相邻→涉及包全测/typecheck→所有新增文件Biome；负控工具带精确测试标题运行态见证与判据自测。实际记录失败和重跑原因，不能倒填SHA/数字。
- 覆盖config必须使用仓库官方testSelection口径，在专有/tmp目录作同树有/无本批测试对照，局部与全包双口径；旧资产排除两侧一致，不动全局超时/排除/官方baseline。
- GLM不跑全仓check/官方ratchet/strict-fast。Codex独立接收集成后串行执行；GLM贡献终审披露，不自证第三方，不代签、不标done。
- 提交时本节后附GLM实现回执：候选SHA、白名单diff、真实命令/退出码、逐族互斥分类与新增价值、负控细目、覆盖两时点与待证归属。

## GLM回执区（候选历史自验；以当前Codex复核勘误为准）

r1 完成（2026-09-19，GLM，Coding Owner；基点 41cc7cd9，三席 r1 签字齐；用户拍板在 Codex 额度
空窗期先行实施 TB-02～TB-10、恢复后统一接收——本批据此开工，非代签 Codex 准入）。分支
`codex/glm-game-host-r1`（worktree `/Users/zhangxu/illegal/type-pal-glm-game-host`）；
产品对冻结 e58834f6 零漂移。最终树 **7 个新测试文件共 25 项**（H01-H08 全族落账，
H06/H07 共用一个 timer.boundaries 文件、减 fixture 白名单项）；game 全包 131 文件/2309 项中
dev-panel 1 文件预存 ENOENT（stash 基线同样失败，TB-08 已核）；官方 fast 口径 2271→2296 双
exit0；tc rc=0；8 新文件 Biome rc=0。

- 负控 `node docs/testing/glm-game-host-boundaries-mutants.mjs` rc=0（test 块带 jsdom env +
  setupFiles 对齐官方配置）：判据自测 + 3 对照 + **8 变异针**全部钉名新增测试 failed 且目标
  自身 failureMessages 首行 AssertionError；产品 hash 不变。针点：网关重试门、fade 抑制过滤、
  静音 apply 0、consent detail 判别、deny 清 lastPath、timer live 门、enterAny prev 判别、
  parseHms 分秒 60。
- 覆盖对照（官方 testSelection fast，/tmp，最终提交树）：analytics-consent L28→29/29 B21→25、
  google-analytics L61→64/64 B27→29（双双满格）、timer L96→98/98、audio-volume B17→18/18、
  fetch-retry B22→24/26、input B15→16/18、time-format B21→23/24；
  全包 L10263→10269/13604、B7498→7511/11281。
- 待证保持原归属（AbortError 取消政策、setStep 注释差异、GA 真实端点）——见机器账 knownBoundaries。
- 机器账 `docs/testing/glm-game-host-boundaries-evidence.json`。

## GLM返工回执（r2，2026-09-19，针对 Codex 统一接收 counter）

基点合并 216cf3bb；生产零漂移不变。修：

- **C0**：mutants 判据改为每条 failureMessages **首行**匹配 `/^AssertionError(\b|:)|^expect\(/`；
  四向自测新增「普通 Error 内嵌 AssertionError 子串」「纯超时」拒绝反例。3 对照 + 8 针复跑全绿。
- **C1**：10 个新文件（含 JSON/config）Biome rc=0；机账同步最终树数字。
- **R09-1**：method 优先级改为同条件失败对照——503 网关下 Request(GET)+init(POST) 覆盖只调
  **1 次**且原 Response 身份透传（误判 GET 重试会变 2 次即红）；GET 对照 503→200 重试 2 次、
  新 Response 身份；小写 get 等价轴保留。
- **GA 隔离**：beforeEach 安装意外网络 fail-fast（window.fetch 拒绝）、afterEach 恢复——
  不宣称真实端点验证。
- 复跑：定向 25/25、全包 131 文件/2309 项（dev-panel 预存裁决一致）、tc rc=0、
  官方 fast 2271→2296 双 exit0。机器账 rework 节。

## GLM收窄返工回执（r3，2026-09-19，针对 Codex 返工复核 counter 31c8703f）

- **C0**：pinned 判据收紧为**精确且唯一目标**——`title` 全等 filter、命中恰 1（后缀冒名
  「other target」与重名双 target 均拒绝）、failed、非空、首行业务错误。运行态块与自测
  **共用**（AST 抽取两块拼接执行），补后缀冒名/重名/未失败/空消息/普通Error内嵌/纯超时
  反例；不再有独立 pinnedVerdict。
- **C1**：全部 JSON/SHA 回填后按 git 新增清单完整白名单 Biome rc=0（含 JSON）。
- 本批无业务残项（review 已关闭项保持）；复跑原负控 3+8 全绿；
  glm-nine-rework-witnesses 9/9 判据双反例拒绝、3 针 detected。
- 计数按 Codex 实测更正：定向 25。

## GLM收窄返工回执（r3，2026-09-19，针对 Codex 返工复核 counter 31c8703f）

- **C0**：pinned 判据精确唯一目标（全等+恰1+failed+非空+首行业务错误），运行态/自测共用
  AST 抽取块，补后缀冒名/重名反例。
- **C1**：全部回填后 10 文件白名单 Biome **rc=0 且零警告**（清理 unused imports、
  useConst/useTemplate、未消费变量；fetch-retry 移除未用 beforeEach）。
- 复跑：定向 25/25、tc rc=0、3 对照+8 针绿；rework-witness 9/9 判据拒绝。
