# TEST-GAME-MEDIA-LIFECYCLE-1 — 视频与RNG异步收尾及资源所有权

Status: rework
Owner: GLM（独立对话A，唯一写入者）
Reviewer: Codex（独立验收）
Phase: phase1
Capability: shell-media / async-lifecycle
Visual Verification Timing: N/A（本卡核异步与资源合同，不宣称浏览器自动播放或剧情观感验收）

## 目标与有限范围

核查真实媒体调用链中迟到的播放结果、重试、输入与缓存所有权；只给旧测尚未充分证明的合法合同补原子测试。本卡不设用例数量、反控数量或覆盖率增量指标。以下清单逐项有裁决即结束，不滚动追加其它模块。

| 轴 | 本轮必须回答的问题 | 合法入口与可观察证据 |
|---|---|---|
| M1 | 视频已经 ended/error/按正常跳过键完成后，原 play Promise 才 reject，是否重新产生重试层或残留监听？ | `playAvi`、真实DOM事件、延迟媒体IO Promise；Promise完成与DOM/监听收尾 |
| M2 | 首次播放被拒绝，用户重试成功但播放结果迟于结束，重试层是否仍正确退休？ | overlay真实click、真实ended/error；不直接调用内部cleanup |
| M3 | 用户第一次重试仍被拒绝时，后续真实click是否仍有可用重试入口？ | 连续合法媒体拒绝与实际click；如产品不满足，交隔离反例，不写“坏行为应如此”的绿测 |
| M4 | 默认跳过键的延迟收尾期间收到重复按键/ended/error，会不会重复完成、遗留定时器，或干扰下一段顺序视频？ | bootstrap的顺序await调用；不得制造无真实caller的并发双播放器契约 |
| M5 | 前一视频的迟到结果与下一视频的音量设置/DOM所有权是否隔离？ | 顺序`playAvi`与公开`setVideoVolume`；当前视频实际volume与层数量 |
| M6 | 同一RNG chunk的并发读取有一份真实IO，失败后可重试；不同chunk不会共享失败或帧数据？ | 公开fetchManifest/fetchFrame边界，真实解码/帧渲染；先对照已有缓存合同 |
| M7 | 请求帧部分失败、成功帧迟到时，是否保持成功帧的顺序与最后帧内容，并归还输入监听？ | 合法manifest/frame输入、真实framebuffer内容与监听；不mock解码业务 |
| M8 | warm-up的resolve/reject迟到时，是否清理自己的临时video且不触及正式播放的video？ | `main.ts`手势调用+公开warm-up；仅IO调度可控，不把jsdom当自动播放权限实测 |

每轴标 `existing-proof / new-contract / product-counter / unreachable / blocked`。existing-proof必须给旧文件fullName和实际断言行；unreachable必须给caller和输入约束。M6的同chunk去重/失败后重试、普通跳过/error/音量钳制已有测试，不准换名称或值重复计新。

## 路由与白名单

- 工作树：`/private/tmp/type-pal-game-media-lifecycle`。
- 分支：`codex/glm-game-media-lifecycle-r1`。
- 派发产品基点/冻结：`2f0fe6d2f0a4eb308febfbe6b787b4276b762b8d`；在含本卡的派发提交上工作。交付写全40位base/testCandidate/receiptHead并用Git对象核实；后续docs-only区间单列，不rebase到漂移产品。
- 仅可写：本卡贡献者交付/自验块；`packages/game/src/shell/avi-player.async-lifecycle.test.ts`、`packages/game/src/shell/rng-player.io-lifecycle.test.ts`；新专属fixture目录`packages/game/src/shell/__tests__/media-lifecycle/`；`docs/ops/evidence/TEST-GAME-MEDIA-LIFECYCLE-1/`。
- 产品、旧测、共享fixture、配置、依赖/锁文件、官方基线、真实PAL资产与用户数据、共享索引/看板均只读。不写其它卡。不合main、不标done、不删分支。
- 缺陷只能在专属证据目录放按需运行的隔离复现工具；工具在mkdtemp树生成临时测试并真实调用产品。不得把预期失败纳入默认test，不得skip/xfail，不得以复刻算法代替产品执行。

## 前提与锚点

Codex已读真实实现及旧测。此卡不改变第一阶段机制、媒体键语义或用户行为，故原版公式/剧情真值N/A；涉及新行为取舍或产品修复即停受影响轴交Codex。

- [项目纪律](../../../CLAUDE.md)、[一阶段经验](../../phase1/engineering-notes.md)、[测试质量验收](../agent-workflow.md)。
- `packages/game/src/shell/avi-player.ts`：`playAvi`的settled收尾、play结果及一次性click重试；`warmUpVideoAutoplay`、`setVideoVolume`。
- `packages/game/src/shell/rng-player.ts`：公开IO端口、chunk Promise缓存、失败驱逐、帧预取与finally收尾。
- caller：`packages/game/src/main.ts:52`；`bootstrap.ts:980,1266,1414,1463,1607,1751,1847`。
- 先完整排重：`avi-player.test.ts`、`avi-player.glm-next-wave.test.ts`、`rng-player.test.ts`、`rng-player.glm-next-wave.test.ts`及同目录其它相关测试/已接收候选；不得只搜索测试标题。
- 标准`ServiceWorker.ready`不会reject（[规范](https://w3c.github.io/ServiceWorker/#navigator-service-worker-ready)），不属于本卡，不伪造该拒绝“补覆盖”。

| 冻结源 | SHA256 |
|---|---|
| `packages/game/src/shell/avi-player.ts` | `3f2160c810d1205295af465410d730442b1ee06eed2b9750a28181d9cf61796b` |
| `packages/game/src/shell/rng-player.ts` | `551dde0f5f3e8d90d8c3f260dad37e50239b81fc12185ac81944a3f833b039ae` |
| `packages/game/src/shell/bootstrap.ts` | `3dd355d3d9314bbd42e48ec6965bc04d48942f2dbd60ca7a536fe997438fa596` |
| `packages/game/src/main.ts` | `f4add3675f3d1b5e9205058d4403face28e0d068a9fb5ec584b1a41b0aa30e64` |

## 交付与验证

- 专属证据入口`README.md`，合同账`contract-ledger.tsv`：轴、源码条件/caller、输入、旧file/fullName/断言、精确oracle、处置、新测试file/fullName；不要模板占位或数量充账。允许全部existing-proof而零新增。
- 一个it只验证一个可证伪合同；同合同必要结果可联断，不拼多条独立输入。只控制DOM/网络/媒体IO与时间，typed spy；无业务核心mock、双桥、ignore、私有状态/新增后门、扩timeout。
- 有新增合同时，按独立行为边界选择最小业务变异。三态JSON/raw、退出码/signal/spawn、完整file×fullName多重执行集、指定单一AssertionError与恢复绿、源/测试/mutant/恢复hash齐备。全态执行集相同，零pending/todo/skip/collection/runtime/unhandled；无新合同不造针。先核判据真实拒收反例，不能只看exit/count。
- 变异只在本次mkdtemp隔离树进行，finally仅清本次树，记录清理证明；不得在贡献者树修改冻结产品后声称已恢复。相同合同不为每个数字重复变异，不每针跑全仓。
- 每阶段跑新测试和相邻媒体旧测，输出JSON与stderr；交付前一次`env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/game test`与`typecheck`、根`pnpm lint`（完整error/warning/info=0）、`pnpm check:docs`、`git diff --check`。未知警告不得压制；先记录基点同命令对照。
- 复现缺陷的故意红输出独立命名`repro-*`，与绿门分列，不冒称全部通过。遗留产品问题不授权夹修。全量源码diff核产品/旧测零改动；覆盖仅可作定位附件，不是accept依据，不更新官方基线。

## 当前模式推进记录

- 2026-10-06 Codex：有限M1–M8、真实入口与排重前提已核；**build allowed仅限测试/隔离诊断白名单**。实现产品/媒体行为改动未准入。
- 贡献者交付/自验：pending。
- Codex独立验收：pending；done准入：blocked（待独立核合同、证据与质量门）。
- 用户产品裁决：N/A（本轮无产品行为变化）；发现新取舍另列counter。

## 初始派发提示词（历史，当前以文末返工为准）

```text
你是TEST-GAME-MEDIA-LIFECYCLE-1唯一执行方。只在/private/tmp/type-pal-game-media-lifecycle、codex/glm-game-media-lifecycle-r1工作。先读AGENTS.md、CLAUDE.md、docs/ops/agent-workflow.md和docs/ops/tasks/TEST-GAME-MEDIA-LIFECYCLE-1.md，再逐字读卡内源码/caller与旧断言。只完成M1-M8，先排重分类，真正缺失的合法合同才补少而精的原子测试；产品不满足就交隔离真实红反例，不修产品或把坏行为写成绿测。按白名单、冻结、typed IO、严格三态与清理证明交付；零诊断，完整SHA提交推送。所有轴有证据即停，卡面只写你的交付块；不合main、不done、不扩围。返回候选SHA、逐轴结论、门禁/缺陷及剩余风险，等待Codex验收。
```

## Codex 独立一审与有限返工（2026-10-07）

**counter，尚未集成。** 固定测试/证据提交 `24b35f4bccafca5422e3d4133834c439451b8194`，含回执 HEAD `8fe49e9980990249de0d24cc1dfc71e5bb973168`；本节引用的代码行均属该候选，不是 main 已接收代码。分支与远端一致、树干净；派发 `a2447b5c9ec19ff52f48cf4d3200c1af3a1245b8`、产品冻结不变。4/4 产品哈希独立复算一致，未改产品/旧测，diff 在原白名单。

独立复跑：使用候选 `buildIsolatedTree` 的本次独占临时树执行两文件，**7/7 passed，exit 0、signal null、pending/todo 0、无 unhandled 输出**；finally 已删除该树。全包、typecheck、根 lint/docs 是作者交付证据，本审因以下决定性 counter 未重复跑重门，不将其写成独立通过。

| 编号 | 固定候选中的问题与直接证据 | 必须闭合的有限改动 |
|---|---|---|
| A-R1-01 | `rng-player.io-lifecycle.test.ts:39-44` 经 `Object.create(proto)` 的 any 返回值伪装完整 2D context；`:154` 再强转调用参数。拥有真原型不等于真实 Canvas 实例。 | 使用真实 jsdom `canvas.getContext('2d')`，非空检查与 typed `spyOn` 记录/转发真实 `putImageData`；帧业务 oracle 保留，不造部分假实例、不绕类型。 |
| A-R1-02 | `avi-player.async-lifecycle.test.ts:50,54` 直接覆盖 media 原型；`:108` 的 `restoreAllMocks` 不能恢复普通赋值。提前断言失败时只删 DOM 不等于清理播放器监听/在途 Promise；M3 生成 repro 同样直接覆盖。 | typed spy 或精确 descriptor 恢复；finally 经公开事件完成本次播放器、settle 自己的 deferred/定时器并恢复端口。正常及提前失败两条清理路径举证，不改旧测。 |
| A-R1-03 | 对**候选实际导出的** `judgeRed` 独立运行合成反例：`signal=SIGTERM`；指定业务红外追加零 assertion 的 failed collection suite。两例均返回 `problems=[]`，被误收。`runVitestJson` 不记录 spawnError，suite/harness 错误缺校验。 | 唯一判据检查非空完整 file×fullName 多重集合、全部状态/计数、suite collection/runtime、JSON 与 raw 未处理错误、exit/signal/spawn；绿/红/恢复/末次重放同判据。上述反例加入真实拒收自测。建树中途失败也清本次树。 |
| A-R1-04 | `run-counterproof.mjs:221-300` 原始相位 JSON 位于临时树，cleanup 后消失；回执仅计数与截断 120 字的失败，raw 只是 reporter 公告。M3 同样删了其 JSON。 | 保留真实三态 JSON、完整失败文本、file/fullName/status、raw、实际 argv/cwd/env/退出信息及文件哈希；raw 公告合法，不要求它重复 JSON 正文。M3 红形状独立保存。 |

M1–M8 有限范围不增加；现有排重与 M3 缺陷诊断方向保留，但证据闭合后才可 accept。不要求新增用例/针数。fixture/测试字节改变后，只重采引用这些最终文件的受影响证据；不能把旧 test hash 配给新代码。全部完成后跑原卡定向/相邻与最终门禁，原始零诊断报告保留；产品修复未授权。

本次**审核记录**门已独立通过：`pnpm check:docs`（全部子门）、`pnpm lint`（3474 文件、0 error/warning/info）及 `git diff --check`。这些是 main 的审核文档门，不是候选产品测试包 accept。

### 下一位 Agent 提示词（r2，人工选 GLM-5.3）

```text
你是 TEST-GAME-MEDIA-LIFECYCLE-1 原 Owner，继续原树 /private/tmp/type-pal-game-media-lifecycle、原分支 codex/glm-game-media-lifecycle-r1。先 git fetch origin，然后只读 git show origin/main:docs/ops/tasks/TEST-GAME-MEDIA-LIFECYCLE-1.md 的 2026-10-07 Codex 一审；不要 rebase 到漂移产品。固定 r1 HEAD 8fe49e9980990249de0d24cc1dfc71e5bb973168，原冻结/白名单/M1-M8不变。一次闭合 A-R1-01～04：真 2D context+typed spy；media 原型与提前失败时播放器/deferred/监听/计时器真实恢复；唯一判据拒收信号、spawn、额外 collection/runtime、隐藏状态及执行身份漂移，并有同判据拒收自测；保留完整三态 JSON/raw/失败文本/执行身份/argv/cwd/env/hash，M3 单列红反例，建树失败也 finally 清本次树。保留已有业务合同与排重，不堆用例，不修产品/旧测/配置/共享文档。源或测试变化只重采受影响针；最终定向+相邻、全包/typecheck、lint/格式0/0/0、docs/diff完整交付。只写自己的交付块，提交推送完整候选SHA及docs-only区间；不合main、不done、不扩围，等待Codex二审。
```

## Codex 独立二审与最后判据窄返工（2026-10-07）

**counter，仅剩 A-R2-01；未集成。** 固定 r2 测试/证据提交 `4fb3edabfd0047a32422a0fa8cfa02b61030e24a`，含回执 HEAD `33db7a932dd4bf257c4bb9da7d238c3df4548864`。分支/远端一致、树干净；尾巴仅 identity.json。全 diff 在白名单，4/4 冻结源独立复算相同；产品、旧测、共享配置零改动。

已核关闭：A-R1-01 的真实 jsdom 2D context、typed passthrough spy；A-R1-02 的 typed media 原型恢复与 AVI deferred/事件/计时器收尾；A-R1-04 的持久三态 JSON/raw、完整身份/错误文本/哈希与隔离建树失败清理。A-R1-03 的 signal/spawn/空集/额外 collection suite/身份部分已修，但“无额外运行错误”仍未闭合，不把18个自测全绿当完整证明。已有业务合同、排重与 M3 缺陷方向不重开。

Codex 在本次独占复制树保持候选产品/测试字节，独立跑原反控工具：基线7/7、七针各指定业务单红与恢复7/7、末次7/7，工具退出0、临时树 removed=true；M3 实跑 exit1、0 passed/1 failed/1 total、指定入口断言红且 removed=true。上述是业务变异/产品反例可复现，不是严格判据 accept。未重复全包/typecheck/候选lint/docs重门；作者回执仍标作者证据。

| 编号 | 实际反例与根因 | 最后有限改动 |
|---|---|---|
| A-R2-01 | `lib-isolated-tree.mjs` 的 `judgeCommon` 仅以 failed suite 是否有 failed assertion 判健康，不读取非空 `suite.message`。独立实际 Vitest：一个指定 `expect(1).toBe(0)` 红，再在 `afterAll` 抛 `Error('CODEX_EXTRA_HOOK_ERROR')`；exit1、total1/failed1、suite.message=`CODEX_EXTRA_HOOK_ERROR`，调用候选实际 `judgeRed` 得 `problems=[]`。另异步 uncaught 同样被收；JSON reporter 原始输出仅“JSON report written”，没有未处理异常详情，`:161` 的 raw regex 无法证明零unhandled。 | 唯一判据保留并拒收 suite/hook/runtime 错误；每次实际子进程采集可识别全局异常的原始诊断并与该次 native JSON 联判，不依赖纯JSON reporter静默。新增这两种实际 Vitest 拒收自测，纯业务红仍须接受。M3同步用同门，不改产品/正常测试/针的业务合同。 |

最小判据探针（不是业务新测，只在 Codex 仓库外复制树生成；原工具函数逐字读取后调用）：

```ts
import { test, expect, afterAll } from 'vitest'
test('CODEX target', () => { expect(1).toBe(0) })
afterAll(() => { throw new Error('CODEX_EXTRA_HOOK_ERROR') })
// 第二次用此行替换 afterAll，等待异常实际被Vitest记录：
// afterAll(async () => { setTimeout(() => { throw new Error('CODEX_EXTRA_RUNTIME_ERROR') }, 0); await new Promise(resolve => setTimeout(resolve, 30)) })
```

JSON reporter未包含全局错误字段这一事实本审实测成立；不能通过读取不存在的字段修门，也不能把退出码1当“业务红且无其它错误”。可同一子进程双reporter或等价完整诊断采集；不要求raw复制所有fullName，完整身份仍以native JSON为准。因采集改变重出相关相位，不重新扩张七针/七合同数量。原冻结、白名单、范围及产品停止线不变。

本次**审核记录**质量门独立通过：`pnpm check:docs` 全部子门、根 `pnpm lint`（3474 文件，0 error/warning/info）、`git diff --check`。仅审核文档收口，非候选统一质量门或集成 accept。

### 下一位 Agent 提示词（r3，人工选 GLM-5.3）

```text
你是 TEST-GAME-MEDIA-LIFECYCLE-1 原 Owner，使用原树 /private/tmp/type-pal-game-media-lifecycle、分支 codex/glm-game-media-lifecycle-r1。先 git fetch origin，只读 origin/main 本卡最新二审；不要 rebase 漂移产品。r2 HEAD 33db7a932dd4bf257c4bb9da7d238c3df4548864。原冻结/白名单/M1-M8不变；真实context、typed媒体spy及收尾、三态JSON持久化已核，不重开、不加正常测试。只修 A-R2-01：judgeCommon 必须保留并拒收非空 suite.message/额外hook或runtime错误；JSON reporter 单独运行看不到全局未捕获异常，不得据静默raw声称零unhandled。为每次实际子进程同时保留native JSON和能揭示hook/Unhandled Errors/Uncaught Exception/Unhandled Rejection的原始诊断（可同进程双reporter），同一唯一判据核完整身份/计数/状态/唯一目标AssertionError并拒额外错误。用实际Vitest验证“目标单红+afterAll抛Error”和“目标单红+afterAll内异步uncaught”都拒收，正常纯红仍接受；M3也用同门。保留合同/fullName/业务针不变，只因诊断采集变化重出7针及M3受影响相位，清理仍仅本次mkdtemp。最后按卡跑定向相邻/全包/typecheck、lint格式0/0/0、docs/diff；docs仅允许原缺共享导航项，禁止改共享文件。完整SHA提交推送并列docs-only尾巴，不合main、不done、不扩围，等待Codex终审。
```
