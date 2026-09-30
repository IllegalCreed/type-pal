# E2E-002-FEEDBACK-1 - 主角遮挡反馈与连续方向输入

Status: build
Phase: phase2
Capability: W1 / E2E-R4-1
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Codex（验收）/ e2e_002_runner（独立专项复核）
Visual Verification Owner: Codex / User
Visual Verification Timing: mixed
Contributor: Codex
Branch: codex/002-feedback

## 目标与范围

002 演示后用户指出 NPC 也透墙以及行走逐格停顿，2026-10-01 明确「推进」。
只当前受控队长主动触发 D27 前景透明；NPC、队友、编外跟随者不触发。
002 测试同方向持续按住，保留状态观测、碰撞规划和所有剧情/恢复断言。
不改运行时移动速度、碰撞、插值、剧情、schema/save 或编辑器；6012 不重启/刷新。

## 前提真值门

一句话前提：当前透墙范围包含所有 actor，而逐格松键的测试输入不能证明连续按住时的手感。

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | D27 选择前景透明；当前用户将主动触发对象收窄到受控主角。原版不作为新反馈的实现标准 | `docs/phase2/decisions.md:428`；2026-10-01 本对话「推进」 |
| 第一阶段 | framebuffer 输出不透明；不含 D27 现代化反馈，N/A 于反馈范围；移动输入采用 held | `packages/game/src/present/framebuffer.ts:44`；`packages/game/src/shell/input.ts` |
| 当前二阶段 | 场景 actor 触发为 true，partySprite 全 true；测试每步 down/up；运行时支持 held | `packages/reforge/src/world-scene-presentation.ts:168,338`；`scripts/e2e/inn-journey.mjs:225-234`；`packages/reforge/src/input.ts:12-34` |
| 本任务目标 | NPC/非受控跟随者不主动透墙；只 party[0] 触发；普通路线同方向不松键 | 上述用户裁决与本卡范围；新回归及真实 002 输入日志 |

最强替代解释：NPC 本体被改 alpha 或漏 restore；实际当前 sprite 没有 alpha 覆写，透明的是 cover tile，
`render.ts:399-438` save/restore 分隔作用域。持续 held 后仍可能有引擎顿挫，不能预先归因全部给测试。
反证：修正后 NPC-only 队列仍触发透明，或同方向日志存在逐格 up/down，或正常路线/剧情失败，则返工。
资源/解码/作者脚本不是此主动触发和测试松键的根因，不重导资产或恢复转换器。

用户可见偏离：所有角色主动触发 → 只有当前受控队长主动触发；逐格测试输入 → 连续 held。
代表场景为 s003 三苗人进房。沿用 D27 整块前景透明：同一主角触发的墙后 NPC 可能顺带被看见，
不宣称每个 NPC 永远不可见，不新增角色专用遮罩/剪影。

## 上下文锚点与禁止事项

- `docs/phase2/READ-FIRST.md`：干净架构、资产锚点与 UX 裁决；`docs/phase2/reference/phase1-knowledge-harvest.md` W/E 段。
- `docs/ops/archive/tasks/done/D6-1-occlusion-semi-transparent.md`：历史全角色/0.35/120ms，历史记录不追溯重写。
- `docs/testing/e2e-002.md`：真实001档、正常路线、20正文/500文、实际三人进房及恢复检查。
- 不新增全局角色冻结、兼容版本、输入速度作弊、坐标瞬移、固定长等待；不放宽证据/超时/动作预算。

## 验收条件与 E2E 登记

- 精灵组装回归：actor NPC/prop/队友/编外跟随者 false，受控队长 true；换队长无旧身份残留；无可绘队长时不由队友接替。
- 连续导航回归：同方向只一对 down/up；转向释放；场景/对白阻塞释放；失败/异常 finally 释放；仍记录实际移动。
- 最小视觉：使用真实 001 ended SAVE9/content21 前驱，以 headed 执行完整 RF002；沿正常门至 e56，核 NPC 进房不再主动透墙。
- 正常路线、20行/500文、三人编排/终点/隐藏、生产保存/新上下文 World 与 Canvas 严格恢复均不削弱。
- 零诊断 lint/格式/typecheck；相邻测试与全仓 check；连续输入路径共用时复跑 game002。
- 证据放隔离树 `build/e2e/`；现有演示服务不关闭，6012 用户编辑器不触碰。

## 当前模式推进记录

- Codex 前提 verified：直接读取以上代码；用户主动范围变更已明确批准。
- Codex design agree / build allowed（2026-10-01）：隔离树 `/Users/zhangxu/.codex/worktrees/002-feedback/type-pal`，单一写入 Owner。
- 白名单：world-scene-presentation 与测试、render 注释、inn-navigation/inn-journey/inn-contract 与测试、当前决策/回执/任务看板索引。
- 专项 reviewer 独立只读核前提/反例；不等待固定三席签字。
- 用户体验验收：pending；实现和质量门通过不自动标 done。

## Build / Review / 证据

- 独立前提专项复核（e2e_002_runner）：premise verified / design agree；直接读实际 s003 实体，
  e56 为 actor 李大娘、e59/e60/e61 为 sprite207/29/30（原本不主动触发）。
  收窄只消除 NPC 主动触发，不承诺三苗人永不因共享瓦片显露。
- 已反控空party+编外第0深度槽、队长换人/缺帧、同向/转向/动态阻挡、慢轮询跨格、场景/原地脚本启动与finally。
- 3 新精灵回归＋2既有合同断言先红（5 failed），修正后含render共17项绿；导航8项绿。
- 只 leader 调用点显式 controlled=true，其他调用点false；不拿绘制序号当受控身份。
- route.steps 标明轮询进度；route.committedMoves 由真实 observer party commit 抽取，不推算补格。
- 运行时仍按100ms探索节拍，本轮不改连续插值，手感还需实际headed复跑和用户判断。

## 交接日志

- 2026-10-01 Codex：读取 primary source、核主树 clean，建立隔离树；先补失败回归，再修根因。

## 下一位 Agent 提示词

无下一位 Agent 提示词，等待本轮实现、专项复核和用户体验验收。
