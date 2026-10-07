# TEST-GAME-MEDIA-LIFECYCLE-1 交付证据

- 卡:[TEST-GAME-MEDIA-LIFECYCLE-1](../../../ops/archive/tasks/done/TEST-GAME-MEDIA-LIFECYCLE-1.md) · Owner: GLM · 状态: done（已集成 main）
- 分支:`codex/glm-game-media-lifecycle-r1` · 冻结产品基点 `2f0fe6d2f0a4eb308febfbe6b787b4276b762b8d` · 派发提交 `a2447b5c9ec19ff52f48cf4d3200c1af3a1245b8`
- candidate / receiptHead 40 位 SHA 见 `identity.json` 与任务卡交付块;冻结源 sha256 建树时逐文件核验(见 `lib-isolated-tree.mjs`)。

## 逐轴结论(M1–M8)

| 轴 | 处置 | 一句话结论 |
|---|---|---|
| M1 | new-contract | 视频已 ended 收尾后原 play() 才 reject:`if (settled \|\| clickOverlay) return` 守卫生效,不重建点击重试层、不再次播放(avi-player.ts:140)。 |
| M2 | new-contract | 重试 play 结果迟于 ended:cleanup 自行 `removeClickOverlay()` 退休重试层,迟到 resolve 不重建 overlay、不再播放(avi-player.ts:98,136)。 |
| M3 | product-counter | **产品缺陷(真实红复现)**:首次拒绝 → 用户点击重试仍被拒后,catch 因 `clickOverlay` 非空早退不重建入口,overlay 的 `{once:true}` 监听已消费 → 后续真实 click 无任何可用重试入口,视频无法开始,仅跳过键可逃离。见 `repro-m3.json`(real-red-confirmed)。 |
| M4 | new-contract | 跳过 500ms 收尾窗口内的重复跳过键与 ended:`settled` 幂等守卫保证清理恰一次(pause 恰一次);窗口内 ended 立即收尾;残留定时器其后触发不触及下一段顺序视频(闭包隔离)。 |
| M5 | new-contract | 前段视频的迟到 play() reject 不抢下段所有权:curVideoEl 已在收尾解除、由下段重新登记;迟到 reject 后视频层恰 1 个、音量只作用当前视频、旧元素不再被触及。 |
| M6 | new-contract | 跨 chunk 缓存隔离:chunk A 加载失败只驱逐自己的 in-flight Promise(`get(chunkIdx) === p` 守卫),不驱逐 chunk B 成功缓存(复播 B 不重载)、帧数据不串。同 chunk 并发去重/失败后重试为旧证(rng-player.test.ts / rng-player.glm-next-wave.test.ts),不重复计新。 |
| M7 | new-contract | 成功帧乱序迟到 + 中间帧失败:`Promise.all` 保序 + `if (!frame) continue` 跳失败帧 → 显示序 [f0,f2]、末屏=最后成功帧;finally 归还 keydown 监听(结束后跳过键 `defaultPrevented === false`,事件须 `cancelable: true`)。 |
| M8 | new-contract | warm-up resolve 迟到:只 pause/remove 自己的临时 video(从未入 DOM),不触及正式播放的 video(不 pause、不移除、不打断)。立即 settle 两态为旧证(glm-next-wave),不重复计新。 |

合同账(轴 × 源码条件 × 输入 × 旧证 × oracle × 处置 × 新测试)逐行见 `contract-ledger.tsv`。

## 新增测试(7 合同,零产品改动)

- `packages/game/src/shell/avi-player.async-lifecycle.test.ts` — M1/M2/M4/M5/M8(5 合同)
- `packages/game/src/shell/rng-player.io-lifecycle.test.ts` — M6/M7(2 合同)

## 三态反控(`counterproof.json` + `mutation-logs/`)

`node run-counterproof.mjs` 重放(r3):判据先以 20 个合成反例自证拒收(双红/错名/缺 marker/非 AssertionError/exit0/执行集漂移/pending/unhandled + Codex 一审打穿的 signal 与额外零断言 failed collection suite + 二审打穿的**非空 suite.message**,另 spawnError/计数漂移/重复 suite/空执行集),再以 **3 例真实 Vitest 探针**实证(`mutation-logs/probe-*.raw|json`):目标单红 + afterAll 同步抛 `CODEX_EXTRA_HOOK_ERROR` → 拒收(suite.message 层)、目标单红 + afterAll 内异步 uncaught `CODEX_EXTRA_RUNTIME_ERROR` → 拒收(完整诊断层)、纯业务目标红 → 接受;随后四态 = 基线绿 7/7 → 7 针逐一(树内变异 → 恰一指定业务 AssertionError 红 6/1/7 → 还原 → 定向绿 7/7)→ 末次整套重放 7/7。每针记录 source/mutant/restored sha256 与每态完整回执(进程层 exit/signal/pid/spawnError + argv/cwd/env、计数、执行身份全表、完整失败文本、raw+JSON 双 sha256)。执行集 = 两文件 file×fullName 七行,四态逐字相同。

## Codex 二审 A-R2-01 闭合(r3)

- 每次子进程**双 reporter**:`--reporter=json --reporter=default --outputFile.json=<持久路径>`——native JSON 供身份/计数,同进程 default reporter 的完整 stdout(raw)揭示 `Unhandled Errors`/`Uncaught Exception` 段与钩子错误;不再以 JSON reporter 的静默输出(仅 "JSON report written")声称零 unhandled。
- 唯一判据新增拒收:**非空 `suite.message`**(vitest 把 afterAll 同步抛错写入 `testResults[].message`,实测目标单红时该字段非空而计数/明细自洽,r2 判据漏放——二审反例 #1)与增强全局异常模式 `Unhandled (Errors?|Rejection)|unhandledRejection|Uncaught Exception|uncaughtException`(二审反例 #2:异步 uncaught 只出现在 default reporter stdout,JSON 无痕迹)。
- 真实探针在两个工具内均运行(counterproof 与 M3 同门):P1 拒收依据 `suite.message non-empty`、P2 拒收依据 `unhandled-rejection-in-output`、P3 纯红接受;探针文件只在隔离树 `src/shell/__judge_probe__/` 生成、finally 删除。
- 绿态与纯红相位的 `suite.message` 实测恒空(既有 7 针 JSON 复核),新判据不误杀正常相位。

## M3 隔离复现(`repro-m3.json` + `repro-logs/`)

`node run-repro-m3.mjs`:mkdtemp 树生成 `repro-m3-dead-retry-entry.test.ts`,真实调用冻结产品 + 真实 DOM click,断言期望行为(第二次真实 click 应再次发起 play)→ 恰一红 real-red-confirmed。故意红输出独立命名 `repro-*`,不进默认 test。**不修产品、不写坏行为绿测**,交 Codex 裁决修复。r2:红形状 JSON 单列持久(`repro-logs/repro-m3.dead-retry.json`),含完整失败文本与 argv/cwd/env;生成测试自身也改 typed spyOn 原型 + afterEach 事件收尾。

## Codex 一审 A-R1-01～04 闭合(r2)

- **A-R1-01**:rng 测试改用真实 `canvas.getContext('2d')`(非空检查)+ typed `vi.spyOn(ctx, 'putImageData')` 记录并转发真实绘制;删除 `Object.create(proto)` 原型伪装与 `as ImageData` 参数强转,M7 序列 oracle 直接读原生 ImageData。
- **A-R1-02**:avi 测试 play/pause 改 typed `vi.spyOn(HTMLMediaElement.prototype, …)`(restoreAllMocks 恢复真实 jsdom 实现,不再裸赋值);测试受控 deferred 登记 `settled` 标志,afterEach 双路径收尾——正常路径用例自 settle;提前断言失败路径经公开事件(ended)收妥在途播放器 → settle 残留 deferred → `runAllTimersAsync` 排空 → 恢复端口与 DOM。`counterproof.json.earlyFailureCleanup` 记录举证:各针红态即「断言中途失败且资源在途」的真实采样(N-M2 带在途重试 deferred+overlay,N-M8 带在途正式播放器+warm-up deferred),同进程后续 6 测试全绿 + 判据强制零 unhandled/零 collection 错误 = 无状态泄漏。
- **A-R1-03**:唯一判据(四态同门)新增拒收:非空 signal、spawnError、suite 条目数≠期望文件数/逐文件非唯一(隐藏与身份漂移)、零断言 failed suite(collection/runtime 错误)、report 计数与明细不一致。Codex 打穿的两反例(signal=SIGTERM、额外零断言 failed collection suite)连同 spawnError/计数漂移/重复 suite 等共 **18 例拒收自测**(`mutation-logs/judge-selftest.raw`),先于真实针运行。建树任一步失败也先删本次树再抛。vitest 4 JSON reporter 的 `numTotalTestSuites` 按 file+describe 双计(实测 1 文件=2),属 reporter 内部记账,不直比;suite 身份由 testResults 条目与逐文件唯一性保证,失败 suite 数用语义约束(绿=0,红≥1)。
- **A-R1-04**:每态持久保存真实 JSON(biome 定稿后按最终字节计 sha)+ raw + 执行身份(file :: fullName :: status 全表)+ 完整失败文本(不截断)+ argv/cwd/env/exit/signal/pid/spawnError;M3 红形状独立单列;`persistJson` 写入后经 biome format 定稿,后续 lint 零字节改动(实测 hash 复核全一致)。

## 质量门回执(r3,最终字节重采)

| 门 | 结果 | 证据 |
|---|---|---|
| 定向(两新文件) | 7/7 | `directed.raw` |
| 相邻媒体旧测(9 文件) | 58/58 | `adjacent.raw` |
| game 全量 `env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/game test` | 311 文件 / 3519 测试全过 | `full-test.raw` |
| game typecheck | 0 错 | `typecheck.raw` |
| 根 `pnpm lint` | 3505 文件 0 error / 0 warning / 0 info | `lint.raw` |
| `pnpm check:docs` | **恰 1 项 FAIL(docs 尾巴,见下)** | `docs-gate.raw` |
| `git diff --check` | 干净 | (命令回执 exit 0) |

- docs 尾巴:`docs/ops/evidence/README.md:1 子目录未进入导航:docs/ops/evidence/TEST-GAME-MEDIA-LIFECYCLE-1`。r1 时本目录未提交(untracked)故 check:docs 只扫已跟踪文件而 PASS;r1 候选提交后目录成为已跟踪文档,导航门要求共享索引登记。该索引(`docs/ops/evidence/README.md`)在本卡白名单中为**只读共享文件**,贡献者不得改;与 TEST-GLM-REFORGE-BATTLE-PREVIEW-BINDING-1 同款冲突先例,登记为唯一遗留项,由 Codex 集成时一行登记收口。

## 环境与复现注记

- 全量测试首跑曾红 `src/dev/dev-panel.test.ts`(ENOENT `data/extracted/data/enemy-teams.json`):新工作树缺 gitignored 数据,已从主仓软链 `data/extracted` 与 `data/raw/*`(README/bdf 为 tracked 未动),软链后 3519/3519 全绿。非测试回归,基点同因。
- 隔离树根固定 `/tmp`:macOS `os.tmpdir()`(/var/folders)下 vite server.fs.allow 拒绝软链 node_modules,表现为静默 0 tests;/tmp 正常。树内须同时软链根 `node_modules` 并补 `tsconfig.base.json`(game tsconfig 的 `extends ../../tsconfig.base.json` 断链同样导致静默 0 tests)。
- `docs/ops/evidence/README.md` 共享索引为只读白名单外文件,本卡目录未登记,留 Codex 集成时补。

## 观察登记(不计数,交 Codex)

- U-1(行为观察,M4 衍生):跳过键按下后视频在 500ms 窗口内继续播放,若自然 ended 到来则立即收尾,DL27 半秒缓冲被截短;sdlpal aviplay.c:741-747 的 UTIL_Delay(500) 是无条件延迟。本卡不改行为、不判缺陷,仅登记差异供裁决。
- U-2(M3 缺陷范围):缺陷期间 overlay 常驻且死亡,但 skip 键仍可逃离;后续 playAvi 有独立闭包不受污染,其自身收尾时会移除本段 overlay。影响面 = 单段视频无法经点击开始。
