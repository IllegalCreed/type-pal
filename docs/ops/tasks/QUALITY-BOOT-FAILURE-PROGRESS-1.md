# QUALITY-BOOT-FAILURE-PROGRESS-1 — 启动失败后的进度所有权

Status: done
Owner: Codex
Phase: phase1 game / boot lifecycle
Capability: PROD boot failure progress ownership
Coding Owner: Codex（单一写入 Owner）
Generation Owner: N/A（无资源生成）
Reviewer: Codex（源码与真实公开模块组合复核，不冒充浏览器验收）
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional
Contributor: Codex
Branch: codex/code-quality-3y

## 目标

修复第一阶段 PROD+SW 必要资源阶段失败后的进度所有权：启动失败提示不能被迟到的资源进度覆盖，计数包装和回调应按本轮 ownership 释放。用户已批准本卡窄修，不改变进入游戏门、重试策略、资源请求取消、UI形态或公共API。

## 2026-10-23 当前收口

原批准窄缺陷已闭合。3i窗口以原291b7b59d完整SHA的当前版本桥核PROD catch清理顺序、fetch所有权/代次及UI失败终态；上游本地化新增语言订阅另核，未冒称全部源码同字节。复用原四正式红绿与中文真实PROD404/迟到200/正常按钮入场及已查看截图；当前52定向/61相邻与完整check20601+692、official20172/774及同报告strict/protected项目零诊断成立。详见[当前收口](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3i-dialog-precache/quality-closeout/README.md)。不授新英文/离线/intro视觉或main/bootstrap整文件信用；任务保持稳定原路径，下面review/未跑为历史。远端PR发布按实际后继回执。

## 当前准入（2026-10-18，历史）

- 用户对“失败提示保持，同时停止本轮 fetch 计数和进度回调；正常启动、进入游戏和其它网络请求保持原行为”回复“批准按此修复（推荐）”。此前 draft/冻结记录仅为历史状态。
- Codex 核前提与真实 caller 后记 `build allowed`；Coding Owner 为 Codex，沿用 `codex/code-quality-3y` 隔离树，基点 `308f517e6e4bbcb637659bc45b28240ec25238d1`，同步后落后 origin/main 为0。
- 实现白名单：`main.ts` 失败分支清理、`shell/precache-ui.ts` 失败进度终态、`shell/boot-loading.ts` 本轮计数/包装释放；测试白名单为相邻 boot-loading/precache-ui 测试。源码改前先落失败反例；任务卡、72证据、账本和看板同批写回。
- 验收：真实模块与 typed fetch 的旧红新绿、其它 fetch 层所有权与在途请求、正常进入/widget 正控；定向/相邻测试、game typecheck、文档与 lint 零诊断。全仓 check、官方 coverage ratchet、protected fast 留到大任务收尾，不在本次小修中重复执行。
- 真实 PROD 入口故障注入的功能/视觉结果单独登记；逻辑测试不能冒充该项通过。

## 范围

- 待核实现：`packages/game/src/main.ts` 的 PROD bootstrap catch、`shell/precache-ui.ts` 的 fail/进度状态、`shell/boot-loading.ts` 的恢复边界。
- 只读caller：`shell/bootstrap.ts`、`shell/bootstrap-resources.ts`、`assets/loader.ts` 的并行资源屏障与 onPlayable 时序。
- 范围外：SW cache/manifest/版本、asset pipeline、存档、剧情、二阶段、网络重试器和用户进入游戏后的widget行为。

## 前提真值门

### 一句话行为 / 工程前提

修前：必要资源尚未到 onPlayable 时，bootstrap 可因一个资源失败而拒绝，另一请求仍在途；main 的 PROD catch 只调用 ui.fail，没有释放 boot fetch 回调，UI也没有终态门。当前窄修与实证见下文。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary | 这是项目自有浏览器启动能力，SDLPal无同形UI；当前公开UI接口将 fail 定义为覆盖层改显启动错误 | `shell/precache-ui.ts:39-42,126-131,178-187`；真实模块组合 [红例](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/72-boot-loading/failure-repro.json) |
| 第一阶段修前 | PROD init 把计数交给UI；成功onPlayable释放计数；PROD catch只有ui.fail，fallback catch另调failBootLoading | `main.ts:40,58-70,73-80`；`shell/bootstrap.ts:245-249,1882-1883`；`shell/bootstrap-resources.ts:56-65`；`assets/loader.ts:162-182` |
| 当前二阶段 | N/A；不涉及Reforge、editor或content合同 | 本卡范围只含phase1 game |
| 本任务目标 | 失败后错误文案保持；只释放本轮拥有的包装/回调，成功/未进入/进入后状态分别保留 | 用户已批准；按当前准入白名单实现 |

### 反证与替代解释

最强替代解释是失败只发生在onPlayable之后，necessary回调已经停止。源码的并行resourcesReady和loadAll Promise.all支持可玩前失败；真实公开组合在该时序下把“启动失败:主资源加载失败”覆写成“加载必要资源 50%”。若真实入口总在失败前释放回调，或失败后所有请求被取消，本前提应重新核定；目前源码没有这些路径。

反例没有mock bootstrap或进度状态核心，仅以typed fetch IO替身控制请求完成，并使用真实boot-loading/precache-ui。它证明模块组合和对应DOM文本，不是完整main运行、真实HTTP失败或截图验收；错误类/条宽未在该红例中断言。

### 用户可见偏离

- 预期保持既有失败提示合同，不增加产品形态；但属于用户可见错误路径，依用户停止线先开高风险卡。
- before → after候选：失败文案被迟到必要进度覆盖 → 错误状态保持、计数回调停止。是否同时取消网络不属于本卡默认方案。
- 代表场景：首次PROD资源并行加载，一项失败而另一项稍后完成。
- 用户裁决与生产build准入：已批准，见当前准入；范围外变化重新停线。

## 上下文锚点

先读AGENTS、CLAUDE、CODE-QUALITY-72、`docs/phase1/engineering-notes.md` 的SW两段进度节及实际入口。与 QUALITY-FETCH-ABORT-LIFECYCLE-1 的重试/取消所有权分开；不得借本卡取消其它Owner请求或改重试器。

## 验收条件

- 功能：可玩前失败后迟到fetch/SW进度不改错误文本；释放仅属于本轮的包装/回调；正常进度、onPlayable与进入游戏不回归。
- 测试：合法typed IO，真实公开模块；明确错误终态、成功正控、迟到完成、清理和隔离；旧红新绿，保留恰一业务AssertionError反控。
- 文档：本卡、72复审、账本与看板一致；全仓零诊断和模块收尾门后才能集成。
- 视觉：已实跑真实PROD入口受控HTTP404/迟到200并查看截图，错误提示稳定；仅本卡窄功能信用，不冒充SW ready/离线或全游戏E2E。

## 初次取证记录（历史 draft）

- Codex范围：只读取证；单一治理worktree，生产三文件冻结。
- 前提：公开模块组合红例已证；完整main/HTTP现场仍待核。
- 方案/产品裁决：pending，不以父治理目标泛化为生产build allowed。
- done：blocked；并非暂停整个治理goal，可继续其它pre-94有限批次。

## Draft 设计与风险（历史）

候选方向为错误终态保护与入口失败清理；先核在进入前/后、SW不可用、onPlayable、迟到完成等状态的准确责任。不得盲目恢复全局fetch覆盖后安装网络层，不增加fallback/重试开关，不改缓存/生成物。

## Build / Review / 用户验收

用户批准后已实现最小修复：main失败释放本轮计数，UI失败进度终态，fetch释放保留后来Owner且迟到请求不污染新轮次。四条旧实现指定单红→正式相邻6文件58绿，原组合红例精确重放1绿，game typecheck通过。真实PROD入口404/迟到200的前后对照、fetch释放和错误稳定、正常onPlayable按钮/进场均实跑并查看截图，证据见[批准后修复](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/72-boot-loading/approved-fix/README.md)。未测试正常视频/剧情、真实离线协议；不改UI形态/接口/进入门或取消网络。

当前review，功能窄修完成，未通过本候选统一集成门；全仓check/官方ratchet/protected fast按用户要求留大任务收尾。47–52旧通过信用已撤回，不能沿用或据此done/合main。

## 交接日志

- 2026-10-18 Codex：CODE72逐文件复审发现并用真实模块复现。native/raw、spec gzip、source SHA、exit/signal/spawn和清理见[72证据](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/72-boot-loading/README.md)。主入口/UI/boot-loading均未改；下一步核生产build准入后再写失败反例及最小修复。

## 下一位 Agent 提示词

无下一位 Agent 提示词；Codex单Agent按当前准入继续，旧冻结描述不覆盖本轮明确批准。

- 2026-10-18 Codex：收到用户明确批准后按当前准入完成三源窄修与四反例；原生相邻58绿、精确原红重放1绿、实际PROD失败/正常进场和截图核验完成。状态review，统一门/合并仍未收口；源码头注释另提交cee6cee69，未混入主工作树。
