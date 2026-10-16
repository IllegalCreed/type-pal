# CODE-QUALITY-3k - game present 基础 primitive 逐文件治理

Status: done
Phase: phase1 game
Capability: ops / code-quality
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Codex（独立验收）
Visual Verification Owner: N/A
Visual Verification Timing: dev-functional（仅 framebuffer/DOM-free primitive；剧情视觉集中 E2E）
Contributor: Codex
Branch: codex/code-quality-governance
Base: `c1bce8b42`
Last reviewed: 2026-10-16
Governance Owner: Codex（文档治理；非作者独立复核后根接收）
Template: task-card-v1 / 1.0.0

## 目标

保存2026-10-05六个present primitive治理：只有screen-wave负progression跨零未关断有直接raw/WORD证据，以<=0关断；其余framebuffer/shake/dither/number/follower公式与边界保留。不能把基础helper关闭扩大为battle/menu/全仓完成。

## 范围

原framebuffer、screen-shake、screen-wave、dither-fade、draw-number、follower-pos及对应测试；不改battle present/dialog/menu、剧情E2E、坐标重判、save/schema或runner。非法边界概括不能删除framebuffer等既有合法宽容合同。

## 前提与证据

本包直接全文读固定源screen-wave.ts73行：advance推进，C unsigned WORD负跨零会回绕并由>=256关闭，JS number需<=0；advance=false只扭曲不推进计数/相位。原卡raw opcode0x71 [255,65532,0]及global.h WORD是历史primary锚点，本次未读取raw归档或完整present caller，不伪称重对拍。

## 验收

原13files/77tests、typecheck/Biome；mutant恢复旧===0条件后4 total/3 passed/1 failed，恢复4/4。原后继总纲记game3400、完整check/official ratchet/protected/lint通过；不得承接账本182误写的3 fail。真实视觉坐标仍unknown，公式合同不代看图。

## 状态与交接

原done、03cc513df已推送与Owner/Reviewer保留；旧fenced build prompt不执行。2026-10-16文档迁移经非作者history_cards_c_tail复核、根Codex独立接收；G共享来源治理已纠正live ledger反控摘要并保留完整旧稿，未重跑反控或扩大产品验收。

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

10-05、基点c1bce8b42；原146已闭合/5 review/2813待核属于当时清单。总纲108–111“门尚待收口”由113–115后继全门记录更新；两时点都保留，不把旧等待视作新阻塞或抹去。

## 当时证据

固定bb904原卡48/60和[总纲](../../../audits/code-quality-governance.md)原稿110行一致为4总/3过/1败，原[账本](../../../audits/code-quality-file-ledger.md)182行却写4 total/3 fail→4/4。G已将live摘要纠为3passed/1failed，旧273行fenced snapshot保留错句；这只修文档摘要，不是第二次执行。固定源wave全文的原阅读范围保留；原卡60列两个mutant raw/JSON路径在D复核时不存在，不冒充新回读。

## 当前有效性

historical。共享live摘要误述已在G纠正，原错误和来源仍可回读；raw缺失与未知视觉坐标继续guarded。采用卡/原总纲明确3passed/1failed，不把两文档一致当第二次运行；其它五primitive当前代码/测试质量未重新全文核，不从wave源码读完推广全present已审。

## 继任文档

[总纲](../../../audits/code-quality-governance.md)固定bb904原稿117起另记battle-present，只作历史导航；当前路线/ledger已分别模板化并纠正摘要，不授本卡额外产品阅读信用。新任务按[现行工作流](../../../agent-workflow.md)准入，无可执行旧提示词。

## 原始结论

保存2026-10-05六个present primitive治理：只有screen-wave负progression跨零未关断有直接raw/WORD证据，以<=0关断；其余framebuffer/shake/dither/number/follower公式与边界保留。不能把基础helper关闭扩大为battle/menu/全仓完成。

当轮验收范围：原13files/77tests、typecheck/Biome；mutant恢复旧===0条件后4 total/3 passed/1 failed，恢复4/4。原后继总纲记game3400、完整check/official ratchet/protected/lint通过；不得承接账本182误写的3 fail。真实视觉坐标仍unknown，公式合同不代看图。

完整原卡来自 Git blob `8bd9f00f0273177f370a687e5d480e839e00a228`，source revision `bb90428668808368e816bd8e2ddeb5da57e4b166`；预审 `40bce2fb7fb8d19ff99b228063e337e1b3050fa2` 对应blob完全相同。引用每行仅增加 `> `，空行只增加 `>`，可逐字节逆回读。旧prompt、命令、临时路径与历史accept/done不构成本轮产品执行、当前测试质量或独立签收。

<!-- original-source-quote:start -->

> # CODE-QUALITY-3k - game present 基础 primitive 逐文件治理
>
> Status: done
> Phase: phase1 game
> Capability: ops / code-quality
> Coding Owner: Codex
> Generation Owner: N/A
> Reviewer: Codex（独立验收）
> Visual Verification Owner: N/A
> Visual Verification Timing: dev-functional（仅 framebuffer/DOM-free primitive；剧情视觉集中 E2E）
> Contributor: Codex
> Branch: codex/code-quality-governance
> Base: `c1bce8b42`
>
> ## 目标与范围
>
> 逐文件核验 game present 的基础 framebuffer、屏幕 shake/wave、dither fade、数字绘制和跟随者位置 helper；保留已核实的 sdlpal 公式、透明 mask、坐标和 UI 形态，只修有直接 caller/反例证据的问题。
>
> - 白名单生产文件：`packages/game/src/present/{framebuffer,screen-shake,screen-wave,dither-fade,draw-number,follower-pos}.ts`
> - 对应测试：各自 `.test.ts`、边界/GLM/Grok 合同；直接 caller 只读核对。
> - 范围外：battle present、dialog/menu UI、剧情 E2E、save/schema、原版坐标重判和 coverage runner。
>
> ## 前提真值门
>
> - 一句话前提：这些纯渲染 helper 对合法 framebuffer/typed 输入保持已核实的原版索引、循环、相位、mask 和跟随者位置语义；非法边界不能静默破坏 buffer。
> - 真值来源：各源码注释中的 `reference/sdlpal/video.c/scene.c/ui.c` 锚点；`packages/game/src/present/present.ts` caller；对应定向测试和 `CLAUDE.md` 第一阶段忠实还原规则。
> - 当前 before -> 目标 after：`present primitive 的 caller/边界证据分散 -> 六个文件逐一记录职责、输入域、反例和验证结论`。
> - 最强替代解释 / 推翻观察：现有 clamp/回退可能是原版合法宽容或 fade-only 补帧语义；若 raw/primary source、caller 或反例证明依赖则保留；若错尺寸 buffer、NaN/越界参数能污染输出，或负控删 guard 仍全绿，则前提被推翻并修复。
> - 是否主动偏离已核真值：N/A（不改用户可见形态和原版公式）。
>
> ## 上下文锚点
>
> - `AGENTS.md`：逐文件 ledger、硬零诊断、少而精测试、原版/第一阶段真值门。
> - `CLAUDE.md`：第一阶段原版行为边界、framebuffer/indexed rendering、透明 mask 与 present 时序。
> - `docs/ops/audits/code-quality-file-ledger.md`：当前 146 个已闭合、5 个 review、2,813 个尚未核验；本卡不得用 game 全包绿灯代替文件证据。
> - 不得重新引入：`indices===0` 代替 opaque mask、wave/shake 相位跨帧漂移、dither 低位算法改写、follower 坐标/朝向臆改。
>
> ## 验证
>
> - 逐文件完整读取生产代码、真实 caller 和既有 tests；未知项保留 review/blocked。
> - 若修代码：定向/相邻 present tests、game typecheck、全仓 `pnpm check`、support-mode ratchet、protected fast、Biome 零诊断；不以截图替代公式/typed 合同。
>
> ## 当前模式推进记录
>
> - Codex 前提核验：verified（纯 helper 小域；无 save/schema；坐标只按源码和现有合同核对）。
> - build 准入：Codex build allowed；只允许白名单窄修。
> - 贡献者交付/自验：Codex；定向 13 files/77 tests、game typecheck、Biome 通过；修复 `screen-wave.ts` 负 progression 跨零关断缺陷。
> - Codex 独立验收：accept（完整读取六个生产文件与 `present.ts` 真实 caller；真实 raw opcode 0x71 `[255,65532,0]` 与 `global.h:379 WORD` 直接证明；mutant 4 total/3 passed/1 failed，恢复 4/4；全仓 check、official ratchet、protected fast、Biome 零诊断通过）。
> - 用户产品裁决/体验验收：N/A（不改 UI 形态；剧情视觉延后）。
> - done 准入：Codex done allowed；提交 `03cc513df` 已推送，独立 diff/status 核对通过；本卡只关闭六个 primitive，不代表 present/battle/menu 或全仓治理完成。
>
> ## 交接日志
>
> - 2026-10-05 Codex：Q3j 已归档；继续从 game present primitive 小域推进，不接 battle/menu/dialog/save。Next: 完成六文件逐文件证据与直接问题核验。
> - 2026-10-05 Codex：六个 primitive 生产文件与真实 `present.ts` caller 逐段核验；发现 `screen-wave.ts` 在真实 `[255,65532,0]` 收尾时负波幅不关断，已按 C WORD 语义加 `<=0` guard；其余五文件保持公式/边界合同。定向 77、game typecheck/Biome 通过；未知的原版视觉坐标不靠静态合同关闭。Next: 完成全仓质量门并归档，继续 present/battle/menu 未核文件。
>
> ### 反控证据
>
> - mutant command：临时恢复 `wScreenWave === 0` 旧条件，执行
>   `NODE_DISABLE_COMPILE_CACHE=1 pnpm --filter @type-pal/game exec vitest run src/present/screen-wave.glm-phase1-leaves.test.ts --reporter=default --reporter=json --outputFile.json=/tmp/type-pal-q3k-counter/screen-wave-mutant.json`；raw `/tmp/type-pal-q3k-counter/screen-wave-mutant.raw`，exit 1，JSON `4 total / 3 passed / 1 failed / 0 pending`，唯一业务 assertion 是真实负 progression 跨零应关断。
> - restored command 输出 `/tmp/type-pal-q3k-counter/screen-wave-restored.json`，exit 0，`4 / 4 / 0 / 0`；恢复后源码保留 `<=0` guard。
>
> ## 下一位 Agent 提示词
>
> ```text
> 接手任务：CODE-QUALITY-3k game present 基础 primitive 逐文件治理
> 任务卡：docs/ops/tasks/CODE-QUALITY-3k-game-present-primitives.md
> 当前状态：build；只能在六个白名单生产文件及对应测试内工作。
> 你的角色：Codex Coding Owner / 独立验收。
> 先读：AGENTS.md、CLAUDE.md、本卡、code-quality-file-ledger.md、六个生产文件、真实 present caller 和测试。
> 请你做：逐文件核输入域/公式/边界/调用方；只有直接证据问题才修；不改原版坐标/公式或 UI 形态。
> 不要做：不得修改 battle/menu/dialog/save/schema/E2E/coverage runner，不能把视觉猜测当代码缺陷。
> 输出要求：每文件 verified/review/blocked；定向、game typecheck、pnpm check、support ratchet、protected fast、lint 全通过后更新账本、提交推送并标 done。
> ```
