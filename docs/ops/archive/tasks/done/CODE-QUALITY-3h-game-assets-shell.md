# CODE-QUALITY-3h - game 资产与启动边界逐文件治理

Status: done
Phase: phase1 game
Capability: ops / code-quality
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Codex（独立验收）
Visual Verification Owner: N/A
Visual Verification Timing: N/A
Contributor: Codex
Branch: codex/code-quality-governance
Base: `5f13c3010`
Last reviewed: 2026-10-16
Governance Owner: Codex（历史卡包 D 文档治理候选，待根线程独立接收）
Template: task-card-v1 / 1.0.0

## 目标

保存2026-10-05 game资产/启动六文件窄批：逐文件核职责与失败合同，仅fetch-retry非法retries/backoff发现直接可证伪缺陷并最小修复。其余五文件保留既定资源/屏障行为，不把六文件或包级绿灯当全game完成。

## 范围

原assets loader/tileset-blob/png/rle-decode与shell fetch-retry/bootstrap-resources；不改bootstrap主流程、save/scene语义、生成资源、schema、coverage runner或E2E。当前仅历史文档，不接实现白名单。

## 前提与证据

原caller约束合法gzip/raw、CDN已解压、空槽/可选资源降级、soundfont原始rejection与settle barrier、glyph显式tofu等各有保留理由。fetch非法retries可零请求后throw undefined、backoff不应任平台静默钳制是本卡直接修复；不是所有宽容分支都需删除。

## 验收

原拆出9原子合同，删除fetch guard后negative control变红；定向12files/77tests、game298files/3397tests、typecheck、全仓check第二轮及ratchet/protected/lint3198零诊断为当时记录。未提供本轮新的browser/资源对拍，不推导完整启动观感。

## 状态与交接

原done、Owner/Reviewer身份及提交22840ef03已推送的历史记录保留；fenced提示词仍写build，只按交接时点阅读，不能执行push或扩到bootstrap/save。本轮文档候选待根独立接收。

以下保留原标题入口。导航指向本卡历史原文或归纳；原命令、build/验收提示及分支操作只按其日期读取，不恢复执行。

### 目标与范围

历史内容见[原始结论](#原始结论)；按原时点读取。

### 前提真值门

历史内容见[前提与证据](#前提与证据)；按原时点读取。

### 上下文锚点

历史内容见[前提与证据](#前提与证据)；按原时点读取。

### 验收条件

历史内容见[验收](#验收)；按原时点读取。

### 当前模式推进记录

历史内容见[原始结论](#原始结论)；按原时点读取。

### 交接日志

历史内容见[原始结论](#原始结论)；按原时点读取。

### 下一位 Agent 提示词

历史内容见[原始结论](#原始结论)；按原时点读取。

## 历史范围

10-05、基点5f13c3010。原顶部2962/98纠为实际2964/106，后登记113是旧清单进度；当前固定预审源账本又有3283 tracked，均按revision分开，不选旧数字当今天全量分母。

## 当时证据

[治理总纲](../../../audits/code-quality-governance.md)90–94及[账本](../../../audits/code-quality-file-ledger.md)150–156保留六文件差异、9合同和全包记录。未全文重读六生产文件/callers或旧tests，不把账本已验证词当本轮代码深审。

## 当前有效性

historical。唯一生产窄修为fetch参数边界，其余资源降级和barrier保留；旧包级通过不认证当前代码、测试质量、visual或coverage。机器清单/已闭合数只是当时进度，不能宣布全仓治理完成。

## 继任文档

[Q3i](CODE-QUALITY-3i-game-dialog-precache-ui.md)接续对话/预缓存UI；新资源/启动行为按[现行工作流](../../../agent-workflow.md)重新准入，旧build prompt退为历史。

## 原始结论

保存2026-10-05 game资产/启动六文件窄批：逐文件核职责与失败合同，仅fetch-retry非法retries/backoff发现直接可证伪缺陷并最小修复。其余五文件保留既定资源/屏障行为，不把六文件或包级绿灯当全game完成。

当轮验收范围：原拆出9原子合同，删除fetch guard后negative control变红；定向12files/77tests、game298files/3397tests、typecheck、全仓check第二轮及ratchet/protected/lint3198零诊断为当时记录。未提供本轮新的browser/资源对拍，不推导完整启动观感。

完整原卡来自 Git blob `e34dc04faf228be5b1949d47abe5c631326375ad`，source revision `bb90428668808368e816bd8e2ddeb5da57e4b166`；预审 `40bce2fb7fb8d19ff99b228063e337e1b3050fa2` 对应blob完全相同。引用每行仅增加 `> `，空行只增加 `>`，可逐字节逆回读。旧prompt、命令、临时路径与历史accept/done不构成本轮产品执行、当前测试质量或独立签收。

<!-- original-source-quote:start -->

> # CODE-QUALITY-3h - game 资产与启动边界逐文件治理
>
> Status: done
> Phase: phase1 game
> Capability: ops / code-quality
> Coding Owner: Codex
> Generation Owner: N/A
> Reviewer: Codex（独立验收）
> Visual Verification Owner: N/A
> Visual Verification Timing: N/A
> Contributor: Codex
> Branch: codex/code-quality-governance
> Base: `5f13c3010`
>
> ## 目标与范围
>
> 逐文件核验 game 资产/启动窄域的生产源码、直接 caller 与现有合同，先处理有直接证据的边界缺陷，再把无缺陷文件和未决候选写入治理账本。首批白名单：
>
> - `packages/game/src/assets/{loader,tileset-blob,png,rle-decode}.ts`
> - `packages/game/src/shell/{fetch-retry,bootstrap-resources}.ts`
> - 对应的直接测试与 caller 只读核对；`bootstrap.ts`、save、scene 语义不在本批实现范围，另开高风险卡。
>
> 范围外：生成的 `public/extracted`、`projects/pal`、E2E/剧情视觉、schema/save/migration、公共接口与覆盖率 runner 改造。
>
> ## 前提真值门
>
> - 一句话前提：运行时资源加载只对真实 HTTP/解码/启动屏障失败做既定传播或降级，不把合法资源转成伪成功，也不改变第一阶段资源格式。
> - 真值来源：`packages/game/src/assets/tileset-blob.ts:4-16`（extractor/runtime 共用 sprite chunk 约定）；`packages/game/src/assets/loader.ts:135-190`（真实资源 caller）；`packages/game/src/shell/bootstrap-resources.ts:40-63`（soundfont 与主资源双 barrier）；`CLAUDE.md:31-38`（原始数据与可重生成边界）。
> - 当前 before -> 目标 after：`逐文件证据分散 -> 每个白名单生产文件都有 caller、合同、反例/保留理由和独立验证记录`。
> - 最强替代解释 / 推翻观察：已有宽容分支可能是 PAL 资源空槽、CDN 已解压或启动降级的已核真值；若真实 raw、现行 caller 或现有测试证明依赖，则保留并登记；若合法输入被吞成空资源、非法参数导致悬空 rejection、或测试删掉 guard 仍全绿，则前提被推翻并进入修复。
> - 是否主动偏离已核真值：N/A（纯边界审计；不改变格式或用户可见行为）。
>
> ## 上下文锚点
>
> - `AGENTS.md`：单一 Coding Owner、逐文件台账、硬性零诊断、少而精测试与生成物上游规则。
> - `docs/ops/audits/code-quality-file-ledger.md`：本卡接手时顶部写 2,962/98；实际 current inventory 2,964、已验证表行 106。已纠正旧顶部漏计（不追溯改历史报告）；本卡不得用包级绿灯代替文件证据。
> - `packages/game/src/assets/*` 的 `loader.test.ts`、`tileset-blob.test.ts`、`tileset-load.grok-r1.test.ts`、`png-*.test.ts`；`packages/game/src/shell/fetch-retry*.test.ts`、`bootstrap-resources*.test.ts`。
> - 不得重新引入：重复的 game/shared RLE codec、无 URL/status 上下文的 fetch 失败、把 soundfont rejection 伪装成资源成功、为覆盖率而改 runner 或堆恒真断言。
>
> ## 验收条件
>
> - 逐段读取白名单生产文件，记录职责、真实 caller、输入域、异常/降级、可疑候选和结论到账本；未知候选保持 `review/待核`，不凭静态行数关闭。
> - 若修代码：定向/相邻 game 测试、game typecheck、全仓 `pnpm check`、官方 support-mode coverage ratchet、受保护 fast、Biome 零诊断；若纯审计：同样跑受影响包与全仓质量门并只登记证据。
> - 视觉/E2E：N/A；功能启动演出按集中 E2E 规则延后，不用源码推断视觉完成。
>
> ## 当前模式推进记录
>
> - Codex 前提核验：verified（范围窄、证据锚点已列；save/bootstrap 主流程留给后续高风险卡）。
> - build 准入：Codex build allowed（本批允许在白名单内修复直接证据问题；不得越界修改 bootstrap/save/schema/生成物）。
> - Coding Owner / 隔离分支：Codex / `codex/code-quality-governance`。
> - 贡献者交付/自验：Codex；candidate 为当前工作树；定向 12 files/77 tests、game 全包 298/3397、typecheck 通过。
> - Codex 独立验收：accept（直接重读六个生产文件与真实 caller；negative control 删除 fetch-retry guard 后新合同变红；全仓 `pnpm check` 第二轮通过；support-mode ratchet 与 protected fast 均通过；lint 3198 文件零诊断）。
> - 用户产品裁决/体验验收：N/A（纯资源/启动边界审计）。
> - done 准入：Codex done allowed；提交 `22840ef03` 已推送，独立 diff/status 核对通过；本卡只关闭白名单，不代表 game 或全仓治理完成。
>
> ## 交接日志
>
> - 2026-10-05 Codex：用户要求继续推进并明确关注后期偷懒；本卡锁定 6 个生产文件及其直接测试，逐个读取、逐个登记，不把包级绿灯当完成。Next: 完成白名单审计与必要窄修。
> - 2026-10-05 Codex：六个生产文件逐文件复核；仅 `fetch-retry.ts` 的非法 retries/backoff 有直接可证伪缺陷，已最小修复并拆出 9 个原子合同。定向 12 files/77 tests；game 全包 298/3397；全仓 check 二轮、ratchet、protected fast、lint 全通过。Next: 提交后独立检查并归档本卡；继续 game 其余模块。
>
> ## 下一位 Agent 提示词
>
> ```text
> 接手任务：CODE-QUALITY-3h game 资产与启动边界逐文件治理
> 任务卡：docs/ops/tasks/CODE-QUALITY-3h-game-assets-shell.md
> 当前状态：build；只能在列出的 game 资产/shell 白名单内工作。
> 你的角色：Codex Coding Owner / 独立验收。
> 先读：AGENTS.md、CLAUDE.md、docs/ops/audits/code-quality-file-ledger.md、本卡，以及白名单源码与直接测试。
> 请你做：逐文件记录职责/caller/输入域/失败语义；只有有直接证据的问题才修；补最小高判别力反例并做负控；更新账本与本卡证据。
> 不要做：不得修改 bootstrap.ts/save/schema/生成物/E2E/coverage runner，不得为了覆盖率堆弱断言或降低规则。
> 输出要求：给出每个白名单文件的 verified/review/blocked 结论、候选与反证；运行定向/相邻、game typecheck、pnpm check、support-mode ratchet、protected fast、lint；通过后提交并推送，未完成项保留待核。
> ```
