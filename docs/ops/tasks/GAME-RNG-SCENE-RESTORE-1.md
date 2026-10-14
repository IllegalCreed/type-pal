# GAME-RNG-SCENE-RESTORE-1 — 酒剑仙传功后动画末帧遮挡场景

Status: review
Phase: phase1
Capability: 第一阶段脚本演出与场景恢复
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Codex（专项独立审查另行记录）
Visual Verification Owner: Codex
Visual Verification Timing: mixed
Contributor: Codex
Branch: codex/game-rng-scene-restore

## 目标

调查 [GitHub issue #3](https://github.com/IllegalCreed/type-pal/issues/3)：山神庙酒剑仙传功结束后，
动画末帧遮住跪拜和后续场景，人物仍可移动，出门才恢复。核清线上与本地差异并修复已证根因。

## 范围

- 第一阶段 RNG 末帧保持、脚本显式场景重绘与相应回归验证；新增用例须经官方 ratchet 登记覆盖率基线。
- 对照线上构建、当前源码与原始脚本；保留求雨和结局的动画背景对话。
- 不修改第二阶段、原版脚本/生成资产和存档格式。
- 用户 2026-10-14 授权提交合并、过 CI 后部署阿里云，并一并发布已在 main 的加载页版权声明修复。
  使用现有 `scripts/deploy.sh app`；为满足零构建告警，允许在 game Vite 配置中静态拆分音频依赖，
  保留默认体积阈值与现有加载语义，须验证生产构建启动。公开回复 issue 不在本次授权内。

## 前提真值门

### 一句话行为 / 工程前提

“刚播放过 RNG”只说明当前屏幕内容；脚本重画场景后不得继续把其后的普通对话当作动画背景对话。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | 提取的原版传功脚本：2248 PlayRNG → 2249 FadeOut → 设置位置/跪姿 → 2260 redraw → 2261 普通下方对话（无 RNG 参数）→ 2263“前辈！请您收我为徒。” | `data/extracted/events/all.json` 全局指令 2248–2263；参考实现 `reference/sdlpal/script.c:3267`，0x05 非 RNG 对话分支调用 PAL_MakeScene；参考实现不冒充原版运行录像 |
| 第一阶段 | PlayRNG 设置 rngFrameActive；0x05 不清；下一普通对话将 dialogPlayingRNG 置真；present 优先恢复备份直到切场景 | `packages/game/src/core/event-system.ts:1151,2215,2424,2814`；`packages/game/src/present/present.ts:262`；`packages/game/src/shell/bootstrap.ts:1289` |
| 当前二阶段 | N/A：此问题指第一阶段线上游戏，本卡不改变 Reforge/编辑器 | 用户 2026-10-14 指明第一阶段；包边界见 CLAUDE.md |
| 本任务目标 | 传功脚本显式重画后显示山神庙与跪拜；需要保留末帧的求雨/结局对话保持原有意图 | issue #3 的现象；原版指令顺序；`event-system.test.ts:420–464`、`present.test.ts:313–337` 的已有保持合同 |

### 反证与替代解释

- 最强替代解释：生产旧包、CDN/SW 或网络时序造成仅线上故障。2026-10-14 实取线上
  `/assets/index-CZvuhZUV.js`（641597 bytes，SHA-256
  `254e45c764b377f41ff3836406a4438fb3156294b617cdf613da18dd86d76375`），三个 RNG 标记的置位/清除域
  与本地相同；HTTP Last-Modified 是 2026-08-01，不能由此直接认定更新线上就能解决。
- 若真实 PlayRNG → redraw → 普通对话在当前实现会恢复场景，或原始脚本在对话前没有重绘，当前归因即被推翻。
- runtime：真实解释器/帧缓冲回归和 Chrome 实跑均复现；原版理解：区分普通 redraw 与结局显式 RNG 对话的 RestoreScreen。
- extractor：脚本自带 redraw，不以改数据补救生命周期；test model：用公开 caller、合法命令和实际像素判定，禁止只手设故障标记作唯一证明。

### 用户可见偏离

- 是否主动偏离已核真值：no；修复场景恢复缺陷。
- before → after：动画末帧遮住山神庙直至出门 → 脚本重画时恢复山神庙与后续演出。
- 用户裁决：普通缺陷修复，无新产品取舍；本地真实复现已排除线上独有。用户另行授权合并发布。

## 上下文锚点

- `CLAUDE.md` 第一阶段忠实还原、真实回归、线上/本地排查要求。
- `docs/phase1/engineering-notes.md:97–100,142–152,166–180`：同步语义异步化、SW、部署与冷加载历史。
- `packages/game/src/core/game-state.ts:895–911`：RNG 三字段的当前含义。
- `reference/sdlpal/text.c:1271,1729,1816`：背景备份、对话结束与显式 RNG 标记。
- 不得直接在播放器 finally 无条件清末帧；否则求雨与结局对话背景回归。
- 不修改版权资产或生成脚本来回避运行时故障。

## 验收条件

- 真实解释器执行传功关键顺序，现版出现业务断言失败，修复后场景像素可见；故障无需依赖网络延迟。
- 求雨 PlayRNG 后直接普通对话仍保留末帧；结局显式 RNG 对话后的 redraw 仍保留正确背景。
- 相关游戏测试、typecheck、lint、文档门通过，硬静态零 error/warning/info。
- 最小浏览器复现：山神庙传功最后一段 RNG → 跪拜对话 → 演出结束仍在庙内，检查场景恢复。
  因定位真实线上视觉缺陷可做一次最小开发期取证；完整剧情 E2E 不冒充已完成。
- E2E 后续集中入口：合法到达夜间山神庙，完成传功及拜师对话，出门前确认主角/NPC可见；
  求雨和结局作为背景保持的回归切片。证据目录 `docs/ops/evidence/game-rng-scene-restore-1/`。

## 当前模式推进记录

- Codex 前提核验：verified。当前 Chrome 走真实 proximity → L_2205 全段，在 2263 复现动画末帧；
  新回归的两个普通 redraw 分支均在像素断言实际得到 173 而非场景背景 0，结局保持分支通过。
- Coding Owner：Codex；白名单为 game 的 RNG 状态生命周期、针对性测试、Vite 静态分包、官方生成的覆盖率基线及本卡/索引/看板/工程经验。
- 独立前提审查：state_plan_review 直接核原始 2248→2260→2261、求雨 32056→32063 与结局
  35607/35617，premise verified；传功的 0x05 发生在进入动画背景对话前，窄修可成立。
- build 准入：Codex build allowed，限定“尚未进入动画背景对话的 0x05 场景重绘”清理遗留 RNG 标记/备份；
  不扩大解释成所有 PAL_MakeScene caller 或全部合法合成脚本的生命周期治理。
- 专项独立验收：state_plan_review accept。实现前直接核全部 20 个原始 PlayRNG caller；实现后指出
  初版结局测试绕过新增 guard 的缺口，补无正文分支后以独立反控闭合；复核修后两张截图与运行记录。
- done 准入：pending；本地修复、生产发布、线上验收分别记录，不混算。初次构建的体积提示已由静态音频分包消除，
  本地各包门及精确失败项复核完成；CI 和生产发布继续按实际结果记录。

## Draft: 设计与风险

- 0x05 的普通重绘分支在淡入或延时前清 rngFrameActive 与 rngDialogBackup；已处于动画背景对话时保持。
- 风险：0x05 在结局显式 RNG 对话里是恢复备份，不能无条件清所有动画背景。
- 当前 dialogPlayingRNG 也用于求雨普通对话的末帧保持，不完全等同参考实现的 fPlayingRNG。
  合成的 PlayRNG→普通对话→0x05 不属于本次最小修复范围；原始调用集的核查另附审查记录。

## Build: 实现与自测

- `event-system.ts` 普通 0x05 重绘在淡入/延时前清遗留标记与备份；保留 RNG 对话背景。
- `game-state.ts` 更新标记生命周期注释；移除“全部 RNG 后都会切场景”的错误假设。
- `event-rng-scene-restore.test.ts` 4 合同：普通重绘的延时/淡入路径，RNG 对话在正文前/正文后的重绘。
  媒体 IO 替身之外均执行真实解释器与 renderer，断言背景像素/人物像素与跪姿状态。
- 测试红绿与 guard 反控、源 hash、命令、原生报告、截图见[证据目录](../evidence/game-rng-scene-restore-1/README.md)。
- 相关三文件 387 项通过；最终新增 guard 用例另核 4/4；最终整包 **312 文件/3523 项通过**，无失败/跳过。
- 第一阶段 typecheck 与全仓 lint（3995 文件）零诊断；文档门通过。新增工程经验已同步维护
  phase/lore 治理目录的内容 hash 与增量审查记录，保留历史审查事实。
- 初次 `vite build` 的 649.68 kB 主包超过 500 kB，原始提示保留在证据中。用户授权发布后，Vite 静态拆分
  音频依赖：主包 381.03 kB / audio 268.03 kB；没有提高阈值，复建零告警，跨平台路径匹配。
- 独立审查确认静态 import/modulepreload、无反向依赖、初始化顺序与 SW 的 `/assets/` 缓存合同不变。
- 全仓 `pnpm check` 首次在提取器 10 项 CLI 的 5s 超时失败；保留原件，以 `VITEST_MAX_WORKERS=2`
  复跑同一完整门，提取器 423/423 通过；编辑器一项 AST 审计在 15s 门限超时，单项隔离复核 11.58s 通过，
  没有修改断言或超时。迁移包一项发布审计在 120s 超时，单项隔离复核 61.18s 通过；
  七包汇总 20229 项，所有失败合同已复核，但不把初次整仓运行改写成单次全绿。
- 正式包本地可进入客栈，实测 MIDI 非零波形；小屏版权声明已看图。额外离线 assets 缓存诊断在拆包前后
  同样失败，独立复核认为是既有局限，失败原件与单包对照已留证，不把在线启动通过混称离线通过。
- 分包独立提交 `579cdf668`；RNG 修复随后独立提交。覆盖率由合入提交的 Coverage ratchet CI 实测；
  生产发布须等待对应源码提交 CI 通过。当前未部署或回复 issue。
- RNG 修复 `d24981591` 合入 main 后，首轮 CI 的质量工具发现新测试文件使 tracked inventory 增加一项，
  账本计数未同步（本地开跑时文件尚未 tracked）。仅更新机器总数/待核数，不虚增本专项逐文件已审数量；
  修正文档后重新核 37 项质量工具及 CI，保留首轮失败记录。
- `5116cd5b` 的第二轮 CI：19820 项 fast 测试执行通过、覆盖率未回退，但因未登记新增测试集合
  （game 3491→3495、执行 digest 变化）失败。失败日志保留，按官方 `coverage:ratchet` 更新；
  不手改指标、不降低规则，不把测试执行通过混称整个 CI 通过。
- 官方 `TYPE_PAL_COVERAGE_BASE_REF=5116cd5b pnpm coverage:ratchet` exit 0：19820 项、731 生产文件，
  6 项指标提升、2 项范围变化，所有整数与前次 CI 原生报告一致。基线只登记本次 game 新文件/4 项及
  对应覆盖率变化，其余六包未动；更新提交仍须严格 CI 放行。

## 视觉验证记录

- Codex 已查看修前/修后截图。修前当前本地 Chrome 实现稳定复现报告现象，无慢网或 SW 条件。
- 修后真实播放器和原始 L_2205 全段正常：2263 看到山神庙跪姿，结束仍在 scene 12、mode=explore，
  RNG 保持标记与备份均已清；两个浏览器报告 pageerror 为空。
- 本次是实际缺陷的最小开发期诊断，起点使用 dev-scene 与人物摆放；不冒充从新游戏推进的正式 E2E。

## Review: 审查与返工

- state_plan_review：前提、窄范围实现和最终4合同 accept。先前 guard 测试缺口已补，
  独立核重建 mutant hash/原始执行集合/恰一业务红/恢复绿/原树不变/临时树删除，未发现其它返工项。
- state_plan_review：官方基线增量 accept。直接核新 baseline、本地原生汇总和 CI 原生汇总，全部整数、
  范围及指纹一致；只新增 game 的 1 文件/4 项，无新增排除、范围缩减、额外不稳定提升或指标回退。

## 用户验收

- 用户提供线上多人报告和本地未遇到的现象；2026-10-14 明确要求修好后提交合并、部署阿里云，
  并带上此前尚未部署的加载页版权声明。本卡按既有正确行为的 bug 修复收口，无新增 UI 产品取舍。

## 交接日志

- 2026-10-14 Codex：读取 issue #3、生产 bundle、原始脚本与当前生命周期；开卡调查。
- 2026-10-14 Codex：本地真实浏览器复现并修复，补回归及隔离反控；专项复核 accept。
  生产旧 bundle 保持原状，发布和线上复验未执行。

## 下一位 Agent 提示词

无下一位 Agent 提示词，由 Codex 继续质量门、合并推送、CI 与授权部署。
