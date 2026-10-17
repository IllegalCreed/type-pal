# QUALITY-BOOT-FAILURE-PROGRESS-1 — 启动失败后的进度所有权

Status: draft
Owner: Codex
Phase: phase1 game / boot lifecycle
Capability: PROD boot failure progress ownership
Coding Owner: Unassigned（生产实现冻结）
Generation Owner: N/A（无资源生成）
Reviewer: Codex（源码与真实公开模块组合复核，不冒充浏览器验收）
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional
Contributor: Codex（只读取证）
Branch: codex/code-quality-3y

## 目标

核定并修复第一阶段 PROD+SW 必要资源阶段失败后的进度所有权：启动失败提示不能被迟到的资源进度覆盖，计数包装和回调应按本轮 ownership 释放。当前只登记直接反例，未授权修改生产，不改变进入游戏门、重试策略、资源请求取消、UI形态或公共API。

## 范围

- 待核实现：`packages/game/src/main.ts` 的 PROD bootstrap catch、`shell/precache-ui.ts` 的 fail/进度状态、`shell/boot-loading.ts` 的恢复边界。
- 只读caller：`shell/bootstrap.ts`、`shell/bootstrap-resources.ts`、`assets/loader.ts` 的并行资源屏障与 onPlayable 时序。
- 范围外：SW cache/manifest/版本、asset pipeline、存档、剧情、二阶段、网络重试器和用户进入游戏后的widget行为。

## 前提真值门

### 一句话行为 / 工程前提

必要资源尚未到 onPlayable 时，bootstrap 可因一个资源失败而拒绝，另一请求仍在途；main 的 PROD catch 只调用 ui.fail，没有释放 boot fetch 回调，UI也没有终态门。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary | 这是项目自有浏览器启动能力，SDLPal无同形UI；当前公开UI接口将 fail 定义为覆盖层改显启动错误 | `shell/precache-ui.ts:39-42,126-131,178-187`；真实模块组合 [红例](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/72-boot-loading/failure-repro.json) |
| 第一阶段 | PROD init 把计数交给UI；成功onPlayable释放计数；PROD catch只有ui.fail，fallback catch另调failBootLoading | `main.ts:40,58-70,73-80`；`shell/bootstrap.ts:245-249,1882-1883`；`shell/bootstrap-resources.ts:56-65`；`assets/loader.ts:162-182` |
| 当前二阶段 | N/A；不涉及Reforge、editor或content合同 | 本卡范围只含phase1 game |
| 本任务目标 | 失败后错误文案保持；只释放本轮拥有的包装/回调，成功/未进入/进入后状态分别保留 | 目标待build准入；不能用本卡draft直接实施 |

### 反证与替代解释

最强替代解释是失败只发生在onPlayable之后，necessary回调已经停止。源码的并行resourcesReady和loadAll Promise.all支持可玩前失败；真实公开组合在该时序下把“启动失败:主资源加载失败”覆写成“加载必要资源 50%”。若真实入口总在失败前释放回调，或失败后所有请求被取消，本前提应重新核定；目前源码没有这些路径。

反例没有mock bootstrap或进度状态核心，仅以typed fetch IO替身控制请求完成，并使用真实boot-loading/precache-ui。它证明模块组合和对应DOM文本，不是完整main运行、真实HTTP失败或截图验收；错误类/条宽未在该红例中断言。

### 用户可见偏离

- 预期保持既有失败提示合同，不增加产品形态；但属于用户可见错误路径，依用户停止线先开高风险卡。
- before → after候选：失败文案被迟到必要进度覆盖 → 错误状态保持、计数回调停止。是否同时取消网络不属于本卡默认方案。
- 代表场景：首次PROD资源并行加载，一项失败而另一项稍后完成。
- 用户裁决与生产build准入：pending；当前不得直接实现。

## 上下文锚点

先读AGENTS、CLAUDE、CODE-QUALITY-72、`docs/phase1/engineering-notes.md` 的SW两段进度节及实际入口。与 QUALITY-FETCH-ABORT-LIFECYCLE-1 的重试/取消所有权分开；不得借本卡取消其它Owner请求或改重试器。

## 验收条件

- 功能：可玩前失败后迟到fetch/SW进度不改错误文本；释放仅属于本轮的包装/回调；正常进度、onPlayable与进入游戏不回归。
- 测试：合法typed IO，真实公开模块；明确错误终态、成功正控、迟到完成、清理和隔离；旧红新绿，保留恰一业务AssertionError反控。
- 文档：本卡、72复审、账本与看板一致；全仓零诊断和模块收尾门后才能集成。
- 视觉：后续需真实PROD入口故障注入，确认错误提示稳定；当前无浏览器、真实SW/网络或视觉信用。

## 当前模式推进记录

- Codex范围：只读取证；单一治理worktree，生产三文件冻结。
- 前提：公开模块组合红例已证；完整main/HTTP现场仍待核。
- 方案/产品裁决：pending，不以父治理目标泛化为生产build allowed。
- done：blocked；并非暂停整个治理goal，可继续其它pre-94有限批次。

## Draft: 设计与风险

候选方向为错误终态保护与入口失败清理；先核在进入前/后、SW不可用、onPlayable、迟到完成等状态的准确责任。不得盲目恢复全局fetch覆盖后安装网络层，不增加fallback/重试开关，不改缓存/生成物。

## Build / Review / 用户验收

未实现。当前有效交付是源码路径与一条原生Vitest AssertionError；静态、包绿或DOM数据编码PNG不能代替本卡功能/视觉验收。统一质量门未在此红例上宣称通过。

## 交接日志

- 2026-10-18 Codex：CODE72逐文件复审发现并用真实模块复现。native/raw、spec gzip、source SHA、exit/signal/spawn和清理见[72证据](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/72-boot-loading/README.md)。主入口/UI/boot-loading均未改；下一步核生产build准入后再写失败反例及最小修复。

## 下一位 Agent 提示词

无；Codex单Agent继续，当前产品实现冻结，不把本卡当生产授权。
