# REFORGE-OPENING-LOAD-ERROR-1 — 标题读档IO失败的悬空拒绝

Status: draft
Phase: phase2
Capability: runtime-io / opening-load-error
Coding Owner: Unassigned（Codex后续核窄准入）
Generation Owner: N/A（无资源生成）
Reviewer: Codex
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional
Contributor: GLM Q报告，Codex独立复现
Branch: TBD（本卡仅登记，不开放产品写入）

## 目标与范围

标题菜单读取存档meta/thumb或解码缩略图失败时，拒绝应有明确承接，不悬空、不误报读档成功。
这次只核前提并登记draft；错误呈现/重试与资源释放方案尚未核准，不开始实现。
拟议范围为opening-menu异步入口/外层生命周期及窄回归；不改save格式、迁移、Store公共接口、
旧开发存档兼容、真实存档/PAL数据、剧情、NPC/碰撞或E2E实现。

## 前提真值门

工程前提：真实存储读Promise允许拒绝，但标题菜单的void enterLoad未承接它。

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| primary | SaveStore读IO会拒绝，不是永久成功承诺 | `packages/reforge/src/save/store.ts:116-139`get/list的req.onerror；接口`:11-14` |
| 第一阶段 | N/A：不裁决原版机制/数值或一阶段存档格式；Reforge注入式Promise存储是独立架构，菜单布局不改 | [阶段铁律](../../phase2/READ-FIRST.md)2/8；本卡只核异步错误边界 |
| 当前二阶段 | main真实构造IndexedDbSaveStore交给runOpeningMenu；enterLoad等待IO，但键盘入口悬空 | `main.ts:460-518`；`opening-menu.ts:113-121,138` |
| 本任务目标 | 真实合法输入+外部IO失败需受控终态/恢复，不吞错为成功 | [Codex r2复核](../../testing/glm-tenfold-triple/codex-q-r2-review-20261001.md)D-Q01-1段与机器证据的diagnosticDefect |

最强替代解释：GLM原probe非法PNG/错误旧存档触发宿主异常，而不是产品可达IO失败。
独立反证：current payload由buildWorld/buildCurrentSavePayload构造；合法m01 meta+chromePng
经真实MemorySaveStore写/读成功后，只让typed getThumb外部边界reject UnknownError。
公开菜单按键触发同路径，Vitest记录1未处理拒绝、进程exit1，排除旧格式/非法图片前提。
真实IndexedDB读确有onerror拒绝路径；若实际菜单入口已桥接catch/外层Promise并收尾，或
存储接口保证读永不拒绝，则推翻当前结论。当前源均不满足这两个反证。

`before -> after`：外部读失败悬空拒绝、停在菜单 -> 错误由菜单生命周期显式承接。
具体用现有错误画屏、菜单通知还是可重试状态尚未决定；不在测试卡里自作UI取舍。
大规模审计/原版机制/迁移替代根因N/A：单一当前异步调用域，未涉及内容重写或二进制解码。

## 上下文与证据

- [AGENTS](../../../AGENTS.md)：Codex独立核验、产品范围另准入；零诊断不降低门槛。
- [READ-FIRST](../../phase2/READ-FIRST.md)：新引擎架构/一阶段UX纪律，不背旧格式兼容。
- [Q任务卡](TEST-GLM-WAVE-Q-1-runtime-residual-tenfold.md)：贡献者只写新测/证据，不授权修产品。
- [独立机器证据](../../testing/glm-tenfold-triple/codex-q-r2-review-20261001.json)：完整typed诊断源码、raw、exit、报告SHA256。
- 诊断在临时复制树；无产品、旧测试、资产、真实存档写入。1 assertion passed不代表绿：
  同时1 unhandled rejection、exit1，JSON reporter的success=true不能单独作为判据。
- 冻结候选042dd8bb的opening-menu/store到当时main无源变化；未来build先复核最新main与Owner占用。

## 验收条件（draft，方案尚待核）

- 定义IO失败承接人、菜单Promise终态/重试、迟到结果与键盘/rAF/ImageBitmap清理；不吞错、不破坏合法读档。
- 当前typed存档/合法PNG上，meta/getThumb/decode各IO拒绝有最小先红后绿；零未处理拒绝，正常选择/返回回归。
- 保存schema/Store接口/真实数据零漂移；根静态门零诊断，相邻菜单/存档包验证。
- 功能性界面最小可执行入口为自有小工程标题“旧的回忆”读取；错误表现方案准入后才验证。
  不走PAL001/002剧情，不要求用户代跑技术门。

## 当前模式推进记录

- Codex premise verified：直接源码+独立合法IO红诊断，2026-10-01；不等于设计准入。
- Coding Owner/隔离树/实现白名单：pending；不得开始实现。
- 错误呈现/恢复策略、设计风险与用户体验判断：pending。
- build准入：blocked（当前只登记draft，没有产品写授权）。
- 实现/自验/独立accept：pending；done准入blocked。
- 固定三签暂休，无需凑席位；高风险事实与用户产品取舍仍保留。

## 交接日志

- 2026-10-01 Codex：独立确认GLM Q的D-Q01-1工程根因，登记draft；与Q测试返工分开，不夹修产品。

## 下一位 Agent 提示词

无下一位产品Agent提示词：等待Codex后续窄准入；本轮不转交实现，不标done。
