# TEST-KIMI-EDITOR-WORKFLOWS-1 — 编辑器十二组真实工作流补测

Status: build
Owner: Kimi（受委派测试贡献者）
Reviewer: Codex（独立验收、统一质量门与集成）
Phase: phase2
Capability: editor / coverage
Visual Verification Timing: dev-functional（隔离浏览器；非剧情 E2E）

## 目标与准入

2026-09-28 用户要求给 Kimi 一批较大的覆盖率任务，并确认其视觉多模态能力。本卡立即允许
Kimi 在隔离分支实施新增测试，不先交一轮纯盘点等待批准。按 A/B/C 三批、每批四组连续交付，
Codex 可逐批验收；不必等前批审完才开始下一批。固定三签暂休，作者自验不冒充独立证明。

生产冻结 `29e76fe62070fb03bf2459cf95dc2a70ba0f2a0b`；起点可以包含本次派发文档的 main 后继，
但开工时须核 20 个目标源文件 SHA 与[冻结表](../../testing/kimi-editor-workflows/targets.json)一致。
分支 `codex/kimi-editor-workflows-r1`，Codex 已备好隔离工作树
`/Users/zhangxu/.codex/worktrees/kimi-editor-workflows/type-pal`；不得借用 main 或 Codex 的 E2E 树。

## 前提真值门

- 工程前提：当前 editor fast LCOV 的 20 个目标合计仍有 2,401 个未命中分支臂、1,699 个未命中行，
  可在现有行为合同和公开入口上补测试；这不是可达性证明或本批承诺增量。
- 真值来源：冻结表记录正式 fast LCOV 的 SHA256、源文件 SHA256、逐文件 LH/LF/BRH/BRF 和旧测试入口。
  当前直接调用域包括 `DataMode.tsx:243/273/333/370/463/515/552/689/721`、
  `ConnectedEditorPages.tsx:121`、`SoundTab.tsx:80`、`MusicTab.tsx:83`、
  `ActorMode.tsx:527`、`App.tsx:2182/2676`。逐组代码锚在[工作包](../../testing/kimi-editor-workflows/README.md)。
- 第一阶段/原版机制：N/A，本卡不改引擎机制、资源格式或用户行为，也不把旧引擎结构当二阶段合同。
  当前守卫、真实 EditorAssetReader/EditSession/命令与现有产品 UI 是本卡被测对象。
- before → after：产品行为完全不变；新增可证伪的业务回归、局部覆盖证据及最小界面取证。
- 最强替代解释：未命中臂可能被跨文件旧测试证明、属于不可达防御或未定政策；旧测试标题不能证明
  其断言确实覆盖该合同。Kimi 必须先逐族核旧断言，已有则登记 existing-proof，不复制；不明确则登记风险。
- 推翻条件：不存在当前调用方、只能伪造非法输入触达、与既有用户决定冲突。停止该族，继续不受影响的组；
  不通过新增 fallback、改产品或放宽测试预期解决。

## 范围与单写入 Owner

精确新增测试白名单为 `targets.json` 的 20 个 `newTest`；辅助仅限：

- `packages/editor/src/ui/__tests__/kimi-editor-workflows/**`：本卡 typed fixture、浏览器硬件端口替身。
- `docs/testing/kimi-editor-workflows/**`：工作包回执、判据/反控、局部覆盖配置、诊断和最小浏览器宿主。
  `targets.json` 为 Codex 冻结证据，只读；Kimi 新增 delivery/receipt 文件，不改派发事实。

产品、旧测试、官方测试配置、依赖/锁文件、基线、AGENTS、正式工程/资产、任务卡/看板/公共索引均不在
Kimi 写入范围；状态由 Codex 统一维护。新增子目录有 Markdown 时自带 README，入口已由本次派发登记。
已知 `EDITOR-SCENE-FACING-1` 的“保持仍提交旧方向”不固化为正常行为；E2E001/002、PreviewCanvas /
ScriptEditor 连续播放、FrameAnimationEditor 已收口合同、角色换装功能均不重开。

`audio-preview-session.ts` 已是 4/4 分支、10/10 行，只作 K07 的真实依赖，不另凑用例或计本批贡献。
若真正缺陷落在产品，交红诊断与根因，Codex 单独修；不得把整个批次卡死在一个未知政策上。

## 验证与交付

完整要求在[工作包](../../testing/kimi-editor-workflows/README.md)，关键门：

1. 同一真实输入/当前合法 fixture、公开调用域与业务结果；异步进入/释放/迟到结果均有见证。
2. 每组至少一个代表性业务单点反控；资源替换/异步归属/地图原子提交高风险组优先两个。
   不能因为达到数量而补无关针；确无单点须说明替代鉴别力，交 Codex 裁决。
3. 定向/相邻测试，批末 editor 全包与 typecheck；新增文件 Biome error/warning/info 全零；docs 与 diff 检查。
4. 每批至少两条真实浏览器交互闭环，含宽/窄工作区检查；禁止占用用户 6010 或 Codex E2E 服务/配置。
5. A/B/C 各有独立候选 SHA、精简逐族账/新鲜 Vitest JSON、反控和源 hash；三批全部完成后
   统一做一次本包同口径 before/after 覆盖对照，不逐例反复跑覆盖率。不跑官方全仓门、不写基线。
6. Codex 独立验收后选择性集成，串行 check → 官方 ratchet → 受保护 strict-fast；与当时 main 去重。
   通过即提交推送并按卡收口，不再等固定席位；随后清理已退役分支/工作树。

## 当前模式推进记录

- Codex 范围/前提：verified；20 个实际存在源码与既有 fast 缺口/当前消费者已核，2401 仅选题上界。
- build 准入：**build allowed（仅新增测试/隔离证据）**，2026-09-28。
- Coding Owner：Kimi，单一写入本卡新增文件；Codex 负责 E2E002，不与之并发改测试文件。
- 贡献者交付/自验：pending，A → B → C 不必逐步请示。
- Codex 独立验收：pending，按批接收。
- 用户产品验收：N/A，本卡不改用户行为；若发现需要新产品取舍，另行裁决。
- done 准入：未开放，须正式集成与质量门通过；视觉未证不能冒充已证。

## 交接日志

- 2026-09-28 Codex：按用户授权派发十二组，20 源码冻结；复用 Vitest/pnpm 现行配置，不重跑覆盖盘点。
  允许 Kimi 隔离最小功能视觉，不触碰用户配置、E2E 或换装范围。下一位 Kimi 直接实施。

## 下一位 Agent 提示词

```text
在 /Users/zhangxu/illegal/type-pal 接手 TEST-KIMI-EDITOR-WORKFLOWS-1。
先读 AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本卡
docs/ops/tasks/TEST-KIMI-EDITOR-WORKFLOWS-1-twelve-groups.md，以及
docs/testing/kimi-editor-workflows/README.md 和 targets.json。
你是 Coding Owner，build allowed 仅限新增测试/fixture/专属证据，不是再做一包只读审计。
在 /Users/zhangxu/.codex/worktrees/kimi-editor-workflows/type-pal、
codex/kimi-editor-workflows-r1 分支实施，生产冻结 29e76fe6；
开工核目标 hash。按 A(K01–04)→B(K05–08)→C(K09–12) 连续做，四组完成即提交推送候选，
不必等 Codex 审完才能继续下一批。不要自动合 main 或改旧测试/产品/官方配置/基线。
按工作包做真实入口、合法 fixture、旧断言去重、业务反控、最小隔离浏览器闭环；
lint/格式/typecheck 必须 error/warning/info 全零。三批完后统一一次局部同口径覆盖对照，
不要每加一点测试就跑覆盖率，不跑全仓 check/官方 ratchet/strict-fast。
真 bug 交隔离红诊断，未定政策如实登记，继续其它组；不通过改预期凑绿。
每批回执给候选 SHA、文件范围、精确新标题/合同增量、命令/JSON/反控/截图证据与剩余项。
Kimi 是测试贡献者，不是独立第三方。Codex 独立验收、集成、推送、收口与清理；不代签、不标 done。
```
