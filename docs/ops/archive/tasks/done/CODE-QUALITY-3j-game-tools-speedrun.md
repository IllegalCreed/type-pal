# CODE-QUALITY-3j - game tools 与速通纯函数逐文件治理

Status: done
Phase: phase1 game
Capability: ops / code-quality
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Codex（独立验收）
Visual Verification Owner: N/A
Visual Verification Timing: dev-functional（仅工具 DOM 状态）
Contributor: Codex
Branch: codex/code-quality-governance
Base: `fe189dc4d`
Last reviewed: 2026-10-16
Governance Owner: Codex（历史卡包 D 文档治理候选，待根线程独立接收）
Template: task-card-v1 / 1.0.0

## 目标

保存2026-10-05七个tools/speedrun文件治理：仅display-scale的NaN百分比进入CSS/storage有证据，按默认100%修复；FPS、toast、map-names、time-format、countdown合同保留，checkpoints只读且坐标仍待实跑。

## 范围

原display-scale/fps-overlay/toast/map-names及speedrun time-format/countdown/checkpoints；不动core/save、玩法、UI形态、coverage runner或速通节点。NaN修复不自动扩大为Infinity/所有边界统一拒绝。

## 前提与证据

原实际caller涵盖canvas/fullscreen/storage、rAF启停、toast/countdown DOM、map-name fallback、速通store与PalTimer/BANANA配置。节点坐标若无真实运行证据必须停线，不凭配置看似合理改坐标；源码固定不等于实跑通过。

## 验收

原定向12files/47tests、game298/3399、typecheck/full gates；仅移除clampPct Number.isNaN guard的mutant为6 total/5 passed/1 failed，唯一NaN应回100%；恢复6/6。原源hash d4e8c6b76cc2fdad64eea63a0124be1c955f04c074413022f246f0ba415c6cc8及测试hash保留原文，不本轮重算为当前代码。

## 状态与交接

原done、96710de55已推送及Owner/Reviewer保持。旧fenced build/push提示历史化，坐标unknown不会因done自动闭合；2026-10-16仅文档候选待根独立接收。

以下保留原标题入口。导航指向本卡历史原文或归纳；原命令、build/验收提示及分支操作只按其日期读取，不恢复执行。

### 目标与范围

历史内容见[原始结论](#原始结论)；按原时点读取。

### 前提真值门

历史内容见[前提与证据](#前提与证据)；按原时点读取。

### 上下文锚点

历史内容见[前提与证据](#前提与证据)；按原时点读取。

### 验证

历史内容见[验收](#验收)；按原时点读取。

### 当前模式推进记录

历史内容见[原始结论](#原始结论)；按原时点读取。

### 交接日志

历史内容见[原始结论](#原始结论)；按原时点读取。

### 反控证据

历史内容见[验收](#验收)；按原时点读取。

### 下一位 Agent 提示词

历史内容见[原始结论](#原始结论)；按原时点读取。

## 历史范围

10-05、基点fe189dc4d；原119已闭合/2840待核为当时账本，不当今日进度。47定向、3399全包与6条mutant有不同分母，不相加；工具DOM不替代剧情视觉。

## 当时证据

[总纲](../../../audits/code-quality-governance.md)102–106与[账本](../../../audits/code-quality-file-ledger.md)163–170保留七文件结果。原卡59–60列mutant/restored raw/JSON与hash；本轮核对应两个mutant raw/JSON路径均不存在，不能声称重新回读其字节或执行负控。

## 当前有效性

historical。坐标与速通路线实跑仍unknown；配置/caller只读不构成新路线验收。只保存原NaN窄修与当轮反控/全门，临时raw不在不抹去历史结论，也不冒充本轮测试质量验证。

## 继任文档

[Q3k](CODE-QUALITY-3k-game-present-primitives.md)接续present primitive；新速通坐标/行为任务依[现行工作流](../../../agent-workflow.md)另准入，无可执行旧Agent提示词。

## 原始结论

保存2026-10-05七个tools/speedrun文件治理：仅display-scale的NaN百分比进入CSS/storage有证据，按默认100%修复；FPS、toast、map-names、time-format、countdown合同保留，checkpoints只读且坐标仍待实跑。

当轮验收范围：原定向12files/47tests、game298/3399、typecheck/full gates；仅移除clampPct Number.isNaN guard的mutant为6 total/5 passed/1 failed，唯一NaN应回100%；恢复6/6。原源hash d4e8c6b76cc2fdad64eea63a0124be1c955f04c074413022f246f0ba415c6cc8及测试hash保留原文，不本轮重算为当前代码。

完整原卡来自 Git blob `e5b0ac44686e1d33b987837446e194181a282010`，source revision `bb90428668808368e816bd8e2ddeb5da57e4b166`；预审 `40bce2fb7fb8d19ff99b228063e337e1b3050fa2` 对应blob完全相同。引用每行仅增加 `> `，空行只增加 `>`，可逐字节逆回读。旧prompt、命令、临时路径与历史accept/done不构成本轮产品执行、当前测试质量或独立签收。

<!-- original-source-quote:start -->

> # CODE-QUALITY-3j - game tools 与速通纯函数逐文件治理
>
> Status: done
> Phase: phase1 game
> Capability: ops / code-quality
> Coding Owner: Codex
> Generation Owner: N/A
> Reviewer: Codex（独立验收）
> Visual Verification Owner: N/A
> Visual Verification Timing: dev-functional（仅工具 DOM 状态）
> Contributor: Codex
> Branch: codex/code-quality-governance
> Base: `fe189dc4d`
>
> ## 目标与范围
>
> 逐文件核验 game 工具小域的显示缩放、FPS 诊断、toast/countdown DOM、地图名回退和 speedrun 时间格式/节点配置，保持现有工具形态与速通数据，不进入 save、core、E2E 或玩法语义。
>
> - 白名单生产文件：`tools/{display-scale,fps-overlay,toast,map-names}.ts`、`tools/speedrun/{time-format,countdown,checkpoints}.ts`
> - 对应测试：既有纯函数/DOM/边界/GLM leaves 合同；`checkpoints.ts` 只读审计，不修改坐标或节点数据。
>
> ## 前提真值门
>
> - 一句话前提：工具输入的非法数值不能形成 NaN CSS/计时输出；已核实的速通节点、地图名和工具 DOM 形态保持不变。
> - 真值来源：各白名单文件及对应测试；`CLAUDE.md` 第一阶段工具/原版真值规则；`tools/speedrun/checkpoints.ts:92-109` 的 PalTimer 坐标注释与 BANANA 配置。
> - 当前 before -> 目标 after：`工具边界和速通数据分散 -> 每个文件有 caller、合法输入、坏输入和证据结论`。
> - 最强替代解释 / 推翻观察：UI 只会产生有限 slider/timer 输入，速通配置由源码固定；若当前 caller 不能产生坏值且测试钉住保留语义，则不改；若 NaN/Infinity 进入 CSS/格式化输出或配置与一手数据冲突，则停线并单独升级。
> - 是否主动偏离已核真值：N/A（不改工具形态、节点坐标或玩法）。
>
> ## 上下文锚点
>
> - `AGENTS.md`：逐文件 ledger、硬零诊断、少而精测试、用户可见 UI 仍需保持形态。
> - `docs/ops/audits/code-quality-file-ledger.md`：Q3i 后 119 个已闭合，2,840 个尚未逐文件核验；本卡不能用 game 全包绿灯代替文件证据。
> - `CLAUDE.md`：第一阶段工具应服务诊断，不改原版玩法；checkpoint 坐标若不确定必须停线，不凭近似修正。
> - 不得重新引入：显示缩放 NaN、FPS 跨启停脏帧、toast 堆叠容器误删、速通节点坐标臆改。
>
> ## 验证
>
> - 逐文件读取生产代码和对应测试；未知项保留 review，不为了覆盖率堆断言。
> - 若修代码：定向工具测试、game typecheck、全仓 `pnpm check`、support-mode ratchet、protected fast、Biome 零诊断；DOM 只做功能性最小验证。
>
> ## 当前模式推进记录
>
> - Codex 前提核验：verified（小域、无 save/schema；checkpoint 只读）。
> - build 准入：Codex build allowed；只允许白名单窄修。
> - 贡献者交付/自验：Codex；定向 12 files/47 tests、game 全包 298/3399、typecheck 通过。
> - Codex 独立验收：accept（七个生产文件逐个重读；display-scale NaN guard 负控 6 tests=5 pass/1 fail，恢复后 6/6；速通 checkpoints 坐标只读核验并保留实跑未知；全仓 `pnpm check`、support ratchet、protected fast、Biome 零诊断通过）。
> - 用户产品裁决/体验验收：N/A（不改形态/节点）。
> - done 准入：Codex done allowed；提交 `96710de55` 已推送，独立 diff/status 核对通过；本卡只关闭七个文件，不代表 game 或全仓治理完成。
>
> ## 交接日志
>
> - 2026-10-05 Codex：Q3i 已归档；本卡从 game tools 小域继续，不接 core/save/玩法。Next: 完成七个白名单文件的逐文件证据与最小窄修。
> - 2026-10-05 Codex：七个生产文件逐个核验；仅 `display-scale.ts` NaN 输入有直接证据并修复，删除 guard 的隔离 mutant 失败（5/6），恢复后 6/6；FPS/toast/map-names/time-format/countdown 合同保留；checkpoints 仅核配置与 caller，坐标仍待真实运行证据。定向 47、game 全包 3399、全仓 check/ratchet/protected/lint 全通过。Next: 提交后归档，继续 game core/present 未核文件。
>
> ### 反控证据
>
> - mutant command：在隔离工作树临时移除 `clampPct` 的 `Number.isNaN` guard，执行
>   `NODE_DISABLE_COMPILE_CACHE=1 pnpm --filter @type-pal/game exec vitest run src/tools/display-scale.glm-phase1-leaves.test.ts --reporter=default --reporter=json --outputFile.json=/tmp/type-pal-q3h-counter.bMPKQT/q3j-mutant.json`；raw `/tmp/type-pal-q3h-counter.bMPKQT/q3j-mutant.raw`，exit 1，JSON `6 total / 5 passed / 1 failed / 0 pending`，唯一业务 assertion 为 NaN 应回 100%。
> - restored command 同 runner/output `/tmp/type-pal-q3h-counter.bMPKQT/q3j-restored.json`，exit 0，`6 / 6 / 0 / 0`；源文件恢复 hash `d4e8c6b76cc2fdad64eea63a0124be1c955f04c074413022f246f0ba415c6cc8`，测试 hash `0c249bc261f9cc53aeae444a24f5cde5d94d543639b5ee3c205c391ceffd051b`。
>
> ## 下一位 Agent 提示词
>
> ```text
> 接手任务：CODE-QUALITY-3j game tools 与速通纯函数逐文件治理
> 任务卡：docs/ops/tasks/CODE-QUALITY-3j-game-tools-speedrun.md
> 当前状态：build；只能在七个白名单生产文件及对应测试内工作。
> 你的角色：Codex Coding Owner / 独立验收。
> 先读：AGENTS.md、CLAUDE.md、本卡、code-quality-file-ledger.md、七个生产文件及其测试。
> 请你做：逐文件核 caller/输入域/失败语义；若直接证据证明 NaN CSS 或其它边界缺陷才修；checkpoints 只读核对，不改坐标。
> 不要做：不得修改 core/save/schema/E2E/coverage runner、速通节点坐标或产品 UI 形态。
> 输出要求：每文件 verified/review/blocked；定向、game typecheck、pnpm check、support ratchet、protected fast、lint 全通过后更新账本、提交推送并标 done。
> ```
